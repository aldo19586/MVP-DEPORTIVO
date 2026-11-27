# Backlog de ejecución

Estado: **MS-01 a MS-05, MS-07, MS-08, MS-09, MS-10, MS-11, MS-12, MS-13, MS-14 y MS-15 implementados**; **MS-06 En curso**; **MS-16 Pendiente**. Tamaño relativo: S (acotada), M (varios componentes), L (requiere dividir en entregas). No son estimaciones de días.

Cada tarea cerrada debe registrar commit/PR, evidencia de pruebas, limitaciones y fecha. Antes de implementar una tarea L, dividirla por criterios verificables sin perder su dependencia de integración.

| ID | Prioridad / tamaño | Entrega | Depende de | Criterio de aceptación |
|---|---|---|---|---|
| MS-00 | P1 / S | Resolver decisiones D-01…D-07 por etapa | Responsable del producto | Cada decisión necesaria tiene opción y motivo registrados; no bloquear fixes de seguridad por decisiones comerciales |
| MS-01 | P1 / M | **Hecho:** entorno de tests aislado, configuración DB/puerto y seed explícito | — | Base temporal por caso; rutas protegidas rechazadas; arranque sin demos por defecto; aislamiento y reinicio comprobados. Ver evidencia debajo |
| MS-02 | P0 / M | **Hecho:** identidad, roles y credenciales de servidor | MS-01 | Registro público siempre player; alta admin por operador; secretos requeridos fuera de dev; DTO sin password/hash; tokens probados. Límites de migración/visibilidad en IDENTIDAD.md |
| MS-03 | P0 / L | **Hecho:** autenticación REST y clientes | MS-02 | Inventario de rutas públicas/protegidas; permisos por propietario/rol; mobile guarda y envía sesión segura; admin maneja 401/403; jugador A no modifica B; anónimo no usa admin. A-01/A-05 |
| MS-04 | P0 / L | **Hecho:** identidad y permisos Socket.IO | MS-02/MS-03 | Handshake autenticado; eventos usan actor del servidor; admin solo en canal protegido; no miembro no lee/escribe chat ni cambia sala; sesión revocada/baneada no reconecta. A-03 |
| MS-05 | P1 / M | **Hecho (especificación):** reglas y contratos de salas/partidos | MS-00: D-01/D-04 | Tabla de estados/transiciones/roles, payloads y errores; regla para cupo, abandono, cancelación, empate y ausencia del capitán. Contrato compartido de prueba, sin duplicar lógica de autoridad |
| MS-06 | P1 / L | **En curso (A/B locales hechas; piloto pendiente):** persistencia durable y recuperación | MS-01, D-05 antes del piloto | Elegir almacenamiento con decisión escrita; migraciones; backups y restauración comprobada; interrupción de escritura sin pérdida silenciosa; tests sobre archivo aislado. A-11 |
| MS-07 | P1 / L | **Hecho (implementación A/B):** crear/unirse/salir de convocatorias reales | MS-03/MS-04/MS-05 | Todas las entradas usan servidor; código real copiable/compartible; última plaza con dos solicitudes da un único ganador; sin duplicar miembros; fecha/hora/zona persistidas; sala recuperable tras reinicio. A-06/A-08 |
| MS-08 | P1 / M | **Hecho (implementación):** chat y reconexión | MS-04/MS-07 | Dos conexiones reciben mismo mensaje una vez; historial y reintento; estados enviando/error; filtro por sala y limpieza de listeners; desconexión no borra membresía futura. Prueba física pendiente. A-07/A-08 |
| MS-09 | P1 / L | **Hecho (MS-09-A y MS-09-B):** finalización, disputa y rating consistente | MS-04/MS-05/MS-06/MS-07 | Reporte y confirmación por capitanes, empates, disputas con evidencia congelada, rating Glicko-2 atómico, resolución SuperAdmin en web y UI móvil completa. A-10 |
| MS-10 | P1 / L | **Hecho:** Onboarding continuo y carta inicial | MS-03, D-02/D-03/D-06 | Cuenta → datos mínimos → test → carta; reanudar; 14 respuestas válidas exigidas por servidor; foto opcional; sin atributos inventados; conservar invitación. A-09/A-16 |
| MS-11 | P2 / M | **Hecho:** Simplificar navegación y pantallas | MS-07/MS-08/MS-10 | Jugar/Mis partidos/Perfil, acción primaria por estado, filtros secundarios, sin demos en recorrido real, carga/error/vacío explícitos; revisión en iPhone y tamaño de texto grande |
| MS-12 | P1 / M | **Hecho:** SuperAdmin operativo y trazable | MS-03/MS-04/MS-09 | Ban/reset/disputa registran actor/motivo/fecha; errores visibles; reset según recuperación acordada; no se muestra «0 usuarios» por fallo de API. A-17 |
| MS-13 | P1 / M | **Hecho:** Automatizar validaciones y build nativa | MS-01/MS-03/MS-04 | CI falla con test negativo roto; lockfile reproducible; build de apps/mobile identificada; pipeline Capacitor retirado del camino vigente; versiones soportadas fijadas. A-13/A-14 |
| MS-14 | P1 / L | **Hecho:** Entorno de piloto y operación | MS-06/MS-12/MS-13, D-05/D-07 | HTTPS/WSS, configuración por entorno, sin demos/secretos de respaldo; logs sin credenciales; monitoreo y restore ensayado; responsable de incidentes; dependencias revisadas. A-15 |
| MS-15 | P1 / M | **Hecho:** Avisos y validación en dispositivos | MS-07/MS-08/MS-14 | Permisos contextuales; aviso real llega al destinatario y abre el partido correcto; probar segundo plano/denegación; definir fallback al abrir app; validar iOS y Android si se incluye |
| MS-16 | P1 / M | Ensayo y piloto privado | MS-00…MS-15 necesarias para el alcance | Matriz de VALIDACION.md con evidencia; cero P0/P1 abiertos en alcance; usuarios invitados completan ciclo real; telemetría mínima y registro de incidencias; decisión explícita de ampliar o corregir |

## Primera entrega técnica propuesta

MS-01 a MS-05, MS-07 y MS-08 implementados. MS-06 mantiene pendiente el almacenamiento alojado y su operación. Sigue MS-09 (resultados), dividido en entregas verificables según las reglas confirmadas de D-01/D-04. El entorno de desarrollo debe continuar permitiendo verificar el trabajo localmente.

### Evidencia MS-01 — 2 de noviembre de 2026

- Configuración: `server/config.js`; ruta SQLite configurable, pruebas limitadas a su subdirectorio `.test-runs/`, host loopback y puerto automático.
- Suite: `server/tests/config.test.js` y `server/tests/isolation.test.js`; instrucciones en [server/tests/README.md](../server/tests/README.md).
- Verificación: 11 pruebas aprobadas con Node 22.17.0; aislamiento entre dos servidores, reinicio con persistencia, seed opt-in y rechazo de rutas/enlaces inseguros.
- Hash SHA-256 de `matchsport.db` personal comprobado igual antes y después; no se ejecutó la suite histórica mutante.
- Limitaciones: no cubre recuperación ante caída abrupta ni permisos de negocio; corresponden a MS-06 y MS-02…04. Sin cambios visuales en la app.
- Commit: `984da9b`, subido a `origin/codex/mvp-base`.

### Evidencia MS-02 — 2 de noviembre de 2026

- Registro público sin elevación de rol; login por contraseña obligatorio; hashes bcrypt y migración de credenciales heredadas; DTO explícito, JWT con timestamps estándar y secreto requerido fuera de desarrollo.
- Comando de alta administrativa por operador, probado con cuentas sintéticas; no eleva cuentas existentes ni imprime credenciales.
- Suite completa: 17 tests aprobados. Base personal con SHA-256 sin cambios.
- Alcance y límites: [IDENTIDAD.md](IDENTIDAD.md). Los permisos REST y Socket.IO siguen pendientes; la base personal no fue migrada ni auditada cuenta por cuenta.
- Commit/PR: ver commit que incorpora esta evidencia en `codex/mvp-base`; publicación se confirma al cerrar la entrega.

### Evidencia MS-03 — 2 de noviembre de 2026

