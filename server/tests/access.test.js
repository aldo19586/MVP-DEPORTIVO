import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createSandbox, startTestServer } from './helpers.js';
import { PROJECT_ROOT } from '../config.js';

function fixtures(sandbox) {
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { db } from './server/db.js';
    import { forceSave } from './server/database.js';
    await db.initAsync();
    const a = db.createUser({ email: 'a@test.local', name: 'Player A', password: 'password-a' });
    const b = db.createUser({ email: 'b@test.local', name: 'Player B', password: 'password-b' });
    const c = db.createUser({ email: 'c@test.local', name: 'Player C', password: 'password-c' });
    const admin = db.createUser({ email: 'admin@test.local', name: 'Operator', password: 'admin-test-password' });
    admin.role = 'admin'; db._persistUser(admin);
    const match = db.createMatch({ sportId: 'futbol', formatId: '1v1', teamA: [a], teamB: [b] });
    match.status = 'disputed'; match.disputeAlert = { reason: 'Synthetic dispute' }; db._persistMatch(match);
    const lobby = db.createLobby({ hostUser: a });
    db.joinLobby(lobby.code, b, 'teamB');
    db.addLobbyChatMessage(lobby.code, { senderId: a.id, text: 'team-a-secret', team: 'teamA', isPrivate: true });
    db.addLobbyChatMessage(lobby.code, { senderId: b.id, text: 'team-b-secret', team: 'teamB', isPrivate: true });
    db._persistLobby(lobby);
    forceSave();
    fs.writeFileSync(process.env.MATCHSPORT_TEST_DIR + '/ids.json', JSON.stringify({ a: a.id, b: b.id, c: c.id, admin: admin.id, match: match.id, lobby: lobby.code }));
    process.exit(0);
  `], { cwd: PROJECT_ROOT, env: sandbox.env, timeout: 10000, stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(path.join(sandbox.directory, 'ids.json')));
}

async function call(server, endpoint, token, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(`${server.url}/api${endpoint}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, data: await response.json() };
}
async function login(server, name) {
  const result = await call(server, '/auth/login', null, { email: `${name}@test.local`, password: name === 'admin' ? 'admin-test-password' : `password-${name}` });
  assert.equal(result.status, 200);
  return result.data.token;
}
function signed(sandbox, claims) {
  const now = Math.floor(Date.now() / 1000);
  const parts = [{ alg: 'HS256', typ: 'JWT' }, { role: 'player', version: 0, iat: now, exp: now + 600, ...claims }].map(value => Buffer.from(JSON.stringify(value)).toString('base64url'));
  return `${parts.join('.')}.${crypto.createHmac('sha256', sandbox.env.JWT_SECRET).update(parts.join('.')).digest('base64url')}`;
}

