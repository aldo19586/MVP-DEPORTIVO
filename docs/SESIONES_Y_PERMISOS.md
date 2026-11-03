# MS-03 — Sesiones y permisos REST

Entrega técnica del 2 de noviembre de 2026. La autorización de Socket.IO continúa en MS-04; proteger REST por sí solo no habilita un piloto con usuarios reales.

## Contrato de acceso

Todas las rutas `/api` requieren un token salvo esta lista explícita:

| Método | Rutas públicas | Uso |
|---|---|---|
| GET/HEAD | `/health`, `/sports`, `/districts` | Salud y catálogos de entrada |
| GET/HEAD | `/auth/check-name/:name` | Disponibilidad de nombre |
| POST | `/auth/login`, `/auth/register`, `/auth/pin-login`, `/auth/pin-register`, `/auth/admin-login` | Inicio de sesión y alta pública |

Los preflight OPTIONS los atiende CORS. Las nuevas rutas quedan protegidas por defecto. El control se aplica antes de los handlers, en `server/access.js`.

| Rutas protegidas | Permiso |
|---|---|
| GET `/auth/me`, POST `/auth/logout` | Sesión válida; el actor sale del token y de la base |
| GET `/user/:userId`, `/user/:userId/matches`, `/profile/:userId/:sportId/:formatId` | Titular o administrador |
| PUT `/user/:userId` | Solo titular; campos de perfil permitidos explícitamente |
| POST `/user/complete-profile`, `/user/submit-football-test`, `/user/push-token`, `/profile/questionnaire`, `/lobby/leave` | Solo titular; se asigna su ID si no se envía; un ID ajeno devuelve 403 |
| GET `/match/:matchId` | Participante o administrador |
| GET `/match/:matchId/peer-review/:userId` | Titular participante o administrador |
| POST `/match/peer-review` | Evaluador de la sesión y acceso al partido; la asignación existente determina a quién evalúa |
| GET `/lobby/:code` | Miembro o administrador; chat privado del equipo filtrado por destinatario |
| GET `/lobbies`, `/lobbies/replacements`, `/leaderboard/:sportId/:formatId`, `/questionnaire/:sportId` | Sesión válida; jugadores de listados/ranking sin credenciales ni datos privados de cuenta |
| Todo `/admin/*` | Rol administrativo actual en base de datos |
| GET `/venues`, `/venues/:id` | Sesión válida; catálogo heredado, no reservas reales |
| POST `/venues/:id/book` | Devuelve 410: B2B pospuesto; ya no confirma una reserva ficticia |

Las respuestas de cuenta propia/admin excluyen password, hashes de PIN, token push y versión de sesión. Los participantes de salas, partidos e historial y el ranking utilizan una lista menor de campos públicos. La resolución REST de disputas registra al administrador autenticado e impide repetir una resolución sin disputa pendiente; el contrato completo de resultados, transacciones y rating sigue en MS-09.

## Ciclo de sesión

1. Login/registro emite JWT con ID, rol y `version`. Cada petición comprueba firma, vencimiento, existencia del usuario, versión actual y sanción vigente. El rol autorizado se lee de la base, no del cuerpo ni del rol declarado por el cliente.
2. GET `/auth/me` verifica la sesión al abrir móvil/panel. Un perfil guardado en caché no concede acceso.
3. POST `/auth/logout` incrementa `session_version` e invalida **todas las sesiones REST de esa cuenta**, con guardado síncrono. Restablecer PIN y sancionar también revocan todas las sesiones previas.
4. Un token inexistente, antiguo, vencido o revocado recibe 401. Una sesión válida sin permiso recibe 403. En clientes, 401 de una operación privada limpia la sesión y vuelve al acceso; 403 presenta el error sin fingir éxito. Un 401 del formulario de login solo informa credenciales inválidas.
5. Un fallo de red conserva el token y ofrece reintentar la restauración. Las peticiones tienen timeout de 15 segundos. Al salir sin conexión se elimina la sesión local, pero no se puede confirmar revocación remota; el token conserva su vencimiento original en el servidor.

### Móvil

`expo-secure-store` 58.0.2 guarda solo el token; AsyncStorage conserva la caché del perfil. No se guarda el PIN. Al cerrar se eliminan también la clave antigua del PIN y estadísticas locales. Las operaciones de almacenamiento se serializan: un 401 tardío de una cuenta anterior no borra el token de una cuenta nueva.

El plugin se incluye en `app.json` para futuras builds nativas. SecureStore está disponible en Expo Go; el comportamiento real de persistencia en el iPhone debe comprobarse en dispositivo. En iOS el Keychain puede sobrevivir a la desinstalación, por lo que desinstalar no equivale a revocar una sesión. Referencia: [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

### Panel

El panel verifica `/auth/me` y el rol antes de entrar. Conserva el token en el almacenamiento local web existente; no es una cookie HttpOnly. El socket solo se conecta después de validar/login y se desconecta al salir; usa el usuario real, sin `demo_user_admin`. Esto no sustituye la autorización de eventos pendiente en el servidor.

Las consultas administrativas propagan errores en lugar de convertirlos en métricas vacías. Una disputa solo muestra éxito tras respuesta REST satisfactoria; se retiraron la disputa de ejemplo y la doble orden REST/socket desde esa vista.

## Base existente y compatibilidad

Al iniciar el backend actualizado, la migración añade `session_version`, `is_banned`, `banned_until` y `ban_reason` si faltan. Las cuentas existentes parten de versión 0. Los JWT anteriores sin `version` requieren volver a iniciar sesión. Las sanciones antiguas que solo existían en memoria no pueden recuperarse tras un reinicio anterior.

Durante esta entrega no se reinició el servidor contra la base personal ni se migró ese archivo. Antes de actualizar un entorno con datos, detener su único proceso escritor y conservar una copia del archivo; nunca ejecutar dos instancias sql.js contra la misma base. El cliente web legado de la raíz no se integró: los clientes vigentes son móvil y SuperAdmin.

## Evidencia y límites

- Suite conjunta: 27 pruebas aprobadas. Incluye inventario de rutas privadas, rechazo de todas las rutas administrativas para jugador, acceso entre cuentas, pertenencia a salas/partidos, visibilidad del chat, DTO de ranking/historial, versión de sesión, revocación persistente, manejo de 401/403 y almacenamiento seguro mediante adaptadores de prueba.
- Panel: `npm run build:admin` aprobado.
- Móvil: exportación de bundle iOS/Hermes con Expo SDK 58, 755 módulos, aprobada. Es una comprobación de compilación, no una build firmada ni una ejecución física.
- Base personal: SHA-256 antes/después `8C18503D9E57EC8C7F5E922422FC4A172B39051EFB4CC8FA9EA3E91DA0C9D116`, sin cambios.
- Pendiente de dispositivo: login, cerrar/reabrir Expo Go, restauración, logout, modo sin conexión y retorno al acceso después de reset/ban desde el panel.
- Bloqueo para piloto: Socket.IO aún conserva eventos que confían en el cliente y difusión sin los permisos nuevos de REST. MS-04 debe validar handshake, actor, membresía y revocación de conexiones existentes. Esta entrega no declara seguro el canal de tiempo real.
- MS-06/MS-09 siguen pendientes para durabilidad ante caídas y consistencia del ciclo del partido; MS-10 para reglas y simplificación del onboarding; MS-14 para HTTPS, secretos y operación de un entorno de piloto.
