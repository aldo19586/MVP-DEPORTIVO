import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { THEME } from '../theme';

const RADIUS_PRESETS = [
  { km: 3, label: '3 km' },
  { km: 8, label: '8 km (Recomendado)' },
  { km: 15, label: '15 km' },
  { km: 25, label: '25 km Max' }
];

const ELO_MODES = [
  {
    id: 'balanced',
    title: 'Solo mi nivel (Equilibrado)',
    tag: 'Activo',
    delta: 50,
    desc: '±50 ELO · Partidos sumamente reñidos y parejos con mínima brecha táctica.'
  },
  {
    id: 'hardcore',
    title: 'Competitivo Estricto (Hardcore)',
    tag: '+100 ELO máx',
    delta: 100,
    desc: 'Solo rivales de igual o mayor ELO. Máxima exigencia deportiva y ritmo intenso.'
  },
  {
    id: 'fast',
    title: 'Cualquier Nivel (Rápido)',
    tag: '<2 min cola',
    delta: 350,
    desc: 'Sin restricción de ranking federado. Prioridad absoluta en encontrar partido veloz.'
  }
];

const SPORT_FORMAT_OPTIONS = [
  { id: '7v7', title: 'Fútbol 7', sub: 'Pasto Sintético', icon: '⚽' },
  { id: '5v5', title: 'Fútbol 5', sub: 'Pichanga Rápida', icon: '⚽' },
  { id: '6v6', title: 'Fútbol 6', sub: 'Sintético Lima', icon: '⚽' },
  { id: '11v11', title: 'Fútbol 11', sub: 'Reglamentario', icon: '🏟️' },
  { id: '8v8', title: 'Fútbol 8', sub: 'Cancha Amplia', icon: '⚽' },
  { id: '9v9', title: 'Fútbol 9', sub: 'Táctico Intermedio', icon: '⚽' }
];

const SURFACES = [
  'Sintético Pro 60mm',
  'Césped Natural',
  'Losa Pulida'
];

