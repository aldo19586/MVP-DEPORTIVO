import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { storage } from './src/services/storage';
import { socketService } from './src/services/socket';
import LoginScreen from './src/screens/LoginScreen';
import RadarScreen from './src/screens/RadarScreen';
import MatchRoomScreen from './src/screens/MatchRoomScreen';
import MatchPromptModal from './src/components/MatchPromptModal';

// Configurar comportamiento de Notificaciones Push nativas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('LOGIN'); // 'LOGIN' | 'RADAR' | 'MATCH_ROOM'
  const [activeMatch, setActiveMatch] = useState(null);

  // Estado del Modal Global de Aceptación (20s)
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptMatchData, setPromptMatchData] = useState(null);

  useEffect(() => {
    // 1. Solicitar permisos de Notificaciones Push
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          console.log('[NOTIFICATIONS] Permisos push otorgados.');
        }
      } catch (err) {
        console.warn('[NOTIFICATIONS] Error solicitando permisos:', err);
      }
    })();

    // 2. Restaurar sesión persistida
    (async () => {
      try {
        const session = await storage.getUserSession();
        if (session && session.id) {
          setCurrentUser(session);
          initSocketSession(session);
          setCurrentScreen('RADAR');
        } else {
          setCurrentScreen('LOGIN');
        }
      } catch (e) {
        console.error('[APP] Error cargando sesión:', e);
        setCurrentScreen('LOGIN');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initSocketSession = (user) => {
    const socket = socketService.connect(user.id, user);

    // Modal de confirmación de 20s estilo MOBA
    socket.on('matchPromptAcceptance', async (data) => {
      console.log('[APP] ⚡ Desafío encontrado - Abriendo modal de 20s:', data);
      setPromptMatchData(data);
      setShowPromptModal(true);

      // Lanzar notificación push en caso el usuario esté fuera o distraído
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '¡RIVAL ENCONTRADO EN MATCHSPORT! ⚽',
            body: `Tienes 20 segundos para aceptar el partido de ${data.sportId?.toUpperCase() || 'cancha'}.`,
            data: { pendingMatchId: data.pendingMatchId }
          },
          trigger: null
        });
      } catch (e) {
        console.log('[NOTIFICATIONS] Notificación local omitida:', e);
      }
    });

    // Actualización de jugadores que han aceptado el match prompt
    socket.on('matchPromptUpdated', (data) => {
      setPromptMatchData((prev) => (prev ? { ...prev, acceptedUserIds: data.acceptedUserIds } : prev));
    });

    // Partido oficial iniciado
    socket.on('matchFound', (data) => {
      console.log('[APP] 🏟️ Partido iniciado oficial:', data.matchId);
      setShowPromptModal(false);
      setPromptMatchData(null);
      setActiveMatch(data.match);
      setCurrentScreen('MATCH_ROOM');
    });

    // Partido activo restaurado por reconexión
    socket.on('activeMatch', (data) => {
      if (data && data.match) {
        setActiveMatch(data.match);
        setCurrentScreen('MATCH_ROOM');
      }
    });

    // Cancelación de partida
    socket.on('matchCancelled', () => {
      setShowPromptModal(false);
      setPromptMatchData(null);
      setActiveMatch(null);
      setCurrentScreen('RADAR');
    });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    initSocketSession(user);
    setCurrentScreen('RADAR');
  };

  const handleLogout = async () => {
    await storage.clearUserSession();
    socketService.disconnect();
    setCurrentUser(null);
    setActiveMatch(null);
    setCurrentScreen('LOGIN');
  };

  const handleAcceptMatchPrompt = (pendingMatchId) => {
    const socket = socketService.getSocket();
    if (socket && currentUser) {
      socket.emit('acceptPendingMatch', {
        pendingMatchId,
        userId: currentUser.id
      });
    }
  };

  const handleDeclineMatchPrompt = (pendingMatchId) => {
    const socket = socketService.getSocket();
    if (socket && currentUser) {
      socket.emit('declinePendingMatch', {
        pendingMatchId,
        userId: currentUser.id
      });
    }
    setShowPromptModal(false);
    setPromptMatchData(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#0f172a" />

      {/* Ruteador de Pantallas Nativas */}
      {currentScreen === 'LOGIN' && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {currentScreen === 'RADAR' && currentUser && (
        <RadarScreen user={currentUser} onLogout={handleLogout} />
      )}

      {currentScreen === 'MATCH_ROOM' && activeMatch && currentUser && (
        <MatchRoomScreen
          match={activeMatch}
          currentUser={currentUser}
          onMatchFinished={() => {
            setActiveMatch(null);
            setCurrentScreen('RADAR');
          }}
        />
      )}

      {/* Modal Global de Confirmación de Partido (20 segundos) */}
      <MatchPromptModal
        visible={showPromptModal}
        matchData={promptMatchData}
        currentUserId={currentUser?.id}
        onAccept={handleAcceptMatchPrompt}
        onDecline={handleDeclineMatchPrompt}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