test('every REST route is private by default; players cannot invoke any admin operation', async t => {
  const sandbox = createSandbox(t); fixtures(sandbox);
  const server = await startTestServer(sandbox);
  try {
    const token = await login(server, 'a');
    const source = fs.readFileSync(path.join(PROJECT_ROOT, 'server/server.js'), 'utf8');
    const routes = [...source.matchAll(/app\.(get|post|put|delete)\('(\/api[^']+)'/g)];
    const publicRoutes = new Set(['/health', '/sports', '/districts', '/auth/check-name/:name', '/auth/login', '/auth/register', '/auth/pin-login', '/auth/pin-register', '/auth/admin-login']);
    assert.ok(routes.length > 30);
    for (const [, method, route] of routes) {
      const endpoint = route.slice(4).replace(/:[^/]+/g, 'missing');
      if (!publicRoutes.has(route.slice(4))) {
        assert.equal((await call(server, endpoint, null, method === 'get' ? undefined : {}, method.toUpperCase())).status, 401, route);
      }
      if (route.startsWith('/api/admin/')) {
        assert.equal((await call(server, endpoint, token, method === 'get' ? undefined : {}, method.toUpperCase())).status, 403, route);
      }
    }
    assert.equal((await call(server, '/admin/users', await login(server, 'admin'))).status, 200);
    assert.equal((await call(server, '/future-route', null)).status, 401);
  } finally { await server.stop(); }
});

test('ownership, membership and public DTOs prevent cross-account access', async t => {
  const sandbox = createSandbox(t); const ids = fixtures(sandbox);
  const server = await startTestServer(sandbox);
  try {
    const a = await login(server, 'a'); const b = await login(server, 'b'); const c = await login(server, 'c');
    for (const endpoint of [`/user/${ids.b}`, `/user/${ids.b}/matches`, `/profile/${ids.b}/futbol/1v1`, `/match/${ids.match}/peer-review/${ids.b}`]) {
      assert.equal((await call(server, endpoint, a)).status, 403, endpoint);
    }
    for (const endpoint of ['/user/complete-profile', '/user/submit-football-test', '/user/push-token', '/profile/questionnaire', '/lobby/leave']) {
      assert.equal((await call(server, endpoint, a, { userId: ids.b })).status, 403, endpoint);
    }
    assert.equal((await call(server, `/user/${ids.b}`, a, { name: 'Hijacked' }, 'PUT')).status, 403);
    assert.equal((await call(server, '/match/peer-review', a, { matchId: ids.match, evaluatorId: ids.b, attributeTag: 'ritmo' })).status, 403);
    assert.equal((await call(server, `/match/${ids.match}`, c)).status, 403);
    assert.equal((await call(server, `/lobby/${ids.lobby}`, c)).status, 403);
    const match = await call(server, `/match/${ids.match}`, a);
    assert.equal(match.status, 200);
    for (const key of ['password', 'pinHash', 'email', 'reference', 'sessionVersion']) assert.equal(key in match.data.match.teamB[0], false, key);
    const lobby = await call(server, `/lobby/${ids.lobby}`, b);
    assert.equal(lobby.status, 200);
    assert.equal(lobby.data.lobby.chatMessages.some(m => m.text === 'team-a-secret'), false);
    assert.equal(lobby.data.lobby.chatMessages.some(m => m.text === 'team-b-secret'), true);
    const ranking = await call(server, '/leaderboard/futbol/1v1', a);
    for (const entry of ranking.data.leaderboard) for (const key of ['password', 'pinHash', 'email', 'sessionVersion']) assert.equal(key in entry.user, false);
    assert.equal((await call(server, `/user/${ids.a}`, a, { bio: 'My bio', role: 'admin', sessionVersion: 999 }, 'PUT')).data.user.role, 'player');
    assert.equal((await call(server, '/user/complete-profile', a, { age: 25, weight: 70, height: 175 })).status, 200);
    assert.equal((await call(server, `/user/${ids.b}`, b)).data.user.name, 'Player B');
    assert.equal((await call(server, '/venues/any/book', a, {})).status, 410);
  } finally { await server.stop(); }
});

test('server derives role from database and rejects unknown, expired and old-version sessions', async t => {
  const sandbox = createSandbox(t); const ids = fixtures(sandbox);
  const server = await startTestServer(sandbox);
  try {
    const forgedRole = signed(sandbox, { userId: ids.a, role: 'admin' });
    assert.equal((await call(server, '/admin/users', forgedRole)).status, 403);
    for (const claims of [{ userId: 'unknown' }, { userId: ids.a, version: 9 }, { userId: ids.a, version: undefined }, { userId: ids.a, exp: 1 }]) {
      assert.equal((await call(server, '/auth/me', signed(sandbox, claims))).status, 401);
    }
    const admin = await login(server, 'admin');
    const resolved = await call(server, '/admin/disputes/resolve', admin, { matchId: ids.match, winnerTeam: 'teamA', adminUserId: ids.a });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.data.match.disputeResolvedBy, ids.admin);
    const history = await call(server, `/user/${ids.a}/matches`, await login(server, 'a'));
    assert.equal(history.data.matches.length, 1);
    for (const team of ['myTeam', 'rivalTeam']) {
      for (const key of ['password', 'pinHash', 'email', 'sessionVersion']) assert.equal(key in history.data.matches[0][team][0], false);
    }
    assert.equal((await call(server, '/admin/disputes/resolve', admin, { matchId: ids.match, winnerTeam: 'teamB' })).status, 409);
  } finally { await server.stop(); }
});

test('logout, PIN reset and bans revoke sessions durably across restart', async t => {
  const sandbox = createSandbox(t); const ids = fixtures(sandbox);
  let server = await startTestServer(sandbox);
  try {
    const a = await login(server, 'a'); const b = await login(server, 'b');
    const admin = await login(server, 'admin');
    assert.equal((await call(server, '/auth/logout', a, {})).status, 200);
    assert.equal((await call(server, '/auth/me', a)).status, 401);
    const freshA = await login(server, 'a');
    assert.equal((await call(server, '/auth/me', freshA)).status, 200);
    assert.equal((await call(server, `/admin/user/${ids.a}/reset-pin`, admin, { newPin: 'abcd' })).status, 400);
    assert.equal((await call(server, `/admin/user/${ids.a}/reset-pin`, admin, { newPin: '9876' })).status, 200);
    assert.equal((await call(server, '/auth/me', freshA)).status, 401);
    assert.equal((await call(server, `/admin/user/${ids.b}/ban`, admin, { hours: -1 })).status, 400);
    assert.equal((await call(server, `/admin/user/${ids.b}/ban`, admin, { hours: 24, reason: 'Test' })).status, 200);
    assert.equal((await call(server, '/auth/me', b)).status, 401);
    await server.stop(); server = await startTestServer(sandbox);
    for (const token of [a, freshA, b]) assert.equal((await call(server, '/auth/me', token)).status, 401);
    assert.equal((await call(server, '/auth/pin-login', null, { name: 'Player A', pin: '9876' })).status, 200);
    assert.equal((await call(server, '/auth/login', null, { email: 'b@test.local', password: 'password-b' })).status, 401);
    const banned = await call(server, `/user/${ids.b}`, admin);
    assert.equal(banned.data.user.isBanned, true);
    assert.equal(banned.data.user.banReason, 'Test');
  } finally { await server.stop(); }
});
