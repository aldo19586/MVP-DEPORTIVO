import { authenticate } from './auth.js';
import { db } from './db.js';
import { isParticipant } from './access.js';

const groups = {
  session: ['registerUser', 'unregisterUser'],
  queue: ['startQueue', 'startSearch', 'cancelQueue', 'cancelSearch', 'getReplacementLobbies'],
  create: ['createLobby'],
  join: ['joinLobby', 'joinReplacementSlot'],
  lobbyMember: ['leaveLobby', 'toggleLobbyReady', 'switchLobbyTeam', 'sendLobbyChatMessage'],
  lobbyHost: ['changeLobbyFormat', 'startLobbyMatch', 'startLobbyRadarSearch'],
  attendance: ['cancelAttendance'],
  pending: ['acceptPendingMatch', 'acceptMatch', 'declinePendingMatch', 'declineMatch'],
  matchMember: ['joinMatchRoom', 'leaveMatch', 'sendChatMessage', 'disputeMatch', 'submitPeerReviewOneTap', 'submitReview'],
  matchLeader: ['convertMatchToLobby', 'startMatchTimer', 'reportResult', 'reportResultByReporter'],
  disabled: ['fillLobbyDemos', 'searchLobbyOpponentOnline', 'forceDemoMatch', 'submitFutRatings'],
  admin: ['adminResolveDispute'],
};
export const SOCKET_POLICIES = Object.fromEntries(Object.entries(groups).flatMap(([group, events]) => events.map(event => [event, group])));
const actorFields = ['userId', 'senderId', 'reporterUserId', 'fromUserId', 'evaluatorId', 'adminUserId'];
const idOf = player => player?.userId || player?.id;
function fail(code, message) { throw Object.assign(new Error(message), { code }); }
function text(value, name, limit = 100) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) fail('INVALID_PAYLOAD', `${name} inválido`);
  return value.trim();
}
function member(resource, user) {
  if (!resource) fail('NOT_FOUND', 'Sala o partido no encontrado');
  if (!isParticipant(resource, user.id)) fail('FORBIDDEN', 'Debes pertenecer a esta sala o partido');
}
function sportFormat(sportId, formatId) {
  const sport = db.getSports().find(item => item.id === sportId);
  if (!sport?.formats.some(item => item.id === formatId && item.active)) fail('INVALID_PAYLOAD', 'Deporte o formato no disponible');
}

