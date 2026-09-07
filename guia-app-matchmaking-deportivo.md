# Guía de desarrollo: App de matchmaking deportivo (modo Desafío)

## 1. Resumen del producto (MVP)

Una app tipo "Tinder deportivo" enfocada primero en el **modo Desafío (PvP)**:
- Formatos: 1v1, 2v2, 3v3
- El usuario busca partida solo, o completo con su(s) compañero(s)
- El sistema empareja por: deporte, formato, nivel/rating y ubicación
- Si el usuario va solo en 2v2/3v3, el sistema primero le arma squad con otros jugadores sueltos, y luego busca rival (como el "fill" de Free Fire)
- Al hacer match, se abre un chat/sala privada para coordinar cancha, hora y cualquier acuerdo entre ellos (incluyendo apuestas informales, que NO pasan por la app)
- Verificación de identidad con DNI obligatoria para poder jugar
- Sistema de reputación post-partido (puntualidad, respeto, nivel real vs. declarado)

---

## 2. Stack tecnológico recomendado

Para lanzar en Apple (iOS) y Android con **un solo equipo y un solo código base**, la opción más eficiente para un MVP es **cross-platform**, no nativo por separado.

### Opción recomendada: React Native (con Expo)
- Un solo código para iOS y Android, más rápido de iterar
- Gran ecosistema de librerías para chat, mapas, notificaciones push
- Expo simplifica muchísimo el build y las actualizaciones sin pasar por la tienda cada vez (OTA updates)

### Alternativa igual de válida: Flutter
- Rendimiento algo mejor en animaciones complejas (útil si el swipe/match se siente muy "gamer")
- Curva de aprendizaje distinta (Dart en vez de JavaScript/TypeScript)

**Recomendación:** si tu equipo ya sabe JS/TS, ve con React Native + Expo. Si no hay preferencia previa, Flutter da un pulido visual ligeramente mejor para animaciones tipo swipe/match.

### Backend
- **Supabase** o **Firebase** para arrancar rápido: autenticación, base de datos en tiempo real, y notificaciones push ya integradas. Ideal para MVP porque no necesitas armar infraestructura desde cero.
- Cuando el producto crezca y necesites lógica de matchmaking más compleja (colas, Elo, matching en tiempo real), migras la lógica de emparejamiento a un backend propio (Node.js/NestJS o similar), manteniendo Supabase/Firebase para lo demás.

### Verificación de identidad (DNI + selfie)
- No lo construyas desde cero: usa un proveedor ya hecho para esto (ej. Truora, Metamap, o similar — hay varios que operan en Perú/Latam). Ellos validan el DNI contra RENIEC y comparan con una selfie. Es más barato y más seguro que intentarlo tú mismo.

### Mapas y ubicación
- Google Maps SDK (funciona igual de bien en iOS y Android, y es el más usado en Perú)

---

## 3. Modelo de datos (simplificado)

Piensa en estas entidades principales desde el inicio, aunque el MVP no las use todas:

- **Usuario**: datos básicos, DNI verificado (sí/no), foto de perfil, ubicación
- **PerfilDeportivo**: uno por combinación de (usuario + deporte + formato). Ej: "Juan, Fútbol, 3v3" es un perfil distinto a "Juan, Fútbol, 1v1". Cada uno tiene su propio nivel/rating.
- **Squad temporal**: grupo armado para un desafío puntual (se disuelve después, según acordamos)
- **Desafío**: la publicación/búsqueda activa de un usuario o squad buscando rival
- **Match**: cuando dos partes (personas o squads) quedan emparejadas
- **Partido**: resultado final — quién jugó, quién ganó, fecha, cancha
- **Reseña**: calificación post-partido (puntualidad, respeto, nivel percibido)

Importante: **el nivel/rating vive en PerfilDeportivo, no en Usuario**, para que alguien pueda ser bueno en 1v1 y regular en 3v3 sin que se mezclen los ratings.

---

## 4. Algoritmo de matchmaking (cómo arrancar simple)

No implementes Elo/Glicko completo desde el día 1 — con pocos usuarios el sistema se ve raro (todos empiezan igual, pocos datos).

**Fase 1 (lanzamiento):**
- Nivel autodeclarado: Principiante / Intermedio / Avanzado / Competitivo
- Matchmaking simple: buscar candidatos del mismo nivel declarado, dentro de un radio de X km, ordenados por cercanía y disponibilidad horaria

**Fase 2 (cuando tengas volumen de partidos, ej. +500-1000 partidos jugados):**
- Migrar a un sistema tipo **Elo** o **Glicko-2** (el que usa chess.com), que ajusta el rating según:
  - Si ganaste o perdiste
  - El rating de tu rival (ganarle a alguien de rating alto suma más)
