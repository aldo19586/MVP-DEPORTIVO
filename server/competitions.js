import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { Router } from 'express';
import { db } from './db.js';
import { isInTransaction, sqlGetReceipt, sqlInsertReceipt, sqlSaveCompetition } from './database.js';
import { validateCompetitionCommand, outcomeFromScore } from '../shared/competitionContract.mjs';
import districts from './peru_districts.json' with { type: 'json' };
import { competitionEvents } from './competitionEvents.js';
import { competitionChatRouter } from './competitionChat.js';

export const persistentMatchmakingConfig = {
  defaultMinPlayers: null,
  minPlayersByFormat: {}
};

export function setPersistentMatchmakingConfig(overrides = {}) {
  if (overrides.defaultMinPlayers !== undefined) {
    persistentMatchmakingConfig.defaultMinPlayers = overrides.defaultMinPlayers;
  }
  if (overrides.minPlayersByFormat && typeof overrides.minPlayersByFormat === 'object') {
    persistentMatchmakingConfig.minPlayersByFormat = {
      ...persistentMatchmakingConfig.minPlayersByFormat,
      ...overrides.minPlayersByFormat
    };
  }
  return persistentMatchmakingConfig;
}

function cleanDistrictText(raw) {
  if (raw === undefined || raw === null) return '';
  const str = String(raw).trim();
  if (!str) return '';
  const byId = districts.find(item => String(item.id) === str);
  const source = byId ? byId.label : str;
  return source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\bsantiago de surco\b/g, 'surco')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function resolveCatalogDistrict(raw) {
  if (raw !== undefined && raw !== null) {
    const str = String(raw).trim();
    const byId = districts.find(item => String(item.id) === str);
    if (byId) return byId;
    const cleaned = cleanDistrictText(str);
    const baseName = cleaned.split(',')[0].trim();
    const exactMatch = districts.find(item => cleanDistrictText(item.label) === cleaned);
    if (exactMatch) return exactMatch;
    const limaMatch = districts.find(
      item => cleanDistrictText(item.distrito) === baseName && cleanDistrictText(item.departamento) === 'lima'
    );
    if (limaMatch) return limaMatch;
    const anyMatch = districts.find(item => cleanDistrictText(item.distrito) === baseName);
    if (anyMatch) return anyMatch;
  }
  return districts.find(item => item.id === 950) || districts[0];
}

export function districtsMatch(userDistrict, room) {
  if (!userDistrict || !room) return false;
  const uStr = String(userDistrict).trim();
  if (room.venue?.districtId && uStr === String(room.venue.districtId).trim()) return true;
  const uNorm = cleanDistrictText(uStr);
  const rNorm = cleanDistrictText(room.district || room.venue?.districtId);
  if (!uNorm || !rNorm) return false;
  if (uNorm === rNorm) return true;
  const uParts = uNorm.split(',').map(s => s.trim()).filter(Boolean);
  const rParts = rNorm.split(',').map(s => s.trim()).filter(Boolean);
  if (uParts[0] && rParts[0] && uParts[0] === rParts[0]) {
    if (uParts.length === 1 || rParts.length === 1 || uParts[1] === rParts[1]) {
      return true;
    }
  }
  return false;
}

function getThresholdForFormat(formatId, playersPerTeam, customMinPlayers = null) {
  const maxPlayers = playersPerTeam * 2;
  if (Number.isFinite(customMinPlayers) && customMinPlayers >= 2) {
    return Math.min(maxPlayers, Math.floor(customMinPlayers));
  }
  const byFmt = persistentMatchmakingConfig.minPlayersByFormat?.[formatId];
  if (Number.isFinite(byFmt) && byFmt >= 2) {
    return Math.min(maxPlayers, Math.floor(byFmt));
  }
  if (Number.isFinite(persistentMatchmakingConfig.defaultMinPlayers) && persistentMatchmakingConfig.defaultMinPlayers >= 2) {
    return Math.min(maxPlayers, Math.floor(persistentMatchmakingConfig.defaultMinPlayers));
  }
  const envMin = Number(process.env.MATCHSPORT_MM_MIN_PLAYERS);
  if (Number.isFinite(envMin) && envMin >= 2) {
    return Math.min(maxPlayers, Math.floor(envMin));
  }
  return Math.max(2, Math.min(4, maxPlayers));
}

