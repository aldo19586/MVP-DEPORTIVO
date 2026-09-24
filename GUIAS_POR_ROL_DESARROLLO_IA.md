# 🚀 GUÍAS DE TRABAJO INDIVIDUALIZADAS POR ROL (EQUIPO + AGENTES IA)
## Protocolo Operativo para Desarrollo Desacoplado y Despliegue de MatchSport

> **Objetivo:** Cada miembro del equipo recibe su guía especializada con sus responsabilidades, archivos asignados, reglas de no colisión y el **Prompt Maestro** para configurar su Agente de IA (Cursor, Claude Code, Windsurf, Antigravity, Copilot, etc.), incluyendo la estrategia integral de **Despliegue y DevOps**.

---

## 📑 ÍNDICE DE GUÍAS

1. [Reglas Generales de Trabajo en Equipo con Agentes IA](#0-reglas-generales-de-trabajo-en-equipo-con-agentes-ia)
2. [⚙️ Guía para Dev 1: Backend, Base de Datos & Seguridad (Backend Lead)](#1-️-guía-para-dev-1-backend-base-de-datos--seguridad)
3. [⚡ Guía para Dev 2: Tiempo Real, Algoritmos & Sockets (Real-Time Engineer)](#2-⚡-guía-para-dev-2-tiempo-real-algoritmos--sockets)
4. [📱 Guía para Dev 3: Frontend Móvil del Jugador (Mobile Lead - React & Capacitor)](#3--guía-para-dev-3-frontend-móvil-del-jugador)
5. [🎨 Guía para Miembro 4: UI/UX & Marketing (Líder de Producto & Crecimiento)](#4--guía-para-miembro-4-uiux--marketing)
6. [☁️ Guía para DevOps: Infraestructura, CI/CD & Despliegue de la App (Release Engineer)](#5-️-guía-para-devops-infraestructura-cicd--despliegue-de-la-app)
7. [🔄 Resumen del Protocolo de Integración y Pase a Producción](#6--resumen-del-protocolo-de-integración-y-pase-a-producción)

---

## 0. REGLAS GENERALES DE TRABAJO EN EQUIPO CON AGENTES IA

1. **La Ley del Aislamiento de Carpetas:**
   - **Dev 1** trabaja en `apps/backend/` (Auth, REST, DB) y `apps/admin-web/`.
   - **Dev 2** trabaja en `apps/backend/src/sockets/`, `apps/backend/src/services/` y `packages/shared/`.
   - **Dev 3** trabaja exclusivamente en `apps/player-mobile/`.
   - **Miembro 4** trabaja en Figma, recursos gráficos y estrategias de canchas.
   - **DevOps** trabaja en Dockerfiles, `.github/workflows/`, configuración de dominios, SSL y compilación nativa Android/iOS.
2. **La Fuente de la Verdad es `packages/shared/`:**
   - Nadie inventa nombres de eventos Socket ni campos de base de datos sin acordarlo primero en `packages/shared/socketEvents.js` o en el esquema de datos.
3. **Validación Antes de Merge:**
   - Antes de hacer Pull Request o fusionar código, cada desarrollador debe ejecutar su prueba local y el comando `npm run build`.

---

## 1. ⚙️ GUÍA PARA DEV 1: BACKEND, BASE DE DATOS & SEGURIDAD

### 🎯 Objetivo Principal
Garantizar la seguridad, persistencia y estabilidad de la API REST, autenticación por PIN + JWT, rate limiting y el panel administrativo web.

### 📂 Tu Zona de Trabajo
* **Archivos que debes editar:**
  * `apps/backend/src/controllers/*` (Lógica de endpoints REST)
  * `apps/backend/src/middlewares/*` (Auth JWT, Rate Limit, Validación con Zod)
  * `apps/backend/src/models/*` (Esquemas de base de datos, Prisma / SQLite / PostgreSQL)
  * `apps/backend/src/config/*` (Variables de entorno, CORS, DB connection)
  * `apps/admin-web/*` (Panel de administración desktop)
* ⛔ **Archivos que NO debes tocar:**
  * `apps/player-mobile/*` (Responsabilidad de Dev 3)
  * `apps/backend/src/sockets/*` (Responsabilidad de Dev 2)

### 📋 Tus Tareas por Etapa
* **Etapa 1:**
  1. Configurar conexión DB y esquema de usuarios (`users`, `user_profiles`, `matches`).
  2. Implementar endpoint `/api/auth/login-pin` (verificar PIN con `bcryptjs`, emitir JWT).
  3. Configurar middleware `requireAuth` y `requireAdminRole`.
  4. Agregar protección contra fuerza bruta con `express-rate-limit`.
* **Etapa 2:**
  1. Crear endpoints CRUD de deportes, canchas y distritos.
  2. Implementar almacenamiento de historial de partidos y estadísticas Glicko.
* **Etapa 3:**
  1. Construir la interfaz de `apps/admin-web` (Live Monitor de usuarios, auditoría de jugadores y panel de resolución de disputas).

### 🤖 Prompt Maestro para el Agente IA de Dev 1
```text
Actúa como Backend Lead y Especialista en Seguridad Node.js/PostgreSQL en el proyecto MatchSport.
Tu zona exclusiva de trabajo es: 'apps/backend/' (rutas REST, middlewares, base de datos) y 'apps/admin-web/'.
REGLAS ESTRICTAS:
1. No toques 'apps/player-mobile/' ni 'apps/backend/src/sockets/'.
2. La autenticación de jugadores se basa en Nombre + PIN (4 dígitos) hasheado con bcryptjs y retorno de JWT.
3. El superadmin requiere Email + Contraseña y emite un JWT con { role: 'admin' }.
4. Aplica rate limiting estricto y validaciones con Zod en todas las entradas HTTP.
5. Todo endpoint debe devolver respuestas consistentes: { success: boolean, data?: any, error?: string }.
Sigue las pautas de clean architecture y genera tests unitarios en 'scripts/test_*.js' para validar cada endpoint antes de considerarlo completado.
```

---

## 2. ⚡ GUÍA PARA DEV 2: TIEMPO REAL, ALGORITMOS & SOCKETS

### 🎯 Objetivo Principal
Hacer que la experiencia en tiempo real sea mágica, rápida y resiliente: radar de emparejamiento, algoritmo Glicko-2, salas de convocatoria y tolerancia a microcortes de red.

### 📂 Tu Zona de Trabajo
* **Archivos que debes editar:**
  * `packages/shared/socketEvents.js` (Diccionario unificado de eventos)
  * `apps/backend/src/sockets/*` (Handlers de Socket.IO: matchmaking, lobbies, chat)
  * `apps/backend/src/services/MatchmakingService.js` (Cola, Haversine, ventana dinámica)
  * `apps/backend/src/services/GlickoService.js` (Cálculo matemático de rating)
  * `apps/backend/src/services/LobbyService.js` (Salas privadas y PIN)
* ⛔ **Archivos que NO debes tocar:**
  * `apps/player-mobile/src/components/*` (Responsabilidad de Dev 3)
  * `apps/backend/src/controllers/*` (Responsabilidad de Dev 1)

### 📋 Tus Tareas por Etapa
* **Etapa 1:**
  1. Centralizar y documentar todos los eventos en `packages/shared/socketEvents.js`.
  2. Implementar middleware de autenticación Socket.IO validando el JWT emitido por Dev 1.
  3. Validar el período de gracia (Grace Period de 25s) para mantener al jugador en sala ante microdesconexiones.
* **Etapa 2:**
  1. Optimizar el algoritmo de emparejamiento: cálculo de distancia con fórmula de Haversine y expansión de ventana (+30 pts de rating cada 5s).
  2. Implementar el flujo de aceptación simultánea estilo Dota 2 (20 segundos para confirmar).
* **Etapa 3:**
  1. Lógica de reporte de resultados: consenso mutuo de marcadores o detección de disputa.
  2. Actualización de rating Glicko-2 (rating, RD, volatilidad) al finalizar el partido.

### 🤖 Prompt Maestro para el Agente IA de Dev 2
```text
Actúa como Ingeniero Senior de Sistemas en Tiempo Real y Algoritmos (Socket.IO + Redis + Matemáticas) para MatchSport.
Tu zona exclusiva de trabajo es: 'packages/shared/socketEvents.js', 'apps/backend/src/sockets/' y 'apps/backend/src/services/'.
REGLAS ESTRICTAS:
1. No toques 'apps/player-mobile/' ni 'apps/backend/src/controllers/'.
2. Todos los nombres de eventos de WebSocket DEBEN importarse desde 'packages/shared/socketEvents.js'.
3. El motor de emparejamiento utiliza la distancia por Haversine (km entre distritos) y Glicko-2 con expansión periódica de umbral.
4. El modal de aceptación tiene un límite estricto de 20 segundos; si alguien rechaza o vence el tiempo, se cancela y se penaliza al infractor.
5. Ante desconexión involuntaria, aplica un temporizador de gracia de 25 segundos antes de expulsar al socket de la sala.
Genera scripts de simulación en 'scripts/simulate_matchmaking.js' para probar emparejamientos con múltiples sockets antes de entregar.
```

---

## 3. 📱 GUÍA PARA DEV 3: FRONTEND MÓVIL DEL JUGADOR

### 🎯 Objetivo Principal
Construir una experiencia móvil ultra fluida (60 FPS), táctil, intuitiva y rápida para el deportista, optimizada con Capacitor para Android/iOS.

### 📂 Tu Zona de Trabajo
* **Archivos que debes editar:**
  * `apps/player-mobile/src/components/*` (Radar, Tarjetas FUT, Modales, Chat)
  * `apps/player-mobile/src/views/*` o `App.jsx` (Navegación de 4 tabs)
  * `apps/player-mobile/src/services/*` (apiClient.js, socketClient.js)
  * `apps/player-mobile/src/styles/*` (CSS, animaciones táctiles)
  * `apps/player-mobile/capacitor.config.json` (Plugins nativos)
* ⛔ **Archivos que NO debes tocar:**
  * `apps/backend/*` (Responsabilidad de Dev 1 y Dev 2)
  * `apps/admin-web/*` (Responsabilidad de Dev 1)

### 📋 Tus Tareas por Etapa
* **Etapa 1:**
  1. Configurar la estructura de la app móvil con la **Barra Inferior de 4 Iconos** (Jugar/Radar, Salas, Rankings, Perfil).
  2. Implementar pantalla de Login/Registro por Nombre + PIN (4 dígitos) y guardar token seguro.
  3. Conectar el cliente Socket.IO al backend usando el handshake autenticado.
* **Etapa 2:**
  1. Maquetar la pantalla del **Radar de Búsqueda** (animación de escaneo y botón principal en la zona del pulgar).
  2. Construir el **Modal de Aceptación de 20 segundos** con barra regresiva y vibración háptica (`@capacitor/haptics`).
  3. Crear la vista de **Salas de Convocatoria** con botón directo para compartir link por WhatsApp.
* **Etapa 3:**
  1. Diseñar la **Carta Coleccionable FUT** con estadísticas dinámicas y selector de deportes.
  2. Vista de partido en vivo con chat de sala y modal para reportar marcador final.

### 🤖 Prompt Maestro para el Agente IA de Dev 3
```text
Actúa como Mobile Frontend Lead (React 18 + Capacitor 8 + Tailwind/CSS) para la App de Jugadores de MatchSport.
Tu zona exclusiva de trabajo es: 'apps/player-mobile/'.
REGLAS ESTRICTAS:
1. No modifiques nada dentro de 'apps/backend/' ni 'apps/admin-web/'.
2. La experiencia debe respetar la 'Regla de la Zona del Pulgar' (botones principales en el tercio inferior de la pantalla) y la barra fija inferior de 4 iconos: 🧭 JUGAR, 🏟️ SALAS, 🏆 RANKINGS, 👤 PERFIL.
3. Todos los eventos de sockets deben importarse desde '../../packages/shared/socketEvents.js'.
4. Integra feedback háptico con '@capacitor/haptics' al pulsar botones de acción crítica y al encontrar partido.
5. Cero formularios pesados: la autenticación es únicamente Nombre + PIN de 4 dígitos.
Asegúrate de que 'npm run build' en 'apps/player-mobile' compile con 0 errores y que la interfaz sea 100% responsiva para pantallas móviles (360px a 430px de ancho).
```

---

## 4. 🎨 GUÍA PARA MIEMBRO 4: UI/UX & MARKETING

### 🎯 Objetivo Principal
Definir la identidad visual premium de la aplicación, asegurar una experiencia de usuario sin fricción y liderar la estrategia de adopción y alianzas con canchas deportivas.

### 📂 Tu Zona de Trabajo
* **Herramientas de Diseño:** Figma, Illustrator, Canva, Spline.
* **Herramientas de Marketing:** WhatsApp Business, Google Sheets (prospección), plantillas de códigos QR.
* **Entregables:** Prototipos navegables en Figma, guía de estilos (tokens), copys de WhatsApp y afiches impresos para complejos deportivos.

### 📋 Tus Tareas por Etapa
* **Etapa 1 (Identidad y Figma):**
  1. Crear el **Design System** en Figma: Paleta de colores dark mode deportivo (verde neón, azul eléctrico, dorado TOTW), tipografía moderna (Outfit / Inter) y estados de botones (default, active, disabled).
  2. Diseñar las 4 pantallas principales de la app móvil respetando la zona del pulgar:
     - Tab 1: Radar con selector de deporte y botón gigante "BUSCAR PARTIDO".
     - Tab 2: Lista de Salas abiertas con badge de cupos (ej: "Faltan 2 para 5v5").
     - Tab 3: Tabla de Posiciones y jugadores destacados.
     - Tab 4: Perfil del jugador con su Carta FUT (Bronce, Plata, Oro).
* **Etapa 2 (Viralidad y Copys):**
  1. Diseñar el **mensaje viral de WhatsApp** que se genera al compartir una sala:
     > *"⚽ ¡Armamos pichanga en Surco hoy a las 8:00 PM! Nos faltan 2 defensas. Entra a la sala con un tap: https://matchsport.pe/lobby/PIN123"*
  2. Diseñar la pieza gráfica para redes sociales anunciando el lanzamiento de la beta.
* **Etapa 3 (Alianza Piloto con Canchas):**
  1. Visitar / contactar 2 complejos deportivos de fútbol 7 / pádel.
  2. Diseñar afiche publicitario con código QR para colocar en la recepción: *"¿Te falta 1 para completar tu equipo? Escanea aquí y encuentra rivales en 2 minutos"*.
  3. Realizar pruebas de usabilidad guiadas con 5 deportistas reales anotando puntos de fricción.

### 🤖 Prompt Maestro para el Agente IA de Miembro 4 (Para análisis de UX y Copys)
```text
Actúa como Product Designer (UI/UX) y Growth Marketer deportivo para MatchSport.
Tu misión es optimizar la retención del usuario, la velocidad de interacción táctil y la viralidad orgánica de la aplicación móvil.
REGLAS DE DISEÑO:
1. Enfoque 'Thumb-Zone First': todo botón crítico debe poder accionarse con una sola mano.
2. La navegación consta exactamente de 4 pestañas: Jugar (Radar), Salas (Convocatorias), Rankings y Perfil (Carta FUT).
3. La estética debe ser moderna, estilo EA Sports FC / Nike Training / Strava, con micro-interacciones claras.
Genera los textos persuasivos (copys) para compartir partidos en WhatsApp y el guion de feedback para las pruebas con jugadores en canchas reales.
```

---

## 5. ☁️ GUÍA PARA DEVOPS: INFRAESTRUCTURA, CI/CD & DESPLIEGUE DE LA APP

### 🎯 Objetivo Principal
Automatizar la integración continua (CI/CD), orquestar los servidores de producción (Backend + WebSockets + Redis + PostgreSQL), desplegar el Panel Web Admin y empaquetar los instalables nativos de la app móvil (**APK / AAB para Android** y **TestFlight / IPA para iOS**).

```
                            ┌─────────────────────────────────────────┐
                            │          INFRAESTRUCTURA CLOUD          │
                            └────────────────────┬────────────────────┘
                                                 │
          ┌──────────────────────────────────────┼──────────────────────────────────────┐
          ▼                                      ▼                                      ▼
┌──────────────────────┐               ┌──────────────────────┐               ┌──────────────────────┐
│  ⚙️ BACKEND + WS     │               │  🖥️ WEB ADMIN        │               │  📱 APP MÓVIL        │
│  - Render / Railway  │               │  - Vercel / Netlify  │               │  - Capacitor Build   │
│  - Redis Pub/Sub     │               │  - Cloudflare DNS    │               │  - Android APK / AAB │
│  - PostgreSQL Cloud  │               │  - HTTPS / SSL       │               │  - iOS IPA (Xcode)   │
│  - WSS:// Support    │               │  - admin.matchsport  │               │  - Google Play Store │
└──────────────────────┘               └──────────────────────┘               └──────────────────────┘
```

### 📂 Tu Zona de Trabajo
* **Archivos que debes editar:**
  * `Dockerfile` y `docker-compose.yml` (Contenedores de Backend, Redis y DB)
  * `.github/workflows/deploy-backend.yml` y `ci-tests.yml` (Pipelines de CI/CD)
  * `apps/backend/render.yaml` o `railway.json` (Configuración de PaaS)
  * `apps/player-mobile/android/` y scripts de compilación de APK (`capacitor sync`)
  * Configuración de variables de entorno de producción (`.env.production`)
* ⛔ **Archivos que NO debes tocar:**
  * Lógica interna de componentes (`apps/player-mobile/src/components/*`)
  * Lógica interna de algoritmos (`apps/backend/src/services/*`)

---

### 📋 Tus Tareas por Etapa y Entorno

#### 1. Despliegue del Backend, Base de Datos y WebSockets (Nube)
* **Plataforma recomendada:** **Railway**, **Render** o VPS (DigitalOcean / Hetzner / AWS).
* **Pasos de Configuración:**
  1. **Base de Datos:** Provisionar una instancia de **PostgreSQL 15+** en la nube (ej. Supabase, Neon o Railway Postgres) y ejecutar las migraciones de Prisma.
  2. **Caché & PubSub:** Provisionar una instancia de **Redis** (Upstash o Redis Cloud) para el escalado horizontal de Socket.IO (`@socket.io/redis-adapter`).
  3. **Servidor Node.js:** Desplegar `apps/backend/` asegurando que soporte **conexiones WebSocket persistentes** con SSL (`wss://api.matchsport.pe`).
  4. **Variables de Entorno Clave (`.env.production`):**
     ```env
     PORT=3000
     NODE_ENV=production
     DATABASE_URL=postgresql://user:pass@host:5432/matchsport
     REDIS_URL=redis://default:pass@redis-host:6379
     JWT_SECRET=tu_clave_secreta_super_segura_256bits
     CORS_ORIGIN=https://admin.matchsport.pe,capacitor://localhost,http://localhost
     ```

#### 2. Despliegue del Panel Web Admin (Desktop)
* **Plataforma recomendada:** **Vercel**, **Cloudflare Pages** o **Netlify**.
* **Pasos de Configuración:**
  1. Configurar el comando de build: `cd apps/admin-web && npm install && npm run build`.
  2. Directorio de salida: `apps/admin-web/dist`.
  3. Configurar variable de entorno pública: `VITE_API_URL=https://api.matchsport.pe`.
  4. Vincular subdominio personalizado: `admin.matchsport.pe` con certificado SSL automático.

#### 3. Compilación y Despliegue de la App Móvil (Android & iOS)
* **Generación de APK para Pruebas Internas (Android):**
  ```bash
  # 1. Compilar el bundle de React
  cd apps/player-mobile
  npm run build

  # 2. Sincronizar assets con el proyecto nativo Android
  npx cap sync android

  # 3. Compilar APK Debug / Release
  cd android
  ./gradlew assembleDebug
  # El APK se genera en: android/app/build/outputs/apk/debug/app-debug.apk
  ```
* **Generación de AAB para Google Play Console:**
  ```bash
  ./gradlew bundleRelease
  # Se genera el bundle firmado listo para subir a la Play Store
  ```
* **Configuración de Deep Links / App Links:**
  - Configurar `assetlinks.json` en el servidor para que los enlaces `https://matchsport.pe/lobby/:pin` abran directamente la aplicación instalada en el celular.

#### 4. Automatización con GitHub Actions (CI/CD)
* Crear `.github/workflows/ci.yml` para ejecutar automáticamente `npm run test` y `npm run build` en cada Pull Request antes de aprobar cualquier cambio.

---

### 🤖 Prompt Maestro para el Agente IA de DevOps
```text
Actúa como Cloud Architect, Release Engineer y Especialista en DevOps (Docker, CI/CD, Capacitor Android/iOS, Node.js y Cloudflare) para MatchSport.
Tu responsabilidad exclusiva es: Dockerfiles, scripts de despliegue, pipelines de GitHub Actions, configuración de servidores (Render/Railway/Vercel) y empaquetado de instalables móviles (APK/AAB/IPA).
REGLAS ESTRICTAS:
1. El backend requiere soporte nativo de WebSockets persistentes (WSS) con CORS permitido para 'capacitor://localhost' y el dominio web admin.
2. La base de datos de producción es PostgreSQL con Redis para el adaptador de Socket.IO.
3. Automatiza la generación de APKs de Android mediante Gradle y Capacitor CLI sin alterar el código fuente de los componentes UI.
4. Asegura que todas las variables de entorno sensibles (JWT_SECRET, DATABASE_URL, REDIS_URL) se inyecten de forma segura sin exponerlas en repositorios públicos.
Genera los archivos Dockerfile, docker-compose.yml y los workflows de GitHub Actions necesarios para un despliegue con 0 downtime.
```

---

## 6. 🔄 RESUMEN DEL PROTOCOLO DE INTEGRACIÓN Y PASE A PRODUCCIÓN

```
       Dev 1 (Backend & DB)  ───┐
       Dev 2 (Tiempo Real)   ───┼──► [ Sincronización en packages/shared ] 
       Dev 3 (Mobile React)  ───┤
       Miembro 4 (UI/UX)     ───┘
                                   │
                                   ▼
                       [ DevOps: npm run build & CI ]
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     🚀 API + Sockets Nube   🖥️ Web Admin Vercel   📱 APK / Play Store
```

1. **Viernes de Integración y Merge:**
   - Dev 1, Dev 2 y Dev 3 fusionan sus ramas verificando que no existan discrepancias en `packages/shared`.
2. **Validación del Pipeline CI:**
   - GitHub Actions ejecuta los tests automatizados y el build global del monorepo.
3. **Despliegue Asistido por DevOps:**
   - Backend y Redis se despliegan automáticamente en la nube (Railway/Render).
   - Panel Web se actualiza en Vercel.
   - Se genera el nuevo APK para que Miembro 4 y el equipo prueben la beta directamente en sus teléfonos móviles.
