# Regla Estricta: Desarrollo Móvil React Native Nativo

Para todo el desarrollo de la aplicación móvil del jugador en MatchSport:
1. **Siempre es App Nativa, NUNCA Web**:
   - Prohibido usar etiquetas HTML (`div`, `span`, `p`, `button`, etc.) o APIs de navegador (`window`, `localStorage`, `document`).
   - Usar siempre componentes nativos de React Native (`View`, `Text`, `TouchableOpacity`, `Pressable`, `FlatList`, `ScrollView`, `StyleSheet`, `Modal`).
   - Usar `@react-native-async-storage/async-storage` o `expo-secure-store` para persistencia local.

2. **Capacidades Nativas de Hardware Obligatorias**:
   - **Geolocalización / GPS**: Usar `expo-location` para obtener la posición real del dispositivo para el radar distrital.
   - **Vibración y Hápticos**: Usar `expo-haptics` para el modal de 20s de aceptación de partida, goles y acciones críticas.
   - **Notificaciones Push**: Usar `expo-notifications` para avisos en segundo plano (partido encontrado, mensaje de chat, inicio de tiempo de cancha).
   - **Cámara y Fotos**: Usar `expo-image-picker` / `expo-camera` para captura o selección de foto para la Carta FUT coleccionable.
   - **Audio y Efectos Sonoros**: Usar `expo-av` para efectos de sonido deportivos.

3. **Arquitectura del Proyecto**:
   - `apps/mobile`: Aplicación React Native / Expo nativa para jugadores.
   - `apps/admin-web`: Aplicación Web Desktop (React + Vite) para el panel de administración / monitor de operaciones.
   - `server`: Backend unificado (Node.js, Express, Socket.IO, SQLite/PostgreSQL).
