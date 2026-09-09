import { io } from 'socket.io-client';
import { getSocketUrl } from './apiConfig.js';

export const socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 30,         // Reintentos automáticos por hasta ~2 minutos
  reconnectionDelay: 1000,          // Iniciar reintentos tras 1 segundo
  reconnectionDelayMax: 5000,       // Intervalo máximo entre reintentos
  randomizationFactor: 0.5,        // Jitter para evitar tormentas de conexiones
  timeout: 20000,                   // Timeout de conexión 20s
  auth: (cb) => {
    try {
      const saved = localStorage.getItem('matchsport_user');
      const user = saved ? JSON.parse(saved) : null;
      cb({ userId: user?.id || null });
    } catch (e) {
      cb({ userId: null });
    }
  }
});

socket.on('connect', () => {
  console.log('[SOCKET CLIENT] ✅ Conectado con ID:', socket.id, 'en', getSocketUrl());
});

socket.on('disconnect', (reason) => {
  console.warn('[SOCKET CLIENT] ⚠️ Desconectado del servidor. Motivo:', reason);
});

socket.io.on('reconnect_attempt', (attempt) => {
  console.log(`[SOCKET CLIENT] 🔄 Intento de reconexión #${attempt}...`);
});

socket.io.on('reconnect', (attempt) => {
  console.log(`[SOCKET CLIENT] 🟢 Reconexión exitosa tras ${attempt} intento(s). Nuevo ID:`, socket.id);
});

socket.io.on('reconnect_error', (err) => {
  console.warn('[SOCKET CLIENT] Error en reintento de reconexión:', err.message);
});

socket.io.on('reconnect_failed', () => {
  console.error('[SOCKET CLIENT] ❌ Se agotaron los intentos de reconexión automática.');
});

socket.on('connect_error', (err) => {
  console.warn('[SOCKET CLIENT] Error de conexión inicial:', err.message);
});
