import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createSessionStore } from './sessionStore.mjs';

const KEYS = {
  FUT_STATS: '@matchsport:fut_stats'
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
  }
};
