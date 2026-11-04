import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { Router } from 'express';
import { db } from './db.js';
import { sqlGetReceipt, sqlInsertReceipt, sqlSaveCompetition } from './database.js';
import { validateCompetitionCommand } from '../shared/competitionContract.mjs';
import districts from './peru_districts.json' with { type: 'json' };

const supported = new Set(['create', 'join', 'leave', 'cancel', 'switchTeam', 'transferHost', 'transferCaptain', 'setReady', 'updateDetails']);
const idOf = user => user.id;
const members = competition => [...competition.teamA, ...competition.teamB];
const participant = (competition, userId) => members(competition).some(user => idOf(user) === userId);
function fail(code, message, status = 409) { throw Object.assign(new Error(message), { code, status }); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  return value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
}
function details(data, now) {
  if (data.timeZone !== 'America/Lima') fail('INVALID_PAYLOAD', 'Selecciona la zona horaria de Perú', 400);
  if (Date.parse(data.scheduledAt) <= now) fail('INVALID_PAYLOAD', 'El horario debe ser futuro', 400);
  const district = districts.find(item => String(item.id) === data.venue.districtId);
  if (!district) fail('INVALID_PAYLOAD', 'Selecciona un distrito del catálogo', 400);
  const format = db.getSports().find(sport => sport.id === 'futbol')?.formats.find(item => item.id === data.formatId && item.active);
  if (!format) fail('INVALID_PAYLOAD', 'Modalidad no disponible', 400);
  return { formatId: data.formatId, playersPerTeam: format.playersPerTeam, scheduledAt: data.scheduledAt,
    timeZone: data.timeZone, venue: { ...data.venue, name: data.venue.name.trim(), address: data.venue.address.trim() },
    district: district.label, department: district.departamento, province: district.provincia };
}
export function preview(value) {
  return { id: value.id, code: value.code, revision: value.revision, countryCode: value.countryCode,
    sportId: value.sportId, formatId: value.formatId, status: value.status, scheduledAt: value.scheduledAt,
    timeZone: value.timeZone, venue: value.venue, district: value.district, department: value.department,
    playersPerTeam: value.playersPerTeam, currentPlayers: members(value).length, totalSlots: value.playersPerTeam * 2,
    teamACount: value.teamA.length, teamBCount: value.teamB.length };
}
export function competitionCommand(actorId, command, input, now = Date.now()) {
  if (!supported.has(command)) fail('UNKNOWN_COMMAND', 'Acción no disponible', 400);
  const validated = validateCompetitionCommand(command, input);
  if (!validated.ok) fail(validated.code, 'Revisa los datos de la convocatoria', 400);
  const data = validated.value;
  const actor = db.getUser(actorId);
  if (!actor) fail('FORBIDDEN', 'Cuenta no disponible', 403);
  const key = `competition:${actorId}:${command}:${data.requestId}`;
  const fingerprint = createHash('sha256').update(JSON.stringify(canonical(data))).digest('hex');
  return db.atomic(() => {
    const receipt = sqlGetReceipt(key);
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) fail('REQUEST_CONFLICT', 'La solicitud ya se usó con otros datos');
      return { ...receipt.result, replayed: true };
    }
    let value;
    if (command === 'create') {
      let code;
      do { code = randomBytes(4).toString('hex').toUpperCase(); } while ([...db.competitions.values()].some(room => room.code === code));
      value = { id: randomUUID(), code, revision: 0, countryCode: 'PE', sportId: 'futbol', ...details(data, now),
        status: 'OPEN', hostUserId: actorId, captains: { teamA: actorId, teamB: null },
        teamA: [{ id: actorId, name: actor.name, avatar: actor.avatar || null, ready: false }], teamB: [], createdAt: new Date(now).toISOString() };
      db.competitions.set(value.id, value);
    } else {
      value = command === 'join' ? [...db.competitions.values()].find(room => room.code === data.code.trim().toUpperCase()) : db.competitions.get(data.competitionId);
      if (!value) fail('NOT_FOUND', 'Convocatoria no encontrada', 404);
      if (value.revision !== data.expectedRevision) fail('REVISION_CONFLICT', 'La convocatoria cambió. Actualízala y vuelve a intentar');
      if (!['OPEN', 'FULL'].includes(value.status)) fail('INVALID_STATE', 'La convocatoria está cerrada');
      if (command !== 'join' && !participant(value, actorId)) fail('FORBIDDEN', 'Debes pertenecer a esta convocatoria', 403);
      if (command === 'join') {
        if (Date.parse(value.scheduledAt) <= now) fail('INVALID_STATE', 'La hora de la convocatoria ya pasó');
        if (participant(value, actorId)) fail('ALREADY_JOINED', 'Ya formas parte de esta convocatoria');
        if (value[data.team].length >= value.playersPerTeam) fail('FULL', 'El equipo está completo');
        value[data.team].push({ id: actorId, name: actor.name, avatar: actor.avatar || null, ready: false });
        if (!value.captains[data.team]) value.captains[data.team] = actorId;
      } else if (command === 'cancel') {
        if (value.hostUserId !== actorId) fail('FORBIDDEN', 'Solo el anfitrión puede cancelar', 403);
        value.status = 'CANCELLED'; value.cancelledBy = actorId; value.cancelReason = data.reason.trim();
      } else if (['transferHost', 'transferCaptain'].includes(command)) {
        const team = value.teamA.some(user => user.id === actorId) ? 'teamA' : 'teamB';
        if (command === 'transferHost') {
          if (value.hostUserId !== actorId || !participant(value, data.targetUserId)) fail('FORBIDDEN', 'Transferencia de anfitrión no permitida', 403);
          value.hostUserId = data.targetUserId;
        } else {
          if (value.captains[team] !== actorId || !value[team].some(user => user.id === data.targetUserId)) fail('FORBIDDEN', 'El capitán solo puede transferir a su equipo', 403);
          value.captains[team] = data.targetUserId;
        }
      } else if (command === 'updateDetails') {
        if (value.hostUserId !== actorId) fail('FORBIDDEN', 'Solo el anfitrión puede editar', 403);
        const next = details(data, now);
        if (value.teamA.length > next.playersPerTeam || value.teamB.length > next.playersPerTeam) fail('FULL', 'No se puede reducir la capacidad con esos participantes');
        Object.assign(value, next);
        members(value).forEach(user => { user.ready = false; });
      } else {
        const team = value.teamA.some(user => user.id === actorId) ? 'teamA' : 'teamB';
        const user = value[team].find(item => item.id === actorId);
        if (command === 'setReady') user.ready = data.ready;
        else {
          if (members(value).length === 1 && command === 'leave') value.status = 'CANCELLED';
          else if ((command === 'leave' && value.hostUserId === actorId) || (value.captains[team] === actorId && value[team].length > 1)) fail('TRANSFER_REQUIRED', 'Transfiere tu rol antes de salir o cambiar equipo');
          if (command === 'switchTeam') {
            if (data.team === team) fail('INVALID_STATE', 'Ya estás en ese equipo');
            if (value[data.team].length >= value.playersPerTeam) fail('FULL', 'El equipo está completo');
            user.ready = false; value[data.team].push(user);
            if (!value.captains[data.team]) value.captains[data.team] = actorId;
          }
          value[team] = value[team].filter(item => item.id !== actorId);
          if (!value[team].length) value.captains[team] = null;
        }
      }
    }
    if (value.status !== 'CANCELLED') value.status = members(value).length === value.playersPerTeam * 2 ? 'FULL' : 'OPEN';
    value.revision++; value.updatedAt = new Date(now).toISOString();
    sqlSaveCompetition(value);
    const result = { success: true, requestId: data.requestId, competitionId: value.id, revision: value.revision, data: structuredClone(value) };
    sqlInsertReceipt(key, { fingerprint, result });
    return result;
  });
}

