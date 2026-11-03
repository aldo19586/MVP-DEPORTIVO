import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TEST_ROOT = path.join(PROJECT_ROOT, '.test-runs');

function isInside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

// Tests may only write inside their own directory. Reject filesystem aliases too.
function checkTestPath(testDir, dbPath) {
  if (!isInside(TEST_ROOT, testDir) || !isInside(testDir, dbPath)) {
    throw new Error('Test database must be inside its dedicated .test-runs directory');
  }
  for (let current = dbPath; current !== PROJECT_ROOT; current = path.dirname(current)) {
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) {
      throw new Error('Test paths must not contain symbolic links or hard-linked files');
    }
  }
}

export function resolveRuntimeConfig(env = process.env) {
  const isTest = env.NODE_ENV === 'test';
  const port = Number(env.PORT ?? (isTest ? 0 : 3001));
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535');
  }
  const seedValue = env.MATCHSPORT_SEED_DEMO ?? 'false';
  if (!['true', 'false'].includes(seedValue)) {
    throw new Error('MATCHSPORT_SEED_DEMO must be true or false');
  }
  if (env.NODE_ENV === 'production' && seedValue === 'true') {
    throw new Error('Demo seeding is not allowed in production');
  }
  const dbPath = path.resolve(PROJECT_ROOT, env.MATCHSPORT_DB_PATH || 'matchsport.db');
  let logDir = path.join(PROJECT_ROOT, 'logs');
  if (isTest) {
    if (!env.MATCHSPORT_TEST_DIR || !env.MATCHSPORT_DB_PATH) {
      throw new Error('Tests require MATCHSPORT_TEST_DIR and MATCHSPORT_DB_PATH');
    }
    const testDir = path.resolve(PROJECT_ROOT, env.MATCHSPORT_TEST_DIR);
    checkTestPath(testDir, dbPath);
    logDir = path.join(testDir, 'logs');
    checkTestPath(testDir, logDir);
  }
  return {
    isTest,
    port,
    host: isTest ? '127.0.0.1' : (env.HOST || '0.0.0.0'),
    dbPath,
    logDir,
    seedDemo: seedValue === 'true',
  };
}

export const runtimeConfig = resolveRuntimeConfig();
