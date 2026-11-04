import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { PROJECT_ROOT, TEST_ROOT } from '../config.js';
import initSqlJs from 'sql.js';

// Read snapshots only after stop(): sql.js is a single-writer database.
export async function readSnapshot(sandbox, query) {
  const SQL = await initSqlJs();
  const database = new SQL.Database(fs.readFileSync(sandbox.dbPath));
  try { return database.exec(query)[0]?.values || []; }
  finally { database.close(); }
}

export function createSandbox(t) {
  fs.mkdirSync(TEST_ROOT, { recursive: true });
  assert.equal(fs.lstatSync(TEST_ROOT).isSymbolicLink(), false);
  const directory = fs.mkdtempSync(path.join(TEST_ROOT, 'run-'));
  const originalRealPath = fs.realpathSync(directory);
  const dbPath = path.join(directory, 'test.db');
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '0',
    MATCHSPORT_TEST_DIR: directory,
    MATCHSPORT_DB_PATH: dbPath,
    MATCHSPORT_SEED_DEMO: 'false',
    JWT_SECRET: 'isolated-test-secret-not-for-real-users',
  };
  t.after(() => {
    // Only remove the exact directory created here, never a computed ancestor.
    assert.equal(path.dirname(directory), TEST_ROOT);
    assert.ok(path.basename(directory).startsWith('run-'));
    assert.equal(fs.realpathSync(directory), originalRealPath);
    assert.equal(fs.lstatSync(directory).isSymbolicLink(), false);
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  return { directory, dbPath, env };
}

export async function startTestServer(sandbox, overrides = {}) {
  const child = fork(path.join(PROJECT_ROOT, 'server/server.js'), [], {
    cwd: PROJECT_ROOT,
    env: { ...sandbox.env, ...overrides },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-8000); });
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-8000); });
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  async function stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const killTimer = setTimeout(() => child.kill(), 3000);
    try {
      if (child.connected) child.send({ type: 'shutdown' });
      else child.kill();
      await exited;
    } finally {
      clearTimeout(killTimer);
    }
  }
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(`Server startup timeout\n${output}`)), 15000);
      const onError = error => finish(error);
      const onExit = code => finish(new Error(`Server exited (${code})\n${output}`));
      const onMessage = message => {
        if (message?.type === 'ready') finish(null, message.port);
      };
      function finish(error, value) {
        clearTimeout(timer);
        child.off('error', onError);
        child.off('exit', onExit);
        child.off('message', onMessage);
        if (error) reject(error);
        else resolve(value);
      }
      child.once('error', onError);
      child.once('exit', onExit);
      child.on('message', onMessage);
    });
    return { url: `http://127.0.0.1:${port}`, port, stop,
      crash: async () => { child.kill('SIGKILL'); await exited; } };
  } catch (error) {
    await stop();
    throw error;
  }
}

export async function request(server, endpoint, body, token) {
  const response = await fetch(`${server.url}/api${endpoint}`, {
    ...(body ? {
      method: 'POST',
      body: JSON.stringify(body),
    } : {}),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(5000),
  });
  assert.ok(response.ok, `Unexpected HTTP ${response.status} at ${endpoint}`);
  return response.json();
}
