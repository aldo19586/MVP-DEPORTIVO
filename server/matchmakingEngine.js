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
  constructor(io) {
    this.io = io;
    this.checkInterval = null;
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
        rating: profile.rating,
        rd: profile.rd,
        socketId: t.socketId
      };
    };

    const teamA = teamATickets.map(mapTicketToPlayer);
    const teamB = teamBTickets.map(mapTicketToPlayer);

    const match = db.createMatch({ sportId, formatId, teamA, teamB });

    // Notificar y auto-unir a la sala de chat a los sockets de ambos equipos
    for (const player of [...teamA, ...teamB]) {
      if (player.socketId) {
        const sock = this.io.sockets.sockets.get(player.socketId);
        if (sock) {
          sock.join(match.id);
        }
        this.io.to(player.socketId).emit('matchFound', {
          matchId: match.id,
          sportId,
          formatId,
          match
        });
      }
    }

    console.log(`[MATCHMAKING] ¡Match creado ${match.id} (${sportId} ${formatId})! Equipo A: ${teamA.map(p => p.name).join(', ')} VS Equipo B: ${teamB.map(p => p.name).join(', ')}`);
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

    const match = db.createMatch({
      sportId,
      formatId,
      teamA,
      teamB
    });

    if (socketId) {
      const sock = this.io.sockets.sockets.get(socketId);
      if (sock) {
        sock.join(match.id);
      }
      this.io.to(socketId).emit('matchFound', {
        matchId: match.id,
        sportId,
        formatId,
        match
      });
    }

    return match;
  }
}
