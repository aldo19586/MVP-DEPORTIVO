# Plan de ejecución de MatchSport

Fecha de revisión: 2 de noviembre de 2026 (America/Lima).

Este índice organiza la continuación del proyecto desde el prototipo hasta un piloto con usuarios reales. Describe trabajo pendiente; no certifica que el producto esté listo para producción.

## Orden de lectura

1. [Documento rector del MVP](MVP.md): objetivo, alcance, experiencia y decisiones pendientes.
2. [Auditoría inicial](AUDITORIA.md): evidencias del código, impacto y límites de la revisión.
3. [Backlog de ejecución](BACKLOG.md): tareas, dependencias y criterios de aceptación.
4. [Validación y piloto](VALIDACION.md): qué probar y qué evidencia conservar.

## Cómo trabajamos

- AGENTS.md conserva las reglas obligatorias de arquitectura y alcance. Las decisiones nuevas del usuario prevalecen; se registran aquí antes de cambiar el alcance.
- Estas páginas son la referencia operativa de planificación. Los documentos antiguos de arquitectura y roadmap de la raíz son antecedentes: sus afirmaciones de «100% operativo», Capacitor y B2B no se trasladan al MVP actual sin comprobación.
- ESTADO_ACTUAL.md registra la puesta en marcha local de esta sesión, no la preparación para lanzamiento.
- Cada cambio comienza con una tarea de BACKLOG.md. Se implementa una porción completa, se prueba, se revisa y se actualiza su estado.
- Estados: Pendiente → En curso → En revisión → Hecho. Bloqueado exige identificar la dependencia concreta. No hay tareas de implementación terminadas por el solo hecho de existir archivos.
- Cada entrega incluye: objetivo, archivos modificados, comprobaciones y resultado, limitaciones y próximo paso. Las decisiones no deben quedar solo en el chat.
- Los cambios se realizan en ramas `codex/…`, con entregas pequeñas y revisión antes de integrar. Conservar cambios locales previos; no mezclar una actualización de dependencias con una funcionalidad sin explicarlo.
- Los skills existentes de móvil, backend y admin se consultan según el área. Un skill adicional de validación se justifica cuando el procedimiento esté probado; no hace falta instalar muchos skills para comenzar.
- Agentes adicionales, cuando se autoricen, reciben tareas acotadas y responsables de archivos definidos. Una sola coordinación integra los resultados y comprueba el flujo completo.
- GitHub Issues/Projects puede reflejar los IDs de este backlog. Antes de publicar tareas, comprobar repositorio y acceso; no duplicar listas sin decidir cuál controla el estado. No se han publicado issues en esta revisión.

## Estado de esta entrega

Documentación y auditoría estática inicial terminadas. **MS-01 completado:** pruebas de aislamiento y persistencia tras reinicio controlado, configuración separada y seed demo explícito. Las comprobaciones previas de API, Metro y compilación se consignan como evidencia anterior. El resto de la implementación y el piloto permanecen pendientes.

**MS-02 completado:** [identidad, roles y credenciales](IDENTIDAD.md), con 17 tests aprobados en la suite conjunta. Siguiente trabajo técnico: **MS-03, autorización REST y sesión en ambos clientes**; después MS-04, sockets. Las decisiones de MS-00 que bloquean onboarding y distribución no bloquean estas correcciones.
