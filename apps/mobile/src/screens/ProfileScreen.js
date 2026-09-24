import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

const MOCK_MATCH_HISTORY = [
  { id: 'm1', result: 'VICTORIA', delta: '+35 pts', score: '4 - 3', opponent: 'FC Miraflores', venue: 'Cancha El Golazo, Surco', date: 'Ayer • 08:30 PM' },
  { id: 'm2', result: 'VICTORIA', delta: '+30 pts', score: '5 - 2', opponent: 'La Reta SC', venue: 'Manuel Bonilla, Miraflores', date: '22 Sep • 09:00 PM' },
  { id: 'm3', result: 'DERROTA', delta: '-25 pts', score: '2 - 3', opponent: 'Surco United', venue: 'Polideportivo San Borja', date: '19 Sep • 07:30 PM' },
];

export default function ProfileScreen({ user, onLogout }) {
  const [activeSubTab, setActiveSubTab] = useState('card'); // 'card' | 'history'

  const stats = user?.futStats || {
    ovr: 84,
    rit: 86,
    tir: 84,
    pas: 80,
    reg: 83,
    def: 62,
    fis: 78
  };

  const handleLogout = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión actual en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: onLogout }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandSmall}>PERFIL DEL JUGADOR</Text>
          <Text style={styles.topTitle}>{user?.name || 'Carlos Mendoza'}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>SALIR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Giant FUT Gold Card */}
        <View style={styles.giantCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.giantOvr}>{stats.ovr || 84}</Text>
              <Text style={styles.giantPos}>{user?.position || 'DEL'}</Text>
              <Text style={styles.giantFlag}>🇵🇪 PER</Text>
            </View>

            <View style={styles.giantAvatarWrap}>
              <Image
                source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }}
                style={styles.giantAvatar}
              />
              <View style={styles.ovrBadgeCircle}>
                <Text style={styles.ovrBadgeText}>{stats.ovr || 84}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.giantName}>{user?.name || 'MATEO RAMOS'}</Text>
          <Text style={styles.giantSub}>{user?.district || 'Surco, Lima'} • {user?.email || 'jugador@matchsport.pe'}</Text>

          {/* DNI & Fair Play Chips */}
          <View style={styles.badgesRow}>
            <View style={styles.dniBadge}>
              <Text style={styles.dniIcon}>🛡️</Text>
              <Text style={styles.dniText}>{user?.dniVerified ? 'DNI VERIFICADO OFICIAL' : 'DNI EN VERIFICACIÓN'}</Text>
            </View>

            <View style={styles.fairPlayBadge}>
              <Text style={styles.fairPlayIcon}>👍</Text>
              <Text style={styles.fairPlayText}>{user?.likesCount || 14} Fair Play</Text>
            </View>
          </View>

          {/* 6 FUT Attributes Matrix */}
          <View style={styles.attributesMatrix}>
            <View style={styles.attrCol}>
              <Text style={styles.attrTitle}>RIT</Text>
              <Text style={styles.attrVal}>{stats.rit || 86}</Text>
            </View>
            <View style={styles.attrCol}>
              <Text style={styles.attrTitle}>TIR</Text>
              <Text style={[styles.attrVal, styles.goldVal]}>{stats.tir || 84}</Text>
            </View>
            <View style={styles.attrCol}>
              <Text style={styles.attrTitle}>PAS</Text>
              <Text style={styles.attrVal}>{stats.pas || 80}</Text>
            </View>
            <View style={styles.attrCol}>
              <Text style={styles.attrTitle}>REG</Text>
              <Text style={styles.attrVal}>{stats.reg || 83}</Text>
            </View>
            <View style={styles.attrCol}>
              <Text style={styles.attrTitle}>DEF</Text>
              <Text style={styles.attrVal}>{stats.def || 62}</Text>
            </View>
            <View style={styles.attrCol}>
              <Text style={styles.attrTitle}>FIS</Text>
              <Text style={styles.attrVal}>{stats.fis || 78}</Text>
            </View>
          </View>
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
              <Text style={styles.statLineLabel}>RATING GENERAL ELO</Text>
              <Text style={styles.statLineVal}>{user?.ratingOverall || 1820} Pts</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>PARTIDOS DISPUTADOS</Text>
              <Text style={styles.statLineVal}>32 Pichangas</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>TASA DE VICTORIAS (WINRATE)</Text>
              <Text style={styles.statLineGreen}>68.7%</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLineLabel}>CALIFICACIONES DE COMPAÑEROS</Text>
              <Text style={styles.statLineGold}>+28 Atributos Recibidos</Text>
            </View>
          </View>
        ) : (
          <View style={styles.historyList}>
            {MOCK_MATCH_HISTORY.map((match) => (
              <View key={match.id} style={styles.historyCard}>
                <View style={styles.historyTopRow}>
                  <View style={[styles.resultTag, match.result === 'VICTORIA' ? styles.resultTagWin : styles.resultTagLoss]}>
                    <Text style={[styles.resultText, match.result === 'VICTORIA' ? styles.resultTextWin : styles.resultTextLoss]}>
                      {match.result}
                    </Text>
                  </View>
                  <Text style={styles.matchScore}>{match.score}</Text>
                  <Text style={styles.matchDelta}>{match.delta}</Text>
                </View>

                <Text style={styles.opponentName}>vs {match.opponent}</Text>
                <Text style={styles.venueDate}>{match.venue} • {match.date}</Text>
              </View>
            ))}
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
