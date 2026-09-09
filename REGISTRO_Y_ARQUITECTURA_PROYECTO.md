# 📋 Registro y Arquitectura del Proyecto — MatchSport MVP

> **Última actualización:** 2026-09-08
> Este documento se mantiene como referencia viva del proyecto. Cada fase implementada se documenta aquí.

---

## 🏗️ Arquitectura General

```
MATCHMAKING_DEPORTIVO_WEB/
├── server/                    # Backend Node.js
│   ├── server.js              # Express + Socket.IO (punto de entrada)
│   ├── db.js                  # Capa de datos (singleton Database)
│   ├── matchmakingEngine.js   # Motor de emparejamiento Glicko-2
│   ├── glicko2.js             # Algoritmo de rating Glicko-2
│   └── peru_districts.json    # Catálogo de distritos de Perú
├── src/                       # Frontend React + Vite
│   ├── App.jsx                # Componente raíz
│   ├── main.jsx               # Entry point React
│   ├── components/            # 18 componentes UI
│   │   ├── AuthModal.jsx          # Login/Registro
│   │   ├── RadarScreen.jsx        # Pantalla principal de búsqueda
│   │   ├── MatchAcceptModal.jsx   # Modal de aceptación 20s (estilo Dota 2)
│   │   ├── ChatRoom.jsx           # Sala de partido con chat
│   │   ├── LobbyRoomModal.jsx     # Salas privadas de convocatoria
│   │   ├── PlayerCardFUT.jsx      # Carta estilo FIFA/FUT
│   │   ├── LeaderboardModal.jsx   # Rankings por deporte/formato
│   │   ├── AdminDashboard.jsx     # Panel del administrador/dueño
│   │   ├── MatchReportModal.jsx   # Reporte de resultado
│   │   ├── UserProfileModal.jsx   # Perfil completo del jugador
│   │   ├── SportSelector.jsx      # Selector de deportes
│   │   ├── FormatSelectorModal.jsx# Selector de formato (1v1, 2v2, etc.)
│   │   ├── QuestionnaireModal.jsx # Cuestionario de nivel
│   │   ├── MapZoneModal.jsx       # Mapa de zona de búsqueda
│   │   ├── MatchFoundModal.jsx    # Notificación de match encontrado
│   │   ├── LiveMatchToast.jsx     # Toast de partidos en vivo
│   │   ├── PersistentQueueBar.jsx # Barra de búsqueda persistente
│   │   └── JoinLobbyModal.jsx     # Modal para unirse a sala
│   ├── services/              # Servicios/utilidades frontend
│   ├── styles/                # CSS
│   ├── data/                  # Datos estáticos del frontend
│   └── utils/                 # Utilidades
├── index.html                 # HTML principal (Vite)
├── vite.config.js             # Configuración de Vite
├── package.json               # Dependencias y scripts
├── capacitor.config.json      # Configuración Capacitor (Android)
└── android/                   # Proyecto nativo Android
```

---

## ⚙️ Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | v22.17.0 |
| Frontend | React + Vite | React 18.3, Vite 6.2 |
| Backend | Express | v4.21 |
| WebSocket | Socket.IO | v4.8 |
| Rating | Glicko-2 (implementación propia) | — |
| Empaquetado móvil | Capacitor | v8.5 |
| Base de datos | **En memoria (Maps)** → **SQLite (Fase 1)** | — |

---

## 📊 Modelo de Datos Actual (Pre-SQLite)

### Clase `Database` (`server/db.js`)

**Almacenamiento en memoria (Maps):**
| Propiedad | Tipo | Descripción |
|---|---|---|
| `users` | `Map<id, user>` | Usuarios registrados y semilla demo |
| `profiles` | `Map<key, profile>` | Perfiles Glicko por usuario+deporte+formato |
| `matches` | `Map<id, match>` | Partidos (activos, finalizados, disputados) |
| `lobbies` | `Map<code, lobby>` | Salas privadas de convocatoria |
| `challenges` | `Array` | Cola de búsqueda activa (matchmaking) |
| `reviews` | `Array` | Reseñas de deportividad |
| `futReviews` | `Array` | Valoraciones FUT card |
| `sports` | `Array` | Deportes configurados (fútbol, pádel, básquet, tenis) |
| `questionnaires` | `Object` | Cuestionarios por deporte |

### Esquema de un `user`:
```js
{
  id, email, password, name, avatar, district, bio,
  position, role, verifiedDni, ratingOverall, likesCount,
  favoriteSports, primarySport,
  futStats: { rit, tir, pas, reg, def, fis, ovr, reviewsCount },
  createdAt
}
```

