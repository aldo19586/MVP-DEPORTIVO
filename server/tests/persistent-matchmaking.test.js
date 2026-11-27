import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { io } from 'socket.io-client';
import { createSandbox, startTestServer, readSnapshot } from './helpers.js';
import { createPushService } from '../pushService.js';

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

async function registerAndOnboardPlayer(
  server,
  name,
  pin = '1234',
  district = 'Miraflores, Lima',
  position = 'DEL',
  answerLetter = 'C'
) {
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
    answers: Array(14).fill(answerLetter),
    position
  }, token);
  assert.equal(testRes.status, 200);

  return { userId, token, user: testRes.data.user };
}

function connectSocket(serverUrl, token) {
  const socket = io(serverUrl, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
    auth: { token }
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    socket.connect();
  });
}

test('Caso A (PUT /user/matchmaking-status -> SEARCHING): auto-assigns player to existing OPEN competition in same format and district', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);
  let hostSocket;
  let searcherSocket;

  try {
    const host = await registerAndOnboardPlayer(server, 'HostMiraflores', '1111', 'Miraflores, Lima', 'DEL', 'D');
    const searcher = await registerAndOnboardPlayer(server, 'BuscadorMiraflores', '2222', 'Miraflores, Lima', 'DEF', 'C');

    hostSocket = await connectSocket(server.url, host.token);
    searcherSocket = await connectSocket(server.url, searcher.token);

    // 1. Host crea convocatoria OPEN 5v5 en Miraflores (districtId '950' -> 'Miraflores, Lima (Lima)')
    const createRes = await rawRequest(server, 'POST', '/competitions/commands/create', {
      requestId: randomUUID(),
      countryCode: 'PE',
      sportId: 'futbol',
      formatId: '5v5',
      scheduledAt: new Date(Date.now() + 3600 * 1000 * 3).toISOString(),
      timeZone: 'America/Lima',
      venue: { name: 'Complejo Manuel Bonilla', address: 'Av. Del Ejército 1300', districtId: '950' }
    }, host.token);
    assert.equal(createRes.status, 200);
    const createdRoom = createRes.data.data;
    assert.equal(createdRoom.status, 'OPEN');
    assert.equal(createdRoom.revision, 1);
    assert.equal(createdRoom.teamA.length, 1);
    assert.equal(createdRoom.teamB.length, 0);

    // Preparar promesas de eventos Socket en tiempo real
    const assignedEventPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('matchmakingRoomAssigned timeout')), 5000);
      searcherSocket.once('matchmakingRoomAssigned', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

    const competitionUpdatedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('competitionUpdated timeout')), 5000);
      hostSocket.once('competitionUpdated', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

    // 2. Jugador cambia a SEARCHING en 5v5 y Miraflores -> debe asignarse inmediatamente a la sala OPEN
    const searchRes = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '5v5',
      district: 'Miraflores, Lima',
      radiusKm: 8
    }, searcher.token);

    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.data.user.matchmakingStatus, 'IN_ROOM');
    assert.equal(searchRes.data.user.activeCompetitionId, createdRoom.id);

    // 3. Verificar eventos Socket recibidos
    const assignedPayload = await assignedEventPromise;
    assert.equal(assignedPayload.competitionId, createdRoom.id);
    assert.equal(assignedPayload.code, createdRoom.code);
    assert.equal(assignedPayload.competition.revision, 2);
    assert.equal(assignedPayload.competition.teamA.length, 1);
    assert.equal(assignedPayload.competition.teamB.length, 1);
    assert.equal(assignedPayload.competition.teamB[0].id, searcher.userId);
    assert.equal(assignedPayload.competition.captains.teamB, searcher.userId);

    const updatedPayload = await competitionUpdatedPromise;
    assert.equal(updatedPayload.competitionId, createdRoom.id);
    assert.equal(updatedPayload.revision, 2);
  } finally {
    hostSocket?.disconnect();
    searcherSocket?.disconnect();
    await server.stop();
  }
});

