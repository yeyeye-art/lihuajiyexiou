const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=x=>JSON.parse(fs.readFileSync(path.join(root,x),'utf8'));
const engine=import('../assets/motif-game-engine.js');
const patterns=read('content/patterns.json'),elements=read('content/basic-elements-v1.json').records;
test('40 contiguous stages in five chapters with memory preview and increasing difficulty',async()=>{
 const {LEVELS,CHAPTERS,FREE_PAIR_CHOICES}=await engine;
 assert.equal(LEVELS.length,40);assert.equal(CHAPTERS.length,5);
 assert.deepEqual(LEVELS.map(x=>x.number),Array.from({length:40},(_,i)=>i+1));
 assert.deepEqual(CHAPTERS.map(x=>x.pairs),[3,4,6,8,10]);
 assert.deepEqual(CHAPTERS.map(x=>x.preview),[12,11,10,9,8]);
 assert.deepEqual(CHAPTERS.map(x=>x.limit),[180,160,140,125,110]);
 assert.equal(LEVELS[39].pairs,10);
 assert(LEVELS.every(x=>x.previewSeconds>=5&&x.timeSeconds>=70));
 assert.deepEqual(FREE_PAIR_CHOICES,[3,4,6,8,10]);
});
test('Original licensed local cards and 22 independently redrawn SVGs are playable, unique and sourced from real gallery',async()=>{
 const {normalizePlayable,filterPlayable}=await engine;
 const rows=normalizePlayable(patterns,elements);
 assert.equal(rows.length,1110);
 assert.equal(new Set(rows.map(r=>r.id)).size,1110);
 assert.equal(rows.filter(r=>r.isBasicElement).length,22);
 assert(rows.every(x=>x.gameImage.startsWith('./assets/')));
 assert(rows.every(x=>fs.existsSync(path.join(root,x.gameImage.replace(/^\.\//,'')))));
 assert.equal(filterPlayable(rows,{style:'element'}).length,22);
 assert.equal(filterPlayable(rows,{style:'element',region:'中国传统'}).length,2);
 assert(filterPlayable(rows,{style:'floral',keyword:'莲'}).length>=2);
});
test('Deck always has exact shuffled symmetric pairs with no duplicate motif identities',async()=>{
 const {normalizePlayable,makeDeck,freeSettings}=await engine,all=normalizePlayable(patterns,elements);
 const random=(()=>{let i=0;return()=>((++i*37)%97)/97})();
 for(const pairs of [3,4,6,8,10]){
  const deck=makeDeck(all,pairs,random);
  assert.equal(deck.length,pairs*2);
  assert.equal(new Set(deck.map(x=>x.id)).size,pairs);
  for(const id of new Set(deck.map(x=>x.id)))assert.equal(deck.filter(x=>x.id===id).length,2);
  assert.equal(new Set(deck.map(x=>x.cardKey)).size,deck.length);
  assert.equal(freeSettings(pairs).pairs,pairs);
 }
 assert.throws(()=>makeDeck(all.slice(0,2),10),/不足/);
 assert.throws(()=>freeSettings(100),/不支持/);
});
test('Three-star results, noninflating repeat scores and sequential unlock survive reload',async()=>{
 const {LEVELS,gradeRound,recordWin,sanitizeSave,emptySave}=await engine;
 const first=LEVELS[0],second=LEVELS[1];
 let save=emptySave();
 assert.equal(save.unlocked,1);
 const excellent=gradeRound(first,{moves:first.pairs,misses:0,remaining:first.timeSeconds-5});
 assert.equal(excellent.stars,3);
 save=recordWin(save,first,{...excellent,moves:3,elapsedSeconds:5});
 assert.equal(save.unlocked,2);
 assert.equal(save.levels[1].stars,3);
 const preserved=JSON.parse(JSON.stringify(save));
 assert.deepEqual(sanitizeSave(preserved),save);
 const weaker=gradeRound(first,{moves:14,misses:11,remaining:2});
 assert.equal(weaker.stars,1);
 const after=recordWin(save,first,{...weaker,moves:14,elapsedSeconds:178});
 assert.equal(after.levels[1].score,excellent.score);
 assert.throws(()=>recordWin(after,LEVELS[3],{...excellent,moves:3,elapsedSeconds:5}),/尚未解锁/);
 save=recordWin(after,second,{...excellent,moves:3,elapsedSeconds:5});
 assert.equal(save.unlocked,3);
 assert.equal(sanitizeSave({unlocked:40,levels:{'40':{stars:3,score:99999}}}).unlocked,1,'Do not trust unsupported local unlock status');
});
test('Explicit partial local storage and free-mode scoring do not unlock campaign',async()=>{
 const {recordWin,emptySave,freeSettings,sanitizeSave}=await engine;
 let save=recordWin(emptySave(),freeSettings(6),{stars:2,score:850,moves:7,elapsedSeconds:24});
 assert.equal(save.unlocked,1);assert.equal(save.lastFree.score,850);
 save=recordWin(save,freeSettings(3),{stars:3,score:250,moves:3,elapsedSeconds:19});
 assert.equal(save.lastFree.score,850);
 assert.equal(sanitizeSave(null).unlocked,1);
});
