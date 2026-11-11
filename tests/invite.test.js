import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicInviteUrl,parseInviteUrl,sameOriginSocketUrl,isPublicHost} from '../client/src/invite.js';

test('public host detects private networks',()=>{
 for(const h of ['localhost','127.0.0.1','10.0.0.12','192.168.1.1','172.20.0.7','my-pc.local'])assert.equal(isPublicHost(h),false);
 assert.equal(isPublicHost('blockbound.onrender.com'),true);
});
test('share a public hosted multiplayer world, direct link auto-recovers parameters',()=>{
 const link=publicInviteUrl({pageUrl:'https://blockbound.onrender.com/client/index.html',serverUrl:'wss://blockbound.onrender.com/ws',room:'Abenteuer & Freunde',mode:'survival',seed:'4321'});
 assert.match(link,/join=1/);
 assert.equal(new URL(link).searchParams.has('server'),false);
 assert.deepEqual(parseInviteUrl(link),{room:'Abenteuer & Freunde',mode:'survival',seed:'4321',server:null});
});
test('GitHub Pages invite includes the external server WSS address',()=>{
 const link=publicInviteUrl({pageUrl:'https://juliusbo-afk.github.io/Minecraft/client/index.html',serverUrl:'wss://blockbound.onrender.com/ws',room:'Welt 1',mode:'creative',seed:'-9'});
 assert.deepEqual(parseInviteUrl(link),{room:'Welt 1',mode:'creative',seed:'-9',server:'wss://blockbound.onrender.com/ws'});
});
test('cannot accidentally share localhost or mixed-content websocket',()=>{
 assert.throws(()=>publicInviteUrl({pageUrl:'https://juliusbo-afk.github.io/Minecraft/',serverUrl:'ws://localhost:3000/ws',room:'X',mode:'creative',seed:1}),/WSS/);
 assert.throws(()=>publicInviteUrl({pageUrl:'https://juliusbo-afk.github.io/Minecraft/',serverUrl:'ws://public.example/ws',room:'X',mode:'creative',seed:1}),/WSS/);
 assert.equal(sameOriginSocketUrl('https://juliusbo-afk.github.io/Minecraft/'),'');
 assert.equal(sameOriginSocketUrl('https://blockbound.onrender.com/client/index.html'),'wss://blockbound.onrender.com/ws');
 assert.equal(parseInviteUrl('https://blockbound.onrender.com/?join=1&room=x&mode=creative&server=ws://evil.example'),null);
});
