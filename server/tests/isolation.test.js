import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSandbox, startTestServer, request } from './helpers.js';

test('empty boot has catalogs but no demo users, matches or lobbies', async t => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);
  try {
    assert.equal((await request(server, '/health')).database, 'connected');
    assert.ok((await request(server, '/sports')).sports.length > 0);
    assert.deepEqual((await request(server, '/admin/users')).users, []);
    assert.deepEqual((await request(server, '/lobbies')).lobbies, []);
    assert.deepEqual((await request(server, '/admin/matches')).matches, []);
    assert.ok(fs.existsSync(sandbox.dbPath));
    assert.ok(fs.existsSync(path.join(sandbox.directory, 'logs')));
  } finally {
    await server.stop();
  }
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
    assert.equal((await request(a, '/admin/users')).users.length, 1);
    assert.equal((await request(b, '/admin/users')).users.length, 0);
    await a.stop();
    a = await startTestServer(first);
    const login = await request(a, '/auth/pin-login', { name: 'Isolated Player', pin: '5678' });
    assert.equal(login.user.id, registration.user.id);
    assert.equal((await request(a, '/admin/users')).users.length, 1);
    assert.deepEqual((await request(a, '/lobbies')).lobbies, []);
    assert.equal((await request(b, '/admin/users')).users.length, 0);
  } finally {
    await a?.stop();
    await b?.stop();
  }
});

test('explicit demo seeding works and does not duplicate users on restart', async t => {
  const sandbox = createSandbox(t);
  let server;
  try {
    server = await startTestServer(sandbox, { MATCHSPORT_SEED_DEMO: 'true' });
    const before = (await request(server, '/admin/users')).users.map(user => user.id).sort();
    assert.ok(before.length > 0);
    assert.ok((await request(server, '/admin/matches')).matches.length > 0);
    await server.stop();
    server = await startTestServer(sandbox, { MATCHSPORT_SEED_DEMO: 'true' });
    const after = (await request(server, '/admin/users')).users.map(user => user.id).sort();
    assert.deepEqual(after, before);
  } finally {
    await server?.stop();
  }
});
