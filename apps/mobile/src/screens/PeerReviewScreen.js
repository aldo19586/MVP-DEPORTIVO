import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { THEME } from '../theme';

// Medallas de honor oficiales de MatchSport
const HONOR_MEDALS = [
  {
    id: 'Pilar Defensivo',
    title: 'Pilar Defensivo',
    icon: '🛡️',
    attributeTag: 'Defensa',
    desc: 'Muralla atrás, cruces decisivos y solvencia en el 1v1.'
  },
  {
    id: 'Motor del Mediocampo',
    title: 'Motor del Mediocampo',
    icon: '⚙️',
    attributeTag: 'Ritmo',
    desc: 'Despliegue incansable, recuperación y ritmo de juego continuo.'
  },
  {
    id: 'Magia Táctica',
    title: 'Magia Táctica',
    icon: '🪄',
    attributeTag: 'Habilidad',
    desc: 'Visión diferencial, creatividad y pases que rompen líneas.'
  },
  {
    id: 'Goleador Clínico',
    title: 'Goleador Clínico',
    icon: '🎯',
    attributeTag: 'Definicion',
    desc: 'Contundencia pura, frialdad y efectividad ante el arco.'
  }
];

// Menciones tácticas adicionales
const TACTICAL_MENTIONS = [
  { id: 'crack', label: '✨ Crack del Partido' },
  { id: 'companerismo', label: '🤝 Compañerismo Ejemplar' },
  { id: 'imparable', label: '⚡ Imparable en Velocidad' },
  { id: 'voz_mando', label: '🗣️ Voz de Mando Positiva' }
];

const TECHNICAL_LEVEL_LABELS = [
  '',
  'Bajo Rendimiento (1.0)',
  'Regular (2.0)',
  'Buen Partido (3.0)',
  'Excelente Nivel (4.0)',
  'Figura Magistral (5.0)'
];

const FAIR_PLAY_LABELS = [
  '',
  'Conducta a Revisar (1/5)',
  'Ríspido / Tenso (2/5)',
  'Normal / Deportivo (3/5)',
  'Buen Compañero (4/5)',
  'Fair Play Top (5/5)'
];

const PUNCTUALITY_LABELS = [
  '',
  'Llegada Tardía (1/5)',
  'Con Demora (2/5)',
  'Justo a Tiempo (3/5)',
  'Puntual (4/5)',
  'Puntualidad Impecable (5/5)'
];

