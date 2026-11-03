import { io } from 'socket.io-client';
const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/';
export const adminSocket = io(BACKEND_URL, {
  autoConnect: false, reconnection: true, reconnectionAttempts: 15,
  reconnectionDelay: 1000, transports: ['websocket', 'polling'],
});
export function connectAdmin(user, token) {
  const register = () => adminSocket.emit('registerUser', { userId: user.id, user });
  adminSocket.auth = { token };
  adminSocket.on('connect', register);
  adminSocket.connect();
  return () => { adminSocket.off('connect', register); adminSocket.disconnect(); };
}
