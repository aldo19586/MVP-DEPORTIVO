# 📘 Manual de Arquitectura y Tecnologías - MatchSport MVP

Bienvenido al manual técnico de **MatchSport**, la plataforma deportiva de emparejamiento (Matchmaking), gestión de salas de juego y evaluación de nivel en tiempo real.

---

## 🏛️ 1. Arquitectura General del Sistema

MatchSport está diseñado bajo una **Arquitectura Cliente-Servidor Desacoplada y Reactiva en Tiempo Real**, optimizada para funcionar tanto en **Web Móvil** como en **Aplicación Móvil Nativa (Android)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN (CLIENTE)                  │
│                                                                        │
│   📱 Interfaz Móvil (React 18 + Vite + CSS Glassmorphism)              │
│   ├── Componentes: Radar, Lobby, ChatRoom, MapZone, FUT Card, Admin   │
│   ├── Servicios: Socket.IO Client, Geolocation GPS, Web Audio FX       │
│   └── Empaquetador Híbrido: Capacitor Android (APK Nativo)             │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                  WebSockets (Socket.IO) + REST APIs (HTTP/JSON)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         CAPA DE SERVIDOR (BACKEND)                     │
│                                                                        │
│   ⚙️ Node.js + Express + Socket.IO Server                              │
│   ├── Matchmaking Engine: Algoritmo de emparejamiento por GPS y Nivel │
│   ├── Sistema de Rating Glicko-2 / Elo & Atributos FUT (OVR)           │
│   ├── Gestor de Salas (Lobbies, Códigos de Invitación, Partidos)      │
│   └── Base de Datos en Memoria Estructurada (db.js)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 2. Herramientas y Tecnologías Utilizadas (¿Para qué sirve cada una?)

### 🌐 A. Tecnologías del Backend

| Herramienta | Versión | ¿Para qué se utiliza en el proyecto? |
| :--- | :--- | :--- |
| **Node.js** | LTS | Entorno de ejecución JavaScript del lado del servidor. Maneja miles de conexiones asíncronas de manera ultra rápida y ligera. |
| **Express.js** | `^4.21.2` | Framework backend para exponer endpoints REST (consultar datos de usuarios, métricas de administrador, encuestas y manejo de salida por API). |
| **Socket.IO** | `^4.8.1` | **Motor de WebSockets en tiempo real**. Permite la comunicación bidireccional instantánea entre jugadores (mensajes de chat, detección de rivales en el radar, abandono de salas y sincronización del cronómetro). |
| **CORS** | `^2.8.5` | Middleware de seguridad para permitir que celulares en la misma red Wi-Fi (IP local `192.168.x.x`) puedan conectarse al servidor sin bloqueos de origen cruzado. |
| **UUID** | `^11.1.0` | Generador de identificadores únicos universales para partidos, mensajes de chat, salas de juego y transacciones. |
| **Concurrently** | `^9.1.2` | Permite arrancar tanto el servidor Node.js como el cliente Vite con un solo comando (`npm run dev`). |

---

### 🎨 B. Tecnologías del Frontend

| Herramienta | Versión | ¿Para qué se utiliza en el proyecto? |
| :--- | :--- | :--- |
| **React 18** | `^18.3.1` | Biblioteca principal para construir la interfaz de usuario basada en componentes reutilizables, hooks reactivos (`useState`, `useEffect`, `useRef`) y renderizado rápido. |
| **Vite** | `^6.2.0` | Empaquetador y servidor de desarrollo moderno de última generación. Ofrece Hot Module Replacement (HMR) instantáneo y builds ultraligeros. |
| **Vanilla CSS (Design Tokens)** | N/A | Sistema de diseño oscuro minimalista (Dark Glassmorphism) con variables CSS (`--bg-primary`, `--accent-primary`). No depende de librerías pesadas como Tailwind, logrando máxima velocidad en celulares. |
| **Socket.IO Client** | `^4.8.1` | Cliente WebSocket que mantiene la conexión persistente con el backend para escuchar eventos en vivo (`matchFound`, `newChatMessage`, `matchPlayerLeft`, `lobbyUpdated`). |
| **Leaflet** | `^1.9.4` | Biblioteca de mapas interactivos de código abierto. Se usa para seleccionar la ubicación en el mapa, radio de búsqueda (km), distritos de Lima y visualizar canchas disponibles. |
| **Lucide React** | `^1.16.0` | Paquete de íconos vectoriales modernos y estilizados (Balones, Trofeos, MapPin, Escudos, Usuarios, Flechas). |
| **Canvas Confetti** | `^1.9.4` | Efecto visual de confeti de celebración al ganar un partido, subir de rango o recibir un Like deportivo. |
| **Web Audio API (`audio.js`)** | Nativo | Motor de audio sintetizado en el navegador que genera sonidos deportivos reales (pitazo de árbitro, campana de rival encontrado, pop de mensaje y victoria) sin descargar archivos MP3 pesados. |

