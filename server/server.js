import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import { db } from './db.js';
import { MatchmakingEngine } from './matchmakingEngine.js';
import { calculateGlicko2Match, getInitialGlicko } from './glicko2.js';
import { logger } from './logger.js';
import { issueToken, authRateLimiter } from './auth.js';
import { apiAccess, ownParam, ownRead, ownBody, matchAccess, isParticipant } from './access.js';
import { VENUES, getVenueSlots } from './venues.js';
import { runtimeConfig } from './config.js';
import { createRealtime, ADMIN_ROOM } from './realtime.js';
import { sessionEvents } from './sessionEvents.js';
import { installSocketAccess } from './socketAccess.js';
import { toClientUser, toPublicUser, toResource } from './userDto.js';

const app = express();
const server = http.createServer(app);

// Configuración CORS abierta para admitir conexiones desde PC y celulares en la LAN
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 2500,
  pingTimeout: 5000
});

app.use(cors());
app.use(express.json());
app.use('/api', apiAccess);

const realtime = createRealtime(io);
const matchmakingEngine = new MatchmakingEngine(io, realtime);
matchmakingEngine.start();

// Mapeo de usuario a socketId
const userSocketMap = new Map();

// Temporizadores de gracia para reconexión (Fase 3: 25 segundos antes de expulsar de salas o colas)
const disconnectGraceTimers = new Map();
const DISCONNECT_GRACE_PERIOD_MS = 25000;

import peruDistricts from './peru_districts.json' with { type: 'json' };

// Helper para obtener la IP local LAN
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Helper para generar y notificar evaluaciones circulares post-partido (Peer-Review 1-Toque)
function broadcastPeerReviewAssignments(match) {
  if (!match || !match.id) return;
  const assignments = db.generatePeerReviewAssignments(match);
  if (!assignments || assignments.length === 0) return;

  // Notificar a la sala del partido
  realtime.to(match.id).emit('peerReviewsReady', {
    matchId: match.id,
    count: assignments.length
  });

  // Notificar a cada jugador con su respectivo asignado
  assignments.forEach(assignment => {
    const evaluatorId = assignment.evaluatorId;
    const socketId = userSocketMap.get(evaluatorId);
    const reviewData = db.getPeerReviewForUser(match.id, evaluatorId);
    if (socketId && reviewData) {
      realtime.to(socketId).emit('peerReviewAssigned', {
        matchId: match.id,
        ...reviewData
      });
    }
  });
}

// ---------------- REST API ----------------

app.get('/api/auth/me', (req, res) => res.json({ user: toClientUser(db.getUser(req.user.userId)) }));
app.post('/api/auth/logout', (req, res) => {
  db.revokeSessions(req.user.userId);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    database: db._sqliteReady ? 'connected' : 'initializing',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/districts', (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.json({ districts: peruDistricts.slice(0, 50) });
  }
  const q = query.toLowerCase().trim();
  const filtered = peruDistricts.filter(d =>
    d.distrito.toLowerCase().includes(q) ||
    d.provincia.toLowerCase().includes(q) ||
    d.departamento.toLowerCase().includes(q)
  ).slice(0, 30);
  res.json({ districts: filtered });
});

app.get('/api/sports', (req, res) => {
  res.json({ sports: db.getSports() });
});

// Bolsa de Suplentes (Salas incompletas o con cancelaciones urgentes)
// Listado de Salas de Convocatoria activas (Filtros: sportId, district, status)
app.get('/api/lobbies', (req, res) => {
  const { sportId, district, status } = req.query;
  const lobbies = db.getAllActiveLobbies({ sportId, district, status });
  res.json({ lobbies: lobbies.map(toResource) });
});

// Bolsa de Suplentes (Salas incompletas o con cancelaciones urgentes)
app.get('/api/lobbies/replacements', (req, res) => {
  const { sportId, district } = req.query;
  const lobbies = db.getReplacementMarketLobbies({ sportId, district });
  res.json({ lobbies: lobbies.map(toResource) });
});

app.post('/api/auth/login', authRateLimiter, (req, res) => {
  const { email, password, name, district } = req.body;
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'El correo electrónico es requerido' });
  }
  const result = db.loginUser({ email: email.trim(), password });
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  const token = issueToken(result.user);
  res.json({ user: toClientUser(result.user), token });
});

app.post('/api/auth/register', authRateLimiter, (req, res) => {
  const { email, password, name, district, avatar, bio, favoriteSports, primarySport, position, declaredLevel } = req.body;
  if (typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
  }
  if (typeof password !== 'string' || password.length < 4 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres y como máximo 72 bytes' });
  }
  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Este correo ya tiene una cuenta registrada. Por favor inicia sesión.' });
  }
  const user = db.createUser({ email: email.trim(), password, name, district, avatar, bio, favoriteSports, primarySport, position, declaredLevel });
  const token = issueToken(user);
  res.json({ user: toClientUser(user), token });
});

// Autenticación rápida por Nombre + PIN de 4 dígitos (Fase 2)
app.post('/api/auth/pin-login', authRateLimiter, (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: 'Nombre y PIN de 4 dígitos son requeridos' });
  }
  const result = db.loginWithPin({ name, pin });
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  const token = issueToken(result.user);
  res.json({ user: toClientUser(result.user), token });
});

app.post('/api/auth/pin-register', authRateLimiter, (req, res) => {
  const { name, pin, country, department, district, reference, avatar, bio, favoriteSports, primarySport, position, declaredLevel } = req.body;
  if (typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (!pin || !/^\d{4}$/.test(String(pin).trim())) {
    return res.status(400).json({ error: 'El PIN debe ser exactamente de 4 dígitos numéricos' });
  }
  const result = db.registerWithPin({ name, pin, country, department, district, reference, avatar, bio, favoriteSports, primarySport, position, declaredLevel });
  if (result.error) {
    return res.status(409).json({ error: result.error });
  }
  const token = issueToken(result.user);
  res.json({ user: toClientUser(result.user), token });
});

// Completar Ficha Deportiva Biometrica del Jugador
app.post('/api/user/complete-profile', ownBody(), authRateLimiter, (req, res) => {
  const { userId, age, weight, height, position, reference, department, district, country, primarySport } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId es requerido' });
  }
  const result = db.completeUserProfile(userId, { age, weight, height, position, reference, department, district, country, primarySport });
  if (result.error) {
    return res.status(404).json({ error: result.error });
  }
  res.json({ success: true, user: toClientUser(result.user) });
});

// Enviar Respuestas del Test Oficial de Fútbol Amateur (14 preguntas)
app.post('/api/user/submit-football-test', ownBody(), authRateLimiter, (req, res) => {
  const { userId, answers, position } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId es requerido' });
  }
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers (array de 14 respuestas) es requerido' });
  }
  const result = db.submitFootballTest(userId, { answers, position });
  if (result.error) {
    return res.status(404).json({ error: result.error });
  }
  res.json({ success: true, user: toClientUser(result.user), result: result.result });
});

// Autenticación administrativa para SuperAdmin
app.post('/api/auth/admin-login', authRateLimiter, (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  const result = db.loginUser({ email: email.trim(), password });
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  if (result.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido únicamente a Administradores' });
  }
  const token = issueToken(result.user);
  res.json({ user: toClientUser(result.user), token });
});

app.get('/api/auth/check-name/:name', (req, res) => {
  const user = db.getUserByName(req.params.name);
  res.json({ exists: !!user, name: req.params.name });
});

// Actualización de Perfil y Notificaciones Push
app.put('/api/user/:userId', ownParam, (req, res) => {
  const updatedUser = db.updateUserProfile(req.params.userId, req.body);
  if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ success: true, user: toClientUser(updatedUser) });
});

