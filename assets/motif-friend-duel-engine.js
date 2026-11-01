// Pure server-authoritative rules for a planned authenticated two-player Match3 duel.
// No network, account, persistence or lobby is simulated here. The deployment
// layer MUST authenticate the player, lock room versions atomically, persist
// both player states and verify deadline against trusted server time.
import {createMatch3,findThree,adjacent,hasMatch3Move,swapThreeStages} from './motif-minigames-engine.js';
export const DUEL_RULES=Object.freeze({width:6,types:6,seconds:120});
const MAX_SEED=4294967295;
function requireIdentity(value,label){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]{4,128}$/.test(value))throw Error(label+'身份无效');
 return value;
}
function requireNow(now){if(!Number.isSafeInteger(now)||now<0)throw Error('服务器时间无效');return now}
function randomSequence(seed){
 let state=seed>>>0;
 if(!state)state=1;
 return {
  random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296},
  get state(){return state}
 };
}
function copyRoom(room){
 if(!room||room.rulesVersion!==1||!Array.isArray(room.players))throw Error('房间状态无效');
 return {...room,players:room.players.map(p=>({...p,board:p.board.slice()}))};
}
export function createDuelRoom({roomId,hostId,seed,now}){
 requireIdentity(roomId,'房间');requireIdentity(hostId,'玩家');requireNow(now);
 if(!Number.isSafeInteger(seed)||seed<1||seed>MAX_SEED)throw Error('棋盘种子无效');
 const rng=randomSequence(seed),board=createMatch3({width:DUEL_RULES.width,types:DUEL_RULES.types,random:()=>rng.random()});
 if(findThree(board,6).length||!hasMatch3Move(board,6))throw Error('房间初始棋盘不合法');
 return {rulesVersion:1,roomId,status:'waiting',version:1,seed,
  createdAt:now,startedAt:null,endsAt:null,finishedAt:null,winnerId:null,
  players:[{id:hostId,score:0,sequence:0,removed:0,chains:0,board,rngState:rng.state}]};
}
export function joinDuelRoom(room,guestId,now){
 requireIdentity(guestId,'玩家');requireNow(now);
 const next=copyRoom(room);
 if(next.status!=='waiting'||next.players.length!==1)throw Error('房间不在等待状态');
 if(guestId===next.players[0].id)throw Error('不能加入自己的对战');
 const host=next.players[0];
 next.players.push({...host,id:guestId,board:host.board.slice()});
 next.status='running';next.startedAt=now;next.endsAt=now+DUEL_RULES.seconds*1000;
 next.version++;return next;
}
export function applyDuelSwap(room,{actorId,a,b,sequence,now}){
 requireIdentity(actorId,'玩家');requireNow(now);
 const next=copyRoom(room);
 if(next.status!=='running'||!next.endsAt||now>=next.endsAt)throw Error('对战尚未开始或已截止');
 const p=next.players.find(player=>player.id===actorId);
 if(!p)throw Error('未获授权的参赛玩家');
 if(!Number.isSafeInteger(sequence)||sequence!==p.sequence+1)throw Error('重复或乱序的操作');
 if(!Number.isInteger(a)||!Number.isInteger(b)||!adjacent(a,b,DUEL_RULES.width)||
    a<0||b<0||a>=p.board.length||b>=p.board.length)throw Error('只允许交换合法的相邻棋格');
 const rng=randomSequence(p.rngState);
 const result=swapThreeStages(p.board,a,b,DUEL_RULES.width,DUEL_RULES.types,()=>rng.random());
 if(!result.valid)throw Error('没有形成真实三连，不计分');
 p.board=result.board.slice();p.rngState=rng.state;p.sequence++;
 p.score+=result.removed*36+Math.max(0,result.chains-1)*110;
 p.removed+=result.removed;p.chains+=result.chains;next.version++;
 return next;
}
export function finishDuelRoom(room,now){
 requireNow(now);const next=copyRoom(room);
 if(next.status==='finished')return next;
 if(next.status!=='running'||now<next.endsAt)throw Error('对战尚未截止');
 next.status='finished';next.finishedAt=now;next.version++;
 const [a,b]=next.players;
 next.winnerId=a.score===b.score?null:(a.score>b.score?a.id:b.id);
 return next;
}
export function publicDuelView(room,actorId){
 requireIdentity(actorId,'玩家');
 const valid=copyRoom(room),self=valid.players.find(p=>p.id===actorId);
 if(!self)throw Error('未获授权的参赛玩家');
 return {roomId:valid.roomId,status:valid.status,version:valid.version,
  startedAt:valid.startedAt,endsAt:valid.endsAt,winnerId:valid.winnerId,
  yourself:{id:self.id,score:self.score,moves:self.sequence,board:self.board.slice()},
  rival:valid.players.filter(p=>p.id!==actorId).map(p=>({id:p.id,score:p.score,moves:p.sequence}))};
}
