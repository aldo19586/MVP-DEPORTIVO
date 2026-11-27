import { authenticate } from './auth.js';
import { db } from './db.js';
import { isParticipant } from './access.js';
import { toClientUser, toPublicUser, toResource } from './userDto.js';
import { sessionEvents } from './sessionEvents.js';
import { competitionEvents } from './competitionEvents.js';
import { pushService } from './pushService.js';

export const ADMIN_ROOM = 'admin_monitor';
const publicEvents = new Set(['sportsUpdated', 'lobbyListUpdated', 'lobbyNeedsOne', 'replacementMarketUpdated', 'replacementLobbiesList', 'competitionListUpdated']);
const competitionEventNames = new Set([
  'competitionUpdated', 'competitionMessage',
  'competitionScoreReported', 'competitionScoreConfirmed', 'competitionScoreDisputed', 'competitionDisputeResolved'
]);
const adminEvents = new Set(['onlineUsersUpdate', 'adminDisputeResolved']);
const personalEvents = new Set(['queueStatus', 'queueStarted', 'queueCancelled', 'matchPromptAcceptance',
  'pendingMatchUpdated', 'matchPromptUpdated', 'matchAcceptanceFailed', 'session_replaced',
  'userBannedNotification', 'userUnbannedNotification', 'lobbyError', 'peerReviewError', 'attendanceCancelledSuccess', 'reviewSubmitted',
  'peerReviewAssigned', 'peerReviewReceived', 'peerReviewSubmitted', 'matchmakingStatusUpdated', 'matchmakingRoomAssigned']);
const resourceEvents = new Set(['activeMatch', 'matchData', 'matchFound', 'matchFinished', 'matchCancelled',
  'matchCancelledAndConverted', 'matchPlayerLeft', 'matchTimerStarted', 'matchTimerStopped', 'matchDisputed',
  'newChatMessage', 'newLobbyChatMessage', 'lobbyCreated', 'lobbyRestored', 'lobbyUpdated',
  'lobbyStartedRadarSearch', 'reportWaiting', 'peerReviewsReady']);
export const SERVER_EVENTS = new Set([...publicEvents, ...adminEvents, ...personalEvents, ...resourceEvents, ...competitionEventNames]);

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
    if (competitionEventNames.has(event) || event === 'matchmakingRoomAssigned') {
      const room = db.competitions.get(data.competitionId);
      if (!room || (user.role !== 'admin' && ![...room.teamA, ...room.teamB].some(member => member.id === user.id))) return;
    } else if (publicEvents.has(event)) {
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
    // Private competition events are filtered per recipient in send(), even without subscriptions.
    if (!target && !publicEvents.has(event) && !adminEvents.has(event) && !competitionEventNames.has(event)) return;
    for (const socket of io.sockets.sockets.values()) {
      if (!target || socket.id === target || socket.rooms.has(target)) send(socket, event, payload, target);
    }
  }
  const changed = payload => {
    broadcast(null, 'competitionUpdated', payload);
    broadcast(null, 'competitionListUpdated', {});
  };
  const message = payload => {
    broadcast(null, 'competitionMessage', payload);
    pushService.notifyCompetitionMessage({
      competitionId: payload.competitionId,
      senderId: payload.message?.senderId,
      senderName: payload.message?.senderName,
      text: payload.message?.text
    }).catch(() => {});
  };
  const scoreReported = payload => {
    broadcast(null, 'competitionScoreReported', payload);
    pushService.notifyScoreReported({
      competitionId: payload.competitionId,
      matchId: payload.matchId,
      reporterId: payload.report?.reporterId,
      scoreA: payload.report?.scoreA,
      scoreB: payload.report?.scoreB
    }).catch(() => {});
  };
  const scoreConfirmed = payload => {
    broadcast(null, 'competitionScoreConfirmed', payload);
    pushService.notifyScoreConfirmed({
      competitionId: payload.competitionId,
      matchId: payload.matchId,
      confirmedBy: payload.confirmedBy,
      winnerTeam: payload.winnerTeam
    }).catch(() => {});
  };
  const scoreDisputed = payload => {
    broadcast(null, 'competitionScoreDisputed', payload);
    broadcast(ADMIN_ROOM, 'competitionScoreDisputed', payload);
    pushService.notifyScoreDisputed({
      competitionId: payload.competitionId,
      matchId: payload.matchId,
      disputerId: payload.dispute?.disputerId,
      reason: payload.dispute?.reason
    }).catch(() => {});
  };
  const disputeResolved = payload => {
    broadcast(null, 'competitionDisputeResolved', payload);
    broadcast(ADMIN_ROOM, 'adminDisputeResolved', payload);
    pushService.notifyDisputeResolved({
      competitionId: payload.competitionId,
      matchId: payload.matchId,
      winnerTeam: payload.winnerTeam,
      reason: payload.reason
    }).catch(() => {});
  };
  const matchmakingRoomAssigned = payload => {
    const userIdSet = new Set(Array.isArray(payload.userIds) ? payload.userIds : [payload.userIds].filter(Boolean));
    const room = payload.competition || db.competitions.get(payload.competitionId);
    if (!room) return;
    for (const socket of io.sockets.sockets.values()) {
      if (userIdSet.has(socket.data.userId)) {
        const updatedUser = db.getUser(socket.data.userId);
        if (updatedUser) {
          const clientUser = toClientUser(updatedUser);
          send(socket, 'matchmakingStatusUpdated', {
            user: clientUser,
            matchmakingStatus: clientUser.matchmakingStatus,
            searchingFormat: clientUser.searchingFormat,
            searchingDistrict: clientUser.searchingDistrict,
            searchingRadiusKm: clientUser.searchingRadiusKm,
            searchingSince: clientUser.searchingSince,
            searchingExpiresAt: clientUser.searchingExpiresAt,
            activeCompetitionId: clientUser.activeCompetitionId
          }, socket.id);
        }
        send(socket, 'matchmakingRoomAssigned', {
          competitionId: room.id,
          code: room.code,
          competition: structuredClone(room)
        }, socket.id);
      }
    }
    broadcast(null, 'competitionUpdated', {
      competitionId: room.id,
      revision: room.revision,
      competition: structuredClone(room)
    });
    broadcast(null, 'competitionListUpdated', {});
    pushService.notifyMatchmakingRoomAssigned({
      userIds: Array.from(userIdSet),
      competition: room
    }).catch(() => {});
  };
  competitionEvents.on('changed', changed);
  competitionEvents.on('message', message);
  competitionEvents.on('scoreReported', scoreReported);
  competitionEvents.on('scoreConfirmed', scoreConfirmed);
  competitionEvents.on('scoreDisputed', scoreDisputed);
  competitionEvents.on('disputeResolved', disputeResolved);
  competitionEvents.on('matchmakingRoomAssigned', matchmakingRoomAssigned);
  io.httpServer.once('close', () => {
    competitionEvents.off('changed', changed);
    competitionEvents.off('message', message);
    competitionEvents.off('scoreReported', scoreReported);
    competitionEvents.off('scoreConfirmed', scoreConfirmed);
    competitionEvents.off('scoreDisputed', scoreDisputed);
    competitionEvents.off('disputeResolved', disputeResolved);
    competitionEvents.off('matchmakingRoomAssigned', matchmakingRoomAssigned);
  });
  return { send, to: target => ({ emit: (event, payload) => broadcast(target, event, payload) }),
    emit: (event, payload) => broadcast(null, event, payload) };
}
