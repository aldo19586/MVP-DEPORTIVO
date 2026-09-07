// Configuración centralizada de Servidor Backend (Laptop / LAN / Producción)
export const SERVER_IP = '192.168.1.117';
export const SERVER_PORT = '3001';

export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return `http://localhost:${SERVER_PORT}`;

  // Si corre dentro del APK nativo de Android (Capacitor / WebView)
  const isNativeApp = window.location.protocol === 'capacitor:' ||
                      window.location.protocol === 'ionic:' ||
                      window.location.protocol === 'file:' ||
                      (window.location.hostname === 'localhost' && window.location.port !== '5173');

  if (isNativeApp) {
    return `http://${SERVER_IP}:${SERVER_PORT}`;
  }

  // Si corre en navegador web normal (Vite dev server con proxy o LAN)
  if (window.location.port === '5173') {
    return ''; // Usa el proxy de Vite
  }

  return `http://${window.location.hostname || SERVER_IP}:${SERVER_PORT}`;
};

export const getSocketUrl = () => {
  if (typeof window === 'undefined') return `http://localhost:${SERVER_PORT}`;

  const isNativeApp = window.location.protocol === 'capacitor:' ||
                      window.location.protocol === 'ionic:' ||
                      window.location.protocol === 'file:' ||
                      (window.location.hostname === 'localhost' && window.location.port !== '5173');

  if (isNativeApp) {
    return `http://${SERVER_IP}:${SERVER_PORT}`;
  }

  return `http://${window.location.hostname || SERVER_IP}:${SERVER_PORT}`;
};

export const apiFetch = (url, options) => {
  if (url.startsWith('http')) {
    return fetch(url, options);
  }
  const base = getApiBaseUrl();
  return fetch(`${base}${url}`, options);
};