const supported = new Set([
  'create', 'join', 'leave', 'cancel', 'switchTeam', 'transferHost',
  'transferCaptain', 'setReady', 'updateDetails', 'start',
  'reportScore', 'confirmScore', 'disputeScore', 'resolveDispute'
]);
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
  const result = db.atomic(() => {
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
      db.updateUserMatchmakingStatus(actorId, { status: 'IN_ROOM', activeCompetitionId: value.id, skipOnboardingCheck: true });
    } else {
      value = command === 'join' ? [...db.competitions.values()].find(room => room.code === data.code.trim().toUpperCase()) : db.competitions.get(data.competitionId);
      if (!value) fail('NOT_FOUND', 'Convocatoria no encontrada', 404);
      if (value.revision !== data.expectedRevision) fail('REVISION_CONFLICT', 'La convocatoria cambió. Actualízala y vuelve a intentar');
      if (['reportScore', 'confirmScore', 'disputeScore', 'resolveDispute'].includes(command)) {
        if (command === 'reportScore' && !['IN_PROGRESS', 'RESULT_PENDING'].includes(value.status)) {
          fail('INVALID_STATE', 'El partido debe estar en juego o esperando confirmación');
        }
        if (['confirmScore', 'disputeScore'].includes(command) && value.status !== 'RESULT_PENDING') {
          fail('INVALID_STATE', 'No hay reporte pendiente');
        }
        if (command === 'resolveDispute' && value.status !== 'DISPUTED') {
          fail('INVALID_STATE', 'La convocatoria no está en disputa');
        }
      } else if (command === 'cancel' && actor.role === 'admin') {
        // El administrador puede anular en cualquier estado del partido
      } else {
        if (!['OPEN', 'FULL'].includes(value.status)) fail('INVALID_STATE', 'La convocatoria está cerrada');
      }
      if (command !== 'join' && actor.role !== 'admin' && !participant(value, actorId)) fail('FORBIDDEN', 'Debes pertenecer a esta convocatoria', 403);
      if (command === 'join') {
        if (Date.parse(value.scheduledAt) <= now) fail('INVALID_STATE', 'La hora de la convocatoria ya pasó');
        if (participant(value, actorId)) fail('ALREADY_JOINED', 'Ya formas parte de esta convocatoria');
        if (value[data.team].length >= value.playersPerTeam) fail('FULL', 'El equipo está completo');
        value[data.team].push({ id: actorId, name: actor.name, avatar: actor.avatar || null, ready: false });
        if (!value.captains[data.team]) value.captains[data.team] = actorId;
        db.updateUserMatchmakingStatus(actorId, { status: 'IN_ROOM', activeCompetitionId: value.id, skipOnboardingCheck: true });
      } else if (command === 'start') {
        if (value.hostUserId !== actorId) fail('FORBIDDEN', 'Solo el anfitrión puede iniciar', 403);
        if (value.teamA.length !== value.playersPerTeam || value.teamB.length !== value.playersPerTeam) fail('INCOMPLETE_TEAMS', 'Ambos equipos deben estar completos');
        if (!['teamA', 'teamB'].every(team => value[team].some(member => member.id === value.captains[team]))) fail('CAPTAIN_REQUIRED', 'Cada equipo necesita un capitán');
        if (!members(value).every(member => member.ready)) fail('NOT_READY', 'Todos los participantes deben marcar Listo');
        if (now < Date.parse(value.scheduledAt)) fail('NOT_STARTED_YET', 'Puedes iniciar a partir de la hora programada');
        const format = db.getSports().find(sport => sport.id === value.sportId)?.formats.find(item => item.id === value.formatId && item.active);
        if (!format) fail('INVALID_STATE', 'La modalidad no está disponible');
        const playerIds = new Set(members(value).map(member => member.id));
        if (playerIds.size !== value.playersPerTeam * 2) fail('DUPLICATE_PLAYER', 'Un jugador ocupa más de un cupo');
        for (const playerId of playerIds) {
          const player = db.getUser(playerId);
          if (!player || (player.isBanned && player.bannedUntil > now)) fail('PLAYER_UNAVAILABLE', 'Hay un participante no habilitado');
        }
        const activeNew = [...db.competitionMatches.values()].some(match => ['IN_PROGRESS', 'RESULT_PENDING', 'DISPUTED'].includes(match.status) && [...match.teamA, ...match.teamB].some(member => playerIds.has(member.id)));
        const activeLegacy = [...db.matches.values()].some(match => ['active', 'in_progress', 'disputed'].includes(match.status) && [...match.teamA, ...match.teamB].some(member => playerIds.has(member.userId || member.id)));
        if (activeNew || activeLegacy) fail('ACTIVE_MATCH', 'Un participante ya tiene otro partido activo o pendiente');
        const match = { id: randomUUID(), competitionId: value.id, status: 'IN_PROGRESS', revision: 1,
          sportId: value.sportId, formatId: value.formatId, venue: structuredClone(value.venue), district: value.district,
          scheduledAt: value.scheduledAt, timeZone: value.timeZone, startedAt: new Date(now).toISOString(),
          teamA: structuredClone(value.teamA), teamB: structuredClone(value.teamB), captains: { ...value.captains } };
        db.competitionMatches.set(match.id, match);
        db._persistCompetitionMatch(match);
        value.status = 'IN_PROGRESS'; value.matchId = match.id; value.startedAt = match.startedAt;
      } else if (command === 'reportScore') {
        const match = db.competitionMatches.get(value.matchId);
        if (!match) fail('NOT_FOUND', 'Partido no encontrado', 404);
        const actorTeam = value.captains.teamA === actorId ? 'teamA' : value.captains.teamB === actorId ? 'teamB' : null;
        if (!actorTeam) fail('FORBIDDEN', 'Solo los capitanes pueden reportar el marcador', 403);

        if (!value.report || value.status === 'IN_PROGRESS') {
          const reportId = randomUUID();
          value.report = {
            reportId,
            reportedBy: actorId,
            reportedTeam: actorTeam,
            reportedAt: new Date(now).toISOString(),
            score: { teamA: data.score.teamA, teamB: data.score.teamB },
          };
          value.status = 'RESULT_PENDING';
          match.status = 'RESULT_PENDING';
          match.report = structuredClone(value.report);
          match.revision++;
          db._persistCompetitionMatch(match);
        } else if (value.report.reportedTeam === actorTeam) {
          const reportId = randomUUID();
          value.report = {
            reportId,
            reportedBy: actorId,
            reportedTeam: actorTeam,
            reportedAt: new Date(now).toISOString(),
            score: { teamA: data.score.teamA, teamB: data.score.teamB },
          };
          match.report = structuredClone(value.report);
          match.revision++;
          db._persistCompetitionMatch(match);
        } else {
          if (data.score.teamA === value.report.score.teamA && data.score.teamB === value.report.score.teamB) {
            value.status = 'FINISHED';
            value.confirmedBy = actorId;
            value.confirmedAt = new Date(now).toISOString();
            value.finalScore = structuredClone(value.report.score);
            value.outcome = outcomeFromScore(value.finalScore);
            const fin = db.finalizeCompetitionMatch(match, value.outcome, value.finalScore, actorId, 'coincidence');
            value.ratingUpdates = structuredClone(fin.ratingUpdates);
            value.finishedAt = match.finishedAt;
            for (const member of members(value)) {
              db.updateUserMatchmakingStatus(member.id, { status: 'IDLE', activeCompetitionId: null, skipOnboardingCheck: true });
            }
          } else {
            const disputeId = randomUUID();
            value.status = 'DISPUTED';
            value.dispute = {
              disputeId,
              reportId: value.report.reportId,
              disputedBy: actorId,
              disputedAt: new Date(now).toISOString(),
              reason: `Discrepancia: ${value.report.reportedTeam} reportó ${value.report.score.teamA}-${value.report.score.teamB}, ${actorTeam} reportó ${data.score.teamA}-${data.score.teamB}`,
              initialReport: structuredClone(value.report),
              counterReport: {
                reportedBy: actorId,
                reportedTeam: actorTeam,
                score: { teamA: data.score.teamA, teamB: data.score.teamB },
              },
            };
            match.status = 'DISPUTED';
            match.dispute = structuredClone(value.dispute);
            match.revision++;
            db._persistCompetitionMatch(match);
          }
        }
      } else if (command === 'confirmScore') {
        const match = db.competitionMatches.get(value.matchId);
        if (!match) fail('NOT_FOUND', 'Partido no encontrado', 404);
        if (!value.report || value.report.reportId !== data.reportId) {
          fail('REPORT_SUPERSEDED', 'El reporte no existe o fue reemplazado');
        }
        const actorTeam = value.captains.teamA === actorId ? 'teamA' : value.captains.teamB === actorId ? 'teamB' : null;
        if (!actorTeam) fail('FORBIDDEN', 'Solo los capitanes pueden confirmar el marcador', 403);
        if (actorTeam === value.report.reportedTeam) {
          fail('FORBIDDEN', 'El reporte debe ser confirmado por el capitán del equipo rival', 403);
        }
        value.status = 'FINISHED';
        value.confirmedBy = actorId;
        value.confirmedAt = new Date(now).toISOString();
        value.finalScore = structuredClone(value.report.score);
        value.outcome = outcomeFromScore(value.finalScore);
        const fin = db.finalizeCompetitionMatch(match, value.outcome, value.finalScore, actorId, 'confirmation');
        value.ratingUpdates = structuredClone(fin.ratingUpdates);
        value.finishedAt = match.finishedAt;
        for (const member of members(value)) {
          db.updateUserMatchmakingStatus(member.id, { status: 'IDLE', activeCompetitionId: null, skipOnboardingCheck: true });
        }
      } else if (command === 'disputeScore') {
        const match = db.competitionMatches.get(value.matchId);
        if (!match) fail('NOT_FOUND', 'Partido no encontrado', 404);
        if (!value.report || value.report.reportId !== data.reportId) {
          fail('REPORT_SUPERSEDED', 'El reporte no existe o fue reemplazado');
        }
        const actorTeam = value.captains.teamA === actorId ? 'teamA' : value.captains.teamB === actorId ? 'teamB' : null;
        if (!actorTeam) fail('FORBIDDEN', 'Solo los capitanes pueden disputar el marcador', 403);
        if (actorTeam === value.report.reportedTeam) {
          fail('FORBIDDEN', 'El reporte solo puede ser disputado por el capitán del equipo rival', 403);
        }
        const disputeId = randomUUID();
        value.status = 'DISPUTED';
        value.dispute = {
          disputeId,
          reportId: data.reportId,
          disputedBy: actorId,
          disputedAt: new Date(now).toISOString(),
          reason: data.reason.trim(),
          initialReport: structuredClone(value.report),
        };
        match.status = 'DISPUTED';
        match.dispute = structuredClone(value.dispute);
        match.revision++;
        db._persistCompetitionMatch(match);
      } else if (command === 'resolveDispute') {
        if (actor.role !== 'admin') fail('FORBIDDEN', 'Solo el SuperAdmin puede resolver disputas', 403);
        const match = db.competitionMatches.get(value.matchId);
        if (!match) fail('NOT_FOUND', 'Partido no encontrado', 404);
        if (!value.dispute || value.dispute.disputeId !== data.disputeId) {
          fail('NOT_FOUND', 'Disputa no encontrada o no coincide', 404);
        }
        if (!data.score || typeof data.score.teamA !== 'number' || typeof data.score.teamB !== 'number' ||
            data.score.teamA < 0 || data.score.teamB < 0 ||
            !Number.isInteger(data.score.teamA) || !Number.isInteger(data.score.teamB)) {
          fail('INVALID_SCORE', 'Marcador inválido para resolver la disputa');
        }
        if (!data.reason || typeof data.reason !== 'string' || !data.reason.trim()) {
          fail('INVALID_DATA', 'Debes incluir el motivo de resolución arbitral');
        }
        const outcome = outcomeFromScore(data.score);
        const fin = db.finalizeCompetitionMatch(match, outcome, data.score, actorId, 'admin', data.reason.trim());
        value.status = 'FINISHED';
        value.finalScore = structuredClone(data.score);
        value.outcome = outcome;
        value.resolvedBy = actorId;
        value.resolutionReason = data.reason.trim();
        value.resolvedAt = match.finishedAt;
        value.ratingUpdates = structuredClone(fin.ratingUpdates);
        value.finishedAt = match.finishedAt;
        for (const member of members(value)) {
          db.updateUserMatchmakingStatus(member.id, { status: 'IDLE', activeCompetitionId: null, skipOnboardingCheck: true });
        }
      } else if (command === 'cancel') {
        if (actor.role === 'admin') {
          value.status = 'CANCELLED';
          value.cancelledBy = actorId;
          value.cancelReason = (data.reason || 'Cancelado por SuperAdmin').trim();
          if (value.matchId) {
            const match = db.competitionMatches.get(value.matchId);
            if (match) {
              match.status = 'CANCELLED';
              match.cancelledBy = actorId;
              match.cancelReason = value.cancelReason;
              match.revision++;
              db._persistCompetitionMatch(match);
            }
          }
        } else {
          if (value.hostUserId !== actorId) fail('FORBIDDEN', 'Solo el anfitrión puede cancelar', 403);
          value.status = 'CANCELLED';
          value.cancelledBy = actorId;
          value.cancelReason = data.reason.trim();
        }
        for (const member of members(value)) {
          db.updateUserMatchmakingStatus(member.id, { status: 'IDLE', activeCompetitionId: null, skipOnboardingCheck: true });
        }
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
          if (command === 'leave') {
            db.updateUserMatchmakingStatus(actorId, { status: 'IDLE', activeCompetitionId: null, skipOnboardingCheck: true });
          }
        }
      }
    }
    if (['OPEN', 'FULL'].includes(value.status)) value.status = members(value).length === value.playersPerTeam * 2 ? 'FULL' : 'OPEN';
    value.revision++; value.updatedAt = new Date(now).toISOString();
    sqlSaveCompetition(value);
    const result = { success: true, requestId: data.requestId, competitionId: value.id, revision: value.revision, data: structuredClone(value) };
    sqlInsertReceipt(key, { fingerprint, result });
    return result;
  });
  if (!result.replayed) {
    competitionEvents.emit('changed', { competitionId: result.competitionId, revision: result.revision });
    if (result.data.status === 'RESULT_PENDING' && result.data.report) {
      competitionEvents.emit('scoreReported', { competitionId: result.competitionId, matchId: result.data.matchId, report: result.data.report, revision: result.revision });
    } else if (result.data.status === 'FINISHED' && result.data.finalScore) {
      competitionEvents.emit('scoreConfirmed', {
        competitionId: result.competitionId,
        matchId: result.data.matchId,
        finalScore: result.data.finalScore,
        outcome: result.data.outcome,
        ratingUpdates: result.data.ratingUpdates,
        revision: result.revision
      });
      if (result.data.resolvedBy) {
        competitionEvents.emit('disputeResolved', {
          competitionId: result.competitionId,
          matchId: result.data.matchId,
          resolvedBy: result.data.resolvedBy,
          resolutionReason: result.data.resolutionReason,
          finalScore: result.data.finalScore,
          outcome: result.data.outcome,
          ratingUpdates: result.data.ratingUpdates,
          revision: result.revision
        });
      }
    } else if (result.data.status === 'DISPUTED' && result.data.dispute) {
      competitionEvents.emit('scoreDisputed', { competitionId: result.competitionId, matchId: result.data.matchId, dispute: result.data.dispute, revision: result.revision });
    }
    if (result.data.status === 'OPEN') {
      const mmResult = runPersistentMatchmaking({ now });
      if (mmResult.assignments.some(item => item.competition.id === result.competitionId)) {
        const updatedRoom = db.competitions.get(result.competitionId);
        if (updatedRoom) {
          result.data = structuredClone(updatedRoom);
          result.revision = updatedRoom.revision;
        }
      }
    }
  }
  return result;
}

