import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Image,
  SafeAreaView
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { THEME } from '../theme';

// Enfoque exclusivo en Fútbol para esta etapa del MVP (Extensible a más deportes)
const ENABLE_ONLY_FUTBOL = true;

const DEFAULT_SPORTS = [
  { id: 'futbol', name: 'FÚTBOL', icon: '⚽', active: true }
];

const DEFAULT_FORMATS_BY_SPORT = {
  futbol: [
    { id: '1v1', label: '1v1', sub: 'Rey de Pista', desc: 'Duelo individual mano a mano o caño', playersPerTeam: 1 },
    { id: '2v2', label: '2v2', sub: 'Parejas', desc: 'Duelo en arco chico sin arquero fijo', playersPerTeam: 2 },
    { id: '3v3', label: '3v3', sub: 'Squad', desc: 'Mini losa o fútbol callejero rápido 3v3', playersPerTeam: 3 },
    { id: '5v5', label: '5v5', sub: 'Futsal', desc: 'Fútbol 5 en losa o césped sintético', playersPerTeam: 5, popular: true },
    { id: '6v6', label: '6v6', sub: 'Sintético', desc: 'Fútbol 6 en césped sintético (Modalidad reina en Lima)', playersPerTeam: 6, popular: true },
    { id: '7v7', label: '7v7', sub: 'Fútbol 7', desc: 'Canchas medianas de fútbol 7 tradicional', playersPerTeam: 7 },
    { id: '8v8', label: '8v8', sub: 'Fútbol 8', desc: 'Canchas amplias de fútbol 8 sintético', playersPerTeam: 8 },
    { id: '9v9', label: '9v9', sub: 'Fútbol 9', desc: 'Formato táctico intermedio 9 vs 9', playersPerTeam: 9 },
    { id: '11v11', label: '11v11', sub: 'Reglamentario', desc: 'Fútbol 11 oficial en campo completo', playersPerTeam: 11 }
  ],
  basket: [
    { id: '1v1', label: '1v1', sub: 'Duelo', desc: 'Mano a mano individual al aro', playersPerTeam: 1 },
    { id: '3v3', label: '3v3', sub: 'FIBA 3x3', desc: 'Media cancha oficial estilo Streetball FIBA', playersPerTeam: 3, popular: true },
    { id: '5v5', label: '5v5', sub: 'Completa', desc: 'Cancha completa reglamentaria', playersPerTeam: 5 }
  ],
  padel: [
    { id: '1v1', label: '1v1', sub: 'Singles', desc: 'Individual en pista cruzada', playersPerTeam: 1 },
    { id: '2v2', label: '2v2', sub: 'Oficial', desc: 'Dobles en pareja reglamentario', playersPerTeam: 2, popular: true },
    { id: '3v3', label: '3v3', sub: 'Americano', desc: 'Rotación americana y rey de la pista', playersPerTeam: 3 }
  ],
  tenis: [
    { id: '1v1', label: '1v1', sub: 'Singles', desc: 'Singles individual oficial a sets', playersPerTeam: 1, popular: true },
    { id: '2v2', label: '2v2', sub: 'Dobles', desc: 'Dobles en pareja con pasillos laterales', playersPerTeam: 2 },
    { id: 'tiebreak', label: 'Tie-break', sub: 'Express', desc: 'Super Tie-Break express a 10 puntos', playersPerTeam: 1 }
  ]
};

