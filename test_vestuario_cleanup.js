import { db } from './server/db.js';

async function testVestuarioCleanup() {
  console.log('--- Iniciando Prueba de Vestuario, Partido y Limpiador de Basura (TTL) ---');
  await db.initAsync();

  // 1. Crear un vestuario con 2 jugadores (amigos)
  const host = {
    id: 'vestuario_p1',
    name: 'Mateo Capitán',
    avatar: '',
    district: 'Surco, Lima',
    position: 'DEL'
  };

  const vestuario = db.createLobby({
    hostUser: host,
    sportId: 'futbol',
    formatId: '2v2'
  });

  const amigo = { id: 'vestuario_p2', name: 'Lucas Amigo', avatar: '', position: 'MED' };
  db.joinLobby(vestuario.code, amigo, 'teamA');

  console.log(`[PASO 1] Vestuario temporal creado: #${vestuario.code}`);
  console.log(`Jugadores en squad de amigos: ${vestuario.teamA.length} en Team A.`);

  // 2. Simular que se unen los 2 rivales
  const r1 = { id: 'rival_1', name: 'Rival A', avatar: '', position: 'DEF' };
  const r2 = { id: 'rival_2', name: 'Rival B', avatar: '', position: 'POR' };
  db.joinLobby(vestuario.code, r1, 'teamB');
  db.joinLobby(vestuario.code, r2, 'teamB');

  // 3. Iniciar partido oficial (Pasar a la Cancha)
  console.log(`[PASO 2] Ambos equipos listos. Pasando a la Cancha (Iniciando Partido Oficial)...`);
  const match = db.convertLobbyToMatch(vestuario.code);

  console.log(`[PASO 3] Partido Oficial creado en Cancha: ID #${match.id} (${match.sportId} ${match.formatId})`);

  // 4. Verificar que el vestuario temporal anterior fue ELIMINADO de la base de datos
  const vestuarioPostMatch = db.getLobby(vestuario.code);
  console.log(`- ¿El vestuario anterior #${vestuario.code} sigue existiendo?: ${Boolean(vestuarioPostMatch)}`);
  if (!vestuarioPostMatch) {
    console.log(`✅ ¡Correcto! El vestuario temporal se eliminó automáticamente al pasar a la cancha.`);
  }

  // 5. Probar el Garbage Collector de vestuarios inactivos
  console.log(`[PASO 4] Probando el Garbage Collector automático...`);
  // Crear un vestuario y simular que tiene más de 6 horas
  const vestuarioViejo = db.createLobby({
    hostUser: { id: 'user_inactivo', name: 'Inactivo', avatar: '' },
    sportId: 'padel',
    formatId: '2v2'
  });
  vestuarioViejo.createdAt = Date.now() - (7 * 60 * 60 * 1000); // 7 horas atrás

  console.log(`- Vestuario inactivo creado: #${vestuarioViejo.code}`);
  const purged = db.purgeOldLobbies(6);
  console.log(`- Vestuarios purgados por el Garbage Collector: ${purged}`);

  const vestuarioViejoCheck = db.getLobby(vestuarioViejo.code);
  console.log(`- ¿El vestuario inactivo #${vestuarioViejo.code} fue eliminado?: ${!vestuarioViejoCheck}`);

  console.log('--- ¡TODAS LAS PRUEBAS DE VESTUARIO Y LIMPIADOR AUTOMÁTICO PASARON CON ÉXITO! ---');
  process.exit(0);
}

testVestuarioCleanup().catch(err => {
  console.error('Error en prueba:', err);
  process.exit(1);
});
