# MS-04 — Identidad y permisos en tiempo real

Entrega técnica del 2 de noviembre de 2026. Continúa [MS-03](SESIONES_Y_PERMISOS.md) y cubre Socket.IO en el backend, móvil y panel. Las reglas completas del partido y la preparación del piloto siguen en el backlog.

Actualización del 3 de noviembre: las convocatorias nuevas usan [el chat y recuperación de MS-08](CHAT_Y_RECONEXION.md), independiente del recorrido heredado descrito aquí. Ese documento especifica sus eventos, historial y reintentos; los límites de esta evidencia de MS-04 se conservan como antecedente.

## Identidad y vigencia

- El handshake exige `auth.token`; no basta con enviar un `userId`. Se comprueban firma, vencimiento, cuenta existente, versión de sesión y sanción vigente mediante el mismo autenticador de REST.
- El servidor registra automáticamente al jugador y recupera sus salas, partido y aceptación pendiente. `registerUser` queda como compatibilidad autenticada; ignora nombre, rol y atributos enviados por el cliente. Un ID ajeno se rechaza.
- Cada paquete entrante pasa por el inventario explícito de `server/socketAccess.js`. Un evento nuevo sin política se rechaza. Cada envío de datos pasa por `server/realtime.js`, que vuelve a comprobar sesión, rol y pertenencia actual. Estar suscrito a una sala antigua no concede acceso después de salir.
- Logout, reset de PIN y sanción desconectan los sockets abiertos cuando cambia la versión persistida; también cancelan cola y aceptación pendientes. El vencimiento se revisa cada segundo y antes de cada entrada/salida. Los tokens quedan solo en memoria del socket, nunca en payloads enviados al cliente ni en SQLite.
- Se conserva una conexión activa por cuenta: una nueva conexión autenticada reemplaza y desconecta la anterior. Esto no revoca por sí solo su JWT REST. Ambos clientes abandonan la vista autenticada al recibir `session_replaced`, sin borrar el token compartido con otra pestaña.
- Una reconexión ordinaria conserva la gracia heredada de 25 segundos. Se actualiza el socket del jugador en una aceptación pendiente. Antes de crear un partido por aceptación, todos los participantes humanos deben conservar conexión y sesión válidas; si falta alguno, se cancela con `session_unavailable`.

## Inventario de permisos

| Grupo de eventos | Control |
|---|---|
| `registerUser`, `unregisterUser` | Solo identidad autenticada; desregistrar desconecta el propio socket |
| `startQueue`/`startSearch`, `cancelQueue`/`cancelSearch`, `getReplacementLobbies` | Actor propio; deporte/formato habilitado y coordenadas válidas para iniciar búsqueda |
| `createLobby` | Anfitrión obtenido de la base; datos de identidad del cliente no se usan |
| `joinLobby`, `joinReplacementSlot` | Jugador propio; sala existente/abierta y equipo válido |
| `leaveLobby`, `toggleLobbyReady`, `switchLobbyTeam`, `sendLobbyChatMessage` | Miembro actual; solo actúa sobre sí mismo |
| `changeLobbyFormat`, `startLobbyMatch`, `startLobbyRadarSearch` | Anfitrión actual; iniciar partido exige cupos completos y jugadores listos |
| `cancelAttendance` | Miembro de la sala o partido indicado |
| `acceptPendingMatch`/`acceptMatch`, `declinePendingMatch`/`declineMatch` | Jugador incluido en esa aceptación; no puede confirmar ni rechazar por otro |
| `joinMatchRoom`, `leaveMatch`, `sendChatMessage`, `disputeMatch` | Participante; autor y nombre del mensaje vienen del servidor |
| `startMatchTimer`, `convertMatchToLobby`, `reportResult` | Capitán de su equipo; si no hay capitán explícito, se usa el primer integrante almacenado |
| `reportResultByReporter` | Solo el reportero designado de un 1v1 |
| `submitReview`, `submitPeerReviewOneTap` | Participante de un partido terminado; destinatario participante o asignación de evaluación del servidor |
| `adminResolveDispute` | Jugador recibe `FORBIDDEN`; admin recibe `USE_REST`. La resolución se hace por la API administrativa de MS-03 |
| `fillLobbyDemos`, `searchLobbyOpponentOnline`, `forceDemoMatch`, `submitFutRatings` | `EVENT_DISABLED`; se retiraron sus handlers remotos. No se permite poblar rivales de prueba ni modificar atributos por la vía antigua |

Los controles de capitán, estados activos, ganador A/B y duraciones 30/45/60/90 minutos son guardas técnicas del recorrido existente. No sustituyen las decisiones D-01/D-04 ni el contrato de estados de MS-05. Empates, plazos de disputa, sustitución del capitán y consistencia del rating se resuelven en MS-05/MS-09.

