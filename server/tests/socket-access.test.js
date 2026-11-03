import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { createSandbox, startTestServer, request } from './helpers.js';
import { fixtures } from './access-fixture.js';
import { PROJECT_ROOT } from '../config.js';
import { SOCKET_POLICIES } from '../socketAccess.js';
import { SERVER_EVENTS } from '../realtime.js';

function once(socket, event, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`Timeout: ${event}`)); }, 5000);
    const listener = value => {
      if (predicate(value)) { clearTimeout(timer); socket.off(event, listener); resolve(value); }
    };
    socket.on(event, listener);
  });
}
async function open(server, token, clients, auth = {}) {
  const socket = io(server.url, { autoConnect: false, forceNew: true, reconnection: false, transports: ['websocket'], auth: { token, ...auth } });
  clients.push(socket);
  socket.received = [];
  socket.onAny((event, data) => socket.received.push({ event, data }));
  const connected = once(socket, 'connect');
  socket.connect(); await connected;
  // Barrier: registration and room restoration run synchronously before this request.
  const ready = once(socket, 'replacementLobbiesList');
  socket.emit('getReplacementLobbies', {}); await ready;
  return socket;
}
async function denied(socket, event, data, code = 'FORBIDDEN') {
  const result = await new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, data, (error, response) => error ? reject(error) : resolve(response));
  });
  assert.equal(result.success, false, event);
  assert.equal(result.code, code, `${event}: ${JSON.stringify(result)}`);
}
function signed(sandbox, claims) {
  const now = Math.floor(Date.now() / 1000);
  const parts = [{ alg: 'HS256', typ: 'JWT' }, { role: 'player', version: 0, iat: now, exp: now + 600, ...claims }].map(value => Buffer.from(JSON.stringify(value)).toString('base64url'));
  return `${parts.join('.')}.${crypto.createHmac('sha256', sandbox.env.JWT_SECRET).update(parts.join('.')).digest('base64url')}`;
}
async function setup(t, seeded = true, status = 'active', teamMatch = false) {
  const sandbox = createSandbox(t);
  const ids = seeded ? fixtures(sandbox, status, teamMatch) : {};
  const server = await startTestServer(sandbox);
  const clients = [];
  const tokens = {};
  async function login(name) {
    const credentials = { email: `${name}@test.local`, password: name === 'admin' ? 'admin-test-password' : `password-${name}` };
    return (await request(server, '/auth/login', credentials)).token;
  }
  if (seeded) for (const name of ['a', 'b', 'c', 'admin']) tokens[name] = await login(name);
  return { sandbox, ids, server, clients, tokens, login,
    connect: (name, auth) => open(server, tokens[name], clients, auth),
    close: async () => { clients.forEach(client => client.disconnect()); await server.stop(); },
  };
}

