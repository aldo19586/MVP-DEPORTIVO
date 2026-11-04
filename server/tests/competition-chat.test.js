import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { PROJECT_ROOT } from '../config.js';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';

function script(sandbox, source) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source + '\nprocess.exit(0);'],
    { cwd: PROJECT_ROOT, env: sandbox.env, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
}
function fixture(t) {
  const sandbox = createSandbox(t);
  script(sandbox, `
    import fs from 'node:fs'; import { db } from './server/db.js'; import { issueToken } from './server/auth.js';
    import { competitionCommand as command } from './server/competitions.js';
    await db.initAsync();
    const users = ['a','b','c','admin'].map(name => db.createUser({email:name+'@test.local',name:'Chat '+name,password:'synthetic-password'}));
    users[3].role='admin'; db._persistUser(users[3]);
    const fields={countryCode:'PE',sportId:'futbol',formatId:'5v5',scheduledAt:new Date(Date.now()+86400000).toISOString(),timeZone:'America/Lima',venue:{name:'Cancha de prueba',address:'Dirección sintética',districtId:'1'}};
    let room=command(users[0].id,'create',{requestId:crypto.randomUUID(),...fields}).data;
    room=command(users[1].id,'join',{requestId:crypto.randomUUID(),code:room.code,team:'teamA',expectedRevision:room.revision}).data;
    const other=command(users[2].id,'create',{requestId:crypto.randomUUID(),...fields}).data;
    fs.writeFileSync(process.env.MATCHSPORT_TEST_DIR+'/chat.json',JSON.stringify({room,other,users:users.map(u=>({id:u.id,token:issueToken(u)}))}));
  `);
  return { sandbox, ...JSON.parse(fs.readFileSync(path.join(sandbox.directory, 'chat.json'))) };
}
async function connect(t, server, token) {
  const socket = io(server.url, { autoConnect: false, forceNew: true, transports: ['websocket'], reconnection: false, auth: { token } });
  t.after(() => socket.disconnect());
  socket.received = [];
  socket.onAny((event, payload) => socket.received.push({ event, payload }));
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve); socket.once('connect_error', reject); socket.connect();
  });
  return socket;
}
async function until(check) {
  const deadline = Date.now() + 5000;
  while (!check()) { assert.ok(Date.now() < deadline, 'Timed out waiting for live delivery'); await delay(20); }
}
const headers = token => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token });

test('two devices receive one persisted message; replay/restart preserve identity, order and membership', async t => {
  const { sandbox, room, users } = fixture(t);
  let server = await startTestServer(sandbox);
  try {
    const a = await connect(t, server, users[0].token);
    const b = await connect(t, server, users[1].token);
    const outsider = await connect(t, server, users[2].token);
    const body = { requestId: 'lost-ack', text: 'Nos vemos en la cancha ⚽' };
    const attempts = await Promise.all([0, 1].map(() => request(server, `/competitions/${room.id}/messages`, body, users[0].token)));
    assert.equal(attempts.filter(value => value.replayed).length, 1);
    const saved = attempts[0];
    assert.equal(saved.message.senderId, users[0].id);
    assert.equal(saved.message.senderName, 'Chat a');
    assert.equal(saved.message.sequence, 1);
    assert.equal((await request(server, `/competitions/${room.id}/messages`, body, users[0].token)).replayed, true);
    await until(() => b.received.some(item => item.event === 'competitionMessage'));
    await delay(100);
    for (const socket of [a, b]) assert.equal(socket.received.filter(item => item.event === 'competitionMessage').length, 1);
    assert.equal(outsider.received.some(item => item.event === 'competitionMessage'), false);
    assert.deepEqual((await request(server, `/competitions/${room.id}/messages`, undefined, users[1].token)).messages, [saved.message]);
    b.disconnect();
    await request(server, `/competitions/${room.id}/messages`, { requestId: 'missed', text: 'Llevo el balón' }, users[0].token);
    a.disconnect(); outsider.disconnect();
    await server.stop();
    server = await startTestServer(sandbox);
    await connect(t, server, users[1].token);
    const recovered = await request(server, `/competitions/${room.id}/messages?after=1`, undefined, users[1].token);
    assert.deepEqual(recovered.messages.map(message => message.sequence), [2]);
    assert.equal((await request(server, `/competitions/${room.id}/messages`, body, users[0].token)).message.id, saved.message.id);
    assert.ok((await request(server, '/competitions/mine', undefined, users[1].token)).competitions.some(item => item.id === room.id));
  } finally { await server.stop(); }
  assert.equal((await readSnapshot(sandbox, 'SELECT sequence FROM competition_messages')).length, 2);
});

