import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { io } from 'socket.io-client';
import { PROJECT_ROOT } from '../config.js';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';

async function rawRequest(server, method, endpoint, body, token) {
  const response = await fetch(`${server.url}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

async function registerAndOnboardPlayer(server, name, pin = '1234', district = 'Miraflores, Lima', position = 'DEL') {
  const reg = await rawRequest(server, 'POST', '/auth/pin-register', { name, pin, district, position });
  assert.equal(reg.status, 200);
  const token = reg.data.token;
  const userId = reg.data.user.id;

  const prof = await rawRequest(server, 'POST', '/user/complete-profile', {
    userId,
    district,
    position,
    age: 25,
    weight: 72,
    height: 175
  }, token);
  assert.equal(prof.status, 200);

  const testRes = await rawRequest(server, 'POST', '/user/submit-football-test', {
    userId,
    answers: Array(14).fill('C'),
    position
  }, token);
  assert.equal(testRes.status, 200);

  return { userId, token, user: testRes.data.user };
}

test('rejects activating SEARCHING status if profile or level test is incomplete', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    // 1. Registrar jugador sin completar perfil ni test
    const reg = await rawRequest(server, 'POST', '/auth/pin-register', {
      name: 'IncompletoPlayer',
      pin: '1111'
    });
    assert.equal(reg.status, 200);
    const { token, user } = reg.data;
    assert.equal(user.matchmakingStatus, 'IDLE');

    // 2. Intentar pasar a SEARCHING sin perfil completado -> INCOMPLETE_PROFILE
    const attemptNoProfile = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '7v7',
      district: 'Surco, Lima',
      radiusKm: 10
    }, token);
    assert.equal(attemptNoProfile.status, 400);
    assert.equal(attemptNoProfile.data.code, 'INCOMPLETE_PROFILE');

    // 3. Completar perfil pero NO el test de nivel
    const prof = await rawRequest(server, 'POST', '/user/complete-profile', {
      userId: user.id,
      district: 'Surco, Lima',
      position: 'MED',
      age: 24,
      weight: 70,
      height: 173
    }, token);
    assert.equal(prof.status, 200);

    // 4. Intentar pasar a SEARCHING sin test de nivel completado -> INCOMPLETE_TEST
    const attemptNoTest = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '7v7',
      district: 'Surco, Lima',
      radiusKm: 10
    }, token);
    assert.equal(attemptNoTest.status, 400);
    assert.equal(attemptNoTest.data.code, 'INCOMPLETE_TEST');
  } finally {
    await server.stop();
  }
});

test('activates SEARCHING status, emits socket update, and persists in SQLite across server restart', async (t) => {
  const sandbox = createSandbox(t);
  let server = await startTestServer(sandbox);
  let player;
  let socket;

  try {
    player = await registerAndOnboardPlayer(server, 'BuscadorPersistente', '2222', 'San Isidro, Lima', 'DEL');

    socket = io(server.url, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: false,
      auth: { token: player.token }
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
      socket.on('connect', () => { clearTimeout(timer); resolve(); });
      socket.connect();
    });

    const socketEventPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('matchmakingStatusUpdated event timeout')), 5000);
      socket.once('matchmakingStatusUpdated', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

    // Activar estado SEARCHING vía PUT /api/user/matchmaking-status
    const activateRes = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '6v6',
      district: 'Miraflores, Lima',
      radiusKm: 12
    }, player.token);

    assert.equal(activateRes.status, 200);
    assert.equal(activateRes.data.success, true);
    const updatedUser = activateRes.data.user;
    assert.equal(updatedUser.matchmakingStatus, 'SEARCHING');
    assert.equal(updatedUser.searchingFormat, '6v6');
    assert.equal(updatedUser.searchingDistrict, 'Miraflores, Lima');
    assert.equal(updatedUser.searchingRadiusKm, 12);
    assert.ok(updatedUser.searchingSince);
    assert.ok(updatedUser.searchingExpiresAt);
    assert.equal(updatedUser.activeCompetitionId, null);

    // Verificar TTL por defecto de ~4 horas
    const diffHours = (Date.parse(updatedUser.searchingExpiresAt) - Date.parse(updatedUser.searchingSince)) / (3600 * 1000);
    assert.ok(diffHours >= 3.9 && diffHours <= 4.1);

    // Verificar evento de socket recibido
    const socketPayload = await socketEventPromise;
    assert.equal(socketPayload.matchmakingStatus, 'SEARCHING');
    assert.equal(socketPayload.searchingFormat, '6v6');
    assert.equal(socketPayload.searchingDistrict, 'Miraflores, Lima');
    assert.equal(socketPayload.searchingRadiusKm, 12);
  } finally {
    socket?.disconnect();
    await server.stop();
  }

  // Verificar directamente en el archivo SQLite antes de reiniciar
  const rows = await readSnapshot(
    sandbox,
    `SELECT matchmaking_status, searching_format, searching_district, searching_radius_km, searching_since, searching_expires_at, active_competition_id FROM users WHERE id = '${player.userId}'`
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], 'SEARCHING');
  assert.equal(rows[0][1], '6v6');
  assert.equal(rows[0][2], 'Miraflores, Lima');
  assert.equal(rows[0][3], 12);
  assert.ok(rows[0][4]);
  assert.ok(rows[0][5]);
  assert.equal(rows[0][6], null);

  // Reiniciar servidor y verificar que el estado persiste en /api/auth/me
  server = await startTestServer(sandbox);
  try {
    const meRes = await rawRequest(server, 'GET', '/auth/me', null, player.token);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.user.matchmakingStatus, 'SEARCHING');
    assert.equal(meRes.data.user.searchingFormat, '6v6');
    assert.equal(meRes.data.user.searchingDistrict, 'Miraflores, Lima');
    assert.equal(meRes.data.user.searchingRadiusKm, 12);
    assert.ok(meRes.data.user.searchingSince);
    assert.ok(meRes.data.user.searchingExpiresAt);

    // Pausar búsqueda (status: 'IDLE')
    const pauseRes = await rawRequest(server, 'POST', '/user/matchmaking-status', {
      status: 'IDLE'
    }, player.token);
    assert.equal(pauseRes.status, 200);
    assert.equal(pauseRes.data.user.matchmakingStatus, 'IDLE');
    assert.equal(pauseRes.data.user.searchingSince, null);
    assert.equal(pauseRes.data.user.searchingExpiresAt, null);
  } finally {
    await server.stop();
  }
});

test('automatically expires SEARCHING status back to IDLE when TTL has elapsed', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    const player1 = await registerAndOnboardPlayer(server, 'ExpiradoTTL', '3333', 'Surco, Lima', 'MED');
    const player2 = await registerAndOnboardPlayer(server, 'ActivoTTL', '4444', 'Surco, Lima', 'DEF');

    // Activar búsqueda con TTL muy corto (0.0001 horas = 0.36 segundos)
    const act1 = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '5v5',
      district: 'Surco, Lima',
      radiusKm: 6,
      ttlHours: 0.0001
    }, player1.token);
    assert.equal(act1.status, 200);
    assert.equal(act1.data.user.matchmakingStatus, 'SEARCHING');

    // Esperar a que venza el TTL (500ms)
    await new Promise(r => setTimeout(r, 500));

    // Cuando otro usuario actualiza o se consulta el perfil de player1, se limpia automáticamente a IDLE
    const act2 = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '7v7',
      district: 'Surco, Lima',
      radiusKm: 8,
      ttlHours: 4
    }, player2.token);
    assert.equal(act2.status, 200);
    assert.equal(act2.data.user.matchmakingStatus, 'SEARCHING');

    const me1 = await rawRequest(server, 'GET', '/auth/me', null, player1.token);
    assert.equal(me1.status, 200);
    assert.equal(me1.data.user.matchmakingStatus, 'IDLE');
    assert.equal(me1.data.user.searchingSince, null);
    assert.equal(me1.data.user.searchingExpiresAt, null);
  } finally {
    await server.stop();
  }
});

test('transitions automatically to IN_ROOM on competition create/join and back to IDLE on leave, cancel, confirmScore or resolveDispute', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    const host = await registerAndOnboardPlayer(server, 'HostConvocatoria', '5555', 'Surco, Lima', 'DEL');
    const guest = await registerAndOnboardPlayer(server, 'GuestConvocatoria', '6666', 'Surco, Lima', 'DEF');

    // Poner ambos jugadores en SEARCHING inicialmente
    await rawRequest(server, 'PUT', '/user/matchmaking-status', { status: 'SEARCHING', formatId: '5v5' }, host.token);
    await rawRequest(server, 'PUT', '/user/matchmaking-status', { status: 'SEARCHING', formatId: '5v5' }, guest.token);

    // 1. Host crea una convocatoria -> pasa automáticamente a IN_ROOM con activeCompetitionId
    const createRes = await rawRequest(server, 'POST', '/competitions/commands/create', {
      requestId: randomUUID(),
      countryCode: 'PE',
      sportId: 'futbol',
      formatId: '5v5',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      timeZone: 'America/Lima',
      venue: { name: 'Complejo El Golazo', address: 'Av. Caminos del Inca 123', districtId: '1' }
    }, host.token);
    assert.equal(createRes.status, 200);
    let room = createRes.data.data;

    const hostAfterCreate = await rawRequest(server, 'GET', '/auth/me', null, host.token);
    assert.equal(hostAfterCreate.data.user.matchmakingStatus, 'IN_ROOM');
    assert.equal(hostAfterCreate.data.user.activeCompetitionId, room.id);
    assert.equal(hostAfterCreate.data.user.searchingSince, null);
    assert.equal(hostAfterCreate.data.user.searchingExpiresAt, null);

    // 2. Guest se une a la convocatoria -> pasa automáticamente a IN_ROOM con activeCompetitionId
    const joinRes = await rawRequest(server, 'POST', '/competitions/commands/join', {
      requestId: randomUUID(),
      code: room.code,
      team: 'teamB',
      expectedRevision: room.revision
    }, guest.token);
    assert.equal(joinRes.status, 200);
    room = joinRes.data.data;

    const guestAfterJoin = await rawRequest(server, 'GET', '/auth/me', null, guest.token);
    assert.equal(guestAfterJoin.data.user.matchmakingStatus, 'IN_ROOM');
    assert.equal(guestAfterJoin.data.user.activeCompetitionId, room.id);

    // 3. Guest sale de la convocatoria (leave) -> vuelve a IDLE y limpia activeCompetitionId
    const leaveRes = await rawRequest(server, 'POST', '/competitions/commands/leave', {
      requestId: randomUUID(),
      competitionId: room.id,
      expectedRevision: room.revision
    }, guest.token);
    assert.equal(leaveRes.status, 200);
    room = leaveRes.data.data;

    const guestAfterLeave = await rawRequest(server, 'GET', '/auth/me', null, guest.token);
    assert.equal(guestAfterLeave.data.user.matchmakingStatus, 'IDLE');
    assert.equal(guestAfterLeave.data.user.activeCompetitionId, null);

    // 4. Guest vuelve a unirse y Host cancela la convocatoria (cancel) -> ambos vuelven a IDLE
    const rejoinRes = await rawRequest(server, 'POST', '/competitions/commands/join', {
      requestId: randomUUID(),
      code: room.code,
      team: 'teamB',
      expectedRevision: room.revision
    }, guest.token);
    assert.equal(rejoinRes.status, 200);
    room = rejoinRes.data.data;

    const cancelRes = await rawRequest(server, 'POST', '/competitions/commands/cancel', {
      requestId: randomUUID(),
      competitionId: room.id,
      expectedRevision: room.revision,
      reason: 'Lluvia en la cancha'
    }, host.token);
    assert.equal(cancelRes.status, 200);

    const hostAfterCancel = await rawRequest(server, 'GET', '/auth/me', null, host.token);
    const guestAfterCancel = await rawRequest(server, 'GET', '/auth/me', null, guest.token);
    assert.equal(hostAfterCancel.data.user.matchmakingStatus, 'IDLE');
    assert.equal(hostAfterCancel.data.user.activeCompetitionId, null);
    assert.equal(guestAfterCancel.data.user.matchmakingStatus, 'IDLE');
    assert.equal(guestAfterCancel.data.user.activeCompetitionId, null);
  } finally {
    await server.stop();
  }

  // 5. Verificar confirmScore y resolveDispute devuelven a todos los participantes a IDLE
  const prep = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { randomUUID } from 'node:crypto';
    import { db } from './server/db.js';
    import { competitionCommand as command } from './server/competitions.js';

    await db.initAsync();
    const players = Array.from({ length: 10 }, (_, i) =>
      db.createUser({ email: 'mm-comp' + i + '@test.local', name: 'MM Comp ' + i, password: 'synthetic-password' })
    );
    const admin = db.createUser({ email: 'mm-admin@test.local', name: 'MM Admin', password: 'synthetic-password' });
    admin.role = 'admin';
    db._persistUser(admin);

    const clock = Date.now() - 60000;
    // Sala 1: finalizar por confirmScore
    let r1 = command(players[0].id, 'create', {
      requestId: randomUUID(), countryCode: 'PE', sportId: 'futbol', formatId: '5v5',
      scheduledAt: new Date(clock + 1000).toISOString(), timeZone: 'America/Lima',
      venue: { name: 'Cancha 1', address: 'Dir 1', districtId: '1' }
    }, clock).data;
    for (let i = 1; i < 10; i++) {
      r1 = command(players[i].id, 'join', {
        requestId: randomUUID(), code: r1.code, team: i < 5 ? 'teamA' : 'teamB', expectedRevision: r1.revision
      }, clock).data;
    }
    for (const p of players) {
      if (db.getUser(p.id).matchmakingStatus !== 'IN_ROOM' || db.getUser(p.id).activeCompetitionId !== r1.id) {
        throw new Error('Player did not enter IN_ROOM');
      }
      r1 = command(p.id, 'setReady', { requestId: randomUUID(), competitionId: r1.id, expectedRevision: r1.revision, ready: true }, clock).data;
    }
    r1 = command(players[0].id, 'start', { requestId: randomUUID(), competitionId: r1.id, expectedRevision: r1.revision }, clock + 2000).data;
    r1 = command(players[0].id, 'reportScore', { requestId: randomUUID(), competitionId: r1.id, expectedRevision: r1.revision, score: { teamA: 3, teamB: 2 } }, clock + 3000).data;
    r1 = command(players[5].id, 'confirmScore', { requestId: randomUUID(), competitionId: r1.id, expectedRevision: r1.revision, reportId: r1.report.reportId }, clock + 4000).data;

    for (const p of players) {
      const u = db.getUser(p.id);
      if (u.matchmakingStatus !== 'IDLE' || u.activeCompetitionId !== null) {
        throw new Error('Player was not reset to IDLE after confirmScore');
      }
    }

    // Sala 2: finalizar por resolveDispute
    let r2 = command(players[0].id, 'create', {
      requestId: randomUUID(), countryCode: 'PE', sportId: 'futbol', formatId: '5v5',
      scheduledAt: new Date(clock + 1000).toISOString(), timeZone: 'America/Lima',
      venue: { name: 'Cancha 2', address: 'Dir 2', districtId: '1' }
    }, clock).data;
    for (let i = 1; i < 10; i++) {
      r2 = command(players[i].id, 'join', {
        requestId: randomUUID(), code: r2.code, team: i < 5 ? 'teamA' : 'teamB', expectedRevision: r2.revision
      }, clock).data;
    }
    for (const p of players) {
      r2 = command(p.id, 'setReady', { requestId: randomUUID(), competitionId: r2.id, expectedRevision: r2.revision, ready: true }, clock).data;
    }
    r2 = command(players[0].id, 'start', { requestId: randomUUID(), competitionId: r2.id, expectedRevision: r2.revision }, clock + 2000).data;
    r2 = command(players[0].id, 'reportScore', { requestId: randomUUID(), competitionId: r2.id, expectedRevision: r2.revision, score: { teamA: 4, teamB: 0 } }, clock + 3000).data;
    r2 = command(players[5].id, 'disputeScore', { requestId: randomUUID(), competitionId: r2.id, expectedRevision: r2.revision, reportId: r2.report.reportId, reason: 'Marcador incorrecto' }, clock + 4000).data;
    r2 = command(admin.id, 'resolveDispute', { requestId: randomUUID(), competitionId: r2.id, expectedRevision: r2.revision, disputeId: r2.dispute.disputeId, score: { teamA: 2, teamB: 2 }, reason: 'Empate verificado' }, clock + 5000).data;

    for (const p of players) {
      const u = db.getUser(p.id);
      if (u.matchmakingStatus !== 'IDLE' || u.activeCompetitionId !== null) {
        throw new Error('Player was not reset to IDLE after resolveDispute');
      }
    }
  `], { cwd: PROJECT_ROOT, env: sandbox.env, encoding: 'utf8', timeout: 20000 });
  assert.equal(prep.status, 0, prep.stderr);
});
