import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

/**
 * MatchSummaryScreen - Resumen de Victoria / ELO Glicko-2
 * Diseñado bajo el sistema "Obsidian Pitch & Neon FUT"
 * Inspirado en Google Stitch: matchsport_matchsummaryscreen_resumen_de_victoria_elo
 */
export default function MatchSummaryScreen({ match, user, reviewResult, onBackToRadar }) {
  // 1. Determinar el desenlace del partido (victoria, empate o derrota)
  const outcome = useMemo(() => {
    if (match?.outcome) return match.outcome; // 'win' | 'draw' | 'loss'

    const winnerTeam = match?.winnerTeam;
    const isUserTeamA = match?.teamA?.some?.(p => p.id === user?.id || p.userId === user?.id) || match?.userTeam === 'teamA';
    const isUserTeamB = match?.teamB?.some?.(p => p.id === user?.id || p.userId === user?.id) || match?.userTeam === 'teamB';

    if (winnerTeam === 'draw' || (match?.scoreTeamA !== undefined && match?.scoreTeamA === match?.scoreTeamB)) {
      return 'draw';
    }
    if (winnerTeam === 'teamA') {
      return isUserTeamB ? 'loss' : 'win';
    }
    if (winnerTeam === 'teamB') {
      return isUserTeamA ? 'loss' : 'win';
    }

    if (match?.scoreTeamA !== undefined && match?.scoreTeamB !== undefined) {
      if (match.scoreTeamA === match.scoreTeamB) return 'draw';
      if (isUserTeamB) {
        return match.scoreTeamB > match.scoreTeamA ? 'win' : 'loss';
      }
      return match.scoreTeamA > match.scoreTeamB ? 'win' : 'loss';
    }

    return 'win'; // Por defecto victoria para celebrar el ascenso y rating
  }, [match, user]);

  // Colores dinámicos según el resultado
  const outcomeConfig = useMemo(() => {
    switch (outcome) {
      case 'win':
        return {
          title: '¡VICTORIA!',
          accentColor: '#00FF87', // Neon Pitch
          haloColor: 'rgba(0, 255, 135, 0.22)',
          icon: '🏆',
          badgeText: 'Acta Validada ✓',
          statusLabel: 'Ganador',
          deltaSign: '+',
          defaultDelta: 24,
          baseBonusLabel: 'Victoria Base (Rival ELO equivalente)',
          baseBonusPts: '+18'
        };
      case 'draw':
        return {
          title: '¡EMPATE!',
          accentColor: '#FFD166', // Warm Gold / Yellow
          haloColor: 'rgba(255, 209, 102, 0.22)',
          icon: '🤝',
          badgeText: 'Acta Paritaria ✓',
          statusLabel: 'Empate',
          deltaSign: '+',
          defaultDelta: 4,
          baseBonusLabel: 'Punto de Empate (Paridad Glicko)',
          baseBonusPts: '+4'
        };
      case 'loss':
      default:
        return {
          title: 'DERROTA',
          accentColor: '#FF6B6B', // Coral Red
          haloColor: 'rgba(255, 107, 107, 0.22)',
          icon: '🛡️',
          badgeText: 'Acta Registrada ✓',
          statusLabel: 'Derrota',
          deltaSign: '-',
          defaultDelta: 14,
          baseBonusLabel: 'Ajuste de Partido (Rival ELO Superior)',
          baseBonusPts: '-18'
        };
    }
  }, [outcome]);

  // 2. Cálculos de ELO y Progresión Glicko-2
  const eloDelta = useMemo(() => {
    if (typeof reviewResult?.ratingChange === 'number') return reviewResult.ratingChange;
    if (typeof match?.glickoDelta === 'number') return match.glickoDelta;
    if (typeof match?.ratingDelta === 'number') return match.ratingDelta;
    return outcome === 'loss' ? -outcomeConfig.defaultDelta : outcomeConfig.defaultDelta;
  }, [reviewResult, match, outcome, outcomeConfig]);

  const oldElo = user?.ratingOverall || user?.ratingGlicko || 1516;
  const newElo = Math.max(800, oldElo + eloDelta);

  // Rangos de clasificación dinámicos
  const tierInfo = useMemo(() => {
    if (newElo >= 1800) {
      return { current: 'Diamante I', currentTierBase: 1800, next: 'Maestro I', nextTierElo: 2000 };
    }
    if (newElo >= 1650) {
      return { current: 'Oro I', currentTierBase: 1650, next: 'Diamante I', nextTierElo: 1800 };
    }
    if (newElo >= 1500) {
      return { current: 'Oro II', currentTierBase: 1500, next: 'Oro I', nextTierElo: 1650 };
    }
    if (newElo >= 1400) {
      return { current: 'Oro III', currentTierBase: 1400, next: 'Oro II', nextTierElo: 1500 };
    }
    if (newElo >= 1300) {
      return { current: 'Plata I', currentTierBase: 1300, next: 'Oro III', nextTierElo: 1400 };
    }
    if (newElo >= 1200) {
      return { current: 'Plata II', currentTierBase: 1200, next: 'Plata I', nextTierElo: 1300 };
    }
    return { current: 'Bronce I', currentTierBase: 1000, next: 'Plata II', nextTierElo: 1200 };
  }, [newElo]);

  const rangeSpan = Math.max(50, tierInfo.nextTierElo - tierInfo.currentTierBase);
  const currentProgress = Math.max(0, newElo - tierInfo.currentTierBase);
  const progressPercent = Math.min(99, Math.max(5, Math.round((currentProgress / rangeSpan) * 100)));
  const ptsRemaining = Math.max(0, tierInfo.nextTierElo - newElo);

  // 3. Marcador y nombres de equipos
  const teamAName = match?.teamAName || match?.teamA?.name || 'Galácticos FC';
  const teamBName = match?.teamBName || match?.teamB?.name || 'Furia Sur';
  const scoreA = match?.scoreTeamA !== undefined ? match.scoreTeamA : (outcome === 'loss' ? 1 : 4);
  const scoreB = match?.scoreTeamB !== undefined ? match.scoreTeamB : (outcome === 'loss' ? 3 : (outcome === 'draw' ? 2 : 2));

  const teamAInitials = teamAName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'GA';
  const teamBInitials = teamBName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FS';

  // 4. Datos del MVP del Partido
  const mvpData = useMemo(() => {
    if (match?.mvp) return match.mvp;
    if (reviewResult?.mvpPlayer) return reviewResult.mvpPlayer;
    return {
      name: outcome === 'win' && user?.name ? user.name : 'Mateo Silva',
      role: 'Delantero • ' + teamAName,
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      number: '#10',
      rating: '9.4',
      badge: 'MVP',
      consensusText: 'Unanimidad en evaluación circular (14 votos)',
      stats: {
        goals: 2,
        assists: 1,
        passes: '89%',
        fairPlay: '100%'
      }
    };
  }, [match, reviewResult, user, teamAName, outcome]);

  // 5. Recompensas tácticas
  const xpGained = reviewResult?.xpGained || 350;
  const sportCoinsGained = 150;
  const currentLevel = user?.level || 24;
  const nextLevel = currentLevel + 1;

  // Manejo de eventos
  const handleReturnToRadar = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    onBackToRadar?.();
  };

  const handleShare = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    Alert.alert(
      'Compartir Tarjeta ELO',
      `¡Tu rendimiento en el Match #${match?.id?.slice(-4) || '892'} (${newElo} ELO - ${tierInfo.current}) ha sido preparado para tus historias de Instagram y WhatsApp!`
    );
  };

  const handleOpenDispute = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
    Alert.alert(
      'Disputa Arbitral',
      '¿Deseas impugnar el marcador o reportar una conducta antideportiva ante el SuperAdmin?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir Disputa',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Disputa Ingresada',
              'El acta ha sido enviada al Tribunal del SuperAdmin para su revisión de video y testimonios.'
            );
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0E14" />

      {/* Halo atmosférico dinámico según el desenlace */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          { backgroundColor: outcomeConfig.haloColor }
        ]}
      />

      {/* Top Bar minimalista */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTag}>MATCHSPORT</Text>
          <Text style={styles.brandSubtitle}>ACTA OFICIAL</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.matchStatusPill}>
            <View style={[styles.pulsingDot, { backgroundColor: outcomeConfig.accentColor }]} />
            <Text style={styles.matchStatusText}>
              MATCH #{match?.id?.slice(-4)?.toUpperCase() || 'MST-892'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECCIÓN 1: BANNER DINÁMICO DE ESTADO & MARCADOR */}
        <View style={styles.resultBannerSection}>
          {/* Badge del Árbitro Federado */}
          <View style={styles.refereeBadge}>
            <Text style={styles.refereeIcon}>🛡️</Text>
            <Text style={styles.refereeText}>
              Árbitro Federado: {outcomeConfig.badgeText}
            </Text>
          </View>

          {/* Trofeo / Emblema central con halo */}
          <View style={styles.trophyEmblemWrapper}>
            <View
              style={[
                styles.trophyHaloRing,
                { backgroundColor: outcomeConfig.haloColor }
              ]}
            />
            <View style={styles.trophyBox}>
              <Text style={styles.trophyIcon}>{outcomeConfig.icon}</Text>
            </View>
            <View style={[styles.trophyStarBadge, { backgroundColor: outcomeConfig.accentColor }]}>
              <Text style={styles.trophyStarText}>★</Text>
            </View>
          </View>

          {/* Tipografía de Desenlace */}
          <Text style={[styles.outcomeTitle, { color: outcomeConfig.accentColor }]}>
            {outcomeConfig.title}
          </Text>
          <Text style={styles.matchCategorySubtitle}>
            {match?.league || match?.venueDistrict
              ? `${match?.venueDistrict || 'Sede Principal'} • Liga Nocturna`
              : 'Liga Nocturna de Campeones • Fase Grupos'}
          </Text>

          {/* MARCADOR FINAL DESTACADO */}
          <View style={styles.scoreboardCard}>
            {/* Equipo A */}
            <View style={styles.teamColumnLeft}>
              <View style={[styles.teamBadgeBox, styles.teamBadgeAlpha]}>
                <Text style={styles.teamInitialsText}>{teamAInitials}</Text>
              </View>
              <View style={styles.teamMetaColLeft}>
                <View style={styles.teamNameRow}>
                  <Text style={styles.teamNameText} numberOfLines={1}>
                    {teamAName}
                  </Text>
                  {scoreA >= scoreB && (
                    <Text style={[styles.winnerMiniCheck, { color: outcomeConfig.accentColor }]}>
                      ✓
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.teamOutcomeLabel,
                    scoreA > scoreB
                      ? { color: '#00FF87' }
                      : scoreA === scoreB
                      ? { color: '#FFD166' }
                      : { color: THEME.colors.textMuted }
                  ]}
                >
                  {scoreA > scoreB ? 'Ganador' : scoreA === scoreB ? 'Empate' : 'Derrota'}
                </Text>
              </View>
            </View>

            {/* Scoreboard Central Display */}
            <View style={styles.scorePill}>
              <Text
                style={[
                  styles.scoreNumText,
                  scoreA >= scoreB ? { color: outcomeConfig.accentColor } : styles.scoreNumMuted
                ]}
              >
                {scoreA}
              </Text>
              <Text style={styles.scoreDivider}>:</Text>
              <Text
                style={[
                  styles.scoreNumText,
                  scoreB >= scoreA ? { color: outcomeConfig.accentColor } : styles.scoreNumMuted
                ]}
              >
                {scoreB}
              </Text>
            </View>

            {/* Equipo B */}
            <View style={styles.teamColumnRight}>
              <View style={styles.teamMetaColRight}>
                <View style={styles.teamNameRowRight}>
                  {scoreB >= scoreA && (
                    <Text style={[styles.winnerMiniCheck, { color: outcomeConfig.accentColor }]}>
                      ✓
                    </Text>
                  )}
                  <Text style={styles.teamNameText} numberOfLines={1}>
                    {teamBName}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.teamOutcomeLabel,
                    scoreB > scoreA
                      ? { color: '#00FF87' }
                      : scoreB === scoreA
                      ? { color: '#FFD166' }
                      : { color: THEME.colors.textMuted }
                  ]}
                >
                  {scoreB > scoreA ? 'Ganador' : scoreB === scoreA ? 'Empate' : 'Derrota'}
                </Text>
              </View>
              <View style={[styles.teamBadgeBox, styles.teamBadgeBeta]}>
                <Text style={styles.teamInitialsText}>{teamBInitials}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECCIÓN 2: PANEL DE FLUCTUACIÓN DE RATING ELO GLICKO-2 */}
        <View style={styles.cardContainer}>
          {/* Card Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={styles.boltIconBox}>
                <Text style={styles.boltIcon}>⚡</Text>
              </View>
              <Text style={styles.cardTitleText}>VARIACIÓN DE RATING ELO</Text>
            </View>
            <View style={styles.glickoPill}>
              <Text style={styles.glickoPillText}>GLICKO-2</Text>
            </View>
          </View>

          {/* Banner de Delta Luminoso */}
          <View style={styles.deltaDisplayBanner}>
            <View
              style={[
                styles.deltaGlowCenter,
                { backgroundColor: outcomeConfig.haloColor }
              ]}
            />
            <View style={styles.deltaValueRow}>
              <Text style={[styles.deltaBigValue, { color: outcomeConfig.accentColor }]}>
                {eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`}
              </Text>
              <Text style={[styles.deltaSuffix, { color: outcomeConfig.accentColor }]}>
                PTS
              </Text>
            </View>
            <Text style={styles.deltaTransitionSub}>
              {oldElo} <Text style={{ color: outcomeConfig.accentColor }}>➔</Text> {newElo} ELO
            </Text>
          </View>

          {/* Rango Actual, Siguiente Rango y Barra de Progreso */}
          <View style={styles.rankDivisionBlock}>
            <View style={styles.rankDivisionLabelsRow}>
              <View style={styles.rankTierPath}>
                <Text style={styles.currentTierHighlight}>
                  {tierInfo.current} - {newElo} ELO
                </Text>
                <Text style={styles.tierArrowIcon}>➔</Text>
                <Text style={styles.nextTierDimmed}>{tierInfo.next}</Text>
              </View>
              <Text style={[styles.rankPercentText, { color: outcomeConfig.accentColor }]}>
                {progressPercent}%
              </Text>
            </View>

            {/* Barra de progreso técnica */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: outcomeConfig.accentColor
                  }
                ]}
              />
            </View>

            <View style={styles.progressBarFooter}>
              <Text style={styles.progressBaseText}>
                {tierInfo.currentTierBase} ELO (Base)
              </Text>
              <Text style={styles.progressRemainingText}>
                Faltan {ptsRemaining} pts para Ascenso
              </Text>
            </View>
          </View>

          {/* Desglose de Factores Glicko-2 */}
          <View style={styles.formulaBreakdownList}>
            <View style={styles.formulaRow}>
              <View style={styles.formulaLeftCol}>
                <Text style={styles.formulaIcon}>☑️</Text>
                <Text style={styles.formulaLabelText}>
                  {outcomeConfig.baseBonusLabel}
                </Text>
              </View>
              <Text style={[styles.formulaPtsVal, { color: outcomeConfig.accentColor }]}>
                {outcomeConfig.baseBonusPts}
              </Text>
            </View>

            <View style={styles.formulaRow}>
              <View style={styles.formulaLeftCol}>
                <Text style={styles.formulaIcon}>⚽</Text>
                <Text style={styles.formulaLabelText}>
                  Desempeño Individual (+2 Goles / Aportes)
                </Text>
              </View>
              <Text style={[styles.formulaPtsVal, { color: outcomeConfig.accentColor }]}>
                +5
              </Text>
            </View>

            <View style={styles.formulaRow}>
              <View style={styles.formulaLeftCol}>
                <Text style={styles.formulaIcon}>🤝</Text>
                <Text style={styles.formulaLabelText}>
                  Fair Play Bonificación (0 Faltas graves)
                </Text>
              </View>
              <Text style={[styles.formulaPtsVal, { color: outcomeConfig.accentColor }]}>
                +3
              </Text>
            </View>
          </View>
        </View>

        {/* SECCIÓN 3: TARJETA DEL MVP DEL PARTIDO */}
        <View style={styles.cardContainer}>
          {/* Card Header MVP */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.mvpHeaderStar}>⭐</Text>
              <Text style={styles.cardTitleText}>JUGADOR DEL PARTIDO</Text>
            </View>
            <View style={[styles.mvpRatingBadge, { backgroundColor: outcomeConfig.accentColor }]}>
              <Text style={styles.mvpRatingScore}>{mvpData.rating}</Text>
              <Text style={styles.mvpRatingTag}>MVP</Text>
            </View>
          </View>

          {/* Player Spotlight */}
          <View style={styles.playerSpotlightRow}>
            <View style={styles.playerAvatarContainer}>
              <Image
                source={{ uri: mvpData.avatar }}
                style={styles.playerAvatarImg}
              />
              <View style={styles.jerseyNumBadge}>
                <Text style={styles.jerseyNumText}>{mvpData.number || '#10'}</Text>
              </View>
            </View>

            <View style={styles.playerInfoCol}>
              <Text style={styles.playerNameText} numberOfLines={1}>
                {mvpData.name}
              </Text>
              <Text style={styles.playerRoleText} numberOfLines={1}>
                {mvpData.role}
              </Text>
              <View style={styles.consensusVoteRow}>
                <Text style={styles.voteBoxIcon}>🗳️</Text>
                <Text style={styles.voteBoxText} numberOfLines={1}>
                  {mvpData.consensusText || 'Unanimidad en evaluación circular (14 votos)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Match Stats Grid 4x1 */}
          <View style={styles.mvpStatsGrid}>
            <View style={styles.mvpStatTile}>
              <Text style={[styles.mvpStatValue, { color: outcomeConfig.accentColor }]}>
                {mvpData.stats?.goals ?? 2}
              </Text>
              <Text style={styles.mvpStatLabel}>Goles</Text>
            </View>

            <View style={styles.mvpStatTile}>
              <Text style={styles.mvpStatValue}>
                {mvpData.stats?.assists ?? 1}
              </Text>
              <Text style={styles.mvpStatLabel}>Asist.</Text>
            </View>

            <View style={styles.mvpStatTile}>
              <Text style={styles.mvpStatValue}>
                {mvpData.stats?.passes ?? '89%'}
              </Text>
              <Text style={styles.mvpStatLabel}>Pases</Text>
            </View>

            <View style={styles.mvpStatTile}>
              <Text style={[styles.mvpStatValue, { color: '#7DFFA2' }]}>
                {mvpData.stats?.fairPlay ?? '100%'}
              </Text>
              <Text style={styles.mvpStatLabel}>Fair Play</Text>
            </View>
          </View>
        </View>

        {/* SECCIÓN 4: RECOMPENSAS TÁCTICAS DEL MATCH */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitleText}>RECOMPENSAS DEL MATCH</Text>
            <View style={styles.claimedBadge}>
              <Text style={styles.claimedBadgeText}>RECLAMADO</Text>
            </View>
          </View>

          <View style={styles.rewardsList}>
            {/* SportCoins */}
            <View style={styles.rewardTile}>
              <View style={styles.rewardIconBox}>
                <Text style={styles.rewardIconEmoji}>🪙</Text>
              </View>
              <View style={styles.rewardContentCol}>
                <View style={styles.rewardTitleRow}>
                  <Text style={styles.rewardTitleText}>
                    +{sportCoinsGained} SportCoins
                  </Text>
                  <View style={styles.rewardBonusChip}>
                    <Text style={styles.rewardBonusChipText}>+Bonus MVP</Text>
                  </View>
                </View>
                <Text style={styles.rewardSubText}>
                  Crédito para reservas de cancha y canje de equipación
                </Text>
              </View>
            </View>

            {/* XP Progression */}
            <View style={styles.rewardTile}>
              <View style={styles.rewardIconBox}>
                <Text style={styles.rewardIconEmoji}>🎖️</Text>
              </View>
              <View style={styles.rewardContentCol}>
                <View style={styles.rewardTitleRow}>
                  <Text style={styles.rewardTitleText}>
                    +{xpGained} XP de Nivel
                  </Text>
                  <Text style={styles.levelProgressTag}>
                    Nivel {currentLevel} ➔ {nextLevel}
                  </Text>
                </View>
                <View style={styles.levelTrack}>
                  <View style={[styles.levelFill, { width: '82%' }]} />
                </View>
              </View>
            </View>

            {/* Badge Unlocked */}
            <View style={styles.rewardTile}>
              <View style={styles.rewardIconBox}>
                <Text style={styles.rewardIconEmoji}>🔥</Text>
              </View>
              <View style={styles.rewardContentCol}>
                <View style={styles.rewardTitleRow}>
                  <Text style={styles.rewardTitleText}>Racha Imparable (3W)</Text>
                  <View style={styles.newBadgePill}>
                    <Text style={styles.newBadgePillText}>NUEVA</Text>
                  </View>
                </View>
                <Text style={styles.rewardSubText}>
                  3 victorias consecutivas en torneos federados
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECCIÓN 5: BOTONES DE ACCIÓN (CTAs) & DISPUTA */}
        <View style={styles.actionsContainer}>
          {/* Botón Primario: CONTINUAR AL HUB DE JUEGO */}
          <TouchableOpacity
            style={[styles.primaryCtaBtn, { backgroundColor: outcomeConfig.accentColor }]}
            onPress={handleReturnToRadar}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryCtaText}>CONTINUAR AL HUB DE JUEGO</Text>
            <Text style={styles.primaryCtaArrow}>➔</Text>
          </TouchableOpacity>

          {/* Botón Secundario: COMPARTIR RESULTADO */}
          <TouchableOpacity
            style={styles.secondaryCtaBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryCtaIcon}>🔗</Text>
            <Text style={styles.secondaryCtaText}>COMPARTIR RESULTADO</Text>
          </TouchableOpacity>

          {/* Enlace para abrir Disputa Arbitral */}
          <TouchableOpacity
            style={styles.disputeLinkRow}
            onPress={handleOpenDispute}
            activeOpacity={0.7}
          >
            <Text style={styles.disputeFlagIcon}>🚩</Text>
            <Text style={styles.disputePromptText}>
              ¿Marcador incorrecto o conducta antirreglamentaria?{' '}
              <Text style={styles.disputeUnderlineText}>Abrir disputa arbitral</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14', // Surface Lowest (Obsidian Pitch)
  },
  ambientGlow: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    width: 340,
    height: 300,
    borderRadius: 170,
    opacity: 0.85,
    zIndex: -1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 8,
  },
  brandRow: {
    justifyContent: 'center',
  },
  brandTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00FF87',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191C22',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B9CBB9',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
    gap: 16,
  },

  /* SECCIÓN 1: BANNER DE RESULTADO */
  resultBannerSection: {
    alignItems: 'center',
    paddingTop: 4,
  },
  refereeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  refereeIcon: {
    fontSize: 12,
  },
  refereeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7DFFA2',
    letterSpacing: 0.2,
  },
  trophyEmblemWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  trophyHaloRing: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  trophyBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#191C22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  trophyIcon: {
    fontSize: 32,
  },
  trophyStarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyStarText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0B0E14',
  },
  outcomeTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 6,
    textAlign: 'center',
  },
  matchCategorySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
  },

  /* MARCADOR */
  scoreboardCard: {
    width: '100%',
    backgroundColor: '#191C22', // Surface Low
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamColumnLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamColumnRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  teamBadgeBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D2026',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  teamBadgeAlpha: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  teamBadgeBeta: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  teamInitialsText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F9FAFB',
  },
  teamMetaColLeft: {
    flex: 1,
  },
  teamMetaColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamNameRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  teamNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F9FAFB',
    flexShrink: 1,
  },
  winnerMiniCheck: {
    fontSize: 13,
    fontWeight: '900',
  },
  teamOutcomeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0E14',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  scoreNumText: {
    fontSize: 24,
    fontWeight: '900',
  },
  scoreNumMuted: {
    color: '#9CA3AF',
  },
  scoreDivider: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
    paddingBottom: 2,
  },

  /* CONTENEDOR DE TARJETAS COMÚN */
  cardContainer: {
    backgroundColor: '#191C22', // Surface Low
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boltIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#272A31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltIcon: {
    fontSize: 14,
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.4,
  },
  glickoPill: {
    backgroundColor: '#1D2026',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  glickoPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B9CBB9',
    letterSpacing: 0.5,
  },

  /* GLOWING DELTA BANNER */
  deltaDisplayBanner: {
    backgroundColor: '#0B0E14',
    borderRadius: THEME.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  deltaGlowCenter: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 70,
    borderRadius: 35,
    opacity: 0.6,
  },
  deltaValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  deltaBigValue: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  deltaSuffix: {
    fontSize: 16,
    fontWeight: '800',
  },
  deltaTransitionSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 2,
  },

  /* PROGRESIÓN DE RANGO */
  rankDivisionBlock: {
    gap: 6,
    marginTop: 2,
  },
  rankDivisionLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankTierPath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentTierHighlight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  tierArrowIcon: {
    fontSize: 11,
    color: '#00FF87',
  },
  nextTierDimmed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  rankPercentText: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1D2026',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBaseText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  progressRemainingText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
  },

  /* FORMULA BREAKDOWN CHIPS */
  formulaBreakdownList: {
    gap: 6,
    paddingTop: 4,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1D2026',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
  },
  formulaLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  formulaIcon: {
    fontSize: 12,
  },
  formulaLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E1E2EB',
    flexShrink: 1,
  },
  formulaPtsVal: {
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 8,
  },

  /* TARJETA MVP */
  mvpHeaderStar: {
    fontSize: 15,
  },
  mvpRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  mvpRatingScore: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0B0E14',
  },
  mvpRatingTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0B0E14',
  },
  playerSpotlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  playerAvatarContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#272A31',
  },
  playerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  jerseyNumBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0B0E14',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  jerseyNumText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00FF87',
  },
  playerInfoCol: {
    flex: 1,
    gap: 2,
  },
  playerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  playerRoleText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  consensusVoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  voteBoxIcon: {
    fontSize: 12,
  },
  voteBoxText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7DFFA2',
    flexShrink: 1,
  },
  mvpStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  mvpStatTile: {
    flex: 1,
    backgroundColor: '#0B0E14',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  mvpStatValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F9FAFB',
  },
  mvpStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#849585',
  },

  /* RECOMPENSAS DEL MATCH */
  claimedBadge: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  claimedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00FF87',
    letterSpacing: 0.6,
  },
  rewardsList: {
    gap: 8,
  },
  rewardTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2026',
    borderRadius: THEME.radius.sm,
    padding: 10,
    gap: 12,
  },
  rewardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#272A31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconEmoji: {
    fontSize: 18,
  },
  rewardContentCol: {
    flex: 1,
    gap: 2,
  },
  rewardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  rewardBonusChip: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  rewardBonusChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00FF87',
  },
  rewardSubText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  levelProgressTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7DFFA2',
  },
  levelTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0B0E14',
    overflow: 'hidden',
    marginTop: 4,
  },
  levelFill: {
    height: '100%',
    backgroundColor: '#7DFFA2',
    borderRadius: 3,
  },
  newBadgePill: {
    backgroundColor: '#0B0E14',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  newBadgePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00FF87',
  },

  /* CTAS & ACCIONES */
  actionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  primaryCtaBtn: {
    height: 52,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryCtaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00210B',
    letterSpacing: 0.8,
  },
  primaryCtaArrow: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00210B',
  },
  secondaryCtaBtn: {
    height: 48,
    borderRadius: THEME.radius.md,
    backgroundColor: '#272A31',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryCtaIcon: {
    fontSize: 14,
  },
  secondaryCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.5,
  },
  disputeLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  disputeFlagIcon: {
    fontSize: 12,
  },
  disputePromptText: {
    fontSize: 11,
    color: '#849585',
    textAlign: 'center',
  },
  disputeUnderlineText: {
    color: '#B9CBB9',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
});
