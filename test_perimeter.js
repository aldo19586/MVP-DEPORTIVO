import { io } from 'socket.io-client';

async function runPerimeterE2ETest() {
  console.log('🗺️ INICIANDO PRUEBA DE MATCHMAKING CON PERÍMETRO EN MAPA...\n');

  // Jugador 1 en Surco
  const user1Res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'surco.player@deporte.pe',
      name: 'Diego Surco',
      district: 'Surco'
    })
  });
  const user1 = (await user1Res.json()).user;

  // Jugador 2 en San Borja (a ~3.5 km de Surco)
  const user2Res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sanborja.player@deporte.pe',
      name: 'Renzo San Borja',
      district: 'San Borja'
    })
  });
  const user2 = (await user2Res.json()).user;

  const socket1 = io('http://localhost:3001');
  const socket2 = io('http://localhost:3001');

  await Promise.all([
    new Promise(res => socket1.on('connect', res)),
    new Promise(res => socket2.on('connect', res))
  ]);

  socket1.emit('registerUser', { userId: user1.id });
  socket2.emit('registerUser', { userId: user2.id });

  console.log('1️⃣ Jugador 1 busca con perímetro en Surco (Radio 5 km)...');
  socket1.emit('startQueue', {
    userId: user1.id,
    sportId: 'futbol',
    formatId: '1v1',
    mode: 'solo',
    lat: -12.137,
    lng: -76.985,
    radiusKm: 5,
    district: 'Surco'
  });

  console.log('2️⃣ Jugador 2 busca con perímetro en San Borja (Radio 5 km)...');
  const matchPromise = new Promise((resolve) => {
    socket1.on('matchFound', ({ match }) => {
      console.log(`🏆 ¡MATCH EXITOSO POR CERCANÍA DE PERÍMETROS! Distancia entre distritos: ~3.5 km <= 5 km permitido.`);
      resolve(match);
    });

    socket2.emit('startQueue', {
      userId: user2.id,
      sportId: 'futbol',
      formatId: '1v1',
      mode: 'solo',
      lat: -12.108,
      lng: -77.001,
      radiusKm: 5,
      district: 'San Borja'
    });
  });

  await matchPromise;
  console.log('\n✅ PRUEBA DE PERÍMETRO EN MAPA APROBADA AL 100%\n');

  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

runPerimeterE2ETest().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
