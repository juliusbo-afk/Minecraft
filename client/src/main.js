
// Die Grafikbibliothek über zwei CDNs laden und verständliche Fehler ermöglichen.
let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js');
} catch (primaryError) {
  try {
    THREE = await import('https://unpkg.com/three@0.187.0/build/three.module.js');
  } catch (fallbackError) {
    throw new Error('Three.js konnte über beide CDNs nicht geladen werden. Prüfe Internet, Content-Blocker und Browser-Konsole.', {cause: fallbackError});
  }
}
import { CHUNK, MAX_Y, SEA, ATLAS_COLS, ATLAS_ROWS, B, BLOCKS, NATURAL_DROPS, TOOLS, MATERIALS, COMMON, RECIPES, SMELT, BIOMES } from '../../shared/registry.js';
import {createWorldGenerator} from '../../shared/worldgen.js';
import {makeMaterialAtlas, tileForBlock, createBlockIcon, TILE_SIZE} from './materials.js';
import {publicInviteUrl, parseInviteUrl, sameOriginSocketUrl} from './invite.js';

// BLOCKBOUND REFORGED · Eigenständiges, frei programmiertes Voxelspiel.
const $ = id => document.getElementById(id);
let selectedWorldKey=null, seed=0,mode='survival',isMulti=false,room='Meine Welt',playerName='Spieler',socket=null,clientId=null,serverUrl='',online=1;
const incomingInvite=parseInviteUrl(window.location.href);
let autoJoining=!!incomingInvite, lastWRelease=-Infinity, sprintFromDoubleW=false, autoReducedQuality=false, lowFpsSamples=0;
let terrain = createWorldGenerator(0);
let worldEdits=new Map(),chunkMap=new Map(),columnCache=terrain.columnCache,buildQueue=[],queued=new Set(),viewDistance=3,lastChunkX=null,lastChunkZ=null,dirtyQueue=[];
let inventory=Array(36).fill(null),selected=0,health=20,hunger=20,oxygen=10,hungerDebt=0,regenTimer=0,damageCooldown=0,fallDistance=0,spawn={x:.5,y:55,z:.5},lastAutosave=0,saveTimer=null,storageId='';
let atlasSource=null,waterShader=null,iconPreviewId=null,iconPreviewGeometry=new Map(),heldToolMat=null;
let renderer,scene,camera,worldGroup,atlas,opaqueMat,cutMat,glassMat,waterMat,lavaMat,plantMat,sun,ambient,sky,fog,selection,raycaster,clock,started=false,paused=false,inventoryOpen=false,chatOpen=false,dead=false,flying=false,showF3=false,invTab='items';
let player={pos:new THREE.Vector3(.5,60,.5),v:new THREE.Vector3(),grounded:false,stepSound:0},yaw=0,pitch=0,keys={},holdMine=false,holdUse=false,mineKey='',mineProgress=0,looking=null,lastUse=0,lastPosSend=0,lastMap=0,lastHud=0,frames=0,lastFPS=performance.now(),fps=0,worldTime=.25,lastJumpTap=0,sensitivity=.0022,muted=false;
let remote=new Map(),chunksBuilt=0,logMessages=[],deathCause='',handGroup=null,handCube=null,starMesh=null,torchLights=[],lastTorchUpdate=0;
const particles=[],debrisGeo=new THREE.BoxGeometry(.12,.12,.12),debrisMats=new Map();
const droppedItems=new Map(),dropGeometries=new Map(),dropMaterials=new Map();
let nextSoloDrop=0,dropBlockMaterial=null,crackMesh=null,crackTextures=[],crackStage=-1;
let clouds=[],cloudGroup=null;
const UP=new THREE.Vector3(0,1,0), tempV=new THREE.Vector3();
function h2(...args){ return terrain.h2(...args); }
function h3(...args){ return terrain.h3(...args); }
function column(...args){ return terrain.column(...args); }
function generateChunk(...args){ return terrain.generateChunk(...args); }
function chunkKey(cx,cz){return cx+','+cz}function blockKey(x,y,z){return x+','+y+','+z}
function chunkAt(cx,cz){const key=chunkKey(cx,cz);let c=chunkMap.get(key);if(!c){c={cx,cz,voxels:generateChunk(cx,cz),group:null,meshes:[],dirty:true};chunkMap.set(key,c);}return c;}
function getBlock(x,y,z){if(y<0)return B.BEDROCK;if(y>=MAX_Y)return B.AIR;const xx=Math.floor(x),yy=Math.floor(y),zz=Math.floor(z),k=blockKey(xx,yy,zz);if(worldEdits.has(k))return worldEdits.get(k);const c=chunkAt(Math.floor(xx/CHUNK),Math.floor(zz/CHUNK));return c.voxels[((xx-c.cx*CHUNK)*CHUNK+(zz-c.cz*CHUNK))*MAX_Y+yy];}
function scheduleRebuild(x,z){const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK);for(const [a,b] of [[cx,cz],[cx-1,cz],[cx+1,cz],[cx,cz-1],[cx,cz+1]]){const c=chunkMap.get(chunkKey(a,b));if(c?.group){c.dirty=true;queueChunk(a,b,true);}}}
function setBlock(x,y,z,id,fromServer=false){if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||y<=0||y>=MAX_Y||id<0||id>=BLOCKS.length)return false;
 if(getBlock(x,y,z)===id)return false;worldEdits.set(blockKey(x,y,z),id);scheduleRebuild(x,z);
 if(!fromServer&&isMulti&&socket?.readyState===WebSocket.OPEN)send({t:'place',x,y,z,id,slot:selected});
 if(!fromServer&&!isMulti)settleGravity(x,y,z);if(!isMulti)scheduleSave();return true;
}
// Nur Sand und Kies sind fallende Blöcke. Weltänderungen werden bei Multiplayer als atomarer Fall übertragen.
function settleGravity(x,y,z){for(let yy=Math.max(1,y);yy<Math.min(MAX_Y,y+20);yy++){
 const b=getBlock(x,yy,z);if(b!==B.SAND&&b!==B.GRAVEL)continue;let dest=yy;while(dest>1){const below=getBlock(x,dest-1,z);if(below!==B.AIR&&below!==B.WATER&&below!==B.LAVA&&below!==B.GRASS_PLANT&&below!==B.FLOWER)break;dest--;}
 if(dest===yy)continue;worldEdits.set(blockKey(x,yy,z),B.AIR);worldEdits.set(blockKey(x,dest,z),b);scheduleRebuild(x,z);
 if(isMulti&&socket?.readyState===WebSocket.OPEN)send({t:'fall',x,z,from:yy,to:dest,id:b});
 }}
function hashSeed(s){s=String(s||'').trim();if(/^-?\d+$/.test(s))return (Number(s)|0)||1;let h=2166136261;for(const c of s){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h|0)||1;}
function newRandomSeed(){const a=new Uint32Array(1);if(crypto?.getRandomValues)crypto.getRandomValues(a);else a[0]=Date.now();return a[0]|0;}
function resetChunkWorld(){for(const c of chunkMap.values())disposeChunk(c);chunkMap.clear();columnCache.clear();buildQueue=[];queued.clear();chunksBuilt=0;lastChunkX=null;lastChunkZ=null;}
function localStore(){try{return JSON.parse(localStorage.getItem(storageId)||'null')}catch{return null}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveSolo,750)}
function saveSolo(){if(isMulti||!started)return;clearTimeout(saveTimer);try{localStorage.setItem(storageId,JSON.stringify({v:3,worldName:room,updatedAt:Date.now(),seed,mode,edits:[...worldEdits],drops:[...droppedItems.values()].map(d=>({id:d.id,itemId:d.itemId,count:d.count,x:d.x,y:d.y,z:d.z,spawnY:d.spawnY,createdAt:d.createdAt})),inventory,health,hunger,player:[+player.pos.x.toFixed(2),+player.pos.y.toFixed(2),+player.pos.z.toFixed(2)]}));}catch(e){console.warn('Speichern:',e);toast('Der Browser-Speicher ist möglicherweise voll.');}}
window.addEventListener('beforeunload',()=>{if(started&&!isMulti)saveSolo()});
function itemInfo(id){if(!id)return null;if(id.startsWith('b:')){const b=BLOCKS[+id.slice(2)];return b&&{name:b.name,color:b.color,icon:'',block:+id.slice(2)}};return TOOLS[id]||MATERIALS[id]||null;}
function currentItem(){return inventory[selected]}
function totalItem(id){let count=0;for(const stack of inventory)if(stack?.id===id)count+=stack.count;return count;}
function canReceiveItem(id,count=1){const max=TOOLS[id]?1:64;return inventory.reduce((sum,s)=>sum+(s===null?max:s.id===id?max-s.count:0),0)>=count;}
function addItem(id,count=1){if(!id||count<=0)return true;if(!canReceiveItem(id,count))return false;let todo=count;const max=id.startsWith('t:')?1:64;for(let i=0;i<36;i++){let s=inventory[i];if(s?.id===id&&s.count<max){let n=Math.min(todo,max-s.count);s.count+=n;todo-=n;if(!todo)break;}}for(let i=0;i<36&&todo;i++){if(!inventory[i]){let n=Math.min(todo,max);inventory[i]={id,count:n,wear:0};todo-=n;}}drawHotbar();if(inventoryOpen)drawInventory();if(!isMulti)scheduleSave();return todo===0;}
function removeItem(id,count=1){if(totalItem(id)<count)return false;let todo=count;for(let i=35;i>=0&&todo;i--){let s=inventory[i];if(s?.id===id){let n=Math.min(todo,s.count);s.count-=n;todo-=n;if(s.count===0)inventory[i]=null;}}drawHotbar();if(inventoryOpen)drawInventory();if(!isMulti)scheduleSave();return true;}
function wearTool(stack){if(!stack||!TOOLS[stack.id])return;stack.wear=(stack.wear||0)+1;if(stack.wear>=TOOLS[stack.id].durability){stack.count--;stack.wear=0;if(stack.count<=0)inventory[selected]=null;toast('Dein Werkzeug ist zerbrochen.');}drawHotbar();}
function hasIngredients(req){return Object.entries(req).every(([id,n])=>totalItem(id)>=n)}
function nearBlock(type){const px=Math.floor(player.pos.x),py=Math.floor(player.pos.y),pz=Math.floor(player.pos.z);for(let x=px-3;x<=px+3;x++)for(let y=Math.max(1,py-2);y<=py+2;y++)for(let z=pz-3;z<=pz+3;z++)if(getBlock(x,y,z)===type&&Math.hypot(x+.5-player.pos.x,y+.5-player.pos.y,z+.5-player.pos.z)<4)return true;return false;}
function craft(recipe){if(isMulti){send({t:'craft',out:recipe.out});return;}if(mode==='creative')return toast('Im Kreativmodus sind alle Materialien verfügbar.');if(recipe.table&&!nearBlock(B.CRAFT))return toast('Du brauchst eine Werkbank in deiner Nähe.');if(!hasIngredients(recipe.req))return toast('Dir fehlen Materialien.');for(const [id,n] of Object.entries(recipe.req))removeItem(id,n);if(!addItem(recipe.out,recipe.n))toast('Inventar ist voll.');sound('craft');drawInventory();}
function smelt(recipe){if(isMulti){send({t:'smelt',out:recipe.to});return;}if(mode==='creative')return;if(!nearBlock(B.FURNACE))return toast('Du benötigst einen aufgestellten Ofen.');if(totalItem(recipe.from)<1||totalItem('m:coal')<1)return toast('Du brauchst Erz/Sand und 1 Kohle.');removeItem(recipe.from);removeItem('m:coal');addItem(recipe.to);sound('craft');drawInventory();}

