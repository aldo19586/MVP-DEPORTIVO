import { API_BASE_URL } from '../config';

async function handleResponse(res) {
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.error || `Error HTTP ${res.status}`;
    throw new Error(errorMsg);
  }
  return json;
}

export const api = {
  // Autenticación por PIN de 4 dígitos
  async pinLogin(name, pin) {
    const res = await fetch(`${API_BASE_URL}/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin })
    });
    return handleResponse(res);
  },

  async pinRegister(userData) {
    const res = await fetch(`${API_BASE_URL}/auth/pin-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  async checkName(name) {
    const res = await fetch(`${API_BASE_URL}/auth/check-name/${encodeURIComponent(name)}`);
    return handleResponse(res);
  },

  // Perfil y Datos de Usuario
  async getUser(userId) {
    const res = await fetch(`${API_BASE_URL}/user/${userId}`);
    return handleResponse(res);
  },

  async getUserMatches(userId) {
    const res = await fetch(`${API_BASE_URL}/user/${userId}/matches`);
    return handleResponse(res);
  },

  // Deportes y Formatos
  async getSports() {
    const res = await fetch(`${API_BASE_URL}/sports`);
    return handleResponse(res);
  },

  // Distritos de Perú con filtro geográfico
  async getDistricts(query = '') {
    const url = query
      ? `${API_BASE_URL}/districts?query=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/districts`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  // Bolsa de Suplentes (Salas incompletas)
  async getReplacementLobbies(sportId = null, district = null) {
    const params = new URLSearchParams();
    if (sportId) params.append('sportId', sportId);
    if (district) params.append('district', district);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/lobbies/replacements${queryString}`);
    return handleResponse(res);
  },

  // Datos de Partido
  async getMatch(matchId) {
    const res = await fetch(`${API_BASE_URL}/match/${matchId}`);
    return handleResponse(res);
  },

  // Leaderboard
  async getLeaderboard(sportId, formatId) {
    const res = await fetch(`${API_BASE_URL}/leaderboard/${sportId}/${formatId}`);
    return handleResponse(res);
  },

  // Peer-Review Circular (Post-Partido 1-Toque)
  async getPeerReviewAssignment(matchId, userId) {
    const res = await fetch(`${API_BASE_URL}/match/${matchId}/peer-review/${userId}`);
    return handleResponse(res);
  },

  async submitPeerReview({ matchId, evaluatorId, attributeTag }) {
    const res = await fetch(`${API_BASE_URL}/match/peer-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, evaluatorId, attributeTag })
    });
    return handleResponse(res);
  }
};
