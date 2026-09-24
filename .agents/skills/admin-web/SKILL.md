---
name: admin-web
description: >-
  Especialista en desarrollo web de escritorio para el Panel SuperAdmin de MatchSport.
  Activar este skill cuando se desarrollen vistas del dashboard, monitor de sockets en vivo,
  sala de resolución de disputas o tablas de auditoría bajo apps/admin-web.
---

# Skill: Especialista Web Admin (Desktop Dashboard)

Este skill define los estándares y procedimientos para desarrollar el panel administrativo web en `apps/admin-web/`.

## 1. Diseño y Estándares Web Desktop
- Stack: React + Vite + CSS moderno + Lucide Icons + Recharts / Chart.js.
- Diseñado para pantallas panorámicas (1080p+), permitiendo monitorear alta densidad de información.
- Conexión a endpoints protegidos `/api/admin/*` y sockets administrativos.

## 2. Módulos Críticos
- **Live Monitor:** Renderizado en tiempo real de usuarios online (`onlineUsersUpdate`) y partidos activos en cancha.
- **Dispute Resolution Room:** Interfaz en dos columnas (Capitán A vs Capitán B) con el chat del partido y selector de resolución definitiva.
- **Auditoría de Jugadores:** Tabla con paginación, filtros por distrito y acciones de baneo temporal o reseteo de PIN.
- **Gestión de Deportes y Formatos:** Toggles interactivos que impactan en vivo a la app móvil sin requerir actualización en tiendas.
