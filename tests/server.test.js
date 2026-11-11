import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {createWorldGenerator} from '../shared/worldgen.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){return new Promise((res,rej)=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>res(n));});s.on('error',rej);});}
async function launch(port,saveDir){const child=spawn(process.execPath,['server/index.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',SAVE_DIR:saveDir},stdio:['ignore','pipe','pipe']});
 let error='';child.stderr.on('data',data=>error+=data);
 for(let i=0;i<60;i++){
  if(child.exitCode!==null)throw new Error('server stopped '+error);
  try{const response=await fetch(`http://127.0.0.1:${port}/health`);if(response.ok)return child;}catch{}
  await delay(80);
 }
 child.kill();throw new Error('server did not start '+error);
}
function client(port){return new Promise((resolve,reject)=>{
 const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);const messages=[];const subs=new Set();
 const timer=setTimeout(()=>reject(Error('WebSocket connect timeout')),5000);
 ws.addEventListener('open',()=>{clearTimeout(timer);resolve({ws,messages,send:m=>ws.send(JSON.stringify(m)),
  wait:(type,accept=()=>true,timeout=8000)=>new Promise((ok,fail)=>{
   const existing=messages.find(m=>m.t===type&&accept(m));if(existing)return ok(existing);
   const t=setTimeout(()=>{subs.delete(fn);fail(Error(`Timeout waiting ${type}, got ${JSON.stringify(messages.slice(-5))}`));},timeout);
   const fn=(m)=>{if(m.t===type&&accept(m)){clearTimeout(t);subs.delete(fn);ok(m);}};subs.add(fn);
  })});});
 ws.addEventListener('message',e=>{try{const m=JSON.parse(e.data);messages.push(m);for(const fn of [...subs])fn(m);}catch{}});
 ws.addEventListener('error',reject);
 });}
async function stop(child){if(child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise(res=>child.once('exit',res)),delay(2500)]);if(child.exitCode===null)child.kill('SIGKILL');}

test('static game, independent multiplayer clients, block validation and persistence', {timeout:30000},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'blockbound-test-'));
 const port=await freePort(),players=[];let proc;
 try{
  proc=await launch(port,dir);
  const page=await fetch(`http://127.0.0.1:${port}/`);assert.equal(page.status,200);const html=await page.text();assert.match(html,/BLOCKBOUND/);
  for(const file of ['/client/src/main.js','/shared/worldgen.js','/client/styles/main.css'])assert.equal((await fetch(`http://127.0.0.1:${port}${file}`)).status,200);
  assert.equal((await fetch(`http://127.0.0.1:${port}/saves/bad.json`)).status,403);
  const a=await client(port),b=await client(port);players.push(a,b);
  a.send({t:'join',room:'UnitTest World',seed:'my-seed-2026',mode:'creative',name:'PlayerOne'});
  const aw=await a.wait('welcome');assert.equal(aw.mode,'creative');assert.equal(aw.edits.length,0);
  b.send({t:'join',room:'UnitTest World',seed:'wrong-second-seed',mode:'creative',name:'PlayerTwo'});
  const bw=await b.wait('welcome');assert.equal(bw.seed,aw.seed);assert.equal(bw.players.length,1);
  a.send({t:'pos',x:5,y:62,z:5,yaw:0,pitch:0});b.send({t:'pos',x:5,y:62,z:5,yaw:0,pitch:0});
  await a.wait('pos',m=>m.id===bw.id);await b.wait('pos',m=>m.id===aw.id);
  a.send({t:'chat',message:'Hallo vom Multiplayer-Test'});
  assert.equal((await b.wait('chat')).message,'Hallo vom Multiplayer-Test');
  a.send({t:'place',x:7,y:63,z:5,id:5,slot:0});
  assert.equal((await b.wait('edit',m=>m.x===7&&m.y===63&&m.z===5)).id,5);
  // Another client must not edit a remote coordinate.
  b.send({t:'place',x:9999,y:60,z:9999,id:3,slot:0});await delay(140);
  assert.equal(b.messages.some(m=>m.t==='edit'&&m.x===9999),false);
  // Creative breaking is immediate but must still be initiated.
  b.send({t:'mine_start',x:7,y:63,z:5,slot:0});await delay(95);b.send({t:'mine',x:7,y:63,z:5,slot:0});
  assert.equal((await a.wait('edit',m=>m.x===7&&m.y===63&&m.z===5&&m.id===0)).id,0);
  // Persistent place at a new coordinate to verify after server restart.
  await delay(95);a.send({t:'place',x:8,y:63,z:5,id:21,slot:0});
  await b.wait('edit',m=>m.x===8&&m.y===63&&m.z===5&&m.id===21);
  // Survival: a time-validated mine grants the drop from the server, and spoofed inventories are ignored.
  const survivor=await client(port);players.push(survivor);
  survivor.send({t:'join',room:'Survival Protocol Check',seed:'345',mode:'survival',name:'Survivor'});
  await survivor.wait('welcome');
  const h=createWorldGenerator(345).column(4,5).h;
  survivor.send({t:'pos',x:4.5,y:h+1.2,z:5.5,yaw:0,pitch:0});
  survivor.send({t:'mine_start',x:4,y:h,z:5,slot:0});
  await delay(1900);
  survivor.send({t:'mine',x:4,y:h,z:5,slot:0});
  const inv=await survivor.wait('inventory',m=>m.inventory.some(x=>x?.count>=1));
  assert.ok(inv.inventory.some(x=>x?.id?.startsWith('b:')),'server awarded a survival block drop');
  survivor.send({t:'state',inventory:Array(36).fill({id:'m:diamond',count:64}),health:20,hunger:20});
  await delay(100);survivor.send({t:'swap',a:0,b:1});
  const updated=await survivor.wait('inventory',m=>m.inventory[1]?.id===inv.inventory[0].id);
  assert.equal(updated.inventory.some(x=>x?.id==='m:diamond'),false,'server ignored forged inventory state');
  players.forEach(p=>p.ws.close());await delay(250);await stop(proc);
  const savefiles=readdirSync(dir).filter(x=>x.endsWith('.json'));assert.ok(savefiles.length>=1,'world file saved');
  const data=savefiles.map(f=>JSON.parse(readFileSync(path.join(dir,f),'utf8'))).find(x=>x.name==='UnitTest World');
  assert.ok(data,'creative room snapshot available');
  assert.ok(data.edits.some(([loc,id])=>loc==='8,63,5'&&id===21),'persisted block');
  proc=await launch(port,dir);const reconnect=await client(port);players.push(reconnect);
  reconnect.send({t:'join',room:'UnitTest World',mode:'creative',name:'PlayerOne'});
  const restored=await reconnect.wait('welcome');assert.ok(restored.edits.some(([loc,id])=>loc==='8,63,5'&&id===21));
 }finally{players.forEach(p=>{try{p.ws.close();}catch{}});if(proc)await stop(proc);rmSync(dir,{recursive:true,force:true});}
});
