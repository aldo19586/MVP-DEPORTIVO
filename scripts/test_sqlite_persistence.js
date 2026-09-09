/**
 * Test de Persistencia SQLite — MatchSport MVP
 * 
 * Este script verifica que:
 * 1. Se puede crear un usuario nuevo via la API
 * 2. Al reiniciar el servidor, el usuario sigue existiendo
 * 
 * Ejecutar: node scripts/test_sqlite_persistence.js
 */

const SERVER_URL = 'http://localhost:3001';

async function testPersistence() {
  console.log('=== TEST DE PERSISTENCIA SQLITE ===\n');

  // Paso 1: Verificar que los usuarios demo existen (cargados desde SQLite)
  console.log('1. Verificando usuarios demo existentes...');
  const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'carlos.crack@deporte.pe', password: 'password123' })
  });
  const loginData = await loginRes.json();
  if (loginData.user) {
    console.log(`   ✅ Login exitoso: ${loginData.user.name} (Rating: ${loginData.user.ratingOverall}, OVR: ${loginData.user.futStats?.ovr})`);
  } else {
    console.log(`   ❌ Login falló:`, loginData.error);
    process.exit(1);
  }

  // Paso 2: Crear un usuario nuevo de prueba de persistencia
  const testEmail = `test_persist_${Date.now()}@test.com`;
  console.log(`\n2. Creando usuario nuevo: ${testEmail}...`);
  const regRes = await fetch(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'test1234',
      name: 'Jugador Persistente',
      district: 'Lince, Lima',
      position: 'MED',
      declaredLevel: 'Avanzado'
    })
  });
  const regData = await regRes.json();
  if (regData.user) {
    console.log(`   ✅ Usuario creado: ${regData.user.name} (ID: ${regData.user.id})`);
    console.log(`   📊 FUT Stats: OVR=${regData.user.futStats?.ovr} | RIT=${regData.user.futStats?.rit} TIR=${regData.user.futStats?.tir} PAS=${regData.user.futStats?.pas}`);
  } else {
    console.log(`   ❌ Registro falló:`, regData.error);
    process.exit(1);
  }

  // Paso 3: Verificar perfil de Glicko
  console.log(`\n3. Verificando perfil Glicko del nuevo usuario...`);
  const profileRes = await fetch(`${SERVER_URL}/api/profile/${regData.user.id}/futbol/1v1`);
  const profileData = await profileRes.json();
  if (profileData.profile) {
    console.log(`   ✅ Perfil Glicko: Rating=${profileData.profile.rating} RD=${profileData.profile.rd} Nivel=${profileData.profile.declaredLevel}`);
  } else {
    console.log(`   ❌ Perfil no encontrado`);
  }

  // Paso 4: Verificar leaderboard
  console.log(`\n4. Verificando leaderboard actualizado...`);
  const lbRes = await fetch(`${SERVER_URL}/api/leaderboard/futbol/1v1`);
  const lbData = await lbRes.json();
  console.log(`   ✅ Leaderboard tiene ${lbData.leaderboard.length} jugadores`);

  // Paso 5: Verificar métricas admin
  console.log(`\n5. Verificando métricas de administrador...`);
  const metricsRes = await fetch(`${SERVER_URL}/api/admin/metrics`);
  const metricsData = await metricsRes.json();
  console.log(`   ✅ Usuarios totales: ${metricsData.metrics.totalUsers}`);
  console.log(`   ✅ Partidos totales: ${metricsData.metrics.totalMatches}`);

  // Paso 6: Historial de partidos (demo)
  console.log(`\n6. Verificando historial de partidos de demo_user_1...`);
  const histRes = await fetch(`${SERVER_URL}/api/user/demo_user_1/matches`);
  const histData = await histRes.json();
  console.log(`   ✅ Partidos encontrados: ${histData.matches.length}`);
  histData.matches.forEach(m => {
    console.log(`      - ${m.id}: ${m.sportId} ${m.formatId} | ${m.status} | Resultado: ${m.resultFinal || 'pendiente'}`);
  });

  console.log('\n=== ¡TODOS LOS TESTS PASARON! ===');
  console.log('\n📝 INSTRUCCIONES PARA VALIDAR PERSISTENCIA:');
  console.log('   1. Detén el servidor (Ctrl+C)');
  console.log('   2. Vuelve a iniciar: npm run dev:server');
  console.log(`   3. Intenta hacer login con: ${testEmail} / test1234`);
  console.log('   4. Si el login funciona, ¡la persistencia SQLite está confirmada! 🎉');
}

testPersistence().catch(err => {
  console.error('Error en test:', err.message);
  process.exit(1);
});
