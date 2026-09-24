// Test suite para la funcionalidad Peer-Review Circular (Post-Partido 1-Toque)
const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Iniciando pruebas de Peer-Review Circular Post-Partido...');

  try {
    // 1. Obtener un partido existente (match_hist_102 con 2 jugadores por equipo)
    const matchRes = await fetch(`${BASE_URL}/api/match/match_hist_102`);
    const matchData = await matchRes.json();
    const match = matchData.match;

    if (!match) {
      throw new Error('No se encontró match_hist_102');
    }
    console.log(`✅ Partido cargado: ${match.id} (${match.teamA.length} vs ${match.teamB.length})`);

    // 2. Probar endpoint GET peer-review para un jugador de teamA
    // 2. Probar endpoint GET peer-review para un jugador
    // Asegurar que las asignaciones estén generadas para match_hist_102
    const checkInit = await fetch(`${BASE_URL}/api/match/${match.id}/peer-review/demo_user_1`);
    if (checkInit.status === 404) {
      console.log('ℹ️ Generando asignaciones circulares resolviendo partido...');
      await fetch(`${BASE_URL}/api/admin/disputes/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, winnerTeam: 'teamA' })
      });
    }

    const allPlayers = [...match.teamA, ...match.teamB];
    let evaluatorId = null;
    let reviewData = null;

    for (const p of allPlayers) {
      const pId = p.userId || p.id;
      const r = await fetch(`${BASE_URL}/api/match/${match.id}/peer-review/${pId}`);
      if (r.ok) {
        const data = await r.json();
        if (!data.hasVoted) {
          evaluatorId = pId;
          reviewData = data;
          break;
        }
      }
    }

    if (!evaluatorId) {
      evaluatorId = 'demo_user_1';
      const r = await fetch(`${BASE_URL}/api/match/${match.id}/peer-review/${evaluatorId}`);
      reviewData = await r.json();
    }

    console.log(`✅ Asignación circular obtenida para ${evaluatorId}:`);
    console.log(`   - Evaluado asignado: ${reviewData.targetPlayer.name} (${reviewData.targetPlayer.id})`);
    console.log(`   - ¿Es diferente a sí mismo (A != B)?: ${reviewData.targetPlayer.id !== evaluatorId}`);
    console.log(`   - Estado de voto completado: ${reviewData.hasVoted}`);
    console.log(`   - Stats reveladas: ${reviewData.statsRevealed}`);

    if (reviewData.targetPlayer.id === evaluatorId) {
      throw new Error('FALLO: El evaluador fue asignado a sí mismo (A == B)');
    }

    const targetUserId = reviewData.targetPlayer.id;
    const initialStat = reviewData.targetPlayer.futStats?.rit || 70;
    console.log(`   - Ritmo inicial del compañero: ${initialStat}`);

    // 3. Probar envío de voto 1-toque
    console.log('\n🗳️ Enviando voto de 1-toque: Etiqueta "Ritmo" (+2)...');
    const voteRes = await fetch(`${BASE_URL}/api/match/peer-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: match.id,
        evaluatorId: evaluatorId,
        attributeTag: 'Ritmo'
      })
    });

    const voteData = await voteRes.json();
    if (!voteRes.ok) {
      throw new Error(`Error al votar: ${voteRes.status} - ${JSON.stringify(voteData)}`);
    }

    const prevStat = voteData.prevValue ?? voteData.previousValue;
    console.log(`✅ Voto procesado exitosamente:`, {
      statKey: voteData.attributeAdded || voteData.statKey,
      previousValue: prevStat,
      newValue: voteData.newValue,
      delta: voteData.newValue - prevStat,
      newOvr: voteData.updatedTargetPlayer?.futStats?.ovr
    });

    if (voteData.newValue !== prevStat + 2) {
      throw new Error(`FALLO: No se sumaron exactamente 2 puntos (+2). Previo: ${prevStat}, Nuevo: ${voteData.newValue}`);
    }

    // 4. Probar idempotencia y bloqueo de doble voto (Anti-Cheat 409 Conflict)
    console.log('\n🛡️ Probando prevención de doble voto (Anti-Cheat / Idempotencia)...');
    const doubleVoteRes = await fetch(`${BASE_URL}/api/match/peer-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: match.id,
        evaluatorId: evaluatorId,
        attributeTag: 'Defensa'
      })
    });

    if (doubleVoteRes.status === 409) {
      console.log('✅ Bloqueo de doble voto confirmado: Código HTTP 409 Conflict recibido');
    } else {
      throw new Error(`FALLO: Se esperaba HTTP 409 al votar dos veces, pero se recibió ${doubleVoteRes.status}`);
    }

    // 5. Verificar que ahora statsRevealed es true para el evaluador
    const updatedReviewRes = await fetch(`${BASE_URL}/api/match/${match.id}/peer-review/${evaluatorId}`);
    const updatedReview = await updatedReviewRes.json();
    console.log(`\n👁️ Verificación de Blind Reveal:`);
    console.log(`   - hasVoted: ${updatedReview.hasVoted}`);
    console.log(`   - statsRevealed: ${updatedReview.statsRevealed}`);

    if (!updatedReview.hasVoted || !updatedReview.statsRevealed) {
      throw new Error('FALLO: Las estadísticas deberían estar reveladas tras completar el voto');
    }

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE PEER-REVIEW PASARON SATISFACTORIAMENTE!');
  } catch (err) {
    console.error('❌ Error en pruebas:', err.message);
  }
}

runTests();
