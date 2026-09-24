import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { THEME } from '../theme';

export default function PeerReviewScreen({ match, user, onVoteCompleted, onSkip }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [assignedData, setAssignedData] = useState(null);

  const ATTRIBUTES = [
    {
      id: 'Ritmo',
      title: 'Ritmo',
      icon: '⚡',
      badge: '+2 PTS',
      desc: 'Velocidad explosiva y resistencia en la banda'
    },
    {
      id: 'Definicion',
      title: 'Definición',
      icon: '🎯',
      badge: '+2 PTS',
      topBadge: 'TOP',
      desc: 'Gol, oportunismo y frialdad de cara al arco'
    },
    {
      id: 'Vision',
      title: 'Visión',
      icon: '👁️',
      badge: '+2 PTS',
      desc: 'Pases filtrados clave y distribución táctica'
    },
    {
      id: 'Defensa',
      title: 'Defensa',
      icon: '🛡️',
      badge: '+2 PTS',
      desc: 'Marca firme, presión alta y recuperación rápida'
    },
    {
      id: 'Habilidad',
      title: 'Habilidad',
      icon: '⭐',
      badge: '+2 PTS',
      desc: 'Regate en espacio reducido, gambeta y dominio'
    }
  ];

  useEffect(() => {
    // 1. Obtener la asignación circular del compañero asignado (A != B)
    (async () => {
      setLoading(true);
      try {
        const matchId = match?.id || 'demo_match_1';
        const res = await api.getPeerReviewAssignment(matchId, user?.id || 'demo_user_1');
        if (res) {
          setAssignedData(res);
        }
      } catch (err) {
        // Fallback demo si es offline
        setAssignedData({
          targetPlayer: {
            id: 'demo_user_2',
            name: 'Mateo Ramos',
            position: 'DEL',
            rating: 1840,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            futStats: { ovr: 84, rit: 86, tir: 84, pas: 80, reg: 83, def: 62, fis: 78 }
          },
          hasVoted: false
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [match?.id, user?.id]);

  const handleVote = async (attributeTag) => {
    if (submitting) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    setSelectedTag(attributeTag);
    setSubmitting(true);

    try {
      const matchId = match?.id || 'demo_match_1';
      const evaluatorId = user?.id || 'demo_user_1';

      // Enviar voto al backend
      const result = await api.submitPeerReview({
        matchId,
        evaluatorId,
        attributeTag
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      // Esperar 1.2 segundos para mostrar la confirmación visual de +2 antes de avanzar
      setTimeout(() => {
        onVoteCompleted({
          attributeGiven: attributeTag,
          ...result
        });
      }, 1200);
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo registrar el voto.');
      setSubmitting(false);
      setSelectedTag(null);
    }
  };

  const target = assignedData?.targetPlayer || {
    name: 'Mateo Ramos',
    position: 'DEL',
    futStats: { ovr: 84, rit: 86, tir: 84, pas: 80, reg: 83, def: 62, fis: 78 }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onSkip}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>DETALLE DEL PARTIDO</Text>
        <Image
          source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }}
          style={styles.avatarMini}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.derangementBadge}>
            <Text style={styles.badgeText}>⚡ EVALUACIÓN CIRCULAR DE COMPAÑERO</Text>
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.mainTitle}>
          ¿Cuál fue el punto más fuerte de tu compañero hoy?
        </Text>
        <Text style={styles.subTitle}>
          Tu voto es <Text style={styles.boldText}>100% anónimo</Text> y calibrará su carta oficial de FUT en el ranking global.
        </Text>

        {/* FUT Card of the Evaluated Teammate */}
        <View style={styles.futCard}>
          <View style={styles.futCardTop}>
            <View>
              <Text style={styles.cardOvr}>{target.futStats?.ovr || 84}</Text>
              <Text style={styles.cardPos}>{target.position || 'DEL'}</Text>
              <Text style={styles.cardCountry}>🇵🇪 PER</Text>
            </View>

            <View style={styles.cardAvatarWrapper}>
              <Image
                source={{ uri: target.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }}
                style={styles.cardAvatar}
              />
              <View style={styles.cardBallBadge}>
                <Text style={styles.cardBallIcon}>⚽</Text>
              </View>
            </View>
          </View>

          <Text style={styles.cardPlayerName}>{target.name}</Text>
          <Text style={styles.cardTeammateSub}>
            Tu compañero en <Text style={styles.teamGreen}>Equipo A • Turf Masters</Text>
          </Text>

          {/* Stats Bar */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>PAC</Text>
              <Text style={styles.statVal}>{target.futStats?.rit || 86}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>TIR</Text>
              <Text style={[styles.statVal, styles.goldVal]}>{target.futStats?.tir || 84}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>PAS</Text>
              <Text style={styles.statVal}>{target.futStats?.pas || 80}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>REG</Text>
              <Text style={styles.statVal}>{target.futStats?.reg || 83}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>DEF</Text>
              <Text style={styles.statVal}>{target.futStats?.def || 62}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>FIS</Text>
              <Text style={styles.statVal}>{target.futStats?.fis || 78}</Text>
            </View>
          </View>
        </View>

        {/* 1-Tap Attribute Selector Section */}
        <View style={styles.oneTapHeaderRow}>
          <Text style={styles.oneTapLabel}>TOCA 1 ATRIBUTO PARA SUMAR +2 PTS DIRECTOS:</Text>
          <View style={styles.oneTapBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.oneTapBadgeText}>1-Tap Voto</Text>
          </View>
        </View>

        {/* 5 Rapid Attribute Pills */}
        <View style={styles.attributesList}>
          {ATTRIBUTES.map((attr) => {
            const isSelected = selectedTag === attr.id;
            return (
              <TouchableOpacity
                key={attr.id}
                style={[
                  styles.attributeCard,
                  isSelected && styles.attributeCardSelected
                ]}
                onPress={() => handleVote(attr.id)}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <View style={styles.attrLeft}>
                  <View style={[styles.attrIconBox, isSelected && styles.attrIconBoxSelected]}>
                    <Text style={styles.attrIconText}>{attr.icon}</Text>
                  </View>
                  <View style={styles.attrInfo}>
                    <View style={styles.attrTitleRow}>
                      <Text style={[styles.attrTitle, isSelected && styles.attrTitleSelected]}>
                        {attr.title}
                      </Text>
                      <View style={styles.plusPointsBadge}>
                        <Text style={styles.plusPointsText}>{attr.badge}</Text>
                      </View>
                      {attr.topBadge && (
                        <View style={styles.topPill}>
                          <Text style={styles.topPillText}>{attr.topBadge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.attrDesc}>{attr.desc}</Text>
                  </View>
                </View>

                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Protocol Derangement Banner */}
        <View style={styles.protocolCard}>
          <Text style={styles.lockIcon}>🔒</Text>
          <View style={styles.protocolContent}>
            <View style={styles.protocolTitleRow}>
              <Text style={styles.protocolTitle}>Protocolo Derangement Activo</Text>
              <View style={styles.onlineDot} />
            </View>
            <Text style={styles.protocolDesc}>
              Sistema ciego anti-colusión. Nadie sabrá quién votó por quién hasta que los 10 jugadores cierren su tarjeta.
            </Text>
          </View>
        </View>

        {/* Omitir Valoración */}
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipText}>Omitir valoración (no sumará EXP extra)</Text>
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
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  avatarMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 12,
  },
  badgeRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  derangementBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  badgeText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 4,
  },
  subTitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  boldText: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
  },
  futCard: {
    backgroundColor: '#1E232D',
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
    marginVertical: 4,
    shadowColor: THEME.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  futCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardOvr: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.colors.gold,
    lineHeight: 34,
  },
  cardPos: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  cardCountry: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.gold,
    marginTop: 2,
  },
  cardAvatarWrapper: {
    position: 'relative',
  },
  cardAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: THEME.colors.gold,
  },
  cardBallBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBallIcon: {
    fontSize: 10,
  },
  cardPlayerName: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
    marginTop: 6,
  },
  cardTeammateSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  teamGreen: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 14, 20, 0.6)',
    borderRadius: THEME.radius.md,
    padding: 8,
    marginTop: 12,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  goldVal: {
    color: THEME.colors.gold,
  },
  oneTapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  oneTapLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  oneTapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  oneTapBadgeText: {
    color: THEME.colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  attributesList: {
    gap: 8,
  },
  attributeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  attributeCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  attrLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  attrIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrIconBoxSelected: {
    backgroundColor: THEME.colors.primary,
  },
  attrIconText: {
    fontSize: 16,
  },
  attrInfo: {
    flex: 1,
  },
  attrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attrTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  attrTitleSelected: {
    color: THEME.colors.primary,
  },
  plusPointsBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plusPointsText: {
    color: THEME.colors.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  topPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  topPillText: {
    color: THEME.colors.goldLight,
    fontSize: 8,
    fontWeight: '900',
  },
  attrDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: THEME.colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
  },
  protocolCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 27, 34, 0.8)',
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
    marginTop: 6,
  },
  lockIcon: {
    fontSize: 18,
  },
  protocolContent: {
    flex: 1,
  },
  protocolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  protocolTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  protocolDesc: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    lineHeight: 13,
    marginTop: 2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
});