app.post('/api/user/push-token', ownBody(), (req, res) => {
  const { userId, pushToken } = req.body;
  if (!userId || !pushToken) return res.status(400).json({ error: 'userId y pushToken son requeridos' });
  const user = db.setUserPushToken(userId, pushToken);
  res.json({ success: true, pushToken: user?.pushToken });
});

// Catálogo de Complejos Deportivos y Canchas (B2B / Reservas)
app.get('/api/venues', (req, res) => {
  const { district, sportId } = req.query;
  let list = VENUES;
  if (district && district !== 'all') {
    const dLower = district.toLowerCase();
    list = list.filter(v => v.district.toLowerCase().includes(dLower));
  }
  if (sportId && sportId !== 'all') {
    list = list.filter(v => v.sports.includes(sportId));
  }
  res.json({ venues: list });
});

app.get('/api/venues/:id', (req, res) => {
  const venue = VENUES.find(v => v.id === req.params.id);
  if (!venue) return res.status(404).json({ error: 'Complejo deportivo no encontrado' });
  const slots = getVenueSlots(venue.id, req.query.date);
  res.json({ venue: { ...venue, slots } });
});

app.post('/api/venues/:id/book', (req, res) => {
  res.status(410).json({ error: 'Las reservas de canchas no están disponibles en el MVP' });
});

app.get('/api/user/:userId', ownRead, (req, res) => {
  const user = db.getUser(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: toClientUser(user) });
});

app.get('/api/profile/:userId/:sportId/:formatId', ownRead, (req, res) => {
  const { userId, sportId, formatId } = req.params;
  const profile = db.getProfile(userId, sportId, formatId);
  const user = db.getUser(userId);
  res.json({ profile, futStats: user?.futStats || null });
});

app.post('/api/profile/questionnaire', ownBody(), (req, res) => {
  const { userId, sportId, formatId, declaredLevel, customScore } = req.body;
  const glicko = getInitialGlicko(declaredLevel);
  const profile = db.setProfile(userId, sportId, formatId, {
    declaredLevel,
    rating: glicko.rating,
    rd: glicko.rd,
    volatility: glicko.volatility
  });
  // Actualizar también stats FUT base del usuario
  const user = db.getUser(userId);
  if (user) {
    user.ratingOverall = glicko.rating;
  }
  res.json({ profile, user: toClientUser(user) });
});

app.get('/api/match/:matchId', matchAccess, (req, res) => {
  const match = db.getMatch(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  res.json({ match: toResource(match, req.user) });
});

// Obtener asignación circular de Peer-Review para un usuario en un partido
app.get('/api/match/:matchId/peer-review/:userId', ownRead, matchAccess, (req, res) => {
  const { matchId, userId } = req.params;
  const review = db.getPeerReviewForUser(matchId, userId);
  if (!review) {
    return res.status(404).json({ error: 'No hay evaluación asignada para este usuario en el partido indicado.' });
  }
  res.json(review);
});

// Enviar voto de 1-toque en Peer-Review post-partido
app.post('/api/match/peer-review', ownBody('evaluatorId'), matchAccess, (req, res) => {
  const { matchId, evaluatorId, attributeTag } = req.body;
  if (!matchId || !evaluatorId || !attributeTag) {
    return res.status(400).json({ error: 'matchId, evaluatorId y attributeTag son requeridos.' });
  }

  const result = db.submitPeerReview(matchId, evaluatorId, attributeTag);
  if (result.error) {
    const statusCode = (result.alreadyVoted || result.error.includes('Ya has emitido') || result.error.includes('ya fue enviada')) ? 409 : 400;
    return res.status(statusCode).json({ error: result.error });
  }

  const evaluatorSocketId = userSocketMap.get(evaluatorId);
  if (evaluatorSocketId) {
    realtime.to(evaluatorSocketId).emit('peerReviewSubmitted', { matchId, ...result });
  }
  const targetSocketId = userSocketMap.get(result.targetUserId);
  if (targetSocketId) {
    realtime.to(targetSocketId).emit('peerReviewReceived', {
      matchId,
      statUpdated: result.statKey,
      newValue: result.newValue,
      newOvr: result.newOvr
    });
  }

  res.json({ success: true, ...result });
});

// Historial de Partidas del Usuario (Estilo MOBA / Dota 2)
app.get('/api/user/:userId/matches', ownRead, (req, res) => {
  const history = db.getUserMatchHistory(req.params.userId);
  res.json({ matches: history.map(match => toResource(match, req.user)) });
});

// Todas las partidas para el Dueño / Admin (En vivo e Historial)
app.get('/api/admin/matches', (req, res) => {
  const all = db.getAllMatches();
  res.json({ matches: all.map(match => toResource(match, req.user)) });
});

// Leaderboard por Deporte y Modo de Juego (1v1, 2v2, 3v3)
app.get('/api/leaderboard/:sportId/:formatId', (req, res) => {
  const { sportId, formatId } = req.params;
  const leaderboard = db.getLeaderboard(sportId, formatId);
  res.json({ leaderboard: leaderboard.map(entry => ({ ...entry, user: toPublicUser(entry.user) })) });
});

// Cuestionarios por Deporte
app.get('/api/questionnaire/:sportId', (req, res) => {
  const { sportId } = req.params;
  const questions = db.getQuestionnaire(sportId);
  res.json({ questions });
});

// Admin endpoints
app.get('/api/admin/metrics', (req, res) => {
  const metrics = db.getAdminMetrics();
  res.json({ metrics });
});

app.get('/api/admin/users', (req, res) => {
  const usersList = Array.from(db.users.values()).map(u => {
    const matchesCount = db.getUserMatchHistory(u.id)?.length || u.matchesPlayed || 0;
    return {
      ...toClientUser(u),
      matchesPlayed: matchesCount,
      isCalibrated: matchesCount >= 3
    };
  });
  res.json({ users: usersList });
});

app.post('/api/admin/questionnaire/:sportId', (req, res) => {
  const { sportId } = req.params;
  const { questions } = req.body;
  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'Formato de preguntas inválido' });
  }
  const updated = db.saveQuestionnaire(sportId, questions);
  res.json({ success: true, questions: updated });
});

app.post('/api/admin/sport/format', (req, res) => {
  const { sportId, formatId, active } = req.body;
  const updated = db.toggleSportFormat(sportId, formatId, active);
  if (!updated) return res.status(404).json({ error: 'Deporte o formato no encontrado' });
  realtime.emit('sportsUpdated', { sports: db.getSports() });
  res.json({ success: true, format: updated });
});

// Mapeo de usuarios conectados en tiempo real
const connectedUsers = new Map(); // userId -> { userId, name, avatar, district, role, status, details, sportId, connectedAt }

function broadcastOnlineUsers() {
  const usersArray = Array.from(connectedUsers.values());
  realtime.emit('onlineUsersUpdate', {
    count: usersArray.length,
    users: usersArray
  });
}

sessionEvents.on('revoked', userId => {
  if (disconnectGraceTimers.has(userId)) clearTimeout(disconnectGraceTimers.get(userId));
  disconnectGraceTimers.delete(userId);
  db.removeChallengeByUserId(userId);
  const pending = matchmakingEngine.getPendingMatchForUser(userId);
  if (pending) matchmakingEngine.cancelPendingMatch(pending.pendingMatchId, 'session_revoked', userId);
  userSocketMap.delete(userId);
  connectedUsers.delete(userId);
  broadcastOnlineUsers();
});

matchmakingEngine.connectedUsers = connectedUsers;
matchmakingEngine.broadcastOnlineUsers = broadcastOnlineUsers;