- El rating inicial de cada PerfilDeportivo nuevo empieza en un valor medio (ej. 1200) y se ajusta con cada partido reportado

**El dato que no debe faltar desde el día 1:** que ambos jugadores/squads confirmen el resultado del partido dentro de la app (algo simple, tipo "¿quién ganó?" con confirmación de ambas partes). Sin esto, no tienes con qué alimentar ningún sistema de rating después.

---

## 5. Roadmap sugerido para el MVP

**Sprint 0 — Fundamentos**
- Registro + verificación DNI/selfie
- Perfil básico (foto, deportes que juega, ubicación)

**Sprint 1 — Perfil deportivo y nivel**
- Selección de deporte + formato (1v1/2v2/3v3)
- Nivel autodeclarado por combinación deporte+formato

**Sprint 2 — Desafío (núcleo del producto)**
- Buscar rival: "voy completo" vs "búsquenme compañero" (para 2v2/3v3)
- Lógica de match por nivel + zona + disponibilidad
- Chat/sala privada al hacer match

**Sprint 3 — Cierre del ciclo**
- Reporte de resultado (ambas partes confirman)
- Sistema de reseñas post-partido (puntualidad, respeto, nivel)

**Sprint 4 — Pulido y lanzamiento**
- Notificaciones push (nuevo match, recordatorio de partido)
- Onboarding y políticas de uso (edad mínima, qué está permitido acordar fuera de la app)
- Testing con un grupo cerrado (ej. tu círculo o un distrito específico) antes de lanzar público

---

## 6. Consideraciones legales antes de lanzar

- **No proceses ni custodies dinero de apuestas dentro de la app** en esta fase — que quede solo como acuerdo verbal entre usuarios en el chat. Así evitas caer bajo la Ley 31557 (regulación de apuestas deportivas a distancia en Perú), que exige licencia MINCETUR para quien "explota" apuestas.
- Si más adelante quieres procesar pagos (cuotas de cancha, premios, etc.), consulta con un abogado especializado en regulación de juegos/apuestas y fintech antes de construirlo.
- Define una edad mínima clara (18 años, dado que pides DNI) y política de datos personales (Ley de Protección de Datos Personales del Perú, Ley N° 29733) para el manejo de DNI y ubicación.

---

## 7. Nivel inicial: test de registro + autocorrección con el tiempo

Un test de preguntas al registrarse **no mide tu nivel real**, solo da un punto de partida razonable. La precisión real viene después, con partidos jugados. Por eso:

- **Al registro:** cuestionario corto de autoevaluación (años jugando, si compite en alguna liga/equipo, autopercepción en 3-4 categorías según el deporte). Esto asigna un nivel inicial: Principiante / Intermedio / Avanzado / Competitivo.
- **Sistema de rating recomendado: Glicko-2** (el mismo que usa chess.com), no Elo simple. La diferencia clave: cada PerfilDeportivo tiene un rating **y** un valor de incertidumbre (RD). Un jugador nuevo tiene incertidumbre alta, así que sus primeros partidos mueven su rating mucho y rápido; con el tiempo se estabiliza. Esto corrige solo los errores del test inicial sin que tengas que hacer nada manual.
- Mientras la incertidumbre de un jugador sea alta, el sistema puede ampliar un poco el radio de niveles aceptables al buscarle rival (para no dejarlo sin partidos mientras se calibra).

## 8. Formatos de juego configurables (sin tocar código)

No hardcodees los formatos (1v1, 2v2, 3v3...) en la app. Desde el diseño de base de datos, crea una tabla independiente:

```
Formato: { id, deporte_id, nombre ("1v1"), cantidad_jugadores, activo (true/false) }
```

Así, agregar "6v6" o desactivar "3v3" temporalmente es una fila nueva/editada en esa tabla — no requiere una actualización de la app en las tiendas. Para el MVP, ni siquiera necesitas un panel de administración propio: puedes gestionar esa tabla directo desde el editor de tablas de Supabase (interfaz tipo hoja de cálculo). Un panel de admin a medida es una mejora de fase 2, cuando ya no quieras depender del dashboard técnico.

---

## 9. Guía para desarrollar esto con Antigravity (IDE de Google con agentes de IA)

Antigravity funciona distinto a un IDE tradicional: en vez de escribir código línea por línea, tú describes el objetivo en lenguaje natural y uno o varios agentes planifican, programan, prueban y te muestran el resultado (incluye ejecución de terminal y hasta un navegador automatizado para probar la app). Por eso, la forma de "programar" aquí es principalmente **escribir buenas instrucciones**, una funcionalidad a la vez.

### Reglas generales para instruir a los agentes en Antigravity

