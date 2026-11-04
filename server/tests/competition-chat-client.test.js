import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createCompetitionChat } from '../../shared/competitionChatClient.mjs';
import { createChatOutboxStore } from '../../shared/chatOutboxStore.mjs';

const message = (sequence, extra = {}) => ({ id: `message-${sequence}`, competitionId: 'room-a', sequence,
  senderId: 'other', requestId: `request-${sequence}`, text: `Texto ${sequence}`, ...extra });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise,resolve,reject }; };
const turn = () => new Promise(resolve => setImmediate(resolve));

test('live delivery cannot skip missed history; reconnect merges pages once and dispose removes own listeners', async () => {
  const socket = new EventEmitter(); socket.connected = true;
  const first = deferred(); const cursors=[]; let state;
  const foreignListener = () => {}; socket.on('competitionMessage',foreignListener);
  const client = createCompetitionChat({ competitionId:'room-a',senderId:'self',socket,
    fetchPage: async after => { cursors.push(after); return cursors.length===1 ? first.promise : {messages:[message(3),message(4)],hasMore:false}; },
    send:async()=>{},onChange:value=>{state=value;} });
  await turn();
  socket.emit('competitionMessage',{competitionId:'room-a',message:message(3)});
  socket.emit('competitionMessage',{competitionId:'room-a',message:message(3)});
  socket.emit('competitionMessage',{competitionId:'room-b',message:message(8,{competitionId:'room-b'})});
  first.resolve({messages:[message(1),message(2)],hasMore:false}); await client.ready;
  assert.deepEqual(state.messages.map(item=>item.sequence),[1,2,3]);
  socket.connected=false; socket.emit('disconnect'); assert.equal(state.connected,false);
  socket.connected=true; socket.emit('connect'); await turn(); await client.sync();
  assert.equal(cursors[1],2,'The live event sequence is not a history cursor');
  assert.deepEqual(state.messages.map(item=>item.sequence),[1,2,3,4]);
  client.dispose();
  assert.equal(socket.listenerCount('competitionMessage'),1); assert.equal(socket.listeners('competitionMessage')[0],foreignListener);
  assert.equal(socket.listenerCount('connect'),0); assert.equal(socket.listenerCount('disconnect'),0);
});

test('lost acknowledgments retain outbox and retry the same request; live plus HTTP acknowledgment renders once', async () => {
  const socket=new EventEmitter(); socket.connected=true;
  const attempts=[]; const saved=[]; let state;
  const accepted=message(1,{senderId:'self',requestId:'stable-key'});
  const client=createCompetitionChat({competitionId:'room-a',senderId:'self',socket,newRequestId:()=> 'stable-key',
    fetchPage:async()=>({messages:[],hasMore:false}),saveOutbox:async values=>saved.push(structuredClone(values)),
    send:async body=> {
      attempts.push(body);
      if(attempts.length===1) throw new Error('Se perdió la respuesta');
      socket.emit('competitionMessage',{competitionId:'room-a',message:accepted});
      return {message:accepted,replayed:true};
    },onChange:value=>{state=value;} });
  await client.ready; await client.sendText('Mensaje pendiente');
  assert.equal(state.pending[0].status,'error'); assert.equal(saved.at(-1)[0].requestId,'stable-key');
  await client.retry('stable-key');
  assert.deepEqual(attempts,[{requestId:'stable-key',text:'Mensaje pendiente'},{requestId:'stable-key',text:'Mensaje pendiente'}]);
  assert.equal(state.messages.length,1); assert.equal(state.pending.length,0); assert.deepEqual(saved.at(-1),[]);
  client.dispose();
});

test('reopening reconciles persisted pending messages against paginated history before retry', async () => {
  let stored=[{requestId:'confirmed',text:'Ya llegó',createdAt:new Date().toISOString(),status:'sending'},
    {requestId:'retry-me',text:'Pendiente',createdAt:new Date().toISOString(),status:'sending'}];
  const attempts=[]; const pages=[]; let state;
  const client=createCompetitionChat({competitionId:'room-a',senderId:'self',loadOutbox:async()=>stored,
    saveOutbox:async values=>{stored=structuredClone(values);},
    fetchPage:async after=>{pages.push(after); return after===0 ? {messages:[message(1,{senderId:'self',requestId:'confirmed'})],hasMore:true} : {messages:[message(2)],hasMore:false};},
    send:async body=>{attempts.push(body);return {message:message(3,{senderId:'self',requestId:body.requestId})};},
    onChange:value=>{state=value;} });
  await client.ready;
  assert.deepEqual(pages,[0,1]); assert.equal(attempts.length,0);
  assert.deepEqual(state.pending.map(item=>[item.requestId,item.status]),[['retry-me','error']]);
  await client.retry('retry-me'); assert.equal(attempts[0].requestId,'retry-me'); assert.deepEqual(stored,[]);
  client.dispose();
});

test('storage failure is visible and prevents an unrecorded send; late responses do not update disposed UI', async () => {
  let sends=0; let state;
  const client=createCompetitionChat({competitionId:'room-a',senderId:'self',
    fetchPage:async()=>({messages:[],hasMore:false}),saveOutbox:async values=>{if(values.length) throw new Error('Almacenamiento lleno');},
    send:async()=>{sends++;},onChange:value=>{state=value;} });
  await client.ready; await client.sendText('No perder texto');
  assert.equal(sends,0); assert.equal(state.pending[0].status,'error'); assert.match(state.error,/Almacenamiento/);
  client.dispose();
  const response=deferred(); let calls=0;
  const second=createCompetitionChat({competitionId:'room-b',senderId:'self',fetchPage:()=>response.promise,
    send:async()=>{},onChange:()=>{calls++;}});
  await turn(); second.dispose(); const before=calls;
  response.resolve({messages:[message(1,{competitionId:'room-b'})],hasMore:false}); await second.ready;
  assert.equal(calls,before);
});

test('closing during a slow write preserves pending text on reopen and isolates accounts and rooms', async () => {
  const values=new Map(); const write=deferred(); let block=true;
  const outbox=createChatOutboxStore({getItem:async key=>values.get(key),removeItem:async key=>values.delete(key),
    setItem:async(key,value)=>{if(block) {block=false;await write.promise;} values.set(key,value);} });
  let sends=0; let state;
  const options={competitionId:'room-a',senderId:'self',fetchPage:async()=>({messages:[],hasMore:false}),
    send:async()=>{sends++;throw new Error('Sin red');},onChange:value=>{state=value;},...outbox('self','room-a')};
  const first=createCompetitionChat({...options,newRequestId:()=> 'closing-key'});
  await first.ready;
  const sending=first.sendText('Conservar al cerrar'); await turn(); first.dispose();
  const second=createCompetitionChat({...options,newRequestId:()=> 'new-key'});
  write.resolve(); await sending; await second.ready;
  assert.equal(sends,0); assert.equal(state.pending[0].text,'Conservar al cerrar');
  await second.sendText('Nuevo texto');
  assert.deepEqual((await outbox('self','room-a').loadOutbox()).map(item=>item.requestId),['closing-key','new-key']);
  assert.deepEqual(await outbox('other','room-a').loadOutbox(),[]);
  assert.deepEqual(await outbox('self','room-b').loadOutbox(),[]);
  second.dispose();
});
