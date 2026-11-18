import test from 'node:test';
import assert from 'node:assert/strict';
import { createSandbox, startTestServer } from './helpers.js';

async function rawRequest(server, endpoint, body, token) {
  const response = await fetch(`${server.url}/api${endpoint}`, {
    method: body ? 'POST' : 'GET',
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

test('complete-profile validates district, position and biometrics bounds', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    // 1. Registrar jugador
    const regRes = await rawRequest(server, '/auth/pin-register', {
      name: 'JugadorTest1',
      pin: '1234'
    });
    assert.equal(regRes.status, 200);
    assert.equal(regRes.data.user.hasCompletedProfile, false);
    assert.equal(regRes.data.user.hasCompletedTest, false);
    const token = regRes.data.token;
    const userId = regRes.data.user.id;

    // 2. Rechazar distrito vacío o demasiado corto
    const invalidDist = await rawRequest(server, '/user/complete-profile', {
      userId,
      district: ' '
    }, token);
    assert.equal(invalidDist.status, 400);
    assert.equal(invalidDist.data.code, 'INVALID_DISTRICT');

    // 3. Rechazar posición inválida
    const invalidPos = await rawRequest(server, '/user/complete-profile', {
      userId,
      district: 'Miraflores, Lima',
      position: 'ARBITRO_INVALIDO'
    }, token);
    assert.equal(invalidPos.status, 400);
    assert.equal(invalidPos.data.code, 'INVALID_POSITION');

    // 4. Rechazar edad fuera de rango
    const invalidAge = await rawRequest(server, '/user/complete-profile', {
      userId,
      district: 'Miraflores, Lima',
      position: 'DEL',
      age: 8
    }, token);
    assert.equal(invalidAge.status, 400);
    assert.equal(invalidAge.data.code, 'INVALID_AGE');

    // 5. Completar perfil con datos válidos
    const validProfile = await rawRequest(server, '/user/complete-profile', {
      userId,
      district: 'Miraflores, Lima',
      position: 'DEL',
      age: 26,
      weight: 74,
      height: 178,
      reference: 'Cerca a Larcomar'
    }, token);
    assert.equal(validProfile.status, 200);
    assert.equal(validProfile.data.success, true);
    assert.equal(validProfile.data.user.hasCompletedProfile, true);
    assert.equal(validProfile.data.user.district, 'Miraflores, Lima');
    assert.equal(validProfile.data.user.position, 'DEL');
    assert.equal(validProfile.data.user.age, 26);
  } finally {
    await server.stop();
  }
});

test('submit-football-test requires exactly 14 valid answers and rejects incomplete or forged inputs', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    const reg = await rawRequest(server, '/auth/pin-register', {
      name: 'JugadorTest2',
      pin: '4321',
      district: 'Surco, Lima',
      position: 'MED'
    });
    assert.equal(reg.status, 200);
    const token = reg.data.token;
    const userId = reg.data.user.id;

    // 1. Rechazar array vacío
    const emptyAns = await rawRequest(server, '/user/submit-football-test', {
      userId,
      answers: []
    }, token);
    assert.equal(emptyAns.status, 400);
    assert.equal(emptyAns.data.code, 'INVALID_ANSWERS');

    // 2. Rechazar array incompleto (13 respuestas en vez de 14)
    const thirteenAns = await rawRequest(server, '/user/submit-football-test', {
      userId,
      answers: ['A', 'B', 'C', 'D', 'E', 'C', 'B', 'A', 'D', 'E', 'C', 'B', 'A']
    }, token);
    assert.equal(thirteenAns.status, 400);
    assert.equal(thirteenAns.data.code, 'INVALID_ANSWERS');

    // 3. Rechazar array con valores fuera de rango o nulos (ej. 'Z' o 9 o null)
    const invalidChar = await rawRequest(server, '/user/submit-football-test', {
      userId,
      answers: ['A', 'B', 'C', 'D', 'E', 'C', 'B', 'A', 'D', 'E', 'C', 'B', 'A', 'Z']
    }, token);
    assert.equal(invalidChar.status, 400);
    assert.equal(invalidChar.data.code, 'INVALID_ANSWERS');

    const withNull = await rawRequest(server, '/user/submit-football-test', {
      userId,
      answers: ['A', 'B', null, 'D', 'E', 'C', 'B', 'A', 'D', 'E', 'C', 'B', 'A', 'C']
    }, token);
    assert.equal(withNull.status, 400);
    assert.equal(withNull.data.code, 'INVALID_ANSWERS');
  } finally {
    await server.stop();
  }
});

