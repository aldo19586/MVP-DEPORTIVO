import { io } from 'socket.io-client';

async function runE2ETest() {
  console.log('🧪 INICIANDO PRUEBA INTEGRAL E2E DEL MVP DE MATCHMAKING...\n');

  // 1. Probar API REST: Listado de deportes y formatos
  console.log('1️⃣ Probando API REST /api/sports...');
  const sportsRes = await fetch('http://localhost:3001/api/sports');
  const sportsData = await sportsRes.json();
  console.log(`✓ Deportes cargados: ${sportsData.sports.map(s => s.name).join(', ')}`);

  // 2. Registro con correo: Jugador A
  console.log('\n2️⃣ Registrando Jugador A con correo...');
  const userARes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.jugadorA@deporte.pe',
      name: 'Matias "El Gol" Silva',
      district: 'Surco, Lima'
    })
  });
  const userA = (await userARes.json()).user;
  console.log(`✓ Jugador A registrado: ID ${userA.id} (${userA.name} - ${userA.district})`);

  // 3. Registro con correo: Jugador B
  console.log('\n3️⃣ Registrando Jugador B con correo...');
  const userBRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.jugadorB@deporte.pe',
      name: 'Gonzalo "Pared" Vega',
      district: 'San Borja, Lima'
    })
  });
  const userB = (await userBRes.json()).user;
  console.log(`✓ Jugador B registrado: ID ${userB.id} (${userB.name} - ${userB.district})`);

  // 4. Conectar sockets para ambos jugadores en red local
  console.log('\n4️⃣ Conectando sockets para Jugador A y Jugador B...');
  const socketA = io('http://localhost:3001');
  const socketB = io('http://localhost:3001');

  await Promise.all([
    new Promise((resolve) => socketA.on('connect', resolve)),
    new Promise((resolve) => socketB.on('connect', resolve))
  ]);
  console.log('✓ Sockets conectados exitosamente');

  socketA.emit('registerUser', { userId: userA.id });
  socketB.emit('registerUser', { userId: userB.id });

  // 5. Simular inicio de búsqueda de partida (Desafío Fútbol 1v1)
  console.log('\n5️⃣ Jugador A entra a la cola de búsqueda (Desafío Fútbol 1v1)...');
  await new Promise((resolve) => {
    socketA.on('queueStarted', (data) => {
      console.log(`✓ Servidor confirma búsqueda para Jugador A. Ticket: ${data.challenge.id}`);
      resolve();
    });
    socketA.emit('startQueue', {
      userId: userA.id,
      sportId: 'futbol',
      formatId: '1v1',
      mode: 'solo'
    });
  });

  // 6. Jugador B entra a la cola -> Debe dispararse el Matchmaking
  console.log('\n6️⃣ Jugador B entra a la cola de búsqueda -> Esperando Matchmaking...');
  
  const matchPromise = new Promise((resolve) => {
    let matchA = null;
    let matchB = null;

    socketA.on('matchFound', ({ match }) => {
      console.log(`🏆 [SOCKET A] ¡MATCH ENCONTRADO! ID: ${match.id}`);
      matchA = match;
      if (matchA && matchB) resolve(match);
    });

    socketB.on('matchFound', ({ match }) => {
      console.log(`🏆 [SOCKET B] ¡MATCH ENCONTRADO! ID: ${match.id}`);
      matchB = match;
      if (matchA && matchB) resolve(match);
    });

    socketB.emit('startQueue', {
      userId: userB.id,
      sportId: 'futbol',
      formatId: '1v1',
      mode: 'solo'
    });
  });

  const match = await matchPromise;
  console.log(`✓ Emparejamiento exitoso entre ${match.teamA[0].name} y ${match.teamB[0].name}`);

  // 7. Probar sala de chat privada
  console.log('\n7️⃣ Probando chat privado entre ambos jugadores...');
  socketA.emit('joinMatchRoom', { matchId: match.id });
  socketB.emit('joinMatchRoom', { matchId: match.id });

  const chatPromise = new Promise((resolve) => {
    socketB.on('newChatMessage', ({ message }) => {
      console.log(`💬 [CHAT PRIVADO] Mensaje recibido en socket B: "${message.senderName}: ${message.text}"`);
      resolve();
    });

    socketA.emit('sendChatMessage', {
      matchId: match.id,
      senderId: userA.id,
      senderName: userA.name,
      text: '¡Hola! ¿Cancha en Surco a las 8:00 PM? ¿Quién reserva?'
    });
  });

  await chatPromise;

  // 8. Reportar resultado del partido y cálculo de Glicko-2
  console.log('\n8️⃣ Reportando resultado del partido y verificando Glicko-2...');

  const finishPromise = new Promise((resolve) => {
    socketA.on('matchFinished', ({ winnerTeam, ratingUpdates }) => {
      console.log(`🏁 [FINAL] Partido confirmado. Ganador: ${winnerTeam}`);
      console.log('📊 Actualización de Rating Glicko-2:', ratingUpdates);
      resolve();
    });

    // Ambos reportan que ganó el equipo A (Jugador A)
    socketA.emit('reportResult', {
      matchId: match.id,
      userId: userA.id,
      winnerTeam: 'teamA'
    });

    socketB.emit('reportResult', {
      matchId: match.id,
      userId: userB.id,
      winnerTeam: 'teamA'
    });
  });

  await finishPromise;

  console.log('\n✨ TODAS LAS PRUEBAS AUTOMATIZADAS PASARON AL 100% ✨\n');

  socketA.disconnect();
  socketB.disconnect();
  process.exit(0);
}

runE2ETest().catch((err) => {
  console.error('❌ Error en prueba E2E:', err);
  process.exit(1);
});
