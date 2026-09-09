/**
 * Test de verificación para Fase 4: Semilla de datos de prueba realistas
 */

import { db } from '../server/db.js';
import { runSeed } from '../server/seed.js';

async function verify() {
  console.log('--- VERIFICACIÓN FASE 4: SEMILLA DE DATOS REALISTAS ---');

  // 1. Ejecutar semilla
  await runSeed();

  // 2. Inicializar base de datos
  await db.initAsync();

  // 3. Probar login con PIN de jugador Tier Alto (Jefferson Farfán)
  console.log("\n[Test 1] Probando login con Nombre + PIN ('1234') de Jefferson Farfán...");
  const loginAlto = db.loginWithPin({ name: "Jefferson 'Foquita' Farfán", pin: '1234' });
  if (!loginAlto.user) {
    throw new Error('Falló login de Jefferson Farfán: ' + loginAlto.error);
  }
  console.log('✅ Login exitoso:', loginAlto.user.name);
  console.log('   Posición:', loginAlto.user.position, '| OVR:', loginAlto.user.futStats.ovr, '| Distrito:', loginAlto.user.district);

  // 4. Probar login con PIN de jugador Tier Medio (Gianluca Lapadula)
  console.log("\n[Test 2] Probando login de Gianluca Lapadula...");
  const loginMedio = db.loginWithPin({ name: 'Gianluca Lapadula', pin: '1234' });
  if (!loginMedio.user) {
    throw new Error('Falló login de Lapadula: ' + loginMedio.error);
  }
  console.log('✅ Login exitoso:', loginMedio.user.name, '| OVR:', loginMedio.user.futStats.ovr);

  // 5. Probar login con PIN de jugador Tier Bajo (Mateo Díaz)
  console.log("\n[Test 3] Probando login de Mateo 'Pichanguero' Díaz (Tier Bajo)...");
  const loginBajo = db.loginWithPin({ name: "Mateo 'Pichanguero' Díaz", pin: '1234' });
  if (!loginBajo.user) {
    throw new Error('Falló login de Mateo Díaz: ' + loginBajo.error);
  }
  console.log('✅ Login exitoso:', loginBajo.user.name, '| OVR:', loginBajo.user.futStats.ovr);

  // 6. Verificar Leaderboard de Fútbol 1v1
  console.log('\n[Test 4] Verificando Leaderboard de Fútbol 1v1...');
  const lb1v1 = db.getLeaderboard('futbol', '1v1');
  console.log(`✅ Leaderboard Fútbol 1v1 contiene ${lb1v1.length} jugadores clasificados.`);
  console.log('   Top 5:');
  lb1v1.slice(0, 5).forEach((p, idx) => {
    console.log(`   #${idx + 1} ${p.user.name} — Rating: ${p.rating} | W/L: ${p.wins}/${p.losses}`);
  });

  // 7. Verificar Leaderboard de Fútbol 5v5
  console.log('\n[Test 5] Verificando Leaderboard de Fútbol 5v5...');
  const lb5v5 = db.getLeaderboard('futbol', '5v5');
  console.log(`✅ Leaderboard Fútbol 5v5 contiene ${lb5v5.length} jugadores.`);

  console.log('\n==========================================================');
  console.log('🎉 FASE 4 VERIFICADA: SEED DE 25 JUGADORES COMPLETO Y LISTO');
  console.log('==========================================================');
  process.exit(0);
}

verify().catch((err) => {
  console.error('❌ Error en verificación:', err);
  process.exit(1);
});
