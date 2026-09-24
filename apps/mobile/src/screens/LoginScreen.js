import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { THEME } from '../theme';

const QUICK_DISTRICTS = [
  'Surco, Lima (Polo Turf / Jockey)',
  'Miraflores, Lima (Bonilla / Club)',
  'San Borja, Lima (Polideportivo)',
  'San Isidro, Lima (Complejo)',
  'La Molina, Lima (Rinconada)'
];

const POSITIONS = [
  { key: 'DEL', label: 'DEL', sub: 'ATAQUE' },
  { key: 'MED', label: 'MED', sub: 'CREACIÓN' },
  { key: 'DEF', label: 'DEF', sub: 'MURO' },
  { key: 'POR', label: 'POR', sub: 'GUANTE' }
];

export default function LoginScreen({ onLoginSuccess, initialIsRegistering = false, onBackToSplash }) {
  const [isRegistering, setIsRegistering] = useState(initialIsRegistering);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [district, setDistrict] = useState(QUICK_DISTRICTS[0]);
  const [position, setPosition] = useState('DEL');
  const [avatarUri, setAvatarUri] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [loading, setLoading] = useState(false);

  // Sliders/Selecciones del Cuestionario de Elo Inicial
  const [freqIndex, setFreqIndex] = useState(2); // 0: Ocasional, 1: Interdiario, 2: 3-4 veces, 3: Pro Turf
  const [expIndex, setExpIndex] = useState(1);  // 0: Pichangas, 1: Ligas/Torneos, 2: Federado
  const [staminaIndex, setStaminaIndex] = useState(2); // 0: 45 min, 1: 60 min, 2: 90 min intenso

  const FREQ_LABELS = ['1 vez/semana', 'Interdiario', '3 a 4 veces', 'Pro Turf Diario'];
  const EXP_LABELS = ['Pichangas de amigos', 'Ligas / Torneos', 'Federado'];
  const STAMINA_LABELS = ['45 min', '60 min', '90 min intenso'];

  // Calcular rating base simulado
  const calculatedElo = 1400 + (freqIndex * 40) + (expIndex * 60) + (staminaIndex * 30);
  const calculatedOvr = Math.min(92, Math.floor(65 + (calculatedElo - 1200) / 40));

  const handlePickAvatar = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Se requiere acceso a la galería para cambiar tu foto de perfil.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0].uri) {
        setAvatarUri(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Error picker:', e);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Datos requeridos', 'Ingresa tu nombre o apodo para la carta.');
      return;
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      Alert.alert('PIN inválido', 'El PIN de seguridad debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isRegistering) {
        result = await api.pinRegister({
          name: name.trim(),
          pin: pin.trim(),
          district,
          position,
          avatar: avatarUri,
          primarySport: 'futbol',
          declaredLevel: expIndex === 2 ? 'avanzado' : expIndex === 1 ? 'intermedio' : 'principiante'
        });
      } else {
        result = await api.pinLogin(name.trim(), pin.trim());
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await storage.saveUserSession(result.user);
      onLoginSuccess(result.user);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'Error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async (demoName, demoPos, demoOvr) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName(demoName);
    setPin('1234');
    setPosition(demoPos);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Top Header Switcher */}
        <View style={styles.topTabs}>
          <TouchableOpacity
            style={[styles.topTabBtn, !isRegistering && styles.topTabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsRegistering(false);
            }}
          >
            <Text style={[styles.topTabText, !isRegistering && styles.topTabTextActive]}>
              INICIAR SESIÓN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTabBtn, isRegistering && styles.topTabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsRegistering(true);
            }}
          >
            <Text style={[styles.topTabText, isRegistering && styles.topTabTextActive]}>
              ★ NUEVO JUGADOR
            </Text>
          </TouchableOpacity>
        </View>

        {isRegistering ? (
          /* ========================================================
             MODO REGISTRO: Personaliza tu Carta FUT (Stitch Screen 2)
             ======================================================== */
          <View style={styles.registerSection}>
            <View style={styles.draftBadge}>
              <View style={styles.draftGreenDot} />
              <Text style={styles.draftBadgeText}>DRAFT TEMPORADA APERTURA</Text>
            </View>

            <Text style={styles.mainTitle}>
              Personaliza tu <Text style={styles.titleGreen}>Carta FUT</Text>
            </Text>
            <Text style={styles.subtitle}>
              Forja tu identidad competitiva y calcula tu Elo oficial para el radar de canchas locales.
            </Text>

            {/* FUT Card Preview */}
            <View style={styles.futCardPreview}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardOvr}>{calculatedOvr}</Text>
                  <Text style={styles.cardPos}>{position}</Text>
                </View>
                <View style={styles.cardCountry}>
                  <Text style={styles.cardFlag}>🇵🇪</Text>
                  <Text style={styles.cardCountryCode}>PER</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar}>
                <Image source={{ uri: avatarUri }} style={styles.cardAvatar} />
                <View style={styles.editPencil}>
                  <Text style={styles.pencilIcon}>✏️</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.cardPlayerName}>{name.trim() || 'TU NOMBRE'}</Text>
              <Text style={styles.cardStatsPill}>
                RIT <Text style={styles.statVal}>82</Text>   TIR <Text style={styles.statVal}>79</Text>   PAS <Text style={styles.statVal}>74</Text>
              </Text>
            </View>

            {/* Formulario */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>⚽ NOMBRE COMPLETO / APODO EN CANCHA</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Mateo Ramos"
                placeholderTextColor={THEME.colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>🔒 PIN DE SEGURIDAD (4 DÍGITOS)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1234"
                placeholderTextColor={THEME.colors.textMuted}
                value={pin}
                onChangeText={setPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>📍 DISTRITO DE RESIDENCIA (SEDE PREFERENTE)</Text>
              <View style={styles.districtChipsScroll}>
                {QUICK_DISTRICTS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.districtChip, district === d && styles.districtChipActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDistrict(d);
                    }}
                  >
                    <Text style={[styles.districtChipText, district === d && styles.districtChipTextActive]}>
                      {d.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>⚽ POSICIÓN FAVORITA EN CANCHA</Text>
              <View style={styles.positionsRow}>
                {POSITIONS.map((p) => {
                  const isActive = position === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[styles.posButton, isActive && styles.posButtonActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPosition(p.key);
                      }}
                    >
                      <Text style={[styles.posButtonTitle, isActive && styles.posButtonTitleActive]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.posButtonSub, isActive && styles.posButtonSubActive]}>
                        {p.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Calculadora de Elo Inicial */}
            <View style={styles.calculatorCard}>
              <View style={styles.calcHeader}>
                <View>
                  <Text style={styles.calcTitle}>Calculadora de Elo Inicial</Text>
                  <Text style={styles.calcSubtitle}>Calibración táctica de tu primer ranking</Text>
                </View>
                <View style={styles.eaBadge}>
                  <Text style={styles.eaBadgeText}>⚡ Algoritmo EA</Text>
                </View>
              </View>

              {/* Pregunta 1 */}
              <View style={styles.calcItem}>
                <View style={styles.calcItemHeader}>
                  <Text style={styles.calcItemLabel}>1. Frecuencia de juego semanal:</Text>
                  <Text style={styles.calcItemValue}>{FREQ_LABELS[freqIndex]}</Text>
                </View>
                <View style={styles.selectorRow}>
                  {FREQ_LABELS.map((label, idx) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.stepDot, freqIndex === idx && styles.stepDotActive]}
                      onPress={() => setFreqIndex(idx)}
                    />
                  ))}
                </View>
              </View>

              {/* Pregunta 2 */}
              <View style={styles.calcItem}>
                <View style={styles.calcItemHeader}>
                  <Text style={styles.calcItemLabel}>2. Experiencia competitiva:</Text>
                  <Text style={styles.calcItemValue}>{EXP_LABELS[expIndex]}</Text>
                </View>
                <View style={styles.selectorRow}>
                  {EXP_LABELS.map((label, idx) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.stepDot, expIndex === idx && styles.stepDotActive]}
                      onPress={() => setExpIndex(idx)}
                    />
                  ))}
                </View>
              </View>

              {/* Resumen Calculado */}
              <View style={styles.calcResultRow}>
                <View>
                  <Text style={styles.calcResultLabel}>RATING BASE ESTIMADO</Text>
                  <Text style={styles.calcResultValue}>
                    {calculatedElo} <Text style={styles.bracketLabel}>Plata I</Text>
                  </Text>
                </View>
                <View style={styles.calibratedBadge}>
                  <Text style={styles.calibratedText}>✓ Calibrado</Text>
                </View>
              </View>
            </View>

            {/* Botón Principal de Registro */}
            <TouchableOpacity
              style={styles.mainSubmitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#00210B" />
              ) : (
                <Text style={styles.mainSubmitText}>⚽ CREAR MI CARTA FUT & ENTRAR</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ========================================================
             MODO LOGIN: Acceso rápido con PIN
             ======================================================== */
          <View style={styles.loginSection}>
            <Text style={styles.mainTitle}>
              Bienvenido de <Text style={styles.titleGreen}>Vuelta</Text>
            </Text>
            <Text style={styles.subtitle}>
              Ingresa tu nombre y PIN para sincronizar tus partidos y estadísticas de cancha.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>👤 NOMBRE O CORREO REGISTRADO</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Carlos Mendoza o demo_user_1"
                placeholderTextColor={THEME.colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>🔒 PIN DE 4 DÍGITOS</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1234"
                placeholderTextColor={THEME.colors.textMuted}
                value={pin}
                onChangeText={setPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.mainSubmitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#00210B" />
              ) : (
                <Text style={styles.mainSubmitText}>INGRESAR A LA CANCHA ➔</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Demo Fast Switcher */}
        <View style={styles.demoSection}>
          <Text style={styles.demoSectionTitle}>⚡ CARGAR PERFILES DEMO</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleDemoFill('Carlos Mendoza', 'DEL', 84)}
            >
              <View style={styles.orangeDot} />
              <Text style={styles.demoBtnText}>Carlos (DEL 84)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleDemoFill('Mateo Ramos', 'MED', 82)}
            >
              <View style={styles.greenDot} />
              <Text style={styles.demoBtnText}>Mateo (MED 82)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleDemoFill('Lucía Morales', 'DEL', 80)}
            >
              <View style={styles.greenDot} />
              <Text style={styles.demoBtnText}>Lucía (DEL 80)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {onBackToSplash && (
          <TouchableOpacity style={styles.backSplashBtn} onPress={onBackToSplash}>
            <Text style={styles.backSplashText}>← Volver a la pantalla de bienvenida</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 40,
  },
  topTabs: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  topTabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  topTabBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  topTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  topTabTextActive: {
    color: '#00210B',
  },
  registerSection: {
    gap: 16,
  },
  loginSection: {
    gap: 18,
    marginTop: 10,
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  draftGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
    marginRight: 6,
  },
  draftBadgeText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  titleGreen: {
    color: THEME.colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -8,
  },
  futCardPreview: {
    alignSelf: 'center',
    width: 200,
    backgroundColor: '#1E232D',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 2,
    borderColor: THEME.colors.gold,
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: THEME.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'flex-start',
  },
  cardOvr: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.gold,
    lineHeight: 30,
  },
  cardPos: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  cardCountry: {
    alignItems: 'center',
  },
  cardFlag: {
    fontSize: 14,
  },
  cardCountryCode: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.gold,
  },
  avatarWrapper: {
    position: 'relative',
    marginVertical: 6,
  },
  cardAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: THEME.colors.gold,
  },
  editPencil: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.colors.gold,
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pencilIcon: {
    fontSize: 10,
  },
  cardPlayerName: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  cardStatsPill: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  statVal: {
    color: THEME.colors.gold,
    fontWeight: '900',
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: THEME.colors.cardBg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    height: 48,
    paddingHorizontal: 14,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  districtChipsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  districtChip: {
    backgroundColor: THEME.colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  districtChipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  districtChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  districtChipTextActive: {
    color: THEME.colors.primary,
  },
  positionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  posButton: {
    flex: 1,
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  posButtonActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  posButtonTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  posButtonTitleActive: {
    color: '#00210B',
  },
  posButtonSub: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  posButtonSubActive: {
    color: '#00210B',
  },
  calculatorCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
    marginTop: 6,
  },
  calcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  calcSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  eaBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
  },
  eaBadgeText: {
    color: THEME.colors.goldLight,
    fontSize: 9,
    fontWeight: '800',
  },
  calcItem: {
    gap: 6,
  },
  calcItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcItemLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  calcItemValue: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.cardElevated,
  },
  stepDotActive: {
    backgroundColor: THEME.colors.primary,
  },
  calcResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.6)',
    padding: 10,
    borderRadius: THEME.radius.md,
    marginTop: 4,
  },
  calcResultLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  calcResultValue: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  bracketLabel: {
    fontSize: 11,
    color: THEME.colors.gold,
    fontWeight: '800',
  },
  calibratedBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
  },
  calibratedText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  mainSubmitBtn: {
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  mainSubmitText: {
    color: '#00210B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  demoSection: {
    marginTop: 24,
    gap: 8,
  },
  demoSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    textAlign: 'center',
    letterSpacing: 1,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  orangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.gold,
    marginRight: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
    marginRight: 6,
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  backSplashBtn: {
    alignItems: 'center',
    marginTop: 18,
  },
  backSplashText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
