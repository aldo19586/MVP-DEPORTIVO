import { io } from 'socket.io-client';
import { bindSocketSession } from '../../../../shared/socketSession.mjs';
import { getAdminToken, clearSession, endAdminSessionView } from './api';
const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/';
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
