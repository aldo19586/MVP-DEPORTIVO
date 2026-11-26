import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

export default function MatchRoomScreen({ match, currentUser, onMatchFinished, onOpenDispute }) {
  // Pestañas principales de la pantalla táctica
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'chat' | 'report'
  const [selectedRosterTeam, setSelectedRosterTeam] = useState('teamA');
  const [chatChannel, setChatChannel] = useState('global'); // 'global' | 'team'

  // Marcador y cronómetro en vivo
  const [matchMinutes, setMatchMinutes] = useState(68);
  const [matchSeconds, setMatchSeconds] = useState(24);
  const [scoreA, setScoreA] = useState(match?.scoreA ?? 3);
  const [scoreB, setScoreB] = useState(match?.scoreB ?? 2);

  // Chat y mensajes
  const [messages, setMessages] = useState(
    (match?.chatMessages || []).length > 0
      ? match.chatMessages.map(msg => ({ ...msg, sender: msg.senderName || msg.sender, time: msg.timestamp || 'Ahora' }))
      : [
          {
            id: 'm1',
            sender: 'Diego Alarcón',
            role: 'Capitán Naranja',
            team: 'teamB',
            text: 'Buena jugada en el 3-2, pero ojo que el rebote pegó en la mano antes de cruzar la línea 👀',
            time: "64'"
          },
          {
            id: 'm2',
            sender: 'Árbitro Federado Carlos P.',
            role: 'Oficial MatchSport',
            team: 'referee',
            text: 'Aviso oficial: Gol convalidado por posición reglamentaria. Quedan 2\' + 3\' de adición.',
            time: "66'"
          },
          {
            id: 'm3',
            sender: "Rodrigo 'Rayo'",
            role: 'Lateral Verde',
            team: 'teamA',
            text: 'Lucas entra ya mismo para cerrar la banda derecha. ¡Agrupémonos atrás!',
            time: "67'"
          },
          {
            id: 'm4',
            sender: currentUser?.name || 'Mateo Silva',
            role: 'Tú (Delantero)',
            team: 'teamA',
            isMe: true,
            text: '¡A cerrar líneas muchachos! Quedan pocos minutos, cero faltas cerca al área.',
            time: "67'"
          }
        ]
  );
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef(null);

  // Modales
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSent, setDisputeSent] = useState(false);
  const [finalizeModalVisible, setFinalizeModalVisible] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState('teamA');

  // Alineaciones de escuadras
  const teamAPlayers = match?.teamA || [
    { id: 'p1', name: 'Mateo Silva', position: 'DEL', rating: 1840, ovr: 88, statText: '2 GOLES • 1 ASIST', scoreStar: '8.9', isMe: true, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120' },
    { id: 'p2', name: 'Carlos "Gato" Vega', position: 'POR', rating: 1780, ovr: 84, statText: '5 ATAJADAS', scoreStar: '7.8', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120' },
    { id: 'p3', name: 'Rodrigo Quispe', position: 'DEF', rating: 1810, ovr: 81, statText: '6 RECUPERAC.', scoreStar: '7.4', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120' },
    { id: 'p4', name: 'Lucas "Tanque" Díaz', position: 'DEL', rating: 1860, ovr: 86, statText: '1 ASISTENCIA', scoreStar: '8.1', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120' },
    { id: 'p5', name: 'Diego Paredes', position: 'MED', rating: 1590, ovr: 79, statText: '92% PASES PRECISOS', scoreStar: '7.1', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120' }
  ];

  const teamBPlayers = match?.teamB || [
    { id: 'p6', name: 'Diego Alarcón', position: 'DEL', rating: 1820, ovr: 87, statText: '1 GOL • CAPITÁN', scoreStar: '8.3', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120' },
    { id: 'p7', name: 'Joaquín Valencia', position: 'MED', rating: 1750, ovr: 82, statText: '1 GOL (61\')', scoreStar: '7.9', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120' },
    { id: 'p8', name: 'Franco Benítez', position: 'DEF', rating: 1800, ovr: 83, statText: '5 RECUPERAC.', scoreStar: '7.5', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120' },
    { id: 'p9', name: 'Kevin Barreto', position: 'POR', rating: 1690, ovr: 80, statText: '3 ATAJADAS', scoreStar: '7.2', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120' }
  ];

  // Identificar si el usuario logueado pertenece al Equipo A o B
  const isUserInTeamA = teamAPlayers.some(
    p => p.isMe || p.id === currentUser?.id || p.userId === currentUser?.id || p.name === currentUser?.name
  );
  const isUserInTeamB = teamBPlayers.some(
    p => p.id === currentUser?.id || p.userId === currentUser?.id || p.name === currentUser?.name
  );

  // Línea de tiempo de eventos / goleadores
  const matchEvents = [
    { id: 'e1', minute: "14'", player: 'M. Silva', team: 'A', type: 'GOL' },
    { id: 'e2', minute: "28'", player: 'D. Alarcón', team: 'B', type: 'GOL' },
    { id: 'e3', minute: "39'", player: 'Rodrigo (P)', team: 'A', type: 'PENALTI' },
    { id: 'e4', minute: "55'", player: 'M. Silva', team: 'A', type: 'GOL' },
    { id: 'e5', minute: "61'", player: 'Joaquín V.', team: 'B', type: 'GOL' }
  ];

  // Sincronización WebSockets en tiempo real
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !match) return;

    socket.emit('joinMatchRoom', { matchId: match.id });

    const handleMatchFinished = (data) => {
      if (data.matchId !== match.id) return;
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
      onMatchFinished?.(data);
    };

    const addMessage = ({ matchId, message }) => {
      if (matchId === match.id) {
        setMessages(previous =>
          previous.some(item => item.id === message.id)
            ? previous
            : [...previous, { ...message, sender: message.senderName || message.sender, time: message.timestamp || 'Ahora' }]
        );
      }
    };

    const handleDisputeNotification = (data) => {
      if (data?.matchId === match.id) {
        setDisputeSent(true);
        Alert.alert(
          'Incidencia Registrada',
          'El partido ha entrado en estado de revisión arbitral por el SuperAdmin.'
        );
      }
    };

    socket.on('newChatMessage', addMessage);
    socket.on('matchFinished', handleMatchFinished);
    socket.on('matchDisputed', handleDisputeNotification);

    return () => {
      socket.off('matchFinished', handleMatchFinished);
      socket.off('newChatMessage', addMessage);
      socket.off('matchDisputed', handleDisputeNotification);
    };
  }, [match?.id]);

  // Enviar mensaje de chat
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const socket = socketService.getSocket();
    const newMsg = {
      id: 'local_' + Date.now(),
      sender: currentUser?.name || 'Tú',
      role: isUserInTeamB ? 'Team Beta' : 'Team Alpha',
      team: isUserInTeamB ? 'teamB' : 'teamA',
      isMe: true,
      text: chatInput.trim(),
      time: 'Ahora'
    };

    if (socket && match?.id) {
      socket.emit('sendChatMessage', {
        matchId: match.id,
        text: chatInput.trim(),
        senderName: currentUser?.name || 'Jugador'
      });
    }

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
  };

  const handleQuickChip = (text) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    setChatInput(text);
  };

  // Apertura de Acta de Cierre / Reporte de Capitán
  const handleTriggerFinalize = (winner) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
    setSelectedWinner(winner);
    setFinalizeModalVisible(true);
  };

  const confirmFinalizeScore = () => {
    const socket = socketService.getSocket();
    if (socket && match?.id) {
      socket.emit('reportResult', {
        matchId: match.id,
        userId: currentUser?.id,
        winnerTeam: selectedWinner,
        scoreA,
        scoreB
      });
      socket.emit('reportResultByReporter', {
        matchId: match.id,
        winnerTeam: selectedWinner,
        scoreA,
        scoreB
      });
    }
    setFinalizeModalVisible(false);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
    Alert.alert(
      'Acta Digital Remitida',
      `Marcador final registrado (${scoreA} - ${scoreB}). En espera de confirmación del capitán rival y del árbitro federado para impactar el ranking ELO.`
    );
  };

  // Apertura y envío de Disputa Arbitral
  const handleSubmitDispute = () => {
    if (!disputeReason.trim()) {
      Alert.alert('Motivo Requerido', 'Por favor describe la incidencia o motivo de la disputa arbitral.');
      return;
    }
    const socket = socketService.getSocket();
    if (socket && match?.id) {
      socket.emit('disputeMatch', {
        matchId: match.id,
        reason: disputeReason.trim(),
        reportedBy: currentUser?.id
      });
    }

    onOpenDispute?.({ matchId: match?.id, reason: disputeReason.trim() });
    setDisputeSent(true);
    setDisputeModalVisible(false);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {}
    Alert.alert(
      'Auxilio Arbitral Activado',
      'Tu reporte ha sido transmitido con prioridad alta a la Mesa de Control y Sala de Disputas del SuperAdmin.'
    );
  };

  // Filtrado de mensajes por canal seleccionado
  const filteredMessages = messages.filter(msg => {
    if (chatChannel === 'global') return true;
    const userTeam = isUserInTeamB ? 'teamB' : 'teamA';
    return msg.team === userTeam || msg.team === 'referee';
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* =========================================================================
          SCOREBUG HUD FIJO SUPERIOR (Obsidian Pitch & Neon FUT)
         ========================================================================= */}
      <View style={styles.scorebugContainer}>
        {/* Cabecera del Match con ID y Estado EN VIVO */}
        <View style={styles.scorebugTopRow}>
          <View style={styles.matchIdBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>2T • {matchMinutes}' EN VIVO</Text>
          </View>
          <View style={styles.leagueTagRow}>
            <Text style={styles.leagueIcon}>🏆</Text>
            <Text style={styles.leagueTagText}>
              {match?.format || 'F7'} • {match?.venueDistrict || 'LIGA PREMIER AMATEUR'}
            </Text>
          </View>
        </View>

        {/* Marcador Gigante Central: Alpha vs Beta */}
        <View style={styles.scoreGrid}>
          {/* Equipo Alpha (Verde - Local) */}
          <View style={styles.teamCol}>
            <View style={styles.teamBadgeWrapper}>
              <View style={[styles.teamBadgeCircle, styles.teamBadgeAlpha]}>
                <Text style={styles.teamBadgeIcon}>🛡️</Text>
              </View>
              {isUserInTeamA && (
                <View style={styles.tuBadge}>
                  <Text style={styles.tuBadgeText}>TÚ</Text>
                </View>
              )}
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>
              {match?.teamAName || 'Galácticos'}
            </Text>
            <Text style={styles.teamSubtitleAlpha}>TEAM ALPHA</Text>
          </View>

          {/* Marcador Gigante */}
          <View style={styles.scoreDigitsCol}>
            <View style={styles.digitsRow}>
              <Text style={styles.giantDigitAlpha}>{scoreA}</Text>
              <Text style={styles.digitColon}>:</Text>
              <Text style={styles.giantDigitBeta}>{scoreB}</Text>
            </View>
            <View style={styles.globalPill}>
              <Text style={styles.globalPillText}>GLOBAL • 5v5</Text>
            </View>
          </View>

          {/* Equipo Beta (Rival - Visitante) */}
          <View style={styles.teamCol}>
            <View style={styles.teamBadgeWrapper}>
              <View style={[styles.teamBadgeCircle, styles.teamBadgeBeta]}>
                <Text style={styles.teamBadgeIcon}>🔥</Text>
              </View>
              {isUserInTeamB && (
                <View style={styles.tuBadge}>
                  <Text style={styles.tuBadgeText}>TÚ</Text>
                </View>
              )}
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>
              {match?.teamBName || 'Furia Sur'}
            </Text>
            <Text style={styles.teamSubtitleBeta}>TEAM BETA</Text>
          </View>
        </View>

        {/* Resumen Táctico de Goleadores & Telemetría */}
        <View style={styles.timelineScorersBox}>
          <View style={styles.scorersRow}>
            {/* Goles Alpha */}
            <View style={styles.scorersColLeft}>
              {matchEvents
                .filter(e => e.team === 'A')
                .map(e => (
                  <Text key={e.id} style={styles.scorerItemLeft}>
                    ⚽ <Text style={styles.scorerPlayer}>{e.minute} {e.player}</Text>
                  </Text>
                ))}
            </View>
            {/* Goles Beta */}
            <View style={styles.scorersColRight}>
              {matchEvents
                .filter(e => e.team === 'B')
                .map(e => (
                  <Text key={e.id} style={styles.scorerItemRight}>
                    <Text style={styles.scorerPlayer}>{e.minute} {e.player}</Text> ⚽
                  </Text>
                ))}
            </View>
          </View>

          {/* Barra de Telemetría de Posesión */}
          <View style={styles.possessionRow}>
            <Text style={styles.possessionTextLeft}>54% Posesión</Text>
            <Text style={styles.possessionTextRight}>46%</Text>
          </View>
          <View style={styles.possessionBarTrack}>
            <View style={[styles.possessionFillAlpha, { width: '54%' }]} />
            <View style={[styles.possessionFillBeta, { width: '46%' }]} />
          </View>
        </View>
      </View>

      {/* =========================================================================
          BOTÓN DESTACADO DE AUXILIO ARBITRAL / DISPUTA (Ámbar / Warning táctico)
         ========================================================================= */}
      <View style={styles.disputeActionBanner}>
        <TouchableOpacity
          style={[styles.disputeQuickBtn, disputeSent && styles.disputeQuickBtnSent]}
          onPress={() => setDisputeModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.disputeIcon}>{disputeSent ? '🛡️' : '⚠️'}</Text>
          <View style={styles.disputeTextGroup}>
            <Text style={styles.disputeTitle}>
              {disputeSent ? 'DISPUTA ACTIVA EN REVISIÓN SUPERADMIN' : 'SOLICITAR AUXILIO ARBITRAL / REPORTAR INCIDENCIA'}
            </Text>
            <Text style={styles.disputeSubtitle}>
              {disputeSent
                ? 'El SuperAdmin está monitoreando el partido en tiempo real'
                : 'Falta antideportiva, marcador fraudulento o agresión física'}
            </Text>
          </View>
          <Text style={styles.disputeArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          PESTAÑAS TÁCTICAS NATIVAS
         ========================================================================= */}
      <View style={styles.tacticalTabBar}>
        <TouchableOpacity
          style={[styles.tacticalTabItem, activeTab === 'roster' && styles.tacticalTabItemActive]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
            setActiveTab('roster');
          }}
        >
          <Text style={[styles.tacticalTabLabel, activeTab === 'roster' && styles.tacticalTabLabelActive]}>
            Alineaciones
          </Text>
          {activeTab === 'roster' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tacticalTabItem, activeTab === 'chat' && styles.tacticalTabItemActive]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
            setActiveTab('chat');
          }}
        >
          <View style={styles.tabWithBadgeRow}>
            <Text style={[styles.tacticalTabLabel, activeTab === 'chat' && styles.tacticalTabLabelActive]}>
              Eventos / Chat
            </Text>
            <View style={styles.chatCountPill}>
              <Text style={styles.chatCountText}>{filteredMessages.length}</Text>
            </View>
          </View>
          {activeTab === 'chat' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tacticalTabItem, activeTab === 'report' && styles.tacticalTabItemActive]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
            setActiveTab('report');
          }}
        >
          <Text style={[styles.tacticalTabLabel, activeTab === 'report' && styles.tacticalTabLabelActive]}>
            Reporte de Capitán
          </Text>
          {activeTab === 'report' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          CONTENIDO DE LAS PESTAÑAS TÁCTICAS
         ========================================================================= */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.contentContainer}
      >
        {/* PESTAÑA 1: ALINEACIONES & POSICIONES */}
        {activeTab === 'roster' && (
          <ScrollView
            contentContainerStyle={styles.scrollSection}
            showsVerticalScrollIndicator={false}
          >
            {/* Selector de Equipo dentro del Roster */}
            <View style={styles.rosterSelectorRow}>
              <TouchableOpacity
                style={[styles.rosterTeamBtn, selectedRosterTeam === 'teamA' && styles.rosterTeamBtnActiveAlpha]}
                onPress={() => setSelectedRosterTeam('teamA')}
              >
                <View style={styles.rosterDotAlpha} />
                <Text style={[styles.rosterTeamBtnText, selectedRosterTeam === 'teamA' && styles.rosterTeamBtnTextActive]}>
                  {match?.teamAName || 'Galácticos'} ({teamAPlayers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rosterTeamBtn, selectedRosterTeam === 'teamB' && styles.rosterTeamBtnActiveBeta]}
                onPress={() => setSelectedRosterTeam('teamB')}
              >
                <View style={styles.rosterDotBeta} />
                <Text style={[styles.rosterTeamBtnText, selectedRosterTeam === 'teamB' && styles.rosterTeamBtnTextActive]}>
                  {match?.teamBName || 'Furia Sur'} ({teamBPlayers.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Tarjetas de Jugadores */}
            <View style={styles.playerCardList}>
              {(selectedRosterTeam === 'teamA' ? teamAPlayers : teamBPlayers).map((player, idx) => (
                <View key={player.id || idx} style={styles.tacticalPlayerCard}>
                  <Image
                    source={{ uri: player.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120' }}
                    style={styles.playerAvatarImg}
                  />

                  <View style={styles.playerInfoCol}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerCardName}>{player.name}</Text>
                      {player.isMe && (
                        <View style={styles.playerTuChip}>
                          <Text style={styles.playerTuChipText}>TÚ</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.playerMetaRow}>
                      <View style={styles.positionBadge}>
                        <Text style={styles.positionBadgeText}>{player.position || 'MED'}</Text>
                      </View>
                      <Text style={styles.playerStatusLive}>🟢 En Cancha</Text>
                      <Text style={styles.playerStatHighlights}>{player.statText}</Text>
                    </View>
                  </View>

                  <View style={styles.playerRatingCol}>
                    <Text style={styles.playerStarText}>★ {player.scoreStar || '8.2'}</Text>
                    <View style={styles.ovrBadge}>
                      <Text style={styles.ovrText}>{player.ovr || 82} OVR</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Sede Oficial del Partido */}
            <View style={styles.venueIntelCard}>
              <View style={styles.venueHeaderRow}>
                <Text style={styles.venueTitle}>🏟️ Sede Oficial del Partido</Text>
                <View style={styles.pitchReservedBadge}>
                  <Text style={styles.pitchReservedText}>Cancha 1 Reservada</Text>
                </View>
              </View>
              <Text style={styles.venueNameBold}>
                {match?.venueName || 'Cancha Gol Surco • Sintético Pro 60mm'}
              </Text>
              <Text style={styles.venueAddressText}>
                📍 {match?.venueAddress || 'Av. Manuel Olguín 450, Surco, Lima (Ref: Jockey Plaza)'}
              </Text>
              <View style={styles.venueChipsRow}>
                <Text style={styles.venueChip}>💡 Focos LED 500W</Text>
                <Text style={styles.venueChip}>⚽ Balón FIFA Pro F7</Text>
                <Text style={styles.venueChip}>🛡️ Botiquín & Desfibrilador</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* PESTAÑA 2: EVENTOS / CHAT DE EQUIPO */}
        {activeTab === 'chat' && (
          <View style={styles.chatTabContainer}>
            {/* Sub-selector de Canal: Global vs Solo Mi Equipo */}
            <View style={styles.chatChannelBar}>
              <TouchableOpacity
                style={[styles.channelBtn, chatChannel === 'global' && styles.channelBtnActive]}
                onPress={() => setChatChannel('global')}
              >
                <Text style={[styles.channelBtnText, chatChannel === 'global' && styles.channelBtnTextActive]}>
                  SALA GLOBAL (AMBOS)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.channelBtn, chatChannel === 'team' && styles.channelBtnActive]}
                onPress={() => setChatChannel('team')}
              >
                <Text style={[styles.channelBtnText, chatChannel === 'team' && styles.channelBtnTextActive]}>
                  SOLO MI EQUIPO ({isUserInTeamB ? 'BETA' : 'ALPHA'})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Feed de Mensajes con Scroll */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatFeedScroll}
              contentContainerStyle={styles.chatFeedContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {filteredMessages.map((msg, idx) => {
                const isMine = msg.isMe || msg.sender === currentUser?.name || msg.sender === 'Tú';
                const isRef = msg.team === 'referee';

                if (isRef) {
                  return (
                    <View key={msg.id || idx} style={styles.refereeMessageBanner}>
                      <Text style={styles.refereeIcon}>⚖️</Text>
                      <View style={styles.refereeTextGroup}>
                        <Text style={styles.refereeSender}>{msg.sender} • {msg.time}</Text>
                        <Text style={styles.refereeMsgText}>{msg.text}</Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={msg.id || idx}
                    style={[
                      styles.msgBubbleRow,
                      isMine ? styles.msgBubbleRowRight : styles.msgBubbleRowLeft
                    ]}
                  >
                    {!isMine && (
                      <View style={styles.msgAvatarPlaceholder}>
                        <Text style={styles.msgAvatarLetter}>{msg.sender.charAt(0)}</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.msgBubbleCard,
                        isMine ? styles.msgBubbleCardMine : styles.msgBubbleCardRival
                      ]}
                    >
                      <View style={styles.msgHeaderRow}>
                        <Text style={[styles.msgSenderName, isMine && styles.msgSenderNameMine]}>
                          {msg.sender}
                        </Text>
                        <Text style={styles.msgRolePill}>{msg.role || (msg.team === 'teamB' ? 'Team Beta' : 'Team Alpha')}</Text>
                        <Text style={styles.msgTimeText}>{msg.time}</Text>
                      </View>
                      <Text style={[styles.msgBodyText, isMine && styles.msgBodyTextMine]}>
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Chips Tácticos de Envío Rápido */}
            <View style={styles.quickChipsBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsContent}>
                <TouchableOpacity style={styles.chipBtn} onPress={() => handleQuickChip('⚡ ¡Buena jugada!')}>
                  <Text style={styles.chipBtnText}>⚡ ¡Buena!</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chipBtn} onPress={() => handleQuickChip('🛑 ¡Falta clara!')}>
                  <Text style={styles.chipBtnText}>🛑 ¡Falta!</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chipBtn} onPress={() => handleQuickChip('🔄 ¡Pido cambio!')}>
                  <Text style={styles.chipBtnText}>🔄 ¡Cambio!</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chipBtn} onPress={() => handleQuickChip('🛡️ ¡Defiendan el córner!')}>
                  <Text style={styles.chipBtnText}>🛡️ ¡Atrás!</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chipBtn} onPress={() => handleQuickChip('💧 Pausa de hidratación')}>
                  <Text style={styles.chipBtnText}>💧 Hidratación</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Input Bar de Chat */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInputField}
                placeholder="Escribe al partido o a tu escuadra..."
                placeholderTextColor={THEME.colors.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendChat}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendMsgBtn}
                onPress={handleSendChat}
                activeOpacity={0.8}
              >
                <Text style={styles.sendIconText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PESTAÑA 3: REPORTE DE CAPITÁN & ACTA FINAL */}
        {activeTab === 'report' && (
          <ScrollView
            contentContainerStyle={styles.scrollSection}
            showsVerticalScrollIndicator={false}
          >
            {/* Banner de Reportero Designado */}
            <View style={styles.reporterDesignatedCard}>
              <Text style={styles.reporterTrophyIcon}>🎖️</Text>
              <View style={styles.reporterInfoGroup}>
                <Text style={styles.reporterBadgeTitle}>REPORTE OFICIAL DESIGNADO</Text>
                <Text style={styles.reporterDescText}>
                  <Text style={styles.reporterHighlight}>{currentUser?.name || 'Mateo Silva (Tú)'}</Text>{' '}
                  has sido facultado por el sistema para asentar goles, incidencias y concluir el acta deportiva.
                </Text>
              </View>
            </View>

            {/* Ajuste Rápido de Marcador en Vivo */}
            <View style={styles.scoreReportCard}>
              <Text style={styles.scoreReportCardTitle}>Marcador Oficial Declarado</Text>
              <View style={styles.stepperScoreRow}>
                {/* Score Team Alpha */}
                <View style={styles.stepperTeamBox}>
                  <Text style={styles.stepperTeamName}>{match?.teamAName || 'Galácticos'}</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setScoreA(Math.max(0, scoreA - 1))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValueAlpha}>{scoreA}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setScoreA(scoreA + 1)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.stepperVs}>VS</Text>

                {/* Score Team Beta */}
                <View style={styles.stepperTeamBox}>
                  <Text style={styles.stepperTeamName}>{match?.teamBName || 'Furia Sur'}</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setScoreB(Math.max(0, scoreB - 1))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValueBeta}>{scoreB}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setScoreB(scoreB + 1)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Declaración de Ganador Oficial */}
            <Text style={styles.winnerSectionHeader}>Declarar Ganador del Encuentro</Text>
            <View style={styles.winnerBtnsRow}>
              <TouchableOpacity
                style={[styles.winnerOutcomeBtn, styles.winnerBtnAlpha]}
                onPress={() => handleTriggerFinalize('teamA')}
              >
                <Text style={styles.winnerOutcomeIcon}>🛡️</Text>
                <Text style={styles.winnerOutcomeText}>GANÓ TEAM ALPHA</Text>
                <Text style={styles.winnerSubText}>({match?.teamAName || 'Galácticos'})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.winnerOutcomeBtn, styles.winnerBtnBeta]}
                onPress={() => handleTriggerFinalize('teamB')}
              >
                <Text style={styles.winnerOutcomeIcon}>🔥</Text>
                <Text style={styles.winnerOutcomeText}>GANÓ TEAM BETA</Text>
                <Text style={styles.winnerSubText}>({match?.teamBName || 'Furia Sur'})</Text>
              </TouchableOpacity>
            </View>

            {/* Botón de Empate Reglamentario */}
            <TouchableOpacity
              style={styles.drawOutcomeBtn}
              onPress={() => handleTriggerFinalize('draw')}
            >
              <Text style={styles.drawOutcomeText}>🤝 DECLARAR EMPATE TÉCNICO ({scoreA} - {scoreB})</Text>
            </TouchableOpacity>

            {/* Acta de Conclusión Final */}
            <View style={styles.closureNoticeBox}>
              <Text style={styles.closureNoticeIcon}>🔒</Text>
              <Text style={styles.closureNoticeText}>
                La conclusión definitiva impacta el algoritmo Glicko-2 / ELO una vez confirmada por ambos capitanes o validada por el árbitro en el Panel SuperAdmin.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* =========================================================================
          MODAL: CONFIRMAR CIERRE DE ACTA Y MARCADOR
         ========================================================================= */}
      <Modal
        visible={finalizeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFinalizeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Confirmar Cierre de Partido</Text>
              <TouchableOpacity onPress={() => setFinalizeModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBodyText}>
              Se enviará la solicitud de validación formal a ambos capitanes con el resultado de{' '}
              <Text style={styles.modalHighlightScore}>{scoreA} - {scoreB}</Text>.
            </Text>

            <View style={styles.modalSummaryPill}>
              <Text style={styles.modalSummaryPillText}>
                Ganador: {selectedWinner === 'teamA' ? (match?.teamAName || 'Team Alpha') : selectedWinner === 'teamB' ? (match?.teamBName || 'Team Beta') : 'Empate'}
              </Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFinalizeModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmFinalizeScore}
              >
                <Text style={styles.modalConfirmBtnText}>CONFIRMAR ACTA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL: SOLICITAR AUXILIO ARBITRAL / DISPUTA AL SUPERADMIN
         ========================================================================= */}
      <Modal
        visible={disputeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalCardDispute]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.disputeModalTitleGroup}>
                <Text style={styles.disputeModalIcon}>⚠️</Text>
                <Text style={styles.modalTitleWarning}>Auxilio Arbitral / Disputa</Text>
              </View>
              <TouchableOpacity onPress={() => setDisputeModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBodyText}>
              Describe con precisión el incidente ocurrido en la cancha. Esta notificación congela el resultado provisional y activa una alerta en la Sala de Disputas del SuperAdmin.
            </Text>

            <TextInput
              style={styles.disputeTextInput}
              placeholder="Ej: Marcador falseado, agresión verbal o jugador no federado en cancha..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              numberOfLines={4}
              value={disputeReason}
              onChangeText={setDisputeReason}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDisputeModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>VOLVER AL PARTIDO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDisputeSubmitBtn}
                onPress={handleSubmitDispute}
              >
                <Text style={styles.modalDisputeSubmitText}>ENVIAR AL SUPERADMIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14', // Obsidian pitch canvas
  },

  // ==========================================
  // SCOREBUG HUD SUPERIOR FIJO
  // ==========================================
  scorebugContainer: {
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 135, 0.15)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scorebugTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  leagueTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leagueIcon: {
    fontSize: 12,
  },
  leagueTagText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Grid del Marcador
  scoreGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
  },
  teamBadgeWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  teamBadgeCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  teamBadgeAlpha: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    borderColor: '#00FF87',
  },
  teamBadgeBeta: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
  },
  teamBadgeIcon: {
    fontSize: 22,
  },
  tuBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#00FF87',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tuBadgeText: {
    color: '#00210C',
    fontSize: 8,
    fontWeight: '900',
  },
  teamNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  teamSubtitleAlpha: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00FF87',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  teamSubtitleBeta: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Dígitos Gigantes
  scoreDigitsCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  digitsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  giantDigitAlpha: {
    fontSize: 38,
    fontWeight: '900',
    color: '#00FF87',
    textShadowColor: 'rgba(0, 255, 135, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  digitColon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#4B5563',
  },
  giantDigitBeta: {
    fontSize: 38,
    fontWeight: '900',
    color: '#F9FAFB',
  },
  globalPill: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  globalPillText: {
    color: '#9CA3AF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Timeline Goleadores y Telemetría
  timelineScorersBox: {
    marginTop: 8,
    backgroundColor: 'rgba(11, 14, 20, 0.7)',
    borderRadius: 8,
    padding: 8,
  },
  scorersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scorersColLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  scorersColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  scorerItemLeft: {
    fontSize: 10,
    color: '#D1D5DB',
    marginVertical: 1,
  },
  scorerItemRight: {
    fontSize: 10,
    color: '#D1D5DB',
    marginVertical: 1,
  },
  scorerPlayer: {
    fontWeight: '700',
    color: '#F9FAFB',
  },
  possessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  possessionTextLeft: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00FF87',
  },
  possessionTextRight: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  possessionBarTrack: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  possessionFillAlpha: {
    height: '100%',
    backgroundColor: '#00FF87',
  },
  possessionFillBeta: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },

  // ==========================================
  // BOTÓN DESTACADO AUXILIO ARBITRAL
  // ==========================================
  disputeActionBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10131A',
  },
  disputeQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  disputeQuickBtnSent: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  disputeIcon: {
    fontSize: 18,
  },
  disputeTextGroup: {
    flex: 1,
  },
  disputeTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.4,
  },
  disputeSubtitle: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 1,
  },
  disputeArrow: {
    fontSize: 16,
    color: '#FBBF24',
    fontWeight: '900',
  },

  // ==========================================
  // PESTAÑAS TÁCTICAS
  // ==========================================
  tacticalTabBar: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tacticalTabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tacticalTabItemActive: {
    backgroundColor: 'rgba(0, 255, 135, 0.04)',
  },
  tacticalTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tacticalTabLabelActive: {
    color: '#00FF87',
    fontWeight: '900',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2.5,
    backgroundColor: '#00FF87',
    borderRadius: 1.5,
  },
  tabWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatCountPill: {
    backgroundColor: 'rgba(0, 255, 135, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  chatCountText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#00FF87',
  },

  contentContainer: {
    flex: 1,
  },
  scrollSection: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // ==========================================
  // PESTAÑA: ALINEACIONES & ROSTER
  // ==========================================
  rosterSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rosterTeamBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  rosterTeamBtnActiveAlpha: {
    borderColor: '#00FF87',
    backgroundColor: 'rgba(0, 255, 135, 0.1)',
  },
  rosterTeamBtnActiveBeta: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  rosterDotAlpha: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF87',
  },
  rosterDotBeta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  rosterTeamBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  rosterTeamBtnTextActive: {
    color: '#F9FAFB',
  },

  playerCardList: {
    gap: 8,
  },
  tacticalPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  playerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  playerInfoCol: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerCardName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  playerTuChip: {
    backgroundColor: '#00FF87',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  playerTuChipText: {
    color: '#00210C',
    fontSize: 8,
    fontWeight: '900',
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  positionBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  positionBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#00FF87',
  },
  playerStatusLive: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '700',
  },
  playerStatHighlights: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  playerRatingCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  playerStarText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
  },
  ovrBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ovrText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FBBF24',
  },

  venueIntelCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  venueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  pitchReservedBadge: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pitchReservedText: {
    color: '#00FF87',
    fontSize: 8,
    fontWeight: '800',
  },
  venueNameBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00FF87',
  },
  venueAddressText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  venueChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  venueChip: {
    fontSize: 9,
    color: '#D1D5DB',
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // ==========================================
  // PESTAÑA: CHAT & EVENTOS EN VIVO
  // ==========================================
  chatTabContainer: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  chatChannelBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#161B22',
    gap: 8,
  },
  channelBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#10131A',
  },
  channelBtnActive: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#00FF87',
  },
  channelBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  channelBtnTextActive: {
    color: '#00FF87',
  },
  chatFeedScroll: {
    flex: 1,
  },
  chatFeedContent: {
    padding: 16,
    gap: 10,
  },
  refereeMessageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  refereeIcon: {
    fontSize: 18,
  },
  refereeTextGroup: {
    flex: 1,
  },
  refereeSender: {
    fontSize: 9,
    fontWeight: '900',
    color: '#60A5FA',
    textTransform: 'uppercase',
  },
  refereeMsgText: {
    fontSize: 10,
    color: '#F9FAFB',
    marginTop: 1,
  },
  msgBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '88%',
  },
  msgBubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  msgBubbleRowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  msgAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00FF87',
  },
  msgBubbleCard: {
    borderRadius: 10,
    padding: 9,
    maxWidth: '100%',
  },
  msgBubbleCardMine: {
    backgroundColor: '#00FF87',
  },
  msgBubbleCardRival: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  msgHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  msgSenderName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  msgSenderNameMine: {
    color: '#00210C',
  },
  msgRolePill: {
    fontSize: 7,
    fontWeight: '700',
    color: '#9CA3AF',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  msgTimeText: {
    fontSize: 8,
    color: '#6B7280',
  },
  msgBodyText: {
    fontSize: 11,
    color: '#E5E7EB',
    lineHeight: 15,
  },
  msgBodyTextMine: {
    color: '#00210C',
    fontWeight: '600',
  },
  quickChipsBar: {
    backgroundColor: '#161B22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 6,
  },
  quickChipsContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chipBtn: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipBtnText: {
    fontSize: 10,
    color: '#D1D5DB',
    fontWeight: '700',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#10131A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  chatInputField: {
    flex: 1,
    height: 40,
    backgroundColor: '#161B22',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#F9FAFB',
    fontSize: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendMsgBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIconText: {
    color: '#00210C',
    fontSize: 14,
    fontWeight: '900',
  },

  // ==========================================
  // PESTAÑA: REPORTE DE CAPITÁN
  // ==========================================
  reporterDesignatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    gap: 10,
  },
  reporterTrophyIcon: {
    fontSize: 24,
  },
  reporterInfoGroup: {
    flex: 1,
  },
  reporterBadgeTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  reporterDescText: {
    fontSize: 10,
    color: '#D1D5DB',
    marginTop: 2,
    lineHeight: 14,
  },
  reporterHighlight: {
    color: '#F9FAFB',
    fontWeight: '800',
  },

  scoreReportCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  scoreReportCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  stepperScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepperTeamBox: {
    flex: 1,
    alignItems: 'center',
  },
  stepperTeamName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  stepValueAlpha: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00FF87',
    minWidth: 28,
    textAlign: 'center',
  },
  stepValueBeta: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F59E0B',
    minWidth: 28,
    textAlign: 'center',
  },
  stepperVs: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7280',
    paddingHorizontal: 8,
  },

  winnerSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  winnerBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  winnerOutcomeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  winnerBtnAlpha: {
    backgroundColor: '#00FF87',
  },
  winnerBtnBeta: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  winnerOutcomeIcon: {
    fontSize: 20,
  },
  winnerOutcomeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00210C',
    letterSpacing: 0.4,
  },
  winnerSubText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(0, 33, 12, 0.7)',
  },
  drawOutcomeBtn: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  drawOutcomeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D1D5DB',
    letterSpacing: 0.4,
  },
  closureNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.6)',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  closureNoticeIcon: {
    fontSize: 14,
  },
  closureNoticeText: {
    flex: 1,
    fontSize: 9,
    color: '#9CA3AF',
    lineHeight: 13,
  },

  // ==========================================
  // MODALES
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 14, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#161B22',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 12,
  },
  modalCardDispute: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F9FAFB',
  },
  disputeModalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disputeModalIcon: {
    fontSize: 16,
  },
  modalTitleWarning: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FBBF24',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
    padding: 4,
  },
  modalBodyText: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  modalHighlightScore: {
    color: '#00FF87',
    fontWeight: '900',
  },
  modalSummaryPill: {
    backgroundColor: '#1F2937',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalSummaryPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  disputeTextInput: {
    backgroundColor: '#10131A',
    borderRadius: 8,
    padding: 10,
    color: '#F9FAFB',
    fontSize: 11,
    textAlignVertical: 'top',
    height: 80,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#00FF87',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00210C',
  },
  modalDisputeSubmitBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDisputeSubmitText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1F2937',
  },
});
