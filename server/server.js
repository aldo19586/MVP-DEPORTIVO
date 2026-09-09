import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import { db } from './db.js';
import { MatchmakingEngine } from './matchmakingEngine.js';
import { calculateGlicko2Match, getInitialGlicko } from './glicko2.js';

const app = express();
const server = http.createServer(app);

// Configuración CORS abierta para admitir conexiones desde PC y celulares en la LAN
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 2500,
  pingTimeout: 5000
});

app.use(cors());
app.use(express.json());

const matchmakingEngine = new MatchmakingEngine(io);
matchmakingEngine.start();

// Mapeo de usuario a socketId
const userSocketMap = new Map();

// Temporizadores de gracia para reconexión (Fase 3: 25 segundos antes de expulsar de salas o colas)
const disconnectGraceTimers = new Map();
const DISCONNECT_GRACE_PERIOD_MS = 25000;

import peruDistricts from './peru_districts.json' with { type: 'json' };

// Helper para obtener la IP local LAN
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// ---------------- REST API ----------------

app.get('/api/districts', (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.json({ districts: peruDistricts.slice(0, 50) });
  }
  const q = query.toLowerCase().trim();
  const filtered = peruDistricts.filter(d =>
    d.distrito.toLowerCase().includes(q) ||
    d.provincia.toLowerCase().includes(q) ||
    d.departamento.toLowerCase().includes(q)
  ).slice(0, 30);
  res.json({ districts: filtered });
});

app.get('/api/sports', (req, res) => {
  res.json({ sports: db.getSports() });
});


app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El correo electrónico es requerido' });
  }
  const result = db.loginUser({ email: email.trim(), password });
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  res.json({ user: result.user });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, district, avatar, bio, favoriteSports, primarySport, position, declaredLevel } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }
  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Este correo ya tiene una cuenta registrada. Por favor inicia sesión.' });
  }
  const user = db.createUser({ email: email.trim(), password, name, district, avatar, bio, favoriteSports, primarySport, position, declaredLevel });
  res.json({ user });
});

// Autenticación rápida por Nombre + PIN de 4 dígitos (Fase 2)
app.post('/api/auth/pin-login', (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: 'Nombre y PIN de 4 dígitos son requeridos' });
  }
  const result = db.loginWithPin({ name, pin });
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  res.json({ user: result.user });
});

app.post('/api/auth/pin-register', (req, res) => {
  const { name, pin, district, avatar, bio, favoriteSports, primarySport, position, declaredLevel } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (!pin || !/^\d{4}$/.test(String(pin).trim())) {
    return res.status(400).json({ error: 'El PIN debe ser exactamente de 4 dígitos numéricos' });
  }
  const result = db.registerWithPin({ name, pin, district, avatar, bio, favoriteSports, primarySport, position, declaredLevel });
  if (result.error) {
    return res.status(409).json({ error: result.error });
  }
  res.json({ user: result.user });
});

app.get('/api/auth/check-name/:name', (req, res) => {
  const user = db.getUserByName(req.params.name);
  res.json({ exists: !!user, name: req.params.name });
});

app.get('/api/user/:userId', (req, res) => {
  const user = db.getUser(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
});

app.get('/api/profile/:userId/:sportId/:formatId', (req, res) => {
  const { userId, sportId, formatId } = req.params;
  const profile = db.getProfile(userId, sportId, formatId);
  const user = db.getUser(userId);
  res.json({ profile, futStats: user?.futStats || null });
});

app.post('/api/profile/questionnaire', (req, res) => {
  const { userId, sportId, formatId, declaredLevel, customScore } = req.body;
  const glicko = getInitialGlicko(declaredLevel);
  const profile = db.setProfile(userId, sportId, formatId, {
    declaredLevel,
    rating: glicko.rating,
    rd: glicko.rd,
    volatility: glicko.volatility
  });
  // Actualizar también stats FUT base del usuario
  const user = db.getUser(userId);
  if (user) {
    user.ratingOverall = glicko.rating;
  }
  res.json({ profile, user });
});

app.get('/api/match/:matchId', (req, res) => {
  const match = db.getMatch(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  res.json({ match });
});

// Historial de Partidas del Usuario (Estilo MOBA / Dota 2)
app.get('/api/user/:userId/matches', (req, res) => {
  const history = db.getUserMatchHistory(req.params.userId);
  res.json({ matches: history });
});

// Todas las partidas para el Dueño / Admin (En vivo e Historial)
app.get('/api/admin/matches', (req, res) => {
  const all = db.getAllMatches();
  res.json({ matches: all });
});

// Leaderboard por Deporte y Modo de Juego (1v1, 2v2, 3v3)
app.get('/api/leaderboard/:sportId/:formatId', (req, res) => {
  const { sportId, formatId } = req.params;
  const leaderboard = db.getLeaderboard(sportId, formatId);
  res.json({ leaderboard });
});

// Cuestionarios por Deporte
app.get('/api/questionnaire/:sportId', (req, res) => {
  const { sportId } = req.params;
  const questions = db.getQuestionnaire(sportId);
  res.json({ questions });
});

// Admin endpoints
app.get('/api/admin/metrics', (req, res) => {
  const metrics = db.getAdminMetrics();
  res.json({ metrics });
});

app.get('/api/admin/users', (req, res) => {
  const usersList = Array.from(db.users.values());
  res.json({ users: usersList });
});

app.post('/api/admin/questionnaire/:sportId', (req, res) => {
  const { sportId } = req.params;
  const { questions } = req.body;
  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'Formato de preguntas inválido' });
  }
  const updated = db.saveQuestionnaire(sportId, questions);
  res.json({ success: true, questions: updated });
});

