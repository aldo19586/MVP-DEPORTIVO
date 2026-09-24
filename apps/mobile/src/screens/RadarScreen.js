import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Image,
  SafeAreaView,
  Modal,
  TextInput
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

const SPORTS = [
  { id: 'futbol', name: 'FÚTBOL', icon: '⚽' },
  { id: 'basket', name: 'BASKET', icon: '🏀' },
  { id: 'padel', name: 'PÁDEL', icon: '🎾' },
  { id: 'tenis', name: 'TENIS', icon: '🎾' }
];

const FORMATS = [
  { id: '1v1', label: '1v1', sub: 'DUELO' },
  { id: '3v3', label: '3v3', sub: 'RETA' },
  { id: '5v5', label: '5v5', sub: 'CONVOCATORIA', hasDot: true }
];

const RADIUS_OPTIONS = [4, 8, 12, 20];

const LEVEL_OPTIONS = [
  { label: 'Principiante', rating: 1200, desc: 'Juego recreativo ocasional' },
  { label: 'Intermedio', rating: 1450, desc: 'Ritmo constante y dominio básico' },
  { label: 'Avanzado', rating: 1700, desc: 'Buen nivel técnico y táctico' },
  { label: 'Competitivo', rating: 1950, desc: 'Torneos y alta exigencia' }
];

const MOCK_SUPLENTES = [
  {
    id: 'sup_1',
    code: 'BON5',
    title: 'Fútbol 5v5 Convocatoria',
    venue: 'Manuel Bonilla, Miraflores',
    time: 'Hoy 08:30 PM',
    missing: '¡FALTA 1!',
    positionNeeded: 'MED / DEL',
    ratingAvg: '1450 pts'
  },
  {
    id: 'sup_2',
    code: 'GOL7',
    title: 'Pichanga El Golazo',
    venue: 'Cancha El Golazo, Surco',
    time: 'Hoy 09:00 PM',
    missing: '¡FALTA 1!',
    positionNeeded: 'DEFENSA',
    ratingAvg: '1600 pts'
  },
  {
    id: 'sup_3',
    code: 'PAD2',
    title: 'Pádel Dobles Oro',
    venue: 'Club Pádel Surco',
    time: 'Hoy 07:45 PM',
    missing: '¡FALTA 1!',
    positionNeeded: 'CUALQUIERA',
    ratingAvg: '1400 pts'
  }
];

