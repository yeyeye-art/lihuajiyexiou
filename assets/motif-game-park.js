import {chapterMap,bindChapterPages} from './chapter-scenes.js';
import {REGION_GROUPS,STYLE_GROUPS,canonicalRegion} from './library-filter-model.js';
import {normalizePlayable,filterPlayable} from './motif-game-engine.js';
import {PARK_MODES,PARK_SAVE_KEY,PAINTS,pickDifferent,newParkSave,normalizeParkSave,unlockedParkLevel,saveParkWin,findThree,hasMatch3Move,createMatch3,swapThreeStages,createLinkBoard,linkPath,createJigsaw,swapPuzzle,puzzleSolved,paintTargets,paintComplete,studioLevelGoal,canFinishComposition} from './motif-minigames-engine.js';
import {mountMotifJourney} from './motif-game-page.js?v=20261022-chapter-scenes';
import {worldMarkup,gardenMarkup,missionProgress} from './embroidered-world-ui.js?v=home-20261022';
import {PARK_STORE_KEY,STORE_ITEMS,newParkStore,normalizeParkStore,earnedParkPoints,parkPointBalance,parkInventory,purchaseParkItem,consumeParkItem} from './motif-park-economy.js?v=20261021-unified-reward';
import {applyReferenceArt} from './reference-art-ui.js';
import {mountReferenceHeader} from './reference-ui.js?v=20261022-art-reference';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=PAINTS;
const COVER_ART={
match3:['basic-cn-lotus-bloom','basic-fr-flower','三枚同纹 · 连成一线','01','纹样消除'],
link:['basic-sy-eightstar','basic-iq-diamond','两枚同纹 · 寻线相连','02','纹样寻线'],
jigsaw:['basic-np-lotus-stem','basic-it-tendril','移换碎片 · 还原绣图','03','纹样复原'],
color:['basic-cn-lotus-petal','basic-fr-flower','依照编号 · 分区设色','04','东方设色'],
studio:['basic-in-scroll-vine','basic-cn-lotus-bloom','一花一叶 · 自由排布','05','绣样创作'],
memory:['basic-kr-single-crane','basic-cn-lotus-petal','短暂记忆 · 翻面寻对','06','记忆探寻']
};
function cover(mode){
 const [a,b,caption,num,category]=COVER_ART[mode],base='./assets/basic-elements/';
 return '<span class="park-cover" aria-hidden="true"><span class="park-cover-ref">NO.'+num+' / '+category+'</span><span class="park-cover-art"><span class="park-cover-underlay"></span><img class="park-cover-main" src="'+base+a+'.svg" alt=""><img class="park-cover-secondary" src="'+base+b+'.svg" alt=""></span><span class="park-cover-caption">'+caption+'</span></span>';
}

