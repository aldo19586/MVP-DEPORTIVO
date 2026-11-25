import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { THEME } from '../theme';

const FALLBACK_DISTRICTS = [
  { id: 'surco', name: 'SURCO, LIMA', label: 'Santiago de Surco', zone: 'Lima Sur / Este' },
  { id: 'miraflores', name: 'MIRAFLORES, LIMA', label: 'Miraflores, Lima', zone: 'Lima Centro / Costa' },
  { id: 'san_borja', name: 'SAN BORJA, LIMA', label: 'San Borja, Lima', zone: 'Lima Centro' },
  { id: 'san_isidro', name: 'SAN ISIDRO, LIMA', label: 'San Isidro, Lima', zone: 'Lima Centro' },
  { id: 'la_molina', name: 'LA MOLINA, LIMA', label: 'La Molina, Lima', zone: 'Lima Este' },
  { id: 'barranco', name: 'BARRANCO, LIMA', label: 'Barranco, Lima', zone: 'Lima Costa' },
  { id: 'magdalena', name: 'MAGDALENA, LIMA', label: 'Magdalena del Mar', zone: 'Lima Oeste' },
  { id: 'jesus_maria', name: 'JESÚS MARÍA, LIMA', label: 'Jesús María, Lima', zone: 'Lima Centro' },
  { id: 'san_miguel', name: 'SAN MIGUEL, LIMA', label: 'San Miguel, Lima', zone: 'Lima Oeste' },
  { id: 'chorrillos', name: 'CHORRILLOS, LIMA', label: 'Chorrillos, Lima', zone: 'Lima Sur' }
];

const TRAVEL_RADII = [
  { km: 5, label: '5 km', sub: 'En mi barrio' },
  { km: 10, label: '10 km', sub: 'Limítrofes' },
  { km: 20, label: '20 km', sub: 'Toda Lima' }
];

const TRAVEL_MODES = [
  {
    id: 'car',
    icon: '🚗',
    title: 'En auto o taxi',
    sub: 'Llegada estimada en ≤ 15-20 min',
    defaultKm: 10
  },
  {
    id: 'bike',
    icon: '🛴',
    title: 'En bicicleta o scooter',
    sub: 'Rango ecológico ≤ 6 km',
    defaultKm: 5
  },
  {
    id: 'walk',
    icon: '🚶',
    title: 'Caminando a la cancha',
    sub: 'Solo canchas cercanas en tu barrio',
    defaultKm: 5
  }
];

