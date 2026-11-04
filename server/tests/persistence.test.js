import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { atomicWrite, acquireDatabaseLock } from '../fileStore.js';
import { PROJECT_ROOT } from '../config.js';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';
import { fixtures } from './access-fixture.js';

function node(sandbox, script) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: PROJECT_ROOT, env: sandbox.env, encoding: 'utf8', timeout: 15000 });
}
function operator(sandbox, operation, directory, target = sandbox.dbPath) {
  return spawnSync(process.execPath, ['server/backup.js', operation, ...(directory ? [directory] : [])], {
    cwd: PROJECT_ROOT, env: { ...sandbox.env, MATCHSPORT_DB_PATH: target }, encoding: 'utf8', timeout: 15000,
  });
}

test('partial write, fsync and rename failures preserve the previous snapshot', t => {
  const sandbox = createSandbox(t);
  for (const step of ['writeFileSync', 'fsyncSync', 'renameSync']) {
    fs.writeFileSync(sandbox.dbPath, 'last-good-snapshot');
    const io = { ...fs, [step]: (...args) => {
      if (step === 'writeFileSync') fs.writeFileSync(args[0], 'partial');
      throw Object.assign(new Error('Injected disk failure'), { code: 'ENOSPC' });
    } };
    assert.throws(() => atomicWrite(sandbox.dbPath, Buffer.from('new-snapshot'), io), /disk failure/);
    assert.equal(fs.readFileSync(sandbox.dbPath, 'utf8'), 'last-good-snapshot');
    assert.deepEqual(fs.readdirSync(sandbox.directory), ['test.db']);
  }
});

test('interruption before rename leaves the last valid database readable; orphan temp is ignored', async t => {
  const sandbox = createSandbox(t);
  const first = await startTestServer(sandbox); await first.stop();
  const before = fs.readFileSync(sandbox.dbPath);
  const killed = node(sandbox, `
    import fs from 'node:fs';
    import { atomicWrite } from './server/fileStore.js';
    atomicWrite(process.env.MATCHSPORT_DB_PATH, Buffer.from('incomplete'), { ...fs, renameSync: () => process.exit(79) });
  `);
  assert.equal(killed.status, 79);
  assert.deepEqual(fs.readFileSync(sandbox.dbPath), before);
  assert.ok(fs.readdirSync(sandbox.directory).some(file => file.includes('.tmp-')));
  const restarted = await startTestServer(sandbox);
  try { assert.equal((await request(restarted, '/health')).database, 'connected'); }
  finally { await restarted.stop(); }
});

test('second writer and active lock removal are rejected without changing the first server', async t => {
  const sandbox = createSandbox(t); const server = await startTestServer(sandbox);
  try {
    await assert.rejects(startTestServer(sandbox), /Database locked/);
    assert.notEqual(operator(sandbox, 'unlock').status, 0);
    assert.equal((await request(server, '/health')).database, 'connected');
  } finally { await server.stop(); }
  const release = acquireDatabaseLock(sandbox.dbPath); release();
  assert.equal(fs.existsSync(`${sandbox.dbPath}.lock`), false);
});

test('acknowledged registration survives abrupt process termination and controlled stale-lock recovery', async t => {
  const sandbox = createSandbox(t); let server = await startTestServer(sandbox);
  const registered = await request(server, '/auth/pin-register', { name: 'Durable Player', pin: '6789' });
  await server.crash();
  assert.equal((await readSnapshot(sandbox, 'SELECT id FROM users')).length, 1);
  await assert.rejects(startTestServer(sandbox), /Database locked/);
  assert.equal(operator(sandbox, 'unlock').status, 0);
  server = await startTestServer(sandbox);
  try {
    const logged = await request(server, '/auth/pin-login', { name: 'Durable Player', pin: '6789' });
    assert.equal(logged.user.id, registered.user.id);
  } finally { await server.stop(); }
});

test('storage error terminates the writer instead of returning a successfully saved user', async t => {
  const sandbox = createSandbox(t);
  const failed = node(sandbox, `
    import fs from 'node:fs';
    import { initDatabase, sqlInsertUser } from './server/database.js';
    await initDatabase();
    fs.renameSync = () => { throw new Error('Injected disk full'); };
    sqlInsertUser({ id: 'not-saved', email: 'not-saved@test.local', name: 'Not saved' });
    console.log('UNEXPECTED_SUCCESS');
  `);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /Persistence failed/);
  assert.equal(failed.stdout.includes('UNEXPECTED_SUCCESS'), false);
  assert.deepEqual(await readSnapshot(sandbox, 'SELECT id FROM users'), []);
  assert.equal(fs.existsSync(`${sandbox.dbPath}.lock`), false);
});

test('offline backup restores accounts, profiles, matches and lobby into a new validated server', async t => {
  const sandbox = createSandbox(t); const ids = fixtures(sandbox);
  let server = await startTestServer(sandbox);
  const directory = path.join(sandbox.directory, 'backup-1');
  try { assert.notEqual(operator(sandbox, 'backup', directory).status, 0); }
  finally { await server.stop(); }
  const before = fs.readFileSync(sandbox.dbPath);
  const backup = operator(sandbox, 'backup', directory);
  assert.equal(backup.status, 0, backup.stderr);
  assert.deepEqual(fs.readFileSync(sandbox.dbPath), before);
  assert.notEqual(operator(sandbox, 'backup', directory).status, 0);
  assert.notEqual(operator(sandbox, 'restore', directory).status, 0, 'Existing destination cannot be overwritten');
  const restored = path.join(sandbox.directory, 'restored.db');
  assert.equal(operator(sandbox, 'restore', directory, restored).status, 0);
  assert.deepEqual(fs.readFileSync(restored), before);
  server = await startTestServer(sandbox, { MATCHSPORT_DB_PATH: restored });
  try {
    const login = await request(server, '/auth/login', { email: 'a@test.local', password: 'password-a' });
    assert.equal(login.user.id, ids.a);
    assert.equal((await request(server, `/match/${ids.match}`, undefined, login.token)).match.id, ids.match);
    assert.equal((await request(server, `/lobby/${ids.lobby}`, undefined, login.token)).lobby.hostUserId, ids.a);
    assert.ok((await request(server, `/profile/${ids.a}/futbol/1v1`, undefined, login.token)).profile.rating > 0);
  } finally { await server.stop(); }
  fs.appendFileSync(path.join(directory, 'database.db'), 'tampered');
  const invalidTarget = path.join(sandbox.directory, 'invalid-restore.db');
  assert.notEqual(operator(sandbox, 'restore', directory, invalidTarget).status, 0);
  assert.equal(fs.existsSync(invalidTarget), false);
});

test('corrupt and newer-schema files are rejected without replacing existing data', async t => {
  const sandbox = createSandbox(t);
  fs.writeFileSync(sandbox.dbPath, Buffer.alloc(0));
  await assert.rejects(startTestServer(sandbox), /Invalid SQLite/);
  assert.equal(fs.statSync(sandbox.dbPath).size, 0);
  fs.unlinkSync(sandbox.dbPath);
  const future = node(sandbox, `
    import fs from 'node:fs'; import initSqlJs from 'sql.js';
    const SQL = await initSqlJs(); const db = new SQL.Database();
    db.run('PRAGMA user_version = 99'); fs.writeFileSync(process.env.MATCHSPORT_DB_PATH, db.export()); db.close();
  `);
  assert.equal(future.status, 0);
  const before = fs.readFileSync(sandbox.dbPath);
  await assert.rejects(startTestServer(sandbox), /newer than/);
  assert.deepEqual(fs.readFileSync(sandbox.dbPath), before);
});
