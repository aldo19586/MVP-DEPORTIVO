import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'matchsport-secret-jwt-key-2026';

/**
 * Firma un JSON Web Token (JWT) estándar RFC 7519 usando HMAC SHA-256.
 * @param {Object} payload Datos a incluir en el token (userId, role, name, etc.)
 * @param {number} expiresInMs Tiempo de expiración en milisegundos (por defecto 30 días)
 * @returns {string} Token JWT en formato header.payload.signature
 */
export function signToken(payload, expiresInMs = 30 * 24 * 60 * 60 * 1000) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Date.now() + expiresInMs;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
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
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (expectedSig !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
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

  const payload = verifyToken(authHeader);
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.user = payload;
  next();
}

/**
 * Middleware para validar rol administrativo (SuperAdmin).
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Autorización administrativa requerida' });
  }

  const payload = verifyToken(authHeader);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administrador' });
  }

  req.user = payload;
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
