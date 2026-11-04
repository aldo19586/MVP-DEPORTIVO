# MS-05 — Reglas y contrato de convocatorias

Fecha: 3 de noviembre de 2026. Estado: **Definido para implementación**. Aldo confirmó el alcance nacional y las reglas base el 3 de noviembre de 2026. El contrato todavía no cambia el comportamiento de los handlers actuales.

La entrega deja reglas, un contrato compartido de datos y pruebas de validación. La activación, persistencia y migración se implementarán en MS-06/MS-07/MS-09. MS-05 cierra la especificación; no certifica el nuevo flujo de extremo a extremo.

## Decisiones registradas

| Decisión | Propuesta presentada | Estado / responsable |
|---|---|---|
| D-01: zona y formatos | Cobertura de todo Perú, con fútbol 5, 6, 7, 9 y 11. País interpretado como Perú según el catálogo existente | Confirmado por Aldo, 03/11/2026 |
| D-04: resultados y cancelaciones | Un capitán por equipo; uno reporta marcador, el otro confirma/discrepa; empate válido; discrepancia a SuperAdmin; salida antes de empezar sin penalidad automática | Base confirmada por Aldo, 03/11/2026 |
| Detalles recomendados de D-04 | Sin victoria automática por silencio; capitán reemplazable explícitamente; desconexión no libera cupo; cancelación en juego requiere acuerdo de capitanes o resolución administrativa; sin sanción automática por ausencia | Especificación operativa de esta entrega; revisable antes de activación |

No se seleccionaron plazos numéricos ni penalizaciones por silencio. Si hacen falta límites de tiempo para reportar/confirmar, deberán acordarse antes de habilitar cierre automático. Para el primer recorrido se recomienda moderación manual de casos estancados, sin inventar un ganador.

## Cobertura nacional

El alcance geográfico es todo Perú desde el diseño, sin limitar cuentas o creación de convocatorias a Lima. Cada convocatoria identifica país, departamento/provincia/distrito, dirección, fecha y zona horaria; el distrito se referencia por ID estable del catálogo. La posición GPS será opcional para ordenar por distancia, sin bloquear creación o búsqueda por distrito.

El listado empieza por la ubicación elegida del jugador; ampliar a provincia, departamento o todo el país será un filtro secundario. Una zona sin convocatorias muestra un vacío real con crear/compartir, sin trasladar automáticamente al jugador a otra ciudad. Los cinco formatos son independientes y determinan 10, 12, 14, 18 y 22 plazas, respectivamente. El nivel competitivo se conserva por formato; no mezclar rankings por añadir cobertura.

Cobertura nacional es alcance del producto. La distribución inicial puede validar el flujo con invitados de distintas localidades, sin prometer presencia de jugadores, capacidad ilimitada ni un despliegue público ya operativo. Tamaño del piloto, hosting y volumen objetivo siguen pendientes en MS-00/MS-14.

## Recorrido y estados

La convocatoria conserva un identificador estable para invitación, participantes y chat. El partido registra su relación con ella. Crear el partido no borra la convocatoria ni duplica su historial. Se recomienda mostrar una acción principal por estado.

| Estado nuevo propuesto | Qué significa | Transición y actor | Acción principal del jugador |
|---|---|---|---|
| `OPEN` | Hay cupos y lugar/horario definidos | Unirse/salir/cambiar equipo; al completarse ambos equipos pasa a `FULL` | Unirme / Ver sala |
| `FULL` | Ambos equipos completos | Si alguien sale, vuelve a `OPEN`; anfitrión inicia con capitanes definidos y participantes listos | Listo / Iniciar, según rol |
| `IN_PROGRESS` | Se inició el partido | Capitán reporta marcador → `RESULT_PENDING`; cancelación requiere acuerdo o administración | Reportar marcador, para capitán |
| `RESULT_PENDING` | Hay un reporte identificado pendiente de otro capitán | Confirmación del otro equipo → `FINISHED`; discrepancia → `DISPUTED` | Confirmar o discrepar, para contraparte |
| `DISPUTED` | Evidencia congelada y revisión administrativa pendiente | SuperAdmin resuelve con motivo y marcador → `FINISHED`, o anula → `CANCELLED` | Ver estado de revisión |
| `FINISHED` | Marcador definitivo y rating aplicado una vez | Terminal; corregir exige operación administrativa específica futura, no repetir reporte | Ver resultado |
| `CANCELLED` | Convocatoria cancelada o partido anulado con motivo | Terminal; una nueva convocatoria obtiene otro ID | Ver motivo |

«Falta 1» y cupos disponibles son datos derivados de la ocupación. La conexión online/offline, la búsqueda inmediata y el temporizador de cancha son estados separados. El reloj no confirma asistencia ni decide resultados.

## Cupos, roles y salida