export const competitionRouter = Router();
competitionRouter.get('/', (req, res) => {
  let rooms = [...db.competitions.values()].filter(room => ['OPEN', 'FULL'].includes(room.status) && Date.parse(room.scheduledAt) > Date.now());
  if (req.query.districtId) rooms = rooms.filter(room => room.venue.districtId === req.query.districtId);
  if (req.query.formatId) rooms = rooms.filter(room => room.formatId === req.query.formatId);
  res.json({ competitions: rooms.sort((a,b) => a.scheduledAt.localeCompare(b.scheduledAt)).map(preview) });
});
competitionRouter.get('/mine', (req, res) => res.json({ competitions: [...db.competitions.values()].filter(room => participant(room, req.user.userId)).map(room => structuredClone(room)) }));
competitionRouter.get('/by-code/:code', (req, res) => {
  const room = [...db.competitions.values()].find(value => value.code === req.params.code.trim().toUpperCase());
  if (!room) return res.status(404).json({ error: 'Convocatoria no encontrada', code: 'NOT_FOUND' });
  res.json({ competition: preview(room) });
});
competitionRouter.get('/:id', (req, res) => {
  const room = db.competitions.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Convocatoria no encontrada' });
  if (req.user.role !== 'admin' && !participant(room, req.user.userId)) return res.status(403).json({ error: 'Debes pertenecer a la convocatoria' });
  res.json({ competition: room });
});
competitionRouter.post('/commands/:command', (req, res) => {
  try { res.json(competitionCommand(req.user.userId, req.params.command, req.body)); }
  catch (error) { if (!error.code) throw error; res.status(error.status || 400).json({ success: false, code: error.code, error: error.message }); }
});
