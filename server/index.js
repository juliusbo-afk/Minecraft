/** BLOCKBOUND Ultimate – authoritative world/block/inventory server, no runtime dependencies. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {B, BLOCKS, CHUNK, MAX_Y, TOOLS, MATERIALS, RECIPES, SMELT, NATURAL_DROPS} from '../shared/registry.js';
import {createWorldGenerator} from '../shared/worldgen.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SAVE_DIR=path.resolve(process.env.SAVE_DIR||path.join(ROOT,'saves'));
const PORT=Number(process.env.PORT||3000), HOST=process.env.HOST||'0.0.0.0';
const MAX_EDITS=200000, MAX_MESSAGE=64_000;
const rooms=new Map(), connections=new Set();
fs.mkdirSync(SAVE_DIR,{recursive:true});
let ids=0;
function hashSeed(input){const s=String(input??'').trim();if(/^-?\d+$/.test(s))return (Number(s)|0)||1;let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return (h|0)||1;}
function safeName(s,fallback='Spieler',length=24){return String(s||fallback).replace(/[\x00-\x1f<>]/g,'').trim().slice(0,length)||fallback;}
function validXYZ(x,y,z){return [x,y,z].every(Number.isInteger)&&Math.abs(x)<=1_000_000&&Math.abs(z)<=1_000_000&&y>0&&y<MAX_Y;}
function key(x,y,z){return `${x},${y},${z}`;}
function fileName(id){return path.join(SAVE_DIR,crypto.createHash('sha256').update(id).digest('hex').slice(0,24)+'.json');}
function sanitizeInv(inv){return Array.from({length:36},(_,i)=>{const v=inv?.[i];if(!v||typeof v!=='object'||typeof v.id!=='string')return null;
  const id=v.id;
  if(!((id.startsWith('b:')&&Number.isInteger(+id.slice(2))&&+id.slice(2)>0&&+id.slice(2)<BLOCKS.length)||id in TOOLS||id in MATERIALS))return null;
  return {id,count:Math.max(1,Math.min(id in TOOLS?1:64,Math.floor(Number(v.count)||1))),wear:Math.max(0,Math.min(2000,Math.floor(Number(v.wear)||0)))};
 });}
function roomFor(name,mode,seed){const id=`${mode}:${name.toLowerCase()}`;if(rooms.has(id))return rooms.get(id);
 let data=null;const filename=fileName(id);try{data=JSON.parse(fs.readFileSync(filename,'utf8'));}catch{}
 const value=Number.isInteger(data?.seed)?data.seed:seed===''?crypto.randomInt(1,2**31-1):hashSeed(seed);
 const edits=new Map();for(const pair of data?.edits||[]){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||!Number.isInteger(pair[1]))continue;
  const xyz=pair[0].split(',').map(Number);if(validXYZ(...xyz)&&pair[1]>=0&&pair[1]<BLOCKS.length)edits.set(pair[0],pair[1]);}
 const profiles=new Map();for(const [name,prof] of Object.entries(data?.profiles||{}))if(prof&&typeof prof==='object')profiles.set(name,{inventory:sanitizeInv(prof.inventory),player:prof.player,health:prof.health,hunger:prof.hunger});
 // Item entities belong to the world, not to a player's inventory. Persist them across restarts.
 const drops=new Map();
 for(const d of data?.drops||[]){
  if(typeof d?.id!=='string'||typeof d.itemId!=='string'||!Number.isFinite(d.x)||!Number.isFinite(d.y)||!Number.isFinite(d.z)||!Number.isInteger(d.count)||d.count<1||d.count>64)continue;
  if(!(d.itemId in MATERIALS)&&!(d.itemId in TOOLS)&&!(d.itemId.startsWith('b:')&&BLOCKS[+d.itemId.slice(2)]))continue;
  if(drops.size>=800)break;
  drops.set(d.id,{id:d.id,itemId:d.itemId,count:d.count,x:d.x,y:d.y,z:d.z,spawnY:Number.isFinite(d.spawnY)?d.spawnY:d.y,createdAt:Number.isFinite(d.createdAt)?d.createdAt:Date.now()-1000});
 }
 const r={id,name,mode,seed:value,edits,profiles,drops,players:new Set(),generator:createWorldGenerator(value),cache:new Map(),filename,dirty:!data,dayStart:data?.dayStart||Date.now(),timer:null};
 rooms.set(id,r);if(!data)dirty(r);console.log(`[Welt] ${id} – Seed ${value}, ${edits.size} Änderungen`);return r;
}
function dirty(room){room.dirty=true;clearTimeout(room.timer);room.timer=setTimeout(()=>save(room),1700);room.timer.unref?.();}
function save(room){clearTimeout(room.timer);if(!room.dirty)return;try{
 const snapshot={version:4,seed:room.seed,name:room.name,mode:room.mode,dayStart:room.dayStart,edits:[...room.edits],drops:[...room.drops.values()],profiles:Object.fromEntries(room.profiles),savedAt:new Date().toISOString()};
 const tmp=room.filename+'.tmp';fs.writeFileSync(tmp,JSON.stringify(snapshot));fs.renameSync(tmp,room.filename);room.dirty=false;
 }catch(e){console.error('[Speicherfehler]',e);}}
function generated(room,x,y,z){if(y<=0)return B.BEDROCK;if(y>=MAX_Y)return B.AIR;
 const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK),ck=`${cx},${cz}`;let chunk=room.cache.get(ck);
 if(!chunk){chunk=room.generator.generateChunk(cx,cz);room.cache.set(ck,chunk);if(room.cache.size>64)room.cache.delete(room.cache.keys().next().value);}
 return chunk[((x-cx*CHUNK)*CHUNK+(z-cz*CHUNK))*MAX_Y+y];}
function block(room,x,y,z){if(y<0)return B.BEDROCK;if(y>=MAX_Y)return B.AIR;return room.edits.get(key(x,y,z))??generated(room,x,y,z);}
function setBlock(room,x,y,z,id){if(block(room,x,y,z)===id)return false;if(!room.edits.has(key(x,y,z))&&room.edits.size>=MAX_EDITS)return false;room.edits.set(key(x,y,z),id);dirty(room);broadcast(room,{t:'edit',x,y,z,id});return true;}
function gravity(room,x,y,z){for(let yy=Math.max(1,y);yy<Math.min(MAX_Y,y+20);yy++){
 const type=block(room,x,yy,z);if(type!==B.SAND&&type!==B.GRAVEL)continue;
 let to=yy;while(to>1&&[B.AIR,B.WATER,B.LAVA,B.FLOWER,B.GRASS_PLANT].includes(block(room,x,to-1,z)))to--;
 if(to!==yy){setBlock(room,x,yy,z,B.AIR);setBlock(room,x,to,z,type);}
}}
function invCount(c,id){return c.inventory.reduce((sum,s)=>sum+(s?.id===id?s.count:0),0);}
function invRemove(c,id,n){if(invCount(c,id)<n)return false;for(let i=35;i>=0&&n>0;i--){const s=c.inventory[i];if(s?.id===id){let x=Math.min(s.count,n);s.count-=x;n-=x;if(!s.count)c.inventory[i]=null;}}return true;}
function invCapacity(c,id){const max=id in TOOLS?1:64;return c.inventory.reduce((n,s)=>n+(s===null?max:s.id===id?max-s.count:0),0);}
function invAdd(c,id,n){if(!id||n<=0)return true;if(invCapacity(c,id)<n)return false;const max=id in TOOLS?1:64;let remain=n;
 for(const s of c.inventory){if(s?.id===id&&s.count<max){const k=Math.min(max-s.count,remain);s.count+=k;remain-=k;if(!remain)return true;}}
 for(let i=0;i<c.inventory.length&&remain;i++){if(c.inventory[i]===null){const k=Math.min(max,remain);c.inventory[i]={id,count:k,wear:0};remain-=k;}}return remain===0;}
function pushInv(c){send(c,{t:'inventory',inventory:c.inventory,health:c.health,hunger:c.hunger});if(c.room){c.room.profiles.set(c.name,profile(c));dirty(c.room);}}
function profile(c){return {inventory:c.inventory,health:c.health,hunger:c.hunger,player:[c.x,c.y,c.z]};}
function near(c,x,y,z,max=6){return Math.hypot(x+.5-c.x,y+.5-(c.y+1.62),z+.5-c.z)<=max;}
function nearType(c,id){const p=c.room;for(let dx=-3;dx<=3;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-3;dz<=3;dz++){
 const x=Math.floor(c.x)+dx,y=Math.floor(c.y)+dy,z=Math.floor(c.z)+dz;
 if(y>0&&y<MAX_Y&&block(p,x,y,z)===id&&near(c,x,y,z,4))return true;
}return false;}
function mineTime(c,id,slot){const b=BLOCKS[id];if(!b||id===B.BEDROCK||b.liquid)return Infinity;if(c.room.mode==='creative')return 0;
 if(!b.hardness)return .14;const s=c.inventory[slot],tool=s&&TOOLS[s.id],good=tool?.kind===b.tool;
 return b.hardness*(good?1.4/tool.speed:b.tool==='pick'?5:2.5);}
function canHarvest(c,id,slot){const b=BLOCKS[id],s=c.inventory[slot],t=s&&TOOLS[s.id];return b.tool!=='pick'||b.tier===0||!!t&&t.kind==='pick'&&t.tier>=b.tier;}
// Drops are server-owned entities; pickup is atomic and validated against position/capacity.
function landingY(room,x,y,z){for(let h=Math.min(MAX_Y-1,Math.floor(y));h>=1;h--){
  const id=block(room,Math.floor(x),h,Math.floor(z));
  if(id!==B.AIR&&!BLOCKS[id].liquid&&!BLOCKS[id].plant)return h+1.20;
 }return 1.20;}
function spawnDrop(room,itemId,x,y,z,count=1){
 if(!itemId||room.mode!=='survival'||room.drops.size>=800)return;
 const id=crypto.randomUUID();const spawnY=y+.65;
 const d={id,itemId,count,x:x+.5,z:z+.5,y:landingY(room,x,y,z),spawnY,createdAt:Date.now()};
 room.drops.set(id,d);dirty(room);broadcast(room,{t:'drop_spawn',drop:d});return d;
}
function tryPickup(c,id){
 const room=c.room,d=room?.drops.get(id),now=Date.now();
 if(!d||room.mode!=='survival'||now-d.createdAt<650)return false;
 if(Math.hypot(c.x-d.x,c.z-d.z)>1.70||Math.abs((c.y+.9)-d.y)>2.15)return false;
 if(!invAdd(c,d.itemId,d.count))return false;
 room.drops.delete(id);dirty(room);broadcast(room,{t:'drop_remove',id});pushInv(c);return true;
}
function pickupNearby(c){if(c.room?.mode!=='survival')return;for(const d of c.room.drops.values()){
  if(Math.abs(c.x-d.x)<1.7&&Math.abs(c.z-d.z)<1.7)tryPickup(c,d.id);
}}
function sendError(c,message){send(c,{t:'error',message});}
function validSlot(s){return Number.isInteger(s)&&s>=0&&s<36;}
function perform(c,m){const r=c.room,now=Date.now();if(!r)return;
 if(m.t==='pos'){
  if(now-c.lastPos<55)return;
  if([m.x,m.y,m.z,m.yaw,m.pitch].some(v=>typeof v!=='number'||!Number.isFinite(v))||Math.abs(m.x)>1e6||Math.abs(m.z)>1e6||m.y<0||m.y>MAX_Y+15)return;
  if(!c.movedOnce || Math.hypot(c.x-m.x,c.y-m.y,c.z-m.z)<50){c.x=m.x;c.y=m.y;c.z=m.z;c.movedOnce=true;c.lastPos=now;broadcast(r,{t:'pos',id:c.id,x:c.x,y:c.y,z:c.z,yaw:m.yaw,pitch:m.pitch},c);pickupNearby(c);}return;
 }
 if(m.t==='pickup'){
  if(typeof m.id!=='string'||m.id.length>80||now-c.lastPickup<75)return;
  c.lastPickup=now;tryPickup(c,m.id);return;
 }
 if(m.t==='mine_start'){
  if(!validXYZ(m.x,m.y,m.z)||!validSlot(m.slot)||!near(c,m.x,m.y,m.z))return;
  c.mining={at:now,key:key(m.x,m.y,m.z),slot:m.slot,id:block(r,m.x,m.y,m.z)};return;
 }
 if(m.t==='mine'){
  if(now-c.lastEdit<80||!validXYZ(m.x,m.y,m.z)||!validSlot(m.slot)||!near(c,m.x,m.y,m.z))return;
  const id=block(r,m.x,m.y,m.z),duration=mineTime(c,id,m.slot),mined=c.mining;
  if(id===B.AIR||!Number.isFinite(duration)||!mined||mined.key!==key(m.x,m.y,m.z)||mined.slot!==m.slot||mined.id!==id)return;
  if(now-mined.at < duration*1000-220){sendError(c,'Abbau war zu schnell.');return;}
  c.mining=null;c.lastEdit=now;
  if(!setBlock(r,m.x,m.y,m.z,B.AIR))return;
  if(r.mode==='survival'){
    if(canHarvest(c,id,m.slot)){
      const drop=Object.prototype.hasOwnProperty.call(NATURAL_DROPS,id)?NATURAL_DROPS[id]:`b:${id}`;
      if(drop)spawnDrop(r,drop,m.x,m.y,m.z,1);
      if([B.LEAVES,B.SPRUCE_LEAVES,B.BIRCH_LEAVES].includes(id)&&r.generator.h3(m.x,m.y,m.z,772)<.045)spawnDrop(r,'m:apple',m.x,m.y,m.z,1);
      if(id===B.GRASS_PLANT&&r.generator.h3(m.x,m.y,m.z,773)<.15)spawnDrop(r,'m:berry',m.x,m.y,m.z,1);
    }
    const s=c.inventory[m.slot];if(s&&TOOLS[s.id]){s.wear++;if(s.wear>=TOOLS[s.id].durability)c.inventory[m.slot]=null;}
    pushInv(c);
  }
  gravity(r,m.x,m.y,m.z);return;
 }
 if(m.t==='place'){
  if(now-c.lastEdit<80||!validXYZ(m.x,m.y,m.z)||!validSlot(m.slot)||!near(c,m.x,m.y,m.z))return;
  const current=block(r,m.x,m.y,m.z);if(![B.AIR,B.WATER,B.LAVA,B.FLOWER,B.GRASS_PLANT].includes(current))return;
  if(Math.abs(c.x-(m.x+.5))<.8&&Math.abs(c.z-(m.z+.5))<.8&&m.y<c.y+1.79&&m.y+1>c.y)return;
  let id;
  if(r.mode==='creative'){id=m.id;}else{const s=c.inventory[m.slot];if(!s||!s.id.startsWith('b:'))return;id=+s.id.slice(2);}
  if(!Number.isInteger(id)||id<=0||id>=BLOCKS.length||id===B.BEDROCK)return;
  if(!setBlock(r,m.x,m.y,m.z,id))return;
  c.lastEdit=now;
  if(r.mode==='survival'){const s=c.inventory[m.slot];s.count--;if(!s.count)c.inventory[m.slot]=null;pushInv(c);}
  gravity(r,m.x,m.y,m.z);return;
 }
 if(m.t==='craft'){
  if(r.mode!=='survival'||now-c.lastCraft<125||typeof m.out!=='string')return;
  const recipe=RECIPES.find(x=>x.out===m.out);if(!recipe||recipe.table&&!nearType(c,B.CRAFT))return;
  if(Object.entries(recipe.req).some(([id,n])=>invCount(c,id)<n))return;
  // Refuse a full inventory without consuming ingredients.
  const backup=structuredClone(c.inventory);for(const [id,n] of Object.entries(recipe.req))invRemove(c,id,n);
  if(!invAdd(c,recipe.out,recipe.n)){c.inventory=backup;return;}
  c.lastCraft=now;pushInv(c);return;
 }
 if(m.t==='smelt'){
  if(r.mode!=='survival'||now-c.lastCraft<250||typeof m.out!=='string'||!nearType(c,B.FURNACE))return;
  const rec=SMELT.find(x=>x.to===m.out);if(!rec||invCount(c,rec.from)<1||invCount(c,'m:coal')<1)return;
  const backup=structuredClone(c.inventory);invRemove(c,rec.from,1);invRemove(c,'m:coal',1);
  if(!invAdd(c,rec.to,1)){c.inventory=backup;return;}
  c.lastCraft=now;pushInv(c);return;
 }
 if(m.t==='swap'){
  if(r.mode!=='survival'||now-c.lastSwap<50||!validSlot(m.a)||!validSlot(m.b))return;
  [c.inventory[m.a],c.inventory[m.b]]=[c.inventory[m.b],c.inventory[m.a]];c.lastSwap=now;pushInv(c);return;
 }
 if(m.t==='eat'){
  if(r.mode!=='survival'||now-c.lastCraft<200||!validSlot(m.slot))return;
  const s=c.inventory[m.slot],food=s&&MATERIALS[s.id]?.food;if(!food||c.hunger>=20)return;
  c.hunger=Math.min(20,c.hunger+food);s.count--;if(!s.count)c.inventory[m.slot]=null;c.lastCraft=now;pushInv(c);return;
 }
 if(m.t==='state'){
  // The health and hunger loop still runs client-side. Inventory is NEVER accepted from a client state message.
  if(now-c.lastState<2200)return;c.lastState=now;
  if(typeof m.health==='number'&&m.health>=0&&m.health<=20)c.health=m.health;
  if(typeof m.hunger==='number'&&m.hunger>=0&&m.hunger<=20)c.hunger=m.hunger;
  r.profiles.set(c.name,profile(c));dirty(r);return;
 }
 if(m.t==='chat'){
  if(now-c.lastChat<600)return;const str=String(m.message||'').replace(/[\x00-\x1f]/g,'').trim().slice(0,200);if(!str)return;
  c.lastChat=now;broadcast(r,{t:'chat',name:c.name,message:str});return;
 }
}
function join(c,m){if(c.room)return;
 const name=safeName(m.name,'Spieler',18),world=safeName(m.room,'Meine Welt',28),mode=m.mode==='creative'?'creative':'survival';
 const r=roomFor(world,mode,String(m.seed||'').slice(0,80));
 if([...r.players].some(p=>p.name===name)){sendError(c,'Dieser Spielername ist in dieser Welt bereits vergeben.');return close(c,1008,'Name belegt');}
 const prof=r.profiles.get(name)||{};c.room=r;c.name=name;c.inventory=sanitizeInv(prof.inventory);
 c.health=Number.isFinite(prof.health)?Math.max(0,Math.min(20,prof.health)):20;
 c.hunger=Number.isFinite(prof.hunger)?Math.max(0,Math.min(20,prof.hunger)):20;
 c.x=0;c.y=50;c.z=0;c.movedOnce=false;r.players.add(c);
 const players=[...r.players].filter(p=>p!==c).map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,z:p.z}));
 send(c,{t:'welcome',id:c.id,mode:r.mode,seed:r.seed,edits:[...r.edits],drops:[...r.drops.values()],players,profile:{...prof,inventory:c.inventory,health:c.health,hunger:c.hunger},time:(.25+(Date.now()-r.dayStart)/1_200_000)%1});
 broadcast(r,{t:'join',p:{id:c.id,name,x:c.x,y:c.y,z:c.z}},c);
 console.log(`[Beitritt] ${name} => ${r.id}`);
}
function frame(op,payload=Buffer.alloc(0)){if(!Buffer.isBuffer(payload))payload=Buffer.from(payload);const n=payload.length;const h=n<126?Buffer.alloc(2):n<65536?Buffer.alloc(4):Buffer.alloc(10);h[0]=0x80|op;
 if(n<126)h[1]=n;else if(n<65536){h[1]=126;h.writeUInt16BE(n,2);}else{h[1]=127;h.writeBigUInt64BE(BigInt(n),2);}return Buffer.concat([h,payload]);}
function send(c,m){if(c.socket.destroyed||c.socket.writableLength>2e6)return;try{c.socket.write(frame(1,JSON.stringify(m)));}catch{c.socket.destroy();}}
function broadcast(r,m,skip=null){for(const c of r.players)if(c!==skip)send(c,m);}
function close(c,code=1000,message=''){if(c.socket.destroyed)return;try{const b=Buffer.alloc(2);b.writeUInt16BE(code);c.socket.end(frame(8,Buffer.concat([b,Buffer.from(message.slice(0,80))])));}catch{c.socket.destroy();}}
function receive(c,chunk){c.buffer=Buffer.concat([c.buffer,chunk]);if(c.buffer.length>MAX_MESSAGE*2)return close(c,1009,'Nachricht zu groß');
 while(c.buffer.length>=2){const b=c.buffer;const opcode=b[0]&15,fin=!!(b[0]&128),maskFlag=!!(b[1]&128);if(!fin||!maskFlag)return close(c,1002,'Ungültiger Frame');
 let len=b[1]&127,offset=2;if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);offset=4;}else if(len===127){if(b.length<10)return;const length=b.readBigUInt64BE(2);if(length>BigInt(MAX_MESSAGE))return close(c,1009,'Zu groß');len=Number(length);offset=10;}
 if(len>MAX_MESSAGE)return close(c,1009,'Zu groß');if(b.length<offset+4+len)return;
 const masks=b.subarray(offset,offset+4);offset+=4;const data=Buffer.from(b.subarray(offset,offset+len));c.buffer=b.subarray(offset+len);
 for(let i=0;i<data.length;i++)data[i]^=masks[i%4];
 if(opcode===8){c.socket.end(frame(8));return;}if(opcode===9){c.socket.write(frame(10,data));continue;}if(opcode===10){c.lastPong=Date.now();continue;}if(opcode!==1)return close(c,1003,'Nur Text');
 let m;try{m=JSON.parse(data.toString('utf8'));}catch{continue;}if(!m||typeof m!=='object'||typeof m.t!=='string')continue;
 try{if(m.t==='join')join(c,m);else if(c.room)perform(c,m);}catch(e){console.error('[Protokoll]',e);sendError(c,'Interner Serverfehler');}
 }}
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const httpServer=http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Methode nicht erlaubt');}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return res.writeHead(400).end();}
 if(pathname==='/saves'||pathname.startsWith('/saves/')||pathname.startsWith('/.')){res.writeHead(403);return res.end('Forbidden');}
 if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,players:[...connections].filter(c=>c.room).length,rooms:rooms.size}));}
 if(pathname==='/')pathname='/index.html';
 const abs=path.resolve(ROOT,'.'+pathname);if(!abs.startsWith(ROOT+path.sep)||abs.startsWith(SAVE_DIR+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 let st;try{st=fs.statSync(abs);if(!st.isFile())throw Error('not file');}catch{res.writeHead(404);return res.end('Nicht gefunden');}
 res.writeHead(200,{'Content-Type':TYPES[path.extname(abs)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Length':st.size});if(req.method==='HEAD')return res.end();fs.createReadStream(abs).pipe(res);
});
httpServer.on('upgrade',(req,socket,head)=>{
 if(new URL(req.url,'http://localhost').pathname!=='/ws')return socket.destroy();
 const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean),origin=req.headers.origin||'';
 if(allowed.length&&origin&&!allowed.includes(origin))return socket.destroy();
 const k=req.headers['sec-websocket-key'];if(req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||typeof k!=='string'||!/^[a-zA-Z0-9+/]{22}==$/.test(k))return socket.destroy();
 const a=crypto.createHash('sha1').update(k+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+a+'\r\n\r\n');socket.setNoDelay(true);
 const c={id:String(++ids),socket,buffer:Buffer.alloc(0),room:null,name:'',x:0,y:50,z:0,lastPos:0,lastEdit:0,lastCraft:0,lastState:0,lastChat:0,lastSwap:0,lastPickup:0,lastPong:Date.now(),inventory:[],mining:null,movedOnce:false};
 connections.add(c);socket.on('data',d=>receive(c,d));if(head.length)receive(c,head);
 socket.on('error',()=>socket.destroy());socket.on('close',()=>{connections.delete(c);if(c.room){c.room.players.delete(c);c.room.profiles.set(c.name,profile(c));dirty(c.room);broadcast(c.room,{t:'leave',id:c.id,name:c.name});}});
});
const heartbeat=setInterval(()=>{for(const c of connections){if(Date.now()-c.lastPong>110_000)c.socket.destroy();else if(!c.socket.destroyed)c.socket.write(frame(9,Buffer.from('ping')));}},30_000);heartbeat.unref();
function shutdown(){for(const r of rooms.values())save(r);httpServer.close();setTimeout(()=>process.exit(0),1000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
httpServer.listen(PORT,HOST,()=>console.log(`BLOCKBOUND Ultimate Server: http://localhost:${PORT} · Multiplayer: ws://localhost:${PORT}/ws`));
