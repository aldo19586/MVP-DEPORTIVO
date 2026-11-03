import { db } from './db.js';
import { requireAuth, requireAdmin } from './auth.js';

const publicGets = new Set(['/health', '/sports', '/districts']);
const publicPosts = new Set(['/auth/login', '/auth/register', '/auth/pin-login', '/auth/pin-register', '/auth/admin-login']);

// Mounted before every REST handler: new routes are private unless explicitly listed.
export function apiAccess(req, res, next) {
  if ((req.method === 'GET' || req.method === 'HEAD') &&
      (publicGets.has(req.path) || /^\/auth\/check-name\/[^/]+\/?$/.test(req.path))) return next();
  if (req.method === 'POST' && publicPosts.has(req.path)) return next();
  return requireAuth(req, res, () => {
    if (/^\/admin(?:\/|$)/i.test(req.path)) return requireAdmin(req, res, next);
    next();
  });
}

export function ownParam(req, res, next) {
  if (req.params.userId !== req.user.userId) return res.status(403).json({ error: 'Solo puedes modificar tus propios datos' });
  next();
}

export function ownRead(req, res, next) {
  if (req.user.role === 'admin') return next();
  return ownParam(req, res, next);
}

export function ownBody(field = 'userId') {
  return (req, res, next) => {
    if (req.body?.[field] !== undefined && req.body[field] !== req.user.userId) {
      return res.status(403).json({ error: 'No puedes actuar en nombre de otro jugador' });
    }
    req.body = { ...req.body, [field]: req.user.userId };
    next();
  };
}

export function isParticipant(resource, userId) {
  return [...(resource?.teamA || []), ...(resource?.teamB || [])].some(player => (player.userId || player.id) === userId);
}

export function matchAccess(req, res, next) {
  const match = db.getMatch(req.params.matchId || req.body?.matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  if (req.user.role !== 'admin' && !isParticipant(match, req.user.userId)) {
    return res.status(403).json({ error: 'Este partido es privado para sus participantes' });
  }
  next();
}
