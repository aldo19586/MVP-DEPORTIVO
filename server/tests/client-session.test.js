import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from '../../shared/httpClient.mjs';
import { createSessionStore } from '../../apps/mobile/src/services/sessionStore.mjs';

function memoryStorage() {
  const secure = new Map(); const cache = new Map();
  const store = createSessionStore({
    getItemAsync: async key => secure.get(key) ?? null,
    setItemAsync: async (key, value) => secure.set(key, value),
    deleteItemAsync: async key => secure.delete(key),
  }, {
    getItem: async key => cache.get(key),
    setItem: async (key, value) => cache.set(key, value),
    multiRemove: async keys => keys.forEach(key => cache.delete(key)),
  });
  return { store, secure, cache };
}

test('mobile stores token only in secure storage and profile updates preserve it', async () => {
  const { store, cache, secure } = memoryStorage();
  await store.saveUserSession({ id: 'a' }, 'secret-token');
  await store.saveUserSession({ id: 'a', name: 'Updated' });
  assert.equal(await store.getToken(), 'secret-token');
  assert.equal([...cache.values()].some(value => value.includes('secret-token')), false);
  assert.equal((await store.getUserSession()).name, 'Updated');
  cache.set('@matchsport:user_pin', 'legacy-pin');
  cache.set('@matchsport:fut_stats', 'private-stats');
  assert.equal(await store.clearUserSession(), true);
  assert.equal(secure.size, 0); assert.equal(cache.size, 0);
});

test('expired private request invalidates session; failed login and forbidden requests do not', async () => {
  const { store } = memoryStorage();
  await store.saveUserSession({ id: 'a' }, 'token-a');
  let status = 401; let observed;
  const client = createHttpClient({ baseUrl: 'https://api.test', getToken: store.getToken, invalidate: store.clearUserSession,
    fetcher: async (url, options) => { observed = options; return { ok: false, status, json: async () => ({ error: 'Denied' }) }; },
  });
  await assert.rejects(client('/auth/login', { publicAccess: true }), { status: 401 });
  assert.equal(observed.headers.Authorization, undefined);
  assert.equal(await store.getToken(), 'token-a');
  status = 403;
  await assert.rejects(client('/admin/users'), { status: 403 });
  assert.equal(observed.headers.Authorization, 'Bearer token-a');
  assert.equal(await store.getToken(), 'token-a');
  status = 401;
  await assert.rejects(client('/auth/me'), { status: 401 });
  assert.equal(await store.getToken(), null);
});

test('network failure retains the session for retry', async () => {
  const { store } = memoryStorage();
  await store.saveUserSession({ id: 'a' }, 'token-a');
  const client = createHttpClient({ baseUrl: '', getToken: store.getToken, invalidate: store.clearUserSession,
    fetcher: async () => { throw new TypeError('Offline'); },
  });
  await assert.rejects(client('/auth/me'), /Offline/);
  assert.equal(await store.getToken(), 'token-a');
});

test('late 401 from previous account cannot erase a newly established session', async () => {
  const { store } = memoryStorage();
  await store.saveUserSession({ id: 'a' }, 'token-a');
  let respond;
  let started;
  const sent = new Promise(resolve => { started = resolve; });
  const client = createHttpClient({ baseUrl: '', getToken: store.getToken, invalidate: store.clearUserSession,
    fetcher: () => { started(); return new Promise(resolve => { respond = resolve; }); },
  });
  const pending = client('/user/a');
  const rejected = assert.rejects(pending, { status: 401 });
  await sent;
  await store.saveUserSession({ id: 'b' }, 'token-b');
  respond({ ok: false, status: 401, json: async () => ({}) });
  await rejected;
  assert.equal(await store.getToken(), 'token-b');
  assert.equal((await store.getUserSession()).id, 'b');
});

test('secure-store failures propagate and do not silently claim to save a session', async () => {
  const store = createSessionStore({ setItemAsync: async () => { throw new Error('Keychain unavailable'); } }, {
    setItem: async () => assert.fail('Must not cache successful login'),
  });
  await assert.rejects(store.saveUserSession({ id: 'a' }, 'token-a'), /Keychain unavailable/);
});

test('admin validates cached session and propagates permission errors instead of showing false success', async t => {
  const items = new Map();
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const originalFetch = globalThis.fetch;
  globalThis.window = { location: { hostname: 'localhost' } };
  globalThis.localStorage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
  t.after(() => { globalThis.window = originalWindow; globalThis.localStorage = originalStorage; globalThis.fetch = originalFetch; });
  const admin = await import('../../apps/admin-web/src/services/api.js');
  items.set('matchsport_admin_user', JSON.stringify({ id: 'fake', role: 'admin' }));
  globalThis.fetch = async () => assert.fail('A cached user alone must never authenticate');
  assert.equal(await admin.restoreAdmin(), null);
  items.set('matchsport_admin_token', 'valid');
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ user: { id: 'a', role: 'admin' } }) });
  assert.equal((await admin.restoreAdmin()).id, 'a');
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) });
  await assert.rejects(admin.banUser('b'), { status: 403 });
  assert.equal(admin.getAdminToken(), 'valid');
  let invalidated = false;
  const off = admin.onAdminSessionExpired(() => { invalidated = true; });
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: 'Expired' }) });
  await assert.rejects(admin.fetchAdminMetrics(), { status: 401 });
  assert.equal(invalidated, true);
  assert.equal(admin.getAdminToken(), null);
  off();
});
