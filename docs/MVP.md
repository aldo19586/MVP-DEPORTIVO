# Documento rector del MVP

Estado: propuesta de ejecución basada en las instrucciones del usuario. Las decisiones comerciales y de participación indicadas como pendientes requieren respuesta del responsable del producto; no se consideran aprobadas por omisión.

## 1. Objetivo y actores

Permitir que un jugador cree su cuenta, complete un test, obtenga su carta inicial, encuentre una convocatoria, se una, coordine el partido y consulte su resultado. El SuperAdmin modera usuarios y resuelve discrepancias.

El éxito inicial es que un grupo real complete ese recorrido con datos reales y pueda repetirlo. Descargas, cantidad de pantallas y líneas de código no constituyen éxito del MVP.

## 2. Alcance de trabajo

| En el MVP | Fuera del primer piloto |
|---|---|
| Registro, acceso, cierre de sesión y recuperación definida | Paneles de dueños de canchas, agenda B2B y TPV |
| Test inicial y carta derivada del resultado | Pagos, reservas comerciales y comisiones |
| Convocatorias con modalidad, lugar, horario y cupos | Temporadas, recompensas y estadísticas individuales avanzadas |
| Crear, compartir código, unirse, salir y cancelar según permisos | Hidratación, cambios y seguimiento individual en vivo |
| Participantes y chat de sala | Dynamic Island y experiencias especiales de pantalla bloqueada |
| Resultado, confirmación, disputa y actualización única de nivel | Automatizar sanciones comerciales o penalidades de pago |
| Perfil, carta, historial y avisos necesarios | Expandir varios deportes antes de validar fútbol |
| SuperAdmin: monitor, auditoría, sanción/reset y disputas | Nuevas infraestructuras distribuidas sin necesidad medida |

Fútbol es la propuesta inicial, consistente con el recorrido actual. D-01 quedó definido el 03/11/2026: cobertura de todo Perú, fútbol 5, 6, 7, 9 y 11. Conservar el código existente de matchmaking; las convocatorias son la vía principal propuesta. El emparejamiento instantáneo puede habilitarse tras probarlo, sin ser requisito para encontrar partido. La clasificación global y el peer review son secundarios y no bloquean el recorrido básico.

## 3. Experiencia del jugador

### Registro nuevo

1. **Cuenta:** apodo y mecanismo de acceso acordado. El PIN actual se evalúa junto con recuperación y limitación de intentos; no se declara suficiente para lanzamiento solo por existir.
2. **Datos para jugar:** distrito y posición, sin pedirlos de nuevo. Edad y participación dependen de D-02. Peso, altura y foto se proponen opcionales fuera del camino crítico.
3. **Test:** una pregunta visible por vez, avance claro y opción de corregir. Conservar inicialmente las 14 preguntas; cambiar su número exige versionar y ajustar el cálculo.
4. **Carta inicial:** resultado real del test. Sin foto obligatoria ni atributos de ejemplo. Etiqueta «Nivel inicial estimado» y una frase que explique que evolucionará con los partidos.
5. **Jugar:** convocatorias disponibles. El usuario con sesión y onboarding completos no repite el registro ni el test.

Guardar el progreso y recuperar el paso correcto tras cerrar la app. Si el registro comenzó por una invitación, conservar el código y volver a esa sala al terminar. Diferenciar pérdida de red, cuenta creada y test pendiente para evitar cuentas duplicadas por reintentos.

### Navegación propuesta

Tres destinos principales: **Jugar · Mis partidos · Perfil**. Notificaciones y clasificación se abren desde accesos secundarios. Un partido activo sigue siendo accesible después de cerrar y volver a abrir la app.

| Pantalla | Contenido esencial y comportamiento |
|---|---|
| Bienvenida / acceso | Marca y acceso/registro; sin usuarios ficticios, temporada ni perfiles demo |
| Jugar | Zona, modalidad seleccionada, convocatorias; filtros secundarios bajo demanda |
| Crear convocatoria | Cuándo, dónde y modalidad; cupos derivados de esta; confirmación del servidor |
| Detalle / sala | Hora, lugar, cupos, participantes y una acción según estado; chat accesible aparte |
| Unirse por código | Un único flujo compartido desde invitación o Jugar; verificar existencia y cupo antes de confirmar |
| Búsqueda instantánea | Solo si está habilitada: búsqueda, cancelar, propuesta con aceptar/rechazar; no aplicar 20 segundos a convocatorias futuras |
| Partido | Coordinación y resultado; controles de capitán separados de los del participante |
| Resultado | Pendiente de confirmación, confirmado o en disputa; no anunciar victoria antes de resolver |
| Perfil | Carta y datos reales, edición opcional e historial; detalles del nivel bajo demanda |
| Avisos | Solo eventos reales; permiso solicitado cuando su utilidad sea clara, no al arrancar por primera vez |

Reglas visuales: una acción primaria por estado, sin párrafos técnicos en el recorrido normal, etiquetas comprensibles, texto legible y compatible con tamaños de fuente del sistema. Evitar esconder funciones esenciales en carruseles largos. Mantener mensajes de error, carga y vacío explícitos. Probar con teclado, iPhone pequeño y permisos denegados.

