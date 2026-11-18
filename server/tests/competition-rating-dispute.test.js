import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from '../config.js';
import { createSandbox, startTestServer } from './helpers.js';

function script(sandbox, code) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: PROJECT_ROOT, env: sandbox.env, encoding: 'utf8', timeout: 20000
  });
  assert.equal(result.status, 0, result.stderr);
}

function fixture(t) {
  const sandbox = createSandbox(t);
  script(sandbox, `
    import fs from 'node:fs';
    import path from 'node:path';
    import { randomUUID } from 'node:crypto';
    import { issueToken } from './server/auth.js';
    import { db } from './server/db.js';
    import { competitionCommand as command } from './server/competitions.js';

    await db.initAsync();
    const users = Array.from({ length: 10 }, (_, i) =>
      db.createUser({ email: 'rating' + i + '@test.local', name: 'Rating Player ' + i, password: 'synthetic-password' })
    );
    const outsider = db.createUser({ email: 'outsider-rating@test.local', name: 'Outsider', password: 'synthetic-password' });
    const admin = db.createUser({ email: 'admin-rating@test.local', name: 'Admin', password: 'synthetic-password' });
    admin.role = 'admin';
    db._persistUser(admin);

    const clock = Date.now() - 60000;
    const created = command(users[0].id, 'create', {
      requestId: randomUUID(),
      countryCode: 'PE',
      sportId: 'futbol',
      formatId: '5v5',
      scheduledAt: new Date(clock + 1000).toISOString(),
      timeZone: 'America/Lima',
      venue: { name: 'Cancha de ratings', address: 'Dirección sintética', districtId: '1' }
    }, clock);

    let room = created.data;
    for (let i = 1; i < 10; i++) {
      room = command(users[i].id, 'join', {
        requestId: randomUUID(),
        code: room.code,
        team: i < 5 ? 'teamA' : 'teamB',
        expectedRevision: room.revision
      }, clock).data;
    }
    for (const user of users) {
      room = command(user.id, 'setReady', {
        requestId: randomUUID(),
        competitionId: room.id,
        expectedRevision: room.revision,
        ready: true
      }, clock).data;
    }
    const started = command(users[0].id, 'start', {
      requestId: randomUUID(),
      competitionId: room.id,
      expectedRevision: room.revision
    }, clock + 2000);

    const tokens = {
      capA: issueToken(users[0]),
      capB: issueToken(users[5]),
      playerA: issueToken(users[1]),
      outsider: issueToken(outsider),
      admin: issueToken(admin)
    };
    const ids = {
      users: users.map(u => u.id),
      outsider: outsider.id,
      admin: admin.id,
      competitionId: started.data.id,
      matchId: started.data.matchId,
      revision: started.data.revision
    };
    fs.writeFileSync(path.join(process.env.MATCHSPORT_TEST_DIR, 'ids.json'), JSON.stringify({ tokens, ids }), 'utf8');
  `);
  const meta = JSON.parse(fs.readFileSync(path.join(sandbox.directory, 'ids.json'), 'utf8'));
  return { sandbox, tokens: meta.tokens, ids: meta.ids };
}

