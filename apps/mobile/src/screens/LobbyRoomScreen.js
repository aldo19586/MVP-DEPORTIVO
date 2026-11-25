import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

const QUICK_CHAT_PRESETS = [
  '¡Ya estoy listo!',
  'Falta 1 defensa',
  'Salgo rápido por las bandas'
];

export default function LobbyRoomScreen({ lobby, user, onBack, onStartSquadRadar }) {
  const [currentLobby, setCurrentLobby] = useState(lobby || {
    code: '',
    venueDistrict: 'Cancha local',
    sportId: 'futbol',
    formatId: '5v5',
    teamA: user ? [{ id: user.id, name: user.name, position: user.position || 'DEL', rating: user.ratingOverall || 1500, isReady: true, isMe: true }] : [],
    teamB: [],
    chatMessages: []
  });

  const [isReady, setIsReady] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(currentLobby.chatMessages || []);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const totalPlayers = (currentLobby.teamA?.length || 0) + (currentLobby.teamB?.length || 0);
  const targetPlayers = currentLobby.totalSlots || ((currentLobby.playersPerTeam || 5) * 2);
  const maxPerTeam = currentLobby.playersPerTeam || Math.ceil(targetPlayers / 2);
  const missingPlayers = Math.max(0, targetPlayers - totalPlayers);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const updateLobby = data => {
      if (data?.lobby?.code !== lobby.code) return;
      setCurrentLobby(data.lobby);
      setChatMessages(data.lobby.chatMessages || []);
      const me = [...(data.lobby.teamA || []), ...(data.lobby.teamB || [])].find(
        p => (p.userId || p.id) === user.id
      );
      if (me) setIsReady(me.isReady !== false);
    };

    const addMessage = ({ code, message }) => {
      if (code === lobby.code) {
        setChatMessages(previous =>
          previous.some(item => item.id === message.id) ? previous : [...previous, message]
        );
      }
    };

    socket.on('lobbyUpdated', updateLobby);
    socket.on('newLobbyChatMessage', addMessage);
    return () => {
      socket.off('lobbyUpdated', updateLobby);
      socket.off('newLobbyChatMessage', addMessage);
    };
  }, [lobby.code, user.id]);

  const handleCopyCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      if (currentLobby.code) {
        await Clipboard.setStringAsync(String(currentLobby.code));
      }
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1500);
    } catch (e) {
      Alert.alert('Código de Sala', `#${currentLobby.code}`);
    }
  };

  const handleShareLobby = () => {
    try { Haptics.selectionAsync(); } catch (e) {}
    Share.share({
      message: `Únete a mi sala de MatchSport (${(currentLobby.formatId || '5v5').toUpperCase()}) en ${currentLobby.venueDistrict || currentLobby.district || 'Lima'}. Código: ${currentLobby.code}`
    }).catch(() => {});
  };

  const handleToggleReady = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setIsReady(prev => !prev);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('toggleLobbyReady', { code: currentLobby.code, userId: user.id });
    }
  };

  const handleSwitchTeam = (targetTeamKey = null) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    const socket = socketService.getSocket();
    if (socket) {
      const inA = (currentLobby.teamA || []).some(p => (p.userId || p.id) === user.id);
      const destination = targetTeamKey || (inA ? 'teamB' : 'teamA');
      socket.emit('switchLobbyTeam', { code: currentLobby.code, targetTeam: destination });
    }
  };

  const handleSendChat = (overrideText = null) => {
    const textToSend = (overrideText !== null ? overrideText : chatInput).trim();
    if (!textToSend) return;
    if (overrideText === null) setChatInput('');
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('sendLobbyChatMessage', { code: currentLobby.code, text: textToSend });
    }
  };

  const handleSquadRadar = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}
    if (onStartSquadRadar) {
      onStartSquadRadar(currentLobby.code);
    } else {
      Alert.alert('Matchmaking de Escuadra', 'Iniciando radar para emparejar tu sala activa.');
    }
  };

  const handleOpenRules = () => {
    const fmt = (currentLobby.formatId || '5v5').toUpperCase();
    Alert.alert(
      `Reglamento Oficial ${fmt}`,
      `• Modalidad: Fútbol ${fmt}\n• Validación cruzada de marcador por ambos capitanes.\n• Cálculo de rating Glicko-2 automático al confirmar el acta.`
    );
  };

  const calcPlayerOvr = p => {
    if (p?.futStats?.ovr) return p.futStats.ovr;
    const r = Number(p?.rating || p?.ratingOverall || 1500);
    return Math.min(99, Math.max(60, Math.round(65 + (r - 1200) / 35)));
  };

  const calcTeamAvgOvr = list => {
    if (!Array.isArray(list) || list.length === 0) return '75.0';
    const sum = list.reduce((acc, item) => acc + calcPlayerOvr(item), 0);
    return (sum / list.length).toFixed(1);
  };

  const teamAOvr = calcTeamAvgOvr(currentLobby.teamA);
  const teamBOvr = calcTeamAvgOvr(currentLobby.teamB);
  const formatShort = (currentLobby.formatId || currentLobby.format_id || '5v5').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. FIXED TOP HEADER (Stitch matchsport_lobbyroomscreen_sala_de_convocatoria_activa) */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            style={styles.iconBoxBtn}
            onPress={onBack}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>

          <View>
            <View style={styles.waitingKickerRow}>
              <View style={styles.waitingPulseDot} />
              <Text style={styles.waitingKickerText}>SALA DE ESPERA</Text>
            </View>
            <View style={styles.headerTitleWithPinRow}>
              <Text style={styles.headerMainTitle}>Match Lobby</Text>
              <View style={styles.headerPinChip}>
                <Text style={styles.headerPinChipText}>#{currentLobby.code || 'SALA'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.iconBoxBtn}
            onPress={handleShareLobby}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Compartir código de sala"
          >
            <Text style={styles.shareIconText}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. TOP MATCH ATMOSPHERE CONTEXT CARD */}
        <View style={styles.atmosphereCard}>
          <View style={styles.atmosphereTopRow}>
            <Text style={styles.matchHeadlineTitle} numberOfLines={1}>
              Convocatoria Táctica {formatShort}
            </Text>

            <TouchableOpacity
              style={styles.copyPinBtn}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <Text style={styles.copyPinBtnText}>
                {copiedFeedback ? '¡COPIADO!' : `#${currentLobby.code} 📋`}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.venueAndTimeRow}>
            <View style={styles.venueChip}>
              <Text style={styles.venueChipIcon}>🏟️</Text>
              <Text style={styles.venueChipText} numberOfLines={1}>
                {currentLobby.venueDistrict || currentLobby.venue_name || currentLobby.district || 'Cancha Confirmada, Lima'}
              </Text>
            </View>

            <View style={styles.timerChip}>
              <Text style={styles.timerChipText}>
                ⚡ {missingPlayers === 0 ? 'Quórum Completo' : `Faltan ${missingPlayers} cupos`}
              </Text>
            </View>
          </View>

          {/* Quick Room Actions Bar */}
          <View style={styles.quickRoomBar}>
            <TouchableOpacity
              style={styles.switchTeamQuickBtn}
              onPress={() => handleSwitchTeam()}
              activeOpacity={0.85}
            >
              <Text style={styles.switchTeamQuickText}>⇄ Cambiar de Equipo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inviteLinkMiniBtn}
              onPress={handleShareLobby}
              activeOpacity={0.8}
            >
              <Text style={styles.inviteLinkMiniText}>📤 Invitar Jugadores</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. TACTICAL PITCH SPLIT VIEW (Team A Emerald vs Team B Coral Orange) */}
        <View style={styles.pitchOuterCard}>
          <View style={styles.pitchFieldCanvas}>
            {/* Líneas tácticas de cancha nativas */}
            <View style={styles.pitchBorderRect} />
            <View style={styles.pitchMidLine} />
            <View style={styles.pitchCenterCircle} />

            {/* TEAM A HEADER & LINEUP (Esmeralda) */}
            <View style={styles.teamBlock}>
              <View style={styles.teamHeaderBar}>
                <View style={styles.teamHeaderLeft}>
                  <View style={styles.teamBadgeA}>
                    <Text style={styles.teamBadgeTextA}>A</Text>
                  </View>
                  <View>
                    <Text style={styles.teamTitleText}>Escuadra A · Esmeralda</Text>
                    <Text style={styles.teamSubtitleA}>
                      {currentLobby.teamA?.length || 0}/{maxPerTeam} convocados • Verde
                    </Text>
                  </View>
                </View>

                <View style={styles.teamOvrCol}>
                  <Text style={styles.teamOvrLabel}>OVR MEDIO</Text>
                  <Text style={styles.teamOvrValueA}>{teamAOvr}</Text>
                </View>
              </View>

              <View style={styles.slotsList}>
                {(currentLobby.teamA || []).map((p, idx) => (
                  <View key={p.id || idx} style={styles.playerSlotRow}>
                    <View style={styles.playerSlotLeft}>
                      <View style={styles.numberCircleA}>
                        <Text style={styles.numberTextA}>
                          {String(idx + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameWithCapRow}>
                          <Text style={styles.slotNameText} numberOfLines={1}>
                            {p.name}
                          </Text>
                          {idx === 0 && (
                            <View style={styles.capPillA}>
                              <Text style={styles.capPillTextA}>CAP</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.slotPosOvrText}>
                          {(p.position || 'MED').toUpperCase()} • {calcPlayerOvr(p)} OVR
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.slotStatusBadge, p.isReady !== false ? styles.slotStatusReadyA : styles.slotStatusPending]}>
                      <Text style={[styles.slotStatusText, p.isReady !== false ? styles.slotStatusTextReadyA : styles.slotStatusTextPending]}>
                        {p.isReady !== false ? '✓ LISTO' : '⭮ EQUIPANDO'}
                      </Text>
                    </View>
                  </View>
                ))}

                {(currentLobby.teamA?.length || 0) < maxPerTeam && (
                  <TouchableOpacity
                    style={styles.emptySlotInviteBtnA}
                    onPress={() => handleSwitchTeam('teamA')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptySlotInviteTextA}>
                      + Ocupar / Invitar Titular Verde ({currentLobby.teamA?.length || 0}/{maxPerTeam})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* VS CENTER PITCH DIVIDER MODULE */}
            <View style={styles.vsCenterWrapper}>
              <View style={styles.vsPillBox}>
                <Text style={styles.vsOvrA}>{teamAOvr} OVR</Text>
                <View style={styles.vsBadgeCore}>
                  <Text style={styles.vsBadgeCoreText}>VS</Text>
                </View>
                <Text style={styles.vsOvrB}>{teamBOvr} OVR</Text>
              </View>
            </View>

            {/* TEAM B HEADER & LINEUP (Furia Sur - Coral) */}
            <View style={styles.teamBlock}>
              <View style={styles.teamHeaderBar}>
                <View style={styles.teamHeaderLeft}>
                  <View style={styles.teamBadgeB}>
                    <Text style={styles.teamBadgeTextB}>B</Text>
                  </View>
                  <View>
                    <Text style={styles.teamTitleText}>Escuadra B · Furia Sur</Text>
                    <Text style={styles.teamSubtitleB}>
                      {currentLobby.teamB?.length || 0}/{maxPerTeam} convocados • Coral
                    </Text>
                  </View>
                </View>

                <View style={styles.teamOvrCol}>
                  <Text style={styles.teamOvrLabel}>OVR MEDIO</Text>
                  <Text style={styles.teamOvrValueB}>{teamBOvr}</Text>
                </View>
              </View>

              <View style={styles.slotsList}>
                {(currentLobby.teamB || []).map((p, idx) => (
                  <View key={p.id || idx} style={styles.playerSlotRow}>
                    <View style={styles.playerSlotLeft}>
                      <View style={styles.numberCircleB}>
                        <Text style={styles.numberTextB}>
                          {String(idx + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameWithCapRow}>
                          <Text style={styles.slotNameText} numberOfLines={1}>
                            {p.name}
                          </Text>
                          {idx === 0 && (
                            <View style={styles.capPillB}>
                              <Text style={styles.capPillTextB}>CAP</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.slotPosOvrText}>
                          {(p.position || 'DEL').toUpperCase()} • {calcPlayerOvr(p)} OVR
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.slotStatusBadge, p.isReady !== false ? styles.slotStatusReadyB : styles.slotStatusPending]}>
                      <Text style={[styles.slotStatusText, p.isReady !== false ? styles.slotStatusTextReadyB : styles.slotStatusTextPending]}>
                        {p.isReady !== false ? '✓ LISTO' : '⭮ EQUIPANDO'}
                      </Text>
                    </View>
                  </View>
                ))}

                {(currentLobby.teamB?.length || 0) < maxPerTeam && (
                  <TouchableOpacity
                    style={styles.emptySlotInviteBtnB}
                    onPress={() => handleSwitchTeam('teamB')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptySlotInviteTextB}>
                      + Ocupar / Invitar Titular Coral ({currentLobby.teamB?.length || 0}/{maxPerTeam})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 4. INTEGRATED TACTICAL MINI-CHAT & QUICK PILLS */}
        <View style={styles.tacticalChatCard}>
          <View style={styles.chatHeaderRow}>
            <View style={styles.chatHeaderLeft}>
              <Text style={styles.chatEqIcon}>💬</Text>
              <Text style={styles.chatHeaderTitle}>
                Canal Táctico En Vivo ({chatMessages.length})
              </Text>
            </View>
            <View style={styles.audioBarsRow}>
              <View style={[styles.audioBar, { height: 10 }]} />
              <View style={[styles.audioBar, { height: 16 }]} />
              <View style={[styles.audioBar, { height: 8 }]} />
              <View style={[styles.audioBar, { height: 13 }]} />
            </View>
          </View>

          {/* Mensajes del Lobby */}
          <View style={styles.messagesListBox}>
            {chatMessages.length === 0 ? (
              <Text style={styles.emptyChatHint}>
                Coordina aquí las posiciones y llegada a la cancha con tu escuadra.
              </Text>
            ) : (
              chatMessages.slice(-4).map((m, idx) => (
                <View key={m.id || idx} style={styles.messageLine}>
                  <Text style={styles.messageSender}>{m.senderName || 'Jugador'}:</Text>
                  <Text style={styles.messageBody} numberOfLines={2}>{m.text}</Text>
                </View>
              ))
            )}
          </View>

          {/* Quick preset tactical pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPresetsRow}
          >
            {QUICK_CHAT_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={styles.quickPresetPill}
                onPress={() => handleSendChat(preset)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickPresetText}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input de Chat */}
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe al canal táctico..."
              placeholderTextColor={THEME.colors.outline}
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity
              style={styles.chatSendBtn}
              onPress={() => handleSendChat()}
              activeOpacity={0.85}
            >
              <Text style={styles.chatSendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. CAPTAIN CONTROL PANEL & STATUS BOTTOM DOCK */}
        <View style={styles.bottomDockCard}>
          <View style={styles.quotaReminderBar}>
            <View style={styles.quotaLeftRow}>
              <View style={styles.quotaDot} />
              <Text style={styles.quotaBoldText}>
                {totalPlayers}/{targetPlayers} Convocados
              </Text>
            </View>
            <Text style={styles.quotaRightSub}>
              {missingPlayers > 0 ? `Faltan ${missingPlayers} para auto-match` : 'Listos para iniciar'}
            </Text>
          </View>

          {/* Ready Toggle Button */}
          <TouchableOpacity
            style={[styles.readyToggleBtn, isReady ? styles.readyToggleBtnActive : styles.readyToggleBtnIdle]}
            onPress={handleToggleReady}
            activeOpacity={0.85}
          >
            <Text style={[styles.readyToggleIcon, !isReady && { color: THEME.colors.onSurfaceVariant }]}>
              {isReady ? '✓' : '○'}
            </Text>
            <Text style={[styles.readyToggleText, !isReady && { color: THEME.colors.onSurfaceVariant }]}>
              {isReady ? 'ESTOY LISTO (CONFIRMADO)' : 'MARCAR COMO LISTO'}
            </Text>
          </TouchableOpacity>

          {/* Main Launch Action Button */}
          <TouchableOpacity
            style={styles.launchMatchmakingBtn}
            onPress={handleSquadRadar}
            activeOpacity={0.85}
          >
            <Text style={styles.launchBoltIcon}>⚡</Text>
            <Text style={styles.launchMatchmakingText}>INICIAR MATCHMAKING</Text>
          </TouchableOpacity>

          {/* Sub-actions */}
          <View style={styles.subActionsFooterRow}>
            <TouchableOpacity style={styles.subActionLink} onPress={handleOpenRules}>
              <Text style={styles.subActionRulesText}>📖 Reglas {formatShort}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.subActionLink} onPress={onBack}>
              <Text style={styles.subActionLeaveText}>🚪 Abandonar Sala</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgSurface
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconBoxBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  backArrowText: {
    color: THEME.colors.onSurface,
    fontSize: 18,
    fontWeight: '900'
  },
  waitingKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  waitingPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.neonPitch
  },
  waitingKickerText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9
  },
  headerTitleWithPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 1
  },
  headerMainTitle: {
    color: '#F1FFEF',
    fontSize: 16,
    fontWeight: '800'
  },
  headerPinChip: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5
  },
  headerPinChipText: {
    color: THEME.colors.neonPitch,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shareIconText: {
    fontSize: 16
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 14
  },

  // 2. TOP MATCH ATMOSPHERE CARD
  atmosphereCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.18)'
  },
  atmosphereTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  matchHeadlineTitle: {
    color: '#F1FFEF',
    fontSize: 17,
    fontWeight: '800',
    flex: 1
  },
  copyPinBtn: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)'
  },
  copyPinBtnText: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  venueAndTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  venueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
    flexShrink: 1
  },
  venueChipIcon: {
    fontSize: 12
  },
  venueChipText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1
  },
  timerChip: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6
  },
  timerChipText: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '800'
  },
  quickRoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLowest,
    padding: 8,
    borderRadius: 10,
    gap: 8
  },
  switchTeamQuickBtn: {
    backgroundColor: THEME.colors.neonPitch,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6
  },
  switchTeamQuickText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 11,
    fontWeight: '900'
  },
  inviteLinkMiniBtn: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6
  },
  inviteLinkMiniText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '700'
  },

  // 3. TACTICAL PITCH SPLIT VIEW
  pitchOuterCard: {
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  pitchFieldCanvas: {
    backgroundColor: '#0A140F',
    borderRadius: 12,
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
    gap: 10
  },
  pitchBorderRect: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8
  },
  pitchMidLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  pitchCenterCircle: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  teamBlock: {
    gap: 6,
    zIndex: 10
  },
  teamHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(25, 28, 34, 0.94)',
    padding: 10,
    borderRadius: 10
  },
  teamHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  teamBadgeA: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center'
  },
  teamBadgeTextA: {
    color: THEME.colors.surfaceLowest,
    fontSize: 12.5,
    fontWeight: '900'
  },
  teamBadgeB: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.coralError,
    alignItems: 'center',
    justifyContent: 'center'
  },
  teamBadgeTextB: {
    color: '#690005',
    fontSize: 12.5,
    fontWeight: '900'
  },
  teamTitleText: {
    color: '#F1FFEF',
    fontSize: 14,
    fontWeight: '800'
  },
  teamSubtitleA: {
    color: THEME.colors.neonPitch,
    fontSize: 10.5,
    fontWeight: '700'
  },
  teamSubtitleB: {
    color: THEME.colors.coralError,
    fontSize: 10.5,
    fontWeight: '700'
  },
  teamOvrCol: {
    alignItems: 'flex-end'
  },
  teamOvrLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9,
    fontWeight: '800'
  },
  teamOvrValueA: {
    color: THEME.colors.neonPitch,
    fontSize: 16,
    fontWeight: '900'
  },
  teamOvrValueB: {
    color: THEME.colors.coralError,
    fontSize: 16,
    fontWeight: '900'
  },
  slotsList: {
    gap: 6
  },
  playerSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(29, 32, 38, 0.88)',
    padding: 8,
    borderRadius: 8
  },
  playerSlotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  numberCircleA: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  numberTextA: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '900'
  },
  numberCircleB: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  numberTextB: {
    color: THEME.colors.coralError,
    fontSize: 11,
    fontWeight: '900'
  },
  nameWithCapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  slotNameText: {
    color: '#F1FFEF',
    fontSize: 13.5,
    fontWeight: '700',
    flexShrink: 1
  },
  capPillA: {
    backgroundColor: 'rgba(0, 255, 135, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  capPillTextA: {
    color: THEME.colors.neonPitch,
    fontSize: 9,
    fontWeight: '900'
  },
  capPillB: {
    backgroundColor: THEME.colors.coralErrorBg,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  capPillTextB: {
    color: THEME.colors.coralError,
    fontSize: 9,
    fontWeight: '900'
  },
  slotPosOvrText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '600'
  },
  slotStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 5
  },
  slotStatusReadyA: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)'
  },
  slotStatusReadyB: {
    backgroundColor: THEME.colors.coralErrorBg
  },
  slotStatusPending: {
    backgroundColor: THEME.colors.surfaceBright
  },
  slotStatusText: {
    fontSize: 10,
    fontWeight: '900'
  },
  slotStatusTextReadyA: {
    color: THEME.colors.neonPitch
  },
  slotStatusTextReadyB: {
    color: THEME.colors.coralError
  },
  slotStatusTextPending: {
    color: '#8DCDFF'
  },
  emptySlotInviteBtnA: {
    backgroundColor: 'rgba(29, 32, 38, 0.55)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 255, 135, 0.35)'
  },
  emptySlotInviteTextA: {
    color: THEME.colors.neonPitch,
    fontSize: 11.5,
    fontWeight: '800'
  },
  emptySlotInviteBtnB: {
    backgroundColor: 'rgba(29, 32, 38, 0.55)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 180, 171, 0.35)'
  },
  emptySlotInviteTextB: {
    color: THEME.colors.coralError,
    fontSize: 11.5,
    fontWeight: '800'
  },
  vsCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    zIndex: 20
  },
  vsPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  vsOvrA: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '900'
  },
  vsBadgeCore: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  vsBadgeCoreText: {
    color: '#F1FFEF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  },
  vsOvrB: {
    color: THEME.colors.coralError,
    fontSize: 11,
    fontWeight: '900'
  },

  // 4. TACTICAL MINI-CHAT
  tacticalChatCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  chatEqIcon: {
    fontSize: 14
  },
  chatHeaderTitle: {
    color: '#F1FFEF',
    fontSize: 12,
    fontWeight: '800'
  },
  audioBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  audioBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.neonPitch
  },
  messagesListBox: {
    gap: 5
  },
  emptyChatHint: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    fontStyle: 'italic'
  },
  messageLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(29, 32, 38, 0.75)',
    padding: 7,
    borderRadius: 6,
    gap: 6
  },
  messageSender: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '800'
  },
  messageBody: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    flex: 1
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2
  },
  quickPresetPill: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  quickPresetText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '700'
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2
  },
  chatInput: {
    flex: 1,
    height: 38,
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: THEME.colors.onSurface,
    fontSize: 12.5
  },
  chatSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatSendBtnText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 14,
    fontWeight: '900'
  },

  // 5. BOTTOM CONTROL DOCK
  bottomDockCard: {
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  quotaReminderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  quotaLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  quotaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.neonSecondary
  },
  quotaBoldText: {
    color: '#F1FFEF',
    fontSize: 11.5,
    fontWeight: '800'
  },
  quotaRightSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600'
  },
  readyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 10,
    gap: 8
  },
  readyToggleBtnActive: {
    backgroundColor: THEME.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.35)'
  },
  readyToggleBtnIdle: {
    backgroundColor: THEME.colors.surfaceContainer
  },
  readyToggleIcon: {
    color: THEME.colors.neonPitch,
    fontSize: 16,
    fontWeight: '900'
  },
  readyToggleText: {
    color: THEME.colors.neonPitch,
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  launchMatchmakingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 10,
    backgroundColor: THEME.colors.neonPitch,
    gap: 8,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6
  },
  launchBoltIcon: {
    color: THEME.colors.surfaceLowest,
    fontSize: 17,
    fontWeight: '900'
  },
  launchMatchmakingText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  subActionsFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2
  },
  subActionLink: {
    paddingVertical: 4
  },
  subActionRulesText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    fontWeight: '700'
  },
  subActionLeaveText: {
    color: THEME.colors.coralError,
    fontSize: 11.5,
    fontWeight: '800'
  }
});
