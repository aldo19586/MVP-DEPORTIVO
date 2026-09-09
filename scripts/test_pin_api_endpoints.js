/**
 * Test de validación de endpoints HTTP para Fase 2:
 * - POST /api/auth/pin-register
 * - POST /api/auth/pin-login
 * - GET /api/user/:userId
 * - GET /api/auth/check-name/:name
 */

import { spawn } from 'child_process';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- TEST DE ENDPOINTS HTTP (FASE 2) ---');

  // Iniciar servidor
  const server = spawn('node', ['server/server.js'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  server.stdout.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('corriendo en') || msg.includes('Inicialización completa')) {
      // console.log('[Server]:', msg.trim());
    }
  });

  server.stderr.on('data', (d) => {
    console.error('[Server Err]:', d.toString());
  });

  // Esperar a que el servidor levante
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:3001/api/sports');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (e) {
      await wait(300);
    }
  }

  if (!ready) {
    console.error('❌ El servidor no inició a tiempo');
    server.kill();
    process.exit(1);
  }

  console.log('✅ Servidor HTTP levantado en puerto 3001');

  try {
    const uniqueName = 'Chorri_Palacios_' + Date.now().toString().slice(-4);
    const pin = '1010';

    // 1. Check-name antes de registrar
    console.log(`\n[Prueba HTTP 1] GET /api/auth/check-name/${uniqueName}...`);
    const checkRes1 = await fetch(`http://localhost:3001/api/auth/check-name/${encodeURIComponent(uniqueName)}`);
    const checkData1 = await checkRes1.json();
    console.log('   Resultado:', checkData1);
    if (checkData1.exists !== false) throw new Error('El nombre no debería existir aún');

    // 2. Registro con PIN
    console.log(`\n[Prueba HTTP 2] POST /api/auth/pin-register (${uniqueName}, PIN ${pin})...`);
    const regRes = await fetch('http://localhost:3001/api/auth/pin-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: uniqueName,
        pin: pin,
        position: 'MED',
        primarySport: 'futbol',
        declaredLevel: 'Avanzado',
        district: 'Chorrillos, Lima'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok || !regData.user) {
      throw new Error('Error al registrar: ' + JSON.stringify(regData));
    }
    console.log('✅ Registro exitoso HTTP. Usuario:', regData.user.name, '| ID:', regData.user.id);
    const userId = regData.user.id;

    // 3. Login con PIN correcto
    console.log(`\n[Prueba HTTP 3] POST /api/auth/pin-login con PIN correcto (${pin})...`);
    const loginOkRes = await fetch('http://localhost:3001/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uniqueName, pin: pin })
    });
    const loginOkData = await loginOkRes.json();
    if (!loginOkRes.ok || !loginOkData.user) {
      throw new Error('Error en login con PIN correcto: ' + JSON.stringify(loginOkData));
    }
    console.log('✅ Login exitoso HTTP. Carta FUT recuperada con OVR:', loginOkData.user.futStats?.ovr);

    // 4. Login con PIN incorrecto
    console.log('\n[Prueba HTTP 4] POST /api/auth/pin-login con PIN erróneo ("0000")...');
    const loginFailRes = await fetch('http://localhost:3001/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: uniqueName, pin: '0000' })
    });
    const loginFailData = await loginFailRes.json();
    if (loginFailRes.status !== 401) {
      throw new Error('Debería retornar 401 en PIN erróneo. Retornó: ' + loginFailRes.status);
    }
    console.log('✅ Rechazo 401 correcto:', loginFailData.error);

    // 5. GET /api/user/:userId
    console.log(`\n[Prueba HTTP 5] GET /api/user/${userId}...`);
    const userRes = await fetch(`http://localhost:3001/api/user/${userId}`);
    const userData = await userRes.json();
    if (!userRes.ok || !userData.user) {
      throw new Error('Error consultando /api/user/:userId');
    }
    console.log('✅ Usuario recuperado vía API:', userData.user.name, '| Posición:', userData.user.position);

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS ENDPOINTS HTTP DE FASE 2 RESPONDEN PERFECTO');
    console.log('======================================================');
  } finally {
    server.kill();
  }
}

run().catch((e) => {
  console.error('❌ Error en pruebas HTTP:', e);
  process.exit(1);
});
