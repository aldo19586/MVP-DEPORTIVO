# MS-08 — Chat y recuperación de convocatorias

3 de noviembre de 2026. Chat integrado en las convocatorias de MS-07, con historial persistente, reintentos y actualización automática. La prueba física simultánea en dos dispositivos sigue pendiente; los servicios manuales permanecen detenidos.

## Experiencia móvil

El detalle de una convocatoria ofrece **Abrir chat de la sala**. Abre una pantalla nativa independiente con mensajes, composición y retorno al detalle. No agrega el historial a la pantalla de equipos. Solo los miembros ven ese acceso; al cancelar, el historial queda disponible para ellos y se cierra la composición.

Cada envío muestra Enviando o No confirmado/Reintentar. La bandeja pendiente se guarda en AsyncStorage por cuenta y convocatoria antes de llamar al servidor; no almacena credenciales. Al volver a abrir, se contrasta con el historial antes de ofrecer reintento. Un mensaje no confirmado conserva su texto y requestId. Los mensajes confirmados se eliminan de la bandeja local; el historial confirmado se obtiene del servidor.

Los mensajes recibidos por socket y por respuesta HTTP se combinan por ID. Cambiar de sala elimina únicamente los listeners de esa pantalla y evita actualizar una vista desmontada. El historial se recupera al abrir, reconectar o regresar del segundo plano; Actualizar mensajes permite reintentar un fallo. La entrega en segundo plano mediante push se mantiene en MS-15.

El detalle recupera cupos, equipos, roles, Listo, edición, cancelación e inicio cuando cambia su revisión. Al reconectar o volver al primer plano consulta el servidor. Una respuesta antigua no sustituye una revisión más nueva. Los listados se actualizan con avisos agrupados; la membresía persistida no depende de mantener un socket conectado.

## Contrato de mensajes

Todas las rutas requieren Bearer válido:

| Ruta | Acceso y respuesta |
|---|---|
| GET `/api/competitions/:id/messages?after=0` | Miembro actual o SuperAdmin. Devuelve `{messages, hasMore}`, hasta 100 mensajes ascendentes, con `sequence > after` |
| POST `/api/competitions/:id/messages` | Miembro actual. Recibe solo `{requestId, text}`; devuelve `{success, message, replayed?}` tras persistir |

Un mensaje tiene `id`, `competitionId`, `sequence`, `requestId`, `senderId`, `senderName`, `text` y `createdAt`. ID, autor, nombre, secuencia y fecha se asignan en el servidor. No acepta senderId, rol ni atributos inyectados. Texto no vacío de hasta 2000 unidades UTF-16; máximo 30 mensajes nuevos por minuto y autor, entre todas sus salas. Los reintentos confirmados no consumen otro cupo. Errores: `INVALID_PAYLOAD`, `FORBIDDEN`, `NOT_FOUND`, `REQUEST_CONFLICT`, `INVALID_STATE`, `RATE_LIMITED`.

Una clave `(competitionId, senderId, requestId)` identifica un único mensaje. Repetirla con el mismo texto normalizado devuelve el mensaje original; otro texto da 409. No incrementa la revisión de convocatoria por escribir: la secuencia del chat es independiente. Se permite escribir en OPEN, FULL, IN_PROGRESS, RESULT_PENDING y DISPUTED; otros estados admiten solo lectura. Un administrador ajeno puede auditar por REST y recibir eventos administrativos autorizados, pero no escribir en nombre de un jugador. El panel para esa auditoría aún corresponde a MS-12.

El chat es común a ambos equipos de la convocatoria. No incluye mensajes directos, canales privados por equipo, adjuntos, edición o borrado. Un miembro actual puede leer el historial completo; quien sale pierde lectura, envío y eventos, incluidos reintentos de mensajes previos. No se define privacidad histórica por fecha de ingreso.

## Eventos y recuperación

El servidor publica después del commit durable, nunca dentro de una operación que todavía puede revertirse:

- `competitionUpdated`: `{competitionId, revision}`, solo miembros actuales o SuperAdmin.
- `competitionMessage`: `{competitionId, message}`, con el mismo control de pertenencia.
- `competitionListUpdated`: `{}`, aviso a conexiones autenticadas para volver a consultar los listados permitidos. No expone plantilla ni chat.

No se añaden comandos socket ni suscripciones solicitadas por el cliente. El transporte comprueba sesión y membresía por destinatario en cada entrega. Una sala/socket antiguo no concede acceso. Repetir un comando confirmado no publica otra vez su evento. Si el proceso cae después del guardado y antes del aviso, REST recupera la operación al reconectar.

La secuencia de recuperación avanza solo con páginas HTTP leídas. Un evento más nuevo se muestra, pero no adelanta ese cursor: así no oculta mensajes anteriores perdidos. No se afirma entrega exactamente una vez de la red; la identidad persistente y la combinación del cliente evitan filas o mensajes visibles duplicados.

## Esquema y operación

Esquema 5: `competition_messages`, clave primaria convocatoria/secuencia, unicidad de solicitud por autor/sala e índice por autor/fecha para el límite de envío. Migración transaccional desde esquemas previos, sin convertir chats heredados. Respaldo/restauración verifica la tabla para esquema 5. Versiones anteriores de servidor rechazan ese esquema; para volver atrás se usa un respaldo previo en un destino nuevo, nunca se sobrescribe una base activa.

El servidor sigue siendo un único proceso sql.js con guardado atómico de archivo completo. Las páginas están acotadas en servidor; el móvil acumula el historial recuperado en memoria y usa FlatList para mostrarlo. Un volumen elevado requerirá carga progresiva, retención/moderación y medición antes de ampliar el piloto. No se implementa escalado distribuido en esta entrega.

La base personal y la base de la prueba manual no fueron iniciadas ni migradas. Se conservaron sus datos y el cambio local previo de IP. Las pruebas usan exclusivamente bases sintéticas bajo `.test-runs/`.

## Comprobación

Diez casos nuevos: cinco de integración con SQLite/HTTP/Socket.IO y cinco del cliente compartido. Cubren dos conexiones, reintentos concurrentes y tras reinicio, permisos y salida con socket abierto, revisiones sin duplicados, paginación, límite de envío, chat cerrado, migración 4→5, rollback de inserción, backup/restore, pérdida de confirmación, cursor frente a eventos adelantados, bandeja recuperada, cierre durante escritura lenta, separación entre cuentas/salas, almacenamiento fallido y limpieza de listeners.

La evidencia conjunta y el estado de validación se registran en [BACKLOG.md](BACKLOG.md). La exportación iOS acredita compilación del bundle, no instalación firmada ni uso físico. Antes del piloto hay que ejecutar V-10/V-15/V-17 de [VALIDACION.md](VALIDACION.md): dos cuentas en dispositivos reales, Wi-Fi/datos, cierre y reapertura, teclado y texto grande.

Sigue MS-09: marcador, confirmación por el otro capitán, empate, disputa y rating aplicado una vez. El chat nuevo no activa los finalizadores de resultados heredados.
