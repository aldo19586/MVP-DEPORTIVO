import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBackendUrl = () => {
  // 1. Variable de entorno explícita (útil para builds de producción, staging y preview)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || Constants?.expoConfig?.extra?.apiUrl;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Entorno de desarrollo local
  if (__DEV__) {
    // En Expo Go (dispositivo físico o emulador conectado a Metro), hostUri tiene la IP de la máquina anfitriona
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:3001`;
    }

    // Emulador de Android enrutando hacia host local
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001';
    }

    // Fallback de desarrollo en simulador iOS o entorno local
    return 'http://localhost:3001';
  }

  // 3. Fallback de producción si no se inyectó variable de entorno
  return 'https://api.matchsport.app';
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const SOCKET_URL = BACKEND_URL;
