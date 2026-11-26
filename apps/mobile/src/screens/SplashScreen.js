import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

const BOOT_STEPS = [
  { progress: 28, text: 'Iniciando sistema...', delay: 200 },
  { progress: 56, text: 'Conectando con liga...', delay: 550 },
  { progress: 82, text: 'Sincronizando fixtures...', delay: 950 },
  { progress: 100, text: '¡Listo para jugar!', delay: 1350 },
];

const ACTIVE_HOTSPOT_INFO = {
  head: {
    label: 'TEST FÍSICO',
    title: 'IQ Táctico 94',
    subLabel: 'Ritmo Pro',
    metric: '182 BPM',
  },
  heart: {
    label: 'CARDIO & PULSO',
    title: 'Resistencia 91',
    subLabel: 'VO2 Máx',
    metric: '182 BPM',
  },
  core: {
    label: 'EXPLOSIVIDAD',
    title: 'Aceleración 89',
    subLabel: 'Sprint Pico',
    metric: '32.4 KM/H',
  },
};

export default function SplashScreen({ onLoginPress, onRegisterPress, onGuestPress }) {
  const [phase, setPhase] = useState('WELCOME'); // 'BOOT' | 'WELCOME'
  const [bootStep, setBootStep] = useState(BOOT_STEPS[3]);
  const [selectedHotspot, setSelectedHotspot] = useState('head');

  const pulseHead = useRef(new Animated.Value(1)).current;
  const pulseHeart = useRef(new Animated.Value(1)).current;
  const pulseCore = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const cardFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makePulse = (anim, maxScale, dur, delayMs = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(anim, {
            toValue: maxScale,
            duration: dur,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: dur,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const p1 = makePulse(pulseHead, 1.32, 1400, 0);
    const p2 = makePulse(pulseHeart, 1.36, 1200, 400);
    const p3 = makePulse(pulseCore, 1.28, 1500, 800);

    p1.start();
    p2.start();
    p3.start();

    const rot = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 28000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rot.start();

    const flt = Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          toValue: -4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    flt.start();

    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
      rot.stop();
      flt.stop();
    };
  }, [pulseHead, pulseHeart, pulseCore, rotateAnim, cardFloat]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleHotspotPress = (key) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedHotspot(key);
  };

  const handleRegister = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (onRegisterPress) onRegisterPress();
  };

  const handleLogin = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onLoginPress) onLoginPress();
  };

  const handleGuest = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (onGuestPress) onGuestPress();
    else if (onLoginPress) onLoginPress();
  };

  const triggerBootPreview = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setPhase('BOOT');
    setBootStep(BOOT_STEPS[0]);
    BOOT_STEPS.forEach((s) => {
      setTimeout(() => {
        setBootStep(s);
      }, s.delay);
    });
    setTimeout(() => {
      setPhase('WELCOME');
    }, 1750);
  };

  const telemetry = ACTIVE_HOTSPOT_INFO[selectedHotspot] || ACTIVE_HOTSPOT_INFO.head;

  if (phase === 'BOOT') {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#07090E" />
        <View style={styles.topAuraGlow} pointerEvents="none" />
        <View style={styles.centerAuraGlow} pointerEvents="none" />

        {/* Header de Arranque HUD (`matchsport_splashscreen`) */}
        <View style={styles.bootHeader}>
          <View style={styles.circuitPill}>
            <View style={styles.systemBadgeDot} />
            <Text style={styles.circuitPillText}>AMATEUR PRO CIRCUIT</Text>
          </View>
          <View style={styles.hudLiveBadge}>
            <Text style={styles.hudLiveIcon}>((•))</Text>
            <Text style={styles.hudLiveText}>HUD LIVE</Text>
          </View>
        </View>

        {/* Emblema Central con Brackets HUD */}
        <View style={styles.bootCenter}>
          <View style={styles.hudBracketBox}>
            <View style={[styles.hudCorner, styles.hudCornerTL]} />
            <View style={[styles.hudCorner, styles.hudCornerTR]} />
            <View style={[styles.hudCorner, styles.hudCornerBL]} />
            <View style={[styles.hudCorner, styles.hudCornerBR]} />

            <View style={styles.bootShieldCircle}>
              <Text style={styles.bootShieldEmoji}>⚽</Text>
            </View>
          </View>

          <View style={styles.bootBrandRow}>
            <Text style={styles.bootBrandWhite}>MATCH</Text>
            <Text style={styles.bootBrandGreen}>SPORT</Text>
          </View>
          <View style={styles.bootUnderlineBeam} />
          <Text style={styles.bootSubtitle}>COMPETICIÓN AMATEUR CALIBRADA</Text>

          <View style={styles.bootBadgesPair}>
            <View style={styles.bootTagChip}>
              <Text style={styles.bootTagText}>TELEMETRÍA 5V5 / 7V7</Text>
            </View>
            <View style={styles.bootTagDot} />
            <View style={styles.bootTagChip}>
              <Text style={styles.bootTagTextGreen}>SISTEMA VAR-LITE</Text>
            </View>
          </View>
        </View>

        {/* Barra de Progreso Calibrada */}
        <View style={styles.bootFooter}>
          <View style={styles.bootStatusRow}>
            <View style={styles.bootStatusLeft}>
              <View style={styles.systemBadgeDot} />
              <Text style={styles.bootStatusText}>{bootStep.text.toUpperCase()}</Text>
            </View>
            <Text style={styles.bootPercentText}>{bootStep.progress}%</Text>
          </View>
          <View style={styles.bootProgressTrack}>
            <View style={[styles.bootProgressFill, { width: `${bootStep.progress}%` }]} />
          </View>
          <View style={styles.bootMetaRow}>
            <Text style={styles.bootMetaText}>⚽ CANCHA CENTRAL</Text>
            <Text style={styles.bootMetaVersion}>v1.0.4-PROD</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07090E" />

      {/* Cuadrícula Táctica Milimétrica Obsidian Pitch */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((idx) => (
          <View
            key={`h-${idx}`}
            style={[styles.gridLineH, { top: `${(idx + 1) * 8}%` }]}
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
          <View
            key={`v-${idx}`}
            style={[styles.gridLineV, { left: `${(idx + 1) * 12.5}%` }]}
          />
        ))}
      </View>

      {/* Halos de luz de estadio */}
      <View style={styles.topAuraGlow} pointerEvents="none" />
      <View style={styles.centerAuraGlow} pointerEvents="none" />

      {/* 1. Header: Chip MATCHSPORT OS + Título Bienvenido (`inicia_crea`) */}
      <View style={styles.headerSection}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.systemBadge}
            onPress={triggerBootPreview}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="MatchSport OS Estado del Sistema"
          >
            <View style={styles.systemBadgeDot} />
            <Text style={styles.systemBadgeText}>MATCHSPORT OS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hudMiniSwitch}
            onPress={triggerBootPreview}
            activeOpacity={0.75}
          >
            <Text style={styles.hudMiniSwitchText}>HUD LIVE</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.welcomeTitle}>Bienvenido</Text>
        <Text style={styles.welcomeSubtitle}>
          Inicia sesión o regístrate para comenzar a jugar
        </Text>
      </View>

      {/* 2. Sección Central: Silueta Anatómica del Deportista + 3 Hotspots + Tarjeta de Telemetría EKG */}
      <View style={styles.centerSection}>
        {/* Anillo de escaneo táctico punteado y eje horizontal */}
        <Animated.View
          style={[
            styles.tacticalScanCircle,
            { transform: [{ rotate: spin }] },
          ]}
          pointerEvents="none"
        />
        <View style={styles.tacticalAxisLine} pointerEvents="none" />

        {/* Escena Anatómica Central (320 x 350) */}
        <View style={styles.athleteStage}>
          {/* SILUETA ANATÓMICA ESCULPIDA (Fiel a `inicia_crea/screen.png`) */}
          <View style={styles.silhouetteWrapper} pointerEvents="none">
            {/* Cabeza y cuello */}
            <View style={styles.anatHead} />
            <View style={styles.anatNeck} />

            {/* Hombros y Torso Superior */}
            <View style={styles.upperTorsoRow}>
              {/* Hombro y Brazo Izquierdo */}
              <View style={styles.leftArmGroup}>
                <View style={styles.anatShoulderLeft} />
                <View style={styles.anatBicepLeft} />
                <View style={styles.anatForearmLeft} />
              </View>

              {/* Pectorales y Core Abdominal */}
              <View style={styles.torsoCenterColumn}>
                <View style={styles.anatChest}>
                  <View style={styles.anatPecLeft} />
                  <View style={styles.anatPecRight} />
                </View>

                {/* Abdomen esculpido con líneas musculares */}
                <View style={styles.anatAbdomen}>
                  <View style={styles.abLineVertical} />
                  <View style={[styles.abLineHorizontal, { top: 14 }]} />
                  <View style={[styles.abLineHorizontal, { top: 30 }]} />
                  <View style={[styles.abLineHorizontal, { top: 46 }]} />
                </View>

                {/* Pelvis */}
                <View style={styles.anatPelvis} />
              </View>

              {/* Hombro y Brazo Derecho */}
              <View style={styles.rightArmGroup}>
                <View style={styles.anatShoulderRight} />
                <View style={styles.anatBicepRight} />
                <View style={styles.anatForearmRight} />
              </View>
            </View>

            {/* Tren Inferior (Cuádriceps de futbolista) */}
            <View style={styles.legsRow}>
              <View style={styles.anatLegLeft} />
              <View style={styles.anatLegRight} />
            </View>
          </View>

          {/* LÍNEA CONECTORA VERDE LIMA NEÓN (#9EF01A) entre la cabeza y la tarjeta flotante */}
          <View style={styles.connectorSegment1} pointerEvents="none" />
          <View style={styles.connectorNode} pointerEvents="none" />
          <View style={styles.connectorSegment2} pointerEvents="none" />

          {/* HOTSPOT 1: Cabeza (Visión de Juego & IQ Táctico 🧠) */}
          <TouchableOpacity
            style={styles.hotspotHeadPos}
            onPress={() => handleHotspotPress('head')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Telemetría de Visión de Juego e IQ Táctico"
          >
            <Animated.View
              style={[
                styles.hotspotPulseLime,
                { transform: [{ scale: pulseHead }] },
              ]}
            />
            <View
              style={[
                styles.hotspotCircleLime,
                selectedHotspot === 'head' && styles.hotspotActiveRing,
              ]}
            >
              <Text style={styles.hotspotEmoji}>🧠</Text>
            </View>
          </TouchableOpacity>

          {/* HOTSPOT 2: Corazón / Pecho (Cardio & Match Pulse 🫀) */}
          <TouchableOpacity
            style={styles.hotspotHeartPos}
            onPress={() => handleHotspotPress('heart')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Telemetría de Cardio y Pulso de Partido"
          >
            <Animated.View
              style={[
                styles.hotspotPulseEmerald,
                { transform: [{ scale: pulseHeart }] },
              ]}
            />
            <View
              style={[
                styles.hotspotCircleEmerald,
                selectedHotspot === 'heart' && styles.hotspotActiveRing,
              ]}
            >
              <Text style={styles.hotspotEmoji}>🫀</Text>
            </View>
          </TouchableOpacity>

          {/* HOTSPOT 3: Core / Pierna (Aceleración y Resistencia ⚡) */}
          <TouchableOpacity
            style={styles.hotspotCorePos}
            onPress={() => handleHotspotPress('core')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Telemetría de Explosividad y Aceleración"
          >
            <Animated.View
              style={[
                styles.hotspotPulseCore,
                { transform: [{ scale: pulseCore }] },
              ]}
            />
            <View
              style={[
                styles.hotspotCircleCore,
                selectedHotspot === 'core' && styles.hotspotActiveRing,
              ]}
            >
              <Text style={styles.hotspotEmojiSmall}>⚡</Text>
            </View>
          </TouchableOpacity>

          {/* TARJETA FLOTANTE DE TELEMETRÍA CON ONDA EKG (`inicia_crea/screen.png`) */}
          <Animated.View
            style={[
              styles.telemetryCard,
              { transform: [{ translateY: cardFloat }] },
            ]}
          >
            <View style={styles.telemetryHeader}>
              <View style={styles.telemetryIconBox}>
                <Text style={styles.telemetryMiniIcon}>⚽</Text>
              </View>
              <View style={styles.telemetryHeaderTextGroup}>
                <Text style={styles.telemetryLabel} numberOfLines={1}>
                  {telemetry.label}
                </Text>
                <Text style={styles.telemetryScore} numberOfLines={1}>
                  {telemetry.title}
                </Text>
              </View>
            </View>

            <View style={styles.telemetryBody}>
              <View style={styles.telemetryMetricRow}>
                <Text style={styles.telemetryMetricName}>{telemetry.subLabel}</Text>
                <Text style={styles.telemetryMetricVal}>{telemetry.metric}</Text>
              </View>

              {/* Onda Electrocardiograma (EKG) Vectorial en Rojo-Neón #FF3B56 */}
              <View style={styles.ekgWaveformContainer}>
                <View style={styles.ekgFlatLeft} />
                <View style={styles.ekgUpSmall} />
                <View style={styles.ekgDownSmall} />
                <View style={styles.ekgSpikeUp} />
                <View style={styles.ekgSpikeDown} />
                <View style={styles.ekgRecoveryUp} />
                <View style={styles.ekgFlatMid} />
                <View style={styles.ekgUpSecond} />
                <View style={styles.ekgDownSecond} />
                <View style={styles.ekgFlatRight} />
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* 3. Hoja Inferior de Acciones (`inicia_crea`): Crear cuenta, Ya tengo una cuenta, Invitado */}
      <View style={styles.bottomSection}>
        {/* Resplandor bajo el botón primario */}
        <View style={styles.ctaAmbientGlow} pointerEvents="none" />

        {/* Botón Principal Pill: Crear cuenta (Verde Lima -> Esmeralda Neón) */}
        <TouchableOpacity
          style={styles.btnCreateAccount}
          onPress={handleRegister}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Crear cuenta"
        >
          <View style={styles.btnCreateHighlight} pointerEvents="none" />
          <Text style={styles.btnCreateAccountText}>Crear cuenta</Text>
        </TouchableOpacity>

        {/* Botón Secundario Pill: Ya tengo una cuenta */}
        <TouchableOpacity
          style={styles.btnLogin}
          onPress={handleLogin}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Ya tengo una cuenta"
        >
          <Text style={styles.btnLoginText}>Ya tengo una cuenta</Text>
        </TouchableOpacity>

        {/* Enlace: ¿Continuar como invitado? */}
        <TouchableOpacity
          style={styles.guestLink}
          onPress={handleGuest}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Continuar como invitado"
        >
          <Text style={styles.guestLinkText}>
            ¿Continuar como <Text style={styles.guestLinkHighlight}>invitado</Text>?
          </Text>
        </TouchableOpacity>

        {/* iOS Home Bar Indicator */}
        <View style={styles.homeIndicatorWrapper}>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.024)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.024)',
  },
  topAuraGlow: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 340,
    height: 220,
    borderRadius: 170,
    backgroundColor: 'rgba(0, 255, 135, 0.06)',
    zIndex: 2,
  },
  centerAuraGlow: {
    position: 'absolute',
    top: '27%',
    alignSelf: 'center',
    width: 280,
    height: 310,
    borderRadius: 155,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    zIndex: 2,
  },

  // HEADER BIENVENIDA
  headerSection: {
    marginTop: 6,
    zIndex: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
  },
  systemBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF87',
    marginRight: 6,
  },
  systemBadgeText: {
    color: '#00FF87',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  hudMiniSwitch: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.22)',
  },
  hudMiniSwitchText: {
    color: '#7DFFA2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '400',
    marginTop: 4,
    letterSpacing: 0.1,
  },

  // SECCIÓN CENTRAL ANATÓMICA Y TELEMETRÍA
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 340,
    zIndex: 15,
  },
  tacticalScanCircle: {
    position: 'absolute',
    width: 268,
    height: 268,
    borderRadius: 134,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderStyle: 'dashed',
  },
  tacticalAxisLine: {
    position: 'absolute',
    width: 250,
    height: 1,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
  },
  athleteStage: {
    width: 320,
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // SILUETA ANATÓMICA ESCULPIDA
  silhouetteWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 18,
  },
  anatHead: {
    width: 34,
    height: 42,
    borderRadius: 17,
    backgroundColor: '#131A27',
    borderWidth: 1.4,
    borderColor: '#2B384F',
  },
  anatNeck: {
    width: 16,
    height: 8,
    backgroundColor: '#111723',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#29354B',
    marginTop: -2,
  },
  upperTorsoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: -1,
  },
  leftArmGroup: {
    alignItems: 'flex-end',
    marginRight: -4,
    marginTop: 4,
  },
  anatShoulderLeft: {
    width: 22,
    height: 36,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 8,
    backgroundColor: '#141B29',
    borderWidth: 1.2,
    borderColor: '#2F3D56',
    transform: [{ rotate: '16deg' }],
  },
  anatBicepLeft: {
    width: 18,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#111723',
    borderWidth: 1.2,
    borderColor: '#2B384F',
    marginTop: -6,
    marginRight: 4,
    transform: [{ rotate: '8deg' }],
  },
  anatForearmLeft: {
    width: 14,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#0D121C',
    borderWidth: 1.1,
    borderColor: '#263247',
    marginTop: -4,
    marginRight: 2,
    transform: [{ rotate: '-5deg' }],
  },
  rightArmGroup: {
    alignItems: 'flex-start',
    marginLeft: -4,
    marginTop: 4,
  },
  anatShoulderRight: {
    width: 22,
    height: 36,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 8,
    backgroundColor: '#141B29',
    borderWidth: 1.2,
    borderColor: '#2F3D56',
    transform: [{ rotate: '-16deg' }],
  },
  anatBicepRight: {
    width: 18,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#111723',
    borderWidth: 1.2,
    borderColor: '#2B384F',
    marginTop: -6,
    marginLeft: 4,
    transform: [{ rotate: '-8deg' }],
  },
  anatForearmRight: {
    width: 14,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#0D121C',
    borderWidth: 1.1,
    borderColor: '#263247',
    marginTop: -4,
    marginLeft: 2,
    transform: [{ rotate: '5deg' }],
  },
  torsoCenterColumn: {
    alignItems: 'center',
    zIndex: 5,
  },
  anatChest: {
    width: 68,
    height: 44,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#1A2334',
    borderWidth: 1.4,
    borderColor: '#3B4D6C',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  anatPecLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1.2,
    borderColor: '#344561',
    borderBottomRightRadius: 8,
  },
  anatPecRight: {
    flex: 1,
    borderBottomWidth: 1.2,
    borderColor: '#344561',
    borderBottomLeftRadius: 8,
  },
  anatAbdomen: {
    width: 48,
    height: 64,
    backgroundColor: '#131A27',
    borderLeftWidth: 1.3,
    borderRightWidth: 1.3,
    borderBottomWidth: 1.2,
    borderColor: '#324059',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -2,
    position: 'relative',
    alignItems: 'center',
  },
  abLineVertical: {
    position: 'absolute',
    top: 2,
    bottom: 4,
    width: 1.4,
    backgroundColor: '#465879',
  },
  abLineHorizontal: {
    position: 'absolute',
    width: 28,
    height: 1.4,
    backgroundColor: '#465879',
    borderRadius: 1,
  },
  anatPelvis: {
    width: 52,
    height: 18,
    backgroundColor: '#101621',
    borderWidth: 1.2,
    borderColor: '#2E3B52',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -2,
  },
  legsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: -4,
  },
  anatLegLeft: {
    width: 26,
    height: 112,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 6,
    backgroundColor: '#111723',
    borderWidth: 1.3,
    borderColor: '#324059',
  },
  anatLegRight: {
    width: 26,
    height: 112,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 8,
    backgroundColor: '#111723',
    borderWidth: 1.3,
    borderColor: '#324059',
  },

  // LÍNEA CONECTORA VERDE LIMA NEÓN (#9EF01A)
  connectorSegment1: {
    position: 'absolute',
    top: 40,
    left: 162,
    width: 38,
    height: 2,
    backgroundColor: '#9EF01A',
    zIndex: 18,
  },
  connectorNode: {
    position: 'absolute',
    top: 38,
    left: 198,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF87',
    zIndex: 19,
  },
  connectorSegment2: {
    position: 'absolute',
    top: 44,
    left: 201,
    width: 22,
    height: 2,
    backgroundColor: '#9EF01A',
    transform: [{ rotate: '22deg' }],
    zIndex: 18,
  },

  // 3 HOTSPOTS INTERACTIVOS
  hotspotHeadPos: {
    position: 'absolute',
    top: 28,
    left: 96,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  hotspotPulseLime: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(158, 240, 26, 0.24)',
  },
  hotspotCircleLime: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 14, 20, 0.94)',
    borderWidth: 1.5,
    borderColor: '#9EF01A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9EF01A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
  },

  hotspotHeartPos: {
    position: 'absolute',
    top: 118,
    left: 106,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  hotspotPulseEmerald: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 255, 135, 0.24)',
  },
  hotspotCircleEmerald: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(11, 14, 20, 0.95)',
    borderWidth: 1.6,
    borderColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 7,
  },

  hotspotCorePos: {
    position: 'absolute',
    top: 212,
    left: 108,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  hotspotPulseCore: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(158, 240, 26, 0.16)',
  },
  hotspotCircleCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(11, 14, 20, 0.92)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotActiveRing: {
    borderColor: '#00FF87',
    borderWidth: 2,
  },
  hotspotEmoji: {
    fontSize: 14,
  },
  hotspotEmojiSmall: {
    fontSize: 12,
  },

  // TARJETA FLOTANTE DE TELEMETRÍA CON EKG
  telemetryCard: {
    position: 'absolute',
    top: 10,
    right: -4,
    width: 148,
    backgroundColor: 'rgba(11, 14, 20, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 11,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 10,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 7,
  },
  telemetryIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#171C26',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  telemetryMiniIcon: {
    fontSize: 11,
  },
  telemetryHeaderTextGroup: {
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  telemetryScore: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  telemetryBody: {
    paddingTop: 7,
  },
  telemetryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  telemetryMetricName: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  telemetryMetricVal: {
    fontSize: 9.5,
    color: '#00FF87',
    fontWeight: '800',
  },
  ekgWaveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
    paddingHorizontal: 2,
  },
  ekgFlatLeft: {
    width: 18,
    height: 2,
    backgroundColor: '#FF3B56',
    borderRadius: 1,
  },
  ekgUpSmall: {
    width: 7,
    height: 2,
    backgroundColor: '#FF3B56',
    transform: [{ rotate: '-45deg' }, { translateY: -2 }],
  },
  ekgDownSmall: {
    width: 8,
    height: 2,
    backgroundColor: '#FF3B56',
    transform: [{ rotate: '55deg' }, { translateY: 2 }],
  },
  ekgSpikeUp: {
    width: 16,
    height: 2.2,
    backgroundColor: '#FF3B56',
    transform: [{ rotate: '-68deg' }, { translateY: -3 }],
    marginLeft: -3,
  },
  ekgSpikeDown: {
    width: 18,
    height: 2.2,
    backgroundColor: '#FF3B56',
    transform: [{ rotate: '68deg' }, { translateY: 3 }],
    marginLeft: -6,
  },
  ekgRecoveryUp: {
    width: 10,
    height: 2,
    backgroundColor: '#FF3B56',
    transform: [{ rotate: '-55deg' }, { translateY: 2 }],
    marginLeft: -4,
  },
  ekgFlatMid: {
    width: 14,
    height: 2,
    backgroundColor: '#FF3B56',
    marginLeft: -2,
  },
  ekgUpSecond: {
    width: 9,
    height: 2,
    backgroundColor: '#FF3B56',
    transform: [{ rotate: '-50deg' }, { translateY: -2 }],
    marginLeft: -1,
  },
  ekgDownSecond: {
    width: 9,
    height: 2,
    backgroundColor: '#FF3B56',
    transform: [{ rotate: '50deg' }, { translateY: 2 }],
    marginLeft: -2,
  },
  ekgFlatRight: {
    width: 18,
    height: 2,
    backgroundColor: '#FF3B56',
    borderRadius: 1,
    marginLeft: -1,
  },

  // SECCIÓN INFERIOR DE ACCIONES
  bottomSection: {
    width: '100%',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 30,
    position: 'relative',
  },
  ctaAmbientGlow: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    width: '78%',
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(158, 240, 26, 0.14)',
  },
  btnCreateAccount: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#48FA54',
    borderWidth: 1,
    borderColor: '#9EF01A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  btnCreateHighlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '48%',
    backgroundColor: 'rgba(158, 240, 26, 0.42)',
  },
  btnCreateAccountText: {
    color: '#06080D',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  btnLogin: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 20, 29, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLoginText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  guestLinkText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '400',
  },
  guestLinkHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  homeIndicatorWrapper: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  homeIndicator: {
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },

  // ESTILOS DE MODO BOOT (`matchsport_splashscreen`)
  bootContainer: {
    flex: 1,
    backgroundColor: '#0B0E14',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  bootHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circuitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2026',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  circuitPillText: {
    color: '#7DFFA2',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hudLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hudLiveIcon: {
    color: '#7DFFA2',
    fontSize: 12,
    fontWeight: '800',
  },
  hudLiveText: {
    color: '#B9CBB9',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  bootCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  hudBracketBox: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  hudCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: 'rgba(0, 255, 135, 0.45)',
  },
  hudCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  hudCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  hudCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  hudCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  bootShieldCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    borderWidth: 2,
    borderColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootShieldEmoji: {
    fontSize: 44,
  },
  bootBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bootBrandWhite: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F1FFEF',
    letterSpacing: 3.5,
  },
  bootBrandGreen: {
    fontSize: 32,
    fontWeight: '900',
    color: '#7DFFA2',
    letterSpacing: 3.5,
  },
  bootUnderlineBeam: {
    width: 220,
    height: 2,
    backgroundColor: '#00FF87',
    opacity: 0.7,
    marginTop: 6,
    marginBottom: 10,
  },
  bootSubtitle: {
    color: '#B9CBB9',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.3,
  },
  bootBadgesPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  bootTagChip: {
    backgroundColor: '#272A31',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bootTagText: {
    color: '#B9CBB9',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bootTagTextGreen: {
    color: '#00E475',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bootTagDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B4B3D',
  },
  bootFooter: {
    width: '100%',
    zIndex: 10,
  },
  bootStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bootStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bootStatusText: {
    color: '#E1E2EB',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bootPercentText: {
    color: '#7DFFA2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bootProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#32353C',
    overflow: 'hidden',
  },
  bootProgressFill: {
    height: '100%',
    backgroundColor: '#00FF87',
    borderRadius: 3,
  },
  bootMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  bootMetaText: {
    color: '#B9CBB9',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bootMetaVersion: {
    color: '#849585',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
