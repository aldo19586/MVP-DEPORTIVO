import { io } from 'socket.io-client';
import { getSocketUrl } from './apiConfig.js';

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
