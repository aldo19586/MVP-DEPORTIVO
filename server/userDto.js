// Explicit transport shape: credentials and push tokens never belong in user responses.
// Field visibility by viewer/role is tightened with route authorization in MS-03.
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
