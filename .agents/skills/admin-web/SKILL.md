---
name: admin-web
description: >-
  Especialista en desarrollo web de escritorio para el Panel SuperAdmin de MatchSport.
  Activar este skill cuando se desarrollen vistas del dashboard, monitor de sockets en vivo,
  sala de resolución de disputas o tablas de auditoría bajo apps/admin-web.
---

# Skill: Especialista Web Admin (Desktop Dashboard)

Este skill define los estándares y procedimientos para desarrollar el panel administrativo web en `apps/admin-web/`.

## 1. Alcance y Enfoque del MVP
- **Foco Exclusivo en SuperAdmin & Moderación:** El panel está diseñado para los fundadores y administradores del sistema, enfocado en supervisar jugadores, monitorear la salud de sockets y resolver disputas arbitrales.
- ⚠️ **Módulo de Dueños de Canchas (B2B) Pospuesto:** No implementar agendas, TPV ni pasarelas para dueños de canchas en esta fase. Se mantendrá el foco 100% en la experiencia de juego y arbitraje.

## 2. Diseño y Estándares Web Desktop
- Stack: React + Vite + CSS moderno + Lucide Icons.
- Diseñado para pantallas panorámicas (1080p+), permitiendo monitorear alta densidad de información.
- Conexión a endpoints protegidos `/api/admin/*` con token JWT y sockets administrativos.

## 3. Módulos Críticos
- **Live Monitor:** Renderizado en tiempo real de usuarios online (`onlineUsersUpdate`) y partidos activos en cancha.
- **Dispute Resolution Room:** Interfaz en dos columnas (Capitán A vs Capitán B) con el chat del partido y selector de resolución definitiva con ajuste de rating Glicko-2.
- **Auditoría de Jugadores:** Tabla de alta densidad, filtros por distrito, verificación de DNI, baneo temporal por horas y restablecimiento de PIN de emergencia.
- **Gestión de Deportes y Formatos:** Toggles interactivos que activan/desactivan formatos en vivo en la app móvil sin requerir actualización en tiendas.
