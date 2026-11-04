// Native UI supplies transport/storage. History cursors advance only after REST pages,
// never after live events: a newer event must not hide an older missed message.
export function createCompetitionChat({ competitionId, senderId, socket, fetchPage, send,
  loadOutbox = async () => [], saveOutbox = async () => {}, onChange,
  newRequestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` }) {
  const messages = new Map();
  let pending = [];
  let cursor = 0;
  let disposed = false;
  let loading = true;
  let error = '';
  let syncing = null;
  let syncAgain = false;
  const sending = new Set();
  const notify = () => {
    if (!disposed) onChange({ messages: [...messages.values()].sort((a, b) => a.sequence - b.sequence),
      pending: pending.map(value => ({ ...value })), loading, connected: !!socket?.connected, error });
  };
  const persist = () => {
    if (disposed) return Promise.resolve();
    const snapshot = pending.map(value => ({ ...value }));
    // Register the write immediately. The store serializes per account/room, so a
    // reopened screen can wait for every old write before loading its own state.
    try { return Promise.resolve(saveOutbox(snapshot)); }
    catch (e) { return Promise.reject(e); }
  };
  const accept = message => {
    if (message.competitionId !== competitionId) return;
    messages.set(message.id, message);
    if (message.senderId === senderId) pending = pending.filter(value => value.requestId !== message.requestId);
  };
  const report = e => { error = e.message || 'No se pudo actualizar el chat'; notify(); };
  async function sync() {
    if (disposed) return;
    if (syncing) { syncAgain = true; return syncing; }
    syncing = (async () => {
      loading = true; error = ''; notify();
      try {
        do {
          syncAgain = false;
          let hasMore;
          do {
            const page = await fetchPage(cursor);
            if (disposed) return;
            for (const message of page.messages) accept(message);
            const next = page.messages.at(-1)?.sequence ?? cursor;
            if (page.hasMore && next <= cursor) throw new Error('No se pudo avanzar el historial');
            cursor = next; hasMore = page.hasMore;
            notify();
          } while (hasMore && !disposed);
        } while (syncAgain && !disposed);
        await persist();
      } catch (e) { report(e); }
      finally { syncing = null; loading = false; notify(); }
    })();
    return syncing;
  }
  async function transmit(requestId) {
    const item = pending.find(value => value.requestId === requestId);
    if (!item || sending.has(requestId) || disposed) return;
    sending.add(requestId); item.status = 'sending'; error = ''; notify();
    try {
      await persist(); // Keep the same key if the app closes or the HTTP acknowledgment is lost.
      if (disposed) return;
      const result = await send({ requestId, text: item.text });
      if (disposed) return;
      accept(result.message); notify();
      await persist();
    } catch (e) {
      const remaining = pending.find(value => value.requestId === requestId);
      if (remaining) remaining.status = 'error';
      report(e);
      await persist().catch(report);
    } finally { sending.delete(requestId); notify(); }
  }
  const live = payload => {
    if (disposed || payload.competitionId !== competitionId) return;
    accept(payload.message); notify(); persist().catch(report);
  };
  const connected = () => { notify(); ready.then(sync).catch(report); };
  const disconnected = () => notify();
  socket?.on('competitionMessage', live);
  socket?.on('connect', connected);
  socket?.on('disconnect', disconnected);
  const ready = (async () => {
    const stored = await loadOutbox();
    if (disposed) return;
    pending = stored.map(value => ({ ...value, status: 'error' }));
    notify();
    await sync();
  })();
  ready.catch(e => { loading = false; report(e); });
  notify();
  return {
    ready, async sync() { try { await ready; return await sync(); } catch (e) { report(e); } },
    async sendText(text) {
      await ready;
      if (disposed) return;
      if (!text.trim() || text.length > 2000) throw new Error('Escribe hasta 2000 caracteres');
      const requestId = newRequestId();
      pending.push({ requestId, text: text.trim(), createdAt: new Date().toISOString(), status: 'sending' });
      return transmit(requestId);
    },
    async retry(requestId) { try { await ready; return await transmit(requestId); } catch (e) { report(e); } },
    dispose() {
      disposed = true;
      socket?.off('competitionMessage', live);
      socket?.off('connect', connected);
      socket?.off('disconnect', disconnected);
    },
  };
}
