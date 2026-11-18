import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from '../config.js';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';

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
    import { randomUUID } from 'node:crypto';
    import { issueToken } from './server/auth.js';
    import { db } from './server/db.js';
    import { competitionCommand as command } from './server/competitions.js';

    await db.initAsync();
    const users = Array.from({ length: 10 }, (_, i) =>
      db.createUser({ email: 'results' + i + '@test.local', name: 'Results Player ' + i, password: 'synthetic-password' })
    );
    const outsider = db.createUser({ email: 'outsider-results@test.local', name: 'Outsider', password: 'synthetic-password' });
    const admin = db.createUser({ email: 'admin-results@test.local', name: 'Admin', password: 'synthetic-password' });
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
      venue: { name: 'Cancha de resultados', address: 'Dirección sintética', districtId: '1' }
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

    // Iniciar partido a partir de la hora programada
    const started = command(users[0].id, 'start', {
      requestId: randomUUID(),
      competitionId: room.id,
      expectedRevision: room.revision
    }, clock + 2000);
    room = started.data;

    fs.writeFileSync(process.env.MATCHSPORT_TEST_DIR + '/match.json', JSON.stringify({
      id: room.id,
      matchId: room.matchId,
      revision: room.revision,
      captains: room.captains,
      users: users.map(u => ({ id: u.id, name: u.name, token: issueToken(u) })),
      outsiderToken: issueToken(outsider),
      adminToken: issueToken(admin)
    }));
  `);

  const info = JSON.parse(fs.readFileSync(path.join(sandbox.directory, 'match.json')));
  return { sandbox, info };
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

test('reportScore validates captain role, active match state and produces RESULT_PENDING', async t => {
  const { sandbox, info } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    const captainA = info.users[0];
    const regularPlayerA = info.users[1];
    const outsiderToken = info.outsiderToken;

    // 1. Regular player cannot report score -> FORBIDDEN
    const regularAttempt = await callCmd(server, regularPlayerA.token, 'reportScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: info.revision,
      score: { teamA: 3, teamB: 1 }
    });
    assert.equal(regularAttempt.status, 403);
    assert.equal(regularAttempt.body.code, 'FORBIDDEN');

    // 2. Outsider cannot report score -> FORBIDDEN
    const outsiderAttempt = await callCmd(server, outsiderToken, 'reportScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: info.revision,
      score: { teamA: 3, teamB: 1 }
    });
    assert.equal(outsiderAttempt.status, 403);

    // 3. Captain A reports score 3 - 1 -> Success
    const reportRes = await callCmd(server, captainA.token, 'reportScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: info.revision,
      score: { teamA: 3, teamB: 1 }
    });
    assert.equal(reportRes.status, 200);
    assert.equal(reportRes.body.success, true);
    const room = reportRes.body.data;
    assert.equal(room.status, 'RESULT_PENDING');
    assert.ok(room.report);
    assert.equal(room.report.reportedBy, captainA.id);
    assert.equal(room.report.reportedTeam, 'teamA');
    assert.deepEqual(room.report.score, { teamA: 3, teamB: 1 });

    // 4. Verify match in database
    const matchRes = await request(server, `/competitions/${info.id}/match`, undefined, captainA.token);
    assert.equal(matchRes.match.status, 'RESULT_PENDING');
    assert.deepEqual(matchRes.match.report.score, { teamA: 3, teamB: 1 });
  } finally {
    await server.stop();
  }
});

test('confirmScore rejects own team, requires opposing captain and finishes with correct outcome and tie support', async t => {
  const { sandbox, info } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    const captainA = info.users[0];
    const regularPlayerB = info.users[6];
    const captainB = info.users[5];

    // Capitán A reporta empate 2 - 2
    const reportRes = await callCmd(server, captainA.token, 'reportScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: info.revision,
      score: { teamA: 2, teamB: 2 }
    });
    assert.equal(reportRes.status, 200);
    const roomWithReport = reportRes.body.data;
    const reportId = roomWithReport.report.reportId;

    // 1. Mismo equipo no puede confirmar su propio reporte -> FORBIDDEN
    const sameTeamConfirm = await callCmd(server, captainA.token, 'confirmScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: roomWithReport.revision,
      reportId
    });
    assert.equal(sameTeamConfirm.status, 403);
    assert.equal(sameTeamConfirm.body.code, 'FORBIDDEN');

    // 2. Miembro regular del equipo rival no puede confirmar -> FORBIDDEN
    const regularOpponentConfirm = await callCmd(server, regularPlayerB.token, 'confirmScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: roomWithReport.revision,
      reportId
    });
    assert.equal(regularOpponentConfirm.status, 403);

    // 3. Confirmación con reportId obsoleto -> REPORT_SUPERSEDED
    const obsoleteConfirm = await callCmd(server, captainB.token, 'confirmScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: roomWithReport.revision,
      reportId: 'obsolete-report-id'
    });
    assert.equal(obsoleteConfirm.status, 409);
    assert.equal(obsoleteConfirm.body.code, 'REPORT_SUPERSEDED');

    // 4. Capitán B confirma reporte de empate
    const confirmRes = await callCmd(server, captainB.token, 'confirmScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: roomWithReport.revision,
      reportId
    });
    assert.equal(confirmRes.status, 200);
    const finishedRoom = confirmRes.body.data;
    assert.equal(finishedRoom.status, 'FINISHED');
    assert.equal(finishedRoom.confirmedBy, captainB.id);
    assert.deepEqual(finishedRoom.finalScore, { teamA: 2, teamB: 2 });
    assert.equal(finishedRoom.outcome, 'draw');

    // 5. Match en DB quedó FINISHED con outcome draw
    const matchRes = await request(server, `/competitions/${info.id}/match`, undefined, captainB.token);
    assert.equal(matchRes.match.status, 'FINISHED');
    assert.equal(matchRes.match.outcome, 'draw');
    assert.deepEqual(matchRes.match.finalScore, { teamA: 2, teamB: 2 });
  } finally {
    await server.stop();
  }
});

test('concurrent matching reports auto-finish match, while conflicting reports transition to DISPUTED', async t => {
  // Test A: Coincidencia entre ambos capitanes -> FINISHED directo
  {
    const { sandbox, info } = fixture(t);
    const server = await startTestServer(sandbox);
    try {
      const captainA = info.users[0];
      const captainB = info.users[5];

      // Capitán A reporta 4 - 1
      const repA = await callCmd(server, captainA.token, 'reportScore', {
        requestId: randomUUID(),
        competitionId: info.id,
        expectedRevision: info.revision,
        score: { teamA: 4, teamB: 1 }
      });
      assert.equal(repA.status, 200);

      // Capitán B reporta exactamente 4 - 1
      const repB = await callCmd(server, captainB.token, 'reportScore', {
        requestId: randomUUID(),
        competitionId: info.id,
        expectedRevision: repA.body.data.revision,
        score: { teamA: 4, teamB: 1 }
      });
      assert.equal(repB.status, 200);
      const finishedRoom = repB.body.data;
      assert.equal(finishedRoom.status, 'FINISHED');
      assert.equal(finishedRoom.outcome, 'teamA');
      assert.deepEqual(finishedRoom.finalScore, { teamA: 4, teamB: 1 });
    } finally {
      await server.stop();
    }
  }

  // Test B: Discrepancia directa entre reportes de ambos capitanes -> DISPUTED
  {
    const { sandbox, info } = fixture(t);
    const server = await startTestServer(sandbox);
    try {
      const captainA = info.users[0];
      const captainB = info.users[5];

      // Capitán A reporta 3 - 0
      const repA = await callCmd(server, captainA.token, 'reportScore', {
        requestId: randomUUID(),
        competitionId: info.id,
        expectedRevision: info.revision,
        score: { teamA: 3, teamB: 0 }
      });
      assert.equal(repA.status, 200);

      // Capitán B reporta 1 - 2 (conflicto)
      const repB = await callCmd(server, captainB.token, 'reportScore', {
        requestId: randomUUID(),
        competitionId: info.id,
        expectedRevision: repA.body.data.revision,
        score: { teamA: 1, teamB: 2 }
      });
      assert.equal(repB.status, 200);
      const disputedRoom = repB.body.data;
      assert.equal(disputedRoom.status, 'DISPUTED');
      assert.ok(disputedRoom.dispute);
      assert.ok(disputedRoom.dispute.disputeId);
      assert.equal(disputedRoom.dispute.disputedBy, captainB.id);
      assert.deepEqual(disputedRoom.dispute.initialReport.score, { teamA: 3, teamB: 0 });
      assert.deepEqual(disputedRoom.dispute.counterReport.score, { teamA: 1, teamB: 2 });
    } finally {
      await server.stop();
    }
  }
});

test('disputeScore freezes evidence and idempotent replay preserves results across restart', async t => {
  const { sandbox, info } = fixture(t);
  let server = await startTestServer(sandbox);
  try {
    const captainA = info.users[0];
    const captainB = info.users[5];

    // Capitán A reporta 5 - 0
    const repA = await callCmd(server, captainA.token, 'reportScore', {
      requestId: randomUUID(),
      competitionId: info.id,
      expectedRevision: info.revision,
      score: { teamA: 5, teamB: 0 }
    });
    assert.equal(repA.status, 200);

    // Capitán B discrepa formalmente con motivo
    const disputeRequestId = randomUUID();
    const disputeRes = await callCmd(server, captainB.token, 'disputeScore', {
      requestId: disputeRequestId,
      competitionId: info.id,
      expectedRevision: repA.body.data.revision,
      reportId: repA.body.data.report.reportId,
      reason: 'El partido fue 2 a 1 real y hubo suplantación'
    });
    assert.equal(disputeRes.status, 200);
    const disputedRoom = disputeRes.body.data;
    assert.equal(disputedRoom.status, 'DISPUTED');
    assert.equal(disputedRoom.dispute.reason, 'El partido fue 2 a 1 real y hubo suplantación');
    assert.deepEqual(disputedRoom.dispute.initialReport.score, { teamA: 5, teamB: 0 });

    // Idempotencia: reenviar el mismo disputeRequestId devuelve la misma respuesta
    const replayed = await callCmd(server, captainB.token, 'disputeScore', {
      requestId: disputeRequestId,
      competitionId: info.id,
      expectedRevision: repA.body.data.revision,
      reportId: repA.body.data.report.reportId,
      reason: 'El partido fue 2 a 1 real y hubo suplantación'
    });
    assert.equal(replayed.status, 200);
    assert.equal(replayed.body.replayed, true);
    assert.equal(replayed.body.data.status, 'DISPUTED');

    // Reiniciar servidor y comprobar persistencia
    await server.stop();
    server = await startTestServer(sandbox);

    const roomAfterRestart = await request(server, `/competitions/${info.id}`, undefined, captainA.token);
    assert.equal(roomAfterRestart.competition.status, 'DISPUTED');
    assert.equal(roomAfterRestart.competition.dispute.reason, 'El partido fue 2 a 1 real y hubo suplantación');

    const matchAfterRestart = await request(server, `/competitions/${info.id}/match`, undefined, captainA.token);
    assert.equal(matchAfterRestart.match.status, 'DISPUTED');
    assert.equal(matchAfterRestart.match.dispute.reason, 'El partido fue 2 a 1 real y hubo suplantación');
  } finally {
    await server.stop();
  }
});