function textureAtlas(){
 atlasSource=makeMaterialAtlas();
 const t=new THREE.CanvasTexture(atlasSource);
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestMipmapNearestFilter;
 t.generateMipmaps=true;
 t.colorSpace=THREE.SRGBColorSpace;
 t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 return t;
}
const FACES=[
 {d:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],light:.82},
 {d:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],light:.73},
 {d:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],light:.83},
 {d:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],light:.65},
 {d:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],light:1},
 {d:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],light:.53}
];
const tileFor=tileForBlock;
function buffer(){return {pos:[],uv:[],nor:[],col:[],indices:[]};}
function quad(buf,points,tile,normal,bright,cornerAO=null){let start=buf.pos.length/3,u=tile%ATLAS_COLS,v=Math.floor(tile/ATLAS_COLS),eps=.001;const uv=[[u/ATLAS_COLS+eps,(ATLAS_ROWS-v-1)/ATLAS_ROWS+eps],[(u+1)/ATLAS_COLS-eps,(ATLAS_ROWS-v-1)/ATLAS_ROWS+eps],[(u+1)/ATLAS_COLS-eps,(ATLAS_ROWS-v)/ATLAS_ROWS-eps],[u/ATLAS_COLS+eps,(ATLAS_ROWS-v)/ATLAS_ROWS-eps]];
 for(let i=0;i<4;i++){buf.pos.push(...points[i]);buf.nor.push(...normal);buf.uv.push(...uv[i]);buf.col.push(bright*(cornerAO?.[i]??1),bright*(cornerAO?.[i]??1),bright*(cornerAO?.[i]??1));}buf.indices.push(start,start+1,start+2,start,start+2,start+3);
}
function meshGeometry(b){if(!b.pos.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(b.col,3));g.setIndex(b.indices);g.computeBoundingSphere();return g;}
function isVisibleFace(id,neighbor){if(id===B.WATER||id===B.LAVA)return neighbor!==id&&(neighbor===B.AIR||BLOCKS[neighbor].plant||neighbor===B.WATER||neighbor===B.LAVA);
 if(id===B.GLASS)return neighbor!==B.GLASS&&(neighbor===B.AIR||BLOCKS[neighbor].plant||BLOCKS[neighbor].liquid);
 if(BLOCKS[id].leaves)return neighbor!==id&&(neighbor===B.AIR||BLOCKS[neighbor].plant||BLOCKS[neighbor].liquid||neighbor===B.GLASS);
 return neighbor===B.AIR||BLOCKS[neighbor].plant||BLOCKS[neighbor].liquid||neighbor===B.GLASS||BLOCKS[neighbor].leaves;
}
// Per-vertex ambient occlusion: block corners beside neighboring solid faces darken naturally.
function cornerShading(x,y,z,face){
 const n=face.d,axes=[0,1,2].filter(i=>n[i]===0),out=[];
 for(const v of face.v){
  const a=axes[0],b=axes[1],sa=v[a]===0?-1:1,sb=v[b]===0?-1:1;
  const base=[x+n[0],y+n[1],z+n[2]];
  const occ=(da,db)=>{const p=base.slice();p[a]+=da;p[b]+=db;
    const id=getBlock(p[0],p[1],p[2]);return !!id&&BLOCKS[id].solid&&!BLOCKS[id].leaves&&id!==B.GLASS;
  };
  const left=occ(sa,0),right=occ(0,sb),diag=occ(sa,sb);
  out.push(left&&right?.59:1-(Number(left)+Number(right)+Number(diag))*.115);
 }
 return out;
}
function buildChunk(c){if(c.group)disposeChunk(c);const opaque=buffer(),cut=buffer(),glass=buffer(),water=buffer(),lava=buffer(),flora=buffer(),ox=c.cx*CHUNK,oz=c.cz*CHUNK;
 const useDetailedAO=Math.abs(c.cx-Math.floor(player.pos.x/CHUNK))<=1&&Math.abs(c.cz-Math.floor(player.pos.z/CHUNK))<=1;
 for(let lx=0;lx<CHUNK;lx++)for(let lz=0;lz<CHUNK;lz++)for(let y=0;y<MAX_Y;y++){
  const x=ox+lx,z=oz+lz,id=getBlock(x,y,z);if(!id)continue;const info=BLOCKS[id];
  if(info.plant){const t=tileFor(id,0),h=id===B.TORCH?.75:.85;for(let a=0;a<2;a++){
   const pts=a===0?[[x+.12,y,z+.12],[x+.88,y,z+.88],[x+.88,y+h,z+.88],[x+.12,y+h,z+.12]]:[[x+.88,y,z+.12],[x+.12,y,z+.88],[x+.12,y+h,z+.88],[x+.88,y+h,z+.12]];
   quad(flora,pts,t,[0,0,1],1);
  }continue;}
  const buf=id===B.WATER?water:id===B.LAVA?lava:id===B.GLASS?glass:info.leaves?cut:opaque;
  for(let f=0;f<6;f++){
   const face=FACES[f],nn=getBlock(x+face.d[0],y+face.d[1],z+face.d[2]);if(!isVisibleFace(id,nn))continue;
   const height=(id===B.WATER||id===B.LAVA)?(getBlock(x,y+1,z)===id?1:.90):1;
   const points=face.v.map(p=>[x+p[0],y+p[1]*height,z+p[2]]);
   quad(buf,points,tileFor(id,f),face.d,face.light,useDetailedAO?cornerShading(x,y,z,face):null);
  }
 }
 const group=new THREE.Group();group.name=`Chunk ${c.cx},${c.cz}`;
 for(const [buf,mat] of [[opaque,opaqueMat],[cut,cutMat],[glass,glassMat],[water,waterMat],[lava,lavaMat],[flora,plantMat]]){
  const geo=meshGeometry(buf);if(geo){const m=new THREE.Mesh(geo,mat);m.receiveShadow=(mat===opaqueMat||mat===cutMat);m.castShadow=(mat===opaqueMat||mat===cutMat)&&Math.abs(c.cx-Math.floor(player.pos.x/CHUNK))<=2&&Math.abs(c.cz-Math.floor(player.pos.z/CHUNK))<=2;group.add(m);c.meshes.push(m);}
 }
 worldGroup.add(group);c.group=group;c.dirty=false;chunksBuilt++;
}
function disposeChunk(c){if(!c.group)return;worldGroup?.remove(c.group);for(const m of c.meshes){m.geometry.dispose();}c.meshes=[];c.group=null;}
function queueChunk(cx,cz,priority=false){const key=chunkKey(cx,cz);if(queued.has(key))return;queued.add(key);if(priority)buildQueue.unshift([cx,cz]);else buildQueue.push([cx,cz]);}
function updateChunkVisibility(){const cx=Math.floor(player.pos.x/CHUNK),cz=Math.floor(player.pos.z/CHUNK);if(cx===lastChunkX&&cz===lastChunkZ)return;lastChunkX=cx;lastChunkZ=cz;
 const jobs=[];for(let dx=-viewDistance;dx<=viewDistance;dx++)for(let dz=-viewDistance;dz<=viewDistance;dz++){
  if(dx*dx+dz*dz>(viewDistance+.5)*(viewDistance+.5))continue;
  const a=cx+dx,b=cz+dz,existing=chunkMap.get(chunkKey(a,b));if(!existing?.group||existing.dirty)jobs.push({a,b,d:dx*dx+dz*dz});
 }
 jobs.sort((a,b)=>a.d-b.d);for(const job of jobs)queueChunk(job.a,job.b);
 for(const [key,c] of chunkMap){if(Math.abs(c.cx-cx)>viewDistance+2||Math.abs(c.cz-cz)>viewDistance+2){disposeChunk(c);chunkMap.delete(key);}}
}
function processChunkQueue(){let count=0;while(count<1&&buildQueue.length){const [cx,cz]=buildQueue.shift(),key=chunkKey(cx,cz);queued.delete(key);
  if(Math.abs(cx-Math.floor(player.pos.x/CHUNK))>viewDistance+1||Math.abs(cz-Math.floor(player.pos.z/CHUNK))>viewDistance+1)continue;
  const c=chunkAt(cx,cz);if(!c.group||c.dirty){buildChunk(c);count++;}
 }}
