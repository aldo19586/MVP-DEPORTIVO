import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

export default function CalibrationScreen({ user, onBack }) {
  const matchesPlayed = user?.matchesPlayed || 0;
  const isCalibrated = matchesPlayed >= 3;
  const currentRating = user?.ratingOverall || 1500;
  const currentOvr = user?.futStats?.ovr || 75;

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    onBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>SISTEMA DE CALIBRACIÓN</Text>
          <Text style={styles.headerSubtitle}>Algoritmo Glicko-2 & Peer Review Automático</Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner de Estado del Jugador */}
        <View style={[styles.calibrationStatusBox, isCalibrated && styles.calibratedBox]}>
          <View style={styles.statusBadgeRow}>
            <Text style={styles.statusBadgeIcon}>{isCalibrated ? '🏆' : '🎯'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBadgeTitle, isCalibrated && styles.calibratedTitle]}>
                {isCalibrated ? 'RATING OFICIAL CALIBRADO' : 'ESTADO: CALIBRANDO NIVEL'}
              </Text>
              <Text style={styles.statusBadgeSub}>
                {isCalibrated
                  ? `Rating Oficial: ${currentRating} pts • OVR FUT ${currentOvr}`
                  : `${matchesPlayed} de 3 partidos disputados (${Math.max(0, 3 - matchesPlayed)} restantes)`}
              </Text>
            </View>
          </View>

          {/* Barra visual de los 3 pasos de calibración */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, matchesPlayed >= 1 ? styles.stepDotDone : styles.stepDotActive]}>
                <Text style={styles.stepDotText}>{matchesPlayed >= 1 ? '✓' : '1'}</Text>
              </View>
              <Text style={styles.stepLabel}>Partido 1</Text>
              <Text style={styles.stepSub}>Ritmo base</Text>
            </View>

            <View style={[styles.stepLine, matchesPlayed >= 1 && styles.stepLineActive]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepDot, matchesPlayed >= 2 ? styles.stepDotDone : matchesPlayed === 1 ? styles.stepDotActive : styles.stepDotPending]}>
                <Text style={styles.stepDotText}>{matchesPlayed >= 2 ? '✓' : '2'}</Text>
              </View>
              <Text style={styles.stepLabel}>Partido 2</Text>
              <Text style={styles.stepSub}>Ajuste RD</Text>
            </View>

            <View style={[styles.stepLine, matchesPlayed >= 2 && styles.stepLineActive]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepDot, matchesPlayed >= 3 ? styles.stepDotDone : matchesPlayed === 2 ? styles.stepDotActive : styles.stepDotPending]}>
                <Text style={styles.stepDotText}>{matchesPlayed >= 3 ? '✓' : '3'}</Text>
              </View>
              <Text style={styles.stepLabel}>Partido 3</Text>
              <Text style={styles.stepSub}>Rating Oficial</Text>
            </View>
          </View>
        </View>

        {/* Aviso Importante: Puntuación Asignada Exclusivamente por el Sistema */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Text style={styles.noticeIcon}>🔒</Text>
            <Text style={styles.noticeTitle}>PUNTUACIÓN 100% OBJETIVA Y AUTOMÁTICA</Text>
          </View>
          <Text style={styles.noticeText}>
            En MatchSport, los jugadores <Text style={styles.boldText}>no pueden colocar ni inventar su propia puntuación</Text>. Para garantizar partidos equilibrados, competitivos y sin ventajas injustas, tu nivel es calculado exclusivamente por el sistema en función de tu rendimiento en la cancha.
          </Text>
        </View>

        {/* Los 3 Pilares del Sistema de Nivel */}
        <Text style={styles.sectionTitle}>¿CÓMO CALCULA EL SISTEMA TU NIVEL?</Text>

        <View style={styles.pillarCard}>
          <View style={styles.pillarIconBox}>
            <Text style={styles.pillarIcon}>⚡</Text>
          </View>
          <View style={styles.pillarContent}>
            <Text style={styles.pillarTitle}>1. Algoritmo Glicko-2 en Tiempo Real</Text>
            <Text style={styles.pillarDesc}>
              Analiza victorias, empates o derrotas ponderando el nivel del rival. Vencer a un rival de mayor nivel otorga mayor incremento de Elo que vencer a un equipo aficionado.
            </Text>
          </View>
        </View>

        <View style={styles.pillarCard}>
          <View style={styles.pillarIconBox}>
            <Text style={styles.pillarIcon}>🤝</Text>
          </View>
          <View style={styles.pillarContent}>
            <Text style={styles.pillarTitle}>2. Peer-Review de Capitanes y Jugadores</Text>
            <Text style={styles.pillarDesc}>
              Al finalizar cada pichanga o partido oficial, compañeros y rivales emiten una evaluación rápida y anónima de 1 toque sobre juego limpio, ritmo físico y destreza técnica.
            </Text>
          </View>
        </View>

        <View style={styles.pillarCard}>
          <View style={styles.pillarIconBox}>
            <Text style={styles.pillarIcon}>🛡️</Text>
          </View>
          <View style={styles.pillarContent}>
            <Text style={styles.pillarTitle}>3. Motor Antifraude y Desviación (RD)</Text>
            <Text style={styles.pillarDesc}>
              El sistema evalúa la regularidad competitiva para evitar cuentas infladas. Tu Carta FUT se actualiza automáticamente con atributos certificados y verificados.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleBack} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>ENTENDIDO • VOLVER A JUGAR</Text>
        </TouchableOpacity>
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
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16,
  },
  calibrationStatusBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    gap: 14,
  },
  calibratedBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadgeIcon: {
    fontSize: 26,
  },
  statusBadgeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  calibratedTitle: {
    color: '#06B6D4',
  },
  statusBadgeSub: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  stepDotActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
  },
  stepDotDone: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  stepDotPending: {
    borderColor: '#334155',
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  stepSub: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#334155',
    marginHorizontal: 6,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: THEME.colors.primary,
  },
  noticeCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 8,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeIcon: {
    fontSize: 16,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.6,
  },
  noticeText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  boldText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  pillarIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarIcon: {
    fontSize: 18,
  },
  pillarContent: {
    flex: 1,
    gap: 4,
  },
  pillarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pillarDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  confirmBtn: {
    backgroundColor: THEME.colors.primary,
    height: 50,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00210B',
    letterSpacing: 0.8,
  },
});
