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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

export default function MatchRoomScreen({ match, currentUser, onMatchFinished, onOpenDispute }) {
  const [selectedTeamTab, setSelectedTeamTab] = useState('teamA');
  const [matchMinutes, setMatchMinutes] = useState(44);
  const [matchSeconds, setMatchSeconds] = useState(28);
  const [scoreA, setScoreA] = useState(3);
  const [scoreB, setScoreB] = useState(2);
  const [messages, setMessages] = useState([
    { sender: 'Carlos', text: 'Ya llegué a la cancha 👍 estoy calentando bajo el arco.', time: "34'" },
    { sender: 'Joaquín', text: 'Estoy con camiseta blanca y short negro en la banda derecha.', time: "36'" },
    { sender: 'Tú', text: '¡Faltan 5 minutos para el cambio! Mantengan la presión arriba.', time: "38'" }
  ]);
  const [chatInput, setChatInput] = useState('');

  const teamAPlayers = match?.teamA || [
    { id: 'p1', name: 'Mateo Ramos', position: 'MED', rating: 1840, ovr: 88, statText: '1 GOL • 1 ASIST', scoreStar: '8.9', isMe: true },
    { id: 'p2', name: 'Carlos "Gato" Vega', position: 'POR', rating: 1780, ovr: 84, statText: '4 ATAJADAS', scoreStar: '7.8' },
    { id: 'p3', name: 'Rodrigo Quispe', position: 'DEF', rating: 1810, ovr: 81, statText: '6 RECUPERAC.', scoreStar: '7.4' },
    { id: 'p4', name: 'Joaquín Morales', position: 'DEL', rating: 1860, ovr: 86, statText: '2 GOLES', scoreStar: '8.5' },
    { id: 'p5', name: 'Diego Paredes', position: 'DEF', rating: 1590, ovr: 79, statText: '92% PASES', scoreStar: '7.1' }
  ];

  const teamBPlayers = match?.teamB || [
    { id: 'p6', name: 'Lucía Morales', position: 'DEL', rating: 1750, ovr: 82, statText: '1 GOL', scoreStar: '7.9' },
    { id: 'p7', name: 'Franco Benítez', position: 'DEF', rating: 1800, ovr: 83, statText: '5 RECUPERAC.', scoreStar: '7.5' },
    { id: 'p8', name: 'Kevin Barreto', position: 'MED', rating: 1690, ovr: 80, statText: '85% PASES', scoreStar: '7.2' }
  ];

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !match) return;

    socket.emit('joinMatchRoom', { matchId: match.id });

    // Escuchar cuando el partido finaliza (disparado por backend)
    const handleMatchFinished = (data) => {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
      onMatchFinished(data);
    };

    socket.on('matchFinished', handleMatchFinished);

    return () => {
      socket.off('matchFinished', handleMatchFinished);
    };
  }, [match?.id]);

  const handleReportWinner = (winnerTeam) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}

    Alert.alert(
      'Confirmar Marcador Oficial',
      `¿Declarar ganador oficial a ${winnerTeam === 'teamA' ? 'EQUIPO AZUL' : 'EQUIPO ROJO'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            const socket = socketService.getSocket();
            if (socket) {
              socket.emit('reportResult', {
                matchId: match?.id || 'demo_match_1',
                userId: currentUser?.id || 'demo_user_1',
                winnerTeam
              });
            }
            // Navegar inmediatamente a la fase post-partido (Peer-Review)
            onMatchFinished({ winnerTeam, matchId: match?.id });
          }
        }
      ]
    );
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: 'Tú', text: chatInput.trim(), time: 'Ahora' }
    ]);
    setChatInput('');
  };

  const handleQuickChip = (text) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    setMessages((prev) => [
      ...prev,
      { sender: 'Tú', text, time: 'Ahora' }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandTitleWrap}>
          <Text style={styles.brandSmall}>MATCHSPORT</Text>
          <Text style={styles.brandTitle}>PARTIDOS EN VIVO</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellBtn}><Text style={styles.bellIcon}>🔔</Text></TouchableOpacity>
          <Image
            source={{ uri: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }}
            style={styles.avatarMini}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Match Header Info */}
        <View style={styles.venueRow}>
          <Text style={styles.venueName}>🏟️ {match?.venueDistrict || 'Cancha El Golazo • Surco'}</Text>
          <View style={styles.eloBadge}>
            <Text style={styles.eloText}>1750 ELO PROMEDIO</Text>
          </View>
        </View>

        {/* Live Timer Pill */}
        <View style={styles.liveTimerPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.liveTimerText}>
            {matchMinutes}:{matchSeconds} 2DO TIEMPO
          </Text>
        </View>
        <Text style={styles.formatSubtitle}>5v5 Fútbol Amateur Nocturno</Text>

        {/* Scoreboard */}
        <View style={styles.scoreboardCard}>
          <View style={styles.teamScoreCol}>
            <View style={styles.teamTagRow}>
              <View style={styles.blueBar} />
              <View>
                <Text style={styles.teamNameTitle}>EQUIPO A</Text>
                <Text style={styles.teamSubTag}>TU ESCUADRA</Text>
              </View>
            </View>
            <Text style={styles.scoreNumber}>{scoreA}</Text>
          </View>

          <View style={styles.vsBadge}>
            <Text style={styles.vsIcon}>⚽</Text>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={[styles.teamScoreCol, styles.teamScoreColRight]}>
            <Text style={styles.scoreNumber}>{scoreB}</Text>
            <View style={styles.teamTagRowRight}>
              <View>
                <Text style={styles.teamNameTitleRight}>EQUIPO B</Text>
                <Text style={styles.teamSubTag}>RIVAL LOCAL</Text>
              </View>
              <View style={styles.yellowBar} />
            </View>
          </View>
        </View>

        {/* Player Roster Switcher Tabs */}
        <View style={styles.teamTabsRow}>
          <TouchableOpacity
            style={[styles.teamTabBtn, selectedTeamTab === 'teamA' && styles.teamTabBtnActiveA]}
            onPress={() => setSelectedTeamTab('teamA')}
          >
            <View style={styles.blueDot} />
            <Text style={[styles.teamTabText, selectedTeamTab === 'teamA' && styles.teamTabTextActive]}>
              Equipo Azul ({teamAPlayers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.teamTabBtn, selectedTeamTab === 'teamB' && styles.teamTabBtnActiveB]}
            onPress={() => setSelectedTeamTab('teamB')}
          >
            <View style={styles.redDot} />
            <Text style={[styles.teamTabText, selectedTeamTab === 'teamB' && styles.teamTabTextActive]}>
              Equipo Rojo ({teamBPlayers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Player Cards */}
        <View style={styles.playersList}>
          {(selectedTeamTab === 'teamA' ? teamAPlayers : teamBPlayers).map((p, idx) => (
            <View key={p.id || idx} style={styles.playerCard}>
              <Image
                source={{ uri: p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }}
                style={styles.playerAvatar}
              />
              <View style={styles.playerMain}>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{p.name}</Text>
                  {p.isMe && <View style={styles.meBadge}><Text style={styles.meText}>TÚ</Text></View>}
                </View>
                <Text style={styles.playerPosTag}>{p.position} • 🟢 En Cancha</Text>
              </View>

              <View style={styles.playerStatsCol}>
                <Text style={styles.playerStarRating}>★ {p.scoreStar || '8.0'}</Text>
                <Text style={styles.playerStatText}>{p.statText || 'ACTIVO'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Live Coordination Chat Section */}
        <View style={styles.coordinationCard}>
          <View style={styles.coordHeader}>
            <Text style={styles.coordTitle}>💬 Coordinación de Cancha</Text>
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>{messages.length} MENSAJES</Text></View>
          </View>

          <View style={styles.messagesBox}>
            {messages.map((m, idx) => (
              <View key={idx} style={styles.messageBubble}>
                <Text style={styles.messageSender}>{m.sender} • {m.time}</Text>
                <Text style={styles.messageText}>{m.text}</Text>
              </View>
            ))}
          </View>

          {/* Quick Action Chips */}
          <View style={styles.quickChipsRow}>
            <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickChip('⇄ Pido Cambio')}>
              <Text style={styles.quickChipText}>⇄ Pido Cambio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickChip('💧 Pausa Hidratación')}>
              <Text style={styles.quickChipText}>💧 Hidratación</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickChip('✓ Confirmado')}>
              <Text style={styles.quickChipText}>✓ Confirmado</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe a los capitanes..."
              placeholderTextColor={THEME.colors.textMuted}
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat}>
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Designated Reporter Banner */}
        <View style={styles.reporterBanner}>
          <Text style={styles.starIcon}>🎖️</Text>
          <View style={styles.reporterContent}>
            <Text style={styles.reporterTitle}>REPORTE OFICIAL DESIGNADO</Text>
            <Text style={styles.reporterSub}>
              <Text style={styles.reporterHighlight}>{currentUser?.name || 'Mateo Ramos (Tú)'}</Text> has sido seleccionado para reportar el resultado final del partido.
            </Text>
          </View>
        </View>

        {/* Outcome Reporting Buttons */}
        <View style={styles.reportButtonsRow}>
          <TouchableOpacity
            style={[styles.winnerBtn, styles.winnerBtnBlue]}
            onPress={() => handleReportWinner('teamA')}
          >
            <Text style={styles.winnerBtnText}>✓ GANÓ EQUIPO AZUL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.winnerBtn, styles.winnerBtnRed]}
            onPress={() => handleReportWinner('teamB')}
          >
            <Text style={styles.winnerBtnText}>✓ GANÓ EQUIPO ROJO</Text>
          </TouchableOpacity>
        </View>

        {/* Dispute Button */}
        <TouchableOpacity
          style={styles.disputeBtn}
          onPress={() => {
            Alert.alert('Reportar Disputa', 'Se enviará una alerta al SuperAdmin para revisión arbitral del resultado.');
          }}
        >
          <Text style={styles.disputeText}>⚠️ Reportar Disputa / Falta Antideportiva</Text>
        </TouchableOpacity>

        <Text style={styles.validationNotice}>
          🛡️ AMBOS CAPITANES DEBEN VALIDAR PARA ACTUALIZACIÓN ELO INMEDIATA
        </Text>
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
  brandTitleWrap: {},
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 12,
  },
  venueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueName: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  eloBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.pill,
  },
  eloText: {
    color: THEME.colors.goldLight,
    fontSize: 9,
    fontWeight: '900',
  },
  liveTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginTop: 2,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginRight: 8,
  },
  liveTimerText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  formatSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: -4,
  },
  scoreboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  teamScoreCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teamScoreColRight: {
    justifyContent: 'flex-end',
  },
  blueBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: THEME.colors.teamA,
    marginRight: 6,
  },
  yellowBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: THEME.colors.teamB,
    marginLeft: 6,
  },
  teamTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamTagRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamNameTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  teamNameTitleRight: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'right',
  },
  teamSubTag: {
    fontSize: 8,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  vsBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  vsIcon: {
    fontSize: 14,
  },
  vsText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.textMuted,
  },
  teamTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  teamTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.cardBg,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  teamTabBtnActiveA: {
    borderColor: THEME.colors.teamA,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  teamTabBtnActiveB: {
    borderColor: THEME.colors.teamB,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.teamA,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.teamB,
  },
  teamTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  teamTabTextActive: {
    color: THEME.colors.textPrimary,
  },
  playersList: {
    gap: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  playerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  playerMain: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  meBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  meText: {
    color: '#00210B',
    fontSize: 8,
    fontWeight: '900',
  },
  playerPosTag: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  playerStatsCol: {
    alignItems: 'flex-end',
  },
  playerStarRating: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  playerStatText: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  coordinationCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  coordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  newBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: THEME.colors.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  messagesBox: {
    gap: 6,
  },
  messageBubble: {
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.sm,
    padding: 8,
  },
  messageSender: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  messageText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
  },
  quickChipText: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.md,
    height: 38,
    paddingHorizontal: 12,
    fontSize: 11,
    color: THEME.colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: THEME.colors.primary,
    width: 38,
    height: 38,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#00210B',
    fontSize: 13,
    fontWeight: '900',
  },
  reporterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
    gap: 10,
  },
  starIcon: {
    fontSize: 20,
  },
  reporterContent: {
    flex: 1,
  },
  reporterTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.goldLight,
    letterSpacing: 0.5,
  },
  reporterSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  reporterHighlight: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
  },
  reportButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  winnerBtn: {
    flex: 1,
    height: 48,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerBtnBlue: {
    backgroundColor: THEME.colors.primary,
  },
  winnerBtnRed: {
    backgroundColor: THEME.colors.cardBg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  winnerBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00210B',
    letterSpacing: 0.5,
  },
  disputeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: THEME.radius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disputeText: {
    color: THEME.colors.dangerLight,
    fontSize: 11,
    fontWeight: '800',
  },
  validationNotice: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