export default function RadarScreen({ user, onNavigateToLobbies, onSelectLobby, onLogout }) {
  // Configuración deportiva
  const [selectedSport, setSelectedSport] = useState('futbol');
  const [selectedFormat, setSelectedFormat] = useState('5v5');
  const [radiusKm, setRadiusKm] = useState(8);
  const [districtName, setDistrictName] = useState('SURCO, LIMA');

  // Modo de juego: Buscar Solo vs Crear Equipo
  const [mode, setMode] = useState('solo'); // 'solo' | 'squad'

  // Búsqueda y estado en vivo
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [onlineCount, setOnlineCount] = useState(18);

  // Nivel y calibración
  const [userRating, setUserRating] = useState(user?.futStats?.ovr ? user.futStats.ovr * 20 : 1450);
  const [userLevel, setUserLevel] = useState('Intermedio');
  const [userWins, setUserWins] = useState(3);
  const [userLosses, setUserLosses] = useState(1);

  // Modales
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState('');
  const [showSuplentesModal, setShowSuplentesModal] = useState(false);

  // Animaciones del radar: Pulso concéntrico y cono de barrido 360°
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    // 1. Ubicación GPS nativa
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            console.log('[GPS] Ubicación detectada:', loc.coords.latitude, loc.coords.longitude);
          }
        }
      } catch (e) {
        console.log('[GPS] Error GPS:', e);
      }
    })();

    // 2. Loop de animación del cono de radar
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Loop de pulso
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Sockets
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('onlineUsersCount', (data) => {
        if (data && data.count) setOnlineCount(Math.max(12, data.count * 3));
      });
      socket.on('onlineUsersUpdate', (data) => {
        if (data && typeof data.count === 'number') {
          setOnlineCount(Math.max(14, data.count));
        }
      });
      socket.on('queueStarted', () => {
        setIsSearching(true);
      });
      socket.on('queueCancelled', () => {
        setIsSearching(false);
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const spin = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const toggleSearch = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    const socket = socketService.getSocket();

    if (!isSearching) {
      setIsSearching(true);
      setSearchSeconds(0);
      timerRef.current = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);

      if (socket) {
        socket.emit('startQueue', {
          userId: user?.id,
          sportId: selectedSport,
          formatId: selectedFormat,
          radiusKm,
          district: districtName,
          mode
        });
      }
    } else {
      setIsSearching(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (socket) {
        socket.emit('cancelQueue', { userId: user?.id });
      }
    }
  };

  const handleForceDemoMatch = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    setIsSearching(true);
    setSearchSeconds(0);
    const socket = socketService.getSocket();
    if (socket && user) {
      socket.emit('forceDemoMatch', {
        userId: user.id,
        sportId: selectedSport,
        formatId: selectedFormat
      });
    }
  };

  const handleCreateSquadLobby = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    const socket = socketService.getSocket();
    if (socket && user) {
      socket.emit('createLobby', {
        hostUser: user,
        sportId: selectedSport,
        formatId: selectedFormat
      });
    } else {
      onNavigateToLobbies();
    }
  };

  const handleJoinWithCode = () => {
    if (!codeInputValue.trim() || codeInputValue.trim().length < 4) {
      Alert.alert('Código Requerido', 'Ingresa los 4 caracteres de la sala.');
      return;
    }
    const code = codeInputValue.trim().toUpperCase();
    setShowCodeModal(false);
    setCodeInputValue('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    const socket = socketService.getSocket();
    if (socket && user) {
      socket.emit('joinLobby', { code, user });
    }
  };

  const handleApplySuplente = (item) => {
    setShowSuplentesModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    const socket = socketService.getSocket();
    if (socket && user) {
      socket.emit('joinReplacementLobby', { code: item.code, user });
    }
    Alert.alert('¡Postulación Enviada!', `Te has unido como suplente urgente a ${item.title} en #${item.code}.`);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. TOP BAR: Brand + 🟢 Activos en Toolbar + Avatar */}
      <View style={styles.topBar}>
        <View style={styles.topBrandRow}>
          <View style={styles.shieldIconWrapper}>
            <Text style={styles.shieldIcon}>⚽</Text>
          </View>
          <View>
            <Text style={styles.topBrandSmall}>MATCHSPORT</Text>
            <Text style={styles.topBrandTitle}>RADAR MATCH</Text>
          </View>
        </View>

        {/* 🟢 Indicador de Jugadores Activos en el Toolbar */}
        <View style={styles.onlineToolbarPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.onlineToolbarText}>{onlineCount} activos</Text>
        </View>

        {/* Acciones Derecha: Notificación y Avatar */}
        <View style={styles.topRightActions}>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
          <View style={styles.userAvatarWrapper}>
            <Image
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
              style={styles.userAvatar}
            />
            <View style={styles.onlineBadge} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. CHIP DE UBICACIÓN Y RADIO (Ancho Completo, Sin tarjeta duplicada) */}
        <TouchableOpacity
          style={styles.locationBanner}
          activeOpacity={0.8}
          onPress={() => setShowRadiusModal(true)}
        >
          <View style={styles.locationBannerLeft}>
            <Text style={styles.locationPinIcon}>📍</Text>
            <View>
              <Text style={styles.locationDistrictTitle}>{districtName.toUpperCase()}</Text>
              <Text style={styles.locationRadiusSubtitle}>Radio: {radiusKm} km • Canchas en radar</Text>
            </View>
          </View>
          <View style={styles.locationChangeBadge}>
            <Text style={styles.locationChangeText}>⚙️ Ajustar</Text>
          </View>
        </TouchableOpacity>

        {/* 3. CENTERPIECE RADAR SWEEP */}
        <View style={styles.radarCard}>
          <Animated.View style={[styles.radarCircle, { transform: [{ scale: pulseAnim }] }]}>
            {/* Anillos concéntricos */}
            <View style={styles.ring1} />
            <View style={styles.ring2} />
            <View style={styles.ring3} />
            <View style={styles.crosshairV} />
            <View style={styles.crosshairH} />

            {/* Cono de barrido 360° */}
            <Animated.View style={[styles.sweepCone, { transform: [{ rotate: spin }] }]} />

            {/* Núcleo central del radar */}
            <View style={styles.radarCore}>
              <View style={styles.radarPentagon}>
                <View style={styles.radarCoreDot} />
              </View>
            </View>

            {/* Blips de jugadores cercanos en vivo */}
            <View style={[styles.playerBlip, { top: 40, left: 60 }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80' }} style={styles.blipAvatar} />
              <View style={styles.blipOvrBadge}><Text style={styles.blipOvrText}>85</Text></View>
              <Text style={styles.blipName}>MATEO K.</Text>
            </View>

            <View style={[styles.playerBlip, { top: 70, right: 40 }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80' }} style={styles.blipAvatar} />
              <View style={styles.blipOvrBadge}><Text style={styles.blipOvrText}>79</Text></View>
              <Text style={styles.blipName}>SANTI R.</Text>
            </View>

            <View style={[styles.playerBlip, { bottom: 50, right: 65 }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80' }} style={styles.blipAvatar} />
              <View style={styles.blipOvrBadge}><Text style={styles.blipOvrText}>82</Text></View>
              <Text style={styles.blipName}>DIEGO V.</Text>
            </View>

            <View style={[styles.clubBlip, { bottom: 60, left: 65 }]}>
              <Text style={styles.clubIcon}>🛡️</Text>
              <Text style={styles.clubName}>FC SUR</Text>
            </View>
          </Animated.View>

          {/* Pastilla de estado de búsqueda del radar */}
          <View style={styles.radarStatusPill}>
            <View style={[styles.statusDot, isSearching && styles.statusDotSearching]} />
            <Text style={styles.radarStatusText}>
              {isSearching ? `BUSCANDO RIVALES DE TU NIVEL (${formatTimer(searchSeconds)})` : 'RADAR EN ESPERA'}
            </Text>
          </View>
        </View>

        {/* 4. SELECTOR DE DEPORTE (Sin el texto 'ACTIVO', diseño limpio) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>DEPORTE</Text>
          <View style={styles.chipsRow}>
            {SPORTS.map((sport) => {
              const active = selectedSport === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.sportChip, active && styles.sportChipActive]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setSelectedSport(sport.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sportChipIcon}>{sport.icon}</Text>
                  <Text style={[styles.sportChipLabel, active && styles.sportChipLabelActive]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. SELECTOR DE MODALIDAD */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>MODALIDAD</Text>
          <View style={styles.chipsRow}>
            {FORMATS.map((fmt) => {
              const active = selectedFormat === fmt.id;
              return (
                <TouchableOpacity
                  key={fmt.id}
                  style={[styles.formatChip, active && styles.formatChipActive]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setSelectedFormat(fmt.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.formatLabel, active && styles.formatLabelActive]}>{fmt.label}</Text>
                  <Text style={[styles.formatSub, active && styles.formatSubActive]}>{fmt.sub}</Text>
                  {fmt.hasDot && <View style={styles.formatDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 6. TARJETA DE NIVEL, PUNTOS & CALIBRAR (De Pantalla 1 del Prototipo) */}
        <View style={styles.ratingCard}>
          <View style={styles.ratingInfo}>
            <View style={styles.ratingScoreRow}>
              <Text style={styles.ratingScoreText}>{userRating} pts</Text>
              <View style={styles.levelTag}>
                <Text style={styles.levelTagText}>{userLevel}</Text>
              </View>
            </View>
            <Text style={styles.recordText}>{userWins}V - {userLosses}D • Rating Competitivo</Text>
          </View>
          <TouchableOpacity
            style={styles.calibrateBtn}
            onPress={() => setShowCalibrateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.calibrateBtnText}>⚙️ Calibrar</Text>
          </TouchableOpacity>
        </View>

        {/* 7. SELECTOR DE MODO: BUSCAR SOLO VS CREAR EQUIPO */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, mode === 'solo' && styles.modeToggleBtnActive]}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch (e) {}
              setMode('solo');
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeToggleText, mode === 'solo' && styles.modeToggleTextActive]}>
              👤 Buscar Solo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeToggleBtn, mode === 'squad' && styles.modeToggleBtnActive]}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch (e) {}
              setMode('squad');
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeToggleText, mode === 'squad' && styles.modeToggleTextActive]}>
              👥 Crear Equipo
            </Text>
          </TouchableOpacity>
        </View>

        {/* 8. BOLSA DE SUPLENTES (¡FALTA 1!) - Banner de Emergencia */}
        <TouchableOpacity
          style={styles.suplentesBanner}
          activeOpacity={0.85}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
            setShowSuplentesModal(true);
          }}
        >
          <View style={styles.suplentesLeft}>
            <View style={styles.suplentesAlertBadge}>
              <Text style={styles.suplentesAlertIcon}>🚨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.suplentesTitleRow}>
                <Text style={styles.suplentesTitle}>Bolsa de Suplentes</Text>
                <View style={styles.falta1Badge}>
                  <Text style={styles.falta1Text}>¡FALTA 1!</Text>
                </View>
              </View>
              <Text style={styles.suplentesSubtitle}>Partidos con bajas urgentes en tu zona</Text>
            </View>
          </View>
          <View style={styles.suplentesActionArrow}>
            <Text style={styles.suplentesArrowText}>3 CUPOS ➔</Text>
          </View>
        </TouchableOpacity>

        {/* 9. BOTONES DE ACCIÓN PRINCIPALES */}
        <View style={styles.actionButtonsCol}>
          {mode === 'solo' ? (
            <TouchableOpacity
              style={[styles.radarToggleBtn, isSearching ? styles.radarCancelBtn : styles.radarActivateBtn]}
              onPress={toggleSearch}
              activeOpacity={0.85}
            >
              <Text style={[styles.radarToggleText, isSearching ? styles.radarCancelText : styles.radarActivateText]}>
                {isSearching ? '⭮ CANCELAR BÚSQUEDA' : '⚡ BUSCAR PARTIDO'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.radarToggleBtn, styles.radarActivateBtn]}
              onPress={handleCreateSquadLobby}
              activeOpacity={0.85}
            >
              <Text style={[styles.radarToggleText, styles.radarActivateText]}>
                👥 CREAR SALA DE EQUIPO
              </Text>
            </TouchableOpacity>
          )}

          {/* Botones de acción secundaria: Bot de prueba y Unirse con código */}
          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={styles.botDemoBtn}
              onPress={handleForceDemoMatch}
              activeOpacity={0.8}
            >
              <Text style={styles.botDemoIcon}>🤖</Text>
              <Text style={styles.botDemoText}>Rival de Prueba (Bot)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.joinCodeBtn}
              onPress={() => setShowCodeModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.joinCodeIcon}>🔑</Text>
              <Text style={styles.joinCodeText}>Unirse con Código</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ========================================================
          MODALES NATIVOS DE SOPORTE
          ======================================================== */}

      {/* 1. Modal Ajustar Radio */}
      <Modal visible={showRadiusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📍 Ajustar Radio de Búsqueda</Text>
            <Text style={styles.modalSub}>Selecciona la distancia máxima para emparejamiento:</Text>
            <View style={styles.modalOptionsGrid}>
              {RADIUS_OPTIONS.map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.modalOptionCard, radiusKm === km && styles.modalOptionActive]}
                  onPress={() => {
                    setRadiusKm(km);
                    setShowRadiusModal(false);
                    try { Haptics.selectionAsync(); } catch (e) {}
                  }}
                >
                  <Text style={[styles.modalOptionTitle, radiusKm === km && styles.modalOptionTitleActive]}>
                    {km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowRadiusModal(false)}>
              <Text style={styles.modalCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Calibrar Nivel */}
      <Modal visible={showCalibrateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚙️ Calibrar Nivel Declarado</Text>
            <Text style={styles.modalSub}>Ajusta tu categoría para rivales equitativos:</Text>
            <View style={styles.levelOptionsCol}>
              {LEVEL_OPTIONS.map((lvl) => (
                <TouchableOpacity
                  key={lvl.label}
                  style={[styles.levelOptionRow, userLevel === lvl.label && styles.levelOptionRowActive]}
                  onPress={() => {
                    setUserLevel(lvl.label);
                    setUserRating(lvl.rating);
                    setShowCalibrateModal(false);
                    try { Haptics.selectionAsync(); } catch (e) {}
                  }}
                >
                  <View>
                    <Text style={[styles.levelOptionName, userLevel === lvl.label && styles.levelOptionNameActive]}>
                      {lvl.label} (~{lvl.rating} pts)
                    </Text>
                    <Text style={styles.levelOptionDesc}>{lvl.desc}</Text>
                  </View>
                  {userLevel === lvl.label && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCalibrateModal(false)}>
              <Text style={styles.modalCloseBtnText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Modal Unirse con Código */}
      <Modal visible={showCodeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🔑 Ingresar Código de Sala</Text>
            <Text style={styles.modalSub}>Escribe el código de 4 caracteres (ej. X8K2):</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="ABCD"
              placeholderTextColor="#64748B"
              maxLength={4}
              autoCapitalize="characters"
              value={codeInputValue}
              onChangeText={setCodeInputValue}
              autoFocus
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalCancelBtn]}
                onPress={() => setShowCodeModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalConfirmBtn]}
                onPress={handleJoinWithCode}
              >
                <Text style={styles.modalConfirmBtnText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Modal Bolsa de Suplentes */}
      <Modal visible={showSuplentesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.suplentesModalHeader}>
              <Text style={styles.modalTitle}>🚨 Bolsa de Suplentes</Text>
              <View style={styles.falta1Badge}>
                <Text style={styles.falta1Text}>URGENTE</Text>
              </View>
            </View>
            <Text style={styles.modalSub}>Partidos incompletos listos para comenzar en tu zona:</Text>

            <ScrollView style={{ marginTop: 10, maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {MOCK_SUPLENTES.map((item) => (
                <View key={item.id} style={styles.suplenteCard}>
                  <View style={styles.suplenteCardTop}>
                    <Text style={styles.suplenteCardTitle}>{item.title}</Text>
                    <View style={styles.suplenteCardBadge}>
                      <Text style={styles.suplenteCardBadgeText}>#{item.code}</Text>
                    </View>
                  </View>
                  <Text style={styles.suplenteCardVenue}>📍 {item.venue} • {item.time}</Text>
                  <Text style={styles.suplenteCardInfo}>Posición: <Text style={{ color: '#fff' }}>{item.positionNeeded}</Text> • Nivel: {item.ratingAvg}</Text>
                  <TouchableOpacity
                    style={styles.suplenteApplyBtn}
                    onPress={() => handleApplySuplente(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.suplenteApplyBtnText}>⚡ Postularme de Inmediato</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSuplentesModal(false)}>
              <Text style={styles.modalCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  // TOP BAR
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  shieldIcon: {
    fontSize: 14,
  },
  topBrandSmall: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  topBrandTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  // Pastilla de Activos en el Toolbar
  onlineToolbarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    gap: 5,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  onlineToolbarText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  bellIcon: {
    fontSize: 13,
  },
  userAvatarWrapper: {
    position: 'relative',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: THEME.colors.primary,
    borderWidth: 1.5,
    borderColor: THEME.colors.bgCanvas,
  },

  // SCROLL CONTENT
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },

  // UBICACIÓN (Ancho completo, sin usuario duplicado)
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  locationBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationPinIcon: {
    fontSize: 18,
  },
  locationDistrictTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  locationRadiusSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  locationChangeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  locationChangeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },

  // RADAR CENTERPIECE
  radarCard: {
    backgroundColor: '#0F131C',
    borderRadius: THEME.radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  radarCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.15)',
  },
  ring2: {
    position: 'absolute',
    width: 165,
    height: 165,
    borderRadius: 82.5,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  ring3: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  crosshairH: {
    position: 'absolute',
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  sweepCone: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'transparent',
    borderTopWidth: 110,
    borderTopColor: 'rgba(0, 230, 118, 0.1)',
    borderLeftWidth: 110,
    borderLeftColor: 'transparent',
    borderRightWidth: 110,
    borderRightColor: 'transparent',
  },
  radarCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  radarPentagon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  radarCoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  playerBlip: {
    position: 'absolute',
    alignItems: 'center',
  },
  blipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: THEME.colors.gold,
  },
  blipOvrBadge: {
    position: 'absolute',
    bottom: 10,
    right: -4,
    backgroundColor: THEME.colors.gold,
    borderRadius: 5,
    paddingHorizontal: 2,
    paddingVertical: 0.5,
  },
  blipOvrText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '900',
  },
  blipName: {
    fontSize: 7.5,
    fontWeight: '900',
    color: THEME.colors.goldLight,
    marginTop: 2,
  },
  clubBlip: {
    position: 'absolute',
    alignItems: 'center',
  },
  clubIcon: {
    fontSize: 15,
  },
  clubName: {
    fontSize: 7.5,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  radarStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.textMuted,
    marginRight: 6,
  },
  statusDotSearching: {
    backgroundColor: THEME.colors.primary,
  },
  radarStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },

  // SECCIONES GENERALES
  sectionBlock: {
    gap: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sportChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 4,
  },
  sportChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  sportChipIcon: {
    fontSize: 13,
  },
  sportChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  sportChipLabelActive: {
    color: '#00210B',
  },
  formatChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    position: 'relative',
  },
  formatChipActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: THEME.colors.primary,
  },
  formatLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  formatLabelActive: {
    color: THEME.colors.primary,
  },
  formatSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  formatSubActive: {
    color: THEME.colors.primary,
  },
  formatDot: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.colors.primary,
  },

  // TARJETA DE NIVEL & CALIBRAR
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  ratingInfo: {
    gap: 2,
  },
  ratingScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingScoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.goldLight,
  },
  recordText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  calibrateBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  calibrateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },

  // TOGGLE DE MODO: BUSCAR SOLO VS CREAR EQUIPO
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  modeToggleBtnActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
  },

  // BOLSA DE SUPLENTES (¡FALTA 1!)
  suplentesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1.2,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderRadius: THEME.radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  suplentesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  suplentesAlertBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suplentesAlertIcon: {
    fontSize: 16,
  },
  suplentesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suplentesTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.goldLight,
  },
  falta1Badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  falta1Text: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  suplentesSubtitle: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 1,
  },
  suplentesActionArrow: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suplentesArrowText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: THEME.colors.gold,
  },

  // BOTONES DE ACCIÓN
  actionButtonsCol: {
    gap: 8,
    marginTop: 2,
  },
  radarToggleBtn: {
    height: 50,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarActivateBtn: {
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  radarCancelBtn: {
    backgroundColor: '#8B0000',
    borderWidth: 1,
    borderColor: THEME.colors.danger,
  },
  radarToggleText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  radarActivateText: {
    color: '#00210B',
  },
  radarCancelText: {
    color: '#FFFFFF',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  botDemoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.cardBg,
    height: 44,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  botDemoIcon: {
    fontSize: 14,
  },
  botDemoText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  joinCodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.cardBg,
    height: 44,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  joinCodeIcon: {
    fontSize: 13,
  },
  joinCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },

  // MODALES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: THEME.colors.cardElevated,
    borderRadius: THEME.radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  modalOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalOptionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.cardBg,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: THEME.colors.primary,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  modalOptionTitleActive: {
    color: THEME.colors.primary,
  },
  levelOptionsCol: {
    gap: 8,
  },
  levelOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBg,
    padding: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  levelOptionRowActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  levelOptionName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  levelOptionNameActive: {
    color: THEME.colors.primary,
  },
  levelOptionDesc: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    color: THEME.colors.primary,
    fontWeight: '900',
  },
  codeInput: {
    backgroundColor: '#0F131C',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
    paddingVertical: 12,
    marginVertical: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalCancelBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    backgroundColor: THEME.colors.primary,
  },
  modalConfirmBtnText: {
    color: '#00210B',
    fontSize: 12,
    fontWeight: '900',
  },
  modalCloseBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  suplentesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suplenteCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 8,
    gap: 4,
  },
  suplenteCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suplenteCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  suplenteCardBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suplenteCardBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.goldLight,
  },
  suplenteCardVenue: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  suplenteCardInfo: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  suplenteApplyBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  suplenteApplyBtnText: {
    color: '#00210B',
    fontSize: 11,
    fontWeight: '900',
  },
});