export default function LocationSettingsScreen({
  currentRadius = 8,
  currentDistrict = 'SURCO, LIMA',
  onSave,
  onBack
}) {
  const [gpsRealtimeEnabled, setGpsRealtimeEnabled] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState(null);

  const [mapMode, setMapMode] = useState('tactico'); // 'tactico' | 'satelite'
  const [mapZoom, setMapZoom] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [districtsCatalog, setDistrictsCatalog] = useState(FALLBACK_DISTRICTS);
  const [selectedDistrict, setSelectedDistrict] = useState(currentDistrict || 'SURCO, LIMA');
  const [savedZones, setSavedZones] = useState([
    { id: 'home', label: 'Surco (Casa)', district: 'SURCO, LIMA', icon: '🏠' },
    { id: 'work', label: 'Miraflores (Oficina)', district: 'MIRAFLORES, LIMA', icon: '💼' }
  ]);

  const [radius, setRadius] = useState(currentRadius || 10);
  const [travelMode, setTravelMode] = useState('car');
  const [hideExactLocation, setHideExactLocation] = useState(true);
  const [districtVenueAlerts, setDistrictVenueAlerts] = useState(true);
  const [savingToast, setSavingToast] = useState(false);
  const [activeCompetitionsCount, setActiveCompetitionsCount] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1100, useNativeDriver: true })
      ])
    ).start();

    // Cargar preferencias guardadas
    storage.getLocationPreferences().then((prefs) => {
      if (prefs) {
        if (typeof prefs.gpsRealtimeEnabled === 'boolean') setGpsRealtimeEnabled(prefs.gpsRealtimeEnabled);
        if (prefs.travelMode) setTravelMode(prefs.travelMode);
        if (Array.isArray(prefs.savedZones) && prefs.savedZones.length > 0) setSavedZones(prefs.savedZones);
        if (typeof prefs.hideExactLocation === 'boolean') setHideExactLocation(prefs.hideExactLocation);
        if (typeof prefs.districtVenueAlerts === 'boolean') setDistrictVenueAlerts(prefs.districtVenueAlerts);
      }
    }).catch(() => {});

    // Consultar convocatorias reales del servidor
    api.competitions().then((res) => {
      const list = Array.isArray(res?.competitions) ? res.competitions : [];
      setActiveCompetitionsCount(list.length);
    }).catch(() => {});
  }, []);

  // Búsqueda con autocompletado real contra GET /api/districts
  useEffect(() => {
    let active = true;
    api.getDistricts(searchQuery).then((res) => {
      if (!active) return;
      if (Array.isArray(res?.districts) && res.districts.length > 0) {
        const normalized = res.districts.map((d, idx) => {
          if (typeof d === 'string') {
            const upper = d.toUpperCase().includes('LIMA') ? d.toUpperCase() : `${d.toUpperCase()}, LIMA`;
            return {
              id: `dist_${idx}_${d}`,
              name: upper,
              label: d,
              zone: 'Lima Metropolitana'
            };
          }
          const rawName = d.name || d.district || d.label || 'Surco';
          const upper = rawName.toUpperCase().includes('LIMA') ? rawName.toUpperCase() : `${rawName.toUpperCase()}, LIMA`;
          return {
            id: d.id || `dist_${idx}`,
            name: upper,
            label: rawName,
            zone: d.zone || d.region || 'Lima Metropolitana'
          };
        });
        setDistrictsCatalog(normalized);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [searchQuery]);

  const handleRecalibrateGPS = async () => {
    setGpsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setGpsRealtimeEnabled(true);
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          setGpsCoords({
            lat: Number(loc.coords.latitude).toFixed(4),
            lng: Number(loc.coords.longitude).toFixed(4)
          });
          setGpsAccuracyMeters(Math.max(4, Math.round(loc.coords.accuracy || 6)));
        }
      } else {
        setGpsRealtimeEnabled(false);
        Alert.alert('Permiso GPS Denegado', 'Selecciona tu distrito manualmente en el buscador táctico.');
      }
    } catch (e) {
      Alert.alert('Aviso GPS', 'No se pudo obtener lectura satelital inmediata. Se mantiene tu distrito activo.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAddCurrentZone = () => {
    try { Haptics.selectionAsync(); } catch (e) {}
    const shortName = selectedDistrict.split(',')[0].trim();
    const exists = savedZones.some((z) => z.district.toUpperCase() === selectedDistrict.toUpperCase());
    if (exists) return;
    setSavedZones((prev) => [
      ...prev,
      {
        id: `zone_${Date.now()}`,
        label: `${shortName} (Cancha)`,
        district: selectedDistrict,
        icon: '⚽'
      }
    ]);
  };

  const handleRemoveSavedZone = (zoneId) => {
    try { Haptics.selectionAsync(); } catch (e) {}
    setSavedZones((prev) => prev.filter((z) => z.id !== zoneId));
  };

  const handleSaveAndApply = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    setSavingToast(true);
    await storage.saveLocationPreferences({
      gpsRealtimeEnabled,
      travelMode,
      savedZones,
      hideExactLocation,
      districtVenueAlerts,
      radiusKm: radius,
      district: selectedDistrict
    });

    if (onSave) {
      onSave({ radiusKm: radius, district: selectedDistrict });
    }

    setTimeout(() => {
      setSavingToast(false);
      if (onBack) onBack();
    }, 450);
  };

  const filteredDistricts = districtsCatalog.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return d.name.toLowerCase().includes(q) || d.label.toLowerCase().includes(q);
  }).slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerKicker}>CONFIGURACIÓN</Text>
            <Text style={styles.headerTitle}>UBICACIÓN & GPS</Text>
          </View>
        </View>

        <View style={styles.versionBadge}>
          <Text style={styles.versionBadgeText}>v2.4 LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Breadcrumb / Tactical Subhead */}
        <View style={styles.breadcrumbRow}>
          <View style={styles.breadcrumbLeft}>
            <View style={styles.neonDot} />
            <Text style={styles.breadcrumbText}>TELEMETRY & GEO-RADAR</Text>
          </View>
          <Text style={styles.coordsSmallText}>
            {gpsCoords ? `${gpsCoords.lat}, ${gpsCoords.lng}` : 'Lima, PE'}
          </Text>
        </View>

        {/* SECTION 1: GPS REALTIME TACTICAL SWITCH CARD */}
        <View style={styles.sectionCard}>
          <View style={styles.gpsHeaderRow}>
            <View style={styles.gpsTitleLeft}>
              <View style={styles.gpsIconBox}>
                <Text style={styles.gpsIconText}>🛰️</Text>
              </View>
              <View style={styles.gpsTextCol}>
                <Text style={styles.cardMainTitle}>GPS en Tiempo Real</Text>
                <Text style={styles.cardSubtitle}>
                  Emparejamiento automatizado con rivales y canchas a menos de 15 min.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.switchTrack, gpsRealtimeEnabled && styles.switchTrackOn]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setGpsRealtimeEnabled(!gpsRealtimeEnabled);
              }}
              activeOpacity={0.8}
              accessibilityRole="switch"
              accessibilityState={{ checked: gpsRealtimeEnabled }}
            >
              <View style={[styles.switchThumb, gpsRealtimeEnabled && styles.switchThumbOn]} />
            </TouchableOpacity>
          </View>

          <View style={styles.gpsPrecisionHudBar}>
            <View style={styles.gpsPrecisionLeft}>
              <View style={[styles.precisionDot, !gpsRealtimeEnabled && styles.precisionDotOff]} />
              <Text style={styles.precisionText}>
                {gpsRealtimeEnabled
                  ? `GPS Alta Precisión (${gpsAccuracyMeters ? `±${gpsAccuracyMeters}m` : 'activo'})`
                  : 'Modo de Distrito Manual'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.recalibrateBtn}
              onPress={handleRecalibrateGPS}
              disabled={gpsLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.recalibrateIcon}>◎</Text>
              <Text style={styles.recalibrateText}>
                {gpsLoading ? 'Calibrando...' : 'Recalibrar Posición'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 2: VECTOR TACTICAL MAP VIEW WITH RADAR PIN */}
        <View style={styles.mapCard}>
          <View style={[
            styles.mapCanvas,
            mapMode === 'satelite' && styles.mapCanvasSatellite
          ]}>
            {/* Grilla vectorial táctica nativa */}
            <View style={styles.gridLineH1} />
            <View style={styles.gridLineH2} />
            <View style={styles.gridLineH3} />
            <View style={styles.gridLineV1} />
            <View style={styles.gridLineV2} />
            <View style={styles.gridLineV3} />

            {/* Marcas de agua de distritos de Lima */}
            <Text style={[styles.mapWatermark, { top: 44, left: 16 }]}>MIRAFLORES</Text>
            <Text style={[styles.mapWatermark, { top: 48, right: 24 }]}>SAN BORJA</Text>
            <Text style={[styles.mapWatermark, { bottom: 26, left: 20 }]}>SAN ISIDRO</Text>
            <Text style={[styles.mapWatermarkActive, { bottom: 42, right: 22 }]}>
              {selectedDistrict.split(',')[0]} (ACTIVA)
            </Text>

            {/* Controles superiores flotantes */}
            <View style={styles.mapFloatingTopRow}>
              <View style={styles.activeVenuesFloatingPill}>
                <View style={styles.neonDot} />
                <Text style={styles.activeVenuesFloatingText}>
                  {activeCompetitionsCount > 0 ? `${activeCompetitionsCount} Salas Activas` : `Radio ${radius} km`}
                </Text>
              </View>

              <View style={styles.mapModeSwitchBox}>
                <TouchableOpacity
                  style={[styles.mapModeBtn, mapMode === 'tactico' && styles.mapModeBtnActive]}
                  onPress={() => setMapMode('tactico')}
                >
                  <Text style={[styles.mapModeBtnText, mapMode === 'tactico' && styles.mapModeBtnTextActive]}>
                    Táctico
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapModeBtn, mapMode === 'satelite' && styles.mapModeBtnActive]}
                  onPress={() => setMapMode('satelite')}
                >
                  <Text style={[styles.mapModeBtnText, mapMode === 'satelite' && styles.mapModeBtnTextActive]}>
                    Satélite
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pin Central con Ondas Pulsantes */}
            <View style={styles.mapCenterPinContainer}>
              <Animated.View style={[
                styles.mapPinWaveOuter,
                { transform: [{ scale: pulseAnim }, { scale: mapZoom }] }
              ]} />
              <View style={styles.mapPinWaveMid} />
              <View style={styles.mapPinCore}>
                <View style={styles.mapPinInnerDot} />
              </View>

              <View style={styles.mapTooltipPill}>
                <Text style={styles.mapTooltipIcon}>⚽</Text>
                <Text style={styles.mapTooltipText}>
                  Base: {selectedDistrict} ({radius} km)
                </Text>
              </View>
            </View>

            {/* Controles de Zoom Flotantes */}
            <View style={styles.mapZoomCol}>
              <TouchableOpacity
                style={styles.mapZoomBtn}
                onPress={() => setMapZoom((z) => Math.min(1.4, Number((z + 0.15).toFixed(2))))}
              >
                <Text style={styles.mapZoomBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapZoomBtn}
                onPress={() => setMapZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
              >
                <Text style={styles.mapZoomBtnText}>−</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 3: DISTRICT SEARCH BAR WITH LIVE AUTOCOMPLETE */}
        <View style={styles.sectionCard}>
          <View style={styles.districtHeaderRow}>
            <Text style={styles.cardMainTitle}>Distrito o Zona Habitual</Text>
            <Text style={styles.limaRegionTag}>Lima Metropolitana</Text>
          </View>

          <View style={styles.searchInputBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar distrito o zona (ej. Surco, Miraflores)..."
              placeholderTextColor={THEME.colors.outline}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de Resultados de Autocompletado */}
          <View style={styles.autocompleteList}>
            {filteredDistricts.map((item) => {
              const isSelected = selectedDistrict.toUpperCase() === item.name.toUpperCase();
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.autocompleteItem, isSelected && styles.autocompleteItemSelected]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setSelectedDistrict(item.name);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.autocompleteLeft}>
                    <View style={[styles.locCircle, isSelected && styles.locCircleSelected]}>
                      <Text style={styles.locCircleIcon}>{isSelected ? '📍' : '◎'}</Text>
                    </View>
                    <View style={styles.autocompleteTextCol}>
                      <Text style={[styles.autocompleteTitle, isSelected && styles.autocompleteTitleSelected]}>
                        {item.label}
                      </Text>
                      <Text style={styles.autocompleteSub}>
                        {isSelected ? 'Base Principal Activa' : item.zone}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.autocompleteRightTag, isSelected && styles.autocompleteRightTagSelected]}>
                    {isSelected ? '✓' : 'Elegir'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Zonas Frecuentes Guardadas */}
          <View style={styles.savedZonesBlock}>
            <Text style={styles.savedZonesHeading}>ZONAS FRECUENTES GUARDADAS</Text>
            <View style={styles.savedZonesRow}>
              {savedZones.map((zone) => {
                const isZoneActive = selectedDistrict.toUpperCase() === zone.district.toUpperCase();
                return (
                  <View
                    key={zone.id}
                    style={[styles.savedZonePill, isZoneActive && styles.savedZonePillActive]}
                  >
                    <TouchableOpacity
                      style={styles.savedZoneSelectArea}
                      onPress={() => {
                        try { Haptics.selectionAsync(); } catch (e) {}
                        setSelectedDistrict(zone.district);
                      }}
                    >
                      <Text style={styles.savedZoneIcon}>{zone.icon}</Text>
                      <Text style={styles.savedZoneText}>{zone.label}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveSavedZone(zone.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.savedZoneRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.addZonePill}
                onPress={handleAddCurrentZone}
                activeOpacity={0.8}
              >
                <Text style={styles.addZoneText}>+ Añadir Zona</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 4: PITCH RANGE & TRAVEL MODE SETTINGS */}
        <View style={styles.sectionCard}>
          <View style={styles.districtHeaderRow}>
            <Text style={styles.cardMainTitle}>Radio Máximo de Traslado</Text>
            <Text style={styles.activeRadiusBadge}>{radius} km Activo</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Define la distancia máxima para sugerir partidos y convocatorias abiertas.
          </Text>

          <View style={styles.distanceCardsRow}>
            {TRAVEL_RADII.map((item) => {
              const isSelected = radius === item.km;
              return (
                <TouchableOpacity
                  key={item.km}
                  style={[styles.distanceCard, isSelected && styles.distanceCardActive]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setRadius(item.km);
                  }}
                  activeOpacity={0.85}
                >
                  {isSelected && <View style={styles.distanceCardTopLine} />}
                  <Text style={[styles.distanceCardKm, isSelected && styles.distanceCardKmActive]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.distanceCardSub, isSelected && styles.distanceCardSubActive]}>
                    {item.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preferencia de Desplazamiento */}
          <View style={styles.travelModesBlock}>
            <Text style={styles.savedZonesHeading}>PREFERENCIA DE DESPLAZAMIENTO</Text>
            <View style={styles.travelModesList}>
              {TRAVEL_MODES.map((m) => {
                const isSelected = travelMode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.travelModeItem, isSelected && styles.travelModeItemActive]}
                    onPress={() => {
                      try { Haptics.selectionAsync(); } catch (e) {}
                      setTravelMode(m.id);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.travelModeLeft}>
                      <Text style={styles.travelModeIcon}>{m.icon}</Text>
                      <View>
                        <Text style={styles.travelModeTitle}>{m.title}</Text>
                        <Text style={styles.travelModeSub}>{m.sub}</Text>
                      </View>
                    </View>
                    <View style={[styles.travelRadio, isSelected && styles.travelRadioActive]}>
                      {isSelected && <Text style={styles.travelRadioCheck}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* SECTION 5: PRIVACY & TACTICAL MATCH ALERT TOGGLES */}
        <View style={styles.sectionCard}>
          <View style={styles.privacyHeaderRow}>
            <Text style={styles.privacyIcon}>🛡️</Text>
            <Text style={styles.cardMainTitle}>Privacidad & Notificaciones</Text>
          </View>

          <View style={styles.privacyToggleBox}>
            <View style={styles.privacyTextCol}>
              <Text style={styles.privacyToggleTitle}>Ocultar ubicación exacta a rivales</Text>
              <Text style={styles.privacyToggleSub}>
                Muestra solo el distrito hasta que la convocatoria confirme los equipos del partido.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.switchTrackSmall, hideExactLocation && styles.switchTrackOn]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setHideExactLocation(!hideExactLocation);
              }}
              accessibilityRole="switch"
              accessibilityState={{ checked: hideExactLocation }}
            >
              <View style={[styles.switchThumbSmall, hideExactLocation && styles.switchThumbOn]} />
            </TouchableOpacity>
          </View>

          <View style={styles.privacyToggleBox}>
            <View style={styles.privacyTextCol}>
              <Text style={styles.privacyToggleTitle}>Alertas de convocatoria en mi zona</Text>
              <Text style={styles.privacyToggleSub}>
                Notificar si falta 1 suplente de emergencia en {selectedDistrict.split(',')[0]}.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.switchTrackSmall, districtVenueAlerts && styles.switchTrackOn]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch (e) {}
                setDistrictVenueAlerts(!districtVenueAlerts);
              }}
              accessibilityRole="switch"
              accessibilityState={{ checked: districtVenueAlerts }}
            >
              <View style={[styles.switchThumbSmall, districtVenueAlerts && styles.switchThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 6: ACTION PANEL */}
        <View style={styles.bottomActionSection}>
          <TouchableOpacity
            style={styles.savePrimaryBtn}
            onPress={handleSaveAndApply}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Guardar ubicación y preferencias"
          >
            <Text style={styles.savePrimaryIcon}>{savingToast ? '✓' : '💾'}</Text>
            <Text style={styles.savePrimaryText}>
              {savingToast ? '¡PREFERENCIAS ACTUALIZADAS!' : 'GUARDAR UBICACIÓN & PREFERENCIAS'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.bottomActionNote}>
            Los cambios actualizarán en tiempo real los cupos y rivales sugeridos en tu Radar de Juego.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgSurface,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: THEME.colors.onSurface,
    fontSize: 18,
    fontWeight: '900',
  },
  headerKicker: {
    color: THEME.colors.neonPitch,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: THEME.colors.onSurface,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  versionBadge: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  versionBadgeText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 14,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breadcrumbLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  neonDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.neonPitch,
  },
  breadcrumbText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  coordsSmallText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
  },

  // CARDS
  sectionCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 15,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  gpsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  gpsTitleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  gpsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIconText: {
    fontSize: 19,
  },
  gpsTextCol: {
    flex: 1,
  },
  cardMainTitle: {
    color: THEME.colors.onSurface,
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.surfaceHighest,
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackSmall: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.surfaceHighest,
    padding: 2.5,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: THEME.colors.neonPitch,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.onSurfaceVariant,
    alignSelf: 'flex-start',
  },
  switchThumbSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.onSurfaceVariant,
    alignSelf: 'flex-start',
  },
  switchThumbOn: {
    backgroundColor: THEME.colors.surfaceLowest,
    alignSelf: 'flex-end',
  },
  gpsPrecisionHudBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceContainer,
    padding: 10,
    borderRadius: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  gpsPrecisionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  precisionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.neonPitch,
  },
  precisionDotOff: {
    backgroundColor: THEME.colors.gold,
  },
  precisionText: {
    color: '#F1FFEF',
    fontSize: 11,
    fontWeight: '700',
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHighest,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  recalibrateIcon: {
    color: THEME.colors.neonPitch,
    fontSize: 13,
    fontWeight: '900',
  },
  recalibrateText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '800',
  },

  // SECTION 2: TACTICAL MAP
  mapCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.18)',
  },
  mapCanvas: {
    height: 220,
    backgroundColor: THEME.colors.surfaceLowest,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapCanvasSatellite: {
    backgroundColor: '#0D1914',
  },
  gridLineH1: { position: 'absolute', top: '25%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(59, 75, 61, 0.25)' },
  gridLineH2: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(59, 75, 61, 0.35)' },
  gridLineH3: { position: 'absolute', top: '75%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(59, 75, 61, 0.25)' },
  gridLineV1: { position: 'absolute', left: '25%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(59, 75, 61, 0.25)' },
  gridLineV2: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(59, 75, 61, 0.35)' },
  gridLineV3: { position: 'absolute', left: '75%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(59, 75, 61, 0.25)' },
  mapWatermark: {
    position: 'absolute',
    color: 'rgba(132, 149, 133, 0.45)',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  mapWatermarkActive: {
    position: 'absolute',
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  mapFloatingTopRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  activeVenuesFloatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 28, 34, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 6,
  },
  activeVenuesFloatingText: {
    color: THEME.colors.onSurface,
    fontSize: 10.5,
    fontWeight: '800',
  },
  mapModeSwitchBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(39, 42, 49, 0.92)',
    borderRadius: 6,
    padding: 2,
  },
  mapModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mapModeBtnActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  mapModeBtnText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
  },
  mapModeBtnTextActive: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900',
  },
  mapCenterPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinWaveOuter: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)',
  },
  mapPinWaveMid: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 255, 135, 0.22)',
  },
  mapPinCore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.neonPitch,
  },
  mapPinInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.neonPitch,
  },
  mapTooltipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 42, 49, 0.96)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mapTooltipIcon: {
    fontSize: 11,
  },
  mapTooltipText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '700',
  },
  mapZoomCol: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 5,
  },
  mapZoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(39, 42, 49, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mapZoomBtnText: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '900',
  },

  // SECTION 3: DISTRICT SEARCH
  districtHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limaRegionTag: {
    color: THEME.colors.neonPitch,
    fontSize: 10.5,
    fontWeight: '800',
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.onSurface,
    fontSize: 13.5,
    fontWeight: '600',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '900',
  },
  autocompleteList: {
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  autocompleteItemSelected: {
    backgroundColor: 'rgba(39, 42, 49, 0.85)',
  },
  autocompleteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  locCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locCircleSelected: {
    backgroundColor: 'rgba(0, 255, 135, 0.2)',
  },
  locCircleIcon: {
    fontSize: 12,
  },
  autocompleteTextCol: {
    flex: 1,
  },
  autocompleteTitle: {
    color: THEME.colors.onSurface,
    fontSize: 13.5,
    fontWeight: '700',
  },
  autocompleteTitleSelected: {
    color: THEME.colors.neonPitch,
    fontWeight: '800',
  },
  autocompleteSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  autocompleteRightTag: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
  },
  autocompleteRightTagSelected: {
    color: THEME.colors.neonPitch,
    fontSize: 15,
    fontWeight: '900',
  },
  savedZonesBlock: {
    gap: 8,
    paddingTop: 2,
  },
  savedZonesHeading: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  savedZonesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savedZonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  savedZonePillActive: {
    borderColor: THEME.colors.neonPitch,
    backgroundColor: 'rgba(0, 255, 135, 0.14)',
  },
  savedZoneSelectArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  savedZoneIcon: {
    fontSize: 12,
  },
  savedZoneText: {
    color: THEME.colors.onSurface,
    fontSize: 11.5,
    fontWeight: '700',
  },
  savedZoneRemove: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 2,
  },
  addZonePill: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)',
  },
  addZoneText: {
    color: THEME.colors.neonPitch,
    fontSize: 11.5,
    fontWeight: '800',
  },

  // SECTION 4: RANGE & TRAVEL MODE
  activeRadiusBadge: {
    color: THEME.colors.neonPitch,
    fontSize: 11.5,
    fontWeight: '900',
  },
  distanceCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  distanceCard: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  distanceCardActive: {
    backgroundColor: THEME.colors.surfaceHighest,
    borderColor: 'rgba(0, 255, 135, 0.35)',
  },
  distanceCardTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: THEME.colors.neonPitch,
  },
  distanceCardKm: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '900',
  },
  distanceCardKmActive: {
    color: THEME.colors.neonPitch,
  },
  distanceCardSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  distanceCardSubActive: {
    color: THEME.colors.onSurface,
    fontWeight: '700',
  },
  travelModesBlock: {
    gap: 8,
    paddingTop: 4,
  },
  travelModesList: {
    gap: 8,
  },
  travelModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLowest,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  travelModeItemActive: {
    backgroundColor: THEME.colors.surfaceContainer,
    borderColor: 'rgba(0, 255, 135, 0.3)',
  },
  travelModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  travelModeIcon: {
    fontSize: 18,
  },
  travelModeTitle: {
    color: THEME.colors.onSurface,
    fontSize: 13.5,
    fontWeight: '700',
  },
  travelModeSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  travelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelRadioActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  travelRadioCheck: {
    color: THEME.colors.surfaceLowest,
    fontSize: 11,
    fontWeight: '900',
  },

  // SECTION 5: PRIVACY
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyIcon: {
    fontSize: 16,
  },
  privacyToggleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceContainer,
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  privacyTextCol: {
    flex: 1,
    gap: 2,
  },
  privacyToggleTitle: {
    color: THEME.colors.onSurface,
    fontSize: 13.5,
    fontWeight: '700',
  },
  privacyToggleSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    lineHeight: 16,
  },

  // SECTION 6: BOTTOM ACTION
  bottomActionSection: {
    paddingTop: 4,
    gap: 8,
  },
  savePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 10,
    backgroundColor: THEME.colors.neonPitch,
    gap: 8,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  savePrimaryIcon: {
    color: THEME.colors.surfaceLowest,
    fontSize: 16,
    fontWeight: '900',
  },
  savePrimaryText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  bottomActionNote: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 15,
  },
});
