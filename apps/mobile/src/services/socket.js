import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
  }

  connect(userId, user) {
    if (this.socket && this.socket.connected) {
      if (this.userId === userId) {
        return this.socket;
      }
      this.disconnect();
    }

    this.userId = userId;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        userId
      }
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET MOBILE] 🟢 Conectado con id:', this.socket.id);
      if (userId) {
        this.socket.emit('registerUser', { userId, user });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SOCKET MOBILE] 🔴 Desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[SOCKET MOBILE] ⚠️ Error de conexión:', error.message);
    });

    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.userId) {
        this.socket.emit('unregisterUser');
      }
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[SOCKET MOBILE] No se puede emitir "${event}" - socket desconectado`);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
