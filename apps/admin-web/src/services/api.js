const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

export async function fetchAdminMetrics() {
  try {
    const res = await fetch(`${BASE_URL}/admin/metrics`);
    if (!res.ok) throw new Error('Error al obtener métricas');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchAdminMetrics:', err);
    return { metrics: { totalUsers: 0, totalMatches: 0, activeMatches: 0, activeSearches: 0, disputes: 0, sportsCount: 4 } };
  }
}

export async function fetchLiveActivity() {
  try {
    const res = await fetch(`${BASE_URL}/admin/live-activity`);
    if (!res.ok) throw new Error('Error al obtener actividad en vivo');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchLiveActivity:', err);
    return { onlineCount: 0, onlineUsers: [], activeMatches: [] };
  }
}

export async function fetchAdminUsers() {
  try {
    const res = await fetch(`${BASE_URL}/admin/users`);
    if (!res.ok) throw new Error('Error al obtener usuarios');
    return await res.json();
  } catch (err) {
    console.error('API Error fetchAdminUsers:', err);
    return { users: [] };
  }
}

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sportId, formatId, active })
  });
  return await res.json();
}
