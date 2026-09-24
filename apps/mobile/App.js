import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { storage } from './src/services/storage';
import { socketService } from './src/services/socket';
import { THEME } from './src/theme';

// Pantallas
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RadarScreen from './src/screens/RadarScreen';
import LobbyListScreen from './src/screens/LobbyListScreen';
import LobbyRoomScreen from './src/screens/LobbyRoomScreen';
import MatchAcceptanceScreen from './src/screens/MatchAcceptanceScreen';
import MatchRoomScreen from './src/screens/MatchRoomScreen';
import PeerReviewScreen from './src/screens/PeerReviewScreen';
import MatchSummaryScreen from './src/screens/MatchSummaryScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Componentes
import BottomNavBar from './src/components/BottomNavBar';

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
  
  // Flujo Auth
  const [authScreen, setAuthScreen] = useState('SPLASH'); // 'SPLASH' | 'LOGIN' | 'REGISTER'
  
  // Pestañas Principales
  const [activeTab, setActiveTab] = useState('JUGAR'); // 'JUGAR' | 'SALAS' | 'RANKING' | 'PERFIL'
  
  // Pantallas Nativas de Flujo (Pushed Screens)
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [acceptanceData, setAcceptanceData] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [peerReviewMatch, setPeerReviewMatch] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    // 1. Permisos de Notificaciones Push
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
          setActiveTab('JUGAR');
        } else {
          setAuthScreen('SPLASH');
        }
      } catch (e) {
        console.error('[APP] Error cargando sesión:', e);
        setAuthScreen('SPLASH');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initSocketSession = (user) => {
    const socket = socketService.connect(user.id, user);

    // Pantalla de confirmación de 20s estilo MOBA
    socket.on('matchPromptAcceptance', async (data) => {
      console.log('[APP] ⚡ Desafío encontrado - Abriendo pantalla de 20s:', data);
      setAcceptanceData(data);

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

    // Partido oficial iniciado
    socket.on('matchFound', (data) => {
      console.log('[APP] 🏟️ Partido iniciado oficial:', data.matchId);
      setAcceptanceData(null);
      setSelectedLobby(null);
      setActiveMatch(data.match);
    });

    // Partido activo restaurado por reconexión
    socket.on('activeMatch', (data) => {
      if (data && data.match) {
        setActiveMatch(data.match);
      }
    });

    // Cancelación de partida
    socket.on('matchCancelled', () => {
      setAcceptanceData(null);
      setActiveMatch(null);
      setActiveTab('JUGAR');
    });

    // Notificación en vivo de Peer Review asignado
    socket.on('peerReviewAssigned', (data) => {
      console.log('[APP] 🗳️ Evaluación circular asignada:', data);
    });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    initSocketSession(user);
    setActiveTab('JUGAR');
  };

  const handleLogout = async () => {
    await storage.clearUserSession();
    socketService.disconnect();
    setCurrentUser(null);
    setActiveMatch(null);
    setSelectedLobby(null);
    setPeerReviewMatch(null);
    setSummaryData(null);
    setAuthScreen('SPLASH');
  };

  const handleAcceptMatchPrompt = () => {
    const socket = socketService.getSocket();
    if (socket && currentUser && acceptanceData) {
      socket.emit('acceptPendingMatch', {
        pendingMatchId: acceptanceData.pendingMatchId,
        userId: currentUser.id
      });
    }
  };

  const handleDeclineMatchPrompt = () => {
    const socket = socketService.getSocket();
    if (socket && currentUser && acceptanceData) {
      socket.emit('declinePendingMatch', {
        pendingMatchId: acceptanceData.pendingMatchId,
        userId: currentUser.id
      });
    }
    setAcceptanceData(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  // ==========================================
  // FLUJO DE NO AUTENTICADO: SPLASH / LOGIN / REGISTRO
  // ==========================================
  if (!currentUser) {
    if (authScreen === 'SPLASH') {
      return (
        <SplashScreen
          onLoginPress={() => setAuthScreen('LOGIN')}
          onRegisterPress={() => setAuthScreen('REGISTER')}
        />
      );
    }
    return (
      <LoginScreen
        initialIsRegistering={authScreen === 'REGISTER'}
        onLoginSuccess={handleLoginSuccess}
        onBackToSplash={() => setAuthScreen('SPLASH')}
      />
    );
  }

  // ==========================================
  // FLUJOS NATIVOS A PANTALLA COMPLETA (PRIORIDAD ALTA)
  // ==========================================

  // 1. Pantalla de Aceptación de Partido (20s)
  if (acceptanceData) {
    return (
      <MatchAcceptanceScreen
        matchData={acceptanceData}
        onAccept={handleAcceptMatchPrompt}
        onDecline={handleDeclineMatchPrompt}
      />
    );
  }

  // 2. Pantalla de Evaluación Circular Post-Partido (Peer-Review 1-Toque)
  if (peerReviewMatch) {
    return (
      <PeerReviewScreen
        match={peerReviewMatch}
        user={currentUser}
        onVoteCompleted={(result) => {
          setPeerReviewMatch(null);
          setSummaryData({
            match: peerReviewMatch,
            reviewResult: result
          });
        }}
        onSkip={() => {
          setPeerReviewMatch(null);
          setSummaryData({ match: peerReviewMatch });
        }}
      />
    );
  }

  // 3. Pantalla de Resumen Final de Victoria y Elo Desbloqueado
  if (summaryData) {
    return (
      <MatchSummaryScreen
        match={summaryData.match}
        user={currentUser}
        reviewResult={summaryData.reviewResult}
        onBackToRadar={() => {
          setSummaryData(null);
          setActiveMatch(null);
          setActiveTab('JUGAR');
        }}
      />
    );
  }

  // 4. Pantalla de Partido en Curso (Match Room)
  if (activeMatch) {
    return (
      <MatchRoomScreen
        match={activeMatch}
        currentUser={currentUser}
        onMatchFinished={(matchData) => {
          const currentMatch = activeMatch;
          setActiveMatch(null);
          // Transicionar a la pantalla nativa de Peer-Review
          setPeerReviewMatch(currentMatch);
        }}
      />
    );
  }

  // 5. Pantalla de Sala de Convocatoria Activa (Lobby Room)
  if (selectedLobby) {
    return (
      <LobbyRoomScreen
        lobby={selectedLobby}
        user={currentUser}
        onBack={() => setSelectedLobby(null)}
        onStartSquadRadar={(code) => {
          setSelectedLobby(null);
          setActiveTab('JUGAR');
        }}
      />
    );
  }

  // ==========================================
  // VISTA PRINCIPAL CON BOTTOM NAVIGATION BAR (4 TABS)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={THEME.colors.bgCanvas} />

      <View style={styles.tabContent}>
        {activeTab === 'JUGAR' && (
          <RadarScreen
            user={currentUser}
            onNavigateToLobbies={() => setActiveTab('SALAS')}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'SALAS' && (
          <LobbyListScreen
            onEnterLobby={(lobby) => setSelectedLobby(lobby)}
            onCreateLobbyPress={() => {
              setSelectedLobby({
                code: 'NEW1',
                name: 'Mi Convocatoria',
                venueDistrict: 'Manuel Bonilla, Miraflores',
                sportId: 'futbol',
                formatId: '5v5',
                teamA: [{ id: currentUser.id, name: currentUser.name, position: currentUser.position, isMe: true, isCaptain: true, isReady: true }],
                teamB: []
              });
            }}
          />
        )}

        {activeTab === 'RANKING' && (
          <LeaderboardScreen currentUser={currentUser} />
        )}

        {activeTab === 'PERFIL' && (
          <ProfileScreen user={currentUser} onLogout={handleLogout} />
        )}
      </View>

      {/* Persistent Bottom Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        openRoomsCount={3}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

registerRootComponent(App);