test('socket command inventory is explicit and unknown commands fail closed', async t => {
  const source = fs.readFileSync(path.join(PROJECT_ROOT, 'server/server.js'), 'utf8');
  for (const [, event] of source.matchAll(/onEvent\('([^']+)'/g)) assert.ok(SOCKET_POLICIES[event], event);
  assert.deepEqual([...source.matchAll(/socket\.on\('([^']+)'/g)].map(match => match[1]), ['disconnect']);
  assert.equal(/\bio\.(?:to|emit)\(/.test(source), false, 'All server delivery must pass the authorization transport');
  const engineSource = fs.readFileSync(path.join(PROJECT_ROOT, 'server/matchmakingEngine.js'), 'utf8');
  assert.equal(/this\.io\.(?:to|emit)\(/.test(engineSource), false);
  for (const [, event] of (source + engineSource).matchAll(/(?:\.emit\(|\.send\(socket, )'([^']+)'/g)) assert.ok(SERVER_EVENTS.has(event), event);
  const ctx = await setup(t);
  try { await denied(await ctx.connect('a'), 'futurePrivilegedEvent', {}, 'UNKNOWN_EVENT'); }
  finally { await ctx.close(); }
});

test('handshake rejects missing, tampered, expired, unknown-user and revoked tokens', async t => {
  const ctx = await setup(t);
  try {
    for (const token of [undefined, 'invalid', signed(ctx.sandbox, { userId: 'unknown' }), signed(ctx.sandbox, { userId: ctx.ids.a, exp: 1 }), signed(ctx.sandbox, { userId: ctx.ids.a, version: 42 })]) {
      const socket = io(ctx.server.url, { autoConnect: false, reconnection: false, transports: ['websocket'], auth: { token, userId: ctx.ids.a } });
      ctx.clients.push(socket);
      const rejected = once(socket, 'connect_error'); socket.connect();
      assert.equal((await rejected).data.code, 'SESSION_INVALID');
      assert.equal(socket.connected, false); socket.disconnect();
    }
    const a = await ctx.connect('a', { userId: ctx.ids.b });
    const admin = await ctx.connect('admin');
    const update = once(admin, 'onlineUsersUpdate'); a.emit('registerUser', {});
    assert.ok((await update).users.some(user => user.userId === ctx.ids.a));
  } finally { await ctx.close(); }
});

test('identity comes from server; player cannot subscribe to admin data or resolve disputes', async t => {
  const ctx = await setup(t);
  try {
    const a = await ctx.connect('a'); const admin = await ctx.connect('admin');
    await denied(a, 'registerUser', { userId: ctx.ids.b });
    await denied(a, 'startQueue', { userId: ctx.ids.b, sportId: 'futbol', formatId: '1v1' });
    const changed = once(admin, 'onlineUsersUpdate');
    a.emit('registerUser', { userId: ctx.ids.a, user: { id: ctx.ids.a, name: 'Forged Admin', role: 'admin' } });
    const presence = (await changed).users.find(user => user.userId === ctx.ids.a);
    assert.equal(presence.name, 'Player A'); assert.equal(presence.role, 'player');
    assert.equal(a.received.some(item => item.event === 'onlineUsersUpdate'), false);
    await denied(a, 'adminResolveDispute', { matchId: ctx.ids.match, winnerTeam: 'teamA' });
    await denied(admin, 'adminResolveDispute', { matchId: ctx.ids.match, winnerTeam: 'teamA' }, 'USE_REST');
    for (const event of ['forceDemoMatch', 'fillLobbyDemos', 'searchLobbyOpponentOnline', 'submitFutRatings']) await denied(a, event, { code: ctx.ids.lobby }, 'EVENT_DISABLED');
  } finally { await ctx.close(); }
});

test('nonmembers cannot read, chat, move players or mutate any lobby/match operation', async t => {
  const ctx = await setup(t);
  try {
    const outsider = await ctx.connect('c'); const b = await ctx.connect('b');
    for (const event of ['leaveLobby', 'toggleLobbyReady', 'switchLobbyTeam', 'sendLobbyChatMessage', 'changeLobbyFormat', 'startLobbyMatch', 'startLobbyRadarSearch']) {
      await denied(outsider, event, { code: ctx.ids.lobby, targetTeam: 'teamA', text: 'injected', formatId: '1v1' });
    }
    for (const event of ['joinMatchRoom', 'leaveMatch', 'sendChatMessage', 'startMatchTimer', 'reportResult', 'reportResultByReporter', 'convertMatchToLobby', 'submitReview', 'submitPeerReviewOneTap', 'disputeMatch', 'cancelAttendance']) {
      await denied(outsider, event, { matchId: ctx.ids.match, text: 'injected', winnerTeam: 'teamA' });
    }
    for (const event of ['changeLobbyFormat', 'startLobbyMatch', 'startLobbyRadarSearch']) await denied(b, event, { code: ctx.ids.lobby, formatId: '1v1' });
    await denied(b, 'reportResultByReporter', { matchId: ctx.ids.match, winnerTeam: 'teamB' });
    await denied(b, 'switchLobbyTeam', { code: ctx.ids.lobby, targetTeam: '__proto__' }, 'INVALID_PAYLOAD');
    await denied(b, 'sendLobbyChatMessage', null, 'INVALID_PAYLOAD');
    await denied(b, 'createLobby', { sportId: false, formatId: '1v1' }, 'INVALID_PAYLOAD');
    await denied(b, 'sendChatMessage', { matchId: ctx.ids.match, text: { nested: true } }, 'INVALID_PAYLOAD');
    const match = (await request(ctx.server, `/match/${ctx.ids.match}`, undefined, ctx.tokens.a)).match;
    assert.equal(match.status, 'active');
    assert.equal(match.chatMessages.some(message => message.text === 'injected'), false);
  } finally { await ctx.close(); }
});

test('private chat, previews and delivery after leaving are scoped to current membership', async t => {
  const ctx = await setup(t);
  try {
    const a = await ctx.connect('a'); const b = await ctx.connect('b'); const c = await ctx.connect('c');
    assert.equal(JSON.stringify(b.received).includes('team-a-secret'), false);
    assert.equal(JSON.stringify(c.received).includes('team-b-secret'), false);
    const message = once(a, 'newLobbyChatMessage');
    a.emit('sendLobbyChatMessage', { code: ctx.ids.lobby, text: 'only-a', isPrivate: true, team: 'teamB', senderName: 'Spoof' });
    const sent = (await message).message;
    assert.equal(sent.senderId, ctx.ids.a); assert.equal(sent.senderName, 'Player A'); assert.equal(sent.team, 'teamA');
    // Cause room snapshots and a global preview as well as a direct chat delivery.
    const changed = once(b, 'lobbyUpdated'); a.emit('toggleLobbyReady', { code: ctx.ids.lobby }); await changed;
    assert.equal(JSON.stringify(b.received).includes('only-a'), false);
    assert.equal(JSON.stringify(c.received).includes('only-a'), false);
    const joined = once(c, 'lobbyUpdated'); c.emit('joinLobby', { code: ctx.ids.lobby, targetTeam: 'teamB' }); await joined;
    await request(ctx.server, '/lobby/leave', { code: ctx.ids.lobby }, ctx.tokens.c);
    const count = c.received.filter(item => item.event === 'newLobbyChatMessage').length;
    const delivered = once(b, 'newLobbyChatMessage'); a.emit('sendLobbyChatMessage', { code: ctx.ids.lobby, text: 'after-leave' }); await delivered;
    await delay(100);
    assert.equal(c.received.filter(item => item.event === 'newLobbyChatMessage').length, count);
    await denied(c, 'sendLobbyChatMessage', { code: ctx.ids.lobby, text: 'not-member' });
    const snapshot = b.received.find(item => item.event === 'lobbyRestored').data.lobby;
    for (const player of [...snapshot.teamA, ...snapshot.teamB]) for (const key of ['email', 'password', 'pinHash', 'sessionVersion']) assert.equal(key in player, false);
  } finally { await ctx.close(); }
});

test('match chat arrives once with server author and only designated reporter can finish 1v1', async t => {
  const ctx = await setup(t);
  try {
    const a = await ctx.connect('a'); const b = await ctx.connect('b'); const c = await ctx.connect('c');
    const data = once(a, 'matchData'); a.emit('joinMatchRoom', { matchId: ctx.ids.match });
    const match = (await data).match;
    assert.equal('password' in match.teamB[0], false);
    const message = once(b, 'newChatMessage'); a.emit('sendChatMessage', { matchId: ctx.ids.match, text: 'real-message', senderName: 'Other person' });
    assert.equal((await message).message.senderName, 'Player A');
    await delay(100);
    assert.equal(b.received.filter(item => item.event === 'newChatMessage' && item.data.message.text === 'real-message').length, 1);
    assert.equal(c.received.some(item => item.event === 'newChatMessage'), false);
    await denied(b, 'reportResultByReporter', { matchId: ctx.ids.match, winnerTeam: 'teamB' });
    const finished = once(b, 'matchFinished'); a.emit('reportResultByReporter', { matchId: ctx.ids.match, winnerTeam: 'teamA' });
    assert.equal((await finished).match.reportedBy, ctx.ids.a);
  } finally { await ctx.close(); }
});

test('logout, reset PIN, ban and expiry disconnect sockets and prevent reconnection', async t => {
  const ctx = await setup(t);
  try {
    for (const action of ['logout', 'reset', 'ban']) {
      const token = await ctx.login('a');
      const socket = await open(ctx.server, token, ctx.clients);
      const invalid = once(socket, 'sessionInvalid'); const disconnected = once(socket, 'disconnect');
      if (action === 'logout') await request(ctx.server, '/auth/logout', {}, token);
      else await request(ctx.server, `/admin/user/${ctx.ids.a}/${action === 'reset' ? 'reset-pin' : 'ban'}`, action === 'reset' ? { newPin: '4321' } : { hours: 24 }, ctx.tokens.admin);
      await invalid; await disconnected;
      const rejected = once(socket, 'connect_error'); socket.connect();
      assert.equal((await rejected).data.code, 'SESSION_INVALID');
    }
    const token = signed(ctx.sandbox, { userId: ctx.ids.c, exp: Math.floor(Date.now() / 1000) + 3 });
    const expiring = await open(ctx.server, token, ctx.clients);
    const ended = once(expiring, 'disconnect'); await ended;
    assert.ok(expiring.received.some(item => item.event === 'sessionInvalid'));
  } finally { await ctx.close(); }
});

test('reconnecting replaces old connection and restores only the authenticated player rooms', async t => {
  const ctx = await setup(t);
  try {
    const first = await ctx.connect('a'); const b = await ctx.connect('b');
    const replaced = once(first, 'session_replaced'); const gone = once(first, 'disconnect');
    const second = await ctx.connect('a'); await replaced; await gone;
    assert.ok(second.received.some(item => item.event === 'lobbyRestored' && item.data.lobby.code === ctx.ids.lobby));
    const before = first.received.length;
    const delivered = once(second, 'newLobbyChatMessage'); b.emit('sendLobbyChatMessage', { code: ctx.ids.lobby, text: 'new-device-only' }); await delivered;
    await delay(100); assert.equal(first.received.length, before);
  } finally { await ctx.close(); }
});

test('only selected players can accept or decline and acceptance follows their new authenticated socket', async t => {
  const ctx = await setup(t, true, 'finished');
  try {
    const a = await ctx.connect('a'); const b = await ctx.connect('b'); const c = await ctx.connect('c');
    const queued = once(a, 'queueStarted'); a.emit('startQueue', { sportId: 'futbol', formatId: '1v1' }); await queued;
    const promptA = once(a, 'matchPromptAcceptance'); const promptB = once(b, 'matchPromptAcceptance');
    b.emit('startQueue', { sportId: 'futbol', formatId: '1v1' });
    const { pendingMatchId } = await promptA; await promptB;
    await denied(c, 'acceptPendingMatch', { pendingMatchId });
    await denied(c, 'declinePendingMatch', { pendingMatchId });
    await denied(a, 'acceptPendingMatch', { pendingMatchId, userId: ctx.ids.b });
    const accepted = once(b, 'pendingMatchUpdated'); a.emit('acceptPendingMatch', { pendingMatchId });
    assert.deepEqual((await accepted).acceptedUserIds, [ctx.ids.a]);
    const second = await ctx.connect('a');
    assert.ok(second.received.some(item => item.event === 'matchPromptAcceptance' && item.data.acceptedUserIds.includes(ctx.ids.a)));
    const found = once(second, 'matchFound'); b.emit('acceptPendingMatch', { pendingMatchId });
    const match = (await found).match;
    assert.ok([...match.teamA, ...match.teamB].some(player => player.id === ctx.ids.a));
    for (const player of [...match.teamA, ...match.teamB]) assert.equal('socketId' in player, false);
    assert.equal(c.received.some(item => item.event === 'matchFound'), false);
  } finally { await ctx.close(); }
});

test('revoking a session cancels an outstanding acceptance for its other players', async t => {
  const ctx = await setup(t, true, 'finished');
  try {
    const a = await ctx.connect('a'); const b = await ctx.connect('b');
    const queued = once(a, 'queueStarted'); a.emit('startQueue', { sportId: 'futbol', formatId: '1v1' }); await queued;
    const prompt = once(b, 'matchPromptAcceptance'); b.emit('startQueue', { sportId: 'futbol', formatId: '1v1' });
    const { pendingMatchId } = await prompt;
    const cancelled = once(b, 'matchAcceptanceFailed');
    await request(ctx.server, '/auth/logout', {}, ctx.tokens.a);
    assert.equal((await cancelled).reason, 'session_revoked');
    await denied(b, 'acceptPendingMatch', { pendingMatchId }, 'NOT_FOUND');
  } finally { await ctx.close(); }
});

test('legitimate host can create and start a full lobby; roles and player data come from server', async t => {
  const ctx = await setup(t);
  try {
    const c = await ctx.connect('c'); const b = await ctx.connect('b');
    const created = once(c, 'lobbyCreated');
    c.emit('createLobby', { sportId: 'futbol', formatId: '1v1', hostUser: { id: ctx.ids.c, name: 'Spoof', role: 'admin' } });
    const { lobby } = await created;
    assert.equal(lobby.hostUserId, ctx.ids.c); assert.equal(lobby.hostName, 'Player C');
    const joined = once(b, 'lobbyUpdated', data => data.lobby.code === lobby.code);
    b.emit('joinLobby', { code: lobby.code, targetTeam: 'teamB' }); await joined;
    await denied(b, 'startLobbyMatch', { code: lobby.code });
    const ready = once(c, 'lobbyUpdated', data => data.lobby.teamB.some(player => player.isReady));
    b.emit('toggleLobbyReady', { code: lobby.code }); await ready;
    const found = once(b, 'matchFound'); c.emit('startLobbyMatch', { code: lobby.code });
    assert.equal((await found).match.teamA[0].id, ctx.ids.c);
  } finally { await ctx.close(); }
});

test('dispute notifications reach authenticated administrators without broadcasting to outsiders', async t => {
  const ctx = await setup(t);
  try {
    const a = await ctx.connect('a'); const c = await ctx.connect('c'); const admin = await ctx.connect('admin');
    const notified = once(admin, 'matchDisputed');
    a.emit('disputeMatch', { matchId: ctx.ids.match, reason: 'Real test dispute' });
    assert.equal((await notified).matchId, ctx.ids.match);
    const disputes = await request(ctx.server, '/admin/disputes', undefined, ctx.tokens.admin);
    assert.equal(disputes.disputes.find(match => match.id === ctx.ids.match).disputeAlert.reportedBy, ctx.ids.a);
    assert.equal(c.received.some(item => item.event === 'matchDisputed'), false);
  } finally { await ctx.close(); }
});

test('team members can read their match but only captains can change timer, result or conversion', async t => {
  const ctx = await setup(t, true, 'active', true);
  try {
    const a = await ctx.connect('a'); const c = await ctx.connect('c');
    const snapshot = once(c, 'matchData'); c.emit('joinMatchRoom', { matchId: ctx.ids.match }); await snapshot;
    for (const event of ['startMatchTimer', 'reportResult', 'convertMatchToLobby', 'reportResultByReporter']) {
      await denied(c, event, { matchId: ctx.ids.match, durationMinutes: 60, winnerTeam: 'teamA' });
    }
    const timer = once(c, 'matchTimerStarted'); a.emit('startMatchTimer', { matchId: ctx.ids.match, durationMinutes: 60 });
    assert.equal((await timer).timer.durationMinutes, 60);
  } finally { await ctx.close(); }
});
