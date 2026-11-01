// Pure economy rules, scoped to this browser's game-save profile.
// Points are only earned by recorded real wins (best-star delta), not fake purchases.
// No account or remote sync is claimed by this module.
import {PARK_MODES,normalizeParkSave} from './motif-minigames-engine.js';
import {sanitizeSave} from './motif-game-engine.js';
export const PARK_STORE_KEY='lihuaji.motif-store.v1';
export const STORE_ITEMS=Object.freeze([
 Object.freeze({id:'extra-moves',label:'五针续步',cost:35,mode:'match3',effect:5,unit:'步',description:'消消乐正在进行时增加5次真实操作'}),
 Object.freeze({id:'extra-time',label:'留香续时',cost:30,mode:'link',effect:30,unit:'秒',description:'连连看倒计时增加30秒'})
]);
const byId=id=>STORE_ITEMS.find(x=>x.id===id);
export function newParkStore(){return {version:1,events:[]}}
export function normalizeParkStore(value){
 const out=newParkStore();
 if(!value||typeof value!=='object'||!Array.isArray(value.events))return out;
 const inv=Object.fromEntries(STORE_ITEMS.map(x=>[x.id,0]));
 for(const [index,raw] of value.events.slice(0,20000).entries()){
  const item=byId(raw?.item),kind=raw?.kind;
  if(!item||!(kind==='buy'||kind==='use'))continue;
  if(kind==='use'&&inv[item.id]===0)continue;
  inv[item.id]+=kind==='buy'?1:-1;
  // Preserve original ledger on disk and assign stable IDs to pre-cloud events.
  // New buys/uses carry unique IDs so two offline clients can dedupe without
  // generating duplicate refunds during cloud merge.
  const id=typeof raw.id==='string'&&/^[a-zA-Z0-9:_-]{6,110}$/.test(raw.id)
   ?raw.id:'legacy:'+index+':'+kind+':'+item.id;
  const at=Number.isSafeInteger(raw.at)&&raw.at>0?raw.at:0;
  out.events.push({kind,item:item.id,id,at});
 }
 return out;
}
export function earnedMemoryPoints(memorySave){
 const memory=sanitizeSave(memorySave);
 return Object.values(memory.levels).reduce((sum,result)=>sum+20+result.stars*10,0);
}
export function earnedParkPoints(save,memorySave=null){
 const clean=normalizeParkSave(save);
 const newGames=PARK_MODES.filter(m=>m.id!=='memory').reduce((total,mode)=>
  total+Object.values(clean.results[mode.id]||{}).reduce((sum,result)=>sum+20+result.stars*10,0),0);
 return newGames+earnedMemoryPoints(memorySave);
}
export function spentParkPoints(store){
 return normalizeParkStore(store).events.reduce((sum,entry)=>sum+(entry.kind==='buy'?byId(entry.item).cost:0),0);
}
export function parkPointBalance(save,store,memorySave=null){
 return Math.max(0,earnedParkPoints(save,memorySave)-spentParkPoints(store));
}
export function parkInventory(store,itemId){
 if(!byId(itemId))return 0;
 return normalizeParkStore(store).events.reduce((sum,entry)=>
  entry.item!==itemId?sum:sum+(entry.kind==='buy'?1:-1),0);
}
let operationCounter=0;
function newOperationId(){
 operationCounter++;
 const random=globalThis.crypto?.randomUUID?.();
 return 'op_'+(random||Date.now().toString(36)+'_'+operationCounter+'_'+Math.random().toString(36).slice(2,14));
}
export function purchaseParkItem(store,save,itemId,memorySave=null){
 const item=byId(itemId);if(!item)throw Error('未知道具');
 const next=normalizeParkStore(store);
 if(earnedParkPoints(save,memorySave)-spentParkPoints(next)<item.cost)throw Error('绣点不足，完成真实关卡后再来兑换');
 next.events.push({kind:'buy',item:item.id,id:newOperationId(),at:Date.now()});
 return next;
}
export function consumeParkItem(store,itemId){
 const next=normalizeParkStore(store);
 if(!byId(itemId)||parkInventory(next,itemId)<1)throw Error('没有可用的道具');
 next.events.push({kind:'use',item:itemId,id:newOperationId(),at:Date.now()});
 return next;
}
