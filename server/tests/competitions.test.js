import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from '../config.js';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';

async function setup(t, count = 3) {
  const sandbox = createSandbox(t); let server = await startTestServer(sandbox);
  const users = [];
  for (let index = 0; index < count; index++) users.push(await request(server, '/auth/pin-register', { name: `Competition Player ${index}`, pin: '5678' }));
  return { sandbox, users, get server() { return server; },
    restart: async () => { await server.stop(); server = await startTestServer(sandbox); },
    stop: () => server.stop() };
}
const create = (overrides = {}) => ({ requestId: randomUUID(), countryCode: 'PE', sportId: 'futbol', formatId: '5v5',
  scheduledAt: new Date(Date.now() + 86400000).toISOString(), timeZone: 'America/Lima',
  venue: { name: 'Cancha de prueba', address: 'Dirección de prueba', districtId: '1' }, ...overrides });
async function call(ctx, user, command, data) {
  const response = await fetch(`${ctx.server.url}/api/competitions/commands/${command}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user.token}` } : {}) },
    body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
  });
  return { status: response.status, body: await response.json() };
}
const edit = (room, extra = {}) => ({ requestId: randomUUID(), competitionId: room.id, expectedRevision: room.revision, ...extra });

test('new routes require session and validate real national scheduling and actor ownership', async t => {
  const ctx = await setup(t);
  try {
    for (const path of ['', '/mine', '/by-code/unknown', '/unknown']) assert.equal((await fetch(`${ctx.server.url}/api/competitions${path}`)).status, 401);
    assert.equal((await call(ctx, null, 'create', create())).status, 401);
    for (const overrides of [{ formatId: '1v1' }, { scheduledAt: new Date(0).toISOString() }, { timeZone: 'Europe/London' }, { userId: ctx.users[1].user.id }, { venue: { name: 'x', address: 'y', districtId: 'unknown' } }]) {
      assert.equal((await call(ctx, ctx.users[0], 'create', create(overrides))).status, 400);
    }
    for (const formatId of ['5v5', '6v6', '7v7', '9v9', '11v11']) {
      const result = await call(ctx, ctx.users[0], 'create', create({ formatId }));
      assert.equal(result.status, 200);
      assert.equal(result.body.data.playersPerTeam * 2, parseInt(formatId) * 2);
      assert.equal(result.body.data.hostUserId, ctx.users[0].user.id);
      assert.equal(result.body.data.venue.name, 'Cancha de prueba');
    }
    const qualified = await request(ctx.server, '/districts?query=3%20de%20diciembre%20chupaca', undefined, ctx.users[0].token);
    assert.ok(qualified.districts.some(district => district.id === 1));
    assert.equal((await request(ctx.server, '/competitions/mine', undefined, ctx.users[0].token)).competitions.length, 5);
  } finally { await ctx.stop(); }
});

test('create replay persists across restart and conflicts cannot create a second room', async t => {
  const ctx = await setup(t);
  try {
    const data = create(); const first = await call(ctx, ctx.users[0], 'create', data);
    await ctx.restart();
    const repeated = await call(ctx, ctx.users[0], 'create', data);
    assert.equal(repeated.body.replayed, true); assert.equal(repeated.body.competitionId, first.body.competitionId);
    assert.equal((await call(ctx, ctx.users[0], 'create', { ...data, formatId: '6v6' })).body.code, 'REQUEST_CONFLICT');
    const mine = await request(ctx.server, '/competitions/mine', undefined, ctx.users[0].token);
    assert.equal(mine.competitions.length, 1);
    assert.equal(mine.competitions[0].scheduledAt, data.scheduledAt);
    assert.equal((await fetch(`${ctx.server.url}/api/competitions/${first.body.competitionId}`, { headers: { Authorization: `Bearer ${ctx.users[1].token}` } })).status, 403);
  } finally { await ctx.stop(); }
});

