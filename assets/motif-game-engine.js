import {canonicalRegion,matchesMotifStyle,filteredMotifs} from './library-filter-model.js';
export const GAME_SAVE_KEY='lihuaji.motif-journey.v2';
export const CHAPTERS=[
 {name:'初识花叶',subtitle:'认识一枚花，一片叶',pairs:3,preview:12,limit:180,styles:['floral','animal','nature','geometry','border','basic','floral','']},
 {name:'云间识纹',subtitle:'辨认图案的细节',pairs:4,preview:11,limit:160,styles:['nature','floral','geometry','animal','border','floral','basic','']},
 {name:'百纹寻踪',subtitle:'踏入更多文化与造型',pairs:6,preview:10,limit:140,styles:['geometry','border','animal','floral','nature','archive','basic','']},
 {name:'四海织梦',subtitle:'从花叶穿越四海',pairs:8,preview:9,limit:125,styles:['floral','animal','geometry','border','nature','archive','basic','']},
 {name:'纹样宗师',subtitle:'用记忆织就整幅图景',pairs:10,preview:8,limit:110,styles:['floral','geometry','animal','border','nature','archive','basic','']}
];
const TITLES=['花影初见','一羽轻舞','风起云纹','几何初成','锦边寻迹','素纹拾趣','枝间花语','章末试炼'];
export const LEVELS=Object.freeze(CHAPTERS.flatMap((chapter,ci)=>Array.from({length:8},(_,i)=>Object.freeze({
 number:ci*8+i+1,chapter:ci,title:TITLES[i],pairs:chapter.pairs,previewSeconds:Math.max(5,chapter.preview-(i>=6?1:0)),
 timeSeconds:Math.max(70,chapter.limit-i*3),style:chapter.styles[i]
}))));
export const FREE_PAIR_CHOICES=[3,4,6,8,10];
export function freeSettings(pairs){
 const n=Number(pairs);
 if(!FREE_PAIR_CHOICES.includes(n))throw Error('不支持的卡牌数量');
 const byPairs=CHAPTERS.find(c=>c.pairs===n);
 return {number:0,chapter:-1,title:'自由纹样挑战',pairs:n,previewSeconds:byPairs.preview,timeSeconds:byPairs.limit,style:''};
}
export function shuffleRows(rows,random=Math.random){
 const out=rows.slice();
 for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
 return out;
}
export function makeDeck(rows,pairs,random=Math.random){
 const distinct=[...new Map(rows.filter(r=>r?.id&&r?.gameImage).map(r=>[r.id,r])).values()];
 if(distinct.length<pairs)throw Error('可用于本关的独立清晰纹样不足，请尝试其他地区或风格');
 const chosen=shuffleRows(distinct,random).slice(0,pairs);
 return shuffleRows(chosen.flatMap(row=>[{...row,cardKey:row.id+'-a'},{...row,cardKey:row.id+'-b'}]),random);
}
export function normalizePlayable(patterns=[],elements=[]){
 // Historical patterns.json paths are "assets/patterns/...", whereas newly
 // drawn SVG elements use "./assets/basic-elements/...". Both are real local assets.
 const local=rows=>rows.filter(row=>!row.isWorldMotif).filter(row=>{
  const url=row.isBasicElement?row.image:row.thumbnail;
  const candidate=typeof url==='string'?url.replace(/^\.\//,''):'';
  return /^assets\/[a-zA-Z0-9_.\/-]+\.(?:webp|png|jpg|jpeg|svg)$/.test(candidate)&&!candidate.includes('..');
 }).map(row=>({...row,gameImage:'./'+(row.isBasicElement?row.image:row.thumbnail).replace(/^\.\//,''),gameSource:'本地已收录纹样'}));
 return [...new Map([...local(patterns),...local(elements)].map(row=>[row.id,row])).values()];
}
export function filterPlayable(rows,{region='',style='',keyword=''}={}){
 return filteredMotifs(rows,{region,style,keyword});
}
export function emptySave(){return {version:2,unlocked:1,levels:{},lastFree:null};}
export function sanitizeSave(input){
 const save=emptySave();
 if(!input||typeof input!=='object')return save;
 const incoming=input.levels&&typeof input.levels==='object'?input.levels:{};
 for(let i=1;i<=40;i++){
  const record=incoming[i];
  if(!record||typeof record!=='object')continue;
  const stars=Math.min(3,Math.max(0,Math.floor(Number(record.stars)||0)));
  if(!stars)continue;
  save.levels[i]={stars,score:Math.max(0,Math.floor(Number(record.score)||0)),seconds:Math.max(0,Math.floor(Number(record.seconds)||0)),moves:Math.max(0,Math.floor(Number(record.moves)||0))};
 }
 let reached=1;while(reached<=40&&save.levels[reached]?.stars>0)reached++;
 // Only a consecutive chain can unlock subsequent levels; prevents fake unlocked indexes.
 save.unlocked=Math.min(40,reached);
 if(input.lastFree&&Number.isFinite(input.lastFree.score))save.lastFree={score:Math.max(0,Math.floor(input.lastFree.score))};
 return save;
}
export function recordWin(save,level,stats){
 const result=sanitizeSave(save);
 const next={stars:stats.stars,score:stats.score,seconds:stats.elapsedSeconds,moves:stats.moves};
 if(!level.number){result.lastFree={score:Math.max(result.lastFree?.score||0,stats.score)};return result}
 if(level.number>result.unlocked)throw Error('尚未解锁此关');
 const previous=result.levels[level.number];
 if(!previous||next.stars>previous.stars||(next.stars===previous.stars&&next.score>previous.score)){
  result.levels[level.number]=next;
 }
 return sanitizeSave(result);
}
export function gradeRound(level,{moves,misses,remaining}){
 const mistakes=Math.max(0,Number(misses)||0);
 const seconds=Math.max(0,Number(remaining)||0);
 const accuracy=level.pairs/Math.max(level.pairs,Number(moves)||level.pairs);
 const timeRatio=Math.min(1,seconds/level.timeSeconds);
 const score=Math.max(100,Math.round(level.pairs*100+accuracy*300+timeRatio*250-mistakes*12));
 const stars=accuracy>=.84&&timeRatio>=.25?3:accuracy>=.62&&timeRatio>=.10?2:1;
 return {stars,score,accuracy};
}
export function safeRegionLabel(row){return canonicalRegion(row)}
