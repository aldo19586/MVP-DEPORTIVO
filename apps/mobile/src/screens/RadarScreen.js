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
  SafeAreaView,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { THEME } from '../theme';

const ENABLE_ONLY_FUTBOL = true;

const DEFAULT_SPORTS = [
  { id: 'futbol', name: 'FÚTBOL', icon: '⚽', active: true }
];

const DEFAULT_FORMATS_BY_SPORT = {
  futbol: [
    { id: '5v5', label: 'Fútbol 5', short: '5v5', sub: 'Futsal / Losa', desc: 'Fútbol 5 rápido en losa o césped sintético', playersPerTeam: 5, popular: true },
    { id: '6v6', label: 'Fútbol 6', short: '6v6', sub: 'Sintético', desc: 'Fútbol 6 en césped sintético (Modalidad reina en Lima)', playersPerTeam: 6, popular: true },
    { id: '7v7', label: 'Fútbol 7', short: '7v7', sub: 'Cancha Mediana', desc: 'Canchas medianas de fútbol 7 tradicional', playersPerTeam: 7, popular: true },
    { id: '8v8', label: 'Fútbol 8', short: '8v8', sub: 'Sintético Amplio', desc: 'Canchas amplias de fútbol 8 sintético', playersPerTeam: 8 },
    { id: '9v9', label: 'Fútbol 9', short: '9v9', sub: 'Táctico', desc: 'Formato táctico intermedio 9 vs 9', playersPerTeam: 9 },
    { id: '11v11', label: 'Fútbol 11', short: '11v11', sub: 'Reglamentario', desc: 'Fútbol 11 oficial en campo completo', playersPerTeam: 11 },
    { id: '1v1', label: 'Duelo 1v1', short: '1v1', sub: 'Rey de Pista', desc: 'Duelo individual mano a mano o caño', playersPerTeam: 1 },
    { id: '2v2', label: 'Parejas 2v2', short: '2v2', sub: 'Arco Chico', desc: 'Duelo en arco chico sin arquero fijo', playersPerTeam: 2 },
    { id: '3v3', label: 'Squad 3v3', short: '3v3', sub: 'Street', desc: 'Mini losa o fútbol callejero rápido 3v3', playersPerTeam: 3 }
  ]
};

// Coordenadas tácticas en el radar circular para los hasta 3 blips activos
const BLIP_POSITIONS = [
  { top: '26%', right: '20%', align: 'left' },
  { bottom: '25%', right: '28%', align: 'right' },
  { top: '34%', left: '16%', align: 'left' }
];

