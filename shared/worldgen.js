import {CHUNK, MAX_Y, SEA, B} from "./registry.js";
// Deterministic, order-independent chunk generator shared by browser and server.
export function createWorldGenerator(seed){
 const columnCache = new Map();
function h2(x,z,s=0){let h=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul((seed+s)|0,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function h3(x,y,z,s=0){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,1442695041)^Math.imul((seed+s)|0,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
const interp=t=>t*t*(3-2*t);const mix=(a,b,t)=>a+(b-a)*t;
function n2(x,z,s=0){let ix=Math.floor(x),iz=Math.floor(z),u=interp(x-ix),v=interp(z-iz);return mix(mix(h2(ix,iz,s),h2(ix+1,iz,s),u),mix(h2(ix,iz+1,s),h2(ix+1,iz+1,s),u),v)*2-1;}
function n3(x,y,z,s=0){let ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),u=interp(x-ix),v=interp(y-iy),w=interp(z-iz);return mix(mix(mix(h3(ix,iy,iz,s),h3(ix+1,iy,iz,s),u),mix(h3(ix,iy+1,iz,s),h3(ix+1,iy+1,iz,s),u),v),mix(mix(h3(ix,iy,iz+1,s),h3(ix+1,iy,iz+1,s),u),mix(h3(ix,iy+1,iz+1,s),h3(ix+1,iy+1,iz+1,s),u),v),w);}
function fbm(x,z,s=0){return .55*n2(x,z,s)+.27*n2(x*2.01,z*2.01,s+9)+.13*n2(x*4.03,z*4.03,s+18)+.05*n2(x*8.1,z*8.1,s+26);}
function column(x,z){const k=x+','+z;let c=columnCache.get(k);if(c)return c;
 const warpX=n2(x*.0016,z*.0016,4)*48,warpZ=n2(x*.0017+31,z*.0017-22,5)*48,X=x+warpX,Z=z+warpZ;
 const continental=fbm(X*.0028,Z*.0028,10),elevation=fbm(X*.0085,Z*.0085,15),detail=fbm(x*.043,z*.043,22);
 const temperature=fbm(X*.0027+200,Z*.0027-140,31)+.12,moisture=fbm(X*.0037-230,Z*.0037+300,42);
 const ridge=1-Math.abs(n2(X*.0062,Z*.0062,60));
 let mountainFactor=Math.max(0,(continental+.04)*2.15)*Math.max(0,.42-elevation+.18);
 let height=42+continental*30+elevation*8+detail*3+Math.pow(ridge,2)*mountainFactor*40;
 if(continental<-.23)height-=Math.pow(Math.min(1,(-.23-continental)*2),1.3)*15;
 // Temperature and moisture fields produce contiguous 12-biome regions, with mountain/ocean overrides.
 let biome=0;
 if(continental<-.25)biome=5;
 else if(mountainFactor>.42&&height>61)biome=4;
 else if(temperature<-.32)biome=10;
 else if(temperature<-.13)biome=3;
 else if(temperature>.32&&moisture<-.25)biome=9;
 else if(temperature>.25&&moisture<.13)biome=2;
 else if(temperature>.23&&moisture>.22)biome=11;
 else if(temperature>.15&&moisture<-.08)biome=7;
 else if(moisture>.32&&continental<.3)biome=8;
 else if(moisture>.13&&temperature<.15)biome=6;
 else if(moisture>.02)biome=1;
 if(biome===2||biome===9)height=39+continental*18+elevation*5+detail*2;
 if(biome===8)height=Math.min(height,SEA+2+Math.max(0,detail*5));
 height=Math.max(5,Math.min(MAX_Y-11,Math.floor(height)));
 if(biome===5&&height>SEA+1)biome=0;
 c={h:height,biome,temp:temperature,moisture,continental};columnCache.set(k,c);
 if(columnCache.size>94000){let i=0;for(const key of columnCache.keys()){columnCache.delete(key);if(++i>33000)break;}}
 return c;
}
function treeInfo(x,z){const c=column(x,z);if(c.h<=SEA+1||c.h>MAX_Y-13)return null;
 if(Math.abs(x)<7&&Math.abs(z)<7)return null;
 const density=[.013,.058,0,.046,.003,0,.064,.008,.035,0,.002,.10][c.biome];if(h2(x,z,77)>density)return null;
 if(Math.abs(column(x+1,z).h-c.h)>2||Math.abs(column(x,z+1).h-c.h)>2)return null;
 const kind=c.biome===3?B.SPRUCE_LOG:c.biome===6?B.BIRCH_LOG:h2(x,z,81)<.23?B.BIRCH_LOG:B.LOG;
 return {h:c.h,kind,leaf:kind===B.SPRUCE_LOG?B.SPRUCE_LEAVES:kind===B.BIRCH_LOG?B.BIRCH_LEAVES:B.LEAVES,size:kind===B.SPRUCE_LOG?6+Math.floor(h2(x,z,79)*3):4+Math.floor(h2(x,z,79)*3)};
}
function generateChunk(cx,cz){const v=new Uint8Array(CHUNK*CHUNK*MAX_Y),ox=cx*CHUNK,oz=cz*CHUNK;
 const put=(x,y,z,id)=>{if(x>=ox&&x<ox+CHUNK&&z>=oz&&z<oz+CHUNK&&y>=0&&y<MAX_Y)v[((x-ox)*CHUNK+(z-oz))*MAX_Y+y]=id;};
 for(let lx=0;lx<CHUNK;lx++)for(let lz=0;lz<CHUNK;lz++){
  const x=ox+lx,z=oz+lz,c=column(x,z),h=c.h,desert=[2,9].includes(c.biome),arctic=[3,10].includes(c.biome)||c.biome===4&&h>69;
  const surface=desert?B.SAND:arctic?B.SNOW_GRASS:c.h<=SEA+1?B.SAND:B.GRASS;
  for(let y=0;y<=h;y++){
   let type=y===0?B.BEDROCK:y>=h?surface:y>=h-3?(desert?(c.biome===9&&y<h-1?B.SANDSTONE:B.SAND):c.h<SEA+1?B.SAND:B.DIRT):B.STONE;
   if(y>5&&y<h-5){const cave=n3(x*.061,y*.085,z*.061,100);if(cave>.677&&n3(x*.11,y*.12,z*.11,110)>.36)type=B.AIR;}
   if(type===B.STONE){
    // Low-frequency 3D noise groups ore into reproducible seams instead of isolated speckles.
    const r=h3(Math.floor(x/3),Math.floor(y/3),Math.floor(z/3),90);
    const seam=n3(x*.22,y*.22,z*.22,91);
    if(seam>.20&&y<20&&r<.048)type=B.DIAMOND_ORE;
    else if(seam>.11&&y<34&&r<.09)type=B.GOLD_ORE;
    else if(seam>.03&&y<60&&r<.18)type=B.IRON_ORE;
    else if(seam>-.05&&r<.26)type=B.COAL_ORE;
   }
   if(type!==B.AIR)put(x,y,z,type);
  }
  if(h<SEA){for(let y=h+1;y<=SEA;y++)put(x,y,z,B.WATER);if(h<SEA-5&&h2(x,z,88)<.14)put(x,h,z,B.CLAY);}
  if([2,9].includes(c.biome)&&h>SEA+1){if(h2(x,z,71)<.005){let ht=2+Math.floor(h2(x,z,72)*3);for(let i=1;i<=ht;i++)put(x,h+i,z,B.CACTUS);}}
  if(h>SEA+1&&!desert&&c.biome!==5&&h2(x,z,78)<(c.biome===11?.16:.083)){put(x,h+1,z,h2(x,z,96)<.21?B.FLOWER:B.GRASS_PLANT);}
  if(c.biome===0&&h>SEA+1&&h2(x,z,98)<.003)put(x,h+1,z,B.PUMPKIN);
 }
 // Strukturen werden chunkübergreifend deterministisch aufgebaut.
 for(let x=ox-3;x<ox+CHUNK+3;x++)for(let z=oz-3;z<oz+CHUNK+3;z++){
  const t=treeInfo(x,z);if(!t)continue;
  for(let dy=1;dy<=t.size;dy++)put(x,t.h+dy,z,t.kind);
  if(t.kind===B.SPRUCE_LOG){for(let dy=t.size-3;dy<=t.size+1;dy++){
   const radius=dy===t.size+1?0:dy>=t.size-1?1:2;
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))<=radius&&!(dx===0&&dz===0&&dy<=t.size))put(x+dx,t.h+dy,z+dz,t.leaf);
  }}else{for(let dy=t.size-2;dy<=t.size+1;dy++){
   const rad=dy>=t.size?1:2;
   for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++)if(Math.abs(dx)+Math.abs(dz)<=rad*2&&h2(x+dx*17,z+dz*19,dy+101)>.16&&!(dx===0&&dz===0&&dy<=t.size))put(x+dx,t.h+dy,z+dz,t.leaf);
  }}
 }
 return v;
}

 return {h2,h3,column,generateChunk,treeInfo,columnCache};
}