- Permisos REST por defecto, titular/membresía/rol; sesión verificada al abrir los clientes; token móvil en SecureStore; errores administrativos visibles.
- Logout/reset/ban invalidan sesiones y persisten sanciones/versiones. Ranking, partidos e historial excluyen credenciales y datos privados de otros jugadores.
- Suite conjunta: 27 pruebas aprobadas; build del panel y exportación iOS/Hermes aprobadas. Base personal sin cambios por SHA-256.
- Contrato, inventario de rutas, actualización y limitaciones: [SESIONES_Y_PERMISOS.md](SESIONES_Y_PERMISOS.md). Prueba física en iPhone pendiente; sockets aún pendientes en MS-04.
- Commit/PR: commit de esta evidencia en la rama `codex/mvp-base`; publicación confirmada al cerrar la entrega.

### Evidencia MS-04 — 2 de noviembre de 2026

- Autenticación Socket.IO, inventario de eventos por actor/membresía/rol y filtrado de entregas por destinatario. Presencia administrativa privada y chat filtrado por equipo.
- Revocación/vencimiento desconectan conexiones; reconexión usa token actual y recupera aceptación propia. Handlers de demos y resolución administrativa duplicada retirados.
- Integración en móvil/panel y correcciones de nombres de eventos, listeners y confirmaciones de servidor.
- Verificación: 42 pruebas aprobadas; build del panel y exportación iOS aprobadas. Base personal sin cambios.
- Contrato y límites: [TIEMPO_REAL.md](TIEMPO_REAL.md). Pendientes dispositivo físico, reglas de negocio completas, durabilidad y preparación del piloto.
- Commit/PR: commit de esta evidencia en `codex/mvp-base`; publicación confirmada al cerrar la entrega.

### Evidencia MS-05 — 3 de noviembre de 2026

- Propuesta de estados, roles, cupos, abandono, capitán ausente, resultado confirmado, empate y disputa en [REGLAS_COMPETICION.md](REGLAS_COMPETICION.md).
- Contrato compartido `competition.v1` con validación de comandos, revisiones, fechas UTC y marcadores; sin duplicar autorización ni transiciones del servidor.
- Cinco pruebas nuevas de contrato aprobadas; suite conjunta: 47 pruebas. Las validaciones de contratos no certifican todavía transacciones, migración o el nuevo ciclo completo.
- D-01 confirmado por Aldo: todo Perú, fútbol 5/6/7/9/11. D-04 confirmado: dos capitanes, reporte/confirmación, empate, disputa administrativa y salida previa sin penalización automática. Detalles operativos documentados. Los handlers vigentes conservan el comportamiento de MS-04 hasta la integración posterior.
- El contrato, pruebas y actualización del backlog se publican como entrega de especificación en `codex/mvp-base`. La implementación posterior seguirá las decisiones confirmadas.

### Evidencia MS-06-A — 3 de noviembre de 2026

- Parte A: guardado inmediato por mutación SQL, archivo temporal/fsync/rename, bloqueo de escritor y validación de cabecera/integridad/versión; fallo de disco detiene el proceso.
- Utilidad offline de respaldo con manifiesto SHA-256 y restauración exclusiva a destino nuevo. Recuperación controlada de bloqueo residual tras caída.
- Siete pruebas nuevas aprobadas; suite conjunta: 54 casos. Fuente personal sin cambios. Procedimiento, fuentes y límites en [PERSISTENCIA.md](PERSISTENCIA.md).
- **MS-06-B pendiente:** D-05 y almacenamiento del piloto; transacciones/rollback, revisiones e idempotencia; migraciones futuras y operación de respaldos. MS-06 no se marca Hecho.
- La parte A se publica como entrega técnica completa en `codex/mvp-base`; no incluye despliegue ni prueba de corte eléctrico real.

### Evidencia MS-06-B local — 3 de noviembre de 2026

- Transacciones síncronas con rollback SQL y de cachés; finalizador único para rutas heredadas de resultados, con recibo persistente por partido y revisión.
- Esquema 2 transaccional y marcas históricas para resultados terminados de esquema 0/1; backup compatible. Seis casos nuevos; suite conjunta: 60 pruebas.
- Alcance/límites: [TRANSACCIONES.md](TRANSACCIONES.md). Fórmula y confirmación heredadas se conservan hasta MS-09; no se declara activo el contrato nuevo de MS-05.
- Aldo autorizó continuar localmente y preparar producción después; proveedor y presupuesto aún sin definir. Recomendación revisable: [ALMACENAMIENTO_PILOTO.md](ALMACENAMIENTO_PILOTO.md). No se contrataron servicios.
- **MS-06 sigue En curso** para migración/operación del almacenamiento alojado. El siguiente desarrollo local puede avanzar con MS-07; idempotencia y cupos de sus comandos se integrarán allí.

### Evidencia MS-07-A — 3 de noviembre de 2026

- Convocatorias nuevas persistentes, contrato con actor/revisión/requestId, cupos transaccionales, roles, salida y cancelación; esquema 3 y respaldo compatible.
- Móvil: Jugar/Mis salas con datos de servidor, creación en dos pasos, fecha/hora nativa, distrito nacional, código copiable/compartible e ingreso con selección de equipo. Se retiró la sala NEW1 de esos accesos.
- Siete casos nuevos y 67 pruebas conjuntas; exportación iOS y build del panel aprobadas. Base personal intacta. Contrato y límites: [CONVOCATORIAS.md](CONVOCATORIAS.md).
- MS-07-B pendiente: preparación/edición/inicio de partido en UI y servidor. MS-08/MS-09 integrarán chat y resultados del recurso nuevo. Validación física en iPhone pendiente; no se marca MS-07 Hecho.

### Evidencia MS-07-B — 3 de noviembre de 2026

- Preparación en móvil: Listo, cambio de equipo y edición por anfitrión; inicio verificado y transaccional, alineación fija y vínculo único convocatoria/partido.
- Protección de solapamientos entre camino nuevo y heredado. Esquema 4 y restauración del partido iniciados probados. Lectura solo por participantes/admin; resultados nuevos quedan en MS-09.
- Seis casos nuevos, 73 pruebas conjuntas y exportación iOS aprobadas. [INICIO_PARTIDO.md](INICIO_PARTIDO.md) detalla condiciones, alcance y prueba física pendiente.
- A petición de Aldo, backend/Expo/panel de prueba detenidos; datos manuales conservados y base personal intacta.
- MS-07 A/B implementados; sigue MS-08. La validación física y piloto no se consideran completados por la suite automática.

### Evidencia MS-08 — 3 de noviembre de 2026

- Chat común de la convocatoria, pantalla nativa separada, historial persistente y bandeja pendiente por cuenta/sala; reintento con la misma identidad y combinación sin duplicados de socket/HTTP.
- Cambios de sala en vivo, recuperación al reconectar/volver al primer plano, permisos comprobados por entrega y listeners retirados al salir. Esquema 5, migración y respaldo/restauración de mensajes.
- Diez casos nuevos; **83 pruebas conjuntas aprobadas**. Exportación iOS/Hermes aprobada, 773 módulos. Base personal intacta por SHA-256; servicios manuales detenidos y cambio local de IP conservado fuera de la entrega.
- Contrato y límites: [CHAT_Y_RECONEXION.md](CHAT_Y_RECONEXION.md). Prueba en dos dispositivos físicos, teclado/texto grande, segundo plano/push y piloto siguen pendientes. No se equipara la suite con esa validación.
- La entrega se publica en el commit que incorpora esta evidencia, rama `codex/mvp-base`. Sigue MS-09, comenzando por reporte y confirmación del marcador; rating/disputa requieren su integración completa.

### Evidencia MS-09-A — 18 de noviembre de 2026

- Comandos autorizados de finalización mediante contrato `competition.v1`: `reportScore`, `confirmScore` y `disputeScore` en `/api/competitions/commands/:command`.
- Autorización estricta por servidor: reporte reservado a capitanes de `teamA` o `teamB`; rechazo de confirmaciones del propio equipo o no participantes.
- Manejo integral de estados y empates:
  - Primer reporte o actualización del autor → `RESULT_PENDING`.
  - Confirmación del capitán rival o reportes idénticos concurrentes → `FINISHED`, derivando ganador o empate (`draw`) con `outcomeFromScore`.
  - Discrepancia explícita (`disputeScore`) o reportes con marcadores contradictorios → `DISPUTED`, congelando reporte inicial, contra-reporte y motivos para resolución administrativa.
