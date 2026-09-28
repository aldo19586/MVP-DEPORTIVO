import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { THEME } from '../theme';

const STATUS_FILTERS = [
  { id: 'todos', label: 'Todas' },
  { id: 'FALTA_1', label: '🔥 ¡Falta 1!', isUrgent: true },
  { id: 'RECLUTANDO', label: '🟢 Convocando' },
  { id: 'EN_ACUERDO', label: '🟡 En Acuerdo' },
  { id: 'EN_CANCHA', label: '⚽ En Juego' }
];

export default function LobbyListScreen({ onEnterLobby, onCreateLobbyPress, userDistrict = 'Surco, Lima' }) {
  const [activeFilter, setActiveFilter] = useState('todos');
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [urgentNotice, setUrgentNotice] = useState(null);

  // Cargar salas desde la API del servidor
  const loadLobbies = useCallback(async () => {
    try {
      const res = await api.getLobbies({ sportId: 'futbol' });
      if (res && res.lobbies) {
        setLobbies(res.lobbies);

        // Detectar si hay alguna sala con FALTA_1 para el banner de urgencia
        const urgent = res.lobbies.find(l => l.status === 'FALTA_1');
        if (urgent) {
          setUrgentNotice(urgent);
        } else {
          setUrgentNotice(null);
        }
      }
    } catch (err) {
      console.log('[LOBBY LIST] Error cargando salas:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLobbies();

    // Suscribirse a eventos Socket.IO en tiempo real
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleLobbyListUpdated = (data) => {
      if (data && data.lobbies) {
        setLobbies(data.lobbies);
        const urgent = data.lobbies.find(l => l.status === 'FALTA_1');
        setUrgentNotice(urgent || null);
      }
    };

    const handleLobbyNeedsOne = (data) => {
      if (data && data.lobby) {
        setUrgentNotice(data.lobby);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {}
      }
    };

    socket.on('lobbyListUpdated', handleLobbyListUpdated);
    socket.on('lobbyNeedsOne', handleLobbyNeedsOne);

    return () => {
      socket.off('lobbyListUpdated', handleLobbyListUpdated);
      socket.off('lobbyNeedsOne', handleLobbyNeedsOne);
    };
  }, [loadLobbies]);

  const onRefresh = () => {
    setRefreshing(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    loadLobbies();
  };

  const handleJoinByCode = () => {
    if (!joinCodeInput.trim() || joinCodeInput.trim().length < 3) {
      Alert.alert('Código inválido', 'Ingresa el código de la sala (Ej. SUR-9182).');
      return;
    }
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    setShowJoinModal(false);
    onEnterLobby({ code: joinCodeInput.trim().toUpperCase() });
  };

  // Filtrado de salas
  const filteredLobbies = lobbies.filter((room) => {
    if (activeFilter === 'todos') return true;
    return room.status === activeFilter;
  });

  const countFalta1 = lobbies.filter(l => l.status === 'FALTA_1').length;

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
            onPress={() => {
              try { Haptics.selectionAsync(); } catch (e) {}
              setShowJoinModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.keyBtnText}>🔑 Código</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
              onCreateLobbyPress();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.createBtnText}>+ Crear Sala</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />
        }
      >
        {/* Banner de Urgencia Distrital: ¡FALTA 1 JUGADOR! */}
        {urgentNotice && (
          <TouchableOpacity
            style={styles.urgentBanner}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
              onEnterLobby(urgentNotice);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.urgentBannerLeft}>
              <View style={styles.flameIconBox}>
                <Text style={styles.flameIcon}>🔥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.urgentBadgeRow}>
                  <Text style={styles.urgentBadgeTag}>¡URGENTE • FALTA 1!</Text>
                  <Text style={styles.urgentDistrictText}>📍 {urgentNotice.district}</Text>
                </View>
                <Text style={styles.urgentTitleText} numberOfLines={1}>{urgentNotice.name}</Text>
                <Text style={styles.urgentSubText}>
                  {urgentNotice.currentPlayers}/{urgentNotice.totalSlots} jugadores • {urgentNotice.time}
                </Text>
              </View>
            </View>
            <View style={styles.urgentActionBtn}>
              <Text style={styles.urgentActionText}>TOMAR CUPO ⚡</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Filtros por Estado del Ciclo de Vida */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  f.isUrgent && !isActive && countFalta1 > 0 && styles.filterChipUrgent
                ]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (e) {}
                  setActiveFilter(f.id);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                  {f.id === 'FALTA_1' && countFalta1 > 0 ? ` (${countFalta1})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Listado de Salas */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {activeFilter === 'todos' ? 'TODAS LAS SALAS' : STATUS_FILTERS.find(f => f.id === activeFilter)?.label.toUpperCase()}
            </Text>
            <Text style={styles.roomsCountBadge}>{filteredLobbies.length} activas</Text>
          </View>

          {filteredLobbies.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⚽</Text>
              <Text style={styles.emptyTitle}>No hay salas en este estado</Text>
              <Text style={styles.emptySub}>
                Crea una nueva sala o cambia de filtro para ver otras convocatorias en Lima.
              </Text>
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={onCreateLobbyPress} activeOpacity={0.85}>
                <Text style={styles.emptyCreateBtnText}>+ Crear Convocatoria</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredLobbies.map((room) => {
              const quorum = Math.min(100, Math.floor((room.currentPlayers / room.totalSlots) * 100));
              const isUrgentOne = room.status === 'FALTA_1';
              const isInGame = room.status === 'EN_CANCHA';
              const isInAgreement = room.status === 'EN_ACUERDO';

              return (
                <TouchableOpacity
                  key={room.code}
                  style={[
                    styles.roomCard,
                    isUrgentOne && styles.roomCardUrgent,
                    isInGame && styles.roomCardInGame,
                    isInAgreement && styles.roomCardInAgreement
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
                    onEnterLobby(room);
                  }}
                  activeOpacity={0.85}
                >
                  {/* Top Header Card */}
                  <View style={styles.roomCardTop}>
                    <View style={styles.roomCodeBadge}>
                      <Text style={styles.roomCodeText}>#{room.code}</Text>
                    </View>

                    {/* Badge de Estado Dinámico */}
                    {isUrgentOne ? (
                      <View style={styles.badgeFalta1}>
                        <Text style={styles.badgeFalta1Text}>🔥 ¡ÚLTIMO CUPO! (FALTA 1)</Text>
                      </View>
                    ) : isInAgreement ? (
                      <View style={styles.badgeAgreement}>
                        <Text style={styles.badgeAgreementText}>🟡 EN ACUERDO (LLENO)</Text>
                      </View>
                    ) : isInGame ? (
                      <View style={styles.badgeInGame}>
                        <View style={styles.inGameDot} />
                        <Text style={styles.badgeInGameText}>⚽ EN JUEGO</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeRecruiting}>
                        <Text style={styles.badgeRecruitingText}>🟢 CONVOCANDO</Text>
                      </View>
                    )}

                    <Text style={styles.roomTime}>{room.time}</Text>
                  </View>

                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.roomVenue}>📍 {room.venue} • {room.district}</Text>

                  {/* Barra de Progreso de Quórum */}
                  <View style={styles.progressRow}>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${quorum}%` },
                          isUrgentOne && styles.fillUrgent,
                          isInAgreement && styles.fillAgreement,
                          isInGame && styles.fillInGame
                        ]}
                      />
                    </View>
                    <Text style={[styles.playersCount, isUrgentOne && styles.playersCountUrgent]}>
                      {room.currentPlayers}/{room.totalSlots} {isUrgentOne ? '⚡' : ''}
                    </Text>
                  </View>

                  {/* Pie de Tarjeta */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.formatBadge}>
                      <Text style={styles.formatBadgeText}>{room.formatName || room.formatId}</Text>
                    </View>

                    <View style={styles.actionBtn}>
                      <Text style={[styles.actionBtnText, isUrgentOne && styles.actionBtnTextUrgent]}>
                        {isUrgentOne
                          ? 'TOMAR CUPO ⚡'
                          : isInGame
                          ? 'VER PARTIDO 👁️'
                          : isInAgreement
                          ? 'VER SALA ➔'
                          : 'UNIRME ➔'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Modal de Código de Sala */}
        {showJoinModal && (
          <View style={styles.joinDialog}>
            <Text style={styles.joinDialogTitle}>🔑 UNIRSE CON CÓDIGO DE SALA</Text>
            <Text style={styles.joinDialogSub}>Ingresa el código compartido por el capitán:</Text>
            <TextInput
              style={styles.joinInput}
              placeholder="Ej. SUR-9182"
              placeholderTextColor={THEME.colors.textMuted}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              autoCapitalize="characters"
              maxLength={12}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  topBrand: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 1.5,
  },
  topTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  keyBtn: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  keyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  createBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.sm,
  },
  createBtnText: {
    color: '#00210B',
    fontSize: 11,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 14,
  },

  // BANNER DE URGENCIA DISTRITAL
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    gap: 10,
  },
  urgentBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flameIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameIcon: {
    fontSize: 20,
  },
  urgentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentBadgeTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  urgentDistrictText: {
    fontSize: 9.5,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  urgentTitleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  urgentSubText: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  urgentActionBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
  },
  urgentActionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },

  // FILTROS
  filtersScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterChipUrgent: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#00210B',
    fontWeight: '900',
  },

  // LISTADO DE SALAS
  listSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  roomsCountBadge: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  roomCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  roomCardUrgent: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  roomCardInAgreement: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
  },
  roomCardInGame: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
  },
  roomCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomCodeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roomCodeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
  badgeFalta1: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  badgeFalta1Text: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  badgeAgreement: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  badgeAgreementText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#06B6D4',
  },
  badgeInGame: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  inGameDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3B82F6',
  },
  badgeInGameText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#60A5FA',
  },
  badgeRecruiting: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  badgeRecruitingText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  roomTime: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roomVenue: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  fillUrgent: {
    backgroundColor: '#F59E0B',
  },
  fillAgreement: {
    backgroundColor: '#06B6D4',
  },
  fillInGame: {
    backgroundColor: '#3B82F6',
  },
  playersCount: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  playersCountUrgent: {
    color: '#F59E0B',
    fontWeight: '900',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  formatBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  actionBtnTextUrgent: {
    color: '#F59E0B',
    fontWeight: '900',
  },

  // EMPTY STATE
  emptyCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyCreateBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
    marginTop: 6,
  },
  emptyCreateBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00210B',
  },

  // DIALOGO CODIGO
  joinDialog: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    gap: 10,
    marginTop: 10,
  },
  joinDialogTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.6,
  },
  joinDialogSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  joinInput: {
    backgroundColor: '#0F172A',
    borderRadius: THEME.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    letterSpacing: 1,
  },
  joinDialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  confirmJoinBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
  },
  confirmJoinText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00210B',
  },
});
