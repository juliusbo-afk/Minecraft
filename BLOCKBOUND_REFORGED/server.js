/**
 * BLOCKBOUND REFORGED — WebSocket Multiplayer (Node.js 18+, keine Pakete).
 * Räume nach Name + Spielmodus; persistente Blockänderungen / Inventare.
 * Start: node server.js
 */
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const PORT=Number(process.env.PORT||3000);
const HOST=process.env.HOST||'0.0.0.0';
const SAVE_DIR=path.join(__dirname,'saves');
const MAX_EDITS=150000;
const BLOCK_TYPES=35;
const active=new Set();
const rooms=new Map();
let idCounter=0;
fs.mkdirSync(SAVE_DIR,{recursive:true});

function seedHash(value){value=String(value||'').trim();if(/^-?\d+$/.test(value))return (Number(value)|0)||1;let h=2166136261;for(const ch of value)h=Math.imul(h^ch.charCodeAt(0),16777619);return (h|0)||1;}
function validRoom(value){return String(value||'Meine Welt').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,28)||'Meine Welt';}
function validName(value){return String(value||'Spieler').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,18)||'Spieler';}
function roomId(room,mode){return mode+'::'+room.toLowerCase();}
function roomFilename(id){return path.join(SAVE_DIR,crypto.createHash('sha256').update(id).digest('hex').slice(0,20)+'.json');}
function loadRoom(name,mode,requestedSeed){const id=roomId(name,mode);if(rooms.has(id))return rooms.get(id);
 const filename=roomFilename(id);let data=null;
 try{data=JSON.parse(fs.readFileSync(filename,'utf8'));}catch{}
 let seed=Number.isInteger(data?.seed)?data.seed:requestedSeed?seedHash(requestedSeed):crypto.randomInt(1,2147483647);
 const edits=new Map();if(Array.isArray(data?.edits))for(const entry of data.edits){if(!Array.isArray(entry)||entry.length!==2)continue;const [key,block]=entry;if(typeof key==='string'&&/^(-?\d+,){2}-?\d+$/.test(key)&&Number.isInteger(block)&&block>=0&&block<BLOCK_TYPES)edits.set(key,block);}
 const profiles=new Map();if(data?.profiles&&typeof data.profiles==='object')for(const [name,profile] of Object.entries(data.profiles))if(name.length<=18&&profile&&typeof profile==='object')profiles.set(name,profile);
 const result={id,name,mode,seed,edits,profiles,players:new Set(),filename,dirty:false,saveTimer:null,dayStart:Number(data?.dayStart)||Date.now()};
 rooms.set(id,result);console.log(`[Raum] ${name} / ${mode} · Seed ${seed} · ${edits.size} Änderungen`);if(!data)markDirty(result);return result;
}
function markDirty(room){room.dirty=true;clearTimeout(room.saveTimer);room.saveTimer=setTimeout(()=>saveRoom(room),1300);}
function saveRoom(room){clearTimeout(room.saveTimer);if(!room.dirty)return;try{const profiles=Object.fromEntries(room.profiles);const file={version:2,room:room.name,mode:room.mode,seed:room.seed,dayStart:room.dayStart,edits:[...room.edits],profiles,savedAt:new Date().toISOString()};const tmp=room.filename+'.tmp';fs.writeFileSync(tmp,JSON.stringify(file));fs.renameSync(tmp,room.filename);room.dirty=false;}catch(e){console.error('[Speichern]',e.message);}}
function worldTime(room){return (.25+(Date.now()-room.dayStart)/(20*60*1000))%1;}
const html=path.join(__dirname,'index.html');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),loc=url.pathname;
 if(req.method!=='GET'){res.writeHead(405);return res.end('Method Not Allowed');}
 if(loc==='/'||loc==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return fs.createReadStream(html).pipe(res);}
 if(loc==='/health'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,name:'BLOCKBOUND REFORGED',players:[...active].filter(p=>p.room).length,rooms:rooms.size,uptime:process.uptime()}));}
 res.writeHead(404,{'Content-Type':'text/plain'});res.end('Nicht gefunden');
});
function frame(opcode,payload=Buffer.alloc(0)){if(!Buffer.isBuffer(payload))payload=Buffer.from(payload);const len=payload.length;let h;
 if(len<126){h=Buffer.alloc(2);h[1]=len;}else if(len<65536){h=Buffer.alloc(4);h[1]=126;h.writeUInt16BE(len,2);}else{h=Buffer.alloc(10);h[1]=127;h.writeBigUInt64BE(BigInt(len),2);}h[0]=0x80|opcode;return Buffer.concat([h,payload]);}
