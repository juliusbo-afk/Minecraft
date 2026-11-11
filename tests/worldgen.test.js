import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldGenerator} from '../shared/worldgen.js';
import {BIOMES, B, CHUNK, MAX_Y} from '../shared/registry.js';

test('same seed yields same column and same chunk independent of generation order',()=>{
 const a=createWorldGenerator(475923),b=createWorldGenerator(475923);
 const first=a.generateChunk(-2,3),second=a.generateChunk(2,-1);
 const bSecond=b.generateChunk(2,-1),bFirst=b.generateChunk(-2,3);
 assert.deepEqual(first,bFirst);assert.deepEqual(second,bSecond);
 for(let x=-200;x<200;x+=17)for(let z=-200;z<200;z+=19)assert.deepEqual(a.column(x,z),b.column(x,z));
});
test('different seeds produce different terrain and block data',()=>{
 const a=createWorldGenerator(1441),b=createWorldGenerator(1442);
 const ca=a.generateChunk(11,-9),cb=b.generateChunk(11,-9);
 assert.notDeepEqual(ca,cb);
});
test('negative coordinates, world bounds and chunk grid are valid',()=>{
 const g=createWorldGenerator(-3123);
 for(const [cx,cz] of [[0,0],[-1,0],[-1,-1],[14,-8]]){
  const ch=g.generateChunk(cx,cz);assert.equal(ch.length,CHUNK*CHUNK*MAX_Y);
  for(let lx=0;lx<CHUNK;lx+=5)for(let lz=0;lz<CHUNK;lz+=5){
   assert.equal(ch[(lx*CHUNK+lz)*MAX_Y],B.BEDROCK);
   const col=g.column(cx*CHUNK+lx,cz*CHUNK+lz);
   assert.ok(col.h>0&&col.h<MAX_Y);
   assert.ok(col.biome>=0&&col.biome<BIOMES.length);
  }
 }
});
test('world contains terrain relief and multiple biomes over a broad region',()=>{
 const g=createWorldGenerator(619882);
 const heights=[],biomes=new Set();
 for(let x=-1500;x<=1500;x+=125)for(let z=-1500;z<=1500;z+=125){const c=g.column(x,z);heights.push(c.h);biomes.add(c.biome);}
 assert.ok(Math.max(...heights)-Math.min(...heights)>=20,'terrain relief');
 assert.ok(biomes.size>=3,`biomes found: ${[...biomes]}`);
});
