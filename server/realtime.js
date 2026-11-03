import { authenticate } from './auth.js';
import { db } from './db.js';
import { isParticipant } from './access.js';
import { toPublicUser, toResource } from './userDto.js';
import { sessionEvents } from './sessionEvents.js';

export const ADMIN_ROOM = 'admin_monitor';
const publicEvents = new Set(['sportsUpdated', 'lobbyListUpdated', 'lobbyNeedsOne', 'replacementMarketUpdated', 'replacementLobbiesList']);
const adminEvents = new Set(['onlineUsersUpdate', 'adminDisputeResolved']);
const personalEvents = new Set(['queueStatus', 'queueStarted', 'queueCancelled', 'matchPromptAcceptance',
  'pendingMatchUpdated', 'matchPromptUpdated', 'matchAcceptanceFailed', 'session_replaced',
  'userBannedNotification', 'lobbyError', 'peerReviewError', 'attendanceCancelledSuccess', 'reviewSubmitted',
  'peerReviewAssigned', 'peerReviewReceived', 'peerReviewSubmitted']);
const resourceEvents = new Set(['activeMatch', 'matchData', 'matchFound', 'matchFinished', 'matchCancelled',
  'matchCancelledAndConverted', 'matchPlayerLeft', 'matchTimerStarted', 'matchTimerStopped', 'matchDisputed',
  'newChatMessage', 'newLobbyChatMessage', 'lobbyCreated', 'lobbyRestored', 'lobbyUpdated',
  'lobbyStartedRadarSearch', 'reportWaiting', 'peerReviewsReady']);
export const SERVER_EVENTS = new Set([...publicEvents, ...adminEvents, ...personalEvents, ...resourceEvents]);

export function lobbyPreview(lobby) {
  const keys = ['code', 'name', 'sportId', 'formatId', 'formatName', 'playersPerTeam', 'totalSlots',
    'currentPlayers', 'neededPlayers', 'status', 'hostUserId', 'hostName', 'district', 'venue', 'time', 'createdAt'];
  return { ...Object.fromEntries(keys.filter(key => lobby[key] !== undefined).map(key => [key, lobby[key]])),
    teamA: (lobby.teamA || []).map(toPublicUser), teamB: (lobby.teamB || []).map(toPublicUser) };
}

export function createRealtime(io) {
  function disconnectInvalid(socket) {
    if (socket.data.invalidating) return;
    socket.data.invalidating = true;
    socket.emit('sessionInvalid', { code: 'SESSION_INVALID', message: 'Tu sesión terminó. Vuelve a iniciar sesión' });
    socket.disconnect(true);
  }
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = authenticate(token);
    if (!user) {
      const error = new Error('Se requiere una sesión válida');
      error.data = { code: 'SESSION_INVALID' };
      return next(error);
    }
    socket.data.token = token;
    socket.data.userId = user.id;
    next();
  });
  const revoked = userId => {
    for (const socket of io.sockets.sockets.values()) if (socket.data.userId === userId) disconnectInvalid(socket);
  };
  sessionEvents.on('revoked', revoked);
  const expiryCheck = setInterval(() => {
    for (const socket of io.sockets.sockets.values()) if (!authenticate(socket.data.token)) disconnectInvalid(socket);
  }, 1000);
  expiryCheck.unref();
  io.httpServer.once('close', () => { clearInterval(expiryCheck); sessionEvents.off('revoked', revoked); });

  function send(socket, event, payload = {}, target) {
    if (!socket.connected || socket.data.superseded) return;
    const user = authenticate(socket.data.token);
    if (!user) { disconnectInvalid(socket); return; }
    const viewer = { userId: user.id, role: user.role };
    if (!SERVER_EVENTS.has(event)) return;
    if ((adminEvents.has(event) || target === ADMIN_ROOM) && user.role !== 'admin') return;
    const data = { ...payload };
    if (publicEvents.has(event)) {
      if (data.lobbies) data.lobbies = data.lobbies.map(lobbyPreview);
      if (data.lobby) data.lobby = lobbyPreview(data.lobby);
    } else {
      // Membership is checked at delivery time too: stale room subscriptions cannot leak updates.
      const roomLobby = target?.startsWith('lobby_') ? db.getLobby(target.slice(6)) : null;
      const matchId = data.matchId || data.match?.id || (target?.startsWith('match_') ? target : null);
      const match = matchId ? db.getMatch(matchId) : null;
      const lobby = data.lobby || (data.code ? db.getLobby(data.code) : roomLobby);
      if (target?.startsWith('lobby_') && !roomLobby) { socket.leave(target); return; }
      if (target?.startsWith('match_') && !match) { socket.leave(target); return; }
      if (user.role !== 'admin') {
        if ((matchId && (!match || !isParticipant(match, user.id))) || (lobby && !isParticipant(lobby, user.id))) {
          if (target && target !== socket.id) socket.leave(target);
          return;
        }
      }
      if (event === 'newLobbyChatMessage' && data.message?.isPrivate && user.role !== 'admin') {
        const team = ['teamA', 'teamB'].find(key => lobby?.[key]?.some(p => (p.userId || p.id) === user.id));
        if (!team || data.message.team !== team) return;
      }
      if (data.match) data.match = toResource(data.match, viewer);
      if (data.lobby) data.lobby = toResource(data.lobby, viewer);
    }
    for (const key of ['teamA', 'teamB', 'squadMembers']) if (Array.isArray(data[key])) data[key] = data[key].map(toPublicUser);
    socket.emit(event, data);
  }
  function broadcast(target, event, payload) {
    // Global broadcasts contain only public previews or administrative events.
    if (!target && !publicEvents.has(event) && !adminEvents.has(event)) return;
    for (const socket of io.sockets.sockets.values()) {
      if (!target || socket.id === target || socket.rooms.has(target)) send(socket, event, payload, target);
    }
  }
  return { send, to: target => ({ emit: (event, payload) => broadcast(target, event, payload) }),
    emit: (event, payload) => broadcast(null, event, payload) };
}