| Tema | Regla para implementar |
|---|---|
| Capacidad | La determina el formato habilitado del servidor. Un ID ocupa un cupo; por equipo nunca supera `playersPerTeam` |
| Último cupo | Verificación y escritura en una transacción; dos solicitudes concurrentes dejan un ganador. Reintentar la misma solicitud devuelve su resultado previo |
| Varias convocatorias | Permitir futuras convocatorias sin expulsar silenciosamente de otra. Antes de iniciar, impedir dos partidos simultáneos. Política de solapamiento de horarios pendiente de MS-07 |
| Anfitrión | Crea y organiza lugar/horario; inicia y cancela antes de jugar. No es dueño de los resultados del otro equipo |
| Capitán | Uno por equipo, persistido por ID. En 1v1 cada jugador representa su equipo. No se obtiene el rol por contener «admin» en el nombre ni por el orden del array |
| Transferencia | Anfitrión/capitán actual designa a un miembro válido; capitán solo a su equipo. Actualizar rol y revisión atómicamente |
| Salir antes de jugar | Libera únicamente el cupo propio, sin penalización automática. Si es anfitrión/capitán, debe transferir el rol antes; si la sala queda vacía, cancelar |
| Capitán ausente | Offline no elimina el rol. Si vuelve, lo conserva. Si no puede transferir, administrador sustituye con motivo y aviso a ambos equipos; sin autoelección por temporizador |
| Cambiar equipo | Solo antes de iniciar y con cupo; se reinicia el «listo» propio. Capitán transfiere su rol antes de cambiar |
| Cambio de lugar/hora/formato | Anfitrión antes del inicio; invalidar los «listo» anteriores y notificar. No truncar participantes para reducir capacidad |
| Salir durante el partido | Registrar abandono/incidencia; conservar alineación histórica. No cancelar ni convertir todo el partido automáticamente por la salida de una persona |
| Cancelación | Antes de iniciar: anfitrión con motivo y aviso. En juego: acuerdo de capitanes o SuperAdmin. Cancelación/anulación no genera ganador ni modificación de rating |
| Sanción | Revocar sesión y restringir acciones según MS-03/MS-04. Tratamiento del cupo y sustitución requiere una transición explícita, sin borrar evidencia |

Durante un partido, `cancel` de un capitán crea una propuesta identificada, sin cambiar el estado ni el rating. `confirmCancellation` del otro capitán confirma ese `cancellationId`; repetir por el mismo equipo no sirve. Una propuesta nueva invalida la anterior. El administrador puede anular con `cancel` y motivo según estado y permisos.

## Resultado y rating

El reporte contiene goles de `teamA` y `teamB`, siempre desde la orientación global del partido, incluso cuando lo envía el capitán B. El servidor deriva `teamA`, `teamB` o `draw`; no acepta rating, puntos o ganador arbitrario del cliente.

El otro capitán confirma un `reportId` concreto. No sirven dos reportes del mismo equipo. Una corrección antes de confirmar crea otra versión del reporte y deja obsoleta la confirmación anterior. Una discrepancia guarda reporte original, autor, motivo, revisión y fecha; el administrador resuelve desde REST y registra su identidad del servidor.

`FINISHED` debe persistir conjuntamente marcador, historial y aplicación única del rating mediante una clave única por partido/participante. Repetir request o reiniciar entre pasos no vuelve a sumar puntos. El empate se representa como score competitivo 0,5 para cada equipo; su cálculo efectivo, rating de equipos y relación con la carta se especifican en MS-09/D-06. No se adopta una fórmula fija «+35/-25» por mostrarla el prototipo.

## Contrato compartido de datos: `competition.v1`

Archivo: `shared/competitionContract.mjs`. Importable en Node y React Native, sin APIs web, acceso a DB ni dependencias nuevas. Valida la forma de comandos y deriva el ganador de un marcador. La autoridad de permisos, transiciones, cupos, idempotencia y rating permanece en el servidor.

Todos los comandos llevan `requestId`; los que modifican un recurso existente llevan `expectedRevision`. Se rechazan campos desconocidos, incluyendo IDs del actor, rol, rating y ganador suministrados por el cliente. `targetUserId` solo identifica al destinatario de una transferencia. IDs y revisiones siguen requiriendo verificación del servidor.

| Comando | Datos específicos obligatorios |
|---|---|
| `create` | `countryCode` (`PE`), `sportId` (`futbol`), `formatId` (5v5/6v6/7v7/9v9/11v11), `scheduledAt` UTC canónico con milisegundos, `timeZone`, `venue: {name,address,districtId}` |
| `join` | `code`, `team` (`teamA` o `teamB`) |
| `leave`, `start` | `competitionId` |
| `switchTeam` | `competitionId`, `team` |
| `setReady` | `competitionId`, `ready` booleano |
| `updateDetails` | `competitionId`, `formatId`, `scheduledAt`, `timeZone`, `venue` completos |
| `transferHost`, `transferCaptain` | `competitionId`, `targetUserId` |
| `reportScore` | `competitionId`, `score: {teamA,teamB}` |
| `confirmScore` | `competitionId`, `reportId` |
| `disputeScore` | `competitionId`, `reportId`, `reason` |
| `cancel` | `competitionId`, `reason` |
| `confirmCancellation` | `competitionId`, `cancellationId` |
| `resolveDispute` | `competitionId`, `disputeId`, `score`, `reason` |

