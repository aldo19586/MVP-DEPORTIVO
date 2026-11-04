import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

export function canonicalDatabasePath(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let stat;
  try { stat = fs.lstatSync(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (stat) {
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Database must be a regular, unlinked file');
  }
  return path.join(fs.realpathSync(path.dirname(file)), path.basename(file));
}

export function acquireDatabaseLock(file) {
  const target = canonicalDatabasePath(file);
  const lockPath = `${target}.lock`;
  const owner = { pid: process.pid, hostname: os.hostname(), nonce: randomUUID() };
  let descriptor;
  try { descriptor = fs.openSync(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Database locked: stop the writer or use the operator unlock command after a crash');
    throw error;
  }
  try { fs.writeFileSync(descriptor, JSON.stringify(owner)); fs.fsyncSync(descriptor); }
  catch (error) { fs.closeSync(descriptor); fs.unlinkSync(lockPath); throw error; }
  fs.closeSync(descriptor);
  let released = false;
  return () => {
    if (released) return;
    const current = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (current.nonce !== owner.nonce) throw new Error('Database lock owner changed');
    fs.unlinkSync(lockPath);
    released = true;
  };
}

export function unlockAbandonedDatabase(file) {
  const lockPath = `${canonicalDatabasePath(file)}.lock`;
  const stat = fs.lstatSync(lockPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Invalid lock file');
  const owner = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  if (owner.hostname !== os.hostname() || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new Error('Cannot establish lock ownership');
  try { process.kill(owner.pid, 0); }
  catch (error) {
    if (error.code !== 'ESRCH') throw new Error('Cannot verify whether writer is stopped');
    fs.unlinkSync(lockPath);
    return;
  }
  throw new Error('Writer is still alive; refusing to unlock');
}

// Temp and destination share a directory/volume. Never truncate the last snapshot.
export function atomicWrite(file, bytes, io = fs) {
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  let descriptor;
  try {
    descriptor = io.openSync(temporary, 'wx', 0o600);
    io.writeFileSync(descriptor, bytes);
    io.fsyncSync(descriptor);
    io.closeSync(descriptor); descriptor = undefined;
    io.renameSync(temporary, file);
    if (process.platform !== 'win32') {
      const directory = io.openSync(path.dirname(file), 'r');
      try { io.fsyncSync(directory); } finally { io.closeSync(directory); }
    }
  } finally {
    if (descriptor !== undefined) io.closeSync(descriptor);
    if (io.existsSync(temporary)) io.unlinkSync(temporary);
  }
}
