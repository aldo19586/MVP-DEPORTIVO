import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';

export default function MatchRoomScreen({ match, currentUser, onMatchFinished }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [timeRemainingSec, setTimeRemainingSec] = useState(3600); // 60 minutos
  const [timerActive, setTimerActive] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !match) return;

    // Unirse al canal del partido
    socket.emit('joinMatchRoom', { matchId: match.id });

    // Escuchar mensajes de chat
    const handleNewMessage = ({ matchId, message }) => {
      if (matchId === match.id) {
        setMessages((prev) => [...prev, message]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    // Escuchar finalización o reporte
    const handleMatchFinished = (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Partido Finalizado', 'El resultado oficial ha sido registrado.', [
        { text: 'Aceptar', onPress: () => onMatchFinished() }
      ]);
    };

    const handleMatchCancelled = (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Partido Cancelado', data.message || 'El partido fue cancelado por un jugador.', [
        { text: 'Volver al Radar', onPress: () => onMatchFinished() }
      ]);
    };

    socket.on('newChatMessage', handleNewMessage);
    socket.on('matchFinished', handleMatchFinished);
    socket.on('matchCancelled', handleMatchCancelled);

    // Temporizador de cancha
    const timerInterval = setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      socket.off('newChatMessage', handleNewMessage);
      socket.off('matchFinished', handleMatchFinished);
      socket.off('matchCancelled', handleMatchCancelled);
      clearInterval(timerInterval);
    };
  }, [match]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('sendChatMessage', {
        matchId: match.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: inputText.trim()
      });
      setInputText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleReportResult = () => {
    Alert.alert(
      'Reporte de Resultado',
      '¿Qué equipo se llevó la victoria en el partido?',
      [
        {
          text: 'Ganó Equipo Azul (A)',
          onPress: () => submitOfficialResult('teamA')
        },
        {
          text: 'Ganó Equipo Rojo (B)',
          onPress: () => submitOfficialResult('teamB')
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const submitOfficialResult = (winnerTeam) => {
    const socket = socketService.getSocket();
    if (socket) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      socket.emit('reportResultByReporter', {
        matchId: match.id,
        reporterUserId: currentUser.id,
        winnerTeam
      });
    }
  };

  const handleLeaveMatch = () => {
    Alert.alert(
      'Abandonar Partido',
      '¿Estás seguro de que deseas salir de la cancha?',
      [
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            const socket = socketService.getSocket();
            if (socket) {
              socket.emit('leaveMatch', { matchId: match.id, userId: currentUser.id });
            }
            onMatchFinished();
          }
        },
        { text: 'Permanecer', style: 'cancel' }
      ]
    );
  };

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemainingSec <= 300; // Menos de 5 minutos

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Barra superior de Cancha y Temporizador */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.matchTitle}>
            {match?.sportId?.toUpperCase() || 'FÚTBOL'} • {match?.formatId?.toUpperCase() || '5V5'}
          </Text>
          <Text style={styles.matchSubtitle}>ID: {match?.id?.slice(0, 14)}...</Text>
        </View>

        {/* Reloj de Cancha */}
        <View style={[styles.timerBadge, isLowTime && styles.timerBadgeWarning]}>
          <Text style={[styles.timerText, isLowTime && styles.timerTextWarning]}>
            ⏱️ {formatTimer(timeRemainingSec)}
          </Text>
        </View>
      </View>

      {/* Roster de Equipos (Team A vs Team B) */}
      <View style={styles.scoreboard}>
        <View style={styles.teamColumn}>
          <Text style={styles.teamHeaderA}>🔵 EQUIPO AZUL</Text>
          {(match?.teamA || []).map((p, idx) => (
            <Text key={`ta-${p.id || idx}`} style={styles.playerText} numberOfLines={1}>
              {p.name} {p.id === currentUser.id ? '★' : ''} ({p.position || 'MED'})
            </Text>
          ))}
        </View>

        <View style={styles.vsDivider}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamColumn}>
          <Text style={styles.teamHeaderB}>🔴 EQUIPO ROJO</Text>
          {(match?.teamB || []).map((p, idx) => (
            <Text key={`tb-${p.id || idx}`} style={styles.playerText} numberOfLines={1}>
              {p.name} {p.id === currentUser.id ? '★' : ''} ({p.position || 'MED'})
            </Text>
          ))}
        </View>
      </View>

      {/* Chat de Cancha en Tiempo Real */}
      <View style={styles.chatSection}>
        <Text style={styles.chatSectionHeader}>💬 CHAT DE COORDINACIÓN EN VIVO</Text>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || `msg-${index}`}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.senderId === currentUser.id;
            const isSystem = item.senderId === 'system';

            if (isSystem) {
              return (
                <View style={styles.systemMessageContainer}>
                  <Text style={styles.systemMessageText}>{item.text}</Text>
                </View>
              );
            }

            return (
              <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Comunícate con tus compañeros y rivales sobre color de camisetas o hora de llegada.
              </Text>
            </View>
          }
        />

        {/* Input de Chat */}
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Escribe un mensaje de cancha..."
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Text style={styles.sendButtonText}>ENVIAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Botones Inferiores de Partido */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.reportBtn} onPress={handleReportResult}>
          <Text style={styles.reportBtnText}>🏆 REPORTAR RESULTADO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveMatch}>
          <Text style={styles.leaveBtnText}>ABANDONAR</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 45
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  matchTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1
  },
  matchSubtitle: {
    color: '#64748b',
    fontSize: 11
  },
  timerBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981'
  },
  timerBadgeWarning: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  timerText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '900'
  },
  timerTextWarning: {
    color: '#ef4444'
  },
  scoreboard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    margin: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  teamColumn: {
    flex: 1
  },
  teamHeaderA: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6
  },
  teamHeaderB: {
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6
  },
  playerText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 2
  },
  vsDivider: {
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  vsText: {
    color: '#64748b',
    fontWeight: '900',
    fontSize: 14
  },
  chatSection: {
    flex: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  chatSectionHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8
  },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '80%'
  },
  myMessage: {
    backgroundColor: '#10b981',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2
  },
  theirMessage: {
    backgroundColor: '#0f172a',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2
  },
  senderName: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2
  },
  messageText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500'
  },
  systemMessageContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 6,
    marginVertical: 4,
    alignItems: 'center'
  },
  systemMessageText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700'
  },
  emptyChat: {
    padding: 20,
    alignItems: 'center'
  },
  emptyChatText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center'
  },
  chatInputContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
    marginRight: 8
  },
  sendButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 14
  },
  sendButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900'
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'space-between'
  },
  reportBtn: {
    flex: 2,
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8
  },
  reportBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  leaveBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  leaveBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800'
  }
});
