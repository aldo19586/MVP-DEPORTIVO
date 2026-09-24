import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import FutCard from '../components/FutCard';
import { socketService } from '../services/socket';

const SPORTS = [
  { id: 'futbol', name: 'Fútbol', formats: [{ id: '5v5', label: 'Fútbol 5' }, { id: '7v7', label: 'Fútbol 7' }, { id: '11v11', label: 'Fútbol 11' }] },
  { id: 'padel', name: 'Pádel', formats: [{ id: '2v2', label: 'Parejas 2v2' }, { id: '1v1', label: 'Singles 1v1' }] },
  { id: 'basket', name: 'Básquet', formats: [{ id: '3v3', label: 'Media Cancha 3v3' }, { id: '5v5', label: 'Cancha Completa' }] }
];

const RADII = [3, 6, 10, 15];

export default function RadarScreen({ user, onLogout }) {
  const [selectedSport, setSelectedSport] = useState('futbol');
  const [selectedFormat, setSelectedFormat] = useState('5v5');
  const [radiusKm, setRadiusKm] = useState(6);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  const [userLocation, setUserLocation] = useState({ lat: -12.137, lng: -76.985 });
  const [showFutCard, setShowFutCard] = useState(false);

  // Animación del radar pulsante
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const searchTimerRef = useRef(null);

  useEffect(() => {
    // 1. Obtener ubicación GPS con expo-location
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude
          });
          console.log('[GPS] Ubicación detectada:', loc.coords.latitude, loc.coords.longitude);
        } else {
          console.log('[GPS] Permiso denegado, usando coordenadas predeterminadas de Lima');
        }
      } catch (e) {
        console.warn('[GPS] Error obteniendo GPS:', e);
      }
    })();

    // 2. Escuchar eventos de socket para el radar
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('onlineUsersUpdate', (data) => {
        if (data && typeof data.count === 'number') {
          setOnlineCount(data.count);
        }
      });

      socket.on('queueStarted', () => {
        setIsSearching(true);
      });

      socket.on('queueCancelled', () => {
        setIsSearching(false);
        setSearchSeconds(0);
      });
    }

    return () => {
      if (socket) {
        socket.off('onlineUsersUpdate');
        socket.off('queueStarted');
        socket.off('queueCancelled');
      }
    };
  }, []);

  // Control de animación de radar y cronómetro
  useEffect(() => {
    if (isSearching) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ])
      ).start();

      searchTimerRef.current = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(0);
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    }

    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    };
  }, [isSearching]);

  const toggleRadarSearch = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const socket = socketService.getSocket();

    if (!socket || !socket.connected) {
      Alert.alert('Sin conexión', 'Reconectando con el servidor deportivo...');
      return;
    }

    if (isSearching) {
      socket.emit('cancelQueue', { userId: user.id });
      setIsSearching(false);
      setSearchSeconds(0);
    } else {
      socket.emit('startQueue', {
        userId: user.id,
        sportId: selectedSport,
        formatId: selectedFormat,
        mode: 'solo',
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm,
        district: user.district || 'Surco, Lima'
      });
      setIsSearching(true);
      setSearchSeconds(0);
    }
  };

  const currentSportObj = SPORTS.find((s) => s.id === selectedSport) || SPORTS[0];

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.2]
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0]
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header superior */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>HOLA, {user?.name?.toUpperCase() || 'JUGADOR'}</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{onlineCount} deportistas en línea</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.cardToggleBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFutCard(!showFutCard);
            }}
          >
            <Text style={styles.cardToggleBtnText}>{showFutCard ? 'RADAR' : 'MI CARTA'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onLogout();
            }}
          >
            <Text style={styles.logoutBtnText}>SALIR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vista de Carta FUT o Radar */}
      {showFutCard ? (
        <View style={styles.futCardWrapper}>
          <FutCard user={user} />
          <TouchableOpacity
            style={styles.returnRadarBtn}
            onPress={() => setShowFutCard(false)}
          >
            <Text style={styles.returnRadarBtnText}>← VOLVER AL RADAR DE PARTIDOS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Visualizador de Radar Pulsante */}
          <View style={styles.radarVisualContainer}>
            {isSearching && (
              <Animated.View
                style={[
                  styles.radarPulseRing,
                  {
                    transform: [{ scale: pulseScale }],
                    opacity: pulseOpacity
                  }
                ]}
              />
            )}
            <View style={[styles.radarCenterCircle, isSearching && styles.radarCenterActive]}>
              <Text style={styles.radarIcon}>{isSearching ? '📡' : '⚽'}</Text>
              <Text style={styles.radarStatusText}>
                {isSearching ? `ESCANEANDO...\n${searchSeconds}s` : 'RADAR LISTO'}
              </Text>
            </View>
          </View>

          {/* Selector de Deporte */}
          <Text style={styles.sectionLabel}>DEPORTE</Text>
          <View style={styles.pillsRow}>
            {SPORTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.pill, selectedSport === s.id && styles.pillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedSport(s.id);
                  setSelectedFormat(s.formats[0].id);
                }}
                disabled={isSearching}
              >
                <Text style={[styles.pillText, selectedSport === s.id && styles.pillTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selector de Modalidad */}
          <Text style={styles.sectionLabel}>MODALIDAD DE JUEGO</Text>
          <View style={styles.pillsRow}>
            {currentSportObj.formats.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.pill, selectedFormat === f.id && styles.pillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFormat(f.id);
                }}
                disabled={isSearching}
              >
                <Text style={[styles.pillText, selectedFormat === f.id && styles.pillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Radio de Búsqueda Geoespacial */}
          <Text style={styles.sectionLabel}>RADIO MÁXIMO DE CANCHA (KM)</Text>
          <View style={styles.pillsRow}>
            {RADII.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.pill, radiusKm === r && styles.pillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRadiusKm(r);
                }}
                disabled={isSearching}
              >
                <Text style={[styles.pillText, radiusKm === r && styles.pillTextActive]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Botón Principal de Matchmaking */}
          <TouchableOpacity
            style={[styles.radarActionBtn, isSearching ? styles.radarCancelBtn : styles.radarStartBtn]}
            onPress={toggleRadarSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.radarActionBtnText}>
              {isSearching ? 'CANCELAR RADAR' : 'ACTIVAR RADAR DE PARTIDO'}
            </Text>
          </TouchableOpacity>

          {/* Info de Ubicación */}
          <View style={styles.locationFooter}>
            <Text style={styles.locationFooterText}>
              📍 Buscando en {user?.district || 'Lima'} (Radio: {radiusKm} km)
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  contentContainer: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  greeting: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6
  },
  onlineText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardToggleBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8
  },
  cardToggleBtnText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800'
  },
  logoutBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  logoutBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700'
  },
  futCardWrapper: {
    alignItems: 'center',
    marginVertical: 10
  },
  returnRadarBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981'
  },
  returnRadarBtnText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 13
  },
  radarVisualContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10
  },
  radarPulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#10b981'
  },
  radarCenterCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    borderWidth: 3,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6
  },
  radarCenterActive: {
    borderColor: '#10b981',
    backgroundColor: '#0f172a'
  },
  radarIcon: {
    fontSize: 34
  },
  radarStatusText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4
  },
  sectionLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pill: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  pillActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  pillText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700'
  },
  pillTextActive: {
    color: '#10b981',
    fontWeight: '900'
  },
  radarActionBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  radarStartBtn: {
    backgroundColor: '#10b981'
  },
  radarCancelBtn: {
    backgroundColor: '#ef4444'
  },
  radarActionBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1
  },
  locationFooter: {
    alignItems: 'center',
    marginTop: 14
  },
  locationFooterText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  }
});
