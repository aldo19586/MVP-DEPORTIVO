import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getInitialGlicko } from './glicko2.js';
import {
  initDatabase,
  sqlGetUser, sqlGetUserByEmail, sqlGetUserByName, sqlGetAllUsers, sqlInsertUser, sqlUpdateUser, sqlGetUserCount,
  sqlGetProfile, sqlGetProfilesByUser, sqlGetProfilesBySportFormat, sqlInsertProfile,
  sqlInsertMatch, sqlGetMatch, sqlGetAllMatches, sqlUpdateMatchStatus, sqlGetMatchCount,
  sqlInsertReview, sqlGetUserReviews, sqlInsertFutReview,
  sqlGetConfig, sqlSetConfig,
  sqlHasSeedData, forceSave
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deportes y Formatos configurables (Sección 8 de la guía)
const INITIAL_SPORTS = [
  {
    id: 'futbol',
    name: 'Fútbol',
    icon: '⚽',
    description: 'Fútbol césped y losa sintética',
    formats: [
      { id: '1v1', name: '1v1 (Rey de la Pista)', playersPerTeam: 1, active: true },
      { id: '2v2', name: '2v2 (Duelo de Parejas)', playersPerTeam: 2, active: true },
      { id: '3v3', name: '3v3 (Squad Callejero)', playersPerTeam: 3, active: true },
      { id: '5v5', name: '5v5 (Futsal / Cancha Chica)', playersPerTeam: 5, active: true },
      { id: '7v7', name: '7v7 (Fútbol 7 Tradicional)', playersPerTeam: 7, active: true }
    ]
  },
  {
    id: 'padel',
    name: 'Pádel',
    icon: '🎾',
    description: 'Pádel en canchas de cristal/césped sintético',
    formats: [
      { id: '1v1', name: '1v1 (Singles / Individual)', playersPerTeam: 1, active: true },
      { id: '2v2', name: '2v2 (Dobles Oficial)', playersPerTeam: 2, active: true }
    ]
  },
  {
    id: 'basquet',
    name: 'Básquetbol',
    icon: '🏀',
    description: 'Streetball y canchas urbanas',
    formats: [
      { id: '1v1', name: '1v1 (Mano a Mano)', playersPerTeam: 1, active: true },
      { id: '2v2', name: '2v2 (Media Cancha)', playersPerTeam: 2, active: true },
      { id: '3v3', name: '3v3 (Oficial FIBA 3x3)', playersPerTeam: 3, active: true }
    ]
  },
  {
    id: 'tenis',
    name: 'Tenis',
    icon: '🎾',
    description: 'Tenis arcilla y superficie dura',
    formats: [
      { id: '1v1', name: '1v1 (Singles Oficial)', playersPerTeam: 1, active: true },
      { id: '2v2', name: '2v2 (Dobles)', playersPerTeam: 2, active: true }
    ]
  }
];

// Cuestionarios configurables por deporte (Panel Admin)
const DEFAULT_QUESTIONNAIRES = {
  futbol: [
    {
      id: 'fut_q1',
      question: '¿Con qué frecuencia juegas partidos o pichangas al mes?',
      options: [
        { text: '1 o 2 veces al mes (Casual / Recreativo)', score: 10, level: 'Principiante' },
        { text: '1 a 2 veces por semana (Regular / Buen ritmo)', score: 25, level: 'Intermedio' },
        { text: '3 o más veces por semana (Competitivo / Intenso)', score: 40, level: 'Avanzado' },
        { text: 'Juego en ligas federadas o torneos de alta competencia', score: 50, level: 'Competitivo' }
      ]
    },
    {
      id: 'fut_q2',
      question: '¿Cuál es tu posición y fortaleza técnica principal en la cancha?',
      options: [
        { text: 'Defensa / Recuperación rústica (Cumplo con marcar)', score: 10, level: 'Principiante' },
        { text: 'Volante mixto / Pase y distribución segura', score: 25, level: 'Intermedio' },
        { text: 'Delantero / Definición y remate potente con ambas piernas', score: 35, level: 'Avanzado' },
        { text: 'Extremo regateador / Gambeta rápida 1v1 y pegada colocada', score: 45, level: 'Competitivo' }
      ]
    },
    {
      id: 'fut_q3',
      question: '¿En qué nivel de competencia te sientes más cómodo?',
      options: [
        { text: 'Pichanga de amigos con risas y sin presión', score: 10, level: 'Principiante' },
        { text: 'Retos de barrio o canchas sintéticas con algo en juego', score: 25, level: 'Intermedio' },
        { text: 'Torneo empresarial o interclubes con árbitro oficial', score: 35, level: 'Avanzado' },
        { text: 'Campeonatos de alto nivel / Copa Perú / Universitario', score: 50, level: 'Competitivo' }
      ]
    }
  ],
  padel: [
    {
      id: 'pad_q1',
      question: '¿Cuál es tu categoría habitual en torneos de Pádel?',
      options: [
        { text: 'Iniciación / 6ta categoría (Aprendiendo rebotes en pared)', score: 10, level: 'Principiante' },
        { text: '5ta categoría (Buen control de fondo de pista)', score: 20, level: 'Intermedio' },
        { text: '4ta / 3ra categoría (Bandejas, víboras y subida a la red)', score: 35, level: 'Avanzado' },
        { text: '2da o 1ra categoría (Remate por 3, smash de potencia)', score: 50, level: 'Competitivo' }
      ]
    }
  ],
  basquet: [
    {
      id: 'bsq_q1',
      question: '¿Cómo describirías tu experiencia en baloncesto?',
      options: [
        { text: 'Solo juego en la losa del barrio (Recreativo)', score: 10, level: 'Principiante' },
        { text: 'Juego pick-up games regulares con buen tiro', score: 25, level: 'Intermedio' },
        { text: 'He jugado en ligas interescolares o universitarias', score: 40, level: 'Avanzado' },
        { text: 'Jugador federado o semi-profesional (Liga Nacional/FIBA)', score: 50, level: 'Competitivo' }
      ]
    }
  ],
  tenis: [
    {
      id: 'ten_q1',
      question: '¿Cuál es tu nivel de tenis aproximado?',
      options: [
        { text: 'NTRP 1.0 - 2.5 (Principiante, peloteo básico)', score: 10, level: 'Principiante' },
        { text: 'NTRP 3.0 - 3.5 (Interclubes, consistencia en golpes)', score: 25, level: 'Intermedio' },
        { text: 'NTRP 4.0 - 4.5 (Golpes con ritmo, profundidad y volea)', score: 40, level: 'Avanzado' },
        { text: 'NTRP 5.0+ (Jugador de ranking nacional o federado)', score: 50, level: 'Competitivo' }
      ]
    }
  ]
};

// Helper para calcular OVR de la carta FUT
export function calculateOvrFromStats(stats, rating = 1500) {
  const { rit = 75, tir = 75, pas = 75, reg = 75, def = 70, fis = 75 } = stats;
  // Promedio ponderado de stats
  const baseAvg = (rit * 0.2 + tir * 0.2 + pas * 0.18 + reg * 0.18 + def * 0.12 + fis * 0.12);
  // Modulador por Rating Glicko (60 a 99)
  const ratingBonus = Math.round((rating - 1000) / 25);
  const rawOvr = Math.round(baseAvg * 0.7 + (ratingBonus + 60) * 0.3);
  return Math.min(99, Math.max(60, rawOvr));
}

// Usuarios pre-cargados para demostración y simulación de rivales
const SEED_USERS = [
  {
    id: 'demo_user_1',
    email: 'carlos.crack@deporte.pe',
    password: 'password123',
    name: 'Carlos "El Rayo" Mendoza',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    district: 'Surco, Lima',
    bio: 'Extremo rápido, me gusta el juego limpio y canchas sintéticas en buen estado.',
    position: 'DEL',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1620,
    likesCount: 24,
    futStats: {
      rit: 88,
      tir: 84,
      pas: 79,
      reg: 86,
      def: 62,
      fis: 80,
      ovr: 83,
      reviewsCount: 12
    }
  },
  {
    id: 'demo_user_2',
    email: 'mateo.padel@deporte.pe',
    password: 'password123',
    name: 'Mateo "Drive" Ramos',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    district: 'Miraflores, Lima',
    bio: 'Jugador 2da categoría de Pádel. Busco duelos 2v2 fines de semana.',
    position: 'MED',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1780,
    likesCount: 31,
    futStats: {
      rit: 82,
      tir: 87,
      pas: 88,
      reg: 83,
      def: 74,
      fis: 84,
      ovr: 86,
      reviewsCount: 16
    }
  },
  {
    id: 'demo_user_3',
    email: 'diego.gambeta@deporte.pe',
    password: 'password123',
    name: 'Diego Gambeta',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    district: 'San Borja, Lima',
    bio: 'Armador con buena pegada. Nivel intermedio competitivo.',
    position: 'MED',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1450,
    likesCount: 18,
    futStats: {
      rit: 76,
      tir: 74,
      pas: 81,
      reg: 80,
      def: 68,
      fis: 72,
      ovr: 77,
      reviewsCount: 8
    }
  },
  {
    id: 'demo_user_4',
    email: 'pedro.arquero@deporte.pe',
    password: 'password123',
    name: 'Pedro "El Muro" Gallese',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    district: 'Bellavista, Callao',
    bio: 'Arquero seguro en el mano a mano y con gran despeje con puños.',
    position: 'POR',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1590,
    likesCount: 29,
    futStats: { rit: 72, tir: 60, pas: 75, reg: 65, def: 88, fis: 85, ovr: 84, reviewsCount: 14 }
  },
  {
    id: 'demo_user_5',
    email: 'renato.pulpo@deporte.pe',
    password: 'password123',
    name: 'Renato "Capitán" Tapia',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    district: 'San Isidro, Lima',
    bio: 'Contención fuerte, marca férrea y distribución limpia.',
    position: 'DEF',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1580,
    likesCount: 35,
    futStats: { rit: 74, tir: 70, pas: 82, reg: 76, def: 86, fis: 88, ovr: 83, reviewsCount: 19 }
  },
  {
    id: 'demo_user_6',
    email: 'gianluca.lapagol@deporte.pe',
    password: 'password123',
    name: 'Gianluca Lapagol',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    district: 'Miraflores, Lima',
    bio: 'Goleador incansable, presión alta y definición de primera.',
    position: 'DEL',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1610,
    likesCount: 42,
    futStats: { rit: 84, tir: 87, pas: 75, reg: 81, def: 64, fis: 83, ovr: 85, reviewsCount: 22 }
  },
  {
    id: 'demo_user_7',
    email: 'yoshi.toque@deporte.pe',
    password: 'password123',
    name: 'Yoshimar "Pincel" Yotún',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    district: 'Surco, Lima',
    bio: 'Pases milimétricos y cambio de frente preciso.',
    position: 'MED',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1540,
    likesCount: 27,
    futStats: { rit: 77, tir: 78, pas: 89, reg: 84, def: 72, fis: 75, ovr: 82, reviewsCount: 11 }
  },
  {
    id: 'demo_user_8',
    email: 'luis.bolt@deporte.pe',
    password: 'password123',
    name: 'Luis "Rayo" Advíncula',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
    district: 'Chorrillos, Lima',
    bio: 'Lateral potente con ida y vuelta incansable.',
    position: 'DEF',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1575,
    likesCount: 38,
    futStats: { rit: 94, tir: 72, pas: 76, reg: 80, def: 81, fis: 86, ovr: 84, reviewsCount: 17 }
  },
  {
    id: 'demo_user_9',
    email: 'carlos.leon@deporte.pe',
    password: 'password123',
    name: 'Carlos "Kaiser" Zambrano',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    district: 'La Punta, Callao',
    bio: 'Central aguerrido, anticipación y liderazgo defensivo.',
    position: 'DEF',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1560,
    likesCount: 22,
    futStats: { rit: 73, tir: 62, pas: 74, reg: 70, def: 89, fis: 87, ovr: 83, reviewsCount: 15 }
  },
  {
    id: 'demo_user_10',
    email: 'andre.culebra@deporte.pe',
    password: 'password123',
    name: 'André "Culebra" Carrillo',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    district: 'Barranco, Lima',
    bio: 'Desequilibrio por banda, gambeta corta y centro preciso.',
    position: 'DEL',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1600,
    likesCount: 33,
    futStats: { rit: 89, tir: 80, pas: 83, reg: 88, def: 58, fis: 79, ovr: 84, reviewsCount: 20 }
  },
  {
    id: 'demo_user_11',
    email: 'edison.oreja@deporte.pe',
    password: 'password123',
    name: 'Edison "Orejita" Flores',
    avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80',
    district: 'Comas, Lima',
    bio: 'Aparición sorpresiva en el área y goles decisivos.',
    position: 'DEL',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1530,
    likesCount: 40,
    futStats: { rit: 79, tir: 85, pas: 79, reg: 81, def: 65, fis: 76, ovr: 81, reviewsCount: 16 }
  },
  {
    id: 'demo_user_12',
    email: 'alex.callens@deporte.pe',
    password: 'password123',
    name: 'Alexander Callens',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    district: 'Callao, Lima',
    bio: 'Zaguero zurdo con excelente salida limpia de balón.',
    position: 'DEF',
    role: 'player',
    verifiedDni: true,
    ratingOverall: 1520,
    likesCount: 21,
    futStats: { rit: 76, tir: 58, pas: 76, reg: 69, def: 85, fis: 84, ovr: 81, reviewsCount: 10 }
  },
  {
    id: 'demo_user_admin',
    email: 'admin@matchsport.pe',
    password: 'password123',
    name: 'Admin MatchSport (Dueño)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    district: 'San Isidro, Lima',
    bio: 'Administrador general y comisionado de la plataforma deportiva.',
    position: 'DEL',
    role: 'admin',
    verifiedDni: true,
    ratingOverall: 1890,
    likesCount: 99,
    futStats: {
      rit: 92,
      tir: 91,
      pas: 90,
      reg: 93,
      def: 82,
      fis: 89,
      ovr: 92,
      reviewsCount: 45
    }
  }
];

class Database {
  constructor() {
    // Caché en memoria para acceso rápido (se sincroniza con SQLite)
    this.users = new Map();
    this.sports = INITIAL_SPORTS;
    this.questionnaires = { ...DEFAULT_QUESTIONNAIRES };
    this.profiles = new Map(); // key: userId_sportId_formatId
    this.challenges = []; // cola de búsqueda activa — SOLO EN MEMORIA (tiempo real)
    this.matches = new Map(); // id -> match
    this.lobbies = new Map(); // code -> lobby — SOLO EN MEMORIA (tiempo real)
    this.reviews = [];
    this.futReviews = [];
    this._sqliteReady = false;
  }

  /**
   * Inicialización asíncrona — DEBE llamarse antes de usar la DB.
   * Carga datos de SQLite o siembra datos iniciales si la DB está vacía.
   */
  async initAsync() {
    await initDatabase();
    this._sqliteReady = true;

    // Cargar configuración persistente
    const savedSports = sqlGetConfig('sports');
    if (savedSports) {
      this.sports = savedSports;
    }
    const savedQuestionnaires = sqlGetConfig('questionnaires');
    if (savedQuestionnaires) {
      this.questionnaires = savedQuestionnaires;
    }

    // Si la DB tiene datos de semilla, cargarlos al caché en memoria
    if (sqlHasSeedData()) {
      console.log('[DB] Cargando datos persistentes desde SQLite...');
      this._loadFromSqlite();
    } else {
      console.log('[DB] Base de datos vacía, sembrando datos iniciales...');
      this._seedInitialData();
    }

    console.log(`[DB] Inicialización completa: ${this.users.size} usuarios, ${this.profiles.size} perfiles, ${this.matches.size} partidos cargados.`);
  }

  /**
   * Carga todos los datos persistidos de SQLite al caché en memoria.
   */
  _loadFromSqlite() {
    // Cargar usuarios
    const allUsers = sqlGetAllUsers();
    for (const u of allUsers) {
      this.users.set(u.id, u);
    }

    // Cargar perfiles
    for (const u of allUsers) {
      const profiles = sqlGetProfilesByUser(u.id);
      for (const p of profiles) {
        const key = this.getProfileKey(p.userId, p.sportId, p.formatId);
        this.profiles.set(key, p);
      }
    }

    // Cargar partidos
    const allMatches = sqlGetAllMatches();
    for (const m of allMatches) {
      this.matches.set(m.id, m);
    }

    // Cargar reseñas
    // Las reseñas se almacenan serializado en SQLite, las cargamos al array
    const allUserIds = allUsers.map(u => u.id);
    const reviewsSet = new Set();
    for (const uid of allUserIds) {
      const reviews = sqlGetUserReviews(uid);
      for (const r of reviews) {
        const key = JSON.stringify(r);
        if (!reviewsSet.has(key)) {
          reviewsSet.add(key);
          this.reviews.push(r);
        }
      }
    }
  }

  /**
   * Siembra los datos iniciales (SEED_USERS + partidos demo) y los persiste en SQLite.
   */
  _seedInitialData() {
    // Guardar configuración
    sqlSetConfig('sports', this.sports);
    sqlSetConfig('questionnaires', this.questionnaires);

    // Cargar semillas de usuarios
    for (const u of SEED_USERS) {
      this.users.set(u.id, u);
      sqlInsertUser(u);

      // Perfiles por defecto para el demo por formato
      const profile1v1 = {
        userId: u.id, sportId: 'futbol', formatId: '1v1',
        rating: u.ratingOverall, rd: 120, volatility: 0.06,
        matchesPlayed: 14, wins: 10, losses: 4,
        declaredLevel: u.ratingOverall >= 1800 ? 'Competitivo' : u.ratingOverall >= 1550 ? 'Avanzado' : 'Intermedio'
      };
      this.setProfile(u.id, 'futbol', '1v1', profile1v1);

      this.setProfile(u.id, 'futbol', '2v2', {
        rating: u.ratingOverall - 40, rd: 140, volatility: 0.06,
        matchesPlayed: 8, wins: 5, losses: 3, declaredLevel: 'Avanzado'
      });
      this.setProfile(u.id, 'futbol', '3v3', {
        rating: u.ratingOverall - 20, rd: 150, volatility: 0.06,
        matchesPlayed: 5, wins: 4, losses: 1, declaredLevel: 'Avanzado'
      });
      this.setProfile(u.id, 'padel', '2v2', {
        rating: 1550, rd: 160, volatility: 0.06,
        matchesPlayed: 6, wins: 4, losses: 2, declaredLevel: 'Intermedio'
      });
    }

    // Sembrar partidos de demostración con detalles completos (Estilo MOBA / Dota 2)
    const demoMatch1 = {
      id: 'match_hist_101',
      sportId: 'futbol',
      formatId: '1v1',
      status: 'finished',
      is1v1: true,
      venueDistrict: 'Surco, Lima (Cancha Sintética El Golazo)',
      startedAtTime: '10:00 AM',
      finishedAtTime: '10:45 AM',
      durationMinutes: 45,
      resultFinal: 'teamA',
      reportedBy: 'demo_user_1',
      teamA: [
        { id: 'demo_user_1', userId: 'demo_user_1', name: 'Carlos Mendoza', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', district: 'Surco, Lima', position: 'DEL', rating: 1820 }
      ],
      teamB: [
        { id: 'demo_user_3', userId: 'demo_user_3', name: 'Franco Benítez', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', district: 'San Borja, Lima', position: 'DEL', rating: 1780 }
      ],
      chatMessages: [],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    };

    const demoMatch2 = {
      id: 'match_hist_102',
      sportId: 'futbol',
      formatId: '5v5',
      status: 'finished',
      is1v1: false,
      venueDistrict: 'Miraflores, Lima (Complejo Manuel Bonilla)',
      startedAtTime: '08:30 PM',
      finishedAtTime: '09:30 PM',
      durationMinutes: 60,
      resultFinal: 'teamA',
      reportedBy: 'demo_user_2',
      teamA: [
        { id: 'demo_user_1', userId: 'demo_user_1', name: 'Carlos Mendoza', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', district: 'Surco, Lima', position: 'DEL', rating: 1820 },
        { id: 'demo_user_2', userId: 'demo_user_2', name: 'Mateo Ramos', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', district: 'Miraflores, Lima', position: 'MED', rating: 1640 }
      ],
      teamB: [
        { id: 'demo_user_4', userId: 'demo_user_4', name: 'Lucía Morales', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', district: 'Surco, Lima', position: 'DEL', rating: 1720 },
        { id: 'demo_user_5', userId: 'demo_user_5', name: 'Rodrigo Paz', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', district: 'San Isidro, Lima', position: 'DEF', rating: 1590 }
      ],
      chatMessages: [],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    };

    this.matches.set(demoMatch1.id, demoMatch1);
    this.matches.set(demoMatch2.id, demoMatch2);
    sqlInsertMatch(demoMatch1);
    sqlInsertMatch(demoMatch2);

    forceSave();
    console.log('[DB] Datos iniciales sembrados y persistidos en SQLite.');
  }

  // ==========================================
  // PERSISTENCIA: Helpers para sincronizar caché <-> SQLite
  // ==========================================

  _persistUser(user) {
    if (this._sqliteReady) {
      sqlUpdateUser(user);
    }
  }

  _persistProfile(profile) {
    if (this._sqliteReady) {
      sqlInsertProfile(profile);
    }
  }

  _persistMatch(match) {
    if (this._sqliteReady) {
      sqlInsertMatch(match);
    }
  }

  // ==========================================
  // API PÚBLICA — EXACTAMENTE IGUAL QUE ANTES
  // ==========================================

  getSports() {
    return this.sports;
  }

  getUser(userId) {
    return this.users.get(userId) || null;
  }

  getUserByEmail(email) {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return u;
      }
    }
    return null;
  }

  loginUser({ email, password }) {
    const user = this.getUserByEmail(email);
    if (!user) {
      return { error: 'No existe una cuenta con este correo. ¿Deseas registrarte?' };
    }
    // Si la cuenta tiene contraseña y se envió contraseña, verificar
    if (user.password && password && user.password !== password) {
      return { error: 'Contraseña incorrecta. Por favor verifica tus datos.' };
    }
    return { user };
  }

  getUserByName(name) {
    if (!name || typeof name !== 'string') return null;
    const clean = name.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.name && u.name.trim().toLowerCase() === clean) {
        return u;
      }
    }
    const fromSql = sqlGetUserByName(clean);
    if (fromSql) {
      this.users.set(fromSql.id, fromSql);
      return fromSql;
    }
    return null;
  }

  loginWithPin({ name, pin }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return { error: 'Ingresa tu nombre de jugador' };
    }
    const cleanPin = String(pin || '').trim();
    if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
      return { error: 'El PIN debe ser exactamente de 4 dígitos numéricos' };
    }

    const cleanName = name.trim();
    const user = this.getUserByName(cleanName);
    if (!user) {
      return { error: `No se encontró el jugador "${cleanName}". ¿Deseas registrarte?` };
    }

    // Verificar PIN
    if (user.pinHash) {
      const match = bcrypt.compareSync(cleanPin, user.pinHash);
      if (!match) {
        return { error: 'PIN incorrecto. Verifica los 4 dígitos.' };
      }
    } else if (user.password && user.password === cleanPin) {
      // Si fue creado con password plano idéntico al PIN, migrarlo a hash
      user.pinHash = bcrypt.hashSync(cleanPin, 10);
      this._persistUser(user);
    } else {
      return { error: 'Esta cuenta no tiene PIN configurado. Inicia sesión con correo.' };
    }

    return { user };
  }

  registerWithPin({
    name,
    pin,
    district = 'Surco, Lima',
    avatar = null,
    bio = 'Listo para competir con juego limpio.',
    favoriteSports = ['futbol'],
    primarySport = 'futbol',
    position = 'DEL',
    declaredLevel = 'Intermedio'
  }) {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return { error: 'El nombre debe tener al menos 2 caracteres' };
    }
    const cleanPin = String(pin || '').trim();
    if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
      return { error: 'El PIN debe ser exactamente de 4 dígitos numéricos' };
    }

    const cleanName = name.trim();
    const existing = this.getUserByName(cleanName);
    if (existing) {
      return { error: `Ya existe un jugador registrado como "${cleanName}". Prueba iniciando sesión con tu PIN o usa otro apodo.` };
    }

    const pinHash = bcrypt.hashSync(cleanPin, 10);
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const syntheticEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${id.substring(5, 10)}@matchsport.local`;

    // Generar stats base para su carta FUT según el nivel, con un TOPE MÁXIMO DE 70 para recién registrados
    const baseVal = declaredLevel === 'Competitivo' ? 68 : declaredLevel === 'Avanzado' ? 66 : declaredLevel === 'Principiante' ? 58 : 63;
    const initialFutStats = {
      rit: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      tir: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      pas: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      reg: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      def: Math.min(70, Math.max(50, baseVal - 3 + Math.floor(Math.random() * 5 - 2))),
      fis: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      reviewsCount: 1
    };
    initialFutStats.ovr = calculateOvrFromStats(initialFutStats, baseVal * 20);

    const user = {
      id,
      email: syntheticEmail,
      password: null,
      pinHash,
      name: cleanName,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      district: district || 'Surco, Lima',
      bio: bio || 'Listo para competir con juego limpio.',
      favoriteSports: Array.isArray(favoriteSports) && favoriteSports.length > 0 ? favoriteSports : [primarySport || 'futbol'],
      primarySport: primarySport || 'futbol',
      position: position || 'DEL',
      role: 'player',
      verifiedDni: true,
      likesCount: 0,
      futStats: initialFutStats,
      createdAt: new Date().toISOString()
    };

    this.users.set(id, user);
    this._persistUser(user);

    // Inicializar perfiles para sus deportes
    this.getProfile(id, user.primarySport, '1v1');
    if (user.primarySport === 'futbol') {
      this.getProfile(id, 'futbol', '5v5');
    }

    return { user };
  }

  createUser({ email, password, name, avatar, district, bio, favoriteSports = ['futbol'], primarySport = 'futbol', position = 'DEL', declaredLevel = 'Intermedio' }) {
    const existing = this.getUserByEmail(email);
    if (existing) return existing;

    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const isAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === 'admin@matchsport.pe';

    // Generar stats base para su carta FUT según el nivel, con un TOPE MÁXIMO DE 70 para recién registrados
    // Nivel Principiante: 58-62, Intermedio: 62-66, Avanzado: 66-68, Competitivo: 68-70 (Máximo 70)
    const baseVal = declaredLevel === 'Competitivo' ? 68 : declaredLevel === 'Avanzado' ? 66 : declaredLevel === 'Principiante' ? 58 : 63;
    const initialFutStats = {
      rit: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      tir: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      pas: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      reg: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      def: Math.min(70, Math.max(50, baseVal - 3 + Math.floor(Math.random() * 5 - 2))),
      fis: Math.min(70, Math.max(50, baseVal + Math.floor(Math.random() * 5 - 2))),
      reviewsCount: 1
    };
    initialFutStats.ovr = calculateOvrFromStats(initialFutStats, baseVal * 20);

    const user = {
      id,
      email,
      password: password || '123456',
      name: name || email.split('@')[0],
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || email)}`,
      district: district || 'Surco, Lima',
      bio: bio || 'Listo para competir con juego limpio.',
      favoriteSports: favoriteSports.length > 0 ? favoriteSports : ['futbol'],
      primarySport: primarySport || 'futbol',
      position: position || 'DEL',
      role: isAdmin ? 'admin' : 'player',
      verifiedDni: true,
      likesCount: 0,
      futStats: initialFutStats,
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    this._persistUser(user);

    // Inicializar perfiles para sus deportes favoritos
    for (const sportId of user.favoriteSports) {
      this.getProfile(id, sportId, '1v1');
      this.getProfile(id, sportId, '2v2');
    }

    return user;
  }

  updateUserFutStats(userId, newRatings) {
    const user = this.getUser(userId);
    if (!user) return null;

    if (!user.futStats) {
      user.futStats = { rit: 75, tir: 75, pas: 75, reg: 75, def: 75, fis: 75, reviewsCount: 0, ovr: 75 };
    }

    const count = user.futStats.reviewsCount || 1;
    const weightNew = 1 / (count + 1);
    const weightOld = 1 - weightNew;

    user.futStats.rit = Math.round(user.futStats.rit * weightOld + (Number(newRatings.rit) || 75) * weightNew);
    user.futStats.tir = Math.round(user.futStats.tir * weightOld + (Number(newRatings.tir) || 75) * weightNew);
    user.futStats.pas = Math.round(user.futStats.pas * weightOld + (Number(newRatings.pas) || 75) * weightNew);
    user.futStats.reg = Math.round(user.futStats.reg * weightOld + (Number(newRatings.reg) || 75) * weightNew);
    user.futStats.def = Math.round(user.futStats.def * weightOld + (Number(newRatings.def) || 75) * weightNew);
    user.futStats.fis = Math.round(user.futStats.fis * weightOld + (Number(newRatings.fis) || 75) * weightNew);
    user.futStats.reviewsCount = count + 1;
    user.futStats.ovr = calculateOvrFromStats(user.futStats, user.ratingOverall || 1500);

    this._persistUser(user);
    return user.futStats;
  }

  getProfileKey(userId, sportId, formatId) {
    return `${userId}_${sportId}_${formatId}`;
  }

  getProfile(userId, sportId, formatId) {
    const key = this.getProfileKey(userId, sportId, formatId);
    if (!this.profiles.has(key)) {
      const glicko = getInitialGlicko('Intermedio');
      const profile = {
        userId,
        sportId,
        formatId,
        rating: glicko.rating,
        rd: glicko.rd,
        volatility: glicko.volatility,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        declaredLevel: 'Intermedio'
      };
      this.profiles.set(key, profile);
      this._persistProfile(profile);
    }
    return this.profiles.get(key);
  }

  setProfile(userId, sportId, formatId, data) {
    const key = this.getProfileKey(userId, sportId, formatId);
    const current = this.getProfile(userId, sportId, formatId);
    const updated = { ...current, ...data };
    this.profiles.set(key, updated);
    this._persistProfile(updated);
    return updated;
  }

  // Desafíos / Matchmaking Queue
  addChallenge(challenge) {
    this.removeChallengeByUserId(challenge.userId);
    this.challenges.push(challenge);
    return challenge;
  }

  getChallengeByUserId(userId) {
    return this.challenges.find(c => c.userId === userId || (c.squadMembers && c.squadMembers.includes(userId)));
  }

  removeChallengeByUserId(userId) {
    const index = this.challenges.findIndex(c => c.userId === userId || (c.squadMembers && c.squadMembers.includes(userId)));
    if (index !== -1) {
      return this.challenges.splice(index, 1)[0];
    }
    return null;
  }

  removeChallengeById(id) {
    const index = this.challenges.findIndex(c => c.id === id);
    if (index !== -1) {
      return this.challenges.splice(index, 1)[0];
    }
    return null;
  }

  // Matches con Reportero Designado y Temporizador de Alquiler de Cancha
  createMatch({ sportId, formatId, teamA, teamB }) {
    const matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    
    // Si es 1v1, designar a uno de los dos como reportero oficial
    const is1v1 = formatId === '1v1' || (teamA.length === 1 && teamB.length === 1);
    const designatedReporter = is1v1 ? (teamA[0].id || teamA[0].userId) : null;
    const designatedReporterName = is1v1 ? teamA[0].name : null;

    const match = {
      id: matchId,
      sportId,
      formatId,
      teamA,
      teamB,
      status: 'active', // active, in_progress, finished, disputed
      is1v1,
      designatedReporter,
      designatedReporterName,
      // Temporizador de Cancha
      matchTimer: {
        active: false,
        durationMinutes: 60,
        startedAt: null,
        endsAt: null
      },
      chatMessages: [
        {
          id: 'msg_sys_welcome',
          senderId: 'system',
          senderName: 'Árbitro Virtual 🏆',
          text: is1v1 
            ? `¡Match 1v1 encontrado! La app ha designado a ${designatedReporterName} como Reportero Oficial para marcar el resultado final (+35 pts). Coordinen cancha y tiempo de juego.`
            : '¡Match de Equipo encontrado! Coordinen cancha, fecha y hora en esta sala privada.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      resultReports: {},
      resultFinal: null,
      disputeAlert: null,
      createdAt: new Date().toISOString()
    };
    this.matches.set(matchId, match);
    this._persistMatch(match);
    return match;
  }

  getMatch(matchId) {
    return this.matches.get(matchId) || null;
  }

  getMatchForUser(userId) {
    for (const match of this.matches.values()) {
      const inTeamA = match.teamA.some(p => p.id === userId || p.userId === userId);
      const inTeamB = match.teamB.some(p => p.id === userId || p.userId === userId);
      if ((inTeamA || inTeamB) && (match.status === 'active' || match.status === 'in_progress')) {
        return match;
      }
    }
    return null;
  }

  cancelMatch(matchId, userId) {
    const match = this.getMatch(matchId);
    if (!match) return null;
    match.status = 'cancelled';
    match.cancelledBy = userId;
    match.cancelledAt = new Date().toISOString();
    this._persistMatch(match);
    return match;
  }

  removePlayerFromMatch(matchId, userId) {
    const match = this.getMatch(matchId);
    if (!match) return null;

    let removedPlayer = null;
    const indexA = match.teamA.findIndex(p => (p.userId || p.id) === userId);
    if (indexA !== -1) {
      removedPlayer = match.teamA.splice(indexA, 1)[0];
    } else {
      const indexB = match.teamB.findIndex(p => (p.userId || p.id) === userId);
      if (indexB !== -1) {
        removedPlayer = match.teamB.splice(indexB, 1)[0];
      }
    }

    this._persistMatch(match);
    return { match, removedPlayer };
  }

  convertMatchToLobby(matchId, userId) {
    const match = this.getMatch(matchId);
    if (!match) return { error: 'Partido no encontrado' };

    const inTeamA = match.teamA.some(p => (p.userId || p.id) === userId);
    const myTeamPlayers = inTeamA ? [...match.teamA] : [...match.teamB];

    const hostUser = myTeamPlayers.find(p => (p.userId || p.id) === userId) || myTeamPlayers[0];
    if (!hostUser) return { error: 'No se encontró jugador para capitanear la sala' };

    // Limpiar salas activas previas del usuario si hubiera
    this.leaveAllLobbiesForUser(hostUser.userId || hostUser.id);

    const sport = this.sports.find(s => s.id === match.sportId) || this.sports[0];
    const format = sport?.formats?.find(f => f.id === match.formatId) || sport?.formats?.[0] || { playersPerTeam: 5 };
    const playersPerTeam = format.playersPerTeam || 5;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${match.sportId.substring(0, 3).toUpperCase()}-${randomSuffix}`;

    const lobby = {
      code,
      sportId: match.sportId,
      formatId: match.formatId,
      formatName: format.name || match.formatId,
      playersPerTeam,
      totalSlots: playersPerTeam * 2,
      hostUserId: hostUser.userId || hostUser.id,
      hostName: hostUser.name,
      status: 'waiting',
      teamA: myTeamPlayers.map((p, idx) => ({
        id: p.userId || p.id,
        userId: p.userId || p.id,
        name: p.name,
        avatar: p.avatar,
        position: p.position || 'MED',
        rating: p.rating || 1400,
        rd: p.rd || 300,
        isReady: idx === 0,
        isHost: (p.userId || p.id) === (hostUser.userId || hostUser.id)
      })),
      teamB: [],
      createdAt: Date.now()
    };

    this.lobbies.set(code, lobby);
    match.status = 'cancelled';
    match.cancelledAt = new Date().toISOString();
    this._persistMatch(match);

    return { lobby, match };
  }

  startMatchTimer(matchId, durationMinutes = 60) {
    const match = this.getMatch(matchId);
    if (!match) return null;

    const now = Date.now();
    const endsAt = now + durationMinutes * 60 * 1000;

    match.status = 'in_progress';
    match.matchTimer = {
      active: true,
      durationMinutes,
      startedAt: now,
      endsAt
    };

    // Mensaje automático del árbitro
    this.addChatMessage(matchId, {
      senderId: 'system',
      senderName: 'Árbitro Virtual ⏱️',
      text: `▶ Partido iniciado en cancha. Temporizador programado para ${durationMinutes} minutos. ¡Al sonar la alarma de pitazo final marquen el resultado!`
    });

    this._persistMatch(match);
    return match.matchTimer;
  }

  addChatMessage(matchId, { senderId, senderName, text }) {
    const match = this.getMatch(matchId);
    if (!match) return null;
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      senderId,
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    match.chatMessages.push(msg);
    this._persistMatch(match);
    return msg;
  }

  addReview(review) {
    const reviewData = { ...review, createdAt: new Date().toISOString() };
    this.reviews.push(reviewData);
    if (this._sqliteReady) {
      sqlInsertReview(reviewData);
    }
    return review;
  }

  getUserReviews(userId) {
    return this.reviews.filter(r => r.toUserId === userId);
  }

  getUserMatchHistory(userId) {
    const history = [];
    for (const match of this.matches.values()) {
      const inTeamA = match.teamA.some(p => p.id === userId || p.userId === userId);
      const inTeamB = match.teamB.some(p => p.id === userId || p.userId === userId);

      if (inTeamA || inTeamB) {
        // El historial solo incluye partidos oficiales terminados
        if (match.status !== 'finished') continue;

        const myTeamKey = inTeamA ? 'teamA' : 'teamB';
        const won = match.resultFinal === myTeamKey;
        const draw = match.resultFinal === 'draw';

        history.push({
          id: match.id,
          sportId: match.sportId,
          formatId: match.formatId,
          status: 'finished',
          resultFinal: match.resultFinal,
          won,
          draw,
          pointsDelta: won ? 35 : (draw ? 10 : -25),
          myTeam: inTeamA ? match.teamA : match.teamB,
          rivalTeam: inTeamA ? match.teamB : match.teamA,
          venueDistrict: match.venueDistrict || match.teamA[0]?.district || 'Surco, Lima',
          startedAt: match.startedAtTime || '10:00 AM',
          finishedAt: match.finishedAtTime || '10:45 AM',
          durationMinutes: match.durationMinutes || match.matchTimer?.durationMinutes || 60,
          reportedBy: match.reportedBy,
          createdAt: match.createdAt
        });
      }
    }
    return history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getAllMatches() {
    return Array.from(this.matches.values()).map(m => ({
      id: m.id,
      sportId: m.sportId,
      formatId: m.formatId,
      status: m.status,
      teamA: m.teamA,
      teamB: m.teamB,
      venueDistrict: m.venueDistrict || m.teamA[0]?.district || 'Surco, Lima',
      startedAt: m.startedAtTime || 'En curso',
      finishedAt: m.finishedAtTime || '-',
      durationMinutes: m.durationMinutes || m.matchTimer?.durationMinutes || 60,
      matchTimer: m.matchTimer,
      resultFinal: m.resultFinal,
      reportedBy: m.reportedBy,
      createdAt: m.createdAt
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }


  // Rankings por modo de juego (1v1, 2v2, 3v3)
  getLeaderboard(sportId = 'futbol', formatId = '1v1') {
    const list = [];
    for (const [key, profile] of this.profiles.entries()) {
      if (profile.sportId === sportId && profile.formatId === formatId) {
        const user = this.getUser(profile.userId);
        if (user) {
          list.push({
            user,
            profile,
            rating: profile.rating,
            wins: profile.wins || 0,
            losses: profile.losses || 0,
            matchesPlayed: profile.matchesPlayed || 0,
            ovr: user.futStats?.ovr || 75,
            futStats: user.futStats
          });
        }
      }
    }
    // Ordenar de mayor rating a menor
    return list.sort((a, b) => b.rating - a.rating);
  }

  // Cuestionarios por Deporte
  getQuestionnaire(sportId) {
    return this.questionnaires[sportId] || this.questionnaires.futbol || [];
  }

  saveQuestionnaire(sportId, questions) {
    this.questionnaires[sportId] = questions;
    if (this._sqliteReady) {
      sqlSetConfig('questionnaires', this.questionnaires);
    }
    return this.questionnaires[sportId];
  }

  // Panel de Administrador: Métricas Generales
  getAdminMetrics() {
    const totalUsers = this.users.size;
    const totalMatches = this.matches.size;
    const activeMatches = Array.from(this.matches.values()).filter(m => m.status === 'active' || m.status === 'in_progress').length;
    const activeSearches = this.challenges.length;
    const disputes = Array.from(this.matches.values()).filter(m => m.status === 'disputed').length;

    return {
      totalUsers,
      totalMatches,
      activeMatches,
      activeSearches,
      disputes,
      sportsCount: this.sports.length
    };
  }

  toggleSportFormat(sportId, formatId, active) {
    const sport = this.sports.find(s => s.id === sportId);
    if (!sport) return null;
    const format = sport.formats.find(f => f.id === formatId);
    if (!format) return null;
    format.active = active;
    if (this._sqliteReady) {
      sqlSetConfig('sports', this.sports);
    }
    return format;
  }

  getUserActiveLobby(userId) {
    if (!userId) return null;
    for (const lobby of this.lobbies.values()) {
      const inA = lobby.teamA?.some(p => (p.userId || p.id) === userId);
      const inB = lobby.teamB?.some(p => (p.userId || p.id) === userId);
      if (inA || inB) return lobby;
    }
    return null;
  }

  leaveAllLobbiesForUser(userId) {
    if (!userId) return null;
    const active = this.getUserActiveLobby(userId);
    if (active) {
      const updated = this.leaveLobby(active.code, userId);
      return { lobbyCode: active.code, updatedLobby: updated };
    }
    return null;
  }

  // ==========================================
  // SALAS DE CONVOCATORIA (LOBBIES PRIVADOS)
  // ==========================================
  createLobby({ hostUser, sportId = 'futbol', formatId = '2v2' }) {
    if (!hostUser) return { error: 'Usuario no válido' };

    // Validar si el usuario ya está activo en otra sala
    const existingLobby = this.getUserActiveLobby(hostUser.id);
    if (existingLobby) {
      return {
        error: `Ya estás participando en la sala #${existingLobby.code}. Debes salir de esa sala antes de crear una nueva.`
      };
    }

    const sport = this.sports.find(s => s.id === sportId) || this.sports[0];
    const format = sport?.formats?.find(f => f.id === formatId) || sport?.formats?.[0] || { playersPerTeam: 2 };
    const playersPerTeam = format.playersPerTeam || 2;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${sportId.substring(0, 3).toUpperCase()}-${randomSuffix}`;
    const hostProfile = this.getProfile(hostUser.id, sportId, formatId);

    const lobby = {
      code,
      sportId,
      formatId,
      formatName: format.name || formatId,
      playersPerTeam,
      totalSlots: playersPerTeam * 2,
      hostUserId: hostUser.id,
      hostName: hostUser.name,
      status: 'waiting', // waiting, ready, starting
      teamA: [
        {
          id: hostUser.id,
          userId: hostUser.id,
          name: hostUser.name,
          avatar: hostUser.avatar,
          position: hostUser.position || 'MED',
          rating: hostProfile.rating || 1400,
          rd: hostProfile.rd || 300,
          isReady: false,
          isHost: true
        }
      ],
      teamB: [],
      createdAt: Date.now()
    };

    this.lobbies.set(code, lobby);
    return lobby;
  }

  getLobby(code) {
    if (!code) return null;
    return this.lobbies.get(code.toUpperCase()) || null;
  }

  joinLobby(code, user, targetTeam = null) {
    if (!code || !user) return { error: 'Datos incompletos para unirse a la sala' };
    const lobby = this.getLobby(code);
    if (!lobby) return { error: 'Sala no encontrada o ya finalizó.' };

    const inA = lobby.teamA.some(p => p.userId === user.id || p.id === user.id);
    const inB = lobby.teamB.some(p => p.userId === user.id || p.id === user.id);

    if (inA || inB) {
      return { lobby };
    }

    // Validar si el usuario ya está activo en otra sala diferente
    const existingLobby = this.getUserActiveLobby(user.id);
    if (existingLobby && existingLobby.code !== lobby.code) {
      return {
        error: `Ya estás participando en la sala #${existingLobby.code}. Debes salir de esa sala antes de unirte a la #${lobby.code}.`
      };
    }

    const max = lobby.playersPerTeam;
    let assignedTeam = targetTeam;
    if (!assignedTeam) {
      if (lobby.teamA.length < max) assignedTeam = 'teamA';
      else if (lobby.teamB.length < max) assignedTeam = 'teamB';
    }

    if (!assignedTeam || lobby[assignedTeam].length >= max) {
      // Intentar el otro equipo si el solicitado está lleno
      if (lobby.teamA.length < max) assignedTeam = 'teamA';
      else if (lobby.teamB.length < max) assignedTeam = 'teamB';
      else return { error: 'La sala está completa' };
    }

    const profile = this.getProfile(user.id, lobby.sportId, lobby.formatId);
    const playerEntry = {
      id: user.id,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      position: user.position || 'MED',
      rating: profile.rating || 1400,
      rd: profile.rd || 300,
      isReady: false,
      isHost: false
    };

    lobby[assignedTeam].push(playerEntry);
    this._updateLobbyStatus(lobby);
    return { lobby };
  }

  leaveLobby(code, userId) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    lobby.teamA = lobby.teamA.filter(p => (p.userId || p.id) !== userId);
    lobby.teamB = lobby.teamB.filter(p => (p.userId || p.id) !== userId);

    if (lobby.teamA.length === 0 && lobby.teamB.length === 0) {
      this.lobbies.delete(lobby.code);
      return null;
    }

    // Si el host salió, ceder host al primer jugador restante
    if (lobby.hostUserId === userId) {
      const nextHost = lobby.teamA[0] || lobby.teamB[0];
      if (nextHost) {
        nextHost.isHost = true;
        lobby.hostUserId = nextHost.userId || nextHost.id;
        lobby.hostName = nextHost.name;
      }
    }

    this._updateLobbyStatus(lobby);
    return lobby;
  }

  findLobbyByUserId(userId) {
    if (!userId) return null;
    for (const lobby of this.lobbies.values()) {
      const inTeamA = lobby.teamA.some(p => (p.userId || p.id) === userId);
      const inTeamB = lobby.teamB.some(p => (p.userId || p.id) === userId);
      if (inTeamA || inTeamB) {
        return lobby;
      }
    }
    return null;
  }

  cleanUserFromAllLobbies(userId) {
    if (!userId) return [];
    const modifiedLobbies = [];
    for (const lobby of Array.from(this.lobbies.values())) {
      const inTeamA = lobby.teamA.some(p => (p.userId || p.id) === userId);
      const inTeamB = lobby.teamB.some(p => (p.userId || p.id) === userId);
      if (inTeamA || inTeamB) {
        const updated = this.leaveLobby(lobby.code, userId);
        modifiedLobbies.push({ code: lobby.code, updatedLobby: updated });
      }
    }
    return modifiedLobbies;
  }

  toggleLobbyReady(code, userId) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    const p = [...lobby.teamA, ...lobby.teamB].find(x => (x.userId || x.id) === userId);
    if (p) {
      p.isReady = !p.isReady;
    }
    this._updateLobbyStatus(lobby);
    return lobby;
  }

  switchLobbyTeam(code, userId, targetTeam) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    const max = lobby.playersPerTeam;
    if (lobby[targetTeam].length >= max) return lobby;

    const fromTeamKey = targetTeam === 'teamA' ? 'teamB' : 'teamA';
    const idx = lobby[fromTeamKey].findIndex(x => (x.userId || x.id) === userId);
    if (idx !== -1) {
      const [player] = lobby[fromTeamKey].splice(idx, 1);
      lobby[targetTeam].push(player);
    }

    this._updateLobbyStatus(lobby);
    return lobby;
  }

  changeLobbyFormat(code, newFormatId) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    const sport = this.sports.find(s => s.id === lobby.sportId) || this.sports[0];
    const format = sport?.formats?.find(f => f.id === newFormatId);
    if (!format) return lobby;

    lobby.formatId = newFormatId;
    lobby.formatName = format.name || newFormatId;
    lobby.playersPerTeam = format.playersPerTeam || 1;
    lobby.totalSlots = lobby.playersPerTeam * 2;

    // Si hay más jugadores de los permitidos por equipo, recortar primero los bots
    while (lobby.teamA.length > lobby.playersPerTeam) {
      const botIdx = lobby.teamA.findLastIndex(p => p.isDemo);
      if (botIdx !== -1) {
        lobby.teamA.splice(botIdx, 1);
      } else {
        lobby.teamA.pop();
      }
    }
    while (lobby.teamB.length > lobby.playersPerTeam) {
      const botIdx = lobby.teamB.findLastIndex(p => p.isDemo);
      if (botIdx !== -1) {
        lobby.teamB.splice(botIdx, 1);
      } else {
        lobby.teamB.pop();
      }
    }

    // Actualizar ratings de los jugadores para el nuevo formato
    for (const p of [...lobby.teamA, ...lobby.teamB]) {
      const profile = this.getProfile(p.userId || p.id, lobby.sportId, newFormatId);
      p.rating = profile.rating || 1400;
      p.rd = profile.rd || 300;
    }

    this._updateLobbyStatus(lobby);
    return lobby;
  }

  fillLobbyDemos(code) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    const max = lobby.playersPerTeam;
    const existingIds = new Set([...lobby.teamA, ...lobby.teamB].map(p => p.userId || p.id));
    const demoCandidates = Array.from(this.users.values()).filter(
      u => u.id.startsWith('demo_user_') && !existingIds.has(u.id)
    );
    let demoIdx = 0;

    const positions = ['POR', 'DEF', 'MED', 'DEL'];

    while (lobby.teamA.length < max) {
      const d = demoCandidates[demoIdx % demoCandidates.length] || {
        id: `demo_bot_${Date.now()}_${demoIdx}`,
        name: `Jugador ${demoIdx + 1}`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        position: positions[lobby.teamA.length % positions.length]
      };
      demoIdx++;
      const profile = this.getProfile(d.id, lobby.sportId, lobby.formatId);
      lobby.teamA.push({
        id: d.id + '_' + Date.now().toString().slice(-4),
        userId: d.id,
        name: d.name + (d.name.includes('(Bot)') ? '' : ' (Bot)'),
        avatar: d.avatar,
        position: d.position || positions[lobby.teamA.length % positions.length],
        rating: profile.rating || 1400,
        rd: profile.rd || 300,
        isReady: true,
        isDemo: true
      });
    }

    while (lobby.teamB.length < max) {
      const d = demoCandidates[demoIdx % demoCandidates.length] || {
        id: `demo_bot_${Date.now()}_${demoIdx}`,
        name: `Rival ${demoIdx + 1}`,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        position: positions[lobby.teamB.length % positions.length]
      };
      demoIdx++;
      const profile = this.getProfile(d.id, lobby.sportId, lobby.formatId);
      lobby.teamB.push({
        id: d.id + '_' + Date.now().toString().slice(-4),
        userId: d.id,
        name: d.name + (d.name.includes('(Bot)') ? '' : ' (Bot)'),
        avatar: d.avatar,
        position: d.position || positions[lobby.teamB.length % positions.length],
        rating: profile.rating || 1400,
        rd: profile.rd || 300,
        isReady: true,
        isDemo: true
      });
    }

    this._updateLobbyStatus(lobby);
    return lobby;
  }

  _updateLobbyStatus(lobby) {
    const total = lobby.teamA.length + lobby.teamB.length;
    const isFull = total === lobby.totalSlots;
    const allReady = [...lobby.teamA, ...lobby.teamB].every(p => p.isReady);

    if (isFull && allReady) {
      lobby.status = 'ready';
    } else {
      lobby.status = 'waiting';
    }
  }

  convertLobbyToMatch(code) {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    const match = this.createMatch({
      sportId: lobby.sportId,
      formatId: lobby.formatId,
      teamA: lobby.teamA,
      teamB: lobby.teamB
    });

    this.lobbies.delete(code);
    return match;
  }
}

// ==========================================
// EXPORTACIÓN: Singleton asíncrono
// ==========================================

// Creamos la instancia pero la inicialización SQLite es asíncrona.
// El servidor DEBE llamar a db.initAsync() antes de aceptar conexiones.
export const db = new Database();
