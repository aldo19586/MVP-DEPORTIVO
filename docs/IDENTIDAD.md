# Identidad y credenciales — MS-02

## Comportamiento implementado

- Todo registro público crea un jugador, aunque el correo contenga `admin` o el cliente envíe un rol.
- Correo normalizado para detectar duplicados incluso con espacios/mayúsculas; registrar una cuenta existente nunca entrega su sesión.
- Login por correo ya no crea cuentas implícitamente. Exige contraseña válida; las cuentas creadas solo con PIN no admiten una contraseña arbitraria.
- Las contraseñas nuevas se guardan con bcrypt. El campo SQLite existente `password` almacena el hash para no necesitar migrar el esquema en esta entrega.
- Contraseñas heredadas en texto plano se verifican y convierten al iniciar sesión correctamente. Otras escrituras del usuario también normalizan la contraseña antes de persistirla. No se hizo una conversión masiva de la base personal.
- Reset de PIN conserva la contraseña independiente y no guarda el PIN como contraseña en texto plano.
- Las respuestas directas de usuario usan una lista explícita de campos (`userDto.js`), sin contraseña, hash de PIN ni push token. La separación de campos privados por actor y el inventario de datos anidados pertenecen a MS-03/MS-04.
- JWT usa HS256, comparación de firma en tiempo constante y timestamps en segundos. Requiere expiración, fecha de emisión, usuario y rol válidos. Los tokens antiguos en milisegundos se rechazan: será necesario volver a iniciar sesión.
- Fuera de desarrollo se exige `JWT_SECRET` de al menos 32 bytes. Debe ser aleatorio y privado. En desarrollo sin secreto se genera uno temporal: reiniciar invalida sesiones. Un secreto explícito demasiado corto se rechaza también en desarrollo.

## Alta administrativa controlada

El comando `node server/create-admin.js` recibe por stdin un objeto JSON con `email`, `name` y `password`. La contraseña administrativa exige al menos 12 caracteres y como máximo 72 bytes (límite de bcrypt). No acepta rol desde un registro público ni eleva una cuenta existente.

Procedimiento de operador:

1. Detener el backend que utiliza la base destino y disponer de respaldo. sql.js no coordina dos procesos escritores sobre el mismo archivo.
2. Configurar explícitamente `MATCHSPORT_DB_PATH`, `MATCHSPORT_SEED_DEMO=false` y el entorno correspondiente. Configurar el secreto fuera de desarrollo.
3. Proporcionar el JSON por stdin desde un mecanismo seguro; no pasar contraseñas en argumentos de consola ni guardarlas en archivos versionados.
4. Verificar salida exitosa del comando y reiniciar el backend. El comando solo anuncia el resultado; no imprime credenciales.

Las pruebas crean únicamente administradores sintéticos en bases temporales. No se creó ningún administrador real ni se cambiaron roles de la base personal.

## Límites y siguiente entrega

Los administradores heredados requieren revisión antes del piloto: no se les quita el rol automáticamente porque no se puede inferir cuáles autorizó el propietario. Las credenciales demo de desarrollo no deben trasladarse al piloto.

MS-02 establece identidad, tokens y representación de usuario; no aplica todavía autorización a todas las rutas. A-01/A-03 permanecen abiertos. MS-03 debe conectar tokens a ambos clientes, exigir actor/rol/propiedad en API y resolver revocación/expiración. MS-04 debe hacerlo en sockets y broadcasts. El servidor sigue sin estar listo para exposición pública.

Validación: suite de 17 tests automatizados sobre datos sintéticos, sin cambios en el hash SHA-256 de la base personal durante la ejecución.
