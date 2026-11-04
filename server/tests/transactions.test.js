import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';
import { fixtures } from './access-fixture.js';
import { PROJECT_ROOT } from '../config.js';

function run(sandbox, code) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `${code}\nprocess.exit(0);`], {
    cwd: PROJECT_ROOT, env: sandbox.env, encoding: 'utf8', timeout: 20000,
  });
  assert.equal(result.status, 0, result.stderr);
}
const imports = `import assert from 'node:assert/strict'; import fs from 'node:fs';
  import { db } from './server/db.js';
  import { withTransaction, sqlGetReceipt } from './server/database.js';
  await db.initAsync();
  const ids = JSON.parse(fs.readFileSync(process.env.MATCHSPORT_TEST_DIR + '/ids.json'));`;

test('SQL and cached profiles/match roll back together after a mid-result exception', t => {
  const sandbox = createSandbox(t); fixtures(sandbox);
  run(sandbox, `${imports}
    const before = fs.readFileSync(process.env.MATCHSPORT_DB_PATH);
    const original = db._persistMatch;
    const rating = db.getProfile(ids.a, 'futbol', '1v1').rating;
    db._persistMatch = () => { throw new Error('Injected after ratings'); };
    assert.throws(() => db.finalizeLegacyMatch(ids.match, 'teamA', ids.admin, true), /Injected/);
    assert.equal(db.getProfile(ids.a, 'futbol', '1v1').rating, rating);
    assert.equal(db.getMatch(ids.match).status, 'disputed');
    assert.equal(sqlGetReceipt('legacy-result:' + ids.match), null);
    assert.deepEqual(fs.readFileSync(process.env.MATCHSPORT_DB_PATH), before);
    db._persistMatch = original;
    assert.equal(db.finalizeLegacyMatch(ids.match, 'teamA', ids.admin, true).replayed, false);
  `);
});

test('successful result is persisted once and idempotent replay survives a new process', t => {
  const sandbox = createSandbox(t); fixtures(sandbox);
  run(sandbox, `${imports}
    const result = db.finalizeLegacyMatch(ids.match, 'teamA', ids.admin, true);
    assert.equal(result.match.status, 'finished');
    const rating = db.getProfile(ids.a, 'futbol', '1v1').rating;
    assert.equal(db.finalizeLegacyMatch(ids.match, 'teamA', ids.admin, true).replayed, true);
    assert.equal(db.getProfile(ids.a, 'futbol', '1v1').rating, rating);
    assert.equal(db.getProfile(ids.a, 'futbol', '1v1').matchesPlayed, 1);
    assert.throws(() => db.finalizeLegacyMatch(ids.match, 'teamB', ids.admin, true), /ya aplicado/);
  `);
  run(sandbox, `${imports}
    assert.equal(db.finalizeLegacyMatch(ids.match, 'teamA', ids.admin, true).replayed, true);
    assert.equal(db.getProfile(ids.a, 'futbol', '1v1').matchesPlayed, 1);
    assert.equal(db.getMatch(ids.match).disputeResolvedBy, ids.admin);
    db.getMatch(ids.match).status = 'disputed';
    db._persistMatch(db.getMatch(ids.match));
    assert.throws(() => db.finalizeLegacyMatch(ids.match, 'teamA', ids.admin, true), /ya aplicado/);
    assert.equal(db.getProfile(ids.a, 'futbol', '1v1').matchesPlayed, 1);
  `);
});

test('kill inside a transaction cannot persist only the first rating update', async t => {
  const sandbox = createSandbox(t); const ids = fixtures(sandbox);
  const before = await readSnapshot(sandbox, 'SELECT rating FROM user_profiles ORDER BY user_id, sport_id, format_id');
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `${imports}
    db.atomic(() => { db.setProfile(ids.a, 'futbol', '1v1', { rating: 9999 }); process.kill(process.pid, 'SIGKILL'); });
  `], { cwd: PROJECT_ROOT, env: sandbox.env, encoding: 'utf8', timeout: 15000 });
  assert.notEqual(result.status, 0);
  assert.deepEqual(await readSnapshot(sandbox, 'SELECT rating FROM user_profiles ORDER BY user_id, sport_id, format_id'), before);
  const matches = await readSnapshot(sandbox, 'SELECT data_json FROM matches');
  assert.equal(JSON.parse(matches[0][0]).status, 'disputed');
  assert.ok(ids.match);
});

test('reporter socket completion remains finished with its ratings after reboot', async t => {
  const sandbox = createSandbox(t); const ids = fixtures(sandbox, 'active');
  const { io } = await import('socket.io-client');
  let server = await startTestServer(sandbox);
  let socket;
  try {
    const login = await request(server, '/auth/login', { email: 'a@test.local', password: 'password-a' });
    socket = io(server.url, { autoConnect: false, reconnection: false, transports: ['websocket'], auth: { token: login.token } });
    const completed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No matchFinished')), 7000);
      socket.on('matchFinished', data => { clearTimeout(timer); resolve(data); });
      socket.on('connect', () => socket.emit('reportResultByReporter', { matchId: ids.match, winnerTeam: 'teamA' }));
    });
    socket.connect(); await completed; socket.disconnect();
    await server.stop(); server = await startTestServer(sandbox);
    const match = (await request(server, `/match/${ids.match}`, undefined, login.token)).match;
    assert.equal(match.status, 'finished');
    const profile = (await request(server, `/profile/${ids.a}/futbol/1v1`, undefined, login.token)).profile;
    assert.equal(profile.matchesPlayed, 1);
  } finally { socket?.disconnect(); await server.stop(); }
});

test('nested/async transaction bodies are rejected before exposing partial results', t => {
  const sandbox = createSandbox(t); fixtures(sandbox);
  run(sandbox, `${imports}
    assert.throws(() => withTransaction(async () => {}), /synchronous/);
    assert.throws(() => db.atomic(() => {
      db.setProfile(ids.a, 'futbol', '1v1', { rating: 9999 });
      withTransaction(() => {});
    }), /Nested/);
    assert.notEqual(db.getProfile(ids.a, 'futbol', '1v1').rating, 9999);
  `);
});

test('version-one database migration preserves records and records version two', async t => {
  const sandbox = createSandbox(t); fixtures(sandbox, 'finished');
  const before = await readSnapshot(sandbox, 'SELECT id FROM users ORDER BY id');
  run(sandbox, `import fs from 'node:fs'; import initSqlJs from 'sql.js';
    const SQL = await initSqlJs(); const data = new SQL.Database(fs.readFileSync(process.env.MATCHSPORT_DB_PATH));
    data.run('DROP TABLE operation_receipts; DROP TABLE schema_migrations; PRAGMA user_version = 1');
    fs.writeFileSync(process.env.MATCHSPORT_DB_PATH, data.export()); data.close();
  `);
  const server = await startTestServer(sandbox); await server.stop();
  assert.deepEqual(await readSnapshot(sandbox, 'SELECT id FROM users ORDER BY id'), before);
  assert.deepEqual(await readSnapshot(sandbox, 'PRAGMA user_version'), [[4]]);
  assert.equal((await readSnapshot(sandbox, 'SELECT version FROM schema_migrations'))[0][0], 2);
  const historical = await readSnapshot(sandbox, 'SELECT result_json FROM operation_receipts');
  assert.equal(JSON.parse(historical[0][0]).historical, true);
});
