# D-05 — Recomendación para el piloto alojado

Fecha de consulta: 3 de noviembre de 2026. Estado: recomendación, sin contratación. Aldo confirmó que todavía no tiene proveedor/presupuesto y autorizó continuar con las transacciones locales; producción se preparará después.

## Opción recomendada

**PostgreSQL administrado en Supabase + servicio Node/Express/Socket.IO en Render**, inicialmente con una instancia del backend. Mantener el panel como sitio estático y Expo/React Native como cliente del mismo backend.

Es una recomendación por adecuación a la arquitectura y operación inicial, no una garantía de rendimiento para cualquier número de usuarios. PostgreSQL ofrece transacciones y permite agrupar operaciones en COMMIT/ROLLBACK ([documentación](https://www.postgresql.org/docs/current/tutorial-transactions.html)). La base administrada reduce tareas de instalación del motor; el equipo sigue siendo responsable del esquema, permisos y ensayos de restauración.

Render admite conexiones WebSocket entrantes, sin límite fijo de duración, aunque despliegues, mantenimiento y redes pueden interrumpirlas; conservar reconexión y recuperación es obligatorio ([WebSockets en Render](https://render.com/docs/websocket)). Este encaje permite mantener el servidor actual y su autoridad; no hay motivo técnico para reemplazar los sockets por otro sistema solo por contratar Supabase.

El móvil no recibirá credenciales de conexión ni una clave administrativa de Supabase. El acceso a la base se hará desde el servidor. Adoptar Supabase Auth o su Realtime sería una decisión separada; no se mezcla con la migración de persistencia actual.

## Coste y planes

Supabase publica Pro **desde US$25/mes**, con primer proyecto incluido bajo sus condiciones, backups diarios conservados siete días y límites/cargos según uso. Eso no incluye el servicio Node ni garantiza un coste total de US$25 ([precios oficiales](https://supabase.com/pricing)). Antes de contratar, recalcular base, cómputo, transferencia, almacenamiento, impuestos y límites de gasto.

No usar un plan gratuito como entorno de producción por defecto: Render indica que sus instancias gratuitas tienen limitaciones y no deben usarse para producción; pueden suspenderse por inactividad y pierden archivos locales en reinicios/despliegues. Por tanto, no alojar el archivo sql.js actual sobre ese filesystem efímero ([condiciones Free](https://render.com/docs/free)).

Los planes gratuitos sirven para una evaluación técnica con datos sintéticos. Elegir un servicio de cómputo de pago y comprobar la política de respaldos/restauración del plan concreto antes de usuarios reales. No se presupuestó un plan de backend sin conocer recursos y concurrencia objetivo.

## Alternativa y criterio

Una instancia Node con SQLite nativo y disco persistente puede ser una alternativa si el presupuesto inicial obliga a una operación pequeña y única. Requiere administración del disco, backup externo, restauración y pruebas de carga; no usar un archivo en memoria exportado como base compartida. Mantener sql.js es una decisión local transitoria, no la recomendación definitiva para el despliegue nacional.

La cobertura de todo Perú define catálogo y búsqueda, no cuántas conexiones habrá simultáneamente. Empezar con una instancia, medir CPU/memoria/latencia/conexiones y aumentar según evidencia. Varias instancias necesitan además almacenamiento compartido de presencia/colas y un adaptador de Socket.IO; PostgreSQL por sí solo no distribuye esos estados.

## Secuencia antes de producción

1. Acordar presupuesto mensual y límites, invitados/concurrencia esperados, responsable de soporte y RPO/RTO.
2. Elegir regiones cercanas entre backend y base, comprobando disponibilidad del proveedor y midiendo latencia desde Perú. No se seleccionó ni reservó una región.
3. Implementar repositorio PostgreSQL y migraciones, revisando todas las consultas y transacciones; definir una sola fuente de verdad. No basta cambiar una variable de entorno del código sql.js.
4. Migrar una copia aislada: comparar cuentas/perfiles/salas/partidos/recibos; comprobar hashes, roles y sesiones; no importar demos al piloto.
5. Probar restauración real, caída del backend, reconexión y acciones concurrentes. Establecer respaldos externos y observabilidad sin secretos ni mensajes privados.
6. Ensayar corte, copia final, validación y reversión antes de configurar HTTPS/WSS y builds de distribución.

No se crearon cuentas de proveedores, bases remotas, infraestructura ni cargos. La decisión de proveedor final y el despliegue se mantienen pendientes hasta acordar presupuesto y preparar una migración revisable.
