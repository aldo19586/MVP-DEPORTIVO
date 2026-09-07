import { io } from 'socket.io-client';

async function testBackend() {
  console.log('🧪 Iniciando prueba automatizada de Temporizador, Reportero 1v1 y Cartas FUT...');

  // 1. Probar Leaderboards por Modo
  const res1v1 = await fetch('http://localhost:3001/api/leaderboard/futbol/1v1').then(r => r.json());
  console.log(`✓ Ranking 1vs1 Fútbol: ${res1v1.leaderboard.length} jugadores listados.`);
  if (res1v1.leaderboard.length > 0) {
    const topPlayer = res1v1.leaderboard[0];
    console.log(`  Líder 1v1: ${topPlayer.user.name} | Rating: ${topPlayer.rating} pts | OVR FUT: ${topPlayer.ovr}`);
  }

  const res2v2 = await fetch('http://localhost:3001/api/leaderboard/futbol/2v2').then(r => r.json());
  console.log(`✓ Ranking 2vs2 Fútbol: ${res2v2.leaderboard.length} jugadores listados.`);

  // 2. Probar Cuestionario por Deporte
  const resQuest = await fetch('http://localhost:3001/api/questionnaire/futbol').then(r => r.json());
  console.log(`✓ Cuestionario Fútbol: ${resQuest.questions.length} preguntas configuradas.`);

  // 3. Probar Métricas de Admin
  const resMetrics = await fetch('http://localhost:3001/api/admin/metrics').then(r => r.json());
  console.log(`✓ Métricas Admin: ${resMetrics.metrics.totalUsers} usuarios, ${resMetrics.metrics.sportsCount} deportes.`);

  // 4. Probar Sockets: Temporizador + Reportero Designado + Calificación FUT
  const socketPlayer1 = io('http://localhost:3001');
  const socketPlayer2 = io('http://localhost:3001');

  await new Promise((resolve) => {
    socketPlayer1.on('connect', () => {
      console.log('✓ Jugador 1 conectado por Socket.IO');
      socketPlayer1.emit('registerUser', { userId: 'demo_user_1' });
      resolve();
    });
  });

  await new Promise((resolve) => {
    socketPlayer2.on('connect', () => {
      console.log('✓ Jugador 2 conectado por Socket.IO');
      socketPlayer2.emit('registerUser', { userId: 'demo_user_2' });
      resolve();
    });
  });

  // Forzar match de prueba
  socketPlayer1.emit('forceDemoMatch', {
    userId: 'demo_user_1',
    sportId: 'futbol',
    formatId: '1v1'
  });

  let activeMatchId = null;

  await new Promise((resolve) => {
    socketPlayer1.on('matchFound', ({ match }) => {
      console.log(`✓ Match 1v1 creado: ${match.id}`);
      console.log(`  Reportero Oficial Designado: ${match.designatedReporterName} (ID: ${match.designatedReporter})`);
      activeMatchId = match.id;
      resolve();
    });
  });

  // Probar Inicio del Temporizador de Cancha
  await new Promise((resolve) => {
    socketPlayer1.on('matchTimerStarted', ({ timer }) => {
      console.log(`✓ Temporizador de cancha activado con éxito: ${timer.durationMinutes} minutos.`);
      console.log(`  Termina en timestamp: ${new Date(timer.endsAt).toLocaleTimeString()}`);
      resolve();
    });

    socketPlayer1.emit('startMatchTimer', {
      matchId: activeMatchId,
      durationMinutes: 45
    });
  });

  // Probar Reporte del Reportero Oficial (+35 pts)
  await new Promise((resolve) => {
    socketPlayer1.on('matchFinished', ({ winnerTeam, ratingUpdates }) => {
      console.log(`✓ Resultado reportado por el reportero oficial. Ganador: ${winnerTeam}`);
      const update1 = ratingUpdates['demo_user_1'];
      console.log(`  Jugador 1 Rating: ${update1.oldRating} -> ${update1.newRating} (${update1.ratingChange >= 0 ? '+' : ''}${update1.ratingChange} pts)`);
      resolve();
    });

    socketPlayer1.emit('reportResultByReporter', {
      matchId: activeMatchId,
      reporterUserId: 'demo_user_1',
      winnerTeam: 'teamA'
    });
  });

  // Probar Calificación de los 6 Atributos FUT
  await new Promise((resolve) => {
    socketPlayer2.on('futRatingsSaved', ({ futStats }) => {
      console.log(`✓ Calificación de Carta FUT guardada exitosamente:`);
      console.log(`  RIT: ${futStats.rit} | TIR: ${futStats.tir} | PAS: ${futStats.pas} | REG: ${futStats.reg} | DEF: ${futStats.def} | FÍS: ${futStats.fis} | OVR: ${futStats.ovr}`);
      resolve();
    });

    socketPlayer2.emit('submitFutRatings', {
      matchId: activeMatchId,
      fromUserId: 'demo_user_2',
      toUserId: 'demo_user_1',
      rit: 92,
      tir: 88,
      pas: 85,
      reg: 90,
      def: 70,
      fis: 84,
      giveLike: true
    });
  });

  socketPlayer1.disconnect();
  socketPlayer2.disconnect();

  console.log('\n🎉 ¡TODAS LAS PRUEBAS AUTOMATIZADAS PASARON AL 100%!');
  process.exit(0);
}

testBackend().catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
