import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCompetitionCommand as validate, outcomeFromScore } from '../../shared/competitionContract.mjs';

const create = { requestId: 'create-1', countryCode: 'PE', sportId: 'futbol', formatId: '5v5',
  scheduledAt: '2026-12-01T01:00:00.000Z', timeZone: 'America/Lima',
  venue: { name: 'Cancha de prueba', address: 'Dirección sintética', districtId: 'synthetic-district' } };
const report = { requestId: 'score-1', expectedRevision: 3, competitionId: 'competition-1', score: { teamA: 3, teamB: 3 } };

test('national Peru scope accepts the five selected formats and requires scheduling/location', () => {
  assert.equal(validate('create', create).ok, true);
  for (const formatId of ['5v5', '6v6', '7v7', '9v9', '11v11']) assert.equal(validate('create', { ...create, formatId }).ok, true);
  assert.equal(validate('create', { ...create, formatId: '1v1' }).ok, false);
  assert.equal(validate('create', { ...create, countryCode: 'OTHER' }).ok, false);
  for (const date of ['2026-02-30T01:00:00.000Z', 'mañana a las 8', '2026-12-01T01:00:00-05:00']) {
    assert.equal(validate('create', { ...create, scheduledAt: date }).ok, false);
  }
  assert.equal(validate('create', { ...create, venue: { name: 'Solo nombre' } }).ok, false);
});

test('commands reject actor/role/rating injection, unknown operations and malformed envelopes', () => {
  for (const field of ['userId', 'role', 'rating', 'winnerTeam', 'password']) {
    assert.equal(validate('reportScore', { ...report, [field]: 'injected' }).ok, false, field);
  }
  assert.equal(validate('__proto__', report).code, 'UNKNOWN_COMMAND');
  for (const payload of [null, [], 'payload']) assert.equal(validate('reportScore', payload).ok, false);
  for (const revision of [undefined, -1, 1.2, '3', NaN, Infinity]) {
    assert.equal(validate('reportScore', { ...report, expectedRevision: revision }).ok, false);
  }
  assert.equal(validate('reportScore', { ...report, requestId: '' }).ok, false);
});

test('scores support draws and derive winner from global team orientation', () => {
  assert.equal(validate('reportScore', report).ok, true);
  assert.equal(outcomeFromScore(report.score), 'draw');
  assert.equal(outcomeFromScore({ teamA: 4, teamB: 1 }), 'teamA');
  assert.equal(outcomeFromScore({ teamA: 0, teamB: 1 }), 'teamB');
  for (const value of [{ teamA: -1, teamB: 0 }, { teamA: '3', teamB: 3 }, { teamA: 1.5, teamB: 1 }, { teamA: 1, teamB: 0, winner: 'teamB' }]) {
    assert.equal(validate('reportScore', { ...report, score: value }).ok, false);
    assert.throws(() => outcomeFromScore(value), /Marcador/);
  }
});

test('confirmation targets a particular report and admin resolution requires a reason', () => {
  const envelope = { requestId: 'confirm-1', competitionId: 'competition-1', expectedRevision: 4 };
  assert.equal(validate('confirmScore', envelope).ok, false);
  assert.equal(validate('confirmScore', { ...envelope, reportId: 'report-1' }).ok, true);
  assert.equal(validate('confirmCancellation', envelope).ok, false);
  assert.equal(validate('confirmCancellation', { ...envelope, cancellationId: 'cancel-1' }).ok, true);
  assert.equal(validate('setReady', { ...envelope, ready: 'true' }).ok, false);
  assert.equal(validate('setReady', { ...envelope, ready: false }).ok, true);
  const resolution = { ...envelope, disputeId: 'dispute-1', score: { teamA: 0, teamB: 0 }, reason: 'Marcador verificado' };
  assert.equal(validate('resolveDispute', resolution).ok, true);
  assert.equal(validate('resolveDispute', { ...resolution, reason: ' ' }).ok, false);
  assert.equal(validate('resolveDispute', { ...resolution, adminUserId: 'client-chosen-admin' }).ok, false);
});

test('validated commands are detached from input and do not mutate it', () => {
  const source = structuredClone(report);
  const accepted = validate('reportScore', source);
  source.score.teamA = 999;
  assert.equal(accepted.value.score.teamA, 3);
  assert.deepEqual(report.score, { teamA: 3, teamB: 3 });
});
