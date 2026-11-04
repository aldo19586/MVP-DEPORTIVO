# MS-07-A — Convocatorias persistentes

3 de noviembre de 2026. Parte A implementada: crear, buscar, ingresar por código, compartir, transferir roles, salir y cancelar antes de jugar. **MS-07 continúa En curso**: inicio del partido y conexión con el nuevo ciclo de resultados quedan en parte B/MS-09. El chat nuevo se integra en MS-08.

## Recorrido móvil

Jugar muestra convocatorias reales, con filtro opcional de distrito y alcance «Todo Perú». Mis salas recupera las inscripciones del servidor, incluidas canceladas mientras el usuario conserve membresía. Se retiraron de esos accesos el radar como recorrido principal, la sala local `NEW1` y el contador fijo de tres salas.

Crear tiene dos pasos: modalidad/distrito, luego nombre/dirección de cancha y fecha/hora. Se ofrecen fútbol 5, 6, 7, 9 y 11; la capacidad deriva del formato habilitado en el servidor. El distrito se selecciona del catálogo nacional y su ID se persiste con sus etiquetas geográficas. La búsqueda acepta palabras combinadas de distrito/provincia/departamento y omite diferencias de acentos; no se limita a Lima.

Fecha/hora se eligen con controles nativos en `America/Lima` y se envían como UTC. El servidor exige fecha futura y zona de Perú. El lugar es coordinación declarada por el anfitrión, no una reserva B2B ni disponibilidad garantizada de la cancha.