export function runPersistentMatchmaking(options = {}) {
  const now = typeof options === 'number' ? options : (options.now || Date.now());
  const customMinPlayers = typeof options === 'object' && options !== null ? options.minPlayers : null;

  const execute = () => {
    db.purgeExpiredMatchmakingStatuses(now);

    const assignments = [];
    const searchingUsers = [...db.users.values()]
      .filter(u => {
        if (!u || u.matchmakingStatus !== 'SEARCHING') return false;
        if (u.isBanned && u.bannedUntil && u.bannedUntil > now) return false;
        return true;
      })
      .sort((a, b) => {
        const tA = a.searchingSince ? Date.parse(a.searchingSince) : 0;
        const tB = b.searchingSince ? Date.parse(b.searchingSince) : 0;
        if (tA !== tB) return tA - tB;
        return String(a.id).localeCompare(String(b.id));
      });

    if (searchingUsers.length === 0) {
      return { assignments };
    }

    const availablePool = new Map(searchingUsers.map(u => [u.id, u]));

    // Caso A: Unir jugadores SEARCHING a convocatorias OPEN existentes con horario futuro
    const openRooms = [...db.competitions.values()]
      .filter(room =>
        room &&
        room.status === 'OPEN' &&
        Date.parse(room.scheduledAt) > now &&
        members(room).length < room.playersPerTeam * 2
      )
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    for (const room of openRooms) {
      if (availablePool.size === 0) break;
      const assignedToRoom = [];

      for (const [candidateId, candidate] of availablePool.entries()) {
        if (members(room).length >= room.playersPerTeam * 2) break;
        const candidateFormat = candidate.searchingFormat || '7v7';
        const candidateDistrict = candidate.searchingDistrict || candidate.district;
        if (candidateFormat !== room.formatId) continue;
        if (!districtsMatch(candidateDistrict, room)) continue;
        if (participant(room, candidateId)) continue;

        let targetTeam;
        if (room.teamA.length < room.teamB.length && room.teamA.length < room.playersPerTeam) {
          targetTeam = 'teamA';
        } else if (room.teamB.length < room.teamA.length && room.teamB.length < room.playersPerTeam) {
          targetTeam = 'teamB';
        } else if (room.teamA.length < room.playersPerTeam) {
          targetTeam = 'teamA';
        } else {
          targetTeam = 'teamB';
        }

        room[targetTeam].push({
          id: candidate.id,
          name: candidate.name,
          avatar: candidate.avatar || null,
          ready: false
        });
        if (!room.captains[targetTeam]) {
          room.captains[targetTeam] = candidate.id;
        }

        db.updateUserMatchmakingStatus(candidate.id, {
          status: 'IN_ROOM',
          activeCompetitionId: room.id,
          skipOnboardingCheck: true
        });
        availablePool.delete(candidateId);
        assignedToRoom.push(candidate.id);
      }

      if (assignedToRoom.length > 0) {
        room.status = members(room).length >= room.playersPerTeam * 2 ? 'FULL' : 'OPEN';
        room.revision++;
        room.updatedAt = new Date(now).toISOString();
        sqlSaveCompetition(room);
        assignments.push({
          type: 'JOINED_EXISTING',
          competition: structuredClone(room),
          assignedUserIds: assignedToRoom
        });
      }
    }

    // Caso B: Bolsa de jugadores SEARCHING en la misma zona y modalidad
    if (availablePool.size >= 2) {
      const buckets = new Map();
      for (const candidate of availablePool.values()) {
        const formatId = candidate.searchingFormat || '7v7';
        const rawDistrict = candidate.searchingDistrict || candidate.district || 'Miraflores, Lima';
        const districtKey = cleanDistrictText(rawDistrict);
        if (!districtKey) continue;
        const bucketKey = `${formatId}::${districtKey}`;
        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, { formatId, rawDistrict, players: [] });
        }
        buckets.get(bucketKey).players.push(candidate);
      }

      const futbolFormats = db.getSports().find(sport => sport.id === 'futbol')?.formats || [];

      for (const bucket of buckets.values()) {
        const format = futbolFormats.find(item => item.id === bucket.formatId && item.active);
        if (!format) continue;
        const playersPerTeam = format.playersPerTeam;
        const maxPlayers = playersPerTeam * 2;
        const threshold = getThresholdForFormat(bucket.formatId, playersPerTeam, customMinPlayers);

        while (bucket.players.length >= threshold) {
          const batch = bucket.players.splice(0, maxPlayers);
          const getRating = u => {
            const r = Number(u.ratingOverall);
            return Number.isFinite(r) && r > 0 ? r : 1500;
          };
          const sortedByRating = [...batch].sort((a, b) => {
            const diff = getRating(b) - getRating(a);
            if (diff !== 0) return diff;
            return String(a.id).localeCompare(String(b.id));
          });

          const teamAUsers = [];
          const teamBUsers = [];
          let sumRatingA = 0;
          let sumRatingB = 0;

          for (const player of sortedByRating) {
            const rating = getRating(player);
            if (teamAUsers.length < teamBUsers.length && teamAUsers.length < playersPerTeam) {
              teamAUsers.push(player);
              sumRatingA += rating;
            } else if (teamBUsers.length < teamAUsers.length && teamBUsers.length < playersPerTeam) {
              teamBUsers.push(player);
              sumRatingB += rating;
            } else if (teamAUsers.length < playersPerTeam && (sumRatingA <= sumRatingB || teamBUsers.length >= playersPerTeam)) {
              teamAUsers.push(player);
              sumRatingA += rating;
            } else {
              teamBUsers.push(player);
              sumRatingB += rating;
            }
          }

          const toMember = u => ({ id: u.id, name: u.name, avatar: u.avatar || null, ready: false });
          const teamA = teamAUsers.map(toMember);
          const teamB = teamBUsers.map(toMember);
          const captainA = teamA[0]?.id || null;
          const captainB = teamB[0]?.id || null;
          const hostUserId = captainA || captainB;

          const catalogDistrict = resolveCatalogDistrict(bucket.rawDistrict);
          let code;
          do {
            code = randomBytes(4).toString('hex').toUpperCase();
          } while ([...db.competitions.values()].some(room => room.code === code));

          const totalAssigned = teamA.length + teamB.length;
          const newRoom = {
            id: randomUUID(),
            code,
            revision: 1,
            countryCode: 'PE',
            sportId: 'futbol',
            formatId: bucket.formatId,
            playersPerTeam,
            scheduledAt: new Date(now + 2 * 3600 * 1000).toISOString(),
            timeZone: 'America/Lima',
            venue: {
              name: `Cancha MatchSport ${catalogDistrict.distrito}`,
              address: `Zona Deportiva ${catalogDistrict.distrito}`,
              districtId: String(catalogDistrict.id)
            },
            district: bucket.rawDistrict || catalogDistrict.label,
            department: catalogDistrict.departamento || 'Lima',
            province: catalogDistrict.provincia || 'Lima',
            status: totalAssigned >= maxPlayers ? 'FULL' : 'OPEN',
            hostUserId,
            captains: { teamA: captainA, teamB: captainB },
            teamA,
            teamB,
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString()
          };

          db.competitions.set(newRoom.id, newRoom);
          sqlSaveCompetition(newRoom);

          const assignedIds = batch.map(p => p.id);
          for (const player of batch) {
            db.updateUserMatchmakingStatus(player.id, {
              status: 'IN_ROOM',
              activeCompetitionId: newRoom.id,
              skipOnboardingCheck: true
            });
            availablePool.delete(player.id);
          }

          assignments.push({
            type: 'CREATED_FROM_POOL',
            competition: structuredClone(newRoom),
            assignedUserIds: assignedIds
          });
        }
      }
    }

    return { assignments };
  };

  const result = isInTransaction() ? execute() : db.atomic(execute);

  for (const item of result.assignments) {
    competitionEvents.emit('changed', {
      competitionId: item.competition.id,
      revision: item.competition.revision,
      competition: item.competition
    });
    competitionEvents.emit('matchmakingRoomAssigned', {
      userIds: item.assignedUserIds,
      competitionId: item.competition.id,
      code: item.competition.code,
      competition: item.competition,
      revision: item.competition.revision
    });
  }

  return result;
}

export const competitionRouter = Router();
competitionRouter.use(competitionChatRouter);
competitionRouter.get('/admin/disputes', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso restringido al SuperAdmin' });
  const disputed = [...db.competitions.values()].filter(c => c.status === 'DISPUTED');
  res.json({ disputes: disputed.map(room => structuredClone(room)) });
});
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
competitionRouter.get('/:id/match', (req, res) => {
  const room = db.competitions.get(req.params.id);
  const match = room && db.competitionMatches.get(room.matchId);
  if (!match) return res.status(404).json({ error: 'El partido aún no ha comenzado', code: 'NOT_FOUND' });
  if (req.user.role !== 'admin' && !participant(match, req.user.userId)) return res.status(403).json({ error: 'El partido es privado para sus participantes', code: 'FORBIDDEN' });
  res.json({ match });
});
competitionRouter.post('/commands/:command', (req, res) => {
  try { res.json(competitionCommand(req.user.userId, req.params.command, req.body)); }
  catch (error) { if (!error.code) throw error; res.status(error.status || 400).json({ success: false, code: error.code, error: error.message }); }
});
