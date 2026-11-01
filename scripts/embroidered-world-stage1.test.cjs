const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const templates=import('../assets/embroidered-world-ui.js');
const engine=import('../assets/motif-minigames-engine.js');
test('The approved game-world interaction uses six real landmarks, not six generic cards',async()=>{
 const {WORLD_SITES,worldMarkup}=await templates;
 assert.equal(WORLD_SITES.length,6);
 assert.deepEqual(WORLD_SITES.map(x=>x.id),['match3','link','jigsaw','color','studio','memory']);
 const view=worldMarkup({cleared:4,score:920});
 assert.equal((view.match(/data-park-open="/g)||[]).length,6);
 assert(view.includes('reference-art/home/landscape.webp'));
 assert(view.includes('梨花绣田'));
 assert(view.includes('东方染坊'));
 assert(view.includes('可横向探索'));
 assert(!view.includes('park-game-card'),'Must not fall back to old web card grid');
 assert.equal((view.match(/class="world-landmark-motif"/g)||[]).length,6,'Each landmark is an independent motif layer');
 assert.equal((view.match(/data-world-pan="/g)||[]).length,2,'World exploration provides two genuine camera controls');
 assert(view.includes('world-pan-status'));
 assert.equal((view.match(/class="world-landmark-building"/g)||[]).length,6,'All six venues have independent building illustrations');
 assert.equal((view.match(/class="world-landmark-sign"/g)||[]).length,6,'Landmark text and gameplay target remain independently controllable');
 for(const id of ['match3','link','jigsaw','color','studio','memory']){
  assert(view.includes('reference-art/home/'+id+'.webp'));
  assert(fs.statSync(path.resolve(__dirname,'../assets/reference-art/home/'+id+'.webp')).size>1000,'Scenic entrance crop exists');
 }
 assert(view.includes('world-foreground-decor.svg'));
 assert(view.includes('id="world-immersive-toggle"'),'True scene fullscreen is available when browsers permit it');
 assert(view.includes('aria-label="向右探索地图"'));
});
test('Match-three garden is a scenic route containing all 20 original progress levels',async()=>{
 const {gardenMarkup,WORLD_STAGE_POINTS}=await templates;
 const {newParkSave}=await engine;const save=newParkSave();save.results.match3={1:{score:920,stars:3}};
 const p=gardenMarkup({save,available:2,level:2,styleOptions:'<option value="">全部</option>',regionOptions:'<option value="">全部</option>'});
 assert.equal(WORLD_STAGE_POINTS.length,20);
 assert.equal((p.match(/data-park-level="/g)||[]).length,20);
 assert.equal((p.match(/class="world-stage-node/g)||[]).length,20);
 assert.equal((p.match(/disabled/g)||[]).length,18);
 assert(p.includes('第 02 关'));
 assert(p.includes('★★★'));
 assert(p.includes('id="park-start"'));
 assert(p.includes('park-region'));
 assert(p.includes('park-style'));
 assert(p.includes('park-query'));
 assert(p.includes('不是')===false);
});
test('Match-three progress and stars use real stage score, no simulated rewards',async()=>{
 const {missionProgress}=await templates;
 const html=missionProgress(2,320,14,560);
 assert(html.includes('57%'));
 assert(html.includes('320'));
 assert(html.includes('14'));
 assert(html.includes('560'));
});
test('Original six-location illustrations and world style files are part of app and brand',()=>{
 const world=fs.readFileSync(path.resolve(__dirname,'../assets/embroidery-world-map.svg'),'utf8');
 const styles=fs.readFileSync(path.resolve(__dirname,'../assets/embroidered-world.css'),'utf8');
 const host=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 assert(world.includes('viewBox="0 0 1400 800"'));
 assert(world.includes('url(#water)'));
 assert(world.includes('roof'));
 assert(styles.includes('#F8F6EF'));
 assert(styles.includes('#C95A4A'));
 assert(host.includes("import {worldMarkup,gardenMarkup,missionProgress}"),'World scene templates must remain separate');
 assert(host.includes("import {PARK_STORE_KEY,STORE_ITEMS"),'Actual points ledger is implemented in a pure module');
});

test('Flower points are idempotently earned from saved best stars, never farmed by retries',async()=>{
 const {rewardForStars,gardenRewardGain,gardenRewardTotal}=await templates;
 const {newParkSave,saveParkWin}=await engine;
 const initial=newParkSave(),first=saveParkWin(initial,'match3',1,500,1),best=saveParkWin(first,'match3',1,800,3),retry=saveParkWin(best,'match3',1,100,1);
 assert.equal(rewardForStars(0),0);
 assert.equal(rewardForStars(3),50);
 assert.equal(gardenRewardGain(initial,first,1),30);
 assert.equal(gardenRewardGain(first,best,1),20);
 assert.equal(gardenRewardGain(best,retry,1),0);
 assert.equal(gardenRewardTotal(retry),50);
});


test('The spring garden owns a dedicated scenic backdrop rather than reusing world panorama wallpaper',async()=>{
 const {gardenMarkup}=await templates,{newParkSave}=await engine;
 const art=fs.readFileSync(path.resolve(__dirname,'../assets/pear-garden-scene.svg'),'utf8');
 const css=fs.readFileSync(path.resolve(__dirname,'../assets/pear-garden-stage.css'),'utf8');
 const page=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 assert(art.startsWith('<svg '));assert(art.includes('viewBox="0 0 1200 1500"'));
 assert(art.includes('id="pearTree"'));assert(art.includes('id="bridge"'));
 assert(art.includes('id="embroideryHoop"'));assert(art.includes('id="flower"'));
 assert(css.includes("url('./pear-garden-scene.svg')"));
 assert(css.includes('--garden-grid-size'));
 assert(page.includes("pear-garden-stage.css"));
 const save=newParkSave(),v=gardenMarkup({save,level:1,available:1});
 assert(v.includes('world-garden-route-lit'));
 assert(v.includes('stroke-dasharray:0 100'));
 save.results.match3={1:{score:800,stars:3}};
 const w=gardenMarkup({save,level:2,available:2});
 assert(w.includes('stroke-dasharray:5 100'));
});
test('Match-three difficulty escalates from 6-by-6 through 7-by-7 to 8-by-8 while preserving 40 memory stages and progression',async()=>{
 const game=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 assert(game.includes('level<=3?6:level<=7?7:8'));
 assert(game.includes('--garden-grid-size'));
 assert(game.includes("if(mode==='match3')garden();else void startGame()"));
 const {createMatch3,hasMatch3Move,findThree}=await engine;
 for(const width of [6,7,8]){
  const board=createMatch3({width,types:6});
  assert.equal(board.length,width*width);assert(hasMatch3Move(board,width));assert.equal(findThree(board,width).length,0);
 }
});

test('Match-three battle uses real separate carving art, independent UI controls and touch gestures',()=>{
 const file=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 const css=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-experience.css'),'utf8');
 const frame=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-carved-frame.svg'),'utf8');
 assert(frame.startsWith('<svg '),'Woodwork is real standalone SVG');
 assert(frame.includes('viewBox="0 0 900 900"'));
 for(const name of ['world-match-experience','world-match-story','world-match-task','world-match-wood-frame','world-match-effect']){
  assert(file.includes(name),'Missing independent interactive scene layer: '+name);
 }
 assert(file.includes("grid.addEventListener('pointerdown'"));
 assert(file.includes("grid.addEventListener('pointerup'"));
 assert(!file.includes("grid.setPointerCapture"),'Never hijack native tile clicks by capturing all pointers on the grid');
 assert(file.includes('origin.tile.setPointerCapture'),'Capture only true tile dragging to preserve pointerup even after keyboard focus');
 assert(file.includes("grid.addEventListener('pointerup'"),'Handle swipe end on stable game board');
 assert(!file.includes("ignoreClickUntil"),'Legitimate rapid tile clicks must never be throttled');
 assert(file.includes('swallowGestureClick'),'Suppress only drag-generated synthetic click, not later real taps');
 assert(file.includes("if(s.score>=s.goal)"),'Keep score-based actual completion');
 assert(css.includes('touch-action:none'),'Tile touch gestures must be operable on phones');
 assert(css.includes('@media(max-width:420px)'),'8×8 match tiles must fit narrow phones');
 assert(file.includes("rewardGained=earnedParkPoints(next,readMemorySave())-earnedParkPoints(save,readMemorySave())"),'Use only actual saved-star deltas across all five modes and original 40-stage memory');
 assert(file.includes("world-result-ledger"),'Victory requires honest goals and score');
});

test('Wide-screen art direction keeps real playfield, missions and short instrument strip',()=>{
 const art=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-experience.css'),'utf8');
 assert(art.includes('Art pass 03: wide-screen GAME SURFACE'));
 assert(art.includes('grid-template-areas:\'story board mission\' \'guide guide guide\''));
 assert(art.includes('grid-template-columns:repeat(6,minmax(0,1fr))!important'));
 assert(art.includes('@media (max-width:780px)'),'Mobile must remain its own responsive layout');
});

test('Act I game-stage architecture and blossoms are independently layered rather than a clickable static wallpaper',()=>{
 const game=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 const css=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-experience.css'),'utf8');
 for(const [className,artFile] of [
  ['world-match-garden-depth','pear-match-workshop-depth.svg'],
  ['world-match-garden-foreground','pear-match-silk-foreground.svg']
 ]){
  assert(game.includes(className)&&game.includes(artFile),'Real game stage must mount '+className);
  const svg=fs.readFileSync(path.resolve(__dirname,'../assets/'+artFile),'utf8');
  assert(svg.includes('width="1440" height="860"'),'Scene art must fit its full 16:9 viewport');
  assert(svg.startsWith('<svg')&&!/<script|<foreignObject|<image/i.test(svg),'Scene art must be safe original SVG');
 }
 assert(css.includes('pointer-events:none'),'Noninteractive scene decorations must never block controls');
 assert(css.includes('@media(max-width:780px)'),'Mobile must simplify overlays instead of squeezing 16:9 art');
});
test('Twenty-two original teaching studies have separate, non-destructive embroidery game sprites',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../content/basic-elements-v1.json'),'utf8'));
 assert.equal(catalog.records.length,22);
 const game=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 assert(game.includes('prepareMatchSprites(chosen)'),'Digital stitch derivatives must be wired to real playable match tiles');
 assert(game.includes('return await asyncImage(threadImage)?{...row,gameImage:threadImage}:row'),'Preload failure must fall back to the original study');
 for(const item of catalog.records){
  const original=fs.readFileSync(path.resolve(__dirname,'..',item.image),'utf8');
  const gameFile=path.resolve(__dirname,'../assets/game-stitched-motifs/'+item.id+'.svg');
  assert(fs.existsSync(gameFile),'Missing separate game thread derivative: '+item.id);
  const silk=fs.readFileSync(gameFile,'utf8');
  assert(silk.includes('viewBox="0 0 200 200"'),'Stable vector dimensions: '+item.id);
  assert(silk.includes('width="200" height="200"'),'Explicit square intrinsic SVG size prevents browser letterboxing: '+item.id);
  assert(silk.includes('stroke="url(#')||silk.includes('stroke="url(#thread)"'),'Visible embroidery thread layer: '+item.id);
  assert(silk.includes('stroke-dasharray'),'Thread stitches must be individually marked: '+item.id);
  assert(!/<script|<foreignObject|<image/i.test(silk),'Sprites are independent safe vector art: '+item.id);
  assert(original.includes('<svg'),'Original asset is retained in the catalog: '+item.id);
 }
});

test('Thread trails and awarded stars remain purely decorative and derived from true game state',()=>{
 const game=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 const art=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-experience.css'),'utf8');
 assert(game.includes('function stitchTrails(grid,s)'));
 assert(game.includes("values[i]!==values[j]"),'Thread lines must only connect identical actual tiles');
 assert(game.includes("s.phase==='match'?s.board:s.matchSource"),'Clearing frame must use the true previous matching board');
 assert(game.includes('if(reduceMotion()'),'Optional decorations must be skipped in reduced-motion mode');
 assert(art.includes('.world-match-thread-trails')&&art.includes('pointer-events:none'));
 assert(game.includes("i<stars?'is-earned':'is-unearned'"),'Stars must reflect existing verdict, not decorative score');
 assert(art.includes('prefers-reduced-motion:reduce'),'Optional motion must be removable');
});

test('Mobile Match3 is compact without sacrificing accessible instructions or native keyboard control',()=>{
 const game=fs.readFileSync(path.resolve(__dirname,'../assets/motif-game-park.js'),'utf8');
 const style=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-experience.css'),'utf8');
 assert(game.includes("grid.addEventListener('keydown'"),'Arrow and Escape keyboard navigation must remain attached to stable parent');
 assert(game.includes("focus({preventScroll:true})"),'Selection redraw must restore native keyboard focus');
 assert(game.includes('class="world-match-mobile-how"'),'Native details disclosure must be rendered for mobile');
 assert(style.includes("body:has(#park-playing[data-park-mode=\"match3\"]) #site-header"),'Hide only battle-site chrome on phones');
 assert(style.includes(".world-match-mobile-how summary"),'Phone instructions are still operable on demand');
});

test('Carved walnut and silk weave are independently layered safe visual assets',()=>{
 const frame=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-carved-frame.svg'),'utf8');
 const silk=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-silk-weave.svg'),'utf8');
 const style=fs.readFileSync(path.resolve(__dirname,'../assets/pear-match-experience.css'),'utf8');
 assert(frame.includes('id="walnutFibers"'),'Actual carved-frame art must contain separate woodgrain underlay');
 assert(silk.includes('width="192" height="192"')&&silk.includes('patternUnits="userSpaceOnUse"'),
  'Silk textile must be a scalable genuine warp-weft pattern');
 assert(!/<script|<image|<foreignObject/i.test(silk),'Silk material must be safe SVG with no remote resources');
 assert(style.includes("url('./pear-match-silk-weave.svg')"));
 assert(style.includes('.park-match-tile::after'),'Tile embossing must be purely decorative');
});