- Eventos de tiempo real asociados (`competitionScoreReported`, `competitionScoreConfirmed`, `competitionScoreDisputed`) con entrega privada para participantes y canal de auditoría SuperAdmin.
- Persistencia SQLite durable mediante upsert transaccional `sqlInsertCompetitionMatch` e idempotencia por `requestId`.
- Cuatro casos nuevos en `server/tests/competition-results.test.js`; **87 pruebas conjuntas aprobadas al 100%**.
- Build de `apps/admin-web` aprobada (1886 módulos). Exportación de bundle móvil iOS/Hermes aprobada (773 módulos). Base personal sin modificaciones.

### Evidencia MS-09-B — 18 de noviembre de 2026

- Cálculo de rating Glicko-2 atómico y consistente (`finalizeCompetitionMatch`) evaluado sobre la media de ratings/RD de cada equipo, actualizando perfiles de los 10 jugadores en una sola transacción SQL protegida e idempotente mediante `operation_receipts` (`competition-result:${matchId}`).
- Soporte para victorias, derrotas y empates (`score: 0.5`), derivando `draws` y actualizando `matchesPlayed`, `wins`, `losses` de forma matemática y compatible en persistencia.
- Comando SuperAdmin `resolveDispute` validado bajo especificación `competition.v1`, con autorización estricta (`403 FORBIDDEN` para jugadores no admin), registro formal de `resolvedBy`, motivo de dictamen arbitral `resolutionReason` y actualización inmediata de ratings.
- Comando SuperAdmin `cancel` que anula partidos y convocatorias en cualquier estado sin alterar ratings de los participantes.
- Integración en panel SuperAdmin (`apps/admin-web`):
  - Endpoints `GET /api/competitions/admin/disputes` y `GET /api/admin/disputes` para monitorizar disputas activas.
  - Endpoint `POST /api/admin/disputes/resolve` para resolver disputas de convocatorias asignando victoria a Equipo A, Equipo B o declarando Empate Oficial.
  - Componente de dos columnas `DisputeResolutionView.jsx` actualizado con selector de empate y resolución en vivo.
  - Métricas de SuperAdmin (`/api/admin/metrics`) contabilizando disputas activas de ambos flujos.
- Interfaz en App móvil nativa (`apps/mobile`):
  - Formulario en `CompetitionScreen.js` para capitanes con reporte de goles en juego, confirmación de marcadores y disputa motivada.
  - Tarjetas en tiempo real para todos los participantes: estado en juego, reporte pendiente, disputa en revisión arbitral y resultado final oficial con goles, dictamen de SuperAdmin y variación neta de rating (+/- pts).
  - Sincronización en vivo con eventos de socket: `competitionScoreReported`, `competitionScoreConfirmed`, `competitionScoreDisputed`, `competitionDisputeResolved`.
- Cuatro casos de prueba automatizados en `server/tests/competition-rating-dispute.test.js`; **91 pruebas conjuntas aprobadas al 100%**.
- Build de `apps/admin-web` aprobada (1886 módulos). Exportación de bundle móvil iOS/Hermes aprobada (773 módulos). Base personal sin modificaciones.

### Evidencia MS-10 — 18 de noviembre de 2026

- Flujo continuo de onboarding obligatorio para nuevos jugadores: `Cuenta (apodo + PIN) → Datos mínimos (distrito y posición) → Test de fútbol (14 preguntas) → Carta inicial estimada`.
- Validación estricta por servidor en `/api/user/complete-profile` y `/api/user/submit-football-test`:
  - Rechazo con HTTP 400 (`INVALID_DISTRICT`, `INVALID_POSITION`, `INVALID_AGE`) ante datos faltantes o fuera de rango.
  - Validación de exactamente 14 respuestas válidas (letras A-E o enteros 1-5); rechazo estricto con HTTP 400 (`INVALID_ANSWERS`) ante envíos incompletos, vacíos o manipulados.
  - Eliminación total de rellenos automáticos silenciosos y generación aleatoria de estadísticas.
- Carta de jugador determinista y sin atributos inventados (D-06):
  - Atributos FUT (`rit`, `tir`, `pas`, `reg`, `def`, `fis` y `ovr`) calculados matemáticamente a partir de las 4 categorías oficiales del test (Físico 20%, Técnica 25%, Lectura 20%, Posición 35%) y la demarcación del deportista.
  - Calibración de rating inicial Glicko-2 vinculada al nivel oficial obtenido (1200 a 1600 pts) y sincronizada en los perfiles `user_profiles` (`1v1`, `5v5`, `6v6`, `7v7`, `8v8`, `11v11`) con `rd = 350` y `matchesPlayed = 0`.
- Reanudación y preservación de invitaciones (V-05, V-06):
  - Almacenamiento local de respuestas parciales en `@matchsport:partial_test_answers` para retomar el test en la pregunta pendiente tras cerrar o recargar la aplicación.
  - Conservación de invitaciones en `@matchsport:pending_invite_code` para redirigir y unir al jugador automáticamente a la sala una vez obtenida su carta inicial.
  - Interfaz de `ProfileScreen` y `FootballLevelTestScreen` con la insignia transparente `🎯 NIVEL INICIAL ESTIMADO` y nota explicativa de evolución competitiva; retiro de datos ficticios/demo.
- Endpoint de verificación `/api/user/onboarding-status` para trazabilidad de estado del deportista.
- Seis casos de prueba nuevos en `server/tests/onboarding.test.js` y `server/tests/client-session.test.js`; **97 pruebas conjuntas aprobadas al 100%**.
- Build de `apps/admin-web` aprobada (1886 módulos). Exportación de bundle móvil iOS/Hermes aprobada (773 módulos). Base personal sin modificaciones.

### Evidencia MS-11 — 18 de noviembre de 2026

- Consolidación de la navegación en torno a 3 destinos principales: **Jugar · Mis partidos · Perfil**:
  - `BottomNavBar.js`: barra inferior nativa limpia con 3 botones de acceso prioritario (`JUGAR`, `MIS PARTIDOS`, `PERFIL`) y soporte para tamaños de fuente del sistema con `adjustsFontSizeToFit` y `numberOfLines={1}`.
  - Accesos secundarios desvinculados de la barra inferior principal: encabezado superior con accesos directos a Notificaciones (🔔) y Clasificación/Ranking general (🏆).
- Tarjetas de convocatorias y partidos con una **acción primaria clara destacada por estado**:
  - Convocatoria abierta (`OPEN`): botón primario «Unirme al partido (X cupos) ➔» para visitantes o «Mi sala (faltan X) ➔» para miembros.
  - Sala completa (`FULL`): botón primario «Entrar a la sala de coordinación ➔» para participantes o «Sala completa · Ver detalles» para externos.
  - Partido en juego (`IN_PROGRESS`): «⚽ Reportar marcador final ➔» para capitanes o «En juego · Coordinar partido ➔» para jugadores.
  - Marcador pendiente (`RESULT_PENDING`): «⚠️ Validar o disputar marcador ➔» para el capitán rival o «Marcador reportado · Ver detalle ➔».
  - Disputa arbitral (`DISPUTED`): «⚖️ Disputa en revisión ➔».
  - Partido finalizado (`FINISHED`): «🏆 Ver resultado (X-Y) ➔».
  - Sala cancelada (`CANCELLED`): «Ver motivo de cierre ➔».
- Filtros secundarios bajo demanda en pantalla `Jugar`:
  - Panel desplegable («Filtros ▾») para filtrar por modalidad de fútbol (`5v5`, `6v6`, `7v7`, `9v9`, `11v11`) y distrito, manteniendo la vista despejada y limpia por defecto.
