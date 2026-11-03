# MatchSport - Guía del Agente (AGENTS.md)

Este repositorio contiene la plataforma deportiva MatchSport, compuesta por:
1. `apps/mobile`: Aplicación móvil **100% Nativa en React Native / Expo** para los jugadores.
2. `apps/admin-web`: Portal web de escritorio en React + Vite para el SuperAdmin.
3. `server`: Backend API REST y WebSockets en Node.js (Socket.IO + SQLite/PostgreSQL).

## Reglas Mandatorias para Agentes:
- **Alcance Estricto del MVP (Jugador + Administrador):**
  - El MVP se enfoca **única y exclusivamente** en dos actores:
    1. **El Jugador:** Encontrar rivales, salas de convocatoria, partidos, chat y rating en la App Móvil.
    2. **El SuperAdmin:** Monitorear sockets en vivo, auditar jugadores, aplicar sanciones (ban/reset PIN) y resolver disputas arbitrales en el Panel Web.
  - ⚠️ **Módulo B2B de Dueños de Canchas POSTPUESTO:** NO implementar ni priorizar paneles de agenda o TPV para dueños de canchas en esta etapa. Se evaluará más adelante según la tracción de usuarios.
- **Mobile es NATIVO puro:** Prohibido usar etiquetas web HTML (`<div>`, `<span>`, `document`, `localStorage`). Siempre usar componentes de React Native (`View`, `Text`, `StyleSheet`, etc.) y APIs de Expo (`expo-location`, `expo-haptics`, `expo-notifications`, `expo-image-picker`).
- **Web Admin es Desktop Panorámico:** Optimizado para pantallas 1080p+, diseñado para monitoreo de sockets en vivo, tablas de usuarios y resolución de disputas.
- **Backend es Node.js + WebSockets + DB:** Servidor unificado en `server/` con Express, Socket.IO, persistencia atómica y motor de matchmaking/Glicko-2.
- **Skills del Proyecto:** Consultar las instrucciones modulares en `.agents/skills/` antes de implementar características en cada app o servidor.

## Forma de trabajo y Git (preferencia acordada con el usuario)
- Avanzar por entregas completas y verificables: definir el resultado, implementar, ejecutar las pruebas pertinentes y actualizar el backlog en `docs/BACKLOG.md`.
- Crear commits por cambios coherentes y comprobados, no por cada archivo o edición. Una entrega puede tener varios commits si contiene cambios independientes. Separar dependencias, documentación y funcionalidades cuando tenga sentido.
- Escribir mensajes de commit breves, concretos y en español. Se pueden usar prefijos como `fix`, `feat`, `test`, `docs` o `chore`. Evitar textos exagerados, genéricos o descripciones que repitan todo el código.
- Al cerrar una entrega validada, crear sus commits y subir la rama de trabajo al remoto configurado. Este flujo habitual está autorizado por el usuario; no pedir confirmación de nuevo para cada commit o push dentro del alcance acordado.
- Trabajar en ramas `codex/…`; verificar el remoto y la rama antes de subir. No integrar directamente en `main`/`master`, hacer force-push ni reescribir historial publicado sin autorización específica.
- Revisar el diff antes de preparar el commit. Respetar cambios previos del usuario y evitar incluir modificaciones ajenas a la entrega, secretos, bases de datos, logs o cachés.
- Mantener un historial fiel al trabajo realizado: no fabricar fechas, pausas, autorías o actividad para aparentar trabajo manual. Usar la identidad Git configurada, sin inventarla.
- Al cerrar cada entrega, informar qué se comprobó, el commit y la rama subidos. Si no se pudo subir, indicar expresamente qué sigue local y por qué.