test('chat rejects anonymous, outsiders, forged fields and changed retries; a leaver loses live/history access', async t => {
  const { sandbox, room, other, users } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    const url = server.url + `/api/competitions/${room.id}/messages`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: headers(users[2].token) })).status, 403);
    for (const [token, body, status] of [
      [users[2].token, {requestId:'x',text:'outsider'},403],
      [users[3].token, {requestId:'x',text:'operator'},403],
      [users[0].token, {requestId:'x',text:'forged',senderId:users[1].id},400],
      [users[0].token, {requestId:'x',text:' '.repeat(5)},400],
      [users[0].token, {requestId:'x',text:'x'.repeat(2001)},400],
    ]) assert.equal((await fetch(url, {method:'POST',headers:headers(token),body:JSON.stringify(body)})).status, status);
    const saved = await request(server, `/competitions/${room.id}/messages`, {requestId:'fixed',text:'Original'}, users[0].token);
    assert.equal((await fetch(url, {method:'POST',headers:headers(users[0].token),body:JSON.stringify({requestId:'fixed',text:'Alterado'})})).status,409);
    const b = await connect(t, server, users[1].token);
    await request(server, '/competitions/commands/leave', {requestId:'leave',competitionId:room.id,expectedRevision:room.revision}, users[1].token);
    const sent = await request(server, `/competitions/${room.id}/messages`, {requestId:'private',text:'Solo miembros actuales'}, users[0].token);
    await request(server, `/competitions/${other.id}/messages`, {requestId:'elsewhere',text:'Otra sala'}, users[2].token);
    await delay(150);
    assert.equal(b.received.some(item => item.event === 'competitionMessage'), false);
    assert.equal((await fetch(url, {headers:headers(users[1].token)})).status,403);
    assert.equal((await fetch(url, {method:'POST',headers:headers(users[1].token),body:JSON.stringify({requestId:'leaver',text:'No acceso'})})).status,403);
    const audit = await request(server, `/competitions/${room.id}/messages`, undefined, users[3].token);
    assert.deepEqual(audit.messages.map(message=>message.id),[saved.message.id,sent.message.id]);
  } finally { await server.stop(); }
});

test('room changes publish only durable revision hints and replay does not duplicate them', async t => {
  const { sandbox, room, users } = fixture(t);
  const server = await startTestServer(sandbox);
  try {
    const a = await connect(t, server, users[0].token);
    const b = await connect(t, server, users[1].token);
    const c = await connect(t, server, users[2].token);
    const body = {requestId:'ready-live',competitionId:room.id,expectedRevision:room.revision,ready:true};
    const result = await request(server, '/competitions/commands/setReady', body, users[1].token);
    await request(server, '/competitions/commands/setReady', body, users[1].token);
    await until(()=>a.received.some(item=>item.event==='competitionUpdated'));
    await delay(100);
    for (const socket of [a,b]) {
      const updates=socket.received.filter(item=>item.event==='competitionUpdated');
      assert.deepEqual(updates.map(item=>item.payload),[{competitionId:room.id,revision:result.revision}]);
    }
    assert.equal(c.received.some(item=>item.event==='competitionUpdated'),false);
    assert.deepEqual(c.received.find(item=>item.event==='competitionListUpdated').payload,{});
    assert.equal((await request(server, `/competitions/${room.id}`, undefined, users[0].token)).competition.teamA[1].ready,true);
  } finally { await server.stop(); }
});

