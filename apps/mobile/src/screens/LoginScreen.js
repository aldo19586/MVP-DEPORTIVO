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
  ScrollView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { storage } from '../services/storage';

const QUICK_DISTRICTS = ['Surco, Lima', 'Miraflores, Lima', 'San Borja, Lima', 'La Molina, Lima', 'San Isidro, Lima'];
const POSITIONS = ['POR', 'DEF', 'MED', 'DEL'];

export default function LoginScreen({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [district, setDistrict] = useState('Surco, Lima');
  const [position, setPosition] = useState('MED');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Datos requeridos', 'Ingresa tu nombre o apodo de jugador.');
      return;
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      Alert.alert('PIN inválido', 'El PIN debe ser exactamente de 4 dígitos numéricos.');
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
          primarySport: 'futbol',
          declaredLevel: 'intermedio'
        });
      } else {
        result = await api.pinLogin(name.trim(), pin.trim());
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await storage.saveUserSession(result.user);
      onLoginSuccess(result.user);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async (demoName) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName(demoName);
    setPin('1234');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo y Encabezado Deportivo */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>MATCH<Text style={styles.brandAccent}>SPORT</Text></Text>
          <Text style={styles.brandTagline}>PLATAFORMA NATIVA DE MATCHMAKING DEPORTIVO</Text>
        </View>

        {/* Tarjeta de Autenticación */}
        <View style={styles.card}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, !isRegistering && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRegistering(false);
              }}
            >
              <Text style={[styles.tabText, !isRegistering && styles.tabTextActive]}>INGRESAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, isRegistering && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRegistering(true);
              }}
            >
              <Text style={[styles.tabText, isRegistering && styles.tabTextActive]}>REGISTRARSE</Text>
            </TouchableOpacity>
          </View>

          {/* Input Nombre */}
          <Text style={styles.inputLabel}>Nombre o Apodo de Cancha</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Paolo G."
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={25}
          />

          {/* Input PIN 4 dígitos */}
          <Text style={styles.inputLabel}>PIN de 4 Dígitos</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            placeholder="••••"
            placeholderTextColor="#64748b"
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />

          {/* Campos de Registro */}
          {isRegistering && (
            <>
              <Text style={styles.inputLabel}>Distrito de Residencia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {QUICK_DISTRICTS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, district === d && styles.chipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDistrict(d);
                    }}
                  >
                    <Text style={[styles.chipText, district === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Posición en Cancha</Text>
              <View style={styles.positionsRow}>
                {POSITIONS.map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.posButton, position === pos && styles.posButtonActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPosition(pos);
                    }}
                  >
                    <Text style={[styles.posButtonText, position === pos && styles.posButtonTextActive]}>
                      {pos}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Botón Principal */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isRegistering ? 'CREAR JUGADOR' : 'INGRESAR A LA CANCHA'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Acceso Rápido para Pruebas Locales */}
          {!isRegistering && (
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Cuentas demo (PIN: 1234):</Text>
              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleDemoFill('Carlos Méndez')}
                >
                  <Text style={styles.demoChipText}>Carlos M. (DEL)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleDemoFill('Mateo Silva')}
                >
                  <Text style={styles.demoChipText}>Mateo S. (MED)</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 2
  },
  brandAccent: {
    color: '#10b981'
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginTop: 4
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: '#10b981'
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1
  },
  tabTextActive: {
    color: '#0f172a'
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15
  },
  pinInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8
  },
  chipsScroll: {
    marginVertical: 6
  },
  chip: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8
  },
  chipActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  chipTextActive: {
    color: '#10b981',
    fontWeight: '800'
  },
  positionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6
  },
  posButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center'
  },
  posButtonActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)'
  },
  posButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '800'
  },
  posButtonTextActive: {
    color: '#f59e0b'
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1
  },
  demoSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  demoTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  demoChip: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  demoChipText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700'
  }
});