function setupScene(){scene=new THREE.Scene();sky=new THREE.Color(0x89bde1);scene.background=sky;fog=new THREE.Fog(sky,40,135);scene.fog=fog;
 camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.055,250);renderer=new THREE.WebGLRenderer({canvas:$('viewport'),antialias:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 sun=new THREE.DirectionalLight(0xfff0ce,1.65);scene.add(sun);sun.castShadow=true;
 sun.shadow.mapSize.set(768,768);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;
 sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;sun.shadow.camera.near=.5;sun.shadow.camera.far=225;
 sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;scene.add(sun.target);
 ambient=new THREE.HemisphereLight(0xc2e7ff,0x445b43,.79);scene.add(ambient);
 worldGroup=new THREE.Group();scene.add(worldGroup);atlas=textureAtlas();opaqueMat=new THREE.MeshStandardMaterial({map:atlas,vertexColors:true,roughness:.94,metalness:0});
 cutMat=new THREE.MeshStandardMaterial({map:atlas,vertexColors:true,alphaTest:.34,side:THREE.DoubleSide,roughness:.9});
 glassMat=new THREE.MeshStandardMaterial({map:atlas,vertexColors:true,transparent:true,opacity:.44,depthWrite:false,side:THREE.DoubleSide,roughness:.14,metalness:.02});
 waterMat=new THREE.MeshStandardMaterial({map:atlas,vertexColors:true,transparent:true,opacity:.66,depthWrite:false,side:THREE.DoubleSide,roughness:.13,metalness:.13,color:0xccecff});
 // Small connected surface waves and sunlight shimmer. World-coordinate calculations
 // make adjacent chunk surfaces meet without seams. No original game shader is used.
 waterMat.onBeforeCompile=(shader)=>{
  shader.uniforms.uFlowTime={value:0};waterShader=shader;
  shader.vertexShader=shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uFlowTime;\nvarying vec3 vWaterWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaterWorld = position;\nif(normal.y > .5) { transformed.y += .022*sin(position.x*.92 + uFlowTime*1.4)*cos(position.z*1.13 + uFlowTime*.8); }');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFlowTime;\nvarying vec3 vWaterWorld;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat waveShine=.5+.5*sin(vWaterWorld.x*.9+vWaterWorld.z*1.5+uFlowTime*1.7);\nfloat ripples=.5+.5*sin(vWaterWorld.x*2.3-vWaterWorld.z*1.6+uFlowTime*2.4);\ndiffuseColor.rgb *= .91 + .15*waveShine + .08*ripples;');
 };
 lavaMat=new THREE.MeshBasicMaterial({map:atlas,vertexColors:true,transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide});
 plantMat=new THREE.MeshStandardMaterial({map:atlas,vertexColors:true,transparent:true,alphaTest:.36,side:THREE.DoubleSide,roughness:.85});
 scene.add(camera);handGroup=new THREE.Group();camera.add(handGroup);handGroup.position.set(.62,-.60,-.84);
 const skinMat=new THREE.MeshLambertMaterial({color:0xb98a66}),arm=new THREE.Mesh(new THREE.BoxGeometry(.27,.64,.27),skinMat);arm.position.set(.12,-.16,.19);arm.rotation.z=-.22;handGroup.add(arm);
 handCube=new THREE.Mesh(new THREE.BoxGeometry(.29,.29,.29),new THREE.MeshLambertMaterial({color:0x6c9b52}));handCube.position.set(-.08,.14,-.13);handCube.rotation.set(.12,.38,.18);handGroup.add(handCube);
 const stars=[];for(let i=0;i<310;i++){const a=h2(i,41,729)*Math.PI*2,up=h2(i,42,731)*Math.PI*.5,r=98;stars.push(Math.cos(a)*Math.cos(up)*r,22+Math.sin(up)*r,Math.sin(a)*Math.cos(up)*r);}
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));starMesh=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xe9f4ff,size:.55,transparent:true,opacity:0,depthWrite:false}));scene.add(starMesh);
 selection=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005,1.005,1.005)),new THREE.LineBasicMaterial({color:0xfaffdc,transparent:true,opacity:.85,depthTest:false}));selection.visible=false;scene.add(selection);
 // Ten crack stages: a transparent six-face damage texture that grows during mining.
 crackTextures=Array.from({length:10},(_,i)=>createCrackTexture(i));
 crackMesh=new THREE.Mesh(new THREE.BoxGeometry(1.012,1.012,1.012),new THREE.MeshBasicMaterial({map:crackTextures[0],transparent:true,alphaTest:.04,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}));
 crackMesh.renderOrder=8;crackMesh.visible=false;scene.add(crackMesh);
 dropBlockMaterial=new THREE.MeshStandardMaterial({map:atlas,roughness:.89,metalness:0});
 setupClouds();
 raycaster=new THREE.Raycaster();clock=new THREE.Clock();window.addEventListener('resize',()=>{if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}
function updateSky(dt){if(waterShader)waterShader.uniforms.uFlowTime.value+=dt;worldTime=(worldTime+dt/(20*60))%1;let a=worldTime*Math.PI*2,day=Math.max(0,Math.sin(a)),twilight=Math.max(0,1-Math.abs(Math.sin(a))*4);
 sun.target.position.set(player.pos.x,player.pos.y+1,player.pos.z);
 sun.position.set(player.pos.x+Math.cos(a)*75,player.pos.y+Math.sin(a)*90+8,player.pos.z+28);sun.target.updateMatrixWorld();
 if(cloudGroup){cloudGroup.position.set(player.pos.x+Math.sin(worldTime*6.28)*8,0,player.pos.z+Math.cos(worldTime*6.28)*6);cloudGroup.visible=day>.08;for(const cloud of clouds)cloud.material.opacity=.12+day*.28;}if(starMesh){starMesh.position.set(player.pos.x,0,player.pos.z);starMesh.material.opacity=Math.max(0,1-day*2.5);}
 const terrainTop=column(Math.floor(player.pos.x),Math.floor(player.pos.z)).h;const underground=player.pos.y<terrainTop-4? .22:1;
 sun.intensity=(.08+day*1.48)*underground;ambient.intensity=(.17+day*.88)*underground;
 const night=new THREE.Color(0x08152c),dawn=new THREE.Color(0xc88781),daytime=new THREE.Color(0x8fc2e3);sky.copy(night).lerp(daytime,Math.min(1,day*1.5));sky.lerp(dawn,twilight*.43);fog.color.copy(sky);
 fog.near=22+viewDistance*5;fog.far=34+viewDistance*29;
}
function updateTorchLights(now){if(now-lastTorchUpdate<1100)return;lastTorchUpdate=now;const near=[];for(const [key,id] of worldEdits){if(id!==B.TORCH&&id!==B.LAVA)continue;const [x,y,z]=key.split(',').map(Number),distance=Math.hypot(x+.5-player.pos.x,y+.5-player.pos.y,z+.5-player.pos.z);if(distance<18)near.push({x,y,z,id,distance});}
 near.sort((a,b)=>a.distance-b.distance);for(let i=0;i<Math.min(6,near.length);i++){let l=torchLights[i];if(!l){l=new THREE.PointLight(0xffb96b,0,11);scene.add(l);torchLights[i]=l;}const b=near[i];l.position.set(b.x+.5,b.y+.73,b.z+.5);l.color.set(b.id===B.LAVA?0xff793d:0xffc07d);l.intensity=b.id===B.LAVA?1.2:1.7;l.distance=12;}for(let i=near.length;i<torchLights.length;i++)torchLights[i].intensity=0;
}
function createCrackTexture(stage){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const cx=canvas.getContext('2d');
 cx.lineJoin='miter';cx.lineCap='square';
 const branches=4+stage*2,reach=.17+stage*.093;
 for(let b=0;b<branches;b++){
  const angle=b*2.399+Math.sin(b*8.2)*.28;
  const length=reach*(.75+Math.abs(Math.sin(b*11.71))*.29);
  const points=[[64,64]];for(let k=1;k<=6;k++){
   const r=length*58*k/6,wiggle=Math.sin(k*5.3+b*4.4)*2.9;
   points.push([64+Math.cos(angle)*r+Math.sin(angle)*wiggle,64+Math.sin(angle)*r-Math.cos(angle)*wiggle]);
  }
  // Opaque dark irregular gaps with pale mineral edges for legibility.
  for(const [color,width,shift] of [['rgba(220,226,215,.43)',5.5,1],['rgba(8,13,13,.94)',3.7,0]]){
   cx.strokeStyle=color;cx.lineWidth=width;cx.beginPath();cx.moveTo(points[0][0]+shift,points[0][1]+shift);
   for(let k=1;k<points.length;k++)cx.lineTo(points[k][0]+shift,points[k][1]+shift);
   cx.stroke();
  }
  if(stage>=4){const k=2+(b%3),p=points[k],dir=angle+Math.PI*.48;
   cx.lineWidth=2.2;cx.strokeStyle='rgba(9,14,15,.9)';cx.beginPath();cx.moveTo(...p);
   cx.lineTo(p[0]+Math.cos(dir)*(8+stage*1.5),p[1]+Math.sin(dir)*(8+stage*1.5));cx.stroke();}
 }
 const t=new THREE.CanvasTexture(canvas);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearFilter;return t;
}
function showCracks(target,progress){
 if(!crackMesh||!target||mode!=='survival'||progress<=0||!Number.isFinite(progress)){if(crackMesh)crackMesh.visible=false;return;}
 const stage=Math.min(9,Math.floor(progress*10));
 if(crackStage!==stage){crackStage=stage;crackMesh.material.map=crackTextures[stage];crackMesh.material.needsUpdate=true;}
 crackMesh.position.set(target.x+.5,target.y+.5,target.z+.5);crackMesh.visible=true;
}
function setupClouds(){
 cloudGroup=new THREE.Group();scene.add(cloudGroup);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d');
 for(let i=0;i<27;i++){
  const x=(i*31+10)%116,y=(i*17+4)%46;
  ctx.fillStyle=i%4===0?'#e1ecf3':'#ffffff';ctx.fillRect(x,y,10+(i%4)*3,6+(i%3)*3);
 }
 const cloudTexture=new THREE.CanvasTexture(canvas);cloudTexture.magFilter=THREE.NearestFilter;
 for(let i=0;i<18;i++){
  const mat=new THREE.MeshBasicMaterial({map:cloudTexture,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  const cloud=new THREE.Mesh(new THREE.PlaneGeometry(22+(i%5)*8,10+(i%3)*4),mat);
  cloud.rotation.x=-Math.PI/2;cloud.position.set((i*71%420)-210,104+(i%3)*4,(i*137%420)-210);cloudGroup.add(cloud);clouds.push(cloud);
 }
}
function pickTarget(){if(!camera)return null;const dir=camera.getWorldDirection(new THREE.Vector3()),pos=camera.position;
 let x=Math.floor(pos.x),y=Math.floor(pos.y),z=Math.floor(pos.z);
 const sx=Math.sign(dir.x)||1,sy=Math.sign(dir.y)||1,sz=Math.sign(dir.z)||1;
 const dx=Math.abs(1/(dir.x||1e-15)),dy=Math.abs(1/(dir.y||1e-15)),dz=Math.abs(1/(dir.z||1e-15));
 let tx=dir.x===0?Infinity:(dir.x>0?x+1-pos.x:pos.x-x)*dx,ty=dir.y===0?Infinity:(dir.y>0?y+1-pos.y:pos.y-y)*dy,tz=dir.z===0?Infinity:(dir.z>0?z+1-pos.z:pos.z-z)*dz;
 let normal=[0,0,0],dist=0,reach=mode==='creative'?7:5;
 for(let i=0;i<65&&dist<=reach;i++){
  if(y>=0&&y<MAX_Y){const id=getBlock(x,y,z);if(id&&id!==B.WATER&&id!==B.LAVA&&id!==B.GRASS_PLANT){return {x,y,z,id,n:normal,dist};}}
  if(tx<ty&&tx<tz){dist=tx;tx+=dx;x+=sx;normal=[-sx,0,0];}
  else if(ty<tz){dist=ty;ty+=dy;y+=sy;normal=[0,-sy,0];}
  else{dist=tz;tz+=dz;z+=sz;normal=[0,0,-sz];}
 }
 return null;
}
function updateSelection(){if(paused||inventoryOpen||chatOpen||dead){selection.visible=false;looking=null;return;}
 looking=pickTarget();selection.visible=!!looking;
 if(looking){selection.position.set(looking.x+.5,looking.y+.5,looking.z+.5);$('target').textContent=BLOCKS[looking.id].name;}
 else $('target').textContent='';
}
function drawMiniMap(){const c=$('minimap'),g=c.getContext('2d'),px=Math.floor(player.pos.x),pz=Math.floor(player.pos.z),scale=2;
 g.clearRect(0,0,112,112);for(let i=0;i<56;i++)for(let j=0;j<56;j++){
  const x=px+i-28,z=pz+j-28,col=column(x,z);let color=col.h<SEA?'#2b6395':col.h<SEA+2?'#d8c488':col.biome===2?'#cdbf79':col.biome===3?'#507867':col.biome===4?'#adbcc2':col.biome===1?'#436f40':'#619449';
  if(col.h>76)color='#e4e8e4';else if(treeInfo(x,z))color='#28573b';g.fillStyle=color;g.fillRect(i*scale,j*scale,scale,scale);
 }
 g.save();g.translate(56,56);g.rotate(-yaw);g.fillStyle='#fff';g.strokeStyle='#152b2d';g.lineWidth=2;g.beginPath();g.moveTo(0,-7);g.lineTo(5,5);g.lineTo(0,2);g.lineTo(-5,5);g.closePath();g.fill();g.stroke();g.restore();
 for(const p of remote.values()){const dx=p.group.position.x-px,dz=p.group.position.z-pz;if(Math.abs(dx)<27&&Math.abs(dz)<27){g.fillStyle='#f06f66';g.fillRect(56+dx*2-2,56+dz*2-2,4,4);}}
}

function toast(t){let el=$('toast');el.textContent=String(t);el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2500);}
function message(name,msg,system=false){const box=$('messages'),row=document.createElement('div'),head=document.createElement('strong');row.className='msg';head.textContent=system?'◆ ':name+': ';row.append(head,document.createTextNode(String(msg).slice(0,200)));box.appendChild(row);while(box.children.length>7)box.firstElementChild.remove();setTimeout(()=>row.classList.add('fade'),9000);setTimeout(()=>row.remove(),22000);}
function sound(type){if(muted)return;try{sound.ctx??=new (window.AudioContext||window.webkitAudioContext)();const c=sound.ctx;if(c.state==='suspended')c.resume();const osc=c.createOscillator(),gain=c.createGain();osc.type=type==='break'?'square':type==='craft'?'sine':'triangle';let hz=type==='break'?190:type==='hurt'?125:type==='craft'?470:type==='pickup'?680:290;osc.frequency.setValueAtTime(hz,c.currentTime);osc.frequency.exponentialRampToValueAtTime(hz*.58,c.currentTime+.085);gain.gain.setValueAtTime(.027,c.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.11);osc.connect(gain).connect(c.destination);osc.start();osc.stop(c.currentTime+.11);}catch{}}
function showStats(){let hearts=$('hearts'),food=$('hunger');if(mode==='creative'){$('survivalStats').classList.add('hidden');return;}$('survivalStats').classList.remove('hidden');hearts.textContent='';food.textContent='';
 for(let i=0;i<10;i++){let h=document.createElement('span');h.className='heart'+(health<=i*2?' empty':'');h.textContent=health>i*2?'♥':'♡';hearts.appendChild(h);let f=document.createElement('span');f.className='food'+(hunger<=i*2?' empty':'');f.textContent=hunger>i*2?'◆':'◇';food.appendChild(f);}}
function makeIcon(id,size=26){
 const meta=itemInfo(id);if(!meta)return document.createTextNode('');
 if(meta.block!==undefined){
  const img=document.createElement('img');img.className='block-icon';img.alt='';
  img.width=size;img.height=size;
  img.src=atlasSource?createBlockIcon(atlasSource,meta.block):'';
  img.style.width=size+'px';img.style.height=size+'px';
  return img;
 }
 const span=document.createElement('span');span.className='item-emoji';
 span.textContent=meta.icon||'▣';span.style.fontSize=Math.round(size*.87)+'px';return span;
}
function updateHeldBlockPreview(item){
 if(!handCube||!atlas)return;
 const key=item?.id||'';if(iconPreviewId===key)return;
 iconPreviewId=key;const meta=item?itemInfo(item.id):null;
 handCube.visible=!!item;
 if(!item)return;
 if(meta?.block!==undefined){
  let geometry=iconPreviewGeometry.get(meta.block);
  if(!geometry){const buf=buffer();for(let f=0;f<FACES.length;f++){
   const face=FACES[f];quad(buf,face.v,tileFor(meta.block,f),face.d,face.light);
  }geometry=meshGeometry(buf);geometry.translate(-.5,-.5,-.5);iconPreviewGeometry.set(meta.block,geometry);}
  handCube.geometry=geometry;handCube.material=opaqueMat;handCube.scale.setScalar(.30);
 }else{
  handCube.geometry=iconPreviewGeometry.get('plain')||new THREE.BoxGeometry(.29,.29,.29);
  iconPreviewGeometry.set('plain',handCube.geometry);
  heldToolMat??=new THREE.MeshLambertMaterial({color:0xb9b6ac});handCube.material=heldToolMat;handCube.scale.setScalar(1);
 }
}
function drawHotbar(){const held=currentItem();if(handCube)updateHeldBlockPreview(held);const bar=$('hotbar');bar.textContent='';for(let i=0;i<9;i++){const s=inventory[i],cell=document.createElement('div');cell.className='slot'+(selected===i?' current':'');cell.title=s?itemInfo(s.id)?.name||s.id:'Leer';const key=document.createElement('span');key.className='keynum';key.textContent=i+1;cell.append(key);
 if(s){cell.append(makeIcon(s.id));const count=document.createElement('span');count.className='count';count.textContent=mode==='creative'?'∞':s.count>1?s.count:TOOLS[s.id]?Math.max(0,Math.round(100*(1-s.wear/TOOLS[s.id].durability)))+'%':'';cell.append(count);}cell.addEventListener('click',()=>{selected=i;drawHotbar();if(!paused&&!inventoryOpen)lockPointer();});bar.append(cell);}}
function setTab(tab){invTab=tab;for(const name of ['Items','Craft','Furnace'])$('tab'+name).classList.toggle('active',name.toLowerCase()===tab);$('itemGrid').classList.toggle('hidden',tab!=='items');$('recipeGrid').classList.toggle('hidden',tab!=='craft');$('furnaceGrid').classList.toggle('hidden',tab!=='furnace');drawInventory();}
function drawInventory(){if(!inventoryOpen)return;const grid=$('itemGrid');grid.textContent='';$('inventoryTitle').textContent=mode==='creative'?'Kreativ-Inventar':'Inventar';
 $('inventoryHelp').textContent=mode==='creative'?'Alle Baublöcke und Gegenstände stehen unbegrenzt zur Verfügung. Ein Klick setzt das Item auf deinen gewählten Hotbarplatz.':'Wähle einen Gegenstand und tausche ihn mit dem markierten Hotbarplatz. Mit Materialien an einer Werkbank kannst du Werkzeuge herstellen.';
 if(mode==='creative'){
  for(const id of [...COMMON,...Object.keys(TOOLS),...Object.keys(MATERIALS)]){const meta=itemInfo(id);const btn=document.createElement('button');btn.className='invslot';btn.title=meta.name;btn.append(makeIcon(id,28));const label=document.createElement('span');label.className='name';label.textContent=meta.name;btn.append(label);btn.addEventListener('click',()=>{inventory[selected]={id,count:64,wear:0};drawHotbar();closeInventory();});grid.append(btn);}
 }else{
  for(let i=0;i<36;i++){const s=inventory[i],btn=document.createElement('button');btn.className='invslot'+(!s?' empty':'');btn.title=s?(itemInfo(s.id)?.name||s.id):'Leerer Slot';if(s){btn.append(makeIcon(s.id,28));const n=document.createElement('span');n.className='count';n.textContent=s.count;btn.append(n);}let lbl=document.createElement('span');lbl.className='name';lbl.textContent=s?itemInfo(s.id)?.name:'·';btn.append(lbl);btn.addEventListener('click',()=>{if(i===selected)return;if(isMulti){send({t:'swap',a:i,b:selected});return;}[inventory[i],inventory[selected]]=[inventory[selected],inventory[i]];drawHotbar();drawInventory();scheduleSave();});grid.append(btn);}
 }
 const recipes=$('recipeGrid');recipes.textContent='';const nearbyTable=nearBlock(B.CRAFT);for(const r of RECIPES){const available=mode==='creative'||(!r.table||nearbyTable)&&hasIngredients(r.req);const btn=document.createElement('button');btn.className='recipe';btn.disabled=mode==='creative'||!available;
 const icon=document.createElement('div');icon.className='recipe-icon';icon.append(makeIcon(r.out,28));const t=document.createElement('div');t.className='recipe-text';t.textContent=r.name+' ×'+r.n;const sub=document.createElement('small');sub.textContent=Object.entries(r.req).map(([id,n])=>`${n}× ${itemInfo(id)?.name||id}`).join(' + ')+(r.table?' · Werkbank':'');t.append(sub);btn.append(icon,t);btn.addEventListener('click',()=>craft(r));recipes.append(btn);}
 const furnace=$('furnaceGrid');furnace.textContent='';for(const r of SMELT){const btn=document.createElement('button');btn.className='recipe';btn.disabled=mode==='creative'||!nearBlock(B.FURNACE)||!totalItem(r.from)||!totalItem('m:coal');const icon=document.createElement('div');icon.className='recipe-icon';icon.append(makeIcon(r.to,28));const div=document.createElement('div');div.className='recipe-text';div.textContent=r.name;const small=document.createElement('small');small.textContent=`1× ${itemInfo(r.from)?.name} + 1× Kohle · Ofen`;div.append(small);btn.append(icon,div);btn.addEventListener('click',()=>smelt(r));furnace.append(btn);}
}
function lockPointer(){if(started&&!paused&&!inventoryOpen&&!chatOpen&&!dead)renderer?.domElement.requestPointerLock?.().catch(()=>toast('Klicke ins Spiel, um die Maus zu steuern.'));}
function pauseGame(){showCracks(null,0);if(!started||paused||inventoryOpen||chatOpen||dead)return;paused=true;holdMine=false;holdUse=false;$('pause').classList.remove('hidden');document.exitPointerLock?.();}
function resumeGame(){paused=false;$('pause').classList.add('hidden');lockPointer();}
function openInventory(tab='items'){if(!started||paused||chatOpen||dead)return;inventoryOpen=true;holdMine=false;$('inventory').classList.remove('hidden');document.exitPointerLock?.();setTab(tab);}
function closeInventory(){inventoryOpen=false;$('inventory').classList.add('hidden');lockPointer();}
function openChat(){if(!started||paused||inventoryOpen||dead)return;chatOpen=true;holdMine=false;$('chat').classList.remove('hidden');document.exitPointerLock?.();$('chatInput').focus();}
function closeChat(){chatOpen=false;$('chat').classList.add('hidden');$('chatInput').value='';lockPointer();}
function toMenu(){if(!isMulti)saveSolo();else if(socket?.readyState===WebSocket.OPEN)send({t:'state',inventory:mode==='survival'?inventory:null,health,hunger,player:[player.pos.x,player.pos.y,player.pos.z]});if(socket)socket.close();location.reload();}
function chooseSpawn(){let best=null,score=Infinity;for(let r=0;r<=650;r+=r<80?8:24){for(let i=0;i<28;i++){const theta=i*2*Math.PI/28,x=Math.floor(Math.cos(theta)*r),z=Math.floor(Math.sin(theta)*r),c=column(x,z);if(c.h<=SEA+2||c.h>74||c.biome===5)continue;const slope=Math.abs(column(x+2,z).h-c.h)+Math.abs(column(x,z+2).h-c.h);const s=r*.45+slope*5+(c.biome===2?15:0);if(s<score){score=s;best=[x,c.h+2,z];}}if(best&&score<Math.max(30,r*.45+22))break;}
 const [x,y,z]=best||[5,column(5,5).h+3,5];return {x:x+.5,y,z:z+.5};}
function beginSession(opts={}){resetDropped();sprintFromDoubleW=false;lastWRelease=-Infinity;seed=opts.seed|0;terrain=createWorldGenerator(seed);columnCache=terrain.columnCache;mode=opts.mode||mode;worldEdits=new Map(opts.edits||[]);resetChunkWorld();inventory=Array(36).fill(null);
 if(mode==='creative'){for(let i=0;i<9;i++)inventory[i]={id:COMMON[i],count:64,wear:0};flying=true;}
 else{flying=false;if(Array.isArray(opts.profile?.inventory)&&opts.profile.inventory.length===36){inventory=opts.profile.inventory.map(s=>s&&itemInfo(s.id)&&Number.isInteger(s.count)&&s.count>0?{id:s.id,count:Math.min(s.count,TOOLS[s.id]?1:64),wear:Math.max(0,Number(s.wear)||0)}:null);}}
 health=mode==='creative'?20:Math.max(1,Math.min(20,Number(opts.profile?.health)||20));hunger=mode==='creative'?20:Math.max(0,Math.min(20,Number(opts.profile?.hunger ?? 20)));oxygen=10;worldTime=Number.isFinite(opts.time)?opts.time:.25;
 spawn=chooseSpawn();player.pos.set(spawn.x,spawn.y,spawn.z);if(Array.isArray(opts.profile?.player)&&opts.profile.player.length===3){let [x,y,z]=opts.profile.player.map(Number);if([x,y,z].every(Number.isFinite)&&Math.abs(x)<500000&&Math.abs(z)<500000&&y>0&&y<MAX_Y+30)player.pos.set(x,y,z);}player.v.set(0,0,0);player.grounded=false;
 if(!scene)setupScene();for(const d of opts.drops||[])spawnDropped(d);started=true;paused=false;dead=false;$('menu').classList.add('hidden');$('hud').classList.remove('hidden');$('modeTag').textContent=mode==='creative'?'KREATIV':'SURVIVAL';
 drawHotbar();showStats();updateChunkVisibility();processChunkQueue();processChunkQueue();
 $('shareInvite').classList.toggle('hidden',!isMulti);$('pauseInvite').classList.toggle('hidden',!isMulti);
 $('worldInfo').textContent=`${room} · Seed ${seed}`;updateNetworkInfo();clock.getDelta();requestAnimationFrame(animate);if(!autoJoining)lockPointer();toast(autoJoining?'Du bist der Welt beigetreten! Klicke auf das Spiel, um die Maus zu aktivieren.':mode==='creative'?'Kreativ: F = Fliegen · E = Alle Blöcke':'Halte Linksklick: Blöcke bekommen Risse. Laufe über Items, um sie einzusammeln.');autoJoining=false;
}
function startSolo(){const raw=$('worldSeed').value.trim();storageId='blockbound:reforged:v2:'+encodeURIComponent(room)+':'+mode+(raw?':'+encodeURIComponent(raw):'');if(selectedWorldKey)storageId=selectedWorldKey;const stored=localStore();const s=raw?hashSeed(raw):stored?.seed||newRandomSeed();if(stored&&stored.seed!==s)toast('Ein neuer Welt-Seed wurde ausgewählt.');beginSession({seed:s,mode,edits:stored?.seed===s?stored.edits||[]:[],drops:stored?.seed===s?stored.drops||[]:[],profile:stored?.seed===s?stored:null});scheduleSave();}
function updateNetworkInfo(){const ok=isMulti&&socket?.readyState===WebSocket.OPEN&&clientId!==null;$('connection').textContent=isMulti?`● ${ok?'Verbunden':'Verbinde …'} · ${online} Spieler · ${mode==='creative'?'Kreativ':'Survival'}`:'● Einzelspieler · 1 Spieler';}
function send(msg){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(msg));}
function connectMultiplayer(){let address=$('serverAddress').value.trim()||sameOriginSocketUrl(window.location.href);
 if(!address){$('menuError').textContent='Hier fehlt noch ein öffentlicher WSS-Spielserver. Trage seine Adresse ein (z. B. wss://dein-server.onrender.com/ws).';return;}
 if(location.protocol==='https:'&&address.startsWith('ws://')){$('menuError').textContent='Diese HTTPS-Webseite benötigt eine sichere wss://-Verbindung.';return;}if(!/^wss?:\/\//.test(address))address=(location.protocol==='https:'?'wss://':'ws://')+address;let url;
 try{url=new URL(address);if(!['ws:','wss:'].includes(url.protocol))throw Error('Adresse');if(url.pathname==='/'||!url.pathname)url.pathname='/ws';}catch{return $('menuError').textContent='Bitte gib eine gültige ws://- oder wss://-Serveradresse an.';}
 serverUrl=url.toString();$('menuError').textContent='Verbinde mit dem Multiplayer-Server …';$('start').disabled=true;
 const ws=new WebSocket(serverUrl);socket=ws;let joined=false;
 ws.onopen=()=>send({t:'join',name:playerName,room,mode,seed:$('worldSeed').value.trim()});
 ws.onmessage=e=>{let data;try{data=JSON.parse(e.data);}catch{return;}
 if(data.t==='welcome'){
  joined=true;clientId=data.id;online=1+(data.players?.length||0);isMulti=true;
  beginSession({seed:data.seed,mode:data.mode,edits:data.edits||[],drops:data.drops||[],profile:data.profile||null,time:data.time});
  for(const p of data.players||[])addRemotePlayer(p);message('System',`Verbunden mit Raum „${room}“ · ${online} Spieler`,true);
 }else if(data.t==='join'){online++;addRemotePlayer(data.p);updateNetworkInfo();message('System',data.p.name+' ist beigetreten.',true);}
 else if(data.t==='leave'){online=Math.max(1,online-1);removeRemotePlayer(data.id);updateNetworkInfo();message('System',data.name+' hat die Welt verlassen.',true);}
 else if(data.t==='pos'){const r=remote.get(data.id);if(r){r.target.set(data.x,data.y,data.z);r.yaw=data.yaw||0;}}
 else if(data.t==='edit'){const old=getBlock(data.x,data.y,data.z);if(setBlock(data.x,data.y,data.z,data.id,true)&&data.id===B.AIR&&old!==B.AIR){spawnDebris(data.x,data.y,data.z,old);sound('break');}}
 else if(data.t==='drop_spawn')spawnDropped(data.drop);
 else if(data.t==='drop_remove'){if(droppedItems.has(String(data.id))){removeDropped(data.id);sound('pickup');}}
 else if(data.t==='inventory'){if(Array.isArray(data.inventory)&&data.inventory.length===36){inventory=data.inventory;drawHotbar();if(inventoryOpen)drawInventory();}if(Number.isFinite(data.health))health=data.health;if(Number.isFinite(data.hunger))hunger=data.hunger;showStats();}
 else if(data.t==='fall'){worldEdits.set(blockKey(data.x,data.from,data.z),B.AIR);worldEdits.set(blockKey(data.x,data.to,data.z),data.id);scheduleRebuild(data.x,data.z);}
 else if(data.t==='chat')message(data.name,data.message);
 else if(data.t==='error'){toast(data.message||'Serverfehler');if(!joined){$('menuError').textContent=data.message||'Verbindung abgelehnt';$('start').disabled=false;}}
 };
 ws.onerror=()=>{if(!joined){$('menuError').textContent='Server nicht erreichbar. Bitte Node.js-Server starten und Adresse prüfen.';$('start').disabled=false;}};
 ws.onclose=()=>{if(!joined){$('menuError').textContent='Verbindung fehlgeschlagen. Prüfe die Serveradresse und den Port.';$('start').disabled=false;}else{toast('Verbindung zum Server verloren. Änderungen werden nicht mehr synchronisiert.');updateNetworkInfo();}};
}
function makeNameTag(name){const can=document.createElement('canvas');can.width=256;can.height=64;const cx=can.getContext('2d');cx.fillStyle='#0b1b22da';cx.fillRect(0,8,256,48);cx.strokeStyle='#80b68a';cx.strokeRect(1,9,254,46);cx.fillStyle='#f4fdf0';cx.textAlign='center';cx.textBaseline='middle';cx.font='bold 22px system-ui';cx.fillText(name.slice(0,18),128,32,240);
 const t=new THREE.CanvasTexture(can),m=new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}),s=new THREE.Sprite(m);s.position.y=2.23;s.scale.set(2.35,.58,1);return s;}