### Esquema de un `profile` (Glicko por deporte+formato):
```js
{
  userId, sportId, formatId,
  rating, rd, volatility,
  matchesPlayed, wins, losses, declaredLevel
}
```

### API Pública de `Database` (40 métodos):
- **Usuarios:** `getUser`, `getUserByEmail`, `loginUser`, `createUser`, `updateUserFutStats`
- **Perfiles:** `getProfile`, `setProfile`, `getProfileKey`
- **Matchmaking:** `addChallenge`, `getChallengeByUserId`, `removeChallengeByUserId`, `removeChallengeById`
- **Partidos:** `createMatch`, `getMatch`, `getMatchForUser`, `cancelMatch`, `removePlayerFromMatch`, `convertMatchToLobby`, `startMatchTimer`, `addChatMessage`, `getUserMatchHistory`, `getAllMatches`
- **Reseñas:** `addReview`, `getUserReviews`
- **Ranking:** `getLeaderboard`
- **Config/Admin:** `getSports`, `getQuestionnaire`, `saveQuestionnaire`, `getAdminMetrics`, `toggleSportFormat`
- **Lobbies:** `createLobby`, `getLobby`, `joinLobby`, `leaveLobby`, `findLobbyByUserId`, `cleanUserFromAllLobbies`, `getUserActiveLobby`, `leaveAllLobbiesForUser`, `toggleLobbyReady`, `switchLobbyTeam`, `changeLobbyFormat`, `fillLobbyDemos`, `convertLobbyToMatch`
- **Privado:** `_updateLobbyStatus`

---

## 🔄 Comunicación en Tiempo Real (Socket.IO)

### Eventos Principales:
| Evento | Dirección | Descripción |
|---|---|---|
| `userConnected` | Cliente → Servidor | Registra usuario en el mapa de conectados |
| `startSearch` | Cliente → Servidor | Inicia búsqueda de rival |
| `cancelSearch` | Cliente → Servidor | Cancela búsqueda activa |
| `matchPromptAcceptance` | Servidor → Cliente | Notifica match encontrado (20s para aceptar) |
| `acceptMatch` / `declineMatch` | Cliente → Servidor | Respuesta a la confirmación |
| `matchFound` | Servidor → Cliente | Match confirmado, ir a sala de partido |
| `matchAcceptanceFailed` | Servidor → Cliente | Alguien rechazó o tiempo expiró |
| `sendChatMessage` | Cliente → Servidor | Envía mensaje en sala de partido |
| `reportResult` | Cliente → Servidor | Reporta resultado del partido |
| `onlineUsersUpdate` | Servidor → Todos | Actualiza lista de usuarios conectados |

---

## 📝 Historial de Cambios

### Fase 1 — Persistencia SQLite ✅ COMPLETADA (2026-09-08)
- **Estado:** ✅ Completada y verificada
- **Librería:** `sql.js` v1.x (SQLite compilado a WebAssembly, sin dependencia nativa)
- **Archivo de base de datos:** `matchsport.db` (raíz del proyecto, ~86KB con datos semilla)
- **Estrategia:** Caché en memoria (Maps) + persistencia SQLite. Lecturas desde caché, escrituras sincronizadas a SQLite con auto-save debounced (1s).
  - **Datos persistidos:** Usuarios, perfiles Glicko, partidos, reseñas, configuración (deportes, cuestionarios).
  - **Datos en memoria pura:** Challenges (cola de matchmaking), lobbies (salas en vivo) — volátiles por naturaleza.

#### Archivos creados/modificados:
| Archivo | Acción | Descripción |
|---|---|---|
| `server/database.js` | **NUEVO** | Capa SQLite: init, tablas, CRUD tipado, auto-save |
| `server/db.js` | **MODIFICADO** | Añadido `initAsync()`, métodos `_persist*()` para sincronizar con SQLite |
| `server/server.js` | **MODIFICADO** | Arranque asíncrono: `await db.initAsync()` antes de `server.listen()` |
| `scripts/test_sqlite_persistence.js` | **NUEVO** | Test automatizado de persistencia |
| `.gitignore` | **MODIFICADO** | Añadidos `matchsport.db` y `logs/` |

#### Esquema SQLite (`matchsport.db`):
```sql
users (id PK, email UNIQUE, password, name, avatar, district, bio, position, role, 
       verified_dni, rating_overall, likes_count, fut_stats_json, favorite_sports_json,
       primary_sport, declared_level, created_at)

user_profiles (user_id + sport_id + format_id PK compuesta, rating, rd, volatility,
               matches_played, wins, losses, declared_level, last_match_date)

matches (id PK, sport_id, format_id, status, is_1v1, data_json, created_at)

reviews (id AUTOINCREMENT, match_id, from_user_id, to_user_id, sportsmanship, skill,
         comment, data_json, created_at)

fut_reviews (id AUTOINCREMENT, match_id, reviewer_id, target_user_id, ratings_json, created_at)

app_config (key PK, value_json)
```