- Eliminación absoluta de datos de demostración y recorridos ficticios en todo el cliente móvil:
  - `LoginScreen.js`: eliminada la sección `demoSection` con cuentas de prueba ("Carlos", "Mateo", "Lucía"), retiro de draft ficticio y previews artificiales; formulario limpio de acceso y registro de cuenta con PIN seguro.
  - `SplashScreen.js`: eliminada cifra ficticia `+24,500 JUGADORES` y etiqueta inventada `⚡ S11 FUT`; presencia real con modalidades 5v5/7v7/11v11 y acceso seguro con PIN.
  - `ProfileScreen.js`: eliminación completa de `MOCK_MATCH_HISTORY` (partidos simulados contra "FC Miraflores", etc.) y estadísticas hardcodeadas; consulta e integración del historial oficial real mediante `/api/user/:userId/matches` y métricas reales (`wins`, `losses`, `draws`, `winRate`, `ratingOverall` Glicko-2).
  - `LeaderboardScreen.js`: retiro del fallback `MOCK_LEADERS` de usuarios inventados; soporte para prop `onBack` y estado de clasificación honesto en base a datos reales.
  - `NotificationsScreen.js`: eliminación de avisos sintéticos `INITIAL_NOTIFICATIONS`; estado honesto de bandeja vacía cuando no existen avisos pendientes.
  - `LobbyRoomScreen.js`, `MatchRoomScreen.js` y `PeerReviewScreen.js`: erradicados los fallbacks ficticios (`demo_user_1`, `demo_match_1`, `Mateo Ramos`).
- Estados explícitos y honestos de carga, error y vacío:
  - Carga: `ActivityIndicator` con texto contextual descriptivo («Buscando convocatorias abiertas en tu zona...», «Cargando tus partidos e inscripciones...»).
  - Error: banner accesible con botón de «Reintentar».
  - Vacío en Jugar: vista vacía honesta cuando no hay salas abiertas con botón primario «+ Crear Convocatoria Ahora» y secundario «Tengo un código de invitación».
  - Vacío en Mis Partidos: vista vacía honesta con botón de acción directa «Explorar Convocatorias en Jugar ➔» que transiciona fluidamente a la pestaña principal.
  - Vacío en Historial de Perfil: aviso claro de ausencia de partidos previos con redirección a Jugar.
- Accesibilidad en iPhone y tamaños de texto grande: uso de `flexShrink: 1`, flex wrapping, botones con minHeight adaptativo y scroll continuo.
- **Suite de pruebas:** **97 de 97 pruebas del servidor aprobadas al 100%** (`npm run test:server`).
- **Builds:** `npm run build:admin` (1886 módulos) y `expo export --platform ios` (773 módulos) aprobadas sin errores.
- **Siguiente tarea prioritaria en el Backlog: MS-12** (SuperAdmin operativo y trazable).

### Evidencia MS-12 — 18 de noviembre de 2026

- **Trazabilidad y auditoría completa en persistencia y endpoints administrativos:**
  - **Ban y Desuspensión:** `POST /api/admin/user/:userId/ban` registra obligatoriamente actor (`bannedBy` / `unbannedBy`), motivo (`banReason` / `unbanReason`), fecha (`bannedAt` / `unbannedAt`) y horas (`bannedHours`). Enviar `hours: 0` levanta la sanción, restaura el acceso del jugador y emite el evento socket `userUnbannedNotification`.
  - **Reset de PIN:** `POST /api/admin/user/:userId/reset-pin` registra actor (`pinResetBy`), motivo (`pinResetReason`) y fecha (`pinResetAt`), actualiza el hash bcrypt, incrementa `sessionVersion` invalidando sesiones previas de inmediato y persiste de forma atómica en SQLite.
  - **Resolución de disputas:** `POST /api/admin/disputes/resolve` registra actor (`resolvedBy` / `disputeResolvedBy`), motivo formal del dictamen arbitral (`resolutionReason`) y fecha (`resolvedAt`), tanto en convocatorias modernas como en partidos del esquema heredado.
  - **Base de datos SQLite:** Esquema ampliado en `server/database.js` y `server/db.js` con columnas dedicadas (`banned_by`, `banned_at`, `banned_hours`, `unbanned_by`, `unbanned_at`, `unban_reason`, `pin_reset_by`, `pin_reset_at`, `pin_reset_reason`), garantizando la preservación durable de auditoría tras reinicios del servidor.
  - **DTOs seguros:** `server/userDto.js` expone los metadatos de auditoría al SuperAdmin (`toClientUser`) y los excluye rigurosamente del perfil público (`toPublicUser`).
- **Panel Web Desktop SuperAdmin (`apps/admin-web`):**
  - `PlayerAuditView.jsx`: diálogos interactivos que exigen motivo formal para suspender, desuspender o resetear PIN; visualización del estado de cuenta en vivo (badge de sanción con actor/motivo/duración o activo, y último reseteo de PIN); botón de acción condicional (Ban / Desuspender); mensajes de error de API explícitos con botón de «Reintentar».
  - `DisputeResolutionView.jsx`: flujo arbitral interactivo que solicita dictamen motivado al SuperAdmin antes de declarar ganador oficial (Equipo A o Equipo B) o dictaminar empate; soporte integral para estados `disputed` y `DISPUTED`.
  - `MetricsOverviewView.jsx`: eliminación de las cifras ficticias de respaldo `totalUsers || 13` y `totalMatches || 2`; renderizado transparente de métricas reales o estado de carga/error (atendiendo A-17 de `AUDITORIA.md`).
  - `App.jsx`: banner global de error de sincronización de API accesible y prominente con recarga reactiva de datos al pulsar «Reintentar».
- **Suite automatizada de pruebas:**
  - Nueva suite `server/tests/admin-audit.test.js`: validación de ciclo completo para ban/unban, reset de PIN, resolución de disputas, revocación de sesión, rechazo 403 a usuarios regulares y persistencia en SQLite tras reinicio del proceso.
  - Registro de evento de seguridad `userUnbannedNotification` en `server/realtime.js`.
  - **99 de 99 pruebas de la suite del servidor aprobadas al 100%** (`npm run test:server`).
  - Compilación de `apps/admin-web` (`npm run build:admin`) y exportación nativa de `apps/mobile` (`expo export --platform ios`) verificadas al 100%.
- **Siguiente tarea prioritaria en el Backlog: MS-13** (Automatizar validaciones y build nativa).

### Evidencia MS-13 — 18 de noviembre de 2026

- **Pipeline Capacitor retirado del camino vigente (A-13):**
  - Eliminado el workflow heredado `.github/workflows/build-apk.yml` que construía web empaquetada en Android con `npm ci || npm install`.
  - Retirado el directorio nativo wrapper `android/`, el archivo de configuración `capacitor.config.json` y las dependencias obsoletas `@capacitor/*` (`@capacitor/android`, `@capacitor/cli`, `@capacitor/core`, `@capacitor/geolocation`) del `package.json` raíz.
  - `package-lock.json` actualizado y depurado, asegurando reproducibilidad estricta (`npm ci --dry-run` verificado sin advertencias).
- **Nuevo pipeline de Integración Continua (.github/workflows/ci.yml):**
  - Configurado workflow moderno con matriz multi-versión de Node.js fijada (20.x y 22.x) y motores requeridos (`engines: { node: ">=20.0.0", npm: ">=10.0.0" }`).
  - Instalación estricta y reproducible garantizada mediante `npm ci` (sin fallback degradante `|| npm install`).
  - Ejecución automatizada de la suite oficial completa de pruebas de backend (`npm run test:server`). Falla inmediatamente ante cualquier regresión en casos positivos o en pruebas negativas de seguridad (401, 403, 409, RBAC, tokens inválidos o manipulados).
  - Verificación de compilación de escritorio del Panel SuperAdmin (`npm run build:admin` con Vite).
  - Verificación de exportación de bundle nativo móvil con Hermes tanto para iOS (`expo export --platform ios`) como para Android (`expo export --platform android`).
- **Scripts y validación unificada (A-14):**
  - Adición de scripts unificados en `package.json`: `validate`, `build:mobile` y `build:mobile:android`.
  - Adición de scripts nativos de exportación en `apps/mobile/package.json`: `export`, `export:ios` y `export:android`.
  - Aislamiento y documentación de scripts históricos de prototipado en [scripts/README.md](../scripts/README.md) y banner de advertencia en `scripts/test_backend_full.js`, formalizando a `server/tests/` como la única suite autoritativa del proyecto.
- **Verificación local completa:**
  - `npm run validate`: 99 de 99 pruebas de servidor aprobadas al 100%, build de admin web en 1.75s y exportación nativa de bundle móvil iOS en 4.3s.
  - `npm run build:mobile:android`: exportación nativa de bundle móvil Android en 4.4s.