function addRemotePlayer(p){if(!p||p.id===clientId||remote.has(p.id)||!scene)return;const g=new THREE.Group();const shirt=new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(h2(p.id?.length||4,3),.57,.45)}),skin=new THREE.MeshLambertMaterial({color:0xc38c68}),pants=new THREE.MeshLambertMaterial({color:0x2d485e}),hair=new THREE.MeshLambertMaterial({color:0x3b2c23});const limbs=[];
 const part=(x,y,z,w,h,d,mat)=>{let mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 part(0,1.1,0,.58,.71,.33,shirt);part(0,1.68,0,.47,.47,.45,skin);part(0,1.94,0,.48,.12,.46,hair);part(-.42,1.12,0,.21,.7,.3,skin);part(.42,1.12,0,.21,.7,.3,skin);limbs.push(part(-.17,.41,0,.24,.79,.3,pants),part(.17,.41,0,.24,.79,.3,pants));g.add(makeNameTag(p.name||'Spieler'));g.position.set(p.x||0,p.y||50,p.z||0);scene.add(g);remote.set(p.id,{group:g,target:g.position.clone(),legs:limbs,yaw:p.yaw||0});}
function removeRemotePlayer(id){const p=remote.get(id);if(!p)return;scene.remove(p.group);p.group.traverse(o=>{o.geometry?.dispose();if(o.material?.map)o.material.map.dispose();o.material?.dispose();});remote.delete(id);}
function updateRemotePlayers(dt){for(const p of remote.values()){let previous=p.group.position.clone();p.group.position.lerp(p.target,Math.min(1,dt*10));const a=((p.yaw-p.group.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;p.group.rotation.y+=a*Math.min(1,dt*9);const d=previous.distanceTo(p.group.position);p.legs[0].rotation.x=Math.sin(performance.now()*.014)*Math.min(.75,d*15);p.legs[1].rotation.x=-p.legs[0].rotation.x;}}
function sendMovement(now){if(!isMulti||!clientId||!socket||socket.readyState!==WebSocket.OPEN)return;
 if(now-lastPosSend>85){lastPosSend=now;send({t:'pos',x:+player.pos.x.toFixed(3),y:+player.pos.y.toFixed(3),z:+player.pos.z.toFixed(3),yaw:+yaw.toFixed(4),pitch:+pitch.toFixed(4)});}
 if(now-lastAutosave>5000){lastAutosave=now;send({t:'state',inventory:mode==='survival'?inventory:null,health,hunger,player:[player.pos.x,player.pos.y,player.pos.z]});}
}
function collidesAt(pos){const r=.295,h=1.79,eps=.001;for(let x=Math.floor(pos.x-r+eps);x<=Math.floor(pos.x+r-eps);x++)for(let y=Math.floor(pos.y+eps);y<=Math.floor(pos.y+h-eps);y++)for(let z=Math.floor(pos.z-r+eps);z<=Math.floor(pos.z+r-eps);z++){const id=getBlock(x,y,z);if(BLOCKS[id]?.solid)return true;}return false;}
function moveAxis(axis,d){if(Math.abs(d)<1e-10)return true;const steps=Math.max(1,Math.ceil(Math.abs(d)/.16)),step=d/steps;for(let i=0;i<steps;i++){
 player.pos[axis]+=step;if(collidesAt(player.pos)){player.pos[axis]-=step;return false;}}
 return true;}
function feetBlock(){return getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+.2),Math.floor(player.pos.z));}
function headBlock(){return getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+1.6),Math.floor(player.pos.z));}
function applyDamage(n,cause='Schaden'){if(mode==='creative'||dead||damageCooldown>0||n<=0)return;damageCooldown=.7;health=Math.max(0,health-n);sound('hurt');showStats();if(health<=0)die(cause);}
function die(cause){dead=true;deathCause=cause;holdMine=false;document.exitPointerLock?.();$('deathCause').textContent=cause+' · Deine Gegenstände gehen beim Wiederbeleben verloren.';$('death').classList.remove('hidden');if(!isMulti)scheduleSave();}
function respawnPlayer(){if(mode==='survival')inventory=Array(36).fill(null);health=20;hunger=20;oxygen=10;damageCooldown=0;dead=false;spawn=chooseSpawn();player.pos.set(spawn.x,spawn.y,spawn.z);player.v.set(0,0,0);$('death').classList.add('hidden');showStats();drawHotbar();scheduleSave();lockPointer();}
function updatePhysics(dt){if(paused||chatOpen||inventoryOpen||dead)return;
 const water=feetBlock()===B.WATER||headBlock()===B.WATER,headWet=headBlock()===B.WATER,fire=feetBlock()===B.LAVA;
 let horizontal=(keys.KeyD?1:0)-(keys.KeyA?1:0),forward=(keys.KeyW?1:0)-(keys.KeyS?1:0),len=Math.hypot(horizontal,forward)||1;
 let slow=keys.ControlLeft||keys.ControlRight;
 let sprint=(sprintFromDoubleW||keys.ShiftLeft||keys.ShiftRight)&&!flying&&!slow&&forward>0&&(mode==='creative'||hunger>=6);
 if(!keys.KeyW||forward<=0||slow||flying)sprintFromDoubleW=false;
 let speed=flying?8.1:water?2.3:sprint?5.65:slow?1.65:4.3;
 const vx=(Math.cos(yaw)*horizontal-Math.sin(yaw)*forward)/len*speed,
 vz=(-Math.sin(yaw)*horizontal-Math.cos(yaw)*forward)/len*speed;
 const dx=vx*dt,dz=vz*dt;if(handGroup){const bob=(forward||horizontal)?Math.sin(performance.now()*.009)*(flying?.012:.035):0;handGroup.position.y=-.60+bob;handGroup.rotation.x=holdMine?Math.sin(performance.now()*.024)*.27:0;}
 if(flying){player.v.y=0;const uy=(keys.Space?1:0)-(keys.ShiftLeft||keys.ShiftRight?1:0);const flightSpeed=slow?4.5:9.2;moveAxis('x',dx);moveAxis('z',dz);moveAxis('y',uy*flightSpeed*dt);player.grounded=false;fallDistance=0;}
 else{
  if(water){player.v.y+=((keys.Space?8:-2)-player.v.y*2)*dt;player.v.y=Math.min(4.2,Math.max(-4,player.v.y));fallDistance=0;}
  else player.v.y=Math.max(-40,player.v.y-28*dt);
  if(dx&&!moveAxis('x',dx)&&player.grounded){player.pos.y+=.6;if(!collidesAt(player.pos)&&moveAxis('x',dx)){}else player.pos.y-=.6;}
  if(dz&&!moveAxis('z',dz)&&player.grounded){player.pos.y+=.6;if(!collidesAt(player.pos)&&moveAxis('z',dz)){}else player.pos.y-=.6;}
  const vy=player.v.y*dt,ok=moveAxis('y',vy);
  if(!ok){if(vy<0){player.grounded=true;if(fallDistance>3&&!water)applyDamage(Math.floor(fallDistance-3),'Sturzschaden');fallDistance=0;}player.v.y=0;}
  else{player.grounded=false;if(vy<0&&!water)fallDistance+=-vy;}
 }
 if(player.pos.y<-.5){if(mode==='survival')applyDamage(20,'Sturz in die Tiefe');else player.pos.set(spawn.x,spawn.y,spawn.z);}
 if(mode==='survival'){
  if(headWet){oxygen-=dt;if(oxygen<=0){oxygen=0;applyDamage(2,'Ertrunken');}}else oxygen=Math.min(10,oxygen+dt*2);
  if(fire){applyDamage(3,'Lava');}
  if(feetBlock()===B.CACTUS)applyDamage(1,'Kaktus');
  hungerDebt+=dt*(.007+((forward||horizontal)?.018:0)+(sprint?.09:0)+(water?.023:0));
  if(hungerDebt>=1){hunger=Math.max(0,hunger-Math.floor(hungerDebt));hungerDebt%=1;showStats();}
  regenTimer+=dt;if(regenTimer>4){regenTimer=0;if(hunger>=18&&health<20){health=Math.min(20,health+1);hunger=Math.max(0,hunger-.4);showStats();}else if(hunger<=0)applyDamage(1,'Verhungert');}
 }
 damageCooldown=Math.max(0,damageCooldown-dt);
 camera.position.copy(player.pos).add(new THREE.Vector3(0,1.62,0));camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
}
function attemptJump(){if(!started||paused||inventoryOpen||chatOpen||dead)return;
 const now=performance.now();if(mode==='creative'&&now-lastJumpTap<320){flying=!flying;player.v.y=0;fallDistance=0;toast(flying?'Flugmodus aktiviert':'Flugmodus ausgeschaltet');}
 lastJumpTap=now;
 if(!flying){if(player.grounded){player.v.y=8.15;player.grounded=false;hungerDebt+=.035;sound('place');}else if(feetBlock()===B.WATER)player.v.y=3.9;}
}
function eatFood(){const s=currentItem();if(!s||!MATERIALS[s.id]?.food||mode!=='survival')return false;if(isMulti){send({t:'eat',slot:selected});return true;}if(hunger>=20)return toast('Du bist bereits satt.'),true;
 hunger=Math.min(20,hunger+MATERIALS[s.id].food);s.count--;if(s.count<=0)inventory[selected]=null;showStats();drawHotbar();sound('craft');toast('Nahrung gegessen.');scheduleSave();return true;}
