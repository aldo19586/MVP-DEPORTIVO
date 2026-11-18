import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { THEME } from '../theme';

export default function ProfileScreen({ user, onLogout, onOpenLeaderboard, onNavigateToPlay }) {
  const [activeSubTab, setActiveSubTab] = useState('card'); // 'card' | 'history'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const stats = user?.futStats || null;
  const isEstimated = !user?.matchesPlayed || user.matchesPlayed === 0;

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoadingHistory(true);
    api.getUserMatches(user.id)
      .then(res => {
        if (active && res?.matches) {
          setHistory(res.matches);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => { active = false; };
  }, [user?.id]);

  const handleLogout = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión actual en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: onLogout }
    ]);
  };

  const matchesCount = user?.matchesPlayed || 0;
  const winsCount = user?.wins || 0;
  const drawsCount = user?.draws || 0;
  const lossesCount = user?.losses || 0;
  const winRate = matchesCount > 0 ? ((winsCount / matchesCount) * 100).toFixed(1) : '0.0';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandSmall}>PERFIL DEL JUGADOR</Text>
          <Text style={styles.topTitle}>{user?.name || 'Mi Perfil'}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>SALIR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Giant FUT Card */}
        <View style={styles.giantCard}>
          {isEstimated && (
            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: THEME.colors.primary, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 10 }}>
              <Text style={{ color: THEME.colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>🎯 NIVEL INICIAL ESTIMADO</Text>
            </View>
          )}

          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.giantOvr}>{stats?.ovr ? stats.ovr : (user?.hasCompletedTest ? '65' : '--')}</Text>
              <Text style={styles.giantPos}>{user?.position || 'DEL'}</Text>
              <Text style={styles.giantFlag}>🇵🇪 PER</Text>
            </View>

            <View style={styles.giantAvatarWrap}>
              <Image
                source={{ uri: user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.name || 'jugador')}` }}
                style={styles.giantAvatar}
              />
              <View style={styles.ovrBadgeCircle}>
                <Text style={styles.ovrBadgeText}>{stats?.ovr ? stats.ovr : (user?.hasCompletedTest ? '65' : '--')}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.giantName}>{user?.name || 'JUGADOR'}</Text>
          <Text style={styles.giantSub}>{user?.district || 'Surco, Lima'}{user?.email ? ` • ${user.email}` : ''}</Text>

          {isEstimated && (
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 4, marginBottom: 8 }}>
              Este nivel evolucionará conforme disputes partidos oficiales en cancha.
            </Text>
          )}

          {/* DNI & Fair Play Chips */}
          <View style={styles.badgesRow}>
            <View style={styles.dniBadge}>
              <Text style={styles.dniIcon}>🛡️</Text>
              <Text style={styles.dniText}>{user?.verifiedDni ? 'DNI VERIFICADO OFICIAL' : 'DNI EN VERIFICACIÓN'}</Text>
            </View>

            <View style={styles.fairPlayBadge}>
              <Text style={styles.fairPlayIcon}>👍</Text>
              <Text style={styles.fairPlayText}>{user?.likesCount || 0} Fair Play</Text>
            </View>
          </View>

          {/* 6 FUT Attributes Matrix */}
          {stats ? (
            <View style={styles.attributesMatrix}>
              <View style={styles.attrCol}>
                <Text style={styles.attrTitle}>RIT</Text>
                <Text style={styles.attrVal}>{stats.rit}</Text>
              </View>
              <View style={styles.attrCol}>
                <Text style={styles.attrTitle}>TIR</Text>
                <Text style={[styles.attrVal, styles.goldVal]}>{stats.tir}</Text>
              </View>
              <View style={styles.attrCol}>
                <Text style={styles.attrTitle}>PAS</Text>
                <Text style={styles.attrVal}>{stats.pas}</Text>
              </View>
              <View style={styles.attrCol}>
                <Text style={styles.attrTitle}>REG</Text>
                <Text style={styles.attrVal}>{stats.reg}</Text>
              </View>
              <View style={styles.attrCol}>
                <Text style={styles.attrTitle}>DEF</Text>
                <Text style={styles.attrVal}>{stats.def}</Text>
              </View>
              <View style={styles.attrCol}>
                <Text style={styles.attrTitle}>FIS</Text>
                <Text style={styles.attrVal}>{stats.fis}</Text>
              </View>
            </View>
          ) : (
            <View style={{ padding: 14, backgroundColor: THEME.colors.cardElevated, borderRadius: 8, marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                Test inicial de nivel pendiente. Completa el test de 14 preguntas para activar los 6 atributos de tu carta.
              </Text>
            </View>
          )}
        </View>

        {/* Sub-tab Switcher: Carta vs Historial */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            style={[styles.subTabBtn, activeSubTab === 'card' && styles.subTabBtnActive]}
            onPress={() => setActiveSubTab('card')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'card' && styles.subTabTextActive]}>
              ESTADÍSTICAS GLICKO-2
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabBtn, activeSubTab === 'history' && styles.subTabBtnActive]}
            onPress={() => setActiveSubTab('history')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'history' && styles.subTabTextActive]}>
              HISTORIAL DE PARTIDOS
            </Text>
          </TouchableOpacity>
        </View>

        {activeSubTab === 'card' ? (
          <View style={styles.statsCard}>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>RATING GENERAL GLICKO-2</Text>
              <Text style={styles.statLineVal}>{Math.round(user?.ratingOverall || user?.ratingGlicko || 1200)} Pts</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>PARTIDOS DISPUTADOS</Text>
              <Text style={styles.statLineVal}>{matchesCount} {matchesCount === 1 ? 'partido' : 'partidos'}</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>BALANCE OFICIAL</Text>
              <Text style={styles.statLineVal}>{winsCount}V - {drawsCount}E - {lossesCount}D</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>TASA DE VICTORIAS (WINRATE)</Text>
              <Text style={styles.statLineGreen}>{winRate}%</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>CALIFICACIONES DE COMPAÑEROS</Text>
              <Text style={styles.statLineGold}>+{user?.likesCount || 0} Fair Play</Text>
            </View>

            {onOpenLeaderboard && (
              <TouchableOpacity
                style={styles.leaderboardLinkBtn}
                onPress={onOpenLeaderboard}
                activeOpacity={0.8}
              >
                <Text style={styles.leaderboardLinkText}>🏆 Ver Tabla de Posiciones y Clasificación</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.historyList}>
            {loadingHistory ? (
              <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 30 }} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Text style={styles.emptyHistoryIcon}>📋</Text>
                <Text style={styles.emptyHistoryTitle}>Sin partidos registrados</Text>
                <Text style={styles.emptyHistoryText}>
                  Tus partidos finalizados con marcadores oficiales y variaciones de rating se mostrarán aquí.
                </Text>
                {onNavigateToPlay && (
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={onNavigateToPlay}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyActionText}>Explorar Convocatorias en Jugar ➔</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              history.map((m) => {
                const isDraw = m.outcome === 'draw';
                const isWin = (m.winnerTeam && ((m.myTeam === 'teamA' && m.winnerTeam === 'teamA') || (m.myTeam === 'teamB' && m.winnerTeam === 'teamB'))) || m.result === 'VICTORIA';
                const resultText = isDraw ? 'EMPATE' : (isWin ? 'VICTORIA' : 'DERROTA');
                const scoreDisplay = m.finalScore ? `${m.finalScore.teamA} - ${m.finalScore.teamB}` : (m.score || '-');

                return (
                  <View key={m.id} style={styles.historyCard}>
                    <View style={styles.historyTopRow}>
                      <View style={[styles.resultTag, isDraw ? styles.resultTagDraw : (isWin ? styles.resultTagWin : styles.resultTagLoss)]}>
                        <Text style={[styles.resultText, isDraw ? styles.resultTextDraw : (isWin ? styles.resultTextWin : styles.resultTextLoss)]}>
                          {resultText}
                        </Text>
                      </View>
                      <Text style={styles.matchScore}>{scoreDisplay}</Text>
                      {m.ratingChange !== undefined && (
                        <Text style={styles.matchDelta}>
                          {m.ratingChange >= 0 ? `+${Math.round(m.ratingChange)}` : `${Math.round(m.ratingChange)}`} pts
                        </Text>
                      )}
                    </View>

                    <Text style={styles.opponentName}>{m.venue?.name || m.venueName || 'Cancha oficial'}</Text>
                    <Text style={styles.venueDate}>{m.district || 'Lima'} • {m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : 'Reciente'}</Text>
                  </View>
                );
              })
            )}
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  brandSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: THEME.colors.dangerLight,
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 16,
  },
  giantCard: {
    backgroundColor: '#1E232D',
    borderRadius: THEME.radius.xl,
    padding: 18,
    borderWidth: 2,
    borderColor: THEME.colors.gold,
    shadowColor: THEME.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  giantOvr: {
    fontSize: 38,
    fontWeight: '900',
    color: THEME.colors.gold,
    lineHeight: 40,
  },
  giantPos: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  giantFlag: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.gold,
    marginTop: 2,
  },
  giantAvatarWrap: {
    position: 'relative',
  },
  giantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: THEME.colors.gold,
  },
  ovrBadgeCircle: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: THEME.colors.gold,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovrBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  giantName: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  giantSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  dniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 4,
  },
  dniIcon: {
    fontSize: 11,
  },
  dniText: {
    color: THEME.colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  fairPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 4,
  },
  fairPlayIcon: {
    fontSize: 11,
  },
  fairPlayText: {
    color: THEME.colors.goldLight,
    fontSize: 9,
    fontWeight: '800',
  },
  attributesMatrix: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 14, 20, 0.6)',
    borderRadius: THEME.radius.md,
    padding: 10,
    marginTop: 8,
  },
  attrCol: {
    alignItems: 'center',
  },
  attrTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  attrVal: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  goldVal: {
    color: THEME.colors.gold,
  },
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.radius.sm,
  },
  subTabBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  subTabText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  subTabTextActive: {
    color: '#00210B',
  },
  statsCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLineLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  statLineVal: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  statLineGreen: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  statLineGold: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  resultTagWin: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  resultTagLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  resultTagDraw: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  resultText: {
    fontSize: 9,
    fontWeight: '900',
  },
  resultTextWin: {
    color: THEME.colors.primary,
  },
  resultTextLoss: {
    color: THEME.colors.dangerLight,
  },
  resultTextDraw: {
    color: THEME.colors.gold,
  },
  leaderboardLinkBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  leaderboardLinkText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyHistoryCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
    marginVertical: 10,
  },
  emptyHistoryIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyHistoryTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyHistoryText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  emptyActionText: {
    color: '#00210B',
    fontSize: 12,
    fontWeight: '800',
  },
  matchScore: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  matchDelta: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.gold,
  },
  opponentName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  venueDate: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
});
