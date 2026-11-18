import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveJwtSecret } from '../auth.js';
import { resolveRuntimeConfig, PROJECT_ROOT } from '../config.js';
import { sanitizeLogText } from '../logger.js';
import { createSandbox, startTestServer, request } from './helpers.js';
import { fixtures } from './access-fixture.js';

function runBackup(sandbox, operation, targetDir, dbPath = sandbox.dbPath) {
  return spawnSync(process.execPath, [
    path.join(PROJECT_ROOT, 'server/backup.js'),
    operation,
    ...(targetDir ? [targetDir] : [])
  ], {
    cwd: PROJECT_ROOT,
    env: { ...sandbox.env, MATCHSPORT_DB_PATH: dbPath },
    encoding: 'utf8',
    timeout: 15000,
  });
}

test('MS-14: /api/health returns system status, database connectivity, schema version, and memory metrics', async t => {
  const sandbox = createSandbox(t);
  const server = await startTestServer(sandbox);

  try {
    const health = await request(server, '/health');
    assert.equal(health.status, 'ok');
    assert.equal(health.database, 'connected');
    assert.ok(typeof health.uptime === 'number');
    assert.ok(typeof health.schemaVersion === 'number' && health.schemaVersion >= 4);
    assert.ok(health.timestamp);
    assert.ok(health.memory && typeof health.memory.rssMb === 'number');
    assert.ok(health.realtime && typeof health.realtime.connectedSockets === 'number');
  } finally {
    await server.stop();
  }
});

test('MS-14: Production configuration guards fail closed against missing secrets or demo seeding', t => {
  // 1. Missing or short JWT_SECRET in production fails closed
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: 'production' }),
    /JWT_SECRET debe contener al menos 32 bytes fuera de desarrollo/
  );
  assert.throws(
    () => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'short_secret' }),
    /JWT_SECRET debe contener al menos 32 bytes fuera de desarrollo/
  );

  // Valid 32-byte secret in production succeeds
  const validSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  assert.equal(resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: validSecret }), validSecret);

  // 2. Demo seeding is strictly forbidden in production
  assert.throws(
    () => resolveRuntimeConfig({ NODE_ENV: 'production', MATCHSPORT_SEED_DEMO: 'true' }),
    /Demo seeding is not allowed in production/
  );

  // Normal production runtime configuration succeeds
  const prodConfig = resolveRuntimeConfig({
    NODE_ENV: 'production',
    PORT: '8080',
    MATCHSPORT_SEED_DEMO: 'false',
    CORS_ORIGIN: 'https://admin.matchsport.app',
    PUBLIC_URL: 'https://api.matchsport.app'
  });
  assert.equal(prodConfig.nodeEnv, 'production');
  assert.equal(prodConfig.port, 8080);
  assert.equal(prodConfig.seedDemo, false);
  assert.equal(prodConfig.corsOrigin, 'https://admin.matchsport.app');
  assert.equal(prodConfig.publicUrl, 'https://api.matchsport.app');
});

test('MS-14: Logger sanitizes passwords, pins, tokens and bearer authorization from log outputs', () => {
  const sampleLogWithPassword = 'User login failed with body: {"email":"player@test.com","password":"plainPassword123"}';
  const sanitizedPassword = sanitizeLogText(sampleLogWithPassword);
  assert.equal(sanitizedPassword.includes('plainPassword123'), false);
  assert.match(sanitizedPassword, /"password"\s*:\s*"\[REDACTED\]"/);

  const sampleLogWithPin = 'PIN verification for user: {"name":"Carlos","pin":"4321","newPin":"9876"}';
  const sanitizedPin = sanitizeLogText(sampleLogWithPin);
  assert.equal(sanitizedPin.includes('4321'), false);
  assert.equal(sanitizedPin.includes('9876'), false);
  assert.match(sanitizedPin, /"pin"\s*:\s*"\[REDACTED\]"/);
  assert.match(sanitizedPin, /"newPin"\s*:\s*"\[REDACTED\]"/);

  const sampleLogWithBearer = 'Request header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tokenBody.sig';
  const sanitizedBearer = sanitizeLogText(sampleLogWithBearer);
  assert.equal(sanitizedBearer.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), false);
  assert.match(sanitizedBearer, /Authorization:\s*Bearer\s*\[REDACTED\]/);
});

test('MS-14: Disaster recovery backup and restore drill succeeds and restores live state into fresh server', async t => {
  const sandbox = createSandbox(t);
  const ids = fixtures(sandbox);

  // 1. Create offline backup
  const backupDir = path.join(sandbox.directory, 'backup-drill-1');
  const backupRes = runBackup(sandbox, 'backup', backupDir);
  assert.equal(backupRes.status, 0, backupRes.stderr);
  assert.ok(fs.existsSync(path.join(backupDir, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(backupDir, 'database.db')));

  // Check manifest contains SHA-256 and version
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, 1);
  assert.ok(manifest.sha256);
  assert.ok(manifest.size > 0);

  // 2. Restore backup into a new destination path
  const restoredDbPath = path.join(sandbox.directory, 'restored.db');
  const restoreRes = runBackup(sandbox, 'restore', backupDir, restoredDbPath);
  assert.equal(restoreRes.status, 0, restoreRes.stderr);
  assert.ok(fs.existsSync(restoredDbPath));

  // 3. Start a new test server against the restored database and verify integrity
  const restoredSandbox = {
    ...sandbox,
    dbPath: restoredDbPath,
    env: { ...sandbox.env, MATCHSPORT_DB_PATH: restoredDbPath }
  };
  const restoredServer = await startTestServer(restoredSandbox);

  try {
    const health = await request(restoredServer, '/health');
    assert.equal(health.database, 'connected');

    // Verify user can log in against restored database
    const loginRes = await fetch(`${restoredServer.url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.local', password: 'admin-test-password' })
    });
    assert.equal(loginRes.status, 200);
    const data = await loginRes.json();
    assert.equal(data.user.id, ids.admin);
  } finally {
    await restoredServer.stop();
  }
});
