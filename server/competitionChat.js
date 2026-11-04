import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { db } from './db.js';
import { competitionEvents } from './competitionEvents.js';
import { withTransaction, sqlGetCompetitionMessages, sqlGetCompetitionMessageRequest,
  sqlNextCompetitionMessageSequence, sqlInsertCompetitionMessage, sqlCountRecentCompetitionMessages } from './database.js';

function fail(code, message, status) { throw Object.assign(new Error(message), { code, status }); }
function roomFor(user, competitionId) {
  const room = db.competitions.get(competitionId);
  if (!room) fail('NOT_FOUND', 'Convocatoria no encontrada', 404);
  if (user.role !== 'admin' && ![...room.teamA, ...room.teamB].some(member => member.id === user.id))
    fail('FORBIDDEN', 'El chat es privado para sus participantes', 403);
  return room;
}
export function sendCompetitionMessage(user, competitionId, input, now = Date.now()) {
  const room = roomFor(user, competitionId);
  // Administrators can audit, but cannot impersonate a participant in chat.
  if (![...room.teamA, ...room.teamB].some(member => member.id === user.id)) fail('FORBIDDEN', 'Solo los participantes pueden escribir', 403);
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !['requestId', 'text'].includes(key)) ||
      typeof input.requestId !== 'string' || !input.requestId.trim() || input.requestId.length > 100 ||
      typeof input.text !== 'string' || !input.text.trim() || input.text.length > 2000)
    fail('INVALID_PAYLOAD', 'Escribe un mensaje de hasta 2000 caracteres', 400);
  const text = input.text.trim();
  const result = withTransaction(() => {
    const previous = sqlGetCompetitionMessageRequest(competitionId, user.id, input.requestId);
    if (previous) {
      if (previous.text !== text) fail('REQUEST_CONFLICT', 'La solicitud ya se usó con otro mensaje', 409);
      return { success: true, message: previous, replayed: true };
    }
    if (!['OPEN', 'FULL', 'IN_PROGRESS', 'RESULT_PENDING', 'DISPUTED'].includes(room.status))
      fail('INVALID_STATE', 'El chat de esta convocatoria está cerrado', 409);
    if (sqlCountRecentCompetitionMessages(user.id, new Date(now - 60000).toISOString()) >= 30)
      fail('RATE_LIMITED', 'Espera un momento antes de enviar más mensajes', 429);
    const message = { id: randomUUID(), competitionId, sequence: sqlNextCompetitionMessageSequence(competitionId),
      requestId: input.requestId, senderId: user.id, senderName: user.name, text, createdAt: new Date(now).toISOString() };
    sqlInsertCompetitionMessage(message);
    return { success: true, message };
  });
  if (!result.replayed) competitionEvents.emit('message', { competitionId, message: result.message });
  return result;
}
export const competitionChatRouter = Router();
function handle(operation) {
  return (req, res, next) => {
    try { res.json(operation(req)); }
    catch (error) {
      if (!error.code) return next(error);
      res.status(error.status || 400).json({ success: false, code: error.code, error: error.message });
    }
  };
}
competitionChatRouter.get('/:id/messages', handle(req => {
  roomFor(db.getUser(req.user.userId), req.params.id);
  const raw = req.query.after ?? '0';
  if (typeof raw !== 'string' || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) fail('INVALID_PAYLOAD', 'Cursor inválido', 400);
  const messages = sqlGetCompetitionMessages(req.params.id, Number(raw), 101);
  const hasMore = messages.length > 100;
  return { messages: messages.slice(0, 100), hasMore };
}));
competitionChatRouter.post('/:id/messages', handle(req => sendCompetitionMessage(db.getUser(req.user.userId), req.params.id, req.body)));