function send(c,msg){if(c.socket.destroyed||c.socket.writableLength>2_000_000)return;try{c.socket.write(frame(1,JSON.stringify(msg)));}catch{c.socket.destroy();}}
function roomCast(room,msg,except=null){for(const c of room.players)if(c!==except)send(c,msg);}
function close(c,code=1000,msg=''){if(c.socket.destroyed)return;try{const codeBuffer=Buffer.alloc(2);codeBuffer.writeUInt16BE(code);c.socket.end(frame(8,Buffer.concat([codeBuffer,Buffer.from(msg.slice(0,90))])));}catch{c.socket.destroy();}}
function receive(c,chunk){c.inBuffer=Buffer.concat([c.inBuffer,chunk]);if(c.inBuffer.length>512*1024)return close(c,1009,'Nachricht zu gross');
 while(c.inBuffer.length>=2){const b=c.inBuffer,fin=!!(b[0]&128),op=b[0]&15,masked=!!(b[1]&128);if(!fin||!masked)return close(c,1002,'Ungueltiger Frame');let len=b[1]&127,offset=2;
  if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);offset=4;}
  else if(len===127){if(b.length<10)return;const n=b.readBigUInt64BE(2);if(n>256000n)return close(c,1009,'Frame zu gross');len=Number(n);offset=10;}
  if(len>256000)return close(c,1009,'Frame zu gross');if(b.length<offset+4+len)return;
  const mask=b.subarray(offset,offset+4);offset+=4;const payload=Buffer.from(b.subarray(offset,offset+len));c.inBuffer=b.subarray(offset+len);
  for(let i=0;i<len;i++)payload[i]^=mask[i%4];
  if(op===8){c.socket.end(frame(8));return;}
  if(op===9){c.socket.write(frame(10,payload));continue;}
  if(op===10){c.lastPong=Date.now();continue;}
  if(op!==1)return close(c,1003,'Nur Textframes unterstuetzt');
  let msg;try{msg=JSON.parse(payload.toString('utf8'));}catch{continue;}
  onMessage(c,msg);
 }
}
function num(v,min,max){return typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;}
function safeInventory(raw){if(!Array.isArray(raw)||raw.length!==36)return null;return raw.map(s=>{
 if(s===null)return null;if(!s||typeof s.id!=='string'||s.id.length>30||!/^([btm]):[a-z_0-9]+$/.test(s.id))return null;
 if(s.id.startsWith('b:')&&!(Number(s.id.slice(2))>=1&&Number(s.id.slice(2))<BLOCK_TYPES))return null;
 return {id:s.id,count:Math.floor(Math.max(1,Math.min(64,Number(s.count)||1))),wear:Math.floor(Math.max(0,Math.min(2000,Number(s.wear)||0)))};
 });}
