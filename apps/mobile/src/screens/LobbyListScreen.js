import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { THEME } from '../theme';

const MOCK_LOBBIES = [
  {
    code: 'X8K2',
    name: 'Pichanga Nocturna Bonilla 5v5',
    venue: 'Manuel Bonilla, Miraflores',
    sport: 'Fútbol 5v5',
    time: '08:30 PM',
    currentPlayers: 8,
    maxPlayers: 10,
    eloRange: '1600 - 1850 Elo',
    bracket: 'Plata / Oro',
    isPrivate: false
  },
  {
    code: 'G7L1',
    name: 'Reta Competitiva El Golazo',
    venue: 'Cancha El Golazo, Surco',
    sport: 'Fútbol 7v7',
    time: '09:00 PM',
    currentPlayers: 11,
    maxPlayers: 14,
    eloRange: '1700 - 1900 Elo',
    bracket: 'Oro / Maestro',
    isPrivate: false
  },
  {
    code: 'B3P9',
    name: 'Duelo Amistoso San Borja',
    venue: 'Polideportivo San Borja',
    sport: 'Fútbol 5v5',
    time: '07:00 PM',
    currentPlayers: 6,
    maxPlayers: 10,
    eloRange: '1400 - 1650 Elo',
    bracket: 'Bronce / Plata',
    isPrivate: true
  }
];

export default function LobbyListScreen({ onEnterLobby, onCreateLobbyPress, onJoinWithCodePress }) {
  const [filterSport, setFilterSport] = useState('todos');
  const [lobbies, setLobbies] = useState(MOCK_LOBBIES);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const handleJoinByCode = () => {
    if (!joinCodeInput.trim() || joinCodeInput.trim().length < 4) {
      Alert.alert('Código inválido', 'El código de sala debe tener 4 caracteres.');
      return;
    }
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    setShowJoinModal(false);
    onEnterLobby({ code: joinCodeInput.trim().toUpperCase() });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBrand}>MATCHSPORT</Text>
          <Text style={styles.topTitle}>SALAS DE CONVOCATORIA</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.keyBtn}
            onPress={() => setShowJoinModal(true)}
          >
            <Text style={styles.keyBtnText}>🔑 Código</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={onCreateLobbyPress}
          >
            <Text style={styles.createBtnText}>+ Crear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterSport === 'todos' && styles.filterChipActive]}
            onPress={() => setFilterSport('todos')}
          >
            <Text style={[styles.filterChipText, filterSport === 'todos' && styles.filterChipTextActive]}>
              Todo Lima
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterSport === '5v5' && styles.filterChipActive]}
            onPress={() => setFilterSport('5v5')}
          >
            <Text style={[styles.filterChipText, filterSport === '5v5' && styles.filterChipTextActive]}>
              Fútbol 5v5
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterSport === '7v7' && styles.filterChipActive]}
            onPress={() => setFilterSport('7v7')}
          >
            <Text style={[styles.filterChipText, filterSport === '7v7' && styles.filterChipTextActive]}>
              Fútbol 7v7
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lobbies List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>PARTIDOS ABIERTOS ({lobbies.length})</Text>

          {lobbies.map((room) => {
            const quorum = Math.floor((room.currentPlayers / room.maxPlayers) * 100);
            return (
              <View key={room.code} style={styles.roomCard}>
                <View style={styles.roomCardTop}>
                  <View style={styles.roomCodeBadge}>
                    <Text style={styles.roomCodeText}>#{room.code}</Text>
                  </View>
                  <Text style={styles.roomSport}>{room.sport}</Text>
                  <Text style={styles.roomTime}>⏱️ {room.time}</Text>
                </View>

                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.roomVenue}>📍 {room.venue}</Text>

                {/* Progress bar */}
                <View style={styles.progressRow}>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${quorum}%` }]} />
                  </View>
                  <Text style={styles.playersCount}>
                    {room.currentPlayers}/{room.maxPlayers}
                  </Text>
                </View>

                <View style={styles.cardBottomRow}>
                  <View style={styles.bracketBadge}>
                    <Text style={styles.bracketText}>{room.bracket} • {room.eloRange}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.enterBtn}
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
                      onEnterLobby(room);
                    }}
                  >
                    <Text style={styles.enterBtnText}>ENTRAR ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Inline Join Code Form if opened */}
        {showJoinModal && (
          <View style={styles.joinDialog}>
            <Text style={styles.joinDialogTitle}>🔑 UNIRSE CON CÓDIGO DE SALA</Text>
            <Text style={styles.joinDialogSub}>Pídele el código de 4 letras a tu capitán de equipo:</Text>
            <TextInput
              style={styles.joinInput}
              placeholder="Ej. X8K2"
              placeholderTextColor={THEME.colors.textMuted}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              autoCapitalize="characters"
              maxLength={6}
            />
            <View style={styles.joinDialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmJoinBtn}
                onPress={handleJoinByCode}
              >
                <Text style={styles.confirmJoinText}>ENTRAR A SALA</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  topBrand: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  topTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  keyBtn: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  keyBtnText: {
    color: THEME.colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  createBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
  },
  createBtnText: {
    color: '#00210B',
    fontSize: 11,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: THEME.colors.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  listSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  roomCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  roomCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomCodeBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  roomCodeText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  roomSport: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  roomTime: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.goldLight,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  roomVenue: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.cardElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
  },
  playersCount: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bracketBadge: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bracketText: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  enterBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.md,
  },
  enterBtnText: {
    color: '#00210B',
    fontSize: 11,
    fontWeight: '900',
  },
  joinDialog: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
    gap: 10,
  },
  joinDialogTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.goldLight,
  },
  joinDialogSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  joinInput: {
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    height: 48,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    color: THEME.colors.textPrimary,
  },
  joinDialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: THEME.colors.textMuted,
    fontWeight: '800',
    fontSize: 12,
  },
  confirmJoinBtn: {
    flex: 2,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  confirmJoinText: {
    color: '#00210B',
    fontWeight: '900',
    fontSize: 12,
  },
});
