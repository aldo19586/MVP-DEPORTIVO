import { createHttpClient } from '../../../../shared/httpClient.mjs';
const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
const TOKEN_KEY = 'matchsport_admin_token';
const USER_KEY = 'matchsport_admin_user';
const listeners = new Set();
export function endAdminSessionView() { for (const listener of listeners) listener(); }
export function onAdminSessionExpired(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export const getAdminToken = () => localStorage.getItem(TOKEN_KEY);
export function clearSession(expected) {
  if (expected !== undefined && getAdminToken() !== expected) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  for (const listener of listeners) listener();
}
const request = createHttpClient({ baseUrl: BASE_URL, getToken: getAdminToken, invalidate: clearSession });
const post = (path, body = {}) => request(path, { method: 'POST', body });

export async function loginAdmin(email, password) {
  const data = await request('/auth/admin-login', { method: 'POST', body: { email, password }, publicAccess: true });
  if (!data.token || data.user?.role !== 'admin') throw new Error('Sesión administrativa inválida');
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}
export async function restoreAdmin() {
  if (!getAdminToken()) { clearSession(); return null; }
  const { user } = await request('/auth/me');
  if (user.role !== 'admin') { clearSession(); return null; }
  return user;
}
export async function logoutAdmin() {
  const token = getAdminToken();
  try { await post('/auth/logout'); }
  finally { clearSession(token); }
}
export const fetchAdminMetrics = () => request('/admin/metrics');
export const fetchLiveActivity = () => request('/admin/live-activity');
export const fetchAdminUsers = () => request('/admin/users');
export const banUser = (id, hours = 24, reason = 'Infracción al código de conducta') => post(`/admin/user/${encodeURIComponent(id)}/ban`, { hours, reason });
export const resetUserPin = (id, newPin = '1234') => post(`/admin/user/${encodeURIComponent(id)}/reset-pin`, { newPin });
export const toggleUserDni = id => post(`/admin/user/${encodeURIComponent(id)}/verify-dni`);
export const fetchDisputes = () => request('/admin/disputes');
export const resolveDisputeApi = (matchId, winnerTeam) => post('/admin/disputes/resolve', { matchId, winnerTeam });
export const fetchSports = () => request('/sports', { publicAccess: true });
export const toggleSportFormat = (sportId, formatId, active) => post('/admin/sport/format', { sportId, formatId, active });
export const fetchVenues = (district = 'all', sportId = 'all') => request(`/venues?${new URLSearchParams({ district, sportId })}`);
export const fetchVenueDetails = id => request(`/venues/${encodeURIComponent(id)}`);
export const bookVenueSlot = (id, slotId, userId, matchId = null) => post(`/venues/${encodeURIComponent(id)}/book`, { slotId, userId, matchId });
