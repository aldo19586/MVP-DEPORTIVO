import { io } from 'socket.io-client';
import { bindSocketSession } from '../../../../shared/socketSession.mjs';
import { getAdminToken, clearSession, endAdminSessionView } from './api';
const getSocketUrl = () => {
  if (import.meta.env?.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.replace(/\/+$/, '');
  }
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  return window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/';
};
const BACKEND_URL = getSocketUrl();
export const adminSocket = io(BACKEND_URL, {
  autoConnect: false, reconnection: true, reconnectionAttempts: 15,
  reconnectionDelay: 1000, transports: ['websocket', 'polling'],
});
export function connectAdmin(onError) {
  const cleanup = bindSocketSession(adminSocket, { getToken: getAdminToken, invalidate: clearSession,
    onReplaced: endAdminSessionView, onError });
  adminSocket.connect();
  return () => { cleanup(); adminSocket.disconnect(); };
}
