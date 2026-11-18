import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, Text, Pressable } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { api, onSessionExpired } from './src/services/api';
import { storage } from './src/services/storage';
import { socketService } from './src/services/socket';
import { notificationService } from './src/services/notificationService';
import { THEME } from './src/theme';

// Pantallas
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import CompetitionScreen from './src/screens/CompetitionScreen';
import LobbyRoomScreen from './src/screens/LobbyRoomScreen';
import MatchAcceptanceScreen from './src/screens/MatchAcceptanceScreen';
import MatchRoomScreen from './src/screens/MatchRoomScreen';
import PeerReviewScreen from './src/screens/PeerReviewScreen';
import MatchSummaryScreen from './src/screens/MatchSummaryScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CalibrationScreen from './src/screens/CalibrationScreen';
import LocationSettingsScreen from './src/screens/LocationSettingsScreen';
import JoinCodeScreen from './src/screens/JoinCodeScreen';
import PlayerBiometricsScreen from './src/screens/PlayerBiometricsScreen';
import FootballLevelTestScreen from './src/screens/FootballLevelTestScreen';

// Componentes
import BottomNavBar from './src/components/BottomNavBar';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Flujo Auth
  const [authScreen, setAuthScreen] = useState('SPLASH'); // 'SPLASH' | 'LOGIN' | 'REGISTER'
  
  // Pestañas Principales (3 Destinos: Jugar · Mis partidos · Perfil - MS-11)
  const [activeTab, setActiveTab] = useState('JUGAR'); // 'JUGAR' | 'MIS_PARTIDOS' | 'PERFIL'
  
  // Sub-pantallas Nativas (Navegación Stack sin modales, con accesos secundarios)
  const [activeSubScreen, setActiveSubScreen] = useState(null); // 'NOTIFICATIONS' | 'LEADERBOARD' | 'CALIBRATION' | 'LOCATION_SETTINGS' | 'JOIN_CODE' | 'BIOMETRICS' | 'FOOTBALL_TEST'
  const [currentRadius, setCurrentRadius] = useState(8);
  const [currentDistrict, setCurrentDistrict] = useState('SURCO, LIMA');
  const [userDeclaredLevel, setUserDeclaredLevel] = useState('Intermedio');

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
        const status = await notificationService.requestPermissions();
        if (status === 'granted') {
          console.log('[NOTIFICATIONS] Permisos push otorgados.');
        }
      } catch (err) {
        console.warn('[NOTIFICATIONS] Error solicitando permisos:', err);
      }
    })();

    let mounted = true;
    const unsubscribe = onSessionExpired(() => { if (mounted) resetSession(); });
    setLoading(true);
    setSessionError('');
    (async () => {
      try {
        const token = await storage.getToken();
        if (!token) { await storage.clearUserSession(); return; }
        const { user } = await api.me();
        if (!mounted) return;
        await storage.saveUserSession(user);
        if (!mounted) return;
        setCurrentUser(user);
        initSocketSession(user);
      } catch (error) {
        if (mounted && error.status !== 401) setSessionError('No pudimos verificar tu sesión. Revisa tu conexión y vuelve a intentar.');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; unsubscribe(); socketService.disconnect(); };
  }, [restoreAttempt]);

  const initSocketSession = (user) => {
    const socket = socketService.connect(user.id, user);

    // Pantalla de confirmación de 20s estilo MOBA
    socket.on('matchPromptAcceptance', async (data) => {
      console.log('[APP] ⚡ Desafío encontrado - Abriendo pantalla de 20s:', data);
      setAcceptanceData(data);

      await notificationService.scheduleLocalNotification({
        title: '¡RIVAL ENCONTRADO EN MATCHSPORT! ⚽',
        body: `Tienes 20 segundos para aceptar el partido de ${data.sportId?.toUpperCase() || 'cancha'}.`,
        data: { pendingMatchId: data.pendingMatchId },
      });
    });

    // Partido oficial iniciado
    socket.on('matchFound', (data) => {
      console.log('[APP] 🏟️ Partido iniciado oficial:', data.matchId);
      setAcceptanceData(null);
      setSelectedLobby(null);
      setActiveMatch(data.match);
    });

    // Sala de convocatoria creada o actualizada
    socket.on('lobbyCreated', (data) => {
      if (data && data.lobby) {
        setSelectedLobby(data.lobby);
      }
    });

    socket.on('lobbyUpdated', (data) => {
      if (data && data.lobby) {
        setSelectedLobby((prev) => {
          if (prev && prev.code === data.lobby.code) {
            return data.lobby;
          }
          return prev;
        });
      }
    });

    socket.on('lobbyRestored', (data) => {
      if (data && data.lobby) {
        setSelectedLobby(data.lobby);
      }
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

  const resetSession = () => {
    socketService.disconnect();
    setCurrentUser(null);
    setActiveMatch(null);
    setSelectedLobby(null);
    setPeerReviewMatch(null);
    setSummaryData(null);
    setAuthScreen('SPLASH');
    setAcceptanceData(null);
    setActiveSubScreen(null);
    setSessionError('');
  };

  const handleLogout = async () => {
    // Always close this device; server revocation is attempted while its token exists.
    setLoading(true);
    resetSession();
    try { await api.logout(); } catch (error) { console.warn('[SESSION] Cierre remoto no confirmado:', error.message); }
    try { await storage.clearUserSession(); }
    catch { setSessionError('No pudimos limpiar la sesión guardada. Vuelve a intentar.'); }
    finally { setLoading(false); }
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

  if (sessionError) return (
    <SafeAreaView style={styles.loadingContainer}>
      <Text style={{ color: '#fff', textAlign: 'center', margin: 24 }}>{sessionError}</Text>
      <Pressable accessibilityRole="button" onPress={() => setRestoreAttempt(value => value + 1)}>
        <Text style={{ color: THEME.colors.primary, padding: 16 }}>Reintentar</Text>
      </Pressable>
    </SafeAreaView>
  );

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
  // ONBOARDING CONTINUO OBLIGATORIO (MS-10 / D-02 / D-06 / V-05 / V-06)
  // Cuenta -> Datos mínimos (distrito y posición) -> Test (14 preguntas) -> Carta Inicial
  // ==========================================
  if (currentUser && !currentUser.hasCompletedTest) {
    if (!currentUser.district || !currentUser.position) {
      return (
        <PlayerBiometricsScreen
          user={currentUser}
          onCompleteProfile={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
          onCancel={handleLogout}
        />
      );
    }

    return (
      <FootballLevelTestScreen
        user={currentUser}
        onFinishTest={async () => {
          const updatedUser = await storage.getUserSession();
          if (updatedUser) setCurrentUser(updatedUser);
          // Si existía una invitación pendiente, unirse automáticamente a la convocatoria (V-06)
          const pendingCode = await storage.getPendingInviteCode();
          if (pendingCode) {
            await storage.clearPendingInviteCode();
            const socket = socketService.getSocket();
            if (socket && (updatedUser || currentUser)) {
              socket.emit('joinLobby', { code: pendingCode, user: updatedUser || currentUser });
            }
          }
          setActiveSubScreen(null);
          setActiveTab('JUGAR');
        }}
        onCancel={handleLogout}
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

  // 6. Sub-pantallas Nativas de Flujo (Navegación Stack sin Modales)
  if (activeSubScreen === 'NOTIFICATIONS') {
    return (
      <NotificationsScreen
        user={currentUser}
        onBack={() => setActiveSubScreen(null)}
        onEnterLobby={(lobby) => {
          setActiveSubScreen(null);
          setSelectedLobby(lobby);
        }}
      />
    );
  }

  if (activeSubScreen === 'LEADERBOARD') {
    return (
      <LeaderboardScreen
        currentUser={currentUser}
        onBack={() => setActiveSubScreen(null)}
      />
    );
  }

  if (activeSubScreen === 'CALIBRATION') {
    return (
      <CalibrationScreen
        user={currentUser}
        onBack={() => setActiveSubScreen(null)}
      />
    );
  }

  if (activeSubScreen === 'LOCATION_SETTINGS') {
    return (
      <LocationSettingsScreen
        currentRadius={currentRadius}
        currentDistrict={currentDistrict}
        onSave={({ radiusKm, district }) => {
          setCurrentRadius(radiusKm);
          setCurrentDistrict(district);
        }}
        onBack={() => setActiveSubScreen(null)}
      />
    );
  }

  if (activeSubScreen === 'JOIN_CODE') {
    return (
      <JoinCodeScreen
        onJoinCode={(code) => {
          setActiveSubScreen(null);
          const socket = socketService.getSocket();
          if (socket && currentUser) {
            socket.emit('joinLobby', { code, user: currentUser });
          }
        }}
        onBack={() => setActiveSubScreen(null)}
      />
    );
  }

  if (activeSubScreen === 'BIOMETRICS') {
    return (
      <PlayerBiometricsScreen
        user={currentUser}
        onCompleteProfile={(updatedUser) => {
          setCurrentUser(updatedUser);
          setActiveSubScreen('FOOTBALL_TEST');
        }}
        onCancel={() => setActiveSubScreen(null)}
      />
    );
  }

  if (activeSubScreen === 'FOOTBALL_TEST') {
    return (
      <FootballLevelTestScreen
        user={currentUser}
        onFinishTest={() => {
          // Recargar el usuario con el test completado
          storage.getUserSession().then((u) => {
            if (u) setCurrentUser(u);
          });
          setActiveSubScreen(null);
          setActiveTab('JUGAR');
        }}
        onCancel={() => setActiveSubScreen(null)}
      />
    );
  }

  // ==========================================
  // VISTA PRINCIPAL CON BOTTOM NAVIGATION BAR (3 TABS: JUGAR · MIS PARTIDOS · PERFIL)
  // Accesos secundarios a Ranking y Notificaciones en Barra Superior (MS-11)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={THEME.colors.bgCanvas} />

      {/* Top Header con Marca y Accesos Secundarios */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitleWhite}>MATCH</Text>
          <Text style={styles.brandTitleGreen}>SPORT</Text>
        </View>

        <View style={styles.headerIconsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver Tabla de Posiciones y Ranking"
            style={styles.headerIconButton}
            onPress={() => setActiveSubScreen('LEADERBOARD')}
          >
            <Text style={styles.headerIconText}>🏆</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver Notificaciones"
            style={styles.headerIconButton}
            onPress={() => setActiveSubScreen('NOTIFICATIONS')}
          >
            <Text style={styles.headerIconText}>🔔</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'JUGAR' && (
          <CompetitionScreen
            key="JUGAR"
            user={currentUser}
            mine={false}
            onNavigateToPlay={() => setActiveTab('JUGAR')}
          />
        )}

        {(activeTab === 'MIS_PARTIDOS' || activeTab === 'SALAS') && (
          <CompetitionScreen
            key="MIS_PARTIDOS"
            user={currentUser}
            mine={true}
            onNavigateToPlay={() => setActiveTab('JUGAR')}
          />
        )}

        {activeTab === 'PERFIL' && (
          <ProfileScreen
            user={currentUser}
            onLogout={handleLogout}
            onOpenLeaderboard={() => setActiveSubScreen('LEADERBOARD')}
            onNavigateToPlay={() => setActiveTab('JUGAR')}
          />
        )}
      </View>

      {/* Persistent Bottom Bar (3 Destinos Principales) */}
      <BottomNavBar
        activeTab={activeTab === 'SALAS' ? 'MIS_PARTIDOS' : activeTab}
        onSelectTab={setActiveTab}
        openRoomsCount={0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.bgCanvas,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitleWhite: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandTitleGreen: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.colors.cardBg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 18,
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
