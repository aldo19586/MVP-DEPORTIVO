import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isPasswordHash(value) {
  return typeof value === 'string' && BCRYPT_HASH.test(value);
}

export function hashPassword(value) {
  if (typeof value !== 'string' || value.length === 0 || Buffer.byteLength(value) > 72) {
    throw new Error('La contraseña debe tener entre 1 y 72 bytes');
  }
  return bcrypt.hashSync(value, 10);
}

// Legacy plaintext is accepted only to migrate existing accounts after verification.
export function matchesPassword(input, stored) {
  if (typeof input !== 'string' || !input || Buffer.byteLength(input) > 72 || typeof stored !== 'string' || !stored) return false;
  if (isPasswordHash(stored)) return bcrypt.compareSync(input, stored);
  const a = Buffer.from(input);
  const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