function onMessage(c,msg){if(!msg||typeof msg!=='object'||typeof msg.t!=='string')return;const now=Date.now();
 if(msg.t==='join'){
  if(c.room)return;
  const mode=msg.mode==='creative'?'creative':'survival',name=validRoom(msg.room),user=validName(msg.name);
  const room=loadRoom(name,mode,String(msg.seed||'').slice(0,32));c.room=room;c.name=user;room.players.add(c);c.x=0;c.y=50;c.z=0;c.yaw=0;
  const players=[...room.players].filter(p=>p!==c).map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw}));
  send(c,{t:'welcome',id:c.id,seed:room.seed,mode:room.mode,edits:[...room.edits],players,profile:room.profiles.get(user)||null,time:worldTime(room)});
  roomCast(room,{t:'join',p:{id:c.id,name:c.name,x:0,y:50,z:0,yaw:0}},c);
  console.log(`[Join] ${c.name} -> ${room.name} (${room.mode}) · ${room.players.size} Spieler`);return;
 }
 if(!c.room)return;
 if(msg.t==='pos'){
  if(now-c.lastPos<45)return;
  if(!num(msg.x,-1000000,1000000)||!num(msg.y,-15,135)||!num(msg.z,-1000000,1000000)||!num(msg.yaw,-10000,10000)||!num(msg.pitch,-10000,10000))return;
  c.x=msg.x;c.y=msg.y;c.z=msg.z;c.yaw=msg.yaw;c.lastPos=now;
  roomCast(c.room,{t:'pos',id:c.id,x:c.x,y:c.y,z:c.z,yaw:c.yaw,pitch:msg.pitch},c);
 }else if(msg.t==='edit'){
  if(now-c.lastEdit<85)return;
  if(!Number.isInteger(msg.x)||!Number.isInteger(msg.y)||!Number.isInteger(msg.z)||!Number.isInteger(msg.id))return;
  if(Math.abs(msg.x)>1000000||Math.abs(msg.z)>1000000||msg.y<1||msg.y>=112||msg.id<0||msg.id>=BLOCK_TYPES||msg.id===16)return;
  if(Math.hypot(msg.x+.5-c.x,msg.y+.5-(c.y+1.6),msg.z+.5-c.z)>9)return;
  if(c.room.edits.size>MAX_EDITS){send(c,{t:'error',message:'Das Raumlimit für Blockänderungen wurde erreicht.'});return;}
  c.lastEdit=now;c.room.edits.set(`${msg.x},${msg.y},${msg.z}`,msg.id);markDirty(c.room);roomCast(c.room,{t:'edit',x:msg.x,y:msg.y,z:msg.z,id:msg.id},c);
 }else if(msg.t==='fall'){
  if(!Number.isInteger(msg.x)||!Number.isInteger(msg.z)||!Number.isInteger(msg.from)||!Number.isInteger(msg.to)||![8,24].includes(msg.id))return;
  if(msg.from<=msg.to||msg.to<1||msg.from>=112||Math.abs(msg.x)>1000000||Math.abs(msg.z)>1000000)return;
  if(Math.hypot(msg.x+.5-c.x,msg.z+.5-c.z)>9||Math.abs(msg.from-c.y)>95)return;
  c.room.edits.set(`${msg.x},${msg.from},${msg.z}`,0);c.room.edits.set(`${msg.x},${msg.to},${msg.z}`,msg.id);
  markDirty(c.room);roomCast(c.room,{t:'fall',x:msg.x,z:msg.z,from:msg.from,to:msg.to,id:msg.id},c);
 }else if(msg.t==='chat'){
  if(now-c.lastChat<400)return;
  const chat=String(msg.message||'').replace(/[\x00-\x1f]/g,'').slice(0,200).trim();if(!chat)return;c.lastChat=now;roomCast(c.room,{t:'chat',name:c.name,message:chat});
 }else if(msg.t==='state'){
  if(now-c.lastState<3500)return;c.lastState=now;
  const old=c.room.profiles.get(c.name)||{},profile={...old};
  if(c.room.mode==='survival'){const inv=safeInventory(msg.inventory);if(inv)profile.inventory=inv;
   if(num(msg.health,0,20))profile.health=msg.health;if(num(msg.hunger,0,20))profile.hunger=msg.hunger;}
  if(Array.isArray(msg.player)&&msg.player.length===3&&msg.player.every((v,i)=>num(v,i===1?-10:-1000000,i===1?130:1000000)))profile.player=msg.player;
  c.room.profiles.set(c.name,profile);markDirty(c.room);
 }
}
server.on('upgrade',(req,socket,head)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname!=='/ws'){socket.destroy();return;}
 const key=req.headers['sec-websocket-key'];if(req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||typeof key!=='string'||! /^[A-Za-z0-9+/]{22}==$/.test(key)){socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');socket.destroy();return;}
 const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');socket.setNoDelay(true);
 const c={socket,id:String(++idCounter),inBuffer:Buffer.alloc(0),room:null,name:'',x:0,y:50,z:0,yaw:0,lastEdit:0,lastChat:0,lastPos:0,lastState:0,lastPong:Date.now()};active.add(c);
 socket.on('data',bytes=>receive(c,bytes));if(head.length)receive(c,head);
 socket.on('close',()=>{active.delete(c);if(c.room){c.room.players.delete(c);roomCast(c.room,{t:'leave',id:c.id,name:c.name});if(c.room.dirty)saveRoom(c.room);console.log(`[Leave] ${c.name} (${c.room.name})`);}});
 socket.on('error',()=>socket.destroy());
});
const ping=setInterval(()=>{for(const c of active){if(Date.now()-c.lastPong>120000){c.socket.destroy();continue;}try{c.socket.write(frame(9,Buffer.from('ping')));}catch{c.socket.destroy();}}},30000);ping.unref();
function shutdown(){for(const room of rooms.values())saveRoom(room);server.close();setTimeout(()=>process.exit(0),1000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
server.listen(PORT,HOST,()=>console.log(`BLOCKBOUND REFORGED Server läuft: http://localhost:${PORT} (WebSocket: /ws)\nSpieler im selben Netzwerk verbinden sich über deine lokale IPv4-Adresse und Port ${PORT}.`));