const marker=i=>i===0?'金':'木';
const $=(root,selector)=>root.querySelector(selector);
const all=(root,selector)=>[...root.querySelectorAll(selector)];
function readSave(){try{return normalizeParkSave(JSON.parse(localStorage.getItem(PARK_SAVE_KEY)||'null'))}catch{return newParkSave()}}
function saveProgress(save){try{localStorage.setItem(PARK_SAVE_KEY,JSON.stringify(save));window.dispatchEvent(new Event('lihuaji:save-changed'))}catch{}}
function readStore(){try{return normalizeParkStore(JSON.parse(localStorage.getItem(PARK_STORE_KEY)||'null'))}catch{return newParkStore()}}
function saveStore(store){try{localStorage.setItem(PARK_STORE_KEY,JSON.stringify(store));window.dispatchEvent(new Event('lihuaji:save-changed'))}catch{}}
function readMemorySave(){try{return JSON.parse(localStorage.getItem('lihuaji.motif-journey.v2')||'null')}catch{return null}}
const asyncImage=url=>new Promise(resolve=>{const image=new Image();const t=setTimeout(()=>resolve(false),7000);image.onload=()=>{clearTimeout(t);resolve(image.naturalWidth>0)};image.onerror=()=>{clearTimeout(t);resolve(false)};image.src=url});
const title=(text,sub)=>'<div class="park-heading"><span>PEAR BLOSSOM · PATTERN GAME WORLD</span><h2>'+esc(text)+'</h2><p>'+esc(sub)+'</p></div>';
function selectorOptions(items){return items.map(x=>'<option value="'+esc(x.value)+'">'+esc(x.label)+'</option>').join('')}
export function mountMotifGamePark(root,{patterns=[],loadBasic=async()=>[],loadMuseum=async()=>[],verifyMuseum=async()=>({ok:false}),onLegacyScore=()=>{},isCurrent=()=>true}={}){
 const css=document.createElement('link');
 if(!document.querySelector('link[data-motif-park]')){css.rel='stylesheet';css.href='./assets/motif-game-park.css?v=20261021';css.dataset.motifPark='';document.head.append(css)}
 if(!document.querySelector('link[data-world-scene]')){const scene=document.createElement('link');scene.rel='stylesheet';scene.href='./assets/embroidered-world.css?v=wayfinding-20261021';scene.dataset.worldScene='';document.head.append(scene)}
 if(!document.querySelector('link[data-pear-garden-stage]')){const art=document.createElement('link');art.rel='stylesheet';art.href='./assets/pear-garden-stage.css?v=scene2-font-20261021';art.dataset.pearGardenStage='';art.addEventListener('load',()=>{requestAnimationFrame(()=>{if(active()&&selectedMode==='match3'&&q('#park-game-selection'))focusGardenNode()})},{once:true});document.head.append(art)}
 if(!document.querySelector('link[data-pear-match-scene]')){
  const scene=document.createElement('link');scene.rel='stylesheet';scene.href='./assets/pear-match-experience.css?v=20261021-silk-relief';scene.dataset.pearMatchScene='';document.head.append(scene);
 }
 if(!document.querySelector('link[data-motif-park-brand]')){
  const brand=document.createElement('link');brand.rel='stylesheet';brand.href='./assets/motif-park-brand.css?v=20261021-functional-store';brand.dataset.motifParkBrand='';document.head.append(brand);
 }
 if(!document.querySelector('link[data-reference-visual]')){
  const style=document.createElement('link');style.rel='stylesheet';
  style.href='./assets/reference-visuals.css?v=20261022-materials';
  style.dataset.referenceVisual='';document.head.append(style);
 }
 if(!document.querySelector('link[data-world-home]')){const style=document.createElement('link');style.rel='stylesheet';style.href='./assets/world-home.css?v=20261022';style.dataset.worldHome='';document.head.append(style)}
 let disposed=false,disposeMemory=null,sprites=normalizePlayable(patterns),basic=[],save=readSave(),store=readStore(),selectedMode='',level=1,opts={region:'',style:'',keyword:''},state=null,interval=null,activeImage=null,fullscreenCleanup=null;
 const active=()=>!disposed&&isCurrent();
 const clear=()=>{if(fullscreenCleanup){fullscreenCleanup();fullscreenCleanup=null}clearInterval(interval);interval=null;state=null;if(disposeMemory){disposeMemory();disposeMemory=null}};
 const q=selector=>$(root,selector);
 const qa=selector=>all(root,selector);
 const click=(selector,callback)=>{qa(selector).forEach(el=>el.addEventListener('click',event=>callback(el,event)))};
 const header=(name,desc)=>'<div class="park-play-heading"><button type="button" class="park-back" id="park-back">← 返回游戏大厅</button>'+title(name,desc)+'</div>';
 const note=text=>{const node=q('#park-feedback');if(node){node.textContent=text;node.hidden=!text}};
 const summary=()=>Object.values(save.results).reduce((sum,levels)=>sum+Object.keys(levels).length,0)+Object.keys(readMemorySave()?.levels||{}).length;
 const showReferenceHeader=()=>{applyReferenceArt(root);return mountReferenceHeader(root,{
  points:parkPointBalance(save,store,readMemorySave()),cleared:summary(),
  onHome:home,onShop:shop,onDuel:duel
 })};
 async function duel(){
  clear();
  root.innerHTML='<section class="motif-park ref-duel-screen" id="park-duel"></section>';
  showReferenceHeader();
  const {mountFriendDuel}=await import('./friend-duel-ui.js?v=20261022-live-lobby');
  if(!active())return;
  disposeMemory=mountFriendDuel(q('#park-duel'),{onBack:()=>{
   const url=new URL(location.href);
   if(url.searchParams.has('friendRoom')){
    url.searchParams.delete('friendRoom');history.replaceState(null,'',url);
   }
   home();
  }});
 }
 function home(){
  clear();selectedMode='';
  root.innerHTML=worldMarkup({cleared:summary(),score:Math.max(0,...Object.values(save.results).flatMap(x=>Object.values(x).map(y=>y.score||0))),blossoms:parkPointBalance(save,store,readMemorySave())});
  q('#park-shop-open').onclick=shop;
  if(q('#world-duel-open'))q('#world-duel-open').onclick=()=>void duel();
  const invitedRoom=new URLSearchParams(location.search).get('friendRoom');
  if(invitedRoom&&/^[a-f0-9-]{36}$/i.test(invitedRoom)){void duel();return;}
  // Optional native fullscreen: hides the surrounding website chrome without faking a game screen.
  const immersive=q('#world-immersive-toggle'),shell=q('#motif-game-park');
  if(immersive&&shell){
   const supported=!!(document.fullscreenEnabled&&shell.requestFullscreen);
   immersive.hidden=!supported;
   if(supported){
    const sync=()=>{if(!immersive.isConnected)return;const isFull=document.fullscreenElement===shell;
     immersive.textContent=isFull?'退出全屏':'⛶ 全屏绣境';immersive.setAttribute('aria-pressed',String(isFull))};
    immersive.onclick=async()=>{try{
     if(document.fullscreenElement===shell)await document.exitFullscreen();
     else await shell.requestFullscreen();
    }catch(err){const msg=q('#world-pan-status');if(msg)msg.textContent='当前浏览器无法进入全屏，仍可拖动地图探索'}};
    document.addEventListener('fullscreenchange',sync);
    fullscreenCleanup=()=>document.removeEventListener('fullscreenchange',sync);
    sync();
   }
  }
  click('[data-park-open]',el=>{
   selectedMode=el.dataset.parkOpen;level=unlockedParkLevel(save,selectedMode);
   selection();
  });
  const view=q('.world-viewport');
  if(view){
   // Scene navigation moves the real scrollable world; there are no decorative fake entries.
   const panStatus=q('#world-pan-status');
   const updatePan=()=>{
    const max=Math.max(0,view.scrollWidth-view.clientWidth);
    const percent=max?Math.round(view.scrollLeft/max*100):100;
    if(panStatus)panStatus.textContent=max?'绣境探索 '+percent+'%':'六大绣境 · 尽收眼底';
    qa('[data-world-pan]').forEach(btn=>{
     btn.disabled=max<=1||(Number(btn.dataset.worldPan)<0?view.scrollLeft<2:view.scrollLeft>=max-2);
    });
   };
   click('[data-world-pan]',el=>{
    const amount=Number(el.dataset.worldPan)*Math.max(250,view.clientWidth*.68);
    view.scrollBy({left:amount,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
   });
   view.addEventListener('scroll',updatePan,{passive:true});
   requestAnimationFrame(updatePan);
   const resize=new ResizeObserver(updatePan);resize.observe(view);resize.observe(view.firstElementChild);
   const previousCleanup=fullscreenCleanup;fullscreenCleanup=()=>{previousCleanup?.();resize.disconnect()};
   let pointer=null;
   view.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;
    pointer={id:e.pointerId,x:e.clientX,scroll:view.scrollLeft};
    view.setPointerCapture?.(e.pointerId);
   });
   view.addEventListener('pointermove',e=>{
    if(!pointer||e.pointerId!==pointer.id)return;
    view.scrollLeft=pointer.scroll+(pointer.x-e.clientX);
   });
   const release=()=>{pointer=null};view.addEventListener('pointerup',release);view.addEventListener('pointercancel',release);
   view.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){view.scrollLeft+=(e.key==='ArrowRight'?180:-180);e.preventDefault()}});
  }
 }

 // All purchasing and consumption is derived from the real best-star victory save.
 // The shop is intentionally local to the user's browser; it is not online currency.
 function shop(){
  clear();
  const memory=readMemorySave(),money=parkPointBalance(save,store,memory);
   const comingSoon=[
    ['灵感放大镜','basic-cn-lotus-bloom','识别可行的消除方向，尚在开发'],
    ['三连翻牌','basic-fr-flower','记忆挑战中翻开多枚绣牌，尚在开发'],
    ['换位如意','basic-iq-diamond','重新调整相邻纹样位置，尚在开发']
   ].map(([name,art,note])=>'<article class="park-shop-product ref-shop-preview">'+
    '<h3>'+name+'</h3><span class="ref-shop-art" aria-hidden="true"><img src="./assets/basic-elements/'+art+'.svg" alt=""></span>'+
    '<p>'+note+'</p><span>功能尚未开放 · 不扣绣点</span><button type="button" disabled>敬请期待</button></article>').join('');
  root.innerHTML='<section class="motif-park park-selection park-functional-shop" id="park-functional-shop">'+
   '<div class="park-play-heading"><button type="button" class="park-back" id="park-shop-back">← 返回六大绣境</button>'+
   title('积分商店','以绣为礼 · 收集灵感之物 · 真实关卡绣点兑换')+'</div>'+
   '<div class="park-shop-ledger"><strong>可用绣点 <b id="park-shop-balance">'+money+'</b></strong>'+
   '<small>累计六款游戏通关获得 '+earnedParkPoints(save,memory)+' 点 · 仅存于当前浏览器，非可充值货币</small></div>'+
   '<div class="park-shop-catalog">'+STORE_ITEMS.map(item=>'<article class="park-shop-product">'+
    '<h3>'+esc(item.label)+'</h3><span class="ref-shop-art" aria-hidden="true"><img src="./assets/basic-elements/'+(item.id==='extra-moves'?'basic-cn-lotus-petal':'basic-fr-flower')+'.svg" alt=""></span><p>'+esc(item.description)+'</p>'+
    '<span>适用：'+(item.mode==='match3'?'梨花绣田':'云水连廊')+' · 持有 <b data-shop-count="'+item.id+'">'+parkInventory(store,item.id)+'</b></span>'+
    '<button type="button" data-shop-buy="'+item.id+'" '+(money<item.cost?'disabled':'')+' aria-label="花费'+item.cost+'绣点兑换'+esc(item.label)+'">兑换 · '+item.cost+' 绣点</button>'+
    '</article>').join('')+comingSoon+'</div>'+
   '<p id="park-shop-status" class="park-shop-status" role="status">道具兑换后进入本机库存；在指定游戏的棋盘中点击使用才消耗库存。</p>'+
   '<p class="park-shop-disclosure">当前积分只来自真实关卡成绩；登录账号后可尝试云端同步。未开放道具不会扣除积分，不提供现金充值。</p></section>';
  showReferenceHeader();q('#park-shop-back').onclick=home;
  click('[data-shop-buy]',el=>{
   try{
    const next=purchaseParkItem(store,save,el.dataset.shopBuy,readMemorySave());
    saveStore(next);store=next;
    const item=STORE_ITEMS.find(x=>x.id===el.dataset.shopBuy);
    shop();
    q('#park-shop-status').textContent='兑换成功：'+item.label+'。当前库存 '+parkInventory(store,item.id)+'，尚未消耗。';
   }catch(e){q('#park-shop-status').textContent=e.message}
  });
 }
 function spendItem(id){
  try{
   const updated=consumeParkItem(store,id);
   saveStore(updated);store=updated;
   return true;
  }catch(e){note(e.message);return false}
 }
 function focusGardenNode(){
  const view=q('.world-garden-viewport'),node=q('.world-stage-node.chosen');
  if(!view||!node||!view.clientHeight)return;
  const outer=view.getBoundingClientRect(),box=node.getBoundingClientRect();
  view.style.scrollBehavior='auto';
  view.scrollTop=Math.max(0,view.scrollTop+box.top-outer.top-view.clientHeight*.48);
  view.style.scrollBehavior='';
 }
 function garden(){
  clear();if(!active())return;
  const unlocked=unlockedParkLevel(save,'match3');
  level=Math.max(1,Math.min(level,unlocked));
  const styles=[{value:'',label:'全部纹样风格'},...STYLE_GROUPS.flatMap(g=>g.styles.map(x=>({value:x.value,label:x.label})))];
  const regions=[{value:'',label:'全部文化地区'},...REGION_GROUPS.flatMap(g=>g.regions.map(x=>({value:x,label:x})))];
  root.innerHTML=gardenMarkup({save,level,available:unlocked,
   styleOptions:selectorOptions(styles),regionOptions:selectorOptions(regions),keyword:opts.keyword,region:opts.region,style:opts.style});
  showReferenceHeader();
   q('#park-region').value=opts.region;q('#park-style').value=opts.style;q('#park-query').value=opts.keyword;
  q('#park-back').onclick=home;
  click('[data-park-level]',el=>{
   const n=Number(el.dataset.parkLevel);if(n>unlocked)return;
   level=n;const scroll=q('.world-garden-viewport')?.scrollTop||0;garden();
   const view=q('.world-garden-viewport');if(view)view.scrollTop=scroll;
  });
  const availability=()=>{
   const list=choices(),needed=6;
   q('#park-count-info').textContent=list.length>=needed?'可用纹样 '+list.length+' 种 · 准备挑战':'至少需要6种纹样，请放宽筛选';
   q('#park-start').disabled=list.length<needed;
  };
  for(const [selector,key] of [['#park-region','region'],['#park-style','style'],['#park-query','keyword']])q(selector).addEventListener('input',e=>{opts[key]=e.target.value;availability()});
  availability();
  q('#park-start').onclick=()=>void startGame();
  focusGardenNode();
  requestAnimationFrame(()=>{if(active()&&q('#park-game-selection'))focusGardenNode()});
 }
 function choices(){
  const eligible=(selectedMode==='color'||selectedMode==='studio')?basic:sprites;
  const matching=filterPlayable(eligible,opts);
  // Compact board pieces must be instantly recognizable. The local stand-alone
  // SVG studies are clearer than whole historic artworks on a 6×6 game board.
  if((selectedMode==='match3'||selectedMode==='link')&&!opts.region&&!opts.keyword&&!opts.style){
   const illustrated=matching.filter(row=>row.isBasicElement);
   if(illustrated.length>=8)return illustrated;
  }
  return matching;
 }
 function selection(){
  clear();if(!active())return;
  const m=PARK_MODES.find(x=>x.id===selectedMode);
  if(!m)return home();
  if(m.id==='memory')return startMemory();
  if(m.id==='match3')return garden();
  const unlocked=unlockedParkLevel(save,m.id);
  level=Math.max(1,Math.min(level,unlocked));
  const styles=[{value:'',label:'全部纹样风格'},...STYLE_GROUPS.flatMap(g=>g.styles.map(x=>({value:x.value,label:x.label})))];
  const regions=[{value:'',label:'全部文化地区'},...REGION_GROUPS.flatMap(g=>g.regions.map(x=>({value:x,label:x})))];
  const selector='<div class="park-filters"><label>文化地区<select id="park-region">'+selectorOptions(regions)+'</select></label><label>纹样风格<select id="park-style">'+selectorOptions(styles)+'</select></label><label>搜索题材或名称<input type="search" id="park-query" placeholder="莲花、鱼纹、云纹…" value="'+esc(opts.keyword)+'"></label></div>';
  root.innerHTML='<section class="motif-park park-selection chapter-selection" id="park-game-selection"><button type="button" id="park-back" class="chapter-back">← 返回地图</button>'+chapterMap({mode:m.id,total:m.levels,unlocked,selected:level,results:save.results[m.id]||{}})+'<details class="chapter-filters"><summary>自选纹样</summary>'+selector+'</details><p class="park-feedback" id="park-feedback" role="status" hidden></p></section>';
  bindChapterPages(root);
  showReferenceHeader();q('#park-region').value=opts.region;
  q('#park-style').value=opts.style;
  q('#park-query').value=opts.keyword;
  q('#park-back').onclick=home;
  click('[data-park-level]',el=>{level=Number(el.dataset.parkLevel);selection()});
  for(const [selector,key] of [['#park-region','region'],['#park-style','style'],['#park-query','keyword']]){
   q(selector).addEventListener('input',e=>{opts[key]=e.target.value;availability()});
  }
  function availability(){
   const list=choices(),needed=m.id==='match3'?6:m.id==='link'?8:m.id==='jigsaw'?1:m.id==='color'?1:3;
   q('#park-count-info').textContent='本轮可用纹样 '+list.length+' 种 · '+(list.length>=needed?'可以开始':'至少需要 '+needed+' 种，请放宽筛选');
   q('#park-start').disabled=list.length<needed;
  }
  availability();q('#park-start').onclick=()=>void startGame();
 }
 function startMemory(){
  clear();root.innerHTML='<section class="motif-park"><div class="park-memory-nav"><button type="button" id="park-memory-return">← 回到游戏乐园</button><span>经典40关 · 云绣记忆之旅</span></div><div id="park-memory-inner"></div></section>';
  showReferenceHeader();q('#park-memory-return').onclick=home;
  disposeMemory=mountMotifJourney(q('#park-memory-inner'),{patterns,loadBasic,loadMuseum,verifyMuseum,onLegacyScore,isCurrent:active,chapterMapView:true});
 }
 async function chooseLoaded(items,count){
  const chosen=[];for(const row of pickDifferent(items,items.length)){
   if(!active()||!q('#park-loading'))return null;
   if(await asyncImage(row.gameImage))chosen.push(row);
   if(chosen.length>=count)break;
  }
  if(chosen.length<count)throw Error('这组筛选的纹样图片无法全部加载，请换个地区或题材。');
  return chosen;
 }
 // Use embroidery-specific derivatives only in Match3; all original catalog assets stay untouched.
 // Preload independent textile art, and fall back to verified study SVG if any art fails to load.
 async function prepareMatchSprites(rows){
  return Promise.all(rows.map(async row=>{
   if(!row.isBasicElement||!/^\.\/assets\/basic-elements\/basic-[a-z0-9-]+\.svg$/.test(row.gameImage))return row;
   const threadImage=row.gameImage.replace('/basic-elements/','/game-stitched-motifs/');
   return await asyncImage(threadImage)?{...row,gameImage:threadImage}:row;
  }));
 }
 async function startGame(){
  clear();const m=PARK_MODES.find(x=>x.id===selectedMode);
  const list=choices(),needed=m.id==='match3'?6:m.id==='link'?8:m.id==='jigsaw'?1:m.id==='color'?1:3;
  root.innerHTML='<section class="motif-park" id="park-loading">'+header(m.name,'正在预载本关清晰纹样，图片准备好后才开始。')+'<p class="park-loading">✿ 正在准备纹样，请勿关闭页面…</p><p class="park-feedback" id="park-feedback" role="status"></p><button id="park-cancel">返回选关</button></section>';
  q('#park-back').onclick=selection;q('#park-cancel').onclick=selection;
  try{
   const chosen=await chooseLoaded(list,m.id==='studio'?Math.min(16,list.length):needed);
   if(!chosen||!active()||!q('#park-loading'))return;
   if(m.id==='match3'){
    const silkRows=await prepareMatchSprites(chosen);
    if(!active()||!q('#park-loading'))return;
    renderMatch(silkRows);
   }
   if(m.id==='link')renderLink(chosen);
   if(m.id==='jigsaw')renderJigsaw(chosen[0]);
   if(m.id==='color')await renderColor(chosen[0]);
   if(m.id==='studio')renderStudio(chosen);
  }catch(err){if(active()&&q('#park-feedback'))note(err.message)}
 }
 function playShell(m,body,tip){
  root.innerHTML='<section class="motif-park park-playing'+(m==='match3'?' world-match-battle':'')+'" id="park-playing" data-park-mode="'+m+'">'+(m==='match3'?'<div class="world-match-garden-depth" aria-hidden="true"><img src="./assets/pear-match-workshop-depth.svg" alt="" decoding="async"></div><div class="world-match-garden-foreground" aria-hidden="true"><img src="./assets/pear-match-silk-foreground.svg" alt="" decoding="async"></div>':'')+header(PARK_MODES.find(x=>x.id===m).name,'第 '+level+' 关 · '+tip)+'<div class="park-scoreboard"><div>第 <b>'+level+'</b> 关</div><div>战绩 <b id="park-points">0</b></div><div id="park-detail"></div></div><p class="park-instructions" id="park-instructions">'+esc(tip)+'</p>'+body+'<p class="park-feedback" id="park-feedback" role="status" hidden></p></section>';
  showReferenceHeader();q('#park-back').onclick=selection;
 }
 function end(won,score,message,stars){
  const mode=selectedMode;
  const roundFacts=mode==='match3'?{moves:state?.usedMoves||0,chain:state?.maxChain||0,seconds:Math.round((performance.now()-(state?.startedAt||performance.now()))/1000)}:null;
  clear();
  const previousBest=save.results?.[mode]?.[level]?.score||0;
  let unlocked=unlockedParkLevel(save,mode),rewardGained=0;
  if(won){
   const next=saveParkWin(save,mode,level,Math.max(0,Math.round(score)),stars);
   rewardGained=earnedParkPoints(next,readMemorySave())-earnedParkPoints(save,readMemorySave());
   save=next;saveProgress(save);unlocked=unlockedParkLevel(save,mode);
  }
  const displayedStars=mode==='match3'&&won?'<span class="world-result-star-set" aria-label="获得 '+stars+' 颗星">'+Array.from({length:3},(_,i)=>'<span class="world-result-star '+(i<stars?'is-earned':'is-unearned')+'" aria-hidden="true" style="--star-index:'+i+'">'+(i<stars?'★':'☆')+'</span>').join('')+'</span>':(won?'★'.repeat(stars)+'☆'.repeat(3-stars):'☆☆☆');
  const matchStageArt=mode==='match3'?'<div class="world-result-side-art" aria-hidden="true"><img src="./assets/world-venue-match3.svg" alt=""></div>':'';
  const matchLedger=mode==='match3'?'<aside class="world-result-ledger" aria-label="真实关卡结果"><h3>绣境战绩</h3><dl><div><dt>目标分数</dt><dd>'+(420+level*70)+'</dd></div><div><dt>实际得分</dt><dd>'+Math.round(score)+'</dd></div><div><dt>星级评定</dt><dd>'+stars+' / 3</dd></div><div><dt>本次绣点</dt><dd>+'+rewardGained+'</dd></div></dl>'+(won&&score>previousBest?'<strong class="world-result-record">✿ 本关最佳成绩</strong>':'')+'</aside>':'';
  root.innerHTML='<section class="motif-park park-result'+(mode==='match3'?' world-result':'')+'" id="park-result">'+title(won?'闯关成功！':'再试一次吧',mode==='match3'?(won?'梨花绣田的绣线又点亮一段 · '+message:'在梨花绣田再试一次 · '+message):message)+matchStageArt+'<div class="park-win-symbol">'+(won?'✿':'✧')+'</div><div class="park-result-stars">'+displayedStars+'</div><div class="world-result-score"><span>第 '+String(level).padStart(2,'0')+' 关</span><strong>'+Math.round(score)+'</strong><span>本关得分</span></div>'+(won?'<div class="world-earned-reward" role="status"><span class="world-reward-petal" aria-hidden="true">✿</span><strong>绣点 +'+rewardGained+'</strong><small>本关奖励 · 可用 '+parkPointBalance(save,store,readMemorySave())+' 绣点</small></div>':'')+matchLedger+'<div class="park-result-actions"><button id="park-retry" class="park-main-action">↻ 再玩一次</button>'+(won&&level<unlocked?'<button id="park-next" class="park-main-action">'+(mode==='match3'?'点亮下一关 →':'下一关 →')+'</button>':'')+'<button id="park-map">返回选关</button><button id="park-hub">全部游戏</button></div><p class="park-disclosure">成绩已保存在本机浏览器，玩法共用纹样库但独立记录关卡。</p></section>';
  showReferenceHeader();q('#park-retry').onclick=()=>void startGame();q('#park-map').onclick=selection;q('#park-hub').onclick=home;
  if(roundFacts){
   const facts=document.createElement('div');facts.className='reference-result-facts';
   facts.innerHTML='<div>实际步数<strong>'+roundFacts.moves+'</strong></div><div>最大连锁<strong>'+roundFacts.chain+'</strong></div><div>完成用时<strong>'+String(Math.floor(roundFacts.seconds/60)).padStart(2,'0')+':'+String(roundFacts.seconds%60).padStart(2,'0')+'</strong></div>';
   q('#park-result').append(facts);
  }
  if(q('#park-next'))q('#park-next').onclick=()=>{level++;if(mode==='match3')garden();else void startGame()};
 }
 function motifGuide(rows,kind){
  const how=kind==='match3'?['先点选一枚纹样','再点击相邻图案交换位置','连成三枚相同纹样即消除']:
   ['先选中一枚纹样','再找另一枚相同图案','连线最多转两次弯，即可消除'];
  return '<aside class="park-game-guide">'+(kind==='match3'?'<details class="world-match-mobile-how"><summary>查看交换与消除规则</summary><p>先点选一枚纹样，再选相邻的一枚交换；也可直接滑动。横竖连成三枚同纹即可消除。</p></details>':'')+'<span class="park-guide-kicker">玩法说明 / HOW TO PLAY</span><ol>'+how.map((x,i)=>'<li><b>'+String(i+1).padStart(2,'0')+'</b> '+x+'</li>').join('')+'</ol><div class="park-guide-reference"><strong>本局纹样图鉴</strong><div class="park-guide-swatches">'+rows.map((r,i)=>'<span title="'+esc(r.title)+'"><img src="'+esc(r.gameImage)+'" alt="'+esc(r.title)+'"><small>'+String(i+1).padStart(2,'0')+'</small></span>').join('')+'</div></div><p>相同编号代表同一种纹样。所有图像均来自本地图录的独立元素。</p></aside>';
 }
 function renderMatch(rows){
  const width=level<=3?6:level<=7?7:8,types=rows.length,goal=420+level*70,turns=Math.max(17,24-Math.floor(level/3));
  state={board:createMatch3({width,types}),chosen:-1,moves:turns,usedMoves:0,maxChain:0,startedAt:performance.now(),score:0,goal,rows,lastEffect:null,phase:'idle',phaseIndices:[],phaseChain:0,matchSource:null,swapFrom:null,animating:false};
  const chapter='<aside class="world-match-story" aria-label="梨花绣田场景简介">'+
   '<span class="world-match-chapter">第一章 · 春绣启程</span><h3>梨花绣田</h3><h4>纹样消消乐</h4>'+
   '<p>以锦为田，以纹为花。沿梨花绣线，将相同纹样串成一幅春日锦绣。</p>'+
   '<img class="world-match-story-art" src="./assets/world-venue-match3.svg" alt="" aria-hidden="true">'+
   '<span class="world-match-seal">一针一线 · 绣见东方</span></aside>';
  const board='<div class="park-game-center world-match-stage">'+
   '<img class="world-match-wood-frame" src="./assets/pear-match-carved-frame.svg" alt="" aria-hidden="true">'+
   '<div class="park-board-overline"><span>绣纹棋盘 · MATCH THREE</span><span>轻触或滑动交换</span></div>'+
   '<div class="park-match-grid" id="park-match-grid" aria-label="消消乐可交互纹样棋盘" style="--garden-grid-size:'+width+'"></div>'+
   '<div class="world-match-effect" id="world-match-effect" aria-live="polite" aria-atomic="true"></div>'+
   '<div class="park-board-help"><button type="button" id="park-match-hint">丝线提示</button><button type="button" id="park-match-extra-moves" aria-label="消耗五针续步道具增加五步">五针续步 ×'+parkInventory(store,'extra-moves')+'</button><span class="world-match-combo" id="world-match-combo" aria-hidden="true" hidden></span>'+
   '<span id="park-hint-text">横竖三枚同纹 · 绣线相连即可消除</span></div></div>';
  const mission='<aside class="world-match-task" aria-label="真实关卡目标">'+
   '<span class="world-match-task-chapter">梨花绣田 · 第'+level+'关</span><h3>本关任务</h3>'+
   '<div id="world-match-mission">'+missionProgress(level,0,turns,goal)+'</div>'+
   '<div class="world-match-star-decor" aria-hidden="true">☆ ☆ ☆</div>'+
   '<span class="world-match-goal-foot">每一步皆有绣迹 · 达标解锁下一关</span></aside>';
  playShell('match3','<div class="world-match-experience">'+chapter+board+mission+motifGuide(rows,'match3')+'</div>',
   '先选一枚纹样，再选相邻的一枚交换。可在手机棋盘上滑动相邻纹样，三枚同纹即可消除。');

  let swipeOrigin=null,swallowGestureClick=false;
  const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  // Every frame comes from the same pure resolver as the saved score; no mock board animation.
  async function attemptSwap(a,b){
   const s=state;if(!s||s.animating)return false;
   s.chosen=-1;
   const out=swapThreeStages(s.board,a,b,width,types);
   if(!out.valid){
    s.phase='idle';draw();
    q('#park-match-grid')?.classList.add('world-no-match');
    note('这一步没有形成三连。试着交换两枚相邻的纹样，或使用丝线提示。');
    return false;
   }
   s.animating=true;
   const stillHere=()=>state===s&&active()&&!!q('#park-match-grid');
   if(!reduceMotion()){
    for(const frame of out.frames){
     if(!stillHere())return false;
     if(frame.phase==='match')s.matchSource=frame.board.slice();
     s.board=frame.board;s.phase=frame.phase;s.phaseIndices=frame.indices;s.phaseChain=frame.chain;
     s.swapFrom=frame.phase==='swap'?[a,b]:null;
     draw();
     await wait(({swap:125,match:240,clear:105,fall:170,reshuffle:200})[frame.phase]||100);
    }
   }
   if(!stillHere())return false;
   s.board=out.board;s.phase='idle';s.phaseIndices=[];s.phaseChain=0;s.matchSource=null;s.swapFrom=null;
   s.animating=false;s.moves--;s.usedMoves++;s.maxChain=Math.max(s.maxChain,out.chains);
   s.score+=out.removed*36+Math.max(0,out.chains-1)*110;
   s.lastEffect={removed:out.removed,chains:out.chains};
   draw();
   if(!window.matchMedia?.('(pointer:coarse)')?.matches){
    q('[data-match-tile="'+b+'"]')?.focus({preventScroll:true});
   }
   if(s.score>=s.goal){
    end(true,s.score,'纹样连锁消除成功！',s.moves>=turns*.5?3:s.moves>=turns*.2?2:1);
    return true;
   }
   if(s.moves<=0){end(false,s.score,'步数耗尽，试试制造更多连锁反应。',0);return true}
   note('绣线消除了 '+out.removed+' 格 · 连锁 '+out.chains+' 次！');
   return true;
  }
  // Trace silk only along genuinely matching neighboring motifs. Artwork cannot
  // modify score or block tile input; reduced-motion users skip these effects.
  function stitchTrails(grid,s){
   if(reduceMotion()||!['match','clear'].includes(s.phase)||!s.phaseIndices.length)return;
   const values=s.phase==='match'?s.board:s.matchSource;
   if(!values)return;
   const nodes=[...grid.children].slice(0,width*width);
   const bounds=grid.getBoundingClientRect();
   const centers=nodes.map(node=>{
    const r=node.getBoundingClientRect();
    return [(r.left+r.width/2-bounds.left).toFixed(1),(r.top+r.height/2-bounds.top).toFixed(1)];
   });
   const hits=new Set(s.phaseIndices);
   let lines='';
   for(const i of hits)for(const j of [i+1,i+width]){
    if(j>=values.length||!hits.has(j)||values[i]!==values[j]||(j===i+1&&i%width===width-1))continue;
    lines+='<path d="M'+centers[i][0]+' '+centers[i][1]+' L'+centers[j][0]+' '+centers[j][1]+'"/>';
   }
   const accents=[...hits].map(i=>{
    const [x,y]=centers[i];
    return '<g transform="translate('+x+' '+y+')"><circle r="4.3"/><path d="M0 -10V-6 M0 6V10 M-10 0H-6 M6 0H10"/></g>';
   }).join('');
   const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');
   layer.classList.add('world-match-thread-trails');
   layer.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);
   layer.setAttribute('preserveAspectRatio','none');
   layer.setAttribute('aria-hidden','true');
   layer.innerHTML='<g class="world-match-thread-stitch">'+lines+'</g><g class="world-match-thread-petals">'+accents+'</g>';
   grid.append(layer);
  }
  function draw(){
   if(!state)return;
   const s=state;
   q('#park-points').textContent=s.score;
   q('#park-detail').innerHTML='剩余 <b>'+s.moves+'</b> 步 · 目标 <b>'+s.goal+'</b>';
   if(q('#world-match-mission'))q('#world-match-mission').innerHTML=missionProgress(level,s.score,s.moves,s.goal);
   const grid=q('#park-match-grid');
   grid.dataset.matchPhase=s.phase;
   grid.setAttribute('aria-busy',String(s.animating));
   grid.innerHTML=s.board.map((v,i)=>{
    if(v===null)return '<span class="park-match-gap" aria-hidden="true"></span>';
    const animated=s.phaseIndices.includes(i);
    const motion=(s.phase==='match'&&animated?' world-match-vanish':'')
     +(s.phase==='swap'&&animated?' world-match-swapping':'');
    let swapStyle='';
    if(s.phase==='swap'&&s.swapFrom&&animated){
     const other=s.swapFrom[0]===i?s.swapFrom[1]:s.swapFrom[0];
     swapStyle=' style="--start-x:'+((other%width-i%width)*108)+'%;--start-y:'+(Math.floor(other/width)-Math.floor(i/width))*108+'%;--fall-row:'+Math.floor(i/width)+'"';
    }else if(s.phase==='fall')swapStyle=' style="--fall-row:'+Math.floor(i/width)+'"';
    return '<button type="button" class="park-match-tile motif-variant-'+v+' '+(s.chosen===i?'picked':'')+motion+'" data-match-tile="'+i+'"'+swapStyle+
      (s.animating?' disabled aria-disabled="true"':'')+' aria-label="第'+(i+1)+'格，'+esc(s.rows[v].title)+'" title="'+esc(s.rows[v].title)+'"><span class="park-piece-paper"><img src="'+esc(s.rows[v].gameImage)+'" alt=""></span><small class="park-piece-mark">'+String(v+1).padStart(2,'0')+'</small></button>';
   }).join('');
   stitchTrails(grid,s);
   const combo=q('#world-match-combo');
   if(combo){
    combo.hidden=!(s.phase==='match'&&s.phaseChain>1);
    combo.textContent=combo.hidden?'':'连锁绣线 ×'+s.phaseChain;
   }
   if(s.lastEffect){
    const effect=q('#world-match-effect');
    if(effect){
     effect.textContent='绣纹 +'+s.lastEffect.removed+(s.lastEffect.chains>1?' · 连锁 ×'+s.lastEffect.chains:'');
     effect.style.animation='none';void effect.offsetWidth;effect.style.animation='';
    }
    s.lastEffect=null;
   }
   q('#park-match-hint').disabled=s.animating;
   const extra=q('#park-match-extra-moves');
   extra.disabled=s.animating||parkInventory(store,'extra-moves')===0;
   extra.textContent='五针续步 ×'+parkInventory(store,'extra-moves');
   extra.onclick=()=>{
    if(s.animating||!spendItem('extra-moves'))return;
    s.moves+=5;draw();
    note('已使用五针续步，真实剩余步数增加5步。');
   };
   q('#park-match-hint').onclick=()=>{
    if(s.animating)return;
    let best=null;const w=width;
    outer:for(let i=0;i<s.board.length;i++)for(const j of [i+1,i+w]){
     if(j>=s.board.length||Math.abs(Math.floor(i/w)-Math.floor(j/w))+Math.abs(i%w-j%w)!==1||s.board[i]===s.board[j])continue;
     const candidate=s.board.slice();[candidate[i],candidate[j]]=[candidate[j],candidate[i]];
     if(findThree(candidate,w).length){best=[i,j];break outer}
    }
    if(best){best.forEach(i=>q('[data-match-tile="'+i+'"]')?.classList.add('park-hint'));q('#park-hint-text').textContent='试试交换两枚高亮的绣纹牌'}
   };
   click('[data-match-tile]',el=>{
    if(s.animating)return;
    const n=Number(el.dataset.matchTile);
    if(s.chosen<0){
     s.chosen=n;draw();
     // Rebuilding the real board replaces its buttons; preserve keyboard focus.
     q('[data-match-tile="'+n+'"]')?.focus({preventScroll:true});
     return;
    }
    const before=s.chosen;
    attemptSwap(before,n);
   });
  }
  draw();
  const grid=q('#park-match-grid');
  // Native keyboard arrows navigate the woven grid, Enter/Space still activate
  // the buttons, and Escape cancels selection. No hidden fake board is needed.
  grid.addEventListener('keydown',event=>{
   const tile=event.target.closest('[data-match-tile]');
   if(!tile||state?.animating)return;
   const index=Number(tile.dataset.matchTile);
   if(event.key==='Escape'){
    event.preventDefault();
    state.chosen=-1;
    draw();
    q('[data-match-tile="'+index+'"]')?.focus({preventScroll:true});
    return;
   }
   const moves={ArrowLeft:-1,ArrowRight:1,ArrowUp:-width,ArrowDown:width};
   if(!(event.key in moves))return;
   const next=index+moves[event.key];
   if(next<0||next>=width*width||!((Math.abs(Math.floor(index/width)-Math.floor(next/width))+Math.abs(index%width-next%width))===1))return;
   event.preventDefault();
   q('[data-match-tile="'+next+'"]')?.focus({preventScroll:true});
  });
  // A drag may generate one follow-on click. Ignore ONLY that click, never later rapid clicks.
  // New real pointerdown clears this flag, and keyboard clicks (detail=0) are unaffected.
  grid.addEventListener('click',event=>{
   if(swallowGestureClick&&event.detail>0){event.preventDefault();event.stopImmediatePropagation()}
   swallowGestureClick=false;
  },true);
  // The tiles may be redrawn after every turn; gesture handling remains on this stable parent.
  grid.addEventListener('pointerdown',event=>{
   swallowGestureClick=false;
   const tile=event.target.closest('[data-match-tile]');
   if(!tile || event.button!==0 || !state || state.animating)return;
   swipeOrigin={id:event.pointerId,from:Number(tile.dataset.matchTile),x:event.clientX,y:event.clientY,tile,captured:false};
   // Ordinary taps stay native buttons. Capture only after a real move crosses
   // the drag threshold, so releasing above another tile (or outside the board)
   // cannot lose pointerup; this also works after keyboard re-rendering.
  });
  grid.addEventListener('pointermove',event=>{
   const origin=swipeOrigin;
   if(!origin||origin.id!==event.pointerId||origin.captured||!state||state.animating)return;
   if(Math.max(Math.abs(event.clientX-origin.x),Math.abs(event.clientY-origin.y))<12)return;
   if(origin.tile?.isConnected&&origin.tile.setPointerCapture){
    try{origin.tile.setPointerCapture(event.pointerId);origin.captured=true}catch{}
   }
  });
  grid.addEventListener('pointerup',event=>{
   if(!swipeOrigin||swipeOrigin.id!==event.pointerId||!state||state.animating)return;
   const origin=swipeOrigin;swipeOrigin=null;
   const dx=event.clientX-origin.x,dy=event.clientY-origin.y;
   if(Math.max(Math.abs(dx),Math.abs(dy))<18)return; // A short tap stays a normal button click.
   const offset=Math.abs(dx)>=Math.abs(dy)?(dx>0?1:-1):(dy>0?width:-width);
   const target=origin.from+offset;
   // Swallow only this drag's synthesized click, without throttling future selections.
   swallowGestureClick=true;
   event.preventDefault();
   if(target<0||target>=width*width||Math.abs(Math.floor(origin.from/width)-Math.floor(target/width))+Math.abs(origin.from%width-target%width)!==1){
    note('请沿行或列向相邻纹样滑动。');
    return;
   }
   attemptSwap(origin.from,target);
  });
  grid.addEventListener('pointercancel',()=>{swipeOrigin=null});
 } 
 function renderLink(rows){
  const width=6,board=createLinkBoard(width,8),timer=Math.max(125,230-level*4);
  state={board,selected:-1,pairs:0,score:0,seconds:timer,rows,width};
  playShell('link','<div class="park-game-layout"><div class="park-game-center"><div class="park-board-overline"><span>寻线棋盘 / CONNECT TWO</span><span>找相同 → 连成一线</span></div><div class="park-link-board"><div class="park-link-grid" id="park-link-grid"></div></div><div class="park-board-help"><button type="button" id="park-link-hint">提示一对</button><button type="button" id="park-link-extra-time" aria-label="消耗留香续时道具增加30秒">留香续时 ×'+parkInventory(store,'extra-time')+'</button><span id="park-link-tip">请点选两枚相同图案，正确配对会显示连线路径</span></div></div>'+motifGuide(rows,'link')+'</div>','选两枚相同纹样，只要连接线不超过两次转弯就能消除。');
  function draw(){
   if(!state)return;const s=state;
   q('#park-points').textContent=s.score;q('#park-detail').innerHTML='已消 <b>'+s.pairs+'/18</b> 对 · 剩余 <b id="park-link-time">'+s.seconds+'</b> 秒';
   q('#park-link-grid').innerHTML=s.board.map((v,i)=>v===null?'<span class="park-link-empty" aria-hidden="true"></span>':'<button type="button" class="park-link-tile motif-variant-'+v+' '+(s.selected===i?'picked':'')+'" data-link-tile="'+i+'" title="'+esc(s.rows[v].title)+'" aria-label="第'+(i+1)+'格，'+esc(s.rows[v].title)+'"><span class="park-piece-paper"><img src="'+esc(s.rows[v].gameImage)+'" alt=""></span><small class="park-piece-mark">'+String(v+1).padStart(2,'0')+'</small></button>').join('');
   const booster=q('#park-link-extra-time');
   booster.disabled=parkInventory(store,'extra-time')===0;
   booster.textContent='留香续时 ×'+parkInventory(store,'extra-time');
   booster.onclick=()=>{
    if(!spendItem('extra-time'))return;
    s.seconds+=30;
    draw();
    note('已使用留香续时，真实倒计时增加30秒。');
   };
   q('#park-link-hint').onclick=()=>{
    let best=null;
    outer:for(let i=0;i<s.board.length;i++)for(let j=i+1;j<s.board.length;j++){
     if(s.board[i]!==null&&s.board[i]===s.board[j]&&linkPath(s.board,i,j,width)){best=[i,j];break outer}
    }
    if(best){best.forEach(i=>q('[data-link-tile="'+i+'"]')?.classList.add('park-hint'));q('#park-link-tip').textContent='试试连接两枚高亮的纹样'}
    else q('#park-link-tip').textContent='暂时没有可消除的组合，可以返回选关重试';
   };
   click('[data-link-tile]',el=>{
    const n=Number(el.dataset.linkTile);if(s.selected<0){s.selected=n;draw();return}
    const a=s.selected;s.selected=-1;
    const route=linkPath(s.board,a,n,width);
    if(!route){draw();note('这两块纹样无法在两次转弯内连接，请再试一次。');return}
    const grid=q('#park-link-grid'),bounds=grid.getBoundingClientRect();
    const tiles=[a,n].map(i=>q('[data-link-tile="'+i+'"]')?.getBoundingClientRect());
    s.board[a]=null;s.board[n]=null;s.pairs++;s.score+=90+Math.max(0,3-route.length)*4;
    if(s.pairs===18){end(true,s.score+s.seconds*4,'全部纹样已成功连接！',s.seconds>=timer*.55?3:s.seconds>=timer*.25?2:1);return}
    draw();note('连线成功！已消除 '+s.pairs+' / 18 对');
    const board=q('.park-link-board');if(board&&tiles[0]&&tiles[1]){
     const layer=document.createElement('svg');layer.classList.add('park-link-route-flash');layer.setAttribute('viewBox','0 0 '+Math.max(bounds.width,1)+' '+Math.max(bounds.height,1));
     // Map BFS grid coordinates to real tile pitch; includes the legal perimeter.
     const pitchX=bounds.width/width,pitchY=bounds.height/width;
     const d=route.map(([r,c],i)=>(i?'L':'M')+((c-.5)*pitchX).toFixed(1)+' '+((r-.5)*pitchY).toFixed(1)).join(' ');
     layer.innerHTML='<path d="'+d+'" />';
     board.append(layer);setTimeout(()=>layer.remove(),420);
    }
   });
  }draw();
  interval=setInterval(()=>{if(!active()||!state)return;
   state.seconds--;const span=q('#park-link-time');if(span)span.textContent=state.seconds;
   if(state.seconds<=0)end(false,state.score,'时间结束，继续练习观察路径。',0);
  },1000);
 }
 function renderJigsaw(row){
  const size=level<=5?3:level<=12?4:5,original=createJigsaw(size);
  state={slots:original,selected:-1,moves:0,size,row};
  const img=esc(row.gameImage);
  playShell('jigsaw','<div class="park-jigsaw-layout"><div class="park-jigsaw-grid" id="park-jigsaw-grid" style="--piece-count:'+size+'"></div><aside class="park-jigsaw-reference"><span>原始绣样参考</span><img src="'+img+'" alt="'+esc(row.title)+'"><small>'+esc(row.title)+'</small></aside></div>','点击两块拼图交换位置；桌面端也可拖动交换。');
  function swap(a,b){
   if(a===b)return;state.slots=swapPuzzle(state.slots,a,b);state.moves++;
   if(puzzleSolved(state.slots)){end(true,Math.max(100,1200-state.moves*22),'完整绣样复原成功！',state.moves<=size*size*2?3:state.moves<=size*size*4?2:1);return}
   draw();
  }
  function draw(){
   if(!state)return;const s=state;
   q('#park-points').textContent=Math.max(0,1200-s.moves*22);q('#park-detail').innerHTML='交换次数 <b>'+s.moves+'</b>';
   q('#park-jigsaw-grid').innerHTML=s.slots.map((piece,slot)=>{
    const x=piece%size,y=Math.floor(piece/size),pct=size<=1?0:100/(size-1);
    return '<button type="button" draggable="true" data-jigsaw-slot="'+slot+'" class="park-jigsaw-tile '+(s.selected===slot?'picked':'')+'" style="background-image:url(&quot;'+img+'&quot;);background-size:'+(size*100)+'% '+(size*100)+'%;background-position:'+(x*pct)+'% '+(y*pct)+'%" aria-label="第'+(slot+1)+'格拼图"></button>';
   }).join('');
   click('[data-jigsaw-slot]',el=>{const i=Number(el.dataset.jigsawSlot);if(s.selected<0){s.selected=i;draw()}else{const a=s.selected;s.selected=-1;swap(a,i)}});
   qa('[data-jigsaw-slot]').forEach(el=>{
    el.ondragstart=e=>{e.dataTransfer.setData('text/plain',el.dataset.jigsawSlot)};
    el.ondragover=e=>e.preventDefault();
    el.ondrop=e=>{e.preventDefault();const source=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(source))swap(source,Number(el.dataset.jigsawSlot))};
   });
  }draw();
 }
 async function renderColor(row){
  // Whitelisted vector primitives from our own bundled independent SVG drawings.
  // This intentionally avoids modifying or republishing external museum artwork.
  const res=await fetch(row.gameImage),xml=await res.text();if(!active()||!q('#park-loading'))return;
  if(!res.ok||/<script|<foreignObject|\\bon\\w+\\s*=|<image/i.test(xml))throw Error('纹样矢量图校验失败');
  const parsed=new DOMParser().parseFromString(xml,'image/svg+xml');
  const source=parsed.querySelector('svg'),nodes=[...parsed.querySelectorAll('path,circle,ellipse,polygon,rect')].slice(0,Math.min(18,4+level));
  if(!source||nodes.length<2)throw Error('这件纹样暂不适合分区填色，请换一张');
  const targets=paintTargets(nodes.length,level-1);state={row,targets,answers:Array(nodes.length).fill(-1),selectedColor:0,mistakes:0};
  playShell('color','<div class="park-color-layout"><div class="park-color-work"><h3>请将编号对应的颜色填入线描纹样</h3><div id="park-color-canvas" class="park-color-canvas"></div></div><aside><div class="park-color-preview"><img src="'+esc(row.gameImage)+'" alt="'+esc(row.title)+'"><span>原始简化线描 · '+esc(row.title)+'</span></div><div class="park-palette" id="park-color-palette"></div><p class="park-color-hint">选中颜色，再点击图中相应编号的区域。底稿为现代教学SVG重绘，并非馆藏原图。</p></aside></div>','给图案不同部位填上对应色彩，完成属于你的绣纹配色。');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',source.getAttribute('viewBox')||'0 0 200 200');svg.setAttribute('role','img');svg.setAttribute('aria-label',row.title+' 可点击填色纹样');
  nodes.forEach((node,i)=>{
   const copy=document.createElementNS(svg.namespaceURI,node.tagName.toLowerCase());
   for(const attr of ['d','cx','cy','r','rx','ry','x','y','width','height','points'])if(node.hasAttribute(attr))copy.setAttribute(attr,node.getAttribute(attr));
   copy.setAttribute('fill','#fffef6');copy.setAttribute('stroke','#516c5c');copy.setAttribute('stroke-width','3');copy.setAttribute('stroke-linejoin','round');copy.setAttribute('stroke-linecap','round');copy.setAttribute('data-paint-part',String(i));copy.style.cursor='pointer';
   svg.append(copy);
   copy.addEventListener('click',()=>paint(i));
  });
  q('#park-color-canvas').append(svg);
  const labels=[];
  function draw(){
   if(!state)return;const s=state;q('#park-points').textContent=s.answers.filter(x=>x>=0).length*100;
   q('#park-detail').innerHTML='已填色 <b>'+s.answers.filter(x=>x>=0).length+'/'+s.targets.length+'</b> 处';
   q('#park-color-palette').innerHTML=PAINTS.map((color,i)=>'<button type="button" data-color-choice="'+i+'" class="'+(s.selectedColor===i?'selected':'')+'" style="--paint-color:'+color+'" aria-label="第'+(i+1)+'号颜料"><b>'+(i+1)+'</b></button>').join('');
   click('[data-color-choice]',el=>{s.selectedColor=Number(el.dataset.colorChoice);draw()});
   labels.forEach((label,i)=>{label.textContent=s.answers[i]>=0?'':String(s.targets[i]+1)});
  }
  function paint(i){
   const s=state;if(!s||s.answers[i]>=0)return;
   if(s.selectedColor!==s.targets[i]){s.mistakes++;note('请使用第 '+(s.targets[i]+1)+' 号颜料填这一处。');return}
   s.answers[i]=s.selectedColor;svg.querySelector('[data-paint-part="'+i+'"]').setAttribute('fill',PAINTS[s.selectedColor]);draw();
   if(paintComplete(s.answers,s.targets))end(true,Math.max(100,s.targets.length*100-s.mistakes*20),'纹样上色成功！色彩来自梨花季原创教学色卡。',s.mistakes<=2?3:s.mistakes<=6?2:1);
  }
  requestAnimationFrame(()=>{if(!state||!q('#park-color-canvas'))return;[...svg.children].forEach((child,i)=>{let box;try{box=child.getBBox()}catch{return}
   const t=document.createElementNS(svg.namespaceURI,'text');t.setAttribute('x',box.x+box.width/2);t.setAttribute('y',box.y+box.height/2+3);t.setAttribute('text-anchor','middle');t.setAttribute('font-size','12');t.setAttribute('font-weight','700');t.setAttribute('pointer-events','none');t.setAttribute('fill','#597261');t.textContent=String(targets[i]+1);svg.append(t);labels.push(t);
  });draw()});
 }
 function renderStudio(rows){
  state={rows,items:[],selected:-1};
  const goal=studioLevelGoal(level);
  const thumb=row=>'<img src="'+esc(row.gameImage)+'" alt="">';
  playShell('studio','<div class="park-studio-layout"><aside class="park-studio-tools"><h3>绣纹素材盒</h3><p>第'+level+'关 · 至少'+goal.minItems+'件，包含'+goal.minKinds+'种不同纹样</p><div class="park-studio-catalog">'+rows.map((row,i)=>'<button type="button" data-studio-add="'+i+'" title="'+esc(row.title)+'">'+thumb(row)+'<span>'+esc(row.title)+'</span></button>').join('')+'</div><p class="park-color-hint">素材仅来自独立SVG教学重绘；组合为现代原创设计。</p></aside><div class="park-studio-work"><div class="park-studio-stage" id="park-studio-stage" aria-label="可编辑绣纹创作画布"></div><div class="park-studio-controls"><button id="park-studio-rotate">↻ 旋转30°</button><button id="park-studio-grow">＋ 放大</button><button id="park-studio-shrink">－ 缩小</button><button id="park-studio-remove">移除</button></div><div class="park-studio-actions"><button class="park-main-action" id="park-studio-finish">✿ 完成绣样</button><button id="park-studio-download">下载PNG作品</button></div></div></div>','点击添加纹样，拖动摆放；组合至少3个元素且包含2种不同纹样才能完成。');
  const stage=q('#park-studio-stage');
  function refresh(){
   const s=state;if(!s)return;
   stage.innerHTML=s.items.map((item,i)=>'<button class="park-studio-item '+(i===s.selected?'selected':'')+'" data-studio-item="'+i+'" style="left:'+(item.x*100)+'%;top:'+(item.y*100)+'%;width:'+(item.size*100)+'%;transform:translate(-50%,-50%) rotate('+item.angle+'deg)" aria-label="'+esc(item.title)+'，拖动改变位置"><img src="'+esc(item.src)+'" draggable="false" alt=""></button>').join('');
   q('#park-points').textContent=s.items.length*100;
   q('#park-detail').innerHTML='已放置 <b>'+s.items.length+'</b> 件元素';
   let drag=null;
   qa('[data-studio-item]').forEach(el=>{
    el.onpointerdown=e=>{const i=Number(el.dataset.studioItem);s.selected=i;drag={i,x:e.clientX,y:e.clientY,moved:false};el.setPointerCapture?.(e.pointerId);};
    el.onpointermove=e=>{if(!drag||!s.items[drag.i])return;const rect=stage.getBoundingClientRect(),it=s.items[drag.i];if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>2)drag.moved=true;
     it.x=Math.min(.95,Math.max(.05,it.x+(e.clientX-drag.x)/rect.width));it.y=Math.min(.95,Math.max(.05,it.y+(e.clientY-drag.y)/rect.height));drag.x=e.clientX;drag.y=e.clientY;
     el.style.left=it.x*100+'%';el.style.top=it.y*100+'%';
    };
    el.onpointerup=()=>{drag=null;refresh()};
    el.onclick=()=>{s.selected=Number(el.dataset.studioItem);refresh()};
   });
  }
  click('[data-studio-add]',el=>{
   const row=rows[Number(el.dataset.studioAdd)],n=state.items.length;
   if(n>=16){note('一幅绣样最多可摆放16件元素。');return}
   state.items.push({id:row.id,title:row.title,src:row.gameImage,x:.28+(n%4)*.14,y:.28+Math.floor(n/4)*.13,size:.26,angle:0});state.selected=n;refresh()
  });
  q('#park-studio-rotate').onclick=()=>modify(it=>{it.angle=(it.angle+30)%360});
  q('#park-studio-grow').onclick=()=>modify(it=>{it.size=Math.min(.65,it.size+.05)});
  q('#park-studio-shrink').onclick=()=>modify(it=>{it.size=Math.max(.12,it.size-.05)});
  q('#park-studio-remove').onclick=()=>{if(state.selected<0)return;state.items.splice(state.selected,1);state.selected=Math.min(state.selected,state.items.length-1);refresh()};
  function modify(fn){if(state.selected<0){note('请先选中画布中的一枚纹样');return}fn(state.items[state.selected]);refresh()}
  q('#park-studio-download').onclick=()=>void exportComposition();
  q('#park-studio-finish').onclick=()=>{
   if(!canFinishComposition(state.items,goal.minItems,goal.minKinds)){note('本关至少需要'+goal.minItems+'件纹样、'+goal.minKinds+'种不同元素。');return}
   const variety=new Set(state.items.map(x=>x.id)).size,score=state.items.length*120+variety*90;
   end(true,score,'你完成了属于自己的现代创意绣样！',variety>=3&&state.items.length>=5?3:variety>=2&&state.items.length>=4?2:1);
  };
  async function exportComposition(){
   if(!state?.items.length){note('请先往画布里添加纹样');return}
   const c=document.createElement('canvas');c.width=1000;c.height=1000;const ctx=c.getContext('2d');
   ctx.fillStyle='#fbf9ee';ctx.fillRect(0,0,1000,1000);
   for(const item of state.items){
    const img=new Image();await new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;img.src=item.src});
    if(!img.naturalWidth)continue;
    ctx.save();ctx.translate(item.x*1000,item.y*1000);ctx.rotate(item.angle*Math.PI/180);const size=item.size*1000;ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();
   }
   ctx.fillStyle='#597463';ctx.textAlign='center';ctx.font='24px serif';ctx.fillText('梨花季 · 原创纹样组合练习',500,965);
   c.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='lihuaji-motif-composition.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000)},'image/png');
  }
  refresh();
 }
 void (async()=>{try{const basics=await loadBasic();if(!active())return;basic=normalizePlayable([],basics);sprites=normalizePlayable(patterns,basics);if(q('#park-game-selection'))selection()}catch(err){console.warn('独立SVG加载不完整；经典图录仍可使用',err)}})();
 home();
 return ()=>{disposed=true;clear()};
}
