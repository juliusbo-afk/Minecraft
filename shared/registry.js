// Shared block, item and recipe data. Unique IDs remain compatible with the previous game.
const CHUNK=16, MAX_Y=112, SEA=37, ATLAS_COLS=8, ATLAS_ROWS=8;
const B={AIR:0,GRASS:1,DIRT:2,STONE:3,COBBLE:4,PLANKS:5,LOG:6,LEAVES:7,SAND:8,SANDSTONE:9,WATER:10,GLASS:11,COAL_ORE:12,IRON_ORE:13,GOLD_ORE:14,DIAMOND_ORE:15,BEDROCK:16,SNOW_GRASS:17,SNOW:18,SPRUCE_LOG:19,SPRUCE_LEAVES:20,CRAFT:21,FURNACE:22,TORCH:23,GRAVEL:24,CLAY:25,BRICKS:26,STONE_BRICKS:27,BIRCH_LOG:28,BIRCH_LEAVES:29,CACTUS:30,PUMPKIN:31,GRASS_PLANT:32,FLOWER:33,LAVA:34};
// Texturatlas-Zellen: jede Textur wird zur Laufzeit aus originalen Pixelmustern generiert.
const BLOCKS=[
 ['Luft',0,'#000000',0,'none',0],['Grasblock',0,'#649544',.6,'shovel',0],['Erde',2,'#805837',.5,'shovel',0],
 ['Stein',3,'#81878b',1.5,'pick',1],['Bruchstein',4,'#74787b',2,'pick',1],['Holzbretter',5,'#ae8b54',2,'axe',0],
 ['Eichenstamm',6,'#83613b',2,'axe',0],['Eichenlaub',7,'#548744',.2,'none',0],['Sand',8,'#d6c582',.5,'shovel',0],
 ['Sandstein',9,'#cebb7e',.8,'pick',1],['Wasser',10,'#447cb4',100,'none',0],['Glas',11,'#b7dbe0',.3,'none',0],
 ['Kohleerz',12,'#6d7479',3,'pick',1],['Eisenerz',13,'#827b70',3,'pick',2],['Golderz',14,'#95886d',3,'pick',3],
 ['Diamanterz',15,'#6b9d9d',3,'pick',3],['Grundgestein',16,'#282d30',9999,'none',999],['Schneegras',17,'#d5e5e7',.6,'shovel',0],
 ['Schnee',18,'#faf8f4',.3,'shovel',0],['Fichtenstamm',19,'#5b4937',2,'axe',0],['Fichtenlaub',20,'#41634c',.2,'none',0],
 ['Werkbank',21,'#ae8254',2.5,'axe',0],['Ofen',22,'#8f9695',3.5,'pick',1],['Fackel',23,'#ecab57',0,'none',0],
 ['Kies',24,'#9b9890',.6,'shovel',0],['Ton',25,'#93a7ad',.6,'shovel',0],['Ziegel',26,'#ad6453',2,'pick',1],
 ['Steinziegel',27,'#92979b',1.5,'pick',1],['Birkenstamm',28,'#d4d1c2',2,'axe',0],['Birkenlaub',29,'#76a061',.2,'none',0],
 ['Kaktus',30,'#4f8d42',.4,'none',0],['Kürbis',31,'#cb8333',1,'axe',0],['Hohes Gras',32,'#619c58',0,'none',0],
 ['Blume',33,'#f3c467',0,'none',0],['Lava',34,'#ef6d2a',100,'none',0]
].map((v,id)=>({id,name:v[0],tile:v[1],color:v[2],hardness:v[3],tool:v[4],tier:v[5],solid:![0,10,23,32,33,34].includes(id),liquid:id===10||id===34,plant:id===23||id===32||id===33,leaves:[7,20,29].includes(id)}));
const NATURAL_DROPS={1:'b:2',3:'b:4',12:'m:coal',13:'m:raw_iron',14:'m:raw_gold',15:'m:diamond',17:'b:2',18:'b:18',7:'b:7',20:'b:20',29:'b:29',32:null,33:'b:33',34:null,10:null,16:null};
const TOOLS={
 't:wood_pick':{name:'Holzspitzhacke',icon:'⛏',kind:'pick',tier:1,speed:2,durability:59},'t:stone_pick':{name:'Steinspitzhacke',icon:'⛏',kind:'pick',tier:2,speed:4,durability:131},'t:iron_pick':{name:'Eisenspitzhacke',icon:'⛏',kind:'pick',tier:3,speed:6,durability:250},'t:diamond_pick':{name:'Diamantspitzhacke',icon:'⛏',kind:'pick',tier:4,speed:8,durability:1561},
 't:wood_axe':{name:'Holzaxt',icon:'🪓',kind:'axe',tier:1,speed:2,durability:59},'t:stone_axe':{name:'Steinaxt',icon:'🪓',kind:'axe',tier:2,speed:4,durability:131},'t:iron_axe':{name:'Eisenaxt',icon:'🪓',kind:'axe',tier:3,speed:6,durability:250},
 't:wood_shovel':{name:'Holzschaufel',icon:'♧',kind:'shovel',tier:1,speed:2,durability:59},'t:stone_shovel':{name:'Steinschaufel',icon:'♧',kind:'shovel',tier:2,speed:4,durability:131},'t:iron_shovel':{name:'Eisenschaufel',icon:'♧',kind:'shovel',tier:3,speed:6,durability:250}
};
const MATERIALS={
 'm:stick':{name:'Stock',icon:'🪵'},'m:coal':{name:'Kohle',icon:'⬛'},'m:raw_iron':{name:'Roheisen',icon:'🪨'},'m:iron':{name:'Eisenbarren',icon:'▰'},'m:raw_gold':{name:'Rohgold',icon:'🟨'},'m:gold':{name:'Goldbarren',icon:'▰'},'m:diamond':{name:'Diamant',icon:'💎'},'m:apple':{name:'Apfel',icon:'🍎',food:4},'m:bread':{name:'Brot',icon:'🍞',food:5},'m:berry':{name:'Beeren',icon:'🍓',food:2}
};
const COMMON=[1,2,3,4,5,6,7,8,9,11,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33,12,13,14,15,10,34].map(n=>'b:'+n);
const RECIPES=[
 {out:'b:5',n:4,req:{'b:6':1},name:'Eichenbretter',table:false},
 {out:'b:5',n:4,req:{'b:19':1},name:'Fichtenbretter',table:false},
 {out:'b:5',n:4,req:{'b:28':1},name:'Birkenbretter',table:false},
 {out:'m:stick',n:4,req:{'b:5':2},name:'Stöcke',table:false},
 {out:'b:21',n:1,req:{'b:5':4},name:'Werkbank',table:false},
 {out:'b:23',n:4,req:{'m:coal':1,'m:stick':1},name:'Fackeln',table:false},
 {out:'b:22',n:1,req:{'b:4':8},name:'Ofen',table:true},
 {out:'t:wood_pick',n:1,req:{'b:5':3,'m:stick':2},name:'Holzspitzhacke',table:true},
 {out:'t:stone_pick',n:1,req:{'b:4':3,'m:stick':2},name:'Steinspitzhacke',table:true},
 {out:'t:iron_pick',n:1,req:{'m:iron':3,'m:stick':2},name:'Eisenspitzhacke',table:true},
 {out:'t:diamond_pick',n:1,req:{'m:diamond':3,'m:stick':2},name:'Diamantspitzhacke',table:true},
 {out:'t:wood_axe',n:1,req:{'b:5':3,'m:stick':2},name:'Holzaxt',table:true},
 {out:'t:stone_axe',n:1,req:{'b:4':3,'m:stick':2},name:'Steinaxt',table:true},
 {out:'t:iron_axe',n:1,req:{'m:iron':3,'m:stick':2},name:'Eisenaxt',table:true},
 {out:'t:wood_shovel',n:1,req:{'b:5':1,'m:stick':2},name:'Holzschaufel',table:true},
 {out:'t:stone_shovel',n:1,req:{'b:4':1,'m:stick':2},name:'Steinschaufel',table:true},
 {out:'t:iron_shovel',n:1,req:{'m:iron':1,'m:stick':2},name:'Eisenschaufel',table:true},
 {out:'b:27',n:4,req:{'b:4':4},name:'Steinziegel',table:true},
 {out:'m:bread',n:1,req:{'m:berry':3},name:'Beerenbrot',table:false}
];
const SMELT=[{from:'m:raw_iron',to:'m:iron',name:'Eisen schmelzen'}, {from:'m:raw_gold',to:'m:gold',name:'Gold schmelzen'},{from:'b:8',to:'b:11',name:'Sand zu Glas'},{from:'b:25',to:'b:26',name:'Ton zu Ziegel'}];
const BIOMES=['Ebenen','Wald','Wüste','Taiga','Gebirge','Ozean','Birkenwald','Savanne','Sumpf','Badlands','Schneeebene','Dschungel'];

export { CHUNK, MAX_Y, SEA, ATLAS_COLS, ATLAS_ROWS, B, BLOCKS, NATURAL_DROPS, TOOLS, MATERIALS, COMMON, RECIPES, SMELT, BIOMES };