## Visibilidad y errores

- `onlineUsersUpdate` solo llega a administradores autenticados. Las notificaciones de disputa llegan al canal `admin_monitor` y a los participantes; un jugador ajeno no las recibe.
- Los listados de convocatorias y avisos de cupos contienen una vista previa explícita sin historial de chat. Participantes de salas, partidos y alineaciones usan el DTO público, sin correo, credenciales ni IDs internos de socket.
- Los mensajes privados de sala se entregan solo al equipo actual del autor; el servidor calcula el equipo. La misma regla filtra los historiales y actualizaciones. Un cambio de equipo cambia el historial visible según membresía actual; no se define aquí privacidad histórica por fecha de ingreso.
- `operationError` informa `{ success: false, event, code, message }`; si la llamada trae callback, recibe también el rechazo. Códigos: `FORBIDDEN`, `NOT_FOUND`, `INVALID_PAYLOAD`, `CONFLICT`, `UNKNOWN_EVENT`, `EVENT_DISABLED`, `USE_REST`, `SESSION_INVALID`. Los errores internos no exponen detalles al cliente.
- `sessionInvalid` cierra la conexión y devuelve los clientes al acceso. Un error de red normal no borra el token. La lógica compartida de los clientes lee el token actual para cada reconexión y evita que un rechazo tardío elimine una sesión nueva.

## Integración de clientes

El móvil envía `auth.token` desde SecureStore y el panel desde su almacenamiento de sesión existente. Se usa `shared/socketSession.mjs` para manejar rechazo, revocación, sustitución y limpieza de listeners. Referencias de implementación: [middleware de conexión](https://socket.io/docs/v4/middlewares/), [middleware de paquetes del socket](https://socket.io/docs/v4/server-socket-instance/) y [opciones del cliente](https://socket.io/docs/v4/client-options/).

En el móvil se corrigieron `sendLobbyChatMessage`/`newLobbyChatMessage`, `joinReplacementSlot` y el equipo de destino al cambiar de lado. Sala y partido filtran mensajes por recurso y limpian sus suscripciones. El chat muestra mensajes recibidos del servidor; no añade una confirmación local ficticia. La pantalla de partido espera `matchFinished` para avanzar. Se retiró el botón que forzaba un rival bot.

## Evidencia

- Pruebas aisladas de backend/clientes: 42 aprobadas, incluyendo 13 casos de Socket.IO con conexiones reales de cliente, además de pruebas del adaptador de sesión compartido.
- Casos nuevos: handshake inválido, suplantación, inventario cerrado de eventos, privilegios administrativos, membresía, chat privado, salida por REST con suscripción antigua, un único mensaje de partido, capitán/reportero, revocación, vencimiento, reemplazo de conexión, aceptación tras reconexión, cancelación por revocación, creación/inicio por anfitrión y aviso administrativo de disputa.
- Build del panel aprobada. Exportación iOS/Hermes aprobada: 756 módulos, bundle de aproximadamente 2,1 MB. No equivale a una build firmada ni a ejecución física.
- Base personal intacta, SHA-256: `8C18503D9E57EC8C7F5E922422FC4A172B39051EFB4CC8FA9EA3E91DA0C9D116`. Las pruebas crean y eliminan únicamente bases temporales.

## Límites pendientes

- Prueba física en iPhone y otro dispositivo: reconectar por pérdida de Wi-Fi, sesión revocada mientras la app está abierta, chat entre participantes y limpieza al cambiar de cuenta.
- El servidor conserva reglas heredadas de abandono tras 25 segundos y aún permite algunos estados simultáneos de sala/partido. MS-05/MS-07/MS-08 deben definir y corregir estas transiciones para convocatorias futuras.
- Chat pendiente de estados de envío, reintentos y recuperación completa; pantallas aún contienen otras cifras y diseños de prototipo. MS-08/MS-11 siguen abiertos.
- La autorización no corrige la durabilidad de sql.js ante caídas, transacciones de rating ni la idempotencia de todas las rutas de resultados. MS-06/MS-09 siguen abiertos.
- Este transporte recorre conexiones locales para filtrar entregas y depende del único proceso servidor actual. No habilita escalado distribuido; tampoco incluye rate limiting general de eventos, límites de conexiones o HTTPS/WSS del piloto (MS-14).
- No se reinició ni migró la base personal en esta entrega. El cliente web legado de la raíz no es uno de los clientes vigentes y ya no puede conectarse sin token.

Siguiente entrega: MS-05, reglas de salas y partidos, resolviendo D-01/D-04 antes de completar la convocatoria real de MS-07.
