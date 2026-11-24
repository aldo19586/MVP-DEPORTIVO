import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { THEME } from '../theme';

const POSITIONS = [
  { id: 'Delantero', code: 'DEL', tag: 'DEL / Delantero Centro (ST)', sub: 'Definición y Ataque' },
  { id: 'Mediocampista', code: 'MED', tag: 'MED / Mediocampista (CAM)', sub: 'Creación y Visión' },
  { id: 'Defensa', code: 'DEF', tag: 'DEF / Defensa Central (CB)', sub: 'Marca y Cobertura' },
  { id: 'Portero', code: 'POR', tag: 'POR / Guardameta (GK)', sub: 'Reflejos y Arco' }
];

const VARIANTS = ['Extremo Izq', 'Pivote Defensivo', 'Lateral Ofensivo', 'Segundo Delantero'];

export default function PlayerBiometricsScreen({ user, onCompleteProfile, onCancel }) {
  const [avatarUri, setAvatarUri] = useState(user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [age, setAge] = useState(user?.age ? String(user.age) : '24');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '74.5');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '178');
  const [position, setPosition] = useState(user?.position || 'Mediocampista');
  const [selectedVariant, setSelectedVariant] = useState(VARIANTS[0]);
  const [dominantFoot, setDominantFoot] = useState('right'); // 'right' | 'left'
  const [district, setDistrict] = useState(user?.district || 'Surco, Lima');
  const [reference, setReference] = useState(user?.reference || '');
  const [loading, setLoading] = useState(false);

  const selectedPosObj = POSITIONS.find(p => p.id === position || p.code === position) || POSITIONS[1];

  const handlePickAvatar = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar tu foto deportiva.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setAvatarUri(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Error seleccionando foto:', e);
    }
  };

  const handleHelp = () => {
    try { Haptics.selectionAsync(); } catch {}
    Alert.alert(
      'Ficha Técnica Oficial',
      'Configura tus datos físicos reales. El sistema utilizará tu estatura, peso, posición y distrito para emparejarte en partidos equilibrados y justos de tu nivel en Lima.'
    );
  };

  const handleContinue = async () => {
    if (!district || district.trim().length < 2) {
      Alert.alert('Distrito requerido', 'Ingresa el distrito donde sueles jugar.');
      return;
    }
    const numAge = parseInt(age, 10);
    if (isNaN(numAge) || numAge < 12 || numAge > 75) {
      Alert.alert('Edad requerida', 'Ingresa una edad válida (entre 12 y 75 años).');
      return;
    }
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight < 35 || numWeight > 160) {
      Alert.alert('Peso requerido', 'Ingresa un peso válido en kg (entre 35 y 160 kg).');
      return;
    }
    const numHeight = parseInt(height, 10);
    if (isNaN(numHeight) || numHeight < 120 || numHeight > 230) {
      Alert.alert('Estatura requerida', 'Ingresa una estatura válida en cm (entre 120 y 230 cm).');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const res = await api.completeProfile({
        userId: user.id,
        age: numAge,
        weight: numWeight,
        height: numHeight,
        position: selectedPosObj.code,
        reference: reference.trim(),
        department: user?.department || 'Lima',
        district: district.trim(),
        country: user?.country || 'Perú',
        primarySport: 'futbol'
      });

      const updatedUser = res.user || {
        ...user,
        avatar: avatarUri,
        age: numAge,
        weight: numWeight,
        height: numHeight,
        position: selectedPosObj.code,
        district: district.trim(),
        reference: reference.trim(),
        hasCompletedProfile: true
      };

      await storage.saveUserSession(updatedUser);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onCompleteProfile) {
        onCompleteProfile(updatedUser);
      }
    } catch (err) {
      console.error('[BIOMETRICS] Error guardando:', err);
      Alert.alert('Error', err.message || 'No se pudo guardar la ficha técnica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top HUD Navigation Bar */}
        <View style={styles.topHeader}>
          {onCancel ? (
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={onCancel}
              accessibilityLabel="Volver atrás"
            >
              <Text style={styles.circleBtnText}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}

          {/* Stepper Pill Track */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperRow}>
              <View style={styles.activeDot} />
              <Text style={styles.stepperLabel}>PASO 1 DE 2: CALIBRACIÓN FÍSICA</Text>
            </View>
            <View style={styles.stepBars}>
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <View style={styles.stepBar} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={handleHelp}
            accessibilityLabel="Ayuda"
          >
            <Text style={styles.circleBtnText}>?</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerBlock}>
            <View style={styles.tagBadge}>
              <View style={styles.tagDot} />
              <Text style={styles.tagBadgeText}>FICHA TÉCNICA OFICIAL</Text>
            </View>
            <Text style={styles.mainTitle}>Calibra tu Perfil</Text>
            <Text style={styles.subtitle}>
              Configura tus parámetros biométricos y zona de juego para calibrar tu matchmaking y estadísticas VAR-Lite.
            </Text>
          </View>

          {/* Player Tactical Avatar Module */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarGlow} />
              <View style={styles.avatarFrame}>
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                <View style={styles.dorsalOverlay}>
                  <Text style={styles.dorsalText}>#10</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handlePickAvatar}
                activeOpacity={0.85}
              >
                <Text style={styles.cameraIcon}>📷</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeCheck}>✓</Text>
              <Text style={styles.roleBadgeText}>
                {user?.name || 'Jugador'} • Dorsal #10
              </Text>
            </View>
          </View>

          {/* Tactical Field & Position Selector */}
          <View style={styles.tacticalCard}>
            <View style={styles.tacticalCardHeader}>
              <View>
                <Text style={styles.cardSuperLabel}>ZONA TÁCTICA</Text>
                <Text style={styles.cardTitle}>Posición en Cancha</Text>
              </View>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{selectedPosObj.tag}</Text>
              </View>
            </View>

            {/* Interactive Mini Pitch */}
            <View style={styles.miniPitch}>
              {/* Líneas tácticas de cancha */}
              <View style={styles.pitchCenterCircle} />
              <View style={styles.pitchHalfLine} />

              {/* 4 Nodos tácticos interactivos */}
              <View style={styles.pitchNodesContainer}>
                {/* DEL */}
                <TouchableOpacity
                  style={[
                    styles.pitchNode,
                    selectedPosObj.code === 'DEL' && styles.pitchNodeActive
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPosition('Delantero');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.nodeDot, selectedPosObj.code === 'DEL' && styles.nodeDotActive]} />
                  <Text style={[styles.nodeText, selectedPosObj.code === 'DEL' && styles.nodeTextActive]}>DEL</Text>
                </TouchableOpacity>

                {/* MED */}
                <TouchableOpacity
                  style={[
                    styles.pitchNode,
                    selectedPosObj.code === 'MED' && styles.pitchNodeActive
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPosition('Mediocampista');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.nodeDot, selectedPosObj.code === 'MED' && styles.nodeDotActive]} />
                  <Text style={[styles.nodeText, selectedPosObj.code === 'MED' && styles.nodeTextActive]}>MED</Text>
                </TouchableOpacity>

                {/* DEF */}
                <TouchableOpacity
                  style={[
                    styles.pitchNode,
                    selectedPosObj.code === 'DEF' && styles.pitchNodeActive
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPosition('Defensa');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.nodeDot, selectedPosObj.code === 'DEF' && styles.nodeDotActive]} />
                  <Text style={[styles.nodeText, selectedPosObj.code === 'DEF' && styles.nodeTextActive]}>DEF</Text>
                </TouchableOpacity>

                {/* POR */}
                <TouchableOpacity
                  style={[
                    styles.pitchNode,
                    selectedPosObj.code === 'POR' && styles.pitchNodeActive
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPosition('Portero');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.nodeDot, selectedPosObj.code === 'POR' && styles.nodeDotActive]} />
                  <Text style={[styles.nodeText, selectedPosObj.code === 'POR' && styles.nodeTextActive]}>POR</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Variantes secundarias */}
            <View style={styles.variantsSection}>
              <Text style={styles.variantsLabel}>VARIANTES SECUNDARIAS:</Text>
              <View style={styles.variantsRow}>
                {VARIANTS.map((v) => {
                  const isSel = selectedVariant === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[styles.variantChip, isSel && styles.variantChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedVariant(v);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.variantText, isSel && styles.variantTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Physical Biometrics Modules (Altura & Peso) */}
          <View style={styles.biometricsStack}>
            {/* Altura */}
            <View style={styles.bioCard}>
              <View style={styles.bioCardHeader}>
                <View style={styles.bioTitleRow}>
                  <Text style={styles.bioIcon}>↕</Text>
                  <Text style={styles.bioLabel}>ALTURA</Text>
                </View>
                <View style={styles.percentilBadge}>
                  <Text style={styles.percentilText}>Percentil 68%</Text>
                </View>
              </View>

              <View style={styles.bioValueRow}>
                <View style={styles.valueWrap}>
                  <TextInput
                    style={styles.giantValueInput}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
                <Text style={styles.rangeSub}>Rango Pro: 165 - 195 cm</Text>
              </View>

              <View style={styles.metricGuideRow}>
                <Text style={styles.metricGuideText}>150 cm</Text>
                <Text style={styles.metricGuideHighlight}>Media 176</Text>
                <Text style={styles.metricGuideText}>210 cm</Text>
              </View>
            </View>

            {/* Peso */}
            <View style={styles.bioCard}>
              <View style={styles.bioCardHeader}>
                <View style={styles.bioTitleRow}>
                  <Text style={styles.bioIcon}>⚖️</Text>
                  <Text style={styles.bioLabel}>PESO CORPORAL</Text>
                </View>
                <View style={styles.percentilBadgeGreen}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.percentilTextGreen}>IMC 23.5 • Óptimo</Text>
                </View>
              </View>

              <View style={styles.bioValueRow}>
                <View style={styles.valueWrap}>
                  <TextInput
                    style={styles.giantValueInput}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
                <Text style={styles.rangeSub}>Ratio Fuerza: 1.18x</Text>
              </View>

              <View style={styles.metricGuideRow}>
                <Text style={styles.metricGuideText}>55 kg</Text>
                <Text style={styles.metricGuideHighlight}>Ideal Competición</Text>
                <Text style={styles.metricGuideText}>110 kg</Text>
              </View>
            </View>

            {/* Edad & Zona en Lima */}
            <View style={styles.bioCard}>
              <View style={styles.bioCardHeader}>
                <View style={styles.bioTitleRow}>
                  <Text style={styles.bioIcon}>🎂</Text>
                  <Text style={styles.bioLabel}>EDAD & UBICACIÓN</Text>
                </View>
              </View>

              <View style={styles.fieldsGrid}>
                <View style={{ width: 80 }}>
                  <Text style={styles.subInputLabel}>EDAD</Text>
                  <TextInput
                    style={styles.compactInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="24"
                    placeholderTextColor={THEME.colors.outline}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.subInputLabel}>DISTRITO EN LIMA</Text>
                  <TextInput
                    style={styles.compactInput}
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="Ej. Surco, Lima"
                    placeholderTextColor={THEME.colors.outline}
                  />
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.subInputLabel}>REFERENCIA O CANCHA HABITUAL (OPCIONAL)</Text>
                <TextInput
                  style={styles.compactInput}
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Ej. Cerca al Bonilla / Jockey"
                  placeholderTextColor={THEME.colors.outline}
                />
              </View>
            </View>
          </View>

          {/* Dominant Foot Selector */}
          <View style={styles.tacticalCard}>
            <View style={styles.tacticalCardHeader}>
              <View style={styles.bioTitleRow}>
                <Text style={styles.bioIcon}>⚽</Text>
                <Text style={styles.cardTitle}>Pierna Hábil</Text>
              </View>
              <View style={styles.tagBadgeSmall}>
                <Text style={styles.tagBadgeSmallText}>Ambidextro (+5% Var)</Text>
              </View>
            </View>

            <View style={styles.footSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.footBtn,
                  dominantFoot === 'right' && styles.footBtnActive
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDominantFoot('right');
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.footArrow, dominantFoot === 'right' && styles.footArrowActive]}>➔</Text>
                <Text style={[styles.footBtnText, dominantFoot === 'right' && styles.footBtnTextActive]}>
                  DIESTRO (Der)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footBtn,
                  dominantFoot === 'left' && styles.footBtnActive
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDominantFoot('left');
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.footArrow, dominantFoot === 'left' && styles.footArrowActive]}>←</Text>
                <Text style={[styles.footBtnText, dominantFoot === 'left' && styles.footBtnTextActive]}>
                  ZURDO (Izq)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Tactical Call To Action */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={THEME.colors.surfaceLowest} />
            ) : (
              <View style={styles.continueInner}>
                <Text style={styles.continueText}>CONTINUAR AL TEST TÁCTICO</Text>
                <Text style={styles.continueArrow}>➔</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.trustFooter}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <Text style={styles.trustText}>
              Datos protegidos bajo reglamento oficial de la Liga MatchSport
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceLowest,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnText: {
    color: '#F1FFEF',
    fontSize: 16,
    fontWeight: '800',
  },
  stepperContainer: {
    alignItems: 'center',
    gap: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.neonPitch,
  },
  stepperLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stepBars: {
    flexDirection: 'row',
    gap: 6,
  },
  stepBar: {
    width: 30,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: THEME.colors.surfaceHighest,
  },
  stepBarActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 36,
    gap: 14,
  },
  headerBlock: {
    gap: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
    marginBottom: 4,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.neonPitch,
  },
  tagBadgeText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  mainTitle: {
    color: '#F1FFEF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12.5,
    lineHeight: 18,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  avatarWrapper: {
    position: 'relative',
    width: 106,
    height: 106,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
  },
  avatarFrame: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: THEME.colors.surfaceContainer,
    borderWidth: 2,
    borderColor: THEME.colors.neonPitch,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  dorsalOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 14, 20, 0.75)',
    alignItems: 'center',
    paddingBottom: 2,
  },
  dorsalText: {
    color: THEME.colors.neonPitch,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  cameraIcon: {
    fontSize: 14,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    marginTop: 8,
  },
  roleBadgeCheck: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '900',
  },
  roleBadgeText: {
    color: '#F1FFEF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tacticalCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  tacticalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSuperLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: '#F1FFEF',
    fontSize: 14,
    fontWeight: '800',
  },
  roleTag: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)',
  },
  roleTagText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '800',
  },
  miniPitch: {
    height: 180,
    backgroundColor: '#0A0E13',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(96, 255, 152, 0.35)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pitchCenterCircle: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(96, 255, 152, 0.25)',
  },
  pitchHalfLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(96, 255, 152, 0.25)',
  },
  pitchNodesContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pitchNode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 42, 49, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pitchNodeActive: {
    backgroundColor: THEME.colors.surfaceHighest,
    borderColor: THEME.colors.neonPitch,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.outline,
  },
  nodeDotActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  nodeText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  nodeTextActive: {
    color: THEME.colors.neonPitch,
  },
  variantsSection: {
    gap: 6,
    paddingTop: 4,
  },
  variantsLabel: {
    color: THEME.colors.outline,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantChip: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  variantChipActive: {
    backgroundColor: THEME.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: THEME.colors.neonPitch,
  },
  variantText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '600',
  },
  variantTextActive: {
    color: THEME.colors.neonPitch,
    fontWeight: '800',
  },
  biometricsStack: {
    gap: 10,
  },
  bioCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  bioCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bioIcon: {
    fontSize: 14,
  },
  bioLabel: {
    color: '#F1FFEF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  percentilBadge: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  percentilText: {
    color: THEME.colors.neonSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  percentilBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 5,
  },
  dotGreen: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.colors.neonPitch,
  },
  percentilTextGreen: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '800',
  },
  bioValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  giantValueInput: {
    color: '#F1FFEF',
    fontSize: 26,
    fontWeight: '900',
    paddingVertical: 0,
  },
  unitText: {
    color: THEME.colors.neonPitch,
    fontSize: 14,
    fontWeight: '800',
  },
  rangeSub: {
    color: THEME.colors.outline,
    fontSize: 10.5,
    fontWeight: '600',
  },
  metricGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricGuideText: {
    color: THEME.colors.outline,
    fontSize: 9.5,
  },
  metricGuideHighlight: {
    color: THEME.colors.neonPitch,
    fontSize: 9.5,
    fontWeight: '800',
  },
  fieldsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  subInputLabel: {
    color: THEME.colors.outline,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  compactInput: {
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    height: 42,
    color: '#F1FFEF',
    fontSize: 13,
    fontWeight: '700',
  },
  tagBadgeSmall: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagBadgeSmallText: {
    color: THEME.colors.neonSecondary,
    fontSize: 9.5,
    fontWeight: '800',
  },
  footSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  footBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  footBtnActive: {
    backgroundColor: THEME.colors.neonPitch,
    borderColor: THEME.colors.neonPitch,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  footArrow: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.onSurfaceVariant,
  },
  footArrowActive: {
    color: THEME.colors.surfaceLowest,
  },
  footBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.onSurfaceVariant,
  },
  footBtnTextActive: {
    color: THEME.colors.surfaceLowest,
  },
  continueBtn: {
    marginTop: 6,
    height: 50,
    borderRadius: 999,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  continueArrow: {
    color: THEME.colors.surfaceLowest,
    fontSize: 16,
    fontWeight: '900',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  shieldIcon: {
    fontSize: 12,
  },
  trustText: {
    color: THEME.colors.outline,
    fontSize: 10.5,
    textAlign: 'center',
  },
});