---

### 📱 C. Tecnologías Móviles (App Android)

| Herramienta | Versión | ¿Para qué se utiliza en el proyecto? |
| :--- | :--- | :--- |
| **Capacitor Core & CLI** | `^8.5.1` | Convierte la aplicación web en una aplicación móvil nativa para Android e iOS mediante un WebView optimizado. |
| **@capacitor/android** | `^8.5.1` | Motor nativo de integración con Android Studio y generación del archivo ejecutable APK. |
| **@capacitor/geolocation** | `^8.2.2` | Plugin nativo de Capacitor para acceder al sensor de GPS del celular y obtener las coordenadas del jugador para el radar de canchas. |

---

## 🧠 3. Módulos y Lógica de Negocio Principal

### 1. Algoritmo de Matchmaking (`server/matchmaking.js`)
- **Fórmula de Haversine**: Calcula la distancia geográfica exacta en kilómetros entre dos jugadores según su latitud y longitud.
- **Ventana de Expansión de Nivel**: Busca primero rivales con una diferencia de rating Glicko menor a 100 pts. Si no encuentra en 15 segundos, expande el rango progresivamente.
- **Relleno Automático (Bots de Prueba)**: Si no hay jugadores humanos disponibles en la zona, el sistema cuenta con perfiles deportivos simulados para que el usuario pueda probar el flujo completo.

### 2. Sistema de Calificación FUT & Glicko-2 (`server/db.js`)
- **Atributos de Jugador (FUT Card)**: RIT (Ritmo), TIR (Tiro), PAS (Pase), REG (Regate), DEF (Defensa), FIS (Físico).
- **Cálculo de OVR (Puntaje Global)**: Pondera los atributos según la posición del jugador (DEL, MED, DEF, POR) para asignar una carta FUT (Oro, Plata, Bronce o TOTW).
- **Glicko-2 / Elo**: Calcula la probabilidad de victoria y suma (+35 pts) o resta (-25 pts) según el resultado oficial reportado.

### 3. Sistema de Salas de Convocatoria (Lobbies) y Enlaces de WhatsApp
- Permite crear una escuadra privada con un código único (ej. `FUT-4821`).
- Genera enlaces de invitación directos (`http://IP:5173/?lobby=CODIGO`) listos para compartir con un toque por WhatsApp.
- Si un jugador abandona el chat del partido, la escuadra no se disuelve: puede convertirse en sala de convocatoria para rellenar los cupos faltantes con amigos o buscar un suplente.

### 4. Sistema de Aceptación de Partida en Tiempo Real (Estilo Dota 2 / CS:GO)
- **Fase de Confirmación de 20s (`MatchAcceptModal.jsx`)**: Cuando el Radar empareja a dos escuadras (ej. 5v5 = 10 jugadores o 1v1 = 2 jugadores), se abre un pop-up sincronizado para todos los participantes.
- **Visualización en Vivo**: Muestra las ranuras de **Mi Equipo vs Equipo Rival** en gris. Conforme cada jugador presiona `ACEPTAR PARTIDO`, su avatar se ilumina en **verde neón con check (`✓ LISTO`)** y suena una campana de confirmación.
- **Protección contra Desconexiones**: Si pasados los 20 segundos alguien no confirma o rechaza, los jugadores vuelven a sus respectivas salas de origen o al radar sin perder a su escuadra.
- **Ingreso Sincronizado**: Cuando los 10 jugadores confirman (10/10), el servidor crea el partido oficial y traslada a todos automáticamente a la sala de coordinación/chat.

---

## 🚀 4. Comandos de Ejecución y Despliegue

```bash
# Iniciar Servidor Backend y Cliente Frontend en simultáneo:
npm run dev

# Compilar para Producción Web:
npm run build

# Sincronizar cambios web con el proyecto de Android Studio:
npx cap sync android

# Abrir el proyecto en Android Studio para generar el APK:
npx cap open android
```