// Endpoint de actividad en tiempo real para el panel de Admin
app.get('/api/admin/live-activity', (req, res) => {
  const liveMatches = Array.from(db.matches.values()).filter(
    (m) => m.status === 'active' || m.status === 'in_progress'
  );
  res.json({
    onlineCount: connectedUsers.size,
    onlineUsers: Array.from(connectedUsers.values()),
    activeMatches: liveMatches.map(match => toResource(match, req.user))
  });
});

// Moderación y Resolución de Disputas SuperAdmin
app.get('/api/admin/disputes', (req, res) => {
  const disputed = Array.from(db.matches.values()).filter(
    (m) => m.status === 'disputed' || m.disputeAlert
  );
  res.json({ disputes: disputed.map(match => toResource(match, req.user)) });
});

app.post('/api/admin/disputes/resolve', (req, res) => {
  const { matchId, winnerTeam } = req.body;
  const adminUserId = req.user.userId;
  if (!['teamA', 'teamB'].includes(winnerTeam)) return res.status(400).json({ error: 'Equipo ganador inválido' });
  const match = db.getMatch(matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  if (match.status !== 'disputed' && !match.disputeAlert) return res.status(409).json({ error: 'El partido no tiene una disputa pendiente' });

  match.status = 'finished';
  match.resultFinal = winnerTeam;
  match.disputeResolvedBy = adminUserId;
  match.disputeAlert = null;

  const ratingUpdates = {};
  const scoreA = winnerTeam === 'teamA' ? 1 : 0;
  const scoreB = winnerTeam === 'teamB' ? 1 : 0;

  for (const p of match.teamA) {
    const prof = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
    const delta = scoreA === 1 ? 35 : -25;
    const newRating = Math.max(800, prof.rating + delta);
    db.setProfile(p.userId || p.id, match.sportId, match.formatId, { rating: newRating });
    ratingUpdates[p.userId || p.id] = { oldRating: prof.rating, newRating, ratingChange: delta };
  }

  for (const p of match.teamB) {
    const prof = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
    const delta = scoreB === 1 ? 35 : -25;
    const newRating = Math.max(800, prof.rating + delta);
    db.setProfile(p.userId || p.id, match.sportId, match.formatId, { rating: newRating });
    ratingUpdates[p.userId || p.id] = { oldRating: prof.rating, newRating, ratingChange: delta };
  }

  db._persistMatch(match);

  realtime.to(matchId).emit('matchFinished', {
    matchId,
    winnerTeam,
    ratingUpdates,
    match,
    resolvedByAdmin: true
  });

  broadcastPeerReviewAssignments(match);

  res.json({ success: true, match: toResource(match, req.user), ratingUpdates });
});

app.post('/api/admin/user/:userId/ban', (req, res) => {
  const { hours = 24, reason } = req.body;
  if (!Number.isFinite(hours) || hours <= 0 || hours > 8760 || (reason !== undefined && typeof reason !== 'string')) {
    return res.status(400).json({ error: 'Duración o motivo de sanción inválido' });
  }
  const user = db.setUserBanned(req.params.userId, hours, reason);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const socketId = userSocketMap.get(req.params.userId);
  if (socketId) {
    realtime.to(socketId).emit('userBannedNotification', {
      hours,
      reason,
      bannedUntil: user.bannedUntil
    });
  }

  res.json({ success: true, user: toClientUser(user) });
});

app.post('/api/admin/user/:userId/reset-pin', (req, res) => {
  const { newPin = '1234' } = req.body;
  if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) return res.status(400).json({ error: 'El PIN debe tener cuatro dígitos' });
  const user = db.resetUserPin(req.params.userId, newPin);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ success: true, user: toClientUser(user) });
});

app.post('/api/admin/user/:userId/verify-dni', (req, res) => {
  const user = db.toggleUserDniVerified(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ success: true, verifiedDni: user.verifiedDni });
});

// Endpoint para consultar datos de una Sala de Convocatoria (Lobby)
app.get('/api/lobby/:code', (req, res) => {
  const lobby = db.getLobby(req.params.code);
  if (!lobby) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  if (req.user.role !== 'admin' && !isParticipant(lobby, req.user.userId)) {
    return res.status(403).json({ error: 'Debes pertenecer a esta sala para ver su contenido' });
  }
  res.json({ lobby: toResource(lobby, req.user) });
});

// Endpoint para abandonar sala de convocatoria (usado por beacon/fetch al salir de la app)
app.post('/api/lobby/leave', ownBody(), (req, res) => {
  const { code, userId } = req.body || {};
  if (userId) {
    let lobbyCode = code;
    let updatedLobby = null;
    if (lobbyCode) {
      updatedLobby = db.leaveLobby(lobbyCode, userId);
    } else {
      const result = db.leaveAllLobbiesForUser(userId);
      if (result) {
        lobbyCode = result.lobbyCode;
        updatedLobby = result.updatedLobby;
      }
    }
    if (lobbyCode && updatedLobby) {
      realtime.to(`lobby_${lobbyCode}`).emit('lobbyUpdated', { lobby: updatedLobby });
    }
    console.log(`[LOBBY] Usuario ${userId} abandonó sala #${lobbyCode || ''} via API`);
  }
  res.json({ success: true });
});

// ---------------- SOCKET.IO REALTIME ----------------

