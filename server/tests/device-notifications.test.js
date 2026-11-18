import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from './access-fixture.js';
import { createSandbox, startTestServer, readSnapshot } from './helpers.js';
import { createPushService } from '../pushService.js';
import { toClientUser, toPublicUser } from '../userDto.js';

async function call(server, endpoint, token, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(`${server.url}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, data: await response.json() };
}

async function login(server, name) {
  const result = await call(server, '/auth/login', null, {
    email: `${name}@test.local`,
    password: name === 'admin' ? 'admin-test-password' : `password-${name}`
  });
  assert.equal(result.status, 200);
  return result.data.token;
}

test('MS-15: Registro seguro de push token y persistencia durable en SQLite tras reinicio', async t => {
  const sandbox = createSandbox(t);
  const ids = fixtures(sandbox);
  let server = await startTestServer(sandbox);

  try {
    const tokenA = await login(server, 'a');
    const tokenB = await login(server, 'b');

    // 1. Petición anónima rechazada con 401
    const unauth = await call(server, '/user/push-token', null, {
      userId: ids.a,
      pushToken: 'ExponentPushToken[unauth-device]'
    });
    assert.equal(unauth.status, 401, 'Endpoint requiere sesión válida');

    // 2. Jugador A intenta enviar token para Jugador B -> 403 Forbidden por ownBody()
    const spoof = await call(server, '/user/push-token', tokenA, {
      userId: ids.b,
      pushToken: 'ExponentPushToken[spoof-device]'
    });
    assert.equal(spoof.status, 403, 'No puede registrar token para otro usuario');

    // 3. Jugador A registra su propio push token -> 200 OK
    const pushTokenA = 'ExponentPushToken[device-token-player-a-12345]';
    const regRes = await call(server, '/user/push-token', tokenA, {
      userId: ids.a,
      pushToken: pushTokenA
    });
    assert.equal(regRes.status, 200);
    assert.equal(regRes.data.success, true);
    assert.equal(regRes.data.pushToken, pushTokenA);

    // 4. Seguridad de DTOs: pushToken jamás se expone en endpoints de usuario o perfil público
    const meRes = await call(server, '/auth/me', tokenA);
    assert.equal(meRes.status, 200);
    assert.equal('pushToken' in meRes.data.user, false, 'pushToken no debe exponerse en /auth/me');
    assert.equal('push_token' in meRes.data.user, false, 'push_token no debe exponerse en /auth/me');

    const clientDto = toClientUser({ id: ids.a, pushToken: pushTokenA, name: 'Player A' });
    assert.equal('pushToken' in clientDto, false, 'toClientUser excluye pushToken');

    const publicDto = toPublicUser({ id: ids.a, pushToken: pushTokenA, name: 'Player A' });
    assert.equal('pushToken' in publicDto, false, 'toPublicUser excluye pushToken');

    // 5. Reinicio del servidor: persistencia en SQLite durable
    await server.stop();

    // Verificación en snapshot directo de SQLite
    const rows = await readSnapshot(sandbox, `SELECT push_token FROM users WHERE id = '${ids.a}'`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0][0], pushTokenA, 'push_token persistido en columna SQLite');

    // Levantar nuevo servidor sobre la misma base de datos
    server = await startTestServer(sandbox);
    const tokenA2 = await login(server, 'a');

    // Re-registrar un token actualizado
    const updatedPushToken = 'ExponentPushToken[device-token-player-a-actualizado]';
    const updateRes = await call(server, '/user/push-token', tokenA2, {
      userId: ids.a,
      pushToken: updatedPushToken
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.pushToken, updatedPushToken);
  } finally {
    await server.stop();
  }
});

test('MS-15: Despacho de push a "Solo destinatario correcto" y filtros de seguridad (V-18)', async () => {
  const sentBatches = [];
  const mockTransport = async (messages) => {
    sentBatches.push(messages);
  };

  const mockUsers = new Map([
    ['user-a', { id: 'user-a', name: 'Capitán A', pushToken: 'ExponentPushToken[token-a]', isBanned: false }],
    ['user-b', { id: 'user-b', name: 'Capitán B', pushToken: 'ExponentPushToken[token-b]', isBanned: false }],
    ['user-c', { id: 'user-c', name: 'Jugador C', pushToken: 'ExponentPushToken[token-c]', isBanned: false }],
    ['user-banned', { id: 'user-banned', name: 'Baneado', pushToken: 'ExponentPushToken[token-banned]', isBanned: true }],
    ['user-no-token', { id: 'user-no-token', name: 'Sin Token', pushToken: null, isBanned: false }]
  ]);

  const mockCompetitions = new Map([
    ['comp-1', {
      id: 'comp-1',
      code: 'PARTIDO1',
      teamA: [{ id: 'user-a', isCaptain: true }, { id: 'user-c' }],
      teamB: [{ id: 'user-b', isCaptain: true }, { id: 'user-banned' }, { id: 'user-no-token' }]
    }]
  ]);

  const mockDb = {
    getUser: (id) => mockUsers.get(id) || null,
    competitions: mockCompetitions
  };

  const push = createPushService({
    database: mockDb,
    transport: mockTransport,
    enabled: true
  });

  // 1. Mensaje en el chat: se entrega a los miembros EXCLUYENDO al remitente
  sentBatches.length = 0;
  const chatRes = await push.notifyCompetitionMessage({
    competitionId: 'comp-1',
    senderId: 'user-a',
    senderName: 'Capitán A',
    text: '¡Muchachos, nos vemos a las 7pm en la cancha!'
  });

  assert.equal(chatRes.sentCount, 2, 'Solo se envía a user-b y user-c con token válido (user-a remitente, user-banned y user-no-token excluidos)');
  assert.deepEqual(chatRes.recipientIds.sort(), ['user-b', 'user-c'].sort());
  assert.equal(sentBatches.length, 1);
  assert.equal(sentBatches[0][0].data.type, 'COMPETITION_CHAT');
  assert.equal(sentBatches[0][0].data.code, 'PARTIDO1');

  // 2. Reporte de marcador: el capitán A reporta, se notifica a los demás participantes
  sentBatches.length = 0;
  const reportRes = await push.notifyScoreReported({
    competitionId: 'comp-1',
    matchId: 'match-1',
    reporterId: 'user-a',
    scoreA: 5,
    scoreB: 3
  });
  assert.equal(reportRes.sentCount, 2);
  assert.deepEqual(reportRes.recipientIds.sort(), ['user-b', 'user-c'].sort());
  assert.equal(sentBatches[0][0].data.type, 'COMPETITION_MATCH');
  assert.equal(sentBatches[0][0].data.matchId, 'match-1');
  assert.ok(sentBatches[0][0].body.includes('5 - 3'));

  // 3. Confirmación de resultado: notifica a todos los participantes con resultado final
  sentBatches.length = 0;
  const confirmRes = await push.notifyScoreConfirmed({
    competitionId: 'comp-1',
    matchId: 'match-1',
    confirmedBy: 'user-b',
    winnerTeam: 'teamA'
  });
  assert.equal(confirmRes.sentCount, 2); // user-a y user-c (user-b confirmó, user-banned y sin token excluidos)
  assert.deepEqual(confirmRes.recipientIds.sort(), ['user-a', 'user-c'].sort());
  assert.ok(sentBatches[0][0].body.includes('Victoria teamA'));

  // 4. Marcador disputado
  sentBatches.length = 0;
  const disputeRes = await push.notifyScoreDisputed({
    competitionId: 'comp-1',
    matchId: 'match-1',
    disputerId: 'user-b',
    reason: 'Goles no coinciden con la realidad'
  });
  assert.equal(disputeRes.sentCount, 2);
  assert.deepEqual(disputeRes.recipientIds.sort(), ['user-a', 'user-c'].sort());
  assert.ok(sentBatches[0][0].body.includes('Goles no coinciden'));

  // 5. Resolución arbitral de SuperAdmin: notifica a todos los participantes con token activo
  sentBatches.length = 0;
  const resolvedRes = await push.notifyDisputeResolved({
    competitionId: 'comp-1',
    matchId: 'match-1',
    winnerTeam: 'draw',
    reason: 'Evidencia concluyente de empate técnico'
  });
  assert.equal(resolvedRes.sentCount, 3, 'user-a, user-b y user-c reciben el dictamen oficial');
  assert.deepEqual(resolvedRes.recipientIds.sort(), ['user-a', 'user-b', 'user-c'].sort());
  assert.ok(sentBatches[0][0].body.includes('Empate Oficial'));

  // 6. Resiliencia: fallo en el transporte de red no detiene el flujo ni arroja excepción no capturada
  push.setTransport(async () => {
    throw new Error('Timeout de conexión a Expo Push API');
  });
  const failRes = await push.sendToUsers(['user-a'], { title: 'Test', body: 'Test' });
  assert.equal(failRes.sentCount, 0);
  assert.ok(failRes.error.includes('Timeout de conexión'));
});
