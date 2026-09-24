---
name: backend-server
description: >-
  Especialista en desarrollo backend con Node.js, Express, Socket.IO y persistencia de datos (SQLite/PostgreSQL) para MatchSport.
  Activar este skill para la lógica de matchmaking, cálculo Glicko-2, endpoints REST, salas y eventos en tiempo real bajo server/.
---

# Skill: Especialista Backend Server (Node.js + Socket.IO + SQLite)

Este skill define los estándares y procedimientos para desarrollar el servidor backend en `server/`.

## 1. Arquitectura y Stack del Servidor
- **Entorno:** Node.js (módulos ECMAScript `import/export`).
- **Framework Web:** Express con endpoints REST (`/api/*`) y soporte CORS abierto para LAN/móviles.
- **Tiempo Real:** Socket.IO con pingInterval optimizado (2500ms) y pingTimeout (5000ms).
- **Persistencia:** Capa de abstracción en `db.js` y `database.js` sobre SQLite (`sql.js` / archivo persistido) y migrable a PostgreSQL.
- **Logging Estructurado:** Winston logger (`logger.js`) con rotación y niveles `info`, `warn`, `error`.

## 2. Motor de Matchmaking y Rating Competitivo
- **Colas y Emparejamiento (`matchmakingEngine.js`):**
  - Gestión de colas independientes por deporte, formato y distrito o radio geográfico.
  - Búsqueda con expansión gradual de rango de MMR / Glicko conforme aumenta el tiempo en cola.
  - Creación de lobby temporal con cuenta regresiva de 20 segundos para confirmación de jugadores (`accept_match`).
- **Algoritmo Glicko-2 (`glicko2.js`):**
  - Manejo de Rating ($R$), Desviación de Rating ($RD$) y Volatilidad ($\sigma$).
  - Actualización atómica de ratings post-partido respetando resultados de confirmación dual o resolución de disputas.

## 3. WebSockets y Gestión de Estado en Vivo
- **Control de Conexiones:** Mapeo de `userId` a `socketId` (`userSocketMap`).
- **Tolerancia a Desconexiones:** Temporizadores de gracia (`disconnectGraceTimers`) de 25 segundos para permitir reconexiones en redes móviles inestables sin perder el slot en sala o partida.
- **Salas de Partido:** Chat de lobby, sincronización de marcador en vivo y flujo de verificación de resultados.
- **Sincronización con Admin Web:** Emisión de eventos administrativos como `onlineUsersUpdate` y actualizaciones de partidos activos.

## 4. Persistencia y Seguridad
- **Autenticación y PIN:** Hash de credenciales mediante `bcryptjs`.
- **Integridad de Datos:** Uso de `forceSave()` tras escrituras críticas para garantizar persistencia síncrona en disco.
- **Seed y Catálogos:** Inicialización de distritos (`peru_districts.json`), deportes preconfigurados y formatos permitidos.
