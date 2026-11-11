/** BLOCKBOUND Material Studio – original procedurally drawn voxel materials.
 * All material textures and 3D inventory icons are generated locally. No game assets copied.
 */
import {B, BLOCKS, ATLAS_COLS, ATLAS_ROWS} from '../../shared/registry.js';

export const TILE_SIZE=32;
const C={
  grass:[82,132,47], soil:[105,74,47], stone:[126,130,130], cobble:[111,116,117],
  plank:[166,120,69], oak:[108,78,47], spruce:[83,67,51], birch:[216,211,192],
  leaf:[61,112,47], spruceLeaf:[46,85,61], birchLeaf:[91,137,65], sand:[210,197,143],
  sandstone:[194,176,123], water:[53,127,169], glass:[186,222,227], snow:[225,236,240],
  gravel:[130,127,120], clay:[139,160,164], brick:[158,88,74], masonry:[136,144,148],
  pumpkin:[179,100,32], cactus:[54,135,54], lava:[222,94,29]
};
function hash(x,y,s=0){let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s+1367,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function lerp(a,b,t){return a+(b-a)*t;}
function noise(x,y,s){const X=Math.floor(x),Y=Math.floor(y),a=x-X,b=y-Y,u=a*a*(3-2*a),v=b*b*(3-2*b);return lerp(lerp(hash(X,Y,s),hash(X+1,Y,s),u),lerp(hash(X,Y+1,s),hash(X+1,Y+1,s),u),v);}
function vary(base,shade,alpha=255){const k=1+shade;return [Math.max(0,Math.min(255,Math.round(base[0]*k))),Math.max(0,Math.min(255,Math.round(base[1]*k))),Math.max(0,Math.min(255,Math.round(base[2]*k))),alpha];}
const RGB=(r,g,b,a=255)=>[r,g,b,a];
function detailedSoil(x,y,t,cap=false){const grit=hash(x,y,t+55),grain=noise(x*.25,y*.25,t+98),d=noise(x*.09,y*.09,t+3),pebble=grit>.94,root=(x+Math.floor(y/4)*3)%17===0&&grain>.57;
 if(cap){const fringe=5+Math.floor(noise(x*.29,0,18)*5)+(hash(x,2,14)>.78?2:0);if(y<fringe){return vary(C.grass, (noise(x*.26,y*.28,41)-.5)*.42+(grit-.5)*.3+(y>fringe-2?-.13:.02));}
  if(y===fringe&&grit>.50)return vary(C.grass,-.18);}
 if(pebble)return vary([147,115,80],(grain-.5)*.3);
 if(root&&grit>.44)return vary([80,67,45],(d-.5)*.3);
 return vary(C.soil,(grain-.5)*.48+(d-.5)*.29+(grit-.5)*.34);
}
function texturePixel(t,x,y){const p=hash(x,y,t*9+17),q=noise(x*.15,y*.17,t*14+55),m=noise(x*.43,y*.39,t*8+96),shade=(p-.5)*.18+(q-.5)*.29+(m-.5)*.17;
 switch(t){
  case 0:{const blades=(x+Math.floor(y/4)*2)%7<2&&p>.45;return vary(blades?[104,161,62]:C.grass,shade+(blades?.08:0));}
  case 1:return detailedSoil(x,y,t,true);
  case 2:return detailedSoil(x,y,t);
  case 3:case 12:case 13:case 14:case 15:{
    const vein=Math.sin(x*.46+y*.21+noise(x*.09,y*.09,3)*4.0);
    let base=vary(C.stone,shade+(vein>.93?-.15:0));
    if(t!==3){const ore={12:[43,50,48],13:[188,116,77],14:[235,192,70],15:[65,208,191]}[t];
      const spots=[[7,8],[19,7],[25,21],[10,23],[22,29]];
      for(let i=0;i<spots.length;i++){
       const cx=spots[i][0]+Math.floor((hash(i,t,4)-.5)*5),cy=spots[i][1]+Math.floor((hash(i,t,3)-.5)*5);
       const dx=x-cx,dy=y-cy,dist=Math.max(Math.abs(dx),Math.abs(dy));
       if(dist<=2+(i%2) && (Math.abs(dx)+Math.abs(dy)<6+i%2)){
        if(dist>1 && p<.24)break;
        const highlight=(dx<=0&&dy<=0)? .22:dx>1&&dy>0?-.22:.03;
        base=vary(ore,shade*.5+highlight);break;
       }
      }
    }return base;
  }
  case 4:{const row=Math.floor(y/9),shift=row%2?5:0,xx=(x+shift)%11,yy=y%9;
    if(xx===0||yy===0||((xx===1||yy===1)&&p>.65))return vary([59,65,67],shade*.3);
    return vary([107+row%2*9,114+((x+shift)/11|0)%3*7,114+row%2*3],shade*.85);
  }
  case 5:{const line=y%8; if(line===0)return vary([86,58,37],shade*.25);
    if(line===1)return vary([126,86,52],shade*.2);
    const woodgrain=Math.sin(x*.42+(y%8)*.35+noise(x*.14,y*.15,5)*3.2);
    const knot=Math.hypot((x%23-15)*.55,(y-18)*1.9);
    if(knot<3.2&&x>10&&x<25)return vary([113,76,48],shade*.45+Math.sin(knot*2)*.15);
    return vary(C.plank,shade*.55+(woodgrain>.55?.09:woodgrain<-.6?-.12:0));
  }
  case 6:case 19:{const spruce=t===19,base=spruce?C.spruce:C.oak;
    const ridge=Math.sin(x*.83+noise(x*.22,y*.08,t)*3+Math.sin(y*.22)*.36),furrow=((x+Math.floor(noise(x*.11,y*.11,t+8)*3))%9===0);
    const cut=furrow || ridge<-.72 && p<.82;
    if(cut)return vary(spruce?[48,39,33]:[67,44,28],shade*.35);
    if(ridge>.70&&p>.30)return vary(spruce?[120,93,66]:[152,106,59],shade*.5);
    return vary(base,shade*.85+ridge*.07);
  }
  case 28:{const n=noise(x*.30,y*.17,28),dark=(y%9<=1&&n>.37&&x>1&&x<30)||(hash(Math.floor(x/4),Math.floor(y/3),18)>.84&&y%5===1);
    if(dark)return vary([67,65,56],shade*.65);
    if(x%13===0&&p>.4)return vary([157,153,138],shade*.4);
    return vary(C.birch,shade*.3+(n-.5)*.1);
  }
  case 35:case 36:case 37:{const base=t===35?C.oak:t===36?C.spruce:C.birch;
    const dx=x-15.4,dy=y-15.1,ang=Math.atan2(dy,dx),dist=Math.hypot(dx*(1+.06*Math.sin(ang*6)),dy*(1+.08*Math.cos(ang*5)));
    const band=Math.sin(dist*1.65+noise(x*.22,y*.22,37)*.48),bark=dist>13.3;
    if(bark){return vary(t===37?[72,71,63]:[77,51,32],shade*.5-(p>.85?.22:0));}
    if(dist<2.6)return vary([119,83,50],shade*.8);
    if(band>.52)return vary([105,75,46],shade*.55);
    return vary(t===37?[195,170,131]:base,shade*.53+.16);
  }
  case 7:case 20:case 29:{const base=t===20?C.spruceLeaf:t===29?C.birchLeaf:C.leaf,clusters=noise(x*.29,y*.30,12),hole=p<.075&&clusters<.58;
    return vary(base,shade*.8+(clusters-.5)*.65, hole?0:255);
  }
  case 8:case 9:{const line=t===9&&((y+Math.floor(noise(x*.17,y*.13,9)*3))%11===0);
    if(line)return vary([167,146,98],shade*.3);
    if(p>.956)return vary([248,230,178],shade);
    if(p<.065)return vary([161,149,110],shade*.5);
    return vary(t===8?C.sand:C.sandstone,shade*.43+(m-.5)*.10);
  }
  case 10:{const ripple=Math.sin(x*.48+y*.24+noise(x*.09,y*.10,12)*5.6);
    const gleam=ripple>.84&&p>.45;return vary(gleam?[133,200,220]:C.water,shade*.4+Math.max(0,ripple)*.13,gleam?238:215);
  }
  case 11:{const edge=x<2||y<2||x>29||y>29;
    const diagonal=(x+y)%29<=1&&x>4&&y>4;
    if(edge)return vary([206,239,248],shade*.25,235);
    if(diagonal)return vary([198,227,236],shade*.18,177);
    return vary(C.glass,shade*.12,35);
  }
  case 16:return vary([50,53,56],shade*.9+(m>.78?-.27:0));
  case 17:case 18:case 38:{const icy=hash(x,y,170+t)>.93,edge=t===18&&y>25;
    if(t===18&&y>8)return detailedSoil(x,y,17,false);
    return vary(edge?[190,194,194]:C.snow,shade*.35+(icy?.12:0));
  }
  case 21:{if(x%8===0||y%8===0)return vary([79,51,30],shade*.5);
    if(x%8===1||y%8===1)return vary([195,143,82],shade*.45);
    return vary([155,103,62],shade+.05);}
  case 22:{if(x>5&&x<27&&y>7&&y<24)return vary([33,38,40],shade*.25);
    if((x>4&&x<28)&&(y===6||y===24))return vary([184,190,184],shade*.3);
    return vary([131,138,141],shade);}
  case 23:{if(x>=14&&x<=17&&y>9&&y<30)return vary([132,86,46],shade*.3);
    if(Math.hypot(x-15.5,(y-8)*.95)<6)return vary([252,190,60],shade*.4,255);
    return RGB(0,0,0,0);}
  case 24:{const n=noise(x*.3,y*.32,24);if(n>.75)return vary([170,164,155],shade);if(n<.24)return vary([92,94,96],shade);return vary(C.gravel,shade*.75);}
  case 25:return vary(C.clay,shade*.43);
  case 26:case 27:{const brick=t===26,hi=brick?8:11,row=Math.floor(y/hi),xshift=(row%2)*Math.floor(hi*.7),xx=(x+xshift)%(brick?15:17),yy=y%hi;
    if(yy===0||xx===0)return vary(brick?[172,162,142]:[79,83,87],shade*.27);
    return vary(brick?C.brick:C.masonry,shade*.65+(row%2?.04:-.02));}
  case 30:{const groove=(x%8===0||x%8===1),pin=(y%12===4&&x%8===4);
    if(pin)return vary([184,203,114],shade*.3);return vary(groove?[35,91,42]:C.cactus,shade*.6);}
  case 31:{const stripe=x%8<2;return vary(stripe?[122,73,31]:C.pumpkin,shade*.75);}
  case 32:{const stalk=(Math.abs(x-15)<=1&&y>7),blade=(y>8&&y<27&&Math.abs(x-15-Math.sin(y*.22)*6)<2);
    return stalk||blade?vary([66,149,55],shade*.55):RGB(0,0,0,0);}
  case 33:{const stem=Math.abs(x-16)<2&&y>13,petal=Math.hypot(x-16,y-10)<7,center=Math.hypot(x-16,y-10)<2.5;
    return center?vary([239,196,54],shade*.4):petal?vary([215,84,115],shade*.5):stem?vary([59,147,55],shade*.5):RGB(0,0,0,0);}
  case 34:{const hot=Math.sin(x*.43+y*.37+noise(x*.14,y*.17,34)*5)>-.09;
    return vary(hot?[249,157,36]:C.lava,shade*.75);}
  default:return vary([113,123,120],shade);
 }
 return vary([113,123,120],shade);
}

export function tileForBlock(id,face){
 if(id===B.GRASS)return face===4?0:face===5?2:1;
 if(id===B.SNOW_GRASS)return face===4?17:face===5?2:18;
 if(id===B.SNOW)return 38;
 if(id===B.LOG)return face===4||face===5?35:6;
 if(id===B.SPRUCE_LOG)return face===4||face===5?36:19;
 if(id===B.BIRCH_LOG)return face===4||face===5?37:28;
 if(id===B.CRAFT)return face===4?21:5;
 return BLOCKS[id]?.tile??2;
}

export function makeMaterialAtlas(){
 const S=TILE_SIZE,canvas=document.createElement('canvas');canvas.width=S*ATLAS_COLS;canvas.height=S*ATLAS_ROWS;
 const context=canvas.getContext('2d',{willReadFrequently:false});if(!context)throw Error('Canvas 2D not supported');
 const image=context.createImageData(canvas.width,canvas.height);
 for(let t=0;t<39;t++)for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  const c=texturePixel(t,x,y);const o=((Math.floor(t/ATLAS_COLS)*S+y)*canvas.width+(t%ATLAS_COLS)*S+x)*4;
  image.data[o]=c[0];image.data[o+1]=c[1];image.data[o+2]=c[2];image.data[o+3]=c[3];
 }
 context.putImageData(image,0,0);
 return canvas;
}
const iconCache=new Map();
/** Render one source tile with an affine transform into a diamond/isometric cube face. */
function iconFace(ctx,source,tile,px,py,ax,ay,bx,by,shade=1){
 const S=TILE_SIZE,ix=(tile%ATLAS_COLS)*S,iy=Math.floor(tile/ATLAS_COLS)*S;
 ctx.save();ctx.transform(ax/S,ay/S,bx/S,by/S,px,py);ctx.drawImage(source,ix,iy,S,S,0,0,S,S);
 if(shade!==1){ctx.fillStyle=`rgba(0,0,0,${1-shade})`;ctx.fillRect(0,0,S,S);}ctx.restore();
}
export function createBlockIcon(source,blockId){
 if(iconCache.has(blockId))return iconCache.get(blockId);
 const icon=document.createElement('canvas');icon.width=64;icon.height=64;
 const ctx=icon.getContext('2d');ctx.imageSmoothingEnabled=false;
 if([B.TORCH,B.GRASS_PLANT,B.FLOWER].includes(blockId)){
  const t=tileForBlock(blockId,4);ctx.drawImage(source,(t%ATLAS_COLS)*TILE_SIZE,Math.floor(t/ATLAS_COLS)*TILE_SIZE,TILE_SIZE,TILE_SIZE,7,7,50,50);
 }else{
  iconFace(ctx,source,tileForBlock(blockId,0),4,18,28,14,0,27,.72);
  iconFace(ctx,source,tileForBlock(blockId,2),32,32,28,-14,0,27,.86);
  iconFace(ctx,source,tileForBlock(blockId,4),4,18,28,-14,28,14,1);
  ctx.strokeStyle='rgba(18,24,24,.22)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(4,18);ctx.lineTo(32,4);ctx.lineTo(60,18);ctx.lineTo(60,45);ctx.lineTo(32,59);ctx.lineTo(4,45);ctx.closePath();ctx.stroke();
 }
 const url=icon.toDataURL('image/png');iconCache.set(blockId,url);return url;
}
