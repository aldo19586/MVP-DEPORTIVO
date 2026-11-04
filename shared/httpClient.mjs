// Shared transport; storage and session UI remain platform-specific.
export function createHttpClient({ baseUrl, getToken, invalidate, fetcher = (...args) => fetch(...args) }) {
  return async function request(path, { method = 'GET', body, publicAccess = false } = {}) {
    const token = publicAccess ? null : await getToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(`${baseUrl}${path}`, {
        method, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 && !publicAccess) await invalidate(token);
        const error = new Error(data.error || `Error HTTP ${response.status}`);
        error.status = response.status;
        error.code = data.code;
        throw error;
      }
      return data;
    } finally { clearTimeout(timeout); }
  };
}
