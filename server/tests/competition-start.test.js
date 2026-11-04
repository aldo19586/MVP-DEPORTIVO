import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from '../config.js';
import { createSandbox, startTestServer, request, readSnapshot } from './helpers.js';

function script(sandbox, code) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code + '\nprocess.exit(0);'], { cwd: PROJECT_ROOT, env: sandbox.env, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
}
const imports = `import assert from 'node:assert/strict'; import fs from 'node:fs';
  import { db } from './server/db.js'; import { competitionCommand as command } from './server/competitions.js';
  await db.initAsync(); const info = JSON.parse(fs.readFileSync(process.env.MATCHSPORT_TEST_DIR+'/start.json'));
  const room = () => db.competitions.get(info.id);
  const payload = (extra={}) => ({requestId:crypto.randomUUID(),competitionId:info.id,expectedRevision:room().revision,...extra});`;
// Keep fixture setup offline; no clock override or test endpoint is added to the server.
function fixture(t) {
  const sandbox = createSandbox(t);
  script(sandbox, `
    import fs from 'node:fs'; import { randomUUID } from 'node:crypto'; import { issueToken } from './server/auth.js';
    import { db } from './server/db.js'; import { competitionCommand as command } from './server/competitions.js';
    await db.initAsync();
    const users = Array.from({length:10},(_,i)=>db.createUser({email:'start'+i+'@test.local',name:'Start Player '+i,password:'synthetic-password'}));
    const outsider=db.createUser({email:'outsider@test.local',name:'Outsider',password:'synthetic-password'});
    const clock=Date.now()-60000;
    const created=command(users[0].id,'create',{requestId:randomUUID(),countryCode:'PE',sportId:'futbol',formatId:'5v5',scheduledAt:new Date(clock+1000).toISOString(),timeZone:'America/Lima',venue:{name:'Cancha real de prueba',address:'Dirección sintética',districtId:'1'}},clock);
    let room=created.data;
    for(let i=1;i<10;i++) room=command(users[i].id,'join',{requestId:randomUUID(),code:room.code,team:i<5?'teamA':'teamB',expectedRevision:room.revision},clock).data;
    for(const user of users) room=command(user.id,'setReady',{requestId:randomUUID(),competitionId:room.id,expectedRevision:room.revision,ready:true},clock).data;
    fs.writeFileSync(process.env.MATCHSPORT_TEST_DIR+'/start.json',JSON.stringify({id:room.id,users:users.map(u=>u.id),tokens:users.map(issueToken),outsiderToken:issueToken(outsider),clock,revision:room.revision}));
  `);
  return sandbox;
}

test('start validates host, complete teams, readiness, captains and planned time before mutation', t => {
  const sandbox = fixture(t);
  script(sandbox, `${imports}
    assert.throws(()=>command(info.users[1],'start',payload()),e=>e.code==='FORBIDDEN');
    assert.throws(()=>command(info.users[0],'start',payload(),info.clock),e=>e.code==='NOT_STARTED_YET');
    command(info.users[1],'setReady',payload({ready:false}));
    assert.throws(()=>command(info.users[0],'start',payload()),e=>e.code==='NOT_READY');
    command(info.users[1],'setReady',payload({ready:true}));
    const old=room().captains.teamB; room().captains.teamB=null;
    assert.throws(()=>command(info.users[0],'start',payload()),e=>e.code==='CAPTAIN_REQUIRED');
    room().captains.teamB=old;
    const removed=room().teamB.pop();
    assert.throws(()=>command(info.users[0],'start',payload()),e=>e.code==='INCOMPLETE_TEAMS');
    room().teamB.push(removed);
    db.getUser(info.users[1]).isBanned=true; db.getUser(info.users[1]).bannedUntil=Date.now()+86400000;
    assert.throws(()=>command(info.users[0],'start',payload()),e=>e.code==='PLAYER_UNAVAILABLE');
    db.getUser(info.users[1]).isBanned=false;
    assert.equal(db.competitionMatches.size,0);
    assert.equal(room().status,'FULL');
  `);
});

test('atomic start links one immutable match, survives restart, rejects new commands and replays once', async t => {
  const sandbox = fixture(t);
  script(sandbox, `${imports}
    const input=payload(); const started=command(info.users[0],'start',input);
    assert.equal(started.data.status,'IN_PROGRESS');
    assert.equal(db.competitionMatches.get(started.data.matchId).competitionId,info.id);
    assert.equal(command(info.users[0],'start',input).replayed,true);
    assert.equal(db.competitionMatches.size,1);
    for(const [name,fields] of [['leave',{}],['cancel',{reason:'no'}],['setReady',{ready:false}],['switchTeam',{team:'teamB'}]])
      assert.throws(()=>command(info.users[0],name,payload(fields)),e=>e.code==='INVALID_STATE');
    assert.throws(()=>command(info.users[0],'start',payload()),e=>e.code==='INVALID_STATE');
    fs.writeFileSync(process.env.MATCHSPORT_TEST_DIR+'/started.json',JSON.stringify({input,matchId:started.data.matchId}));
  `);
  const info = JSON.parse(fs.readFileSync(path.join(sandbox.directory, 'start.json')));
  const started = JSON.parse(fs.readFileSync(path.join(sandbox.directory, 'started.json')));
  const server = await startTestServer(sandbox);
  try {
    const match = (await request(server, `/competitions/${info.id}/match`, undefined, info.tokens[1])).match;
    assert.equal(match.id, started.matchId); assert.equal(match.teamA.length,5); assert.equal(match.teamB.length,5);
    const result=await request(server,'/competitions/commands/start',started.input,info.tokens[0]);
    assert.equal(result.replayed,true); assert.equal(result.data.matchId,match.id);
    assert.equal((await request(server, '/competitions', undefined, info.tokens[1])).competitions.length,0);
    assert.equal((await request(server, '/competitions/mine', undefined, info.tokens[1])).competitions[0].status,'IN_PROGRESS');
    assert.equal((await fetch(server.url+'/api/competitions/'+info.id+'/match')).status,401);
    assert.equal((await fetch(server.url+'/api/competitions/'+info.id+'/match',{headers:{Authorization:'Bearer '+info.outsiderToken}})).status,403);
  } finally { await server.stop(); }
  assert.equal((await readSnapshot(sandbox,'SELECT id FROM competition_matches')).length,1);
});

