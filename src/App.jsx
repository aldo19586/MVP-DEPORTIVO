import React, { useState, useEffect } from 'react';
import { socket } from './services/socket.js';
import { soundFX, showBackgroundNotification } from './utils/audio.js';
import AuthModal from './components/AuthModal.jsx';
import SportSelector from './components/SportSelector.jsx';
import PersistentQueueBar from './components/PersistentQueueBar.jsx';
import RadarScreen from './components/RadarScreen.jsx';
import QuestionnaireModal from './components/QuestionnaireModal.jsx';
import MatchFoundModal from './components/MatchFoundModal.jsx';
import ChatRoom from './components/ChatRoom.jsx';
import MatchReportModal from './components/MatchReportModal.jsx';
import MapZoneModal from './components/MapZoneModal.jsx';
import LiveMatchToast from './components/LiveMatchToast.jsx';
import PlayerCardFUT from './components/PlayerCardFUT.jsx';
import LeaderboardModal from './components/LeaderboardModal.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import LobbyRoomModal from './components/LobbyRoomModal.jsx';
import JoinLobbyModal from './components/JoinLobbyModal.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';
import MatchAcceptModal from './components/MatchAcceptModal.jsx';
import { Zap, Wifi, LogOut, ShieldCheck, Trophy, Sparkles, User } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('matchsport_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [sports, setSports] = useState([
    {
      id: 'futbol',
      name: 'Fútbol',
      icon: '⚽',
      formats: [
        { id: '1v1', name: '1v1 (Rey de la Pista)', playersPerTeam: 1 },
        { id: '2v2', name: '2v2 (Parejas)', playersPerTeam: 2 },
        { id: '3v3', name: '3v3 (Squad)', playersPerTeam: 3 },
        { id: '5v5', name: '5v5 (Futsal)', playersPerTeam: 5 },
        { id: '7v7', name: '7v7 (Fútbol 7 Tradicional)', playersPerTeam: 7 }
      ]
    },
    {
      id: 'padel',
      name: 'Pádel',
      icon: '🎾',
      formats: [
        { id: '1v1', name: '1v1 (Singles)', playersPerTeam: 1 },
        { id: '2v2', name: '2v2 (Dobles)', playersPerTeam: 2 }
      ]
    },
    {
      id: 'basquet',
      name: 'Básquetbol',
      icon: '🏀',
      formats: [
        { id: '1v1', name: '1v1', playersPerTeam: 1 },
        { id: '3v3', name: '3v3 FIBA', playersPerTeam: 3 }
      ]
    }
  ]);

  const [selectedSportId, setSelectedSportId] = useState('futbol');
  const [selectedFormatId, setSelectedFormatId] = useState('5v5');
  const [currentProfile, setCurrentProfile] = useState(null);

  // Estados de Matchmaking
  const [isSearching, setIsSearching] = useState(false);
  const [searchChallenge, setSearchChallenge] = useState(null);
  const [mode, setMode] = useState('solo');

  // Estados de Partida Activa y Sala de Convocatoria (Lobby)
  const [activeMatch, setActiveMatch] = useState(() => {
    try {
      const saved = localStorage.getItem('matchsport_active_match');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeLobby, setActiveLobby] = useState(null);
  const [pendingMatch, setPendingMatch] = useState(null);
  const [showJoinLobbyModal, setShowJoinLobbyModal] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    try {
      const saved = localStorage.getItem('matchsport_active_match');
      return saved ? 'chat' : 'sport_select';
    } catch (e) {
      return 'sport_select';
    }
  }); // 'sport_select' | 'radar' | 'lobby' | 'chat'
  const [squadMembers, setSquadMembers] = useState([]);

  // Sincronizar persistencia offline de Partido Activo
  useEffect(() => {
    if (activeMatch && activeMatch.status !== 'finished' && activeMatch.status !== 'cancelled') {
      localStorage.setItem('matchsport_active_match', JSON.stringify(activeMatch));
    } else {
      localStorage.removeItem('matchsport_active_match');
    }
  }, [activeMatch]);

  // Manejo de Desbloqueo de Pantalla Móvil (Visibility State)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        socket.emit('registerUser', { userId: user.id, user });
        if (activeMatch?.id) {
          socket.emit('joinMatchRoom', { matchId: activeMatch.id });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, activeMatch?.id]);

  // Ubicación y Perímetro de Búsqueda (Mapa interactivo)
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem('matchsport_location');
    return saved ? JSON.parse(saved) : {
      lat: -12.137,
      lng: -76.985,
      radiusKm: 6,
      district: 'Surco, Lima'
    };
  });

  // Modales
  const [showMapModal, setShowMapModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(!user);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showMatchFoundModal, setShowMatchFoundModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMyFutCard, setShowMyFutCard] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [ratingUpdateInfo, setRatingUpdateInfo] = useState(null);


  // Usuarios en línea en tiempo real y Notificación de Like
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [likeNotification, setLikeNotification] = useState(null);

  // Estado de conexión y reconexión transparente Socket.IO (Fase 3)
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected' | 'reconnecting' | 'restored'

  // Cargar deportes desde la API
  useEffect(() => {
    fetch('/api/sports')
      .then((r) => r.json())
      .then((data) => {
        if (data.sports) {
          setSports(data.sports);
        }
      })
      .catch(() => {});
  }, []);

  // Cargar perfil específico (usuario + deporte + formato)
  useEffect(() => {
    if (user && selectedSportId && selectedFormatId) {
      fetch(`/api/profile/${user.id}/${selectedSportId}/${selectedFormatId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setCurrentProfile(data.profile);
          }
          if (data.futStats && user) {
            setUser((prev) => ({ ...prev, futStats: data.futStats }));
          }
        })
        .catch(() => {
          setCurrentProfile({
            rating: 1400,
            rd: 300,
            declaredLevel: 'Intermedio',
            wins: 0,
            losses: 0
          });
        });
    }
  }, [user?.id, selectedSportId, selectedFormatId]);

  // 1. Registro reactivo de usuario y manejo de reconexión transparente en Socket.IO (Fase 3)
  useEffect(() => {
    let restoreTimer = null;

    const handleConnect = () => {
      setConnectionStatus((prev) => {
        if (prev === 'reconnecting') {
          restoreTimer = setTimeout(() => {
            setConnectionStatus('connected');
          }, 2500);
          return 'restored';
        }
        return 'connected';
      });

      if (user?.id) {
        socket.emit('registerUser', { userId: user.id, user });
        if (activeMatch?.id) {
          socket.emit('joinMatchRoom', { matchId: activeMatch.id });
        }
      }
    };

    const handleDisconnect = (reason) => {
      console.warn('[APP] Conexión Socket.IO interrumpida:', reason);
      setConnectionStatus('reconnecting');
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect', handleConnect);

    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect', handleConnect);
    };
  }, [user?.id, user?.name, user?.district, activeMatch?.id]);

  // 2. Escucha global de eventos Socket.IO en tiempo real (siempre activa)
  useEffect(() => {
    // Escuchar conteo y lista de usuarios en línea en tiempo real
    socket.on('onlineUsersUpdate', ({ count, users }) => {
      if (typeof count === 'number') setOnlineCount(count);
      if (users) setOnlineUsers(users);
    });

    socket.on('queueStarted', ({ challenge }) => {
      setIsSearching(true);
      setSearchChallenge(challenge);
      soundFX.playSearchStart();
    });

    socket.on('queueStatus', ({ isSearching: searching, challenge }) => {
      setIsSearching(searching);
      if (challenge) setSearchChallenge(challenge);
    });

    socket.on('queueCancelled', () => {
      setIsSearching(false);
      setSearchChallenge(null);
    });

    // Fase de Confirmación de Asistencia
    socket.on('matchPromptAcceptance', (payload) => {
      setPendingMatch(payload);
      setIsSearching(false);
      soundFX.playMatchFound();
    });

    socket.on('pendingMatchUpdated', ({ pendingMatchId, acceptedUserIds }) => {
      setPendingMatch((prev) => {
        if (!prev || prev.pendingMatchId !== pendingMatchId) return prev;
        return {
          ...prev,
          acceptedUserIds
        };
      });
      soundFX.playMessage();
    });

    socket.on('matchAcceptanceFailed', ({ message, reason }) => {
      setPendingMatch(null);
      soundFX.playCancel ? soundFX.playCancel() : soundFX.playMessage();
      alert(message || (reason === 'timeout' ? '⚠️ Tiempo agotado: Un jugador no confirmó.' : '⚠️ Partida rechazada por un jugador.'));
    });

    // ¡MATCH ENCONTRADO Y CONFIRMADO POR TODOS!
    socket.on('matchFound', ({ match }) => {
      setPendingMatch(null); // Cerrar modal de confirmación
      setIsSearching(false);
      setSearchChallenge(null);
      setActiveLobby(null); // Limpiar sala de convocatoria
      setSquadMembers([]);
      setActiveMatch(match);
      if (match?.id) {
        socket.emit('joinMatchRoom', { matchId: match.id });
      }
      setShowMatchFoundModal(true);
      soundFX.playMatchFound();

      showBackgroundNotification('🏆 ¡DESAFÍO CONFIRMADO!', {
        body: `Tu rival está listo en ${match.sportId} (${match.formatId}). Toca para abrir la sala de coordinación.`
      });
    });

    // Transición sincronizada a pantalla de Radar para todo el squad de la sala
    socket.on('lobbyStartedRadarSearch', ({ squadMembers: members, sportId, formatId }) => {
      setSquadMembers(members || []);
      if (sportId) setSelectedSportId(sportId);
      if (formatId) setSelectedFormatId(formatId);
      setIsSearching(true);
      setCurrentView('radar');
      soundFX.playSearchStart();
    });

    socket.on('matchData', ({ match }) => {
      if (match) {
        setActiveMatch(match);
      }
    });

    // Eventos de Sala de Convocatoria (Lobby)
    socket.on('lobbyCreated', ({ lobby }) => {
      setActiveLobby(lobby);
      setCurrentView('lobby');
      soundFX.playMatchFound();
    });

    socket.on('lobbyUpdated', ({ lobby }) => {
      setActiveLobby(lobby);
      if (user && lobby) {
        const inLobby = [...(lobby.teamA || []), ...(lobby.teamB || [])].some(
          (p) => (p.userId || p.id) === user.id
        );
        if (inLobby) {
          setCurrentView((prev) => (prev === 'chat' || prev === 'searching' ? prev : 'lobby'));
        } else {
          setActiveLobby((prev) => (prev?.code === lobby.code ? null : prev));
          setCurrentView((prev) => (prev === 'lobby' ? 'sport_select' : prev));
        }
      }
    });

    socket.on('session_replaced', ({ message }) => {
      alert(`⚠️ SESIÓN TRANSFERIDA:\n${message || 'Has iniciado sesión en otro dispositivo o pestaña.'}`);
    });

    socket.on('lobbyRestored', ({ lobby }) => {
      if (lobby) {
        setActiveLobby(lobby);
        setCurrentView('lobby');
      }
    });

    socket.on('activeMatch', ({ match, autoReconnected }) => {
      if (match) {
        setActiveMatch(match);
        setCurrentView('chat');
        if (autoReconnected) {
          console.log('[MATCH] Reconectado automáticamente a tu partida en curso:', match.id);
        }
      }
    });

    socket.on('lobbyError', ({ message }) => {
      alert(`⚠️ ${message}`);
      if (window.location.search.includes('lobby=')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    // Mensajes de chat en tiempo real
    socket.on('newChatMessage', ({ matchId, message }) => {
      setActiveMatch((prev) => {
        if (!prev || prev.id !== matchId) return prev;
        const exists = prev.chatMessages.some((m) => m.id === message.id);
        if (exists) return prev;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, message]
        };
      });
    });

    // Temporizador de Alquiler de Cancha iniciado
    socket.on('matchTimerStarted', ({ matchId, timer }) => {
      setActiveMatch((prev) => {
        if (!prev || prev.id !== matchId) return prev;
        return {
          ...prev,
          status: 'in_progress',
          matchTimer: timer
        };
      });
      showBackgroundNotification('⏱️ TIEMPO EN CANCHA INICIADO', {
        body: `Cronómetro activo por ${timer.durationMinutes} min. Sonará la alarma al finalizar.`
      });
    });

    // Actualización de stats FUT en tiempo real
    socket.on('futStatsUpdated', ({ toUserId, futStats, likesCount }) => {
      if (user && user.id === toUserId) {
        setUser((prev) => {
          const updated = { ...prev, futStats, likesCount };
          localStorage.setItem('matchsport_user', JSON.stringify(updated));
          return updated;
        });
      }
    });

    // Notificación en tiempo real cuando un rival te da LIKE
    socket.on('playerReceivedLike', ({ toUserId, fromUserName, message }) => {
      if (user && (user.id === toUserId || !toUserId)) {
        soundFX.playMatchFound();
        setLikeNotification({
          fromUserName: fromUserName || 'Tu rival',
          message: message || `¡${fromUserName || 'Tu rival'} te ha dejado un Like deportivo por tu buen juego y respeto en cancha! 👍`
        });
        showBackgroundNotification('👍 ¡RECIBISTE UN LIKE DEPORTIVO!', {
          body: `${fromUserName || 'Tu rival'} te felicitó por tu fair play en cancha.`
        });
        setTimeout(() => setLikeNotification(null), 6000);
      }
    });

    // Disputa abierta
    socket.on('matchDisputed', ({ matchId, message }) => {
      alert(`⚠️ ALERTA DE DISPUTA: ${message}`);
    });

    // Temporizador detenido o partido concluido
    socket.on('matchTimerStopped', ({ matchId }) => {
      setActiveMatch((prev) => {
        if (!prev || prev.id !== matchId) return prev;
        return {
          ...prev,
          matchTimer: {
            ...prev?.matchTimer,
            active: false,
            endsAt: null
          }
        };
      });
    });

    // Partido concluido y ratings actualizados (DETENER EL CRONÓMETRO DEFINITIVAMENTE)
    socket.on('matchFinished', ({ matchId, winnerTeam, ratingUpdates, match }) => {
      setActiveMatch((prev) => ({
        ...prev,
        ...match,
        status: 'finished',
        matchTimer: {
          ...prev?.matchTimer,
          active: false,
          endsAt: null
        }
      }));

      const myUpdate = ratingUpdates?.[user?.id];
      if (myUpdate) {
        setRatingUpdateInfo(myUpdate);
        setCurrentProfile((prev) => ({
          ...prev,
          rating: myUpdate.newRating,
          wins: (prev?.wins || 0) + (myUpdate.won ? 1 : 0),
          losses: (prev?.losses || 0) + (!myUpdate.won ? 1 : 0)
        }));
      }
      setShowReportModal(true);
    });

    // Jugador abandona en un partido de equipo
    socket.on('matchPlayerLeft', ({ match, message, leftUserName }) => {
      if (match) {
        setActiveMatch(match);
      }
      soundFX.playMessage();
      showBackgroundNotification('⚠️ JUGADOR SALIÓ DE LA SALA', {
        body: message || `${leftUserName || 'Un jugador'} ha salido de la sala.`
      });
    });

    // Partido cancelado o convertido a sala de convocatoria
    socket.on('matchCancelled', ({ convertedToLobby, message }) => {
      try {
        localStorage.removeItem('matchsport_active_match');
      } catch (e) {}
      setActiveMatch(null);
      if (convertedToLobby) {
        setCurrentView('lobby');
      } else {
        setCurrentView('sport_select');
        alert(`ℹ️ ${message || 'El partido ha sido cancelado.'}`);
      }
    });

    return () => {
      socket.off('onlineUsersUpdate');
      socket.off('playerReceivedLike');
      socket.off('queueStarted');
      socket.off('queueStatus');
      socket.off('queueCancelled');
      socket.off('matchFound');
      socket.off('lobbyCreated');
      socket.off('lobbyUpdated');
      socket.off('lobbyError');
      socket.off('newChatMessage');
      socket.off('matchTimerStarted');
      socket.off('matchTimerStopped');
      socket.off('futStatsUpdated');
      socket.off('matchDisputed');
      socket.off('matchFinished');
      socket.off('matchPromptAcceptance');
      socket.off('pendingMatchUpdated');
      socket.off('matchAcceptanceFailed');
      socket.off('matchPlayerLeft');
      socket.off('matchCancelled');
    };
  }, [user]);

  // Detección automática de invitación por URL (?lobby=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lobbyCode = params.get('lobby');
    if (lobbyCode && user) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (activeLobby && activeLobby.code !== lobbyCode.toUpperCase()) {
        alert(`⚠️ Ya estás participando en la sala #${activeLobby.code}. Debes salir de esa sala antes de ingresar a la #${lobbyCode.toUpperCase()}.`);
        return;
      }
      socket.emit('joinLobby', { code: lobbyCode, user });
    }
  }, [user]);

  // Alerta de confirmación al usuario antes de salir o cerrar la aplicación si está en una sala activa
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeLobby && user) {
        e.preventDefault();
        e.returnValue = '¿Estás seguro de salir de la aplicación? Se abandonará la sala actual.';
        try {
          const blob = new Blob([JSON.stringify({ code: activeLobby.code, userId: user.id })], {
            type: 'application/json'
          });
          navigator.sendBeacon('/api/lobby/leave', blob);
        } catch (err) {}
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeLobby, user]);

  const handleLogin = (newUser) => {
    setUser(newUser);
    localStorage.setItem('matchsport_user', JSON.stringify(newUser));
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    if (activeLobby && user) {
      socket.emit('leaveLobby', { code: activeLobby.code, userId: user.id });
      setActiveLobby(null);
    }
    if (isSearching && user) {
      socket.emit('cancelQueue', { userId: user.id });
    }
    socket.emit('unregisterUser');
    localStorage.removeItem('matchsport_user');
    setUser(null);
    setCurrentProfile(null);
    setIsSearching(false);
    setActiveMatch(null);
    setShowAuthModal(true);
  };

  const handleLeaveMatch = () => {
    if (activeMatch && user) {
      socket.emit('leaveMatch', { matchId: activeMatch.id, userId: user.id });
      try {
        localStorage.removeItem('matchsport_active_match');
      } catch (e) {}
      setActiveMatch(null);
      setCurrentView('sport_select');
    }
  };

  const handleConvertToLobby = () => {
    if (activeMatch && user) {
      socket.emit('convertMatchToLobby', { matchId: activeMatch.id, userId: user.id });
    }
  };

  const handleAcceptPendingMatch = () => {
    if (pendingMatch && user) {
      socket.emit('acceptPendingMatch', {
        pendingMatchId: pendingMatch.pendingMatchId,
        userId: user.id
      });
    }
  };

  const handleDeclinePendingMatch = () => {
    if (pendingMatch && user) {
      socket.emit('declinePendingMatch', {
        pendingMatchId: pendingMatch.pendingMatchId,
        userId: user.id
      });
      setPendingMatch(null);
    }
  };

  const handleSaveLocation = (newLoc) => {
    setLocation(newLoc);
    localStorage.setItem('matchsport_location', JSON.stringify(newLoc));
  };

  const handleStartSearch = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    socket.emit('startQueue', {
      userId: user.id,
      sportId: selectedSportId,
      formatId: selectedFormatId,
      mode,
      lat: location.lat,
      lng: location.lng,
      radiusKm: location.radiusKm,
      district: location.district
    });
  };

  const handleCancelSearch = () => {
    socket.emit('cancelQueue', { userId: user?.id });
    setIsSearching(false);
    setSearchChallenge(null);
  };

  const handleForceDemoMatch = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    socket.emit('forceDemoMatch', {
      userId: user.id,
      sportId: selectedSportId,
      formatId: selectedFormatId
    });
  };

  const handleSendMessage = (text) => {
    if (!activeMatch || !user) return;
    socket.emit('sendChatMessage', {
      matchId: activeMatch.id,
      senderId: user.id,
      senderName: user.name,
      text
    });
  };

  const handleStartTimer = (durationMinutes) => {
    if (!activeMatch) return;
    socket.emit('startMatchTimer', {
      matchId: activeMatch.id,
      durationMinutes
    });
  };

  const handleReportByReporter = (winnerTeam) => {
    if (!activeMatch || !user) return;
    // Detener localmente de inmediato el temporizador y marcar finalizado
    setActiveMatch((prev) => ({
      ...prev,
      status: 'finished',
      matchTimer: {
        ...prev?.matchTimer,
        active: false,
        endsAt: null
      }
    }));
    socket.emit('reportResultByReporter', {
      matchId: activeMatch.id,
      reporterUserId: user.id,
      winnerTeam
    });
  };

  const handleReportWinner = (winnerTeam) => {
    if (!activeMatch || !user) return;
    // Detener localmente de inmediato el temporizador
    setActiveMatch((prev) => ({
      ...prev,
      matchTimer: {
        ...prev?.matchTimer,
        active: false,
        endsAt: null
      }
    }));
    socket.emit('reportResult', {
      matchId: activeMatch.id,
      userId: user.id,
      winnerTeam
    });
  };

  const handleSubmitFutReview = (reviewData) => {
    if (!user) return;
    socket.emit('submitFutRatings', {
      ...reviewData,
      fromUserId: user.id
    });
  };

  const handleSubmitReview = (reviewData) => {
    if (!user) return;
    socket.emit('submitReview', {
      ...reviewData,
      fromUserId: user.id
    });
  };

  const handleDisputeMatch = (reason) => {
    if (!activeMatch || !user) return;
    socket.emit('disputeMatch', {
      matchId: activeMatch.id,
      userId: user.id,
      reason
    });
  };

  // Acciones de Sala de Convocatoria (Lobby)
  const handleCreateLobby = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (activeLobby) {
      alert(`⚠️ Ya estás en la sala #${activeLobby.code}. Sal de esa sala antes de crear una nueva.`);
      return;
    }
    socket.emit('createLobby', {
      hostUser: user,
      sportId: selectedSportId,
      formatId: selectedFormatId
    });
  };

  const handleJoinLobby = (code) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (activeLobby && activeLobby.code !== code.toUpperCase()) {
      alert(`⚠️ Ya estás participando en la sala #${activeLobby.code}. Debes salir de esa sala antes de unirte a otra.`);
      return;
    }
    socket.emit('joinLobby', { code, user });
    setShowJoinLobbyModal(false);
  };

  const handleToggleLobbyReady = () => {
    if (!activeLobby || !user) return;
    socket.emit('toggleLobbyReady', {
      code: activeLobby.code,
      userId: user.id
    });
  };

  const handleSwitchLobbyTeam = (targetTeam) => {
    if (!activeLobby || !user) return;
    socket.emit('switchLobbyTeam', {
      code: activeLobby.code,
      userId: user.id,
      targetTeam
    });
  };

  const handleFillLobbyDemos = () => {
    if (!activeLobby) return;
    socket.emit('fillLobbyDemos', { code: activeLobby.code });
  };

  const handleChangeLobbyFormat = (formatId) => {
    if (!activeLobby) return;
    socket.emit('changeLobbyFormat', {
      code: activeLobby.code,
      formatId
    });
  };

  const handleStartLobbyRadarSearch = () => {
    if (!activeLobby) return;
    socket.emit('startLobbyRadarSearch', { code: activeLobby.code });
  };

  const handleStartLobbyMatchWithBots = () => {
    if (!activeLobby) return;
    socket.emit('searchLobbyOpponentOnline', { code: activeLobby.code });
  };

  const handleStartLobbyMatch = () => {
    if (!activeLobby) return;
    socket.emit('startLobbyMatch', { code: activeLobby.code });
  };

  const handleLeaveLobby = () => {
    if (!activeLobby || !user) return;
    socket.emit('leaveLobby', {
      code: activeLobby.code,
      userId: user.id
    });
    setActiveLobby(null);
    setCurrentView('sport_select');
  };

  const handleSaveQuestionnaire = async (declaredLevel) => {
    try {
      const res = await fetch('/api/profile/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sportId: selectedSportId,
          formatId: selectedFormatId,
          declaredLevel
        })
      });
      const data = await res.json();
      if (data.profile) {
        setCurrentProfile(data.profile);
      }
    } catch (e) {}
    setShowQuestionnaire(false);
  };

  const currentSport = sports.find((s) => s.id === selectedSportId) || sports[0];
  const currentFormat = currentSport?.formats?.find((f) => f.id === selectedFormatId) || currentSport?.formats?.[0];

  return (
    <div className="app-container">
      {/* Banner Flotante de Reconexión de Socket.IO (Fase 3) */}
      {connectionStatus === 'reconnecting' && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'rgba(245, 158, 11, 0.95)',
          backdropFilter: 'blur(8px)',
          color: '#000',
          padding: '7px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.45)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#b45309',
            animation: 'pulse 1s infinite'
          }} />
          <span>Reconectando señal... manteniendo tu lugar</span>
        </div>
      )}

      {connectionStatus === 'restored' && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'rgba(16, 185, 129, 0.95)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          padding: '7px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
        }}>
          <span>🟢 Conexión restablecida</span>
        </div>
      )}

      {/* Toast Flotante estilo Isla Dinámica para Tiempo en Cancha */}
      <LiveMatchToast
        match={activeMatch}
        onOpenReport={() => setShowReportModal(true)}
        onOpenChat={() => setCurrentView('chat')}
      />

      {/* Header Principal Minimalista */}
      <header className="app-header">
        <div className="brand-logo" onClick={() => setCurrentView('sport_select')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">⚡</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="brand-title">MATCHSPORT</span>
              <span className="brand-tag">DESAFÍO</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Contador de Jugadores Activos en Tiempo Real */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
              animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399' }}>
              {onlineCount} {onlineCount === 1 ? 'activo' : 'activos'}
            </span>
          </div>

          {/* Botón Acceso Rápido al Chat de Partido Activo */}
          {activeMatch && currentView !== 'chat' && (
            <button
              onClick={() => setCurrentView('chat')}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '5px 9px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.45)',
                animation: 'pulse 2s infinite'
              }}
              title="Volver a la sala de chat del partido activo"
            >
              <span>💬 Volver al Chat</span>
            </button>
          )}

          {/* Botón de Perfil del Usuario / Admin */}
          {user ? (
            <div
              onClick={() => setShowProfileModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.05)',
                border: user.role === 'admin' ? '1.5px solid #ef4444' : '1.5px solid #10b981',
                borderRadius: '99px',
                padding: '2px 8px 2px 2px',
                transition: 'all 0.2s'
              }}
            >
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={user.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', maxWidth: '75px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name ? user.name.split(' ')[0] : 'Perfil'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn btn-primary"
              style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}
            >
              Acceder
            </button>
          )}
        </div>
      </header>


      {/* Persistent Queue Bar si está buscando y está en otra pantalla */}
      {isSearching && currentView !== 'radar' && (
        <PersistentQueueBar
          challenge={searchChallenge}
          sportName={currentSport?.name}
          formatName={currentFormat?.name}
          onCancel={handleCancelSearch}
          onForceDemoMatch={handleForceDemoMatch}
        />
      )}

      {/* PANTALLA 1: Selección de Deporte y Modalidad (Recuadro Verde) */}
      {currentView === 'sport_select' && (
        <main style={{ paddingBottom: '30px', paddingTop: '10px', flex: 1 }}>
          <SportSelector
            sports={sports}
            selectedSportId={selectedSportId}
            onSelectSport={setSelectedSportId}
            selectedFormatId={selectedFormatId}
            onSelectFormat={setSelectedFormatId}
            currentProfile={currentProfile}
            onOpenQuestionnaire={() => setShowQuestionnaire(true)}
            mode={mode}
            setMode={setMode}
            onProceedToRadar={() => setCurrentView('radar')}
            onCreateLobby={handleCreateLobby}
            onOpenJoinLobbyModal={() => setShowJoinLobbyModal(true)}
          />
        </main>
      )}

      {/* PANTALLA 2: Radar de Búsqueda de Canchas (Recuadro Rojo) */}
      {currentView === 'radar' && (
        <main style={{ paddingBottom: '30px', paddingTop: '10px', flex: 1 }}>
          <RadarScreen
            user={user}
            sport={currentSport}
            format={currentFormat}
            currentProfile={currentProfile}
            isSearching={isSearching}
            mode={mode}
            setMode={setMode}
            location={location}
            squadMembers={squadMembers}
            onOpenMapModal={() => setShowMapModal(true)}
            onStartSearch={handleStartSearch}
            onCancelSearch={() => {
              handleCancelSearch();
              setSquadMembers([]);
              if (activeLobby) setCurrentView('lobby');
            }}
            onForceDemoMatch={handleForceDemoMatch}
            onBackToSports={() => {
              setSquadMembers([]);
              setCurrentView('sport_select');
            }}
          />
        </main>
      )}

      {/* PANTALLA 3: Sala de Convocatoria (Lobby Privado con Enlace y LISTO) */}
      {currentView === 'lobby' && (
        <main style={{ flex: 1, paddingBottom: '30px' }}>
          <LobbyRoomModal
            lobby={activeLobby}
            sports={sports}
            currentUserId={user?.id}
            location={location}
            onOpenMapModal={() => setShowMapModal(true)}
            onChangeFormat={handleChangeLobbyFormat}
            onToggleReady={handleToggleLobbyReady}
            onSwitchTeam={handleSwitchLobbyTeam}
            onFillDemos={handleFillLobbyDemos}
            onStartMatch={handleStartLobbyMatch}
            onStartRadarSearch={handleStartLobbyRadarSearch}
            onStartMatchWithBots={handleStartLobbyMatchWithBots}
            onMinimize={() => setCurrentView('sport_select')}
            onLeaveLobby={handleLeaveLobby}
          />
        </main>
      )}

      {/* PANTALLA 4: Sala Privada de Coordinación del Partido */}
      {currentView === 'chat' && (
        <ChatRoom
          match={activeMatch}
          currentUserId={user?.id}
          currentUserName={user?.name}
          onSendMessage={handleSendMessage}
          onOpenReportModal={() => setShowReportModal(true)}
          onStartTimer={handleStartTimer}
          onMinimize={() => setCurrentView('sport_select')}
          onLeaveMatch={handleLeaveMatch}
          onConvertToLobby={handleConvertToLobby}
        />
      )}

      {/* BARRA FLOTANTE MINI-PLAYER DE SALA DE CONVOCATORIA (LOBBY) */}
      {activeLobby && !activeMatch && currentView !== 'lobby' && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          width: '92%',
          maxWidth: '440px'
        }}>
          <div
            onClick={() => setCurrentView('lobby')}
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              borderRadius: '18px',
              padding: '10px 14px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                animation: 'pulse 1.5s infinite'
              }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}>
                    👥 Sala #{activeLobby.code}
                  </span>
                  <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                    {(activeLobby.teamA?.length || 0) + (activeLobby.teamB?.length || 0)}/{activeLobby.totalSlots}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {activeLobby.sportId?.toUpperCase()} {activeLobby.formatId} • Toca para volver a la sala
                </span>
              </div>
            </div>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#34d399',
              padding: '5px 10px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>Abrir</span>
              <span>➔</span>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FLOTANTE MINI-PLAYER DE PARTIDO ACTIVO (COORDINACIÓN O EN CANCHA) */}
      {activeMatch && currentView !== 'chat' && activeMatch.status !== 'finished' && (
        <div style={{
          position: 'fixed',
          bottom: activeLobby ? '78px' : '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          width: '92%',
          maxWidth: '440px'
        }}>
          <div
            onClick={() => setCurrentView('chat')}
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(6, 78, 59, 0.98) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid #10b981',
              borderRadius: '18px',
              padding: '10px 14px',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
                animation: 'pulse 1.2s infinite'
              }} />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff', display: 'block' }}>
                  ⚽ Partido Activo ({activeMatch.sportId?.toUpperCase()} {activeMatch.formatId})
                </span>
                <span style={{ fontSize: '11px', color: '#6ee7b7' }}>
                  {activeMatch?.matchTimer?.active ? '⏱️ Tiempo en cancha activo' : '💬 En sala de coordinación'} • Toca para volver
                </span>
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
            }}>
              <span>Chat ➔</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 0: Perfil y Reportes del Jugador / Panel Admin */}
      {showProfileModal && (
        <UserProfileModal
          user={user}
          currentProfile={currentProfile}
          location={location}
          onOpenMapZone={() => setShowMapModal(true)}
          onOpenQuestionnaire={() => setShowQuestionnaire(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenAdminDashboard={() => setShowAdminDashboard(true)}
          onLogout={handleLogout}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* MODAL 0.5: Perímetro y Radio de Búsqueda (Leaflet) */}
      {showMapModal && (
        <MapZoneModal
          currentLocation={location}
          onSave={handleSaveLocation}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* MODAL 1: Registro Rápido con Onboarding y Test Obligatorio */}
      {showAuthModal && (
        <AuthModal onLogin={handleLogin} />
      )}

      {/* MODAL 2: Test de Nivel Glicko-2 */}
      {showQuestionnaire && (
        <QuestionnaireModal
          sportName={currentSport?.name}
          formatName={currentFormat?.name}
          onSave={handleSaveQuestionnaire}
          onClose={() => setShowQuestionnaire(false)}
        />
      )}

      {/* MODAL 2.5: Confirmación de Asistencia */}
      {pendingMatch && (
        <MatchAcceptModal
          pendingMatch={pendingMatch}
          currentUserId={user?.id}
          onAccept={handleAcceptPendingMatch}
          onDecline={handleDeclinePendingMatch}
        />
      )}

      {/* MODAL 3: Match Encontrado (Versus) */}
      {showMatchFoundModal && (
        <MatchFoundModal
          match={activeMatch}
          currentUserId={user?.id}
          onEnterChat={() => {
            setShowMatchFoundModal(false);
            setCurrentView('chat');
            if (activeMatch?.id) {
              socket.emit('joinMatchRoom', { matchId: activeMatch.id });
            }
          }}
        />
      )}

      {/* MODAL 4: Reporte de Resultado (Reportero Designado / Atributos FUT) */}
      {showReportModal && (
        <MatchReportModal
          match={activeMatch}
          currentUserId={user?.id}
          ratingUpdateInfo={ratingUpdateInfo}
          onReportWinner={handleReportWinner}
          onReportByReporter={handleReportByReporter}
          onSubmitFutReview={handleSubmitFutReview}
          onSubmitReview={handleSubmitReview}
          onDisputeMatch={handleDisputeMatch}
          onClose={() => {
            setShowReportModal(false);
            setRatingUpdateInfo(null);
            setActiveMatch(null); // Limpiar completamente el partido finalizado
            setCurrentView('sport_select');
          }}
        />
      )}

      {/* MODAL 4.5: Unirse a Sala con Código */}
      {showJoinLobbyModal && (
        <JoinLobbyModal
          onJoin={handleJoinLobby}
          onClose={() => setShowJoinLobbyModal(false)}
        />
      )}

      {/* MODAL 5: Rankings por Modo de Juego (1v1, 2v2, 3v3) */}
      {showLeaderboard && (
        <LeaderboardModal
          sports={sports}
          currentSportId={selectedSportId}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* MODAL 6: Mi Carta FUT */}
      {showMyFutCard && user && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <PlayerCardFUT
            user={user}
            sport={selectedSportId}
            onClose={() => setShowMyFutCard(false)}
          />
        </div>
      )}

      {/* MODAL 7: Panel de Administrador / Dueño */}
      {showAdminDashboard && (
        <AdminDashboard
          sports={sports}
          onlineUsers={onlineUsers}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}

      {/* TOAST DE NOTIFICACIÓN DE LIKE DEPORTIVO EN TIEMPO REAL */}
      {likeNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.98), rgba(5, 150, 105, 0.98))',
          backdropFilter: 'blur(16px)',
          color: '#fff',
          border: '2px solid #34d399',
          borderRadius: '16px',
          padding: '12px 18px',
          boxShadow: '0 12px 35px rgba(16, 185, 129, 0.5), 0 0 25px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '400px',
          width: '92%',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            fontSize: '26px',
            background: 'rgba(255, 255, 255, 0.2)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            👍
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.3px' }}>
              ¡LIKE DEPORTIVO RECIBIDO!
            </div>
            <div style={{ fontSize: '11px', color: '#ecfdf5', marginTop: '2px', lineHeight: 1.3 }}>
              {likeNotification.message}
            </div>
          </div>
          <button
            onClick={() => setLikeNotification(null)}
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: 'none',
              color: '#ecfdf5',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 800,
              padding: '6px 8px',
              borderRadius: '8px'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