export default function RadarScreen({
  user,
  onNavigateToLobbies,
  onOpenNotifications,
  onOpenCalibration,
  onOpenLocationSettings,
  onOpenJoinCode,
  onStartFootballTest,
  onRequireProfileSetup,
  onSelectCompetitionTarget,
  radiusKm = 8,
  districtName = 'SURCO, LIMA',
  userLevel = 'Intermedio'
}) {
  const [sportsList, setSportsList] = useState(DEFAULT_SPORTS);
  const [formatsBySport, setFormatsBySport] = useState(DEFAULT_FORMATS_BY_SPORT);
  const [selectedSport, setSelectedSport] = useState('futbol');
  const [selectedFormat, setSelectedFormat] = useState('7v7');
  const [mode, setMode] = useState('solo'); // 'solo' | 'squad'

  // Estado en vivo de cola, telemetría y salas reales del servidor
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  const [gpsActive, setGpsActive] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Convocatorias / salas reales obtenidas del backend para los Blips del Radar
  const [liveCompetitions, setLiveCompetitions] = useState([]);
  const [selectedBlipIndex, setSelectedBlipIndex] = useState(0);
  const [radarPrefs, setRadarPrefs] = useState(null);

  // Animaciones del radar Obsidian Pitch
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const inspectorScale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  const availableFormats = formatsBySport[selectedSport] || formatsBySport.futbol || [];
  const currentFormatObj = availableFormats.find((f) => f.id === selectedFormat) || availableFormats[0];

  const loadLiveRadarData = async () => {
    try {
      const [compRes, notifs, prefs] = await Promise.all([
        api.competitions().catch(() => ({ competitions: [] })),
        storage.getNotifications().catch(() => []),
        storage.getRadarPreferences().catch(() => null)
      ]);
      const list = Array.isArray(compRes?.competitions) ? compRes.competitions : [];
      setLiveCompetitions(list);
      if (Array.isArray(notifs)) {
        setUnreadNotifications(notifs.filter((n) => n.unread).length);
      }
      if (prefs) {
        setRadarPrefs(prefs);
      }
    } catch (e) {
      // Continuar con estado seguro
    }
  };

  useEffect(() => {
    loadLiveRadarData();

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
              label: f.id.includes('v') ? `Fútbol ${f.id.split('v')[0]}` : f.name,
              short: f.id,
              sub: f.name.replace(/^[0-9v]+\s*/i, '').replace(/[()]/g, '').trim() || f.name,
              desc: f.desc || f.name,
              playersPerTeam: f.playersPerTeam,
              popular: f.popular || f.id === '7v7' || f.id === '6v6' || f.id === '5v5'
            }));
        });
        setFormatsBySport((prev) => ({ ...prev, ...mappedFormats }));
      }
    }).catch(() => {});

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
                label: f.id.includes('v') ? `Fútbol ${f.id.split('v')[0]}` : f.name,
                short: f.id,
                sub: f.name.replace(/^[0-9v]+\s*/i, '').replace(/[()]/g, '').trim() || f.name,
                desc: f.desc || f.name,
                playersPerTeam: f.playersPerTeam,
                popular: f.popular || f.id === '7v7' || f.id === '6v6' || f.id === '5v5'
              }));
          });
          setFormatsBySport((prev) => ({ ...prev, ...mappedFormats }));
        }
      };
      const handleCompetitionRefresh = () => {
        loadLiveRadarData();
      };
      socket.on('sportsUpdated', handleSportsUpdated);
      socket.on('competitionUpdated', handleCompetitionRefresh);
      socket.on('lobbyCreated', handleCompetitionRefresh);
      socket.on('lobbyUpdated', handleCompetitionRefresh);
      return () => {
        socket.off('sportsUpdated', handleSportsUpdated);
        socket.off('competitionUpdated', handleCompetitionRefresh);
        socket.off('lobbyCreated', handleCompetitionRefresh);
        socket.off('lobbyUpdated', handleCompetitionRefresh);
      };
    }
  }, []);

  useEffect(() => {
    const formats = formatsBySport[selectedSport] || formatsBySport.futbol || [];
    const exists = formats.some((f) => f.id === selectedFormat);
    if (!exists && formats.length > 0) {
      const defaultFmt = formats.find((f) => f.id === '7v7' || f.popular) || formats[0];
      setSelectedFormat(defaultFmt.id);
    }
  }, [selectedSport, formatsBySport]);

  useEffect(() => {
    // 1. Sensor GPS con expo-location
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setGpsActive(true);
          await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        } else {
          setGpsActive(false);
        }
      } catch (e) {
        setGpsActive(false);
      }
    })();

    // 2. Rotación continua 360° del barrido del radar
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Pulso del nodo central
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Sockets de presencia y cola
    const socket = socketService.getSocket();
    if (socket) {
      const onCount = (data) => {
        if (data && typeof data.count === 'number') {
          setOnlineCount(Math.max(1, data.count));
        }
      };
      const onQueueStarted = () => setIsSearching(true);
      const onQueueCancelled = () => setIsSearching(false);

      socket.on('onlineUsersCount', onCount);
      socket.on('onlineUsersUpdate', onCount);
      socket.on('queueStarted', onQueueStarted);
      socket.on('queueCancelled', onQueueCancelled);

      return () => {
        socket.off('onlineUsersCount', onCount);
        socket.off('onlineUsersUpdate', onCount);
        socket.off('queueStarted', onQueueStarted);
        socket.off('queueCancelled', onQueueCancelled);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const spin = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSelectBlip = (idx) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setSelectedBlipIndex(idx);
    Animated.sequence([
      Animated.timing(inspectorScale, { toValue: 0.97, duration: 90, useNativeDriver: true }),
      Animated.timing(inspectorScale, { toValue: 1, duration: 130, useNativeDriver: true })
    ]).start();
  };

  const toggleSearch = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    if (!user?.hasCompletedProfile && !(user?.district && user?.position)) {
      if (onRequireProfileSetup) onRequireProfileSetup();
      return;
    }
    if (!user?.hasCompletedTest) {
      Alert.alert(
        'Test de Calibración Requerido',
        'Para buscar rivales y entrar al radar competitivo debes realizar tu Test de Nivel oficial de fútbol.',
        [
          { text: 'Más tarde', style: 'cancel' },
          { text: 'Realizar Test Ahora ➔', onPress: () => { if (onStartFootballTest) onStartFootballTest(); } }
        ]
      );
      return;
    }

    const socket = socketService.getSocket();

    if (!isSearching) {
      setIsSearching(true);
      setSearchSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
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

  const handleCreateSquadLobby = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (!user?.hasCompletedProfile && !(user?.district && user?.position)) {
      if (onRequireProfileSetup) onRequireProfileSetup();
      return;
    }
    if (!user?.hasCompletedTest) {
      Alert.alert(
        'Test de Calibración Requerido',
        'Para crear una sala de escuadra oficial debes completar primero tu Test de Nivel de fútbol.',
        [
          { text: 'Más tarde', style: 'cancel' },
          { text: 'Realizar Test Ahora ➔', onPress: () => { if (onStartFootballTest) onStartFootballTest(); } }
        ]
      );
      return;
    }

    const socket = socketService.getSocket();
    if (socket && user) {
      socket.emit('createLobby', {
        hostUser: user,
        sportId: selectedSport,
        formatId: selectedFormat
      });
    } else if (onNavigateToLobbies) {
      onNavigateToLobbies();
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cálculos reales del jugador y convocatorias
  const userOvr = user?.futStats?.ovr || (user?.ratingOverall ? Math.min(99, Math.max(60, Math.round(user.ratingOverall / 20))) : 75);
  const userElo = Math.round(user?.ratingOverall || 1500);
  const userPosition = (user?.position || 'MED').toUpperCase();
  const userTier = userElo >= 1650 ? 'Nivel Élite' : userElo >= 1450 ? 'Nivel Oro' : userElo >= 1300 ? 'Nivel Plata' : 'Nivel Bronce';

  // Filtrar convocatorias abiertas o en progreso para mostrar en el radar
  const openCompetitions = liveCompetitions.filter((c) => c.status === 'OPEN' || c.status === 'FULL' || c.status === 'IN_PROGRESS');
  const inProgressCount = liveCompetitions.filter((c) => c.status === 'IN_PROGRESS').length;
  const radarBlips = openCompetitions.slice(0, 3);
  const activeBlip = radarBlips[selectedBlipIndex] || radarBlips[0] || null;

  // Anillos de alcance dinámicos según radiusKm
  const outerRingKm = Number(radiusKm || 8).toFixed(1);
  const midRingKm = (Number(radiusKm || 8) * 0.62).toFixed(1);
  const innerRingKm = (Number(radiusKm || 8) * 0.25).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. SUB-HEADER HUB IDENTITY & LIVE GPS STATUS (Stitch matchsport_tab_1_radar_jugar) */}
      <View style={styles.hubIdentityBar}>
        <View style={styles.hubUserLeft}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {(user?.name || 'JG').slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.ovrBadgePill}>
              <Text style={styles.ovrBadgeText}>{userOvr}</Text>
            </View>
          </View>

          <View style={styles.userTextCol}>
            <View style={styles.userNameRow}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {user?.name || 'Deportista'}
              </Text>
              {user?.hasCompletedTest && (
                <View style={styles.verifiedCheck}>
                  <Text style={styles.verifiedCheckText}>✓</Text>
                </View>
              )}
            </View>
            <View style={styles.userRoleRow}>
              <Text style={styles.userPosText}>{userPosition} PRO</Text>
              <Text style={styles.userRoleDot}>•</Text>
              <Text style={styles.userTierText}>{userTier}</Text>
            </View>
          </View>
        </View>

        {/* Puntos ELO + Botón Tune (Calibración de Radar) */}
        <View style={styles.hubActionsRight}>
          <View style={styles.eloPill}>
            <Text style={styles.eloBoltIcon}>⚡</Text>
            <Text style={styles.eloValueText}>{userElo}</Text>
            <Text style={styles.eloUnitText}>ELO</Text>
          </View>

          <TouchableOpacity
            style={styles.tuneButton}
            onPress={onOpenCalibration}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Abrir calibración de radar"
          >
            <Text style={styles.tuneButtonIcon}>⚙️</Text>
            {unreadNotifications > 0 && <View style={styles.tuneDotBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. GPS DISTRICT FILTER PILL BAR */}
        <View style={styles.gpsBarRow}>
          <TouchableOpacity
            style={styles.districtFilterPill}
            onPress={onOpenLocationSettings}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Cambiar ubicación y radio de búsqueda"
          >
            <Text style={styles.districtRadarIcon}>◎</Text>
            <Text style={styles.districtFilterText} numberOfLines={1}>
              {districtName} · {radiusKm} km
            </Text>
            <Text style={styles.districtChevron}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gpsStatusPill}
            onPress={onOpenLocationSettings}
            activeOpacity={0.8}
          >
            <View style={[styles.gpsPulseDot, !gpsActive && styles.gpsPulseDotMuted]} />
            <Text style={styles.gpsStatusText}>
              {gpsActive ? 'GPS Preciso' : 'Zona Manual'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. SPORT & FORMAT SELECTOR SCROLLABLE PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.formatsPillRow}
        >
          {availableFormats.map((fmt) => {
            const isActive = selectedFormat === fmt.id;
            const formatOpenCount = openCompetitions.filter(
              (c) => (c.formatId || c.format || '7v7').toLowerCase() === fmt.id.toLowerCase()
            ).length;

            return (
              <TouchableOpacity
                key={fmt.id}
                style={[styles.sportFormatPill, isActive && styles.sportFormatPillActive]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (e) {}
                  setSelectedFormat(fmt.id);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.sportFormatIcon, isActive && styles.sportFormatIconActive]}>
                  ⚽
                </Text>
                <Text style={[styles.sportFormatLabel, isActive && styles.sportFormatLabelActive]}>
                  {fmt.label}
                </Text>
                <View style={[styles.liveCountTag, isActive && styles.liveCountTagActive]}>
                  <Text style={[styles.liveCountTagText, isActive && styles.liveCountTagTextActive]}>
                    {formatOpenCount > 0 ? `${formatOpenCount} SALAS` : fmt.short}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. TELEMETRY LIVE STATUS STRIP */}
        <View style={styles.telemetryStrip}>
          <View style={styles.telemetryItem}>
            <View style={styles.telemetryRedDot} />
            <Text style={styles.telemetryPrimaryText}>
              {inProgressCount} EN JUEGO
            </Text>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryIcon}>👥</Text>
            <Text style={styles.telemetrySecondaryText}>
              <Text style={styles.telemetryBoldNum}>{onlineCount}</Text> ACTIVOS
            </Text>
          </View>

          <View style={styles.telemetryDivider} />

          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryIcon}>⏱️</Text>
            <Text style={styles.telemetryMatchTime}>
              {openCompetitions.length} CONVOCATORIAS
            </Text>
          </View>
        </View>

        {/* 5. TACTICAL MATCHMAKING RADAR CENTERPIECE */}
        <View style={styles.radarCenterpieceSection}>
          <Animated.View style={[styles.radarCanvas, { transform: [{ scale: pulseAnim }] }]}>
            {/* Anillos concéntricos con etiquetas de rango en km */}
            <View style={styles.ringOuter}>
              <Text style={styles.ringLabelOuter}>{outerRingKm} KM</Text>
            </View>
            <View style={styles.ringMid}>
              <Text style={styles.ringLabelMid}>{midRingKm} KM</Text>
            </View>
            <View style={styles.ringInner}>
              <Text style={styles.ringLabelInner}>{innerRingKm} KM</Text>
            </View>

            {/* Ejes cartesianos tácticos */}
            <View style={styles.crosshairHorizontal} />
            <View style={styles.crosshairVertical} />

            {/* Marcas cardinales N / S / E / O */}
            <Text style={styles.cardinalNorth}>N</Text>
            <Text style={styles.cardinalSouth}>S</Text>
            <Text style={styles.cardinalWest}>O</Text>
            <Text style={styles.cardinalEast}>E</Text>

            {/* Cono de barrido rotatorio 360° */}
            <Animated.View style={[styles.sweepCone, { transform: [{ rotate: spin }] }]} />

            {/* Nodo Central GPS del Jugador */}
            <View style={styles.centerNodeWrapper}>
              <View style={styles.centerNodeHalo} />
              <View style={styles.centerNodeCore}>
                <View style={styles.centerNodeInnerDot} />
              </View>
            </View>

            {/* Blips Interactivos Reales de Convocatorias Abiertas */}
            {radarBlips.map((comp, idx) => {
              const pos = BLIP_POSITIONS[idx] || BLIP_POSITIONS[0];
              const isSelectedBlip = idx === selectedBlipIndex;
              const maxSlots = Number(comp.maxPlayers || (currentFormatObj?.playersPerTeam || 7) * 2);
              const currentSlots = Array.isArray(comp.participants) ? comp.participants.length : Number(comp.memberCount || 1);
              const missingSlots = Math.max(0, maxSlots - currentSlots);

              return (
                <TouchableOpacity
                  key={comp.id || comp.code || idx}
                  style={[
                    styles.blipButton,
                    pos.top ? { top: pos.top } : null,
                    pos.bottom ? { bottom: pos.bottom } : null,
                    pos.left ? { left: pos.left } : null,
                    pos.right ? { right: pos.right } : null,
                  ]}
                  onPress={() => handleSelectBlip(idx)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Inspeccionar sala ${comp.venueName || comp.title || comp.code}`}
                >
                  <View style={styles.blipTargetContainer}>
                    <View style={[styles.blipHalo, isSelectedBlip && styles.blipHaloSelected]} />
                    <View style={[
                      styles.blipCircle,
                      idx === 2 ? styles.blipCircleGold : styles.blipCircleNeon,
                      isSelectedBlip && styles.blipCircleSelected
                    ]}>
                      <Text style={styles.blipNumberText}>{idx + 1}</Text>
                    </View>

                    <View style={[
                      styles.blipFloatingTag,
                      pos.align === 'right' ? styles.blipTagLeft : styles.blipTagRight
                    ]}>
                      <Text style={styles.blipTagTitle} numberOfLines={1}>
                        {comp.venueName || comp.title || `Sala #${comp.code}`}
                      </Text>
                      <Text style={[
                        styles.blipTagSub,
                        idx === 2 && { color: THEME.colors.gold }
                      ]} numberOfLines={1}>
                        {comp.formatId || comp.format || selectedFormat} • {missingSlots > 0 ? `Faltan ${missingSlots}` : 'Completa'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          {/* Pastilla de estado en vivo debajo del radar */}
          <View style={styles.radarLiveStatusPill}>
            <View style={[styles.radarLiveDot, isSearching && styles.radarLiveDotSearching]} />
            <Text style={styles.radarLiveStatusText}>
              {isSearching
                ? `BUSCANDO ${selectedFormat.toUpperCase()} EN ${districtName.split(',')[0]} (${formatTimer(searchSeconds)})`
                : radarBlips.length > 0
                ? `${radarBlips.length} SALAS DETECTADAS EN TU RADIO DE ${radiusKm} KM`
                : 'RADAR CALIBRADO EN ESPERA DE CONVOCATORIAS'}
            </Text>
          </View>

          {/* 6. ACTIVE MATCH BLIP INSPECTOR CARD (Stitch Inspector Card conectada a datos reales) */}
          <Animated.View style={[styles.inspectorCard, { transform: [{ scale: inspectorScale }] }]}>
            <View style={[
              styles.inspectorTopAccentBar,
              selectedBlipIndex === 2 && styles.inspectorTopAccentBarGold
            ]} />

            {activeBlip ? (
              <>
                <View style={styles.inspectorHeaderRow}>
                  <View style={styles.inspectorTitleCol}>
                    <View style={styles.inspectorBadgesRow}>
                      <View style={[
                        styles.inspectorRecBadge,
                        selectedBlipIndex === 2 && styles.inspectorRecBadgeGold
                      ]}>
                        <Text style={[
                          styles.inspectorRecBadgeText,
                          selectedBlipIndex === 2 && styles.inspectorRecBadgeTextGold
                        ]}>
                          {activeBlip.status === 'OPEN' ? 'CONVOCATORIA ABIERTA' : activeBlip.status}
                        </Text>
                      </View>
                      <Text style={styles.inspectorDistrictText} numberOfLines={1}>
                        {activeBlip.district || districtName}
                      </Text>
                    </View>

                    <Text style={styles.inspectorVenueTitle} numberOfLines={1}>
                      {activeBlip.venueName || activeBlip.title || `Convocatoria #${activeBlip.code}`}
                    </Text>
                    <Text style={styles.inspectorPitchSubtitle} numberOfLines={1}>
                      Código: #{activeBlip.code} • Modalidad {activeBlip.formatId || activeBlip.format || selectedFormat}
                    </Text>
                  </View>

                  <View style={styles.inspectorRightStats}>
                    <View style={styles.inspectorOvrBox}>
                      <Text style={styles.inspectorOvrIcon}>⚽</Text>
                      <Text style={styles.inspectorOvrText}>
                        {(activeBlip.formatId || activeBlip.format || selectedFormat).toUpperCase()}
                      </Text>
                    </View>
                    {(() => {
                      const maxP = Number(activeBlip.maxPlayers || (currentFormatObj?.playersPerTeam || 7) * 2);
                      const curP = Array.isArray(activeBlip.participants) ? activeBlip.participants.length : Number(activeBlip.memberCount || 1);
                      const remP = Math.max(0, maxP - curP);
                      return (
                        <Text style={styles.inspectorVacancyText}>
                          {curP}/{maxP} • {remP > 0 ? `Faltan ${remP}` : 'Sala llena'}
                        </Text>
                      );
                    })()}
                  </View>
                </View>

                <View style={styles.inspectorFooterRow}>
                  <View style={styles.inspectorMetaLeft}>
                    <View style={styles.miniAvatarsStack}>
                      <View style={[styles.miniAvatarCircle, { backgroundColor: '#1E293B' }]}>
                        <Text style={styles.miniAvatarInitials}>A</Text>
                      </View>
                      <View style={[styles.miniAvatarCircle, styles.miniAvatarOverlap, { backgroundColor: '#0F172A' }]}>
                        <Text style={styles.miniAvatarInitials}>B</Text>
                      </View>
                    </View>
                    <Text style={styles.inspectorMetaLabel}>
                      Fair Play Verificado • Glicko-2
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.postularButton}
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
                      if (onSelectCompetitionTarget) {
                        onSelectCompetitionTarget({
                          competitionId: activeBlip.id,
                          code: activeBlip.code
                        });
                      } else if (onNavigateToLobbies) {
                        onNavigateToLobbies();
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.postularButtonText}>POSTULAR ➔</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.inspectorEmptyBox}>
                <View style={styles.inspectorEmptyHeader}>
                  <View style={styles.inspectorRecBadge}>
                    <Text style={styles.inspectorRecBadgeText}>SIN SALAS EN ESTE RADIO</Text>
                  </View>
                  <Text style={styles.inspectorDistrictText}>{districtName}</Text>
                </View>
                <Text style={styles.inspectorVenueTitle}>
                  No hay convocatorias abiertas de {selectedFormat} cerca
                </Text>
                <Text style={styles.inspectorPitchSubtitle}>
                  Inicia el auto-emparejamiento abajo o abre una sala en tu distrito.
                </Text>
                <View style={styles.inspectorFooterRow}>
                  <TouchableOpacity
                    style={styles.joinCodeOutlineBtn}
                    onPress={onOpenJoinCode}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.joinCodeOutlineText}>🔑 TENGO UN CÓDIGO</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.postularButton}
                    onPress={onNavigateToLobbies}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.postularButtonText}>EXPLORAR SALAS ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>

        {/* 7. AUTOMATED MATCHMAKING VAR-LITE FLOATING HERO CARD */}
        <View style={styles.heroMatchCard}>
          <View style={styles.heroCardHeader}>
            <View style={styles.heroHeaderLeft}>
              <View style={styles.heroPulseDot} />
              <Text style={styles.heroBadgeText}>MATCH RÁPIDO SMART</Text>
            </View>
            <TouchableOpacity
              style={styles.heroFilterTag}
              onPress={onOpenCalibration}
              activeOpacity={0.8}
            >
              <Text style={styles.heroFilterTagText}>
                Filtro: {userPosition} • {radarPrefs?.eloMode === 'hardcore' ? '+100 ELO' : radarPrefs?.eloMode === 'fast' ? 'Libre' : '±50 ELO'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>Auto-Emparejamiento Inmediato</Text>
          <Text style={styles.heroSubtitle}>
            El motor Glicko-2 busca rivales compatibles en {districtName.split(',')[0]} para modalidad {currentFormatObj?.label} ({currentFormatObj?.playersPerTeam}v{currentFormatObj?.playersPerTeam}).
          </Text>

          {/* Selector rápido: Buscar Solo vs Crear Equipo */}
          <View style={styles.modeSegmentContainer}>
            <TouchableOpacity
              style={[styles.modeSegmentBtn, mode === 'solo' && styles.modeSegmentBtnActive]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setMode('solo');
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeSegmentText, mode === 'solo' && styles.modeSegmentTextActive]}>
                👤 Buscar Solo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeSegmentBtn, mode === 'squad' && styles.modeSegmentBtnActive]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setMode('squad');
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeSegmentText, mode === 'squad' && styles.modeSegmentTextActive]}>
                👥 Crear Sala de Equipo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Estado de Calibración / Aviso de Test Pendiente */}
          <View style={styles.heroSpotNotice}>
            <Text style={styles.heroSpotIcon}>
              {!user?.hasCompletedTest ? '⚠️' : '⚡'}
            </Text>
            <View style={styles.heroSpotTextCol}>
              <Text style={styles.heroSpotTitle} numberOfLines={1}>
                {!user?.hasCompletedTest
                  ? 'Test Táctico de 14 Preguntas Pendiente'
                  : `${currentFormatObj?.label} · Zona ${districtName}`}
              </Text>
              <Text style={styles.heroSpotSub} numberOfLines={1}>
                {!user?.hasCompletedTest
                  ? 'Completa tu calibración inicial para habilitar la cola competitiva'
                  : (user?.matchesPlayed || 0) >= 3
                  ? `Rating Oficial Calibrado: ${userElo} ELO • OVR ${userOvr}`
                  : `Fase de Calibración: ${user?.matchesPlayed || 0}/3 partidos oficiales disputados`}
              </Text>
            </View>
            {!user?.hasCompletedTest && (
              <TouchableOpacity
                style={styles.heroTestMiniBtn}
                onPress={onStartFootballTest}
                activeOpacity={0.85}
              >
                <Text style={styles.heroTestMiniBtnText}>HACER TEST</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Big Athletic Pulsing CTA Button */}
          {mode === 'solo' ? (
            <TouchableOpacity
              style={[styles.heroCtaButton, isSearching && styles.heroCtaButtonCancel]}
              onPress={toggleSearch}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isSearching ? 'Cancelar búsqueda de partido' : 'Unirse al partido automático'}
            >
              <Text style={[styles.heroCtaIcon, isSearching && styles.heroCtaTextCancel]}>
                {isSearching ? '✕' : '⚡'}
              </Text>
              <Text style={[styles.heroCtaText, isSearching && styles.heroCtaTextCancel]}>
                {isSearching
                  ? `CANCELAR BÚSQUEDA (${formatTimer(searchSeconds)})`
                  : 'UNIRSE AL PARTIDO AUTOMÁTICO'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.heroCtaButton}
              onPress={handleCreateSquadLobby}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Crear sala de equipo"
            >
              <Text style={styles.heroCtaIcon}>👥</Text>
              <Text style={styles.heroCtaText}>CREAR SALA DE ESCUADRA ({selectedFormat})</Text>
            </TouchableOpacity>
          )}

          {/* Acciones rápidas secundarias */}
          <View style={styles.heroFooterActionsRow}>
            <TouchableOpacity
              style={styles.heroSecondaryLink}
              onPress={onOpenJoinCode}
              activeOpacity={0.75}
            >
              <Text style={styles.heroSecondaryLinkText}>🔑 Unirse con Código</Text>
            </TouchableOpacity>

            <Text style={styles.heroFooterDot}>•</Text>

            <TouchableOpacity
              style={styles.heroSecondaryLink}
              onPress={onOpenCalibration}
              activeOpacity={0.75}
            >
              <Text style={styles.heroSecondaryLinkText}>🛡️ Ajustar Tolerancia ELO</Text>
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
    backgroundColor: THEME.colors.surfaceLowest,
  },
  // 1. SUB-HEADER HUB IDENTITY
  hubIdentityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surfaceLow,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  hubUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    position: 'relative',
    width: 42,
    height: 42,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: THEME.colors.neonPitch,
    backgroundColor: THEME.colors.surfaceHigh,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: THEME.colors.neonPitch,
    fontSize: 14,
    fontWeight: '900',
  },
  ovrBadgePill: {
    position: 'absolute',
    bottom: -3,
    right: -4,
    backgroundColor: THEME.colors.surfaceLowest,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.neonPitch,
  },
  ovrBadgeText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '900',
  },
  userTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  userNameText: {
    color: THEME.colors.onSurface,
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  verifiedCheck: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'rgba(0, 255, 135, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheckText: {
    color: THEME.colors.neonPitch,
    fontSize: 9,
    fontWeight: '900',
  },
  userRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  userPosText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  userRoleDot: {
    color: THEME.colors.outline,
    fontSize: 10,
  },
  userTierText: {
    color: THEME.colors.neonSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  hubActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eloPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  eloBoltIcon: {
    fontSize: 12,
  },
  eloValueText: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    fontWeight: '900',
  },
  eloUnitText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9.5,
    fontWeight: '800',
  },
  tuneButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  tuneButtonIcon: {
    fontSize: 15,
  },
  tuneDotBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.neonPitch,
  },

  // SCROLL CONTENT
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 12,
  },

  // 2. GPS DISTRICT FILTER PILL BAR
  gpsBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  districtFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    flexShrink: 1,
  },
  districtRadarIcon: {
    color: THEME.colors.neonPitch,
    fontSize: 13,
    fontWeight: '900',
  },
  districtFilterText: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  districtChevron: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
  },
  gpsStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceLow,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 5,
  },
  gpsPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.neonPitch,
  },
  gpsPulseDotMuted: {
    backgroundColor: THEME.colors.gold,
  },
  gpsStatusText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
  },

  // 3. SPORT & FORMAT PILLS
  formatsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  sportFormatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sportFormatPillActive: {
    backgroundColor: THEME.colors.neonPitch,
    borderColor: THEME.colors.neonPitch,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sportFormatIcon: {
    fontSize: 13,
  },
  sportFormatIconActive: {
    color: THEME.colors.surfaceLowest,
  },
  sportFormatLabel: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
  },
  sportFormatLabelActive: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveCountTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: THEME.radius.pill,
  },
  liveCountTagActive: {
    backgroundColor: 'rgba(11, 14, 20, 0.22)',
  },
  liveCountTagText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9.5,
    fontWeight: '800',
  },
  liveCountTagTextActive: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900',
  },

  // 4. TELEMETRY LIVE STATUS STRIP
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  telemetryRedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.coralError,
  },
  telemetryPrimaryText: {
    color: THEME.colors.onSurface,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  telemetryDivider: {
    width: 1,
    height: 12,
    backgroundColor: THEME.colors.surfaceHighest,
  },
  telemetryIcon: {
    fontSize: 11,
  },
  telemetrySecondaryText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  telemetryBoldNum: {
    color: THEME.colors.onSurface,
    fontWeight: '900',
  },
  telemetryMatchTime: {
    color: THEME.colors.neonSecondary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // 5. TACTICAL MATCHMAKING RADAR CENTERPIECE
  radarCenterpieceSection: {
    alignItems: 'center',
    gap: 10,
  },
  radarCanvas: {
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: THEME.colors.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 135, 0.18)',
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  ringOuter: {
    position: 'absolute',
    width: '88%',
    height: '88%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59, 75, 61, 0.45)',
    alignItems: 'center',
  },
  ringLabelOuter: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: '800',
    color: 'rgba(185, 203, 185, 0.5)',
    letterSpacing: 1.2,
  },
  ringMid: {
    position: 'absolute',
    width: '62%',
    height: '62%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59, 75, 61, 0.65)',
    alignItems: 'center',
  },
  ringLabelMid: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: '800',
    color: 'rgba(185, 203, 185, 0.65)',
    letterSpacing: 1.2,
  },
  ringInner: {
    position: 'absolute',
    width: '36%',
    height: '36%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.25)',
    alignItems: 'center',
  },
  ringLabelInner: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: '800',
    color: 'rgba(0, 255, 135, 0.65)',
    letterSpacing: 1.2,
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(59, 75, 61, 0.35)',
  },
  crosshairVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(59, 75, 61, 0.35)',
  },
  cardinalNorth: {
    position: 'absolute',
    top: 6,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(185, 203, 185, 0.4)',
  },
  cardinalSouth: {
    position: 'absolute',
    bottom: 6,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(185, 203, 185, 0.4)',
  },
  cardinalWest: {
    position: 'absolute',
    left: 8,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(185, 203, 185, 0.4)',
  },
  cardinalEast: {
    position: 'absolute',
    right: 8,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(185, 203, 185, 0.4)',
  },
  sweepCone: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'transparent',
    borderTopWidth: 140,
    borderTopColor: 'rgba(0, 255, 135, 0.14)',
    borderLeftWidth: 140,
    borderLeftColor: 'transparent',
    borderRightWidth: 140,
    borderRightColor: 'transparent',
  },
  centerNodeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerNodeHalo: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 255, 135, 0.22)',
  },
  centerNodeCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  centerNodeInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.surfaceLowest,
  },
  blipButton: {
    position: 'absolute',
    zIndex: 20,
  },
  blipTargetContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blipHalo: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 255, 135, 0.22)',
  },
  blipHaloSelected: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 255, 135, 0.35)',
  },
  blipCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blipCircleNeon: {
    backgroundColor: THEME.colors.neonPitch,
  },
  blipCircleGold: {
    backgroundColor: THEME.colors.gold,
  },
  blipCircleSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  blipNumberText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 10,
    fontWeight: '900',
  },
  blipFloatingTag: {
    position: 'absolute',
    top: -4,
    backgroundColor: 'rgba(29, 32, 38, 0.94)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxWidth: 110,
  },
  blipTagRight: {
    left: 24,
  },
  blipTagLeft: {
    right: 24,
    alignItems: 'flex-end',
  },
  blipTagTitle: {
    color: THEME.colors.onSurface,
    fontSize: 9.5,
    fontWeight: '800',
  },
  blipTagSub: {
    color: THEME.colors.neonPitch,
    fontSize: 8.5,
    fontWeight: '700',
  },
  radarLiveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: 6,
  },
  radarLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.outline,
  },
  radarLiveDotSearching: {
    backgroundColor: THEME.colors.neonPitch,
  },
  radarLiveStatusText: {
    color: THEME.colors.onSurface,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // 6. INSPECTOR CARD
  inspectorCard: {
    width: '100%',
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 14,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  inspectorTopAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: THEME.colors.neonPitch,
  },
  inspectorTopAccentBarGold: {
    backgroundColor: THEME.colors.gold,
  },
  inspectorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  inspectorTitleCol: {
    flex: 1,
  },
  inspectorBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inspectorRecBadge: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inspectorRecBadgeGold: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  inspectorRecBadgeText: {
    color: THEME.colors.neonPitch,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  inspectorRecBadgeTextGold: {
    color: THEME.colors.gold,
  },
  inspectorDistrictText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  inspectorVenueTitle: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '800',
  },
  inspectorPitchSubtitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  inspectorRightStats: {
    alignItems: 'flex-end',
  },
  inspectorOvrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  inspectorOvrIcon: {
    fontSize: 11,
  },
  inspectorOvrText: {
    color: THEME.colors.neonSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  inspectorVacancyText: {
    color: THEME.colors.neonSecondary,
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 5,
  },
  inspectorFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  inspectorMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  miniAvatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.neonPitch,
  },
  miniAvatarOverlap: {
    marginLeft: -8,
  },
  miniAvatarInitials: {
    color: THEME.colors.onSurface,
    fontSize: 9,
    fontWeight: '800',
  },
  inspectorMetaLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  postularButton: {
    backgroundColor: THEME.colors.neonPitch,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  postularButtonText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  inspectorEmptyBox: {
    gap: 4,
  },
  inspectorEmptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  joinCodeOutlineBtn: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  joinCodeOutlineText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '800',
  },

  // 7. AUTOMATED MATCHMAKING VAR-LITE HERO CARD
  heroMatchCard: {
    backgroundColor: THEME.colors.surfaceHigh,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  heroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.neonPitch,
  },
  heroBadgeText: {
    color: THEME.colors.neonPitch,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  heroFilterTag: {
    backgroundColor: THEME.colors.surfaceLowest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  heroFilterTagText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
  },
  heroTitle: {
    color: THEME.colors.onSurface,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12.5,
    lineHeight: 18,
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceLowest,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  modeSegmentBtnActive: {
    backgroundColor: 'rgba(0, 255, 135, 0.16)',
    borderWidth: 1,
    borderColor: THEME.colors.neonPitch,
  },
  modeSegmentText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    fontWeight: '700',
  },
  modeSegmentTextActive: {
    color: THEME.colors.onSurface,
    fontWeight: '900',
  },
  heroSpotNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  heroSpotIcon: {
    fontSize: 18,
  },
  heroSpotTextCol: {
    flex: 1,
  },
  heroSpotTitle: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
  },
  heroSpotSub: {
    color: THEME.colors.neonSecondary,
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  heroTestMiniBtn: {
    backgroundColor: THEME.colors.neonPitch,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  heroTestMiniBtnText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 9.5,
    fontWeight: '900',
  },
  heroCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 10,
    backgroundColor: THEME.colors.neonPitch,
    gap: 8,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  heroCtaButtonCancel: {
    backgroundColor: THEME.colors.coralErrorBg,
    borderWidth: 1.5,
    borderColor: THEME.colors.coralError,
    shadowColor: THEME.colors.coralError,
  },
  heroCtaIcon: {
    color: THEME.colors.surfaceLowest,
    fontSize: 16,
    fontWeight: '900',
  },
  heroCtaText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroCtaTextCancel: {
    color: THEME.colors.coralError,
  },
  heroFooterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 2,
  },
  heroSecondaryLink: {
    paddingVertical: 4,
  },
  heroSecondaryLinkText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
  },
  heroFooterDot: {
    color: THEME.colors.outline,
    fontSize: 11,
  },
});
