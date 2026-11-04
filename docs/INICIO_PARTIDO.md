# MS-07-B — Preparación e inicio de partido

3 de noviembre de 2026. Implementación de preparación, edición e inicio sobre las convocatorias de MS-07-A. El chat del recurso nuevo sigue en MS-08 y marcador/confirmación/empate en MS-09. La prueba física en iPhone permanece pendiente.

## Condiciones para iniciar

El anfitrión ejecuta `start` con requestId, competitionId y expectedRevision del contrato `competition.v1`. El servidor exige:

- Dos equipos completos, sin IDs de participante duplicados.
- Un capitán perteneciente a cada equipo.
- Todos los integrantes con Listo confirmado.
- Hora actual del servidor igual o posterior al horario programado; no se aplica una ventana máxima de retraso sin decisión del producto.
- Modalidad habilitada y participantes existentes sin sanción vigente.
- Ningún integrante en otro partido nuevo en curso/pendiente/en disputa ni en un partido heredado activo/en disputa.

Se rechaza un capitán que no sea anfitrión cuando intenta iniciar. Los demás permisos de preparación permanecen: cada jugador modifica su propio Listo y equipo; el capitán/anfitrión transfiere su rol según las reglas de MS-07-A; solo el anfitrión cambia lugar/horario/modalidad, invalidando los Listo previos.

## Inicio indivisible y recuperación

La transacción crea una sola fila `competition_matches`, fija la alineación y capitanes, actualiza la convocatoria a `IN_PROGRESS` con matchId/startedAt, incrementa su revisión y guarda el recibo de solicitud. Cualquier excepción revierte SQL y ambas cachés. Repetir el mismo comando devuelve el mismo matchId, incluso después de reiniciar. Dos solicitudes de inicio con la misma revisión no generan dos partidos.

`competition_matches.competition_id` es único. El partido conserva ID de convocatoria, deporte/formato, cancha/distrito, horario/zona, inicio real, participantes y capitanes. La convocatoria se conserva: no se borra ni se reutiliza su código para otra. No se crean goles, chat ni estadísticas de demostración.

Después de iniciar se cierran ingreso, salida, cambio de equipo/roles, edición, cancelación previa y Listo en este recorrido. La alineación pasa a ser evidencia histórica. El abandono/incidencia y cancelación durante juego se incorporarán con el ciclo de MS-09; no se cancela todo el partido por una desconexión.

La exclusión de partidos simultáneos también se verifica desde `db.createMatch` del camino heredado. El motor omite jugadores con un partido nuevo activo y cancela una aceptación pendiente si alguno ya empezó otro partido. Los permisos del socket bloquean iniciar un lobby antiguo con esos jugadores. No basta con ocultar un botón en la app.

## API y aislamiento de recorridos

- POST `/api/competitions/commands/start`: requiere sesión y permiso de anfitrión, además de todas las condiciones anteriores.
- GET `/api/competitions/:id/match`: solo participante de la alineación o SuperAdmin; anónimo recibe 401 y jugador ajeno 403.
- GET `/api/competitions/mine`: conserva la convocatoria iniciada y su vínculo al partido. El listado de convocatorias abiertas ya no la ofrece para unirse.

El partido nuevo no se inserta en el mapa/tablas de matches heredados. Esos handlers no pueden finalizarlo por `winnerTeam` ni aplicar la regla antigua del reportero unilateral. La integración de resultados nueva será explícita en MS-09, conservando este matchId. El monitor administrativo aún no incorpora estos nuevos partidos; su integración pertenece al panel operativo MS-12.

Errores de inicio: `FORBIDDEN`, `REVISION_CONFLICT`, `INVALID_STATE`, `INCOMPLETE_TEAMS`, `CAPTAIN_REQUIRED`, `NOT_READY`, `NOT_STARTED_YET`, `PLAYER_UNAVAILABLE`, `ACTIVE_MATCH`, `DUPLICATE_PLAYER`. Un reintento tras conflicto requiere consultar la revisión actual. No se añadió un endpoint para manipular el reloj o llenar jugadores ficticios.

## Móvil

El detalle ofrece Estoy listo/Quitar Listo y, para el anfitrión, Iniciar partido. Se habilita con la información actual de equipos completos/Listo/horario; el servidor vuelve a verificar todo. Actualizar sala queda junto a las acciones principales, sin exigir recorrer toda la plantilla. La actualización automática de terceros se integra en MS-08.

Opciones de sala agrupa cambio de equipo, transferencias, edición y cancelación. Editar reutiliza el formulario de modalidad/distrito y cancha/horario, cargando los datos existentes. Guardar no crea otra convocatoria. Después de iniciar, esas acciones desaparecen y el móvil consulta el partido protegido: muestra su inicio y los equipos confirmados. No navega a la pantalla antigua con marcador y cifras de ejemplo.

## Esquema y pruebas

Esquema 4: tabla `competition_matches` y entrada en `schema_migrations`, dentro de la migración transaccional de arranque. Respaldo/restauración acepta esquema 4 y comprueba que exista su tabla. Versiones anteriores conservan sus registros al migrar; no se hizo una migración de la base personal o manual de prueba en esta entrega.

Seis pruebas nuevas, con cuentas sintéticas y proceso/base aislados:

1. Permiso de anfitrión, hora programada, equipos, capitanes, Listo y sanción antes de mutar.
2. Inicio único, replay tras reiniciar, cierre de preparación y lectura privada del partido.
3. Solapamiento entre partidos nuevos y heredados en ambas direcciones.
4. Dos inicios HTTP concurrentes: uno aceptado y otro rechazado; una sola fila de partido.
5. Respaldo/restauración y recuperación del vínculo convocatoria/partido y sus capitanes.
6. Excepción después de insertar el partido: rollback SQL/cachés, archivo sin cambios y reintento posterior exitoso.

Suite conjunta: 73 pruebas. Bundle iOS/Hermes exportado. La evidencia automática no acredita la interacción física del selector, teclado, tamaño de fuente ni uso simultáneo en dos iPhone; esa validación sigue pendiente. La base personal conserva el SHA-256 `8C18503D9E57EC8C7F5E922422FC4A172B39051EFB4CC8FA9EA3E91DA0C9D116`.

## Servicios de prueba

A solicitud de Aldo se detuvieron backend en 3001, Expo en 8082 y Vite en 5174, comprobando los procesos identificados de esta prueba. Se liberó el lock residual de la base manual tras verificar que su escritor ya no existía. Sus datos se conservaron. Las verificaciones posteriores usan sandboxes y exportación de bundle; no reabren esos servicios de prueba.

MS-07 queda implementado en A/B para preparar e iniciar convocatorias; los escenarios de piloto/dispositivo continúan en la matriz de validación. Siguiente desarrollo: MS-08, chat del nuevo recurso y actualización/reconexión con revisiones.
