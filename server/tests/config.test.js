import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveRuntimeConfig, PROJECT_ROOT, TEST_ROOT } from '../config.js';
import { createSandbox, startTestServer } from './helpers.js';

test('development keeps the existing database path and demos are opt-in', () => {
  const config = resolveRuntimeConfig({});
  assert.equal(config.dbPath, path.join(PROJECT_ROOT, 'matchsport.db'));
  assert.equal(config.port, 3001);
  assert.equal(config.seedDemo, false);
  assert.equal(resolveRuntimeConfig({ MATCHSPORT_SEED_DEMO: 'true' }).seedDemo, true);
});

test('test mode refuses implicit paths and the personal database', () => {
  assert.throws(() => resolveRuntimeConfig({ NODE_ENV: 'test' }), /Tests require/);
  const env = { NODE_ENV: 'test', MATCHSPORT_TEST_DIR: path.join(TEST_ROOT, 'run-guard') };
  for (const dbPath of ['matchsport.db', path.join(PROJECT_ROOT, 'matchsport.db'), '../outside.db']) {
    assert.throws(() => resolveRuntimeConfig({ ...env, MATCHSPORT_DB_PATH: dbPath }), /dedicated/);
  }
});

test('test path cannot escape to a sibling directory', () => {
  assert.throws(() => resolveRuntimeConfig({
    NODE_ENV: 'test',
    MATCHSPORT_TEST_DIR: path.join(TEST_ROOT, 'run-a'),
    MATCHSPORT_DB_PATH: path.join(TEST_ROOT, 'run-ab/test.db'),
  }), /dedicated/);
});

test('hard links cannot alias a database inside the test directory', t => {
  const sandbox = createSandbox(t);
  const source = path.join(sandbox.directory, 'source.db');
  fs.writeFileSync(source, 'sentinel');
  fs.linkSync(source, sandbox.dbPath);
  assert.throws(() => resolveRuntimeConfig(sandbox.env), /hard-linked/);
  assert.equal(fs.readFileSync(source, 'utf8'), 'sentinel');
});

test('symbolic links cannot escape the test directory', t => {
  const sandbox = createSandbox(t);
  const outside = createSandbox(t);
  const link = path.join(sandbox.directory, 'linked');
  fs.symlinkSync(outside.directory, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveRuntimeConfig({
    ...sandbox.env, MATCHSPORT_DB_PATH: path.join(link, 'test.db'),
  }), /symbolic links/);
});

test('invalid ports and accidental production demo seeding are rejected', () => {
  for (const port of ['abc', '-1', '65536', '1.5']) {
    assert.throws(() => resolveRuntimeConfig({ PORT: port }), /PORT/);
  }
  assert.throws(() => resolveRuntimeConfig({ MATCHSPORT_SEED_DEMO: 'yes' }), /true or false/);
  assert.throws(() => resolveRuntimeConfig({ NODE_ENV: 'production', MATCHSPORT_SEED_DEMO: 'true' }), /production/);
});

test('dangling directory links are rejected before their target can be created', t => {
  const sandbox = createSandbox(t);
  const missing = path.join(sandbox.directory, 'missing');
  const link = path.join(sandbox.directory, 'dangling');
  fs.symlinkSync(missing, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveRuntimeConfig({
    ...sandbox.env, MATCHSPORT_DB_PATH: path.join(link, 'test.db'),
  }), /symbolic links/);
  assert.equal(fs.existsSync(missing), false);
});

test('real server refuses a protected path before opening a database', async t => {
  const sandbox = createSandbox(t);
  const protectedFile = path.join(TEST_ROOT, `protected-${path.basename(sandbox.directory)}.db`);
  fs.writeFileSync(protectedFile, 'do-not-touch');
  t.after(() => fs.unlinkSync(protectedFile));
  await assert.rejects(startTestServer(sandbox, { MATCHSPORT_DB_PATH: protectedFile }), /dedicated/);
  assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'do-not-touch');
  assert.equal(fs.existsSync(sandbox.dbPath), false);
});