function canPlace(x,y,z){if(y<1||y>=MAX_Y)return false;const current=getBlock(x,y,z);if(current&&!BLOCKS[current].liquid&&current!==B.GRASS_PLANT&&current!==B.FLOWER)return false;
 if(x<player.pos.x+.295&&x+1>player.pos.x-.295&&z<player.pos.z+.295&&z+1>player.pos.z-.295&&y<player.pos.y+1.79&&y+1>player.pos.y)return false;return true;}
function placeSelected(){const s=currentItem();if(!s)return;if(!s.id.startsWith('b:')){eatFood();return;}const id=+s.id.slice(2);if(id===B.BEDROCK&&mode==='survival')return;
 if(looking?.id===B.CRAFT&&mode==='survival'){openInventory('craft');return;}if(looking?.id===B.FURNACE&&mode==='survival'){openInventory('furnace');return;}
 if(!looking)return;
 const x=looking.x+looking.n[0],y=looking.y+looking.n[1],z=looking.z+looking.n[2];if(!canPlace(x,y,z))return;
 if(isMulti){send({t:'place',x,y,z,id,slot:selected});return;}if(setBlock(x,y,z,id)){if(mode==='survival'){s.count--;if(s.count<=0)inventory[selected]=null;}drawHotbar();sound('place');}
}
function miningDuration(id){const block=BLOCKS[id],item=currentItem(),tool=item&&TOOLS[item.id];if(mode==='creative')return 0;
 if(!block||id===B.BEDROCK||block.liquid)return Infinity;if(block.hardness===0)return .14;
 const correct=tool?.kind===block.tool;
 return block.hardness*(correct?1.4/tool.speed:block.tool==='pick'?5:2.5);
}
function harvestable(id){const block=BLOCKS[id],item=currentItem(),tool=item&&TOOLS[item.id];if(id===B.BEDROCK||block.liquid)return false;if(block.tool==='pick'&&block.tier>0)return !!tool&&tool.kind==='pick'&&tool.tier>=block.tier;return true;}
function groundOfDrop(x,y,z){
 for(let yy=Math.min(MAX_Y-1,Math.floor(y));yy>=1;yy--){const block=getBlock(Math.floor(x),yy,Math.floor(z));
  if(block!==B.AIR&&!BLOCKS[block].plant&&!BLOCKS[block].liquid)return yy+1.20;
 }return 1.20;
}
function geometryForDrop(itemId){if(dropGeometries.has(itemId))return dropGeometries.get(itemId);
 const id=itemId.startsWith('b:')?Number(itemId.slice(2)):null;
 const g=new THREE.BoxGeometry(id===null?.23:.32,id===null?.20:.32,id===null?.23:.32);
 if(id!==null){const uv=g.getAttribute('uv'),tiles=[tileFor(id,2),tileFor(id,3),tileFor(id,4),tileFor(id,5),tileFor(id,0),tileFor(id,1)];
  for(let f=0;f<6;f++){const tile=tiles[f],u=tile%ATLAS_COLS,v=Math.floor(tile/ATLAS_COLS),eps=.002;
   const uv4=[[eps,eps],[1-eps,eps],[eps,1-eps],[1-eps,1-eps]];
   for(let q=0;q<4;q++)uv.setXY(f*4+q,(u+uv4[q][0])/ATLAS_COLS,(ATLAS_ROWS-v-1+uv4[q][1])/ATLAS_ROWS);
  }uv.needsUpdate=true;
 }
 dropGeometries.set(itemId,g);return g;
}
function spawnDropped(data){
 if(!data||!data.id||!data.itemId||!itemInfo(data.itemId)||droppedItems.has(data.id)||!scene)return;
 const x=Number(data.x),y=Number(data.y),z=Number(data.z),spawnY=Number(data.spawnY);
 if(![x,y,z].every(Number.isFinite))return;
 const block=data.itemId.startsWith('b:');
 let mat=dropBlockMaterial;
 if(!block){mat=dropMaterials.get(data.itemId);if(!mat){mat=new THREE.MeshStandardMaterial({color:itemInfo(data.itemId)?.color||({ 'm:diamond':'#61e9e8','m:coal':'#343c43','m:raw_gold':'#cfa64b','m:gold':'#f4ce5a','m:iron':'#dce1df','m:apple':'#d64e3c'}[data.itemId]||'#c9b89a'),roughness:.64,metalness:.12,emissive:0x1c2022,emissiveIntensity:.12});dropMaterials.set(data.itemId,mat);}}
 const mesh=new THREE.Mesh(geometryForDrop(data.itemId),mat);mesh.castShadow=true;scene.add(mesh);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.20,16),new THREE.MeshBasicMaterial({color:0x111b19,transparent:true,opacity:.29,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(x,y-.18,z);scene.add(shadow);
 const createdAt=Number(data.createdAt)||Date.now();
 const displayY=Date.now()-createdAt>2200?y:Number.isFinite(spawnY)?spawnY:y;
 const d={id:String(data.id),itemId:data.itemId,count:Math.max(1,Math.min(64,Number(data.count)||1)),x,y,z,
  spawnY:Number.isFinite(spawnY)?spawnY:y,createdAt,mesh,shadow,drawY:displayY,vy:displayY>y?1.6:0,pickRequest:0};
 droppedItems.set(d.id,d);
}
function removeDropped(id){const d=droppedItems.get(String(id));if(!d)return;scene.remove(d.mesh);scene.remove(d.shadow);d.shadow.geometry.dispose();d.shadow.material.dispose();droppedItems.delete(String(id));}
function resetDropped(){for(const id of [...droppedItems.keys()])removeDropped(id);}
function localDrop(itemId,x,y,z,count=1){
 if(!itemId)return;spawnDropped({id:'solo-'+(++nextSoloDrop),itemId,count,x:x+.5,y:groundOfDrop(x,y,z),z:z+.5,spawnY:y+.7,createdAt:Date.now()});scheduleSave();
}
function updateDropped(dt,now){if(!scene)return;for(const d of [...droppedItems.values()]){
  const elapsed=Math.max(0,Date.now()-d.createdAt);
  if(d.drawY>d.y+.01||d.vy>.01){d.vy=Math.max(-20,d.vy-18*dt);d.drawY+=d.vy*dt;
    if(d.drawY<=d.y){d.drawY=d.y;d.vy=d.vy<-.75?-d.vy*.22:0;}}
  d.mesh.position.set(d.x,d.drawY+Math.sin(now*.0023+(d.x+d.z)*2)*.045,d.z);
  d.mesh.rotation.y+=dt*1.65;d.mesh.rotation.z=Math.sin(now*.0018+d.x)*.10;
  d.shadow.position.set(d.x,d.y-.19,d.z);
  if(elapsed<650||Math.hypot(player.pos.x-d.x,player.pos.z-d.z)>1.65||Math.abs(player.pos.y+.9-d.y)>2.15)continue;
  if(isMulti){if(now-d.pickRequest>260){d.pickRequest=now;send({t:'pickup',id:d.id});}}
  else if(canReceiveItem(d.itemId,d.count)){addItem(d.itemId,d.count);removeDropped(d.id);sound('pickup');toast('+'+d.count+' '+(itemInfo(d.itemId)?.name||'Gegenstand'));}
 }
}
function finishMine(){const t=looking;if(!t||!getBlock(t.x,t.y,t.z)||t.id===B.BEDROCK||BLOCKS[t.id].liquid)return;
 const dropGood=harvestable(t.id),item=currentItem();if(isMulti){send({t:'mine',x:t.x,y:t.y,z:t.z,slot:selected});mineProgress=0;mineKey='';holdMine=false;return;}
 if(setBlock(t.x,t.y,t.z,B.AIR)){
  if(mode==='survival'){
   if(dropGood){const drops=NATURAL_DROPS[t.id]===undefined?'b:'+t.id:NATURAL_DROPS[t.id];if(drops)localDrop(drops,t.x,t.y,t.z);if([B.LEAVES,B.SPRUCE_LEAVES,B.BIRCH_LEAVES].includes(t.id)&&Math.random()<.065)localDrop('m:apple',t.x,t.y,t.z);if(t.id===B.GRASS_PLANT&&Math.random()<.22)localDrop('m:berry',t.x,t.y,t.z);}
   if(item&&TOOLS[item.id])wearTool(item);
  }
  spawnDebris(t.x,t.y,t.z,t.id);mineProgress=0;mineKey='';sound('break');
 }}
function spawnDebris(x,y,z,id){if(!scene)return;let mat=debrisMats.get(id);if(!mat){mat=new THREE.MeshLambertMaterial({color:BLOCKS[id].color});debrisMats.set(id,mat);}
 for(let i=0;i<7;i++){const m=new THREE.Mesh(debrisGeo,mat);m.position.set(x+.15+Math.random()*.7,y+.15+Math.random()*.7,z+.15+Math.random()*.7);scene.add(m);particles.push({m,age:0,v:new THREE.Vector3((Math.random()-.5)*2.9,1+Math.random()*2,(Math.random()-.5)*2.9)});}}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.v.y-=18*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*4;p.m.rotation.z+=dt*2;p.m.scale.setScalar(Math.max(0,1-p.age/.58));if(p.age>.58){scene.remove(p.m);particles.splice(i,1);}}}
