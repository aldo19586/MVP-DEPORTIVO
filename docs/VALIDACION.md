# Validación y condiciones del piloto

Este documento define pruebas del MVP. Salvo la evidencia previa señalada en AUDITORIA.md y la suite de aislamiento MS-01 (ver BACKLOG.md), están pendientes. MS-01 verifica reinicio controlado de datos de usuario, no acredita por sí solo V-13/V-14 ni los flujos completos. No ejecutar las pruebas mutantes sobre la base personal ni sobre producción.

## 1. Entornos

- Desarrollo local: PC/Expo y datos de desarrollo identificables.
- Pruebas automáticas: puerto y base temporales, usuarios sintéticos, reloj controlable donde corresponda, limpieza limitada al directorio creado por la prueba.
- Piloto: base independiente, cuentas reales invitadas, configuración y secretos propios, respaldo y responsable de soporte.
- La app debe identificar internamente qué entorno usa; no depender de cambiar una IP en el código para publicar.

## 2. Escenarios obligatorios

| ID | Escenario | Resultado esperado |
|---|---|---|
| V-01 | Registro, inicio, expiración y cierre de sesión | Cuenta única; sesión recuperada cuando es válida; inválida exige acceso sin perder datos guardados |
| V-02 | Anónimo y jugador acceden a acciones administrativas | 401/403 apropiado y ninguna modificación; registro con correo que contiene admin no eleva rol |
| V-03 | Jugador A envía ID de B por REST o socket | No modifica ni actúa como B; no obtiene sus datos privados |
| V-04 | Usuario baneado, token falso/expirado y reconexión | Rechazo coherente en REST y sockets; no mantiene privilegios tras revocación |
| V-05 | Cerrar app a mitad del test; enviar respuestas incompletas o inválidas | Retomar progreso; servidor rechaza datos inválidos; carta solo tras finalizar |
| V-06 | Invitación seguida de registro | Terminar onboarding regresa al partido invitado; sala inexistente/llena explica el motivo |
| V-07 | Crear sala desde cada acceso y abrirla con otra cuenta | Mismo ID/código y datos persistidos; no existe sala solo local |
| V-08 | Dos cuentas intentan el último cupo simultáneamente y reintentan | Un único cupo asignado; sin duplicados ni capacidad excedida |
| V-09 | Abandonar, cancelar o cambiar equipo sin autorización | Se aplica la regla de actor/estado; feedback claro y servidor sin cambios indebidos |
| V-10 | Chat entre dos dispositivos, cambio de sala y reconexión | Entrega una vez, sala correcta, historial recuperable; no duplicación por listeners |
| V-11 | Reportes coincidentes, diferentes y empate | Confirmación o disputa según contrato; nadie ajeno al partido puede resolverlo |
| V-12 | Repetir resultado/resolución y reiniciar entre operaciones | Rating e historial cambian una sola vez; resultado durable y coherente |
| V-13 | Reiniciar backend con salas/partidos activos | Restaurar estado acordado; no perder participantes por confundir conexión con membresía |
| V-14 | Simular fallo de escritura y restaurar backup en entorno separado | Detectar fallo; recuperación comprobada; medir tiempo y pérdida tolerada acordados |
| V-15 | API caída, red móvil/Wi-Fi, app en segundo plano y permisos denegados | Estado recuperable; no éxito ficticio, pantalla bloqueada indefinida ni datos demo |
| V-16 | Admin ante error de API, sanción y reset | Error visible; acciones auditadas; recuperación verifica titularidad según D-03 |
| V-17 | Dispositivo pequeño, teclado y fuente grande | Campos y acción accesibles; sin recortes ni dependencia exclusiva del color |
| V-18 | Notificación real y pulsación desde segundo plano | Solo destinatario correcto; abre recurso vigente; fallback si permiso denegado |
| V-19 | Instalación limpia de build del piloto fuera de LAN de la PC | Registro y ciclo de partido sin Metro ni servidor personal; usar build adecuada para distribución |
| V-20 | Usuario sin partidas ni avisos | Vacíos honestos, ninguna victoria, estadística o mensaje precargado como real |

## 3. Evidencia mínima

Por prueba: fecha, versión/commit, entorno, plataforma/dispositivo, datos sintéticos usados, resultado esperado/obtenido y vínculo al log o captura sin información sensible. Diferenciar automatizada, manual en dispositivo y lectura estática.

Los checks de código/API no sustituyen la prueba nativa. Un HTTP 200 de bundle no acredita inicio de sesión, permisos, push ni fluidez. Una pantalla visible tampoco acredita persistencia o permisos.

## 4. Criterio de tarea terminada

Cumple aceptación del backlog; integra cliente y servidor cuando aplica; tiene errores/carga/vacíos; no incorpora datos demo a usuarios reales; supera pruebas pertinentes; actualiza contrato/documentación y puede revertirse con datos protegidos. Si cambia un esquema, incluye migración y estrategia compatible de recuperación.

## 5. Criterio de apertura del piloto

- Alcance, participantes, reglas de resultado y recuperación acordados.
- Ningún P0/P1 abierto en el alcance distribuido; funciones pospuestas no son accesibles accidentalmente.
- Flujo completo probado por varias cuentas en dispositivos reales.
- Entorno independiente de la PC, backup restaurado y procedimiento de incidente probado.
- Datos demo separados; datos personales mínimos, aviso de privacidad y mecanismo de atención/eliminación preparados según requisitos aplicables. Esta revisión no certifica cumplimiento legal.
- Responsable de moderación y soporte, canal de reporte y procedimiento para retirar una versión defectuosa.
- Revisión de dependencias y secretos; no publicar tokens ni mensajes de usuarios en logs.

## 6. Operación del piloto

Revisar fallos, abandono del onboarding, unión a partidos y convocatorias completadas. Registrar problemas como tareas vinculadas a versión y evidencia. Ante acceso indebido o corrupción de datos, detener nuevas invitaciones y las operaciones afectadas, preservar evidencia sin secretos y recuperar el servicio antes de continuar. No ejecutar restauraciones o migraciones sobre usuarios reales sin preparar el procedimiento concreto.

Ampliar participantes solo después de revisar resultados del grupo inicial. El piloto valida uso real; no demuestra por sí mismo capacidad para miles de conexiones. La prueba de carga posterior se dimensionará con el objetivo de concurrencia acordado.
