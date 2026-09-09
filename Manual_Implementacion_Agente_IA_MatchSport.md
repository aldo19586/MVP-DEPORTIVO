# 🤖 Manual de Implementación con Agente IA — MatchSport MVP

Este manual explica **cómo usar un agente de IA de código** (Claude Code, Cursor, Copilot Workspace, etc.) para implementar las mejoras prioritarias de MatchSport antes de las pruebas locales. No es un manual de "qué construir" — eso ya lo tienes en el manual de arquitectura — sino de **cómo dirigir al agente** para que lo construya bien, en orden, y sin romper lo que ya funciona.

---

## 🎯 1. Objetivo de este manual

Guiarte para que un agente IA implemente, en tu proyecto MatchSport, las 6 prioridades de pruebas locales:

1. Persistencia mínima (SQLite)
2. Login simple con identidad persistente
3. Reconexión automática de Socket.IO
4. Seed de datos de prueba realistas
5. Logging básico
6. Testing manual dirigido del flujo de aceptación (20s)

---

## 🧰 2. Preparación antes de invocar al agente

Antes de pedirle nada al agente, prepara el terreno — esto evita que "alucine" estructura que no existe:

- [ ] Ten el repositorio en un control de versiones (Git), aunque sea local. Si algo sale mal, necesitas poder revertir.
- [ ] Haz un commit limpio del estado actual ("checkpoint antes de refactor").
- [ ] Ten claro qué archivos existen hoy: `server/db.js`, `server/matchmaking.js`, componentes React relevantes (`MatchAcceptModal.jsx`, etc.).
- [ ] Si usas Claude Code, trabaja **dentro de la carpeta del proyecto** para que el agente pueda leer la estructura real en vez de suponerla.

**Regla de oro:** un agente IA que no ve tu código real va a inventar nombres de funciones y rutas. Dale siempre contexto real (archivos abiertos, rutas exactas) antes de pedir cambios.

---

## 🗣️ 3. Cómo estructurar los prompts (principios generales)

| Principio | Por qué importa aquí |
|---|---|
| **Una tarea a la vez** | No pidas "implementa persistencia, login y logging" en un solo prompt. El agente mezcla contextos y es más difícil revisar el diff. |
| **Pide que lea antes de escribir** | Empieza cada tarea con "Primero lee `server/db.js` y `server/matchmaking.js` y dime cómo están estructurados los datos actualmente" antes de pedir cambios. |
| **Define el criterio de éxito** | En vez de "agrega SQLite", di "agrega SQLite de forma que si reinicio el servidor con `npm run dev`, los usuarios y ratings sigan existiendo". |
| **Pide migraciones incrementales, no reescrituras** | "Modifica `db.js` para que siga exponiendo las mismas funciones (`getUser`, `updateRating`, etc.) pero que por dentro use SQLite" — así no rompes el resto del código que ya las llama. |
| **Pide que te muestre el diff antes de aplicar** | Si tu herramienta lo permite, revisa cambios en `matchmaking.js` y `db.js` con más cuidado — son el corazón del sistema. |

---

## 🛠️ 4. Implementación paso a paso

### Paso 1 — Persistencia mínima con SQLite

**Prompt sugerido:**
> "Lee `server/db.js` completo y dime todas las funciones que exporta y qué estructura de datos usa en memoria. No cambies nada todavía."

Luego, con esa info confirmada:

> "Migra `server/db.js` de almacenamiento en memoria a SQLite usando `better-sqlite3`. Mantén exactamente las mismas funciones exportadas y sus firmas (mismos parámetros y valores de retorno) para no romper `matchmaking.js` ni las rutas de Express. Crea el archivo `matchsport.db` en la raíz del proyecto si no existe, y crea las tablas necesarias en un script de inicialización que corra automáticamente al levantar el servidor."

**Validación que debes pedirle al agente:**
> "Ahora escribe un script pequeño de prueba que cree un usuario, cierre el proceso, y otro script que lo lea de nuevo, para confirmar que persiste."

⚠️ Punto crítico: verifica tú mismo (no solo confíes en el agente) que después de matar el servidor con `Ctrl+C` y volver a correr `npm run dev`, los datos siguen ahí.

---

### Paso 2 — Login simple con identidad persistente

**Prompt sugerido:**
> "Necesito un sistema de identidad simple, NO de seguridad enterprise. Un jugador debe poder crear un perfil con nombre + PIN de 4 dígitos, y volver a entrar con esos mismos datos para recuperar su FUT Card y rating. Guarda el PIN con hash usando `bcrypt` aunque sea un MVP local — nunca en texto plano. Dime primero qué endpoint de Express usarías y qué cambios necesita el cliente React antes de escribir código."

