import { API_BASE_URL } from '../config';
import { storage } from './storage';
import { createHttpClient } from '../../../../shared/httpClient.mjs';

const listeners = new Set();
export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const request = createHttpClient({
  baseUrl: API_BASE_URL,
  getToken: storage.getToken,
  invalidate: async token => {
    if (await storage.clearUserSession(token)) for (const listener of listeners) listener();
  },
});
const post = (path, body, publicAccess = false) => request(path, { method: 'POST', body, publicAccess });
const id = encodeURIComponent;
function query(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.append(key, value);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export const api = {
  me: () => request('/auth/me'),
  logout: () => post('/auth/logout', {}),
  pinLogin: (name, pin) => post('/auth/pin-login', { name, pin }, true),
  pinRegister: data => post('/auth/pin-register', data, true),
  checkName: name => request(`/auth/check-name/${id(name)}`, { publicAccess: true }),
  getUser: userId => request(`/user/${id(userId)}`),
  getUserMatches: userId => request(`/user/${id(userId)}/matches`),
  getSports: () => request('/sports', { publicAccess: true }),
  getDistricts: (text = '') => request(`/districts${query({ query: text })}`, { publicAccess: true }),
  getLobbies: ({ sportId, district, status } = {}) => request(`/lobbies${query({ sportId, district, status })}`),
  getReplacementLobbies: (sportId = null, district = null) => request(`/lobbies/replacements${query({ sportId, district })}`),
  getMatch: matchId => request(`/match/${id(matchId)}`),
  getLeaderboard: (sportId, formatId) => request(`/leaderboard/${id(sportId)}/${id(formatId)}`),
  getPeerReviewAssignment: (matchId, userId) => request(`/match/${id(matchId)}/peer-review/${id(userId)}`),
  submitPeerReview: ({ matchId, evaluatorId, attributeTag }) => post('/match/peer-review', { matchId, evaluatorId, attributeTag }),
  completeProfile: data => post('/user/complete-profile', data),
  submitFootballTest: data => post('/user/submit-football-test', data),
};
