import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  SafeAreaView,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

export default function LobbyRoomScreen({ lobby, user, onBack, onStartSquadRadar }) {
  const [currentLobby, setCurrentLobby] = useState(lobby || {
    code: 'X8K2',
    venueDistrict: 'Manuel Bonilla, Miraflores',
    sportId: 'futbol',
    formatId: '5v5',
    teamA: [
      { id: user?.id || 'demo_user_1', name: user?.name || 'Mateo Ramos', position: 'DEL', rating: 1840, isReady: true, isMe: true },
      { id: 'u2', name: 'Carlos Vega', position: 'POR', rating: 1780, isReady: true },
      { id: 'u3', name: 'J. Morales', position: 'DEL', rating: 1860, isReady: true },
      { id: 'u4', name: 'D. Paredes', position: 'DEF', rating: 1590, isReady: true }
    ],
    teamB: [
      { id: 'u5', name: 'R. Quispe', position: 'MED', rating: 1850, isReady: true, isCaptain: true },
      { id: 'u6', name: 'K. Barreto', position: 'DEF', rating: 1730, isReady: true },
      { id: 'u7', name: 'S. Rojas', position: 'MED', rating: 1610, isReady: false },
      { id: 'u8', name: 'L. Benítez', position: 'DEL', rating: 1800, isReady: true }
    ],
    chatMessages: [
      { senderName: 'Carlos', text: 'Llevo chalecos naranjas por si acaso 🎽' },
      { senderName: 'Rodrigo', text: '¿Arrancamos a las 8:00pm exacto?' },
      { senderName: 'Mateo (Tú)', text: 'Sí, ya casi estamos completos. Faltan 2 cupos.' }
    ]
  });

  const [isReady, setIsReady] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(currentLobby.chatMessages || []);

  const totalPlayers = (currentLobby.teamA?.length || 0) + (currentLobby.teamB?.length || 0);
  const targetPlayers = 10;
  const quorumPercent = Math.min(100, Math.floor((totalPlayers / targetPlayers) * 100));

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('lobbyUpdated', (data) => {
      if (data && data.lobby) {
        setCurrentLobby(data.lobby);
        if (data.lobby.chatMessages) setChatMessages(data.lobby.chatMessages);
      }
    });

    socket.on('lobbyChatMessage', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });
  }, []);

  const handleCopyCode = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    Alert.alert('Código copiado', `Código de sala: #${currentLobby.code}`);
  };

  const handleToggleReady = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    setIsReady(!isReady);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('toggleLobbyReady', { code: currentLobby.code, userId: user.id });
    }
  };

  const handleSwitchTeam = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('switchLobbyTeam', { code: currentLobby.code, userId: user.id });
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const newMsg = {
      senderName: `${user?.name || 'Tú'}`,
      text: chatInput.trim()
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('sendLobbyChat', { code: currentLobby.code, message: chatInput.trim() });
    }
  };

  const handleSquadRadar = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
    if (onStartSquadRadar) {
      onStartSquadRadar(currentLobby.code);
    } else {
      Alert.alert('Buscando Rival', 'Disparando el radar para emparejar a la sala contra otra escuadra.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.topBrand}>
          <Text style={styles.brandSmall}>MATCHSPORT</Text>
          <Text style={styles.brandTitle}>PARTIDOS EN VIVO</Text>
        </View>
        <Image
          source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
          style={styles.avatarMini}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Room Header Card */}
        <View style={styles.roomHeaderCard}>
          <View style={styles.roomTitleRow}>
            <View>
              <Text style={styles.roomCodeTitle}>
                SALA <Text style={styles.roomCodeGreen}>#{currentLobby.code}</Text>
              </Text>
              <Text style={styles.venueDistrict}>
                📍 {currentLobby.venueDistrict || 'Manuel Bonilla, Miraflores'}
              </Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
              <Text style={styles.copyIcon}>📋</Text>
              <Text style={styles.copyText}>COPIAR</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalidadRow}>
            <Text style={styles.modalidadText}>MODALIDAD: FÚTBOL 5V5</Text>
            <Text style={styles.playersBadge}>🟢 {totalPlayers}/{targetPlayers} JUGADORES</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${quorumPercent}%` }]} />
          </View>
          <View style={styles.quorumRow}>
            <Text style={styles.quorumSub}>Faltan {Math.max(0, targetPlayers - totalPlayers)} para el silbatazo</Text>
            <Text style={styles.quorumVal}>QUÓRUM {quorumPercent}%</Text>
          </View>
        </View>

        {/* Tactical Lineup Header */}
        <View style={styles.lineupHeaderRow}>
          <View style={styles.tacticalTitleWrap}>
            <Text style={styles.tacticalIcon}>⚽</Text>
            <Text style={styles.tacticalTitle}>ALINEACIÓN TÁCTICA</Text>
          </View>
          <TouchableOpacity style={styles.switchTeamBtn} onPress={handleSwitchTeam}>
            <Text style={styles.switchTeamText}>⇄ CAMBIAR A EQUIPO B</Text>
          </TouchableOpacity>
        </View>

        {/* 2-Column Team View (Team A Blue vs Team B Red) */}
        <View style={styles.teamsGrid}>
          {/* Team A */}
          <View style={[styles.teamCol, styles.teamACol]}>
            <View style={styles.teamColHeader}>
              <Text style={styles.teamATitle}>🔵 EQ. A</Text>
              <Text style={styles.teamCountBadge}>{currentLobby.teamA?.length || 0}/5</Text>
            </View>

            {currentLobby.teamA?.map((p, idx) => (
              <View key={p.id || idx} style={styles.playerTile}>
                <Image
                  source={{ uri: p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }}
                  style={styles.playerAvatar}
                />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.playerSub}>{p.position || 'DEL'} • OVR {p.rating ? Math.floor(65 + (p.rating - 1200)/40) : 84}</Text>
                </View>
                <Text style={styles.readyCheck}>✓</Text>
              </View>
            ))}

            {(currentLobby.teamA?.length || 0) < 5 && (
              <TouchableOpacity style={styles.inviteSlotBtn}>
                <Text style={styles.inviteSlotText}>👤+ INVITAR</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Team B */}
          <View style={[styles.teamCol, styles.teamBCol]}>
            <View style={styles.teamColHeader}>
              <Text style={styles.teamBTitle}>🔴 EQ. B</Text>
              <Text style={styles.teamCountBadge}>{currentLobby.teamB?.length || 0}/5</Text>
            </View>

            {currentLobby.teamB?.map((p, idx) => (
              <View key={p.id || idx} style={styles.playerTile}>
                <Image
                  source={{ uri: p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }}
                  style={styles.playerAvatar}
                />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.playerSub}>{p.position || 'MED'} • OVR {p.rating ? Math.floor(65 + (p.rating - 1200)/40) : 82}</Text>
                </View>
                <Text style={p.isReady !== false ? styles.readyCheck : styles.pendingCheck}>
                  {p.isReady !== false ? '✓' : '⭮'}
                </Text>
              </View>
            ))}

            {(currentLobby.teamB?.length || 0) < 5 && (
              <TouchableOpacity style={styles.inviteSlotBtn}>
                <Text style={styles.inviteSlotText}>👤+ INVITAR</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ready Toggle Button */}
        <View style={styles.readyBar}>
          <View>
            <Text style={styles.readyBarTitle}>ESTADO: {isReady ? 'LISTO' : 'EN ESPERA'}</Text>
            <Text style={styles.readyBarSub}>Confirmado para el partido</Text>
          </View>
          <TouchableOpacity
            style={[styles.readyToggleBtn, isReady ? styles.readyToggleActive : styles.readyToggleInactive]}
            onPress={handleToggleReady}
          >
            <Text style={styles.readyToggleText}>{isReady ? '✓ READY' : 'PONERSE READY'}</Text>
          </TouchableOpacity>
        </View>

        {/* Captain Action Card */}
        <View style={styles.captainCard}>
          <View style={styles.captainHeader}>
            <Text style={styles.captainTitle}>🏅 ERES EL CAPITÁN</Text>
            <TouchableOpacity><Text style={styles.captainAdjustText}>⚙️ AJUSTES</Text></TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.squadRadarBtn} onPress={handleSquadRadar} activeOpacity={0.85}>
            <View style={styles.squadRadarLeft}>
              <Text style={styles.radarRadarIcon}>🎯</Text>
              <View>
                <Text style={styles.squadRadarTitle}>BUSCAR RIVAL EN ESCUADRÓN</Text>
                <Text style={styles.squadRadarSub}>Dispara el radar para retar a otra sala completa</Text>
              </View>
            </View>
            <Text style={styles.squadArrow}>➔</Text>
          </TouchableOpacity>
        </View>

        {/* In-Room Chat */}
        <View style={styles.chatSection}>
          <Text style={styles.chatSectionTitle}>💬 CHAT DE SALA ({chatMessages.length})</Text>
          <View style={styles.chatBox}>
            {chatMessages.map((m, idx) => (
              <View key={idx} style={styles.chatBubble}>
                <Text style={styles.chatSender}>{m.senderName}:</Text>
                <Text style={styles.chatText}>{m.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe al lobby..."
              placeholderTextColor={THEME.colors.textMuted}
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChat}>
              <Text style={styles.sendIcon}>➤</Text>
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
    backgroundColor: THEME.colors.bgCanvas,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    padding: 6,
  },
  backIcon: {
    color: THEME.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  topBrand: {
    alignItems: 'center',
  },
  brandSmall: {
    color: THEME.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  roomHeaderCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  roomTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomCodeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  roomCodeGreen: {
    color: THEME.colors.primary,
  },
  venueDistrict: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    gap: 4,
  },
  copyIcon: {
    fontSize: 11,
  },
  copyText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  modalidadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  modalidadText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  playersBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.cardElevated,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  quorumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quorumSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  quorumVal: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.gold,
  },
  lineupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tacticalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tacticalIcon: {
    fontSize: 14,
  },
  tacticalTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  switchTeamBtn: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  switchTeamText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.gold,
  },
  teamsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  teamCol: {
    flex: 1,
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  teamACol: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  teamBCol: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  teamColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: 6,
  },
  teamATitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.teamA,
  },
  teamBTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.teamB,
  },
  teamCountBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  playerTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    padding: 6,
    borderRadius: THEME.radius.sm,
    gap: 6,
  },
  playerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  playerSub: {
    fontSize: 8,
    color: THEME.colors.textMuted,
  },
  readyCheck: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  pendingCheck: {
    color: THEME.colors.gold,
    fontSize: 11,
  },
  inviteSlotBtn: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    borderRadius: THEME.radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  inviteSlotText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  readyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  readyBarTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  readyBarSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  readyToggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
  },
  readyToggleActive: {
    backgroundColor: THEME.colors.primary,
  },
  readyToggleInactive: {
    backgroundColor: THEME.colors.cardElevated,
  },
  readyToggleText: {
    color: '#00210B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  captainCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
    gap: 10,
  },
  captainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captainTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.goldLight,
  },
  captainAdjustText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  squadRadarBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.gold,
    borderRadius: THEME.radius.md,
    padding: 12,
  },
  squadRadarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radarRadarIcon: {
    fontSize: 20,
  },
  squadRadarTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2A1700',
  },
  squadRadarSub: {
    fontSize: 9,
    color: '#5B3800',
    fontWeight: '600',
  },
  squadArrow: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2A1700',
  },
  chatSection: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  chatSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  chatBox: {
    gap: 6,
  },
  chatBubble: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.sm,
    padding: 8,
  },
  chatSender: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  chatText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chatInput: {
    flex: 1,
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.md,
    height: 40,
    paddingHorizontal: 12,
    color: THEME.colors.textPrimary,
    fontSize: 12,
  },
  chatSendBtn: {
    backgroundColor: THEME.colors.primary,
    width: 40,
    height: 40,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#00210B',
    fontSize: 14,
    fontWeight: '900',
  },
});
