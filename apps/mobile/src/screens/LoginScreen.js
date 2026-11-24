import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { THEME } from '../theme';

const PIN_LENGTH = 4;

const KEYPAD_ROWS = [
  [
    { key: '1', sub: '' },
    { key: '2', sub: 'ABC' },
    { key: '3', sub: 'DEF' },
  ],
  [
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
  ],
  [
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
  ],
];

export default function LoginScreen({
  onLoginSuccess,
  initialIsRegistering = false,
  onBackToSplash,
}) {
  const [isRegistering, setIsRegistering] = useState(initialIsRegistering);
  const [authChannel, setAuthChannel] = useState('PIN'); // 'PIN' | 'EMAIL'

  // Credenciales PIN
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  // Verificación de apodo en tiempo real (/api/auth/check-name/:name)
  const [nameCheck, setNameCheck] = useState({ status: 'idle', exists: false });

  // Credenciales Email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const pulseAnim = useRef(new Animated.Value(0.45)).current;
  const nameInputRef = useRef(null);

  useEffect(() => {
    setIsRegistering(initialIsRegistering);
  }, [initialIsRegistering]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Verificación asíncrona de apodo contra el servidor real
  useEffect(() => {
    if (authChannel !== 'PIN') return undefined;
    const clean = name.trim();
    if (clean.length < 2) {
      setNameCheck({ status: 'idle', exists: false });
      return undefined;
    }

    let cancelled = false;
    setNameCheck((prev) => ({ ...prev, status: 'checking' }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkName(clean);
        if (!cancelled) {
          setNameCheck({ status: 'done', exists: !!res?.exists });
        }
      } catch {
        if (!cancelled) {
          setNameCheck({ status: 'idle', exists: false });
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, authChannel]);

  const triggerHaptic = (type = 'light') => {
    try {
      if (type === 'selection') Haptics.selectionAsync();
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleDigitPress = (digit) => {
    if (loading) return;
    Keyboard.dismiss();
    setErrorMessage('');
    if (pin.length < PIN_LENGTH) {
      triggerHaptic('light');
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    Keyboard.dismiss();
    setErrorMessage('');
    if (pin.length > 0) {
      triggerHaptic('selection');
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClearPin = () => {
    if (loading) return;
    Keyboard.dismiss();
    setErrorMessage('');
    if (pin.length > 0) {
      triggerHaptic('medium');
      setPin('');
    }
  };

  const handleHelpPress = () => {
    triggerHaptic('selection');
    Alert.alert(
      'Acceso Oficial MatchSport',
      '• Ingresa con tu apodo de jugador y tu PIN secreto de 4 dígitos.\n\n• Si eres nuevo, toca "Registrarme" para crear tu cuenta y pasar a la calibración física y test táctico.\n\n• Si olvidaste tu PIN, solicita un reseteo verificado al SuperAdmin de tu liga.'
    );
  };

  const toggleRegisterMode = () => {
    triggerHaptic('selection');
    setErrorMessage('');
    setPin('');
    setIsRegistering((prev) => !prev);
  };

  const toggleAuthChannel = () => {
    triggerHaptic('selection');
    setErrorMessage('');
    Keyboard.dismiss();
    setAuthChannel((prev) => (prev === 'PIN' ? 'EMAIL' : 'PIN'));
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    if (authChannel === 'PIN') {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        triggerHaptic('error');
        setErrorMessage('Ingresa tu apodo o nombre en cancha (mínimo 2 caracteres).');
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        triggerHaptic('error');
        setErrorMessage('Completa los 4 dígitos numéricos de tu PIN en el teclado táctico.');
        return;
      }

      setLoading(true);
      try {
        const result = isRegistering
          ? await api.pinRegister({
              name: cleanName,
              pin,
              primarySport: 'futbol',
            })
          : await api.pinLogin(cleanName, pin);

        triggerHaptic('success');
        await storage.saveUserSession(result.user, result.token);
        onLoginSuccess(result.user);
      } catch (err) {
        triggerHaptic('error');
        setErrorMessage(err.message || 'No pudimos autenticar tu cuenta. Verifica tus datos.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Autenticación secundaria vía Email real (/api/auth/login y /api/auth/register)
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      triggerHaptic('error');
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 4) {
      triggerHaptic('error');
      setErrorMessage('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (isRegistering && name.trim().length < 2) {
      triggerHaptic('error');
      setErrorMessage('Ingresa tu apodo de jugador (mínimo 2 caracteres).');
      return;
    }

    setLoading(true);
    try {
      const result = isRegistering
        ? await api.emailRegister({
            email: cleanEmail,
            password,
            name: name.trim(),
            primarySport: 'futbol',
          })
        : await api.emailLogin(cleanEmail, password);

      triggerHaptic('success');
      await storage.saveUserSession(result.user, result.token);
      onLoginSuccess(result.user);
    } catch (err) {
      triggerHaptic('error');
      setErrorMessage(err.message || 'Error al autenticar con correo electrónico.');
    } finally {
      setLoading(false);
    }
  };

  const renderNameStatusBadge = () => {
    if (nameCheck.status === 'checking') {
      return <Text style={styles.fieldStatusChecking}>Verificando...</Text>;
    }
    if (nameCheck.status !== 'done') {
      return (
        <Text style={styles.fieldStatusActive}>
          ✓ Ficha Oficial
        </Text>
      );
    }
    if (!isRegistering) {
      if (nameCheck.exists) {
        return <Text style={styles.fieldStatusActive}>✓ Jugador activo</Text>;
      }
      return (
        <TouchableOpacity onPress={toggleRegisterMode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.fieldStatusWarn}>Nuevo · Registrarme ➔</Text>
        </TouchableOpacity>
      );
    }
    if (!nameCheck.exists) {
      return <Text style={styles.fieldStatusActive}>✓ Apodo disponible</Text>;
    }
    return (
      <TouchableOpacity onPress={toggleRegisterMode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.fieldStatusWarn}>Ya existe · Ingresar ➔</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.surfaceLowest} />

      {/* Halos de Iluminación Nocturna de Estadio (Obsidian Pitch) */}
      <View pointerEvents="none" style={styles.topFloodlightGlow} />
      <View pointerEvents="none" style={styles.sideAmbientGlow} />

      {/* 1. HEADER FIJO SUPERIOR */}
      <View style={styles.header}>
        {onBackToSplash ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver atrás"
            style={styles.iconCircleBtn}
            onPress={() => {
              triggerHaptic('light');
              onBackToSplash();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.iconCircleText}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.iconCirclePlaceholder} />
        )}

        <View style={styles.brandPill}>
          <Text style={styles.brandBallIcon}>⚽</Text>
          <Text style={styles.brandPillText}>MATCHSPORT</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Ayuda de acceso"
          style={styles.helpBtn}
          onPress={handleHelpPress}
          activeOpacity={0.8}
        >
          <Text style={styles.helpBtnText}>?</Text>
        </TouchableOpacity>
      </View>

      {/* 2. CUERPO SCROLLEABLE */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexOne}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Título Atlético */}
          <View style={styles.heroBlock}>
            <View style={styles.tunnelBadge}>
              <Animated.View style={[styles.tunnelDot, { opacity: pulseAnim }]} />
              <Text style={styles.tunnelBadgeText}>
                {isRegistering ? 'NUEVA FICHA OFICIAL' : 'TÚNEL DE ACCESO'}
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              {isRegistering ? 'Crea tu Ficha en Cancha' : 'Bienvenido a la Cancha'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {authChannel === 'PIN'
                ? isRegistering
                  ? 'Registra tu apodo y un PIN de 4 dígitos para calibrar tu perfil y carta inicial.'
                  : 'Ingresa tu apodo y PIN de 4 dígitos para verificar tu ficha oficial de jugador.'
                : isRegistering
                  ? 'Crea tu cuenta con correo electrónico para continuar a tu calibración deportiva.'
                  : 'Ingresa con tu correo electrónico y contraseña registrada.'}
            </Text>
          </View>

          {authChannel === 'PIN' ? (
            <View style={styles.formStack}>
              {/* Campo de Apodo Oficial */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>APODO DE JUGADOR</Text>
                  {renderNameStatusBadge()}
                </View>

                <View style={[styles.playerInputCard, nameFocused && styles.playerInputCardFocused]}>
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryFlag}>🇵🇪</Text>
                    <Text style={styles.countryCode}>PER</Text>
                  </View>

                  <View style={styles.verticalDivider} />

                  <TextInput
                    ref={nameInputRef}
                    style={styles.playerTextInput}
                    placeholder="Ej. Mateo Ramos"
                    placeholderTextColor={THEME.colors.outline}
                    value={name}
                    onChangeText={(val) => {
                      setErrorMessage('');
                      setName(val);
                    }}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />

                  {name.length > 0 && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Limpiar apodo"
                      style={styles.clearFieldBtn}
                      onPress={() => {
                        triggerHaptic('selection');
                        setName('');
                        setErrorMessage('');
                      }}
                    >
                      <Text style={styles.clearFieldIcon}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Casillas Cinéticas de PIN (4 dígitos reales del backend) */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>
                    {isRegistering
                      ? 'CREA TU PIN SECRETO (4 DÍGITOS)'
                      : 'CÓDIGO DE ACCESO / PIN (4 DÍGITOS)'}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      triggerHaptic('selection');
                      setShowPin((prev) => !prev);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.togglePinVisibilityText}>
                      {showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Pressable
                  style={styles.pinSlotsRow}
                  onPress={() => Keyboard.dismiss()}
                >
                  {Array.from({ length: PIN_LENGTH }).map((_, index) => {
                    const isFilled = index < pin.length;
                    const isActive = index === pin.length;

                    return (
                      <View
                        key={`pin-slot-${index}`}
                        style={[
                          styles.pinSlot,
                          isActive && styles.pinSlotActive,
                          isFilled && styles.pinSlotFilled,
                        ]}
                      >
                        {isFilled ? (
                          <>
                            <Text style={styles.pinDigitText}>
                              {showPin ? pin[index] : '•'}
                            </Text>
                            <View style={styles.pinSlotUnderline} />
                          </>
                        ) : isActive ? (
                          <Animated.View
                            style={[styles.pinActiveDot, { opacity: pulseAnim }]}
                          />
                        ) : (
                          <View style={styles.pinInactiveDot} />
                        )}
                      </View>
                    );
                  })}
                </Pressable>
              </View>
            </View>
          ) : (
            /* Modo Secundario Vía Email Conectado al Backend Real */
            <View style={styles.formStack}>
              {isRegistering && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>APODO DE JUGADOR</Text>
                  <View style={styles.emailInputWrapper}>
                    <TextInput
                      style={styles.playerTextInput}
                      placeholder="Ej. Mateo Ramos"
                      placeholderTextColor={THEME.colors.outline}
                      value={name}
                      onChangeText={(v) => {
                        setErrorMessage('');
                        setName(v);
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CORREO ELECTRÓNICO</Text>
                <View style={styles.emailInputWrapper}>
                  <TextInput
                    style={styles.playerTextInput}
                    placeholder="jugador@correo.com"
                    placeholderTextColor={THEME.colors.outline}
                    value={email}
                    onChangeText={(v) => {
                      setErrorMessage('');
                      setEmail(v);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>CONTRASEÑA</Text>
                  <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                    <Text style={styles.togglePinVisibilityText}>
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.emailInputWrapper}>
                  <TextInput
                    style={styles.playerTextInput}
                    placeholder="Mínimo 4 caracteres"
                    placeholderTextColor={THEME.colors.outline}
                    value={password}
                    onChangeText={(v) => {
                      setErrorMessage('');
                      setPassword(v);
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Banner de Error Accesible */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* CTA Primario Neon Pitch Green */}
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.primaryCtaBtn, loading && styles.primaryCtaBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.86}
          >
            {loading ? (
              <ActivityIndicator color={THEME.colors.surfaceLowest} />
            ) : (
              <View style={styles.primaryCtaInner}>
                <Text style={styles.primaryCtaText}>
                  {isRegistering ? 'CREAR CUENTA Y CALIBRAR' : 'INGRESAR A JUGAR'}
                </Text>
                <Text style={styles.primaryCtaArrow}>➔</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divisor Táctico + Accesos Secundarios */}
          <View style={styles.tacticalDividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>O CONTINÚA CON</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.secondaryActionBtn}
              onPress={toggleAuthChannel}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionIcon}>
                {authChannel === 'PIN' ? '✉️' : '🔢'}
              </Text>
              <Text style={styles.secondaryActionText}>
                {authChannel === 'PIN' ? 'Vía Email' : 'Vía PIN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.secondaryActionBtn, styles.secondaryActionBtnAccent]}
              onPress={toggleRegisterMode}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionIcon}>
                {isRegistering ? '🔑' : '👤+'}
              </Text>
              <Text style={styles.secondaryActionTextAccent}>
                {isRegistering ? 'Iniciar Sesión' : 'Registrarme'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Teclado Numérico Táctico Integrado (3x4) */}
          {authChannel === 'PIN' && (
            <View style={styles.keypadContainer}>
              {KEYPAD_ROWS.map((row, rowIdx) => (
                <View key={`krow-${rowIdx}`} style={styles.keypadRow}>
                  {row.map((item) => (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={`Dígito ${item.key}`}
                      style={({ pressed }) => [
                        styles.keypadKey,
                        pressed && styles.keypadKeyPressed,
                      ]}
                      onPress={() => handleDigitPress(item.key)}
                    >
                      {({ pressed }) => (
                        <>
                          <Text
                            style={[
                              styles.keypadDigit,
                              pressed && styles.keypadDigitPressed,
                            ]}
                          >
                            {item.key}
                          </Text>
                          {item.sub ? (
                            <Text
                              style={[
                                styles.keypadSub,
                                pressed && styles.keypadDigitPressed,
                              ]}
                            >
                              {item.sub}
                            </Text>
                          ) : null}
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}

              {/* Última fila: Limpiar · 0 · Borrar */}
              <View style={styles.keypadRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar PIN"
                  style={({ pressed }) => [
                    styles.keypadUtilityKey,
                    pressed && styles.keypadUtilityKeyPressed,
                  ]}
                  onPress={handleClearPin}
                >
                  <Text style={styles.keypadClearText}>LIMPIAR</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dígito 0"
                  style={({ pressed }) => [
                    styles.keypadKey,
                    pressed && styles.keypadKeyPressed,
                  ]}
                  onPress={() => handleDigitPress('0')}
                >
                  {({ pressed }) => (
                    <>
                      <Text
                        style={[
                          styles.keypadDigit,
                          pressed && styles.keypadDigitPressed,
                        ]}
                      >
                        0
                      </Text>
                      <Text
                        style={[
                          styles.keypadSub,
                          pressed && styles.keypadDigitPressed,
                        ]}
                      >
                        +
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Borrar último dígito"
                  style={({ pressed }) => [
                    styles.keypadUtilityKey,
                    pressed && styles.keypadUtilityKeyPressed,
                  ]}
                  onPress={handleBackspace}
                >
                  <Text style={styles.keypadBackspaceText}>⌫</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Footer de Seguridad */}
          <View style={styles.securityFooter}>
            <Text style={styles.securityShield}>🛡️</Text>
            <Text style={styles.securityFooterText}>
              Sesión protegida con PIN encriptado & Verificación Arbitral
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceLowest,
  },
  flexOne: {
    flex: 1,
  },
  topFloodlightGlow: {
    position: 'absolute',
    top: -90,
    alignSelf: 'center',
    width: 300,
    height: 240,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 255, 135, 0.07)',
  },
  sideAmbientGlow: {
    position: 'absolute',
    top: '42%',
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 255, 135, 0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCirclePlaceholder: {
    width: 40,
    height: 40,
  },
  iconCircleText: {
    color: THEME.colors.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.14)',
    gap: 6,
  },
  brandBallIcon: {
    fontSize: 13,
  },
  brandPillText: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  helpBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    color: THEME.colors.outline,
    fontSize: 15,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  heroBlock: {
    marginBottom: 14,
  },
  tunnelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
    gap: 6,
  },
  tunnelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.neonPitch,
  },
  tunnelBadgeText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  heroTitle: {
    color: '#F1FFEF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  formStack: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  fieldStatusActive: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '700',
  },
  fieldStatusChecking: {
    color: THEME.colors.outline,
    fontSize: 11,
    fontWeight: '600',
  },
  fieldStatusWarn: {
    color: THEME.colors.goldLight,
    fontSize: 11,
    fontWeight: '800',
  },
  playerInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playerInputCardFocused: {
    borderColor: THEME.colors.neonPitch,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  countryFlag: {
    fontSize: 13,
  },
  countryCode: {
    color: '#F1FFEF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.surfaceHighest,
    marginHorizontal: 10,
  },
  playerTextInput: {
    flex: 1,
    color: '#F1FFEF',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },
  clearFieldBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearFieldIcon: {
    color: THEME.colors.outline,
    fontSize: 11,
    fontWeight: '800',
  },
  togglePinVisibilityText: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '700',
  },
  pinSlotsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  pinSlot: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pinSlotFilled: {
    borderColor: 'rgba(0, 255, 135, 0.22)',
  },
  pinSlotActive: {
    backgroundColor: THEME.colors.surfaceHigh,
    borderColor: 'rgba(0, 255, 135, 0.55)',
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  pinDigitText: {
    color: '#F1FFEF',
    fontSize: 22,
    fontWeight: '800',
  },
  pinSlotUnderline: {
    position: 'absolute',
    bottom: 6,
    width: 16,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: THEME.colors.neonPitch,
  },
  pinActiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.neonPitch,
  },
  pinInactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.surfaceBright,
  },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorBanner: {
    marginTop: 12,
    backgroundColor: THEME.colors.coralErrorBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorBannerText: {
    color: THEME.colors.coralError,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  primaryCtaBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 999,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryCtaBtnDisabled: {
    opacity: 0.7,
  },
  primaryCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryCtaText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  primaryCtaArrow: {
    color: THEME.colors.surfaceLowest,
    fontSize: 16,
    fontWeight: '900',
  },
  tacticalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.surfaceHighest,
  },
  dividerLabel: {
    color: THEME.colors.outline,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionBtnAccent: {
    borderColor: 'rgba(0, 255, 135, 0.24)',
  },
  secondaryActionIcon: {
    fontSize: 13,
    color: THEME.colors.neonPitch,
  },
  secondaryActionText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionTextAccent: {
    color: THEME.colors.neonPitch,
    fontSize: 12,
    fontWeight: '700',
  },
  keypadContainer: {
    marginTop: 14,
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 12,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  keypadKey: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadKeyPressed: {
    backgroundColor: THEME.colors.neonPitch,
  },
  keypadDigit: {
    color: '#F1FFEF',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 22,
  },
  keypadDigitPressed: {
    color: THEME.colors.surfaceLowest,
  },
  keypadSub: {
    color: THEME.colors.outline,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  keypadUtilityKey: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadUtilityKeyPressed: {
    backgroundColor: THEME.colors.surfaceHigh,
  },
  keypadClearText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  keypadBackspaceText: {
    color: THEME.colors.coralError,
    fontSize: 20,
    fontWeight: '700',
  },
  securityFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityShield: {
    fontSize: 12,
  },
  securityFooterText: {
    color: THEME.colors.outline,
    fontSize: 11,
    fontWeight: '600',
  },
});