1. **Una funcionalidad completa por instrucción**, no todo el proyecto de una sola vez. Los resultados son mucho mejores si le pides "implementa el registro con verificación de DNI" que si le pides "hazme toda la app".
2. **Pide explícitamente que escriba pruebas (tests)** para cada funcionalidad, y que las ejecute antes de darte el resultado por terminado. Esto es clave porque Antigravity puede correr las pruebas él mismo y corregirse solo si fallan.
3. **Revisa los "Artifacts"** que va generando (planes en markdown, diffs de código, capturas) antes de aprobar que continúe — es tu punto de control como "director" del proyecto, no dejes que avance sin revisar.
4. **Dale contexto del stack** al inicio de cada sesión de trabajo nueva (React Native + Expo, Supabase, etc.), aunque ya lo sepa por el proyecto — reduce errores de que use tecnología distinta a la que definiste.

### Secuencia de instrucciones sugerida (una por una, en este orden)

**Fase 1 — Base del proyecto**
> "Crea un proyecto React Native con Expo llamado [nombre]. Configura la conexión con Supabase para autenticación y base de datos. Crea las tablas: Usuario, PerfilDeportivo, Deporte, Formato, Squad, Desafio, Match, Partido, Resena, siguiendo este modelo de datos: [pega la sección 3 de esta guía]. Escribe un README explicando la estructura."

**Fase 2 — Registro y verificación**
> "Implementa el flujo de registro: datos básicos, carga de foto de perfil, y verificación de identidad con [proveedor elegido, ej. Truora]. Al finalizar, el usuario debe quedar marcado como verificado=true solo si la validación de DNI fue exitosa. Escribe tests para los casos: registro exitoso, DNI inválido, selfie no coincide."

**Fase 3 — Perfil deportivo y nivel inicial**
> "Implementa la pantalla donde el usuario selecciona los deportes y formatos que juega (usando la tabla Formato, que debe ser editable desde Supabase sin cambios de código). Al agregar un deporte+formato nuevo, muéstrale un cuestionario corto de autoevaluación de nivel [pega las preguntas que definas] y asigna un rating inicial de Glicko-2 (rating=1500, RD=350) según la respuesta."

**Fase 4 — Núcleo: Desafío**
> "Implementa el flujo de Desafío: el usuario elige deporte+formato, y si es 2v2/3v3 elige entre 'voy completo' o 'búsquenme compañero'. Si falta gente, busca jugadores sueltos por cercanía y rating similar (usando la fórmula Glicko-2 para determinar rango aceptable). Una vez el squad está completo, busca un rival (persona o squad) de rating similar. Al hacer match, crea un chat privado entre las partes."

**Fase 5 — Cierre del ciclo**
> "Implementa el reporte de resultado post-partido: ambas partes deben confirmar quién ganó antes de que el rating se actualice. Después del resultado, muestra un formulario de reseña (puntualidad, respeto, nivel percibido). Actualiza el rating Glicko-2 de cada PerfilDeportivo involucrado según el resultado confirmado."

**Fase 6 — Notificaciones y pulido**
> "Agrega notificaciones push para: nuevo match encontrado, mensaje nuevo en el chat, recordatorio de partido 1 hora antes. Revisa toda la app en busca de errores de UI en ambas plataformas (iOS/Android) usando el navegador automatizado, y corrige lo que encuentres."

### Un consejo práctico
Guarda cada instrucción y su resultado (los Artifacts que genera Antigravity) en una carpeta de documentación del proyecto — te sirve como bitácora de decisiones y te permite retomar el trabajo con contexto claro si vuelves después de un tiempo, o si necesitas que otra persona (o tú mismo en otra sesión) entienda por qué algo se construyó de cierta forma.

---

## NOTA PARA MÁS ADELANTE: Modo "Completar"

Cuando el modo Desafío esté validado y quieras agregar el segundo modo (equipo con partido ya armado que busca 1 jugador suelto, y viceversa):

- Es una funcionalidad **distinta a Desafío**, no la mezcles en la misma pantalla — la intención del usuario es diferente (aquí no se busca "rival equilibrado", se busca "llenar un hueco").
- Reutiliza el mismo modelo de datos: PerfilDeportivo, ubicación, nivel — solo agregas una nueva entidad tipo "Vacante" (equipo X, formato Y, fecha/hora Z, faltan N jugadores) que otros usuarios pueden ver y solicitar unirse.
- Este modo compite directamente con apps ya existentes en Perú (ej. FaltaUno.pe), así que cuando lo lances, tu diferencial debe seguir siendo el sistema de nivel/rating y reputación que ya construiste en Desafío — eso es lo que ellos no tienen tan desarrollado.
- Decide en su momento si la participación en un partido "de relleno" debe sumar al rating individual del jugador (recomendado) sin afectar el rating de un equipo permanente (si lo hay).
