import { Platform } from 'react-native';

const getBackendUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // 10.0.2.2 mapea a 127.0.0.1 de la máquina anfitriona en el emulador de Android
      return 'http://10.0.2.2:3001';
    }
    return 'http://localhost:3001';
  }
  return 'https://api.matchsport.app';
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const SOCKET_URL = BACKEND_URL;
