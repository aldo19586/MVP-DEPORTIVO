// Operator-only command. Credentials arrive over stdin, never CLI arguments/logs.
import { db } from './db.js';
import { forceSave } from './database.js';
import { resolveJwtSecret } from './auth.js';

try {
  if (!process.env.MATCHSPORT_DB_PATH || process.env.MATCHSPORT_SEED_DEMO === 'true') {
    throw new Error('Indica MATCHSPORT_DB_PATH y desactiva la semilla demo antes de crear un administrador');
  }
  resolveJwtSecret();
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 4096) throw new Error('Entrada demasiado grande');
  }
  const { email, name, password } = JSON.parse(input);
  if (typeof email !== 'string' || !email.includes('@') || typeof name !== 'string' || !name.trim()) {
    throw new Error('Correo y nombre válidos son requeridos');
  }
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('La contraseña administrativa requiere al menos 12 caracteres y como máximo 72 bytes');
  }
  await db.initAsync();
  if (db.getUserByEmail(email.trim())) throw new Error('La cuenta ya existe; no se elevan roles existentes mediante este comando');
  const user = db.createUser({ email: email.trim(), name: name.trim(), password });
  user.role = 'admin';
  db._persistUser(user);
  forceSave();
  console.log('Administrador creado. No se imprimen credenciales.');
  process.exit(0);
} catch (error) {
  console.error(error instanceof SyntaxError ? 'Se requiere un objeto JSON válido por stdin' : error.message);
  process.exit(1);
}