- **Siguiente tarea prioritaria en el Backlog: MS-14** (Entorno de piloto y operación).

### Evidencia MS-14 — 18 de noviembre de 2026

- **Configuración por entorno y resolución de A-15:**
  - `apps/mobile/src/config.js`: Desacoplado de IP fija de LAN; soporte prioritario para `process.env.EXPO_PUBLIC_API_URL` o `Constants.expoConfig.extra.apiUrl`; detección dinámica de IP de Metro en desarrollo local con fallback de emulador Android (`10.0.2.2`) o iOS (`localhost:3001`).
  - `apps/admin-web/src/services/api.js` y `socket.js`: Soporte para `import.meta.env.VITE_API_URL` y `VITE_SOCKET_URL`, permitiendo despliegues flexibles tras proxy o dominios separados.
  - `server/config.js`: Integración de variables `CORS_ORIGIN`, `PUBLIC_URL` y `nodeEnv`.
  - Plantilla exhaustiva [.env.example](../.env.example) con instrucciones claras para entornos de desarrollo y producción.
- **Seguridad en producción y logs sin credenciales:**
  - En `NODE_ENV=production`, `JWT_SECRET` es estrictamente obligatorio con al menos 32 bytes de entropía (falla cerrado de inmediato si falta o es insuficiente).
  - En `NODE_ENV=production`, la siembra de usuarios demo (`MATCHSPORT_SEED_DEMO=true`) es terminantemente rechazada.
  - `server/logger.js`: Implementado filtro de sanitización Winston (`sanitizeLogText`) que redacta contraseñas, PINs, tokens Bearer y push tokens antes de escribirlos en `logs/matchmaking.log` o por consola.
- **Monitoreo y observabilidad:**
  - Endpoint `/api/health` ampliado: reporta `status: 'ok'`, entorno activo (`env`), tiempo de actividad (`uptime`), estado de base de datos (`database`), versión de esquema (`schemaVersion`), consumo de memoria (`rssMb`, `heapUsedMb`) y conexiones WebSocket activas (`connectedSockets`).
- **Guía de operación de piloto y Disaster Recovery ([docs/OPERACION_PILOTO.md](OPERACION_PILOTO.md)):**
  - Arquitectura de red documentada con terminación SSL/TLS para HTTPS y WSS mediante Nginx reverse proxy.
  - Procedimiento ensayado de respaldo (`server/backup.js backup`) y restauración (`server/backup.js restore`) validado con checksums SHA-256 e integridad SQLite.
  - Protocolo de respuesta ante incidentes a cargo de Aldo Segundo Solís, con matriz de severidades (P0, P1, P2) y procedimientos de contención inmediata.
- **Suite automatizada de pruebas y builds:**
  - Nueva suite `server/tests/environment-operation.test.js`: prueba el healthcheck enriquecido, las salvaguardas de producción (fail-closed), la sanitización de credenciales en logs y el simulacro de disaster recovery con restauración y login en un servidor nuevo.
  - **103 de 103 pruebas del backend aprobadas al 100%** (`npm run test:server`).
  - Compilación de `apps/admin-web` (`npm run build:admin`) y exportaciones móviles nativas iOS y Android (`npm run build:mobile`, `npm run build:mobile:android`) aprobadas sin errores.
- **Siguiente tarea prioritaria en el Backlog: MS-15** (Avisos y validación en dispositivos).

### Evidencia MS-15 — 18 de noviembre de 2026

- **Permisos contextuales y manejo de denegación (V-15 / V-18):**
  - `apps/mobile/src/services/notificationService.js`: comprobación de permisos no invasiva (`getPermissionStatus()`), solicitud contextual segura (`requestPermissions()`), configuración del canal nativo Android con alta prioridad y sonido (`setupAndroidChannel()`), y extracción segura de push tokens sin provocar excepciones en simuladores o Expo Go (`getPushToken()`).
  - `apps/mobile/src/screens/NotificationsScreen.js`: banner explícito de aviso si los permisos del dispositivo están denegados («⚠️ Notificaciones Desactivadas - No recibirás avisos si la app está en segundo plano»), con botón interactivo «Activar» para reintentar la concesión del permiso sin bloquear ni congelar la interfaz.
- **Registro de Push Token en Servidor y Persistencia Durable en SQLite:**
  - `apps/mobile/src/services/api.js`: nuevo método `registerPushToken(userId, pushToken)` que invoca `POST /api/user/push-token`. Se sincroniza automáticamente tras el login o restauración de sesión.
  - `server/database.js`: tabla `users` actualizada con columna `push_token TEXT` mediante migración segura en `createTables()`. Consultas `sqlInsertUser` y `rowToUser` extendidas para garantizar la persistencia atómica y durable del token tras reinicios del servidor.
  - Privacidad estricta: `server/userDto.js` excluye rigurosamente `pushToken` y `push_token` tanto de perfiles públicos como de las respuestas cliente (`toPublicUser` y `toClientUser`).
- **Despacho Push con entrega a «Solo Destinatario Correcto» (server/pushService.js):**
  - Despachador de notificaciones push desacoplado y resiliente, con soporte para Expo Push Service (`https://exp.host/--/api/v2/push/send`).
  - Filtros estrictos de seguridad: exclusión total de usuarios baneados (`isBanned: true`), descarte de tokens vacíos y tolerancia a fallos de red sin interrumpir las transacciones del servidor.
  - Enrutamiento por evento de negocio:
    - Chat de convocatoria (`notifyCompetitionMessage`): se envía exclusivamente a los miembros de la sala, omitiendo al propio remitente.
    - Marcador reportado (`notifyScoreReported`): avisa al capitán rival y participantes con goles para validación o disputa.
    - Marcador confirmado (`notifyScoreConfirmed`): notifica a todos los participantes la finalización oficial y actualización de ratings Glicko-2.
    - Marcador disputado (`notifyScoreDisputed`): notifica apertura de arbitraje SuperAdmin con el motivo congelado.
    - Disputa resuelta (`notifyDisputeResolved`): notifica el dictamen oficial emitido por el SuperAdmin.
    - Convocatoria lista (`notifyMatchReady`): alerta cuando todos los cupos están cubiertos y confirmados.
  - Integrado de forma reactiva con los eventos de negocio en `server/realtime.js`.
- **Interacción desde segundo plano, pulsación y fallback al abrir la app:**
  - `apps/mobile/src/services/storage.js`: persistencia local de intenciones pendientes (`savePendingNotificationIntent`, `getPendingNotificationIntent`, `clearPendingNotificationIntent`) y almacén histórico de notificaciones (`getNotifications`, `addNotification`, `markAllNotificationsRead`).
  - `apps/mobile/App.js`: suscripción reactiva a pulsaciones de notificaciones (`addNotificationResponseReceivedListener`) y detección de apertura en frío (`getLastNotificationResponseAsync`).
  - Navegación dirigida con fallback robusto:
    - Si el usuario no ha iniciado sesión, la intención se conserva en storage y se ejecuta fluidamente tras completar el login y onboarding (V-06).
    - Si la convocatoria o partido existe, `CompetitionScreen` transiciona inmediatamente a la vista detallada (`detail`).
    - Si el partido ya finalizó, fue cancelado o no existe, se presenta un `Alert` nativo descriptivo y la app regresa de forma segura a la lista principal (`JUGAR`), sin colapsar ni mostrar datos demo inventados.
- **Centro de Notificaciones Nativo Móvil:**
  - Los eventos de socket en vivo (`lobbyNeedsOne`, `competitionScoreReported`, `competitionScoreConfirmed`, etc.) se registran automáticamente en el almacén local del dispositivo.
  - Tarjetas de aviso interactivas con acceso directo («Toca para abrir partido o sala ➔») y acción rápida de «Marcar como leídas».
- **Suite automatizada de pruebas y builds:**
  - Nueva suite `server/tests/device-notifications.test.js`: prueba el rechazo 401 a usuarios anónimos, la protección 403 contra spoofing de tokens entre cuentas (`ownBody`), la persistencia del token en SQLite tras reinicio, la exclusión del token en DTOs públicos, el filtrado estricto a «Solo destinatario correcto», el bloqueo a usuarios baneados y la resiliencia ante errores de red del servicio push.
  - **105 de 105 pruebas del servidor aprobadas al 100%** (`npm run test:server`).
  - Compilación de `apps/admin-web` (`npm run build:admin`) y exportación nativa de Hermes aprobada para iOS (`npm run build:mobile`) y Android (`npm run build:mobile:android`).