io.on('connection', (socket) => {
  const onEvent = installSocketAccess(socket, matchmakingEngine);
  const verifiedUser = db.getUser(socket.data.userId);
  if (!verifiedUser) return socket.disconnect(true);
  if (verifiedUser.role === 'admin') socket.join(ADMIN_ROOM);
  // Reconexión asociada únicamente a la identidad autenticada
  const authUserId = socket.data.userId;
  if (authUserId && disconnectGraceTimers.has(authUserId)) {
    clearTimeout(disconnectGraceTimers.get(authUserId));
    disconnectGraceTimers.delete(authUserId);
    console.log(`[SOCKET] 🟢 Jugador ${authUserId} reconectado por handshake auth. Período de gracia cancelado.`);
  }

  // Enviar lista actual de usuarios autenticados conectados
  realtime.send(socket, 'onlineUsersUpdate', {
    count: connectedUsers.size,
    users: Array.from(connectedUsers.values())
  });

  const registerUser = () => {
    const userId = socket.data.userId;
    if (!userId) return;

    // 0. Cancelar temporizador de gracia si este usuario estaba en desconexión temporal
    if (disconnectGraceTimers.has(userId)) {
      clearTimeout(disconnectGraceTimers.get(userId));
      disconnectGraceTimers.delete(userId);
      console.log(`[SOCKET] 🟢 Jugador ${userId} reconectado exitosamente dentro del período de gracia.`);
    }

    // 1. Exclusividad de sesión: Si ya existía una sesión en otro dispositivo/pestaña, notificar al socket viejo
    const oldSocketId = userSocketMap.get(userId);
    userSocketMap.set(userId, socket.id);
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        realtime.send(oldSocket, 'session_replaced', { message: 'Tu conexión se trasladó a otro dispositivo' });
        oldSocket.data.superseded = true;
        oldSocket.disconnect(true);
      }
    }

    userSocketMap.set(userId, socket.id);
    socket.userId = userId;

    const u = db.getUser(userId);
    connectedUsers.set(userId, {
      userId,
      socketId: socket.id,
      name: u ? u.name : 'Jugador',
      avatar: u ? (u.avatar || '') : '',
      district: u ? (u.district || 'Lima') : 'Lima',
      role: u ? (u.role || 'player') : 'player',
      status: 'idle',
      details: 'En Radar principal',
      sportId: 'futbol',
      connectedAt: Date.now()
    });
    broadcastOnlineUsers();

    // 2. Verificar si el usuario ya tenía una búsqueda activa en el radar
    const activeChallenge = db.getChallengeByUserId(userId);
    if (activeChallenge) {
      activeChallenge.socketId = socket.id;
      const entry = connectedUsers.get(userId);
      if (entry) {
        entry.status = 'searching';
        entry.details = `Buscando ${activeChallenge.sportId} ${activeChallenge.formatId} (${activeChallenge.radiusKm}km)`;
      }
      realtime.send(socket, 'queueStatus', {
        isSearching: true,
        challenge: activeChallenge
      });
      broadcastOnlineUsers();
    }

    // 3. Verificar si el usuario está en una sala de convocatoria (Lobby)
    const activeLobby = db.findLobbyByUserId(userId);
    if (activeLobby) {
      socket.join(`lobby_${activeLobby.code}`);
      socket.lobbyCode = activeLobby.code;
      const entry = connectedUsers.get(userId);
      if (entry) {
        entry.status = 'in_chat';
        entry.details = `En sala de convocatoria #${activeLobby.code}`;
      }
      realtime.send(socket, 'lobbyRestored', { lobby: activeLobby });
      broadcastOnlineUsers();
    }

    // 4. Verificar si tiene un match activo (en cancha o coordinación)
    const activeMatch = db.getMatchForUser(userId);
    if (activeMatch) {
      socket.join(activeMatch.id);
      const entry = connectedUsers.get(userId);
      if (entry) {
        entry.status = activeMatch.status === 'in_progress' ? 'in_game' : 'in_chat';
        entry.details = activeMatch.status === 'in_progress' ? 'En cancha jugando' : 'Coordinando en sala privada';
      }
      realtime.send(socket, 'activeMatch', { match: activeMatch, autoReconnected: true });
      broadcastOnlineUsers();
    }

    // 5. Verificar si tiene una fase de confirmación pendiente (Aceptación estilo Dota 2)
    const pending = matchmakingEngine.getPendingMatchForUser(userId);
    if (pending) {
      for (const player of [...pending.teamA, ...pending.teamB]) if ((player.userId || player.id) === userId) player.socketId = socket.id;
      const remainingSec = Math.max(1, Math.floor((pending.createdAt + 20000 - Date.now()) / 1000));
      realtime.send(socket, 'matchPromptAcceptance', {
        pendingMatchId: pending.pendingMatchId,
        sportId: pending.sportId,
        formatId: pending.formatId,
        totalPlayers: pending.totalPlayers,
        teamA: pending.teamA.map((p) => ({ id: p.userId || p.id, name: p.name, avatar: p.avatar, position: p.position })),
        teamB: pending.teamB.map((p) => ({ id: p.userId || p.id, name: p.name, avatar: p.avatar, position: p.position })),
        acceptedUserIds: Array.from(pending.acceptedUserIds),
        expiresInSeconds: remainingSec
      });
    }
  };
  onEvent('registerUser', registerUser);

  onEvent('unregisterUser', () => socket.disconnect(true));

  // Iniciar búsqueda de Desafío (cola de matchmaking con radio geoespacial)
  const handleStartQueue = ({ userId, sportId, formatId, mode = 'solo', lat, lng, radiusKm, district }) => {
    if (!userId || !sportId || !formatId) return;

    // Desalojar al usuario de cualquier sala previa antes de entrar a la cola del radar
    const cleaned = db.cleanUserFromAllLobbies(userId);
    for (const c of cleaned) {
      if (c.updatedLobby) {
        realtime.to(`lobby_${c.code}`).emit('lobbyUpdated', { lobby: c.updatedLobby });
      }
    }

    const challengeId = 'chal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const challenge = {
      id: challengeId,
      userId,
      sportId,
      formatId,
      mode,
      lat: lat || -12.137,
      lng: lng || -76.985,
      radiusKm: radiusKm || 6,
      district: district || 'Surco, Lima',
      socketId: socket.id,
      createdAt: Date.now()
    };

    db.addChallenge(challenge);
    const queuedUser = db.getUser(userId);
    const queuedUserName = queuedUser?.name || userId;
    console.log(`[QUEUE] Usuario ${userId} en cola para ${sportId} ${formatId} (Radio: ${radiusKm || 6}km en ${district})`);
    logger.info(`[COLA UNIDA] ${queuedUserName} en cola para ${sportId} ${formatId} | Radio: ${radiusKm || 6}km | Distrito: ${district}`);

    const entry = connectedUsers.get(userId);
    if (entry) {
      entry.status = 'searching';
      entry.details = `Buscando ${sportId.toUpperCase()} ${formatId} (${radiusKm || 6}km a la redonda)`;
      entry.sportId = sportId;
      broadcastOnlineUsers();
    }

    realtime.send(socket, 'queueStarted', {
      isSearching: true,
      challenge
    });

    matchmakingEngine.processQueue();
  };

  onEvent('startQueue', handleStartQueue);
  onEvent('startSearch', handleStartQueue);

  const handleCancelQueue = ({ userId }) => {
    const removed = db.removeChallengeByUserId(userId);
    const cancelUser = db.getUser(userId);
    if (removed) {
      console.log(`[QUEUE] Usuario ${userId} canceló su búsqueda`);
      logger.info(`[COLA CANCELADA] ${cancelUser?.name || userId} canceló la búsqueda en cola.`);
    }

    const entry = connectedUsers.get(userId);
    if (entry) {
      entry.status = 'idle';
      entry.details = 'En Radar principal';
      broadcastOnlineUsers();
    }

    realtime.send(socket, 'queueCancelled', { isSearching: false });
  };

  onEvent('cancelQueue', handleCancelQueue);
  onEvent('cancelSearch', handleCancelQueue);

  // ==========================================
  // EVENTOS DE SALAS DE CONVOCATORIA (LOBBY)
  // ==========================================
  const broadcastLobbiesUpdate = (specificLobby = null) => {
    try {
      const allActive = db.getAllActiveLobbies();
      realtime.emit('lobbyListUpdated', { lobbies: allActive });

      if (specificLobby && specificLobby.status === 'FALTA_1') {
        const districtName = specificLobby.district || specificLobby.venue_district || 'Lima';
        realtime.emit('lobbyNeedsOne', {
          lobbyCode: specificLobby.code,
          lobby: specificLobby,
          district: districtName,
          message: `🔥 ¡Último cupo disponible en ${districtName}! Falta solo 1 jugador para sala #${specificLobby.code} (${specificLobby.sportId || 'Fútbol'} ${specificLobby.formatId || '5v5'}).`
        });
      }
    } catch (e) {
      console.error('[BROADCAST LOBBIES] Error:', e.message);
    }
  };

  onEvent('createLobby', ({ hostUser, sportId, formatId }) => {
    if (!hostUser) return;

    // Desalojar de cualquier cola de radar o salas previas
    db.removeChallengeByUserId(hostUser.id);
    const cleaned = db.cleanUserFromAllLobbies(hostUser.id);
    for (const c of cleaned) {
      if (c.updatedLobby) {
        realtime.to(`lobby_${c.code}`).emit('lobbyUpdated', { lobby: c.updatedLobby });
      }
    }

    const res = db.createLobby({ hostUser, sportId, formatId });
    if (res.error) {
      realtime.send(socket, 'lobbyError', { message: res.error });
      return;
    }
    const lobby = res;
    socket.join(`lobby_${lobby.code}`);
    socket.lobbyCode = lobby.code;

    const entry = connectedUsers.get(hostUser.id);
    if (entry) {
      entry.status = 'in_chat';
      entry.details = `En sala de convocatoria #${lobby.code} (${lobby.sportId} ${lobby.formatId})`;
      broadcastOnlineUsers();
    }

    realtime.send(socket, 'lobbyCreated', { lobby });
    realtime.to(`lobby_${lobby.code}`).emit('lobbyUpdated', { lobby });
    broadcastLobbiesUpdate(lobby);
    console.log(`[LOBBY] Sala ${lobby.code} creada por ${hostUser.name} (${lobby.sportId} ${lobby.formatId})`);
  });

  onEvent('joinLobby', ({ code, user, targetTeam }) => {
    if (!code || !user) return;

    // Desalojar de cualquier cola de radar o salas previas
    db.removeChallengeByUserId(user.id);
    const cleaned = db.cleanUserFromAllLobbies(user.id);
    for (const c of cleaned) {
      if (c.code !== code && c.updatedLobby) {
        realtime.to(`lobby_${c.code}`).emit('lobbyUpdated', { lobby: c.updatedLobby });
      }
    }

    const res = db.joinLobby(code, user, targetTeam);
    if (res.error) {
      realtime.send(socket, 'lobbyError', { message: res.error });
      return;
    }
    socket.join(`lobby_${res.lobby.code}`);
    socket.lobbyCode = res.lobby.code;

    const entry = connectedUsers.get(user.id);
    if (entry) {
      entry.status = 'in_chat';
      entry.details = `En sala de convocatoria #${res.lobby.code}`;
      broadcastOnlineUsers();
    }

    realtime.send(socket, 'lobbyUpdated', { lobby: res.lobby });
    realtime.to(`lobby_${res.lobby.code}`).emit('lobbyUpdated', { lobby: res.lobby });
    broadcastLobbiesUpdate(res.lobby);
    console.log(`[LOBBY] ${user.name} se unió a sala ${res.lobby.code}`);
  });

  onEvent('leaveLobby', ({ code, userId }) => {
    if (!userId) return;
    const lobbyCode = code || socket.lobbyCode;
    let lobby = null;
    if (lobbyCode) {
      lobby = db.leaveLobby(lobbyCode, userId);
      socket.leave(`lobby_${lobbyCode}`);
      if (lobby) {
        realtime.to(`lobby_${lobbyCode}`).emit('lobbyUpdated', { lobby });
      }
    } else {
      const res = db.leaveAllLobbiesForUser(userId);
      if (res) {
        lobby = res.updatedLobby;
        socket.leave(`lobby_${res.lobbyCode}`);
        if (lobby) {
          realtime.to(`lobby_${res.lobbyCode}`).emit('lobbyUpdated', { lobby });
        }
      }
    }
    socket.lobbyCode = null;

    const entry = connectedUsers.get(userId);
    if (entry) {
      entry.status = 'idle';
      entry.details = 'En Radar principal';
      broadcastOnlineUsers();
    }
    broadcastLobbiesUpdate(lobby);
    console.log(`[LOBBY] Jugador ${userId} salió de sala ${lobbyCode || ''}`);
  });

  onEvent('toggleLobbyReady', ({ code, userId }) => {
    if (!code || !userId) return;
    const lobby = db.toggleLobbyReady(code, userId);
    if (lobby) {
      realtime.to(`lobby_${code}`).emit('lobbyUpdated', { lobby });
      broadcastLobbiesUpdate(lobby);
    }
  });

  // ==========================================
  // EVENTOS DE LA BOLSA DE SUPLENTES (FALTA 1)
  // ==========================================

  // Obtener listado actual de salas que buscan suplentes
  onEvent('getReplacementLobbies', ({ sportId, district } = {}) => {
    const list = db.getReplacementMarketLobbies({ sportId, district });
    realtime.send(socket, 'replacementLobbiesList', { lobbies: list });
  });

  // Cancelar asistencia (liberar cupo a la bolsa de suplentes)
  onEvent('cancelAttendance', ({ code, matchId, userId, reason = 'No podré asistir' }) => {
    if (!userId) return;
    let result = null;

    if (code) {
      result = db.markPlayerCancelledInLobby(code, userId, reason);
      if (result && result.lobby) {
        realtime.to(`lobby_${code}`).emit('lobbyUpdated', { lobby: result.lobby });
        socket.leave(`lobby_${code}`);
        socket.lobbyCode = null;
      }
    } else if (matchId) {
      result = db.markPlayerCancelledInMatch(matchId, userId, reason);
      if (result && result.lobby) {
        realtime.to(matchId).emit('matchCancelledAndConverted', {
          matchId,
          lobby: result.lobby,
          message: 'Un jugador canceló su asistencia. El partido se convirtió en Sala de Convocatoria para encontrar suplente.'
        });
        socket.leave(matchId);
      }
    }

    const entry = connectedUsers.get(userId);
    if (entry) {
      entry.status = 'idle';
      entry.details = 'En Radar principal';
      broadcastOnlineUsers();
    }

    const updatedList = db.getReplacementMarketLobbies();
    realtime.emit('replacementMarketUpdated', { lobbies: updatedList });
    if (result && result.lobby) {
      broadcastLobbiesUpdate(result.lobby);
    } else {
      broadcastLobbiesUpdate();
    }
    realtime.send(socket, 'attendanceCancelledSuccess', { ok: true });
    console.log(`[SUPLENTES] Jugador ${userId} canceló asistencia ("${reason}").`);
  });

  // Unirse a una sala desde la Bolsa de Suplentes
  onEvent('joinReplacementSlot', ({ code, user, targetTeam }) => {
    if (!code || !user) return;
    const result = db.joinReplacementSlot(code, user, targetTeam);
    if (result.error) {
      realtime.send(socket, 'lobbyError', { message: result.error });
      return;
    }

    socket.join(`lobby_${result.lobby.code}`);
    socket.lobbyCode = result.lobby.code;

    const entry = connectedUsers.get(user.id);
    if (entry) {
      entry.status = 'in_chat';
      entry.details = `En sala de suplente #${result.lobby.code}`;
      broadcastOnlineUsers();
    }

    realtime.send(socket, 'lobbyUpdated', { lobby: result.lobby });
    realtime.to(`lobby_${result.lobby.code}`).emit('lobbyUpdated', { lobby: result.lobby });

    const updatedList = db.getReplacementMarketLobbies();
    realtime.emit('replacementMarketUpdated', { lobbies: updatedList });
    broadcastLobbiesUpdate(result.lobby);
    console.log(`[SUPLENTES] ${user.name} se unió como suplente a #${result.lobby.code}`);
  });

  onEvent('switchLobbyTeam', ({ code, userId, targetTeam }) => {
    if (!code || !userId || !targetTeam) return;
    const lobby = db.switchLobbyTeam(code, userId, targetTeam);
    if (lobby) {
      realtime.to(`lobby_${code}`).emit('lobbyUpdated', { lobby });
      broadcastLobbiesUpdate(lobby);
    }
  });

  onEvent('changeLobbyFormat', ({ code, formatId }) => {
    if (!code || !formatId) return;
    const lobby = db.changeLobbyFormat(code, formatId);
    if (lobby) {
      realtime.to(`lobby_${code}`).emit('lobbyUpdated', { lobby });
      broadcastLobbiesUpdate(lobby);
      console.log(`[SERVER] [LOBBY] Modalidad de sala ${code} cambiada a: ${formatId} (${lobby.formatName})`);
    }
  });

  onEvent('sendLobbyChatMessage', ({ code, senderId, senderName, team, isPrivate, text }) => {
    if (!code || !text) return;
    const msg = db.addLobbyChatMessage(code, { senderId, senderName, team, isPrivate, text });
    if (msg) {
      db._persistLobby(db.getLobby(code));
      realtime.to(`lobby_${code}`).emit('newLobbyChatMessage', { code, message: msg });
    }
  });

  onEvent('startLobbyMatch', ({ code }) => {
    if (!code) return;
    const lobby = db.getLobby(code);
    if (!lobby) return;

    const allReady = [...lobby.teamA, ...lobby.teamB].every(p => p.isReady);
    if (!allReady) {
      realtime.send(socket, 'lobbyError', { message: 'Todos los jugadores deben marcar "LISTO" antes de comenzar.' });
      return;
    }

    const match = db.convertLobbyToMatch(code);
    if (match) {
      match.status = 'in_progress';
      match.matchTimer = {
        active: true,
        durationMinutes: 60,
        startedAt: Date.now(),
        endsAt: Date.now() + 60 * 60 * 1000
      };

      // Unir sockets al match y notificar a cada jugador
      for (const p of [...match.teamA, ...match.teamB]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry && entry.socketId) {
          const sock = io.sockets.sockets.get(entry.socketId);
          if (sock) {
            sock.join(match.id);
            sock.leave(`lobby_${code}`);
          }
          realtime.to(entry.socketId).emit('matchFound', {
            matchId: match.id,
            sportId: match.sportId,
            formatId: match.formatId,
            match
          });
        }
      }

      realtime.to(`lobby_${code}`).emit('matchFound', {
        matchId: match.id,
        sportId: match.sportId,
        formatId: match.formatId,
        match
      });

      console.log(`[LOBBY] Match oficial creado desde sala ${code}: ${match.id}`);
    }
  });

  // Confirmar Asistencia en Fase de Aceptación (Estilo Dota 2)
  onEvent('acceptPendingMatch', ({ pendingMatchId, userId }) => {
    if (!pendingMatchId || !userId) return;
    matchmakingEngine.handlePlayerAccept(pendingMatchId, userId);
  });
  onEvent('acceptMatch', ({ pendingMatchId, userId }) => {
    if (!pendingMatchId || !userId) return;
    matchmakingEngine.handlePlayerAccept(pendingMatchId, userId);
  });

  // Rechazar Partida en Fase de Aceptación
  onEvent('declinePendingMatch', ({ pendingMatchId, userId }) => {
    if (!pendingMatchId || !userId) return;
    matchmakingEngine.cancelPendingMatch(pendingMatchId, 'declined', userId);
  });
  onEvent('declineMatch', ({ pendingMatchId, userId }) => {
    if (!pendingMatchId || !userId) return;
    matchmakingEngine.cancelPendingMatch(pendingMatchId, 'declined', userId);
  });

  // Resolución de disputas por SuperAdmin vía Socket

  onEvent('startLobbyRadarSearch', ({ code }) => {
    if (!code) return;
    const lobby = db.getLobby(code);
    if (!lobby) return;

    realtime.to(`lobby_${code}`).emit('lobbyStartedRadarSearch', {
      squadMembers: lobby.teamA,
      sportId: lobby.sportId,
      formatId: lobby.formatId,
      formatName: lobby.formatName,
      code: lobby.code
    });
    console.log(`[LOBBY] Sala ${code} inició búsqueda en Radar con ${lobby.teamA.length} jugadores en squad`);
  });

  onEvent('joinMatchRoom', ({ matchId }) => {
    if (!matchId) return;
    socket.join(matchId);
    const match = db.getMatch(matchId);
    if (match) {
      realtime.send(socket, 'matchData', { match });
    }
  });

  onEvent('leaveMatch', ({ matchId, userId }) => {
    if (!matchId) return;
    const match = db.getMatch(matchId);
    if (!match) return;

    const userObj = db.getUser(userId) || [...match.teamA, ...match.teamB].find(p => (p.userId || p.id) === userId);
    const leavingName = userObj?.name || 'Un jugador';

    const allPlayers = [...match.teamA, ...match.teamB];
    const remainingHumans = allPlayers.filter(p => (p.userId || p.id) !== userId && !p.isDemo && !String(p.userId || p.id).startsWith('demo_user_'));

    // Si es 1v1, o si no quedan otros jugadores humanos reales en la sala: se cancela por completo
    if (match.is1v1 || remainingHumans.length === 0) {
      db.cancelMatch(matchId, userId);
      console.log(`[MATCH] Partido ${matchId} cancelado por ${leavingName} (${userId})`);
      realtime.to(matchId).emit('matchCancelled', {
        matchId,
        cancelledByUserId: userId,
        cancelledByUserName: leavingName,
        message: `⚠️ ${leavingName} ha abandonado el partido.`
      });
      for (const p of allPlayers) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry) {
          entry.status = 'idle';
          entry.details = 'En Radar principal';
        }
      }
      broadcastOnlineUsers();
      return;
    }

    // Si es un partido de equipos (>1v1): remover al jugador y avisar a todos
    const removeRes = db.removePlayerFromMatch(matchId, userId);
    if (removeRes) {
      const { match: updatedMatch, removedPlayer } = removeRes;
      console.log(`[MATCH] Jugador ${removedPlayer?.name || userId} salió de la sala de equipo ${matchId}`);

      // Notificar con mensaje de sistema en el chat
      const sysMsg = db.addChatMessage(matchId, {
        senderId: 'system',
        senderName: 'MatchSport ⚠️',
        text: `⚠️ ${removedPlayer?.name || leavingName} ha abandonado el partido. La alineación está incompleta.`
      });

      if (sysMsg) {
        realtime.to(matchId).emit('newChatMessage', { matchId, message: sysMsg });
      }

      // Notificar evento de jugador retirado
      realtime.to(matchId).emit('matchPlayerLeft', {
        matchId,
        leftUserId: userId,
        leftUserName: removedPlayer?.name || leavingName,
        match: updatedMatch,
        message: `⚠️ ${removedPlayer?.name || leavingName} abandonó la sala. Faltan jugadores para iniciar.`
      });

      const leavingEntry = connectedUsers.get(userId);
      if (leavingEntry) {
        leavingEntry.status = 'idle';
        leavingEntry.details = 'En Radar principal';
      }
      broadcastOnlineUsers();
    }
  });

  // Convertir Partido Incompleto a Sala de Convocatoria (Lobby) para Invitar Amigos por Link o Reclutar
  onEvent('convertMatchToLobby', ({ matchId, userId }) => {
    if (!matchId) return;
    const res = db.convertMatchToLobby(matchId, userId);
    if (res.error) {
      realtime.send(socket, 'lobbyError', { message: res.error });
      return;
    }

    const { lobby } = res;
    socket.join(`lobby_${lobby.code}`);
    socket.lobbyCode = lobby.code;

    // Conectar a todos los compañeros de squad que quedaron
    for (const p of lobby.teamA) {
      const pId = p.userId || p.id;
      const entry = connectedUsers.get(pId);
      if (entry && entry.socketId) {
        const pSocket = io.sockets.sockets.get(entry.socketId);
        if (pSocket) {
          pSocket.join(`lobby_${lobby.code}`);
          pSocket.lobbyCode = lobby.code;
        }
        realtime.to(entry.socketId).emit('lobbyCreated', { lobby });
      }
    }

    realtime.to(matchId).emit('matchCancelled', {
      matchId,
      convertedToLobby: true,
      lobbyCode: lobby.code,
      message: 'La sala ha pasado a Convocatoria para invitar amigos y completar la plantilla.'
    });

    console.log(`[LOBBY] Partido ${matchId} convertido a Sala de Convocatoria #${lobby.code} por ${lobby.hostName}`);
  });

  onEvent('sendChatMessage', ({ matchId, senderId, senderName, text }) => {
    const match = db.getMatch(matchId);
    const message = db.addChatMessage(matchId, { senderId, senderName, text });
    if (!message) return;
    for (const player of [...match.teamA, ...match.teamB]) {
      const target = io.sockets.sockets.get(userSocketMap.get(player.userId || player.id));
      if (target) target.join(matchId);
    }
    db._persistMatch(match);
    realtime.to(matchId).emit('newChatMessage', { matchId, message });
  });

  // ▶ Iniciar Temporizador de Cancha en Vivo (30m, 45m, 60m, 90m)
  onEvent('startMatchTimer', ({ matchId, durationMinutes }) => {
    const timer = db.startMatchTimer(matchId, durationMinutes);
    if (timer) {
      realtime.to(matchId).emit('matchTimerStarted', {
        matchId,
        timer
      });
    }
  });

  // Reporte Oficial de Partido 1v1 por Reportero Designado (+35 pts al ganador)
  onEvent('reportResultByReporter', ({ matchId, reporterUserId, winnerTeam }) => {
    const match = db.getMatch(matchId);
    if (!match || match.status === 'finished') return;

    match.status = 'finished';
    match.resultFinal = winnerTeam;
    match.reportedBy = reporterUserId;

    // DETENER EL TEMPORIZADOR DE CANCHA
    if (match.matchTimer) {
      match.matchTimer.active = false;
      match.matchTimer.endsAt = null;
      match.matchTimer.stoppedAt = Date.now();
    }

    const ratingUpdates = {};
    const teamAPlayers = match.teamA;
    const teamBPlayers = match.teamB;

    const wonA = winnerTeam === 'teamA';
    const wonB = winnerTeam === 'teamB';

    // Actualizar estado de jugadores a idle
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      const pId = p.userId || p.id;
      const entry = connectedUsers.get(pId);
      if (entry) {
        entry.status = 'idle';
        entry.details = 'Partido concluido';
      }
    }
    broadcastOnlineUsers();

    // En 1v1: +35 pts directos al ganador, -25 pts al perdedor
    for (const p of teamAPlayers) {
      const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
      const pointsDelta = wonA ? 35 : -25;
      const newRating = Math.max(800, currentProfile.rating + pointsDelta);

      const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
        rating: newRating,
        matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
        wins: (currentProfile.wins || 0) + (wonA ? 1 : 0),
        losses: (currentProfile.losses || 0) + (wonA ? 0 : 1)
      });

      ratingUpdates[p.userId || p.id] = {
        oldRating: currentProfile.rating,
        newRating: updated.rating,
        ratingChange: pointsDelta,
        won: wonA
      };
    }

    for (const p of teamBPlayers) {
      const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
      const pointsDelta = wonB ? 35 : -25;
      const newRating = Math.max(800, currentProfile.rating + pointsDelta);

      const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
        rating: newRating,
        matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
        wins: (currentProfile.wins || 0) + (wonB ? 1 : 0),
        losses: (currentProfile.losses || 0) + (wonB ? 0 : 1)
      });

      ratingUpdates[p.userId || p.id] = {
        oldRating: currentProfile.rating,
        newRating: updated.rating,
        ratingChange: pointsDelta,
        won: wonB
      };
    }

    realtime.to(matchId).emit('matchTimerStopped', { matchId });
    realtime.to(matchId).emit('matchFinished', {
      matchId,
      winnerTeam,
      ratingUpdates,
      match
    });

    // Enviar también a los sockets individuales de los jugadores
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      const pId = p.userId || p.id;
      const entry = connectedUsers.get(pId);
      if (entry && entry.socketId) {
        realtime.to(entry.socketId).emit('matchTimerStopped', { matchId });
        realtime.to(entry.socketId).emit('matchFinished', {
          matchId,
          winnerTeam,
          ratingUpdates,
          match
        });
      }
    }

    broadcastPeerReviewAssignments(match);
  });

  // Reporte estándar multi-jugador (>1v1) o consenso
  onEvent('reportResult', ({ matchId, userId, winnerTeam }) => {
    const match = db.getMatch(matchId);
    if (!match || match.status === 'finished') return;

    // Si es 1v1 y este usuario es el reportero designado, procesar directo sin esperar
    if (match.is1v1 && match.designatedReporter && match.designatedReporter === userId) {
      match.status = 'finished';
      match.resultFinal = winnerTeam;
      match.reportedBy = userId;

      if (match.matchTimer) {
        match.matchTimer.active = false;
        match.matchTimer.endsAt = null;
        match.matchTimer.stoppedAt = Date.now();
      }

      const ratingUpdates = {};
      const wonA = winnerTeam === 'teamA';
      const wonB = winnerTeam === 'teamB';

      for (const p of [...match.teamA, ...match.teamB]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry) {
          entry.status = 'idle';
          entry.details = 'Partido concluido';
        }
      }
      broadcastOnlineUsers();

      for (const p of match.teamA) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = wonA ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (wonA ? 1 : 0),
          losses: (currentProfile.losses || 0) + (wonA ? 0 : 1)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: wonA
        };
      }

      for (const p of match.teamB) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = wonB ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (wonB ? 1 : 0),
          losses: (currentProfile.losses || 0) + (wonB ? 0 : 1)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: wonB
        };
      }

      realtime.to(matchId).emit('matchTimerStopped', { matchId });
      realtime.to(matchId).emit('matchFinished', {
        matchId,
        winnerTeam,
        ratingUpdates,
        match
      });

      for (const p of [...match.teamA, ...match.teamB]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry && entry.socketId) {
          realtime.to(entry.socketId).emit('matchTimerStopped', { matchId });
          realtime.to(entry.socketId).emit('matchFinished', {
            matchId,
            winnerTeam,
            ratingUpdates,
            match
          });
        }
      }
      broadcastPeerReviewAssignments(match);
      return;
    }

    match.resultReports[userId] = { winnerTeam, timestamp: Date.now() };
    const isAgainstDemo = match.teamB.some(p => p.isDemo);

    let isResolved = false;
    let finalWinner = null;

    if (isAgainstDemo) {
      isResolved = true;
      finalWinner = winnerTeam;

    } else {
      const reports = Object.values(match.resultReports);
      if (reports.length >= 2) {
        const uniqueReports = new Set(reports.map(r => r.winnerTeam));
        if (uniqueReports.size === 1) {
          isResolved = true;
          finalWinner = reports[0].winnerTeam;
        } else {
          match.status = 'disputed';
          db._persistMatch(match);
          realtime.to(ADMIN_ROOM).emit('matchDisputed', { matchId });
          realtime.to(matchId).emit('matchDisputed', {
            matchId,
            message: 'Hubo una discrepancia en el resultado reportado. Notificación enviada al Administrador.'
          });
          return;
        }
      } else {
        realtime.to(matchId).emit('reportWaiting', {
          matchId,
          reportedBy: userId,
          message: 'Resultado enviado. Esperando confirmación del rival...'
        });
        return;
      }
    }

    if (isResolved && finalWinner) {
      match.status = 'finished';
      match.resultFinal = finalWinner;

      // DETENER EL TEMPORIZADOR DE CANCHA
      if (match.matchTimer) {
        match.matchTimer.active = false;
        match.matchTimer.endsAt = null;
        match.matchTimer.stoppedAt = Date.now();
      }

      const ratingUpdates = {};
      const teamAPlayers = match.teamA;
      const teamBPlayers = match.teamB;
      const scoreA = finalWinner === 'teamA' ? 1 : 0;
      const scoreB = finalWinner === 'teamB' ? 1 : 0;

      // Actualizar estado de jugadores a idle
      for (const p of [...teamAPlayers, ...teamBPlayers]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry) {
          entry.status = 'idle';
          entry.details = 'Partido concluido';
        }
      }
      broadcastOnlineUsers();

      for (const p of teamAPlayers) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = scoreA === 1 ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (scoreA === 1 ? 1 : 0),
          losses: (currentProfile.losses || 0) + (scoreA === 0 ? 1 : 0)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: scoreA === 1
        };
      }

      for (const p of teamBPlayers) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = scoreB === 1 ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (scoreB === 1 ? 1 : 0),
          losses: (currentProfile.losses || 0) + (scoreB === 0 ? 1 : 0)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: scoreB === 1
        };
      }

      realtime.to(matchId).emit('matchTimerStopped', { matchId });
      realtime.to(matchId).emit('matchFinished', {
        matchId,
        winnerTeam: finalWinner,
        ratingUpdates,
        match
      });

      for (const p of [...teamAPlayers, ...teamBPlayers]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry && entry.socketId) {
          realtime.to(entry.socketId).emit('matchTimerStopped', { matchId });
          realtime.to(entry.socketId).emit('matchFinished', {
            matchId,
            winnerTeam: finalWinner,
            ratingUpdates,
            match
          });
        }
      }
      broadcastPeerReviewAssignments(match);
    }
  });

  // Calificación de Atributos FUT entre rivales en 1v1

  // Voto de 1-toque en Peer-Review Circular post-partido (+2 al atributo)
  onEvent('submitPeerReviewOneTap', ({ matchId, evaluatorId, attributeTag }, callback) => {
    const result = db.submitPeerReview(matchId, evaluatorId, attributeTag);
    if (result.error) {
      if (typeof callback === 'function') callback({ success: false, error: result.error });
      realtime.send(socket, 'peerReviewError', { error: result.error });
      return;
    }

    if (typeof callback === 'function') callback({ success: true, ...result });
    realtime.send(socket, 'peerReviewSubmitted', { matchId, ...result });

    // Notificar al evaluado si está conectado sobre la actualización de su carta
    const targetSocketId = userSocketMap.get(result.targetUserId);
    if (targetSocketId) {
      realtime.to(targetSocketId).emit('peerReviewReceived', {
        matchId,
        statUpdated: result.statKey,
        newValue: result.newValue,
        newOvr: result.newOvr
      });
    }
  });

  // Reseña general para partidos de equipos (>1v1)
  onEvent('submitReview', ({ matchId, fromUserId, toUserId, punctuality, respect, realLevelScore, comment }) => {
    const review = db.addReview({ matchId, fromUserId, toUserId, punctuality, respect, realLevelScore, comment });
    realtime.send(socket, 'reviewSubmitted', { review });
  });

  // Disputa de resultado por el rival si el reportero no marcó lo acordado
  onEvent('disputeMatch', ({ matchId, userId, reason }) => {
    const match = db.getMatch(matchId);
    if (match) {
      match.status = 'disputed';
      match.disputeAlert = { reportedBy: userId, reason, timestamp: Date.now() };
      db._persistMatch(match);
      realtime.to(ADMIN_ROOM).emit('matchDisputed', { matchId });
      realtime.to(matchId).emit('matchDisputed', {
        matchId,
        message: 'Has abierto una disputa formal. Se ha notificado al Administrador para revisión.'
      });
    }
  });

  socket.on('disconnect', (reason) => {
    // Limpiar entrada temporal de guest
    connectedUsers.delete(socket.id);

    const userId = socket.userId;
    if (userId && socket.data.invalidating) {
      if (disconnectGraceTimers.has(userId)) clearTimeout(disconnectGraceTimers.get(userId));
      disconnectGraceTimers.delete(userId);
      if (userSocketMap.get(userId) === socket.id) {
        userSocketMap.delete(userId); connectedUsers.delete(userId);
        db.removeChallengeByUserId(userId);
        const pending = matchmakingEngine.getPendingMatchForUser(userId);
        if (pending) matchmakingEngine.cancelPendingMatch(pending.pendingMatchId, 'session_revoked', userId);
        broadcastOnlineUsers();
      }
      return;
    }
    if (userId) {
      // Solo actuar si este socket era el socket activo registrado para el usuario
      if (userSocketMap.get(userId) === socket.id) {
        console.log(`[SOCKET] ⚠️ Jugador ${userId} desconectado (${reason}). Iniciando período de gracia de ${DISCONNECT_GRACE_PERIOD_MS / 1000}s...`);

        // Marcar estado en connectedUsers como reconectando
        const userEntry = connectedUsers.get(userId);
        if (userEntry) {
          userEntry.status = 'reconnecting';
          userEntry.details = 'Reconectando señal móvil...';
          broadcastOnlineUsers();
        }

        // Cancelar temporizador previo si existiera
        if (disconnectGraceTimers.has(userId)) {
          clearTimeout(disconnectGraceTimers.get(userId));
        }

        // Iniciar temporizador de gracia de 25 segundos
        const timer = setTimeout(() => {
          disconnectGraceTimers.delete(userId);

          // Si pasados 25 segundos el usuario NO se ha reconectado con otro socket:
          if (userSocketMap.get(userId) === socket.id) {
            console.log(`[SOCKET] ⏰ Período de gracia expirado para ${userId}. Ejecutando desconexión definitiva.`);
            userSocketMap.delete(userId);
            connectedUsers.delete(userId);

            // 1. Si el usuario estaba en alguna sala de convocatoria, abandonarla definitivamente
            const activeLobby = db.getUserActiveLobby(userId);
            if (activeLobby) {
              console.log(`[LOBBY] Jugador ${userId} desconectado definitivamente. Abandonando sala #${activeLobby.code}...`);
              const updatedLobby = db.leaveLobby(activeLobby.code, userId);
              if (updatedLobby) {
                realtime.to(`lobby_${activeLobby.code}`).emit('lobbyUpdated', { lobby: updatedLobby });
              }
            }

            // 2. Si tenía una búsqueda activa en el radar y no regresó, cancelar la búsqueda
            const activeChallenge = db.getChallengeByUserId(userId);
            if (activeChallenge) {
              db.removeChallengeByUserId(userId);
              console.log(`[MATCHMAKING] Búsqueda de ${userId} cancelada por desconexión prolongada.`);
            }

            broadcastOnlineUsers();
          }
        }, DISCONNECT_GRACE_PERIOD_MS);

        disconnectGraceTimers.set(userId, timer);
      }
    } else {
      broadcastOnlineUsers();
    }
  });
  registerUser();
});