function updateMine(dt){if(!holdMine||paused||inventoryOpen||chatOpen||dead||document.pointerLockElement!==renderer.domElement){showCracks(null,0);mineProgress=0;mineKey='';$('breakbar').classList.add('hidden');return;}
 const t=looking;if(!t){mineProgress=0;showCracks(null,0);$('breakbar').classList.add('hidden');return;}
 const key=blockKey(t.x,t.y,t.z);if(key!==mineKey){mineKey=key;mineProgress=0;if(isMulti)send({t:'mine_start',x:t.x,y:t.y,z:t.z,slot:selected});}
 const duration=miningDuration(t.id);if(!Number.isFinite(duration)){showCracks(null,0);return;}
 mineProgress+=dt/Math.max(.025,duration);showCracks(t,mineProgress);if(duration>.1&&mode==='survival'){$('breakbar').classList.remove('hidden');$('breakfill').style.width=Math.min(100,mineProgress*100)+'%';}
 else $('breakbar').classList.add('hidden');if(mineProgress>=1){finishMine();showCracks(null,0);}
}
function usePressed(){if(performance.now()-lastUse<170)return;lastUse=performance.now();if(!paused&&!inventoryOpen&&!chatOpen&&!dead)placeSelected();}
function makeHud(now){if(now-lastFPS>700){fps=Math.round(frames*1000/(now-lastFPS));lastFPS=now;frames=0;
  // On slow machines reduce GPU pixel work once, without changing the saved world.
  if(started&&!autoReducedQuality&&performance.now()>8000){
   lowFpsSamples=fps<35?lowFpsSamples+1:0;
   if(lowFpsSamples>=4&&renderer){autoReducedQuality=true;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));toast('Leistungsoptimierung: Renderauflösung reduziert (mehr FPS).');}
  }
 }
 if(now-lastHud>350){lastHud=now;const c=column(Math.floor(player.pos.x),Math.floor(player.pos.z));$('coords').textContent=`XYZ ${Math.floor(player.pos.x)} / ${Math.floor(player.pos.y)} / ${Math.floor(player.pos.z)}${showF3?' · '+fps+' FPS · '+chunkMap.size+' Chunks':''}`;
 $('worldInfo').textContent=`${room} · ${BIOMES[c.biome]} · Seed ${seed}${showF3?' · '+(flying?'Fliegen':'Boden'):''}`;}
 if(now-lastMap>1300){lastMap=now;drawMiniMap();}
}
let physicsAccumulator=0;
function animate(now){if(!started)return;requestAnimationFrame(animate);frames++;const dt=Math.min(.065,clock.getDelta());
 if(!paused&&!dead){physicsAccumulator=Math.min(.12,physicsAccumulator+dt);for(let i=0;i<5&&physicsAccumulator>=1/60;i++){updatePhysics(1/60);physicsAccumulator-=1/60;}updateChunkVisibility();processChunkQueue();updateSelection();updateMine(dt);updateParticles(dt);updateDropped(dt,now);updateSky(dt);updateTorchLights(now);updateRemotePlayers(dt);sendMovement(now);makeHud(now);}
 renderer.render(scene,camera);
}

