import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from './access-fixture.js';
import { createSandbox, startTestServer } from './helpers.js';

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

test('MS-12: SuperAdmin ban, unban, and pin reset record full audit trail and persist across restart', async t => {
  const sandbox = createSandbox(t);
  const ids = fixtures(sandbox);
  let server = await startTestServer(sandbox);

  try {
    const adminToken = await login(server, 'admin');
    const playerToken = await login(server, 'b');

    // 1. Regular player is forbidden from performing admin operations
    const forbiddenBan = await call(server, `/admin/user/${ids.b}/ban`, playerToken, { hours: 24, reason: 'Intento ilegal' });
    assert.equal(forbiddenBan.status, 403, 'Jugador regular no puede banear');

    const forbiddenPin = await call(server, `/admin/user/${ids.b}/reset-pin`, playerToken, { newPin: '9999', reason: 'Intento ilegal' });
    assert.equal(forbiddenPin.status, 403, 'Jugador regular no puede resetear PIN');

    // 2. SuperAdmin bans player with explicit reason and duration
    const banRes = await call(server, `/admin/user/${ids.b}/ban`, adminToken, {
      hours: 48,
      reason: 'Infracción grave al código de conducta deportiva'
    });
    assert.equal(banRes.status, 200);
    assert.equal(banRes.data.success, true);
    assert.equal(banRes.data.user.isBanned, true);
    assert.equal(banRes.data.user.bannedBy, ids.admin);
    assert.equal(banRes.data.user.banReason, 'Infracción grave al código de conducta deportiva');
    assert.equal(banRes.data.user.bannedHours, 48);
    assert.ok(banRes.data.user.bannedAt);
    assert.ok(banRes.data.user.bannedUntil);

    // Banned player cannot log in
    const bannedLogin = await call(server, '/auth/login', null, { email: 'b@test.local', password: 'password-b' });
    assert.equal(bannedLogin.status, 401);
    assert.match(bannedLogin.data.error, /suspendida/);
    assert.match(bannedLogin.data.error, /Infracción grave al código de conducta deportiva/);

    // 3. SuperAdmin resets player PIN with explicit reason
    const pinRes = await call(server, `/admin/user/${ids.b}/reset-pin`, adminToken, {
      newPin: '7410',
      reason: 'Recuperación acordada de acceso tras verificación de identidad'
    });
    assert.equal(pinRes.status, 200);
    assert.equal(pinRes.data.success, true);
    assert.equal(pinRes.data.user.pinResetBy, ids.admin);
    assert.equal(pinRes.data.user.pinResetReason, 'Recuperación acordada de acceso tras verificación de identidad');
    assert.ok(pinRes.data.user.pinResetAt);

    // Old token should be invalidated because sessionVersion was incremented
    const staleRequest = await call(server, `/user/${ids.b}`, playerToken);
    assert.equal(staleRequest.status, 401, 'Token previo revocado al resetear PIN');

    // 4. SuperAdmin lifts ban (unban: hours = 0) with explicit reason
    const unbanRes = await call(server, `/admin/user/${ids.b}/ban`, adminToken, {
      hours: 0,
      reason: 'Apelación aceptada y levantamiento formal de sanción'
    });
    assert.equal(unbanRes.status, 200);
    assert.equal(unbanRes.data.success, true);
    assert.equal(unbanRes.data.user.isBanned, false);
    assert.equal(unbanRes.data.user.unbannedBy, ids.admin);
    assert.equal(unbanRes.data.user.unbanReason, 'Apelación aceptada y levantamiento formal de sanción');
    assert.ok(unbanRes.data.user.unbannedAt);

    // Player can now log in with the new PIN
    const pinLogin = await call(server, '/auth/pin-login', null, { name: 'Player B', pin: '7410' });
    assert.equal(pinLogin.status, 200);
    assert.equal(pinLogin.data.user.name, 'Player B');

    // 5. Restart server to verify persistence in SQLite
    await server.stop();
    server = await startTestServer(sandbox);

    const postRestartAdminToken = await login(server, 'admin');
    const adminUsersList = await call(server, '/admin/users', postRestartAdminToken);
    assert.equal(adminUsersList.status, 200);
    const persistedUserB = adminUsersList.data.users.find(u => u.id === ids.b);
    assert.ok(persistedUserB, 'Usuario B encontrado en lista de auditoría');
    assert.equal(persistedUserB.isBanned, false);
    assert.equal(persistedUserB.bannedBy, ids.admin);
    assert.equal(persistedUserB.banReason, 'Infracción grave al código de conducta deportiva');
    assert.equal(persistedUserB.unbannedBy, ids.admin);
    assert.equal(persistedUserB.unbanReason, 'Apelación aceptada y levantamiento formal de sanción');
    assert.equal(persistedUserB.pinResetBy, ids.admin);
    assert.equal(persistedUserB.pinResetReason, 'Recuperación acordada de acceso tras verificación de identidad');
    assert.ok(persistedUserB.pinResetAt);
  } finally {
    await server.stop();
  }
});

test('MS-12: SuperAdmin dispute resolution records arbitrator, reason, and timestamp', async t => {
  const sandbox = createSandbox(t);
  const ids = fixtures(sandbox);
  let server = await startTestServer(sandbox);

  try {
    const adminToken = await login(server, 'admin');
    const playerToken = await login(server, 'a');

    // Regular player cannot resolve disputes
    const forbiddenResolve = await call(server, '/admin/disputes/resolve', playerToken, {
      matchId: ids.match,
      winnerTeam: 'teamA',
      reason: 'Dictamen no autorizado'
    });
    assert.equal(forbiddenResolve.status, 403);

    // Admin resolves dispute
    const resolveRes = await call(server, '/admin/disputes/resolve', adminToken, {
      matchId: ids.match,
      winnerTeam: 'teamA',
      reason: 'Dictamen oficial SuperAdmin tras revisión de chat y evidencia'
    });
    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.data.success, true);
    assert.equal(resolveRes.data.match.status, 'finished');
    assert.equal(resolveRes.data.match.resultFinal, 'teamA');
    assert.equal(resolveRes.data.match.disputeResolvedBy, ids.admin);
    assert.equal(resolveRes.data.match.resolvedBy, ids.admin);
    assert.equal(resolveRes.data.match.resolutionReason, 'Dictamen oficial SuperAdmin tras revisión de chat y evidencia');
    assert.ok(resolveRes.data.match.resolvedAt);

    // Restart server and verify dispute resolution persistence
    await server.stop();
    server = await startTestServer(sandbox);

    const postRestartAdminToken = await login(server, 'admin');
    const disputesList = await call(server, '/admin/disputes', postRestartAdminToken);
    assert.equal(disputesList.status, 200);
    // The resolved match is no longer in pending disputes
    const stillDisputed = disputesList.data.disputes.some(d => d.id === ids.match);
    assert.equal(stillDisputed, false, 'El partido ya no figura como disputa pendiente');
  } finally {
    await server.stop();
  }
});
