import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  KeyboardAvoidingView,
  AppState
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { THEME } from '../theme';
import CompetitionChat from './CompetitionChat';

const formats = ['5v5', '6v6', '7v7', '9v9', '11v11'];
const requestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const dateLabel = value =>
  new Date(value).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

function Button({ title, onPress, disabled, secondary, primaryStyle, dangerStyle }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        primaryStyle && styles.primaryAction,
        dangerStyle && styles.dangerAction,
        disabled && { opacity: 0.45 }
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          primaryStyle && styles.primaryActionText,
          dangerStyle && styles.dangerActionText
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={THEME.colors.outline}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export default function CompetitionScreen({
  user,
  mine = false,
  onNavigateToPlay,
  initialCompetitionId = null,
  initialCode = null,
  onClearInitialTarget = null,
  onStartFootballTest = null
}) {
  const requireTestAlert = (actionDesc = 'participar en salas de convocatoria') => {
    if (!user?.hasCompletedTest) {
      Alert.alert(
        'Test de Calibración Requerido',
        `Debes realizar tu Test de Nivel antes de ${actionDesc}.`,
        [
          { text: 'Más tarde', style: 'cancel' },
          {
            text: 'Realizar Test Ahora ➔',
            onPress: () => {
              if (onStartFootballTest) onStartFootballTest();
            }
          }
        ]
      );
      return true;
    }
    return false;
  };

  const [page, setPage] = useState('list'); // 'list' | 'create' | 'details' | 'detail' | 'code' | 'filter' | 'chat'
  const [list, setList] = useState([]);
  const [room, setRoom] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [format, setFormat] = useState('5v5');
  const [districtQuery, setDistrictQuery] = useState('');
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState(null);
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [when, setWhen] = useState(null);
  const [picker, setPicker] = useState(null);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState(false);
  const [match, setMatch] = useState(null);
  const [manageRoles, setManageRoles] = useState(false);

  // Buscador y filtros tácticos Obsidian Pitch
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterStatusMode, setFilterStatusMode] = useState('all'); // 'all' | 'open' | 'today'
  const [filterDistrict, setFilterDistrict] = useState(null);
  const [filterMine, setFilterMine] = useState(mine);

  // Reporte de resultados / disputa
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  const pending = useRef(null);
  const mounted = useRef(true);
  const loadVersion = useRef(0);

  const refresh = async () => {
    const version = ++loadVersion.current;
    setError('');
    setLoading(true);
    try {
      const result = filterMine
        ? await api.myCompetitions()
        : await api.competitions(filterDistrict ? { districtId: String(filterDistrict.id) } : {});
      if (mounted.current && version === loadVersion.current) {
        setList(result.competitions || []);
      }
    } catch (e) {
      if (mounted.current && version === loadVersion.current) {
        setError(e.message || 'Error al cargar convocatorias.');
      }
    } finally {
      if (mounted.current && version === loadVersion.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [filterMine, filterDistrict]);

  useEffect(() => {
    if (!initialCompetitionId && !initialCode) return;
    let cancelled = false;

    const navigateToTarget = async () => {
      setBusy(true);
      setError('');
      try {
        let comp = null;
        if (initialCompetitionId) {
          const res = await api.competition(initialCompetitionId);
          comp = res?.competition;
        } else if (initialCode) {
          const res = await api.competitionByCode(initialCode);
          comp = res?.competition;
        }

        if (cancelled || !mounted.current) return;

        if (comp) {
          await open(comp);
        } else {
          Alert.alert(
            'Aviso',
            'La convocatoria no se encuentra disponible o ha sido finalizada.',
            [{ text: 'Entendido' }]
          );
        }
      } catch (e) {
        if (!cancelled && mounted.current) {
          Alert.alert(
            'Aviso',
            'No se pudo abrir el partido solicitado. Es posible que haya sido cancelado.',
            [{ text: 'Entendido' }]
          );
        }
      } finally {
        if (!cancelled && mounted.current) {
          setBusy(false);
          if (onClearInitialTarget) onClearInitialTarget();
        }
      }
    };

    navigateToTarget();
    return () => { cancelled = true; };
  }, [initialCompetitionId, initialCode]);

  useEffect(() => {
    if (page !== 'create' && page !== 'filter') return;
    let active = true;
    const timer = setTimeout(() => {
      api
        .getDistricts(districtQuery)
        .then(result => {
          if (active) setDistricts(result.districts || []);
        })
        .catch(e => {
          if (active) setError(e.message);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [districtQuery, page]);

  const open = async summary => {
    setBusy(true);
    setError('');
    try {
      const membership = await api.myCompetitions();
      const ownComp = (membership.competitions || []).find(item => item.id === summary.id);
      if (mounted.current) {
        setRoom(ownComp || summary);
        setManageRoles(false);
        setPage('detail');
      }
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const lookup = async () => {
    if (requireTestAlert('entrar a una sala de convocatoria')) return;
    if (!code || code.trim().length !== 8) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.competitionByCode(code.trim());
      await open(result.competition);
    } catch (e) {
      if (mounted.current) setError(e.message || 'Código de convocatoria no encontrado.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const command = async (name, body) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const fingerprint = JSON.stringify([name, body]);
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = { fingerprint, payload: { ...body, requestId: requestId() } };
    }
    try {
      const result = await api.competitionCommand(name, pending.current.payload);
      pending.current = null;
      if (!mounted.current) return;
      if (name === 'leave') {
        setRoom(null);
        setPage('list');
        await refresh();
      } else {
        setRoom(prev =>
          prev?.id === result.data.id && prev.revision > result.data.revision ? prev : result.data
        );
        setEditing(false);
        setPicker(null);
        setPage('detail');
      }
    } catch (e) {
      if (!mounted.current) return;
      if (e.code === 'REVISION_CONFLICT') {
        pending.current = null;
        try {
          const latest = await api.competitionByCode(body.code || room.code);
          const owned = await api.myCompetitions();
          setRoom(
            (owned.competitions || []).find(val => val.id === latest.competition.id) ||
              latest.competition
          );
        } catch {}
      }
      setError(e.message || 'Error al ejecutar la acción.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const own =
    !!room?.teamA && [...room.teamA, ...room.teamB].some(member => member.id === user.id);
  const isHost = room?.hostUserId === user.id;
  const preparing = !!room && ['OPEN', 'FULL'].includes(room.status);
  const myTeam = own
    ? room.teamA.some(member => member.id === user.id)
      ? 'teamA'
      : 'teamB'
    : null;
  const me = own ? room[myTeam].find(member => member.id === user.id) : null;
  const isCaptain = own && room?.captains?.[myTeam] === user.id;

  useEffect(() => {
    if (page !== 'list') return;
    const socket = socketService.getSocket();
    let timer;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 150);
    };
    socket?.on('competitionListUpdated', changed);
    socket?.on('connect', changed);
    const subscription = AppState.addEventListener('change', value => {
      if (value === 'active') changed();
    });
    return () => {
      clearTimeout(timer);
      socket?.off('competitionListUpdated', changed);
      socket?.off('connect', changed);
      subscription.remove();
    };
  }, [page, filterMine, filterDistrict]);

  useEffect(() => {
    if (!room?.id) return;
    const socket = socketService.getSocket();
    let active = true;
    const recover = async () => {
      try {
        const result = own
          ? await api.competition(room.id)
          : await api.competitionByCode(room.code);
        if (active) {
          setRoom(prev =>
            prev?.id === result.competition.id && prev.revision <= result.competition.revision
              ? result.competition
              : prev
          );
        }
      } catch (e) {
        if (active) {
          setError(e.message);
          if (e.status === 403 || e.status === 404) {
            setRoom(null);
            setPage('list');
          }
        }
      }
    };
    const updated = payload => {
      if (payload.competitionId === room.id) recover();
    };
    const publicUpdated = () => {
      if (!own) recover();
    };
    socket?.on('competitionUpdated', updated);
    socket?.on('competitionScoreReported', updated);
    socket?.on('competitionScoreConfirmed', updated);
    socket?.on('competitionScoreDisputed', updated);
    socket?.on('competitionDisputeResolved', updated);
    socket?.on('competitionListUpdated', publicUpdated);
    socket?.on('connect', recover);
    const subscription = AppState.addEventListener('change', value => {
      if (value === 'active') recover();
    });
    recover();
    return () => {
      active = false;
      socket?.off('competitionUpdated', updated);
      socket?.off('competitionScoreReported', updated);
      socket?.off('competitionScoreConfirmed', updated);
      socket?.off('competitionScoreDisputed', updated);
      socket?.off('competitionDisputeResolved', updated);
      socket?.off('competitionListUpdated', publicUpdated);
      socket?.off('connect', recover);
      subscription.remove();
    };
  }, [room?.id, own]);

  useEffect(() => {
    setMatch(null);
    if (!own || !room?.matchId || page !== 'detail') return;
    let active = true;
    api
      .competitionMatch(room.id)
      .then(result => {
        if (active) setMatch(result.match);
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [room?.matchId, room?.id, room?.revision, page, own]);

  const editDetails = () => {
    setFormat(room.formatId);
    setDistrict({ id: room.venue.districtId, label: room.district });
    setVenue(room.venue.name);
    setAddress(room.venue.address);
    setWhen(new Date(room.scheduledAt));
    setEditing(true);
    setError('');
    setPage('create');
  };

  const goList = () => {
    setPage('list');
    setRoom(null);
    setError('');
    refresh();
  };

  const payload = extra => ({
    competitionId: room.id,
    expectedRevision: room.revision,
    ...extra
  });

  const selectDate = (event, value) => {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type === 'dismissed') return;
    if (value) setWhen(value);
  };

  // Filtrado en memoria por búsqueda, formato y estado
  const visibleList = list.filter(item => {
    if (filterFormat && filterFormat !== 'all' && item.formatId !== filterFormat) {
      return false;
    }
    if (filterStatusMode === 'open' && item.status !== 'OPEN') {
      return false;
    }
    if (filterStatusMode === 'today' && item.scheduledAt) {
      const itemDay = new Date(item.scheduledAt).toDateString();
      const todayDay = new Date().toDateString();
      if (itemDay !== todayDay) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const vName = (item.venue?.name || '').toLowerCase();
      const dName = (item.district || '').toLowerCase();
      const cCode = (item.code || '').toLowerCase();
      if (!vName.includes(q) && !dName.includes(q) && !cCode.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const openCount = list.filter(c => c.status === 'OPEN').length;
  const inProgressCount = list.filter(c => c.status === 'IN_PROGRESS').length;

  if (page === 'chat' && own) {
    return <CompetitionChat room={room} user={user} onBack={() => setPage('detail')} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado contextual / Botón Volver en sub-páginas */}
        {page !== 'list' && (
          <View style={styles.subPageHeaderRow}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              onPress={() => (page === 'details' ? setPage('create') : goList())}
              style={styles.backIconButton}
            >
              <Text style={styles.backIconText}>←</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.subPageKicker}>CONVOCATORIA OFICIAL</Text>
              <Text style={styles.subPageTitle} numberOfLines={1}>
                {page === 'create' || page === 'details'
                  ? editing
                    ? 'EDITAR CONVOCATORIA'
                    : 'CREAR SALA DE JUEGO'
                  : page === 'detail'
                  ? `SALA #${room?.code || ''}`
                  : page === 'code'
                  ? 'INGRESAR CON PIN / CÓDIGO'
                  : 'ELEGIR UBICACIÓN'}
              </Text>
            </View>
          </View>
        )}

        {/* Mensajes de Error con opción de Reintento */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>
              ⚠️ {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={refresh}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {busy && <ActivityIndicator color={THEME.colors.neonPitch} size="small" />}

        {/* ========================================================
            VISTA LISTA: HUD Header, Quick Launchpad y Tarjetas Tácticas
            (Stitch: matchsport_tab_2_salas_lobbies_convocatorias)
            ======================================================== */}
        {page === 'list' && (
          <>
            {/* 1. HUD Header & Tactical Region Pill */}
            <View style={styles.hudHeaderSection}>
              <View style={styles.hudTitleRow}>
                <View style={styles.hudTitleLeft}>
                  <View style={styles.neonPulseDot} />
                  <Text style={styles.hudMainTitle}>SALAS DE JUEGO</Text>
                </View>

                <TouchableOpacity
                  style={styles.regionPill}
                  onPress={() => {
                    setDistrictQuery('');
                    setPage('filter');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.regionPillIcon}>🛰️</Text>
                  <Text style={styles.regionPillText} numberOfLines={1}>
                    {filterDistrict ? filterDistrict.label.split(',')[0].toUpperCase() : (user?.district || 'LIMA METROPOLITANA').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sub-tabs: Todas las Salas vs Mis Convocatorias */}
              <View style={styles.salasTabRow}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.salasTabBtn, !filterMine && styles.salasTabBtnActive]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setFilterMine(false);
                  }}
                >
                  <Text style={[styles.salasTabText, !filterMine && styles.salasTabTextActive]}>
                    TODAS LAS SALAS
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.salasTabBtn, filterMine && styles.salasTabBtnActive]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setFilterMine(true);
                  }}
                >
                  <Text style={[styles.salasTabText, filterMine && styles.salasTabTextActive]}>
                    MIS CONVOCATORIAS
                  </Text>
                </Pressable>
              </View>

              {/* Quick Action Launchpad: 8-col Crear Sala + 4-col Pin/Código */}
              <View style={styles.launchpadRow}>
                <TouchableOpacity
                  style={styles.createLobbyHeroBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
                    if (requireTestAlert('crear una convocatoria oficial')) return;
                    setError('');
                    setEditing(false);
                    setDistrict(null);
                    setPage('create');
                  }}
                >
                  <Text style={styles.createLobbyPlusIcon}>⊕</Text>
                  <Text style={styles.createLobbyHeroText}>CREAR SALA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pinCodeQuickBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (e) {}
                    setPage('code');
                  }}
                >
                  <Text style={styles.pinCodeKeyIcon}>🔑</Text>
                  <Text style={styles.pinCodeQuickText}>CÓDIGO</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Telemetry Live Ticker Strip */}
            <View style={styles.telemetryTicker}>
              <View style={styles.telemetryTickerLeft}>
                <Text style={styles.telemetryRadarIcon}>◎</Text>
                <Text style={styles.telemetryTickerText} numberOfLines={1}>
                  <Text style={styles.telemetryBold}>{list.length} Salas</Text> registradas •{' '}
                  <Text style={styles.telemetryNeon}>{openCount} abiertas</Text> •{' '}
                  {inProgressCount > 0 ? `${inProgressCount} en juego` : 'Glicko-2 Operativo'}
                </Text>
              </View>
              <TouchableOpacity onPress={refresh} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.telemetryRefreshIcon}>↻</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Tactical Search & Filter Pills Carousel */}
            <View style={styles.searchAndFilterBlock}>
              <View style={styles.searchFieldBox}>
                <Text style={styles.searchFieldIcon}>🔍</Text>
                <TextInput
                  style={styles.searchFieldInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar cancha, distrito o código de sala..."
                  placeholderTextColor={THEME.colors.outline}
                />
                {searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchIconBtn}>
                    <Text style={styles.clearSearchIconText}>✕</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.tuneInlineBtn, (showFilters || filterDistrict) && styles.tuneInlineBtnActive]}
                  onPress={() => setShowFilters(v => !v)}
                >
                  <Text style={styles.tuneInlineIcon}>⚙️</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Pills Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillsCarousel}
              >
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    filterStatusMode === 'all' && filterFormat === 'all' && styles.filterPillActive
                  ]}
                  onPress={() => {
                    setFilterStatusMode('all');
                    setFilterFormat('all');
                  }}
                >
                  <View style={[
                    styles.filterPillDot,
                    filterStatusMode === 'all' && filterFormat === 'all' && styles.filterPillDotActive
                  ]} />
                  <Text style={[
                    styles.filterPillText,
                    filterStatusMode === 'all' && filterFormat === 'all' && styles.filterPillTextActive
                  ]}>
                    Todas ({list.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, filterStatusMode === 'open' && styles.filterPillActive]}
                  onPress={() => setFilterStatusMode(prev => (prev === 'open' ? 'all' : 'open'))}
                >
                  <Text style={styles.filterPillEmoji}>⚡</Text>
                  <Text style={[styles.filterPillText, filterStatusMode === 'open' && styles.filterPillTextActive]}>
                    Abiertas ({openCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, filterStatusMode === 'today' && styles.filterPillActive]}
                  onPress={() => setFilterStatusMode(prev => (prev === 'today' ? 'all' : 'today'))}
                >
                  <Text style={styles.filterPillEmoji}>📅</Text>
                  <Text style={[styles.filterPillText, filterStatusMode === 'today' && styles.filterPillTextActive]}>
                    Hoy
                  </Text>
                </TouchableOpacity>

                {formats.map(f => {
                  const activeFmt = filterFormat === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterPill, activeFmt && styles.filterPillActive]}
                      onPress={() => setFilterFormat(prev => (prev === f ? 'all' : f))}
                    >
                      <Text style={styles.filterPillEmoji}>⚽</Text>
                      <Text style={[styles.filterPillText, activeFmt && styles.filterPillTextActive]}>
                        Fútbol {f.split('v')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Panel desplegable de filtro por distrito nacional */}
              {showFilters && (
                <View style={styles.filtersPanel}>
                  <View style={styles.filterDistrictRow}>
                    <Text style={styles.filterSectionTitle}>
                      DISTRITO: {filterDistrict ? filterDistrict.label.toUpperCase() : 'TODO EL PERÚ'}
                    </Text>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={styles.districtSelectMiniBtn}
                        onPress={() => {
                          setDistrictQuery('');
                          setPage('filter');
                        }}
                      >
                        <Text style={styles.districtSelectMiniText}>📍 Elegir Distrito</Text>
                      </TouchableOpacity>
                      {filterDistrict && (
                        <TouchableOpacity
                          style={styles.districtClearMiniBtn}
                          onPress={() => setFilterDistrict(null)}
                        >
                          <Text style={styles.districtClearMiniText}>Ver Todo ✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 4. Estado de Carga, Vacío o Lista Táctica de Convocatorias */}
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={THEME.colors.neonPitch} />
                <Text style={styles.loadingText}>
                  {filterMine
                    ? 'Cargando tus convocatorias e inscripciones...'
                    : 'Sincronizando salas de juego activas...'}
                </Text>
              </View>
            ) : visibleList.length === 0 && !error ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>{filterMine ? '🏟️' : '⚽'}</Text>
                <Text style={styles.emptyTitle}>
                  {filterMine
                    ? 'Aún no tienes convocatorias activas'
                    : 'No hay salas abiertas con estos filtros'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {filterMine
                    ? 'Cuando te unas a una sala o crees una convocatoria, aparecerá aquí para coordinar equipos, usar el chat y reportar goles.'
                    : filterDistrict || filterFormat !== 'all' || searchQuery
                    ? 'Prueba quitando los filtros activos o crea la primera sala en tu distrito.'
                    : 'Sé el primero en abrir una sala táctica y comparte el código de 8 caracteres con tu escuadra.'}
                </Text>
                <View style={{ gap: 8, marginTop: 12, width: '100%' }}>
                  <Button
                    title="+ Crear Sala de Convocatoria"
                    primaryStyle
                    onPress={() => {
                      if (requireTestAlert('crear una convocatoria oficial')) return;
                      setError('');
                      setEditing(false);
                      setDistrict(null);
                      setPage('create');
                    }}
                  />
                  <Button
                    title="🔑 Ingresar con Código de 8 Caracteres"
                    secondary
                    onPress={() => setPage('code')}
                  />
                  {(filterDistrict || filterFormat !== 'all' || filterStatusMode !== 'all' || searchQuery) && (
                    <Button
                      title="Limpiar todos los filtros"
                      secondary
                      onPress={() => {
                        setFilterDistrict(null);
                        setFilterFormat('all');
                        setFilterStatusMode('all');
                        setSearchQuery('');
                      }}
                    />
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.cardsColumn}>
                {visibleList.map(value => {
                  const isMember =
                    (value.teamA || []).some(m => m.id === user.id) ||
                    (value.teamB || []).some(m => m.id === user.id);
                  const teamKey = isMember
                    ? (value.teamA || []).some(m => m.id === user.id)
                      ? 'teamA'
                      : 'teamB'
                    : null;
                  const isCap = isMember && value.captains && value.captains[teamKey] === user.id;

                  const playersCount =
                    value.currentPlayers ??
                    ((value.teamA?.length || 0) + (value.teamB?.length || 0));
                  const totalSlots =
                    value.totalSlots ?? ((value.playersPerTeam || 5) * 2);
                  const slotsLeft = Math.max(0, totalSlots - playersCount);
                  const isUrgentOneLeft = value.status === 'OPEN' && slotsLeft === 1;
                  const fillPercentage = Math.min(100, Math.round((playersCount / Math.max(1, totalSlots)) * 100));

                  let actionLabel = 'VER DETALLES ➔';
                  let isPrimaryAction = false;
                  let statusBadgeText = 'CONVOCANDO';
                  let badgeStyle = styles.badgeOpen;
                  let badgeTextStyle = styles.badgeOpenText;

                  if (value.status === 'FINISHED') {
                    statusBadgeText = 'FINALIZADO';
                    badgeStyle = styles.badgeFinished;
                    badgeTextStyle = styles.badgeFinishedText;
                    actionLabel = `RESULTADO (${value.finalScore ? `${value.finalScore.teamA}-${value.finalScore.teamB}` : 'FINAL'}) ➔`;
                  } else if (value.status === 'DISPUTED') {
                    statusBadgeText = '⚖️ DISPUTA ARBITRAL';
                    badgeStyle = styles.badgeDisputed;
                    badgeTextStyle = styles.badgeDisputedText;
                    actionLabel = 'REVISAR DISPUTA ➔';
                    isPrimaryAction = true;
                  } else if (value.status === 'RESULT_PENDING') {
                    statusBadgeText = 'MARCADOR PENDIENTE';
                    badgeStyle = styles.badgePending;
                    badgeTextStyle = styles.badgePendingText;
                    if (isCap && value.report?.reportedTeam !== teamKey) {
                      actionLabel = '⚠️ VALIDAR MARCADOR ➔';
                      isPrimaryAction = true;
                    } else {
                      actionLabel = 'VER MARCADOR ➔';
                    }
                  } else if (value.status === 'IN_PROGRESS') {
                    statusBadgeText = '⚽ EN JUEGO';
                    badgeStyle = styles.badgePlaying;
                    badgeTextStyle = styles.badgePlayingText;
                    if (isCap) {
                      actionLabel = 'REPORTAR GOLES ➔';
                      isPrimaryAction = true;
                    } else {
                      actionLabel = 'ENTRAR AL PARTIDO ➔';
                      isPrimaryAction = true;
                    }
                  } else if (value.status === 'CANCELLED') {
                    statusBadgeText = 'CANCELADA';
                    badgeStyle = styles.badgeCancelled;
                    badgeTextStyle = styles.badgeCancelledText;
                    actionLabel = 'VER MOTIVO ➔';
                  } else if (value.status === 'FULL') {
                    statusBadgeText = 'CUPOS COMPLETOS';
                    badgeStyle = styles.badgeFull;
                    badgeTextStyle = styles.badgeFullText;
                    if (isMember) {
                      actionLabel = 'COORDINAR SALA ➔';
                      isPrimaryAction = true;
                    } else {
                      actionLabel = 'SALA COMPLETA ➔';
                    }
                  } else {
                    statusBadgeText = isUrgentOneLeft ? '🔥 URGENTE: FALTA 1' : `ABIERTA · ${playersCount}/${totalSlots}`;
                    if (isUrgentOneLeft) {
                      badgeStyle = styles.badgeUrgent;
                      badgeTextStyle = styles.badgeUrgentText;
                    }
                    if (isMember) {
                      actionLabel = `MI SALA (${slotsLeft > 0 ? `FALTAN ${slotsLeft}` : 'LISTA'}) ➔`;
                      isPrimaryAction = true;
                    } else {
                      actionLabel = `UNIRSE (${slotsLeft} ${slotsLeft === 1 ? 'CUPO' : 'CUPOS'}) ➔`;
                      isPrimaryAction = true;
                    }
                  }

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={value.id}
                      onPress={() => open(value)}
                      disabled={busy}
                      style={[styles.lobbyCard, isUrgentOneLeft && styles.lobbyCardUrgent]}
                    >
                      {/* Barra lateral luminosa izquierda */}
                      <View
                        style={[
                          styles.cardLeftAccent,
                          isUrgentOneLeft && { backgroundColor: THEME.colors.coralError },
                          value.status === 'FINISHED' && { backgroundColor: THEME.colors.outline }
                        ]}
                      />

                      <View style={styles.lobbyCardInner}>
                        {/* Fila 1: Formato + Estado + Fecha/Hora */}
                        <View style={styles.cardHeaderBadgesRow}>
                          <View style={styles.cardBadgesLeft}>
                            <View style={styles.formatPill}>
                              <Text style={styles.formatPillText}>
                                FÚTBOL {value.formatId?.split('v')[0] || '5'}
                              </Text>
                            </View>

                            <View style={[styles.statusBadge, badgeStyle]}>
                              <Text style={[styles.statusBadgeText, badgeTextStyle]}>
                                {statusBadgeText}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.codeTagSmall}>#{value.code}</Text>
                        </View>

                        {/* Fila 2: Nombre de Cancha y Distrito */}
                        <View style={styles.venueInfoBlock}>
                          <Text style={styles.venueHeading} numberOfLines={1}>
                            {value.venue?.name || 'Cancha por definir'}
                          </Text>
                          <Text style={styles.venueLocationSub} numberOfLines={1}>
                            🏟️ {value.district || value.venue?.address || 'Lima'} • ⏰ {dateLabel(value.scheduledAt)}
                          </Text>
                        </View>

                        {/* Fila 3: Barra de Progreso de Cupos */}
                        <View style={styles.slotsProgressBlock}>
                          <View style={styles.slotsProgressLabelsRow}>
                            <Text style={styles.slotsConfirmedText}>
                              Convocatoria: {playersCount} / {totalSlots} confirmados
                            </Text>
                            <Text style={styles.slotsRemainingText}>
                              {slotsLeft > 0 ? `${slotsLeft} vacantes` : 'Equipos llenos'}
                            </Text>
                          </View>
                          <View style={styles.slotsProgressBarBg}>
                            <View
                              style={[
                                styles.slotsProgressBarFill,
                                { width: `${fillPercentage}%` },
                                isUrgentOneLeft && { backgroundColor: THEME.colors.neonPitch }
                              ]}
                            />
                          </View>
                        </View>

                        {/* Fila 4: Telemetría Glicko-2 + Botón de Acción Primaria */}
                        <View style={styles.cardFooterRow}>
                          <View style={styles.cardFooterMeta}>
                            <Text style={styles.cardMetaOverline}>SISTEMA</Text>
                            <Text style={styles.cardMetaValue}>
                              {isMember ? '✓ Inscrito en Sala' : 'Glicko-2 Oficial'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.cardCtaBtn,
                              isPrimaryAction ? styles.cardCtaBtnPrimary : styles.cardCtaBtnSecondary
                            ]}
                            onPress={() => open(value)}
                            disabled={busy}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.cardCtaBtnText,
                                isPrimaryAction ? styles.cardCtaBtnTextPrimary : styles.cardCtaBtnTextSecondary
                              ]}
                            >
                              {actionLabel}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* 5. Radar Telemetry Widget (Acceso rápido a Radar Jugar) */}
            {onNavigateToPlay && (
              <TouchableOpacity
                style={styles.radarWidgetCard}
                onPress={onNavigateToPlay}
                activeOpacity={0.85}
              >
                <View style={styles.radarWidgetLeft}>
                  <View style={styles.radarWidgetCircle}>
                    <Text style={styles.radarWidgetIcon}>◎</Text>
                  </View>
                  <View>
                    <Text style={styles.radarWidgetTitle}>Radar MatchSport Glicko-2</Text>
                    <Text style={styles.radarWidgetSub}>
                      ¿Buscas partido inmediato? Activa el radar automático
                    </Text>
                  </View>
                </View>
                <Text style={styles.radarWidgetArrow}>➔</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ========================================================
            VISTA UNIRME POR CÓDIGO (PIN DE 8 CARACTERES)
            ======================================================== */}
        {page === 'code' && (
          <View style={styles.codeContainer}>
            <Field
              label="Ingresa el código de 8 caracteres de la convocatoria"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              placeholder="Ej. A1B2C3D4"
              maxLength={8}
            />
            <Button
              title="BUSCAR Y ENTRAR A LA SALA ➔"
              primaryStyle
              disabled={busy || code.trim().length !== 8}
              onPress={lookup}
            />
          </View>
        )}

        {/* ========================================================
            VISTA CREAR / FILTRAR / DETALLES DE CANCHA
            ======================================================== */}
        {(page === 'create' || page === 'filter' || page === 'details') && (
          <View style={styles.formSectionCard}>
            {page === 'create' && (
              <>
                <Text style={styles.label}>MODALIDAD DE FÚTBOL</Text>
                <View style={styles.row}>
                  {formats.map(value => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.formatOptionBtn,
                        format === value && styles.formatOptionBtnActive
                      ]}
                      onPress={() => setFormat(value)}
                      disabled={busy}
                    >
                      <Text
                        style={[
                          styles.formatOptionText,
                          format === value && styles.formatOptionTextActive
                        ]}
                      >
                        Fútbol {value.split('v')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {page === 'create' && district && (
              <Button
                title={`Continuar con ${district.label} ➔`}
                primaryStyle
                onPress={() => setPage('details')}
              />
            )}

            {page !== 'details' && (
              <Field
                label="BUSCAR DISTRITO, PROVINCIA O DEPARTAMENTO"
                value={districtQuery}
                onChangeText={setDistrictQuery}
                placeholder="Escribe para filtrar distritos..."
              />
            )}

            {page === 'details' && district ? (
              <View style={styles.selectedDistrictBanner}>
                <Text style={styles.selectedDistrictText}>📍 Ubicación: {district.label}</Text>
              </View>
            ) : null}

            {(page === 'details' ? [] : districts.slice(0, 8)).map(value => (
              <Pressable
                key={value.id}
                disabled={busy}
                style={styles.districtResultCard}
                onPress={() => {
                  if (page === 'filter') {
                    setFilterDistrict(value);
                    setPage('list');
                  } else {
                    setDistrict(value);
                    setDistricts([]);
                    setPage('details');
                  }
                }}
              >
                <Text style={styles.text}>📍 {value.label}</Text>
                <Text style={styles.districtPickArrow}>Elegir ➔</Text>
              </Pressable>
            ))}

            {page === 'filter' && (
              <Button
                title="Ver todo el país (sin filtro de distrito)"
                secondary
                onPress={() => {
                  setFilterDistrict(null);
                  setPage('list');
                }}
              />
            )}

            {page === 'details' && district && (
              <>
                <Field
                  label="NOMBRE DEL COMPLEJO DEPORTIVO / CANCHA"
                  value={venue}
                  onChangeText={setVenue}
                  placeholder="Ej. Cancha Gol Surco • Sintética 2"
                  maxLength={120}
                  editable={!busy}
                />
                <Field
                  label="DIRECCIÓN EXACTA"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Ej. Av. Caminos del Inca 1420"
                  maxLength={240}
                  editable={!busy}
                />
                <Text style={styles.muted}>
                  Horario oficial de Perú. Coordina previamente la disponibilidad del campo.
                </Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={when ? dateLabel(when) : '📅 Elegir fecha'}
                      secondary
                      disabled={busy}
                      onPress={() => setPicker('date')}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="⏰ Elegir hora"
                      secondary
                      disabled={busy}
                      onPress={() => setPicker('time')}
                    />
                  </View>
                </View>
                {picker && (
                  <>
                    <DateTimePicker
                      value={when || new Date()}
                      mode={picker}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      timeZoneName="America/Lima"
                      themeVariant="dark"
                      onChange={selectDate}
                    />
                    <Button title="Confirmar Fecha / Hora" secondary onPress={() => setPicker(null)} />
                  </>
                )}
                <Button
                  title={editing ? 'GUARDAR CAMBIOS' : 'CREAR Y OBTENER CÓDIGO DE SALA'}
                  primaryStyle
                  disabled={busy || !venue.trim() || !address.trim() || !when}
                  onPress={() => {
                    const fields = {
                      formatId: format,
                      scheduledAt: when.toISOString(),
                      timeZone: 'America/Lima',
                      venue: {
                        name: venue.trim(),
                        address: address.trim(),
                        districtId: String(district.id)
                      }
                    };
                    command(
                      editing ? 'updateDetails' : 'create',
                      editing
                        ? payload(fields)
                        : { countryCode: 'PE', sportId: 'futbol', ...fields }
                    );
                  }}
                />
              </>
            )}
          </View>
        )}

        {/* ========================================================
            VISTA DETALLE: Sala de Convocatoria Activa (Tactical Pitch Split View)
            (Stitch: matchsport_lobbyroomscreen_sala_de_convocatoria_activa)
            ======================================================== */}
        {page === 'detail' && room && (
          <>
            {/* 1. Top Match Atmosphere Context Card */}
            <View style={styles.roomHeaderCard}>
              <View style={styles.cardHeaderBadgesRow}>
                <View style={styles.formatPill}>
                  <Text style={styles.formatPillText}>
                    FÚTBOL {room.formatId?.split('v')[0] || '5'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.copyCodePillBtn}
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(room.code);
                      Alert.alert('Código Copiado', `Código #${room.code} copiado al portapapeles.`);
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  <Text style={styles.copyCodePillText}>#{room.code} 📋</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.detailVenueTitle}>{room.venue?.name}</Text>
              <Text style={styles.muted}>
                📍 {room.venue?.address} · {room.district}
              </Text>

              <View style={styles.detailTimeAndStatusRow}>
                <View style={styles.detailScheduleBadge}>
                  <Text style={styles.detailScheduleText}>⏰ {dateLabel(room.scheduledAt)}</Text>
                </View>
                <View style={styles.detailStateBadge}>
                  <Text style={styles.detailStateText}>
                    {room.status === 'CANCELLED'
                      ? 'CANCELADA'
                      : room.status === 'IN_PROGRESS'
                      ? '⚽ EN JUEGO'
                      : room.status === 'RESULT_PENDING'
                      ? 'CONFIRMANDO MARCADOR'
                      : room.status === 'DISPUTED'
                      ? '⚖️ EN DISPUTA'
                      : room.status === 'FINISHED'
                      ? '🏆 FINALIZADO'
                      : room.status === 'FULL'
                      ? 'CUPOS COMPLETOS'
                      : 'SALA DE ESPERA'}
                  </Text>
                </View>
              </View>

              {/* Quick Room Actions: Copiar, Compartir & Chat */}
              <View style={styles.detailQuickActionsBar}>
                {own ? (
                  <TouchableOpacity
                    style={styles.openChatNeonBtn}
                    onPress={() => setPage('chat')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.openChatNeonIcon}>💬</Text>
                    <Text style={styles.openChatNeonText}>CANAL TÁCTICO / CHAT EN VIVO</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.guestNoticePill}>
                    <Text style={styles.guestNoticeText}>Únete a un equipo para activar el chat</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.shareLinkBtn}
                  onPress={() =>
                    Share.share({
                      message: `MatchSport · Fútbol ${room.formatId?.split('v')[0]}\n${room.venue?.name}, ${room.district}\n${dateLabel(room.scheduledAt)} (Perú)\nCódigo: ${room.code}`
                    }).catch(e => setError(e.message))
                  }
                >
                  <Text style={styles.shareLinkBtnText}>📤 Invitar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {match && (
              <View style={styles.matchNoticeBox}>
                <Text style={styles.text}>
                  ⚽ Partido oficial iniciado el {dateLabel(match.startedAt)}. Alineaciones bloqueadas.
                </Text>
              </View>
            )}

            {/* Resultado Final Oficial */}
            {room.status === 'FINISHED' && (
              <View style={[styles.sectionCard, { borderColor: THEME.colors.neonPitch, borderWidth: 1.5 }]}>
                <Text style={styles.heading}>🏆 Resultado Oficial Confirmado</Text>
                <Text style={styles.finalScoreBig}>
                  {room.finalScore ? `${room.finalScore.teamA} - ${room.finalScore.teamB}` : '-'}
                </Text>
                <Text style={[styles.text, { textAlign: 'center', fontWeight: '800' }]}>
                  {room.outcome === 'draw'
                    ? '🤝 Empate Oficial'
                    : room.outcome === 'teamA'
                    ? '🏆 Victoria Equipo A'
                    : '🏆 Victoria Equipo B'}
                </Text>
                {room.ratingUpdates && room.ratingUpdates[user.id] && (
                  <Text style={[styles.muted, { textAlign: 'center', marginTop: 4, color: THEME.colors.neonPitch }]}>
                    Tu nuevo rating Glicko-2: {Math.round(room.ratingUpdates[user.id].newRating)} (
                    {room.ratingUpdates[user.id].ratingChange >= 0 ? '+' : ''}
                    {Math.round(room.ratingUpdates[user.id].ratingChange)} pts)
                  </Text>
                )}
                {room.resolvedBy && (
                  <Text style={[styles.muted, { textAlign: 'center', fontSize: 12, marginTop: 4 }]}>
                    Dictamen SuperAdmin: {room.resolutionReason}
                  </Text>
                )}
              </View>
            )}

            {/* Disputa Arbitral en Revisión */}
            {room.status === 'DISPUTED' && (
              <View style={[styles.sectionCard, { borderColor: THEME.colors.gold, borderWidth: 1.5 }]}>
                <Text style={styles.heading}>⚖️ Disputa Arbitral en Revisión</Text>
                <Text style={styles.text}>
                  {room.dispute?.reason || 'Discrepancia en el marcador reportado'}
                </Text>
                <Text style={styles.muted}>
                  El SuperAdmin está evaluando el acta congelada para emitir el dictamen oficial.
                </Text>
              </View>
            )}

            {/* Marcador Pendiente de Confirmación */}
            {room.status === 'RESULT_PENDING' && (
              <View style={[styles.sectionCard, { borderColor: '#06b6d4', borderWidth: 1.5 }]}>
                <Text style={styles.heading}>⚽ Marcador Reportado</Text>
                <Text style={styles.text}>
                  Capitán {room.report?.reportedTeam === 'teamA' ? 'Equipo A' : 'Equipo B'} reportó:{' '}
                  {room.report?.score?.teamA} - {room.report?.score?.teamB}
                </Text>
                {isCaptain && room.report?.reportedTeam !== myTeam ? (
                  <>
                    <Button
                      title={`✓ Confirmar resultado (${room.report?.score?.teamA} - ${room.report?.score?.teamB})`}
                      primaryStyle
                      disabled={busy}
                      onPress={() =>
                        command('confirmScore', payload({ reportId: room.report?.reportId }))
                      }
                    />
                    <Field
                      label="MOTIVO SI HAY DISCREPANCIA"
                      value={disputeReason}
                      onChangeText={setDisputeReason}
                      placeholder="Describe el marcador correcto..."
                      maxLength={200}
                    />
                    <Button
                      title="⚖️ Disputar marcador"
                      dangerStyle
                      disabled={busy || !disputeReason.trim()}
                      onPress={() =>
                        command(
                          'disputeScore',
                          payload({
                            reportId: room.report?.reportId,
                            reason: disputeReason.trim()
                          })
                        )
                      }
                    />
                  </>
                ) : (
                  <Text style={styles.muted}>
                    {room.report?.reportedTeam === myTeam
                      ? 'Esperando confirmación del capitán rival...'
                      : 'Esperando validación cruzada de los capitanes.'}
                  </Text>
                )}
              </View>
            )}

            {/* Reportar Marcador (Solo Capitán en Partido IN_PROGRESS) */}
            {room.status === 'IN_PROGRESS' && isCaptain && (
              <View style={styles.sectionCard}>
                <Text style={styles.heading}>⚽ Reportar Marcador Final</Text>
                <Text style={styles.muted}>Como capitán, ingresa los goles al terminar el partido:</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="GOLES EQUIPO A"
                      value={scoreA}
                      onChangeText={setScoreA}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="GOLES EQUIPO B"
                      value={scoreB}
                      onChangeText={setScoreB}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
                <Button
                  title="ENVIAR MARCADOR OFICIAL"
                  primaryStyle
                  disabled={
                    busy ||
                    scoreA === '' ||
                    scoreB === '' ||
                    isNaN(Number(scoreA)) ||
                    isNaN(Number(scoreB))
                  }
                  onPress={() =>
                    command(
                      'reportScore',
                      payload({
                        score: { teamA: Number(scoreA), teamB: Number(scoreB) }
                      })
                    )
                  }
                />
              </View>
            )}

            {/* 2. Tactical Pitch Split View (Equipo A Esmeralda vs Equipo B Coral) */}
            <View style={styles.tacticalPitchContainer}>
              {/* Team A Header & Lineup */}
              <View style={styles.teamSectionBlock}>
                <View style={styles.teamHeaderBarA}>
                  <View style={styles.teamHeaderLeft}>
                    <View style={styles.teamCircleA}>
                      <Text style={styles.teamCircleTextA}>A</Text>
                    </View>
                    <View>
                      <Text style={styles.teamNameTitle}>Equipo A · Esmeralda</Text>
                      <Text style={styles.teamCountSubA}>
                        {(room.teamA || []).length}/{room.playersPerTeam} convocados
                      </Text>
                    </View>
                  </View>
                  <View style={styles.teamOvrRight}>
                    <Text style={styles.teamOvrLabel}>CAPITÁN</Text>
                    <Text style={styles.teamOvrValA}>
                      {(room.teamA || []).find(m => m.id === room.captains?.teamA)?.name?.split(' ')[0] || 'Por asignar'}
                    </Text>
                  </View>
                </View>

                {(room.teamA || []).map((member, idx) => {
                  const isCap = room.captains?.teamA === member.id;
                  return (
                    <View key={member.id} style={styles.slotRowCard}>
                      <View style={styles.slotRowLeft}>
                        <View style={styles.dorsalCircleA}>
                          <Text style={styles.dorsalTextA}>
                            {String(idx + 1).padStart(2, '0')}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.playerNameWithCapRow}>
                            <Text style={styles.slotPlayerName} numberOfLines={1}>
                              {member.name}
                            </Text>
                            {isCap && (
                              <View style={styles.capBadgeA}>
                                <Text style={styles.capBadgeTextA}>CAP</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.slotPlayerMeta}>
                            {member.id === room.hostUserId ? 'Anfitrión de Sala' : 'Titular Confirmado'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.readyStatusTag, member.ready ? styles.readyTagOn : styles.readyTagOff]}>
                        <Text style={[styles.readyStatusTagText, member.ready ? styles.readyTextOn : styles.readyTextOff]}>
                          {member.ready ? '✓ LISTO' : '⭮ EQUIPANDO'}
                        </Text>
                      </View>

                      {preparing && manageRoles && member.id !== user.id && (
                        <View style={styles.transferBtnsRow}>
                          {isHost && (
                            <TouchableOpacity
                              style={styles.transferMiniBtn}
                              disabled={busy}
                              onPress={() => command('transferHost', payload({ targetUserId: member.id }))}
                            >
                              <Text style={styles.transferMiniText}>Dar Host</Text>
                            </TouchableOpacity>
                          )}
                          {room.captains?.teamA === user.id && (
                            <TouchableOpacity
                              style={styles.transferMiniBtn}
                              disabled={busy}
                              onPress={() => command('transferCaptain', payload({ targetUserId: member.id }))}
                            >
                              <Text style={styles.transferMiniText}>Dar CAP</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {!own && preparing && (room.teamACount ?? room.teamA?.length ?? 0) < room.playersPerTeam && (
                  <TouchableOpacity
                    style={styles.joinSlotGhostBtnA}
                    disabled={busy}
                    onPress={() => {
                      if (requireTestAlert('unirte a un equipo en la sala')) return;
                      command('join', {
                        code: room.code,
                        team: 'teamA',
                        expectedRevision: room.revision
                      });
                    }}
                  >
                    <Text style={styles.joinSlotGhostTextA}>
                      + Unirme como Titular al Equipo A ({room.teamACount ?? room.teamA?.length ?? 0}/{room.playersPerTeam})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* VS Center Pitch Divider Module */}
              <View style={styles.vsCenterDivider}>
                <View style={styles.vsCenterLine} />
                <View style={styles.vsCenterPill}>
                  <Text style={styles.vsSideTextA}>EQ. A</Text>
                  <View style={styles.vsCoreBox}>
                    <Text style={styles.vsCoreText}>VS</Text>
                  </View>
                  <Text style={styles.vsSideTextB}>EQ. B</Text>
                </View>
              </View>

              {/* Team B Header & Lineup */}
              <View style={styles.teamSectionBlock}>
                <View style={styles.teamHeaderBarB}>
                  <View style={styles.teamHeaderLeft}>
                    <View style={styles.teamCircleB}>
                      <Text style={styles.teamCircleTextB}>B</Text>
                    </View>
                    <View>
                      <Text style={styles.teamNameTitle}>Equipo B · Furia Coral</Text>
                      <Text style={styles.teamCountSubB}>
                        {(room.teamB || []).length}/{room.playersPerTeam} convocados
                      </Text>
                    </View>
                  </View>
                  <View style={styles.teamOvrRight}>
                    <Text style={styles.teamOvrLabel}>CAPITÁN</Text>
                    <Text style={styles.teamOvrValB}>
                      {(room.teamB || []).find(m => m.id === room.captains?.teamB)?.name?.split(' ')[0] || 'Por asignar'}
                    </Text>
                  </View>
                </View>

                {(room.teamB || []).map((member, idx) => {
                  const isCap = room.captains?.teamB === member.id;
                  return (
                    <View key={member.id} style={styles.slotRowCard}>
                      <View style={styles.slotRowLeft}>
                        <View style={styles.dorsalCircleB}>
                          <Text style={styles.dorsalTextB}>
                            {String(idx + 1).padStart(2, '0')}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.playerNameWithCapRow}>
                            <Text style={styles.slotPlayerName} numberOfLines={1}>
                              {member.name}
                            </Text>
                            {isCap && (
                              <View style={styles.capBadgeB}>
                                <Text style={styles.capBadgeTextB}>CAP</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.slotPlayerMeta}>
                            {member.id === room.hostUserId ? 'Anfitrión de Sala' : 'Titular Confirmado'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.readyStatusTag, member.ready ? styles.readyTagOnB : styles.readyTagOff]}>
                        <Text style={[styles.readyStatusTagText, member.ready ? styles.readyTextOnB : styles.readyTextOff]}>
                          {member.ready ? '✓ LISTO' : '⭮ EQUIPANDO'}
                        </Text>
                      </View>

                      {preparing && manageRoles && member.id !== user.id && (
                        <View style={styles.transferBtnsRow}>
                          {isHost && (
                            <TouchableOpacity
                              style={styles.transferMiniBtn}
                              disabled={busy}
                              onPress={() => command('transferHost', payload({ targetUserId: member.id }))}
                            >
                              <Text style={styles.transferMiniText}>Dar Host</Text>
                            </TouchableOpacity>
                          )}
                          {room.captains?.teamB === user.id && (
                            <TouchableOpacity
                              style={styles.transferMiniBtn}
                              disabled={busy}
                              onPress={() => command('transferCaptain', payload({ targetUserId: member.id }))}
                            >
                              <Text style={styles.transferMiniText}>Dar CAP</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {!own && preparing && (room.teamBCount ?? room.teamB?.length ?? 0) < room.playersPerTeam && (
                  <TouchableOpacity
                    style={styles.joinSlotGhostBtnB}
                    disabled={busy}
                    onPress={() => {
                      if (requireTestAlert('unirte a un equipo en la sala')) return;
                      command('join', {
                        code: room.code,
                        team: 'teamB',
                        expectedRevision: room.revision
                      });
                    }}
                  >
                    <Text style={styles.joinSlotGhostTextB}>
                      + Unirme como Titular al Equipo B ({room.teamBCount ?? room.teamB?.length ?? 0}/{room.playersPerTeam})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 3. Captain Control Panel & Status Bottom Dock */}
            <View style={styles.bottomControlDock}>
              {room.status === 'CANCELLED' ? (
                <Text style={styles.muted}>{room.cancelReason || 'Convocatoria cerrada'}</Text>
              ) : !own ? (
                !preparing ? (
                  <Text style={styles.muted}>
                    El partido ya comenzó. No se admiten más participantes.
                  </Text>
                ) : null
              ) : (
                <>
                  {preparing && (
                    <Button
                      title={me?.ready ? '✓ ESTOY LISTO (TOCA PARA QUITAR)' : 'MARCAR COMO LISTO PARA JUGAR'}
                      primaryStyle={!me?.ready}
                      secondary={!!me?.ready}
                      disabled={busy}
                      onPress={() => command('setReady', payload({ ready: !me?.ready }))}
                    />
                  )}

                  {preparing && isHost && (
                    <>
                      <Button
                        title="⚡ INICIAR PARTIDO OFICIAL"
                        primaryStyle
                        disabled={
                          busy ||
                          room.status !== 'FULL' ||
                          ![...room.teamA, ...room.teamB].every(member => member.ready) ||
                          Date.now() < Date.parse(room.scheduledAt)
                        }
                        onPress={() =>
                          Alert.alert(
                            'Iniciar partido',
                            'Se confirmarán los equipos y se cerrarán los cupos.',
                            [
                              { text: 'Volver', style: 'cancel' },
                              {
                                text: 'Iniciar',
                                onPress: () => command('start', payload({}))
                              }
                            ]
                          )
                        }
                      />
                      <Text style={styles.muted}>
                        Se habilita con los equipos completos, todos listos y desde la hora programada.
                      </Text>
                    </>
                  )}

                  {preparing && (
                    <View style={styles.subActionsDockRow}>
                      <TouchableOpacity
                        style={styles.dockSubBtn}
                        disabled={busy}
                        onPress={() => setManageRoles(val => !val)}
                      >
                        <Text style={styles.dockSubBtnText}>
                          {manageRoles ? '▴ Ocultar Opciones' : '⚙️ Opciones de Sala'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dockSubBtn}
                        disabled={busy}
                        onPress={() => command('leave', payload({}))}
                      >
                        <Text style={styles.dockLeaveText}>🚪 Abandonar Sala</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {preparing && manageRoles && (
                    <View style={styles.manageRolesExpanded}>
                      <Button
                        title={`⇄ Cambiar al Equipo ${myTeam === 'teamA' ? 'B' : 'A'}`}
                        secondary
                        disabled={busy}
                        onPress={() =>
                          command(
                            'switchTeam',
                            payload({ team: myTeam === 'teamA' ? 'teamB' : 'teamA' })
                          )
                        }
                      />
                      {isHost && (
                        <>
                          <Button
                            title="✏️ Editar cancha, horario o modalidad"
                            secondary
                            disabled={busy}
                            onPress={editDetails}
                          />
                          <Field
                            label="MOTIVO DE CANCELACIÓN (SOLO ANFITRIÓN)"
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Indica el motivo si deseas cancelar la sala..."
                            maxLength={1000}
                          />
                          <Button
                            title="Cancelar convocatoria"
                            dangerStyle
                            disabled={busy || !reason.trim()}
                            onPress={() =>
                              Alert.alert(
                                'Cancelar convocatoria',
                                'Se cerrará para todos sus participantes.',
                                [
                                  { text: 'Volver', style: 'cancel' },
                                  {
                                    text: 'Cancelar convocatoria',
                                    style: 'destructive',
                                    onPress: () => command('cancel', payload({ reason }))
                                  }
                                ]
                              )
                            }
                          />
                        </>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceLowest
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 12
  },
  subPageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4
  },
  backIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  backIconText: {
    color: THEME.colors.onSurface,
    fontSize: 18,
    fontWeight: '900'
  },
  subPageKicker: {
    color: THEME.colors.neonPitch,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1
  },
  subPageTitle: {
    color: THEME.colors.onSurface,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.4
  },

  // 1. HUD HEADER & LAUNCHPAD
  hudHeaderSection: {
    gap: 10
  },
  hudTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  hudTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  neonPulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: THEME.colors.neonPitch
  },
  hudMainTitle: {
    color: THEME.colors.onSurface,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    maxWidth: 165
  },
  regionPillIcon: {
    fontSize: 11
  },
  regionPillText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  salasTabRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  salasTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  salasTabBtnActive: {
    backgroundColor: THEME.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)'
  },
  salasTabText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.outline,
    letterSpacing: 0.6
  },
  salasTabTextActive: {
    color: THEME.colors.neonPitch
  },
  launchpadRow: {
    flexDirection: 'row',
    gap: 8
  },
  createLobbyHeroBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: THEME.colors.neonPitch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4
  },
  createLobbyPlusIcon: {
    color: THEME.colors.surfaceLowest,
    fontSize: 16,
    fontWeight: '900'
  },
  createLobbyHeroText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  pinCodeQuickBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  pinCodeKeyIcon: {
    fontSize: 13
  },
  pinCodeQuickText: {
    color: THEME.colors.onSurface,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6
  },

  // 2. TELEMETRY TICKER
  telemetryTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  telemetryTickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1
  },
  telemetryRadarIcon: {
    color: THEME.colors.neonSecondary,
    fontSize: 14,
    fontWeight: '900'
  },
  telemetryTickerText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    flexShrink: 1
  },
  telemetryBold: {
    color: THEME.colors.onSurface,
    fontWeight: '800'
  },
  telemetryNeon: {
    color: THEME.colors.neonPitch,
    fontWeight: '800'
  },
  telemetryRefreshIcon: {
    color: THEME.colors.neonPitch,
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8
  },

  // 3. SEARCH & FILTER PILLS
  searchAndFilterBlock: {
    gap: 8
  },
  searchFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceHigh,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  searchFieldIcon: {
    fontSize: 14,
    marginRight: 8
  },
  searchFieldInput: {
    flex: 1,
    color: THEME.colors.onSurface,
    fontSize: 13,
    fontWeight: '600'
  },
  clearSearchIconBtn: {
    padding: 4,
    marginRight: 4
  },
  clearSearchIconText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '900'
  },
  tuneInlineBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: THEME.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tuneInlineBtnActive: {
    backgroundColor: 'rgba(0, 255, 135, 0.2)',
    borderWidth: 1,
    borderColor: THEME.colors.neonPitch
  },
  tuneInlineIcon: {
    fontSize: 13
  },
  filterPillsCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 2
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 11,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfaceHigh,
    gap: 5
  },
  filterPillActive: {
    backgroundColor: THEME.colors.neonPitch
  },
  filterPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.neonPitch
  },
  filterPillDotActive: {
    backgroundColor: THEME.colors.surfaceLowest
  },
  filterPillEmoji: {
    fontSize: 11
  },
  filterPillText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '700'
  },
  filterPillTextActive: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900'
  },
  filtersPanel: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  filterDistrictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },
  filterSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.onSurfaceVariant,
    letterSpacing: 0.7
  },
  districtSelectMiniBtn: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  districtSelectMiniText: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '800'
  },
  districtClearMiniBtn: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6
  },
  districtClearMiniText: {
    color: THEME.colors.coralError,
    fontSize: 11,
    fontWeight: '800'
  },

  // 4. TACTICAL CONVOCATORIAS LIST CARDS
  cardsColumn: {
    gap: 12
  },
  lobbyCard: {
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  lobbyCardUrgent: {
    borderColor: 'rgba(0, 255, 135, 0.3)'
  },
  cardLeftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME.colors.neonPitch
  },
  lobbyCardInner: {
    padding: 14,
    paddingLeft: 16,
    gap: 10
  },
  cardHeaderBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardBadgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  formatPill: {
    backgroundColor: 'rgba(0, 255, 135, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5
  },
  formatPillText: {
    color: THEME.colors.neonPitch,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7
  },
  codeTagSmall: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '800',
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  badgeOpen: {
    backgroundColor: 'rgba(0, 255, 135, 0.14)'
  },
  badgeOpenText: {
    color: THEME.colors.neonPitch
  },
  badgeUrgent: {
    backgroundColor: THEME.colors.coralErrorBg
  },
  badgeUrgentText: {
    color: THEME.colors.coralError
  },
  badgeFull: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)'
  },
  badgeFullText: {
    color: THEME.colors.gold
  },
  badgePlaying: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)'
  },
  badgePlayingText: {
    color: '#60A5FA'
  },
  badgePending: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)'
  },
  badgePendingText: {
    color: '#22D3EE'
  },
  badgeDisputed: {
    backgroundColor: THEME.colors.coralErrorBg
  },
  badgeDisputedText: {
    color: THEME.colors.coralError
  },
  badgeFinished: {
    backgroundColor: 'rgba(125, 255, 162, 0.15)'
  },
  badgeFinishedText: {
    color: THEME.colors.neonSecondary
  },
  badgeCancelled: {
    backgroundColor: 'rgba(132, 149, 133, 0.15)'
  },
  badgeCancelledText: {
    color: THEME.colors.outline
  },
  venueInfoBlock: {
    gap: 2
  },
  venueHeading: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '800'
  },
  venueLocationSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12
  },
  slotsProgressBlock: {
    gap: 5
  },
  slotsProgressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  slotsConfirmedText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '700'
  },
  slotsRemainingText: {
    color: THEME.colors.neonSecondary,
    fontSize: 11,
    fontWeight: '800'
  },
  slotsProgressBarBg: {
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceLowest,
    overflow: 'hidden'
  },
  slotsProgressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.neonSecondary,
    borderRadius: 4
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  cardFooterMeta: {
    gap: 1
  },
  cardMetaOverline: {
    color: THEME.colors.outline,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  cardMetaValue: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    fontWeight: '800'
  },
  cardCtaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardCtaBtnPrimary: {
    backgroundColor: THEME.colors.neonPitch
  },
  cardCtaBtnSecondary: {
    backgroundColor: THEME.colors.surfaceHigh
  },
  cardCtaBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  cardCtaBtnTextPrimary: {
    color: THEME.colors.surfaceLowest
  },
  cardCtaBtnTextSecondary: {
    color: THEME.colors.onSurface
  },

  // 5. RADAR WIDGET
  radarWidgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)'
  },
  radarWidgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  radarWidgetCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.35)'
  },
  radarWidgetIcon: {
    color: THEME.colors.neonPitch,
    fontSize: 18,
    fontWeight: '900'
  },
  radarWidgetTitle: {
    color: THEME.colors.onSurface,
    fontSize: 13.5,
    fontWeight: '800'
  },
  radarWidgetSub: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11.5,
    marginTop: 1
  },
  radarWidgetArrow: {
    color: THEME.colors.neonPitch,
    fontSize: 16,
    fontWeight: '900'
  },

  // DETALLE DE SALA: TACTICAL PITCH SPLIT VIEW
  roomHeaderCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 15,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)'
  },
  copyCodePillBtn: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)'
  },
  copyCodePillText: {
    color: THEME.colors.neonPitch,
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  detailVenueTitle: {
    color: THEME.colors.onSurface,
    fontSize: 18,
    fontWeight: '900'
  },
  detailTimeAndStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2
  },
  detailScheduleBadge: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  detailScheduleText: {
    color: THEME.colors.neonSecondary,
    fontSize: 11.5,
    fontWeight: '800'
  },
  detailStateBadge: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  detailStateText: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '900'
  },
  detailQuickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLowest,
    padding: 8,
    borderRadius: 10,
    marginTop: 4,
    gap: 8
  },
  openChatNeonBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.neonPitch,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 7,
    gap: 6
  },
  openChatNeonIcon: {
    fontSize: 13
  },
  openChatNeonText: {
    color: THEME.colors.surfaceLowest,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  guestNoticePill: {
    flex: 1,
    paddingHorizontal: 8
  },
  guestNoticeText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600'
  },
  shareLinkBtn: {
    backgroundColor: THEME.colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  shareLinkBtnText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '800'
  },
  tacticalPitchContainer: {
    backgroundColor: '#0A130F',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.18)',
    gap: 10
  },
  teamSectionBlock: {
    gap: 6
  },
  teamHeaderBarA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLow,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.neonPitch
  },
  teamHeaderBarB: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceLow,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.coralError
  },
  teamHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  teamCircleA: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.neonPitch,
    alignItems: 'center',
    justifyContent: 'center'
  },
  teamCircleTextA: {
    color: THEME.colors.surfaceLowest,
    fontSize: 13,
    fontWeight: '900'
  },
  teamCircleB: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.coralError,
    alignItems: 'center',
    justifyContent: 'center'
  },
  teamCircleTextB: {
    color: '#690005',
    fontSize: 13,
    fontWeight: '900'
  },
  teamNameTitle: {
    color: THEME.colors.onSurface,
    fontSize: 14,
    fontWeight: '800'
  },
  teamCountSubA: {
    color: THEME.colors.neonPitch,
    fontSize: 10.5,
    fontWeight: '700'
  },
  teamCountSubB: {
    color: THEME.colors.coralError,
    fontSize: 10.5,
    fontWeight: '700'
  },
  teamOvrRight: {
    alignItems: 'flex-end'
  },
  teamOvrLabel: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 9,
    fontWeight: '800'
  },
  teamOvrValA: {
    color: THEME.colors.neonPitch,
    fontSize: 12,
    fontWeight: '900'
  },
  teamOvrValB: {
    color: THEME.colors.coralError,
    fontSize: 12,
    fontWeight: '900'
  },
  slotRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(29, 32, 38, 0.88)',
    padding: 9,
    borderRadius: 8,
    flexWrap: 'wrap',
    gap: 8
  },
  slotRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  dorsalCircleA: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dorsalTextA: {
    color: THEME.colors.neonPitch,
    fontSize: 11,
    fontWeight: '900'
  },
  dorsalCircleB: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dorsalTextB: {
    color: THEME.colors.coralError,
    fontSize: 11,
    fontWeight: '900'
  },
  playerNameWithCapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  slotPlayerName: {
    color: THEME.colors.onSurface,
    fontSize: 13.5,
    fontWeight: '700',
    flexShrink: 1
  },
  capBadgeA: {
    backgroundColor: 'rgba(0, 255, 135, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  capBadgeTextA: {
    color: THEME.colors.neonPitch,
    fontSize: 9,
    fontWeight: '900'
  },
  capBadgeB: {
    backgroundColor: THEME.colors.coralErrorBg,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  capBadgeTextB: {
    color: THEME.colors.coralError,
    fontSize: 9,
    fontWeight: '900'
  },
  slotPlayerMeta: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 10.5
  },
  readyStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5
  },
  readyTagOn: {
    backgroundColor: 'rgba(0, 255, 135, 0.16)'
  },
  readyTagOnB: {
    backgroundColor: THEME.colors.coralErrorBg
  },
  readyTagOff: {
    backgroundColor: THEME.colors.surfaceHigh
  },
  readyStatusTagText: {
    fontSize: 10,
    fontWeight: '900'
  },
  readyTextOn: {
    color: THEME.colors.neonPitch
  },
  readyTextOnB: {
    color: THEME.colors.coralError
  },
  readyTextOff: {
    color: THEME.colors.onSurfaceVariant
  },
  transferBtnsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    justifyContent: 'flex-end',
    paddingTop: 4
  },
  transferMiniBtn: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5
  },
  transferMiniText: {
    color: THEME.colors.onSurface,
    fontSize: 10,
    fontWeight: '800'
  },
  joinSlotGhostBtnA: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 255, 135, 0.45)',
    backgroundColor: 'rgba(0, 255, 135, 0.07)',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center'
  },
  joinSlotGhostTextA: {
    color: THEME.colors.neonPitch,
    fontSize: 12,
    fontWeight: '800'
  },
  joinSlotGhostBtnB: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 180, 171, 0.45)',
    backgroundColor: 'rgba(147, 0, 10, 0.15)',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center'
  },
  joinSlotGhostTextB: {
    color: THEME.colors.coralError,
    fontSize: 12,
    fontWeight: '800'
  },
  vsCenterDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative'
  },
  vsCenterLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)'
  },
  vsCenterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceLowest,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  vsSideTextA: {
    color: THEME.colors.neonPitch,
    fontSize: 10.5,
    fontWeight: '900'
  },
  vsCoreBox: {
    backgroundColor: THEME.colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  vsCoreText: {
    color: THEME.colors.onSurface,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  },
  vsSideTextB: {
    color: THEME.colors.coralError,
    fontSize: 10.5,
    fontWeight: '900'
  },
  bottomControlDock: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  subActionsDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4
  },
  dockSubBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  dockSubBtnText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700'
  },
  dockLeaveText: {
    color: THEME.colors.coralError,
    fontSize: 12,
    fontWeight: '800'
  },
  manageRolesExpanded: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)'
  },

  // COMMON COMPONENTS & FORMS
  sectionCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 14,
    padding: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  formSectionCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  formatOptionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  formatOptionBtnActive: {
    backgroundColor: THEME.colors.neonPitch,
    borderColor: THEME.colors.neonPitch
  },
  formatOptionText: {
    color: THEME.colors.onSurface,
    fontSize: 12.5,
    fontWeight: '800'
  },
  formatOptionTextActive: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900'
  },
  selectedDistrictBanner: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)'
  },
  selectedDistrictText: {
    color: THEME.colors.neonPitch,
    fontSize: 13,
    fontWeight: '800'
  },
  districtResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceContainer,
    padding: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  districtPickArrow: {
    color: THEME.colors.neonPitch,
    fontSize: 11.5,
    fontWeight: '800'
  },
  finalScoreBig: {
    color: THEME.colors.neonPitch,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 4
  },
  heading: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '800'
  },
  text: {
    color: THEME.colors.onSurface,
    fontSize: 14,
    flexShrink: 1
  },
  muted: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12.5,
    lineHeight: 18,
    flexShrink: 1
  },
  label: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4
  },
  fieldContainer: {
    gap: 4
  },
  input: {
    color: THEME.colors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    backgroundColor: THEME.colors.surfaceContainer
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  button: {
    backgroundColor: THEME.colors.surfaceHigh,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46
  },
  primaryAction: {
    backgroundColor: THEME.colors.neonPitch
  },
  primaryActionText: {
    color: THEME.colors.surfaceLowest,
    fontWeight: '900',
    fontSize: 13.5,
    letterSpacing: 0.6
  },
  dangerAction: {
    backgroundColor: THEME.colors.coralErrorBg,
    borderWidth: 1,
    borderColor: THEME.colors.coralError
  },
  dangerActionText: {
    color: THEME.colors.coralError,
    fontWeight: '900'
  },
  secondary: {
    backgroundColor: THEME.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  buttonText: {
    color: THEME.colors.onSurface,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center'
  },
  errorBox: {
    backgroundColor: THEME.colors.coralErrorBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  error: {
    color: THEME.colors.coralError,
    fontSize: 12.5,
    flex: 1
  },
  retryBtn: {
    backgroundColor: 'rgba(255, 180, 171, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800'
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 13.5,
    textAlign: 'center'
  },
  emptyCard: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 6,
    gap: 8
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 2
  },
  emptyTitle: {
    color: THEME.colors.onSurface,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  emptySubtitle: {
    color: THEME.colors.onSurfaceVariant,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18
  },
  codeContainer: {
    backgroundColor: THEME.colors.surfaceLow,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  matchNoticeBox: {
    backgroundColor: 'rgba(0, 255, 135, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)'
  }
});
