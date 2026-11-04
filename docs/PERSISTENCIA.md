# MS-06-A — Guardado de snapshots y recuperación local

Fecha: 3 de noviembre de 2026. Continuación posterior: [transacciones locales y esquema 2](TRANSACCIONES.md). Las referencias al esquema 1 y trabajo pendiente de B describen el cierre histórico de la parte A. **Parte A implementada; MS-06 completo sigue En curso.** Se conserva sql.js para desarrollo y esta entrega, sin seleccionar todavía alojamiento/base del piloto (D-05).

## Problema y cambio

Antes se exportaba la base en memoria después de un debounce de un segundo y se sobrescribía el archivo principal. Se podía responder antes de guardar y truncar el único archivo durante una escritura fallida.

Ahora cada mutación SQL que invoca el guardado exporta inmediatamente a un archivo temporal exclusivo en el mismo directorio. Se escribe, se sincroniza su descriptor, se cierra y se renombra sobre el destino. En POSIX también se sincroniza el directorio; en Windows no se realiza esa última operación. Referencias: [fs de Node](https://nodejs.org/docs/latest-v22.x/api/fs.html) y [API sql.js](https://sql.js.org/documentation/Database.html).

Si falla el guardado, el proceso termina con código 1 antes de continuar el handler. La memoria ya podría haber cambiado y no se sigue atendiendo desde ella. El archivo anterior se conserva si la operación falla antes del reemplazo. Si el reemplazo ya ocurrió y falla una sincronización posterior, el resultado puede estar guardado sin que el cliente recibiera respuesta; la idempotencia de MS-06-B/MS-07/MS-09 debe resolver ese caso.

No se afirma durabilidad absoluta ante corte eléctrico o fallo de hardware. Estas pruebas cubren fallos de operaciones de archivo e interrupciones de proceso en el equipo actual. sql.js sigue exportando la base completa y no es una base central compartida entre servidores.

## Un solo escritor y versión

- El backend, alta administrativa y utilidades adquieren un archivo `.db.lock` exclusivo antes de abrir la base. Contiene PID, host y nonce, sin credenciales.
- Dos instancias cooperativas no pueden abrir el mismo archivo para escribir. No usar disco compartido entre hosts ni herramientas externas que ignoren el bloqueo.
- La salida normal libera el bloqueo. Una terminación forzada puede dejarlo; no se elimina automáticamente al arrancar. El operador debe comprobar el proceso y ejecutar `unlock` de forma serial, sin otro operador recuperando simultáneamente el mismo archivo.
- `unlock` solo elimina el bloqueo de un PID que ya no existe y del mismo host. Un PID activo, incluso reutilizado por otro proceso, se rechaza por precaución. Un bloqueo ilegible o de otro host requiere diagnóstico del operador, no borrado automático.
- Se rechazan alias de archivo mediante symlink/hardlink y se usa el directorio real para ubicar el bloqueo. Esta protección no sustituye permisos del sistema de archivos frente a otros procesos con acceso administrativo.
- Antes de modificar una base existente se comprueban cabecera SQLite, `quick_check` y versión. Un archivo vacío/corrupto no se convierte silenciosamente en una base nueva.
- `PRAGMA user_version`: 0 corresponde al esquema heredado; 1 identifica el esquema actual de tablas/columnas ya entregado. La migración existente es idempotente y ahora propaga errores. Una versión superior se rechaza sin reemplazar el archivo. El registro de migraciones futuras y pruebas de cambios de esquema completos pertenecen a MS-06-B.
- Los temporales huérfanos después de una interrupción no se cargan como base. Se pueden retirar manualmente con el servidor detenido y tras comprobar el archivo principal; no se añadió un borrado recursivo automático.

## Respaldo y restauración

La utilidad `server/backup.js` no importa `db.js`, no crea usuarios ni migra la fuente. Requiere `MATCHSPORT_DB_PATH` explícita. Se opera desde la raíz del repositorio.

1. Detener el servidor y cualquier otro escritor de esa base. Verificar su ruta y conservar el archivo original.
2. Crear el directorio padre `backups` si no existe. Cada copia usa un subdirectorio nuevo.

```powershell
$env:MATCHSPORT_DB_PATH = 'D:\MATCHMAKING_DEPORTIVO_WEB\matchsport.db'
New-Item -ItemType Directory -Path .\backups -Force
node server/backup.js backup .\backups\copia-2026-11-03
```

La copia contiene `database.db` y `manifest.json` con tamaño, fecha y SHA-256. Se validan integridad, tablas esperadas y versión. Un directorio ya existente se rechaza, sin sobrescribir otra copia. El manifiesto debe estar presente para restaurar; una copia interrumpida se considera incompleta. No hay cifrado incorporado: restringir acceso al directorio y almacenar copias fuera del disco de la aplicación según el procedimiento del piloto.

3. Restaurar a un archivo nuevo, nunca sobre el original:

```powershell
$env:MATCHSPORT_DB_PATH = 'D:\MATCHMAKING_DEPORTIVO_WEB\backups\validacion\restored.db'
node server/backup.js restore .\backups\copia-2026-11-03
```

Se comprueban checksum, tamaño e integridad antes de escribir. El destino existente se rechaza. El padre del archivo nuevo se crea si falta. La restauración no arranca el servidor ni cambia su configuración automáticamente.

4. Abrir el destino con un servidor de validación separado, sin seed y en otro puerto, con su secreto configurado. Comprobar acceso, perfiles, salas, partidos e historial. Detenerlo antes de volver a operar el archivo.
5. Elegir y registrar qué ruta usará el servidor después de validar. La utilidad no intercambia ni borra bases del usuario. Retirar/restaurar las variables de entorno de esta terminal al terminar.

Tras una caída con bloqueo residual, usar la ruta exacta de la base detenida:

```powershell
node server/backup.js unlock
```

Esto libera el bloqueo solo si se verifica que el PID no existe; no repara el contenido de la base. El arranque siguiente vuelve a validar integridad y versión. Los directorios `backups/`, locks y temporales están ignorados por Git.

## Evidencia de esta entrega

Siete pruebas nuevas en `server/tests/persistence.test.js`:

1. Fallo de escritura parcial, fsync y rename conserva el snapshot anterior y limpia temporal controlado.
2. Interrupción antes del rename deja un temporal huérfano y permite arrancar desde la base válida anterior.
3. Segundo escritor y eliminación de bloqueo activo son rechazados; el primer servidor continúa atendiendo.
4. Registro confirmado sobrevive a `SIGKILL`; el reinicio exige recuperación explícita del bloqueo residual.
5. Error de persistencia termina el escritor con código 1, sin anunciar éxito ni guardar al usuario fallido.
6. Copia offline se restaura en destino nuevo y otro servidor recupera cuenta, perfil, partido y sala; copia alterada y destino existente se rechazan.
7. Base vacía o esquema de versión futura se rechazan sin reemplazar datos.

Suite conjunta: 54 pruebas. Ninguna prueba usa la base personal; se verifica su SHA-256 sin cambios: `8C18503D9E57EC8C7F5E922422FC4A172B39051EFB4CC8FA9EA3E91DA0C9D116`.

## MS-06-B y límites que siguen abiertos

- Resolver D-05: presupuesto/hosting, disco durable de instancia única frente a PostgreSQL administrado y concurrencia objetivo. Se recomienda evaluar PostgreSQL para el piloto alojado; cobertura nacional por sí sola no determina volumen ni exige múltiples servidores.
- Transacciones para operaciones compuestas, rollback coherente entre caché y DB, revisiones e idempotencia persistente. Este cambio hace durable cada guardado SQL individual, no agrupa todo un resultado/rating en una transacción.
- Auditar caminos heredados que modifican memoria sin persistir y emisiones anteriores a su guardado. El guardado inmediato no transforma por sí solo esos caminos ni certifica todas las confirmaciones del protocolo.
- Versionado y ensayo de migraciones futuras sobre copias, sin alterar la base personal durante el desarrollo.
- Respaldo automatizado fuera del equipo, retención, cifrado/accesos y ensayos programados. Definir RPO/RTO y responsable antes del piloto; no se inventaron objetivos ni se creó una automatización sin acordarlos.
- Medir coste de exportar la base entera por mutación y probar fallos reales de disco/entorno alojado. La parte A no es una validación de carga ni un despliegue nacional.

No se reinició el backend contra `matchsport.db` personal ni se ejecutó respaldo/restauración sobre ese archivo durante esta entrega. Los ejemplos anteriores son instrucciones operativas; la evidencia procede exclusivamente de bases sintéticas aisladas.
