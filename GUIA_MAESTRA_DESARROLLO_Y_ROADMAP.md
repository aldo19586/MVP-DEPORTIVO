# 🏆 GUÍA MAESTRA DE DESARROLLO, ARQUITECTURA Y ROADMAP
## Plataforma Deportiva Integral MatchSport (Web, Móvil, Backend & Negocio)

> **Versión del Documento:** 2.0.0 (Revisión Integral de Arquitectura)  
> **Fecha de Elaboración:** Septiembre 2026  
> **Destinatarios:** Fundadores, Desarrolladores, Diseñadores de Producto, Administradores y Operadores de Canchas.

---

## 📑 ÍNDICE GENERAL

1. [Resumen Ejecutivo y Visión del Producto](#1-resumen-ejecutivo-y-visión-del-producto)
2. [Arquitectura del Ecosistema: División de Roles y Plataformas](#2-arquitectura-del-ecosistema-división-de-roles-y-plataformas)
   - 2.1 App Móvil (Consumidor / Jugador)
   - 2.2 Panel Web SuperAdmin (Fundadores y Operaciones)
   - 2.3 Portal Web B2B (Dueños de Canchas y Complejos Deportivos)
   - 2.4 Backend Unificado y Capa de Datos Persistente
3. [El Dilema del Matchmaking: Por qué estructurar en Fases](#3-el-dilema-del-matchmaking-por-qué-estructurar-en-fases)
   - 3.1 El Fenómeno del "Pueblo Fantasma"
   - 3.2 Los Tres Paradigmas: Asíncrono, Síncrono y Búsqueda en 2do Plano
4. [Roadmap Evolutivo Exhaustivo por Fases](#4-roadmap-evolutivo-exhaustivo-por-fases)
   - **Fase 1:** El Núcleo Esencial (MVP de Lanzamiento Rápido y Resiliente)
   - **Fase 2:** Geolocalización Inteligente, Haversine y Búsqueda en 2do Plano
   - **Fase 3:** Matchmaking Automático (Glicko-2), Ventana Dinámica y Resolución de Disputas
   - **Fase 4:** Gamificación Multideporte, Cartas Coleccionables y Calificaciones Peer-to-Peer
   - **Fase 5:** Monetización B2B, Parrilla de Canchas y Pasarela de Pagos Divididos
   - **Fase 6:** Escala Masiva y Alta Disponibilidad (Hacia el Millón de Conexiones)
5. [Auditoría del Código Actual vs Roadmap (Matriz de Trazabilidad)](#5-auditoría-del-código-actual-vs-roadmap-matriz-de-trazabilidad)
6. [Guía de Despliegue Móvil, Seguridad y DevOps](#6-guía-de-despliegue-móvil-seguridad-y-devops)
   - 6.1 Requisitos Críticos de Red en Android e iOS (Capacitor)
   - 6.2 Permisos Nativos y Políticas de Segundo Plano
7. [Marco Legal, Regulación y Políticas de Convivencia](#7-marco-legal-regulación-y-políticas-de-convivencia)
8. [Estrategia de Adopción Local y Crecimiento Orgánico](#8-estrategia-de-adopción-local-y-crecimiento-orgánico)

---

## 1. RESUMEN EJECUTIVO Y VISIÓN DEL PRODUCTO

**MatchSport** es una plataforma deportiva integral diseñada para resolver la mayor fricción del deporte aficionado: **la dificultad para armar y completar partidos**. El ausentismo de último minuto, la disparidad de niveles competitivos, la falta de rivales en la misma zona y la desorganización en el cobro de canchas arruinan miles de encuentros deportivos cada semana.

Para que la plataforma sea viable técnica y comercialmente, articula a **tres actores interdependientes**:
1. **Los Jugadores (B2C):** Buscan inmediatez, rivales de su mismo nivel, notificaciones en el bolsillo y confirmación rápida.
2. **Los Clubes / Dueños de Canchas (B2B):** Buscan maximizar la ocupación de sus canchas en horarios vacíos, asegurar cobros por adelantado y ordenar su agenda en una pantalla de escritorio.
3. **El Equipo Fundador / SuperAdmin:** Requiere control de salud del sistema, herramientas de moderación y auditoría de métricas de crecimiento.

---

## 2. ARQUITECTURA DEL ECOSISTEMA: DIVISIÓN DE ROLES Y PLATAFORMAS

```
                               ┌────────────────────────────────────────┐
                               │           USUARIOS FINALES             │
                               └──────────────────┬─────────────────────┘
                                                  │
                                                  ▼
                                       📱 App Móvil (Capacitor)
                                       [Android / iOS - React]
                                                  │
                                                  │ HTTPS / WSS (WebSocket Seguro)
                                                  ▼
┌─────────────────────────┐          ┌─────────────────────────┐          ┌─────────────────────────┐
│   ADMIN CLUB / CANCHA   │          │     BACKEND CENTRAL     │          │       SUPER ADMIN       │
│  🖥️ Web Dashboard (PC)  ├─────────►│  Node.js + Express API  │◄─────────┤ 🖥️ Web Backoffice (PC)  │
│ [Agenda, TPV y Canchas] │          │  Socket.IO en Tiempo Real│         │ [Métricas, Moderación]  │
└─────────────────────────┘          └────────────┬────────────┘          └─────────────────────────┘
                                                  │
                                     ┌────────────┴────────────┐
                                     │                         │
                                     ▼                         ▼
                             [( Base de Datos )]       [( Memoria Caché )]
                             SQLite (Dev/MVP)          Redis Pub/Sub
                             PostgreSQL (Producción)   Caché de Leaderboard
```

### 2.1. App Móvil (Consumidor / Jugador)
* **Tecnología:** React + Tailwind/CSS, compilada nativamente mediante **Capacitor** para Android y posterior despliegue en iOS.
* **Justificación técnica:**
  * **Notificaciones Push Nativas (FCM):** El celular vibra y suena en segundo plano cuando se arma un partido o falta un jugador.
  * **Acceso a Sensores (GPS):** Detección automática del distrito y cálculo de radio de desplazamiento (3 km, 5 km, 10 km).
  * **Widgets de Pantalla Bloqueada / Isla Dinámica:** Búsqueda activa sin obligar al usuario a mantener la pantalla encendida.

### 2.2. Panel Web SuperAdmin (Fundadores y Operaciones)
* **Tecnología:** React Web Application Desktop (incluida en el proyecto bajo [AdminDashboard.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/AdminDashboard.jsx)).
* **Justificación técnica:**
  * **Visibilidad en Vivo:** Monitoreo en tiempo real de conexiones WebSocket activas, salas en curso y partidos en disputa.
  * **Herramientas de Moderación (Botón de Baneo):** Capacidad de expulsar usuarios tóxicos, cancelar salas con contenido ofensivo y resolver discrepancias de marcadores.
  * **Configuración del Motor Deportivo:** Alta y baja de deportes, edición de formatos (1v1, 2v2, 5v5) y calibración de preguntas del cuestionario de nivel.

### 2.3. Portal Web B2B (Dueños de Canchas y Complejos Deportivos)
* **Tecnología:** React Web Application optimizada para monitores de 1080p o tablets fijas en recepción.
* **Justificación técnica:**
  * **Parrilla Panorámica de Turnos:** Visualización tipo grilla/calendario de 4 a 16 canchas divididas en bloques de 30 o 60 minutos.
  * **Gestión de Caja y TPV:** Registro de cobros presenciales, alquiler de indumentaria/balones y venta de bebidas con exportación contable a Excel.

### 2.4. Backend Unificado y Capa de Datos
* **Servidor:** Node.js (Express) + Socket.IO con arquitectura de eventos bidireccionales.
* **Base de Datos:**
  * **Fase MVP:** SQLite compilado a WebAssembly (`sql.js`) con auto-guardado debounced ([server/database.js](file:///d:/MATCHMAKING_DEPORTIVO_WEB/server/database.js)).
  * **Fase Escala:** PostgreSQL administrado (AWS RDS o Supabase) con réplicas de lectura.

---

## 3. EL DILEMA DEL MATCHMAKING: POR QUÉ ESTRUCTURAR EN FASES

### 3.1. El Fenómeno del "Pueblo Fantasma"
En aplicaciones de emparejamiento deportivo, el principal factor de muerte prematura es el **vacío inicial de usuarios**. 
Si el día 1 de lanzamiento la aplicación solo ofrece una cola de matchmaking automático que busca rivales en 30 segundos, el usuario no encontrará a nadie de su nivel en su distrito a esa hora exacta. Percibirá que la app "no funciona", la desinstalará y no regresará.

### 3.2. Los Tres Paradigmas de Emparejamiento
Para solucionar este dilema, la aplicación evoluciona en 3 métodos complementarios:

```
[ 1. ASÍNCRONO ] ──────────────► [ 2. SEGUNDO PLANO ] ──────────────► [ 3. SÍNCRONO ]
Salas para más tarde             Cola activa en Isla Dinámica          Matchmaking instantáneo
(Convocatoria por WhatsApp)      (Servidor busca por ti)               (20s al estilo Dota/LoL)
```

1. **Paradigma Asíncrono (Fase 1 - Convocatoria Comunitaria):**  
   Los usuarios no necesitan estar conectados en el mismo segundo. Un jugador crea una sala por la mañana para jugar por la noche. Los demás jugadores se unen a lo largo del día. Funciona perfecto con pocos usuarios.
2. **Paradigma Híbrido en Segundo Plano (Fase 2 - Estilo PedidosYa / Uber):**  
   El jugador activa su búsqueda, bloquea el celular y se va a trabajar. El servidor en la nube busca por él y lo alerta con una notificación Push cuando se completen los jugadores requeridos.
3. **Paradigma Síncrono (Fase 3 - Matchmaking en Vivo):**  
   Ambos rivales pulsan "Buscar" al mismo tiempo y son emparejados en menos de un minuto. Requiere alta densidad de usuarios en línea.

---

## 4. ROADMAP EVOLUTIVO EXHAUSTIVO POR FASES

---

### 🟢 FASE 1: El Núcleo Esencial (MVP de Lanzamiento Rápido y Resiliente)
*Objetivo: Poner la app en manos de los primeros 100 a 500 jugadores reales para validar que jueguen, se organicen y se comuniquen con cero fricción y sin caídas de sesión.*

#### 1. Módulos y Funcionalidades Indispensables:
1. **Acceso Ultrarrápido con Identidad Segura (Nombre + PIN de 4 dígitos):**
   * En lugar de obligar al usuario a rellenar correos largos y confirmar contraseñas, el jugador se registra en 10 segundos con:
     * **Nombre / Apodo único** (ej: `"Paolo9"`, `"CrackSurco"`).
     * **PIN numérico de 4 dígitos** (ej: `"7777"`).
   * **Criptografía:** El PIN se protege con hash unidireccional con salt mediante `bcryptjs`. Nunca se guarda en texto plano.
   * **Sesión Persistente:** Se guarda en `localStorage` del dispositivo para que un cierre de ventana no desconecte al jugador.
2. **Cuestionario Inicial de Calibración Deportiva (Onboarding ELO):**
   * Para evitar emparejar a un novato con un ex-federado, al registrarse se le aplican 3 preguntas rápidas que definen su rating Glicko inicial:
     * *Principiante:* 1200 pts base.
     * *Intermedio:* 1500 pts base.
     * *Avanzado:* 1800 pts base.
3. **Sistema de Salas de Convocatoria (Lobbies con Código PIN):**
   * **Crear Sala:** El creador elige deporte, formato (ej. Fútbol 5v5, Pádel 2v2), fecha/hora y cancha tentativa.
   * **Código PIN de 4 caracteres:** El capitán puede compartir un link directo o código alfanumérico por grupos de WhatsApp.
   * **Lista de Salas Públicas por Distrito:** Pestaña donde jugadores solitarios pueden explorar partidos abiertos y sumarse con 1 tap.
   * **Balanceo de Equipos:** El capitán puede alternar participantes entre Equipo A y Equipo B (`switchLobbyTeam`).
4. **Chat en Tiempo Real por Sala (WebSockets):**
   * Canal de texto instantáneo para coordinar color de camisetas, puntualidad y detalles de la cancha.
5. **Mecanismo de Resiliencia Móvil (Grace Period de 25 segundos):**
   * Si el jugador pierde señal de Wi-Fi, pasa a 4G o bloquea la pantalla, el servidor **NO lo expulsa**.
   * Mantiene su lugar reservado durante 25 segundos en estado `reconnecting`. Si vuelve la señal, la app restaura la sala y el chat de forma transparente.
6. **Persistencia en Base de Datos Local (SQLite / `sql.js`):**
   * Toda la información de usuarios, perfiles, cartas y partidos se guarda en disco (`matchsport.db`). Si el servidor se reinicia, ningún dato se pierde.
7. **Población con 25 Bots Realistas (`server/seed.js`):**
   * 25 jugadores simulados con nombres peruanos, fotos, coordenadas en 12 distritos de Lima y 3 niveles de habilidad (OVR 60, 75 y 90) para realizar pruebas y demostraciones inmediatas.
8. **Panel SuperAdmin Operativo (Fase 1):**
   * Monitoreo en vivo de conexiones abiertas, auditoría de salas activas, visor de métricas y botón para suspender usuarios problemáticos.

---

### 🟡 FASE 2: Geolocalización Inteligente, Haversine y Búsqueda en 2do Plano
*Objetivo: Facilitar el descubrimiento de partidos y canchas según la cercanía geográfica del jugador sin drenar su batería.*

#### 1. Módulos y Funcionalidades:
1. **Cálculo Geoespacial Preciso (Fórmula de Haversine):**
   * El servidor calcula la distancia real en kilómetros entre las coordenadas del jugador y las canchas o salas activas.
   * Integración del catálogo de distritos de Lima ([server/peru_districts.json](file:///d:/MATCHMAKING_DEPORTIVO_WEB/server/peru_districts.json)) con centros geográficos calibrados.
2. **Mapa Interactivo con Selector de Radio y Perímetro (Leaflet):**
   * Filtro deslizable de distancia: *"Buscar partidos a menos de 3 km, 5 km o 10 km"*.
   * Dibujo de perímetro poligonal manual sobre el mapa para delimitar distritos preferidos.
3. **🚀 Innovación UX: Búsqueda en Segundo Plano (Live Activities / Dynamic Island y Android Ongoing):**
   * **En iOS (Isla Dinámica / Pantalla de Bloqueo):** Widget en vivo que muestra el progreso del grupo:  
     `[⚽ MatchSport: Buscando Fútbol 5 en Surco... 7/10 jugadores | Botón: Cancelar]`.
   * **En Android (Foreground Service):** Notificación fija en la barra superior no descartable que permite ver el estado y cancelar con 1 tap.
   * **Cero Consumo Excesivo de Batería:** El GPS no trackea permanentemente en background. El backend gestiona la cola en la nube y envía un Push de alta prioridad cuando el grupo se completa.
4. **Sistema de Notificaciones Push Nativas (Firebase Cloud Messaging - FCM):**
   * Alertas críticas: *"¡Tu partido de las 8:00 PM ya tiene los 10 jugadores confirmados!"*.

---

### 🟠 FASE 3: Matchmaking Automático (Glicko-2), Ventana Dinámica y Disputas
*Objetivo: Emparejamiento competitivo instantáneo cuando existe masa crítica de usuarios concurrentes.*

#### 1. Módulos y Funcionalidades:
1. **Motor de Emparejamiento Matemático Glicko-2:**
   * Sustitución de niveles fijos por cálculo probabilístico de 3 variables: **Rating** (habilidad), **RD** (desviación o confianza del rating) y **Volatilidad** (consistencia del jugador).
2. **Expansión Dinámica de Ventana (Anti-estancamiento):**
   * Para evitar que un jugador se quede atrapado en la cola si no hay un rival idéntico a él:
     * A los 0 segundos: Tolerancia estricta de ±180 puntos de rating.
     * Cada 5 segundos de espera: La ventana se expande +30 puntos (hasta un máximo de 600 puntos) y amplía el radio en kilómetros.
3. **Modal de Aceptación Rápida de 20 Segundos (Estilo Dota 2 / CS:GO):**
   * Al encontrarse rival, suena una alerta sonora y los jugadores tienen **20 segundos** para pulsar *"Aceptar Partido"*.
   * Si alguien no acepta o abandona, se cancela la partida de inmediato y los jugadores cumplidos regresan al frente de la cola con máxima prioridad.
   * Protección contra spam y doble clic (`disabled={isUserAccepted}`).
4. **Sistema de Reporte de Resultados y Resolución de Disputas (Flujo Propuesta & Confirmación):**
   * **Paso 1 (Propuesta Abierta):** Cualquier capitán puede reportar primero el resultado en [MatchReportModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/MatchReportModal.jsx) (ej: *"Ganamos nosotros 6-4"*). El partido cambia a estado `Pendiente de Confirmación`.
   * **Paso 2 (Notificación al Rival):** El capitán rival recibe una notificación Push interactiva con el marcador reportado y dos opciones inmediatas:
     * 🟢 **Confirmar:** Si pulsa aceptar, el resultado se valida en ese mismo instante y se actualizan los ratings Glicko.
     * 🔴 **Disputar:** Si los goles/puntos no coinciden, ingresa su versión alternativa. El partido pasa a estado de **DISPUTA** (`disputes`) y se escala al panel SuperAdmin con ambos testimonios para resolución.
   * **Paso 3 (Protección Anti-Mal Perdedor por Tiempo Límite):**
     * Si el rival pierde y decide no abrir la aplicación para no aceptar la derrota, el sistema le otorga una ventana de **12 horas**.
     * Si transcurren las 12 horas sin respuesta ni disputa, **el resultado se auto-confirma automáticamente** a favor del ganador, y al rival que abandonó se le aplica una **penalización en su puntaje de Fair Play (deportividad)**.
5. **Trazabilidad y Observabilidad Operativa (Winston Logger):**
   * Registro persistente en `logs/matchmaking.log` de cada emparejamiento, diferencias de rating y motivos de descarte.

---

### 🟣 FASE 4: Gamificación Multideporte, Cartas Coleccionables y Reviews Peer-to-Peer
*Objetivo: Maximizar la fidelización, el sentido de pertenencia y erradicar el ausentismo (No-shows).*

#### 1. Módulos y Funcionalidades:
1. **Cartas Coleccionables Adaptadas por Deporte (Estilo FUT / NBA 2K):**
   * Cada jugador tiene una tarjeta oficial con su valoración general (**OVR**) y **6 atributos característicos de su disciplina**:
     * ⚽ **Fútbol:** `RIT` (Ritmo), `TIR` (Tiro), `PAS` (Pase), `REG` (Regate), `DEF` (Defensa), `FIS` (Físico).
     * 🎾 **Pádel:** `SAQ` (Saque), `REM` (Remate/Smash), `VOL` (Volea), `GLO` (Globo/Defensa), `REF` (Reflejos), `FIS` (Movilidad).
     * 🎾 **Tenis:** `SRV` (Servicio), `DRV` (Drive), `REV` (Revés), `RED` (Volea/Red), `VEL` (Velocidad), `RES` (Resistencia).
     * 🏀 **Básquetbol:** `TIR` (Tiro), `PEN` (Penetración), `PAS` (Pase), `DEF` (Defensa), `REB` (Rebotes), `AGI` (Agilidad).
2. **Jerarquía Visual de Tiers de Cartas:**
   * **Bronce:** OVR < 73 (Diseño bronce rústico).
   * **Plata Intermedio:** OVR 73 - 82 (Diseño metálico plateado).
   * **Oro Avanzado:** OVR 83 - 90 (Diseño dorado brillante).
   * **IN-FORM / TOTW Especial:** OVR ≥ 91 (Fondo cósmico índigo-morado con destellos animados).
3. **Calificaciones Cruzadas Post-Partido (Peer-to-Peer Reviews):**
   * Al finalizar cada encuentro, los jugadores valoran anónimamente a compañeros y rivales en:
     * Puntualidad y asistencia.
     * Fair Play (deportividad y respeto).
     * Ajuste de estadísticas FUT percibidas en cancha.
4. **Tablas de Clasificación (Leaderboards Públicos):**
   * Rankings filtrables por deporte, formato y distrito ([LeaderboardModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/LeaderboardModal.jsx)).
5. **Verificación de Identidad con DNI / Teléfono:**
   * Insignia azul de *"Jugador Verificado"* para generar confianza en la comunidad.

---

### 🔵 FASE 5: Monetización B2B, Parrilla de Canchas y Pagos Divididos
*Objetivo: Generar ingresos recurrentes y conectar la demanda de jugadores con la oferta de los complejos deportivos.*

#### 1. Módulos y Funcionalidades:
1. **Portal Web B2B para Administradores de Canchas:**
   * Calendario interactivo en pantalla de PC para gestionar turnos de canchas sintéticas, techadas o de pádel.
   * Bloqueo de turnos para clientes fijos (abonados semanales) y apertura de turnos vacíos a la app móvil.
2. **Reserva Integrada al Cerrar el Partido:**
   * Cuando una sala se llena de jugadores, el sistema sugiere las 3 canchas disponibles más cercanas en ese horario y permite reservarla en 1 clic.
3. **División Automática de Pagos (Split Payment):**
   * En lugar de que un solo jugador asuma el costo total (ej. 120 soles) y luego tenga que cobrar a 9 personas por WhatsApp, **la app divide el cobro equitativamente** (ej. 12 soles por persona).
   * Cada jugador paga su parte con tarjeta, Plin o Yape. La cancha recibe el pago completo garantizado.
4. **Política Anti-Ausentismo (No-Show Protection):**
   * Si un jugador confirma y no asiste, se le cobra una penalización automática de su saldo o tarjeta y su cuenta queda suspendida de partidos rankeados por 7 días.
5. **Modelo de Ingresos de MatchSport:**
   * Comisión por transacción de reserva de cancha (5% a 8%).
   * Membresías *MatchSport PRO* para jugadores (estadísticas avanzadas, creación de torneos privados).

---

### ⚪ FASE 6: Escala Masiva y Alta Disponibilidad (Hacia el Millón)
*Objetivo: Garantizar tiempos de respuesta de milisegundos y estabilidad con cientos de miles de conexiones en vivo.*

#### 1. Arquitectura de Alta Concurrencia:
1. **Migración a PostgreSQL Administrado:**
   * Cluster relacional en Amazon RDS o Supabase con réplicas de lectura para consultas de Leaderboard y perfiles.
2. **Cluster de Redis Pub/Sub para WebSockets:**
   * Uso del adaptador oficial `@socket.io/redis-adapter` para sincronizar eventos en vivo entre múltiples instancias de Node.js distribuidas detrás de un Load Balancer (NGINX / AWS ALB).
3. **Desacoplamiento del Motor de Matchmaking:**
   * Extracción de `matchmakingEngine.js` a un microservicio independiente apoyado en colas en memoria de alta velocidad (**BullMQ**).
4. **CDN y Almacenamiento Distribuido:**
   * Fotos de perfil y assets estáticos entregados por Cloudflare CDN con almacenamiento de imágenes en Amazon S3.

---

## 5. AUDITORÍA DEL CÓDIGO ACTUAL VS ROADMAP (MATRIZ DE TRAZABILIDAD)

Esta tabla audita el código real que reside en tu repositorio y su correspondencia con el plan maestro:

| Módulo / Funcionalidad | Fase | Estado en Código | Archivos del Proyecto |
| :--- | :---: | :---: | :--- |
| **Login por Nombre + PIN (4 dígitos con bcryptjs)** | Fase 1 | ✅ **100% Operativo** | [server/database.js](file:///d:/MATCHMAKING_DEPORTIVO_WEB/server/database.js), [AuthModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/AuthModal.jsx) |
| **Cuestionario Inicial de Calibración de Nivel** | Fase 1 | ✅ **100% Operativo** | [QuestionnaireModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/QuestionnaireModal.jsx), `server/db.js` |
| **Salas de Convocatoria (Lobbies con PIN y Chat)** | Fase 1 | ✅ **100% Operativo** | [LobbyRoomModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/LobbyRoomModal.jsx), `server/server.js` |
| **Grace Period de 25s (Reconexión Resiliente)** | Fase 1 | ✅ **100% Operativo** | `disconnectGraceTimers` en `server/server.js`, [App.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/App.jsx) |
| **Persistencia SQLite (`matchsport.db` vía `sql.js`)** | Fase 1 | ✅ **100% Operativo** | [server/database.js](file:///d:/MATCHMAKING_DEPORTIVO_WEB/server/database.js), `server/db.js` |
| **25 Bots Realistas con GPS en Lima y PIN 1234** | Fase 1 | ✅ **100% Operativo** | `server/seed.js`, `scripts/test_seed_verification.js` |
| **Panel SuperAdmin Esencial (Live, Métricas, Usuarios)** | Fase 1 | ✅ **100% Operativo** | [AdminDashboard.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/AdminDashboard.jsx), `/api/admin/*` |
| **Cálculo de Distancia Haversine y Distritos de Lima** | Fase 2 | ✅ **100% Operativo** | [server/matchmakingEngine.js](file:///d:/MATCHMAKING_DEPORTIVO_WEB/server/matchmakingEngine.js), `server/peru_districts.json` |
| **Mapa Interactivo y Perímetro Geográfico** | Fase 2 | 🔄 **Componente Listo** | [MapZoneModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/MapZoneModal.jsx), `test_perimeter.js` |
| **Búsqueda en 2do Plano (Isla Dinámica / Foreground)** | Fase 2 | ⏳ **Pendiente Nativo** | Plugins de Capacitor / Configuración FCM |
| **Algoritmo Glicko-2 y Ventana Dinámica (+30 pts)** | Fase 3 | ✅ **100% Operativo** | [server/glicko2.js](file:///d:/MATCHMAKING_DEPORTIVO_WEB/server/glicko2.js), [server/matchmakingEngine.js](file:///d:/MATCHMAKING_DEPORTIVO_WEB/server/matchmakingEngine.js) |
| **Modal de Aceptación 20s (Dota 2) y Matriz de Estrés** | Fase 3 | ✅ **100% Operativo** | [MatchAcceptModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/MatchAcceptModal.jsx), `server/server.js` |
| **Reporte de Marcadores y Gestión de Disputas** | Fase 3 | ✅ **100% Operativo** | [MatchReportModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/MatchReportModal.jsx), `AdminDashboard.jsx` |
| **Trazabilidad y Logging con Winston** | Fase 3 | ✅ **100% Operativo** | `server/logger.js`, `logs/matchmaking.log` |
| **Cartas Coleccionables Multideporte y Tiers** | Fase 4 | ✅ **100% Operativo** | [PlayerCardFUT.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/PlayerCardFUT.jsx) |
| **Leaderboards Dinámicos por Deporte/Formato** | Fase 4 | ✅ **100% Operativo** | [LeaderboardModal.jsx](file:///d:/MATCHMAKING_DEPORTIVO_WEB/src/components/LeaderboardModal.jsx) |
| **Portal B2B de Turnos de Canchas y TPV** | Fase 5 | ⏳ **Fase Comercial** | Módulo de Clubes en `AdminDashboard.jsx` |
| **Pasarela de Pagos Divididos (Split Checkout)** | Fase 5 | ⏳ **Fase Comercial** | Integración SDK Culqi / Mercado Pago / Yape |

---

## 6. GUÍA DE DESPLIEGUE MÓVIL, SEGURIDAD Y DEVOPS

### 6.1. Requisitos Críticos de Red en Android (Capacitor)
Por defecto, a partir de Android 9 (API 28), el sistema operativo **bloquea todo el tráfico HTTP y WebSockets `ws://` sin cifrar** (Cleartext Traffic).
* **Para Entorno de Desarrollo Local:**
  * En [android/app/src/main/AndroidManifest.xml](file:///d:/MATCHMAKING_DEPORTIVO_WEB/android/app/src/main/AndroidManifest.xml) debe declararse:  
    `android:usesCleartextTraffic="true"`
* **Para Entorno de Producción Oficial:**
  * Es **obligatorio** desplegar el servidor Node.js bajo un dominio con certificado SSL válido (`https://` y `wss://`).
  * Con `wss://`, las conexiones de Socket.IO son cifradas y Android/iOS las aprueban sin advertencias de seguridad.

### 6.2. Permisos Nativos Requeridos en Android e iOS
1. **Geolocalización Satelital:**
   * `ACCESS_FINE_LOCATION` y `ACCESS_COARSE_LOCATION` (para detectar el distrito y radio de búsqueda).
2. **Notificaciones Push en Segundo Plano:**
   * `POST_NOTIFICATIONS` (obligatorio desde Android 13 para alertas de partidos).
3. **Cámara y Galería:**
   * Para permitir a los jugadores subir su foto real a la carta coleccionable.

---

## 7. MARCO LEGAL, REGULACIÓN Y POLÍTICAS DE CONVIVENCIA

Para operar en Perú y Latinoamérica, el producto debe contemplar tres pilares regulatorios:

1. **Ley de Protección de Datos Personales (Ley N° 29733 en Perú):**
   * Consentimiento explícito en el registro para el almacenamiento del DNI, teléfono y estadísticas deportivas.
   * Política de Privacidad accesible que garantice que los datos no serán vendidos a terceros.
2. **Deslinde de Responsabilidad Física (Exención de Lesiones):**
   * Cláusula clara en los Términos de Servicio donde el usuario declara que realiza actividad física bajo su propia responsabilidad médica y exonera a MatchSport de lesiones ocurridas en canchas deportivas privadas.
3. **Código de Conducta y Tolerancia Cero:**
   * Suspensión inmediata y permanente a usuarios que incurran en agresiones verbales o físicas en canchas o chats.
   * Penalización de рейтинг y bloqueo temporal a quienes cancelen a última hora dejando colgados a los demás (*No-show*).

---

## 8. ESTRATEGIA DE ADOPCIÓN LOCAL Y CRECIMIENTO ORGÁNICO

1. **Estrategia de "Densidad Distrital" (No dispersarse):**
   * Es un error común intentar captar jugadores en todo un país al mismo tiempo. La tracción se logra concentrándose en **uno o dos distritos con alta densidad de canchas** (ej. Surco y Miraflores en Lima).
   * Con 300 jugadores activos en un solo distrito, los partidos se arman todos los días. Con 300 jugadores repartidos en todo el país, nadie encuentra rival.
2. **El Capitán como Motor Viral:**
   * La función de *"Compartir enlace de sala por WhatsApp"* es la herramienta de marketing más potente. Cada capitán que crea una sala atrae a 9 amigos a registrarse en la plataforma para sumarse a la convocatoria.
3. **Alianza Inicial con 2 Complejos Deportivos Piloto:**
   * Ofrecer a dos complejos deportivos el uso gratuito del sistema para llenar sus horarios muertos (lunes a jueves de 2:00 PM a 6:00 PM), ofreciendo descuentos exclusivos a los jugadores de la comunidad MatchSport.

---
*Fin del Documento Maestro. Este registro constituye el estándar técnico y funcional oficial para MatchSport.*
