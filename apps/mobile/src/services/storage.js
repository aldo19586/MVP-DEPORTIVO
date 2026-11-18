import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createSessionStore } from './sessionStore.mjs';

const KEYS = {
  FUT_STATS: '@matchsport:fut_stats',
  PARTIAL_TEST: '@matchsport:partial_test_answers',
  PENDING_INVITE: '@matchsport:pending_invite_code'
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
  }
};
