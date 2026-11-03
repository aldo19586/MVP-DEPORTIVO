const TOKEN_KEY = 'matchsport_session_token';
const USER_KEY = '@matchsport:user_session';

export function createSessionStore(secure, cache) {
  let pending = Promise.resolve();
  function serial(operation) {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }
  return {
    getToken: () => serial(() => secure.getItemAsync(TOKEN_KEY)),
    saveUserSession: (user, token) => serial(async () => {
      if (token !== undefined) {
        if (typeof token !== 'string' || !token) throw new Error('El servidor no entregó una sesión válida');
        await secure.setItemAsync(TOKEN_KEY, token);
      }
      await cache.setItem(USER_KEY, JSON.stringify(user));
    }),
    getUserSession: () => serial(async () => {
      const value = await cache.getItem(USER_KEY);
      return value ? JSON.parse(value) : null;
    }),
    clearUserSession: (expectedToken) => serial(async () => {
      if (expectedToken !== undefined && await secure.getItemAsync(TOKEN_KEY) !== expectedToken) return false;
      await secure.deleteItemAsync(TOKEN_KEY);
      await cache.multiRemove([USER_KEY, '@matchsport:user_pin', '@matchsport:fut_stats']);
      return true;
    }),
  };
}