test('history paginates without gaps, validates cursor, limits spam and closes sending after cancellation', async t => {
  const { sandbox, room, users } = fixture(t);
  script(sandbox, `
    import {db} from './server/db.js'; import {sendCompetitionMessage as send} from './server/competitionChat.js';
    await db.initAsync(); const user=db.getUser('${users[0].id}'); const clock=Date.now()-105*61000;
    for(let i=0;i<105;i++) send(user,'${room.id}',{requestId:'history-'+i,text:'Mensaje '+i},clock+i*61000);
  `);
  const server = await startTestServer(sandbox);
  try {
    const page = await request(server, `/competitions/${room.id}/messages`, undefined, users[1].token);
    assert.equal(page.messages.length,100); assert.equal(page.hasMore,true);
    const tail = await request(server, `/competitions/${room.id}/messages?after=100`, undefined, users[1].token);
    assert.deepEqual(tail.messages.map(item=>item.sequence),[101,102,103,104,105]); assert.equal(tail.hasMore,false);
    assert.equal((await fetch(server.url+`/api/competitions/${room.id}/messages?after=-1`,{headers:headers(users[0].token)})).status,400);
    // Use B: history was authored by A; the limit is per sender across rooms.
    for(let i=0;i<30;i++) await request(server, `/competitions/${room.id}/messages`,{requestId:'burst-'+i,text:'Mensaje '+i},users[1].token);
    assert.equal((await fetch(server.url+`/api/competitions/${room.id}/messages`,{method:'POST',headers:headers(users[1].token),body:JSON.stringify({requestId:'burst-over',text:'Muchos'})})).status,429);
    await request(server, '/competitions/commands/cancel',{requestId:'cancel',competitionId:room.id,expectedRevision:room.revision,reason:'Prueba de cierre'},users[0].token);
    const closed=await fetch(server.url+`/api/competitions/${room.id}/messages`,{method:'POST',headers:headers(users[1].token),body:JSON.stringify({requestId:'closed',text:'Cerrada'})});
    assert.equal(closed.status,409);
    assert.equal((await closed.json()).code,'INVALID_STATE');
    assert.equal((await request(server,`/competitions/${room.id}/messages?after=105`,undefined,users[1].token)).messages.length,30);
  } finally { await server.stop(); }
});

test('schema 4 migration, backup/restore and failed insert preserve rooms and message transactions', async t => {
  const {sandbox,room,users}=fixture(t);
  script(sandbox, `
    import fs from 'node:fs'; import initSqlJs from 'sql.js'; const SQL=await initSqlJs();
    const data=new SQL.Database(fs.readFileSync(process.env.MATCHSPORT_DB_PATH));
    data.run('DROP TABLE competition_messages; DELETE FROM schema_migrations WHERE version=5; PRAGMA user_version=4');
    fs.writeFileSync(process.env.MATCHSPORT_DB_PATH,data.export()); data.close();
  `);
  script(sandbox, `
    import assert from 'node:assert/strict'; import { db } from './server/db.js'; import { initDatabase } from './server/database.js';
    import {sendCompetitionMessage as send} from './server/competitionChat.js'; import {competitionEvents} from './server/competitionEvents.js';
    await db.initAsync(); const sql=await initDatabase(); let emitted=0; competitionEvents.on('message',()=>emitted++);
    sql.run("CREATE TEMP TRIGGER reject_message AFTER INSERT ON competition_messages BEGIN SELECT RAISE(ABORT,'injected failure'); END");
    const user=db.getUser('${users[0].id}');
    assert.throws(()=>send(user,'${room.id}',{requestId:'failed',text:'Debe revertir'}));
    assert.equal(sql.exec('SELECT count(*) FROM competition_messages')[0].values[0][0],0); assert.equal(emitted,0);
    sql.run('DROP TRIGGER reject_message'); send(user,'${room.id}',{requestId:'saved',text:'Respaldo real'}); assert.equal(emitted,1);
  `);
  assert.deepEqual(await readSnapshot(sandbox,'PRAGMA user_version'),[[5]]);
  const backup=path.join(sandbox.directory,'backup');
  for(const [operation,target] of [['backup',sandbox.dbPath],['restore',path.join(sandbox.directory,'restored.db')]]) {
    const result=spawnSync(process.execPath,['server/backup.js',operation,backup],{cwd:PROJECT_ROOT,env:{...sandbox.env,MATCHSPORT_DB_PATH:target},encoding:'utf8',timeout:15000});
    assert.equal(result.status,0,result.stderr);
  }
  const server=await startTestServer(sandbox,{MATCHSPORT_DB_PATH:path.join(sandbox.directory,'restored.db')});
  try {
    assert.deepEqual((await request(server,`/competitions/${room.id}`,undefined,users[1].token)).competition,room);
    const messages=(await request(server,`/competitions/${room.id}/messages`,undefined,users[1].token)).messages;
    assert.equal(messages.length,1); assert.equal(messages[0].text,'Respaldo real'); assert.equal(messages[0].sequence,1);
  } finally { await server.stop(); }
});
