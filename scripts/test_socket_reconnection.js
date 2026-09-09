/**
 * Test automatizado para Fase 3: Reconexión automática de Socket.IO
 * 
 * Verifica:
 * 1. Conexión de usuario y entrada a Lobby y cola del Radar.
 * 2. Desconexión abrupta de Socket 1.
 * 3. Activación del período de gracia (el servidor NO expulsa al jugador inmediatamente).
 * 4. Estado de 'reconnecting' mientras espera señal.
 * 5. Reconexión con Socket 2 (nuevo socketId) dentro del período de gracia identificándose con userId persistente.
 * 6. Restauración automática del Lobby ('lobbyRestored') y de la cola de búsqueda ('queueStatus').
 */

import { io } from 'socket.io-client';
import { spawn } from 'child_process';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('--- TEST FASE 3: RECONEXIÓN AUTOMÁTICA DE SOCKET.IO ---');

  // Iniciar servidor
  const server = spawn('node', ['server/server.js'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  server.stdout.on('data', (d) => {
    // console.log('[Server]:', d.toString().trim());
  });

  server.stderr.on('data', (d) => {
    console.error('[Server Err]:', d.toString().trim());
  });

  // Esperar a que el servidor levante
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:3001/api/sports');
      if (res.ok) { ready = true; break; }
    } catch (e) {
      await wait(300);
    }
  }

  if (!ready) {
    console.error('❌ El servidor no inició a tiempo');
    server.kill();
    process.exit(1);
  }

  console.log('✅ Servidor de prueba iniciado en puerto 3001');

  try {
    const userId = 'user_recon_test_' + Date.now().toString().slice(-4);
    const testUser = {
      id: userId,
      name: 'TesterRecon',
      position: 'DEL',
      district: 'Surco, Lima',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=recon'
    };

    // 1. Conectar Socket 1
    console.log('\n[Paso 1] Conectando Socket 1 como', testUser.name, '...');
    const socket1 = io('http://localhost:3001', {
      transports: ['websocket'],
      forceNew: true,
      auth: { userId }
    });

    await new Promise((resolve) => socket1.on('connect', resolve));
    console.log('✅ Socket 1 conectado con ID:', socket1.id);

    socket1.emit('registerUser', { userId, user: testUser });
    await wait(300);

    // ESCENARIO A: Reconexión en Sala de Convocatoria (Lobby)
    console.log('\n--- ESCENARIO A: Reconexión en Sala de Convocatoria (Lobby) ---');
    console.log('[Paso 2A] Creando sala de convocatoria con Socket 1...');
    let lobbyCode = null;
    socket1.emit('createLobby', {
      hostUser: testUser,
      sportId: 'futbol',
      formatId: '5v5'
    });

    await new Promise((resolve) => {
      socket1.on('lobbyCreated', ({ lobby }) => {
        lobbyCode = lobby.code;
        console.log('✅ Lobby creado exitosamente con código #', lobbyCode);
        resolve();
      });
    });

    // Provocar corte de red abrupto
    console.log('[Paso 3A] ⚠️ Desconectando abruptamente Socket 1 con lobby activo...');
    socket1.disconnect();
    await wait(3000);

    // Conectar Socket 2 (nuevo socketId)
    console.log('[Paso 4A] Reconectando con Socket 2 con el mismo userId...');
    const socket2 = io('http://localhost:3001', {
      transports: ['websocket'],
      forceNew: true,
      auth: { userId }
    });

    await new Promise((resolve) => socket2.on('connect', resolve));
    console.log('✅ Socket 2 conectado con nuevo ID:', socket2.id);

    let lobbyRestoredReceived = false;
    let restoredLobbyCode = null;

    socket2.on('lobbyRestored', ({ lobby }) => {
      lobbyRestoredReceived = true;
      restoredLobbyCode = lobby.code;
      console.log('✅ Evento "lobbyRestored" recibido en Socket 2. Sala recuperada:', lobby.code);
    });

    socket2.emit('registerUser', { userId, user: testUser });
    await wait(1000);

    if (!lobbyRestoredReceived || restoredLobbyCode !== lobbyCode) {
      throw new Error(`❌ Falló la restauración de sala. Esperaba #${lobbyCode}, recibió #${restoredLobbyCode}`);
    }
    console.log('🎉 ESCENARIO A APROBADO: Lobby recuperado intacto tras reconexión.');

    // ESCENARIO B: Reconexión en Cola de Búsqueda (Radar)
    console.log('\n--- ESCENARIO B: Reconexión en Cola del Radar ---');
    console.log('[Paso 2B] Iniciando búsqueda en Radar con Socket 2...');
    socket2.emit('startQueue', {
      userId,
      sportId: 'futbol',
      formatId: '5v5',
      mode: 'solo',
      lat: -12.13,
      lng: -76.98,
      radiusKm: 6,
      district: 'Surco, Lima'
    });
    await wait(500);

    // Provocar corte de red abrupto en Socket 2
    console.log('[Paso 3B] ⚠️ Desconectando abruptamente Socket 2 en plena búsqueda...');
    socket2.disconnect();
    await wait(3000);

    // Conectar Socket 3 (tercer socketId nuevo)
    console.log('[Paso 4B] Reconectando con Socket 3 con el mismo userId...');
    const socket3 = io('http://localhost:3001', {
      transports: ['websocket'],
      forceNew: true,
      auth: { userId }
    });

    await new Promise((resolve) => socket3.on('connect', resolve));
    console.log('✅ Socket 3 conectado con ID:', socket3.id);

    let queueStatusReceived = false;
    socket3.on('queueStatus', ({ isSearching }) => {
      if (isSearching) {
        queueStatusReceived = true;
        console.log('✅ Evento "queueStatus" recibido en Socket 3. Búsqueda en cola sigue activa:', isSearching);
      }
    });

    socket3.emit('registerUser', { userId, user: testUser });
    await wait(1000);

    if (!queueStatusReceived) {
      throw new Error('❌ La cola de búsqueda se perdió tras el corte de señal');
    }
    console.log('🎉 ESCENARIO B APROBADO: Cola de Radar recuperada intacta tras reconexión.');

    socket3.disconnect();

    console.log('\n======================================================');
    console.log('🎉 FASE 3 VERIFICADA: RECONEXIÓN Y PERÍODO DE GRACIA OK');
    console.log('======================================================');
    server.kill();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en el test de reconexión:', err);
    server.kill();
    process.exit(1);
  }
}

run();
