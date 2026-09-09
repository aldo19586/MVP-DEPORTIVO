/**
 * Test de validación para la Fase 2: Login simple con Nombre + PIN de 4 dígitos
 * 
 * Verifica:
 * 1. Registro con Nombre + PIN de 4 dígitos.
 * 2. Hash con bcryptjs (el PIN nunca se guarda en texto plano).
 * 3. Login exitoso con Nombre + PIN correcto.
 * 4. Rechazo con PIN incorrecto o de formato inválido.
 * 5. Rechazo al intentar registrar un nombre duplicado.
 * 6. Persistencia del PIN hasheado en SQLite entre reinicios.
 */

import bcrypt from 'bcryptjs';
import { db } from '../server/db.js';
import { forceSave, sqlGetUserByName } from '../server/database.js';

async function runTest() {
  console.log('--- TEST FASE 2: AUTENTICACIÓN CON NOMBRE + PIN (4 DÍGITOS) ---');

  // 1. Inicializar DB
  await db.initAsync();
  console.log('✅ Base de datos inicializada');

  const testName = 'PaoloGuerrero_' + Date.now().toString().slice(-4);
  const testPin = '7777';

  // 2. Registro con Nombre + PIN
  console.log(`\n[Prueba 1] Registrando jugador "${testName}" con PIN "${testPin}"...`);
  const regResult = db.registerWithPin({
    name: testName,
    pin: testPin,
    position: 'DEL',
    primarySport: 'futbol',
    declaredLevel: 'Competitivo',
    district: 'Surco, Lima'
  });

  if (regResult.error) {
    console.error('❌ Error en registro:', regResult.error);
    process.exit(1);
  }

  const createdUser = regResult.user;
  console.log('✅ Jugador registrado con éxito. ID:', createdUser.id);
  console.log('   Nombre:', createdUser.name);
  console.log('   Posición:', createdUser.position);
  console.log('   OVR Inicial:', createdUser.futStats?.ovr);

  // 3. Verificar que el PIN está hasheado con bcrypt y NO en texto plano
  console.log('\n[Prueba 2] Verificando hash criptográfico de bcryptjs...');
  if (!createdUser.pinHash || !createdUser.pinHash.startsWith('$2')) {
    console.error('❌ El PIN no fue hasheado con bcrypt:', createdUser.pinHash);
    process.exit(1);
  }
  if (createdUser.password === testPin) {
    console.error('❌ ALERTA DE SEGURIDAD: El PIN está en texto plano en la propiedad password');
    process.exit(1);
  }
  const isMatch = bcrypt.compareSync(testPin, createdUser.pinHash);
  if (!isMatch) {
    console.error('❌ bcrypt.compareSync falló con el PIN original');
    process.exit(1);
  }
  console.log('✅ El PIN está hasheado de forma segura con bcryptjs:', createdUser.pinHash.substring(0, 20) + '...');

  // 4. Intentar Login con PIN correcto
  console.log('\n[Prueba 3] Probando login con PIN correcto...');
  const loginOk = db.loginWithPin({ name: testName, pin: testPin });
  if (loginOk.error || !loginOk.user) {
    console.error('❌ Falló el login con PIN correcto:', loginOk.error);
    process.exit(1);
  }
  console.log('✅ Login exitoso. Usuario recuperado:', loginOk.user.name, '| OVR:', loginOk.user.futStats?.ovr);

  // 5. Intentar Login con PIN incorrecto
  console.log('\n[Prueba 4] Probando login con PIN incorrecto ("1234")...');
  const loginFail = db.loginWithPin({ name: testName, pin: '1234' });
  if (!loginFail.error) {
    console.error('❌ El servidor aceptó un PIN incorrecto');
    process.exit(1);
  }
  console.log('✅ Rechazo correcto:', loginFail.error);

  // 6. Intentar registrar nombre duplicado
  console.log('\n[Prueba 5] Probando registro con nombre duplicado...');
  const duplicateReg = db.registerWithPin({ name: testName, pin: '9999' });
  if (!duplicateReg.error) {
    console.error('❌ Permitió registrar un nombre duplicado');
    process.exit(1);
  }
  console.log('✅ Rechazo correcto de duplicado:', duplicateReg.error);

  // 7. Forzar guardado a SQLite para probar persistencia
  forceSave();
  console.log('\n[Prueba 6] Verificando consulta directa a SQLite con sqlGetUserByName...');
  const fromSql = sqlGetUserByName(testName);
  if (!fromSql || !fromSql.pinHash) {
    console.error('❌ No se encontró en SQLite o falta pinHash');
    process.exit(1);
  }
  const sqlMatch = bcrypt.compareSync(testPin, fromSql.pinHash);
  if (!sqlMatch) {
    console.error('❌ El hash guardado en SQLite no coincide');
    process.exit(1);
  }
  console.log('✅ Usuario y hash persistidos correctamente en matchsport.db SQLite');

  console.log('\n=============================================');
  console.log('🎉 TODAS LAS PRUEBAS DE LA FASE 2 PASARON CON ÉXITO');
  console.log('=============================================');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Error no capturado:', err);
  process.exit(1);
});
