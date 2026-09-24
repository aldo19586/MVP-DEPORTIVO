const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('matchsport_admin_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ---------------- AUTENTICACIÓN ADMIN ----------------

export async function loginAdmin(email, password) {
  const res = await fetch(`${BASE_URL}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciales administrativas inválidas');
  if (data.token) {
    localStorage.setItem('matchsport_admin_token', data.token);
    localStorage.setItem('matchsport_admin_user', JSON.stringify(data.user));
  }
  return data;
}

export function logoutAdmin() {
  localStorage.removeItem('matchsport_admin_token');
  localStorage.removeItem('matchsport_admin_user');
}

export function getStoredAdmin() {
  try {
    const raw = localStorage.getItem('matchsport_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------------- MÉTRICAS Y LIVE ACTIVITY ----------------

export async function fetchAdminMetrics() {
  try {
    const res = await fetch(`${BASE_URL}/admin/metrics`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener métricas');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchAdminMetrics:', err);
    return { metrics: { totalUsers: 0, totalMatches: 0, activeMatches: 0, activeSearches: 0, disputes: 0, sportsCount: 4 } };
  }
}

export async function fetchLiveActivity() {
  try {
    const res = await fetch(`${BASE_URL}/admin/live-activity`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener actividad en vivo');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchLiveActivity:', err);
    return { onlineCount: 0, onlineUsers: [], activeMatches: [] };
  }
}

// ---------------- GESTIÓN Y AUDITORÍA DE USUARIOS ----------------

export async function fetchAdminUsers() {
  try {
    const res = await fetch(`${BASE_URL}/admin/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener usuarios');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchAdminUsers:', err);
    return { users: [] };
  }
}

export async function banUser(userId, hours = 24, reason = 'Infracción al código de conducta') {
  const res = await fetch(`${BASE_URL}/admin/user/${userId}/ban`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ hours, reason })
  });
  return await res.json();
}

export async function resetUserPin(userId, newPin = '1234') {
  const res = await fetch(`${BASE_URL}/admin/user/${userId}/reset-pin`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ newPin })
  });
  return await res.json();
}

export async function toggleUserDni(userId) {
  const res = await fetch(`${BASE_URL}/admin/user/${userId}/verify-dni`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return await res.json();
}

// ---------------- SALA DE DISPUTAS Y ARBITRAJE ----------------

export async function fetchDisputes() {
  try {
    const res = await fetch(`${BASE_URL}/admin/disputes`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener disputas');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchDisputes:', err);
    return { disputes: [] };
  }
}

export async function resolveDisputeApi(matchId, winnerTeam, adminUserId = 'demo_user_admin') {
  const res = await fetch(`${BASE_URL}/admin/disputes/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ matchId, winnerTeam, adminUserId })
  });
  return await res.json();
}

// ---------------- DEPORTES Y FORMATOS ----------------

export async function fetchSports() {
  try {
    const res = await fetch(`${BASE_URL}/sports`);
    if (!res.ok) throw new Error('Error al obtener deportes');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchSports:', err);
    return { sports: [] };
  }
}

export async function toggleSportFormat(sportId, formatId, active) {
  const res = await fetch(`${BASE_URL}/admin/sport/format`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sportId, formatId, active })
  });
  return await res.json();
}

// ---------------- COMPLEJOS DEPORTIVOS Y TURNOS (B2B) ----------------

export async function fetchVenues(district = 'all', sportId = 'all') {
  try {
    const params = new URLSearchParams();
    if (district && district !== 'all') params.append('district', district);
    if (sportId && sportId !== 'all') params.append('sportId', sportId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/venues${qs}`);
    if (!res.ok) throw new Error('Error al obtener complejos');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchVenues:', err);
    return { venues: [] };
  }
}

export async function fetchVenueDetails(venueId) {
  const res = await fetch(`${BASE_URL}/venues/${venueId}`);
  if (!res.ok) throw new Error('Error al obtener detalle del complejo');
  return await res.json();
}

export async function bookVenueSlot(venueId, slotId, userId, matchId = null) {
  const res = await fetch(`${BASE_URL}/venues/${venueId}/book`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ slotId, userId, matchId })
  });
  return await res.json();
}
