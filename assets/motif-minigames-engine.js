// Pure, testable rules for independent single-player embroidery motif mini-games.
// UI, artwork and controls are implemented in motif-game-park.js. Zero dependencies.
export const PARK_MODES=Object.freeze([
 {id:'match3',name:'纹样消消乐',subtitle:'交换三连 · 触发连锁',symbol:'✿',skill:'消除',levels:20},
 {id:'link',name:'祥云连连看',subtitle:'寻找相同图案的连接路径',symbol:'⌁',skill:'观察',levels:20},
 {id:'jigsaw',name:'绣样拼图大师',subtitle:'把绣样拼回完整画面',symbol:'◈',skill:'拼图',levels:15},
 {id:'color',name:'纹样填色坊',subtitle:'给基础绣纹填上适合的颜色',symbol:'❀',skill:'设色',levels:15},
 {id:'studio',name:'小小纹样设计师',subtitle:'自由布置花叶，创作绣样',symbol:'✧',skill:'组合',levels:15},
 {id:'memory',name:'云绣记忆之旅',subtitle:'经典40关记忆配对挑战',symbol:'★',skill:'记忆',levels:40}
]);
export const PARK_SAVE_KEY='lihuaji.motif-park.v1';
export const PAINTS=Object.freeze(['#5F917A','#DFAD82','#C1806A','#A3B4D5','#E4C66D','#879A69']);
export function pickDifferent(rows,count,random=Math.random){
 const uniques=[...new Map(rows.filter(r=>r?.id&&r.gameImage).map(r=>[r.id,r])).values()];
 if(uniques.length<count)throw Error('符合选择的纹样不足');
 for(let k=uniques.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[uniques[k],uniques[j]]=[uniques[j],uniques[k]]}
 return uniques.slice(0,count);
}
export function newParkSave(){return{version:1,results:{}}}
export function normalizeParkSave(data){
 const save=newParkSave();
 if(!data||typeof data!=='object')return save;
 for(const m of PARK_MODES){if(m.id==='memory')continue;
  const arr=data.results?.[m.id];if(!arr||typeof arr!=='object')continue;
  const cleaned={};
  for(let i=1;i<=m.levels;i++){
   let value=arr[i];if(!value||typeof value!=='object')continue;
   const score=Number(value.score),stars=Number(value.stars);
   if(!Number.isFinite(score)||!Number.isFinite(stars)||score<0||stars<1||stars>3)continue;
   cleaned[i]={score:Math.floor(score),stars:Math.floor(stars)};
  }
  if(Object.keys(cleaned).length)save.results[m.id]=cleaned;
 }
 return save;
}
export function unlockedParkLevel(save,mode){
 const item=PARK_MODES.find(m=>m.id===mode);if(!item||mode==='memory')return 1;
 const rows=normalizeParkSave(save).results[mode]||{};
 let index=1;while(index<item.levels&&rows[index]?.stars)index++;
 return index;
}
export function saveParkWin(save,mode,level,score,stars){
 const base=normalizeParkSave(save),item=PARK_MODES.find(m=>m.id===mode);
 if(!item||mode==='memory'||level<1||level>item.levels||level>unlockedParkLevel(base,mode))throw Error('关卡尚未解锁');
 if(!Number.isFinite(score)||score<0||!Number.isInteger(stars)||stars<1||stars>3)throw Error('非法成绩');
 const rows=base.results[mode]||{},prev=rows[level];
 if(!prev||stars>prev.stars||(stars===prev.stars&&score>prev.score))rows[level]={score:Math.floor(score),stars};
 base.results[mode]=rows;return base;
}
export const coords=(i,width)=>[Math.floor(i/width),i%width];
export function findThree(board,w){
 const matches=new Set(),h=board.length/w;if(!Number.isInteger(h))throw Error('board size');
 for(let r=0;r<h;r++)for(let c=0;c<w;c++){
  const i=r*w+c,v=board[i];if(v==null)continue;
  if(c+2<w&&v===board[i+1]&&v===board[i+2]){let k=c;while(k<w&&board[r*w+k]===v)matches.add(r*w+k++)}
  if(r+2<h&&v===board[i+w]&&v===board[i+2*w]){let k=r;while(k<h&&board[k*w+c]===v)matches.add(k++*w+c)}
 }
 return [...matches];
}
export function adjacent(a,b,w){const [ar,ac]=coords(a,w),[br,bc]=coords(b,w);return Math.abs(ar-br)+Math.abs(ac-bc)===1}
export function hasMatch3Move(board,w){
 for(let i=0;i<board.length;i++)for(const j of [i+1,i+w]){
  if(j>=board.length||!adjacent(i,j,w)||board[i]===board[j])continue;
  const candidate=board.slice();[candidate[i],candidate[j]]=[candidate[j],candidate[i]];
  if(findThree(candidate,w).length)return true;
 }
 return false;
}
export function createMatch3({width=6,types=6,random=Math.random}={}){
 if(width<4||width>10||types<5)throw Error('unsupported match3 dimensions');
 const make=()=>{let b=[];for(let i=0;i<width*width;i++){
  const [r,c]=coords(i,width),opts=Array.from({length:types},(_,n)=>n).filter(k=>!(c>=2&&b[i-1]===k&&b[i-2]===k)&&!(r>=2&&b[i-width]===k&&b[i-2*width]===k));
  b.push(opts[Math.floor(random()*opts.length)]);
 }return b};
 for(let attempt=0;attempt<120;attempt++){let board=make();if(hasMatch3Move(board,width))return board}
 throw Error('unable to create solvable board');
}
// Return deterministic, inspectable phases for real swaps, erasures, gravity and chains.
// No timeouts or DOM here: this is shared by the visual animation and the existing game rules.
function resolveThreePhases(board,w,types,random){
 let next=board.slice(),removed=0,chains=0,frames=[];
 for(;chains<30;){
  const indices=findThree(next,w);if(!indices.length)break;
  chains++;removed+=indices.length;
  frames.push({phase:'match',board:next.slice(),indices,chain:chains});
  for(const n of indices)next[n]=null;
  frames.push({phase:'clear',board:next.slice(),indices,chain:chains});
  for(let col=0;col<w;col++){
   const existing=[];for(let row=w-1;row>=0;row--){const value=next[row*w+col];if(value!==null)existing.push(value)}
   for(let row=w-1,k=0;row>=0;row--,k++)next[row*w+col]=k<existing.length?existing[k]:Math.floor(random()*types);
  }
  frames.push({phase:'fall',board:next.slice(),indices,chain:chains});
 }
 return {board:next,removed,chains,frames};
}
export function resolveThree(board,w,types,random=Math.random){
 const {frames,...outcome}=resolveThreePhases(board,w,types,random);
 return outcome;
}
export function swapThreeStages(board,a,b,width=6,types=6,random=Math.random){
 if(!adjacent(a,b,width)||board[a]===board[b])return{valid:false,board,removed:0,chains:0,frames:[]};
 const swapped=board.slice();[swapped[a],swapped[b]]=[swapped[b],swapped[a]];
 if(!findThree(swapped,width).length)return{valid:false,board,removed:0,chains:0,frames:[]};
 const outcome=resolveThreePhases(swapped,width,types,random);
 const next=hasMatch3Move(outcome.board,width)?outcome.board:createMatch3({width,types,random});
 const frames=[{phase:'swap',board:swapped,indices:[a,b],chain:0},...outcome.frames];
 if(next!==outcome.board)frames.push({phase:'reshuffle',board:next.slice(),indices:[],chain:outcome.chains});
 return {valid:true,board:next,removed:outcome.removed,chains:outcome.chains,frames};
}
export function swapThree(board,a,b,width=6,types=6,random=Math.random){
 const {frames,...outcome}=swapThreeStages(board,a,b,width,types,random);
 return outcome;
}
export function createLinkBoard(width=6,types=8,random=Math.random){
 if(width%2!==0||width<2||width>10||types<2)throw Error('invalid connect board');
 const deck=[];for(let i=0;i<width*width/2;i++)deck.push(i%types);
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 // Each pair occupies adjacent columns, guaranteeing at least one legal move
 // even after earlier horizontal pairs are cleared.
 return deck.flatMap(v=>[v,v]);
}
export function linkPath(board,a,b,w){
 if(a===b||a<0||b<0||a>=board.length||b>=board.length||board[a]===null||board[a]!==board[b])return null;
 const h=board.length/w,rows=h+2,cols=w+2;
 const start=[Math.floor(a/w)+1,a%w+1],end=[Math.floor(b/w)+1,b%w+1];
 const dirs=[[1,0],[-1,0],[0,1],[0,-1]],queue=[],seen=new Set();
 for(let d=0;d<4;d++)queue.push({r:start[0],c:start[1],d,turns:0,points:[start]});
 for(let pos=0;pos<queue.length;pos++){
  const q=queue[pos],r=q.r+dirs[q.d][0],c=q.c+dirs[q.d][1];
  if(r<0||r>=rows||c<0||c>=cols)continue;
  const isEnd=r===end[0]&&c===end[1],inside=r>0&&r<=h&&c>0&&c<=w;
  if(inside&&!isEnd&&board[(r-1)*w+c-1]!==null)continue;
  if(isEnd)return [...q.points,[r,c]];
  for(let d=0;d<4;d++){
   const turn=q.turns+(d!==q.d?1:0);if(turn>2)continue;
   const key=[r,c,d,turn].join(':');if(seen.has(key))continue;
   seen.add(key);queue.push({r,c,d,turns:turn,points:[...q.points,[r,c]]});
  }
 }
 return null;
}
export function createJigsaw(size,random=Math.random){
 if(!Number.isInteger(size)||size<2||size>6)throw Error('invalid puzzle');
 const slots=Array.from({length:size*size},(_,i)=>i);
 for(let i=slots.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]]}
 if(slots.every((v,i)=>i===v))[slots[0],slots[1]]=[slots[1],slots[0]];
 return slots;
}
export function swapPuzzle(slots,a,b){
 if(a<0||b<0||a>=slots.length||b>=slots.length||a===b)return slots;
 const updated=slots.slice();[updated[a],updated[b]]=[updated[b],updated[a]];return updated;
}
export function puzzleSolved(slots){return slots.every((v,i)=>v===i)}
export function paintTargets(count,shift=0){return Array.from({length:count},(_,i)=>(i+shift)%PAINTS.length)}
export function paintComplete(answers,target){return answers.length===target.length&&answers.every((n,i)=>n===target[i])}
export function studioLevelGoal(level){
 if(!Number.isInteger(level)||level<1||level>15)throw Error('invalid studio level');
 return {minItems:Math.min(6,3+Math.floor((level-1)/4)),minKinds:Math.min(3,2+Math.floor((level-1)/6))};
}
export function canFinishComposition(items,minItems=3,minKinds=2){
 return items.length>=minItems&&new Set(items.map(i=>i.id)).size>=minKinds;
}
