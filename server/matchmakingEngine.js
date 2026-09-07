import { db } from './db.js';

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0; // Si no hay coordenadas explícitas, compatible por defecto
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class MatchmakingEngine {
  constructor(io, connectedUsers = null, broadcastOnlineUsers = null) {
    this.io = io;
    this.connectedUsers = connectedUsers;
    this.broadcastOnlineUsers = broadcastOnlineUsers;
    this.checkInterval = null;
    this.pendingMatches = new Map();
  }

  getPendingMatchForUser(userId) {
    if (!userId) return null;
    for (const pending of this.pendingMatches.values()) {
      const inA = pending.teamA.some((p) => (p.userId || p.id) === userId);
      const inB = pending.teamB.some((p) => (p.userId || p.id) === userId);
      if (inA || inB) return pending;
    }
    return null;
  }

  start() {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => {
      this.processQueue();
    }, 2000); // Evalúa la cola cada 2 segundos
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Procesa la cola agrupando por Deporte y Formato
   */
  processQueue() {
    const queue = [...db.challenges];
    if (queue.length === 0) return;

    // Agrupar por sportId y formatId
    const groups = {};
    for (const ticket of queue) {
      const groupKey = `${ticket.sportId}_${ticket.formatId}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(ticket);
    }

    for (const [key, tickets] of Object.entries(groups)) {
      const [sportId, formatId] = key.split('_');
      this.resolveGroup(sportId, formatId, tickets);
    }
  }

  resolveGroup(sportId, formatId, tickets) {
    // Determinar cuántos jugadores por equipo se necesitan
    const sport = db.getSports().find(s => s.id === sportId);
    const format = sport?.formats.find(f => f.id === formatId);
    const playersPerTeam = format ? format.playersPerTeam : 1;

    // Calcular rating actual para cada ticket
    const enrichedTickets = tickets.map(t => {
      const profile = db.getProfile(t.userId, sportId, formatId);
      const waitTimeSec = (Date.now() - t.createdAt) / 1000;
      // Ventana de rating: base ±180, expandiéndose +30 puntos cada 5 segundos de espera
      const tolerance = Math.min(600, 180 + Math.floor(waitTimeSec / 5) * 30);
      return {
        ...t,
        rating: profile.rating,
        rd: profile.rd,
        tolerance,
        waitTimeSec
      };
    });

    // Ordenar por tiempo de espera (el que más espera tiene prioridad)
    enrichedTickets.sort((a, b) => a.createdAt - b.createdAt);

    if (playersPerTeam === 1) {
      this.resolve1v1(sportId, formatId, enrichedTickets);
    } else {
      this.resolveTeamMatch(sportId, formatId, playersPerTeam, enrichedTickets);
    }
  }

  resolve1v1(sportId, formatId, tickets) {
    const matchedIndices = new Set();

    for (let i = 0; i < tickets.length; i++) {
      if (matchedIndices.has(i)) continue;
      const t1 = tickets[i];

      for (let j = i + 1; j < tickets.length; j++) {
        if (matchedIndices.has(j)) continue;
        const t2 = tickets[j];

        const ratingDiff = Math.abs(t1.rating - t2.rating);
        const maxTolerance = Math.max(t1.tolerance, t2.tolerance);

        // Verificación de perímetro geográfico de búsqueda
        const distanceKm = getDistanceKm(t1.lat, t1.lng, t2.lat, t2.lng);
        const allowedRadius = Math.max(t1.radiusKm || 8, t2.radiusKm || 8);
        const withinPerimeter = distanceKm <= allowedRadius;

        if (ratingDiff <= maxTolerance && withinPerimeter) {
          matchedIndices.add(i);
          matchedIndices.add(j);

          this.createAndNotifyMatch(sportId, formatId, [t1], [t2]);
          break;
        }
      }
    }
  }

  resolveTeamMatch(sportId, formatId, playersPerTeam, tickets) {
    // En 2v2 o 3v3: juntar grupos que cumplan la cantidad necesaria
    const neededTotal = playersPerTeam * 2;
    if (tickets.length < neededTotal) return;

    // Para el MVP, tomamos los tickets compatibles más cercanos en rating
    const candidates = tickets.slice(0, neededTotal);
    const teamA = candidates.slice(0, playersPerTeam);
    const teamB = candidates.slice(playersPerTeam, neededTotal);

    this.createAndNotifyMatch(sportId, formatId, teamA, teamB);
  }

  createAndNotifyMatch(sportId, formatId, teamATickets, teamBTickets) {
    // Retirar de la cola
    for (const t of [...teamATickets, ...teamBTickets]) {
      db.removeChallengeById(t.id);
    }

    // Armar payloads de jugadores
    const mapTicketToPlayer = (t) => {
      const user = db.getUser(t.userId);
      const profile = db.getProfile(t.userId, sportId, formatId);
      return {
        id: t.userId,
        userId: t.userId,
        name: user?.name || 'Jugador',
        avatar: user?.avatar || '',
        district: user?.district || 'Lima',
        position: user?.position || 'MED',
        rating: profile.rating,
        rd: profile.rd,
        socketId: t.socketId
      };
    };

    const teamA = teamATickets.map(mapTicketToPlayer);
    const teamB = teamBTickets.map(mapTicketToPlayer);

    return this.launchPendingMatch(sportId, formatId, teamA, teamB);
  }

  /**
   * Lanza la fase de confirmación de 20 segundos (Estilo Dota 2)
   */
  launchPendingMatch(sportId, formatId, teamA, teamB) {
    const pendingMatchId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const allPlayers = [...teamA, ...teamB];
    const totalPlayers = allPlayers.length;

    const pendingMatch = {
      pendingMatchId,
      sportId,
      formatId,
      teamA,
      teamB,
      totalPlayers,
      acceptedUserIds: new Set(),
      createdAt: Date.now()
    };

    // Timer de 20 segundos para cancelar si no todos aceptan
    pendingMatch.timeoutTimer = setTimeout(() => {
      this.cancelPendingMatch(pendingMatchId, 'timeout', null);
    }, 21000);

    this.pendingMatches.set(pendingMatchId, pendingMatch);

    // Notificar a todos los sockets de jugadores humanos
    const promptPayload = {
      pendingMatchId,
      sportId,
      formatId,
      totalPlayers,
      teamA: teamA.map(p => ({ id: p.userId || p.id, name: p.name, avatar: p.avatar, position: p.position })),
      teamB: teamB.map(p => ({ id: p.userId || p.id, name: p.name, avatar: p.avatar, position: p.position })),
      acceptedUserIds: [],
      expiresInSeconds: 20
    };

    for (const player of allPlayers) {
      if (player.socketId) {
        this.io.to(player.socketId).emit('matchPromptAcceptance', promptPayload);
      }
    }

    // Auto-aceptar bots con retraso realista (0.5s - 2.5s)
    const botPlayers = allPlayers.filter(p => p.isDemo || String(p.userId || p.id).startsWith('demo_user_'));
    botPlayers.forEach((bot, idx) => {
      setTimeout(() => {
        if (this.pendingMatches.has(pendingMatchId)) {
          this.handlePlayerAccept(pendingMatchId, bot.userId || bot.id);
        }
      }, 600 + idx * 400 + Math.random() * 500);
    });

    console.log(`[MATCHMAKING] Fase de Confirmación lanzada: ${pendingMatchId} (${sportId} ${formatId}) para ${totalPlayers} jugadores.`);
    return pendingMatch;
  }

  handlePlayerAccept(pendingMatchId, userId) {
    const pending = this.pendingMatches.get(pendingMatchId);
    if (!pending) return;

    pending.acceptedUserIds.add(userId);
    const acceptedList = Array.from(pending.acceptedUserIds);

    // Emitir actualización a todos los jugadores
    const allPlayers = [...pending.teamA, ...pending.teamB];
    for (const p of allPlayers) {
      if (p.socketId) {
        this.io.to(p.socketId).emit('pendingMatchUpdated', {
          pendingMatchId,
          acceptedUserIds: acceptedList,
          acceptedCount: acceptedList.length,
          totalPlayers: pending.totalPlayers
        });
      }
    }

    // Si TODOS los jugadores confirmaron (ej. 10/10 en 5v5 o 2/2 en 1v1)
    if (pending.acceptedUserIds.size >= pending.totalPlayers) {
      clearTimeout(pending.timeoutTimer);
      this.pendingMatches.delete(pendingMatchId);

      const match = db.createMatch({
        sportId: pending.sportId,
        formatId: pending.formatId,
        teamA: pending.teamA,
        teamB: pending.teamB
      });

      for (const player of allPlayers) {
        const pId = player.userId || player.id;
        if (this.connectedUsers) {
          const entry = this.connectedUsers.get(pId);
          if (entry) {
            entry.status = 'in_chat';
            entry.details = `En Sala de Partido (${pending.sportId?.toUpperCase()} ${pending.formatId?.toUpperCase()})`;
          }
        }
        if (player.socketId) {
          const sock = this.io.sockets.sockets.get(player.socketId);
          if (sock) {
            sock.join(match.id);
          }
          this.io.to(player.socketId).emit('matchFound', {
            matchId: match.id,
            sportId: pending.sportId,
            formatId: pending.formatId,
            match
          });
        }
      }

      if (this.broadcastOnlineUsers) {
        this.broadcastOnlineUsers();
      }

      console.log(`[MATCHMAKING] ¡Todos aceptaron! Partido oficial ${match.id} creado con éxito.`);
    }
  }

  cancelPendingMatch(pendingMatchId, reason = 'timeout', declinedUserId = null) {
    const pending = this.pendingMatches.get(pendingMatchId);
    if (!pending) return;

    clearTimeout(pending.timeoutTimer);
    this.pendingMatches.delete(pendingMatchId);

    const declinedUser = declinedUserId ? db.getUser(declinedUserId) : null;
    const allPlayers = [...pending.teamA, ...pending.teamB];

    for (const p of allPlayers) {
      const pId = p.userId || p.id;
      if (this.connectedUsers) {
        const entry = this.connectedUsers.get(pId);
        if (entry && entry.status !== 'in_game' && entry.status !== 'in_chat') {
          entry.status = 'idle';
          entry.details = 'En Radar principal';
        }
      }
      if (p.socketId) {
        this.io.to(p.socketId).emit('matchAcceptanceFailed', {
          pendingMatchId,
          reason,
          declinedUserId,
          message: reason === 'timeout'
            ? '⚠️ Un jugador no confirmó a tiempo la partida. Regresando...'
            : `⚠️ ${declinedUser?.name || 'Un jugador'} rechazó la partida. Regresando...`
        });
      }
    }

    if (this.broadcastOnlineUsers) {
      this.broadcastOnlineUsers();
    }

    console.log(`[MATCHMAKING] Fase de confirmación cancelada para ${pendingMatchId}. Razón: ${reason}`);
  }

  /**
   * Permite emparejar inmediatamente al usuario con un rival bot/demo para pruebas instantáneas
   */
  forceDemoMatch(userId, sportId, formatId, socketId) {
    db.removeChallengeByUserId(userId);
    const user = db.getUser(userId);
    const userProfile = db.getProfile(userId, sportId, formatId);

    const sport = db.getSports().find(s => s.id === sportId);
    const format = sport?.formats?.find(f => f.id === formatId);
    const playersPerTeam = format ? format.playersPerTeam : 1;

    // Crear Equipo A con el usuario principal
    const teamA = [
      {
        id: user.id,
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        district: user.district || 'Lima',
        position: user.position || 'DEL',
        rating: userProfile.rating || 1400,
        rd: userProfile.rd || 300,
        socketId
      }
    ];

    // Candidatos bot del banco de usuarios
    const demoCandidates = Array.from(db.users.values()).filter(u => u.id.startsWith('demo_user_') && u.id !== user.id);
    let demoIdx = 0;
    const positions = ['POR', 'DEF', 'MED', 'DEL'];

    // Completar Equipo A si es modalidad de equipo (2v2, 3v3, 5v5, 7v7)
    while (teamA.length < playersPerTeam) {
      const d = demoCandidates[demoIdx % demoCandidates.length];
      demoIdx++;
      const pProfile = db.getProfile(d.id, sportId, formatId);
      teamA.push({
        id: `${d.id}_teammate_${Date.now()}_${teamA.length}`,
        userId: d.id,
        name: `${d.name} (Compañero)`,
        avatar: d.avatar,
        district: d.district || 'Lima',
        position: d.position || positions[teamA.length % positions.length],
        rating: pProfile.rating || 1450,
        rd: pProfile.rd || 300,
        isDemo: true
      });
    }

    // Crear Equipo B con la cantidad exacta de rivales
    const teamB = [];
    while (teamB.length < playersPerTeam) {
      const d = demoCandidates[demoIdx % demoCandidates.length];
      demoIdx++;
      const pProfile = db.getProfile(d.id, sportId, formatId);
      teamB.push({
        id: `${d.id}_rival_${Date.now()}_${teamB.length}`,
        userId: d.id,
        name: d.name,
        avatar: d.avatar,
        district: d.district || 'Lima',
        position: d.position || positions[teamB.length % positions.length],
        rating: pProfile.rating || 1450,
        rd: pProfile.rd || 300,
        isDemo: true
      });
    }

    return this.launchPendingMatch(sportId, formatId, teamA, teamB);
  }
}
