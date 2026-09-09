/**
 * database.js — Capa de persistencia SQLite para MatchSport MVP
 * 
 * Usa sql.js (SQLite compilado a WebAssembly) para persistir datos entre reinicios.
 * Expone funciones síncronas para mantener compatibilidad con la API existente de db.js.
 * 
 * Archivo de base de datos: ./matchsport.db (raíz del proyecto)
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'matchsport.db');

let _db = null;
let _SQL = null;
let _initialized = false;

// Auto-save: guardar el archivo .db cada N ms tras cambios
let _saveTimeout = null;
const SAVE_DEBOUNCE_MS = 1000;

function scheduleSave() {
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => {
    if (_db) {
      const data = _db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    }
  }, SAVE_DEBOUNCE_MS);
}

function forceSave() {
  if (_saveTimeout) clearTimeout(_saveTimeout);
  if (_db) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Inicializa la base de datos SQLite.
 * Debe llamarse UNA VEZ al inicio del servidor (await initDatabase()).
 */
export async function initDatabase() {
  if (_initialized) return _db;

  _SQL = await initSqlJs();

  // Si ya existe el archivo, cargarlo; si no, crear uno nuevo
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new _SQL.Database(fileBuffer);
    console.log('[SQLite] Base de datos cargada desde', DB_PATH);
  } else {
    _db = new _SQL.Database();
    console.log('[SQLite] Nueva base de datos creada');
  }

  // Optimizaciones de rendimiento
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA synchronous = NORMAL');
  _db.run('PRAGMA foreign_keys = ON');

  // Crear tablas si no existen
  createTables();

  _initialized = true;

  // Guardar al salir
  process.on('exit', forceSave);
  process.on('SIGINT', () => { forceSave(); process.exit(0); });
  process.on('SIGTERM', () => { forceSave(); process.exit(0); });

  return _db;
}

function createTables() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      pin_hash TEXT,
      name TEXT NOT NULL,
      avatar TEXT,
      district TEXT,
      bio TEXT,
      position TEXT DEFAULT 'DEL',
      role TEXT DEFAULT 'player',
      verified_dni INTEGER DEFAULT 0,
      rating_overall REAL DEFAULT 1500,
      likes_count INTEGER DEFAULT 0,
      fut_stats_json TEXT DEFAULT '{}',
      favorite_sports_json TEXT DEFAULT '["futbol"]',
      primary_sport TEXT DEFAULT 'futbol',
      declared_level TEXT DEFAULT 'Intermedio',
      created_at TEXT
    )
  `);

  // Migración segura: verificar y añadir columna pin_hash si no existe
  try {
    const tableInfo = _db.exec("PRAGMA table_info(users)");
    const cols = tableInfo[0]?.values?.map(v => v[1]) || [];
    if (!cols.includes('pin_hash')) {
      _db.run('ALTER TABLE users ADD COLUMN pin_hash TEXT');
      console.log('[SQLite] Columna pin_hash agregada a tabla users');
    }
  } catch (e) {
    console.error('[SQLite] Error verificando columna pin_hash:', e.message);
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT NOT NULL,
      sport_id TEXT NOT NULL,
      format_id TEXT NOT NULL,
      rating REAL DEFAULT 1400,
      rd REAL DEFAULT 300,
      volatility REAL DEFAULT 0.06,
      matches_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      declared_level TEXT DEFAULT 'Intermedio',
      last_match_date TEXT,
      PRIMARY KEY (user_id, sport_id, format_id)
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      sport_id TEXT NOT NULL,
      format_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      is_1v1 INTEGER DEFAULT 0,
      data_json TEXT DEFAULT '{}',
      created_at TEXT
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT,
      from_user_id TEXT,
      to_user_id TEXT,
      sportsmanship INTEGER,
      skill INTEGER,
      comment TEXT,
      data_json TEXT DEFAULT '{}',
      created_at TEXT
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS fut_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT,
      reviewer_id TEXT,
      target_user_id TEXT,
      ratings_json TEXT DEFAULT '{}',
      created_at TEXT
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value_json TEXT DEFAULT '{}'
    )
  `);

  // Índices para rendimiento
  _db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_reviews_to ON reviews(to_user_id)');

  forceSave();
  console.log('[SQLite] Tablas e índices creados/verificados');
}

// =============================================
// CRUD DE USUARIOS
// =============================================

