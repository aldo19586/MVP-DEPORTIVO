import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'matchsport-alerts';

// Configurar el handler de notificaciones en primer plano de manera segura
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('[NOTIFICATIONS] Error configurando notificationHandler:', e.message);
}

export const notificationService = {
  async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'MatchSport Alertas Deportivas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00E676',
          sound: 'default',
        });
      } catch (err) {
        console.log('[NOTIFICATIONS] No se pudo crear canal Android:', err.message);
      }
    }
  },

  async getPermissionStatus() {
    try {
      const response = await Notifications.getPermissionsAsync();
      const status = response?.status || 'undetermined';
      return {
        status,
        granted: status === 'granted',
        canAskAgain: response?.canAskAgain !== false
      };
    } catch (err) {
      console.log('[NOTIFICATIONS] Error consultando estado de permisos:', err.message);
      return { status: 'denied', granted: false, canAskAgain: false };
    }
  },

  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }
      return status;
    } catch (err) {
      console.log('[NOTIFICATIONS] Permisos no disponibles en este entorno:', err.message);
      return 'denied';
    }
  },

  async getPushToken() {
    try {
      // Intentar obtener el token Expo si está disponible y configurado
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData?.data || null;
    } catch (err) {
      // Manejo seguro en simuladores o Expo Go sin project credentials
      console.log('[NOTIFICATIONS] Push token no disponible (entorno simulado o sin credenciales nativas):', err.message);
      return null;
    }
  },

  async scheduleLocalNotification({ title, body, data = {} }) {
    try {
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          channelId: CHANNEL_ID,
        },
        trigger: null, // Entrega inmediata
      });
    } catch (e) {
      console.log('[NOTIFICATIONS] No se pudo programar notificación local:', e.message);
    }
  },

  addNotificationResponseReceivedListener(listener) {
    try {
      return Notifications.addNotificationResponseReceivedListener(listener);
    } catch (e) {
      console.log('[NOTIFICATIONS] Listener de respuesta no disponible:', e.message);
      return { remove: () => {} };
    }
  },

  async getLastNotificationResponseAsync() {
    try {
      return await Notifications.getLastNotificationResponseAsync();
    } catch (e) {
      console.log('[NOTIFICATIONS] Error leyendo última respuesta de notificación:', e.message);
      return null;
    }
  }
};
