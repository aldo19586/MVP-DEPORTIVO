# Auditoría inicial del prototipo

Fecha: 2 de noviembre de 2026. Base Git observada: `87da7d7`, más cambios locales existentes y actualización de Expo 58 realizada en esta sesión.

Método: lectura de código, contratos de eventos, scripts y diseños Stitch. No se realizaron ataques, operaciones destructivas, pruebas sobre cuentas ajenas ni ejecución de la suite que modifica la base personal. Los hallazgos estáticos no se presentan como resultados de una prueba integral.

Evidencia previa de esta conversación: API health con SQLite conectada, catálogo de cuatro deportes, manifiesto Metro, bundle iOS SDK 58 HTTP 200 y comprobación de dependencias Expo satisfactoria. No demuestra que todos los recorridos funcionen en el dispositivo. La base observada contenía 40 usuarios y 2 partidos; no prueba que fueran usuarios reales.

## Matriz funcional

| Área | Estado observado | Qué falta probar o completar |
|---|---|---|
| Acceso y sesión | Endpoints y pantallas; token devuelto pero no utilizado por el cliente móvil revisado | Identidad de extremo a extremo, expiración, recuperación y autorización |
| Registro/test/carta | Flujo fragmentado, formulario previo y test de 14 preguntas; carta prematura de ejemplo | Continuidad, reanudación, validación servidor y carta derivada de datos reales |
| Catálogos | Respuesta API comprobada anteriormente | Catálogo coherente con alcance del piloto y formatos activos |
| Listado/creación/unión de salas | Código existente con rutas móviles divergentes | Persistencia y membresía reales desde cada entrada |
| Chat | Incompatibilidad de eventos identificada | Entrega entre dos usuarios, permisos, historial y reconexión |
| Matchmaking | Motor y pantallas presentes | Prueba aislada de cola, cancelación, aceptación y recuperación |
| Resultados y rating | Varias rutas de actualización | Permisos, confirmación por equipos, empates, idempotencia y fórmula consistente |
| Perfil y avisos | Mezcla de datos y constantes demo | Datos reales y estados vacíos |
| SuperAdmin | Vistas y API presentes; protección insuficiente en servidor | Permisos, auditoría y errores visibles |
| Persistencia | sql.js con exportación directa a archivo | Aislamiento, durabilidad ante fallos, respaldo y restauración |
| Entrega móvil | Expo 58 compila; configuración EAS presente | Build propia instalada; CI heredada y pruebas físicas |

## Hallazgos priorizados

P0: bloquea exposición a usuarios externos por acceso indebido. P1: bloquea un recorrido confiable o la operación del piloto. P2: mejora de experiencia o mantenimiento. Severidades iniciales basadas en lectura, sujetas a verificación aislada.