test('two requests for last slot have a single winner; replay never duplicates a participant', async t => {
  const ctx = await setup(t, 12);
  try {
    let room = (await call(ctx, ctx.users[0], 'create', create())).body.data;
    for (let index = 1; index <= 8; index++) {
      const result = await call(ctx, ctx.users[index], 'join', { requestId: randomUUID(), code: room.code, team: index <= 4 ? 'teamA' : 'teamB', expectedRevision: room.revision });
      assert.equal(result.status, 200); room = result.body.data;
    }
    const payload = { requestId: randomUUID(), code: room.code, team: 'teamB', expectedRevision: room.revision };
    const responses = await Promise.all([call(ctx, ctx.users[9], 'join', payload), call(ctx, ctx.users[10], 'join', payload)]);
    assert.equal(responses.filter(result => result.status === 200).length, 1);
    assert.equal(responses.filter(result => result.body.code === 'REVISION_CONFLICT').length, 1);
    const winner = responses[0].status === 200 ? 9 : 10; const loser = winner === 9 ? 10 : 9;
    room = responses.find(result => result.status === 200).body.data;
    assert.equal(room.status, 'FULL'); assert.equal(room.teamB.length, 5);
    assert.equal(new Set([...room.teamA, ...room.teamB].map(user => user.id)).size, 10);
    assert.equal((await call(ctx, ctx.users[winner], 'join', payload)).body.replayed, true);
    assert.equal((await call(ctx, ctx.users[loser], 'join', { ...payload, requestId: randomUUID(), expectedRevision: room.revision })).body.code, 'FULL');
    assert.equal((await call(ctx, ctx.users[winner], 'join', { ...payload, requestId: randomUUID(), expectedRevision: room.revision })).body.code, 'ALREADY_JOINED');
    const left = await call(ctx, ctx.users[4], 'leave', edit(room));
    assert.equal(left.status, 200); assert.equal(left.body.data.status, 'OPEN');
    const preview = (await request(ctx.server, `/competitions/by-code/${room.code}`, undefined, ctx.users[loser].token)).competition;
    assert.equal(preview.currentPlayers, 9); assert.equal('teamA' in preview, false);
    for (const member of room.teamA) for (const key of ['email', 'password', 'pinHash', 'sessionVersion']) assert.equal(key in member, false);
  } finally { await ctx.stop(); }
});

test('host/captain transfer, cancellation and revisions protect ownership and history', async t => {
  const ctx = await setup(t);
  try {
    let room = (await call(ctx, ctx.users[0], 'create', create())).body.data;
    room = (await call(ctx, ctx.users[1], 'join', { requestId: randomUUID(), code: room.code, team: 'teamA', expectedRevision: room.revision })).body.data;
    assert.equal((await call(ctx, ctx.users[0], 'leave', edit(room))).body.code, 'TRANSFER_REQUIRED');
    assert.equal((await call(ctx, ctx.users[1], 'cancel', edit(room, { reason: 'no autorizado' }))).status, 403);
    assert.equal((await call(ctx, ctx.users[2], 'transferHost', edit(room, { targetUserId: ctx.users[2].user.id }))).status, 403);
    room = (await call(ctx, ctx.users[0], 'transferHost', edit(room, { targetUserId: ctx.users[1].user.id }))).body.data;
    room = (await call(ctx, ctx.users[0], 'transferCaptain', edit(room, { targetUserId: ctx.users[1].user.id }))).body.data;
    room = (await call(ctx, ctx.users[0], 'leave', edit(room))).body.data;
    const cancelled = await call(ctx, ctx.users[1], 'cancel', edit(room, { reason: 'Cancha no disponible' }));
    assert.equal(cancelled.status, 200); assert.equal(cancelled.body.data.status, 'CANCELLED');
    assert.equal((await call(ctx, ctx.users[2], 'join', { requestId: randomUUID(), code: room.code, team: 'teamB', expectedRevision: cancelled.body.revision })).body.code, 'INVALID_STATE');
    assert.equal((await request(ctx.server, '/competitions', undefined, ctx.users[2].token)).competitions.length, 0);
    await ctx.restart();
    assert.equal((await request(ctx.server, '/competitions/mine', undefined, ctx.users[1].token)).competitions[0].cancelReason, 'Cancha no disponible');
    let second = (await call(ctx, ctx.users[0], 'create', create())).body.data;
    second = (await call(ctx, ctx.users[1], 'join', { requestId: randomUUID(), code: second.code, team: 'teamB', expectedRevision: second.revision })).body.data;
    second = (await call(ctx, ctx.users[0], 'transferHost', edit(second, { targetUserId: ctx.users[1].user.id }))).body.data;
    const departed = await call(ctx, ctx.users[0], 'leave', edit(second));
    assert.equal(departed.status, 200);
    assert.equal(departed.body.data.captains.teamA, null);
  } finally { await ctx.stop(); }
});

