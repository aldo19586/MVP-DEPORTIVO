# MatchSport - Guía del Agente (AGENTS.md)

Este repositorio contiene la plataforma deportiva MatchSport, compuesta por:
1. `apps/mobile`: Aplicación móvil **100% Nativa en React Native / Expo** para los jugadores.
2. `apps/admin-web`: Portal web de escritorio en React + Vite para el SuperAdmin y dueños de canchas.
3. `server`: Backend API REST y WebSockets en Node.js (Socket.IO + SQLite/PostgreSQL).

## Reglas Mandatorias para Agentes:
- **Mobile es NATIVO puro:** Prohibido usar etiquetas web HTML (`<div>`, `<span>`, `document`, `localStorage`). Siempre usar componentes de React Native (`View`, `Text`, `StyleSheet`, etc.) y APIs de Expo (`expo-location`, `expo-haptics`, `expo-notifications`, `expo-image-picker`).
- **Web Admin es Desktop Panorámico:** Optimizado para pantallas 1080p+, diseñado para monitoreo de sockets en vivo, tablas de usuarios y resolución de disputas.
- **Backend es Node.js + WebSockets + DB:** Servidor unificado en `server/` con Express, Socket.IO, persistencia atómica y motor de matchmaking/Glicko-2.
- **Skills del Proyecto:** Consultar las instrucciones modulares en `.agents/skills/` antes de implementar características en cada app o servidor.
