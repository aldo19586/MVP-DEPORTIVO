// Explicit transport shape: credentials and push tokens never belong in user responses.
// Own account and administrator views; public player summaries use toPublicUser.
const CLIENT_FIELDS = [
  'id', 'email', 'name', 'avatar', 'district', 'country', 'department', 'reference',
  'age', 'weight', 'height', 'hasCompletedProfile', 'hasCompletedTest', 'testScore',
  'testLevel', 'testBreakdown', 'bio', 'position', 'role', 'verifiedDni',
  'ratingOverall', 'likesCount', 'futStats', 'favoriteSports', 'primarySport',
  'declaredLevel', 'createdAt', 'matchesPlayed', 'isBanned', 'bannedUntil', 'banReason',
];

export function toClientUser(user) {
  if (!user) return null;
  return Object.fromEntries(CLIENT_FIELDS.filter(key => user[key] !== undefined).map(key => [key, user[key]]));
}

const PUBLIC_FIELDS = ['id', 'userId', 'name', 'avatar', 'position', 'rating', 'ratingOverall',
  'futStats', 'matchesPlayed', 'isCaptain', 'isHost', 'isReady', 'rd', 'ovr', 'team', 'connected', 'status', 'claim'];

export function toPublicUser(user) {
  if (!user) return null;
  return Object.fromEntries(PUBLIC_FIELDS.filter(key => user[key] !== undefined).map(key => [key, user[key]]));
}

export function toResource(resource, viewer) {
  if (!resource) return resource;
  const result = { ...resource };
  for (const team of ['teamA', 'teamB', 'myTeam', 'rivalTeam']) {
    if (Array.isArray(result[team])) result[team] = result[team].map(toPublicUser);
  }
  const myTeam = ['teamA', 'teamB'].find(team => resource[team]?.some(p => (p.userId || p.id) === viewer?.userId));
  for (const key of ['chat', 'chatMessages']) {
    if (Array.isArray(result[key])) result[key] = result[key].filter(message =>
      viewer?.role === 'admin' || (myTeam && (!message.isPrivate || message.team === myTeam)));
  }
  return result;
}