**Por qué pedir el plan primero:** en un proyecto con Socket.IO + REST mezclados, quieres confirmar dónde vive la sesión (¿en el socket, en localStorage del cliente, en ambos?) antes de que el agente decida por su cuenta.

---

### Paso 3 — Reconexión automática de Socket.IO

**Prompt sugerido:**
> "Revisa cómo se inicializa el cliente de Socket.IO en el frontend (busca `io(...)`). Configura las opciones de reconexión automática (`reconnection`, `reconnectionAttempts`, `reconnectionDelay`) y agrega manejo de los eventos `disconnect` y `reconnect` para que, si un jugador está en el radar o en un lobby, no pierda su lugar al recuperar la conexión. Explícame qué pasa del lado del servidor cuando un socket se desconecta y se reconecta con un nuevo id — ¿cómo identificamos que es el mismo jugador?"

**Nota importante:** esta es la parte más delicada del sistema. Pídele al agente que **use el ID de usuario persistente (del Paso 2)**, no el `socket.id`, para identificar jugadores — el `socket.id` cambia en cada reconexión.

---

### Paso 4 — Seed de datos de prueba realistas

**Prompt sugerido:**
> "Crea un script `server/seed.js` que genere 25 perfiles de jugador de prueba con nombres variados, posiciones (DEL, MED, DEF, POR) y atributos FUT distribuidos en distintos rangos de OVR (algunos bajos ~60, medios ~75, altos ~90). Distribuye también coordenadas GPS simuladas dentro de un radio de 10km en Lima para que el matchmaking por distancia tenga variedad. El script debe poder correrse con `node server/seed.js` y limpiar datos de prueba anteriores antes de insertar los nuevos."

---

### Paso 5 — Logging básico

**Prompt sugerido:**
> "Agrega logging con la librería `winston` (o `pino`, lo que sea más liviano) en `matchmaking.js` para registrar: cada intento de emparejamiento, la diferencia de rating comparada, si expandió la ventana de búsqueda, y el resultado final (emparejado / no emparejado / bot usado). Que los logs se guarden en un archivo `logs/matchmaking.log` además de mostrarse en consola, para poder revisarlos después de una sesión de pruebas."

---

### Paso 6 — Testing manual dirigido del flujo de aceptación (20s)

Esto **no se lo delegas al agente para "arreglarlo"** — se lo pides como generador de un plan de pruebas, y tú lo ejecutas con gente real.

**Prompt sugerido:**
> "Basándote en `MatchAcceptModal.jsx` y la lógica de servidor que maneja la confirmación de partidos, dame una lista de 10 escenarios de prueba manual que debería ejecutar con varios celulares reales para encontrar bugs en el flujo de aceptación de 20 segundos (incluye casos de desconexión a mitad, cierre de app, doble tap, un jugador que nunca confirma, etc.)."

Ejecuta esos escenarios tú mismo con tu equipo de pruebas. Si el agente encuentra un bug al revisar el código, pídele el fix **uno por uno**, no todos juntos.

---

## ✅ 5. Checklist final antes de dar por completada la fase local

- [ ] Reinicio el servidor y los datos de usuarios/ratings siguen ahí
- [ ] Puedo cerrar sesión y volver a entrar con nombre + PIN y recupero mi perfil
- [ ] Si apago el wifi del celular 10 segundos y lo prendo, vuelvo al lobby sin perder mi lugar
- [ ] Tengo 25 bots de prueba con distintos niveles para probar el matchmaking sin depender de personas reales
- [ ] Puedo abrir `logs/matchmaking.log` y entender por qué emparejó (o no) a dos jugadores
- [ ] Probé el modal de aceptación con al menos 5 personas reales y los 10 escenarios de fallo

---

## 🧭 6. Buenas prácticas al trabajar con el agente en este proyecto

- **No le pidas que reescriba `matchmaking.js` completo.** Es el módulo más sensible del sistema — pide cambios quirúrgicos y revisa el diff.
- **Pide siempre "no cambies el comportamiento existente, solo agrega X"** cuando modifiques módulos ya probados.
- **Haz commit después de cada paso exitoso.** Si el Paso 3 rompe algo, quieres poder volver al estado post-Paso 2 sin perder el resto.
- **Desconfía si el agente dice "esto ya debería funcionar" sin haberlo corrido.** Pídele que te dé el comando exacto para probarlo tú mismo.
- **Guarda los prompts que funcionaron.** Si el Paso 1 te tomó 3 intentos para que quedara bien, documenta el prompt final — te sirve si necesitas repetir el proceso en otro módulo similar.