export default function CalibrationScreen({
  user,
  currentRadius = 8,
  currentDistrict = 'SURCO, LIMA',
  onSavePreferences,
  onBack
}) {
  const [radiusKm, setRadiusKm] = useState(currentRadius || 8);
  const [eloMode, setEloMode] = useState('balanced');
  const [enabledFormats, setEnabledFormats] = useState(['7v7', '5v5', '6v6', '11v11']);
  const [preferredSurface, setPreferredSurface] = useState('Sintético Pro 60mm');
  const [fairPlayStrict, setFairPlayStrict] = useState(true);
  const [verifiedCaptainsOnly, setVerifiedCaptainsOnly] = useState(true);
  const [hapticAlerts, setHapticAlerts] = useState(true);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [liveVenuesCount, setLiveVenuesCount] = useState(0);

  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentRating = Math.round(user?.ratingOverall || 1500);
  const matchesPlayed = user?.matchesPlayed || 0;
  const isCalibrated = matchesPlayed >= 3;
  const tierName = currentRating >= 1650 ? 'Élite I' : currentRating >= 1450 ? 'Oro III' : currentRating >= 1300 ? 'Plata II' : 'Bronce I';

  useEffect(() => {
    // Cargar preferencias guardadas y convocatorias reales
    storage.getRadarPreferences().then((prefs) => {
      if (prefs) {
        if (prefs.radiusKm) setRadiusKm(prefs.radiusKm);
        if (prefs.eloMode) setEloMode(prefs.eloMode);
        if (Array.isArray(prefs.enabledFormats) && prefs.enabledFormats.length > 0) {
          setEnabledFormats(prefs.enabledFormats);
        }
        if (prefs.preferredSurface) setPreferredSurface(prefs.preferredSurface);
        if (typeof prefs.fairPlayStrict === 'boolean') setFairPlayStrict(prefs.fairPlayStrict);
        if (typeof prefs.verifiedCaptainsOnly === 'boolean') setVerifiedCaptainsOnly(prefs.verifiedCaptainsOnly);
        if (typeof prefs.hapticAlerts === 'boolean') setHapticAlerts(prefs.hapticAlerts);
      }
    }).catch(() => {});

    api.competitions().then((res) => {
      const list = Array.isArray(res?.competitions) ? res.competitions : [];
      setLiveVenuesCount(list.length);
    }).catch(() => {});

    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const spin = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handleSelectRadius = (val) => {
    try { Haptics.selectionAsync(); } catch (e) {}
    setRadiusKm(val);
  };

  const handleStepRadius = (delta) => {
    try { Haptics.selectionAsync(); } catch (e) {}
    setRadiusKm((prev) => Math.min(25, Math.max(1, prev + delta)));
  };

  const handleToggleFormat = (formatId) => {
    try { Haptics.selectionAsync(); } catch (e) {}
    setEnabledFormats((prev) => {
      if (prev.includes(formatId)) {
        if (prev.length <= 1) return prev; // Al menos 1 formato activo
        return prev.filter((id) => id !== formatId);
      }
      return [...prev, formatId];
    });
  };

  const handleResetDefaults = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    setRadiusKm(8);
    setEloMode('balanced');
    setEnabledFormats(['7v7', '5v5', '6v6', '11v11']);
    setPreferredSurface('Sintético Pro 60mm');
    setFairPlayStrict(true);
    setVerifiedCaptainsOnly(true);
    setHapticAlerts(true);
  };

  const handleSave = async () => {
    try {
      if (hapticAlerts) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {}

    const prefs = {
      radiusKm,
      eloMode,
      enabledFormats,
      preferredSurface,
      fairPlayStrict,
      verifiedCaptainsOnly,
      hapticAlerts,
      updatedAt: new Date().toISOString()
    };

    await storage.saveRadarPreferences(prefs);
    if (onSavePreferences) {
      onSavePreferences(prefs);
    }
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      if (onBack) onBack();
    }, 550);
  };

  const getEloRangeLabel = () => {
    if (eloMode === 'balanced') {
      return `${currentRating - 50} — ${currentRating + 50} ELO (±50)`;
    }
    if (eloMode === 'hardcore') {
      return `${currentRating} — ${currentRating + 100} ELO (Exigente)`;
    }
    return 'Cualquier ELO (Cola Express)';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Volver al radar"
        >
          <Text style={styles.backBtnIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>CALIBRACIÓN DE RADAR</Text>
          <Text style={styles.headerSubtitle}>Algoritmo Glicko-2 & Parámetros Tácticos</Text>
        </View>

        <TouchableOpacity
          style={styles.resetHeaderBtn}
          onPress={handleResetDefaults}
          activeOpacity={0.75}
        >
          <Text style={styles.resetHeaderText}>RESTABLECER</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. STATUS & ALGORITHMIC CONTEXT BAR */}
        <View style={styles.contextSection}>
          <View style={styles.contextTopRow}>
            <View style={styles.activeRadarPill}>
              <View style={styles.activeRadarDot} />
              <Text style={styles.activeRadarPillText}>RADAR INTELIGENTE ACTIVO</Text>
            </View>

            <View style={styles.calibrationProgressBadge}>
              <Text style={styles.calibrationProgressText}>
                {isCalibrated ? '🏆 RATING CALIBRADO' : `🎯 ${matchesPlayed}/3 PJ CALIBRACIÓN`}
              </Text>
            </View>
          </View>

          <Text style={styles.contextDescText}>
            Personaliza el algoritmo de emparejamiento para encontrar canchas, rivales y convocatorias a tu medida exacta en Lima Metropolitana.
          </Text>
        </View>

        {/* 2. INTERACTIVE SEARCH RADIUS HUD */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardHeaderIcon}>🧭</Text>
              <Text style={styles.cardHeaderTitle}>Radio de Búsqueda</Text>
            </View>
            <Text style={styles.radiusValueDisplay}>{radiusKm} km</Text>
          </View>

          {/* Quick Preset Chips (3 / 8 / 15 / 25 km) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetChipsRow}
          >
            {RADIUS_PRESETS.map((preset) => {
              const isSelected = radiusKm === preset.km;
              return (
                <TouchableOpacity
                  key={preset.km}
                  style={[styles.presetChip, isSelected && styles.presetChipActive]}
                  onPress={() => handleSelectRadius(preset.km)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tactical Radar Mini-Map Preview Box */}
          <View style={styles.miniRadarPreviewBox}>
            <Animated.View style={[styles.miniRadarCircle, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.miniRing1} />
              <View style={styles.miniRing2} />
              <View style={styles.miniRing3} />
              <View style={styles.miniRing4} />

              <Animated.View style={[styles.miniSweepCone, { transform: [{ rotate: spin }] }]} />

              {/* Nodos tácticos en cobertura */}
              <View style={[styles.miniBlipDot, { top: 26, right: 38 }]} />
              <View style={[styles.miniBlipDotSecondary, { bottom: 32, left: 34 }]} />
              <View style={[styles.miniBlipDot, { top: 44, left: 38 }]} />
              <View style={[styles.miniBlipDotSecondary, { bottom: 38, right: 30 }]} />

              <View style={styles.miniCenterPing}>
                <View style={styles.miniCenterInner} />
              </View>
            </Animated.View>

            {/* HUD Location Overlay Top-Left */}
            <View style={styles.miniHudTopLeft}>
              <Text style={styles.miniHudTopLeftText}>📍 {currentDistrict}</Text>
            </View>

            {/* HUD Bottom Metrics */}
            <View style={styles.miniHudBottomRow}>
              <View style={styles.miniHudMetricPill}>
                <Text style={styles.miniHudMetricIcon}>🏟️</Text>
                <Text style={styles.miniHudMetricText}>
                  {liveVenuesCount > 0 ? `${liveVenuesCount} salas reales` : `Cobertura ${radiusKm} km`}
                </Text>
              </View>
              <View style={styles.miniHudMetricPill}>
                <Text style={styles.miniHudMetricIcon}>⚡</Text>
                <Text style={styles.miniHudMetricText}>Haversine GPS</Text>
              </View>
            </View>
          </View>

          {/* Control táctico continuo de radio (1 km a 25 km) */}
          <View style={styles.sliderControlBlock}>
            <View style={styles.sliderStepperRow}>
              <TouchableOpacity
                style={styles.sliderStepBtn}
                onPress={() => handleStepRadius(-1)}
                activeOpacity={0.75}
              >
                <Text style={styles.sliderStepBtnText}>−</Text>
              </TouchableOpacity>

              <View style={styles.sliderTrackOuter}>
                <View
                  style={[
                    styles.sliderTrackFill,
                    { width: `${Math.min(100, Math.max(4, (radiusKm / 25) * 100))}%` }
                  ]}
                />
              </View>

              <TouchableOpacity
                style={styles.sliderStepBtn}
                onPress={() => handleStepRadius(1)}
                activeOpacity={0.75}
              >
                <Text style={styles.sliderStepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sliderLegendRow}>
              <Text style={styles.sliderLegendText}>🚶 1 km (A pie)</Text>
              <Text style={styles.sliderLegendText}>🚗 25 km (Metropolitano)</Text>
            </View>
          </View>
        </View>

        {/* 3. SKILL TOLERANCE & ELO (GLICKO-2) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardHeaderIcon}>🎖️</Text>
              <Text style={styles.sectionHeaderTitle}>Tolerancia de Nivel & ELO</Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert(
                'Algoritmo Glicko-2 Oficial',
                'En MatchSport el rating se calcula de forma 100% objetiva según resultados reales, desviación competitiva (RD) y evaluación circular post-partido.'
              )}
            >
              <Text style={styles.infoIconText}>ⓘ</Text>
            </TouchableOpacity>
          </View>

          {/* User Current Rating Badge Card */}
          <View style={styles.userRatingBadgeCard}>
            <View style={styles.userRatingLeft}>
              <View style={styles.shieldBox}>
                <Text style={styles.shieldBoxIcon}>🛡️</Text>
              </View>
              <View>
                <Text style={styles.userRatingLabel}>TU CALIFICACIÓN GLICKO-2</Text>
                <Text style={styles.userRatingValue}>
                  {currentRating} <Text style={styles.userRatingTier}>· {tierName}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.rdBadge}>
              <Text style={styles.rdBadgeText}>
                {isCalibrated ? 'Oficial' : `${matchesPlayed}/3 PJ`}
              </Text>
            </View>
          </View>

          {/* Matchmaking Mode Cards */}
          <View style={styles.eloModesList}>
            {ELO_MODES.map((m) => {
              const isSelected = eloMode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.eloModeCard, isSelected && styles.eloModeCardActive]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setEloMode(m.id);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <Text style={styles.radioCheckText}>✓</Text>}
                  </View>

                  <View style={styles.eloModeContent}>
                    <View style={styles.eloModeTitleRow}>
                      <Text style={styles.eloModeTitle}>{m.title}</Text>
                      <View style={[styles.eloModeTag, isSelected && styles.eloModeTagActive]}>
                        <Text style={[styles.eloModeTagText, isSelected && styles.eloModeTagTextActive]}>
                          {isSelected ? 'Activo' : m.tag}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.eloModeDesc}>{m.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active ELO Permitted Range Pill */}
          <View style={styles.eloWindowBar}>
            <Text style={styles.eloWindowLabel}>⚙️ VENTANA ELO PERMITIDA</Text>
            <Text style={styles.eloWindowValue}>{getEloRangeLabel()}</Text>
          </View>
        </View>

        {/* 4. SPORTS & MATCH FORMATS */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardHeaderIcon}>⚽</Text>
              <Text style={styles.sectionHeaderTitle}>Formatos Habilitados</Text>
            </View>
            <Text style={styles.selectedCountLabel}>{enabledFormats.length} seleccionados</Text>
          </View>

          <View style={styles.formatsGrid}>
            {SPORT_FORMAT_OPTIONS.map((item) => {
              const isEnabled = enabledFormats.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.formatGridBtn, isEnabled && styles.formatGridBtnActive]}
                  onPress={() => handleToggleFormat(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.formatGridLeft}>
                    <View style={[styles.formatIconBox, isEnabled && styles.formatIconBoxActive]}>
                      <Text style={styles.formatIconText}>{item.icon}</Text>
                    </View>
                    <View style={styles.formatTextCol}>
                      <Text style={styles.formatTitleText} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.formatSubText} numberOfLines={1}>{item.sub}</Text>
                    </View>
                  </View>
                  <Text style={[styles.formatCheckIcon, isEnabled && styles.formatCheckIconActive]}>
                    {isEnabled ? '●' : '○'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Superficie Preferida de Cancha */}
          <View style={styles.surfaceCard}>
            <Text style={styles.surfaceTitle}>SUPERFICIE PREFERIDA DE CANCHA</Text>
            <View style={styles.surfaceChipsWrap}>
              {SURFACES.map((surf) => {
                const active = preferredSurface === surf;
                return (
                  <TouchableOpacity
                    key={surf}
                    style={[styles.surfaceChip, active && styles.surfaceChipActive]}
                    onPress={() => {
                      try { Haptics.selectionAsync(); } catch (e) {}
                      setPreferredSurface(surf);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.surfaceChipText, active && styles.surfaceChipTextActive]}>
                      {surf}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 5. FAIR PLAY & OFFICIAL ARBITRATION FILTERS */}
        <View style={styles.sectionBlock}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardHeaderIcon}>🛡️</Text>
            <Text style={styles.sectionHeaderTitle}>Filtros de Fair Play & Arbitraje</Text>
          </View>

          <View style={styles.togglesCard}>
            {/* Toggle 1 */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <View style={styles.toggleTitleRow}>
                  <Text style={styles.toggleTitle}>Exigir Fair Play &gt; 90%</Text>
                  <View style={styles.recMiniTag}>
                    <Text style={styles.recMiniTagText}>Recomendado</Text>
                  </View>
                </View>
                <Text style={styles.toggleDesc}>
                  Filtra y excluye automáticamente cuentas con sanciones activas o abandonos reiterados.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, fairPlayStrict && styles.switchTrackOn]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (e) {}
                  setFairPlayStrict(!fairPlayStrict);
                }}
                activeOpacity={0.8}
                accessibilityRole="switch"
                accessibilityState={{ checked: fairPlayStrict }}
              >
                <View style={[styles.switchThumb, fairPlayStrict && styles.switchThumbOn]} />
              </TouchableOpacity>
            </View>

            {/* Toggle 2 */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <View style={styles.toggleTitleRow}>
                  <Text style={styles.toggleTitle}>Validación Doble de Capitanes</Text>
                  <View style={styles.neutralMiniTag}>
                    <Text style={styles.neutralMiniTagText}>Glicko-2 Oficial</Text>
                  </View>
                </View>
                <Text style={styles.toggleDesc}>
                  Asegura confirmación cruzada de actas, cómputo estricto de goles y arbitraje SuperAdmin.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, verifiedCaptainsOnly && styles.switchTrackOn]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (e) {}
                  setVerifiedCaptainsOnly(!verifiedCaptainsOnly);
                }}
                activeOpacity={0.8}
                accessibilityRole="switch"
                accessibilityState={{ checked: verifiedCaptainsOnly }}
              >
                <View style={[styles.switchThumb, verifiedCaptainsOnly && styles.switchThumbOn]} />
              </TouchableOpacity>
            </View>

            {/* Toggle 3 */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Feedback Háptico & Alerta Sonora</Text>
                <Text style={styles.toggleDesc}>
                  Vibración táctica de alta intensidad durante el prompt de 20s al encontrar rival.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.switchTrack, hapticAlerts && styles.switchTrackOn]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (e) {}
                  setHapticAlerts(!hapticAlerts);
                }}
                activeOpacity={0.8}
                accessibilityRole="switch"
                accessibilityState={{ checked: hapticAlerts }}
              >
                <View style={[styles.switchThumb, hapticAlerts && styles.switchThumbOn]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Confirmation Container */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Guardar preferencias de radar"
        >
          <Text style={styles.saveButtonIcon}>{savedFeedback ? '✓' : '◎'}</Text>
          <Text style={styles.saveButtonText}>
            {savedFeedback ? '¡CALIBRADO CON ÉXITO!' : 'GUARDAR PREFERENCIAS DE RADAR'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerCaption}>
          Los cambios se aplicarán inmediatamente a tu próxima búsqueda de partido.
        </Text>
      </View>
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnIcon: {
    color: THEME.colors.onSurface,
    fontSize: 24,
    fontWeight: '700',
    marginTop: -2,
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: THEME.colors.onSurface,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  headerSubtitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    marginTop: 2,
  },
  resetHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  resetHeaderText: {
    color: THEME.colors.outline,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
    gap: 18,
  },
  contextSection: {
    gap: 8,
  },
  contextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeRadarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 6,
  },
  activeRadarDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.neonPitch,
  },
  activeRadarPillText: {
    color: THEME.colors.neonSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  calibrationProgressBadge: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.28)',
  },
  calibrationProgressText: {
    color: THEME.colors.neonPitch,
    fontSize: 9.5,
    fontWeight: '800',
  },
  contextDescText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderIcon: {
    fontSize: 16,
  },
  cardHeaderTitle: {
    color: THEME.colors.onSurface,
    fontSize: 15,
    fontWeight: '800',
  },
  radiusValueDisplay: {
    color: THEME.colors.neonPitch,
    fontSize: 19,
    fontWeight: '900',
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  presetChipActive: {
    backgroundColor: THEME.colors.neonPitch,
    borderColor: THEME.colors.neonPitch,
  },
  presetChipText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900',
  },
  miniRadarPreviewBox: {
    height: 185,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.16)',
  },
  miniRadarCircle: {
    width: 146,
    height: 146,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniRing1: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.18)',
  },
  miniRing2: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.25)',
  },
  miniRing3: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.38)',
  },
  miniRing4: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.55)',
  },
  miniSweepCone: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderTopWidth: 70,
    borderTopColor: 'rgba(0, 255, 135, 0.16)',
    borderLeftWidth: 70,
    borderLeftColor: 'transparent',
    borderRightWidth: 70,
    borderRightColor: 'transparent',
  },
  miniBlipDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.neonPitch,
  },
  miniBlipDotSecondary: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.neonSecondary,
  },
  miniCenterPing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCenterInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.colors.surfaceLowest,
  },
  miniHudTopLeft: {
    position: 'absolute',
    top: 8,
    left: 10,
    backgroundColor: 'rgba(39, 42, 49, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  miniHudTopLeftText: {
    color: THEME.colors.neonSecondary,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  miniHudBottomRow: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniHudMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    gap: 5,
  },
  miniHudMetricIcon: {
    fontSize: 11,
  },
  miniHudMetricText: {
    color: THEME.colors.onSurface,
    fontSize: 10,
    fontWeight: '700',
  },
  sliderControlBlock: {
    gap: 6,
  },
  sliderStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sliderStepBtnText: {
    color: THEME.colors.neonPitch,
    fontSize: 18,
    fontWeight: '900',
  },
  sliderTrackOuter: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceHigh,
    overflow: 'hidden',
  },
  sliderTrackFill: {
    height: '100%',
    backgroundColor: THEME.colors.neonPitch,
    borderRadius: 4,
  },
  sliderLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLegendText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '600',
  },

  // 3. SKILL TOLERANCE & ELO
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '800',
  },
  infoIconText: {
    color: THEME.colors.outline,
    fontSize: 16,
    fontWeight: '800',
  },
  userRatingBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceContainer,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  userRatingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldBoxIcon: {
    fontSize: 18,
  },
  userRatingLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  userRatingValue: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  userRatingTier: {
    color: THEME.colors.neonSecondary,
    fontWeight: '700',
  },
  rdBadge: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rdBadgeText: {
    color: THEME.colors.onSurface,
    fontSize: 10.5,
    fontWeight: '800',
  },
  eloModesList: {
    gap: 8,
  },
  eloModeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.surfaceLowest,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  eloModeCardActive: {
    backgroundColor: THEME.colors.surfaceLow,
    borderColor: 'rgba(0, 255, 135, 0.35)',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  radioCheckText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 12,
    fontWeight: '900',
  },
  eloModeContent: {
    flex: 1,
    gap: 4,
  },
  eloModeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  eloModeTitle: {
    color: THEME.colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
  },
  eloModeTag: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.pill,
  },
  eloModeTagActive: {
    backgroundColor: 'rgba(0, 255, 135, 0.2)',
  },
  eloModeTagText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9.5,
    fontWeight: '800',
  },
  eloModeTagTextActive: {
    color: THEME.colors.neonPitch,
  },
  eloModeDesc: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  eloWindowBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  eloWindowLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  eloWindowValue: {
    color: THEME.colors.neonPitch,
    fontSize: 13,
    fontWeight: '900',
  },

  // 4. FORMATS GRID & SURFACES
  selectedCountLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
  },
  formatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatGridBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLowest,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.75,
  },
  formatGridBtnActive: {
    backgroundColor: THEME.colors.surfaceLow,
    borderColor: 'rgba(0, 255, 135, 0.35)',
    opacity: 1,
  },
  formatGridLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  formatIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIconBoxActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  formatIconText: {
    fontSize: 15,
  },
  formatTextCol: {
    flex: 1,
  },
  formatTitleText: {
    color: THEME.colors.onSurface,
    fontSize: 13,
    fontWeight: '800',
  },
  formatSubText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
  },
  formatCheckIcon: {
    color: THEME.colors.outline,
    fontSize: 16,
    marginLeft: 4,
  },
  formatCheckIconActive: {
    color: THEME.colors.neonPitch,
  },
  surfaceCard: {
    backgroundColor: THEME.colors.surfaceLowest,
    padding: 14,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  surfaceTitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  surfaceChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  surfaceChip: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  surfaceChipActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  surfaceChipText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    fontWeight: '700',
  },
  surfaceChipTextActive: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900',
  },

  // 5. FAIR PLAY TOGGLES
  togglesCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextCol: {
    flex: 1,
    gap: 3,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  toggleTitle: {
    color: THEME.colors.onSurface,
    fontSize: 13.5,
    fontWeight: '800',
  },
  recMiniTag: {
    backgroundColor: 'rgba(0, 255, 135, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  recMiniTagText: {
    color: THEME.colors.neonPitch,
    fontSize: 9,
    fontWeight: '800',
  },
  neutralMiniTag: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  neutralMiniTagText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9,
    fontWeight: '800',
  },
  toggleDesc: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    lineHeight: 16,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.surfaceHighest,
    padding: 3,
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
  switchThumbOn: {
    backgroundColor: THEME.colors.surfaceLowest,
    alignSelf: 'flex-end',
  },

  // STICKY FOOTER
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(16, 19, 26, 0.96)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    backgroundColor: THEME.colors.neonPitch,
    gap: 8,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonIcon: {
    color: THEME.colors.surfaceLowest,
    fontSize: 17,
    fontWeight: '900',
  },
  saveButtonText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  footerCaption: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    textAlign: 'center',
  },
});
