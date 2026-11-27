import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, Text, Pressable, TouchableOpacity } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { api, onSessionExpired } from './src/services/api';
import { storage } from './src/services/storage';
import { socketService } from './src/services/socket';
import { notificationService } from './src/services/notificationService';
import { THEME } from './src/theme';

// Pantallas
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RadarScreen from './src/screens/RadarScreen';
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
  const [skippedTest, setSkippedTest] = useState(false);
  
  // Flujo Auth
  const [authScreen, setAuthScreen] = useState('SPLASH'); // 'SPLASH' | 'LOGIN' | 'REGISTER'
  
  // Pestañas Principales (4 Destinos: Jugar · Salas · Ranking · Perfil)
  const [activeTab, setActiveTab] = useState('JUGAR'); // 'JUGAR' | 'SALAS' | 'RANKING' | 'PERFIL'
  
  // Sub-pantallas Nativas (Navegación Stack sin modales, con accesos secundarios)
  const [activeSubScreen, setActiveSubScreen] = useState(null); // 'NOTIFICATIONS' | 'LEADERBOARD' | 'CALIBRATION' | 'LOCATION_SETTINGS' | 'JOIN_CODE' | 'BIOMETRICS' | 'FOOTBALL_TEST'
  const [currentRadius, setCurrentRadius] = useState(8);
  const [currentDistrict, setCurrentDistrict] = useState('SURCO, LIMA');
  const [userDeclaredLevel, setUserDeclaredLevel] = useState('Intermedio');
  const [manuallyPausedSession, setManuallyPausedSession] = useState(false);
  const manuallyPausedRef = useRef(false);
  const currentUserRef = useRef(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Pantallas Nativas de Flujo (Pushed Screens)
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [acceptanceData, setAcceptanceData] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [peerReviewMatch, setPeerReviewMatch] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  // Navegación por Notificaciones Push y Avisos (MS-15)
  const [targetCompetitionId, setTargetCompetitionId] = useState(null);
  const [targetCompetitionCode, setTargetCompetitionCode] = useState(null);
  const [pushPermissionStatus, setPushPermissionStatus] = useState('undetermined');

  // Estado Global de Búsqueda de Partida (Situación en Cola Glicko-2)
  const [queueState, setQueueState] = useState({
    isSearching: false,
    sportId: 'futbol',
    formatId: '5v5',
    district: 'SURCO, LIMA',
    seconds: 0,
  });

  useEffect(() => {
    let interval = null;
    if (queueState.isSearching) {
      interval = setInterval(() => {
        setQueueState((prev) => (prev.isSearching ? { ...prev, seconds: prev.seconds + 1 } : prev));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [queueState.isSearching]);

  const handleCancelGlobalQueue = async () => {
    manuallyPausedRef.current = true;
    setManuallyPausedSession(true);
    const socket = socketService.getSocket();
    if (socket && currentUserRef.current) {
      socket.emit('cancelQueue', { userId: currentUserRef.current.id });
    }
    setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
    notificationService.dismissOngoingSearchNotification();
    try {
      const res = await api.updateMatchmakingStatus({ status: 'IDLE' });
      if (res?.user) {
        setCurrentUser(res.user);
        await storage.saveUserSession(res.user);
      }
    } catch (e) {}
  };

  const handleNotificationIntent = (data, explicitUser = null) => {
    if (!data) return;
    const activeUser = explicitUser || currentUserRef.current || currentUser;
    if (!activeUser) {
      storage.savePendingNotificationIntent(data);
      return;
    }
    if (data.competitionId || data.code) {
      setTargetCompetitionId(data.competitionId || null);
      setTargetCompetitionCode(data.code || null);
      setActiveSubScreen(null);
      setSelectedLobby(null);
      setActiveMatch(null);
      setActiveTab('SALAS');
    } else if (data.lobbyCode) {
      setActiveSubScreen(null);
      setSelectedLobby({ code: data.lobbyCode });
    }
  };

  const syncMatchmakingEntryFlow = async (user, { forceActivate = false } = {}) => {
    if (!user) return user;
    if (user.district) {
      setCurrentDistrict(user.searchingDistrict || user.district);
    }
    if (user.searchingRadiusKm) {
      setCurrentRadius(Number(user.searchingRadiusKm) || 8);
    }

    // 1. Si el jugador ya está en una sala activa ('IN_ROOM' + activeCompetitionId), derivarlo directo a su sala
    if (user.matchmakingStatus === 'IN_ROOM' && user.activeCompetitionId) {
      setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
      setTargetCompetitionId(user.activeCompetitionId);
      setTargetCompetitionCode(null);
      setActiveSubScreen(null);
      setSelectedLobby(null);
      setActiveMatch(null);
      setActiveTab('SALAS');
      return user;
    }

    // 2. Si tiene perfil y test completos y no pausó manualmente en la sesión, activar/sincronizar 'SEARCHING' en BD
    const profileReady = Boolean(user.hasCompletedProfile && user.district && user.position);
    const testReady = Boolean(user.hasCompletedTest);
    if (profileReady && testReady && (!manuallyPausedRef.current || forceActivate)) {
      if (forceActivate) {
        manuallyPausedRef.current = false;
        setManuallyPausedSession(false);
      }
      try {
        const formatToUse = user.searchingFormat || '7v7';
        const districtToUse = user.searchingDistrict || user.district || currentDistrict;
        const radiusToUse = Number(user.searchingRadiusKm || currentRadius || 8);
        const res = await api.updateMatchmakingStatus({
          status: 'SEARCHING',
          formatId: formatToUse,
          district: districtToUse,
          radiusKm: radiusToUse,
        });
        const syncedUser = res?.user || user;
        setCurrentUser(syncedUser);
        await storage.saveUserSession(syncedUser);

        if (syncedUser.matchmakingStatus === 'IN_ROOM' && syncedUser.activeCompetitionId) {
          setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
          setTargetCompetitionId(syncedUser.activeCompetitionId);
          setTargetCompetitionCode(null);
          setActiveSubScreen(null);
          setSelectedLobby(null);
          setActiveMatch(null);
          setActiveTab('SALAS');
        } else if (syncedUser.matchmakingStatus === 'SEARCHING') {
          setQueueState({
            isSearching: true,
            sportId: 'futbol',
            formatId: syncedUser.searchingFormat || formatToUse,
            district: syncedUser.searchingDistrict || districtToUse,
            seconds: 0,
          });
        }
        return syncedUser;
      } catch (err) {
        console.warn('[MATCHMAKING] No se pudo sincronizar disponibilidad inicial:', err.message);
      }
    }
    return user;
  };

  useEffect(() => {
    // 1. Verificación Contextual de Permisos de Notificaciones Push (MS-15 / V-15 / V-18)
    (async () => {
      try {
        const { status } = await notificationService.getPermissionStatus();
        setPushPermissionStatus(status);
        if (status === 'granted') {
          console.log('[NOTIFICATIONS] Permisos push disponibles.');
        }
      } catch (err) {
        console.warn('[NOTIFICATIONS] Error verificando estado de permisos:', err);
      }
    })();

    // 2. Suscripción a interacción con avisos (tap desde segundo plano o en vivo)
    const responseSub = notificationService.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        console.log('[NOTIFICATIONS] Notificación pulsada:', data);
        handleNotificationIntent(data);
      }
    });

    // 3. Revisar si la app fue abierta en frío desde una notificación
    notificationService.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        console.log('[NOTIFICATIONS] App abierta desde notificación en frío:', data);
        handleNotificationIntent(data);
      }
    });

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
        currentUserRef.current = user;
        initSocketSession(user);

        // Registrar token push en el backend de forma segura
        const pushToken = await notificationService.getPushToken();
        if (pushToken && user?.id) {
          await api.registerPushToken(user.id, pushToken).catch(() => {});
        }

        // Auto-activación en BD o derivación inmediata si ya tiene sala asignada
        const syncedUser = await syncMatchmakingEntryFlow(user);

        // Si existía una intención de notificación previa al login, resolverla
        const pendingIntent = await storage.getPendingNotificationIntent();
        if (pendingIntent) {
          await storage.clearPendingNotificationIntent();
          handleNotificationIntent(pendingIntent, syncedUser || user);
        }
      } catch (error) {
        if (mounted && error.status !== 401) setSessionError('No pudimos verificar tu sesión. Revisa tu conexión y vuelve a intentar.');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => {
      mounted = false;
      unsubscribe();
      if (responseSub && responseSub.remove) responseSub.remove();
      socketService.disconnect();
    };
  }, [restoreAttempt]);

  const initSocketSession = (user) => {
    const socket = socketService.connect(user.id, user);

    // Eventos de cola y emparejamiento (Situación en Vivo)
    socket.on('queueStarted', (data) => {
      setQueueState({
        isSearching: true,
        sportId: data?.challenge?.sportId || 'futbol',
        formatId: data?.challenge?.formatId || '5v5',
        district: data?.challenge?.district || currentDistrict,
        seconds: 0,
      });
      notificationService.startOngoingSearchNotification({
        format: data?.challenge?.formatId || '5v5',
        district: data?.challenge?.district || currentDistrict,
      });
    });

    socket.on('queueCancelled', () => {
      setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
      notificationService.dismissOngoingSearchNotification();
    });

    // Pantalla de confirmación de 20s estilo MOBA
    socket.on('matchPromptAcceptance', async (data) => {
      console.log('[APP] ⚡ Desafío encontrado - Abriendo pantalla de 20s:', data);
      setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
      notificationService.dismissOngoingSearchNotification();
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
      setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
      notificationService.dismissOngoingSearchNotification();
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

    // Avisos de Bolsa de Suplentes y Estado de Convocatoria para el Centro de Notificaciones (V-18)
    socket.on('lobbyNeedsOne', (data) => {
      storage.addNotification({
        type: 'SUPLENTE_URGENTE',
        title: '¡FALTA 1 SUPLENTE!',
        body: `Se necesita un suplente de emergencia en ${data?.venue || data?.district || 'tu zona'}.`,
        code: data?.code,
        data: { lobbyCode: data?.code, venue: data?.venue, district: data?.district }
      });
    });

    socket.on('competitionScoreReported', (data) => {
      storage.addNotification({
        type: 'COMPETITION_MATCH',
        title: 'Marcador Reportado ⚽',
        body: `El capitán rival reportó el marcador en la convocatoria #${data?.code || data?.competitionId}.`,
        data: { competitionId: data?.competitionId, matchId: data?.matchId, code: data?.code }
      });
    });

    socket.on('competitionScoreConfirmed', (data) => {
      storage.addNotification({
        type: 'COMPETITION_MATCH',
        title: 'Marcador Confirmado 🏆',
        body: `El partido #${data?.code || data?.competitionId} finalizó oficialmente. Ratings Glicko-2 actualizados.`,
        data: { competitionId: data?.competitionId, matchId: data?.matchId, code: data?.code }
      });
    });

    socket.on('competitionScoreDisputed', (data) => {
      storage.addNotification({
        type: 'COMPETITION_MATCH',
        title: 'Marcador en Disputa ⚠️',
        body: `Se abrió una disputa arbitral en el partido #${data?.code || data?.competitionId}.`,
        data: { competitionId: data?.competitionId, matchId: data?.matchId, code: data?.code }
      });
    });

    socket.on('competitionDisputeResolved', (data) => {
      storage.addNotification({
        type: 'COMPETITION_MATCH',
        title: 'Disputa Resuelta ⚖️',
        body: `El SuperAdmin dictaminó el resultado oficial del partido #${data?.code || data?.competitionId}.`,
        data: { competitionId: data?.competitionId, matchId: data?.matchId, code: data?.code }
      });
    });

    // Sincronización en tiempo real del estado persistente de matchmaking en BD
    socket.on('matchmakingStatusUpdated', (data) => {
      if (data?.user) {
        setCurrentUser(data.user);
        currentUserRef.current = data.user;
        storage.saveUserSession(data.user).catch(() => {});
      } else if (data?.matchmakingStatus) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            matchmakingStatus: data.matchmakingStatus,
            searchingFormat: data.searchingFormat !== undefined ? data.searchingFormat : prev.searchingFormat,
            searchingDistrict: data.searchingDistrict !== undefined ? data.searchingDistrict : prev.searchingDistrict,
            searchingRadiusKm: data.searchingRadiusKm !== undefined ? data.searchingRadiusKm : prev.searchingRadiusKm,
            searchingSince: data.searchingSince !== undefined ? data.searchingSince : prev.searchingSince,
            searchingExpiresAt: data.searchingExpiresAt !== undefined ? data.searchingExpiresAt : prev.searchingExpiresAt,
            activeCompetitionId: data.activeCompetitionId !== undefined ? data.activeCompetitionId : prev.activeCompetitionId,
          };
          currentUserRef.current = next;
          storage.saveUserSession(next).catch(() => {});
          return next;
        });
      }

      if (data?.matchmakingStatus === 'SEARCHING') {
        setQueueState((prev) => ({
          ...prev,
          isSearching: true,
          formatId: data.searchingFormat || prev.formatId || '7v7',
          district: data.searchingDistrict || prev.district || currentDistrict,
        }));
      } else if (data?.matchmakingStatus === 'IDLE' || data?.matchmakingStatus === 'IN_ROOM') {
        setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
        notificationService.dismissOngoingSearchNotification();
      }
    });

    // Asignación automática de sala por el motor de disponibilidad persistente (Fase 2 & 3)
    socket.on('matchmakingRoomAssigned', async (data) => {
      const compId = data?.competitionId || data?.competition?.id || null;
      const compCode = data?.code || data?.competition?.code || null;
      if (!compId && !compCode) return;

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
      notificationService.dismissOngoingSearchNotification();

      setCurrentUser((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          matchmakingStatus: 'IN_ROOM',
          activeCompetitionId: compId || prev.activeCompetitionId,
          searchingSince: null,
          searchingExpiresAt: null,
        };
        currentUserRef.current = next;
        storage.saveUserSession(next).catch(() => {});
        return next;
      });

      const formatLabel = data?.competition?.formatId || 'Fútbol';
      const districtLabel = data?.competition?.district || currentDistrict;

      storage.addNotification({
        type: 'MATCHMAKING_ROOM_ASSIGNED',
        title: '¡Partido encontrado en tu zona! ⚽',
        body: `Te asignamos automáticamente a la sala #${compCode || compId} (${formatLabel} en ${districtLabel}).`,
        data: { competitionId: compId, code: compCode }
      }).catch(() => {});

      notificationService.scheduleLocalNotification({
        title: '¡Partido encontrado en tu zona! ⚽',
        body: `Sala #${compCode || ''} lista en ${districtLabel}. Entrando a la convocatoria...`,
        data: { competitionId: compId, code: compCode }
      }).catch(() => {});

      handleNotificationIntent({ competitionId: compId, code: compCode }, currentUserRef.current);
    });
  };

  const handleLoginSuccess = async (user) => {
    manuallyPausedRef.current = false;
    setManuallyPausedSession(false);
    setCurrentUser(user);
    currentUserRef.current = user;
    initSocketSession(user);
    setActiveTab('JUGAR');

    // Registrar token push tras login
    const pushToken = await notificationService.getPushToken();
    if (pushToken && user?.id) {
      await api.registerPushToken(user.id, pushToken).catch(() => {});
    }

    // Auto-activar disponibilidad persistente o derivar a sala activa
    const syncedUser = await syncMatchmakingEntryFlow(user);

    // Resolver intención de notificación pendiente si existía
    const pendingIntent = await storage.getPendingNotificationIntent();
    if (pendingIntent) {
      await storage.clearPendingNotificationIntent();
      handleNotificationIntent(pendingIntent, syncedUser || user);
    }
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
          onGuestPress={() => setAuthScreen('LOGIN')}
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
  // ONBOARDING INICIAL: Ficha Biométrica obligatoria, Test de Nivel opcional (con botón X)
  // ==========================================
  if (currentUser && (!currentUser.hasCompletedProfile || !currentUser.district || !currentUser.position)) {
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

  if (currentUser && !currentUser.hasCompletedTest && !skippedTest) {
    return (
      <FootballLevelTestScreen
        user={currentUser}
        onCancel={() => setSkippedTest(true)}
        onFinishTest={async () => {
          const updatedUser = await storage.getUserSession();
          const finalUser = updatedUser || currentUser;
          if (updatedUser) {
            setCurrentUser(updatedUser);
            currentUserRef.current = updatedUser;
          }
          // Si existía una invitación pendiente, unirse automáticamente a la convocatoria (V-06)
          const pendingCode = await storage.getPendingInviteCode();
          if (pendingCode) {
            await storage.clearPendingInviteCode();
            const socket = socketService.getSocket();
            if (socket && finalUser) {
              socket.emit('joinLobby', { code: pendingCode, user: finalUser });
            }
          }
          setActiveSubScreen(null);
          setActiveTab('JUGAR');
          const syncedUser = await syncMatchmakingEntryFlow(finalUser, { forceActivate: true });
          // Si existía una intención de notificación pendiente, resolverla (V-18)
          const pendingIntent = await storage.getPendingNotificationIntent();
          if (pendingIntent) {
            await storage.clearPendingNotificationIntent();
            handleNotificationIntent(pendingIntent, syncedUser || finalUser);
          }
        }}
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
        permissionStatus={pushPermissionStatus}
        onRequestPermissions={async () => {
          const status = await notificationService.requestPermissions();
          setPushPermissionStatus(status);
          if (status === 'granted' && currentUser) {
            const token = await notificationService.getPushToken();
            if (token) api.registerPushToken(currentUser.id, token).catch(() => {});
          }
        }}
        onBack={() => setActiveSubScreen(null)}
        onOpenCompetition={({ competitionId, code }) => {
          setActiveSubScreen(null);
          setTargetCompetitionId(competitionId || null);
          setTargetCompetitionCode(code || null);
          setActiveTab('SALAS');
        }}
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
        currentRadius={currentRadius}
        currentDistrict={currentDistrict}
        onSavePreferences={(prefs) => {
          if (prefs?.radiusKm) {
            setCurrentRadius(prefs.radiusKm);
            if (currentUser?.matchmakingStatus === 'SEARCHING') {
              api.updateMatchmakingStatus({
                status: 'SEARCHING',
                formatId: currentUser.searchingFormat || '7v7',
                district: currentDistrict,
                radiusKm: Number(prefs.radiusKm) || 8,
              }).then((res) => {
                if (res?.user) {
                  setCurrentUser(res.user);
                  currentUserRef.current = res.user;
                  storage.saveUserSession(res.user).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        }}
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
          if (currentUser?.matchmakingStatus === 'SEARCHING') {
            api.updateMatchmakingStatus({
              status: 'SEARCHING',
              formatId: currentUser.searchingFormat || '7v7',
              district,
              radiusKm: Number(radiusKm) || 8,
            }).then((res) => {
              if (res?.user) {
                setCurrentUser(res.user);
                currentUserRef.current = res.user;
                storage.saveUserSession(res.user).catch(() => {});
              }
            }).catch(() => {});
          }
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
        onFinishTest={async () => {
          const u = await storage.getUserSession();
          const finalUser = u || currentUser;
          if (u) {
            setCurrentUser(u);
            currentUserRef.current = u;
          }
          setActiveSubScreen(null);
          setActiveTab('JUGAR');
          await syncMatchmakingEntryFlow(finalUser, { forceActivate: true });
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
            onPress={() => {
              setActiveSubScreen(null);
              setActiveTab('RANKING');
            }}
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
          <RadarScreen
            user={currentUser}
            radiusKm={currentRadius}
            districtName={currentDistrict}
            userLevel={userDeclaredLevel}
            onUserUpdated={(updatedUser, options = {}) => {
              if (options.manuallyPaused !== undefined) {
                manuallyPausedRef.current = Boolean(options.manuallyPaused);
                setManuallyPausedSession(Boolean(options.manuallyPaused));
              }
              if (updatedUser) {
                setCurrentUser(updatedUser);
                currentUserRef.current = updatedUser;
                storage.saveUserSession(updatedUser).catch(() => {});
                if (updatedUser.matchmakingStatus === 'IN_ROOM' && updatedUser.activeCompetitionId) {
                  setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
                  setTargetCompetitionId(updatedUser.activeCompetitionId);
                  setTargetCompetitionCode(null);
                  setActiveTab('SALAS');
                } else if (updatedUser.matchmakingStatus === 'SEARCHING') {
                  setQueueState((prev) => ({
                    ...prev,
                    isSearching: true,
                    formatId: updatedUser.searchingFormat || prev.formatId || '7v7',
                    district: updatedUser.searchingDistrict || prev.district || currentDistrict,
                  }));
                } else if (updatedUser.matchmakingStatus === 'IDLE') {
                  setQueueState((prev) => ({ ...prev, isSearching: false, seconds: 0 }));
                }
              }
            }}
            onNavigateToLobbies={() => setActiveTab('SALAS')}
            onSelectCompetitionTarget={({ competitionId, code }) => {
              setTargetCompetitionId(competitionId || null);
              setTargetCompetitionCode(code || null);
              setActiveTab('SALAS');
            }}
            onOpenNotifications={() => setActiveSubScreen('NOTIFICATIONS')}
            onOpenCalibration={() => setActiveSubScreen('CALIBRATION')}
            onOpenLocationSettings={() => setActiveSubScreen('LOCATION_SETTINGS')}
            onOpenJoinCode={() => setActiveSubScreen('JOIN_CODE')}
            onStartFootballTest={() => setActiveSubScreen('FOOTBALL_TEST')}
            onRequireProfileSetup={() => setActiveSubScreen('BIOMETRICS')}
          />
        )}

        {(activeTab === 'SALAS' || activeTab === 'MIS_PARTIDOS') && (
          <CompetitionScreen
            key="SALAS"
            user={currentUser}
            mine={false}
            initialCompetitionId={targetCompetitionId}
            initialCode={targetCompetitionCode}
            onClearInitialTarget={() => {
              setTargetCompetitionId(null);
              setTargetCompetitionCode(null);
            }}
            onNavigateToPlay={() => setActiveTab('JUGAR')}
            onStartFootballTest={() => setActiveSubScreen('FOOTBALL_TEST')}
          />
        )}

        {activeTab === 'RANKING' && (
          <LeaderboardScreen
            key="RANKING"
            currentUser={currentUser}
          />
        )}

        {activeTab === 'PERFIL' && (
          <ProfileScreen
            user={currentUser}
            onLogout={handleLogout}
            onOpenLeaderboard={() => {
              setActiveSubScreen(null);
              setActiveTab('RANKING');
            }}
            onNavigateToPlay={() => setActiveTab('JUGAR')}
          />
        )}
      </View>

      {/* Barra de Situación Global Flotante (Sticky Queue Bar) */}
      {queueState.isSearching && (
        <View style={styles.stickyQueueBar}>
          <TouchableOpacity
            style={styles.stickyQueueContent}
            onPress={() => {
              setActiveSubScreen(null);
              setActiveTab('JUGAR');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.stickyQueueDot} />
            <Text style={styles.stickyQueueText} numberOfLines={1}>
              BUSCANDO {queueState.formatId?.toUpperCase()} EN {queueState.district?.split(',')[0]?.toUpperCase()} ({Math.floor(queueState.seconds / 60).toString().padStart(2, '0')}:{(queueState.seconds % 60).toString().padStart(2, '0')})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stickyQueueCancelBtn}
            onPress={handleCancelGlobalQueue}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Cancelar búsqueda"
          >
            <Text style={styles.stickyQueueCancelText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Persistent Bottom Bar (4 Destinos: Jugar · Salas · Ranking · Perfil) */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveSubScreen(null);
          setActiveTab(tab);
        }}
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
  stickyQueueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceContainer,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  stickyQueueContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyQueueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.neonPitch,
  },
  stickyQueueText: {
    color: '#F1FFEF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  stickyQueueCancelBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  stickyQueueCancelText: {
    color: THEME.colors.coralError,
    fontSize: 12,
    fontWeight: '900',
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