test('Caso A (competition create -> OPEN): auto-assigns waiting SEARCHING players when a compatible OPEN competition is created', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);
  let waitingSocket1;
  let waitingSocket2;

  try {
    const waiter1 = await registerAndOnboardPlayer(server, 'EsperandoSurco1', '1111', 'Surco, Lima', 'MED', 'C');
    const waiter2 = await registerAndOnboardPlayer(server, 'EsperandoSurco2', '2222', 'Surco, Lima', 'DEF', 'D');
    const host = await registerAndOnboardPlayer(server, 'HostSurco', '3333', 'Surco, Lima', 'DEL', 'E');

    waitingSocket1 = await connectSocket(server.url, waiter1.token);
    waitingSocket2 = await connectSocket(server.url, waiter2.token);

    // Poner 2 jugadores en SEARCHING para 7v7 en Surco, Lima (umbral de creación de sala para 7v7 es 4, por lo que esperan)
    const s1 = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '7v7',
      district: 'Surco, Lima'
    }, waiter1.token);
    assert.equal(s1.data.user.matchmakingStatus, 'SEARCHING');

    const s2 = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '7v7',
      district: 'Surco, Lima'
    }, waiter2.token);
    assert.equal(s2.data.user.matchmakingStatus, 'SEARCHING');

    const waiter1Assigned = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('waiter1 matchmakingRoomAssigned timeout')), 5000);
      waitingSocket1.once('matchmakingRoomAssigned', (payload) => { clearTimeout(timer); resolve(payload); });
    });

    const waiter2Assigned = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('waiter2 matchmakingRoomAssigned timeout')), 5000);
      waitingSocket2.once('matchmakingRoomAssigned', (payload) => { clearTimeout(timer); resolve(payload); });
    });

    // Host crea convocatoria 7v7 en Santiago de Surco (districtId '1519')
    const createRes = await rawRequest(server, 'POST', '/competitions/commands/create', {
      requestId: randomUUID(),
      countryCode: 'PE',
      sportId: 'futbol',
      formatId: '7v7',
      scheduledAt: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
      timeZone: 'America/Lima',
      venue: { name: 'El Golazo Surco', address: 'Av. Caminos del Inca 450', districtId: '1519' }
    }, host.token);

    assert.equal(createRes.status, 200);
    const room = createRes.data.data;
    assert.equal(room.teamA.length + room.teamB.length, 3);
    assert.equal(room.teamB.length, 1);
    assert.equal(room.teamA.length, 2);
    assert.equal(room.revision, 2);

    const [ev1, ev2] = await Promise.all([waiter1Assigned, waiter2Assigned]);
    assert.equal(ev1.competitionId, room.id);
    assert.equal(ev2.competitionId, room.id);

    const me1 = await rawRequest(server, 'GET', '/auth/me', null, waiter1.token);
    const me2 = await rawRequest(server, 'GET', '/auth/me', null, waiter2.token);
    assert.equal(me1.data.user.matchmakingStatus, 'IN_ROOM');
    assert.equal(me1.data.user.activeCompetitionId, room.id);
    assert.equal(me2.data.user.matchmakingStatus, 'IN_ROOM');
    assert.equal(me2.data.user.activeCompetitionId, room.id);
  } finally {
    waitingSocket1?.disconnect();
    waitingSocket2?.disconnect();
    await server.stop();
  }
});

