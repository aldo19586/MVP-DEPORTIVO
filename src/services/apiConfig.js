// Configuración centralizada de Servidor Backend (Laptop / LAN / Producción)
export const SERVER_IP = '192.168.1.108';
export const SERVER_PORT = '3001';

export const isCapacitorNative = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
    window.Capacitor?.getPlatform?.() === 'android' ||
    window.Capacitor?.getPlatform?.() === 'ios' ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    // En Capacitor Android con androidScheme 'http', no hay puerto (puerto 80 por defecto)
    (window.location.hostname === 'localhost' && window.location.port === '' && typeof window.androidBridge !== 'undefined')
  );
};

export const resolveServerHost = () => {
  if (typeof window === 'undefined') return 'localhost';

  const customIp = localStorage.getItem('matchsport_server_ip');
  if (customIp) return customIp;

  // Si corre en Navegador Web (PC, celular en Chrome, etc.): usar siempre el host actual
  if (!isCapacitorNative() && window.location.port !== '') {
    return window.location.hostname || 'localhost';
  }

  // Si corre en APK nativo de Android (Capacitor):
  const ua = (navigator?.userAgent || '').toLowerCase();
  const isEmulator = /x86_64|x86|goldfish|ranchu|sdk_gphone|google_sdk/i.test(ua);
  if (isEmulator) {
    return '10.0.2.2';
  }

  // Por defecto en APK de desarrollo apuntar al túnel 10.0.2.2 del emulador
  if (isCapacitorNative()) {
    return '10.0.2.2';
  }

  return window.location.hostname || SERVER_IP;
};

export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return `http://localhost:${SERVER_PORT}`;

  // Si corre dentro del APK nativo de Android (Capacitor / WebView)
  const isNative = isCapacitorNative() || (window.location.hostname === 'localhost' && window.location.port === '');
  if (isNative) {
    const host = resolveServerHost();
    return `http://${host}:${SERVER_PORT}`;
  }

  // Si corre en navegador web normal (Vite dev server con proxy en 5173)
  if (window.location.port === '5173') {
    return ''; // Usa el proxy de Vite
  }

  // Si corre en navegador web en puerto 3001 u otro
  return `http://${window.location.hostname || 'localhost'}:${window.location.port || SERVER_PORT}`;
};

export const getSocketUrl = () => {
  if (typeof window === 'undefined') return `http://localhost:${SERVER_PORT}`;

  const isNative = isCapacitorNative() || (window.location.hostname === 'localhost' && window.location.port === '');
  if (isNative) {
    const host = resolveServerHost();
    return `http://${host}:${SERVER_PORT}`;
  }

  // Navegador web (PC o teléfono en Chrome/Edge): Conectar al host actual
  return `http://${window.location.hostname || 'localhost'}:${SERVER_PORT}`;
};

export const apiFetch = (url, options) => {
  if (url.startsWith('http')) {
    return fetch(url, options);
  }
  const base = getApiBaseUrl();
  return fetch(`${base}${url}`, options);
};

// Interceptor global de fetch para que cualquier llamada a /api/... en el APK
// sea redirigida automáticamente al host backend correspondiente
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      const base = getApiBaseUrl();
      if (base) {
        return originalFetch(`${base}${input}`, init);
      }
    }
    return originalFetch(input, init);
  };
}