Los goles son enteros 0…999 como límite técnico del contrato. `timeZone` es una cadena cuya pertenencia al catálogo permitido se verificará en servidor; validar el formato no acredita que la zona exista, que la fecha sea futura ni que el distrito o modalidad estén habilitados. La integración comprobará horario con reloj del servidor, zona IANA y catálogo nacional y formatos D-01, nunca con el reloj del teléfono.

Respuesta propuesta: `{success:true, requestId, competitionId, revision, data}`; error `{success:false, requestId, code, message}`. Códigos de negocio: `FULL`, `ALREADY_JOINED`, `INVALID_STATE`, `REVISION_CONFLICT`, `REQUEST_CONFLICT`, `REPORT_SUPERSEDED`, `TRANSFER_REQUIRED`, además de los códigos de autenticación/permisos existentes.

Guardar la idempotencia por actor+comando+requestId, asociada al contenido validado. Mismo ID/contenido devuelve resultado original; mismo ID con otro contenido da `REQUEST_CONFLICT`. Persistir revisión y resultado junto con la mutación antes de emitir eventos. Para carreras con el último cupo, reintentar tras leer la revisión nueva; no usar el estado visual como reserva de plaza.

Un evento de actualización deberá identificar recurso, revisión y `eventId`. El cliente descarta eventos repetidos/antiguos y recupera snapshot cuando falten revisiones. Estas garantías se implementan en MS-06/MS-07/MS-08/MS-09; el validador no las proporciona por sí mismo.

## Diferencias con el código actual y migración

| Situación actual | Trabajo de integración requerido |
|---|---|
| `RECLUTANDO`, `FALTA_1`, `EN_ACUERDO` | Candidatos a `OPEN`/`FULL` según cupos reales, preservando estado original y versión |
| `EN_CANCHA`, `active`, `in_progress` | No son equivalencias automáticas: revisar vínculo lobby/partido, inicio efectivo y marcador |
| `finished`, `disputed`, cancelaciones con distintas etiquetas | Mapear con evidencia persistida de resultado/disputa/cancelación; estado ambiguo exige revisión, nunca inventar ganador |
| 25 segundos offline expulsa de sala; entrar a cola/sala limpia otras membresías | Separar presencia temporal de inscripción persistida; conservar invitaciones futuras |
| Capitán por primer integrante; reportero 1v1 cierra directamente | Persistir roles y aplicar confirmación entre equipos también en 1v1 |
| Se reporta `winnerTeam` y se calculan puntos en varios handlers | Un servicio de resultados con marcador, confirmación, empate y resolución administrativa única |
| Cambios sin requestId/revisión | Añadir esquema, almacenamiento de idempotencia y actualización atómica de versión |

No renombrar masivamente estados en `matchsport.db`. Primero respaldar, inventariar filas y probar migración sobre copia aislada; preservar ID/código, integrantes, chat y referencias. Los recursos heredados siguen con su versión hasta migrarse o cerrarse de forma controlada. Los comandos del contrato todavía no son endpoints ni reemplazan los eventos de MS-04.

## Plan de integración y aceptación

1. D-01/D-04: base registrada en esta entrega; mantener decisiones y versión del contrato al cambiar reglas.
2. MS-06: persistencia de revisiones, idempotencia y resultado/rating; recuperación y respaldo probados.
3. MS-07: crear/unirse/salir/cancelar, horario/lugar reales, roles persistidos y cupos concurrentes.
4. MS-08: eventos con revisión, chat recuperable, reintento y desconexión sin expulsar de convocatoria futura.
5. MS-09: reportar/confirmar/discrepar, empate y resolución única con rating atómico.

Pruebas exigidas de integración: último cupo concurrente; join repetido; salida de capitán con/sin transferencia; offline prolongado sin perder cupo; cambio de horario invalida «listo»; dos capitanes del mismo equipo no confirman un resultado; 3–3 termina en empate; confirmación de reporte obsoleto se rechaza; disputa no aplica rating; resolución repetida y reinicio conservan una sola aplicación.

La entrega actual prueba solo el contrato de datos (fecha canónica, campos obligatorios, rechazo de actor/rol inyectado, revisiones, marcadores, reportId y motivo administrativo). Las pruebas de integración anteriores quedan pendientes; no se declara el flujo nuevo implementado.
