import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_SESSION: '@matchsport:user_session',
  SAVED_PIN: '@matchsport:user_pin',
  FUT_STATS: '@matchsport:fut_stats'
};

export const storage = {
  async saveUserSession(user) {
    try {
      await AsyncStorage.setItem(KEYS.USER_SESSION, JSON.stringify(user));
    } catch (e) {
      console.error('[STORAGE] Error guardando sesión:', e);
    }
  },

  async getUserSession() {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[STORAGE] Error leyendo sesión:', e);
      return null;
    }
  },

  async clearUserSession() {
    try {
      await AsyncStorage.removeItem(KEYS.USER_SESSION);
    } catch (e) {
      console.error('[STORAGE] Error limpiando sesión:', e);
    }
  },

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
  }
};