Una creación confirmada muestra el código de ocho caracteres generado por el servidor. «Copiar código» usa [Expo Clipboard](https://docs.expo.dev/versions/latest/sdk/clipboard/) y «Compartir» abre la hoja nativa del sistema. El receptor ingresa el código, ve lugar/horario/cupos y elige equipo. No hay vínculo profundo ni registro con invitación preservada todavía: corresponde a MS-10.

Los errores de red conservan los datos del formulario y el identificador de solicitud mientras la pantalla permanezca abierta. Reintentar la misma acción usa ese ID. Un conflicto de revisión recupera el estado actual para un nuevo intento; no anuncia una plaza ganada sin confirmación. Cerrar la app durante una solicitud sin respuesta no conserva aún el comando pendiente: revisar Mis salas antes de crear otra; la cola durable del cliente queda como mejora posterior.

## Modelo y persistencia

Las nuevas convocatorias se guardan en `competitions`, separadas de los lobbies heredados. No se migraron ni borraron salas antiguas. Identificador UUID, código único de ocho hexadecimales, revisión, horario, zona, lugar, miembros y roles se guardan como una transacción mediante MS-06-B.

Estados de esta parte: `OPEN`, `FULL`, `CANCELLED`. «Falta uno» es derivable del cupo; iniciar todavía devuelve acción no disponible. Crear otra convocatoria no expulsa de la anterior. La desconexión, el reemplazo de socket y los temporizadores de gracia de lobbies antiguos no modifican estas inscripciones. Una prueba real espera 26 segundos offline y comprueba membresía antes y después de reiniciar.

Cada actor/comando/requestId identifica un recibo persistente con huella del contenido. Mismo comando/datos/ID devuelve el resultado original; otros datos con el mismo ID producen `REQUEST_CONFLICT`. La transacción guarda juntos convocatoria, revisión y recibo. La respuesta de replay es un snapshot de la operación original, no un snapshot actualizado automáticamente.

Dos solicitudes sobre el mismo cupo/revisión se serializan en el único escritor: una gana y la otra recibe `REVISION_CONFLICT`. Tras actualizar, si el equipo está lleno recibe `FULL`. La membresía no se duplica. Un reintento con otro ID de alguien ya inscrito devuelve `ALREADY_JOINED`.

## API protegida

| Método y ruta | Visibilidad / comportamiento |
|---|---|
| GET `/api/competitions` | Sesión válida; lista de convocatorias futuras abiertas/completas. Filtros `districtId`, `formatId`; vistas previas sin roster |
| GET `/api/competitions/mine` | Solo convocatorias donde el actor es miembro |
| GET `/api/competitions/by-code/:code` | Sesión válida; vista previa de lugar, horario y ocupación |
| GET `/api/competitions/:id` | Miembro o administrador; detalle y miembros con campos públicos |
| POST `/api/competitions/commands/:command` | Actor de la sesión; contrato `competition.v1`; permisos y transiciones comprobados en servidor |

Comandos implementados: `create`, `join`, `leave`, `cancel`, `switchTeam`, `transferHost`, `transferCaptain`, `setReady`, `updateDetails`. Los cuatro últimos además de cambios de equipo están disponibles por API; la UI de esta entrega expone transferencias, salida y cancelación, y deja el resto para parte B. `start` y comandos de marcador todavía no están habilitados aquí.

Antes de jugar, solo el anfitrión cancela o edita lugar/horario/formato. Cancelar conserva datos y motivo y bloquea nuevas uniones. Editar invalida los «listo» anteriores y no permite reducir la capacidad debajo de los integrantes existentes. Solo el capitán transfiere a un compañero de su equipo; el anfitrión transfiere a un miembro. Para salir con compañeros hay que transferir el rol. Si un equipo queda vacío, no conserva capitán; si se va el único integrante de la convocatoria, se cierra como cancelada.

Ningún actor se toma de un `userId` o rol enviado por el cliente. La vista previa no expone roster y los miembros guardados contienen solo ID, nombre, avatar y «listo». ID del distrito proviene del catálogo actual numérico; etiquetas quedan también en el snapshot. Antes de actualizar ese catálogo, preservar el significado de los IDs o migrarlos explícitamente: no se asumió equivalencia con UBIGEO oficial.

## Esquema 3 y compatibilidad

Se añade `competitions` con código único y revisión. `user_version=3` y su entrada en `schema_migrations` se guardan dentro de la transacción de arranque. Versiones anteriores se actualizan con sus tablas y datos conservados; el backend anterior no debe abrir esquema 3 sin estrategia de reversión.

La utilidad de respaldo admite esquema 3 y exige la tabla de convocatorias cuando corresponde. La prueba de restauración arranca un servidor aislado desde la copia y recupera ID, código y participante. No se inició ni migró la base personal durante esta entrega.

## Verificación

- Siete casos nuevos: sesión/catálogo nacional/fecha/actor; replay tras reiniciar; carrera por último cupo; roles/salida/cancelación; desconexión prolongada y reinicio; edición/filtros/listo; respaldo y restauración del esquema 3.
- Suite conjunta: 67 casos aprobados. Revisión de hash personal sin cambios: `8C18503D9E57EC8C7F5E922422FC4A172B39051EFB4CC8FA9EA3E91DA0C9D116`.
- Bundle iOS/Hermes exportado y panel compilado. Esto comprueba integración de módulos, no ejecución física de los controles nativos.
- Pendiente en iPhone: crear desde ambos accesos, elegir fecha/hora con zona del dispositivo distinta, teclado y fuente grande, copiar/compartir, ingreso con otra cuenta, transferencia y cancelación, red perdida y reapertura.

## Pendientes explícitos

- MS-07-B: preparación de equipos en la UI, edición, inicio atómico con capitanes y vínculo estable con partido, impedimento de dos partidos simultáneos.
- MS-08: chat del nuevo recurso y eventos con revisión; hoy las actualizaciones de participantes se recuperan mediante Actualizar/Mis salas, no por una notificación en tiempo real de esta convocatoria.
- MS-09: marcador/confirmación/empate/disputa del ciclo nuevo. Los matches/lobbies heredados se mantienen para recuperación y pruebas, no se convierten automáticamente al nuevo modelo.
- MS-10/MS-11: onboarding obligatorio acordado, invitación tras registro, navegación completa y retirada del resto de demostraciones. Esta parte permite usar convocatorias con cuenta autenticada sin imponer todavía edad o mecanismos de recuperación pendientes.
- Antes del piloto: paginación del listado, límites de eventos/solicitudes y ensayo de carga. La cobertura nacional del catálogo no acredita capacidad para cualquier volumen ni supone desplegar producción.
