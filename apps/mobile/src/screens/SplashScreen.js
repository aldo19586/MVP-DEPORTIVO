import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  StatusBar
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

export default function SplashScreen({ onLoginPress, onRegisterPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación continua de pulso y rotación sutil del pentágono
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleLogin = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    onLoginPress();
  };

  const handleRegister = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    onRegisterPress();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bgCanvas} />

      {/* Top Header Chips */}
      <View style={styles.topChipsRow}>
        <View style={styles.chipActivePlayers}>
          <View style={styles.greenDot} />
          <Text style={styles.chipActiveText}>+24,500 JUGADORES</Text>
        </View>
        <View style={styles.chipLocation}>
          <Text style={styles.chipLocationIcon}>📍</Text>
          <Text style={styles.chipLocationText}>LIMA METROPOLITANA</Text>
        </View>
      </View>

      {/* Centerpiece Emblem */}
      <View style={styles.emblemContainer}>
        {/* Outer Ring */}
        <Animated.View
          style={[
            styles.outerRadarRing,
            { transform: [{ scale: pulseAnim }] }
          ]}
        />
        {/* Middle Dashed Ring */}
        <Animated.View
          style={[
            styles.middleRadarRing,
            { transform: [{ rotate: spin }] }
          ]}
        />
        
        {/* FUT Season Badge */}
        <View style={styles.seasonTag}>
          <Text style={styles.seasonTagText}>⚡ S11 FUT</Text>
        </View>

        {/* Central Geometric Pentagon Icon */}
        <View style={styles.pentagonCore}>
          <View style={styles.pentagonInner}>
            <View style={styles.coreDot} />
          </View>
        </View>
      </View>

      {/* Branding & Tagline */}
      <View style={styles.brandSection}>
        <View style={styles.brandTitleRow}>
          <Text style={styles.brandTitleWhite}>MATCH</Text>
          <Text style={styles.brandTitleGreen}>SPORT</Text>
        </View>
        <Text style={styles.brandTagline}>
          Compite. Sube de Rango. Domina tu Cancha.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>INICIAR SESIÓN</Text>
          <Text style={styles.arrowIcon}>➔</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRegister}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>
            CREAR CUENTA <Text style={styles.secondaryButtonGold}>/ OBTENER CARTA FUT</Text>
          </Text>
        </TouchableOpacity>

        {/* Security badge */}
        <View style={styles.securityBadge}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <Text style={styles.securityText}>
            Emparejamiento Justo por Habilidad Glicko-2 & DNI Seguro
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  topChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  chipActivePlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginRight: 6,
  },
  chipActiveText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipLocationIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  chipLocationText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    position: 'relative',
  },
  outerRadarRing: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  middleRadarRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
    borderStyle: 'dashed',
  },
  seasonTag: {
    position: 'absolute',
    top: 30,
    right: 50,
    backgroundColor: THEME.colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
    zIndex: 10,
  },
  seasonTagText: {
    color: THEME.colors.goldLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pentagonCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  pentagonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.cardBg,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  brandSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitleWhite: {
    fontSize: 34,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 1.5,
  },
  brandTitleGreen: {
    fontSize: 34,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 1.5,
  },
  brandTagline: {
    marginTop: 8,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  bottomActions: {
    gap: 12,
    marginBottom: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.primary,
    height: 56,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#00210B',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 8,
  },
  arrowIcon: {
    color: '#00210B',
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: THEME.colors.cardBg,
    height: 56,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  secondaryButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButtonGold: {
    color: THEME.colors.gold,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 27, 34, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  shieldIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  securityText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
