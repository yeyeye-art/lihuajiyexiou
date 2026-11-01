const test=require('node:test'),assert=require('node:assert/strict');
const engine=import('../assets/motif-friend-duel-engine.js');
const match=import('../assets/motif-minigames-engine.js');
const findMove=async board=>{
 const {findThree,adjacent}=await match,w=6;
 for(let a=0;a<board.length;a++)for(let b=0;b<board.length;b++){
  if(!adjacent(a,b,w)||board[a]===board[b])continue;
  const swapped=board.slice();[swapped[a],swapped[b]]=[swapped[b],swapped[a]];
  if(findThree(swapped,w).length)return[a,b];
 }
 throw Error('No legitimate move');
};
test('Two real players begin with identical seeded solvable boards and earn only rule-verified points',async()=>{
 const {createDuelRoom,joinDuelRoom,applyDuelSwap,finishDuelRoom,publicDuelView,DUEL_RULES}=await engine;
 const waiting=createDuelRoom({roomId:'room_2026_001',hostId:'player_one',seed:12345,now:100000});
 const again=createDuelRoom({roomId:'room_2026_002',hostId:'player_one',seed:12345,now:100000});
 assert.deepEqual(waiting.players[0].board,again.players[0].board,'Same seed, same board');
 assert.equal(waiting.status,'waiting');assert.equal(waiting.players.length,1);
 const ready=joinDuelRoom(waiting,'player_two',100500);
 assert.equal(ready.status,'running');
 assert.equal(ready.endsAt,100500+DUEL_RULES.seconds*1000);
 assert.deepEqual(ready.players[0].board,ready.players[1].board);
 const move=await findMove(ready.players[0].board);
 const host=applyDuelSwap(ready,{actorId:'player_one',a:move[0],b:move[1],sequence:1,now:100600});
 assert(host.players[0].score>=108,'Only actual 3-match removals score');
 assert.equal(host.players[1].score,0,'Opponent state cannot be mutated by host');
 assert.equal(ready.players[0].score,0,'Pure rules must never mutate persisted room snapshots');
 assert.throws(()=>applyDuelSwap(host,{actorId:'player_one',a:move[0],b:move[1],sequence:1,now:100700}),/重复或乱序/);
 const guest=applyDuelSwap(host,{actorId:'player_two',a:move[0],b:move[1],sequence:1,now:100800});
 assert.equal(guest.players[0].score,guest.players[1].score,'Same move on same seed produces equal rewards');
 assert.deepEqual(guest.players[0].board,guest.players[1].board,'Server computes deterministic cascades independently');
 const view=publicDuelView(guest,'player_one');
 assert.equal(view.rival.length,1);assert.equal(view.rival[0].score,guest.players[1].score);
 assert(!('board' in view.rival[0]),'Do not expose the opponent board in public updates');
 const finished=finishDuelRoom(guest,guest.endsAt);
 assert.equal(finished.status,'finished');assert.equal(finished.winnerId,null,'Tied scores are a draw');
 assert.deepEqual(finishDuelRoom(finished,guest.endsAt+1),finished,'Finalization is idempotent');
 assert.throws(()=>applyDuelSwap(finished,{actorId:'player_one',a:0,b:1,sequence:2,now:guest.endsAt+1}),/已截止/);
});

test('Friend duel rejects unauthorized, replayed, premature and unfair moves',async()=>{
 const {createDuelRoom,joinDuelRoom,applyDuelSwap,finishDuelRoom,publicDuelView}=await engine;
 assert.throws(()=>createDuelRoom({roomId:'x',hostId:'host_one',seed:5,now:1}),/房间身份/);
 assert.throws(()=>createDuelRoom({roomId:'valid_room',hostId:'host_one',seed:0,now:1}),/种子/);
 const w=createDuelRoom({roomId:'friend_room',hostId:'host_one',seed:792,now:100});
 assert.throws(()=>applyDuelSwap(w,{actorId:'host_one',a:0,b:1,sequence:1,now:120}),/尚未开始/);
 assert.throws(()=>joinDuelRoom(w,'host_one',120),/不能加入自己的对战/);
 const r=joinDuelRoom(w,'guest_one',120);
 assert.throws(()=>joinDuelRoom(r,'third_one',130),/不在等待/);
 assert.throws(()=>publicDuelView(r,'outsider'),/未获授权/);
 assert.throws(()=>applyDuelSwap(r,{actorId:'outsider',a:0,b:1,sequence:1,now:140}),/未获授权/);
 assert.throws(()=>applyDuelSwap(r,{actorId:'host_one',a:0,b:35,sequence:1,now:140}),/合法的相邻/);
 assert.throws(()=>applyDuelSwap(r,{actorId:'host_one',a:0,b:1,sequence:4,now:140}),/重复或乱序/);
 assert.throws(()=>finishDuelRoom(r,140),/尚未截止/);
 const move=await findMove(r.players[0].board);
 const scored=applyDuelSwap(r,{actorId:'host_one',a:move[0],b:move[1],sequence:1,now:140});
 assert.equal(finishDuelRoom(scored,scored.endsAt).winnerId,'host_one');
 assert.throws(()=>applyDuelSwap(r,{actorId:'guest_one',a:move[0],b:move[1],sequence:1,now:r.endsAt}),/已截止/);
});
