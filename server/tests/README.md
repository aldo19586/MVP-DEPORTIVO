# Pruebas aisladas del backend

Desde la raíz del repositorio:

```powershell
npm run test:server
```

Alternativa sin depender del ejecutable npm del equipo:

```powershell
node --test --test-concurrency=1 server/tests/config.test.js server/tests/isolation.test.js server/tests/identity.test.js server/tests/access.test.js server/tests/client-session.test.js server/tests/socket-access.test.js server/tests/competition-contract.test.js server/tests/persistence.test.js server/tests/transactions.test.js
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

No comprueba todavía pérdida de energía, reemplazo atómico del archivo, seguridad de rutas de negocio, push, chat ni el ciclo de un partido. El aislamiento se observa con sesiones propias y snapshots de bases temporales después de detener su escritor. Las rutas administrativas se consultan con un administrador de prueba, y los tests negativos exigen 401/403.

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

La suite vigente incluye también identidad (MS-02): registro sin elevación de rol, rechazo de contraseñas inválidas/ausentes, DTO sin credenciales, hashes persistidos, migración heredada, alta administrativa y tokens válidos/alterados/expirados. MS-03 añade autorización REST, sesiones revocables, DTO públicos, almacenamiento móvil y manejo 401/403 en ambos clientes: 27 tests conjuntos. El inventario de rutas se extrae del servidor para probar que toda ruta nueva exige autenticación salvo la lista pública explícita. Los fixtures administrativos y de partidos se crean en un proceso aislado antes de arrancar el servidor. MS-04 añade conexiones reales Socket.IO para probar handshake, roles, membresía, chat privado, revocación, reconexión y aceptación. La suite conjunta contiene 42 pruebas; los clientes se cierran antes de detener cada servidor y borrar su sandbox. Los fixtures reutilizados de permisos están en `access-fixture.js`.

Los archivos `scripts/test_*.js` son pruebas heredadas. Varias apuntan a localhost:3001 y modifican datos; **no ejecutarlas contra el servidor personal o el piloto**. Ya no son el destino de `npm test` del backend. Su migración completa y ampliación de cobertura están en MS-13. La nueva suite no certifica los mensajes de éxito de aquellas pruebas.


## Contrato propuesto MS-05

La suite incorpora cinco casos de `competition-contract.test.js` (47 pruebas conjuntas). Verifica forma de comandos, fecha UTC canónica, revisiones, marcadores incluidos empates, IDs de reporte, motivo administrativo y rechazo de campos del actor. El módulo `shared/competitionContract.mjs` es un contrato sin conexión a los handlers: no acredita cupos concurrentes, persistencia de idempotencia, autorización de transiciones ni rating. Estos escenarios deben implementarse después de cerrar las decisiones en `docs/REGLAS_COMPETICION.md`.


## Persistencia MS-06-A

Siete casos nuevos, 54 pruebas conjuntas. Incluyen fallos inyectados de archivo, terminación forzada del servidor, exclusión de segundo escritor, checksum y restauración con arranque separado. El caso de caída conserva el lock y verifica `backup.js unlock` antes de reiniciar. Los fallos de disco inyectados se limitan a un proceso hijo. No simulan un corte eléctrico real ni acreditan transacciones de resultados; ver `docs/PERSISTENCIA.md`.


## Transacciones MS-06-B local

Seis casos nuevos de `transactions.test.js`; 60 pruebas conjuntas. Verifican rollback SQL/caché, crash dentro de una operación compuesta, recibo de resultado persistente, finalización por socket tras reinicio y migración de esquema 1 a 2. Las reglas de marcador/confirmación nuevas y PostgreSQL alojado siguen pendientes; ver `docs/TRANSACCIONES.md`.
