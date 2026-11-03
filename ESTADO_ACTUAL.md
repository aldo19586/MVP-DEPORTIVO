# Estado reconstruido de MatchSport

Revisión: 2 de noviembre de 2026.

## Punto de partida

- Último commit observado: `87da7d7`, registro simplificado, ficha biométrica, test oficial de fútbol y mejoras de salas.
- Hay un cambio local previo en `apps/mobile/src/config.js`; se conserva.
- Arquitectura vigente: `apps/mobile` (React Native / Expo), `apps/admin-web` (React / Vite), `server` (Express / Socket.IO / SQLite).
- La guía maestra y el cliente de la raíz conservan referencias a una etapa anterior con Capacitor. Para nuevas funciones prevalece AGENTS.md: móvil nativo y MVP Jugador + SuperAdmin; B2B pospuesto.
- Al iniciar el servidor se recuperaron 40 usuarios, 213 perfiles y 2 partidos desde la base existente. No se ejecutó el seed.

## Funciones presentes en el código

App: acceso, radar, salas, aceptación y seguimiento de partidos, evaluaciones, clasificación, perfil, ficha biométrica y test de fútbol.

Servidor: catálogos, autenticación, salas, chat por sockets, matchmaking, Glicko-2, resultados y disputas, persistencia SQLite y endpoints administrativos.

Admin: acceso, métricas, monitor en vivo, auditoría y disputas. También existen archivos de canchas de un alcance anterior.

La existencia del código no equivale a una validación completa de los flujos.

## Inicio local

Desde la raíz:

```powershell
node server/server.js
```

Desde `apps/mobile`:

```powershell
node node_modules/expo/bin/cli start --lan --port 8082
```

Desde `apps/admin-web`:

```powershell
node ../../node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5174
```

Se usan los ejecutables locales porque el comando npm del entorno observado apunta a una instalación no encontrada. La instalación de paquetes se puede ejecutar con node y C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js. C: se quedó sin espacio durante la actualización; se usó .npm-cache/ en D: y se excluyó de Git. Los procesos requieren acceso de red fuera del sandbox de Codex.

## Prueba en iPhone

- PC e iPhone en la misma red Wi-Fi.
- Dirección Wi-Fi de la PC observada: `192.168.1.108` (puede cambiar).
- Abrir en Expo Go: `exp://192.168.1.108:8082`.
- Backend: `http://192.168.1.108:3001/api/health`.
- Panel PC: `http://localhost:5174`.
- La app deriva la dirección del backend del host de Expo y usa el puerto 3001.

## Validación y continuación

Se comprobó respuesta correcta de salud de la API (SQLite conectada) y del catálogo de cuatro deportes por la dirección LAN. Metro entregó el manifiesto para iOS y compiló el paquete con SDK 57. Expo Go del iPhone informó SDK 58, por lo que se actualizó Expo y se alinearon sus dependencias siguiendo la guía oficial.

Pendiente validar en el dispositivo: acceso/registro, permisos GPS, perfil y test de fútbol, creación/unión a salas, chat, reconexión y flujo completo de partido. Las notificaciones en dispositivo también requieren prueba específica.

No se ejecutó la suite completa existente contra la base personal: contiene operaciones que crean o modifican datos. Conviene ejecutarla con una base aislada antes de considerar validado el backend completo.


Validación final: Expo install --check confirmó dependencias alineadas con SDK 58. El paquete iOS respondió HTTP 200 (5.222.790 bytes). El panel administrativo respondió HTTP 200. Falta confirmar la ejecución y los flujos en el iPhone.

