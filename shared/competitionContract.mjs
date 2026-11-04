// MS-05 contract; integration and migration are scheduled in MS-07/MS-09.
// Authorization and transitions belong to the server.
export const COMPETITION_CONTRACT_VERSION = 'competition.v1';
export const COMPETITION_SCOPE = Object.freeze({
  countryCode: 'PE', sportId: 'futbol',
  formatIds: Object.freeze(['5v5', '6v6', '7v7', '9v9', '11v11']),
});

const string = (max = 100) => value => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (min, max) => value => Number.isSafeInteger(value) && value >= min && value <= max;
const team = value => ['teamA', 'teamB'].includes(value);
const utc = value => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const venue = value => record(value) &&
  Object.keys(value).every(key => ['name', 'address', 'districtId'].includes(key)) &&
  string(120)(value.name) && string(240)(value.address) && string(100)(value.districtId);
const score = value => record(value) && Object.keys(value).length === 2 &&
  integer(0, 999)(value.teamA) && integer(0, 999)(value.teamB);

const schemas = {
  create: { countryCode: value => value === COMPETITION_SCOPE.countryCode,
    sportId: value => value === COMPETITION_SCOPE.sportId,
    formatId: value => COMPETITION_SCOPE.formatIds.includes(value),
    scheduledAt: utc, timeZone: string(), venue },
  join: { code: string(40), team },
  leave: { competitionId: string() },
  switchTeam: { competitionId: string(), team },
  setReady: { competitionId: string(), ready: value => typeof value === 'boolean' },
  updateDetails: { competitionId: string(), formatId: value => COMPETITION_SCOPE.formatIds.includes(value),
    scheduledAt: utc, timeZone: string(), venue },
  transferHost: { competitionId: string(), targetUserId: string() },
  transferCaptain: { competitionId: string(), targetUserId: string() },
  start: { competitionId: string() },
  reportScore: { competitionId: string(), score },
  confirmScore: { competitionId: string(), reportId: string() },
  disputeScore: { competitionId: string(), reportId: string(), reason: string(1000) },
  cancel: { competitionId: string(), reason: string(1000) },
  confirmCancellation: { competitionId: string(), cancellationId: string() },
  resolveDispute: { competitionId: string(), disputeId: string(), score, reason: string(1000) },
};
export const COMPETITION_COMMANDS = Object.freeze(Object.keys(schemas));

export function validateCompetitionCommand(command, payload) {
  if (!Object.hasOwn(schemas, command)) return { ok: false, code: 'UNKNOWN_COMMAND', issues: ['command'] };
  if (!record(payload)) return { ok: false, code: 'INVALID_PAYLOAD', issues: ['payload'] };
  const fields = { requestId: string(100), ...schemas[command],
    ...(command === 'create' ? {} : { expectedRevision: integer(0, Number.MAX_SAFE_INTEGER) }) };
  const issues = Object.keys(payload).filter(key => !Object.hasOwn(fields, key));
  for (const [key, validate] of Object.entries(fields)) if (!validate(payload[key])) issues.push(key);
  if (issues.length) return { ok: false, code: 'INVALID_PAYLOAD', issues };
  // Detach nested data: callers cannot change a validated command through its input.
  return { ok: true, value: JSON.parse(JSON.stringify(payload)) };
}

export function outcomeFromScore(value) {
  if (!score(value)) throw new TypeError('Marcador inválido');
  return value.teamA === value.teamB ? 'draw' : value.teamA > value.teamB ? 'teamA' : 'teamB';
}