| ID | Nivel | Evidencia local reproducible por lectura | Impacto y acción |
|---|---|---|---|
| A-01 | P0 | [server.js](../server/server.js): `requireAuth`, `requireAdmin` importados sin aplicación a rutas; `/api/admin/users`, ban, reset y resolve sin middleware | Exigir autenticación y rol en servidor; denegar jugador/anónimo en pruebas negativas |
| A-02 | P0 | [db.js](../server/db.js), `createUser`: rol calculado con `email.includes('admin')`; `/api/auth/register` y creación desde `/api/auth/login` lo invocan | Registro público puede producir rol admin; separar alta administrativa de registro público y revisar cuentas existentes |
| A-03 | P0 | [server.js](../server/server.js), handshake y `registerUser`: acepta `userId` y `clientUser`; [socket admin](../apps/admin-web/src/services/socket.js) registra identidad demo y rol desde cliente | Autenticar handshake, derivar actor/rol de servidor, verificar membresía y permisos en cada evento; restringir broadcasts administrativos |
| A-04 | P0 | [db.js](../server/db.js), `createUser` conserva `password` en objeto; rutas devuelven `user`; lista administrativa hace spread de usuario | Revisar almacenamiento de credenciales heredadas, eliminar campos sensibles de respuestas mediante DTO explícito; no exponer dumps de usuarios en pruebas |
| A-05 | P1 | [API móvil](../apps/mobile/src/services/api.js), [storage](../apps/mobile/src/services/storage.js), [LoginScreen](../apps/mobile/src/screens/LoginScreen.js): sesión guarda usuario y peticiones sin bearer | Aplicar solo el middleware rompería clientes; integrar token, almacenamiento seguro, expiración y salida junto con permisos |
| A-06 | P1 | [App.js](../apps/mobile/App.js), `onCreateLobbyPress`: construye objeto `NEW1`; [LobbyListScreen](../apps/mobile/src/screens/LobbyListScreen.js), `handleJoinByCode`: abre objeto con código sin solicitar unión | Sala aparente sin creación/unión confirmada; centralizar operaciones con respuesta del servidor. Radar tiene otra ruta real `createLobby`: no generalizar el fallo a todas las entradas |
| A-07 | P1 | [LobbyRoomScreen](../apps/mobile/src/screens/LobbyRoomScreen.js): emite `sendLobbyChat`, escucha `lobbyChatMessage`; servidor escucha `sendLobbyChatMessage`, emite `newLobbyChatMessage` | Contrato incompatible; mensaje optimista puede parecer enviado sin llegar a otro dispositivo. Unificar contrato y confirmación |
| A-08 | P1 | Mismo componente: listener `lobbyUpdated` no filtra código ni se desuscribe; `handleCopyCode` solo muestra alerta | Riesgo de mezclar actualizaciones o duplicar listeners; copiar código no copia. Probar navegación repetida y compartir/código real |
| A-09 | P1 | [db.js](../server/db.js), `submitFootballTest`: completa respuestas faltantes con 3 y convierte valores desconocidos a 3; `completeUserProfile` confía en datos recibidos | Cliente no es barrera suficiente. Rechazar tipos, cantidades y valores inválidos; definir retest y validación coherente |
| A-10 | P1 | [server.js](../server/server.js), `/api/admin/disputes/resolve`: aplica +35/-25 y no exige estado disputado antes de modificar; `calculateGlicko2Match` está importado pero no se invoca en este archivo | Repetir resolución puede volver a alterar rating; centralizar finalización, validar ganador/empate y persistir una sola actualización |
| A-11 | P1 | [database.js](../server/database.js): ruta fija a `matchsport.db`, `writeFileSync` directo en `scheduleSave`/`forceSave` | Tests comparten base si no se aíslan; escritura directa no garantiza reemplazo atómico ni recuperación ante caída. Probar durabilidad y decidir almacenamiento |
| A-12 | P1 | [auth.js](../server/auth.js): secreto de respaldo fijo y JWT propio; [db.js](../server/db.js): credenciales demo | El piloto debe fallar si faltan secretos; crear admin controladamente. Revisar estándar del token (exp usa milisegundos), revocación, PIN y fuerza bruta |
| A-13 | P1 | [build-apk.yml](../.github/workflows/build-apk.yml): construye web raíz y sincroniza Capacitor; usa `npm ci || npm install` | Artefacto Android corresponde al camino heredado, no acredita entrega Expo. Reemplazar pipeline y exigir lockfile reproducible |
| A-14 | P1 | [test_backend_full.js](../scripts/test_backend_full.js): crea usuarios, modifica perfil, ban y PIN contra localhost:3001; acciones admin sin token | La suite valida comportamiento inseguro y altera datos. Aislarla y añadir pruebas de rechazo; su mensaje «100%» no es evidencia suficiente |
| A-15 | P1 | [config móvil](../apps/mobile/src/config.js): fallback IP local y dominio de producción fijo; [API admin](../apps/admin-web/src/services/api.js): localhost o `/api` | Configuración fuera de LAN no validada. Definir entornos y proxy; no afirmar despliegue por existir dominio en código |
| A-16 | P2 | [LoginScreen](../apps/mobile/src/screens/LoginScreen.js), [RadarScreen](../apps/mobile/src/screens/RadarScreen.js), [ProfileScreen](../apps/mobile/src/screens/ProfileScreen.js), [NotificationsScreen](../apps/mobile/src/screens/NotificationsScreen.js) | Carta, jugadores, estadísticas o avisos demo en pantallas; retirar del recorrido real y diseñar vacíos |
| A-17 | P1 | [API admin](../apps/admin-web/src/services/api.js): captura fallos de métricas/usuarios devolviendo ceros o arrays vacíos | Operador puede confundir caída con ausencia de actividad. Mostrar error, expiración de sesión y reintento |

## Pendiente de investigación dinámica

- Competencia por último cupo; duplicados por reintento; autorización de capitán y expulsión.
- Persistencia de membresías, chats, resultados y disputas después de reiniciar y cortar la red.
- Restauración de sesión y partido activo tras matar la app; coherencia del período de gracia con convocatorias futuras.
- Validación de fotos y almacenamiento accesible desde otro dispositivo; una URI local de galería no es una subida al servidor.
- Push real en segundo plano y preferencias; el servicio móvil revisado usa notificaciones locales y no demuestra entrega remota.
- Correspondencia de atributos de la carta con test y resultados; todas las modalidades activas y política de retest.
- Dependencias: la instalación anterior reportó vulnerabilidades; aún falta clasificación por paquete, alcance y explotación. No ejecutar arreglos forzados indiscriminados.

### Seguimiento MS-01

MS-01 completado: ruta DB configurable, host/puerto aislados, demos opt-in y suite propia. A-11 queda parcialmente atendido (aislamiento); durabilidad ante fallos permanece en MS-06. A-14 queda parcialmente atendido al reemplazar el comando de test predeterminado; los scripts históricos siguen pendientes de migración. Los P0 permanecen abiertos. Ver evidencia en [BACKLOG.md](BACKLOG.md).

