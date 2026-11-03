import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';

test('empty boot has catalogs but no demo users, matches or lobbies', async t => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);
  try {
    assert.equal((await request(server, '/health')).database, 'connected');
    assert.ok((await request(server, '/sports')).sports.length > 0);
    assert.ok(fs.existsSync(sandbox.dbPath));
    assert.ok(fs.existsSync(path.join(sandbox.directory, 'logs')));
  } finally {
    await server.stop();
  }
  assert.deepEqual(await readSnapshot(sandbox, 'SELECT id FROM users'), []);
  assert.deepEqual(await readSnapshot(sandbox, 'SELECT id FROM matches'), []);
  assert.deepEqual(await readSnapshot(sandbox, 'SELECT code FROM lobbies'), []);
});

test('two servers isolate users and ports; restarting preserves only their own data', async t => {
  const first = createSandbox(t);
  const second = createSandbox(t);
  let a;
  let b;
  try {
    a = await startTestServer(first);
    b = await startTestServer(second);
    assert.notEqual(a.port, b.port);
    const registration = await request(a, '/auth/pin-register', {
      name: 'Isolated Player', pin: '5678', district: 'Test district',
    });
    assert.ok(registration.user.id);
    assert.equal((await request(a, '/auth/me', undefined, registration.token)).user.id, registration.user.id);
    assert.equal((await request(b, '/auth/check-name/Isolated%20Player')).exists, false);
    await a.stop();
    a = await startTestServer(first);
    const login = await request(a, '/auth/pin-login', { name: 'Isolated Player', pin: '5678' });
    assert.equal(login.user.id, registration.user.id);
    assert.equal((await request(a, '/auth/me', undefined, registration.token)).user.id, registration.user.id);
    assert.deepEqual((await request(a, '/lobbies', undefined, login.token)).lobbies, []);
    assert.equal((await request(b, '/auth/check-name/Isolated%20Player')).exists, false);
  } finally {
    await a?.stop();
    await b?.stop();
  }
  assert.equal((await readSnapshot(first, 'SELECT id FROM users')).length, 1);
  assert.deepEqual(await readSnapshot(second, 'SELECT id FROM users'), []);
});

test('explicit demo seeding works and does not duplicate users on restart', async t => {
  const sandbox = createSandbox(t);
  let server;
  try {
    server = await startTestServer(sandbox, { MATCHSPORT_SEED_DEMO: 'true' });
    await server.stop();
    const before = await readSnapshot(sandbox, 'SELECT id FROM users ORDER BY id');
    assert.ok(before.length > 0);
    assert.ok((await readSnapshot(sandbox, 'SELECT id FROM matches')).length > 0);
    server = await startTestServer(sandbox, { MATCHSPORT_SEED_DEMO: 'true' });
    await server.stop();
    const after = await readSnapshot(sandbox, 'SELECT id FROM users ORDER BY id');
    assert.deepEqual(after, before);
  } finally {
    await server?.stop();
  }
});
