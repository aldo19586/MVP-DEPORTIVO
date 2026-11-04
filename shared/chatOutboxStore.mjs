export function createChatOutboxStore(storage) {
  const writes = new Map();
  return (userId, competitionId) => {
    const key = `@matchsport:chat-outbox:${userId}:${competitionId}`;
    return {
      async loadOutbox() {
        await writes.get(key)?.catch(() => {});
        const data = await storage.getItem(key);
        return data ? JSON.parse(data) : [];
      },
      saveOutbox(values) {
        const operation = (writes.get(key) || Promise.resolve()).catch(() => {}).then(() =>
          values.length ? storage.setItem(key, JSON.stringify(values)) : storage.removeItem(key));
        writes.set(key, operation);
        operation.finally(() => { if (writes.get(key) === operation) writes.delete(key); }).catch(() => {});
        return operation;
      },
    };
  };
}