export default function RadarScreen({
  user,
  onNavigateToLobbies,
  onOpenNotifications,
  onOpenCalibration,
  onOpenLocationSettings,
  onOpenJoinCode,
  onStartFootballTest,
  onRequireProfileSetup,
  radiusKm = 8,
  districtName = 'SURCO, LIMA',
  userLevel = 'Intermedio'
}) {
  // Catálogo dinámico sincronizado con backend
  const [sportsList, setSportsList] = useState(DEFAULT_SPORTS);
  const [formatsBySport, setFormatsBySport] = useState(DEFAULT_FORMATS_BY_SPORT);

  // Configuración deportiva activa (Fútbol por defecto)
  const [selectedSport, setSelectedSport] = useState('futbol');
  const [selectedFormat, setSelectedFormat] = useState('6v6');

  // Sincronizar catálogo con la API del servidor
  useEffect(() => {
    api.getSports().then((res) => {
      if (res?.sports && Array.isArray(res.sports)) {
        let mappedSports = res.sports.map((s) => ({
          id: s.id,
          name: s.name.toUpperCase(),
          icon: s.icon,
          active: s.active !== false
        }));
        if (ENABLE_ONLY_FUTBOL) {
          mappedSports = mappedSports.filter((s) => s.id === 'futbol');
        }
        setSportsList(mappedSports);

        const mappedFormats = {};
        res.sports.forEach((s) => {
          mappedFormats[s.id] = (s.formats || [])
            .filter((f) => f.active !== false)
            .map((f) => ({
              id: f.id,
              label: f.id,
              sub: f.name.replace(/^[0-9v]+\s*/i, '').replace(/[()]/g, '').trim() || f.name,
              desc: f.desc || f.name,
              playersPerTeam: f.playersPerTeam,
              popular: f.popular || f.id === '6v6' || f.id === '5v5'
            }));
        });
        setFormatsBySport((prev) => ({ ...prev, ...mappedFormats }));
      }
    }).catch((err) => {
      console.log('[RADAR] Usando formatos por defecto:', err.message);
    });

    const socket = socketService.getSocket();
    if (socket) {
      const handleSportsUpdated = (data) => {
        if (data?.sports && Array.isArray(data.sports)) {
          const mappedFormats = {};
          data.sports.forEach((s) => {
            mappedFormats[s.id] = (s.formats || [])
              .filter((f) => f.active !== false)
              .map((f) => ({
                id: f.id,
                label: f.id,
                sub: f.name.replace(/^[0-9v]+\s*/i, '').replace(/[()]/g, '').trim() || f.name,
                desc: f.desc || f.name,
                playersPerTeam: f.playersPerTeam,
                popular: f.popular || f.id === '6v6' || f.id === '5v5'
              }));
          });
          setFormatsBySport((prev) => ({ ...prev, ...mappedFormats }));
        }
      };
      socket.on('sportsUpdated', handleSportsUpdated);
      return () => {
        socket.off('sportsUpdated', handleSportsUpdated);
      };
    }
  }, []);

  // Sincronizar automáticamente la modalidad al cambiar de deporte
  useEffect(() => {
    const formats = formatsBySport[selectedSport] || formatsBySport.futbol || [];
    const exists = formats.some((f) => f.id === selectedFormat);
    if (!exists && formats.length > 0) {
      const defaultFmt = formats.find((f) => f.popular) || formats[0];
      setSelectedFormat(defaultFmt.id);
    }
  }, [selectedSport, formatsBySport]);

  // Modo de juego: Buscar Solo vs Crear Equipo
  const [mode, setMode] = useState('solo'); // 'solo' | 'squad'

  // Búsqueda y estado en vivo
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [onlineCount, setOnlineCount] = useState(18);

  // Animaciones del radar: Pulso concéntrico y cono de barrido 360°
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const availableFormats = formatsBySport[selectedSport] || formatsBySport.futbol || [];
  const currentFormatObj = availableFormats.find((f) => f.id === selectedFormat) || availableFormats[0];

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

    // Gating obligatorio: Ficha biométrica y Test de Nivel completados
    if (!user?.hasCompletedProfile || !user?.hasCompletedTest) {
      if (onRequireProfileSetup) {
        onRequireProfileSetup();
      } else if (onStartFootballTest) {
        onStartFootballTest();
      }
      return;
    }

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

    // Gating obligatorio: Ficha biométrica y Test de Nivel completados
    if (!user?.hasCompletedProfile || !user?.hasCompletedTest) {
      if (onRequireProfileSetup) {
        onRequireProfileSetup();
      } else if (onStartFootballTest) {
        onStartFootballTest();
      }
      return;
    }

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

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. TOP BAR: Brand + 🟢 Activos en Toolbar + Campana con Badge + Avatar */}
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

        {/* Acciones Derecha: Campana con Badge de Bolsa de Suplentes y Avatar */}
        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={onOpenNotifications}
            activeOpacity={0.7}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {/* Badge de alertas de suplentes / avisos urgentes */}
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>2</Text>
            </View>
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
        {/* 2. CHIP DE UBICACIÓN Y RADIO (Navegación nativa a LocationSettingsScreen) */}
        <TouchableOpacity
          style={styles.locationBanner}
          activeOpacity={0.8}
          onPress={onOpenLocationSettings}
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

        {/* 4. DEPORTE: FÚTBOL (Enfoque exclusivo para esta etapa del MVP) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>DEPORTE</Text>
            <View style={styles.activeSportBadge}>
              <Text style={styles.activeSportBadgeText}>TEMPORADA EXCLUSIVA</Text>
            </View>
          </View>

          {sportsList.length <= 1 ? (
            <View style={styles.singleSportCard}>
              <View style={styles.singleSportLeft}>
                <View style={styles.singleSportIconBox}>
                  <Text style={styles.singleSportIcon}>⚽</Text>
                </View>
                <View>
                  <Text style={styles.singleSportTitle}>FÚTBOL</Text>
                  <Text style={styles.singleSportSubtitle}>9 Modalidades activas • Canchas y Losas en Lima</Text>
                </View>
              </View>
              <View style={styles.activeStatusPill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeStatusText}>ACTIVO</Text>
              </View>
            </View>
          ) : (
            <View style={styles.chipsRow}>
              {sportsList.map((sport) => {
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
          )}
        </View>

        {/* 5. SELECTOR DE TODAS LAS MODALIDADES DE FÚTBOL (Scroll Horizontal de Alta Densidad) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>MODALIDADES DISPONIBLES ({availableFormats.length})</Text>
            {currentFormatObj?.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MÁS JUGADA EN LIMA</Text>
              </View>
            )}
          </View>

          {/* Carrusel Horizontal de Modalidades para mostrar todas (1v1 a 11v11) sin recortes */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formatsScrollContainer}
          >
            {availableFormats.map((fmt) => {
              const active = selectedFormat === fmt.id;
              return (
                <TouchableOpacity
                  key={fmt.id}
                  style={[styles.formatCardChip, active && styles.formatCardChipActive]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setSelectedFormat(fmt.id);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.formatCardTop}>
                    <Text style={[styles.formatCardLabel, active && styles.formatCardLabelActive]}>
                      {fmt.label}
                    </Text>
                    {fmt.popular && (
                      <View style={[styles.dotPopular, active && styles.dotPopularActive]} />
                    )}
                  </View>
                  <Text style={[styles.formatCardSub, active && styles.formatCardSubActive]} numberOfLines={1}>
                    {fmt.sub}
                  </Text>
                  <View style={[styles.formatPlayersTag, active && styles.formatPlayersTagActive]}>
                    <Text style={[styles.formatPlayersText, active && styles.formatPlayersTextActive]}>
                      {fmt.playersPerTeam}v{fmt.playersPerTeam}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Breve descripción contextual de la modalidad seleccionada */}
          <View style={styles.formatDescBox}>
            <Text style={styles.formatExplanationText}>
              ℹ️ <Text style={{ fontWeight: '800', color: '#F8FAFC' }}>{currentFormatObj?.label} ({currentFormatObj?.sub}):</Text> {currentFormatObj?.desc || ''} ({currentFormatObj?.playersPerTeam * 2} jugadores en cancha).
            </Text>
          </View>
        </View>

        {/* 6. AVISO OFICIAL: CALIBRACIÓN AUTOMÁTICA DEL SISTEMA (Sin edición manual de puntuación) */}
        <View style={[styles.ratingCard, !user?.hasCompletedTest && styles.ratingCardPending]}>
          <View style={styles.ratingInfo}>
            <View style={styles.ratingScoreRow}>
              <View style={[styles.calibratingBadge, !user?.hasCompletedTest && styles.calibratingBadgePending]}>
                <Text style={[styles.calibratingBadgeText, !user?.hasCompletedTest && styles.calibratingBadgeTextPending]}>
                  {!user?.hasCompletedTest
                    ? '⚠️ TEST PENDIENTE'
                    : (user?.matchesPlayed || 0) >= 3
                    ? '🏆 OFICIAL CALIBRADO'
                    : `🎯 CALIBRANDO (${user?.matchesPlayed || 0}/3 PJ)`}
                </Text>
              </View>
              <View style={styles.systemTag}>
                <Text style={styles.systemTagText}>Glicko-2 & Peer Review</Text>
              </View>
            </View>

            {!user?.hasCompletedTest ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.calibratingDescText}>
                  Para calibrar tu nivel y buscar partidos, primero debes completar tu <Text style={{ fontWeight: '800', color: '#FFF' }}>Test de Fútbol (14 preguntas)</Text> y luego disputar tus primeros <Text style={{ fontWeight: '800', color: THEME.colors.primary }}>3 partidos</Text> en cancha.
                </Text>
                <TouchableOpacity
                  style={styles.startTestDirectBtn}
                  onPress={onStartFootballTest}
                  activeOpacity={0.85}
                >
                  <Text style={styles.startTestDirectText}>📝 REALIZAR TEST DE NIVEL AHORA ➔</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.calibratingDescText}>
                  {(user?.matchesPlayed || 0) >= 3
                    ? `Puntuación consolidada: ${user?.ratingOverall || 1500} pts (OVR ${user?.futStats?.ovr || 75}).`
                    : `Test completado: ${user?.testScore || 64}/100 pts (${user?.testLevel || 'Intermedio'}). Juega tus 3 partidos para fijar tu rating oficial Glicko-2.`}
                </Text>

                {/* Stepper visual de progreso de calibración */}
                <View style={styles.miniStepperRow}>
                  <View style={styles.stepperPills}>
                    <View style={[styles.stepperPill, (user?.matchesPlayed || 0) >= 1 ? styles.stepperPillDone : styles.stepperPillActive]} />
                    <View style={[styles.stepperPill, (user?.matchesPlayed || 0) >= 2 ? styles.stepperPillDone : (user?.matchesPlayed || 0) === 1 ? styles.stepperPillActive : styles.stepperPillPending]} />
                    <View style={[styles.stepperPill, (user?.matchesPlayed || 0) >= 3 ? styles.stepperPillDone : (user?.matchesPlayed || 0) === 2 ? styles.stepperPillActive : styles.stepperPillPending]} />
                  </View>
                  <Text style={styles.recordText}>
                    {(user?.matchesPlayed || 0) >= 3
                      ? `${user?.matchesPlayed} PJ • Calibrado`
                      : `${user?.matchesPlayed || 0} de 3 partidos disputados`}
                  </Text>
                </View>
              </>
            )}
          </View>

          {user?.hasCompletedTest && (
            <TouchableOpacity
              style={styles.calibrateInfoBtn}
              onPress={onOpenCalibration}
              activeOpacity={0.8}
            >
              <Text style={styles.calibrateInfoBtnText}>ℹ️ Auditoría</Text>
            </TouchableOpacity>
          )}
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

        {/* 8. BOTONES DE ACCIÓN PRINCIPALES */}
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

          {/* Botones de acción secundaria: Bot de prueba y Unirse con código (Navegación nativa) */}
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
              onPress={onOpenJoinCode}
              activeOpacity={0.8}
            >
              <Text style={styles.joinCodeIcon}>🔑</Text>
              <Text style={styles.joinCodeText}>Unirse con Código</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    position: 'relative',
  },
  bellIcon: {
    fontSize: 13,
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.bgCanvas,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
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

  // UBICACIÓN (Ancho completo)
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeSportBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  activeSportBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.6,
  },
  singleSportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  singleSportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  singleSportIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  singleSportIcon: {
    fontSize: 20,
  },
  singleSportTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  singleSportSubtitle: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  activeStatusText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  popularBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  popularBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },

  // CARRUSEL HORIZONTAL DE MODALIDADES (1v1 a 11v11)
  formatsScrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  formatCardChip: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minWidth: 78,
    alignItems: 'center',
    gap: 2,
  },
  formatCardChipActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.14)',
    borderColor: THEME.colors.primary,
  },
  formatCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formatCardLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#CBD5E1',
  },
  formatCardLabelActive: {
    color: THEME.colors.primary,
  },
  formatCardSub: {
    fontSize: 9.5,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  formatCardSubActive: {
    color: '#FFFFFF',
  },
  formatPlayersTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 2,
  },
  formatPlayersTagActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.25)',
  },
  formatPlayersText: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  formatPlayersTextActive: {
    color: THEME.colors.primary,
  },
  dotPopular: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  dotPopularActive: {
    backgroundColor: THEME.colors.primary,
  },
  formatDescBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 2,
  },
  formatExplanationText: {
    fontSize: 10.5,
    color: '#94A3B8',
    lineHeight: 14,
  },

  // TARJETA DE ESTADO DE RATING: "CALIBRANDO"
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  ratingCardPending: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: '#1C1917',
  },
  ratingInfo: {
    gap: 4,
    flex: 1,
  },
  ratingScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calibratingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  calibratingBadgePending: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  calibratingBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.goldLight,
    letterSpacing: 0.5,
  },
  calibratingBadgeTextPending: {
    color: '#EF4444',
  },
  startTestDirectBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  startTestDirectText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00210B',
  },
  systemTag: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  systemTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#06B6D4',
  },
  calibratingDescText: {
    fontSize: 10.5,
    color: '#CBD5E1',
    lineHeight: 14,
  },
  miniStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  stepperPills: {
    flexDirection: 'row',
    gap: 4,
  },
  stepperPill: {
    width: 14,
    height: 6,
    borderRadius: 3,
  },
  stepperPillActive: {
    backgroundColor: '#F59E0B',
  },
  stepperPillDone: {
    backgroundColor: THEME.colors.primary,
  },
  stepperPillPending: {
    backgroundColor: '#334155',
  },
  recordText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  calibrateInfoBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calibrateInfoBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.primary,
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
});
