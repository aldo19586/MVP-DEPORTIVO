# MatchSport MVP — Guía de Operación y Entorno de Piloto (MS-14)

**Versión:** 1.0.0 (18 de noviembre de 2026)  
**Responsable de Operación y Respuesta ante Incidentes:** Aldo Segundo Solís  
**Alcance del Piloto:** Jugadores en App Móvil Nativa (`apps/mobile`) y SuperAdmin en Panel Web de Escritorio (`apps/admin-web`). El módulo B2B de dueños de canchas permanece pospuesto de acuerdo a las directrices de producto.

---

## 1. Arquitectura de Entornos y Despliegue

| Entorno | Servidor Backend | Panel SuperAdmin | App Móvil | Base de Datos |
|---|---|---|---|---|
| **Desarrollo (Local)** | `localhost:3001` (Node.js) | `localhost:5174` (Vite) | Metro Bundler / Expo Go | `matchsport.db` local SQLite |
| **Pruebas (CI / Test)** | Puerto dinámico (`PORT=0`) en `.test-runs/` | Build headless Vite | Expo export iOS/Android | DB temporal aislada por caso |
| **Piloto Privado (Staging/Prod)** | Host seguro con Proxy HTTPS/WSS | HTTPS Desktop (Vite bundle) | App nativa con Hermes | SQLite montada en volumen persistente o PostgreSQL |

---

## 2. Configuración y Terminación HTTPS / WSS (Hallazgo A-15)

El backend de Node.js corre en puerto interno HTTP (`PORT=3001`) y debe servirse **siempre** a través de un proxy inverso que termine SSL/TLS (HTTPS y WSS).

### Configuración recomendada para Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name api.matchsport.app;

    ssl_certificate /etc/letsencrypt/live/api.matchsport.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.matchsport.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # API REST
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # WebSockets de Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

## 3. Variables de Entorno y Secretos

La configuración se gestiona exclusivamente por variables de entorno (ver [.env.example](../.env.example)):

- `NODE_ENV`: `production` activa todas las salvaguardas de seguridad.
- `JWT_SECRET`: Secreto criptográfico de **al menos 32 bytes**. En `production`, el servidor **falla cerrado** y rehúsa iniciar si falta este secreto o si mide menos de 32 bytes.
- `MATCHSPORT_SEED_DEMO`: Debe ser `false`. Si se intenta arrancar en `production` con `MATCHSPORT_SEED_DEMO=true`, el servidor se aborta de inmediato para proteger los datos reales.
- `CORS_ORIGIN`: Dominios web explícitos autorizados para invocar la API (ej: `https://admin.matchsport.app`).
- `EXPO_PUBLIC_API_URL`: Variable de entorno para la app móvil inyectada durante la compilación o exportación de la release.

---

## 4. Política de Logs y Privacidad

- Los registros se gestionan mediante Winston en `logs/matchmaking.log` y por consola.
- **Redacción automática de credenciales:** Todo registro que contenga contraseñas, PINs, tokens Bearer, tokens push o secretos es sanitizado automáticamente mediante filtros de expresión regular antes de persistirse en disco o emitirse a la salida estándar.

---

## 5. Monitoreo y Endpoint de Salud

El healthcheck del orquestador o proxy debe consultar:

```http
GET /api/health
```

**Respuesta de ejemplo (HTTP 200):**
```json
{
  "status": "ok",
  "env": "production",
  "uptime": 86420,
  "database": "connected",
  "schemaVersion": 5,
  "timestamp": "2026-11-18T20:30:00.000Z",
  "memory": {
    "rssMb": 48,
    "heapUsedMb": 28
  },
  "realtime": {
    "connectedSockets": 12
  }
}
```

Si `database` no es `"connected"` o el endpoint no responde en menos de 5 segundos, el orquestador debe alertar al operador o reiniciar el contenedor.

---

## 6. Procedimiento de Respaldo y Restauración Ensayado (Disaster Recovery)

Para garantizar la continuidad operativa, el servidor cuenta con la utilidad offline [server/backup.js](../server/backup.js):

### A. Crear Respaldo en Caliente/Frío:
```bash
node server/backup.js backup /ruta/respaldo/backup-$(date +%Y%m%d-%H%M%S)
```
1. Adquiere el lock exclusivo de base de datos (`.lock`).
2. Ejecuta `PRAGMA quick_check` y verifica conteo de tablas críticas (`users`, `matches`, `competitions`, etc.).
3. Genera copia atómica de `database.db` y `manifest.json` con hash SHA-256.

### B. Restaurar Respaldo en Destino Limpio:
```bash
MATCHSPORT_DB_PATH=/ruta/nueva/matchsport.db node server/backup.js restore /ruta/respaldo/backup-20261118-200000
```
1. Valida el checksum SHA-256 del manifiesto contra los bytes de `database.db`.
2. Verifica la integridad estructural de SQLite.
3. Escribe atómicamente la base restaurada en el destino limpio.

### C. Recuperación de Bloqueo Residual (Stale Lock):
Si el proceso del servidor fue terminado abruptamente (corte de energía o SIGKILL), el archivo `.lock` puede quedar presente:
```bash
node server/backup.js unlock
```

---

## 7. Protocolo de Respuesta ante Incidentes (IRP)

### Niveles de Severidad:
- **P0 (Crítico):** Servidor inaccesible, fallo en terminación SSL, corrupción de base de datos o fuga de secretos.
  - *Acción:* Notificación inmediata al Responsable de Operaciones (Aldo Segundo Solís). Aplicación de rollback a último backup validado o rotación inmediata de `JWT_SECRET`.
- **P1 (Alto):** Falla en el flujo de resultados, empate o disputas arbitrales bloqueadas.
  - *Acción:* Diagnóstico mediante `/api/health`, revisión de `logs/matchmaking.log` e intervención desde el panel SuperAdmin.
- **P2 (Medio):** Degradación de rendimiento o fallas intermitentes de red móvil.
  - *Acción:* Monitoreo de latencia, optimización de queries y reintento desde clientes.

### Procedimientos de Contención Inmediata:
1. **Invalidación masiva de sesiones comprometidas:**
   Invocar incremento de versión de sesión para el usuario afectado (`sessionVersion + 1`) o reinicio del proceso con rotación de `JWT_SECRET`.
2. **Suspensión preventiva de usuario:**
   SuperAdmin ejecuta ban inmediato desde el panel web (`POST /api/admin/user/:id/ban`) con motivo explícito, cerrando sockets en vivo.
3. **Restauración de emergencia:**
   Detener servidor, ejecutar `node server/backup.js restore <ultimo_backup_valido>` en una base limpia y reiniciar el servicio.
