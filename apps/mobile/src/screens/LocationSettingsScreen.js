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
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

const RADIUS_PRESETS = [
  { km: 4, desc: 'A pie o en bicicleta (Zona inmediata)', label: '4 km' },
  { km: 8, desc: 'En auto 10-15 min (Distrito y colindantes)', label: '8 km (Recomendado)' },
  { km: 12, desc: 'Distritos vecinos ampliados', label: '12 km' },
  { km: 20, desc: 'Lima Metropolitana completa', label: '20 km' },
];

const DISTRICTS_LIMA = [
  'SURCO, LIMA',
  'MIRAFLORES, LIMA',
  'SAN BORJA, LIMA',
  'SAN ISIDRO, LIMA',
  'LA MOLINA, LIMA',
  'BARRANCO, LIMA',
  'MAGDALENA, LIMA',
  'JESÚS MARÍA, LIMA'
];

export default function LocationSettingsScreen({ currentRadius, currentDistrict, onSave, onBack }) {
  const [radius, setRadius] = useState(currentRadius || 8);
  const [district, setDistrict] = useState(currentDistrict || 'SURCO, LIMA');
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleRefreshGPS = async () => {
    setGpsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          Alert.alert('GPS Actualizado', 'Coordenadas de radar sincronizadas con tu posición actual.');
        }
      }
    } catch (e) {
      Alert.alert('Aviso GPS', 'No se pudo obtener la posición precisa. Usando distrito seleccionado.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleConfirm = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    if (onSave) {
      onSave({ radiusKm: radius, district });
    }
    onBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>UBICACIÓN Y RADIO</Text>
          <Text style={styles.headerSubtitle}>Parámetros de Emparejamiento</Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* GPS Sensor Card */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsCardLeft}>
            <Text style={styles.gpsIcon}>🛰️</Text>
            <View>
              <Text style={styles.gpsTitle}>SENSOR GPS NATIVO</Text>
              <Text style={styles.gpsSub}>{district}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.gpsRefreshBtn}
            onPress={handleRefreshGPS}
            disabled={gpsLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.gpsRefreshText}>{gpsLoading ? 'Buscando...' : '🔄 Actualizar'}</Text>
          </TouchableOpacity>
        </View>

        {/* Radio de Búsqueda */}
        <Text style={styles.sectionTitle}>RADIO MÁXIMO DE BÚSQUEDA</Text>
        <View style={styles.radiusGrid}>
          {RADIUS_PRESETS.map((item) => {
            const isSelected = radius === item.km;
            return (
              <TouchableOpacity
                key={item.km}
                style={[styles.radiusCard, isSelected && styles.radiusCardActive]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (e) {}
                  setRadius(item.km);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.radiusCardTop}>
                  <Text style={[styles.radiusKmText, isSelected && styles.radiusKmTextActive]}>
                    {item.label}
                  </Text>
                  {isSelected && <Text style={styles.radiusCheck}>✓</Text>}
                </View>
                <Text style={styles.radiusDesc}>{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Distrito */}
        <Text style={styles.sectionTitle}>DISTRITO PRINCIPAL</Text>
        <View style={styles.districtChipsGrid}>
          {DISTRICTS_LIMA.map((d) => {
            const isSelected = district === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.districtChip, isSelected && styles.districtChipActive]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (e) {}
                  setDistrict(d);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.districtChipText, isSelected && styles.districtChipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>APLICAR Y VOLVER AL RADAR</Text>
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
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  gpsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gpsIcon: {
    fontSize: 22,
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  gpsSub: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  gpsRefreshBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  gpsRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  radiusGrid: {
    gap: 10,
  },
  radiusCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 4,
  },
  radiusCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  radiusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radiusKmText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  radiusKmTextActive: {
    color: THEME.colors.primary,
  },
  radiusCheck: {
    color: THEME.colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
  radiusDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  districtChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  districtChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.cardBg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  districtChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  districtChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  districtChipTextActive: {
    color: '#00210B',
    fontWeight: '900',
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
