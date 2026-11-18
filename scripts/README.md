# Scripts y Utilidades (MatchSport)

Este directorio contiene utilidades auxiliares y scripts históricos de exploración.

## ⚠️ Estado de Scripts de Prueba (Hallazgo A-14 de Auditoría)

Los scripts con prefijo `test_*.js` en este directorio (`test_backend_full.js`, `test_matchmaking_logging.js`, `test_peer_review.js`, `test_pin_api_endpoints.js`, `test_pin_auth.js`, `test_seed_verification.js`, `test_socket_reconnection.js`, `test_sqlite_persistence.js`) corresponden a la etapa temprana de prototipado.

- **Limitaciones de los scripts históricos:**
  - Asumían ejecución contra `localhost:3001` sin aislamiento de base de datos.
  - No cubrían de manera exhaustiva los casos de rechazo negativo (401 Unauthorized, 403 Forbidden, firmas alteradas o tokens revocados).
  - Mutaban el estado local de persistencia.

## ✅ Suite Oficial de Pruebas del Proyecto

Para la validación del backend y reglas de negocio, se utiliza exclusivamente la suite oficial:

```bash
npm run test:server
```

**Características de la suite oficial (`server/tests/`):**
1. **Aislamiento absoluto:** Cada prueba genera su propio entorno temporal aislado bajo `.test-runs/` mediante `createSandbox`.
2. **Pruebas negativas y RBAC:** Validación rigurosa de que usuarios no autenticados o con rol `player` sean rechazados con códigos HTTP y errores de socket explícitos.
3. **Persistencia atómica y durabilidad:** Pruebas que simulan apagado abrupto, corrupción y reinicio de SQLite sin pérdida de integridad.
4. **Ejecución en CI:** Integrada directamente en `.github/workflows/ci.yml`.

## Utilidades Vigentes

- `build_districts.js`: Script de preprocesamiento de catálogos distritales del Perú.
- `generate_presentation.py`: Generador de presentaciones técnicas para stakeholders.
