import {chapterMap,bindChapterPages} from './chapter-scenes.js';
import {REGION_GROUPS,STYLE_GROUPS,canonicalRegion,matchesMotifStyle} from './library-filter-model.js';
import {GAME_SAVE_KEY,CHAPTERS,LEVELS,FREE_PAIR_CHOICES,freeSettings,shuffleRows,makeDeck,normalizePlayable,filterPlayable,emptySave,sanitizeSave,recordWin,gradeRound} from './motif-game-engine.js';
import {renderVerticalJourney,currentMission} from './motif-arcade-map.js?v=20261021-arcade-map2';
import {earnedMemoryPoints} from './motif-park-economy.js?v=20261021-unified-reward';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtTime=seconds=>{const n=Math.max(0,Math.ceil(seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
const capName=name=>String(name||'').slice(0,42);
const DEFAULT_FREE={region:'',style:'element',keyword:'',pairs:3};
function readSave(){try{return sanitizeSave(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)||'null'))}catch{return emptySave()}}
function saveProgress(save){try{localStorage.setItem(GAME_SAVE_KEY,JSON.stringify(save));window.dispatchEvent(new Event('lihuaji:save-changed'))}catch{}}
function loadImage(src,timeout=9000){return new Promise(resolve=>{const image=new Image();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(t);image.onload=null;image.onerror=null;resolve(ok)};const t=setTimeout(()=>finish(false),timeout);image.onload=()=>finish(image.naturalWidth>0);image.onerror=()=>finish(false);image.src=src;if(image.complete)finish(image.naturalWidth>0)})}
export function mountMotifJourney(root,{patterns=[],loadBasic=async()=>[],loadMuseum=async()=>[],verifyMuseum=async()=>({ok:false}),onLegacyScore=()=>{},isCurrent=()=>true,chapterMapView=false}={}){
 const link=document.createElement('link');if(!document.querySelector('link[data-motif-game]')){link.rel='stylesheet';link.href='./assets/motif-game.css?v=20261021';link.dataset.motifGame='';document.head.append(link)}
 if(!document.querySelector('link[data-motif-arcade]')){const arcade=document.createElement('link');arcade.rel='stylesheet';arcade.href='./assets/motif-arcade.css?v=20261021-stage-hit-target';arcade.dataset.motifArcade='';arcade.addEventListener('load',()=>{requestAnimationFrame(()=>{if(live()&&mode==='journey')scrollCurrentNode()})},{once:true});document.head.append(arcade)}
 let disposed=false,save=readSave(),nativeRows=normalizePlayable(patterns),museumRows=[],museumLoading=false,basicReady=Promise.resolve(),mode='journey',selectedLevel=Math.min(save.unlocked,40),free={...DEFAULT_FREE},round=null,interval=0,delay=0,secondsLeft=0,lastTick=0,selectedTheme='';
 const live=()=>!disposed&&isCurrent();
 const q=s=>root.querySelector(s);
 const qa=s=>[...root.querySelectorAll(s)];
 function scrollCurrentNode(){
  if(!live())return;
  const scroller=q('.mg-map-scroll'),active=q('.mg-route-node.selected');
  if(!scroller||!active)return;
  // Measure real CSS-painted positions after the page stylesheet is available;
  // a Github Pages cold cache may load styles after the initial DOM insertion.
  const outer=scroller.getBoundingClientRect(),node=active.getBoundingClientRect();
  if(!scroller.clientHeight||!node.height)return;
  const target=scroller.scrollTop+node.top-outer.top-scroller.clientHeight*.58;
  scroller.style.scrollBehavior='auto';
  scroller.scrollTop=Math.max(0,target);
  scroller.style.scrollBehavior='';
 }
 const tickStop=()=>{clearInterval(interval);interval=0};
 const delayStop=()=>{clearTimeout(delay);delay=0};
 const clearRound=()=>{tickStop();delayStop();round=null};
 const notify=(message,warning=false)=>{const el=q('#motif-game-message');if(el){el.textContent=message;el.classList.toggle('warning',warning)}};
 const rowsAll=()=>[...nativeRows,...museumRows];
 const countFilter=filter=>filterPlayable(rowsAll(),filter).length;
 const styleOptions=()=>STYLE_GROUPS.map(group=>{
  const entries=group.styles.map(s=>({name:s.label,value:s.value,count:countFilter({style:s.value})})).filter(x=>x.count>0);
  return entries.length?'<optgroup label="'+esc(group.label)+'">'+entries.map(s=>'<option value="'+esc(s.value)+'">'+esc(s.name)+' · '+s.count+'</option>').join('')+'</optgroup>':'';
 }).join('');
 const regionOptions=()=>{
  const counts=new Map();for(const item of rowsAll())counts.set(canonicalRegion(item),(counts.get(canonicalRegion(item))||0)+1);
  const used=new Set();
  let output='';
  for(const g of REGION_GROUPS){const options=g.regions.filter(r=>counts.has(r));if(!options.length)continue;
   output+='<optgroup label="'+esc(g.label)+'">'+options.map(r=>{used.add(r);return '<option value="'+esc(r)+'">'+esc(r)+' · '+counts.get(r)+'</option>'}).join('')+'</optgroup>';
  }
  for(const [r,n] of counts)if(!used.has(r))output+='<option value="'+esc(r)+'">'+esc(r)+' · '+n+'</option>';
  return output;
 };
 const saveCount=()=>Object.keys(save.levels).filter(k=>save.levels[k].stars>0).length;
 const starsDisplay=n=>'★'.repeat(n)+'☆'.repeat(3-n);
 function lobby(){
  if(!live())return;clearRound();
  root.innerHTML=`<section class="motif-game mg-arcade-home ${chapterMapView?'chapter-memory':''}" id="motif-game-home">
    <div class="mg-arcade-hero">
      <div class="mg-arcade-titlebox">
        <div class="mg-arcade-topline"><span class="mg-arcade-kite" aria-hidden="true">✿</span><span>PEAR BLOSSOM · MEMORY ADVENTURE</span></div>
        <h1>纹样<span>奇遇记</span></h1>
        <p class="mg-arcade-subtitle">踏上云端的绣纹之旅 · 记忆配对，逐关登顶</p>
      </div>
      <div class="mg-arcade-hud" aria-label="闯关进度">
        <div class="mg-hud-pill"><span aria-hidden="true">✦</span><div><strong>${saveCount()}<small>/40</small></strong><em>通关进度</em></div></div>
        <div class="mg-hud-pill"><span aria-hidden="true">★</span><div><strong>${Object.values(save.levels).reduce((sum,entry)=>sum+entry.stars,0)}</strong><em>累计星星</em></div></div>
        <div class="mg-hud-pill"><span aria-hidden="true">♕</span><div><strong>${Math.max(0,...Object.values(save.levels).map(x=>x.score))}</strong><em>最佳战绩</em></div></div>
      </div>
    </div>
    <div class="mg-arcade-tabs" role="tablist" aria-label="选择游戏玩法">
      <button type="button" role="tab" data-game-mode="journey" aria-selected="${mode==='journey'}"><span aria-hidden="true">✿</span><b>闯关大冒险</b><small>40关 · 云绣之旅</small></button>
      <button type="button" role="tab" data-game-mode="free" aria-selected="${mode==='free'}"><span aria-hidden="true">✧</span><b>自由配对</b><small>选纹样 · 自定义挑战</small></button>
    </div>
    <div id="motif-game-setup"></div><p id="motif-game-message" class="mg-message" role="status" aria-live="polite"></p>
    <p class="mg-arcade-footnote">每张牌都来自真实可用的纹样图库；馆藏图片需核验开放许可。当前支持单机闯关与本机存档，积分道具及好友邀请将在后续阶段上线。</p>
  </section>`;
  qa('[data-game-mode]').forEach(btn=>btn.onclick=()=>{mode=btn.dataset.gameMode;lobby()});
  setupPanel();
 }
 function setupPanel(){
  if(!live())return;
  const panel=q('#motif-game-setup');if(!panel)return;
  if(mode==='journey'){
   const stage=LEVELS[selectedLevel-1]||LEVELS[0];
   panel.innerHTML=`<section class="mg-arcade-arena" aria-label="绣镜奇遇闯关地图">
      <div class="mg-map-column">
       <div class="mg-map-title"><div><span>ADVENTURE MAP · 山水闯关</span><h2>沿着绣路，一关一关向上</h2></div><div class="mg-map-direction">⇧ 向上探索</div></div>
       <div class="mg-map-scroll" role="region" aria-label="40关纵向挑战地图，可以滚动浏览" tabindex="0">
        ${renderVerticalJourney({chapters:CHAPTERS,levels:LEVELS,progress:save,selectedLevel,escapeHtml:esc})}
       </div>
       <p class="mg-map-caption">✦ 点亮每一颗星星，解锁前往山顶的新关卡</p>
      </div>
      <aside class="mg-mission-card" aria-label="当前关卡和开始挑战按钮">
       ${currentMission(stage,save,esc)}
      </aside>
    </section>`;
   if(chapterMapView){panel.innerHTML=chapterMap({mode:'memory',total:40,unlocked:save.unlocked,selected:selectedLevel,results:save.levels,memory:true});bindChapterPages(panel)}
   qa('[data-game-level]').forEach(btn=>btn.onclick=()=>{
     const target=Number(btn.dataset.gameLevel);if(target>save.unlocked)return;
     selectedLevel=target;setupPanel();
   });
   scrollCurrentNode();
   // Different network/cache timings can make CSS arrive after the initial
   // markup. Re-center once browser layout and stylesheet have settled.
   requestAnimationFrame(()=>{if(live()&&mode==='journey')scrollCurrentNode()});
  }else{
   const options=FREE_PAIR_CHOICES.map(n=>'<option value="'+n+'" '+(n===Number(free.pairs)?'selected':'')+'>'+n+'对 · '+n*2+'张牌</option>').join('');
   panel.innerHTML=`<div class="mg-free-adventure"><div class="mg-free-heading"><span class="mg-eyebrow">CUSTOM MEMORY CHALLENGE</span><h2>自己挑纹样，开启一局挑战</h2><p>选好文化地区与装饰风格，挑战属于你的专属牌组！</p></div><div class="mg-free-fields">
      <label>文化地区<select id="motif-game-region"><option value="">全部文化地区</option>${regionOptions()}</select></label>
      <label>纹样风格<select id="motif-game-style"><option value="">全部纹样风格</option>${styleOptions()}</select></label>
      <label>搜索题材或名称<input id="motif-game-query" value="${esc(free.keyword)}" placeholder="莲花、鱼纹、云纹…" type="search"></label>
      <label>图案数量<select id="motif-game-pairs">${options}</select></label></div>
      <div class="mg-free-summary" id="motif-game-selection-info" role="status"></div>
      <div class="mg-free-action"><div><span class="mg-eyebrow">FREE PLAY</span><strong>准备好了吗？</strong><small>记住图案位置，把相同纹样配成一对！</small></div><button type="button" id="motif-game-start" class="primary mg-big-play"><span aria-hidden="true">✦</span><span>▶ &nbsp;开始挑战</span><small>START FREE CHALLENGE</small></button></div></div>`;
   q('#motif-game-region').value=free.region;
   q('#motif-game-style').value=free.style;
   for(const [id,key] of [['motif-game-region','region'],['motif-game-style','style'],['motif-game-query','keyword'],['motif-game-pairs','pairs']]){
    q('#'+id).oninput=e=>{free[key]=e.target.value;showSelectionInfo()};
   }
   showSelectionInfo();
  }
  q('#motif-game-start').onclick=()=>void start();
 }
 function showSelectionInfo(){
  const element=q('#motif-game-selection-info');if(!element)return;
  const n=countFilter(free),pairs=Number(free.pairs);
  const local=filterPlayable(nativeRows,free).length;
  const museum=filterPlayable(museumRows,free).length;
  element.textContent=`筛选记录 ${n} 件（本地纹样 ${local} 件，待核验馆藏 ${museum} 件） · 本局需要 ${pairs} 种不同图案`;
  const btn=q('#motif-game-start');if(btn)btn.disabled=n<pairs;
 }
 async function refreshCatalog(){
  // Starting immediately after navigation must not race the new SVG catalog:
  // opening a level awaits this lightweight local source preparation, while
  // the larger optional museum metadata catalog continues in the background.
  basicReady=(async()=>{
   let elements=[];
   try{elements=await loadBasic()}catch(e){console.warn('独立SVG纹样暂未加载',e)}
   if(!live())return;
   nativeRows=normalizePlayable(patterns,elements);
   setupPanel();
  })();
  await basicReady;
  if(!live())return;
  museumLoading=true;
  try{const found=await loadMuseum();if(!live())return;museumRows=(Array.isArray(found)?found:[]).filter(x=>x.isWorldMotif===true&&typeof x.sourceApiUrl==='string')}
  catch(e){if(live())notify('馆藏接口暂不可用，仍可使用本地图录和独立SVG闯关。',true)}
  finally{museumLoading=false;if(live()&&mode==='free')setupPanel()}
 }
 async function prepareRows(level,opts){
  const eligible=filterPlayable(nativeRows,opts);
  const remoteCandidates=filterPlayable(museumRows,opts);
  // Prefer independently drawn SVGs at the early levels and more complex imagery later.
  const local=shuffleRows(eligible);
  const candidates=shuffleRows(remoteCandidates);
  const verified=[];
  // Museum originals are usable only after the official API confirms public-domain
  // rights; never rely on a saved stale image URL or a text-only catalog record.
  const wantMuseum=(opts.style==='museum'||(opts.style!=='element'&&level.chapter>=2))?Math.min(level.pairs,2):0;
  if((local.length<level.pairs||wantMuseum>0)&&candidates.length){
   for(let start=0;start<Math.min(candidates.length,48)&&(verified.length<Math.max(level.pairs-local.length,wantMuseum));start+=6){
    const batch=candidates.slice(start,start+6);
    const checks=await Promise.all(batch.map(async(row)=>{
     try{const proof=await verifyMuseum(row);return proof?.ok&&/^https:\/\//.test(proof.image||'')?{...row,gameImage:proof.image,gameSource:'馆方实时核验开放图像'}:null}catch{return null}
    }));
    verified.push(...checks.filter(Boolean));
    if(!live())throw Error('已离开当前页面');
   }
  }
  // Visible progression matters: campaign stages intentionally include at least
  // one independent new SVG when the style matches; later chapters also prefer
  // up to two live-licensed world museum motifs. Fill remaining slots from
  // the original 1088 verified local patterns, never with a missing-image card.
  const svg=shuffleRows(local.filter(row=>row.isBasicElement));
  const originals=shuffleRows(local.filter(row=>!row.isBasicElement));
  const preferred=level.number?[
   ...svg.slice(0,1),
   ...(level.chapter>=2?shuffleRows(verified).slice(0,2):[]),
   ...originals,
   ...svg.slice(1),
   ...verified
  ]:shuffleRows([...verified,...local]);
  const picked=[],visited=new Set();
  for(const row of preferred){
   if(picked.length>=level.pairs)break;
   if(visited.has(row.id))continue;
   visited.add(row.id);
   if(!await loadImage(row.gameImage,8000))continue;
   picked.push(row);
   if(!live())throw Error('已离开当前页面');
  }
  if(picked.length<level.pairs)throw Error(`当前筛选仅有${picked.length}张已成功加载的可用图片，需要${level.pairs}张。请选择其他地区、风格或较少的配对数量。`);
  return picked;
 }
 async function start(){
  if(!live())return;
  const level=mode==='journey'?LEVELS[selectedLevel-1]:freeSettings(free.pairs);
  if(!level||level.number>save.unlocked)return;
  const options=mode==='free'?{...free}:{region:'',style:level.style||'',keyword:''};
  clearRound();
  root.innerHTML=`<section class="motif-game mg-loading" id="motif-game-loading"><span class="mg-eyebrow">纹样奇遇记 · 备牌中</span><h2>正在挑选本关纹样…</h2><p>加载清晰图案并核验馆藏使用许可。记忆倒计时将在图片全部准备好后开始。</p><div class="mg-spinner" aria-hidden="true"></div><p id="motif-game-message" role="status"></p><button id="motif-game-cancel">返回选关</button></section>`;
  q('#motif-game-cancel').onclick=()=>{clearRound();lobby()};
  try{
   await basicReady;
   if(!live()||!q('#motif-game-loading'))return;
   const selected=await prepareRows(level,options);
   if(!live()||!q('#motif-game-loading'))return;
   begin(level,makeDeck(selected,level.pairs),options);
  }catch(e){if(live()&&q('#motif-game-loading')){q('#motif-game-message').textContent=e.message;q('#motif-game-message').className='mg-message warning'}}
 }
 function begin(level,deck,options){
  clearRound();round={level,deck,options,phase:'memory',opened:[],matched:new Set(),moves:0,misses:0,paused:false,remaining:level.previewSeconds,elapsed:0,token:0};
  root.innerHTML=`<section class="motif-game mg-playing mg-arcade-playing" id="motif-game-playing">
   <div class="mg-play-top"><div><span class="mg-eyebrow">MEMORY QUEST · ${level.number?'LEVEL '+String(level.number).padStart(2,'0'):'FREE PLAY'}</span><h2>${esc(level.number?'第'+level.number+'关 · '+level.title:level.title)}</h2><p>${level.pairs}对纹样 · 先记位置，再依次翻牌</p></div><button id="motif-game-exit" type="button">返回关卡</button></div>
   <div class="mg-play-stats"><div><span>关卡阶段</span><strong id="motif-game-phase">记忆预览</strong></div><div><span>剩余时间</span><strong id="motif-game-clock">00:00</strong></div><div><span>配对进度</span><strong id="motif-game-progress">0/${level.pairs}</strong></div><div><span>翻牌次数</span><strong id="motif-game-moves">0</strong></div></div>
   <p id="motif-game-status" class="mg-arcade-instructions" role="status" aria-live="polite">✨ 记忆时间！所有纹样已展示，快记住它们的位置。</p>
   <div id="motif-game-board" class="mg-board mg-arcade-board" style="--mg-columns:${level.pairs<=3?3:level.pairs<=8?4:5}">${deck.map((item,i)=>`<button type="button" class="mg-card face-up" data-game-card="${i}" aria-label="第${i+1}张：${esc(item.title)}"><span class="mg-card-back" aria-hidden="true"><span class="mg-back-symbol">梨</span></span><span class="mg-card-front"><img src="${esc(item.gameImage)}" alt="" width="160" height="160"><span>${esc(capName(item.title))}</span></span></button>`).join('')}</div>
   <div class="mg-play-actions"><button type="button" id="motif-game-pause">⏸ 暂停</button><button class="primary mg-skip-memory" type="button" id="motif-game-skip">▶ 我记好了，开始挑战！</button></div>
   <p class="mg-note" id="motif-game-provenance">图库图片在本机读取，涉及馆藏的图像均经过实时授权核验。遇到网络或图片加载问题可重新选关。</p>
  </section>`;
  q('#motif-game-exit').onclick=()=>lobby();
  q('#motif-game-skip').onclick=()=>{if(round?.phase==='memory'&&!round.paused)activate()};
  q('#motif-game-pause').onclick=()=>togglePause();
  qa('[data-game-card]').forEach(btn=>btn.onclick=()=>flip(Number(btn.dataset.gameCard)));
  beginClock(level.previewSeconds);
 }
 function displayClock(){if(!round)return;const r=round;q('#motif-game-clock').textContent=fmtTime(r.remaining);q('#motif-game-phase').textContent=r.paused?'已暂停':r.phase==='memory'?'记忆预览':r.phase==='play'?'正在配对':'已完成';q('#motif-game-progress').textContent=r.matched.size/2+'/'+r.level.pairs;q('#motif-game-moves').textContent=String(r.moves)}
 function beginClock(seconds){
  if(!round)return;tickStop();secondsLeft=seconds;round.remaining=seconds;lastTick=performance.now();displayClock();
  interval=setInterval(()=>{
   if(!live()||!round){tickStop();return}
   const now=performance.now();
   if(round.paused){lastTick=now;return}
   const elapsed=(now-lastTick)/1000;lastTick=now;
   secondsLeft=Math.max(0,secondsLeft-elapsed);
   round.remaining=secondsLeft;
   displayClock();
   if(secondsLeft<=0){if(round.phase==='memory')activate();else if(round.phase==='play')finish(false)}
  },100);
 }
 function activate(){if(!round||round.phase!=='memory')return;round.phase='play';round.opened=[];qa('[data-game-card]').forEach(card=>{card.classList.remove('face-up');card.setAttribute('aria-label','第'+(Number(card.dataset.gameCard)+1)+'张，背面朝上')});q('#motif-game-skip').hidden=true;q('#motif-game-status').textContent='正式挑战开始！翻开两张相同的纹样完成配对。';beginClock(round.level.timeSeconds)}
 function flip(i){
  const r=round;if(!r||r.phase!=='play'||r.paused||r.opened.length>=2||r.matched.has(i)||r.opened.includes(i))return;
  const el=q('[data-game-card="'+i+'"]');if(!el)return;r.opened.push(i);el.classList.add('face-up');el.setAttribute('aria-label','第'+(i+1)+'张：'+r.deck[i].title);
  if(r.opened.length!==2)return;
  r.moves++;const [a,b]=r.opened;const match=r.deck[a].id===r.deck[b].id;
  if(match){r.matched.add(a);r.matched.add(b);r.opened=[];for(const index of [a,b]){const card=q('[data-game-card="'+index+'"]');card.classList.add('matched');card.disabled=true}
   q('#motif-game-status').textContent='配对成功，继续寻找下一组纹样！';
   if(r.matched.size===r.deck.length){finish(true);return}
  }else{r.misses++;const token=++r.token;q('#motif-game-status').textContent='还不是同一种纹样，再看一眼。';
   delay=setTimeout(()=>{if(!round||round!==r||r.token!==token||r.paused)return;for(const index of [a,b]){const card=q('[data-game-card="'+index+'"]');card?.classList.remove('face-up');card?.setAttribute('aria-label','第'+(index+1)+'张，背面朝上')}r.opened=[];delay=0},820);
  }
  displayClock();
 }
 function togglePause(){
  if(!round||!['memory','play'].includes(round.phase))return;
  round.paused=!round.paused;
  const btn=q('#motif-game-pause');if(btn)btn.textContent=round.paused?'继续挑战':'暂停';
  const board=q('#motif-game-board');if(board){board.classList.toggle('is-paused',round.paused);board.inert=round.paused}
  if(round.paused){const r=round;if(delay){delayStop();r.opened.forEach(i=>{q('[data-game-card="'+i+'"]')?.classList.remove('face-up')});r.opened=[]}}
  q('#motif-game-status').textContent=round.paused?'已暂停。继续挑战后计时恢复。':round.phase==='memory'?'继续记忆纹样的位置。':'继续翻牌配对。';
  displayClock();
 }
 function onVisibility(){if(document.hidden&&round&&!round.paused&&['memory','play'].includes(round.phase))togglePause()}
 function finish(won){
  const r=round;if(!r)return;tickStop();delayStop();r.phase='finished';const elapsedSeconds=Math.max(0,Math.round(r.level.timeSeconds-r.remaining));
  const result=won?gradeRound(r.level,{moves:r.moves,misses:r.misses,remaining:r.remaining}):null;
  let earnedThisRound=0;
  if(won){
   const previous=save;
   save=recordWin(save,r.level,{...result,moves:r.moves,elapsedSeconds});
   earnedThisRound=earnedMemoryPoints(save)-earnedMemoryPoints(previous);
   saveProgress(save);onLegacyScore(result.score);
  }
  root.innerHTML=`<section class="motif-game mg-result mg-arcade-result" id="motif-game-result"><span class="mg-eyebrow">PEAR BLOSSOM · ${won?'CHALLENGE COMPLETE':'TIME UP'}</span><h1>${won?'一针一纹，挑战成功':'时间到了，再试一次'}</h1>
   <div class="mg-result-crown" aria-hidden="true">✦　✿　✦</div><div class="mg-result-stars" aria-label="${won?result.stars+'星':'未通关'}">${won?starsDisplay(result.stars):'☆☆☆'}</div>
   <p>${won?'你已经记住这组纹样的位置。':'练习不影响已取得的关卡成绩。'}</p>
   ${won&&r.level.number?'<p class="mg-unlock" id="motif-memory-earned-points" role="status">本关获得绣点 +'+earnedThisRound+' · 记忆关卡累计 '+earnedMemoryPoints(save)+' · 前往六大绣境商店兑换道具</p>':''}
   <div class="mg-result-numbers"><div><span>战绩分</span><strong>${won?result.score:0}</strong></div><div><span>完成配对</span><strong>${r.matched.size/2}/${r.level.pairs}</strong></div><div><span>翻牌次数</span><strong>${r.moves}</strong></div><div><span>耗时</span><strong>${fmtTime(elapsedSeconds)}</strong></div></div>
   ${won&&r.level.number&&r.level.number<40?'<p class="mg-unlock">第'+(r.level.number+1)+'关 '+(save.unlocked>=r.level.number+1?'已解锁':'待解锁')+'</p>':''}
   <div class="mg-result-actions"><button type="button" id="motif-game-retry">↻ 再试一次</button>${won&&r.level.number&&r.level.number<40?'<button type="button" id="motif-game-next" class="primary mg-next-level">▶ 下一关 →</button>':''}<button type="button" id="motif-game-back">⇦ 返回闯关地图</button></div>
   <p class="mg-note">通关绣点已接入六大绣境统一道具商店，奖励按历史最佳星级差额计算。当前仍为本机存档；账号云同步、好友联网对战尚未上线。</p>
  </section>`;
  q('#motif-game-retry').onclick=()=>{mode=r.level.number?'journey':'free';if(r.level.number)selectedLevel=r.level.number;void start()};
  q('#motif-game-back').onclick=()=>lobby();
  q('#motif-game-next')?.addEventListener('click',()=>{mode='journey';selectedLevel=Math.min(40,r.level.number+1);void start()});
 }
 document.addEventListener('visibilitychange',onVisibility);
 lobby();void refreshCatalog();
 return ()=>{disposed=true;clearRound();document.removeEventListener('visibilitychange',onVisibility)};
}