async function callCmd(server, token, command, data) {
  const response = await fetch(`${server.url}/api/competitions/commands/${command}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });
  return { status: response.status, body: await response.json() };
}

async function callApi(server, endpoint, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${server.url}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() };
}

test('MS-09-B: Rating Glicko-2 atómico al confirmar resultado', async t => {
  const { sandbox, tokens, ids } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    // Capitán A reporta victoria 2 - 0
    const rep = await callCmd(server, tokens.capA, 'reportScore', {
      competitionId: ids.competitionId,
      expectedRevision: ids.revision,
      score: { teamA: 2, teamB: 0 },
      requestId: randomUUID()
    });
    assert.equal(rep.status, 200);
    assert.equal(rep.body.data.status, 'RESULT_PENDING');

    // Capitán B confirma marcador
    const conf = await callCmd(server, tokens.capB, 'confirmScore', {
      competitionId: ids.competitionId,
      expectedRevision: rep.body.data.revision,
      reportId: rep.body.data.report.reportId,
      requestId: randomUUID()
    });
    assert.equal(conf.status, 200);
    assert.equal(conf.body.data.status, 'FINISHED');
    assert.equal(conf.body.data.outcome, 'teamA');
    assert.ok(conf.body.data.ratingUpdates, 'Debe incluir desglose de actualización de rating');

    // Idempotencia: reenviar confirmación con el mismo requestId no duplica ratings
    const replayed = await callCmd(server, tokens.capB, 'confirmScore', {
      competitionId: ids.competitionId,
      expectedRevision: rep.body.data.revision,
      reportId: rep.body.data.report.reportId,
      requestId: conf.body.requestId
    });
    assert.equal(replayed.status, 200);
    assert.equal(replayed.body.replayed, true);
  } finally {
    await server.stop();
  }

  // Verificar ratings en la base de datos para los 10 jugadores (después de detener el server)
  script(sandbox, `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import { db } from './server/db.js';

    await db.initAsync();
    const meta = JSON.parse(fs.readFileSync(path.join(process.env.MATCHSPORT_TEST_DIR, 'ids.json'), 'utf8'));
    const teamAIds = meta.ids.users.slice(0, 5);
    const teamBIds = meta.ids.users.slice(5, 10);

    for (const id of teamAIds) {
      const profile = db.getProfile(id, 'futbol', '5v5');
      assert.ok(profile.rating > 1400, 'Ganadores deben subir de 1400, obtenido: ' + profile.rating);
      assert.equal(profile.matchesPlayed, 1);
      assert.equal(profile.wins, 1);
      assert.equal(profile.losses, 0);
      assert.equal(profile.draws, 0);
    }

    for (const id of teamBIds) {
      const profile = db.getProfile(id, 'futbol', '5v5');
      assert.ok(profile.rating < 1400, 'Perdedores deben bajar de 1400, obtenido: ' + profile.rating);
      assert.equal(profile.matchesPlayed, 1);
      assert.equal(profile.wins, 0);
      assert.equal(profile.losses, 1);
      assert.equal(profile.draws, 0);
    }
  `);
});

test('MS-09-B: Resolución arbitral SuperAdmin (resolveDispute y 403 para mortales)', async t => {
  const { sandbox, tokens, ids } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    // Capitán A reporta 2-1
    const rep = await callCmd(server, tokens.capA, 'reportScore', {
      competitionId: ids.competitionId,
      expectedRevision: ids.revision,
      score: { teamA: 2, teamB: 1 },
      requestId: randomUUID()
    });
    assert.equal(rep.status, 200);

    // Capitán B disputa el marcador
    const disp = await callCmd(server, tokens.capB, 'disputeScore', {
      competitionId: ids.competitionId,
      expectedRevision: rep.body.data.revision,
      reportId: rep.body.data.report.reportId,
      reason: 'El segundo gol del equipo A fue con la mano tras tiempo cumplido',
      requestId: randomUUID()
    });
    assert.equal(disp.status, 200);
    assert.equal(disp.body.data.status, 'DISPUTED');
    const disputeId = disp.body.data.dispute.disputeId;
    const currentRev = disp.body.data.revision;

    // Jugador no admin intenta resolver disputa -> 403
    const forbiddenResolve = await callCmd(server, tokens.capA, 'resolveDispute', {
      competitionId: ids.competitionId,
      expectedRevision: currentRev,
      disputeId,
      score: { teamA: 1, teamB: 1 },
      reason: 'Auto resolución no permitida',
      requestId: randomUUID()
    });
    assert.equal(forbiddenResolve.status, 403);
    assert.equal(forbiddenResolve.body.code, 'FORBIDDEN');

    // SuperAdmin lista disputas activas
    const adminDisputes = await callApi(server, '/competitions/admin/disputes', {
      token: tokens.admin
    });
    assert.equal(adminDisputes.status, 200);
    assert.ok(adminDisputes.body.disputes.some(d => d.id === ids.competitionId));

    // Mortal intentando listar disputas de admin -> 403
    const forbiddenList = await callApi(server, '/competitions/admin/disputes', {
      token: tokens.playerA
    });
    assert.equal(forbiddenList.status, 403);

    // SuperAdmin resuelve disputa declarando empate 1 - 1
    const resolved = await callCmd(server, tokens.admin, 'resolveDispute', {
      competitionId: ids.competitionId,
      expectedRevision: currentRev,
      disputeId,
      score: { teamA: 1, teamB: 1 },
      reason: 'Revisión arbitral: se anula gol antirreglamentario, resultado oficial 1-1',
      requestId: randomUUID()
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.data.status, 'FINISHED');
    assert.equal(resolved.body.data.outcome, 'draw');
    assert.equal(resolved.body.data.resolvedBy, ids.admin);
    assert.ok(resolved.body.data.ratingUpdates);
  } finally {
    await server.stop();
  }

  // Verificar que en empate todos tienen draws === 1 y matchesPlayed === 1
  script(sandbox, `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import { db } from './server/db.js';

    await db.initAsync();
    const meta = JSON.parse(fs.readFileSync(path.join(process.env.MATCHSPORT_TEST_DIR, 'ids.json'), 'utf8'));
    for (const id of meta.ids.users) {
      const profile = db.getProfile(id, 'futbol', '5v5');
      assert.equal(profile.matchesPlayed, 1);
      assert.equal(profile.draws, 1);
      assert.equal(profile.wins, 0);
      assert.equal(profile.losses, 0);
    }
  `);
});

test('MS-09-B: Resolución de disputa de convocatoria vía REST SuperAdmin (/admin/disputes/resolve)', async t => {
  const { sandbox, tokens, ids } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    // Crear disputa
    const rep = await callCmd(server, tokens.capA, 'reportScore', {
      competitionId: ids.competitionId,
      expectedRevision: ids.revision,
      score: { teamA: 3, teamB: 0 },
      requestId: randomUUID()
    });

    const disp = await callCmd(server, tokens.capB, 'disputeScore', {
      competitionId: ids.competitionId,
      expectedRevision: rep.body.data.revision,
      reportId: rep.body.data.report.reportId,
      reason: 'El rival no se presentó completo',
      requestId: randomUUID()
    });
    assert.equal(disp.status, 200);

    // SuperAdmin consulta /admin/disputes
    const resDisputes = await callApi(server, '/admin/disputes', {
      token: tokens.admin
    });
    assert.equal(resDisputes.status, 200);
    const found = resDisputes.body.disputes.find(d => d.competitionId === ids.competitionId || d.id === ids.competitionId);
    assert.ok(found, 'Debe aparecer en la lista global de disputas del admin');
    assert.equal(found.isCompetition, true);

    // SuperAdmin resuelve disputa usando /admin/disputes/resolve a favor de teamB
    const resolvedApi = await callApi(server, '/admin/disputes/resolve', {
      method: 'POST',
      body: {
        matchId: ids.competitionId,
        winnerTeam: 'teamB',
        reason: 'W.O. otorgado al Equipo B por alineación indebida'
      },
      token: tokens.admin
    });
    if (resolvedApi.status !== 200) console.error('TEST 3 FAIL:', resolvedApi);
    assert.equal(resolvedApi.status, 200);
    assert.equal(resolvedApi.body.success, true);
    assert.equal(resolvedApi.body.match.status, 'FINISHED');
    assert.equal(resolvedApi.body.match.outcome, 'teamB');
  } finally {
    await server.stop();
  }

  // Verificar que el equipo B ganó y subió de rating
  script(sandbox, `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import { db } from './server/db.js';

    await db.initAsync();
    const meta = JSON.parse(fs.readFileSync(path.join(process.env.MATCHSPORT_TEST_DIR, 'ids.json'), 'utf8'));
    const teamBIds = meta.ids.users.slice(5, 10);
    for (const id of teamBIds) {
      const profile = db.getProfile(id, 'futbol', '5v5');
      assert.ok(profile.rating > 1400);
      assert.equal(profile.wins, 1);
    }
  `);
});

test('MS-09-B: Anulación de partido por SuperAdmin (cancel sin alterar rating)', async t => {
  const { sandbox, tokens, ids } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    // SuperAdmin cancela la convocatoria en juego
    const cancelled = await callCmd(server, tokens.admin, 'cancel', {
      competitionId: ids.competitionId,
      expectedRevision: ids.revision,
      reason: 'Partido suspendido por lluvia torrencial e inundación de cancha',
      requestId: randomUUID()
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, 'CANCELLED');
    assert.equal(cancelled.body.data.cancelledBy, ids.admin);
  } finally {
    await server.stop();
  }

  // Verificar que ningún usuario sufrió cambios de rating
  script(sandbox, `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import { db } from './server/db.js';

    await db.initAsync();
    const meta = JSON.parse(fs.readFileSync(path.join(process.env.MATCHSPORT_TEST_DIR, 'ids.json'), 'utf8'));
    for (const id of meta.ids.users) {
      const profile = db.getProfile(id, 'futbol', '5v5');
      assert.equal(profile.rating, 1400);
      assert.equal(profile.matchesPlayed, 0);
      assert.equal(profile.wins, 0);
      assert.equal(profile.losses, 0);
      assert.equal(profile.draws, 0);
    }
  `);
});
