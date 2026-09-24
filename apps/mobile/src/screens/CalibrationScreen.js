import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

const LEVEL_OPTIONS = [
  {
    id: 'principiante',
    label: 'Principiante',
    badge: '1200 Elo Est.',
    desc: 'Juego recreativo de fin de semana, ritmo pausado y sin presión competitiva.',
    icon: '🌱'
  },
  {
    id: 'intermedio',
    label: 'Intermedio',
    badge: '1450 Elo Est.',
    desc: 'Práctica constante 1 o 2 veces por semana, buen control de balón y dinámica de juego.',
    icon: '⚽'
  },
  {
    id: 'avanzado',
    label: 'Avanzado',
    badge: '1700 Elo Est.',
    desc: 'Experiencia en ligas locales, alta intensidad física, precisión técnica y visión táctica.',
    icon: '🔥'
  },
  {
    id: 'competitivo',
    label: 'Competitivo',
    badge: '1950 Elo Est.',
    desc: 'Nivel federado o de torneos semiprofesionales con exigencia máxima.',
    icon: '🏆'
  }
];

export default function CalibrationScreen({ user, currentLevel, onSaveLevel, onBack }) {
  const [selectedLevel, setSelectedLevel] = useState(currentLevel || 'Intermedio');

  const handleSelect = (lvl) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setSelectedLevel(lvl.label);
  };

  const handleConfirm = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    if (onSaveLevel) {
      onSaveLevel(selectedLevel);
    }
    Alert.alert(
      'Nivel Inicial Calibrado',
      `Tu nivel declarado se estableció en "${selectedLevel}". Juega tus 3 partidos de calibración para obtener tu rating oficial y OVR FUT.`,
      [{ text: 'Aceptar', onPress: onBack }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CALIBRACIÓN DE NIVEL</Text>
          <Text style={styles.headerSubtitle}>Sistema Glicko-2 Dinámico</Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Explicativo de Calibración */}
        <View style={styles.calibrationStatusBox}>
          <View style={styles.statusBadgeRow}>
            <Text style={styles.statusBadgeIcon}>🎯</Text>
            <View>
              <Text style={styles.statusBadgeTitle}>ESTADO: CALIBRANDO</Text>
              <Text style={styles.statusBadgeSub}>Faltan 3 partidos para asignar tu Elo oficial</Text>
            </View>
          </View>
          <Text style={styles.statusDesc}>
            En MatchSport, los jugadores nuevos no inician con un puntaje arbitrario. Tras jugar tus primeros 3 partidos con peer-review, el algoritmo Glicko-2 calculará tu rating exacto.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>SELECCIONA TU NIVEL INICIAL DECLARADO</Text>

        <View style={styles.optionsList}>
          {LEVEL_OPTIONS.map((item) => {
            const isSelected = selectedLevel === item.label;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.levelCard, isSelected && styles.levelCardActive]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.8}
              >
                <View style={styles.levelCardTop}>
                  <View style={styles.levelCardHeaderLeft}>
                    <Text style={styles.levelCardIcon}>{item.icon}</Text>
                    <Text style={[styles.levelCardName, isSelected && styles.levelCardNameActive]}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={[styles.eloBadge, isSelected && styles.eloBadgeActive]}>
                    <Text style={[styles.eloBadgeText, isSelected && styles.eloBadgeTextActive]}>
                      {item.badge}
                    </Text>
                  </View>
                </View>

                <Text style={styles.levelCardDesc}>{item.desc}</Text>

                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedText}>✓ SELECCIONADO</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>GUARDAR CALIBRACIÓN</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16,
  },
  calibrationStatusBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    gap: 8,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadgeIcon: {
    fontSize: 22,
  },
  statusBadgeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  statusBadgeSub: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 1,
  },
  statusDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  optionsList: {
    gap: 10,
  },
  levelCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  levelCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
  },
  levelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelCardIcon: {
    fontSize: 18,
  },
  levelCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  levelCardNameActive: {
    color: THEME.colors.primary,
  },
  eloBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eloBadgeActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  eloBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  eloBadgeTextActive: {
    color: THEME.colors.primary,
  },
  levelCardDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
  },
  selectedIndicator: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 230, 118, 0.2)',
  },
  selectedText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  confirmBtn: {
    backgroundColor: THEME.colors.primary,
    height: 50,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00210B',
    letterSpacing: 0.8,
  },
});