let chosenMode='survival',chosenConnection='solo';
function copyWorldInvitation(){
 if(!isMulti||socket?.readyState!==WebSocket.OPEN||clientId===null){toast('Zuerst mit einer Multiplayer-Welt verbinden.');return;}
 try{
  const link=publicInviteUrl({pageUrl:location.href,serverUrl,room,mode,seed});
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(link).then(()=>toast('Einladungslink kopiert – an Freunde senden!')).catch(()=>fallbackCopy(link));}
  else fallbackCopy(link);
 }catch(error){toast(error.message||'Öffentlicher WSS-Server erforderlich.');}
}
function fallbackCopy(link){const field=$('inviteLink');field.value=link;field.classList.remove('hidden');field.select();try{document.execCommand('copy');toast('Einladungslink kopiert.');field.classList.add('hidden');}catch{toast('Link markieren und kopieren.');}}
$('shareInvite').addEventListener('click',copyWorldInvitation);
$('pauseInvite').addEventListener('click',copyWorldInvitation);
function wireSelector(container,callback){for(const btn of $(container).querySelectorAll('button'))btn.addEventListener('click',()=>{$(container).querySelectorAll('button').forEach(el=>el.classList.toggle('selected',el===btn));callback(btn.dataset.value);});}
wireSelector('modeChooser',v=>{chosenMode=v;selectedWorldKey=null;});
wireSelector('connChooser',v=>{chosenConnection=v;$('multifields').classList.toggle('hidden',v!=='multi');});
$('worldName').addEventListener('input',()=>selectedWorldKey=null);
$('worldSeed').addEventListener('input',()=>selectedWorldKey=null);
$('start').addEventListener('click',()=>{if(started)return;mode=chosenMode;room=$('worldName').value.trim().slice(0,28)||'Meine Welt';playerName=$('playerName').value.trim().slice(0,18)||'Spieler';$('menuError').textContent='';try{localStorage.setItem('blockbound:player:name',playerName);}catch{}
 if(chosenConnection==='multi')connectMultiplayer();else{isMulti=false;startSolo();}
});
$('resume').onclick=resumeGame;$('backMenu').onclick=toMenu;$('deathMenu').onclick=toMenu;$('respawn').onclick=respawnPlayer;
$('closeInventory').onclick=closeInventory;
$('openSettings').onclick=()=>{$('settings').classList.remove('hidden');$('pause').classList.add('hidden');};
$('settingsBack').onclick=()=>{$('settings').classList.add('hidden');$('pause').classList.remove('hidden');};
$('distanceSetting').oninput=e=>{viewDistance=+e.target.value;$('distanceValue').textContent=viewDistance;lastChunkX=null;if(started)updateChunkVisibility();};
$('mouseSetting').oninput=e=>{sensitivity=+e.target.value*.000044;$('mouseValue').textContent=e.target.value+'%';};
$('soundSetting').onchange=e=>muted=!e.target.checked;
$('tabItems').onclick=()=>setTab('items');$('tabCraft').onclick=()=>setTab('craft');$('tabFurnace').onclick=()=>setTab('furnace');
$('chat').addEventListener('submit',e=>{e.preventDefault();const value=$('chatInput').value.trim().slice(0,200);if(value){if(isMulti)send({t:'chat',message:value});else message(playerName,value);}closeChat();});
window.addEventListener('keydown',e=>{
 if(e.code==='KeyW'&&!e.repeat&&!keys.KeyW&&started&&!paused&&!chatOpen&&!inventoryOpen&&!dead){
  const time=performance.now();
  if(time-lastWRelease<=320){sprintFromDoubleW=true;}
 }
 if(e.code==='Tab'&&started)e.preventDefault();
 if(!started)return;
 if(e.code==='Escape'){
  e.preventDefault();if(!$('settings').classList.contains('hidden')){$('settingsBack').click();return;}
  if(inventoryOpen){closeInventory();return;}if(chatOpen){closeChat();return;}if(paused){resumeGame();return;}pauseGame();return;
 }
 if(chatOpen||dead)return;
 if(inventoryOpen){if(e.code==='KeyE')closeInventory();return;}
 if(paused)return;
 if(e.code==='KeyE'){e.preventDefault();openInventory();return;}
 if(e.code==='KeyT'||e.code==='Slash'){e.preventDefault();openChat();return;}
 if(e.code==='KeyR'){eatFood();return;}
 if(e.code==='KeyF'&&mode==='creative'){flying=!flying;player.v.y=0;fallDistance=0;toast(flying?'Flugmodus aktiviert':'Flugmodus deaktiviert');return;}
 if(e.code==='F3'){e.preventDefault();showF3=!showF3;return;}
 if(/^Digit[1-9]$/.test(e.code)){selected=+e.code.slice(5)-1;drawHotbar();return;}
 if(e.code==='Space'&&!e.repeat){e.preventDefault();attemptJump();}
 keys[e.code]=true;
});
window.addEventListener('keyup',e=>{keys[e.code]=false;
 if(e.code==='KeyW'){lastWRelease=performance.now();sprintFromDoubleW=false;}
});
window.addEventListener('blur',()=>{keys={};holdMine=false;sprintFromDoubleW=false;lastWRelease=-Infinity;});
window.addEventListener('wheel',e=>{if(!started||paused||inventoryOpen||chatOpen||dead)return;e.preventDefault();selected=(selected+Math.sign(e.deltaY)+9)%9;drawHotbar();},{passive:false});
$('viewport').addEventListener('mousedown',e=>{if(!started||paused||inventoryOpen||chatOpen||dead)return;e.preventDefault();if(document.pointerLockElement!==renderer.domElement){lockPointer();return;}
 if(e.button===0){holdMine=true;mineProgress=0;mineKey='';}else if(e.button===2){usePressed();holdUse=true;}
});
window.addEventListener('mouseup',e=>{if(e.button===0){holdMine=false;mineProgress=0;showCracks(null,0);$('breakbar').classList.add('hidden');}if(e.button===2)holdUse=false;});
window.addEventListener('contextmenu',e=>{if(started)e.preventDefault();});
document.addEventListener('mousemove',e=>{if(!started||paused||inventoryOpen||chatOpen||dead||document.pointerLockElement!==renderer?.domElement)return;yaw-=e.movementX*sensitivity;pitch=Math.max(-Math.PI/2+.008,Math.min(Math.PI/2-.008,pitch-e.movementY*sensitivity));});
document.addEventListener('pointerlockchange',()=>{if(started&&!dead&&!paused&&!inventoryOpen&&!chatOpen&&document.pointerLockElement!==renderer?.domElement)pauseGame();});
try{$('playerName').value=localStorage.getItem('blockbound:player:name')||'Spieler';}catch{}
// Diese Flagge signalisiert dem HTML-Fallback, dass die 3D-Bibliothek geladen wurde.

