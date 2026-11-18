import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createSessionStore } from './sessionStore.mjs';

const KEYS = {
  FUT_STATS: '@matchsport:fut_stats',
  PARTIAL_TEST: '@matchsport:partial_test_answers',
  PENDING_INVITE: '@matchsport:pending_invite_code',
  PENDING_NOTIFICATION_INTENT: '@matchsport:pending_notification_intent',
  NOTIFICATIONS: '@matchsport:notifications'
};

export const storage = {
  ...createSessionStore(SecureStore, AsyncStorage),

  async saveFutStats(stats) {
    try {
      await AsyncStorage.setItem(KEYS.FUT_STATS, JSON.stringify(stats));
    } catch (e) {
      console.error('[STORAGE] Error guardando stats FUT:', e);
    }
  },

  async getFutStats() {
    try {
      const data = await AsyncStorage.getItem(KEYS.FUT_STATS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[STORAGE] Error leyendo stats FUT:', e);
      return null;
    }
  },

  async savePartialTestAnswers(answers) {
    try {
      await AsyncStorage.setItem(KEYS.PARTIAL_TEST, JSON.stringify(answers));
    } catch (e) {
      console.error('[STORAGE] Error guardando test parcial:', e);
    }
  },

  async getPartialTestAnswers() {
    try {
      const data = await AsyncStorage.getItem(KEYS.PARTIAL_TEST);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[STORAGE] Error leyendo test parcial:', e);
      return null;
    }
  },

  async clearPartialTestAnswers() {
    try {
      await AsyncStorage.removeItem(KEYS.PARTIAL_TEST);
    } catch (e) {
      console.error('[STORAGE] Error limpiando test parcial:', e);
    }
  },

  async savePendingInviteCode(code) {
    try {
      if (code) {
        await AsyncStorage.setItem(KEYS.PENDING_INVITE, String(code).trim().toUpperCase());
      }
    } catch (e) {
      console.error('[STORAGE] Error guardando invitación pendiente:', e);
    }
  },

  async getPendingInviteCode() {
    try {
      return await AsyncStorage.getItem(KEYS.PENDING_INVITE);
    } catch (e) {
      console.error('[STORAGE] Error leyendo invitación pendiente:', e);
      return null;
    }
  },

  async clearPendingInviteCode() {
    try {
      await AsyncStorage.removeItem(KEYS.PENDING_INVITE);
    } catch (e) {
      console.error('[STORAGE] Error limpiando invitación pendiente:', e);
    }
  },

  async savePendingNotificationIntent(intent) {
    try {
      if (intent) {
        await AsyncStorage.setItem(KEYS.PENDING_NOTIFICATION_INTENT, JSON.stringify(intent));
      }
    } catch (e) {
      console.error('[STORAGE] Error guardando intención de notificación pendiente:', e);
    }
  },

  async getPendingNotificationIntent() {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_NOTIFICATION_INTENT);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[STORAGE] Error leyendo intención de notificación pendiente:', e);
      return null;
    }
  },

  async clearPendingNotificationIntent() {
    try {
      await AsyncStorage.removeItem(KEYS.PENDING_NOTIFICATION_INTENT);
    } catch (e) {
      console.error('[STORAGE] Error limpiando intención de notificación pendiente:', e);
    }
  },

  async getNotifications() {
    try {
      const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[STORAGE] Error leyendo notificaciones guardadas:', e);
      return [];
    }
  },

  async saveNotifications(notifications) {
    try {
      await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications || []));
    } catch (e) {
      console.error('[STORAGE] Error guardando notificaciones:', e);
    }
  },

  async addNotification(notif) {
    try {
      const current = await this.getNotifications();
      const updated = [
        {
          id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: notif.type || 'SYSTEM',
          title: notif.title || 'Aviso MatchSport',
          body: notif.body || '',
          data: notif.data || {},
          unread: notif.unread !== undefined ? notif.unread : true,
          time: notif.time || new Date().toISOString()
        },
        ...current.filter(n => n.id !== notif.id)
      ].slice(0, 50); // Mantener un límite saludable de 50 avisos
      await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('[STORAGE] Error agregando notificación:', e);
      return [];
    }
  },

  async markAllNotificationsRead() {
    try {
      const current = await this.getNotifications();
      const updated = current.map(n => ({ ...n, unread: false }));
      await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('[STORAGE] Error marcando notificaciones como leídas:', e);
      return [];
    }
  },

  async clearNotifications() {
    try {
      await AsyncStorage.removeItem(KEYS.NOTIFICATIONS);
    } catch (e) {
      console.error('[STORAGE] Error limpiando notificaciones:', e);
    }
  }
};
