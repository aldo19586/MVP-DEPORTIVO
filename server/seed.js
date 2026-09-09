/**
 * server/seed.js — Script de Semilla de Datos de Prueba Realistas (Fase 4)
 * 
 * Genera 25 perfiles de jugadores de prueba con:
 * - Nombres variados y realistas del fútbol peruano.
 * - Variedad en posiciones: DEL, MED, DEF, POR.
 * - Atributos FUT distribuidos en 3 rangos de OVR:
 *     - Bajos (~60 OVR, aficionados/principiantes)
 *     - Medios (~75 OVR, regulares de pichangas)
 *     - Altos (~90 OVR, competitivos de torneos)
 * - Coordenadas GPS simuladas dentro de un radio de 10km en Lima (Surco, Miraflores, San Borja, etc.)
 * - PIN común '1234' hasheado con bcryptjs para poder ingresar manualmente como cualquiera de ellos.
 * - Limpieza previa de semillas anteriores para evitar duplicados.
 * 
 * Uso: node server/seed.js
 */

import bcrypt from 'bcryptjs';
import { initDatabase, sqlInsertUser, sqlInsertProfile, forceSave } from './database.js';

// Coordenadas GPS de distritos de Lima dentro de un radio de 10 km
const LIMA_DISTRICTS_GPS = {
  'Surco, Lima': { lat: -12.1370, lng: -76.9850 },
  'Miraflores, Lima': { lat: -12.1215, lng: -77.0298 },
  'San Borja, Lima': { lat: -12.0910, lng: -77.0010 },
  'San Isidro, Lima': { lat: -12.0970, lng: -77.0365 },
  'Barranco, Lima': { lat: -12.1480, lng: -77.0210 },
  'Chorrillos, Lima': { lat: -12.1700, lng: -77.0150 },
  'Jesús María, Lima': { lat: -12.0720, lng: -77.0480 },
  'Magdalena, Lima': { lat: -12.0900, lng: -77.0700 },
  'Lince, Lima': { lat: -12.0830, lng: -77.0340 },
  'Surquillo, Lima': { lat: -12.1120, lng: -77.0210 },
  'Pueblo Libre, Lima': { lat: -12.0710, lng: -77.0620 },
  'San Miguel, Lima': { lat: -12.0780, lng: -77.0900 }
};