test('disconnect grace does not remove future competition membership', async t => {
  const ctx = await setup(t);
  let socket;
  try {
    const room = (await call(ctx, ctx.users[0], 'create', create())).body.data;
    socket = io(ctx.server.url, { autoConnect: false, transports: ['websocket'], reconnection: false, auth: { token: ctx.users[0].token } });
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Socket timeout')), 5000); socket.on('connect', () => { clearTimeout(timer); resolve(); }); socket.connect(); });
    socket.disconnect(); await delay(26000);
    assert.equal((await request(ctx.server, '/competitions/mine', undefined, ctx.users[0].token)).competitions[0].id, room.id);
    await ctx.restart();
    assert.equal((await request(ctx.server, `/competitions/${room.id}`, undefined, ctx.users[0].token)).competition.teamA[0].id, ctx.users[0].user.id);
  } finally { socket?.disconnect(); await ctx.stop(); }
});

test('editing details invalidates readiness and geographic filters use persisted district IDs', async t => {
  const ctx = await setup(t);
  try {
    const fields = create();
    let room = (await call(ctx, ctx.users[0], 'create', fields)).body.data;
    room = (await call(ctx, ctx.users[0], 'setReady', edit(room, { ready: true }))).body.data;
    assert.equal(room.teamA[0].ready, true);
    room = (await call(ctx, ctx.users[0], 'updateDetails', edit(room, { formatId: '6v6', scheduledAt: fields.scheduledAt, timeZone: fields.timeZone, venue: { ...fields.venue, districtId: '2' } }))).body.data;
    assert.equal(room.teamA[0].ready, false);
    assert.equal((await request(ctx.server, '/competitions?districtId=1', undefined, ctx.users[0].token)).competitions.length, 0);
    assert.equal((await request(ctx.server, '/competitions?districtId=2&formatId=6v6', undefined, ctx.users[0].token)).competitions.length, 1);
    assert.equal((await call(ctx, ctx.users[0], 'start', edit(room))).body.code, 'UNKNOWN_COMMAND');
  } finally { await ctx.stop(); }
});

test('schema-three rows survive a snapshot restore and preserve earlier profiles', async t => {
  const ctx = await setup(t);
  const room = (await call(ctx, ctx.users[0], 'create', create())).body.data;
  await ctx.stop();
  assert.deepEqual(await readSnapshot(ctx.sandbox, 'PRAGMA user_version'), [[3]]);
  const rows = await readSnapshot(ctx.sandbox, 'SELECT data_json FROM competitions');
  assert.equal(JSON.parse(rows[0][0]).id, room.id);
  assert.equal((await readSnapshot(ctx.sandbox, 'SELECT id FROM users')).length, 3);
  const directory = path.join(ctx.sandbox.directory, 'backup');
  const restored = path.join(ctx.sandbox.directory, 'restored.db');
  const backup = spawnSync(process.execPath, ['server/backup.js', 'backup', directory], { cwd: PROJECT_ROOT, env: ctx.sandbox.env, encoding: 'utf8', timeout: 15000 });
  assert.equal(backup.status, 0, backup.stderr);
  const restore = spawnSync(process.execPath, ['server/backup.js', 'restore', directory], { cwd: PROJECT_ROOT, env: { ...ctx.sandbox.env, MATCHSPORT_DB_PATH: restored }, encoding: 'utf8', timeout: 15000 });
  assert.equal(restore.status, 0, restore.stderr);
  const validation = await startTestServer(ctx.sandbox, { MATCHSPORT_DB_PATH: restored });
  try {
    const result = await request(validation, `/competitions/${room.id}`, undefined, ctx.users[0].token);
    assert.equal(result.competition.code, room.code);
    assert.equal(result.competition.teamA[0].id, ctx.users[0].user.id);
  } finally { await validation.stop(); }
});
