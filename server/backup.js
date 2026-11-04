// Offline operator utility: never import db.js or run migrations on the source.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import initSqlJs from 'sql.js';
import { runtimeConfig } from './config.js';
import { acquireDatabaseLock, atomicWrite, unlockAbandonedDatabase } from './fileStore.js';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function validate(bytes) {
  if (bytes.length < 100 || !bytes.subarray(0, 16).equals(Buffer.from('SQLite format 3\0'))) throw new Error('Invalid SQLite backup');
  const SQL = await initSqlJs();
  const database = new SQL.Database(bytes);
  try {
    if (database.exec('PRAGMA quick_check')[0]?.values?.[0]?.[0] !== 'ok') throw new Error('Backup integrity check failed');
    for (const table of ['users', 'user_profiles', 'matches', 'lobbies', 'app_config']) database.exec(`SELECT count(*) FROM ${table}`);
    if (database.exec('PRAGMA user_version')[0]?.values?.[0]?.[0] >= 3) database.exec('SELECT count(*) FROM competitions');
    if (database.exec('PRAGMA user_version')[0]?.values?.[0]?.[0] >= 4) database.exec('SELECT count(*) FROM competition_matches');
    if (database.exec('PRAGMA user_version')[0]?.values?.[0]?.[0] >= 5) database.exec('SELECT count(*) FROM competition_messages');
    if (database.exec('PRAGMA user_version')[0]?.values?.[0]?.[0] > 5) throw new Error('Unsupported backup schema');
  } finally { database.close(); }
}
function testArtifact(file) {
  if (!runtimeConfig.isTest) return;
  const root = path.resolve(process.env.MATCHSPORT_TEST_DIR);
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Test artifacts must stay inside sandbox');
  for (let current = file; current !== root; current = path.dirname(current)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Linked test artifact rejected');
  }
}

let release;
try {
  if (!process.env.MATCHSPORT_DB_PATH) throw new Error('Explicit MATCHSPORT_DB_PATH is required');
  const [operation, argument, ...extra] = process.argv.slice(2);
  if (extra.length || !['backup', 'restore', 'unlock'].includes(operation)) throw new Error('Usage: backup.js backup|restore <directory> | unlock');
  if (operation === 'unlock') {
    if (argument) throw new Error('Unlock accepts no directory');
    unlockAbandonedDatabase(runtimeConfig.dbPath);
    console.log('Abandoned lock removed; validate the database before restarting');
  } else {
    if (!argument) throw new Error('Backup directory required');
    const directory = path.resolve(argument);
    testArtifact(directory);
    if (operation === 'backup' && !fs.existsSync(runtimeConfig.dbPath)) throw new Error('Source database not found');
    if (operation === 'restore' && fs.existsSync(runtimeConfig.dbPath)) throw new Error('Restore requires a new destination database');
    release = acquireDatabaseLock(runtimeConfig.dbPath);
    if (operation === 'backup') {
      const bytes = fs.readFileSync(runtimeConfig.dbPath);
      await validate(bytes);
      fs.mkdirSync(directory); // A new directory is required; previous backups are immutable.
      atomicWrite(path.join(directory, 'database.db'), bytes);
      atomicWrite(path.join(directory, 'manifest.json'), Buffer.from(JSON.stringify({ version: 1,
        sha256: sha256(bytes), size: bytes.length, createdAt: new Date().toISOString() }, null, 2)));
      console.log('Backup and checksum written; source database unchanged');
    } else {
      const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
      const bytes = fs.readFileSync(path.join(directory, 'database.db'));
      if (manifest.version !== 1 || manifest.size !== bytes.length || manifest.sha256 !== sha256(bytes)) throw new Error('Backup checksum mismatch');
      await validate(bytes);
      atomicWrite(runtimeConfig.dbPath, bytes);
      console.log('Backup restored to new destination; start a separate validation server');
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { release?.(); }
