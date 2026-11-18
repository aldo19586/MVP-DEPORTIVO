import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
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
import { api } from '../services/api';
import { socketService } from '../services/socket';
import CompetitionChat from './CompetitionChat';

const formats = ['5v5', '6v6', '7v7', '9v9', '11v11'];
const requestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const dateLabel = value =>
  new Date(value).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

function Button({ title, onPress, disabled, secondary, primaryStyle }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        primaryStyle && styles.primaryAction,
        disabled && { opacity: 0.45 }
      ]}
    >
      <Text style={[styles.buttonText, primaryStyle && styles.primaryActionText]}>
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
        placeholderTextColor="#8292a8"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export default function CompetitionScreen({ user, mine = false, onNavigateToPlay }) {
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

  // Filtros secundarios bajo demanda
  const [showFilters, setShowFilters] = useState(false);
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState(null);

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
      const result = mine
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
  }, [mine, filterDistrict]);

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
      const own = (membership.competitions || []).find(item => item.id === summary.id);
      if (mounted.current) {
        setRoom(own || summary);
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
  }, [page, mine, filterDistrict]);

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

  // Filtrado en memoria de formato de juego
  const visibleList = list.filter(item => {
    if (filterFormat && filterFormat !== 'all' && item.formatId !== filterFormat) {
      return false;
    }
    return true;
  });

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
        {/* Encabezado / Botón Volver */}
        {page !== 'list' && (
          <Button
            title="← Volver"
            secondary
            disabled={busy}
            onPress={() => (page === 'details' ? setPage('create') : goList())}
          />
        )}

        <View style={styles.headerTitleWrap}>
          <Text style={styles.title} numberOfLines={2}>
            {page === 'create' || page === 'details'
              ? editing
                ? 'Editar convocatoria'
                : 'Crear convocatoria'
              : page === 'detail'
              ? 'Sala de Convocatoria'
              : page === 'code'
              ? 'Unirme por código'
              : page === 'filter'
              ? 'Elegir ubicación'
              : mine
              ? 'Mis Partidos'
              : 'Partidos en Cancha'}
          </Text>
        </View>

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

        {busy && <ActivityIndicator color="#10b981" size="small" />}

        {/* ========================================================
            VISTA LISTA: Jugar (Exploración) o Mis Partidos
            ======================================================== */}
        {page === 'list' && (
          <>
            {mine ? (
              /* Header de Mis Partidos */
              <View style={styles.mineHeaderBox}>
                <Text style={styles.muted}>
                  Tus convocatorias e inscripciones activas se conservan aunque cierres la app.
                </Text>
              </View>
            ) : (
              /* Barra de Control de Jugar */
              <View style={styles.playControlBox}>
                <View style={styles.districtStatusRow}>
                  <Text style={[styles.muted, { flex: 1 }]} numberOfLines={1}>
                    📍 {filterDistrict?.label || 'Todo Perú (Todas las canchas)'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={refresh}
                    disabled={loading}
                    style={styles.inlineRefreshBtn}
                  >
                    <Text style={styles.inlineRefreshText}>↻ Actualizar</Text>
                  </Pressable>
                </View>

                {/* Acciones Rápidas */}
                <View style={styles.actionRow}>
                  <View style={{ flex: 1.2 }}>
                    <Button
                      title="+ Crear Convocatoria"
                      primaryStyle
                      onPress={() => {
                        setError('');
                        setEditing(false);
                        setDistrict(null);
                        setPage('create');
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Tengo un código" secondary onPress={() => setPage('code')} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowFilters(v => !v)}
                    style={[
                      styles.filterToggleBtn,
                      (showFilters || filterFormat !== 'all' || filterDistrict) &&
                        styles.filterToggleBtnActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterToggleText,
                        (showFilters || filterFormat !== 'all' || filterDistrict) &&
                          styles.filterToggleTextActive
                      ]}
                    >
                      Filtros {filterFormat !== 'all' || filterDistrict ? '●' : showFilters ? '▴' : '▾'}
                    </Text>
                  </Pressable>
                </View>

                {/* Filtros Secundarios Desplegables Bajo Demanda */}
                {showFilters && (
                  <View style={styles.filtersPanel}>
                    <Text style={styles.filterSectionTitle}>MODALIDAD DE JUEGO</Text>
                    <View style={styles.formatRow}>
                      {['all', ...formats].map(f => {
                        const isSelected =
                          filterFormat === f || (f === 'all' && !filterFormat);
                        return (
                          <Pressable
                            key={f}
                            onPress={() => setFilterFormat(f)}
                            style={[styles.formatChip, isSelected && styles.formatChipActive]}
                          >
                            <Text
                              style={[
                                styles.formatChipText,
                                isSelected && styles.formatChipTextActive
                              ]}
                            >
                              {f === 'all' ? 'Todas' : f.split('v')[0]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={[styles.filterSectionTitle, { marginTop: 10 }]}>
                      FILTRAR POR DISTRITO
                    </Text>
                    <View style={styles.row}>
                      <Button
                        title={
                          filterDistrict
                            ? `Distrito: ${filterDistrict.label.split(',')[0]} ✕`
                            : 'Seleccionar distrito...'
                        }
                        secondary
                        onPress={() => {
                          if (filterDistrict) {
                            setFilterDistrict(null);
                          } else {
                            setDistrictQuery('');
                            setPage('filter');
                          }
                        }}
                      />
                      {filterDistrict && (
                        <Button
                          title="Ver todo Perú"
                          secondary
                          onPress={() => setFilterDistrict(null)}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Estado de Carga Explícito */}
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>
                  {mine
                    ? 'Cargando tus partidos e inscripciones...'
                    : 'Buscando convocatorias abiertas en tu zona...'}
                </Text>
              </View>
            ) : visibleList.length === 0 && !error ? (
              /* Estados de Vacío Honesto */
              mine ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🏟️</Text>
                  <Text style={styles.emptyTitle}>Aún no tienes partidos activos</Text>
                  <Text style={styles.emptySubtitle}>
                    Cuando te unas a una convocatoria o crees una propia, aparecerá aquí para que
                    coordines la llegada, uses el chat y reportes el marcador.
                  </Text>
                  <View style={{ gap: 8, marginTop: 12, width: '100%' }}>
                    {onNavigateToPlay && (
                      <Button
                        title="Explorar Convocatorias en Jugar ➔"
                        primaryStyle
                        onPress={onNavigateToPlay}
                      />
                    )}
                    <Button
                      title="+ Crear mi propia convocatoria"
                      secondary
                      onPress={() => {
                        setError('');
                        setEditing(false);
                        setDistrict(null);
                        setPage('create');
                      }}
                    />
                    <Button
                      title="Ingresar con código de invitación"
                      secondary
                      onPress={() => setPage('code')}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>⚽</Text>
                  <Text style={styles.emptyTitle}>No hay convocatorias abiertas en tu zona</Text>
                  <Text style={styles.emptySubtitle}>
                    {filterDistrict
                      ? `No se encontraron partidos en ${filterDistrict.label}. Puedes ampliar el filtro o crear la primera convocatoria.`
                      : 'Sé el primero en organizar una pichanga. Comparte el código con tus amigos para completar los cupos.'}
                  </Text>
                  <View style={{ gap: 8, marginTop: 12, width: '100%' }}>
                    <Button
                      title="+ Crear Convocatoria Ahora"
                      primaryStyle
                      onPress={() => {
                        setError('');
                        setEditing(false);
                        setDistrict(null);
                        setPage('create');
                      }}
                    />
                    <Button
                      title="Tengo un código de invitación"
                      secondary
                      onPress={() => setPage('code')}
                    />
                    {filterDistrict && (
                      <Button
                        title="Ver convocatorias de todo el país"
                        secondary
                        onPress={() => setFilterDistrict(null)}
                      />
                    )}
                  </View>
                </View>
              )
            ) : (
              /* Tarjetas de Convocatorias con Acción Primaria por Estado */
              visibleList.map(value => {
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

                // Determinación de la Acción Primaria por Estado
                let actionLabel = 'Ver detalles ➔';
                let isPrimaryAction = false;
                let statusBadgeText = 'Convocando';
                let badgeStyle = styles.badgeOpen;
                let badgeTextStyle = styles.badgeOpenText;

                if (value.status === 'FINISHED') {
                  statusBadgeText = 'Finalizado';
                  badgeStyle = styles.badgeFinished;
                  badgeTextStyle = styles.badgeFinishedText;
                  actionLabel = `Ver resultado (${value.finalScore ? `${value.finalScore.teamA}-${value.finalScore.teamB}` : 'Final'}) ➔`;
                } else if (value.status === 'DISPUTED') {
                  statusBadgeText = 'En disputa arbitral';
                  badgeStyle = styles.badgeDisputed;
                  badgeTextStyle = styles.badgeDisputedText;
                  actionLabel = 'Disputa en revisión ➔';
                  isPrimaryAction = true;
                } else if (value.status === 'RESULT_PENDING') {
                  statusBadgeText = 'Marcador por confirmar';
                  badgeStyle = styles.badgePending;
                  badgeTextStyle = styles.badgePendingText;
                  if (isCap && value.report?.reportedTeam !== teamKey) {
                    actionLabel = '⚠️ Validar o disputar marcador ➔';
                    isPrimaryAction = true;
                  } else {
                    actionLabel = 'Marcador reportado · Ver detalle ➔';
                  }
                } else if (value.status === 'IN_PROGRESS') {
                  statusBadgeText = 'En juego';
                  badgeStyle = styles.badgePlaying;
                  badgeTextStyle = styles.badgePlayingText;
                  if (isCap) {
                    actionLabel = '⚽ Reportar marcador final ➔';
                    isPrimaryAction = true;
                  } else {
                    actionLabel = 'En juego · Coordinar partido ➔';
                    isPrimaryAction = true;
                  }
                } else if (value.status === 'CANCELLED') {
                  statusBadgeText = 'Cancelada';
                  badgeStyle = styles.badgeCancelled;
                  badgeTextStyle = styles.badgeCancelledText;
                  actionLabel = 'Ver motivo de cierre ➔';
                } else if (value.status === 'FULL') {
                  statusBadgeText = 'Cupos completos';
                  badgeStyle = styles.badgeFull;
                  badgeTextStyle = styles.badgeFullText;
                  if (isMember) {
                    actionLabel = 'Entrar a la sala de coordinación ➔';
                    isPrimaryAction = true;
                  } else {
                    actionLabel = 'Sala completa · Ver detalles ➔';
                  }
                } else {
                  // Estado OPEN
                  statusBadgeText = `Convocando · ${playersCount}/${totalSlots}`;
                  if (isMember) {
                    actionLabel = `Mi sala (${slotsLeft > 0 ? `Faltan ${slotsLeft}` : 'Completa'}) ➔`;
                    isPrimaryAction = true;
                  } else {
                    actionLabel = `Unirme al partido (${slotsLeft} ${slotsLeft === 1 ? 'cupo' : 'cupos'}) ➔`;
                    isPrimaryAction = true;
                  }
                }

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={value.id}
                    onPress={() => open(value)}
                    disabled={busy}
                    style={styles.card}
                  >
                    {/* Fila Superior: Modalidad + Badge de Estado */}
                    <View style={styles.cardTopRow}>
                      <Text style={styles.formatBadge}>
                        FÚTBOL {value.formatId?.split('v')[0] || '5'}
                      </Text>
                      <View style={[styles.statusBadge, badgeStyle]}>
                        <Text style={[styles.statusBadgeText, badgeTextStyle]}>
                          {statusBadgeText}
                        </Text>
                      </View>
                    </View>

                    {/* Cancha y Ubicación */}
                    <View>
                      <Text style={styles.heading} numberOfLines={1}>
                        {value.venue?.name || 'Cancha por definir'}
                      </Text>
                      <Text style={styles.muted} numberOfLines={1}>
                        📍 {value.district || value.venue?.address || 'Lima'}
                      </Text>
                    </View>

                    {/* Fecha y Hora */}
                    <Text style={styles.dateTimeText}>
                      ⏰ {dateLabel(value.scheduledAt)}
                    </Text>

                    {/* Botón de Acción Primaria Explicita */}
                    <View style={styles.cardActionWrap}>
                      <Button
                        title={actionLabel}
                        primaryStyle={isPrimaryAction}
                        secondary={!isPrimaryAction}
                        disabled={busy}
                        onPress={() => open(value)}
                      />
                    </View>
                  </Pressable>
                );
              })
            )}
          </>
        )}

        {/* ========================================================
            VISTA UNIRME POR CÓDIGO
            ======================================================== */}
        {page === 'code' && (
          <View style={styles.codeContainer}>
            <Field
              label="Ingresa el código de 8 caracteres"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Button
              title="Buscar y entrar a la sala ➔"
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
          <>
            {page === 'create' && (
              <>
                <Text style={styles.label}>Modalidad de juego</Text>
                <View style={styles.row}>
                  {formats.map(value => (
                    <Button
                      key={value}
                      title={value.split('v')[0]}
                      secondary={format !== value}
                      onPress={() => setFormat(value)}
                      disabled={busy}
                    />
                  ))}
                </View>
              </>
            )}

            {page === 'create' && district && (
              <Button
                title={`Continuar con ${district.label}`}
                primaryStyle
                onPress={() => setPage('details')}
              />
            )}

            {page !== 'details' && (
              <Field
                label="Buscar distrito, provincia o departamento"
                value={districtQuery}
                onChangeText={setDistrictQuery}
              />
            )}

            {page === 'details' && district ? (
              <Text style={styles.text}>Ubicación elegida: {district.label}</Text>
            ) : null}

            {(page === 'details' ? [] : districts.slice(0, 8)).map(value => (
              <Pressable
                key={value.id}
                disabled={busy}
                style={styles.card}
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
                <Text style={styles.text}>{value.label}</Text>
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
                  label="Nombre del complejo deportivo / cancha"
                  value={venue}
                  onChangeText={setVenue}
                  maxLength={120}
                  editable={!busy}
                />
                <Field
                  label="Dirección exacta"
                  value={address}
                  onChangeText={setAddress}
                  maxLength={240}
                  editable={!busy}
                />
                <Text style={styles.muted}>
                  Horario oficial de Perú. Coordina previamente la disponibilidad del campo.
                </Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={when ? dateLabel(when) : 'Elegir fecha'}
                      secondary
                      disabled={busy}
                      onPress={() => setPicker('date')}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Elegir hora"
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
                    <Button title="Listo" secondary onPress={() => setPicker(null)} />
                  </>
                )}
                <Button
                  title={editing ? 'Guardar cambios' : 'Crear y obtener código de sala'}
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
          </>
        )}

        {/* ========================================================
            VISTA DETALLE: Sala de Convocatoria y Coordinación
            ======================================================== */}
        {page === 'detail' && room && (
          <>
            <View style={styles.roomHeaderCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.formatBadge}>
                  FÚTBOL {room.formatId?.split('v')[0] || '5'}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {room.status === 'CANCELLED'
                      ? 'Cancelada'
                      : room.status === 'IN_PROGRESS'
                      ? 'En juego'
                      : room.status === 'RESULT_PENDING'
                      ? 'Confirmando marcador'
                      : room.status === 'DISPUTED'
                      ? 'En disputa'
                      : room.status === 'FINISHED'
                      ? 'Finalizado'
                      : room.status === 'FULL'
                      ? 'Completa'
                      : 'Convocando'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heading}>{room.venue?.name}</Text>
              <Text style={styles.muted}>
                {room.venue?.address} · {room.district}
              </Text>
              <Text style={styles.dateTimeText}>⏰ {dateLabel(room.scheduledAt)}</Text>

              {/* Código de Sala */}
              <View style={styles.codeShareBox}>
                <Text style={styles.codeShareLabel}>CÓDIGO DE CONVOCATORIA:</Text>
                <Text selectable style={styles.code}>
                  {room.code}
                </Text>
                <View style={styles.row}>
                  <Button
                    title="Copiar código"
                    secondary
                    onPress={async () => {
                      try {
                        await Clipboard.setStringAsync(room.code);
                        Alert.alert('Copiado', 'Código copiado al portapapeles.');
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  />
                  <Button
                    title="Compartir"
                    secondary
                    onPress={() =>
                      Share.share({
                        message: `MatchSport · Fútbol ${room.formatId?.split('v')[0]}\n${room.venue?.name}, ${room.district}\n${dateLabel(room.scheduledAt)} (Perú)\nCódigo: ${room.code}`
                      }).catch(e => setError(e.message))
                    }
                  />
                </View>
              </View>
            </View>

            {match && (
              <View style={styles.matchNoticeBox}>
                <Text style={styles.text}>
                  ⚽ Partido iniciado el {dateLabel(match.startedAt)}. Equipos confirmados.
                </Text>
              </View>
            )}

            {own && (
              <Button
                title="💬 Abrir Chat de la Sala"
                primaryStyle
                onPress={() => setPage('chat')}
              />
            )}

            {/* Resultado Final Oficial */}
            {room.status === 'FINISHED' && (
              <View style={[styles.card, { borderColor: '#10b981', borderWidth: 1.5 }]}>
                <Text style={styles.heading}>Resultado Oficial</Text>
                <Text style={[styles.title, { textAlign: 'center', marginVertical: 4 }]}>
                  {room.finalScore ? `${room.finalScore.teamA} - ${room.finalScore.teamB}` : '-'}
                </Text>
                <Text style={[styles.text, { textAlign: 'center', fontWeight: '700' }]}>
                  {room.outcome === 'draw'
                    ? '🤝 Empate Oficial'
                    : room.outcome === 'teamA'
                    ? '🏆 Victoria Equipo A'
                    : '🏆 Victoria Equipo B'}
                </Text>
                {room.ratingUpdates && room.ratingUpdates[user.id] && (
                  <Text style={[styles.muted, { textAlign: 'center', marginTop: 4 }]}>
                    Tu nuevo rating: {Math.round(room.ratingUpdates[user.id].newRating)} (
                    {room.ratingUpdates[user.id].ratingChange >= 0 ? '+' : ''}
                    {Math.round(room.ratingUpdates[user.id].ratingChange)} pts)
                  </Text>
                )}
                {room.resolvedBy && (
                  <Text
                    style={[styles.muted, { textAlign: 'center', fontSize: 12, marginTop: 4 }]}
                  >
                    Dictamen SuperAdmin: {room.resolutionReason}
                  </Text>
                )}
              </View>
            )}

            {/* Disputa Arbitral en Revisión */}
            {room.status === 'DISPUTED' && (
              <View style={[styles.card, { borderColor: '#f59e0b', borderWidth: 1.5 }]}>
                <Text style={styles.heading}>⚖️ Disputa Arbitral en Revisión</Text>
                <Text style={styles.text}>
                  {room.dispute?.reason || 'Discrepancia en el marcador reportado'}
                </Text>
                <Text style={styles.muted}>
                  El SuperAdmin está evaluando la evidencia para emitir la resolución oficial.
                </Text>
              </View>
            )}

            {/* Marcador Pendiente de Confirmación */}
            {room.status === 'RESULT_PENDING' && (
              <View style={[styles.card, { borderColor: '#06b6d4', borderWidth: 1.5 }]}>
                <Text style={styles.heading}>Marcador Reportado</Text>
                <Text style={styles.text}>
                  Capitán {room.report?.reportedTeam === 'teamA' ? 'Equipo A' : 'Equipo B'} reportó:{' '}
                  {room.report?.score?.teamA} - {room.report?.score?.teamB}
                </Text>
                {isCaptain && room.report?.reportedTeam !== myTeam ? (
                  <>
                    <Button
                      title={`Confirmar resultado (${room.report?.score?.teamA} - ${room.report?.score?.teamB})`}
                      primaryStyle
                      disabled={busy}
                      onPress={() =>
                        command('confirmScore', payload({ reportId: room.report?.reportId }))
                      }
                    />
                    <Field
                      label="Motivo si hay discrepancia"
                      value={disputeReason}
                      onChangeText={setDisputeReason}
                      maxLength={200}
                    />
                    <Button
                      title="Disputar marcador"
                      secondary
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
                      : 'Esperando validación de los capitanes.'}
                  </Text>
                )}
              </View>
            )}

            {/* Reportar Marcador (Solo Capitán en Partido IN_PROGRESS) */}
            {room.status === 'IN_PROGRESS' && isCaptain && (
              <View style={styles.card}>
                <Text style={styles.heading}>Reportar Marcador Final</Text>
                <Text style={styles.muted}>Como capitán, ingresa los goles al terminar:</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Goles Equipo A"
                      value={scoreA}
                      onChangeText={setScoreA}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Goles Equipo B"
                      value={scoreB}
                      onChangeText={setScoreB}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
                <Button
                  title="Enviar marcador oficial"
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

            {/* Acciones según Participación y Roles */}
            {room.status === 'CANCELLED' ? (
              <Text style={styles.muted}>{room.cancelReason || 'Convocatoria cerrada'}</Text>
            ) : !own ? (
              <>
                {!preparing && (
                  <Text style={styles.muted}>
                    El partido ya comenzó. No se admiten más participantes.
                  </Text>
                )}
                {preparing &&
                  ['teamA', 'teamB'].map((team, index) => (
                    <Button
                      key={team}
                      title={`Unirme al Equipo ${index ? 'B' : 'A'} (${index ? room.teamBCount : room.teamACount}/${room.playersPerTeam})`}
                      primaryStyle
                      disabled={
                        busy ||
                        (index ? room.teamBCount : room.teamACount) >= room.playersPerTeam
                      }
                      onPress={() =>
                        command('join', {
                          code: room.code,
                          team,
                          expectedRevision: room.revision
                        })
                      }
                    />
                  ))}
              </>
            ) : (
              <>
                {preparing && (
                  <Button
                    title={me.ready ? 'Quitar Listo' : '✓ Estoy listo para jugar'}
                    primaryStyle={!me.ready}
                    secondary={me.ready}
                    disabled={busy}
                    onPress={() => command('setReady', payload({ ready: !me.ready }))}
                  />
                )}

                {preparing && isHost && (
                  <>
                    <Button
                      title="Iniciar partido oficial"
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
                      Se inicia con los equipos completos, todos listos y desde la hora programada.
                    </Text>
                  </>
                )}

                {preparing && (
                  <Button
                    title={manageRoles ? 'Ocultar opciones de sala' : '⚙️ Opciones de sala'}
                    secondary
                    disabled={busy}
                    onPress={() => setManageRoles(val => !val)}
                  />
                )}

                {preparing && manageRoles && (
                  <>
                    <Button
                      title={`Cambiar al equipo ${myTeam === 'teamA' ? 'B' : 'A'}`}
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
                      <Button
                        title="Editar cancha, horario o modalidad"
                        secondary
                        disabled={busy}
                        onPress={editDetails}
                      />
                    )}
                  </>
                )}

                {/* Listas de Jugadores por Equipo */}
                {['teamA', 'teamB'].map((team, index) => (
                  <View key={team} style={styles.card}>
                    <Text style={styles.heading}>
                      Equipo {index ? 'B' : 'A'} · {room[team].length}/{room.playersPerTeam}
                    </Text>
                    {room[team].map(member => (
                      <View key={member.id} style={styles.memberRow}>
                        <Text style={styles.text} numberOfLines={1}>
                          {member.name}
                          {room.captains[team] === member.id ? ' · (Capitán)' : ''}
                          {preparing && member.ready ? ' · ✓ Listo' : ''}
                        </Text>
                        {preparing && manageRoles && member.id !== user.id && (
                          <View style={styles.row}>
                            {isHost && (
                              <Button
                                title={`Pasar anfitrión`}
                                secondary
                                disabled={busy}
                                onPress={() =>
                                  command(
                                    'transferHost',
                                    payload({ targetUserId: member.id })
                                  )
                                }
                              />
                            )}
                            {room.captains[team] === user.id && (
                              <Button
                                title={`Pasar capitanía`}
                                secondary
                                disabled={busy}
                                onPress={() =>
                                  command(
                                    'transferCaptain',
                                    payload({ targetUserId: member.id })
                                  )
                                }
                              />
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ))}

                {preparing && (
                  <Button
                    title="Salir de la convocatoria"
                    secondary
                    disabled={busy}
                    onPress={() => command('leave', payload({}))}
                  />
                )}

                {preparing && isHost && manageRoles && (
                  <>
                    <Field
                      label="Motivo de cancelación"
                      value={reason}
                      onChangeText={setReason}
                      maxLength={1000}
                    />
                    <Button
                      title="Cancelar convocatoria"
                      secondary
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
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40
  },
  headerTitleWrap: {
    marginBottom: 4
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  heading: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800'
  },
  text: {
    color: '#e2e8f0',
    fontSize: 15,
    flexShrink: 1
  },
  muted: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1
  },
  dateTimeText: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '700'
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6
  },
  fieldContainer: {
    gap: 4
  },
  input: {
    color: '#fff',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#1e293b'
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  formatBadge: {
    color: '#f59e0b',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  badgeOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  badgeOpenText: {
    color: '#10b981'
  },
  badgeFull: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)'
  },
  badgeFullText: {
    color: '#f59e0b'
  },
  badgePlaying: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)'
  },
  badgePlayingText: {
    color: '#60a5fa'
  },
  badgePending: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)'
  },
  badgePendingText: {
    color: '#22d3ee'
  },
  badgeDisputed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  badgeDisputedText: {
    color: '#f87171'
  },
  badgeFinished: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)'
  },
  badgeFinishedText: {
    color: '#34d399'
  },
  badgeCancelled: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)'
  },
  badgeCancelledText: {
    color: '#94a3b8'
  },
  cardActionWrap: {
    marginTop: 4
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  button: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46
  },
  primaryAction: {
    backgroundColor: '#10b981'
  },
  primaryActionText: {
    color: '#00210B',
    fontWeight: '900',
    fontSize: 14
  },
  secondary: {
    backgroundColor: '#334155'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  error: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1
  },
  retryBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  },
  code: {
    color: '#34d399',
    fontSize: 28,
    letterSpacing: 4,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 4
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center'
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 10,
    gap: 8
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
  playControlBox: {
    gap: 10,
    marginBottom: 6
  },
  districtStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  inlineRefreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#334155'
  },
  inlineRefreshText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700'
  },
  filterToggleBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46
  },
  filterToggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981'
  },
  filterToggleText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800'
  },
  filterToggleTextActive: {
    color: '#10b981'
  },
  filtersPanel: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
    marginTop: 2
  },
  filterSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8
  },
  formatRow: {
    flexDirection: 'row',
    gap: 6
  },
  formatChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  formatChipActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  formatChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800'
  },
  formatChipTextActive: {
    color: '#10b981'
  },
  mineHeaderBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  codeContainer: {
    gap: 12,
    marginTop: 8
  },
  roomHeaderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  codeShareBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 6,
    gap: 6
  },
  codeShareLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8
  },
  matchNoticeBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  memberRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4
  }
});