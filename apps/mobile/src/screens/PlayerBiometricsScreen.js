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
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { THEME } from '../theme';

const POSITIONS = [
  { id: 'Delantero', code: 'DEL', icon: '⚡', label: 'Delantero', sub: 'Definición y Ataque' },
  { id: 'Mediocampista', code: 'MED', icon: '🎯', label: 'Mediocampista', sub: 'Creación y Visión' },
  { id: 'Defensa', code: 'DEF', icon: '🛡️', label: 'Defensa', sub: 'Marca y Cobertura' },
  { id: 'Portero', code: 'POR', icon: '🧤', label: 'Portero', sub: 'Reflejos y Arco' }
];

export default function PlayerBiometricsScreen({ user, onCompleteProfile, onCancel }) {
  const [age, setAge] = useState(user?.age ? String(user.age) : '24');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '72');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '175');
  const [position, setPosition] = useState(user?.position || 'Delantero');
  const [reference, setReference] = useState(user?.reference || '');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!age || parseInt(age, 10) < 12 || parseInt(age, 10) > 75) {
      Alert.alert('Edad requerida', 'Ingresa una edad válida (entre 12 y 75 años).');
      return;
    }
    if (!weight || parseFloat(weight) < 35 || parseFloat(weight) > 160) {
      Alert.alert('Peso requerido', 'Ingresa un peso válido en kg (entre 35 y 160 kg).');
      return;
    }
    if (!height || parseInt(height, 10) < 120 || parseInt(height, 10) > 230) {
      Alert.alert('Estatura requerida', 'Ingresa una estatura válida en cm (entre 120 y 230 cm).');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const res = await api.completeProfile({
        userId: user.id,
        age: parseInt(age, 10),
        weight: parseFloat(weight),
        height: parseInt(height, 10),
        position,
        reference: reference.trim(),
        department: user?.department || 'Lima',
        district: user?.district || 'Surco, Lima',
        country: user?.country || 'Perú',
        primarySport: 'futbol'
      });

      const updatedUser = res.user || {
        ...user,
        age: parseInt(age, 10),
        weight: parseFloat(weight),
        height: parseInt(height, 10),
        position,
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
      Alert.alert('Error', err.message || 'No se pudo guardar la ficha deportiva.');
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
        <View style={styles.topHeader}>
          {onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>✕</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.stepBadge}>PASO 1 DE 2 • FICHA DEL JUGADOR</Text>
            <Text style={styles.mainTitle}>Completa tus Datos Deportivos</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Tarjeta Informativa de Obligatoriedad */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeIcon}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Requisito previo para jugar</Text>
              <Text style={styles.noticeSub}>
                Para buscar partidos parejos y armar alineaciones tácticas precisas en tu zona, necesitamos tus datos físicos y posición.
              </Text>
            </View>
          </View>

          {/* Deporte Seleccionado */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>⚽ DEPORTE OFICIAL DEL MVP</Text>
            <View style={styles.sportCard}>
              <Text style={styles.sportEmoji}>⚽</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sportTitle}>Fútbol (Todas las modalidades)</Text>
                <Text style={styles.sportSub}>1v1, 5v5 Futsal, Fútbol 7, Fútbol 11 reglamentario</Text>
              </View>
              <View style={styles.sportActiveBadge}>
                <Text style={styles.sportActiveText}>ACTIVO</Text>
              </View>
            </View>
            <Text style={styles.sportNotice}>Más deportes (Básquet, Pádel, Tenis) se habilitarán próximamente.</Text>
          </View>

          {/* Posición en Cancha */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>🎯 POSICIÓN PRINCIPAL EN CANCHA</Text>
            <View style={styles.positionsGrid}>
              {POSITIONS.map((pos) => {
                const isSelected = position === pos.id || position === pos.code;
                return (
                  <TouchableOpacity
                    key={pos.id}
                    style={[styles.posCard, isSelected && styles.posCardActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPosition(pos.id);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.posIcon}>{pos.icon}</Text>
                    <Text style={[styles.posLabel, isSelected && styles.posLabelActive]}>{pos.label}</Text>
                    <Text style={styles.posSub}>{pos.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Datos Biométricos (Edad, Peso, Altura) */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>📊 DATOS BIOMÉTRICOS</Text>
            <View style={styles.biometricsRow}>
              {/* Edad */}
              <View style={styles.bioCol}>
                <Text style={styles.bioInputLabel}>EDAD</Text>
                <View style={styles.bioInputWrap}>
                  <TextInput
                    style={styles.bioInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="24"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                  <Text style={styles.bioUnit}>años</Text>
                </View>
              </View>

              {/* Peso */}
              <View style={styles.bioCol}>
                <Text style={styles.bioInputLabel}>PESO</Text>
                <View style={styles.bioInputWrap}>
                  <TextInput
                    style={styles.bioInput}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholder="72"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                  <Text style={styles.bioUnit}>kg</Text>
                </View>
              </View>

              {/* Estatura */}
              <View style={styles.bioCol}>
                <Text style={styles.bioInputLabel}>ESTATURA</Text>
                <View style={styles.bioInputWrap}>
                  <TextInput
                    style={styles.bioInput}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholder="175"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                  <Text style={styles.bioUnit}>cm</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Referencia de Zona */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>📍 REFERENCIA DE TU ZONA (OPCIONAL)</Text>
            <TextInput
              style={styles.textInput}
              value={reference}
              onChangeText={setReference}
              placeholder="Ej: Cerca al Parque Kennedy / Óvalo Higuereta"
              placeholderTextColor={THEME.colors.textMuted}
            />
            <Text style={styles.inputHelper}>Ayuda a encontrar salas y rivales más cercanos en {user?.district || 'tu distrito'}.</Text>
          </View>

          {/* Botón Siguiente */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#00210B" />
            ) : (
              <Text style={styles.continueBtnText}>PASAR AL TEST DE FÚTBOL (14 PREGUNTAS) ➔</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 12,
  },
  cancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  stepBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 20,
    paddingBottom: 40,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    gap: 12,
    alignItems: 'center',
  },
  noticeIcon: {
    fontSize: 22,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  noticeSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  formSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    gap: 12,
  },
  sportEmoji: {
    fontSize: 24,
  },
  sportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  sportSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  sportActiveBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
  },
  sportActiveText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00210B',
  },
  sportNotice: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  positionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  posCard: {
    width: '48%',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    gap: 4,
  },
  posCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  posIcon: {
    fontSize: 22,
  },
  posLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  posLabelActive: {
    color: THEME.colors.primary,
  },
  posSub: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  biometricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bioCol: {
    flex: 1,
    gap: 4,
  },
  bioInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  bioInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 10,
    height: 48,
  },
  bioInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  bioUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  textInput: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    height: 48,
    color: THEME.colors.textPrimary,
    fontSize: 13,
  },
  inputHelper: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  continueBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  continueBtnText: {
    color: '#00210B',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
