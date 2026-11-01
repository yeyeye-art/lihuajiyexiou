const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=import('../assets/motif-minigames-engine.js');
const base=import('../assets/motif-game-engine.js');
const root=path.resolve(__dirname,'..');const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('Six game choices include five new genuinely different modes plus untouched 40-stage memory adventure',async()=>{
 const {PARK_MODES}=await engine;
 assert.deepEqual(PARK_MODES.map(m=>m.id),['match3','link','jigsaw','color','studio','memory']);
 assert.equal(PARK_MODES.find(m=>m.id==='memory').levels,40);
 assert(PARK_MODES.every(m=>m.name&&m.subtitle&&m.levels>=15));
});
test('Game pool shares authenticated legacy local patterns and 22 genuine drawable SVG studies',async()=>{
 const {normalizePlayable,filterPlayable}=await base;
 const locals=normalizePlayable(read('content/patterns.json'),read('content/basic-elements-v1.json').records);
 assert.equal(locals.length,1110);
 assert.equal(locals.filter(x=>x.isBasicElement).length,22);
 assert.equal(filterPlayable(locals,{style:'element'}).length,22);
 for(const row of locals.filter(x=>x.isBasicElement))assert(fs.existsSync(path.join(root,row.gameImage.replace(/^\.\//,''))));
});
test('Match-three board is playable and never begins with already cleared rows or columns',async()=>{
 const {createMatch3,findThree,hasMatch3Move,adjacent,swapThree}=await engine;
 const random=(()=>{let i=17;return()=>{i=(i*48271)%2147483647;return i/2147483647}})();
 for(let i=0;i<30;i++){
  const board=createMatch3({width:6,types:6,random});
  assert.equal(board.length,36);assert.equal(findThree(board,6).length,0);assert.equal(hasMatch3Move(board,6),true);
  let valid=null;
  for(let p=0;p<36&&!valid;p++)for(let q=0;q<36&&!valid;q++)if(adjacent(p,q,6)){
   const next=board.slice();[next[p],next[q]]=[next[q],next[p]];
   if(findThree(next,6).length)valid=[p,q];
  }
  assert(valid,'At least one legal move must exist');
  let result=swapThree(board,valid[0],valid[1],6,6,random);
  assert(result.valid);assert(result.removed>=3);assert(result.board.length===36);
  assert.equal(hasMatch3Move(result.board,6),true);
  assert.equal(swapThree(board,0,30,6,6,random).valid,false);
 }
});
test('Line matching routes obey a maximum of two turns and require identical unblocked motifs',async()=>{
 const {createLinkBoard,linkPath}=await engine;
 const board=createLinkBoard(6,8,()=>.25);
 assert.equal(board.length,36);
 assert.equal(new Set(board.filter(x=>x!==null)).size,8);
 for(let i=0;i<36;i+=2){
  assert.equal(board[i],board[i+1]);
  let route=linkPath(board,i,i+1,6);
  assert(route?.length>=2,'Adjacent pair must be removable');
  board[i]=board[i+1]=null;
 }
 assert(board.every(x=>x===null));
 assert.equal(linkPath(board,0,1,6),null);
 const wrong=[1,2,3,4,5,6];assert.equal(linkPath(wrong,0,1,3),null);
});
test('Jigsaw shuffles and swapping two pieces can form an exactly correct complete picture',async()=>{
 const {createJigsaw,swapPuzzle,puzzleSolved}=await engine;
 for(const n of [3,4,5]){
  const p=createJigsaw(n,()=>.31);assert.equal(p.length,n*n);
  assert.equal(new Set(p).size,n*n);
  assert(!puzzleSolved(p));
  let board=p.slice();
  for(let i=0;i<board.length;i++){
   const index=board.indexOf(i);
   board=swapPuzzle(board,i,index);
  }
  assert(puzzleSolved(board));
 }
});
test('Original local painting and embroidery design rules have measurable completion states',async()=>{
 const {PAINTS,paintTargets,paintComplete,canFinishComposition}=await engine;
 assert.equal(PAINTS.length,6);
 const goal=paintTargets(12);
 assert.equal(goal.length,12);assert(goal.every(x=>x>=0&&x<6));
 assert(paintComplete(goal.slice(),goal));
 assert(!paintComplete(Array(12).fill(-1),goal));
 assert(canFinishComposition([{id:'lotus'},{id:'cloud'},{id:'lotus'}]));
 assert(!canFinishComposition([{id:'lotus'},{id:'lotus'},{id:'lotus'}]));
});
test('Saves are per game, sequentially unlock real levels, never affect original memory storage',async()=>{
 const {newParkSave,normalizeParkSave,unlockedParkLevel,saveParkWin}=await engine;
 const start=newParkSave();assert.equal(unlockedParkLevel(start,'match3'),1);
 const win=saveParkWin(start,'match3',1,700,3);
 assert.equal(unlockedParkLevel(win,'match3'),2);
 assert.equal(unlockedParkLevel(win,'link'),1);
 assert.equal(win.results.match3[1].stars,3);
 assert.deepEqual(normalizeParkSave(JSON.parse(JSON.stringify(win))),win);
 assert.throws(()=>saveParkWin(win,'match3',4,500,2),/未解锁/);
 const next=saveParkWin(win,'match3',2,600,2);assert.equal(unlockedParkLevel(next,'match3'),3);
 const weaker=saveParkWin(next,'match3',1,120,1);assert.equal(weaker.results.match3[1].score,700);
 assert.equal(unlockedParkLevel({version:1,results:{link:{20:{score:999999,stars:3}}}},'link'),1);
});

test('Match3 staged animation produces exactly the same board, reward and cascades as original rules',async()=>{
 const {createMatch3,findThree,adjacent,swapThree,swapThreeStages,hasMatch3Move}=await engine;
 function seeded(seed){let value=seed;return()=>{value=value*16807%2147483647;return value/2147483647}}
 for(const width of [6,7,8]){
  for(let round=1;round<=15;round++){
   const board=createMatch3({width,types:6,random:seeded(width*100+round)});
   let chosen=null;
   for(let a=0;a<board.length&&!chosen;a++)for(let b=0;b<board.length&&!chosen;b++)if(adjacent(a,b,width)&&board[a]!==board[b]){
    const swapped=board.slice();[swapped[a],swapped[b]]=[swapped[b],swapped[a]];
    if(findThree(swapped,width).length)chosen=[a,b];
   }
   assert(chosen,'A real move must exist');
   const randSeed=width*1000+round;
   const staged=swapThreeStages(board,...chosen,width,6,seeded(randSeed));
   const plain=swapThree(board,...chosen,width,6,seeded(randSeed));
   const {frames,...score}=staged;
   assert.deepEqual(score,plain,'Animation must never alter the deterministic original rules or result');
   assert.equal(frames[0].phase,'swap');
   assert.equal(frames.filter(f=>f.phase==='match').length,staged.chains);
   assert.equal(frames.filter(f=>f.phase==='clear').length,staged.chains);
   assert.equal(frames.filter(f=>f.phase==='fall').length,staged.chains);
   frames.forEach(frame=>{
    assert.equal(frame.board.length,width*width);
    assert(frame.board.every(v=>v===null||(Number.isInteger(v)&&v>=0&&v<6)));
   });
   for(let i=0;i<frames.length;i++)if(frames[i].phase==='match'){
    const after=frames[i+1];
    assert.equal(after.phase,'clear');
    assert(frames[i].indices.every(idx=>after.board[idx]===null),'Only actual matching tiles vanish');
   }
   const last=frames.at(-1);
   assert.deepEqual(last.board,staged.board,'Rendered last frame and saved next board must be identical');
   assert(hasMatch3Move(staged.board,width),'Animated matches cannot strand the player');
  }
 }
 const bad=swapThreeStages([0,1,2,3,4,5,0,1,2],0,8,3,6,seeded(1));
 assert.equal(bad.valid,false);
 assert.deepEqual(bad.frames,[]);
});

test('15 actual workshop stages require increasing materials and variety',async()=>{
 const {studioLevelGoal,canFinishComposition,paintTargets}=await engine;
 const first=studioLevelGoal(1),middle=studioLevelGoal(8),last=studioLevelGoal(15);
 assert.deepEqual(first,{minItems:3,minKinds:2});
 assert(middle.minItems>first.minItems&&middle.minKinds>=first.minKinds);
 assert.deepEqual(last,{minItems:6,minKinds:3});
 const draft=Array.from({length:6},(_,i)=>({id:['cloud','lotus','leaf'][i%3]}));
 assert(canFinishComposition(draft,...Object.values(last)));
 assert(!canFinishComposition(draft.slice(0,5),last.minItems,last.minKinds));
 assert(!canFinishComposition(draft.map(x=>({...x,id:'cloud'})),last.minItems,last.minKinds));
 assert.notDeepEqual(paintTargets(6,0),paintTargets(6,1),'Color challenges rotate their real swatch targets per stage');
 assert.throws(()=>studioLevelGoal(16),/invalid/);
});