test('submit-football-test calculates deterministic FUT card stats and Glicko rating without random values', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    const reg = await rawRequest(server, '/auth/pin-register', {
      name: 'CrackElite',
      pin: '5678',
      district: 'San Isidro, Lima',
      position: 'DEL'
    });
    assert.equal(reg.status, 200);
    const token = reg.data.token;
    const userId = reg.data.user.id;

    // 14 respuestas máximas ('E' o 5) para nivel Élite
    const eliteAnswers = Array(14).fill('E');
    const res1 = await rawRequest(server, '/user/submit-football-test', {
      userId,
      answers: eliteAnswers,
      position: 'DEL'
    }, token);
    assert.equal(res1.status, 200);
    assert.equal(res1.data.success, true);
    assert.equal(res1.data.user.hasCompletedTest, true);
    assert.equal(res1.data.result.score, 100);
    assert.equal(res1.data.result.level, 'Élite amateur');
    assert.equal(res1.data.user.ratingOverall, 1600); // Calibración inicial élite

    // Comprobar que los atributos FUT son exactos y deterministas (máximos para carta inicial = 85)
    const fut1 = res1.data.user.futStats;
    assert.equal(fut1.isInitialCard, true);
    assert.equal(fut1.ovr, 85);
    assert.equal(fut1.rit, 85);
    assert.equal(fut1.tir, 85);
    assert.equal(fut1.pas, 85);
    assert.equal(fut1.reg, 85);
    assert.equal(fut1.def, 85);
    assert.equal(fut1.fis, 85);

    // Segundo jugador: nivel principiante (todas 'A' o 1)
    const reg2 = await rawRequest(server, '/auth/pin-register', {
      name: 'NovatoPlayer',
      pin: '9999',
      district: 'Surco, Lima',
      position: 'DEF'
    });
    assert.equal(reg2.status, 200);
    const res2 = await rawRequest(server, '/user/submit-football-test', {
      userId: reg2.data.user.id,
      answers: Array(14).fill('A'),
      position: 'DEF'
    }, reg2.data.token);
    assert.equal(res2.status, 200);
    assert.equal(res2.data.success, true);
    assert.equal(res2.data.result.score, 0);
    assert.equal(res2.data.result.level, 'Principiante');
    assert.equal(res2.data.user.ratingOverall, 1200); // Calibración inicial principiante

    const fut2 = res2.data.user.futStats;
    assert.equal(fut2.ovr, 50);
    assert.equal(fut2.rit, 45);
    assert.equal(fut2.tir, 45);
    assert.equal(fut2.pas, 45);
    assert.equal(fut2.reg, 45);
    assert.equal(fut2.def, 45);
    assert.equal(fut2.fis, 45);
  } finally {
    await server.stop();
  }
});

test('onboarding status and user profile survive server restart with full persistence', async (t) => {
  const sandbox = createSandbox(t);
  let server = await startTestServer(sandbox);
  let token;
  let userId;

  try {
    const reg = await rawRequest(server, '/auth/pin-register', {
      name: 'PersistPlayer',
      pin: '7777',
      district: 'Barranco, Lima',
      position: 'MED'
    });
    assert.equal(reg.status, 200);
    token = reg.data.token;
    userId = reg.data.user.id;

    // Completar test con respuestas balanceadas (todas 'C' o 3 -> 50 pts, Intermedio, 1400 rating)
    const testRes = await rawRequest(server, '/user/submit-football-test', {
      userId,
      answers: Array(14).fill('C'),
      position: 'MED'
    }, token);
    assert.equal(testRes.status, 200);
    assert.equal(testRes.data.success, true);
    assert.equal(testRes.data.result.score, 50);
    assert.equal(testRes.data.result.level, 'Intermedio');
    assert.equal(testRes.data.user.ratingOverall, 1400);
  } finally {
    await server.stop();
  }

  // Reiniciar servidor y verificar durabilidad SQLite
  server = await startTestServer(sandbox);
  try {
    const meRes = await rawRequest(server, '/auth/me', null, token);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.user.hasCompletedTest, true);
    assert.equal(meRes.data.user.testScore, 50);
    assert.equal(meRes.data.user.testLevel, 'Intermedio');
    assert.equal(meRes.data.user.ratingOverall, 1400);
    assert.equal(meRes.data.user.futStats.ovr, 68); // 50 + (50/100)*35 = 67.5 -> 68

    // Endpoint dedicado de onboarding status
    const statusRes = await rawRequest(server, '/user/onboarding-status', null, token);
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.hasCompletedTest, true);
    assert.equal(statusRes.data.ratingOverall, 1400);
    assert.equal(statusRes.data.testLevel, 'Intermedio');
    assert.equal(statusRes.data.futStats.ovr, 68);
  } finally {
    await server.stop();
  }
});

test('cross-account protection rejects user A trying to submit test or complete profile for user B', async (t) => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    const userA = await rawRequest(server, '/auth/pin-register', {
      name: 'PlayerAlfa',
      pin: '1111'
    });
    assert.equal(userA.status, 200);

    const userB = await rawRequest(server, '/auth/pin-register', {
      name: 'PlayerBeta',
      pin: '2222'
    });
    assert.equal(userB.status, 200);

    // Jugador A intenta enviar respuestas con el userId de B en el cuerpo
    const forgedTest = await rawRequest(server, '/user/submit-football-test', {
      userId: userB.data.user.id,
      answers: Array(14).fill('D'),
      position: 'DEL'
    }, userA.data.token);
    assert.equal(forgedTest.status, 403);

    // Jugador A intenta modificar el perfil con el userId de B en el cuerpo
    const forgedProfile = await rawRequest(server, '/user/complete-profile', {
      userId: userB.data.user.id,
      district: 'Ate, Lima',
      position: 'POR'
    }, userA.data.token);
    assert.equal(forgedProfile.status, 403);
  } finally {
    await server.stop();
  }
});