test('Caso B (Pool of SEARCHING players): automatically creates competition balanced by Glicko-2 ratingOverall and assigns captains', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);
  const sockets = [];

  try {
    // Registrar 4 jugadores con distintos niveles/ratings Glicko-2:
    // 'E' -> 1600, 'D' -> 1500, 'B' -> 1300, 'A' -> 1200
    const p1 = await registerAndOnboardPlayer(server, 'PoolPlayer1600', '1111', 'San Isidro, Lima', 'DEL', 'E');
    const p2 = await registerAndOnboardPlayer(server, 'PoolPlayer1500', '2222', 'San Isidro, Lima', 'MED', 'D');
    const p3 = await registerAndOnboardPlayer(server, 'PoolPlayer1300', '3333', 'San Isidro, Lima', 'DEF', 'B');
    const p4 = await registerAndOnboardPlayer(server, 'PoolPlayer1200', '4444', 'San Isidro, Lima', 'POR', 'A');

    assert.equal(p1.user.ratingOverall, 1600);
    assert.equal(p2.user.ratingOverall, 1500);
    assert.equal(p3.user.ratingOverall, 1300);
    assert.equal(p4.user.ratingOverall, 1200);

    const players = [p1, p2, p3, p4];
    for (const p of players) {
      sockets.push(await connectSocket(server.url, p.token));
    }

    const assignedPromises = sockets.map((sock, idx) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Socket ${idx} matchmakingRoomAssigned timeout`)), 5000);
      sock.once('matchmakingRoomAssigned', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    }));

    // Los primeros 3 jugadores pasan a SEARCHING en 5v5 San Isidro y aún no alcanzan el umbral (4)
    for (let i = 0; i < 3; i++) {
      const res = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
        status: 'SEARCHING',
        formatId: '5v5',
        district: 'San Isidro, Lima'
      }, players[i].token);
      assert.equal(res.status, 200);
      assert.equal(res.data.user.matchmakingStatus, 'SEARCHING');
    }

    // El 4.º jugador pasa a SEARCHING -> alcanza el umbral y dispara la creación automática de sala (Caso B)
    const fourthRes = await rawRequest(server, 'PUT', '/user/matchmaking-status', {
      status: 'SEARCHING',
      formatId: '5v5',
      district: 'San Isidro, Lima'
    }, p4.token);
    assert.equal(fourthRes.status, 200);
    assert.equal(fourthRes.data.user.matchmakingStatus, 'IN_ROOM');
    const assignedCompetitionId = fourthRes.data.user.activeCompetitionId;
    assert.ok(assignedCompetitionId);

    // Todos los 4 sockets reciben matchmakingRoomAssigned con la sala creada
    const events = await Promise.all(assignedPromises);
    for (const ev of events) {
      assert.equal(ev.competitionId, assignedCompetitionId);
      assert.ok(ev.code);
      assert.equal(ev.competition.id, assignedCompetitionId);
      assert.equal(ev.competition.formatId, '5v5');
      assert.equal(ev.competition.status, 'OPEN');
    }

    const createdCompetition = events[0].competition;
    assert.equal(createdCompetition.teamA.length, 2);
    assert.equal(createdCompetition.teamB.length, 2);

    // Verificar balanceo por Rating Glicko-2:
    // teamA debe tener a p1 (1600) y p4 (1200) -> suma 2800 (media 1400)
    // teamB debe tener a p2 (1500) y p3 (1300) -> suma 2800 (media 1400)
    const teamAIds = createdCompetition.teamA.map(m => m.id);
    const teamBIds = createdCompetition.teamB.map(m => m.id);
    assert.deepEqual(teamAIds, [p1.userId, p4.userId]);
    assert.deepEqual(teamBIds, [p2.userId, p3.userId]);

    // Verificar capitanes asignados en ambos equipos
    assert.equal(createdCompetition.captains.teamA, p1.userId);
    assert.equal(createdCompetition.captains.teamB, p2.userId);
    assert.equal(createdCompetition.hostUserId, p1.userId);
  } finally {
    sockets.forEach(s => s?.disconnect());
    await server.stop();
  }

  // Verificar en SQLite que los 4 jugadores quedaron en IN_ROOM con el mismo active_competition_id
  const rows = await readSnapshot(
    sandbox,
    "SELECT matchmaking_status, active_competition_id FROM users WHERE name LIKE 'PoolPlayer%'"
  );
  assert.equal(rows.length, 4);
  const compId = rows[0][1];
  assert.ok(compId);
  for (const row of rows) {
    assert.equal(row[0], 'IN_ROOM');
    assert.equal(row[1], compId);
  }
});

test('notifyMatchmakingRoomAssigned sends push notification with expected title, body and data payload', async () => {
  const sentBatches = [];
  const mockTransport = async (messages) => {
    sentBatches.push(messages);
  };

  const mockUsers = new Map([
    ['u1', { id: 'u1', name: 'Jugador 1', pushToken: 'ExponentPushToken[u1-token]', isBanned: false }],
    ['u2', { id: 'u2', name: 'Jugador 2', pushToken: 'ExponentPushToken[u2-token]', isBanned: false }],
    ['u3-banned', { id: 'u3-banned', name: 'Baneado', pushToken: 'ExponentPushToken[u3-token]', isBanned: true }]
  ]);

  const competition = {
    id: 'comp-auto-123',
    code: 'AUTO9988',
    formatId: '6v6',
    district: 'Miraflores, Lima'
  };

  const push = createPushService({
    database: {
      getUser: (id) => mockUsers.get(id) || null,
      competitions: new Map([[competition.id, competition]])
    },
    transport: mockTransport,
    enabled: true
  });

  const res = await push.notifyMatchmakingRoomAssigned({
    userIds: ['u1', 'u2', 'u3-banned'],
    competition
  });

  assert.equal(res.sentCount, 2);
  assert.deepEqual(res.recipientIds.sort(), ['u1', 'u2']);
  assert.equal(sentBatches.length, 1);
  assert.equal(sentBatches[0][0].title, '¡Partido encontrado en tu zona! ⚽');
  assert.ok(sentBatches[0][0].body.includes('6v6'));
  assert.ok(sentBatches[0][0].body.includes('Miraflores, Lima'));
  assert.equal(sentBatches[0][0].data.competitionId, 'comp-auto-123');
  assert.equal(sentBatches[0][0].data.code, 'AUTO9988');
});