- **Siguiente tarea prioritaria en el Backlog: MS-16** (Ensayo y piloto privado).

### Evidencia Corrección Móvil: Notificaciones, Ranking y BottomBar 4 Pestañas — 22 de noviembre de 2026

- **Problema corregido:**
  1. En `LeaderboardScreen.js`, acceso sin validar `top1.name.split(' ')` provocaba `TypeError: Cannot read property 'split' of undefined` al abrir el trofeo o la tabla de posiciones.
  2. En `NotificationsScreen.js`, `new Date(item.time).toLocaleTimeString('es-PE')` causaba `RangeError: Invalid time value` al procesar formatos de texto o fechas sin parsear. Adicionalmente, faltaba manejo de rechazo en `notificationService.getLastNotificationResponseAsync()`.
  3. La barra de navegación inferior (`BottomNavBar`) solo tenía 3 pestañas (`JUGAR`, `MIS PARTIDOS`, `PERFIL`).
- **Cambios realizados:**
  1. `apps/mobile/src/components/BottomNavBar.js`: reestructurado a 4 pestañas con iconos e indicadores activos: **JUGAR (⚽)**, **SALAS (🏟️)**, **RANKING (🏆)** y **PERFIL (👤)**.
  2. `apps/mobile/App.js`: soporte de 4 pestañas en `activeTab`, renderizado de `LeaderboardScreen` en la pestaña `RANKING`, vinculación del trofeo del header y del enlace de perfil a la pestaña de ranking, y acceso directo a convocatorias del jugador en `SALAS`.
  3. `apps/mobile/src/screens/LeaderboardScreen.js`: normalización defensiva con helpers `getPlayerName`, `getPlayerFirstName`, `getPlayerAvatar`, `getPlayerElo` y `getPlayerDistrict`, selector de modalidades (5v5, 6v6, 7v7, 1v1), y botón volver contextual.
  4. `server/server.js`: enriquecimiento de `/api/leaderboard/:sportId/:formatId` aplanando `id`, `name`, `avatar`, `district`, `elo` y `rank` junto al DTO público de usuario.
  5. `apps/mobile/src/screens/NotificationsScreen.js` y `notificationService.js`: formateo seguro de fechas `formatNotificationTime`, captura de promesas asíncronas en listeners y botón interactivo para disparar notificaciones locales de prueba en el dispositivo.
- **Pruebas ejecutadas:**
  - Suite de servidor: 105 pruebas pasadas (0 fallos).
  - Admin Web: `vite build` completado con éxito en 4.42s (código 0).
  - Mobile Android: `expo export --platform android` empaquetado con éxito (Hermes bytecode 2.2MB, código 0).
  - Mobile iOS: `expo export --platform ios` empaquetado con éxito (Hermes bytecode 2.2MB, código 0).

### Evidencia Algoritmo de Matchmaking en Jugar y Gestión de Convocatorias en Salas — 22 de noviembre de 2026

- **Requerimiento cumplido:**
  1. Integración del algoritmo de emparejamiento automático (`RadarScreen`) en la pestaña **JUGAR (⚽)**: radar con barrido animado de 360°, pulso concéntrico, detección de jugadores activos en tiempo real vía sockets, selección de modalidades (1v1 a 11v11), radio en km, distrito y disparo de cola (`startQueue`) conectado al motor `MatchmakingEngine` con prompt MOBA de 20 segundos (`matchPromptAcceptance`).
  2. Traslado y potenciación de la gestión y creación de salas a la pestaña **SALAS (🏟️)**: `CompetitionScreen` aloja la vista completa de convocatorias públicas, creación de convocatorias con fecha/hora/cancha/distrito, ingreso con código de 8 caracteres, filtros y nuevo selector de sub-pestañas: `TODAS LAS SALAS` vs `MIS CONVOCATORIAS`.
- **Cambios realizados:**
  - `apps/mobile/App.js`: importación de `RadarScreen`, montaje en `activeTab === 'JUGAR'` y montaje de `CompetitionScreen` en `activeTab === 'SALAS'`.
  - `apps/mobile/src/screens/RadarScreen.js`: subheader integrado `RADAR GLICKO-2 / EMPAREJAMIENTO AUTOMÁTICO` con píldora de jugadores activos, validación robusta de onboarding sin bloqueos espurios.
  - `apps/mobile/src/screens/CompetitionScreen.js`: estado `filterMine` con selector de sub-pestañas `TODAS LAS SALAS` vs `MIS CONVOCATORIAS`, encabezados actualizados y retención de filtros.
- **Pruebas ejecutadas:**
  - Suite de servidor: 105 pruebas aprobadas al 100% (0 fallos).
  - Mobile Android: `expo export --platform android` empaquetado exitoso (código 0).
  - Mobile iOS: `expo export --platform ios` empaquetado exitoso (código 0).

### Evidencia Rediseño Obsidian Pitch (Stitch) — Entrega 1: LoginScreen / Túnel de Acceso — 23 de noviembre de 2026

- **Objetivo cumplido:**
  - Renovación completa de `apps/mobile/src/screens/LoginScreen.js` bajo el sistema de diseño **Obsidian Pitch** (`stitch_designs/stitch_matchsport_mobile_app/matchsport_loginscreen`) aplicando el filtro de correspondencia con el backend real.
- **Cambios realizados:**
  1. `apps/mobile/src/theme.js`: incorporación de tokens oficiales Obsidian Pitch (`surfaceLowest`, `surfaceLow`, `surfaceContainer`, `surfaceHigh`, `surfaceHighest`, `neonPitch`, `onSurface`, `onSurfaceVariant`, `outline`, `coralError`) preservando retrocompatibilidad total.
  2. `apps/mobile/src/screens/LoginScreen.js`: estructura nativa vertical (header fijo con retorno a bienvenida, píldora de marca y ayuda arbitral + cuerpo scrolleable con título atlético, selector de apodo con verificación en vivo `GET /api/auth/check-name/:name`, 4 casillas cinéticas luminosas para el PIN de 4 dígitos, teclado numérico táctico integrado 3x4 con respuesta háptica `expo-haptics`, acceso alternativo real vía Email y conmutación limpia Login/Registro). Se descartaron SMS OTP de 6 dígitos y biometría Face ID simulada para mantener 0 recorridos ficticios.
  3. `apps/mobile/src/services/api.js`: conexión de métodos públicos reales `emailLogin` (`POST /api/auth/login`) y `emailRegister` (`POST /api/auth/register`).
  4. `apps/mobile/App.js`: encadenamiento directo tras el registro hacia `PlayerBiometricsScreen` cuando `!currentUser.hasCompletedProfile`, conectando con el flujo de calibración física y test de 14 preguntas (MS-10).
- **Pruebas ejecutadas:**
  - Suite de servidor: 105 de 105 pruebas aprobadas al 100% (0 fallos).
  - Mobile iOS: `expo export --platform ios` aprobado (770 módulos, Hermes bytecode 2.2MB, código 0).
  - Mobile Android: `expo export --platform android` aprobado (778 módulos, Hermes bytecode 2.2MB, código 0).

### Evidencia Rediseño Obsidian Pitch (Stitch) — Entrega 2: Onboarding (Splash, Biometrics, Test) y Situación Global en Cola — 23 de noviembre de 2026

- **Objetivo cumplido:**
  - Unificación visual completa de la fase de entrada del jugador (`SplashScreen`, `PlayerBiometricsScreen`, `FootballLevelTestScreen`) bajo las maquetas de Google Stitch.
  - Implementación de la **Situación Global en Cola (Sticky Queue Bar)** y soporte para **Notificación Persistente (Ongoing Notification)** sin costo de CPU/servidor.