app.post('/api/admin/sport/format', (req, res) => {
  const { sportId, formatId, active } = req.body;
  const updated = db.toggleSportFormat(sportId, formatId, active);
  if (!updated) return res.status(404).json({ error: 'Deporte o formato no encontrado' });
  res.json({ success: true, format: updated });
});

// Mapeo de usuarios conectados en tiempo real
const connectedUsers = new Map(); // userId -> { userId, name, avatar, district, role, status, details, sportId, connectedAt }

function broadcastOnlineUsers() {
  const usersArray = Array.from(connectedUsers.values());
  io.emit('onlineUsersUpdate', {
    count: usersArray.length,
    users: usersArray
  });
}

matchmakingEngine.connectedUsers = connectedUsers;
matchmakingEngine.broadcastOnlineUsers = broadcastOnlineUsers;

// Endpoint de actividad en tiempo real para el panel de Admin
app.get('/api/admin/live-activity', (req, res) => {
  const liveMatches = Array.from(db.matches.values()).filter(
    (m) => m.status === 'active' || m.status === 'in_progress'
  );
  res.json({
    onlineCount: connectedUsers.size,
    onlineUsers: Array.from(connectedUsers.values()),
    activeMatches: liveMatches
  });
});

// Endpoint para consultar datos de una Sala de Convocatoria (Lobby)
app.get('/api/lobby/:code', (req, res) => {
  const lobby = db.getLobby(req.params.code);
  if (!lobby) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  res.json({ lobby });
});

// Endpoint para abandonar sala de convocatoria (usado por beacon/fetch al salir de la app)
app.post('/api/lobby/leave', (req, res) => {
  const { code, userId } = req.body || {};
  if (userId) {
    let lobbyCode = code;
    let updatedLobby = null;
    if (lobbyCode) {
      updatedLobby = db.leaveLobby(lobbyCode, userId);
    } else {
      const result = db.leaveAllLobbiesForUser(userId);
      if (result) {
        lobbyCode = result.lobbyCode;
        updatedLobby = result.updatedLobby;
      }
    }
    if (lobbyCode && updatedLobby) {
      io.to(`lobby_${lobbyCode}`).emit('lobbyUpdated', { lobby: updatedLobby });
    }
    console.log(`[LOBBY] Usuario ${userId} abandonó sala #${lobbyCode || ''} via API`);
  }
  res.json({ success: true });
});

// ---------------- SOCKET.IO REALTIME ----------------

