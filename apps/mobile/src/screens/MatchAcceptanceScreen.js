import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

export default function MatchAcceptanceScreen({ matchData, onAccept, onDecline }) {
  const [timeLeft, setTimeLeft] = useState(20);
  const [hasAccepted, setHasAccepted] = useState(false);

  useEffect(() => {
    // Vibración de alerta fuerte inicial
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAccept = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    setHasAccepted(true);
    onAccept();
  };

  const handleDecline = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    onDecline();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleDecline}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>DETALLE DEL PARTIDO</Text>
        <View style={styles.avatarMini} />
      </View>

      <View style={styles.content}>
        {/* Countdown Ring */}
        <View style={styles.countdownContainer}>
          <View style={styles.countdownRing}>
            <Text style={styles.footballIcon}>⚽</Text>
            <Text style={styles.countdownSeconds}>{timeLeft}s</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.liveBadgeText}>LOBBY ACTIVO • CONEXIÓN SEGURA</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.matchFoundTitle}>¡PARTIDO ENCONTRADO EN TU ZONA!</Text>

        <View style={styles.venueChip}>
          <Text style={styles.venueText}>
            🏟️ {matchData?.venueDistrict || 'Manuel Bonilla, Miraflores • Cancha 2'}
          </Text>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>ELO PROMEDIO</Text>
            <Text style={styles.metricValueGold}>🎖️ 1810</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>CUOTA CANCHA</Text>
            <Text style={styles.metricValueGreen}>S/ 15 <Text style={styles.subLabel}>/jugador</Text></Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>ARBITRAJE</Text>
            <Text style={styles.metricValueGreen}>🛡️ Oficial</Text>
          </View>
        </View>

        {/* Teams Faceoff */}
        <View style={styles.faceoffSection}>
          <View style={styles.faceoffHeader}>
            <Text style={styles.teamTagLeft}>TU ESCUADRA  <Text style={styles.greenText}>LISTO ✓</Text></Text>
            <Text style={styles.teamTagRight}>RIVALES  <Text style={styles.goldText}>1/2 LISTO</Text></Text>
          </View>

          <View style={styles.faceoffGrid}>
            {/* Left Squad */}
            <View style={styles.squadCol}>
              <View style={styles.miniCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80' }}
                  style={styles.cardAvatar}
                />
                <View>
                  <Text style={styles.cardName}>Carlos V. <Text style={styles.capBadge}>CAP</Text></Text>
                  <Text style={styles.cardSub}>DEL • 4.8★</Text>
                  <Text style={styles.cardConfirmed}>CONFIRMADO</Text>
                </View>
              </View>

              <View style={styles.miniCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80' }}
                  style={styles.cardAvatar}
                />
                <View>
                  <Text style={styles.cardName}>Mateo R.</Text>
                  <Text style={styles.cardSub}>MED • 4.6★</Text>
                  <Text style={styles.cardConfirmed}>CONFIRMADO</Text>
                </View>
              </View>
            </View>

            {/* VS Badge */}
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.vsFormat}>5v5</Text>
            </View>

            {/* Right Squad */}
            <View style={styles.squadCol}>
              <View style={styles.miniCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80' }}
                  style={styles.cardAvatar}
                />
                <View>
                  <Text style={styles.cardName}>Lucía M.</Text>
                  <Text style={styles.cardSub}>DEL • 4.9★</Text>
                  <Text style={styles.cardConfirmed}>LISTO ✓</Text>
                </View>
              </View>

              <View style={styles.miniCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80' }}
                  style={styles.cardAvatar}
                />
                <View>
                  <Text style={styles.cardName}>Rodrigo P.</Text>
                  <Text style={styles.cardSub}>DEF • 4.5★</Text>
                  <Text style={styles.cardWaiting}>ESPERANDO...</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Validation Progress */}
          <View style={styles.quorumBarRow}>
            <Text style={styles.quorumText}>Cuórum de Validación</Text>
            <Text style={styles.quorumCount}>3 DE 4 JUGADORES LISTOS</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.acceptBtn, hasAccepted && styles.acceptedBtn]}
            onPress={handleAccept}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptBtnText}>
              {hasAccepted ? '✓ DESAFÍO ACEPTADO' : '✓ ACEPTAR DESAFÍO (3/4 LISTOS)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            activeOpacity={0.85}
          >
            <Text style={styles.declineBtnText}>
              ⊗ Rechazar encuentro (-15 pts Fair Play)
            </Text>
          </TouchableOpacity>

          <Text style={styles.legalFooter}>
            🛡️ Partido regulado bajo normas MatchSport League 2025
          </Text>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    padding: 6,
  },
  backIcon: {
    color: THEME.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  topTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  avatarMini: {
    width: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  countdownRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
  footballIcon: {
    fontSize: 16,
  },
  countdownSeconds: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 27, 34, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
    marginRight: 6,
  },
  liveBadgeText: {
    color: THEME.colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  matchFoundTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  venueChip: {
    backgroundColor: THEME.colors.cardBg,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
  },
  venueText: {
    color: THEME.colors.goldLight,
    fontSize: 11,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  metricBox: {
    flex: 1,
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  metricValueGold: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.gold,
    marginTop: 2,
  },
  metricValueGreen: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  subLabel: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  faceoffSection: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  faceoffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  teamTagLeft: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  teamTagRight: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  greenText: {
    color: THEME.colors.primary,
  },
  goldText: {
    color: THEME.colors.gold,
  },
  faceoffGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  squadCol: {
    flex: 1,
    gap: 6,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    padding: 6,
    borderRadius: THEME.radius.sm,
    gap: 6,
  },
  cardAvatar: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  cardName: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  capBadge: {
    fontSize: 8,
    color: THEME.colors.gold,
    fontWeight: '900',
  },
  cardSub: {
    fontSize: 8,
    color: THEME.colors.textMuted,
  },
  cardConfirmed: {
    fontSize: 8,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  cardWaiting: {
    fontSize: 8,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  vsBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  vsText: {
    color: THEME.colors.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  vsFormat: {
    color: THEME.colors.textMuted,
    fontSize: 7,
    fontWeight: '800',
  },
  quorumBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  quorumText: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  quorumCount: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  bottomButtons: {
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptedBtn: {
    backgroundColor: THEME.colors.primaryDark,
  },
  acceptBtnText: {
    color: '#00210B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  declineBtn: {
    height: 44,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  declineBtnText: {
    color: THEME.colors.dangerLight,
    fontSize: 11,
    fontWeight: '800',
  },
  legalFooter: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