### Ciclo de convocatoria propuesto

`Convocando → Completa/confirmada → En juego → Resultado pendiente → Finalizada`

Desde resultado pendiente puede abrirse disputa; solo su resolución permite finalizar. Cancelación es una transición explícita según reglas. «Falta 1» es información derivada de cupos, no un estado que compita con el ciclo del partido. «Mis partidos» se deriva de membresías persistidas.

La implementación debe mapear los estados actuales y preservar datos existentes; no cambiar nombres sin migración. Una desconexión no equivale a abandonar una convocatoria futura. La regla actual de 25 segundos para conexiones requiere distinguir sesiones, búsquedas inmediatas y membresías persistentes.

## 4. Invariantes del producto

- El servidor identifica al actor autenticado y decide qué puede hacer; IDs, roles, resultados y ratings del cliente no son autoridad.
- Un jugador ocupa como máximo un cupo en una sala. Dos solicitudes simultáneas no sobrepasan la capacidad.
- Los mensajes se identifican, pertenecen a una sala y no se duplican al reintentar o reconectar.
- Un resultado definitivo modifica historial y rating una sola vez. Repetir una solicitud no vuelve a premiar ni penalizar.
- Una cuenta bloqueada no elude la sanción reconectándose. Cada acción administrativa registra actor, motivo y momento.
- Ninguna vista pública recibe credenciales, hashes o datos administrativos por serializar un usuario completo.
- Test, nivel competitivo y atributos de la carta tienen una relación explícita y versionada; no se inventan atributos que el test no mide.
- Las pantallas muestran ausencia de información cuando corresponda; no completan información real con demostraciones.

## 5. Base técnica

Mantener React Native/Expo, React/Vite para SuperAdmin y backend Node.js/Socket.IO. Organizar el backend en módulos internos de identidad, usuarios, convocatorias, partidos y rating, de forma incremental. No reescribir todo ni introducir microservicios como condición de este MVP.

Separar desarrollo, pruebas y piloto mediante configuración. Tests con base propia y seed explícito. Separar los clientes actuales del cliente web/Capacitor heredado en scripts y documentación. Preparar una compilación nativa propia antes de validar capacidades que dependan del entorno nativo.

SQLite/PostgreSQL se decide en D-05. Una copia SQLite en memoria exportada a archivo no puede compartirse entre varias instancias como si fuera una base transaccional central. Sea cual sea la elección, exigir migraciones, respaldo, restauración y escrituras duraderas comprobadas.

## 6. Decisiones y estado

| ID | Decisión | Recomendación para discutir | Qué bloquea |
|---|---|---|---|
| D-01 | Cobertura y modalidades confirmadas; tamaño inicial pendiente | Todo Perú; fútbol 5/6/7/9/11. Validar lanzamiento con invitados, sin limitar la cobertura del producto | Catálogo y búsqueda nacional; volumen inicial por acordar |
| D-02 | Edad mínima y participación | Considerar piloto solo de adultos para reducir complejidad operativa; decisión del producto y revisión de requisitos aplicables | Registro y convocatoria de usuarios |
| D-03 | Identidad y recuperación | Definir cómo demostrar titularidad y recuperar acceso; no usar conocimiento del apodo como prueba | Cierre del diseño de acceso y reset |
| D-04 | Base confirmada el 03/11/2026; detalles en REGLAS_COMPETICION.md | Dos capitanes, confirmación, empates, disputa administrativa, salida previa sin penalidad automática; sin adjudicación por silencio | Implementación en MS-07/MS-09 |
| D-05 | Alojamiento y base de datos | Comparar despliegue de una instancia con disco durable frente a PostgreSQL administrado; considerar presupuesto, respaldo y concurrencia | Piloto fuera de la PC |
| D-06 | Relación test / carta / rating | Mantener test actual al principio, definir atributos justificables y evolución; revisar afirmaciones de «3 partidos» | Carta y actualización de nivel |
| D-07 | Plataforma, distribución y operación | iPhone como primer dispositivo ya disponible, confirmar Android, responsable de soporte y presupuesto | Builds y distribución del piloto |

El 3 de noviembre de 2026 Aldo confirmó D-01 (todo Perú; fútbol 5/6/7/9/11) y D-04 (dos capitanes, reporte/confirmación, empate y revisión de discrepancias, salida previa sin penalización automática). Ver [reglas y contrato](REGLAS_COMPETICION.md). Las demás decisiones de la tabla siguen pendientes; el tamaño de la invitación inicial aún no se fijó.

Resolver cada decisión con fecha, responsable, opción elegida y motivo. No hacen falta todas para comenzar a aislar pruebas y corregir autorización.

## 7. Indicadores del piloto

Medir sin recopilar respuestas del test ni contenido de chat en telemetría: inicio/final de onboarding, carta vista, convocatoria creada, unión confirmada, partido finalizado y error por etapa. Indicadores: finalización del registro, abandono por pregunta, tiempo hasta unirse, convocatorias completadas, discrepancias y sesiones sin fallo. Acordar objetivos numéricos al conocer tamaño y duración del piloto; no inventarlos a partir del prototipo.