test('a player in another active match blocks start and the legacy creation path', t => {
  const sandbox=fixture(t);
  script(sandbox, `${imports}
    const before=fs.readFileSync(process.env.MATCHSPORT_DB_PATH);
    const original=db.createMatch({sportId:'futbol',formatId:'1v1',teamA:[db.getUser(info.users[0])],teamB:[db.getUser(info.users[1])]});
    assert.throws(()=>command(info.users[0],'start',payload()),e=>e.code==='ACTIVE_MATCH');
    db.cancelMatch(original.id,info.users[0]);
    const second=structuredClone(room()); second.id=crypto.randomUUID(); second.code=crypto.randomUUID().slice(0,8);
    const {sqlSaveCompetition}=await import('./server/database.js');
    db.competitions.set(second.id,second); sqlSaveCompetition(second);
    command(info.users[0],'start',payload());
    assert.throws(()=>command(info.users[0],'start',{requestId:crypto.randomUUID(),competitionId:second.id,expectedRevision:second.revision}),e=>e.code==='ACTIVE_MATCH');
    assert.throws(()=>db.createMatch({sportId:'futbol',formatId:'1v1',teamA:[db.getUser(info.users[0])],teamB:[db.getUser(info.users[1])]}),e=>e.code==='ACTIVE_MATCH');
    assert.equal(db.competitionMatches.size,1);
  `);
});

test('two competing HTTP start requests cannot create two matches', async t => {
  const sandbox=fixture(t);
  const info=JSON.parse(fs.readFileSync(path.join(sandbox.directory,'start.json')));
  const server=await startTestServer(sandbox);
  try {
    const start=()=>fetch(server.url+'/api/competitions/commands/start',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+info.tokens[0]},body:JSON.stringify({requestId:crypto.randomUUID(),competitionId:info.id,expectedRevision:info.revision})});
    const responses=await Promise.all([start(),start()]);
    assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
  } finally { await server.stop(); }
  assert.equal((await readSnapshot(sandbox,'SELECT id FROM competition_matches')).length,1);
});

test('started match and its competition link survive backup and restore', async t => {
  const sandbox=fixture(t);
  script(sandbox, `${imports} command(info.users[0],'start',payload());`);
  const directory=path.join(sandbox.directory,'backup');
  const target=path.join(sandbox.directory,'restored.db');
  for(const [operation,env] of [['backup',sandbox.env],['restore',{...sandbox.env,MATCHSPORT_DB_PATH:target}]]) {
    const result=spawnSync(process.execPath,['server/backup.js',operation,directory],{cwd:PROJECT_ROOT,env,encoding:'utf8',timeout:15000});
    assert.equal(result.status,0,result.stderr);
  }
  const info=JSON.parse(fs.readFileSync(path.join(sandbox.directory,'start.json')));
  const server=await startTestServer(sandbox,{MATCHSPORT_DB_PATH:target});
  try {
    const room=(await request(server,'/competitions/'+info.id,undefined,info.tokens[0])).competition;
    const match=(await request(server,'/competitions/'+info.id+'/match',undefined,info.tokens[1])).match;
    assert.equal(room.matchId,match.id); assert.equal(match.competitionId,room.id);
    assert.equal(match.status,'IN_PROGRESS'); assert.equal(Object.keys(match.captains).length,2);
  } finally { await server.stop(); }
});

test('exception after match insertion rolls SQL and both caches back without a half-started room', t => {
  const sandbox=fixture(t);
  script(sandbox, `${imports}
    const before=fs.readFileSync(process.env.MATCHSPORT_DB_PATH);
    const original=db._persistCompetitionMatch;
    db._persistCompetitionMatch=function(match){ original.call(this,match); throw new Error('Injected start failure'); };
    assert.throws(()=>command(info.users[0],'start',payload()),/Injected start failure/);
    assert.equal(room().status,'FULL'); assert.equal(room().matchId,undefined); assert.equal(db.competitionMatches.size,0);
    assert.deepEqual(fs.readFileSync(process.env.MATCHSPORT_DB_PATH),before);
    db._persistCompetitionMatch=original;
    assert.equal(command(info.users[0],'start',payload()).data.status,'IN_PROGRESS');
  `);
});