- **Cambios realizados:**
  1. `apps/mobile/src/screens/SplashScreen.js`: rediseñado con atmósfera de estadio Obsidian Pitch, insignias `AMATEUR PRO CIRCUIT` + `HUD LIVE`, rotación continua de radar holográfico con brackets HUD esquineros, haz de luz y barra calibrada de progreso (`Iniciando sistema...` ➔ `¡Listo para jugar!`).
  2. `apps/mobile/src/screens/PlayerBiometricsScreen.js` (Paso 1: Calibración Física): mini-cancha táctica interactiva con nodos (`DEL`, `MED`, `DEF`, `POR`) y variantes (`Extremo Izq`, `Pivote`, etc.), módulo de foto deportiva con dorsal `#10` (conectado a `expo-image-picker`), selectores de altura, peso, edad, distrito en Lima y pierna hábil (`DIESTRO` vs `ZURDO`), validando límites contra `POST /api/user/complete-profile`.
  3. `apps/mobile/src/screens/FootballLevelTestScreen.js` (Paso 2: Calibración Táctica): cuestionario oficial de 14 preguntas con tarjetas tácticas multinivel (Tier Bronce, Plata, Oro, Élite), medidor OVR en vivo (`Base: XX`), mini-tarjeta de telemetría HUD con barras de RIT, PAS, FIS sincronizadas dinámicamente y cálculo determinista sin datos inventados. Al finalizar, renderiza la Carta FUT estimada con desglose porcentual.
  4. `apps/mobile/src/services/notificationService.js`: métodos `startOngoingSearchNotification` y `dismissOngoingSearchNotification` que activan la notificación persistente nativa en la barra de Android/iOS con cronómetro de hardware mientras la app está minimizada.
  5. `apps/mobile/App.js`: barra global flotante (`Sticky Queue Bar`) visible al navegar en cualquier pestaña (`SALAS`, `RANKING`, `PERFIL`) mientras se busca partido (`🟢 BUSCANDO 5v5 EN SURCO (00:43) · [✕]`), con redirección a `JUGAR` o cancelación inmediata sincronizada con `cancelQueue`.
- **Pruebas ejecutadas:**
  - Suite de servidor: 105 de 105 pruebas aprobadas al 100% (0 fallos).
  - Mobile iOS: `expo export --platform ios` aprobado (774 módulos, Hermes bytecode 2.2MB, código 0).
  - Mobile Android: `expo export --platform android` aprobado (782 módulos, Hermes bytecode 2.3MB, código 0).

### Evidencia Rediseño Obsidian Pitch (Stitch) — Entrega 3: Radar Jugar, Calibración de Radar, Ubicación GPS y BottomNavBar — 24 de noviembre de 2026

- **Objetivo cumplido:**
  - Renovación nativa en React Native / Expo de la pestaña principal **Jugar (`RadarScreen.js`)**, **Calibración de Radar (`CalibrationScreen.js`)**, **Ubicación & GPS (`LocationSettingsScreen.js`)** y la barra inferior **`BottomNavBar.js`** siguiendo las maquetas oficiales de Google Stitch (`matchsport_tab_1_radar_jugar`, `matchsport_calibrationscreen_calibraci_n_de_radar`, `matchsport_locationsettingsscreen_ubicaci_n_gps`) bajo el sistema de diseño **Obsidian Pitch**.
- **Cambios realizados:**
  1. `apps/mobile/src/screens/RadarScreen.js`:
     - Sub-header Hub Identity con avatar del jugador, píldora OVR real, insignia de posición/nivel, puntos ELO Glicko-2 y botón táctico `⚙️` hacia `CalibrationScreen`.
     - Píldora de distrito y radio activo (`Surco, Lima · 8 km`) conectada a `LocationSettingsScreen` + indicador en vivo `GPS Preciso` (`expo-location`).
     - Selector horizontal de modalidades con conteo de salas reales y tira de telemetría en vivo (`EN JUEGO`, `ACTIVOS` vía socket `onlineUsersCount`, `CONVOCATORIAS`).
     - Radar táctico circular con anillos dinámicos en km, marcas cardinales (`N`, `S`, `E`, `O`), barrido rotatorio 360°, blips interactivos alimentados por convocatorias reales (`GET /api/competitions`) y tarjeta inspectora (`Inspector Card`) con acción directa `POSTULAR ➔` o estado vacío honesto.
     - Tarjeta Hero `MATCH RÁPIDO SMART — Auto-Emparejamiento Inmediato` conectada a `startQueue` / `cancelQueue` y creación de sala de escuadra (`createLobby`).
  2. `apps/mobile/src/screens/CalibrationScreen.js`:
     - Selector de radio con chips rápidos (`3 km`, `8 km (Recomendado)`, `15 km`, `25 km Max`), control continuo 1–25 km y mini-radar táctico animado con vista previa en vivo.
     - Tarjetas de tolerancia de nivel y ELO Glicko-2 (`Equilibrado ±50 ELO`, `Competitivo Estricto +100 ELO`, `Cualquier Nivel Rápido`) con cálculo dinámico de la ventana ELO permitida sobre el rating real del jugador.
     - Selector multi-formato, chips de superficie preferida (`Sintético Pro 60mm`, `Césped Natural`, `Losa Pulida`), switches de Fair Play/validación de capitanes/hápticos y persistencia local en `@matchsport:radar_preferences`.
  3. `apps/mobile/src/screens/LocationSettingsScreen.js`:
     - Switch de GPS en Tiempo Real y botón `Recalibrar Posición` integrado con `expo-location`.
     - Mapa vectorial táctico de distritos de Lima con pin radar pulsante, conmutador `Táctico / Satélite` y controles de zoom.
     - Buscador de distritos con autocompletado conectado a `GET /api/districts`, píldoras de zonas frecuentes guardadas (`Casa`, `Oficina`, `+ Añadir Zona`), selector de radio de traslado (`5 km`, `10 km`, `20 km`), modo de desplazamiento (`Auto/Taxi`, `Bicicleta/Scooter`, `Caminando`) y switches de privacidad.
  4. `apps/mobile/src/components/BottomNavBar.js` y `apps/mobile/src/services/storage.js`:
     - Estética Obsidian Pitch con icono diana concéntrica nativa para `JUGAR` e indicador luminoso `#00FF87` con sombra neón; métodos de persistencia `getRadarPreferences`/`saveRadarPreferences` y `getLocationPreferences`/`saveLocationPreferences`.
- **Pruebas ejecutadas:**
  - Suite de servidor (`npm run test:server`): 105 de 105 pruebas aprobadas al 100% (0 fallos).
  - Mobile iOS (`npm run build:mobile`): exportación Hermes aprobada sin errores.
  - Mobile Android (`npm run build:mobile:android`): exportación Hermes aprobada sin errores.
- **Commit:** `b5cd8aa` publicado en `origin/codex/mvp-base`.

### Evidencia Rediseño Obsidian Pitch (Stitch) — Entrega 4: Pestaña Salas / Convocatorias (`CompetitionScreen.js`) y Sala de Convocatoria Activa (`LobbyRoomScreen.js`) — 24 de noviembre de 2026

- **Objetivo cumplido:**
  - Rediseño nativo en React Native / Expo de `CompetitionScreen.js` (`matchsport_tab_2_salas_lobbies_convocatorias`) y `LobbyRoomScreen.js` (`matchsport_lobbyroomscreen_sala_de_convocatoria_activa`) bajo el sistema de diseño **Obsidian Pitch**, manteniendo intacto todo el contrato transaccional `competition.v1` y los eventos Socket.IO reales.
