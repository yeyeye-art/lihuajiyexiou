// Deterministic save reconciliation. Never modify the existing three legacy keys
// in-place until cloud operations complete and a user has explicitly chosen import.
import {normalizeParkSave,PARK_MODES} from './motif-minigames-engine.js';
import {sanitizeSave} from './motif-game-engine.js';
import {normalizeParkStore,earnedParkPoints,spentParkPoints} from './motif-park-economy.js';
export const GAME_SAVE_KEYS=Object.freeze({
 park:'lihuaji.motif-park.v1',
 memory:'lihuaji.motif-journey.v2',
 store:'lihuaji.motif-store.v1'
});
const clone=x=>JSON.parse(JSON.stringify(x));
export function blankCloudSave(){
 return {park:normalizeParkSave(null),memory:sanitizeSave(null),store:normalizeParkStore(null)};
}
export function normalizeCloudSave(input){
 return {park:normalizeParkSave(input?.park),memory:sanitizeSave(input?.memory),store:normalizeParkStore(input?.store)};
}
export function snapshotFromStorage(storage){
 const data={};for(const [kind,key] of Object.entries(GAME_SAVE_KEYS)){
  try{data[kind]=JSON.parse(storage.getItem(key)||'null')}catch{data[kind]=null}
 }
 return normalizeCloudSave(data);
}
export function installStorageSnapshot(storage,snapshot){
 const s=normalizeCloudSave(snapshot);
 // Write each old key without changing its schema. Keep the old save format.
 for(const [kind,key] of Object.entries(GAME_SAVE_KEYS))storage.setItem(key,JSON.stringify(s[kind]));
 return s;
}
export function hasGuestProgress(snapshot){
 const s=normalizeCloudSave(snapshot);
 return Object.values(s.park.results).some(x=>Object.keys(x).length>0)||
  Object.keys(s.memory.levels).length>0||s.store.events.length>0;
}
function best(a,b){
 if(!a)return b?clone(b):null;if(!b)return clone(a);
 return b.stars>a.stars||(b.stars===a.stars&&b.score>a.score)?clone(b):clone(a);
}
export function mergeCloudSave(base,incoming){
 const a=normalizeCloudSave(base),b=normalizeCloudSave(incoming);
 const merged=blankCloudSave();
 for(const mode of PARK_MODES){
  if(mode.id==='memory')continue;
  const rows={};
  for(let i=1;i<=mode.levels;i++){
   const chosen=best(a.park.results[mode.id]?.[i],b.park.results[mode.id]?.[i]);
   if(chosen)rows[i]=chosen;
  }
  if(Object.keys(rows).length)merged.park.results[mode.id]=rows;
 }
 const levels={};
 for(let level=1;level<=40;level++){
  const chosen=best(a.memory.levels[level],b.memory.levels[level]);
  if(chosen)levels[level]=chosen;
 }
 merged.memory=sanitizeSave({version:2,levels,
  lastFree:(a.memory.lastFree?.score||0)>=(b.memory.lastFree?.score||0)?a.memory.lastFree:b.memory.lastFree});
 const entries=new Map();
 for(const e of [...a.store.events,...b.store.events]){
  if(!entries.has(e.id))entries.set(e.id,clone(e));
  else if(entries.get(e.id).kind!==e.kind||entries.get(e.id).item!==e.item){
   return {ok:false,reason:'积分交易编号冲突，请保留本机存档并重新同步',save:null};
  }
 }
 const events=[...entries.values()].sort((x,y)=>(x.at||0)-(y.at||0)||x.id.localeCompare(y.id));
 const nextStore=normalizeParkStore({events});
 if(nextStore.events.length!==events.length)
  return {ok:false,reason:'道具消费记录发生冲突；为防止重复领取，未覆盖任何存档',save:null};
 merged.store=nextStore;
 if(spentParkPoints(merged.store)>earnedParkPoints(merged.park,merged.memory))
  return {ok:false,reason:'跨设备购买超出累计绣点；为了保护积分，未覆盖存档',save:null};
 return {ok:true,save:merged,reason:null};
}
export function encodeSnapshot(snapshot){return clone(normalizeCloudSave(snapshot))}