io.on('connection', (socket) => {
  // Cancelar temporizador de gracia si el socket envía userId en handshake auth
  const authUserId = socket.handshake.auth?.userId;
  if (authUserId && disconnectGraceTimers.has(authUserId)) {
    clearTimeout(disconnectGraceTimers.get(authUserId));
    disconnectGraceTimers.delete(authUserId);
    console.log(`[SOCKET] 🟢 Jugador ${authUserId} reconectado por handshake auth. Período de gracia cancelado.`);
  }

  // Enviar lista actual de usuarios autenticados conectados
  socket.emit('onlineUsersUpdate', {
    count: connectedUsers.size,
    users: Array.from(connectedUsers.values())
  });

  socket.on('registerUser', ({ userId, user: clientUser }) => {
    if (!userId) return;

    // 0. Cancelar temporizador de gracia si este usuario estaba en desconexión temporal
    if (disconnectGraceTimers.has(userId)) {
      clearTimeout(disconnectGraceTimers.get(userId));
      disconnectGraceTimers.delete(userId);
      console.log(`[SOCKET] 🟢 Jugador ${userId} reconectado exitosamente dentro del período de gracia.`);
    }

    // 1. Exclusividad de sesión: Si ya existía una sesión en otro dispositivo/pestaña, notificar al socket viejo
    const oldSocketId = userSocketMap.get(userId);
    if (oldSocketId && oldSocketId !== socket.id) {
      io.to(oldSocketId).emit('session_replaced', {
        message: 'Has iniciado sesión en otro dispositivo. La sesión actual se ha transferido automáticamente.'
      });
    }

    userSocketMap.set(userId, socket.id);
    socket.userId = userId;

    const u = clientUser || db.getUser(userId);
    connectedUsers.set(userId, {
      userId,
      socketId: socket.id,
      name: u ? u.name : 'Jugador',
      avatar: u ? (u.avatar || '') : '',
      district: u ? (u.district || 'Lima') : 'Lima',
      role: u ? (u.role || 'player') : 'player',
      status: 'idle',
      details: 'En Radar principal',
      sportId: 'futbol',
      connectedAt: Date.now()
    });
    broadcastOnlineUsers();

    // 2. Verificar si el usuario ya tenía una búsqueda activa en el radar
    const activeChallenge = db.getChallengeByUserId(userId);
    if (activeChallenge) {
      activeChallenge.socketId = socket.id;
      const entry = connectedUsers.get(userId);
      if (entry) {
        entry.status = 'searching';
        entry.details = `Buscando ${activeChallenge.sportId} ${activeChallenge.formatId} (${activeChallenge.radiusKm}km)`;
      }
      socket.emit('queueStatus', {
        isSearching: true,
        challenge: activeChallenge
      });
      broadcastOnlineUsers();
    }

    // 3. Verificar si el usuario está en una sala de convocatoria (Lobby)
    const activeLobby = db.findLobbyByUserId(userId);
    if (activeLobby) {
      socket.join(`lobby_${activeLobby.code}`);
      socket.lobbyCode = activeLobby.code;
      const entry = connectedUsers.get(userId);
      if (entry) {
        entry.status = 'in_chat';
        entry.details = `En sala de convocatoria #${activeLobby.code}`;
      }
      socket.emit('lobbyRestored', { lobby: activeLobby });
      broadcastOnlineUsers();
    }

    // 4. Verificar si tiene un match activo (en cancha o coordinación)
    const activeMatch = db.getMatchForUser(userId);
    if (activeMatch) {
      socket.join(activeMatch.id);
      const entry = connectedUsers.get(userId);
      if (entry) {
        entry.status = activeMatch.status === 'in_progress' ? 'in_game' : 'in_chat';
        entry.details = activeMatch.status === 'in_progress' ? 'En cancha jugando' : 'Coordinando en sala privada';
      }
      socket.emit('activeMatch', { match: activeMatch, autoReconnected: true });
      broadcastOnlineUsers();
    }

    // 5. Verificar si tiene una fase de confirmación pendiente (Aceptación estilo Dota 2)
    const pending = matchmakingEngine.getPendingMatchForUser(userId);
    if (pending) {
      const remainingSec = Math.max(1, Math.floor((pending.createdAt + 20000 - Date.now()) / 1000));
      socket.emit('matchPromptAcceptance', {
        pendingMatchId: pending.pendingMatchId,
        sportId: pending.sportId,
        formatId: pending.formatId,
        totalPlayers: pending.totalPlayers,
        teamA: pending.teamA.map((p) => ({ id: p.userId || p.id, name: p.name, avatar: p.avatar, position: p.position })),
        teamB: pending.teamB.map((p) => ({ id: p.userId || p.id, name: p.name, avatar: p.avatar, position: p.position })),
        acceptedUserIds: Array.from(pending.acceptedUserIds),
        expiresInSeconds: remainingSec
      });
    }
  });

  socket.on('unregisterUser', () => {
    if (socket.userId) {
      if (disconnectGraceTimers.has(socket.userId)) {
        clearTimeout(disconnectGraceTimers.get(socket.userId));
        disconnectGraceTimers.delete(socket.userId);
      }
      userSocketMap.delete(socket.userId);
      connectedUsers.delete(socket.userId);
      socket.userId = null;
      broadcastOnlineUsers();
    }
  });

  // Iniciar búsqueda de Desafío (cola de matchmaking con radio geoespacial)
  socket.on('startQueue', ({ userId, sportId, formatId, mode = 'solo', lat, lng, radiusKm, district }) => {
    if (!userId || !sportId || !formatId) return;

    // Desalojar al usuario de cualquier sala previa antes de entrar a la cola del radar
    const cleaned = db.cleanUserFromAllLobbies(userId);
    for (const c of cleaned) {
      if (c.updatedLobby) {
        io.to(`lobby_${c.code}`).emit('lobbyUpdated', { lobby: c.updatedLobby });
      }
    }

    const challengeId = 'chal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const challenge = {
      id: challengeId,
      userId,
      sportId,
      formatId,
      mode,
      lat: lat || -12.137,
      lng: lng || -76.985,
      radiusKm: radiusKm || 6,
      district: district || 'Surco, Lima',
      socketId: socket.id,
      createdAt: Date.now()
    };

    db.addChallenge(challenge);
    console.log(`[QUEUE] Usuario ${userId} en cola para ${sportId} ${formatId} (Radio: ${radiusKm || 6}km en ${district})`);

    const entry = connectedUsers.get(userId);
    if (entry) {
      entry.status = 'searching';
      entry.details = `Buscando ${sportId.toUpperCase()} ${formatId} (${radiusKm || 6}km a la redonda)`;
      entry.sportId = sportId;
      broadcastOnlineUsers();
    }

    socket.emit('queueStarted', {
      isSearching: true,
      challenge
    });

    matchmakingEngine.processQueue();
  });

  socket.on('cancelQueue', ({ userId }) => {
    const removed = db.removeChallengeByUserId(userId);
    if (removed) {
      console.log(`[QUEUE] Usuario ${userId} canceló su búsqueda`);
    }

    const entry = connectedUsers.get(userId);
    if (entry) {
      entry.status = 'idle';
      entry.details = 'En Radar principal';
      broadcastOnlineUsers();
    }

    socket.emit('queueCancelled', { isSearching: false });
  });

  // ==========================================
  // EVENTOS DE SALAS DE CONVOCATORIA (LOBBY)
  // ==========================================
  socket.on('createLobby', ({ hostUser, sportId, formatId }) => {
    if (!hostUser) return;

    // Desalojar de cualquier cola de radar o salas previas
    db.removeChallengeByUserId(hostUser.id);
    const cleaned = db.cleanUserFromAllLobbies(hostUser.id);
    for (const c of cleaned) {
      if (c.updatedLobby) {
        io.to(`lobby_${c.code}`).emit('lobbyUpdated', { lobby: c.updatedLobby });
      }
    }

    const res = db.createLobby({ hostUser, sportId, formatId });
    if (res.error) {
      socket.emit('lobbyError', { message: res.error });
      return;
    }
    const lobby = res;
    socket.join(`lobby_${lobby.code}`);
    socket.lobbyCode = lobby.code;

    const entry = connectedUsers.get(hostUser.id);
    if (entry) {
      entry.status = 'in_chat';
      entry.details = `En sala de convocatoria #${lobby.code} (${lobby.sportId} ${lobby.formatId})`;
      broadcastOnlineUsers();
    }

    socket.emit('lobbyCreated', { lobby });
    io.to(`lobby_${lobby.code}`).emit('lobbyUpdated', { lobby });
    console.log(`[LOBBY] Sala ${lobby.code} creada por ${hostUser.name} (${lobby.sportId} ${lobby.formatId})`);
  });

  socket.on('joinLobby', ({ code, user, targetTeam }) => {
    if (!code || !user) return;

    // Desalojar de cualquier cola de radar o salas previas
    db.removeChallengeByUserId(user.id);
    const cleaned = db.cleanUserFromAllLobbies(user.id);
    for (const c of cleaned) {
      if (c.code !== code && c.updatedLobby) {
        io.to(`lobby_${c.code}`).emit('lobbyUpdated', { lobby: c.updatedLobby });
      }
    }

    const res = db.joinLobby(code, user, targetTeam);
    if (res.error) {
      socket.emit('lobbyError', { message: res.error });
      return;
    }
    socket.join(`lobby_${res.lobby.code}`);
    socket.lobbyCode = res.lobby.code;

    const entry = connectedUsers.get(user.id);
    if (entry) {
      entry.status = 'in_chat';
      entry.details = `En sala de convocatoria #${res.lobby.code}`;
      broadcastOnlineUsers();
    }

    io.to(`lobby_${res.lobby.code}`).emit('lobbyUpdated', { lobby: res.lobby });
    console.log(`[LOBBY] ${user.name} se unió a sala ${res.lobby.code}`);
  });

  socket.on('leaveLobby', ({ code, userId }) => {
    if (!userId) return;
    const lobbyCode = code || socket.lobbyCode;
    let lobby = null;
    if (lobbyCode) {
      lobby = db.leaveLobby(lobbyCode, userId);
      socket.leave(`lobby_${lobbyCode}`);
      if (lobby) {
        io.to(`lobby_${lobbyCode}`).emit('lobbyUpdated', { lobby });
      }
    } else {
      const res = db.leaveAllLobbiesForUser(userId);
      if (res) {
        lobby = res.updatedLobby;
        socket.leave(`lobby_${res.lobbyCode}`);
        if (lobby) {
          io.to(`lobby_${res.lobbyCode}`).emit('lobbyUpdated', { lobby });
        }
      }
    }
    socket.lobbyCode = null;

    const entry = connectedUsers.get(userId);
    if (entry) {
      entry.status = 'idle';
      entry.details = 'En Radar principal';
      broadcastOnlineUsers();
    }
    console.log(`[LOBBY] Jugador ${userId} salió de sala ${lobbyCode || ''}`);
  });

  socket.on('toggleLobbyReady', ({ code, userId }) => {
    if (!code || !userId) return;
    const lobby = db.toggleLobbyReady(code, userId);
    if (lobby) {
      io.to(`lobby_${code}`).emit('lobbyUpdated', { lobby });
    }
  });

  socket.on('switchLobbyTeam', ({ code, userId, targetTeam }) => {
    if (!code || !userId || !targetTeam) return;
    const lobby = db.switchLobbyTeam(code, userId, targetTeam);
    if (lobby) {
      io.to(`lobby_${code}`).emit('lobbyUpdated', { lobby });
    }
  });

  socket.on('changeLobbyFormat', ({ code, formatId }) => {
    if (!code || !formatId) return;
    const lobby = db.changeLobbyFormat(code, formatId);
    if (lobby) {
      io.to(`lobby_${code}`).emit('lobbyUpdated', { lobby });
      console.log(`[SERVER] [LOBBY] Modalidad de sala ${code} cambiada a: ${formatId} (${lobby.formatName})`);
    }
  });

  socket.on('fillLobbyDemos', ({ code }) => {
    if (!code) return;
    const lobby = db.fillLobbyDemos(code);
    if (lobby) {
      io.to(`lobby_${code}`).emit('lobbyUpdated', { lobby });
    }
  });

  socket.on('searchLobbyOpponentOnline', ({ code }) => {
    if (!code) return;
    const lobby = db.getLobby(code);
    if (!lobby) return;

    // Verificar jugadores de Team A
    const teamAPlayers = [...lobby.teamA];
    if (teamAPlayers.length === 0) {
      socket.emit('lobbyError', { message: 'Tu equipo debe tener al menos 1 jugador para buscar rivales.' });
      return;
    }

    const sport = db.getSports().find(s => s.id === lobby.sportId);
    const format = sport?.formats?.find(f => f.id === lobby.formatId);
    const playersPerTeam = format ? format.playersPerTeam : lobby.playersPerTeam;

    // Si a Team A le faltan jugadores para la modalidad, completamos compañeros
    const demoCandidates = Array.from(db.users.values()).filter(u => u.id.startsWith('demo_user_'));
    let demoIdx = 0;
    const positions = ['POR', 'DEF', 'MED', 'DEL'];

    while (teamAPlayers.length < playersPerTeam) {
      const d = demoCandidates[demoIdx % demoCandidates.length];
      demoIdx++;
      const pProfile = db.getProfile(d.id, lobby.sportId, lobby.formatId);
      teamAPlayers.push({
        id: `${d.id}_teammate_${Date.now()}_${teamAPlayers.length}`,
        userId: d.id,
        name: `${d.name} (Compañero)`,
        avatar: d.avatar,
        district: d.district || 'Lima',
        position: d.position || positions[teamAPlayers.length % positions.length],
        rating: pProfile.rating || 1450,
        rd: pProfile.rd || 300,
        isDemo: true,
        isReady: true
      });
    }

    // Crear Equipo Rival B completo de la misma modalidad
    const teamB = [];
    while (teamB.length < playersPerTeam) {
      const d = demoCandidates[demoIdx % demoCandidates.length];
      demoIdx++;
      const pProfile = db.getProfile(d.id, lobby.sportId, lobby.formatId);
      teamB.push({
        id: `${d.id}_rival_${Date.now()}_${teamB.length}`,
        userId: d.id,
        name: d.name,
        avatar: d.avatar,
        district: d.district || 'Lima',
        position: d.position || positions[teamB.length % positions.length],
        rating: pProfile.rating || 1450,
        rd: pProfile.rd || 300,
        isDemo: true,
        isReady: true
      });
    }

    const match = db.createMatch({
      sportId: lobby.sportId,
      formatId: lobby.formatId,
      teamA: teamAPlayers,
      teamB
    });

    db.lobbies.delete(code);

    // Unir sockets al match y notificar a cada jugador
    for (const p of [...match.teamA, ...match.teamB]) {
      const pId = p.userId || p.id;
      const entry = connectedUsers.get(pId);
      if (entry && entry.socketId) {
        const sock = io.sockets.sockets.get(entry.socketId);
        if (sock) {
          sock.join(match.id);
          sock.leave(`lobby_${code}`);
        }
        io.to(entry.socketId).emit('matchFound', {
          matchId: match.id,
          sportId: match.sportId,
          formatId: match.formatId,
          match
        });
      }
    }

    io.to(`lobby_${code}`).emit('matchFound', {
      matchId: match.id,
      sportId: match.sportId,
      formatId: match.formatId,
      match
    });

    console.log(`[SERVER] [LOBBY] Match oficial encontrado para squad sala ${code}: ${match.id} (${match.sportId} ${match.formatId})`);
  });

  socket.on('startLobbyMatch', ({ code }) => {
    if (!code) return;
    const lobby = db.getLobby(code);
    if (!lobby) return;

    const allReady = [...lobby.teamA, ...lobby.teamB].every(p => p.isReady);
    if (!allReady) {
      socket.emit('lobbyError', { message: 'Todos los jugadores deben marcar "LISTO" antes de comenzar.' });
      return;
    }

    const match = db.convertLobbyToMatch(code);
    if (match) {
      // Unir sockets al match y notificar a cada jugador
      for (const p of [...match.teamA, ...match.teamB]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry && entry.socketId) {
          const sock = io.sockets.sockets.get(entry.socketId);
          if (sock) {
            sock.join(match.id);
            sock.leave(`lobby_${code}`);
          }
          io.to(entry.socketId).emit('matchFound', {
            matchId: match.id,
            sportId: match.sportId,
            formatId: match.formatId,
            match
          });
        }
      }

      io.to(`lobby_${code}`).emit('matchFound', {
        matchId: match.id,
        sportId: match.sportId,
        formatId: match.formatId,
        match
      });

      console.log(`[LOBBY] Match oficial creado desde sala ${code}: ${match.id}`);
    }
  });

  socket.on('forceDemoMatch', ({ userId, sportId, formatId }) => {
    matchmakingEngine.forceDemoMatch(userId, sportId, formatId, socket.id);
  });

  // Confirmar Asistencia en Fase de Aceptación (Estilo Dota 2)
  socket.on('acceptPendingMatch', ({ pendingMatchId, userId }) => {
    if (!pendingMatchId || !userId) return;
    matchmakingEngine.handlePlayerAccept(pendingMatchId, userId);
  });

  // Rechazar Partida en Fase de Aceptación
  socket.on('declinePendingMatch', ({ pendingMatchId, userId }) => {
    if (!pendingMatchId || !userId) return;
    matchmakingEngine.cancelPendingMatch(pendingMatchId, 'declined', userId);
  });

  socket.on('startLobbyRadarSearch', ({ code }) => {
    if (!code) return;
    const lobby = db.getLobby(code);
    if (!lobby) return;

    io.to(`lobby_${code}`).emit('lobbyStartedRadarSearch', {
      squadMembers: lobby.teamA,
      sportId: lobby.sportId,
      formatId: lobby.formatId,
      formatName: lobby.formatName,
      code: lobby.code
    });
    console.log(`[LOBBY] Sala ${code} inició búsqueda en Radar con ${lobby.teamA.length} jugadores en squad`);
  });

  socket.on('joinMatchRoom', ({ matchId }) => {
    if (!matchId) return;
    socket.join(matchId);
    const match = db.getMatch(matchId);
    if (match) {
      socket.emit('matchData', { match });
    }
  });

  socket.on('leaveMatch', ({ matchId, userId }) => {
    if (!matchId) return;
    const match = db.getMatch(matchId);
    if (!match) return;

    const userObj = db.getUser(userId) || [...match.teamA, ...match.teamB].find(p => (p.userId || p.id) === userId);
    const leavingName = userObj?.name || 'Un jugador';

    const allPlayers = [...match.teamA, ...match.teamB];
    const remainingHumans = allPlayers.filter(p => (p.userId || p.id) !== userId && !p.isDemo && !String(p.userId || p.id).startsWith('demo_user_'));

    // Si es 1v1, o si no quedan otros jugadores humanos reales en la sala: se cancela por completo
    if (match.is1v1 || remainingHumans.length === 0) {
      db.cancelMatch(matchId, userId);
      console.log(`[MATCH] Partido ${matchId} cancelado por ${leavingName} (${userId})`);
      io.to(matchId).emit('matchCancelled', {
        matchId,
        cancelledByUserId: userId,
        cancelledByUserName: leavingName,
        message: `⚠️ ${leavingName} ha abandonado el partido.`
      });
      for (const p of allPlayers) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry) {
          entry.status = 'idle';
          entry.details = 'En Radar principal';
        }
      }
      broadcastOnlineUsers();
      return;
    }

    // Si es un partido de equipos (>1v1): remover al jugador y avisar a todos
    const removeRes = db.removePlayerFromMatch(matchId, userId);
    if (removeRes) {
      const { match: updatedMatch, removedPlayer } = removeRes;
      console.log(`[MATCH] Jugador ${removedPlayer?.name || userId} salió de la sala de equipo ${matchId}`);

      // Notificar con mensaje de sistema en el chat
      const sysMsg = db.addChatMessage(matchId, {
        senderId: 'system',
        senderName: 'MatchSport ⚠️',
        text: `⚠️ ${removedPlayer?.name || leavingName} ha abandonado el partido. La alineación está incompleta.`
      });

      if (sysMsg) {
        io.to(matchId).emit('newChatMessage', { matchId, message: sysMsg });
      }

      // Notificar evento de jugador retirado
      io.to(matchId).emit('matchPlayerLeft', {
        matchId,
        leftUserId: userId,
        leftUserName: removedPlayer?.name || leavingName,
        match: updatedMatch,
        message: `⚠️ ${removedPlayer?.name || leavingName} abandonó la sala. Faltan jugadores para iniciar.`
      });

      const leavingEntry = connectedUsers.get(userId);
      if (leavingEntry) {
        leavingEntry.status = 'idle';
        leavingEntry.details = 'En Radar principal';
      }
      broadcastOnlineUsers();
    }
  });

  // Convertir Partido Incompleto a Sala de Convocatoria (Lobby) para Invitar Amigos por Link o Reclutar
  socket.on('convertMatchToLobby', ({ matchId, userId }) => {
    if (!matchId) return;
    const res = db.convertMatchToLobby(matchId, userId);
    if (res.error) {
      socket.emit('lobbyError', { message: res.error });
      return;
    }

    const { lobby } = res;
    socket.join(`lobby_${lobby.code}`);
    socket.lobbyCode = lobby.code;

    // Conectar a todos los compañeros de squad que quedaron
    for (const p of lobby.teamA) {
      const pId = p.userId || p.id;
      const entry = connectedUsers.get(pId);
      if (entry && entry.socketId) {
        const pSocket = io.sockets.sockets.get(entry.socketId);
        if (pSocket) {
          pSocket.join(`lobby_${lobby.code}`);
          pSocket.lobbyCode = lobby.code;
        }
        io.to(entry.socketId).emit('lobbyCreated', { lobby });
      }
    }

    io.to(matchId).emit('matchCancelled', {
      matchId,
      convertedToLobby: true,
      lobbyCode: lobby.code,
      message: 'La sala ha pasado a Convocatoria para invitar amigos y completar la plantilla.'
    });

    console.log(`[LOBBY] Partido ${matchId} convertido a Sala de Convocatoria #${lobby.code} por ${lobby.hostName}`);
  });

  socket.on('sendChatMessage', ({ matchId, senderId, senderName, text }) => {
    if (!matchId || !text) return;
    socket.join(matchId);
    const msg = db.addChatMessage(matchId, { senderId, senderName, text });
    if (msg) {
      const match = db.getMatch(matchId);
      io.to(matchId).emit('newChatMessage', { matchId, message: msg });

      // Garantizar que todos los jugadores humanos en línea reciban el mensaje y se unan al canal
      if (match) {
        for (const p of [...match.teamA, ...match.teamB]) {
          const pId = p.userId || p.id;
          const entry = connectedUsers.get(pId);
          if (entry && entry.socketId) {
            const sock = io.sockets.sockets.get(entry.socketId);
            if (sock) {
              sock.join(matchId);
            }
            io.to(entry.socketId).emit('newChatMessage', { matchId, message: msg });
          }
        }
      }
    }
  });

  // ▶ Iniciar Temporizador de Cancha en Vivo (30m, 45m, 60m, 90m)
  socket.on('startMatchTimer', ({ matchId, durationMinutes }) => {
    const timer = db.startMatchTimer(matchId, durationMinutes);
    if (timer) {
      io.to(matchId).emit('matchTimerStarted', {
        matchId,
        timer
      });
    }
  });

  // Reporte Oficial de Partido 1v1 por Reportero Designado (+35 pts al ganador)
  socket.on('reportResultByReporter', ({ matchId, reporterUserId, winnerTeam }) => {
    const match = db.getMatch(matchId);
    if (!match || match.status === 'finished') return;

    match.status = 'finished';
    match.resultFinal = winnerTeam;
    match.reportedBy = reporterUserId;

    // DETENER EL TEMPORIZADOR DE CANCHA
    if (match.matchTimer) {
      match.matchTimer.active = false;
      match.matchTimer.endsAt = null;
      match.matchTimer.stoppedAt = Date.now();
    }

    const ratingUpdates = {};
    const teamAPlayers = match.teamA;
    const teamBPlayers = match.teamB;

    const wonA = winnerTeam === 'teamA';
    const wonB = winnerTeam === 'teamB';

    // Actualizar estado de jugadores a idle
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      const pId = p.userId || p.id;
      const entry = connectedUsers.get(pId);
      if (entry) {
        entry.status = 'idle';
        entry.details = 'Partido concluido';
      }
    }
    broadcastOnlineUsers();

    // En 1v1: +35 pts directos al ganador, -25 pts al perdedor
    for (const p of teamAPlayers) {
      const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
      const pointsDelta = wonA ? 35 : -25;
      const newRating = Math.max(800, currentProfile.rating + pointsDelta);

      const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
        rating: newRating,
        matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
        wins: (currentProfile.wins || 0) + (wonA ? 1 : 0),
        losses: (currentProfile.losses || 0) + (wonA ? 0 : 1)
      });

      ratingUpdates[p.userId || p.id] = {
        oldRating: currentProfile.rating,
        newRating: updated.rating,
        ratingChange: pointsDelta,
        won: wonA
      };
    }

    for (const p of teamBPlayers) {
      const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
      const pointsDelta = wonB ? 35 : -25;
      const newRating = Math.max(800, currentProfile.rating + pointsDelta);

      const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
        rating: newRating,
        matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
        wins: (currentProfile.wins || 0) + (wonB ? 1 : 0),
        losses: (currentProfile.losses || 0) + (wonB ? 0 : 1)
      });

      ratingUpdates[p.userId || p.id] = {
        oldRating: currentProfile.rating,
        newRating: updated.rating,
        ratingChange: pointsDelta,
        won: wonB
      };
    }

    io.to(matchId).emit('matchTimerStopped', { matchId });
    io.to(matchId).emit('matchFinished', {
      matchId,
      winnerTeam,
      ratingUpdates,
      match
    });

    // Enviar también a los sockets individuales de los jugadores
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      const pId = p.userId || p.id;
      const entry = connectedUsers.get(pId);
      if (entry && entry.socketId) {
        io.to(entry.socketId).emit('matchTimerStopped', { matchId });
        io.to(entry.socketId).emit('matchFinished', {
          matchId,
          winnerTeam,
          ratingUpdates,
          match
        });
      }
    }
  });

  // Reporte estándar multi-jugador (>1v1) o consenso
  socket.on('reportResult', ({ matchId, userId, winnerTeam }) => {
    const match = db.getMatch(matchId);
    if (!match || match.status === 'finished') return;

    // Si es 1v1 y este usuario es el reportero designado, procesar directo sin esperar
    if (match.is1v1 && match.designatedReporter && match.designatedReporter === userId) {
      match.status = 'finished';
      match.resultFinal = winnerTeam;
      match.reportedBy = userId;

      if (match.matchTimer) {
        match.matchTimer.active = false;
        match.matchTimer.endsAt = null;
        match.matchTimer.stoppedAt = Date.now();
      }

      const ratingUpdates = {};
      const wonA = winnerTeam === 'teamA';
      const wonB = winnerTeam === 'teamB';

      for (const p of [...match.teamA, ...match.teamB]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry) {
          entry.status = 'idle';
          entry.details = 'Partido concluido';
        }
      }
      broadcastOnlineUsers();

      for (const p of match.teamA) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = wonA ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (wonA ? 1 : 0),
          losses: (currentProfile.losses || 0) + (wonA ? 0 : 1)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: wonA
        };
      }

      for (const p of match.teamB) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = wonB ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (wonB ? 1 : 0),
          losses: (currentProfile.losses || 0) + (wonB ? 0 : 1)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: wonB
        };
      }

      io.to(matchId).emit('matchTimerStopped', { matchId });
      io.to(matchId).emit('matchFinished', {
        matchId,
        winnerTeam,
        ratingUpdates,
        match
      });

      for (const p of [...match.teamA, ...match.teamB]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry && entry.socketId) {
          io.to(entry.socketId).emit('matchTimerStopped', { matchId });
          io.to(entry.socketId).emit('matchFinished', {
            matchId,
            winnerTeam,
            ratingUpdates,
            match
          });
        }
      }
      return;
    }

    match.resultReports[userId] = { winnerTeam, timestamp: Date.now() };
    const isAgainstDemo = match.teamB.some(p => p.isDemo);

    let isResolved = false;
    let finalWinner = null;

    if (isAgainstDemo) {
      isResolved = true;
      finalWinner = winnerTeam;
    } else {
      const reports = Object.values(match.resultReports);
      if (reports.length >= 2) {
        const uniqueReports = new Set(reports.map(r => r.winnerTeam));
        if (uniqueReports.size === 1) {
          isResolved = true;
          finalWinner = reports[0].winnerTeam;
        } else {
          match.status = 'disputed';
          io.to(matchId).emit('matchDisputed', {
            matchId,
            message: 'Hubo una discrepancia en el resultado reportado. Notificación enviada al Administrador.'
          });
          return;
        }
      } else {
        io.to(matchId).emit('reportWaiting', {
          matchId,
          reportedBy: userId,
          message: 'Resultado enviado. Esperando confirmación del rival...'
        });
        return;
      }
    }

    if (isResolved && finalWinner) {
      match.status = 'finished';
      match.resultFinal = finalWinner;

      // DETENER EL TEMPORIZADOR DE CANCHA
      if (match.matchTimer) {
        match.matchTimer.active = false;
        match.matchTimer.endsAt = null;
        match.matchTimer.stoppedAt = Date.now();
      }

      const ratingUpdates = {};
      const teamAPlayers = match.teamA;
      const teamBPlayers = match.teamB;
      const scoreA = finalWinner === 'teamA' ? 1 : 0;
      const scoreB = finalWinner === 'teamB' ? 1 : 0;

      // Actualizar estado de jugadores a idle
      for (const p of [...teamAPlayers, ...teamBPlayers]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry) {
          entry.status = 'idle';
          entry.details = 'Partido concluido';
        }
      }
      broadcastOnlineUsers();

      for (const p of teamAPlayers) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = scoreA === 1 ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (scoreA === 1 ? 1 : 0),
          losses: (currentProfile.losses || 0) + (scoreA === 0 ? 1 : 0)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: scoreA === 1
        };
      }

      for (const p of teamBPlayers) {
        const currentProfile = db.getProfile(p.userId || p.id, match.sportId, match.formatId);
        const ptsDelta = scoreB === 1 ? 35 : -25;
        const newRating = Math.max(800, currentProfile.rating + ptsDelta);
        const updated = db.setProfile(p.userId || p.id, match.sportId, match.formatId, {
          rating: newRating,
          matchesPlayed: (currentProfile.matchesPlayed || 0) + 1,
          wins: (currentProfile.wins || 0) + (scoreB === 1 ? 1 : 0),
          losses: (currentProfile.losses || 0) + (scoreB === 0 ? 1 : 0)
        });
        ratingUpdates[p.userId || p.id] = {
          oldRating: currentProfile.rating,
          newRating: updated.rating,
          ratingChange: ptsDelta,
          won: scoreB === 1
        };
      }

      io.to(matchId).emit('matchTimerStopped', { matchId });
      io.to(matchId).emit('matchFinished', {
        matchId,
        winnerTeam: finalWinner,
        ratingUpdates,
        match
      });

      for (const p of [...teamAPlayers, ...teamBPlayers]) {
        const pId = p.userId || p.id;
        const entry = connectedUsers.get(pId);
        if (entry && entry.socketId) {
          io.to(entry.socketId).emit('matchTimerStopped', { matchId });
          io.to(entry.socketId).emit('matchFinished', {
            matchId,
            winnerTeam: finalWinner,
            ratingUpdates,
            match
          });
        }
      }
    }
  });

  // Calificación de Atributos FUT entre rivales en 1v1
  socket.on('submitFutRatings', ({ matchId, fromUserId, toUserId, rit, tir, pas, reg, def, fis, giveLike }) => {
    const updatedStats = db.updateUserFutStats(toUserId, { rit, tir, pas, reg, def, fis });
    const fromUser = db.getUser(fromUserId);
    const targetUser = db.getUser(toUserId);
    if (targetUser && giveLike) {
      targetUser.likesCount = (targetUser.likesCount || 0) + 1;
    }
    io.to(matchId).emit('futStatsUpdated', {
      toUserId,
      futStats: updatedStats,
      likesCount: targetUser?.likesCount || 0
    });

    // Notificación en tiempo real de Like al rival
    if (giveLike) {
      const likePayload = {
        toUserId,
        fromUserName: fromUser?.name || 'Tu rival',
        fromUserAvatar: fromUser?.avatar || '',
        message: `¡${fromUser?.name || 'Tu rival'} te ha dejado un Like deportivo por tu juego limpio y respeto en cancha! 👍`,
        likesCount: targetUser?.likesCount || 1
      };
      io.to(matchId).emit('playerReceivedLike', likePayload);
      const targetSocketId = userSocketMap.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('playerReceivedLike', likePayload);
      }
    }

    socket.emit('futRatingsSaved', { success: true, futStats: updatedStats });
  });

  // Reseña general para partidos de equipos (>1v1)
  socket.on('submitReview', ({ matchId, fromUserId, toUserId, punctuality, respect, realLevelScore, comment }) => {
    const review = db.addReview({ matchId, fromUserId, toUserId, punctuality, respect, realLevelScore, comment });
    socket.emit('reviewSubmitted', { review });
  });

  // Disputa de resultado por el rival si el reportero no marcó lo acordado
  socket.on('disputeMatch', ({ matchId, userId, reason }) => {
    const match = db.getMatch(matchId);
    if (match) {
      match.status = 'disputed';
      match.disputeAlert = { reportedBy: userId, reason, timestamp: Date.now() };
      io.to(matchId).emit('matchDisputed', {
        matchId,
        message: 'Has abierto una disputa formal. Se ha notificado al Administrador para revisión.'
      });
    }
  });

  socket.on('disconnect', (reason) => {
    // Limpiar entrada temporal de guest
    connectedUsers.delete(socket.id);

    const userId = socket.userId;
    if (userId) {
      // Solo actuar si este socket era el socket activo registrado para el usuario
      if (userSocketMap.get(userId) === socket.id) {
        console.log(`[SOCKET] ⚠️ Jugador ${userId} desconectado (${reason}). Iniciando período de gracia de ${DISCONNECT_GRACE_PERIOD_MS / 1000}s...`);

        // Marcar estado en connectedUsers como reconectando
        const userEntry = connectedUsers.get(userId);
        if (userEntry) {
          userEntry.status = 'reconnecting';
          userEntry.details = 'Reconectando señal móvil...';
          broadcastOnlineUsers();
        }

        // Cancelar temporizador previo si existiera
        if (disconnectGraceTimers.has(userId)) {
          clearTimeout(disconnectGraceTimers.get(userId));
        }

        // Iniciar temporizador de gracia de 25 segundos
        const timer = setTimeout(() => {
          disconnectGraceTimers.delete(userId);

          // Si pasados 25 segundos el usuario NO se ha reconectado con otro socket:
          if (userSocketMap.get(userId) === socket.id) {
            console.log(`[SOCKET] ⏰ Período de gracia expirado para ${userId}. Ejecutando desconexión definitiva.`);
            userSocketMap.delete(userId);
            connectedUsers.delete(userId);

            // 1. Si el usuario estaba en alguna sala de convocatoria, abandonarla definitivamente
            const activeLobby = db.getUserActiveLobby(userId);
            if (activeLobby) {
              console.log(`[LOBBY] Jugador ${userId} desconectado definitivamente. Abandonando sala #${activeLobby.code}...`);
              const updatedLobby = db.leaveLobby(activeLobby.code, userId);
              if (updatedLobby) {
                io.to(`lobby_${activeLobby.code}`).emit('lobbyUpdated', { lobby: updatedLobby });
              }
            }

            // 2. Si tenía una búsqueda activa en el radar y no regresó, cancelar la búsqueda
            const activeChallenge = db.getChallengeByUserId(userId);
            if (activeChallenge) {
              db.removeChallengeByUserId(userId);
              console.log(`[MATCHMAKING] Búsqueda de ${userId} cancelada por desconexión prolongada.`);
            }

            broadcastOnlineUsers();
          }
        }, DISCONNECT_GRACE_PERIOD_MS);

        disconnectGraceTimers.set(userId, timer);
      }
    } else {
      broadcastOnlineUsers();
    }
  });
});

const PORT = process.env.PORT || 3001;

// Inicialización asíncrona: cargar SQLite antes de aceptar conexiones
async function startServer() {
  try {
    await db.initAsync();
    console.log('[SERVER] Base de datos SQLite inicializada correctamente.');
  } catch (err) {
    console.error('[SERVER] Error al inicializar SQLite:', err);
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`\n============================================================`);
    console.log(`🏆 MATCHMAKING DEPORTIVO - SERVIDOR ACTIVO (con SQLite)`);
    console.log(`📡 Backend Socket.IO: http://localhost:${PORT}`);
    console.log(`📱 En tu PC:          http://localhost:3000`);
    console.log(`📲 En tu Celular/LAN: http://${localIp}:3000`);
    console.log(`============================================================\n`);
  });
}

startServer();