- **Cambios realizados:**
  1. `apps/mobile/src/screens/CompetitionScreen.js`:
     - HUD Header con indicador luminoso `SALAS DE JUEGO`, píldora satelital de región activa, selector segmentado `TODAS LAS SALAS` vs `MIS CONVOCATORIAS` y Quick Action Launchpad (`⊕ CREAR SALA` + `🔑 CÓDIGO`).
     - Telemetry Live Ticker Strip con conteo real de salas registradas, salas abiertas y partidos en juego + botón de actualización reactiva.
     - Buscador táctico en tiempo real (por cancha, distrito o código) y carrusel de píldoras de filtro (`Todas`, `Abiertas`, `Hoy`, `Fútbol 5`, `Fútbol 6`, `Fútbol 7`, `Fútbol 9`, `Fútbol 11`) + filtro nacional de distritos (`GET /api/districts`).
     - Tarjetas de convocatorias Obsidian Pitch con acento lateral neón/coral (`🔥 URGENTE: FALTA 1` cuando queda 1 cupo), barra visual de progreso de cupos confirmados y botón CTA por estado (`UNIRSE`, `MI SALA`, `REPORTAR GOLES`, `VALIDAR MARCADOR`, `REVISAR DISPUTA`, `RESULTADO`).
     - Vista de Detalle de Sala (`page === 'detail'`) rediseñada con **Tactical Pitch Split View** (`Equipo A · Esmeralda` vs `Equipo B · Furia Coral`, módulo central `VS`, dorsales `01..11`, insignias `CAP`, estados `✓ LISTO` / `⭮ EQUIPANDO`, acceso directo al `Canal Táctico / Chat en Vivo`, reporte/confirmación/disputa de marcador y panel inferior de control de anfitrión/capitán).
  2. `apps/mobile/src/screens/LobbyRoomScreen.js`:
     - Header de `SALA DE ESPERA / Match Lobby` con chip `#CÓDIGO` y botón nativo de compartir invitación (`Share.share`).
     - Tarjeta de atmósfera de convocatoria con copia al portapapeles (`expo-clipboard`), estado de quórum y cambio rápido de equipo (`switchLobbyTeam`).
     - Cancha táctica dividida (`Tactical Pitch Split View`) con líneas de campo nativas, promedio de OVR real por escuadra (`Escuadra A · Esmeralda` vs `Escuadra B · Furia Sur`), módulo divisor `VS` y slots interactivos.
     - Mini-chat táctico integrado en vivo (`sendLobbyChatMessage` / `newLobbyChatMessage`) con píldoras de mensajes rápidos (`¡Ya estoy listo!`, `Falta 1 defensa`, `Salgo rápido por las bandas`) y dock inferior con botón `ESTOY LISTO (CONFIRMADO)` e `INICIAR MATCHMAKING`.
- **Pruebas ejecutadas:**
  - Suite de servidor (`npm run test:server`): 105 de 105 pruebas aprobadas al 100% (0 fallos).
  - Mobile iOS (`npm run build:mobile`): exportación Hermes aprobada sin errores.
  - Mobile Android (`npm run build:mobile:android`): exportación Hermes aprobada sin errores.

### Evidencia Sistema de Disponibilidad Persistente / Buscando Partida en Base de Datos — Fase 1 — 26 de noviembre de 2026

- **Objetivo cumplido:**
  - Persistencia durable en SQLite del estado de búsqueda de partida del jugador en la tabla `users`, con expiración automática por TTL y sincronización atómica con las salas de convocatoria (`competitions`).
- **Cambios realizados:**
  1. `server/database.js`: migración segura en `users` para las columnas `matchmaking_status` (`'IDLE' | 'SEARCHING' | 'IN_ROOM'`), `searching_format` (`'7v7'`), `searching_district`, `searching_radius_km` (`8`), `searching_since`, `searching_expires_at` y `active_competition_id`, actualizando `sqlInsertUser`, `sqlUpdateUser` y `rowToUser` en camelCase.
  2. `server/userDto.js`: exposición de `matchmakingStatus`, `searchingFormat`, `searchingDistrict`, `searchingRadiusKm`, `searchingSince`, `searchingExpiresAt` y `activeCompetitionId` en `CLIENT_FIELDS` (`toClientUser`).
  3. `server/db.js`, `server/server.js` y `server/realtime.js`: implementación de `db.updateUserMatchmakingStatus(...)` con validación obligatoria de `hasCompletedProfile` y `hasCompletedTest` para `'SEARCHING'`, cálculo de `searchingExpiresAt` (+4 horas por defecto) y limpieza automática a `'IDLE'` al vencer el TTL; creación del endpoint autenticado `PUT/POST /api/user/matchmaking-status` con emisión de socket `matchmakingStatusUpdated`.
  4. `server/competitions.js`: transición automática a `matchmakingStatus = 'IN_ROOM'` y `activeCompetitionId = value.id` en `create` y `join`, y retorno automático a `'IDLE'` con `activeCompetitionId = null` en `leave`, `cancel`, `confirmScore`, coincidencia de `reportScore` y `resolveDispute`.
  5. `server/tests/matchmaking-status.test.js`: 4 nuevos casos de prueba automatizados verificando rechazo sin onboarding/test completo, persistencia de `'SEARCHING'` en SQLite tras reinicio, expiración por TTL y sincronización completa con salas de convocatoria.
- **Pruebas ejecutadas:**
  - Suite de servidor (`npm run test:server`): 109 de 109 pruebas aprobadas al 100% (0 fallos).
  - Admin Web (`npm run build:admin`) y Mobile iOS (`npm run build:mobile`): compilación y exportación aprobadas sin errores.

### Evidencia Sistema de Disponibilidad Persistente / Buscando Partida en Base de Datos — Fase 2 (Auto-Matchmaking y Derivación a Sala) — 26 de noviembre de 2026

- **Objetivo cumplido:**
  - Motor transaccional `runPersistentMatchmaking()` que empareja automáticamente a los jugadores en estado `'SEARCHING'` en la base de datos SQLite, los asigna a una sala de convocatoria (`competition`), emite el evento Socket `'matchmakingRoomAssigned'` en tiempo real y despacha la notificación Push de derivación.
- **Cambios realizados:**
  1. `server/competitions.js` y `server/server.js`:
     - Implementación de `runPersistentMatchmaking()` ejecutado transaccionalmente cada vez que un jugador cambia su estado a `'SEARCHING'` en `PUT/POST /api/user/matchmaking-status` y cada vez que se crea o queda abierta (`'OPEN'`) una convocatoria en `competitionCommand`.
     - **Caso A (Unir a convocatoria `OPEN` existente):** asigna automáticamente al jugador `'SEARCHING'` compatible en `formatId`, `district` y horario futuro al equipo con menos jugadores (`teamA` o `teamB`), asigna capitán si el equipo no tenía, incrementa `revision`, persiste la convocatoria en SQLite y transiciona al jugador a `'IN_ROOM'` con `activeCompetitionId = competition.id`.
     - **Caso B (Bolsa de jugadores `'SEARCHING'` en la misma zona y modalidad):** al juntarse suficientes jugadores `'SEARCHING'` compatibles (umbral configurable por formato o global), crea automáticamente una sala de convocatoria (`competition`) balanceando `teamA` y `teamB` por su Rating Glicko-2 (`ratingOverall`), asigna capitanes y anfitrión, y pasa a todos los miembros a `'IN_ROOM'` con `activeCompetitionId = competition.id`.
  2. `server/realtime.js` y `server/pushService.js`:
     - Registro de `'matchmakingRoomAssigned'` en `personalEvents` / `SERVER_EVENTS`.
     - Implementación de `pushService.notifyMatchmakingRoomAssigned({ userIds, competition })` con título `"¡Partido encontrado en tu zona! ⚽"`, cuerpo indicando modalidad y distrito, y `data: { type: 'MATCHMAKING_ROOM_ASSIGNED', competitionId: competition.id, code: competition.code }`.
     - Suscripción reactiva en `realtime.js` que emite `'matchmakingRoomAssigned'`, `'matchmakingStatusUpdated'` y `'competitionUpdated'` a los sockets activos y dispara el aviso push.
  3. `server/tests/persistent-matchmaking.test.js`:
     - 4 nuevos casos de prueba automatizados verificando el Caso A al activar `'SEARCHING'`, el Caso A al crearse una convocatoria `'OPEN'`, el Caso B de creación automática de sala con balanceo Glicko-2 y capitanes, y el despacho Push `notifyMatchmakingRoomAssigned`.
- **Pruebas ejecutadas:**
  - Suite de servidor (`npm run test:server`): 113 de 113 pruebas aprobadas al 100% (0 fallos).
  - Validación completa (`npm run validate`): suite de servidor, build de `apps/admin-web` y exportación nativa iOS de `apps/mobile` aprobadas sin errores.

## Trabajo pospuesto

Matchmaking instantáneo como recorrido principal, más deportes, clasificación global prominente, peer review avanzado, temporadas, estadísticas individuales en vivo, B2B, reservas/pagos, microservicios y escalado distribuido. Reconsiderarlos por evidencia de uso y capacidad, no por tener diseños disponibles.

## Formato de evidencia por tarea

```text
ID:
Estado:
Problema / resultado:
Cambios:
Pruebas ejecutadas y resultado:
Validación en dispositivo (si aplica):
Limitaciones o decisiones pendientes:
Commit / PR:
Fecha:
```
