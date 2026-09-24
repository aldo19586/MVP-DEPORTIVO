import { io } from 'socket.io-client';

const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/';

export const adminSocket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

export function registerSuperAdmin() {
  adminSocket.emit('registerUser', {
    userId: 'demo_user_admin',
    user: {
      id: 'demo_user_admin',
      name: 'SuperAdmin Central',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      district: 'San Isidro, Lima'
    }
  });
}

adminSocket.on('connect', () => {
  console.log('[ADMIN SOCKET] Conectado al backend ID:', adminSocket.id);
  registerSuperAdmin();
});

adminSocket.on('disconnect', (reason) => {
  console.warn('[ADMIN SOCKET] Desconectado:', reason);
});
