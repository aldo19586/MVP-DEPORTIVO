---
name: react-native-mobile
description: >-
  Especialista en desarrollo móvil nativo con React Native y Expo para MatchSport.
  Activar este skill cuando se desarrollen pantallas, componentes o se integren sensores de hardware
  (GPS, Hápticos, Notificaciones Push, Cámara) en la app del jugador bajo apps/mobile.
---

# Skill: Especialista Mobile Nativo (React Native + Expo)

Este skill define los estándares y procedimientos para desarrollar la aplicación móvil de deportistas en `apps/mobile/`.

## 1. Reglas de Componentes Nativos
- Usa siempre componentes de React Native: `View`, `Text`, `TouchableOpacity`, `Pressable`, `FlatList`, `ScrollView`, `Modal`, `StyleSheet`.
- Para estilos, usa `StyleSheet.create({ ... })` con paleta oscura deportiva (#0f172a, #1e293b, acentos en verde neón #10b981 y ámbar #f59e0b).
- Cero etiquetas HTML o APIs del navegador.

## 2. Integración de Hardware Móvil
- **GPS / Ubicación:** Usar `expo-location` para obtener la latitud/longitud del usuario y calcular la distancia a canchas con la fórmula Haversine.
- **Hápticos y Vibración:** Usar `expo-haptics` (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)`) durante el modal de 20s de aceptación de partido y en goles.
- **Notificaciones Push:** Usar `expo-notifications` para alertar cuando se encuentra un rival mientras la app está en segundo plano.
- **Cámara & Galería:** Usar `expo-image-picker` para capturar la foto del deportista para su Carta FUT.
- **Almacenamiento Local:** Usar `@react-native-async-storage/async-storage` para persistir la sesión y el PIN de 4 dígitos.

## 3. Conexión de Tiempo Real
- Conectarse al backend mediante `socket.io-client` apuntando al host configurado en `apps/mobile/src/services/socket.js`.
