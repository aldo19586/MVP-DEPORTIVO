import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBackendUrl = () => {
  if (__DEV__) {
    // En Expo Go (dispositivo físico o emulador), hostUri tiene la IP de la PC (ej: 192.168.1.117:8081)
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:3001`;
    }

    // Fallback con IP local Wi-Fi detectada
    return 'http://192.168.1.117:3001';
  }
  return 'https://api.matchsport.app';
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const SOCKET_URL = BACKEND_URL;
