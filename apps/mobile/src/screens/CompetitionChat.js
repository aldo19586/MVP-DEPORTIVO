import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, AppState } from 'react-native';
import { createCompetitionChat } from '../../../../shared/competitionChatClient.mjs';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { chatOutbox } from '../services/chatOutbox';

export default function CompetitionChat({ room, user, onBack }) {
  const [state, setState] = useState({ messages: [], pending: [], loading: true, connected: false, error: '' });
  const [draft, setDraft] = useState('');
  const client = useRef(null);
  const active = useRef(true);
  const closed = !['OPEN', 'FULL', 'IN_PROGRESS', 'RESULT_PENDING', 'DISPUTED'].includes(room.status);
  useEffect(() => {
    active.current = true;
    const chat = createCompetitionChat({ competitionId: room.id, senderId: user.id, socket: socketService.getSocket(),
      fetchPage: after => api.competitionMessages(room.id, after), send: body => api.sendCompetitionMessage(room.id, body),
      ...chatOutbox(user.id, room.id), onChange: setState });
    client.current = chat;
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') chat.sync(); });
    return () => { active.current = false; subscription.remove(); chat.dispose(); client.current = null; };
  }, [room.id, user.id]);
  const submit = () => {
    const text = draft;
    setDraft('');
    client.current?.sendText(text).catch(e => { if (active.current) { setDraft(value => value || text); setState(value => ({ ...value, error: e.message })); } });
  };
  const rows = [...state.messages, ...state.pending.map(item => ({ ...item, id: `pending:${item.requestId}`, senderId: user.id, senderName: 'Tú', pending: true }))].reverse();
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Pressable accessibilityRole="button" onPress={onBack} style={styles.button}><Text style={styles.text}>← Volver a la convocatoria</Text></Pressable>
    <Text style={styles.title}>Chat de la sala</Text>
    <Text style={styles.muted}>{closed ? 'Chat cerrado · puedes consultar el historial' : state.connected ? 'Solo participantes de esta convocatoria' : 'Reconectando · tus mensajes pendientes se conservan'}</Text>
    {!!state.error && <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>}
    {state.loading && <ActivityIndicator color="#10b981" />}
    <Pressable accessibilityRole="button" onPress={() => client.current?.sync()} style={styles.refresh}><Text style={styles.text}>Actualizar mensajes</Text></Pressable>
    <FlatList style={styles.list} inverted data={rows} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={!state.loading ? <Text style={styles.muted}>Todavía no hay mensajes. Coordina aquí con tu equipo y sus rivales.</Text> : null}
      renderItem={({ item }) => <View style={[styles.message, item.senderId === user.id && styles.own]}>
        <Text style={styles.sender}>{item.senderId === user.id ? 'Tú' : item.senderName}</Text>
        <Text selectable style={styles.text}>{item.text}</Text>
        <Text style={styles.muted}>{new Date(item.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}{item.pending ? item.status === 'sending' ? ' · Enviando…' : ' · No confirmado' : ''}</Text>
        {item.pending && item.status === 'error' && !closed && <Pressable accessibilityRole="button" onPress={() => client.current?.retry(item.requestId)} style={styles.refresh}><Text style={styles.text}>Reintentar</Text></Pressable>}
      </View>} />
    {!closed && <View style={styles.composer}><TextInput accessibilityLabel="Mensaje para la sala" placeholder="Escribe un mensaje" placeholderTextColor="#94a3b8" style={styles.input} multiline maxLength={2000} value={draft} onChangeText={setDraft} /><Pressable accessibilityRole="button" disabled={state.loading || !draft.trim()} onPress={submit} style={[styles.button, (state.loading || !draft.trim()) && { opacity: 0.45 }]}><Text style={styles.text}>Enviar</Text></Pressable></View>}
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a', padding: 16, gap: 10 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' }, text: { color: '#e2e8f0', fontSize: 16 },
  sender: { color: '#6ee7b7', fontSize: 14, fontWeight: '700' }, muted: { color: '#94a3b8', fontSize: 13 },
  error: { color: '#fca5a5', fontSize: 14 }, list: { flex: 1 },
  message: { padding: 12, marginVertical: 5, borderRadius: 12, backgroundColor: '#1e293b', gap: 5 }, own: { backgroundColor: '#064e3b' },
  composer: { gap: 8 }, input: { color: '#fff', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 12, fontSize: 16, maxHeight: 120 },
  button: { backgroundColor: '#047857', padding: 12, borderRadius: 12, alignItems: 'center' }, refresh: { paddingVertical: 10 },
});
