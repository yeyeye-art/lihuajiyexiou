const test=require('node:test'),assert=require('node:assert/strict');
const economy=import('../assets/motif-park-economy.js');
const game=import('../assets/motif-minigames-engine.js');

test('real-earned points cannot be spent before playing and cannot be duplicated by replay',async()=>{
 const {newParkSave,saveParkWin}=await game;
 const {newParkStore,earnedParkPoints,parkPointBalance,purchaseParkItem,parkInventory,consumeParkItem,normalizeParkStore}=await economy;
 const fresh=newParkSave(),base=newParkStore();
 assert.equal(earnedParkPoints(fresh),0);
 assert.throws(()=>purchaseParkItem(base,fresh,'extra-moves'),/不足/);
 const first=saveParkWin(fresh,'match3',1,720,3);
 assert.equal(earnedParkPoints(first),50);
 const bought=purchaseParkItem(base,first,'extra-moves');
 assert.equal(parkPointBalance(first,bought),15);
 assert.equal(parkInventory(bought,'extra-moves'),1);
 assert.equal(parkInventory(base,'extra-moves'),0,'Purchase must be immutable');
 const used=consumeParkItem(bought,'extra-moves');
 assert.equal(parkInventory(used,'extra-moves'),0);
 assert.equal(parkPointBalance(first,used),15,'Using the item must not refund its purchase');
 assert.throws(()=>consumeParkItem(used,'extra-moves'),/没有/);
 assert.throws(()=>purchaseParkItem(used,first,'extra-time'),/不足/);
 assert.deepEqual(normalizeParkStore(JSON.parse(JSON.stringify(used))),used,'Item ledger survives refresh');
 const replay=saveParkWin(first,'match3',1,999,3);
 assert.equal(parkPointBalance(replay,used),15,'Higher score at same grade must not mint fake currency');
 const improved=saveParkWin(saveParkWin(fresh,'match3',1,300,1),'match3',1,800,3);
 assert.equal(earnedParkPoints(improved),50,'Upgrading stars grants only the star difference');
 const linked=saveParkWin(first,'link',1,950,2);
 const second=purchaseParkItem(used,linked,'extra-time');
 assert.equal(parkInventory(second,'extra-time'),1);
 assert.equal(parkPointBalance(linked,second),25);
 assert.equal(parkInventory(normalizeParkStore({events:[{kind:'use',item:'extra-time'}]}),'extra-time'),0,'A forged orphan use cannot create stock');
});

test('all 85 original new mini-game stages grant bounded nonduplicated points',async()=>{
 const {newParkSave,saveParkWin,PARK_MODES,unlockedParkLevel}=await game;
 const {earnedParkPoints,STORE_ITEMS}=await economy;
 let record=newParkSave(),count=0;
 for(const m of PARK_MODES){
  if(m.id==='memory')continue;
  for(let level=1;level<=m.levels;level++){
   assert.equal(unlockedParkLevel(record,m.id),level,'Every stage must unlock exactly the next stage: '+m.id+'-'+level);
   record=saveParkWin(record,m.id,level,450+level,3);count++;
  }
  assert.equal(unlockedParkLevel(record,m.id),m.levels,'Final stage remains replayable');
 }
 assert.equal(count,85);
 assert.equal(earnedParkPoints(record),85*50);
 assert.equal(STORE_ITEMS.length,2);
});

test('all 20 linkup stages have a clearable complete 18-pair game board',async()=>{
 const {createLinkBoard,linkPath}=await game;
 for(let level=1;level<=20;level++)for(let seed=1;seed<=4;seed++){
  let r=seed*457+level*89;
  const random=()=>{r=r*16807%2147483647;return r/2147483647};
  const board=createLinkBoard(6,8,random);
  let pairs=0;
  for(let i=0;i<36;i+=2){
   assert(linkPath(board,i,i+1,6),'Matched adjacent pair must be playable at stage '+level);
   board[i]=board[i+1]=null;pairs++;
  }
  assert.equal(pairs,18);
  assert(board.every(item=>item===null));
 }
});

test('original 40-stage memory records share the 125-stage spendable wallet without replacing existing saves',async()=>{
 const {emptySave,LEVELS,recordWin,sanitizeSave}=await import('../assets/motif-game-engine.js');
 const {newParkSave}=await game;
 const {earnedMemoryPoints,earnedParkPoints,parkPointBalance,purchaseParkItem,newParkStore,parkInventory}=await economy;
 const initial=emptySave();
 const one=recordWin(initial,LEVELS[0],{stars:3,score:991,elapsedSeconds:21,moves:3});
 assert.equal(earnedMemoryPoints(initial),0);
 assert.equal(earnedMemoryPoints(one),50);
 assert.equal(earnedParkPoints(newParkSave(),one),50);
 const afterPurchase=purchaseParkItem(newParkStore(),newParkSave(),'extra-time',one);
 assert.equal(parkPointBalance(newParkSave(),afterPurchase,one),20);
 assert.equal(parkInventory(afterPurchase,'extra-time'),1);
 const repeat=recordWin(one,LEVELS[0],{stars:3,score:999,elapsedSeconds:18,moves:3});
 assert.equal(earnedMemoryPoints(repeat),50,'Replay score cannot mint the same stars twice');
 const upgraded=recordWin(recordWin(initial,LEVELS[0],{stars:1,score:500,elapsedSeconds:60,moves:6}),LEVELS[0],{stars:3,score:980,elapsedSeconds:18,moves:3});
 assert.equal(earnedMemoryPoints(upgraded),50,'Improved grade only adds best-star difference');
 let all=emptySave();
 for(const level of LEVELS)all=recordWin(all,level,{stars:3,score:1000,elapsedSeconds:10,moves:level.pairs});
 assert.equal(Object.keys(sanitizeSave(all).levels).length,40);
 assert.equal(earnedMemoryPoints(all),2000,'40 original stages award at most 2000 best-grade points');
 assert.equal(earnedParkPoints(newParkSave(),all),2000);
 assert.equal(earnedParkPoints(newParkSave(),{levels:{1:{stars:30,score:990}}}),50,'Corrupted stars must be sanitized and capped');
});
