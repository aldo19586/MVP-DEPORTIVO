# MatchSport

Plataforma para organizar partidos deportivos: app nativa React Native/Expo para jugadores, panel React/Vite para SuperAdmin y backend Node.js/Socket.IO con persistencia SQLite actual.

## Continuar el proyecto

Leer el [plan de ejecución](docs/README.md), el [alcance del MVP](docs/MVP.md), la [auditoría inicial](docs/AUDITORIA.md) y el [backlog priorizado](docs/BACKLOG.md). Las reglas obligatorias están en [AGENTS.md](AGENTS.md).

Estado: prototipo en preparación para un piloto privado. La compilación local se comprobó; existen bloqueos de permisos, integración y operación documentados. No está validado para lanzamiento público.

## Estructura vigente

- `apps/mobile`: jugadores, React Native / Expo.
- `apps/admin-web`: SuperAdmin, React / Vite.
- `server`: API, sockets, matchmaking y datos.

El cliente web de la raíz y la carpeta `android` de Capacitor pertenecen a la etapa anterior. El workflow Android existente todavía sigue ese camino heredado; su actualización está en el backlog.

## Ejecución local

Consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md) para comandos, puertos y evidencia de puesta en marcha. La IP Wi-Fi registrada allí puede cambiar.

Pruebas backend aisladas: `npm run test:server`. Consultar [instrucciones y límites](server/tests/README.md). El servidor ya no genera usuarios ni salas demo automáticamente; los datos existentes se conservan.

Los manuales y roadmaps anteriores de la raíz son antecedentes; su contenido debe contrastarse con AGENTS.md y el plan actual. El MVP se limita a Jugador + SuperAdmin; B2B está pospuesto.