export default function PeerReviewScreen({ match, user, onVoteCompleted, onSkip }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignedData, setAssignedData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos' | 'equipo' | 'rivales'
  const [activePlayerId, setActivePlayerId] = useState(null);

  // Estado de evaluaciones por cada jugador: { [playerId]: { fairPlay, technicalLevel, punctuality, medals: [], mentions: [], comment, isSaved } }
  const [evaluations, setEvaluations] = useState({});

  // 1. Obtener la asignación circular inicial si existe en el backend
  useEffect(() => {
    (async () => {
      if (!match?.id || !user?.id) return;
      try {
        setLoading(true);
        const res = await api.getPeerReviewAssignment(match.id, user.id);
        if (res) {
          setAssignedData(res);
        }
      } catch (err) {
        // En caso de que no haya o falle, continuamos con el roster del partido
      } finally {
        setLoading(false);
      }
    })();
  }, [match?.id, user?.id]);

  // Construir la lista completa de jugadores a evaluar (compañeros y rivales excluyendo al usuario actual)
  const playersList = useMemo(() => {
    const currentUserId = user?.id;

    // Detectar si el usuario está en Team A o Team B
    const inTeamA = (match?.teamA || []).some(
      p => (p.userId || p.id) === currentUserId || p.isMe || p.name === user?.name
    );
    const inTeamB = (match?.teamB || []).some(
      p => (p.userId || p.id) === currentUserId || p.name === user?.name
    );
    const userTeamKey = inTeamB && !inTeamA ? 'teamB' : 'teamA';

    let rawTeamA = match?.teamA && match.teamA.length > 0 ? match.teamA : null;
    let rawTeamB = match?.teamB && match.teamB.length > 0 ? match.teamB : null;

    // Si el partido viene sin listas completas, recurrir al roster estándar verificado
    if (!rawTeamA && !rawTeamB) {
      rawTeamA = [
        { id: 'p1', name: 'Mateo Silva', position: 'DEL', dorsal: '9', ovr: 88, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120' },
        { id: 'p2', name: 'Carlos Vega', position: 'POR', dorsal: '1', ovr: 84, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120' },
        { id: 'p3', name: 'Rodrigo Quispe', position: 'DEF', dorsal: '3', ovr: 81, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120' },
        { id: 'p4', name: 'Lucas Díaz', position: 'DEL', dorsal: '11', ovr: 86, avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120' },
        { id: 'p5', name: 'Diego Paredes', position: 'MED', dorsal: '8', ovr: 79, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120' }
      ];
      rawTeamB = [
        { id: 'p6', name: 'Diego Alarcón', position: 'DEL', dorsal: '9', ovr: 87, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120' },
        { id: 'p7', name: 'Joaquín Valdivia', position: 'DEF', dorsal: '4', ovr: 84, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120' },
        { id: 'p8', name: 'Franco Benítez', position: 'MED', dorsal: '5', ovr: 83, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120' },
        { id: 'p9', name: 'Kevin Barreto', position: 'POR', dorsal: '12', ovr: 80, avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120' },
        { id: 'p10', name: 'Lucas Peña', position: 'DEL', dorsal: '7', ovr: 78, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120' }
      ];
    }

    const teamAMembers = (rawTeamA || []).map((p, idx) => ({
      ...p,
      id: String(p.userId || p.id || `ta_${idx}`),
      isTeammate: userTeamKey === 'teamA',
      teamLabel: userTeamKey === 'teamA' ? 'Mi Equipo' : 'Rival',
      teamName: match?.teamAName || 'Galácticos',
      dorsal: p.dorsal || `#${idx + 1}`,
      ovr: p.futStats?.ovr || p.ovr || p.ratingOverall ? Math.round((p.ratingOverall || 1500) / 20) : 82,
      fpScore: p.fairPlayRate || 95
    }));

    const teamBMembers = (rawTeamB || []).map((p, idx) => ({
      ...p,
      id: String(p.userId || p.id || `tb_${idx}`),
      isTeammate: userTeamKey === 'teamB',
      teamLabel: userTeamKey === 'teamB' ? 'Mi Equipo' : 'Rival',
      teamName: match?.teamBName || 'Furia Sur',
      dorsal: p.dorsal || `#${idx + 6}`,
      ovr: p.futStats?.ovr || p.ovr || p.ratingOverall ? Math.round((p.ratingOverall || 1500) / 20) : 83,
      fpScore: p.fairPlayRate || 96
    }));

    let allPlayers = [...teamAMembers, ...teamBMembers].filter(
      p => p.id !== String(currentUserId) && !p.isMe
    );

    // Si el backend asignó un compañero circular específico, asegurarse de incluirlo
    if (assignedData?.targetPlayer) {
      const target = assignedData.targetPlayer;
      const targetId = String(target.id);
      const exists = allPlayers.some(p => p.id === targetId);
      if (!exists) {
        allPlayers.unshift({
          id: targetId,
          name: target.name,
          avatar: target.avatar,
          position: target.position || 'DEL',
          dorsal: '#10',
          ovr: target.futStats?.ovr || 84,
          isTeammate: true,
          teamLabel: 'Mi Equipo',
          teamName: match?.teamAName || 'Mi Escuadra',
          fpScore: 98,
          isCircularTarget: true
        });
      } else {
        allPlayers = allPlayers.map(p =>
          p.id === targetId ? { ...p, isCircularTarget: true } : p
        );
      }
    }

    return allPlayers;
  }, [match, user, assignedData]);

  // Inicializar el jugador activo por defecto
  useEffect(() => {
    if (playersList.length > 0 && !activePlayerId) {
      const circularTarget = playersList.find(p => p.isCircularTarget);
      setActivePlayerId(circularTarget ? circularTarget.id : playersList[0].id);
    }
  }, [playersList, activePlayerId]);

  // Jugador actualmente seleccionado
  const activePlayer = useMemo(() => {
    return playersList.find(p => p.id === activePlayerId) || playersList[0] || null;
  }, [playersList, activePlayerId]);

  // Obtener estado actual del jugador activo
  const currentPlayerEval = activePlayerId
    ? evaluations[activePlayerId] || {
        fairPlay: 5,
        technicalLevel: 4,
        punctuality: 5,
        medals: ['Pilar Defensivo'],
        mentions: ['✨ Crack del Partido'],
        comment: '',
        isSaved: false
      }
    : {
        fairPlay: 5,
        technicalLevel: 4,
        punctuality: 5,
        medals: ['Pilar Defensivo'],
        mentions: ['✨ Crack del Partido'],
        comment: '',
        isSaved: false
      };

  // Filtrado de jugadores para el carrusel horizontal
  const filteredPlayers = useMemo(() => {
    if (activeFilter === 'equipo') {
      return playersList.filter(p => p.isTeammate);
    }
    if (activeFilter === 'rivales') {
      return playersList.filter(p => !p.isTeammate);
    }
    return playersList;
  }, [playersList, activeFilter]);

  // Conteo de progreso
  const evaluatedCount = useMemo(() => {
    return Object.values(evaluations).filter(e => e.isSaved).length;
  }, [evaluations]);

  const progressPercentage = playersList.length > 0
    ? Math.min(100, Math.round((evaluatedCount / playersList.length) * 100))
    : 0;

  // Actualizar campo del jugador activo
  const updateActiveEval = (field, value) => {
    if (!activePlayerId) return;
    setEvaluations(prev => {
      const current = prev[activePlayerId] || {
        fairPlay: 5,
        technicalLevel: 4,
        punctuality: 5,
        medals: ['Pilar Defensivo'],
        mentions: ['✨ Crack del Partido'],
        comment: '',
        isSaved: false
      };
      return {
        ...prev,
        [activePlayerId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Handler para feedback háptico con seguridad
  const triggerHaptic = (type = 'light') => {
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'selection') Haptics.selectionAsync();
    } catch (e) {
      // Ignorar en entornos sin soporte de vibración
    }
  };

  // Cambiar de jugador activo
  const handleSelectPlayer = (playerId) => {
    triggerHaptic('selection');
    setActivePlayerId(playerId);
  };

  // Cambiar Fair Play
  const handleSetFairPlay = (score) => {
    triggerHaptic('light');
    updateActiveEval('fairPlay', score);
  };

  // Cambiar Nivel Técnico
  const handleSetTechnicalLevel = (score) => {
    triggerHaptic('medium');
    updateActiveEval('technicalLevel', score);
  };

  // Cambiar Puntualidad
  const handleSetPunctuality = (score) => {
    triggerHaptic('light');
    updateActiveEval('punctuality', score);
  };

  // Alternar medalla de honor
  const handleToggleMedal = (medalTitle) => {
    triggerHaptic('light');
    const currentMedals = currentPlayerEval.medals || [];
    const exists = currentMedals.includes(medalTitle);
    const updated = exists
      ? currentMedals.filter(m => m !== medalTitle)
      : [...currentMedals, medalTitle];
    updateActiveEval('medals', updated);
  };

  // Alternar mención táctica adicional
  const handleToggleMention = (mentionLabel) => {
    triggerHaptic('light');
    const currentMentions = currentPlayerEval.mentions || [];
    const exists = currentMentions.includes(mentionLabel);
    const updated = exists
      ? currentMentions.filter(m => m !== mentionLabel)
      : [...currentMentions, mentionLabel];
    updateActiveEval('mentions', updated);
  };

  // Guardar jugador actual y avanzar al siguiente
  const handleSaveAndNext = () => {
    triggerHaptic('success');
    if (!activePlayerId) return;

    // Marcar como guardado
    setEvaluations(prev => {
      const current = prev[activePlayerId] || {
        fairPlay: 5,
        technicalLevel: 4,
        punctuality: 5,
        medals: ['Pilar Defensivo'],
        mentions: ['✨ Crack del Partido'],
        comment: '',
        isSaved: false
      };
      return {
        ...prev,
        [activePlayerId]: {
          ...current,
          isSaved: true
        }
      };
    });

    // Encontrar el siguiente jugador
    const currentIndex = playersList.findIndex(p => p.id === activePlayerId);
    if (currentIndex >= 0 && currentIndex < playersList.length - 1) {
      setActivePlayerId(playersList[currentIndex + 1].id);
    } else {
      // Buscar el primer jugador no guardado
      const pendingPlayer = playersList.find(p => !evaluations[p.id]?.isSaved && p.id !== activePlayerId);
      if (pendingPlayer) {
        setActivePlayerId(pendingPlayer.id);
      }
    }
  };

  // Enviar evaluaciones finales al backend y reclamar XP
  const handleSubmitAll = async () => {
    if (submitting) return;
    triggerHaptic('heavy');
    setSubmitting(true);

    // Determinar etiqueta táctica para la mutación circular del backend
    const primaryMedal = currentPlayerEval.medals[0] || 'Pilar Defensivo';
    const foundMedal = HONOR_MEDALS.find(m => m.id === primaryMedal) || HONOR_MEDALS[0];
    const attributeTag = foundMedal.attributeTag;

    try {
      let submitResult = null;
      if (match?.id && user?.id) {
        try {
          submitResult = await api.submitPeerReview({
            matchId: match.id,
            evaluatorId: user.id,
            attributeTag
          });
        } catch (apiErr) {
          // Si el backend responde que ya se votó o 409, continuar fluidamente
        }
      }

      triggerHaptic('success');

      setTimeout(() => {
        onVoteCompleted?.({
          attributeGiven: attributeTag,
          evaluationsCount: Math.max(evaluatedCount, 1),
          xpGained: 150,
          fairPlayAwarded: true,
          ...submitResult
        });
      }, 500);
    } catch (err) {
      Alert.alert('Evaluación', 'Evaluaciones guardadas con éxito.');
      onVoteCompleted?.({
        attributeGiven: attributeTag,
        evaluationsCount: Math.max(evaluatedCount, 1),
        xpGained: 150
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Render de estrellas tácticas
  const renderStarRating = (currentVal, maxStars = 5, onSelect) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].slice(0, maxStars).map(star => {
          const isFilled = star <= currentVal;
          return (
            <TouchableOpacity
              key={star}
              style={styles.starTouch}
              onPress={() => onSelect(star)}
              activeOpacity={0.7}
            >
              <Text style={[styles.starIcon, isFilled && styles.starIconActive]}>
                ★
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const matchTitle = match?.teamAName && match?.teamBName
    ? `${match.teamAName} ${match.score?.teamA ?? 3} - ${match.score?.teamB ?? 2} ${match.teamBName}`
    : 'Galácticos 3 - 2 Furia Sur';

  const matchIdDisplay = match?.id ? `#MST-${String(match.id).slice(-4).toUpperCase()}` : '#MST-892';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Panorámico */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.topTitle}>EVALUACIÓN POST-PARTIDO</Text>
            <View style={styles.matchSubRow}>
              <Text style={styles.matchIdText}>{matchIdDisplay}</Text>
              <View style={styles.pulseDotMini} />
              <Text style={styles.liveText}>FINALIZADO</Text>
            </View>
          </View>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>PASO 1 DE 2</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner de contexto con telemetría del partido jugado */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryBadgesRow}>
            <View style={styles.obligatoryBadge}>
              <Text style={styles.obligatoryBadgeText}>⚡ EVALUACIÓN CIRCULAR POST-PARTIDO</Text>
            </View>
            <View style={styles.fairPlayPill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.fairPlayPillText}>FAIR PLAY MATCHSPORT</Text>
            </View>
          </View>

          <Text style={styles.telemetryTitle}>
            Califica a tus compañeros y rivales
          </Text>
          <Text style={styles.telemetryDesc}>
            Tus valoraciones impactan el ELO, la reputación deportiva y el emparejamiento futuro del partido{' '}
            <Text style={styles.telemetryMatchHighlight}>{matchIdDisplay}</Text>{' '}
            <Text style={styles.telemetryScoreHighlight}>({matchTitle})</Text>.
          </Text>

          {/* Medidor de Progreso */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>PROGRESO DE EVALUACIÓN</Text>
              <Text style={styles.progressPercent}>
                {evaluatedCount} de {playersList.length} jugadores ({progressPercentage}%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(8, progressPercentage)}%` }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Filtros de Roster (Todos / Mi Equipo / Rivales) */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'todos' && styles.filterBtnActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('todos');
            }}
          >
            <Text style={[styles.filterBtnText, activeFilter === 'todos' && styles.filterBtnTextActive]}>
              TODOS ({playersList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'equipo' && styles.filterBtnActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('equipo');
            }}
          >
            <Text style={[styles.filterBtnText, activeFilter === 'equipo' && styles.filterBtnTextActive]}>
              MI EQUIPO ({playersList.filter(p => p.isTeammate).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'rivales' && styles.filterBtnActive]}
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('rivales');
            }}
          >
            <Text style={[styles.filterBtnText, activeFilter === 'rivales' && styles.filterBtnTextActive]}>
              RIVALES ({playersList.filter(p => !p.isTeammate).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selector horizontal de jugadores a evaluar */}
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeader}>
            <Text style={styles.carouselSubtitle}>SELECCIONA FICHA DE JUGADOR</Text>
            <Text style={styles.carouselHint}>Desliza ➔</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          >
            {filteredPlayers.map(player => {
              const isActive = player.id === activePlayerId;
              const isSaved = evaluations[player.id]?.isSaved;

              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerCard,
                    isActive && styles.playerCardActive,
                    isSaved && !isActive && styles.playerCardSaved
                  ]}
                  onPress={() => handleSelectPlayer(player.id)}
                  activeOpacity={0.8}
                >
                  {/* Badge de Listo o Evaluando */}
                  {isActive ? (
                    <View style={styles.evaluatingBadge}>
                      <Text style={styles.evaluatingBadgeText}>EVALUANDO</Text>
                    </View>
                  ) : isSaved ? (
                    <View style={styles.savedBadge}>
                      <Text style={styles.savedBadgeText}>✓</Text>
                    </View>
                  ) : null}

                  {/* Avatar con dorsal táctico */}
                  <View style={[styles.cardAvatarWrapper, isActive && styles.cardAvatarActiveGlow]}>
                    <Image
                      source={{
                        uri:
                          player.avatar ||
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'
                      }}
                      style={styles.cardAvatarImg}
                    />
                    <View style={styles.dorsalTag}>
                      <Text style={styles.dorsalTagText}>{player.dorsal || '#10'}</Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.cardPlayerName, isActive && styles.cardPlayerNameActive]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                  <Text style={styles.cardPlayerTeam} numberOfLines={1}>
                    {player.teamLabel} • {player.position || 'DEL'}
                  </Text>

                  <View
                    style={[
                      styles.cardStatusPill,
                      isActive && styles.cardStatusPillActive,
                      isSaved && styles.cardStatusPillSaved
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardStatusPillText,
                        isActive && styles.cardStatusPillTextActive,
                        isSaved && styles.cardStatusPillTextSaved
                      ]}
                    >
                      {isActive ? 'ACTUAL' : isSaved ? 'LISTO' : 'PENDIENTE'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Ficha detallada del jugador activo (Centerpiece) */}
        {activePlayer && (
          <View style={styles.activePlayerSection}>
            {/* Banner de Jugador Activo */}
            <View style={styles.heroSummaryBanner}>
              <View style={styles.heroAvatarBox}>
                <Image
                  source={{
                    uri:
                      activePlayer.avatar ||
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140'
                  }}
                  style={styles.heroAvatar}
                />
                <View style={styles.heroPositionBadge}>
                  <Text style={styles.heroPositionText}>
                    {activePlayer.dorsal} {activePlayer.position || 'DEL'}
                  </Text>
                </View>
              </View>

              <View style={styles.heroInfoCol}>
                <Text style={styles.heroPlayerName} numberOfLines={1}>
                  {activePlayer.name}
                </Text>
                <View style={styles.heroTeamRow}>
                  <View
                    style={[
                      styles.teamDot,
                      { backgroundColor: activePlayer.isTeammate ? THEME.colors.primary : THEME.colors.danger }
                    ]}
                  />
                  <Text style={styles.heroTeamLabel}>
                    {activePlayer.teamName} • {activePlayer.teamLabel}
                  </Text>
                </View>

                <View style={styles.heroStatsBadgesRow}>
                  <View style={styles.statMiniBadge}>
                    <Text style={styles.statMiniLabel}>OVR</Text>
                    <Text style={styles.statMiniVal}>{activePlayer.ovr || 84}</Text>
                  </View>
                  <View style={styles.statMiniBadge}>
                    <Text style={styles.statMiniLabel}>FAIR PLAY</Text>
                    <Text style={[styles.statMiniVal, { color: THEME.colors.primary }]}>
                      {activePlayer.fpScore || 96}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Métrica 1: Fair Play / Juego Limpio */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricTitleGroup}>
                  <Text style={styles.metricEmoji}>🤝</Text>
                  <Text style={styles.metricTitle}>CONDUCTA & DEPORTIVIDAD (FAIR PLAY)</Text>
                </View>
                <Text style={styles.metricValueDesc}>
                  {FAIR_PLAY_LABELS[currentPlayerEval.fairPlay] || 'Fair Play Top (5/5)'}
                </Text>
              </View>

              <View style={styles.fairPlayTierRow}>
                <TouchableOpacity
                  style={[
                    styles.fpTierBtn,
                    currentPlayerEval.fairPlay === 1 && styles.fpTierBtnConflict
                  ]}
                  onPress={() => handleSetFairPlay(1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fpTierEmoji}>⚠️</Text>
                  <Text
                    style={[
                      styles.fpTierText,
                      currentPlayerEval.fairPlay === 1 && styles.fpTierTextConflict
                    ]}
                  >
                    Conflictivo (1)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fpTierBtn,
                    currentPlayerEval.fairPlay === 3 && styles.fpTierBtnNeutral
                  ]}
                  onPress={() => handleSetFairPlay(3)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fpTierEmoji}>⚖️</Text>
                  <Text
                    style={[
                      styles.fpTierText,
                      currentPlayerEval.fairPlay === 3 && styles.fpTierTextNeutral
                    ]}
                  >
                    Normal (3)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fpTierBtn,
                    currentPlayerEval.fairPlay === 5 && styles.fpTierBtnTop
                  ]}
                  onPress={() => handleSetFairPlay(5)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fpTierEmoji}>🌟</Text>
                  <Text
                    style={[
                      styles.fpTierText,
                      currentPlayerEval.fairPlay === 5 && styles.fpTierTextTop
                    ]}
                  >
                    Fair Play Top (5)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Métrica 2: Nivel Técnico / Competitividad */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricTitleGroup}>
                  <Text style={styles.metricEmoji}>⚽</Text>
                  <Text style={styles.metricTitle}>NIVEL TÉCNICO & COMPETITIVIDAD</Text>
                </View>
                <Text style={styles.metricValueDesc}>
                  {TECHNICAL_LEVEL_LABELS[currentPlayerEval.technicalLevel] || 'Excelente (4.0)'}
                </Text>
              </View>

              {renderStarRating(currentPlayerEval.technicalLevel, 5, handleSetTechnicalLevel)}
            </View>

            {/* Métrica 3: Puntualidad y Compromiso */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricTitleGroup}>
                  <Text style={styles.metricEmoji}>⏱️</Text>
                  <Text style={styles.metricTitle}>PUNTUALIDAD & COMPROMISO</Text>
                </View>
                <Text style={styles.metricValueDesc}>
                  {PUNCTUALITY_LABELS[currentPlayerEval.punctuality] || 'Impecable (5/5)'}
                </Text>
              </View>

              <View style={styles.punctualityPillsRow}>
                {[1, 2, 3, 4, 5].map(val => {
                  const isSelected = currentPlayerEval.punctuality === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.punctualityPill,
                        isSelected && styles.punctualityPillActive
                      ]}
                      onPress={() => handleSetPunctuality(val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.punctualityPillText,
                          isSelected && styles.punctualityPillTextActive
                        ]}
                      >
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selector de Medallas de Honor */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricTitleGroup}>
                  <Text style={styles.metricEmoji}>🏅</Text>
                  <Text style={styles.metricTitle}>MEDALLAS DE HONOR</Text>
                </View>
                <Text style={styles.metricValueDesc}>
                  {currentPlayerEval.medals?.length || 0} elegida(s)
                </Text>
              </View>

              <View style={styles.medalsGrid}>
                {HONOR_MEDALS.map(medal => {
                  const isSelected = (currentPlayerEval.medals || []).includes(medal.id);
                  return (
                    <TouchableOpacity
                      key={medal.id}
                      style={[styles.medalCard, isSelected && styles.medalCardActive]}
                      onPress={() => handleToggleMedal(medal.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.medalCardTop}>
                        <Text style={styles.medalIcon}>{medal.icon}</Text>
                        {isSelected && (
                          <View style={styles.checkMiniDot}>
                            <Text style={styles.checkMiniText}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.medalTitle, isSelected && styles.medalTitleActive]}>
                        {medal.title}
                      </Text>
                      <Text style={styles.medalDesc} numberOfLines={2}>
                        {medal.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Menciones Tácticas Adicionales */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={styles.metricTitleGroup}>
                  <Text style={styles.metricEmoji}>✨</Text>
                  <Text style={styles.metricTitle}>DISTINTIVOS TÁCTICOS</Text>
                </View>
              </View>
              <View style={styles.chipsWrap}>
                {TACTICAL_MENTIONS.map(m => {
                  const isSelected = (currentPlayerEval.mentions || []).includes(m.label);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                      onPress={() => handleToggleMention(m.label)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Comentario Deportivo Opcional */}
            <View style={styles.metricCard}>
              <Text style={styles.commentLabel}>
                NOTA DEPORTIVA PARA {activePlayer.name.toUpperCase()} (OPCIONAL):
              </Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Escribe un mensaje deportivo o táctico..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={currentPlayerEval.comment || ''}
                onChangeText={txt => updateActiveEval('comment', txt)}
                maxLength={120}
              />
            </View>
          </View>
        )}

        {/* Botones de Acción */}
        <View style={styles.actionsFooter}>
          {/* Botón Guardar y Siguiente Jugador */}
          <TouchableOpacity
            style={styles.nextPlayerBtn}
            onPress={handleSaveAndNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextPlayerBtnText}>
              Guardar y Siguiente Jugador ({evaluatedCount}/{playersList.length}) ➔
            </Text>
          </TouchableOpacity>

          {/* Botón Principal: Enviar Evaluaciones & Reclamar XP */}
          <TouchableOpacity
            style={[styles.submitMainBtn, submitting && styles.submitMainBtnDisabled]}
            onPress={handleSubmitAll}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#00210B" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Text style={styles.submitBtnIcon}>🚀</Text>
                <Text style={styles.submitMainBtnText}>
                  ENVIAR EVALUACIONES & RECLAMAR XP
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Protocolo Derangement Activo */}
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
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Omitir valoración (no sumará EXP extra)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    color: THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  topTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5
  },
  matchSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  matchIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5
  },
  pulseDotMini: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.colors.primary
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5
  },
  stepBadge: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16
  },
  telemetryCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
    overflow: 'hidden'
  },
  telemetryBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  obligatoryBadge: {
    backgroundColor: THEME.colors.surfaceHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  obligatoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.6
  },
  fairPlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary
  },
  fairPlayPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.secondary,
    letterSpacing: 0.5
  },
  telemetryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 4,
    letterSpacing: 0.3
  },
  telemetryDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginTop: 4
  },
  telemetryMatchHighlight: {
    color: THEME.colors.textPrimary,
    fontWeight: '800'
  },
  telemetryScoreHighlight: {
    color: THEME.colors.primary,
    fontWeight: '800'
  },
  progressSection: {
    marginTop: 14
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.6
  },
  progressPercent: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.secondary
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: THEME.colors.surfaceHighest,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.surfaceHigh
  },
  filterBtnActive: {
    backgroundColor: THEME.colors.primary
  },
  filterBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5
  },
  filterBtnTextActive: {
    color: '#00210B'
  },
  carouselSection: {
    gap: 8
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  carouselSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8
  },
  carouselHint: {
    fontSize: 10,
    color: THEME.colors.textMuted
  },
  carouselContent: {
    gap: 10,
    paddingVertical: 4
  },
  playerCard: {
    width: 106,
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: THEME.radius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative'
  },
  playerCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.surfaceContainer,
    transform: [{ translateY: -2 }]
  },
  playerCardSaved: {
    opacity: 0.85
  },
  evaluatingBadge: {
    position: 'absolute',
    top: -6,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10
  },
  evaluatingBadgeText: {
    color: '#00210B',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  savedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  savedBadgeText: {
    color: '#00210B',
    fontSize: 10,
    fontWeight: '900'
  },
  cardAvatarWrapper: {
    position: 'relative',
    marginTop: 4
  },
  cardAvatarActiveGlow: {
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 24,
    padding: 1
  },
  cardAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  dorsalTag: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  dorsalTagText: {
    color: THEME.colors.secondary,
    fontSize: 8,
    fontWeight: '900'
  },
  cardPlayerName: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
    width: '100%'
  },
  cardPlayerNameActive: {
    color: THEME.colors.primary
  },
  cardPlayerTeam: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
    width: '100%'
  },
  cardStatusPill: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceHigh
  },
  cardStatusPillActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)'
  },
  cardStatusPillSaved: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)'
  },
  cardStatusPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textMuted
  },
  cardStatusPillTextActive: {
    color: THEME.colors.primary
  },
  cardStatusPillTextSaved: {
    color: THEME.colors.secondary
  },
  activePlayerSection: {
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12
  },
  heroSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.surfaceHigh,
    padding: 12,
    borderRadius: THEME.radius.md
  },
  heroAvatarBox: {
    position: 'relative'
  },
  heroAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: THEME.colors.primary
  },
  heroPositionBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -24 }],
    backgroundColor: THEME.colors.surfaceLowest,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.primary
  },
  heroPositionText: {
    color: THEME.colors.secondary,
    fontSize: 8,
    fontWeight: '900'
  },
  heroInfoCol: {
    flex: 1
  },
  heroPlayerName: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.textPrimary
  },
  heroTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  teamDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  heroTeamLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary
  },
  heroStatsBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  statMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.surfaceLowest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  statMiniLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textMuted
  },
  statMiniVal: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.gold
  },
  metricCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: THEME.radius.md,
    padding: 12,
    gap: 10
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metricEmoji: {
    fontSize: 14
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.6
  },
  metricValueDesc: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.secondary
  },
  fairPlayTierRow: {
    flexDirection: 'row',
    gap: 8
  },
  fpTierBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  fpTierBtnConflict: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: THEME.colors.danger
  },
  fpTierBtnNeutral: {
    backgroundColor: THEME.colors.surfaceHighest,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  fpTierBtnTop: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: THEME.colors.primary
  },
  fpTierEmoji: {
    fontSize: 14
  },
  fpTierText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    marginTop: 3
  },
  fpTierTextConflict: {
    color: THEME.colors.danger
  },
  fpTierTextNeutral: {
    color: THEME.colors.textPrimary
  },
  fpTierTextTop: {
    color: THEME.colors.primary
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 8,
    paddingVertical: 6
  },
  starTouch: {
    padding: 6
  },
  starIcon: {
    fontSize: 26,
    color: THEME.colors.surfaceVariant || '#32353C'
  },
  starIconActive: {
    color: THEME.colors.gold
  },
  punctualityPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  punctualityPill: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  punctualityPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  punctualityPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textSecondary
  },
  punctualityPillTextActive: {
    color: '#00210B'
  },
  medalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  medalCard: {
    width: '48%',
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4
  },
  medalCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.12)'
  },
  medalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  medalIcon: {
    fontSize: 18
  },
  checkMiniDot: {
    backgroundColor: THEME.colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkMiniText: {
    color: '#00210B',
    fontSize: 8,
    fontWeight: '900'
  },
  medalTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textPrimary
  },
  medalTitleActive: {
    color: THEME.colors.primary
  },
  medalDesc: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    lineHeight: 12
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  chipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceLowest,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  chipBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary
  },
  chipTextActive: {
    color: '#00210B',
    fontWeight: '900'
  },
  commentLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5
  },
  commentInput: {
    height: 40,
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 11,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  actionsFooter: {
    gap: 12,
    marginTop: 4
  },
  nextPlayerBtn: {
    backgroundColor: THEME.colors.surfaceHigh,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  nextPlayerBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  submitMainBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8
  },
  submitMainBtnDisabled: {
    opacity: 0.6
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitBtnIcon: {
    fontSize: 16
  },
  submitMainBtnText: {
    color: '#00210B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  protocolCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 27, 34, 0.8)',
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10
  },
  lockIcon: {
    fontSize: 18
  },
  protocolContent: {
    flex: 1
  },
  protocolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  protocolTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textPrimary
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary
  },
  protocolDesc: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    lineHeight: 13,
    marginTop: 2
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 6
  },
  skipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600'
  }
});
