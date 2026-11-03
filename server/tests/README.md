# Pruebas aisladas del backend

Desde la raíz del repositorio:

```powershell
npm run test:server
```

Alternativa sin depender del ejecutable npm del equipo:

```powershell
node --test --test-concurrency=1 server/tests/config.test.js server/tests/isolation.test.js
```

Desde `server`, `npm test` ejecuta la misma suite. No necesita un servidor previo ni descarga dependencias adicionales. Requiere las dependencias ya instaladas y Node compatible con el proyecto (verificado aquí con Node 22.17.0).

## Qué hace

- Cada caso crea un directorio único en `.test-runs/`, ignorado por Git.
- Cada backend se inicia como proceso hijo en `127.0.0.1` con `PORT=0`: el sistema asigna un puerto libre. No usa el servidor personal en 3001.
- Base y logs quedan dentro del directorio del caso; el proceso recibe sus propias variables y un secreto sintético.
- `NODE_ENV=test` exige `MATCHSPORT_TEST_DIR` y `MATCHSPORT_DB_PATH`. Se rechazan rutas fuera del directorio dedicado, escapes a directorios hermanos y enlaces simbólicos o duros.
- La prueba registra sus usuarios por API; los ejemplos solo aparecen en el caso que pide `MATCHSPORT_SEED_DEMO=true`.
- Al terminar, el proceso recibe una orden IPC de salida que ejecuta el guardado SQLite existente. No se añadió un endpoint HTTP de control.
- Se espera la salida antes de borrar exclusivamente el directorio creado por el caso. Una interrupción abrupta del runner podría dejar archivos en `.test-runs/`; no son datos del usuario y no se reutilizan en el siguiente caso.

## Alcance de MS-01

Comprueba guardas de configuración, arranque vacío con catálogos, creación y aislamiento entre servidores, persistencia tras salida controlada/reinicio y seed explícito sin duplicar usuarios.

No comprueba todavía pérdida de energía, reemplazo atómico del archivo, seguridad de rutas de negocio, push, chat ni el ciclo de un partido. Las consultas administrativas actuales se utilizan para observar el contenido de bases sintéticas: cuando MS-03 proteja estas rutas, los fixtures deberán autenticarse y las pruebas de permisos deberán exigir el rechazo correspondiente.

## Configuración de desarrollo

Por defecto el backend continúa leyendo `matchsport.db` de la raíz y escuchando en 3001. Los datos existentes se cargan aunque no se solicite seed. Los catálogos iniciales no se consideran usuarios demo.

Variables soportadas: `MATCHSPORT_DB_PATH` (ruta absoluta o relativa a la raíz), `MATCHSPORT_SEED_DEMO=true|false` (false por defecto), `PORT`, `HOST` (solo desarrollo/producción). En pruebas el host siempre es loopback. Los archivos `.env` no se cargan automáticamente; pasar variables al proceso o usar el mecanismo de entorno elegido.

Ejemplo de base demo separada para desarrollo, desde la raíz:

```powershell
$env:MATCHSPORT_DB_PATH = 'demo.local/matchsport.db'
$env:MATCHSPORT_SEED_DEMO = 'true'
node server/server.js
```

Usar esa configuración solo en una terminal de desarrollo y retirar las variables al terminar. El comando explícito histórico `node server/seed.js` también utiliza la ruta configurada; no forma parte de la suite.

## Scripts históricos

Los archivos `scripts/test_*.js` son pruebas heredadas. Varias apuntan a localhost:3001 y modifican datos; **no ejecutarlas contra el servidor personal o el piloto**. Ya no son el destino de `npm test` del backend. Su migración completa y ampliación de cobertura están en MS-13. La nueva suite no certifica los mensajes de éxito de aquellas pruebas.