// Definición de los 25 Jugadores Realistas
const SEED_PLAYERS = [
  // --- TIER ALTO (~90 OVR, Competitivos / Torneo) ---
  {
    id: 'seed_player_01',
    name: "Jefferson 'Foquita' Farfán",
    position: 'DEL',
    ovr: 91,
    rating: 2050,
    district: 'Surco, Lima',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    bio: 'Potencia, pegada letal y juego pícaro en el área.',
    futStats: { rit: 92, tir: 90, pas: 85, reg: 93, def: 48, fis: 86, ovr: 91, reviewsCount: 38 },
    declaredLevel: 'Competitivo'
  },
  {
    id: 'seed_player_02',
    name: "Paolo 'Depredador' Guerrero",
    position: 'DEL',
    ovr: 92,
    rating: 2080,
    district: 'Chorrillos, Lima',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Goleador histórico. Cabezazo, aguante de espaldas y liderazgo.',
    futStats: { rit: 84, tir: 93, pas: 82, reg: 88, def: 52, fis: 91, ovr: 92, reviewsCount: 45 },
    declaredLevel: 'Competitivo'
  },
  {
    id: 'seed_player_03',
    name: "Christian 'Aladino' Cueva",
    position: 'MED',
    ovr: 89,
    rating: 1980,
    district: 'Miraflores, Lima',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Pase filtrado milimétrico, gambeta corta y visión de 10.',
    futStats: { rit: 86, tir: 85, pas: 92, reg: 91, def: 50, fis: 78, ovr: 89, reviewsCount: 32 },
    declaredLevel: 'Competitivo'
  },
  {
    id: 'seed_player_04',
    name: "Renato 'El Capitán' Tapia",
    position: 'MED',
    ovr: 90,
    rating: 2020,
    district: 'San Isidro, Lima',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    bio: 'Recuperador implacable, equilibrio táctico y quite limpio.',
    futStats: { rit: 80, tir: 78, pas: 88, reg: 84, def: 92, fis: 93, ovr: 90, reviewsCount: 29 },
    declaredLevel: 'Competitivo'
  },
  {
    id: 'seed_player_05',
    name: "Pedro 'El Pulpo' Gallese",
    position: 'POR',
    ovr: 89,
    rating: 1990,
    district: 'Barranco, Lima',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    bio: 'Reflejos felinos en penales y seguridad bajo los tres palos.',
    futStats: { rit: 85, tir: 60, pas: 78, reg: 82, def: 90, fis: 87, ovr: 89, reviewsCount: 36 },
    declaredLevel: 'Competitivo'
  },
  {
    id: 'seed_player_06',
    name: "Carlos 'El Káiser' Zambrano",
    position: 'DEF',
    ovr: 88,
    rating: 1950,
    district: 'San Borja, Lima',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    bio: 'Anticipación agresiva, corte aéreo y salida limpia con balón.',
    futStats: { rit: 79, tir: 62, pas: 80, reg: 76, def: 91, fis: 90, ovr: 88, reviewsCount: 27 },
    declaredLevel: 'Competitivo'
  },
  {
    id: 'seed_player_07',
    name: "Piero 'La Joya' Quispe",
    position: 'MED',
    ovr: 88,
    rating: 1940,
    district: 'Lince, Lima',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Agilidad en espacios reducidos, cambio de ritmo y llegada al gol.',
    futStats: { rit: 90, tir: 82, pas: 89, reg: 92, def: 55, fis: 76, ovr: 88, reviewsCount: 24 },
    declaredLevel: 'Competitivo'
  },

  // --- TIER MEDIO (~75 OVR, Intermedios / Pichangueros Regulares) ---
  {
    id: 'seed_player_08',
    name: "Edison 'Orejitas' Flores",
    position: 'MED',
    ovr: 78,
    rating: 1680,
    district: 'Surquillo, Lima',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    bio: 'Goles en momentos clave, desborde por banda izquierda.',
    futStats: { rit: 78, tir: 79, pas: 77, reg: 79, def: 62, fis: 74, ovr: 78, reviewsCount: 18 },
    declaredLevel: 'Avanzado'
  },
  {
    id: 'seed_player_09',
    name: 'Gianluca Lapadula',
    position: 'DEL',
    ovr: 79,
    rating: 1710,
    district: 'Miraflores, Lima',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    bio: 'Presión alta constante, diagonales peligrosas y garra.',
    futStats: { rit: 80, tir: 80, pas: 72, reg: 77, def: 58, fis: 83, ovr: 79, reviewsCount: 21 },
    declaredLevel: 'Avanzado'
  },
  {
    id: 'seed_player_10',
    name: 'Yoshimar Yotún',
    position: 'MED',
    ovr: 77,
    rating: 1660,
    district: 'San Borja, Lima',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Precisión zurda en balones largos y cambios de frente.',
    futStats: { rit: 73, tir: 75, pas: 82, reg: 78, def: 71, fis: 75, ovr: 77, reviewsCount: 16 },
    declaredLevel: 'Avanzado'
  },
  {
    id: 'seed_player_11',
    name: "Luis 'Bolt' Advíncula",
    position: 'DEF',
    ovr: 78,
    rating: 1690,
    district: 'Surco, Lima',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Velocidad explosiva por la banda derecha y centro con veneno.',
    futStats: { rit: 91, tir: 70, pas: 74, reg: 77, def: 74, fis: 82, ovr: 78, reviewsCount: 19 },
    declaredLevel: 'Avanzado'
  },
  {
    id: 'seed_player_12',
    name: "Bryan 'El Picante' Reyna",
    position: 'DEL',
    ovr: 76,
    rating: 1640,
    district: 'Jesús María, Lima',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    bio: 'Regate uno contra uno, freno súbito y aceleración.',
    futStats: { rit: 86, tir: 74, pas: 71, reg: 83, def: 42, fis: 72, ovr: 76, reviewsCount: 14 },
    declaredLevel: 'Intermedio'
  },
  {
    id: 'seed_player_13',
    name: 'Alexander Callens',
    position: 'DEF',
    ovr: 75,
    rating: 1620,
    district: 'San Isidro, Lima',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    bio: 'Zaguero zurdo firme, juego aéreo imponente y seguridad.',
    futStats: { rit: 72, tir: 54, pas: 70, reg: 68, def: 79, fis: 84, ovr: 75, reviewsCount: 15 },
    declaredLevel: 'Intermedio'
  },
  {
    id: 'seed_player_14',
    name: "André 'La Culebra' Carrillo",
    position: 'DEL',
    ovr: 77,
    rating: 1670,
    district: 'Barranco, Lima',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Paso largo, desborde por fuera y gran zancada.',
    futStats: { rit: 84, tir: 76, pas: 78, reg: 82, def: 51, fis: 76, ovr: 77, reviewsCount: 17 },
    declaredLevel: 'Avanzado'
  },
  {
    id: 'seed_player_15',
    name: 'Wilder Cartagena',
    position: 'MED',
    ovr: 74,
    rating: 1590,
    district: 'Chorrillos, Lima',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    bio: 'Pivote de marca férrea, coberturas y presión asfixiante.',
    futStats: { rit: 71, tir: 64, pas: 72, reg: 71, def: 78, fis: 81, ovr: 74, reviewsCount: 12 },
    declaredLevel: 'Intermedio'
  },
  {
    id: 'seed_player_16',
    name: 'Marcos López',
    position: 'DEF',
    ovr: 73,
    rating: 1570,
    district: 'Magdalena, Lima',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    bio: 'Lateral zurdo con despliegue físico de ida y vuelta.',
    futStats: { rit: 82, tir: 65, pas: 72, reg: 73, def: 71, fis: 77, ovr: 73, reviewsCount: 11 },
    declaredLevel: 'Intermedio'
  },
  {
    id: 'seed_player_17',
    name: "Carlos 'Pantera' Cáceda",
    position: 'POR',
    ovr: 74,
    rating: 1580,
    district: 'Surco, Lima',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Atajador bajo palos con experiencia y buen achique.',
    futStats: { rit: 70, tir: 50, pas: 68, reg: 69, def: 77, fis: 76, ovr: 74, reviewsCount: 13 },
    declaredLevel: 'Intermedio'
  },
  {
    id: 'seed_player_18',
    name: 'Sergio Peña',
    position: 'MED',
    ovr: 75,
    rating: 1610,
    district: 'San Borja, Lima',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Remate de media distancia y buen pase entre líneas.',
    futStats: { rit: 74, tir: 78, pas: 79, reg: 76, def: 60, fis: 73, ovr: 75, reviewsCount: 15 },
    declaredLevel: 'Intermedio'
  },

  // --- TIER BAJO (~60 OVR, Principiantes / Aficionados casuales) ---
  {
    id: 'seed_player_19',
    name: "Mateo 'Pichanguero' Díaz",
    position: 'DEL',
    ovr: 62,
    rating: 1290,
    district: 'Lince, Lima',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    bio: 'Amante de las pichangas de viernes. Ganas de correr y meter goles.',
    futStats: { rit: 66, tir: 64, pas: 59, reg: 63, def: 38, fis: 60, ovr: 62, reviewsCount: 5 },
    declaredLevel: 'Principiante'
  },
  {
    id: 'seed_player_20',
    name: "Lucas 'El Churre' Paredes",
    position: 'MED',
    ovr: 60,
    rating: 1240,
    district: 'Surco, Lima',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    bio: 'Mediocampista recreativo. Buen toque en corto y juego limpio.',
    futStats: { rit: 61, tir: 58, pas: 65, reg: 62, def: 52, fis: 59, ovr: 60, reviewsCount: 4 },
    declaredLevel: 'Principiante'
  },
  {
    id: 'seed_player_21',
    name: "Rodrigo 'El Muro' Alva",
    position: 'DEF',
    ovr: 61,
    rating: 1260,
    district: 'Jesús María, Lima',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    bio: 'Defensa con ganas de cortar balones y despejar seguro.',
    futStats: { rit: 58, tir: 42, pas: 55, reg: 53, def: 66, fis: 68, ovr: 61, reviewsCount: 6 },
    declaredLevel: 'Principiante'
  },
  {
    id: 'seed_player_22',
    name: "Sebastián 'El Flaco' Romero",
    position: 'POR',
    ovr: 59,
    rating: 1220,
    district: 'Magdalena, Lima',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Arquero aficionado listo para pararse bajo el arco y divertirse.',
    futStats: { rit: 56, tir: 40, pas: 52, reg: 55, def: 63, fis: 62, ovr: 59, reviewsCount: 3 },
    declaredLevel: 'Principiante'
  },
  {
    id: 'seed_player_23',
    name: "Joaquín 'Gambetita' Rojas",
    position: 'DEL',
    ovr: 63,
    rating: 1310,
    district: 'Miraflores, Lima',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    bio: 'Delantero rápido en césped sintético. Buena definición casual.',
    futStats: { rit: 69, tir: 65, pas: 60, reg: 67, def: 35, fis: 58, ovr: 63, reviewsCount: 7 },
    declaredLevel: 'Principiante'
  },
  {
    id: 'seed_player_24',
    name: "Gabriel 'Pase Corto' Vega",
    position: 'MED',
    ovr: 58,
    rating: 1190,
    district: 'Pueblo Libre, Lima',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    bio: 'Volante táctico principiante. Pase de primera y apoyo al compañero.',
    futStats: { rit: 59, tir: 52, pas: 63, reg: 60, def: 51, fis: 57, ovr: 58, reviewsCount: 3 },
    declaredLevel: 'Principiante'
  },
  {
    id: 'seed_player_25',
    name: "Diego 'La Muralla' Castro",
    position: 'DEF',
    ovr: 62,
    rating: 1280,
    district: 'San Miguel, Lima',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Defensa aguerrido en losa deportiva. Despeje de cabeza y quite.',
    futStats: { rit: 60, tir: 44, pas: 56, reg: 55, def: 67, fis: 70, ovr: 62, reviewsCount: 5 },
    declaredLevel: 'Principiante'
  }
];

