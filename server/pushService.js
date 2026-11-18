import { db } from './db.js';
import { logger } from './logger.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export function isValidPushToken(token) {
  if (!token || typeof token !== 'string') return false;
  return token.trim().length > 0;
}

export function createPushService({
  database = db,
  transport = defaultPushTransport,
  enabled = true,
} = {}) {
  let activeTransport = transport;

  async function sendToUsers(userIds, { title, body, data = {} }) {
    if (!enabled) return { sentCount: 0, recipientIds: [] };
    const ids = Array.isArray(userIds) ? Array.from(new Set(userIds)) : [userIds];
    const messages = [];
    const recipientIds = [];

    for (const id of ids) {
      if (!id) continue;
      const user = database.getUser(id);
      if (!user) continue;
      // Regla de seguridad: Usuario baneado no recibe avisos push
      if (user.isBanned) continue;
      // Regla de token: Debe tener un push token registrado válido
      if (!isValidPushToken(user.pushToken)) continue;

      messages.push({
        to: user.pushToken,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'matchsport-alerts',
      });
      recipientIds.push(id);
    }

    if (messages.length === 0) return { sentCount: 0, recipientIds: [] };

    try {
      await activeTransport(messages);
      logger.info(`[PUSH] Enviadas ${messages.length} notificaciones push a destinatarios válidos`);
      return { sentCount: messages.length, recipientIds };
    } catch (err) {
      logger.error(`[PUSH] Error al despachar notificaciones push: ${err.message}`);
      return { sentCount: 0, recipientIds, error: err.message };
    }
  }

  return {
    sendToUsers,
    setTransport(newTransport) {
      activeTransport = newTransport;
    },
    notifyCompetitionMessage({ competitionId, senderId, senderName, text }) {
      const room = database.competitions?.get(competitionId);
      if (!room) return Promise.resolve({ sentCount: 0, recipientIds: [] });
      const members = [...(room.teamA || []), ...(room.teamB || [])];
      // Solo destinatarios del partido excluyendo al propio remitente (V-18)
      const recipientIds = members
        .map(m => m.id || m.userId)
        .filter(id => id && id !== senderId);

      return sendToUsers(recipientIds, {
        title: `💬 Chat: ${senderName || 'Jugador'} en #${room.code || competitionId}`,
        body: text && text.length > 80 ? `${text.slice(0, 77)}...` : text,
        data: { type: 'COMPETITION_CHAT', competitionId, code: room.code }
      });
    },

    notifyScoreReported({ competitionId, matchId, reporterId, scoreA, scoreB }) {
      const room = database.competitions?.get(competitionId);
      if (!room) return Promise.resolve({ sentCount: 0, recipientIds: [] });
      const members = [...(room.teamA || []), ...(room.teamB || [])];
      // Notificar a todos los miembros del partido excepto al propio informante
      const recipientIds = members
        .map(m => m.id || m.userId)
        .filter(id => id && id !== reporterId);

      return sendToUsers(recipientIds, {
        title: '⚽ Marcador Reportado en MatchSport',
        body: `El capitán rival reportó el marcador ${scoreA} - ${scoreB}. Toca para validar o disputar.`,
        data: { type: 'COMPETITION_MATCH', competitionId, matchId, code: room.code }
      });
    },

    notifyScoreConfirmed({ competitionId, matchId, confirmedBy, winnerTeam }) {
      const room = database.competitions?.get(competitionId);
      if (!room) return Promise.resolve({ sentCount: 0, recipientIds: [] });
      const members = [...(room.teamA || []), ...(room.teamB || [])];
      const recipientIds = members
        .map(m => m.id || m.userId)
        .filter(id => id && id !== confirmedBy);

      const outcomeText = winnerTeam === 'draw' ? 'Empate Oficial' : (winnerTeam ? `Victoria ${winnerTeam}` : 'Resultado Oficial');
      return sendToUsers(recipientIds, {
        title: '🏆 Marcador Confirmado',
        body: `El partido ha finalizado formalmente (${outcomeText}). Se han actualizado los ratings Glicko-2.`,
        data: { type: 'COMPETITION_MATCH', competitionId, matchId, code: room.code }
      });
    },

    notifyScoreDisputed({ competitionId, matchId, disputerId, reason }) {
      const room = database.competitions?.get(competitionId);
      if (!room) return Promise.resolve({ sentCount: 0, recipientIds: [] });
      const members = [...(room.teamA || []), ...(room.teamB || [])];
      const recipientIds = members
        .map(m => m.id || m.userId)
        .filter(id => id && id !== disputerId);

      return sendToUsers(recipientIds, {
        title: '⚠️ Marcador en Disputa Arbitral',
        body: `Se ha abierto una disputa formal${reason ? `: ${reason}` : ''}. Un SuperAdmin la resolverá a la brevedad.`,
        data: { type: 'COMPETITION_MATCH', competitionId, matchId, code: room.code }
      });
    },

    notifyDisputeResolved({ competitionId, matchId, winnerTeam, reason }) {
      const room = database.competitions?.get(competitionId);
      if (!room) return Promise.resolve({ sentCount: 0, recipientIds: [] });
      const members = [...(room.teamA || []), ...(room.teamB || [])];
      const recipientIds = members.map(m => m.id || m.userId).filter(Boolean);

      const verdict = winnerTeam === 'draw' ? 'Empate Oficial' : (winnerTeam === 'teamA' ? 'Victoria Equipo A' : 'Victoria Equipo B');
      return sendToUsers(recipientIds, {
        title: '⚖️ Dictamen Arbitral SuperAdmin',
        body: `La disputa ha sido resuelta: ${verdict}.${reason ? ` Motivo: ${reason}` : ''}`,
        data: { type: 'COMPETITION_MATCH', competitionId, matchId, code: room.code }
      });
    },

    notifyMatchReady({ competitionId, matchId, code }) {
      const room = database.competitions?.get(competitionId);
      if (!room) return Promise.resolve({ sentCount: 0, recipientIds: [] });
      const members = [...(room.teamA || []), ...(room.teamB || [])];
      const recipientIds = members.map(m => m.id || m.userId).filter(Boolean);

      return sendToUsers(recipientIds, {
        title: '🏟️ ¡Partido Listo para Iniciar!',
        body: `Todos los jugadores están listos en la convocatoria #${code || room.code}.`,
        data: { type: 'COMPETITION_MATCH', competitionId, matchId, code: code || room.code }
      });
    }
  };
}

async function defaultPushTransport(messages) {
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      throw new Error(`Expo Push API error: ${res.status} ${res.statusText}`);
    }
  }
}

export const pushService = createPushService();
