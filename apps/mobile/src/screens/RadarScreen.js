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
  SafeAreaView
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

const SPORTS = [
  { id: 'futbol', name: 'FÚTBOL', icon: '⚽' },
  { id: 'basket', name: 'BASKET', icon: '🏀' },
  { id: 'padel', name: 'PÁDEL', icon: '🎾' }
];

const FORMATS = [
  { id: '1v1', label: '1v1', sub: 'DUELO' },
  { id: '3v3', label: '3v3', sub: 'RETA' },
  { id: '5v5', label: '5v5', sub: 'CONVOCATORIA', hasDot: true }
];

export default function RadarScreen({ user, onNavigateToLobbies, onLogout }) {
  const [selectedSport, setSelectedSport] = useState('futbol');
  const [selectedFormat, setSelectedFormat] = useState('5v5');
  const [radiusKm, setRadiusKm] = useState(8);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [onlineCount, setOnlineCount] = useState(18);
  const [latencyMs, setLatencyMs] = useState(24);
  const [districtName, setDistrictName] = useState('SURCO, LIMA');

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
          console.log('[GPS] Ubicación detectada:', loc.coords.latitude, loc.coords.longitude);
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
        socket.emit('startRadarSearch', {
          sportId: selectedSport,
          formatId: selectedFormat,
          radiusKm,
          district: districtName
        });
      }
    } else {
      setIsSearching(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (socket) {
        socket.emit('cancelRadarSearch');
      }
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Top Bar */}
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

        <View style={styles.topRightActions}>
          <TouchableOpacity style={styles.bellButton}>
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
        {/* 2. User Status & Location Chips */}
        <View style={styles.statusChipsRow}>
          <View style={styles.userChip}>
            <Image
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
              style={styles.userChipAvatar}
            />
            <View>
              <View style={styles.ovrRow}>
                <Text style={styles.userChipOvr}>{user?.futStats?.ovr || 84}</Text>
                <Text style={styles.userChipPos}>{user?.position || 'DEL'}</Text>
              </View>
              <Text style={styles.userChipStatus}>🟢 EN LÍNEA</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.locationChip} activeOpacity={0.8}>
            <Text style={styles.pinIcon}>📍</Text>
            <View>
              <Text style={styles.districtTitle}>{districtName}</Text>
              <Text style={styles.radiusSubtitle}>Radio: {radiusKm} km ⚙️</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Centerpiece Radar Sweep */}
        <View style={styles.radarCard}>
          <Animated.View style={[styles.radarCircle, { transform: [{ scale: pulseAnim }] }]}>
            {/* Concentric rings */}
            <View style={styles.ring1} />
            <View style={styles.ring2} />
            <View style={styles.ring3} />
            <View style={styles.crosshairV} />
            <View style={styles.crosshairH} />

            {/* Sweep Cone */}
            <Animated.View style={[styles.sweepCone, { transform: [{ rotate: spin }] }]} />

            {/* Central Pentagon Icon */}
            <View style={styles.radarCore}>
              <View style={styles.radarPentagon}>
                <View style={styles.radarCoreDot} />
              </View>
            </View>

            {/* Mock nearby player blips on radar */}
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

          {/* Radar Status Pill */}
          <View style={styles.radarStatusPill}>
            <View style={[styles.statusDot, isSearching && styles.statusDotSearching]} />
            <Text style={styles.radarStatusText}>
              {isSearching ? `BUSCANDO RIVALES DE TU NIVEL ${formatTimer(searchSeconds)}` : 'RADAR EN ESPERA'}
            </Text>
          </View>
        </View>

        {/* 4. Active Players & Latency */}
        <View style={styles.metricsBar}>
          <View style={styles.metricsLeft}>
            <Text style={styles.metricsIcon}>👥</Text>
            <View>
              <Text style={styles.metricsTitle}>{onlineCount} Jugadores Activos</Text>
              <Text style={styles.metricsSubtitle}>Lobbies disponibles en tu radio</Text>
            </View>
          </View>
          <View style={styles.latencyBadge}>
            <Text style={styles.latencyLabel}>LATENCIA <Text style={styles.latencyVal}>{latencyMs}ms</Text></Text>
          </View>
        </View>

        {/* 5. Selector de Deporte */}
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
                    Haptics.selectionAsync();
                    setSelectedSport(sport.id);
                  }}
                >
                  <Text style={styles.sportChipIcon}>{sport.icon}</Text>
                  <Text style={[styles.sportChipLabel, active && styles.sportChipLabelActive]}>
                    {sport.name} {active && '(ACTIVO)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 6. Selector de Modalidad */}
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
                    Haptics.selectionAsync();
                    setSelectedFormat(fmt.id);
                  }}
                >
                  <Text style={[styles.formatLabel, active && styles.formatLabelActive]}>{fmt.label}</Text>
                  <Text style={[styles.formatSub, active && styles.formatSubActive]}>{fmt.sub}</Text>
                  {fmt.hasDot && <View style={styles.formatDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 7. Parámetros Competitivos */}
        <View style={styles.competitiveCard}>
          <View style={styles.compHeader}>
            <Text style={styles.compHeaderTitle}>PARÁMETROS COMPETITIVOS</Text>
            <View style={styles.futMatchedBadge}>
              <Text style={styles.futMatchedText}>FUT MATCHED</Text>
            </View>
          </View>

          <View style={styles.compGrid}>
            <View style={styles.compBox}>
              <Text style={styles.compBoxIcon}>🎖️</Text>
              <View>
                <Text style={styles.compBoxLabel}>Rango Elo</Text>
                <Text style={styles.compBoxVal}>1700 - 1900</Text>
              </View>
            </View>

            <View style={styles.compBox}>
              <Text style={styles.compBoxIcon}>🏟️</Text>
              <View>
                <Text style={styles.compBoxLabel}>Superficie</Text>
                <Text style={styles.compBoxVal}>Césped Sint.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 8. Botones de Acción */}
        <View style={styles.actionButtonsCol}>
          <TouchableOpacity
            style={[styles.radarToggleBtn, isSearching ? styles.radarCancelBtn : styles.radarActivateBtn]}
            onPress={toggleSearch}
            activeOpacity={0.85}
          >
            <Text style={[styles.radarToggleText, isSearching ? styles.radarCancelText : styles.radarActivateText]}>
              {isSearching ? '⭮ CANCELAR BÚSQUEDA' : '⚡ ACTIVAR RADAR DE RIVALES'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.lobbyNavigateBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateToLobbies();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.keyIcon}>🔑</Text>
            <Text style={styles.lobbyNavigateText}>CREAR O UNIRSE A SALA (#ABCD)</Text>
          </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  shieldIcon: {
    fontSize: 16,
  },
  topBrandSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  topBrandTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  bellIcon: {
    fontSize: 14,
  },
  userAvatarWrapper: {
    position: 'relative',
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: THEME.colors.gold,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.primary,
    borderWidth: 1.5,
    borderColor: THEME.colors.bgCanvas,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  userChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  userChipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  ovrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userChipOvr: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  userChipPos: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  userChipStatus: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  locationChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  pinIcon: {
    fontSize: 16,
  },
  districtTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  radiusSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  radarCard: {
    backgroundColor: '#0F131C',
    borderRadius: THEME.radius.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  radarCircle: {
    width: 270,
    height: 270,
    borderRadius: 135,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring1: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.15)',
  },
  ring2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  ring3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'transparent',
    borderTopWidth: 120,
    borderTopColor: 'rgba(0, 230, 118, 0.1)',
    borderLeftWidth: 120,
    borderLeftColor: 'transparent',
    borderRightWidth: 120,
    borderRightColor: 'transparent',
  },
  radarCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  radarPentagon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.gold,
  },
  blipOvrBadge: {
    position: 'absolute',
    bottom: 12,
    right: -4,
    backgroundColor: THEME.colors.gold,
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  blipOvrText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '900',
  },
  blipName: {
    fontSize: 8,
    fontWeight: '900',
    color: THEME.colors.goldLight,
    marginTop: 2,
  },
  clubBlip: {
    position: 'absolute',
    alignItems: 'center',
  },
  clubIcon: {
    fontSize: 16,
  },
  clubName: {
    fontSize: 8,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  radarStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.colors.textMuted,
    marginRight: 8,
  },
  statusDotSearching: {
    backgroundColor: THEME.colors.primary,
  },
  radarStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  metricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  metricsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricsIcon: {
    fontSize: 18,
  },
  metricsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  metricsSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  latencyBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  latencyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  latencyVal: {
    color: THEME.colors.primary,
    fontWeight: '900',
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sportChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 5,
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    position: 'relative',
  },
  formatChipActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: THEME.colors.primary,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  formatLabelActive: {
    color: THEME.colors.primary,
  },
  formatSub: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  formatSubActive: {
    color: THEME.colors.primary,
  },
  formatDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  competitiveCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  futMatchedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
  },
  futMatchedText: {
    color: THEME.colors.goldLight,
    fontSize: 9,
    fontWeight: '900',
  },
  compGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  compBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    padding: 10,
    borderRadius: THEME.radius.md,
    gap: 8,
  },
  compBoxIcon: {
    fontSize: 16,
  },
  compBoxLabel: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  compBoxVal: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 4,
  },
  radarToggleBtn: {
    height: 52,
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
  lobbyNavigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.cardBg,
    height: 50,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  keyIcon: {
    fontSize: 14,
  },
  lobbyNavigateText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