export function sqlGetUser(id) {
  const row = _db.exec('SELECT * FROM users WHERE id = ?', [id]);
  if (row.length === 0 || row[0].values.length === 0) return null;
  return rowToUser(row[0]);
}

export function sqlGetUserByEmail(email) {
  const row = _db.exec('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (row.length === 0 || row[0].values.length === 0) return null;
  return rowToUser(row[0]);
}

export function sqlGetUserByName(name) {
  const row = _db.exec('SELECT * FROM users WHERE LOWER(name) = LOWER(?)', [name]);
  if (row.length === 0 || row[0].values.length === 0) return null;
  return rowToUser(row[0]);
}

export function sqlGetAllUsers() {
  const result = _db.exec('SELECT * FROM users');
  if (result.length === 0) return [];
  return result[0].values.map((_, i) => rowToUser(result[0], i));
}

export function sqlInsertUser(user) {
  _db.run(`
    INSERT OR REPLACE INTO users 
    (id, email, password, pin_hash, name, avatar, district, bio, position, role, verified_dni,
     rating_overall, likes_count, fut_stats_json, favorite_sports_json, primary_sport, declared_level, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    user.id,
    user.email,
    user.password || null,
    user.pinHash || user.pin_hash || null,
    user.name,
    user.avatar || null,
    user.district || null,
    user.bio || null,
    user.position || 'DEL',
    user.role || 'player',
    user.verifiedDni ? 1 : 0,
    user.ratingOverall || 1500,
    user.likesCount || 0,
    JSON.stringify(user.futStats || {}),
    JSON.stringify(user.favoriteSports || ['futbol']),
    user.primarySport || 'futbol',
    user.declaredLevel || 'Intermedio',
    user.createdAt || new Date().toISOString()
  ]);
  scheduleSave();
}

export function sqlUpdateUser(user) {
  sqlInsertUser(user); // INSERT OR REPLACE maneja ambos
}

export function sqlGetUserCount() {
  const result = _db.exec('SELECT COUNT(*) FROM users');
  return result[0]?.values[0]?.[0] || 0;
}

// =============================================
// CRUD DE PERFILES (Glicko por deporte+formato)
// =============================================

export function sqlGetProfile(userId, sportId, formatId) {
  const result = _db.exec(
    'SELECT * FROM user_profiles WHERE user_id = ? AND sport_id = ? AND format_id = ?',
    [userId, sportId, formatId]
  );
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToProfile(result[0]);
}

export function sqlGetProfilesByUser(userId) {
  const result = _db.exec('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  if (result.length === 0) return [];
  return result[0].values.map((_, i) => rowToProfile(result[0], i));
}

export function sqlGetProfilesBySportFormat(sportId, formatId) {
  const result = _db.exec(
    'SELECT * FROM user_profiles WHERE sport_id = ? AND format_id = ?',
    [sportId, formatId]
  );
  if (result.length === 0) return [];
  return result[0].values.map((_, i) => rowToProfile(result[0], i));
}

export function sqlInsertProfile(profile) {
  _db.run(`
    INSERT OR REPLACE INTO user_profiles
    (user_id, sport_id, format_id, rating, rd, volatility, matches_played, wins, losses, declared_level, last_match_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    profile.userId,
    profile.sportId,
    profile.formatId,
    profile.rating || 1400,
    profile.rd || 300,
    profile.volatility || 0.06,
    profile.matchesPlayed || 0,
    profile.wins || 0,
    profile.losses || 0,
    profile.declaredLevel || 'Intermedio',
    profile.lastMatchDate || null
  ]);
  scheduleSave();
}

// =============================================
// CRUD DE PARTIDOS
// =============================================

export function sqlInsertMatch(match) {
  _db.run(`
    INSERT OR REPLACE INTO matches (id, sport_id, format_id, status, is_1v1, data_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    match.id,
    match.sportId,
    match.formatId,
    match.status || 'active',
    match.is1v1 ? 1 : 0,
    JSON.stringify(match),
    match.createdAt || new Date().toISOString()
  ]);
  scheduleSave();
}

export function sqlGetMatch(matchId) {
  const result = _db.exec('SELECT data_json FROM matches WHERE id = ?', [matchId]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return JSON.parse(result[0].values[0][0]);
}

export function sqlGetAllMatches() {
  const result = _db.exec('SELECT data_json FROM matches ORDER BY created_at DESC');
  if (result.length === 0) return [];
  return result[0].values.map(row => JSON.parse(row[0]));
}

export function sqlGetMatchesByStatus(status) {
  const result = _db.exec('SELECT data_json FROM matches WHERE status = ?', [status]);
  if (result.length === 0) return [];
  return result[0].values.map(row => JSON.parse(row[0]));
}

export function sqlUpdateMatchStatus(matchId, status) {
  _db.run('UPDATE matches SET status = ? WHERE id = ?', [status, matchId]);
  scheduleSave();
}

export function sqlGetMatchCount() {
  const result = _db.exec('SELECT COUNT(*) FROM matches');
  return result[0]?.values[0]?.[0] || 0;
}

// =============================================
// CRUD DE RESEÑAS
// =============================================

export function sqlInsertReview(review) {
  _db.run(`
    INSERT INTO reviews (match_id, from_user_id, to_user_id, sportsmanship, skill, comment, data_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    review.matchId || null,
    review.fromUserId || null,
    review.toUserId || null,
    review.sportsmanship || 0,
    review.skill || 0,
    review.comment || '',
    JSON.stringify(review),
    review.createdAt || new Date().toISOString()
  ]);
  scheduleSave();
}

export function sqlGetUserReviews(userId) {
  const result = _db.exec('SELECT data_json FROM reviews WHERE to_user_id = ?', [userId]);
  if (result.length === 0) return [];
  return result[0].values.map(row => JSON.parse(row[0]));
}

export function sqlInsertFutReview(review) {
  _db.run(`
    INSERT INTO fut_reviews (match_id, reviewer_id, target_user_id, ratings_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [
    review.matchId || null,
    review.reviewerId || null,
    review.targetUserId || null,
    JSON.stringify(review.ratings || review),
    review.createdAt || new Date().toISOString()
  ]);
  scheduleSave();
}

// =============================================
// CONFIGURACIÓN (cuestionarios, deportes)
// =============================================

export function sqlGetConfig(key) {
  const result = _db.exec('SELECT value_json FROM app_config WHERE key = ?', [key]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return JSON.parse(result[0].values[0][0]);
}

export function sqlSetConfig(key, value) {
  _db.run(`
    INSERT OR REPLACE INTO app_config (key, value_json) VALUES (?, ?)
  `, [key, JSON.stringify(value)]);
  scheduleSave();
}

// =============================================
// UTILIDADES DE CONVERSIÓN
// =============================================

function rowToUser(resultSet, rowIndex = 0) {
  const cols = resultSet.columns;
  const vals = resultSet.values[rowIndex];
  const obj = {};
  cols.forEach((col, i) => { obj[col] = vals[i]; });

  return {
    id: obj.id,
    email: obj.email,
    password: obj.password,
    pinHash: obj.pin_hash || null,
    name: obj.name,
    avatar: obj.avatar,
    district: obj.district,
    bio: obj.bio,
    position: obj.position || 'DEL',
    role: obj.role || 'player',
    verifiedDni: !!obj.verified_dni,
    ratingOverall: obj.rating_overall || 1500,
    likesCount: obj.likes_count || 0,
    futStats: obj.fut_stats_json ? JSON.parse(obj.fut_stats_json) : {},
    favoriteSports: obj.favorite_sports_json ? JSON.parse(obj.favorite_sports_json) : ['futbol'],
    primarySport: obj.primary_sport || 'futbol',
    declaredLevel: obj.declared_level || 'Intermedio',
    createdAt: obj.created_at
  };
}

function rowToProfile(resultSet, rowIndex = 0) {
  const cols = resultSet.columns;
  const vals = resultSet.values[rowIndex];
  const obj = {};
  cols.forEach((col, i) => { obj[col] = vals[i]; });

  return {
    userId: obj.user_id,
    sportId: obj.sport_id,
    formatId: obj.format_id,
    rating: obj.rating || 1400,
    rd: obj.rd || 300,
    volatility: obj.volatility || 0.06,
    matchesPlayed: obj.matches_played || 0,
    wins: obj.wins || 0,
    losses: obj.losses || 0,
    declaredLevel: obj.declared_level || 'Intermedio',
    lastMatchDate: obj.last_match_date
  };
}

/** Fuerza el guardado inmediato al disco */
export { forceSave };

/** Verifica si la DB tiene datos de usuarios semilla */
export function sqlHasSeedData() {
  const result = _db.exec("SELECT COUNT(*) FROM users WHERE id LIKE 'demo_user_%'");
  return (result[0]?.values[0]?.[0] || 0) > 0;
}
