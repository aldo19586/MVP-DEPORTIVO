import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  // Conectar al puerto 3001 en el mismo host que cargó la web (ej. 192.168.x.x o localhost)
  return `http://${window.location.hostname}:3001`;
};

export const socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('[SOCKET CLIENT] Conectado al servidor de matchmaking en', getSocketUrl());
});

socket.on('connect_error', (err) => {
  console.warn('[SOCKET CLIENT] Error de conexión:', err.message);
});
