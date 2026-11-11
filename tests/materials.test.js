import test from 'node:test';
import assert from 'node:assert/strict';
import {B,ATLAS_COLS} from '../shared/registry.js';
import {TILE_SIZE,makeMaterialAtlas,tileForBlock,createBlockIcon} from '../client/src/materials.js';

// A small canvas stand-in validates the deterministic atlas and icon contract
// without needing an external browser or nonstandard image libraries.
test('32px procedural textures distinguish soil, wood, water and leaves',()=>{
 let pixels;
 const ctx={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},putImageData(img){pixels=img.data;}};
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return ctx;}};}};
 const atlas=makeMaterialAtlas();assert.equal(atlas.width,TILE_SIZE*ATLAS_COLS);
 const sample=(tile,x,y)=>{const i=((Math.floor(tile/ATLAS_COLS)*TILE_SIZE+y)*atlas.width+(tile%ATLAS_COLS)*TILE_SIZE+x)*4;return Array.from(pixels.slice(i,i+4));};
 assert.notDeepEqual(sample(2,8,11),sample(6,8,11),'soil differs from oak bark');
 assert.notDeepEqual(sample(6,8,11),sample(28,8,11),'oak differs from birch');
 assert.notDeepEqual(sample(0,8,11),sample(10,8,11),'grass differs from water');
 assert.ok(sample(28,8,11)[0]>sample(6,8,11)[0],'birch is visibly paler than oak');
 assert.equal(sample(38,8,15)[3],255,'snow is visible');
 assert.equal(tileForBlock(B.GRASS,4),0);assert.equal(tileForBlock(B.GRASS,0),1);
 assert.equal(tileForBlock(B.LOG,4),35);assert.equal(tileForBlock(B.LOG,0),6);
 assert.equal(tileForBlock(B.BIRCH_LOG,4),37);assert.equal(tileForBlock(B.SNOW,2),38);
});

test('isometric block icon projects top and side textures, not a flat color',()=>{
 const calls=[];
 const ctx={imageSmoothingEnabled:true,save(){},restore(){},fillRect(){},transform(...args){calls.push(['transform',...args]);},drawImage(...args){calls.push(['draw',...args]);},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){}};
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return ctx;},toDataURL(){return 'data:image/png;base64,dGVzdA==';}};}};
 const icon=createBlockIcon({},B.DIRT);
 assert.match(icon,/^data:image\/png/);
 assert.equal(calls.filter(call=>call[0]==='transform').length,3,'three textured block faces');
 assert.equal(calls.filter(call=>call[0]==='draw').length,3);
});
