import crypto from 'crypto';
import { db } from './db.js';

export function resolveJwtSecret(env = process.env) {
  if (typeof env.JWT_SECRET === 'string' && Buffer.byteLength(env.JWT_SECRET) >= 32) return env.JWT_SECRET;
  if (env.JWT_SECRET || (env.NODE_ENV && env.NODE_ENV !== 'development')) {
    throw new Error('JWT_SECRET debe contener al menos 32 bytes fuera de desarrollo');
  }
  // Local development only: restarting invalidates existing sessions.
  return crypto.randomBytes(32).toString('hex');
}

const JWT_SECRET = resolveJwtSecret();

export function issueToken(user) {
  return signToken({ userId: user.id, role: user.role || 'player', version: user.sessionVersion || 0 });
}

export function authenticate(token) {
  const claims = verifyToken(token);
  if (!claims || !Number.isSafeInteger(claims.version)) return null;
  const user = db.getUser(claims.userId);
  if (!user || claims.version !== (user.sessionVersion || 0)) return null;
  if (user.isBanned && user.bannedUntil > Date.now()) return null;
  return user;
}

/**
 * Firma un JSON Web Token (JWT) estándar RFC 7519 usando HMAC SHA-256.
 * @param {Object} payload Datos a incluir en el token (userId, role, name, etc.)
 * @param {number} expiresInMs Tiempo de expiración en milisegundos (por defecto 30 días)
 * @returns {string} Token JWT en formato header.payload.signature
 */
export function signToken(payload, expiresInMs = 30 * 24 * 60 * 60 * 1000) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.floor(expiresInMs / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verifica y decodifica un JSON Web Token.
 * @param {string} token Token recibido en encabezado Authorization o handshake
 * @returns {Object|null} Payload decodificado si es válido, null si es inválido o expiró
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const clean = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const parts = clean.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest();
  const providedSig = Buffer.from(signature, 'base64url');
  if (providedSig.length !== expectedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) return null;

  try {
    const metadata = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (metadata.alg !== 'HS256' || metadata.typ !== 'JWT') return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= now || payload.exp > now + 31 * 86400) return null;
    if (!Number.isSafeInteger(payload.iat) || payload.iat > now || payload.iat >= payload.exp) return null;
    if (typeof payload.userId !== 'string' || !payload.userId || !['player', 'admin'].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware para validar autenticación JWT en rutas protegidas.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  const user = authenticate(authHeader);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.user = { userId: user.id, role: user.role || 'player' };
  next();
}

/**
 * Middleware para validar rol administrativo (SuperAdmin).
 */
export function requireAdmin(req, res, next) {
  if (!req.user) return requireAuth(req, res, () => requireAdmin(req, res, next));
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administrador' });
  }

  next();
}

// In-Memory Rate Limiter para mitigar ataques de fuerza bruta al PIN de 4 dígitos
const rateLimitMap = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_ATTEMPTS = 20; // 20 intentos por minuto por IP

export function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const waitSec = Math.ceil((record.resetAt - now) / 1000);
    return res.status(429).json({
      error: `Demasiados intentos de acceso. Por favor espera ${waitSec} segundos antes de reintentar.`
    });
  }

  record.count++;
  next();
}
