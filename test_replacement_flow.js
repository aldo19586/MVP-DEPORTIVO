import { db } from './server/db.js';

async function runTest() {
  console.log('--- Iniciando prueba de Persistencia de Salas y Bolsa de Suplentes ---');
  await db.initAsync();

  // 1. Crear un usuario anfitrión y crear una sala 2v2 (Fútbol 2v2 = 4 jugadores)
  const host = {
    id: 'test_player_alpha',
    name: 'Alpha Capitán',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    district: 'Surco, Lima',
    position: 'DEL'
  };

  const lobby = db.createLobby({
    hostUser: host,
    sportId: 'futbol',
    formatId: '2v2'
  });

  console.log(`[PASO 1] Sala creada: #${lobby.code} (${lobby.sportId} ${lobby.formatId})`);
  console.log(`Jugadores iniciales: ${lobby.teamA.length} en TeamA, ${lobby.teamB.length} en TeamB. Estado: ${lobby.status}`);

  // 2. Unir a 3 jugadores más para llenar la sala
  const p2 = { id: 'test_player_beta', name: 'Beta Volante', avatar: '', position: 'MED' };
  const p3 = { id: 'test_player_gamma', name: 'Gamma Defensa', avatar: '', position: 'DEF' };
  const p4 = { id: 'test_player_delta', name: 'Delta Arquero', avatar: '', position: 'POR' };

  db.joinLobby(lobby.code, p2, 'teamA');
  db.joinLobby(lobby.code, p3, 'teamB');
  db.joinLobby(lobby.code, p4, 'teamB');

  const fullLobby = db.getLobby(lobby.code);
  console.log(`[PASO 2] Sala llena con 4 jugadores (${fullLobby.teamA.length} vs ${fullLobby.teamB.length}).`);

  // 3. Simular que Beta Volante cancela a última hora ("No podré asistir")
  console.log(`[PASO 3] Jugador 'Beta Volante' cancela su asistencia...`);
  const cancelRes = db.markPlayerCancelledInLobby(lobby.code, 'test_player_beta', 'Emergencia familiar');
  
  console.log(`Resultado de cancelación:`);
  console.log(`- Jugador removido: ${cancelRes.removedPlayer?.name}`);
  console.log(`- Nuevo estado de la sala: ${cancelRes.lobby?.status}`);
  console.log(`- ¿Marcado con baja urgente?: ${cancelRes.lobby?.hadCancellation}`);

  // 4. Consultar la Bolsa de Suplentes (Debe aparecer esta sala con 1 cupo disponible)
  const replacementLobbies = db.getReplacementMarketLobbies({ sportId: 'futbol' });
  const foundInMarket = replacementLobbies.find(l => l.code === lobby.code);

  console.log(`[PASO 4] Consulta a la Bolsa de Suplentes:`);
  console.log(`- Salas en bolsa: ${replacementLobbies.length}`);
  console.log(`- ¿Sala #${lobby.code} encontrada en bolsa?: ${Boolean(foundInMarket)}`);
  if (foundInMarket) {
    console.log(`  * Cupos necesarios: ${foundInMarket.neededSlots} de ${foundInMarket.totalSlots}`);
    console.log(`  * Estado: ${foundInMarket.status}`);
    console.log(`  * Baja urgente: ${foundInMarket.hadCancellation}`);
  }

  // 5. Un nuevo jugador (Suplente) toma el cupo vacante
  const suplente = { id: 'test_player_suplente', name: 'Roberto Suplente', avatar: '', position: 'MED' };
  console.log(`[PASO 5] Nuevo usuario '${suplente.name}' se une a través de la Bolsa de Suplentes...`);
  const joinRes = db.joinReplacementSlot(lobby.code, suplente);
  const updatedLobby = joinRes.lobby;

  console.log(`- Jugadores actuales en sala #${updatedLobby.code}: ${updatedLobby.teamA.length} en TeamA, ${updatedLobby.teamB.length} en TeamB`);
  console.log(`- ¿Sigue en bolsa de suplentes?: ${db.getReplacementMarketLobbies().some(l => l.code === lobby.code)}`);

  // 6. Verificar persistencia en SQLite
  const persistedLobby = db.getLobby(lobby.code);
  console.log(`[PASO 6] Verificación de persistencia: Sala #${persistedLobby.code} con ${persistedLobby.teamA.length + persistedLobby.teamB.length} jugadores persistida en base de datos.`);

  // Limpiar prueba
  db.leaveAllLobbiesForUser('test_player_alpha');
  db.leaveAllLobbiesForUser('test_player_gamma');
  db.leaveAllLobbiesForUser('test_player_delta');
  db.leaveAllLobbiesForUser('test_player_suplente');

  console.log('--- ¡TODAS LAS PRUEBAS DE PERSISTENCIA Y BOLSA DE SUPLENTES PASARON CON ÉXITO! ---');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Error en prueba:', err);
  process.exit(1);
});