export async function runSeed() {
  console.log('===========================================================');
  console.log('🌱 SEMILLA DE DATOS DE PRUEBA REALISTAS (MATCHSPORT MVP)');
  console.log('===========================================================');

  // 1. Inicializar SQLite
  const dbSql = await initDatabase();

  // 2. Limpiar semillas de prueba anteriores (deja usuarios reales y admin intactos)
  console.log('\n[Paso 1] Limpiando datos de prueba anteriores...');
  dbSql.run("DELETE FROM users WHERE id LIKE 'seed_player_%'");
  dbSql.run("DELETE FROM user_profiles WHERE user_id LIKE 'seed_player_%'");
  console.log('✅ Datos previos de semilla limpiados de SQLite.');

  // Hash del PIN universal de prueba '1234'
  const defaultPinHash = bcrypt.hashSync('1234', 10);

  // 3. Insertar los 25 jugadores
  console.log('\n[Paso 2] Insertando 25 perfiles de prueba en Lima con coordenadas GPS...');
  
  const counts = { DEL: 0, MED: 0, DEF: 0, POR: 0 };
  const tiers = { alto: 0, medio: 0, bajo: 0 };

  for (const p of SEED_PLAYERS) {
    counts[p.position] = (counts[p.position] || 0) + 1;
    if (p.ovr >= 85) tiers.alto++;
    else if (p.ovr >= 70) tiers.medio++;
    else tiers.bajo++;

    const gps = LIMA_DISTRICTS_GPS[p.district] || { lat: -12.1370, lng: -76.9850 };
    const email = `${p.id}@matchsport.test`;

    const userObj = {
      id: p.id,
      email,
      password: null,
      pinHash: defaultPinHash,
      name: p.name,
      avatar: p.avatar,
      district: p.district,
      bio: p.bio,
      position: p.position,
      role: 'player',
      verifiedDni: true,
      ratingOverall: p.rating,
      likesCount: Math.floor(p.ovr / 4),
      futStats: p.futStats,
      favoriteSports: ['futbol', 'padel'],
      primarySport: 'futbol',
      declaredLevel: p.declaredLevel,
      createdAt: new Date(Date.now() - (30 - parseInt(p.id.slice(-2))) * 86400000).toISOString()
    };

    sqlInsertUser(userObj);

    // Perfiles deportivos en user_profiles (1v1, 2v2, 3v3, 5v5, 7v7)
    const formats = ['1v1', '2v2', '3v3', '5v5', '7v7'];
    for (const fmt of formats) {
      // Pequeñas variaciones de rating por formato
      const delta = fmt === '1v1' ? 0 : fmt === '5v5' ? -15 : -30;
      sqlInsertProfile({
        userId: p.id,
        sportId: 'futbol',
        formatId: fmt,
        rating: p.rating + delta,
        rd: p.ovr >= 85 ? 100 : p.ovr >= 70 ? 130 : 160,
        volatility: 0.06,
        matchesPlayed: p.futStats.reviewsCount,
        wins: Math.round(p.futStats.reviewsCount * (p.ovr / 100)),
        losses: Math.max(0, p.futStats.reviewsCount - Math.round(p.futStats.reviewsCount * (p.ovr / 100))),
        declaredLevel: p.declaredLevel,
        lastMatchDate: new Date(Date.now() - Math.floor(Math.random() * 5 + 1) * 86400000).toISOString()
      });
    }

    // Perfil de Pádel 2v2
    sqlInsertProfile({
      userId: p.id,
      sportId: 'padel',
      formatId: '2v2',
      rating: Math.max(1000, p.rating - 150),
      rd: 150,
      volatility: 0.06,
      matchesPlayed: 4,
      wins: 2,
      losses: 2,
      declaredLevel: p.declaredLevel,
      lastMatchDate: new Date(Date.now() - 4 * 86400000).toISOString()
    });
  }

  // Forzar guardado inmediato en matchsport.db
  forceSave();

  console.log('✅ 25 jugadores y sus respectivos perfiles deportivos persistidos en SQLite.\n');

  // Resumen visual en consola
  console.log('--- RESUMEN DE LA SEMILLA ---');
  console.log(`📊 Total Jugadores: ${SEED_PLAYERS.length}`);
  console.log(`⚽ Posiciones: DEL (${counts.DEL}) | MED (${counts.MED}) | DEF (${counts.DEF}) | POR (${counts.POR})`);
  console.log(`🏆 Rangos OVR: Alto ~90 OVR (${tiers.alto}) | Medio ~75 OVR (${tiers.medio}) | Bajo ~60 OVR (${tiers.bajo})`);
  console.log(`📍 Radio Geográfico: Distribuido en 12 distritos de Lima dentro de 10 km`);
  console.log(`🔑 PIN Universal para Pruebas: "1234" (hasheado con bcryptjs)`);
  console.log('===========================================================');
  console.log('🎉 SEMILLA COMPLETADA CON ÉXITO');
  console.log('===========================================================');
}

// Ejecución directa si se invoca con `node server/seed.js`
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runSeed().then(() => process.exit(0)).catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  });
}
