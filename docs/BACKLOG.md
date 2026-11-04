# Backlog de ejecución

Estado: **MS-01 a MS-05 Hechos**; **MS-06 En curso**; las demás tareas siguen **Pendientes**. Tamaño relativo: S (acotada), M (varios componentes), L (requiere dividir en entregas). No son estimaciones de días.

Cada tarea cerrada debe registrar commit/PR, evidencia de pruebas, limitaciones y fecha. Antes de implementar una tarea L, dividirla por criterios verificables sin perder su dependencia de integración.

| ID | Prioridad / tamaño | Entrega | Depende de | Criterio de aceptación |
|---|---|---|---|---|
| MS-00 | P1 / S | Resolver decisiones D-01…D-07 por etapa | Responsable del producto | Cada decisión necesaria tiene opción y motivo registrados; no bloquear fixes de seguridad por decisiones comerciales |
| MS-01 | P1 / M | **Hecho:** entorno de tests aislado, configuración DB/puerto y seed explícito | — | Base temporal por caso; rutas protegidas rechazadas; arranque sin demos por defecto; aislamiento y reinicio comprobados. Ver evidencia debajo |
| MS-02 | P0 / M | **Hecho:** identidad, roles y credenciales de servidor | MS-01 | Registro público siempre player; alta admin por operador; secretos requeridos fuera de dev; DTO sin password/hash; tokens probados. Límites de migración/visibilidad en IDENTIDAD.md |
| MS-03 | P0 / L | **Hecho:** autenticación REST y clientes | MS-02 | Inventario de rutas públicas/protegidas; permisos por propietario/rol; mobile guarda y envía sesión segura; admin maneja 401/403; jugador A no modifica B; anónimo no usa admin. A-01/A-05 |
| MS-04 | P0 / L | **Hecho:** identidad y permisos Socket.IO | MS-02/MS-03 | Handshake autenticado; eventos usan actor del servidor; admin solo en canal protegido; no miembro no lee/escribe chat ni cambia sala; sesión revocada/baneada no reconecta. A-03 |
| MS-05 | P1 / M | **Hecho (especificación):** reglas y contratos de salas/partidos | MS-00: D-01/D-04 | Tabla de estados/transiciones/roles, payloads y errores; regla para cupo, abandono, cancelación, empate y ausencia del capitán. Contrato compartido de prueba, sin duplicar lógica de autoridad |
| MS-06 | P1 / L | **En curso (A hecha, B pendiente):** persistencia durable y recuperación | MS-01, D-05 antes del piloto | Elegir almacenamiento con decisión escrita; migraciones; backups y restauración comprobada; interrupción de escritura sin pérdida silenciosa; tests sobre archivo aislado. A-11 |
| MS-07 | P1 / L | Crear/unirse/salir de convocatorias reales | MS-03/MS-04/MS-05 | Todas las entradas usan servidor; código real copiable/compartible; última plaza con dos solicitudes da un único ganador; sin duplicar miembros; fecha/hora/zona persistidas; sala recuperable tras reinicio. A-06/A-08 |
| MS-08 | P1 / M | Chat y reconexión | MS-04/MS-07 | Dos dispositivos reciben mismo mensaje una vez; historial y reintento; estados enviando/error; filtro por sala y limpieza de listeners; desconexión no borra membresía futura. A-07/A-08 |
| MS-09 | P1 / L | Finalización, disputa y rating consistente | MS-04/MS-05/MS-06/MS-07 | Resultado solo por rol autorizado; confirmación según regla; empate; disputa conserva evidencia; resolución admin idempotente; rating/historial se actualizan una vez incluso tras reinicio. A-10 |
| MS-10 | P1 / L | Onboarding continuo y carta inicial | MS-03, D-02/D-03/D-06 | Cuenta → datos mínimos → test → carta; reanudar; 14 respuestas válidas exigidas por servidor; foto opcional; sin atributos inventados; conservar invitación. A-09/A-16 |
| MS-11 | P2 / M | Simplificar navegación y pantallas | MS-07/MS-08/MS-10 | Jugar/Mis partidos/Perfil, acción primaria por estado, filtros secundarios, sin demos en recorrido real, carga/error/vacío explícitos; revisión en iPhone y tamaño de texto grande |
| MS-12 | P1 / M | SuperAdmin operativo y trazable | MS-03/MS-04/MS-09 | Ban/reset/disputa registran actor/motivo/fecha; errores visibles; reset según recuperación acordada; no se muestra «0 usuarios» por fallo de API. A-17 |
| MS-13 | P1 / M | Automatizar validaciones y build nativa | MS-01/MS-03/MS-04 | CI falla con test negativo roto; lockfile reproducible; build de apps/mobile identificada; pipeline Capacitor retirado del camino vigente; versiones soportadas fijadas. A-13/A-14 |
| MS-14 | P1 / L | Entorno de piloto y operación | MS-06/MS-12/MS-13, D-05/D-07 | HTTPS/WSS, configuración por entorno, sin demos/secretos de respaldo; logs sin credenciales; monitoreo y restore ensayado; responsable de incidentes; dependencias revisadas. A-15 |
| MS-15 | P1 / M | Avisos y validación en dispositivos | MS-07/MS-08/MS-14 | Permisos contextuales; aviso real llega al destinatario y abre el partido correcto; probar segundo plano/denegación; definir fallback al abrir app; validar iOS y Android si se incluye |
| MS-16 | P1 / M | Ensayo y piloto privado | MS-00…MS-15 necesarias para el alcance | Matriz de VALIDACION.md con evidencia; cero P0/P1 abiertos en alcance; usuarios invitados completan ciclo real; telemetría mínima y registro de incidencias; decisión explícita de ampliar o corregir |

## Primera entrega técnica propuesta

MS-01 a MS-05 completados. Sigue MS-06 (persistencia) y después MS-07 (convocatorias), usando el alcance nacional y reglas confirmadas de D-01/D-04. Las correcciones de autorización deben integrarse con ambos clientes para no dejar una API protegida con una app incapaz de usarla. El entorno de desarrollo debe continuar permitiendo verificar el trabajo localmente.

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

Después se entrega una convocatoria real entre dos o más cuentas (MS-05/MS-07/MS-08), se cierra resultado/persistencia y se integra el onboarding simplificado. El diseño puede definirse mientras se corrigen permisos, pero no se declara listo antes de conectarlo al servidor.

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