#### Verificación:
- ✅ Servidor arranca con SQLite: 13 usuarios demo, 52 perfiles, 2 partidos
- ✅ Usuario nuevo creado via API persiste tras reinicio del servidor
- ✅ Login, leaderboard, historial de partidos, métricas admin — todos funcionan correctamente
- ✅ API pública de `Database` (40+ métodos) conservada con firmas idénticas

---

### Fase 2 — Login Simple con Identidad Persistente (Nombre + PIN) ✅ COMPLETADA (2026-09-08)
- **Estado:** ✅ Completada y verificada
- **Librería Criptográfica:** `bcryptjs` (implementación de bcrypt en JavaScript puro, sin dependencias nativas C++ para máxima portabilidad en Windows)
- **Concepto:** En lugar de forzar al jugador a usar correos largos y contraseñas complejas, puede crear su perfil e ingresar en segundos con:
  - **Nombre / Apodo** (ej: `"Paolo9"`, `"CrackSurco"`)
  - **PIN numérico de 4 dígitos** (ej: `"7777"`)
- **Seguridad:** El PIN **nunca se almacena en texto plano**. Se genera un hash unidireccional con salt mediante `bcryptjs.hashSync(pin, 10)` y se almacena en la columna `pin_hash` de SQLite.
- **Persistencia de Sesión:**
  - **Cliente:** `localStorage.getItem('matchsport_user')` mantiene la sesión activa entre recargas (`F5`) y cierres del navegador móvil.
  - **Servidor:** SQLite almacena el `pin_hash` y todos los atributos/cartas FUT.
  - **Tiempo Real:** Socket.IO vincula los eventos de cola y salas mediante el **`userId` persistente** (no el `socket.id` volátil).

#### Archivos creados/modificados:
| Archivo | Acción | Descripción |
|---|---|---|
| `server/database.js` | **MODIFICADO** | Añadida columna `pin_hash` con migración segura, índice `idx_users_name` y método `sqlGetUserByName(name)` |
| `server/db.js` | **MODIFICADO** | Métodos `getUserByName()`, `loginWithPin()` y `registerWithPin()` con validación y hash `bcryptjs` |
| `server/server.js` | **MODIFICADO** | Endpoints `POST /api/auth/pin-login`, `POST /api/auth/pin-register`, `GET /api/auth/check-name/:name`, `GET /api/user/:userId` |
| `src/components/AuthModal.jsx` | **MODIFICADO** | Nueva vista destacada de acceso rápido por Nombre + PIN (4 dígitos), tabs conmutables y selector deportivo |
| `scripts/test_pin_auth.js` | **NUEVO** | Suite de tests automatizados de autenticación por PIN, hash bcrypt y persistencia |
| `scripts/test_pin_api_endpoints.js` | **NUEVO** | Suite de tests HTTP de endpoints REST de la Fase 2 |

#### Nuevos Endpoints REST:
| Método | Endpoint | Entrada | Salida | Descripción |
|---|---|---|---|---|
| `POST` | `/api/auth/pin-login` | `{ name, pin }` | `{ user }` | Inicia sesión con Nombre + PIN (4 dígitos) |
| `POST` | `/api/auth/pin-register` | `{ name, pin, district, position, primarySport, ... }` | `{ user }` | Registra nuevo jugador con PIN hasheado |
| `GET` | `/api/auth/check-name/:name` | URL param `name` | `{ exists: boolean, name }` | Verifica disponibilidad de un apodo en tiempo real |
| `GET` | `/api/user/:userId` | URL param `userId` | `{ user }` | Obtiene el perfil completo y estadísticas FUT actualizadas |

#### Verificación Realizada:
- ✅ Hash seguro con bcrypt verificado (`pin_hash` inicia con `$2b$10$...`, nunca texto plano).
- ✅ Login con PIN correcto exitoso (recupera carta FUT, rating y posición).
- ✅ Rechazo con PIN incorrecto (retorna 401 con mensaje descriptivo).
- ✅ Rechazo con formato inválido (el PIN debe tener exactamente 4 dígitos).
- ✅ Rechazo ante nombres duplicados.
- ✅ Persistencia confirmada entre reinicios de procesos independientes de Node.js.
- ✅ Compilación de producción (`npm run build`) completada con éxito.


