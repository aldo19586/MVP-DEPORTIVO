import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

export default function MatchSummaryScreen({ match, user, reviewResult, onBackToRadar }) {
  const isWinner = true; // Por defecto victoria para mostrar la experiencia de ascenso
  const oldElo = user?.ratingOverall || 1820;
  const newElo = oldElo + 35;

  const handleReturnToRadar = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    onBackToRadar();
  };

  const handleShare = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    Alert.alert('Compartir', '¡Tu carta FUT actualizada está lista para tus historias de Instagram o WhatsApp!');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <Text style={styles.brandSmall}>MATCHSPORT</Text>
          <Text style={styles.brandTitle}>RANKING ELO</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellBtn}><Text style={styles.bellIcon}>🔔</Text></TouchableOpacity>
          <Image
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }}
            style={styles.avatarMini}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Match ID Pill */}
        <View style={styles.matchIdPill}>
          <Text style={styles.matchIdText}>🏆 MATCH #{match?.id?.slice(-4) || '9042'} FINAL</Text>
        </View>

        {/* Victory Header */}
        <Text style={styles.victoryTitle}>¡VICTORIA CONFIRMADA!</Text>
        <Text style={styles.matchResultSub}>
          Resultado Oficial: <Text style={styles.whiteText}>Equipo A (4) - (3) Equipo B</Text>
        </Text>
        <Text style={styles.venueSub}>
          🏟️ {match?.venueDistrict || 'Cancha El Golazo • Fútbol 7'}
        </Text>

        {/* Elo Calibration Card */}
        <View style={styles.eloCard}>
          <View style={styles.eloCardHeader}>
            <View style={styles.glickoTag}>
              <Text style={styles.glickoIcon}>⚡</Text>
              <Text style={styles.glickoTitle}>CALIBRACIÓN ELO{'\n'}Glicko-2 Dinámico</Text>
            </View>
            <View style={styles.ptsGainBadge}>
              <Text style={styles.ptsGainText}>+35 PTS GANADOS</Text>
            </View>
          </View>

          <View style={styles.eloNumbersRow}>
            <Text style={styles.oldEloText}>{oldElo}</Text>
            <Text style={styles.arrowText}>➔</Text>
            <Text style={styles.newEloText}>{newElo}</Text>
          </View>

          <View style={styles.rankProgressRow}>
            <Text style={styles.currentRankLabel}>AVANZADO III</Text>
            <View style={styles.rankProgressTrack}>
              <View style={styles.rankProgressFill} />
            </View>
            <Text style={styles.nextRankLabel}>MAESTRO I</Text>
          </View>
          <Text style={styles.progressPercentText}>85% A MAESTRO I</Text>
        </View>

        {/* Unlocked Peer-Review Stats (Blind Reveal) */}
        <View style={styles.unlockedSection}>
          <View style={styles.unlockedHeader}>
            <View style={styles.starBadge}>
              <Text style={styles.starIcon}>⭐</Text>
            </View>
            <View>
              <Text style={styles.unlockedTitle}>COMPAÑEROS DESTACARON...</Text>
              <Text style={styles.unlockedSubtitle}>Evaluaciones recibidas post-partido (Desbloqueadas)</Text>
            </View>
          </View>

          <View style={styles.feedbackCard}>
            <View style={styles.feedbackTopRow}>
              <View style={styles.statGainedBadge}>
                <Text style={styles.statGainedText}>⚡ +2 RITMO</Text>
              </View>
              <Text style={styles.mvpRole}>MVP DEL MEDIO</Text>
            </View>
            <Text style={styles.feedbackQuote}>
              "Excelente despliegue físico por las bandas y repliegue rápido durante todo el segundo tiempo."
            </Text>
          </View>

          <View style={styles.feedbackCard}>
            <View style={styles.feedbackTopRow}>
              <View style={[styles.statGainedBadge, styles.goldGainedBadge]}>
                <Text style={styles.goldGainedText}>🎯 +2 DEFINICIÓN</Text>
              </View>
              <Text style={styles.goleadorRole}>GOLEADOR</Text>
            </View>
            <Text style={styles.feedbackQuote}>
              "Clave en los dos goles del segundo tiempo, letal y frío en el mano a mano contra el portero."
            </Text>
          </View>

          <View style={styles.likeCard}>
            <View style={styles.likeIconBox}>
              <Text style={styles.likeIcon}>👍</Text>
            </View>
            <View>
              <Text style={styles.likeTitle}>+1 Like Deportivo</Text>
              <Text style={styles.likeSub}>Por juego limpio, puntualidad y compañerismo en cancha.</Text>
            </View>
          </View>
        </View>

        {/* Individual Performance Stats */}
        <View style={styles.performanceSection}>
          <View style={styles.perfHeaderRow}>
            <Text style={styles.perfHeaderTitle}>RENDIMIENTO INDIVIDUAL</Text>
            <Text style={styles.perfHeaderSub}>TITULAR • 45'</Text>
          </View>

          <View style={styles.perfGrid}>
            <View style={styles.perfBox}>
              <Text style={styles.perfIcon}>⚽</Text>
              <Text style={styles.perfVal}>2</Text>
              <Text style={styles.perfLabel}>GOLES</Text>
            </View>

            <View style={styles.perfBox}>
              <Text style={styles.perfIcon}>🤝</Text>
              <Text style={styles.perfVal}>1</Text>
              <Text style={styles.perfLabel}>ASIST.</Text>
            </View>

            <View style={styles.perfBox}>
              <Text style={styles.perfIcon}>🛡️</Text>
              <Text style={styles.perfVal}>0</Text>
              <Text style={styles.perfLabel}>FALTAS</Text>
            </View>

            <View style={styles.perfBox}>
              <Text style={styles.perfIcon}>⏱️</Text>
              <Text style={styles.perfVal}>45'</Text>
              <Text style={styles.perfLabel}>MINUTOS</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsCol}>
          <TouchableOpacity style={styles.returnRadarBtn} onPress={handleReturnToRadar} activeOpacity={0.85}>
            <Text style={styles.radarIcon}>🎯</Text>
            <Text style={styles.returnRadarText}>VOLVER AL RADAR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Text style={styles.shareIcon}>🔗</Text>
            <Text style={styles.shareText}>Compartir Carta Actualizada (IG / WhatsApp)</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  brandGroup: {},
  brandSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 14,
  },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 14,
  },
  matchIdPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
  },
  matchIdText: {
    color: THEME.colors.goldLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  victoryTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  matchResultSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
  },
  whiteText: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
  },
  venueSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: -8,
  },
  eloCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  eloCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glickoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glickoIcon: {
    fontSize: 16,
  },
  glickoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    lineHeight: 14,
  },
  ptsGainBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
  },
  ptsGainText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  eloNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 4,
  },
  oldEloText: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  arrowText: {
    fontSize: 20,
    color: THEME.colors.textSecondary,
  },
  newEloText: {
    fontSize: 36,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  rankProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentRankLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  rankProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.cardElevated,
    overflow: 'hidden',
  },
  rankProgressFill: {
    width: '85%',
    height: '100%',
    backgroundColor: THEME.colors.primary,
  },
  nextRankLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.goldLight,
  },
  progressPercentText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    textAlign: 'right',
  },
  unlockedSection: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  starBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 16,
  },
  unlockedTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  unlockedSubtitle: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
  },
  feedbackCard: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.md,
    padding: 10,
    gap: 6,
  },
  feedbackTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statGainedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statGainedText: {
    color: THEME.colors.goldLight,
    fontSize: 9,
    fontWeight: '900',
  },
  goldGainedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  goldGainedText: {
    color: THEME.colors.gold,
    fontSize: 9,
    fontWeight: '900',
  },
  mvpRole: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  goleadorRole: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  feedbackQuote: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  likeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.md,
    padding: 10,
    gap: 10,
  },
  likeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeIcon: {
    fontSize: 15,
  },
  likeTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  likeSub: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
  },
  performanceSection: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  perfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  perfHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  perfHeaderSub: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.gold,
  },
  perfGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  perfBox: {
    flex: 1,
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  perfIcon: {
    fontSize: 13,
  },
  perfVal: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  perfLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  actionsCol: {
    gap: 10,
    marginTop: 4,
  },
  returnRadarBtn: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  radarIcon: {
    fontSize: 16,
  },
  returnRadarText: {
    color: '#00210B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  shareBtn: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.cardBg,
    height: 48,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  shareIcon: {
    fontSize: 13,
  },
  shareText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
});
