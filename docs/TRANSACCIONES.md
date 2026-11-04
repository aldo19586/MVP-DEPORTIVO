# MS-06-B — Transacciones locales de resultados

3 de noviembre de 2026. Implementado sobre sql.js para continuar desarrollo local, según instrucción de Aldo. No hay despliegue ni migración a PostgreSQL en esta entrega. MS-06 continúa abierto para la preparación operativa del almacenamiento del piloto.

## Operación indivisible

`withTransaction` en `server/database.js` ejecuta BEGIN IMMEDIATE, callback síncrono y COMMIT; ante excepción hace ROLLBACK. Mientras está abierta, los guardados individuales se difieren. Después del commit se exporta una sola vez usando el reemplazo atómico de MS-06-A. No se exporta una transacción abierta. Callbacks async y transacciones anidadas se rechazan.

`db.atomic` guarda una copia de las cachés de usuarios, perfiles, partidos, salas y reseñas usadas por estas operaciones. Si el callback falla, restaura esas cachés además del rollback SQL. No hace rollback de objetos externos, presencia o mensajes; por eso las emisiones y cambios de presencia se realizan después de confirmar. Las funciones transaccionales son internas y síncronas: no deben iniciar tareas asíncronas ni efectos externos.

Si falla el archivo después del commit en memoria, el proceso se detiene como en MS-06-A. El siguiente arranque carga el último snapshot completo: nunca un subconjunto de ratings de esa transacción. Un resultado puede haberse guardado sin llegar a responder; el recibo persistente permite reconocerlo al reintentar.

Referencias de semántica: [transacciones SQLite](https://www.sqlite.org/lang_transaction.html) y [transacciones PostgreSQL](https://www.postgresql.org/docs/current/tutorial-transactions.html). sql.js continúa siendo una base en memoria exportada, no un servidor PostgreSQL ni un archivo SQLite compartible por múltiples escritores.

## Finalización actual unificada

`db.finalizeLegacyMatch` reemplaza las copias de cálculo en reporte 1v1, consenso de equipos y resolución REST administrativa. Guarda juntos:

- Perfil de cada participante: rating y contadores de partidos/victorias/derrotas.
- Partido finalizado, resultado, autor/administrador, temporizador detenido y revisión incrementada.
- Recibo único `legacy-result:<matchId>` en `operation_receipts`.

Mismo resultado ya aplicado devuelve el recibo sin sumar puntos. Otro ganador o reabrir un partido que tiene recibo exige una corrección administrativa específica; no se vuelve a aplicar el rating desde la ruta ordinaria. El endpoint administrativo mantiene el rechazo 409 de un partido ya finalizado. Las notificaciones de partido terminado se emiten después del guardado; el chat y el estado del partido no anuncian una transacción fallida como éxito.

También se persisten los reportes pendientes antes de emitir `reportWaiting`. Se retiró la duplicación de notificaciones de finalización a sala y sockets individuales en el recorrido de jugador. La asignación avanzada de peer review sigue fuera de la transacción y no se considera durable por este cambio.

Se conserva por compatibilidad la fórmula heredada +35/-25 y la confirmación actual del 1v1. Esto no activa aún la nueva regla de dos capitanes, marcador/empate ni el contrato `competition.v1`; su integración y fórmula final corresponden a MS-09/D-06. El administrador ahora actualiza los contadores de partido junto con el rating, en la misma operación.

## Esquema 2 y migración

El arranque acepta versiones 0/1/2 y rechaza versiones posteriores. La creación/verificación del esquema y la escritura de `user_version=2` se hacen dentro de una transacción con un solo snapshot final. Se añaden `operation_receipts` y `schema_migrations`; la versión 2 queda registrada con fecha.

Al migrar de 0/1, un partido que ya conste `finished` recibe un marcador histórico en el registro de recibos. No se recalculan sus puntos ni se inventan deltas. Esto impide premiarlo otra vez si luego se intenta reabrirlo por un handler heredado. Una disputa histórica ya presente sin evidencia de finalización previa requiere revisión antes del piloto: la migración no puede reconstruir eventos que nunca se guardaron.

El CLI de backup acepta hasta esquema 2. Sigue restaurando exclusivamente a un archivo nuevo; antes de usar una versión antigua del backend con esquema 2 deberá prepararse una estrategia de reversión. No se hizo una migración inversa ni se alteró la base personal.

## Evidencia

Seis pruebas nuevas en `server/tests/transactions.test.js`:

1. Excepción después de actualizar ratings revierte perfiles, partido, recibo y cachés; el archivo anterior permanece igual.
2. Finalización repetida, reinicio de proceso y ganador conflictivo no vuelven a aplicar puntos; reapertura con recibo se rechaza.
3. SIGKILL dentro de una transacción tras el primer rating conserva todos los valores previos en disco.
4. Finalización por el socket del reportero conserva partido y contadores después de reiniciar el servidor.
5. Callbacks async y anidados se rechazan sin dejar un rating parcial.
6. Migración desde esquema 1 preserva cuentas y registra esquema 2, incluyendo recibo histórico para partidos terminados.

Suite conjunta: 60 casos. Todos usan sandboxes. SHA-256 personal sin cambios: `8C18503D9E57EC8C7F5E922422FC4A172B39051EFB4CC8FA9EA3E91DA0C9D116`.

## Trabajo restante

La idempotencia aquí es específica de finalización por ID de partido. RequestId/contenido/revisión para todos los comandos, transacciones de cupos/roles y el ciclo nuevo se integran al construir MS-07/MS-09; no existe aún un middleware universal de idempotencia. Las cachés completas se copian por operación de resultado: medir coste antes de cargar datos de un piloto grande.

D-05: Aldo indicó que aún no eligió hosting/presupuesto y autorizó continuar localmente, pasando a producción después. Ver [recomendación de almacenamiento y despliegue](ALMACENAMIENTO_PILOTO.md). Continúan pendientes PostgreSQL real/migración, respaldos externos automatizados, límites de gasto, RPO/RTO y ensayos de recuperación del entorno alojado. Estas dependencias no bloquean construir y probar convocatorias locales.
