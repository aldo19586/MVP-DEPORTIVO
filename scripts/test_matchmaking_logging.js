/**
 * Test de Verificación de Logging de Matchmaking (Fase 5)
 * Verifica que winston escriba en logs/matchmaking.log con formato detallado.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db.js';
import { MatchmakingEngine } from '../server/matchmakingEngine.js';
import { logger } from '../server/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.resolve(__dirname, '../logs/matchmaking.log');

async function runTests() {
  console.log('🧪 Iniciando verificación de logging de matchmaking...');

  // 1. Inicializar DB SQLite
  await db.initAsync();
  console.log('✅ Base de datos inicializada');

  // Asegurar que el log exista o pueda escribirse
  logger.info('[TEST] Inicio de prueba de logging de matchmaking');

  // Mock de Socket.IO para simular eventos sin levantar servidor HTTP
  const mockIo = {
    to: () => ({
      emit: () => {}
    }),
    sockets: {
      sockets: new Map()
    }
  };

  const engine = new MatchmakingEngine(mockIo);

  // 2. Probar simulación 1v1 con dos jugadores compatibles
  // Obtener dos jugadores de la base de datos
  const users = Array.from(db.users.values());
  if (users.length < 2) {
    throw new Error('Se requieren al menos 2 usuarios en la BD para probar');
  }

  const p1 = users[0];
  const p2 = users[1];

  console.log(`👤 Jugador 1: ${p1.name} (${p1.id})`);
  console.log(`👤 Jugador 2: ${p2.name} (${p2.id})`);

  // Limpiar colas previas
  db.challenges = [];

  // Crear tickets incompatibles para verificar log de [NO EMPAREJADO]
  const ticketIncomp1 = {
    id: 'test_ticket_inc1',
    userId: p1.id,
    sportId: 'tenis',
    formatId: 'singles',
    mode: 'casual',
    lat: -12.000,
    lng: -77.000,
    radiusKm: 2, // Radio muy pequeño
    socketId: 'mock_inc_1',
    createdAt: Date.now()
  };

  const ticketIncomp2 = {
    id: 'test_ticket_inc2',
    userId: p2.id,
    sportId: 'tenis',
    formatId: 'singles',
    mode: 'casual',
    lat: -12.150, // Distancia > 15km
    lng: -77.000,
    radiusKm: 2,
    socketId: 'mock_inc_2',
    createdAt: Date.now()
  };

  db.addChallenge(ticketIncomp1);
  db.addChallenge(ticketIncomp2);
  engine.processQueue();
  db.challenges = [];

  // Crear tickets compatibles (fútbol 1v1)
  const ticket1 = {
    id: 'test_ticket_1',
    userId: p1.id,
    sportId: 'futbol',
    formatId: '1v1',
    mode: 'casual',
    lat: p1.lat || -12.122,
    lng: p1.lng || -77.031,
    radiusKm: 15,
    socketId: 'mock_sock_1',
    createdAt: Date.now() - 10000 // 10s de espera para forzar tolerancia expandida
  };

  const ticket2 = {
    id: 'test_ticket_2',
    userId: p2.id,
    sportId: 'futbol',
    formatId: '1v1',
    mode: 'casual',
    lat: p2.lat || -12.125,
    lng: p2.lng || -77.030,
    radiusKm: 15,
    socketId: 'mock_sock_2',
    createdAt: Date.now()
  };

  db.addChallenge(ticket1);
  db.addChallenge(ticket2);

  console.log('⚙️ Procesando cola de matchmaking...');
  engine.processQueue();

  // 3. Probar Match Demo Forzado (Bot)
  console.log('🤖 Probando forceDemoMatch con bots...');
  const pendingDemo = engine.forceDemoMatch(p1.id, 'futbol', '1v1', 'mock_sock_demo');

  // 4. Probar Aceptación y Cancelación
  if (pendingDemo) {
    console.log('⏱️ Probando aceptación de jugador...');
    engine.handlePlayerAccept(pendingDemo.pendingMatchId, p1.id);
    console.log('❌ Probando cancelación de match pendiente...');
    engine.cancelPendingMatch(pendingDemo.pendingMatchId, 'declined', p1.id);
  }

  // Dar breve tiempo a winston para escribir en disco
  await new Promise(r => setTimeout(r, 800));

  // 5. Verificar contenido del archivo de logs
  if (!fs.existsSync(logFilePath)) {
    throw new Error(`El archivo de logs ${logFilePath} no fue creado.`);
  }

  const logContent = fs.readFileSync(logFilePath, 'utf8');
  console.log('\n📄 Contenido reciente de logs/matchmaking.log:');
  console.log(logContent.split('\n').slice(-15).join('\n'));

  // Aserciones sobre las marcas esperadas
  const requiredTags = [
    '[EVALUANDO 1v1]',
    '[NO EMPAREJADO]',
    '[EMPAREJADO]',
    '[BOT USADO]',
    '[CONFIRMACIÓN INICIADA]'
  ];

  for (const tag of requiredTags) {
    if (!logContent.includes(tag)) {
      throw new Error(`Falta el tag esperado "${tag}" en logs/matchmaking.log`);
    }
  }

  console.log('\n✅ ¡TODOS LOS TESTS DE LOGGING PASARON EXITOSAMENTE!');
}

runTests().catch(err => {
  console.error('❌ Error en test de logging:', err);
  process.exit(1);
});
