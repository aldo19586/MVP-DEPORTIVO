import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

export default function NotificationsScreen({ user, onBack, onEnterLobby }) {
  const [notifications, setNotifications] = useState([]);

  const handleApplySuplente = (item) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    const socket = socketService.getSocket();
    if (socket && user) {
      socket.emit('joinReplacementSlot', { code: item.code, user });
    }

    Alert.alert(
      '¡Postulación Confirmada!',
      `Te has unido a la convocatoria de emergencia #${item.code} en ${item.venue}.`,
      [
        {
          text: 'Ir a la Sala',
          onPress: () => {
            if (onEnterLobby) {
              onEnterLobby({ code: item.code });
            } else {
              onBack();
            }
          }
        }
      ]
    );
  };

  const markAllRead = () => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header con botón volver nativo */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>NOTIFICACIONES</Text>
          <Text style={styles.headerSubtitle}>Avisos y Bolsa de Suplentes</Text>
        </View>

        <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead} activeOpacity={0.7}>
          <Text style={styles.readAllText}>Leídas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Sin notificaciones pendientes</Text>
            <Text style={styles.emptyText}>
              Aquí recibirás avisos en tiempo real sobre confirmaciones de partido, reportes de marcador y convocatorias.
            </Text>
            {onBack && (
              <TouchableOpacity style={styles.emptyBtn} onPress={onBack}>
                <Text style={styles.emptyBtnText}>Volver</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Banner de Bolsa de Suplentes */}
            {notifications.some((n) => n.type === 'SUPLENTE_URGENTE') && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>🚨 BOLSA DE SUPLENTES (¡FALTA 1!)</Text>
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>EN VIVO</Text>
                  </View>
                </View>

                {notifications
                  .filter((n) => n.type === 'SUPLENTE_URGENTE')
                  .map((item) => (
                    <View key={item.id} style={styles.suplenteCard}>
                      <View style={styles.suplenteCardHeader}>
                        <View style={styles.suplenteTitleRow}>
                          <Text style={styles.suplenteIcon}>🚨</Text>
                          <Text style={styles.suplenteTitle}>{item.title}</Text>
                        </View>
                        <View style={styles.codePill}>
                          <Text style={styles.codePillText}>#{item.code}</Text>
                        </View>
                      </View>

                      <Text style={styles.suplenteVenue}>📍 {item.venue} • {item.sport}</Text>
                      <Text style={styles.suplenteTime}>⏰ {item.time} ({item.timeAgo})</Text>

                      <View style={styles.suplenteMissingBox}>
                        <Text style={styles.suplenteMissingText}>⚠️ {item.missing}</Text>
                        <Text style={styles.suplenteLevelText}>Nivel: {item.level}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.suplenteApplyBtn}
                        onPress={() => handleApplySuplente(item)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.suplenteApplyText}>⚡ Postularme de Inmediato</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </>
            )}

            {/* Sección de Avisos y Notificaciones del Sistema */}
            {notifications.some((n) => n.type !== 'SUPLENTE_URGENTE') && (
              <>
                <Text style={[styles.sectionHeaderTitle, { marginTop: 14 }]}>AVISOS Y FAIR PLAY</Text>

                {notifications
                  .filter((n) => n.type !== 'SUPLENTE_URGENTE')
                  .map((item) => (
                    <View key={item.id} style={[styles.normalNotifCard, item.unread && styles.unreadCard]}>
                      <View style={styles.notifTopRow}>
                        <Text style={styles.notifTitle}>
                          {item.type === 'FAIR_PLAY' ? '👍 ' : '📌 '}
                          {item.title}
                        </Text>
                        <Text style={styles.notifTime}>{item.timeAgo}</Text>
                      </View>
                      <Text style={styles.notifBody}>{item.body}</Text>
                    </View>
                  ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  readAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  readAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.goldLight,
    letterSpacing: 0.6,
  },
  urgentBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  suplenteCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    gap: 6,
  },
  suplenteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suplenteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  suplenteIcon: {
    fontSize: 16,
  },
  suplenteTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  codePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  suplenteVenue: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  suplenteTime: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  suplenteMissingBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginTop: 2,
    gap: 2,
  },
  suplenteMissingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  suplenteLevelText: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  suplenteApplyBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  suplenteApplyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00210B',
    letterSpacing: 0.3,
  },
  normalNotifCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 4,
  },
  unreadCard: {
    borderColor: 'rgba(0, 230, 118, 0.35)',
    backgroundColor: 'rgba(0, 230, 118, 0.04)',
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  notifTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  notifBody: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 28,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: 20,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#00210B',
    fontSize: 12,
    fontWeight: '800',
  },
});
