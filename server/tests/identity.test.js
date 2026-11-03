import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import initSqlJs from 'sql.js';
import { createSandbox, startTestServer, request } from './helpers.js';
import { PROJECT_ROOT } from '../config.js';
import { isPasswordHash, matchesPassword } from '../credentials.js';
import { toClientUser } from '../userDto.js';

const secret = 'synthetic-secret-for-token-unit-tests-only';
process.env.JWT_SECRET = secret;
const { signToken, verifyToken, resolveJwtSecret } = await import('../auth.js');

function assertNoCredentials(user) {
  for (const key of ['password', 'pinHash', 'pin_hash', 'pushToken']) assert.equal(key in user, false, `${key} must not be exposed`);
}

async function post(server, endpoint, data) {
  const response = await fetch(`${server.url}/api${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data), signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, data: await response.json() };
}

function provisionAdmin(sandbox, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server/create-admin.js'], {
      cwd: PROJECT_ROOT, env: sandbox.env, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    const timer = setTimeout(() => child.kill(), 10000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); resolve({ code, output }); });
    child.stdin.end(JSON.stringify(input));
  });
}

test('JWT uses seconds and rejects expiration, tampering and missing claims', () => {
  const token = signToken({ userId: 'test-user', role: 'player' });
  const claims = verifyToken(token);
  assert.equal(claims.userId, 'test-user');
  assert.ok(claims.exp < 100000000000);
  assert.equal(verifyToken(signToken({ userId: 'test-user', role: 'player' }, -1000)), null);
  const [header, body] = token.split('.');
  assert.equal(verifyToken(`${header}.${body}.invalid`), null);
  assert.equal(verifyToken(signToken({ userId: 'test-user' })), null);
  function signed(metadata, payload) {
    const parts = [metadata, payload].map(value => Buffer.from(JSON.stringify(value)).toString('base64url'));
    return `${parts.join('.')}.${crypto.createHmac('sha256', secret).update(parts.join('.')).digest('base64url')}`;
  }
  assert.equal(verifyToken(signed({ alg: 'none', typ: 'JWT' }, claims)), null);
  assert.equal(verifyToken(signed({ alg: 'HS256', typ: 'JWT' }, { ...claims, exp: undefined })), null);
  assert.equal(verifyToken(signed({ alg: 'HS256', typ: 'JWT' }, { ...claims, exp: Date.now() + 100000 })), null);
});

test('secret is required outside development and user DTO is an allowlist', () => {
  assert.throws(() => resolveJwtSecret({ NODE_ENV: 'production' }), /JWT_SECRET/);
  assert.throws(() => resolveJwtSecret({ NODE_ENV: 'test', JWT_SECRET: 'short' }), /JWT_SECRET/);
  assert.notEqual(resolveJwtSecret({}), resolveJwtSecret({}));
  const user = toClientUser({ id: 'u', name: 'Player', password: 'secret', pinHash: 'hash', pushToken: 'private', futureSecret: 'new' });
  assert.deepEqual(user, { id: 'u', name: 'Player' });
});

test('public registration cannot grant admin and password login cannot bypass credentials', async t => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);
  try {
    const registration = await post(server, '/auth/register', {
      email: 'admin@matchsport.pe', name: 'Public registrant', password: 'player-password', role: 'admin',
    });
    assert.equal(registration.status, 200);
    assert.equal(registration.data.user.role, 'player');
    assertNoCredentials(registration.data.user);
    const duplicate = await post(server, '/auth/register', {
      email: ' ADMIN@MATCHSPORT.PE ', name: 'Other', password: 'different-password',
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.data.token, undefined);
    assert.equal((await post(server, '/auth/admin-login', { email: 'admin@matchsport.pe', password: 'player-password' })).status, 403);
    assert.equal((await post(server, '/auth/login', { email: 'admin@matchsport.pe' })).status, 400);
    assert.equal((await post(server, '/auth/login', { email: 'admin@matchsport.pe', password: 'wrong' })).status, 401);
    assert.equal((await post(server, '/auth/login', { email: 'unknown@test.local', name: 'Unexpected', password: 'pass' })).status, 401);
    const pin = await post(server, '/auth/pin-register', { name: 'PIN player', pin: '5678' });
    assertNoCredentials(pin.data.user);
    assert.equal((await post(server, '/auth/login', { email: pin.data.user.email, password: 'anything' })).status, 401);
    assertNoCredentials((await request(server, `/user/${pin.data.user.id}`, undefined, pin.data.token)).user);

  } finally {
    await server.stop();
  }
  const SQL = await initSqlJs();
  const database = new SQL.Database(fs.readFileSync(sandbox.dbPath));
  try {
    const stored = database.exec("SELECT password FROM users WHERE email = 'admin@matchsport.pe'")[0].values[0][0];
    assert.ok(isPasswordHash(stored));
    assert.ok(matchesPassword('player-password', stored));
  } finally { database.close(); }
});

test('legacy plaintext password migrates after valid login and persists across restart', async t => {
  const sandbox = createSandbox(t);
  let server = await startTestServer(sandbox);
  await server.stop();
  const SQL = await initSqlJs();
  const database = new SQL.Database(fs.readFileSync(sandbox.dbPath));
  database.run('INSERT INTO users (id,email,password,name,role) VALUES (?,?,?,?,?)', [
    'legacy-user', 'legacy@test.local', 'old-password', 'Legacy Player', 'player',
  ]);
  fs.writeFileSync(sandbox.dbPath, database.export());
  database.close();
  try {
    server = await startTestServer(sandbox);
    const result = await post(server, '/auth/login', { email: 'legacy@test.local', password: 'old-password' });
    assert.equal(result.status, 200);
    assertNoCredentials(result.data.user);
    await server.stop();
    server = await startTestServer(sandbox);
    assert.equal((await post(server, '/auth/login', { email: 'legacy@test.local', password: 'old-password' })).status, 200);
  } finally { await server.stop(); }
  const persisted = new SQL.Database(fs.readFileSync(sandbox.dbPath));
  try { assert.ok(isPasswordHash(persisted.exec("SELECT password FROM users WHERE id = 'legacy-user'")[0].values[0][0])); }
  finally { persisted.close(); }
});

test('operator can create an admin without credentials in output; existing accounts are not promoted', async t => {
  const sandbox = createSandbox(t);
  const credentials = { email: 'operator@test.local', name: 'Operator', password: 'synthetic-admin-password' };
  const created = await provisionAdmin(sandbox, credentials);
  assert.equal(created.code, 0, created.output);
  assert.equal(created.output.includes(credentials.password), false);
  const repeated = await provisionAdmin(sandbox, credentials);
  assert.equal(repeated.code, 1);
  const server = await startTestServer(sandbox);
  try {
    const login = await post(server, '/auth/admin-login', credentials);
    assert.equal(login.status, 200);
    assert.equal(login.data.user.role, 'admin');
    assertNoCredentials(login.data.user);
    for (const user of (await request(server, '/admin/users', undefined, login.data.token)).users) assertNoCredentials(user);
    assert.equal((await post(server, '/auth/admin-login', { ...credentials, password: 'wrong' })).status, 401);
  } finally { await server.stop(); }
  const playerServer = await startTestServer(sandbox);
  const player = { email: 'player@test.local', name: 'Existing Player', password: 'player-password' };
  try { assert.equal((await post(playerServer, '/auth/register', player)).status, 200); }
  finally { await playerServer.stop(); }
  assert.equal((await provisionAdmin(sandbox, player)).code, 1);
  const checked = await startTestServer(sandbox);
  try { assert.equal((await post(checked, '/auth/admin-login', player)).status, 403); }
  finally { await checked.stop(); }
});

test('server fails closed when test secret is missing', async t => {
  const sandbox = createSandbox(t);
  await assert.rejects(startTestServer(sandbox, { JWT_SECRET: '' }), /JWT_SECRET/);
  assert.equal(fs.existsSync(sandbox.dbPath), false);
});