// Middleware global para captura de excepciones y errores HTTP
app.use((err, req, res, next) => {
  logger.error(`[ERROR HTTP] ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor. Por favor intenta más tarde.'
  });
});

const PORT = runtimeConfig.port;

// IPC is only available to the isolated test runner, never as an HTTP endpoint.
if (runtimeConfig.isTest && process.send) {
  process.on('message', (message) => {
    if (message?.type === 'shutdown') process.exit(0); // SQLite exit handler flushes data.
  });
  process.on('disconnect', () => process.exit(0));
}

// Inicialización asíncrona: cargar SQLite antes de aceptar conexiones
async function startServer() {
  try {
    await db.initAsync();
    console.log('[SERVER] Base de datos SQLite inicializada correctamente.');
  } catch (err) {
    console.error('[SERVER] Error al inicializar SQLite:', err);
    process.exit(1);
  }

  server.listen(PORT, runtimeConfig.host, () => {
    const boundPort = server.address().port;
    if (runtimeConfig.isTest && process.send) {
      process.send({ type: 'ready', port: boundPort });
    }
    const localIp = getLocalIp();
    console.log(`\n============================================================`);
    console.log(`🏆 MATCHMAKING DEPORTIVO - SERVIDOR ACTIVO (con SQLite)`);
    console.log(`📡 Backend Socket.IO: http://localhost:${boundPort}`);
    console.log(`📱 En tu PC:          http://localhost:3000`);
    console.log(`📲 En tu Celular/LAN: http://${localIp}:3000`);
    console.log(`============================================================\n`);
  });
}

startServer();
