import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

export default function FutCard({ user, onAvatarUpdated }) {
  const [avatarUri, setAvatarUri] = useState(user?.avatar || null);

  const stats = user?.futStats || {
    ritmo: 78,
    tiro: 75,
    pase: 80,
    regate: 77,
    defensa: 72,
    fisico: 76
  };

  const ovr = user?.ratingOverall || Math.round(
    ((stats.ritmo || 75) +
      (stats.tiro || 75) +
      (stats.pase || 75) +
      (stats.regate || 75) +
      (stats.defensa || 75) +
      (stats.fisico || 75)) / 6
  );

  const pickImage = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Alert.alert(
        'Foto de Carta FUT',
        '¿Deseas tomar una foto o elegirla de tu galería?',
        [
          {
            text: 'Cámara',
            onPress: async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara para tomar tu foto.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                setAvatarUri(uri);
                if (onAvatarUpdated) onAvatarUpdated(uri);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }
          },
          {
            text: 'Galería',
            onPress: async () => {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Permiso denegado', 'Se requiere acceso a la galería para seleccionar tu foto.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                setAvatarUri(uri);
                if (onAvatarUpdated) onAvatarUpdated(uri);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }
          },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    } catch (err) {
      console.warn('[FUT CARD] Error al cargar imagen:', err);
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Marco superior con OVR y Posición */}
      <View style={styles.cardHeader}>
        <View style={styles.ratingBadge}>
          <Text style={styles.ovrText}>{ovr}</Text>
          <Text style={styles.posText}>{user?.position || 'MED'}</Text>
          <Text style={styles.sportBadge}>{user?.primarySport?.toUpperCase() || 'FÚTBOL'}</Text>
        </View>

        {/* Foto de Jugador con selector interactivo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.playerPhoto} />
          ) : (
            <View style={styles.placeholderPhoto}>
              <Text style={styles.placeholderInitials}>
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'MP'}
              </Text>
              <Text style={styles.changePhotoText}>Tocar p/ foto</Text>
            </View>
          )}
          <View style={styles.editIconBadge}>
            <Text style={styles.editIconText}>📷</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Nombre y Distrito */}
      <View style={styles.nameSection}>
        <Text style={styles.playerName} numberOfLines={1}>
          {user?.name || 'Jugador'}
        </Text>
        <Text style={styles.playerDistrict} numberOfLines={1}>
          📍 {user?.district || 'Lima, Perú'}
        </Text>
      </View>

      {/* Separador brillante */}
      <View style={styles.divider} />

      {/* Hexágono de Estadísticas FUT */}
      <View style={styles.statsGrid}>
        <View style={styles.statColumn}>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{stats.ritmo || 78}</Text>
            <Text style={styles.statLbl}>RIT</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{stats.tiro || 75}</Text>
            <Text style={styles.statLbl}>TIR</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{stats.pase || 80}</Text>
            <Text style={styles.statLbl}>PAS</Text>
          </View>
        </View>

        <View style={styles.statColumn}>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{stats.regate || 77}</Text>
            <Text style={styles.statLbl}>REG</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{stats.defensa || 72}</Text>
            <Text style={styles.statLbl}>DEF</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statVal}>{stats.fisico || 76}</Text>
            <Text style={styles.statLbl}>FÍS</Text>
          </View>
        </View>
      </View>

      {/* Pie de carta con ranking Glicko */}
      <View style={styles.cardFooter}>
        <Text style={styles.glickoText}>
          GLICKO ELO: <Text style={styles.glickoVal}>{user?.rating || 1500} pts</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 16,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  ratingBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70
  },
  ovrText: {
    color: '#f59e0b',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42
  },
  posText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800',
    marginTop: -2
  },
  sportBadge: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#10b981',
    overflow: 'hidden',
    position: 'relative'
  },
  playerPhoto: {
    width: '100%',
    height: '100%'
  },
  placeholderPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderInitials: {
    color: '#10b981',
    fontSize: 28,
    fontWeight: '900'
  },
  changePhotoText: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 2
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#f59e0b'
  },
  editIconText: {
    fontSize: 10
  },
  nameSection: {
    alignItems: 'center',
    marginVertical: 6
  },
  playerName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5
  },
  playerDistrict: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10
  },
  statColumn: {
    width: '45%'
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  statVal: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800'
  },
  statLbl: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center'
  },
  glickoText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  },
  glickoVal: {
    color: '#10b981',
    fontWeight: '900'
  }
});