// Saved-world browser. Read-only listing is deliberately independent of the game loop.
function listLocalWorlds(){
 const root=$('savedWorlds');root.replaceChildren();
 let saves=[];try{for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);if(!k?.startsWith('blockbound:reforged:v2:'))continue;
  const p=JSON.parse(localStorage.getItem(k));if(p&&typeof p.seed==='number')saves.push({k,p});
 }}catch(e){console.warn('Weltenliste',e);}
 saves.sort((a,b)=>(b.p.updatedAt||0)-(a.p.updatedAt||0));
 if(!saves.length){const el=document.createElement('p');el.className='detail';el.textContent='Noch keine gespeicherten Einzelspielerwelten.';root.append(el);return;}
 for(const {k,p} of saves.slice(0,35)){
  const row=document.createElement('div');row.className='world-row';
  const select=document.createElement('button');select.className='world-select';
  const rawName=decodeURIComponent(k.slice('blockbound:reforged:v2:'.length).split(':')[0]);
  select.textContent=`${p.worldName||rawName} · ${p.mode==='creative'?'Kreativ':'Überleben'} · Seed ${p.seed} · ${p.edits?.length||0} Änderungen`;
  select.title='Welt auswählen';select.onclick=()=>{
   selectedWorldKey=k;const selectedMode=p.mode==='creative'?'creative':'survival';chosenMode=selectedMode;
   $('modeChooser').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.value===chosenMode));
   $('worldName').value=p.worldName||rawName;$('worldSeed').value=String(p.seed);
   chosenConnection='solo';$('connChooser').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.value==='solo'));
   $('multifields').classList.add('hidden');$('menuError').textContent='Gespeicherte Welt ausgewählt.';
  };
  const del=document.createElement('button');del.className='world-delete';del.textContent='✕';del.title='Gespeicherte Welt löschen';del.onclick=()=>{
    if(!confirm(`Welt „${p.worldName||rawName}“ dauerhaft löschen?`))return;
    localStorage.removeItem(k);if(selectedWorldKey===k)selectedWorldKey=null;listLocalWorlds();
  };row.append(select,del);root.append(row);
 }
}
listLocalWorlds();
// An invitation preselects the exact server/room/mode and joins without extra forms.
if(incomingInvite){
 chosenMode=incomingInvite.mode;chosenConnection='multi';selectedWorldKey=null;
 $('worldName').value=incomingInvite.room;$('worldSeed').value=incomingInvite.seed;
 $('modeChooser').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.value===chosenMode));
 $('connChooser').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.value==='multi'));
 $('multifields').classList.remove('hidden');
 $('serverAddress').value=incomingInvite.server||sameOriginSocketUrl(location.href);
 const savedName=$('playerName').value.trim();
 if(!savedName||savedName==='Spieler'){const n=new Uint32Array(1);crypto.getRandomValues(n);$('playerName').value='Gast-'+(n[0]%90000+10000);}
 if($('serverAddress').value){setTimeout(()=>$('start').click(),50);}
 else $('menuError').textContent='Der Einladungslink benötigt eine öffentliche WSS-Serveradresse. Bitte den Gastgeber kontaktieren.';
}
else $('serverAddress').value=sameOriginSocketUrl(location.href);

window.BLOCKBOUND_READY=true;
document.getElementById("fatal")?.classList.add("hidden");

