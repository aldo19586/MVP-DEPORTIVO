import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

export default function JoinCodeScreen({ onJoinCode, onBack }) {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    if (!code.trim() || code.trim().length < 4) {
      Alert.alert('Código Incompleto', 'Ingresa los 4 caracteres de la sala (ejemplo: X8K2).');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    onJoinCode(code.trim().toUpperCase());
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>UNIRSE CON CÓDIGO</Text>
          <Text style={styles.headerSubtitle}>Sala Privada o Convocatoria</Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.codeIconBox}>
          <Text style={styles.codeIcon}>🔑</Text>
        </View>

        <Text style={styles.title}>Ingresa el Código de la Sala</Text>
        <Text style={styles.subtitle}>
          Pídele el código de 4 caracteres al anfitrión de la sala o equipo para unirte de inmediato.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="ABCD"
          placeholderTextColor="#475569"
          value={code}
          onChangeText={(val) => setCode(val.toUpperCase())}
          maxLength={4}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.joinBtn, (!code.trim() || code.trim().length < 4) && styles.joinBtnDisabled]}
          onPress={handleSubmit}
          disabled={!code.trim() || code.trim().length < 4}
          activeOpacity={0.85}
        >
          <Text style={styles.joinBtnText}>INGRESAR A LA SALA</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  codeIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.35)',
    marginBottom: 20,
  },
  codeIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
    lineHeight: 18,
    maxWidth: 290,
  },
  input: {
    width: '100%',
    maxWidth: 260,
    height: 64,
    backgroundColor: '#0F131C',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
  },
  joinBtn: {
    width: '100%',
    maxWidth: 280,
    height: 52,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.4,
  },
  joinBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00210B',
    letterSpacing: 0.8,
  },
});
