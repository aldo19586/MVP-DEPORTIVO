import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function MatchPromptModal({
  visible,
  matchData,
  currentUserId,
  onAccept,
  onDecline
}) {
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [hasAccepted, setHasAccepted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setSecondsLeft(matchData?.expiresInSeconds || 20);
      setHasAccepted(false);

      // Vibración de advertencia inicial estilo MOBA
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (!hasAccepted && onDecline) {
              onDecline();
            }
            return 0;
          }
          if (prev <= 5) {
            // Háptico de pulsación urgente en los últimos 5 segundos
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, matchData]);

  if (!visible || !matchData) return null;

  const handleAcceptPress = async () => {
    setHasAccepted(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onAccept) onAccept(matchData.pendingMatchId);
  };

  const handleDeclinePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onDecline) onDecline(matchData.pendingMatchId);
  };

  const acceptedCount = (matchData.acceptedUserIds || []).length;
  const totalCount = matchData.totalPlayers || 2;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header con Deporte y Modalidad */}
          <View style={styles.header}>
            <Text style={styles.sportTag}>
              {matchData.sportId?.toUpperCase() || 'FÚTBOL'} • {matchData.formatId?.toUpperCase() || '5V5'}
            </Text>
            <Text style={styles.title}>¡PARTIDO ENCONTRADO!</Text>
            <Text style={styles.subtitle}>Confirma tu asistencia para entrar a cancha</Text>
          </View>

          {/* Temporizador gigante */}
          <View style={[styles.timerCircle, secondsLeft <= 5 && styles.timerUrgent]}>
            <Text style={[styles.timerText, secondsLeft <= 5 && styles.timerTextUrgent]}>
              {secondsLeft}s
            </Text>
          </View>

          {/* Barra de progreso de confirmación de jugadores */}
          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              Aceptados: <Text style={styles.progressHighlight}>{acceptedCount} / {totalCount}</Text>
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, (acceptedCount / totalCount) * 100)}%` }
                ]}
              />
            </View>
          </View>

          {/* Lista de Equipos */}
          <ScrollView style={styles.teamsList} showsVerticalScrollIndicator={false}>
            <View style={styles.teamBox}>
              <Text style={styles.teamTitle}>🔵 EQUIPO LOCAL</Text>
              {(matchData.teamA || []).map((p, idx) => (
                <View key={`teama-${p.id || idx}`} style={styles.playerRow}>
                  <Text style={styles.playerName}>
                    {p.name} {p.id === currentUserId ? '(Tú)' : ''}
                  </Text>
                  <Text style={styles.playerPosition}>{p.position || 'MED'}</Text>
                </View>
              ))}
            </View>

            <View style={styles.teamBox}>
              <Text style={[styles.teamTitle, styles.teamTitleRival]}>🔴 EQUIPO VISITANTE</Text>
              {(matchData.teamB || []).map((p, idx) => (
                <View key={`teamb-${p.id || idx}`} style={styles.playerRow}>
                  <Text style={styles.playerName}>
                    {p.name} {p.id === currentUserId ? '(Tú)' : ''}
                  </Text>
                  <Text style={styles.playerPosition}>{p.position || 'MED'}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.actionButtons}>
            {!hasAccepted ? (
              <>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={handleAcceptPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.acceptButtonText}>ACEPTAR PARTIDO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={handleDeclinePress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.declineButtonText}>RECHAZAR</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.waitingBadge}>
                <Text style={styles.waitingText}>
                  ✓ ¡Aceptaste! Esperando que el resto confirme...
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#10b981',
    padding: 20,
    width: '100%',
    maxHeight: '85%',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10
  },
  header: {
    alignItems: 'center',
    marginBottom: 12
  },
  sportTag: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  timerCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#0f172a',
    borderWidth: 3,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12
  },
  timerUrgent: {
    borderColor: '#ef4444'
  },
  timerText: {
    color: '#10b981',
    fontSize: 26,
    fontWeight: '900'
  },
  timerTextUrgent: {
    color: '#ef4444'
  },
  progressSection: {
    width: '100%',
    marginBottom: 12
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6
  },
  progressHighlight: {
    color: '#f8fafc',
    fontWeight: '800'
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4
  },
  teamsList: {
    width: '100%',
    maxHeight: 180,
    marginVertical: 8
  },
  teamBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8
  },
  teamTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6
  },
  teamTitleRival: {
    color: '#f43f5e'
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  playerName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600'
  },
  playerPosition: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700'
  },
  actionButtons: {
    width: '100%',
    marginTop: 12
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8
  },
  acceptButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1
  },
  declineButton: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569'
  },
  declineButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700'
  },
  waitingBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  waitingText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700'
  }
});
