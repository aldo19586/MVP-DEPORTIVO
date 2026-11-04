import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert, Share, Platform, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { api } from '../services/api';

const formats = ['5v5', '6v6', '7v7', '9v9', '11v11'];
const requestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const dateLabel = value => new Date(value).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' });
function Button({ title, onPress, disabled, secondary }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.45 }]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
function Field({ label, ...props }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#8292a8" style={styles.input} {...props} /></View>;
}

export default function CompetitionScreen({ user, mine = false }) {
  const [page, setPage] = useState('list');
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
  const [filterDistrict, setFilterDistrict] = useState(null);
  const pending = useRef(null);
  const mounted = useRef(true);
  const loadVersion = useRef(0);

  const refresh = async () => {
    const version = ++loadVersion.current;
    setError(''); setLoading(true);
    try {
      const result = mine ? await api.myCompetitions() : await api.competitions(filterDistrict ? { districtId: String(filterDistrict.id) } : {});
      if (mounted.current && version === loadVersion.current) setList(result.competitions);
    } catch (e) { if (mounted.current && version === loadVersion.current) setError(e.message); }
    finally { if (mounted.current && version === loadVersion.current) setLoading(false); }
  };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { refresh(); }, [mine, filterDistrict]);
  useEffect(() => {
    if (page !== 'create' && page !== 'filter') return;
    let active = true;
    const timer = setTimeout(() => api.getDistricts(districtQuery).then(result => { if (active) setDistricts(result.districts); }).catch(e => { if (active) setError(e.message); }), 300);
    return () => { active = false; clearTimeout(timer); };
  }, [districtQuery, page]);

  const open = async summary => {
    setBusy(true); setError('');
    try {
      const membership = await api.myCompetitions();
      const own = membership.competitions.find(item => item.id === summary.id);
      if (mounted.current) { setRoom(own || summary); setManageRoles(false); setPage('detail'); }
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) setBusy(false); }
  };
  const lookup = async () => {
    setBusy(true); setError('');
    try { const result = await api.competitionByCode(code); await open(result.competition); }
    catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) setBusy(false); }
  };
  const command = async (name, body) => {
    if (busy) return;
    setBusy(true); setError('');
    const fingerprint = JSON.stringify([name, body]);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, payload: { ...body, requestId: requestId() } };
    try {
      const result = await api.competitionCommand(name, pending.current.payload);
      pending.current = null;
      if (!mounted.current) return;
      if (name === 'leave') { setRoom(null); setPage('list'); await refresh(); }
      else { setRoom(result.data); setEditing(false); setPicker(null); setPage('detail'); }
    } catch (e) {
      if (!mounted.current) return;
      if (e.code === 'REVISION_CONFLICT') {
        pending.current = null;
        try {
          const latest = await api.competitionByCode(body.code || room.code);
          const owned = await api.myCompetitions();
          setRoom(owned.competitions.find(value => value.id === latest.competition.id) || latest.competition);
        } catch {}
      }
      setError(e.message);
    } finally { if (mounted.current) setBusy(false); }
  };
  const own = !!room?.teamA && [...room.teamA, ...room.teamB].some(member => member.id === user.id);
  const isHost = room?.hostUserId === user.id;
  const preparing = !!room && ['OPEN', 'FULL'].includes(room.status);
  const myTeam = own ? (room.teamA.some(member => member.id === user.id) ? 'teamA' : 'teamB') : null;
  const me = own ? room[myTeam].find(member => member.id === user.id) : null;
  useEffect(() => {
    setMatch(null);
    if (!own || !room?.matchId || page !== 'detail') return;
    let active = true;
    api.competitionMatch(room.id).then(result => { if (active) setMatch(result.match); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [room?.matchId, room?.id, page, own]);
  const editDetails = () => {
    setFormat(room.formatId); setDistrict({ id: room.venue.districtId, label: room.district });
    setVenue(room.venue.name); setAddress(room.venue.address); setWhen(new Date(room.scheduledAt));
    setEditing(true); setError(''); setPage('create');
  };
  const goList = () => { setPage('list'); setRoom(null); setError(''); refresh(); };
  const payload = extra => ({ competitionId: room.id, expectedRevision: room.revision, ...extra });
  const selectDate = (event, value) => {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type === 'dismissed') return;
    if (value) setWhen(value);
  };

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {page !== 'list' && <Button title="← Volver" secondary disabled={busy} onPress={() => page === 'details' ? setPage('create') : goList()} />}
      <Text style={styles.title}>{(page === 'create' || page === 'details') ? (editing ? 'Editar convocatoria' : 'Crear convocatoria') : page === 'detail' ? 'Convocatoria' : page === 'code' ? 'Unirme por código' : page === 'filter' ? 'Elegir ubicación' : mine ? 'Mis convocatorias' : 'Encuentra tu próximo partido'}</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {busy && <ActivityIndicator color="#10b981" />}
      {page === 'list' && <>
        <Text style={styles.muted}>{mine ? 'Tus inscripciones se conservan al cerrar la app.' : filterDistrict?.label || 'Todo Perú · elige tu distrito para ver partidos cercanos'}</Text>
        {!mine && <Button title="Elegir distrito" secondary onPress={() => { setDistrictQuery(''); setPage('filter'); }} />}
        <Button title="+ Crear convocatoria" onPress={() => { setError(''); setEditing(false); setDistrict(null); setPage('create'); }} />
        <Button title="Tengo un código" secondary onPress={() => setPage('code')} />
        <Button title="Actualizar" secondary onPress={refresh} disabled={loading} />
        {loading ? <ActivityIndicator color="#10b981" /> : list.length === 0 && !error ? <Text style={styles.muted}>Todavía no hay convocatorias. Crea una y comparte su código.</Text> : list.map(value => <Pressable accessibilityRole="button" key={value.id} onPress={() => open(value)} disabled={busy} style={styles.card}>
          <Text style={styles.heading}>Fútbol {value.formatId.split('v')[0]} · {value.status === 'CANCELLED' ? 'Cancelada' : value.status === 'IN_PROGRESS' ? 'En juego' : `${value.currentPlayers ?? value.teamA.length + value.teamB.length}/${value.totalSlots ?? value.playersPerTeam * 2} jugadores`}</Text>
          <Text style={styles.text}>{value.venue.name}</Text><Text style={styles.muted}>{value.district}</Text><Text style={styles.text}>{dateLabel(value.scheduledAt)}</Text>
        </Pressable>)}
      </>}
      {page === 'code' && <><Field label="Código de convocatoria" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={8} /><Button title="Buscar convocatoria" disabled={busy || code.trim().length !== 8} onPress={lookup} /></>}
      {(page === 'create' || page === 'filter' || page === 'details') && <>
        {page === 'create' && <><Text style={styles.label}>Modalidad</Text><View style={styles.row}>{formats.map(value => <Button key={value} title={value.split('v')[0]} secondary={format !== value} onPress={() => setFormat(value)} disabled={busy} />)}</View></>}
        {page === 'create' && district && <Button title={`Continuar con ${district.label}`} secondary onPress={() => setPage('details')} />}
        {page !== 'details' && <Field label="Buscar distrito, provincia o departamento" value={districtQuery} onChangeText={setDistrictQuery} />}
        {page === 'details' && district ? <Text style={styles.text}>Seleccionado: {district.label}</Text> : null}
        {(page === 'details' ? [] : districts.slice(0, 8)).map(value => <Pressable key={value.id} disabled={busy} style={styles.card} onPress={() => { if (page === 'filter') { setFilterDistrict(value); setPage('list'); } else { setDistrict(value); setDistricts([]); setPage('details'); } }}><Text style={styles.text}>{value.label}</Text></Pressable>)}
        {page === 'filter' && <Button title="Ver todo Perú" secondary onPress={() => { setFilterDistrict(null); setPage('list'); }} />}
        {page === 'details' && district && <>
          <Field label="Nombre de la cancha" value={venue} onChangeText={setVenue} maxLength={120} editable={!busy} />
          <Field label="Dirección" value={address} onChangeText={setAddress} maxLength={240} editable={!busy} />
          <Text style={styles.muted}>Fecha y hora de Perú. Coordina la disponibilidad de la cancha con sus responsables.</Text>
          <Button title={when ? dateLabel(when) : 'Elegir fecha'} secondary disabled={busy} onPress={() => setPicker('date')} />
          <Button title="Elegir hora" secondary disabled={busy} onPress={() => setPicker('time')} />
          {picker && <><DateTimePicker value={when || new Date()} mode={picker} display={Platform.OS === 'ios' ? 'spinner' : 'default'} timeZoneName="America/Lima" themeVariant="dark" onChange={selectDate} /><Button title="Listo" secondary onPress={() => setPicker(null)} /></>}
          <Button title={editing ? "Guardar cambios" : "Crear y obtener código"} disabled={busy || !venue.trim() || !address.trim() || !when} onPress={() => { const fields = { formatId: format, scheduledAt: when.toISOString(), timeZone: 'America/Lima', venue: { name: venue.trim(), address: address.trim(), districtId: String(district.id) } }; command(editing ? 'updateDetails' : 'create', editing ? payload(fields) : { countryCode: 'PE', sportId: 'futbol', ...fields }); }} />
        </>}
      </>}
      {page === 'detail' && room && <>
        <Text style={styles.heading}>Fútbol {room.formatId.split('v')[0]} · {room.status === 'CANCELLED' ? 'Cancelada' : room.status === 'IN_PROGRESS' ? 'En juego' : room.status === 'FULL' ? 'Completa' : 'Convocando'}</Text>
        <Text style={styles.text}>{room.venue.name}</Text><Text style={styles.muted}>{room.venue.address} · {room.district}</Text><Text style={styles.text}>{dateLabel(room.scheduledAt)}</Text>
        <Text selectable style={styles.code}>{room.code}</Text>
        <View style={styles.row}><Button title="Copiar código" secondary onPress={async () => { try { await Clipboard.setStringAsync(room.code); Alert.alert('Código copiado'); } catch(e) { setError(e.message); } }} /><Button title="Compartir" secondary onPress={() => Share.share({ message: `MatchSport · Fútbol ${room.formatId.split('v')[0]}\n${room.venue.name}, ${room.district}\n${dateLabel(room.scheduledAt)} (Perú)\nCódigo: ${room.code}` }).catch(e => setError(e.message))} /></View>
        {match && <Text style={styles.text}>Partido en curso · {dateLabel(match.startedAt)}. Equipos confirmados.</Text>}
        {room.status === 'CANCELLED' ? <Text style={styles.muted}>{room.cancelReason || 'Convocatoria cerrada'}</Text> : !own ? <>
          {!preparing && <Text style={styles.muted}>El partido ya comenzó. No se admiten más participantes.</Text>}
          {preparing && ['teamA', 'teamB'].map((team, index) => <Button key={team} title={`Unirme al equipo ${index ? 'B' : 'A'} (${index ? room.teamBCount : room.teamACount}/${room.playersPerTeam})`} disabled={busy || (index ? room.teamBCount : room.teamACount) >= room.playersPerTeam} onPress={() => command('join', { code: room.code, team, expectedRevision: room.revision })} />)}
        </> : <>
          <Button title="Actualizar sala" secondary disabled={busy} onPress={async () => { setBusy(true); try { setRoom((await api.competition(room.id)).competition); } catch(e) { setError(e.message); } finally { setBusy(false); } }} />
          {preparing && <Button title={me.ready ? 'Quitar Listo' : 'Estoy listo'} disabled={busy} onPress={() => command('setReady', payload({ ready: !me.ready }))} />}
          {preparing && isHost && <><Button title="Iniciar partido" disabled={busy || room.status !== 'FULL' || ![...room.teamA, ...room.teamB].every(member => member.ready) || Date.now() < Date.parse(room.scheduledAt)} onPress={() => Alert.alert('Iniciar partido', 'Se confirmarán los equipos y se cerrarán los cupos.', [{ text: 'Volver', style: 'cancel' }, { text: 'Iniciar', onPress: () => command('start', payload({})) }])} /><Text style={styles.muted}>Se inicia con los equipos completos, todos listos y desde la hora programada.</Text></>}
          {preparing && <Button title={manageRoles ? 'Cerrar opciones' : 'Opciones de sala'} secondary disabled={busy} onPress={() => setManageRoles(value => !value)} />}
          {preparing && manageRoles && <><Button title={`Cambiar al equipo ${myTeam === 'teamA' ? 'B' : 'A'}`} secondary disabled={busy} onPress={() => command('switchTeam', payload({ team: myTeam === 'teamA' ? 'teamB' : 'teamA' }))} />{isHost && <Button title="Editar cancha, horario o modalidad" secondary disabled={busy} onPress={editDetails} />}</>}
          {['teamA', 'teamB'].map((team, index) => <View key={team} style={styles.card}><Text style={styles.heading}>Equipo {index ? 'B' : 'A'} · {room[team].length}/{room.playersPerTeam}</Text>{room[team].map(member => <View key={member.id}>
            <Text style={styles.text}>{member.name}{room.captains[team] === member.id ? ' · Capitán' : ''}{preparing && member.ready ? ' · Listo' : ''}</Text>
            {preparing && manageRoles && member.id !== user.id && <>
              {isHost && <Button title={`Pasar anfitrión a ${member.name}`} secondary disabled={busy} onPress={() => command('transferHost', payload({ targetUserId: member.id }))} />}
              {room.captains[team] === user.id && <Button title={`Pasar capitanía a ${member.name}`} secondary disabled={busy} onPress={() => command('transferCaptain', payload({ targetUserId: member.id }))} />}
            </>}
          </View>)}</View>)}
          {preparing && <Button title="Salir de la convocatoria" secondary disabled={busy} onPress={() => command('leave', payload({}))} />}
          {preparing && isHost && manageRoles && <><Field label="Motivo de cancelación" value={reason} onChangeText={setReason} maxLength={1000} /><Button title="Cancelar convocatoria" secondary disabled={busy || !reason.trim()} onPress={() => Alert.alert('Cancelar convocatoria', 'Se cerrará para todos sus participantes.', [{ text: 'Volver', style: 'cancel' }, { text: 'Cancelar convocatoria', style: 'destructive', onPress: () => command('cancel', payload({ reason })) }])} /></>}
        </>}
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' }, heading: { color: '#fff', fontSize: 18, fontWeight: '700' },
  text: { color: '#e2e8f0', fontSize: 16 }, muted: { color: '#94a3b8', fontSize: 14 }, label: { color: '#cbd5e1', fontSize: 14, marginBottom: 7 },
  input: { color: '#fff', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, fontSize: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, gap: 8 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: '#047857', borderRadius: 12, padding: 14, alignItems: 'center' }, secondary: { backgroundColor: '#334155' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 }, error: { color: '#fca5a5', fontSize: 15 }, code: { color: '#34d399', fontSize: 28, letterSpacing: 3 },
});
