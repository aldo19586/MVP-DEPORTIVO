import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status;
    } catch (err) {
      console.log('[NOTIFICATIONS] Permisos no disponibles en este entorno:', err.message);
      return 'denied';
    }
  },

  async scheduleLocalNotification({ title, body, data = {} }) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Inmediato
      });
    } catch (e) {
      console.log('[NOTIFICATIONS] No se pudo programar notificación local:', e.message);
    }
  },
};
