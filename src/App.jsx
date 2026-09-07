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
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeLobby, setActiveLobby] = useState(null);
  const [showJoinLobbyModal, setShowJoinLobbyModal] = useState(false);
  const [currentView, setCurrentView] = useState('sport_select'); // 'sport_select' | 'radar' | 'lobby' | 'chat'
  const [squadMembers, setSquadMembers] = useState([]);

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

  // Configuración de Socket.IO
  useEffect(() => {
    if (!user) return;

    socket.emit('registerUser', { userId: user.id });

    // Escuchar conteo y usuarios en línea en tiempo real
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

    // ¡MATCH ENCONTRADO!
    socket.on('matchFound', ({ match }) => {
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

      showBackgroundNotification('🏆 ¡DESAFÍO ENCONTRADO!', {
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
    if (isSearching) {
      socket.emit('cancelQueue', { userId: user.id });
    }
    localStorage.removeItem('matchsport_user');
    setUser(null);
    setCurrentProfile(null);
    setIsSearching(false);
    setActiveMatch(null);
    setShowAuthModal(true);
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
      {/* Toast Flotante estilo Isla Dinámica para Tiempo en Cancha */}
      <LiveMatchToast
        match={activeMatch}
        onOpenReport={() => setShowReportModal(true)}
        onOpenChat={() => setCurrentView('chat')}
      />

      {/* Header Principal */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="brand-logo" onClick={() => setCurrentView('radar')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon">⚡</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="brand-title">MATCHSPORT</span>
                <span className="brand-tag">DESAFÍO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Wifi size={11} color="#10b981" />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Servidor Local Activo</span>
              </div>
            </div>
          </div>

          {/* Contador de Jugadores Activos en Tiempo Real */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '3px 8px',
            borderRadius: '12px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399' }}>
              {onlineCount} {onlineCount === 1 ? 'jugador activo' : 'jugadores activos'}
            </span>
          </div>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Botón de Rankings por Modo */}
            <button
              onClick={() => setShowLeaderboard(true)}
              title="Ver Rankings por Modo de Juego (1v1, 2v2, 3v3)"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 800
              }}
            >
              <Trophy size={13} />
              <span>Rankings</span>
            </button>

            {/* Botón de Carta FUT */}
            <button
              onClick={() => setShowMyFutCard(true)}
              title="Ver Mi Carta FUT"
              style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#c084fc',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 800
              }}
            >
              <span>🎴</span>
              <span className="hide-mobile">Carta FUT</span>
            </button>

            {/* Botón Admin */}
            <button
              onClick={() => setShowAdminDashboard(true)}
              title="Panel de Control del Dueño / Administrador"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ShieldCheck size={14} />
            </button>

            {/* Avatar del usuario */}
            <img
              src={user.avatar}
              alt={user.name}
              onClick={() => setShowMyFutCard(true)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid #10b981',
                objectFit: 'cover',
                cursor: 'pointer'
              }}
            />

            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
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
          onLeaveRoom={() => setCurrentView('sport_select')}
        />
      )}

      {/* MODAL 0: Perímetro y Radio de Búsqueda (Leaflet) */}
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
