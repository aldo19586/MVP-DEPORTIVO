import React, { useEffect, useRef } from 'react';
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

export default function SplashScreen({ onLoginPress, onRegisterPress, onGuestPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Pulso continuo del halo y logo central
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.07,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Rotación del radar táctico
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 24000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRegister = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    if (onRegisterPress) onRegisterPress();
  };

  const handleLogin = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (onLoginPress) onLoginPress();
  };

  const handleGuest = () => {
    try { Haptics.selectionAsync(); } catch {}
    if (onGuestPress) onGuestPress();
    else if (onLoginPress) onLoginPress();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07090E" />

      {/* Halos de luz de fondo estilo Obsidian Pitch */}
      <View style={styles.topAuraGlow} pointerEvents="none" />
      <View style={styles.centerAuraGlow} pointerEvents="none" />

      {/* 1. Header: Chip de Sistema + Título Bienvenido */}
      <View style={styles.headerSection}>
        <View style={styles.systemBadge}>
          <View style={styles.systemBadgeDot} />
          <Text style={styles.systemBadgeText}>MATCHSPORT OS</Text>
        </View>

        <Text style={styles.welcomeTitle}>Bienvenido</Text>
        <Text style={styles.welcomeSubtitle}>
          Inicia sesión o regístrate para comenzar a jugar
        </Text>
      </View>

      {/* 2. Sección Central: Logo de la app + Telemetría flotante (temporal mientras se define la imagen final) */}
      <View style={styles.centerSection}>
        {/* Anillo de radar exterior */}
        <Animated.View
          style={[
            styles.outerRadarRing,
            { transform: [{ scale: pulseAnim }] }
          ]}
        />

        {/* Anillo de radar punteado giratorio */}
        <Animated.View
          style={[
            styles.middleRadarRing,
            { transform: [{ rotate: spin }] }
          ]}
        />

        {/* Logo / Emblema central de MatchSport */}
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <View style={styles.logoPentagon}>
            <View style={styles.logoInner}>
              <Text style={styles.logoBallIcon}>⚽</Text>
            </View>
          </View>
          <View style={styles.logoTextRow}>
            <Text style={styles.brandTitleWhite}>MATCH</Text>
            <Text style={styles.brandTitleGreen}>SPORT</Text>
          </View>
        </Animated.View>

        {/* Tarjeta flotante táctica de telemetría (fiel a la referencia de Stitch) */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryHeader}>
            <View style={styles.telemetryIconBox}>
              <Text style={styles.telemetryMiniIcon}>⚡</Text>
            </View>
            <View style={styles.telemetryHeaderTextGroup}>
              <Text style={styles.telemetryLabel}>TEST FÍSICO</Text>
              <Text style={styles.telemetryScore}>IQ Táctico 94</Text>
            </View>
          </View>
          <View style={styles.telemetryBody}>
            <View style={styles.telemetryMetricRow}>
              <Text style={styles.telemetryMetricName}>Ritmo Pro</Text>
              <Text style={styles.telemetryMetricVal}>182 BPM</Text>
            </View>
            {/* Simulación gráfica de pulso EKG */}
            <View style={styles.ekgPulseLine}>
              <View style={styles.ekgBar1} />
              <View style={styles.ekgBarPeak} />
              <View style={styles.ekgBarLow} />
              <View style={styles.ekgBarPeakHigh} />
              <View style={styles.ekgBar2} />
            </View>
          </View>
        </View>
      </View>

      {/* 3. Acciones Inferiores: Crear cuenta, Ya tengo una cuenta, Continuar como invitado */}
      <View style={styles.bottomSection}>
        {/* Botón Principal: Crear cuenta */}
        <TouchableOpacity
          style={styles.btnCreateAccount}
          onPress={handleRegister}
          activeOpacity={0.88}
        >
          <Text style={styles.btnCreateAccountText}>Crear cuenta</Text>
        </TouchableOpacity>

        {/* Botón Secundario: Ya tengo una cuenta */}
        <TouchableOpacity
          style={styles.btnLogin}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.btnLoginText}>Ya tengo una cuenta</Text>
        </TouchableOpacity>

        {/* Enlace: ¿Continuar como invitado? */}
        <TouchableOpacity
          style={styles.guestLink}
          onPress={handleGuest}
          activeOpacity={0.7}
        >
          <Text style={styles.guestLinkText}>
            ¿Continuar como <Text style={styles.guestLinkHighlight}>invitado</Text>?
          </Text>
        </TouchableOpacity>

        {/* iOS Home Indicator Bar */}
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
    paddingTop: 12,
    paddingBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  topAuraGlow: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    width: 320,
    height: 220,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
  },
  centerAuraGlow: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
  },
  headerSection: {
    marginTop: 8,
    zIndex: 20,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    marginBottom: 10,
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
    letterSpacing: 0.8,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '400',
    marginTop: 4,
    letterSpacing: 0.1,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 310,
  },
  outerRadarRing: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 255, 135, 0.2)',
  },
  middleRadarRing: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.35)',
    borderStyle: 'dashed',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoPentagon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    borderWidth: 2,
    borderColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 22,
    elevation: 10,
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0D141F',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 135, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBallIcon: {
    fontSize: 32,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  brandTitleWhite: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  brandTitleGreen: {
    fontSize: 26,
    fontWeight: '900',
    color: '#00FF87',
    letterSpacing: 1.2,
  },
  telemetryCard: {
    position: 'absolute',
    top: 14,
    right: 2,
    width: 140,
    backgroundColor: 'rgba(11, 14, 20, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 10,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
  },
  telemetryIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  telemetryMiniIcon: {
    fontSize: 10,
  },
  telemetryHeaderTextGroup: {
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  telemetryScore: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  telemetryBody: {
    paddingTop: 6,
  },
  telemetryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  telemetryMetricName: {
    fontSize: 8.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  telemetryMetricVal: {
    fontSize: 9,
    color: '#00FF87',
    fontWeight: '800',
  },
  ekgPulseLine: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 14,
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  ekgBar1: {
    width: 22,
    height: 1.5,
    backgroundColor: '#FF3B56',
  },
  ekgBarPeak: {
    width: 6,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 1.5,
    borderColor: '#FF3B56',
    transform: [{ rotate: '45deg' }],
  },
  ekgBarLow: {
    width: 6,
    height: 9,
    borderBottomWidth: 2,
    borderLeftWidth: 1.5,
    borderColor: '#FF3B56',
    transform: [{ rotate: '45deg' }],
  },
  ekgBarPeakHigh: {
    width: 8,
    height: 13,
    borderTopWidth: 2,
    borderColor: '#00FF87',
    transform: [{ rotate: '-45deg' }],
  },
  ekgBar2: {
    width: 24,
    height: 1.5,
    backgroundColor: '#FF3B56',
  },
  bottomSection: {
    width: '100%',
    gap: 12,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 30,
  },
  btnCreateAccount: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  btnCreateAccountText: {
    color: '#06080D',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