export function authorizeSocketEvent(event, input, user, engine) {
  const policy = SOCKET_POLICIES[event];
  if (!policy) fail('UNKNOWN_EVENT', 'Evento no disponible');
  if (input === undefined) input = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('INVALID_PAYLOAD', 'Se requiere un objeto');
  const data = { ...input };
  for (const field of actorFields) {
    if (data[field] !== undefined && data[field] !== user.id) fail('FORBIDDEN', 'No puedes actuar en nombre de otro usuario');
    data[field] = user.id;
  }
  for (const field of ['user', 'hostUser']) {
    if (data[field] !== undefined && (!data[field] || data[field].id !== user.id)) fail('FORBIDDEN', 'Identidad de jugador inválida');
    data[field] = user; // Ignore client-supplied role, name, rating, etc.
  }
  data.senderName = user.name;
  if (policy === 'admin') {
    if (user.role !== 'admin') fail('FORBIDDEN', 'Se requiere administrador');
    fail('USE_REST', 'Resuelve la disputa desde la API administrativa');
  }
  if (policy === 'disabled') fail('EVENT_DISABLED', 'Esta función de demostración o calificación antigua no está disponible');
  if (['create', 'join', 'lobbyHost', 'lobbyMember', 'attendance'].includes(policy)) {
    if (data.code !== undefined) data.code = text(data.code, 'Código', 40).toUpperCase();
  }
  let lobby;
  if (['join', 'lobbyHost', 'lobbyMember'].includes(policy) || (policy === 'attendance' && data.code)) {
    if (event === 'leaveLobby' && !data.code) data.code = db.getUserActiveLobby(user.id)?.code;
    lobby = db.getLobby(data.code);
    if (policy !== 'join') member(lobby, user);
    else if (!lobby) fail('NOT_FOUND', 'Sala no encontrada');
    if (['FINALIZADA', 'CANCELADA', 'closed', 'cancelled'].includes(lobby.status)) fail('CONFLICT', 'La sala está cerrada');
    if (policy === 'lobbyHost' && lobby.hostUserId !== user.id) fail('FORBIDDEN', 'Solo el anfitrión puede realizar esta acción');
    if (data.targetTeam !== undefined && !['teamA', 'teamB'].includes(data.targetTeam)) fail('INVALID_PAYLOAD', 'Equipo inválido');
    if (event === 'switchLobbyTeam' && !data.targetTeam) fail('INVALID_PAYLOAD', 'Indica el equipo de destino');
    if (event === 'changeLobbyFormat') sportFormat(lobby.sportId, data.formatId);
    if (event === 'startLobbyMatch' && (lobby.teamA.length !== lobby.playersPerTeam || lobby.teamB.length !== lobby.playersPerTeam)) fail('CONFLICT', 'Faltan jugadores para iniciar');
  }
  if (policy === 'create') {
    data.sportId ??= 'futbol';
    data.formatId ??= '2v2';
    sportFormat(data.sportId, data.formatId);
  }
  if (['startQueue', 'startSearch'].includes(event)) {
    sportFormat(data.sportId, data.formatId);
    if (data.district !== undefined) data.district = text(data.district, 'Distrito');
    for (const [key, min, max] of [['lat', -90, 90], ['lng', -180, 180], ['radiusKm', 1, 100]]) {
      if (data[key] !== undefined && (!Number.isFinite(data[key]) || data[key] < min || data[key] > max)) fail('INVALID_PAYLOAD', `${key} inválido`);
    }
    if (engine.getPendingMatchForUser(user.id) || db.getMatchForUser(user.id)) fail('CONFLICT', 'Ya tienes un partido pendiente o activo');
  }
  if (policy === 'pending') {
    const pending = engine.pendingMatches.get(data.pendingMatchId);
    member(pending, user);
  }
  let match;
  if (['matchMember', 'matchLeader'].includes(policy) || (policy === 'attendance' && !data.code)) {
    data.matchId = text(data.matchId, 'Partido');
    match = db.getMatch(data.matchId);
    member(match, user);
    if (policy === 'matchLeader') {
      const team = isParticipant({ teamA: match.teamA }, user.id) ? match.teamA : match.teamB;
      const leader = team.find(p => p.isCaptain) || team[0];
      if (event === 'reportResultByReporter') {
        if (!match.is1v1 || match.designatedReporter !== user.id) fail('FORBIDDEN', 'Solo el reportero designado puede resolver el 1v1');
      } else if (idOf(leader) !== user.id) fail('FORBIDDEN', 'Solo el capitán puede realizar esta acción');
    }
    if (['reportResult', 'reportResultByReporter', 'startMatchTimer', 'convertMatchToLobby', 'leaveMatch', 'cancelAttendance'].includes(event) && !['active', 'in_progress'].includes(match.status)) fail('CONFLICT', 'El estado del partido no permite esta acción');
    if (event === 'sendChatMessage' && match.status === 'cancelled') fail('CONFLICT', 'El partido está cancelado');
    if (['submitReview', 'submitPeerReviewOneTap'].includes(event) && match.status !== 'finished') fail('CONFLICT', 'El partido todavía no terminó');
    if (event === 'submitReview') {
      if (data.toUserId === user.id || !isParticipant(match, data.toUserId)) fail('FORBIDDEN', 'Solo puedes evaluar a otro participante');
      for (const key of ['punctuality', 'respect', 'realLevelScore']) if (!Number.isFinite(data[key]) || data[key] < 1 || data[key] > 5) fail('INVALID_PAYLOAD', 'Calificación inválida');
      if (data.comment !== undefined && (typeof data.comment !== 'string' || data.comment.length > 1000)) fail('INVALID_PAYLOAD', 'Comentario inválido');
    }
  }
  if (['reportResult', 'reportResultByReporter'].includes(event) && !['teamA', 'teamB'].includes(data.winnerTeam)) fail('INVALID_PAYLOAD', 'Resultado inválido');
  if (event === 'startMatchTimer' && ![30, 45, 60, 90].includes(data.durationMinutes)) fail('INVALID_PAYLOAD', 'Duración inválida');
  if (['sendLobbyChatMessage', 'sendChatMessage'].includes(event)) {
    data.text = text(data.text, 'Mensaje', 2000);
    if (event === 'sendLobbyChatMessage') {
      if (data.isPrivate !== undefined && typeof data.isPrivate !== 'boolean') fail('INVALID_PAYLOAD', 'Privacidad inválida');
      data.team = isParticipant({ teamA: lobby.teamA }, user.id) ? 'teamA' : 'teamB';
      data.isPrivate = data.isPrivate === true;
    }
  }
  if (event === 'disputeMatch') data.reason = text(data.reason, 'Motivo', 1000);
  if (event === 'cancelAttendance' && data.reason !== undefined) data.reason = text(data.reason, 'Motivo', 1000);
  if (event === 'getReplacementLobbies' && data.district !== undefined && data.district !== null) data.district = text(data.district, 'Distrito');
  return data;
}

export function installSocketAccess(socket, engine) {
  const reject = (event, error, callback) => {
    const payload = { success: false, event, code: error.code || 'INTERNAL_ERROR', message: error.code ? error.message : 'No se pudo completar la operación' };
    if (typeof callback === 'function') callback({ ...payload, error: payload.message });
    socket.emit('operationError', payload);
  };
  socket.use((packet, next) => {
    const [event, input] = packet;
    const callback = typeof packet.at(-1) === 'function' ? packet.at(-1) : undefined;
    try {
      const user = authenticate(socket.data.token);
      if (!user || socket.data.superseded) fail('SESSION_INVALID', 'Tu sesión terminó. Vuelve a iniciar sesión');
      const payload = authorizeSocketEvent(event, typeof input === 'function' ? undefined : input, user, engine);
      packet.splice(1, packet.length - 1, payload, ...(callback ? [callback] : []));
      next();
    } catch (error) {
      reject(event, error, callback);
      // No handler runs after a rejected packet.
      next(error);
      if (error.code === 'SESSION_INVALID') {
        socket.data.invalidating = true;
        socket.emit('sessionInvalid', { code: 'SESSION_INVALID' });
        socket.disconnect(true);
      }
    }
  });
  socket.on('error', () => {}); // Middleware denial is already reported through operationError.
  return (event, handler) => socket.on(event, (...args) => {
    try { handler(...args); }
    catch (error) { reject(event, error, args.at(-1)); }
  });
}
