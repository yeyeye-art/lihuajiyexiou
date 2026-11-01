// Scenario templates for the first playable act of 梨花季·绣境奇遇.
// Decorative art is an independent scalable map; landmarks are true buttons,
// not hotspots baked into a screenshot.
export const WORLD_SITES=[
 {id:'match3',name:'梨花绣田',game:'纹样消消乐',note:'纹样消消乐',x:19,y:69,num:1},
 {id:'link',name:'云水连廊',game:'祥云连连看',note:'祥云连连看',x:41,y:46,num:2},
 {id:'jigsaw',name:'锦画藏阁',game:'绣样拼图大师',note:'绣样拼图',x:53,y:31,num:3},
 {id:'color',name:'东方染坊',game:'纹样填色坊',note:'纹样设色',x:78,y:49,num:4},
 {id:'studio',name:'百工绣坊',game:'小小纹样设计师',note:'绣样创作',x:60,y:77,num:5},
 {id:'memory',name:'梨林秘境',game:'云绣记忆之旅',note:'绣纹记忆',x:86,y:79,num:6}
];
// Each scene marker uses a separately rendered, already-licensed teaching motif.
const WORLD_MOTIFS=Object.freeze({
 match3:'basic-cn-lotus-bloom',link:'basic-sy-eightstar',jigsaw:'basic-np-lotus-stem',
 color:'basic-fr-flower',studio:'basic-in-scroll-vine',memory:'basic-kr-single-crane'
});
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mapPath='M266 552 C312 509 375 444 480 372 S630 212 742 247 S911 350 1092 392 S1028 556 853 604 S1010 685 1204 635';
const stagePoints=[
 [18,78],[33,69],[50,78],[64,65],[77,72],
 [83,53],[65,46],[49,54],[32,41],[18,31],
 [23,19],[39,25],[57,19],[74,25],[86,15],
 [82,34],[64,35],[50,38],[34,26],[18,15]
];
export function worldMarkup({cleared=0,score=0,blossoms=0}={}){
 const stops=WORLD_SITES.map((site,i)=>`<button type="button" class="world-landmark world-site-${site.id}${i===0?' world-landmark-featured':''}" data-park-open="${site.id}" style="--x:${site.x}%;--y:${site.y}%;" aria-label="进入${site.name}，${site.game}">
  <span class="world-landmark-building" aria-hidden="true"><img class="world-venue-illustration" src="./assets/reference-art/home/${site.id}.webp" alt="" decoding="async"></span>
  <span class="world-landmark-sign"><span class="world-landmark-number">${site.num}</span><span class="world-landmark-motif" aria-hidden="true"><img src="./assets/basic-elements/${WORLD_MOTIFS[site.id]}.svg" alt="" loading="lazy"></span><span class="world-landmark-title">${site.name}</span>
  <small>${site.note}</small><span class="world-landmark-enter">进入绣境 ↗</span></span>
 </button>`).join('');
 return `<section class="motif-park world-shell" id="motif-game-park" aria-label="梨花季六大游戏世界">
  <header class="world-navbar"><div class="world-navbar-brand"><span class="world-brand-seal">梨</span><strong>梨花季 · 绣境奇遇</strong><small>一针一线，绣见东方美</small></div>
   <div class="world-navbar-status"><span>✿ 绣境总览</span><span>已通关 <b>${cleared}</b> 关</span><span>最佳战绩 <b>${score}</b></span><span>可用绣点 <b>${blossoms}</b></span><button type="button" id="park-shop-open" class="world-shop-entry" aria-label="打开真正可兑换与使用道具的绣点商店">绣点商店</button><button type="button" id="world-duel-open" class="world-shop-entry" aria-label="打开好友实时对战房间">好友对战</button><button type="button" id="world-immersive-toggle" class="world-immersive-toggle" aria-pressed="false">⛶ 全屏绣境</button></div>
  </header>
  <div class="world-map-frame"><div class="world-viewport" tabindex="0" aria-label="可横向探索的六大绣境地图">
   <div class="world-canvas">
    <img class="world-landscape" src="./assets/reference-art/home/landscape.webp" alt="由梨花、绣坊、染坊、山水、桥梁构成的东方刺绣世界"/>
    <img class="world-foreground-props" src="./assets/world-foreground-decor.svg" alt="" aria-hidden="true" decoding="async"/>
    <svg class="world-silk-road" viewBox="0 0 1400 800" preserveAspectRatio="none" aria-hidden="true"><path d="${mapPath}" class="world-silk-shadow"/><path d="${mapPath}" class="world-silk-thread"/></svg>
    <div class="world-intro"><span>梨花入梦 · 一境一绣</span><h1>循花入绣境</h1><p>六处东方绣境，等你亲手点亮。</p></div>
    ${stops}
    <div class="world-corner-stamp">春绣启程<span>梨花如雪 · 绣意长青</span></div>
   </div>
  </div>
  <div class="world-pan-controls" role="group" aria-label="探索地图方向"><button type="button" class="world-pan-button" data-world-pan="-1" aria-label="向左探索地图">‹</button><button type="button" class="world-pan-button" data-world-pan="1" aria-label="向右探索地图">›</button></div>
  <div class="world-pan-status" id="world-pan-status" role="status" aria-live="off">拖动地图 · 探索六大绣境</div></div>
  <div class="world-bottom-bar"><span>✥ 六处绣境皆可进入 · 跟随绣线探索</span><span>用鼠标或手指左右拖动地图 <b>⇆</b></span></div>
  <p class="world-screen-note">场景取自用户提供的界面参考图；六处入口均连接真实玩法，成绩沿用原有存档。</p>
 </section>`;
}
export function gardenMarkup({save,level,available,styleOptions='',regionOptions='',keyword='',region='',style='',matches=0}){
 const visible=Math.min(20,available);
 const levels=stagePoints.map(([x,y],i)=>{
  const n=i+1,win=save.results?.match3?.[n],isActive=n===level,locked=n>visible;
  return `<button type="button" data-park-level="${n}" class="world-stage-node${isActive?' chosen':''}${win?' completed':''}${locked?' locked':''}" style="--x:${x}%;--y:${y}%;" aria-label="第${n}关${locked?'未解锁':win?'已通关':'可挑战'}" ${locked?'disabled':''}>
    <span class="world-stage-marker">${locked?'✧':n}</span>
    <span class="world-stage-stars">${win?'★'.repeat(win.stars)+'☆'.repeat(3-win.stars):isActive?'现在挑战':'· · ·'}</span>
  </button>`;
 }).join('');
 const route=stagePoints.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ');
 const completedStages=stagePoints.filter((_,i)=>save.results?.match3?.[i+1]?.stars>0).length;
 const routeCompleted=Math.min(100,Math.floor(completedStages/stagePoints.length*100));
 const selectedWin=save.results?.match3?.[level];
 return `<section class="motif-park world-garden-screen park-selection" id="park-game-selection">
  <div class="world-garden-top"><button type="button" id="park-back" class="world-return">← 返回绣境地图</button>
   <span class="world-garden-heading">梨花绣田 <small>纹样消消乐 · 春绣启程</small></span>
   <span class="world-garden-progress">春绣关卡 ${Object.keys(save.results?.match3||{}).length} / 20</span>
  </div>
  <div class="world-garden-viewport" role="region" tabindex="0" aria-label="春绣启程20关场景地图">
   <div class="world-garden-canvas">
    <div class="world-garden-art" aria-hidden="true"></div>
    <svg class="world-garden-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${route}" class="world-garden-route-base"/><path d="${route}" class="world-garden-route-needle"/><path d="${route}" class="world-garden-route-lit" pathLength="100" style="stroke-dasharray:${routeCompleted} 100"/></svg>
    <div class="world-garden-intro"><span>PEAR BLOSSOM · CHAPTER I</span><h2>梨花绣田</h2><p>沿一根绣线前行，点亮花田里的每一关。</p></div>
    <span class="world-garden-prop world-garden-prop-one">✿</span>
    <span class="world-garden-prop world-garden-prop-two">✦</span>
    ${levels}
    <span class="world-garden-chapter-label">✿ 01—10 · 春绣初识</span><span class="world-garden-upper-label">✦ 11—20 · 锦纹进阶</span>
    <span class="world-garden-water-mark" aria-hidden="true">苏绣 · 一针一线</span>
   </div>
  </div>
  <aside class="ref-chapter-progress" aria-label="章节进度">
    <h3>❖ 章节进度</h3>
    <div class="ref-progress-numbers">${stagePoints.slice(0,10).filter((_,i)=>save.results?.match3?.[i+1]?.stars).length} / 10 · 全章20关</div>
    <div class="ref-progress-track"><span style="width:${stagePoints.slice(0,10).filter((_,i)=>save.results?.match3?.[i+1]?.stars).length*10}%"></span></div>
    <div class="ref-progress-rewards">
     <span><img alt="" src="./assets/basic-elements/basic-fr-flower.svg">梨花纹样</span>
     <span><img alt="" src="./assets/basic-elements/basic-cn-lotus-petal.svg">莲花纹样</span>
     <span><img alt="" src="./assets/basic-elements/basic-sy-eightstar.svg">吉祥纹样</span>
    </div>
   </aside>
<aside class="world-mission" aria-label="当前关卡任务">
   <div class="world-mission-heading"><small>YOUR NEXT CHALLENGE / 当前关卡</small><span class="world-mission-label">第 ${String(level).padStart(2,'0')} 关</span></div>
   <div class="world-mission-content"><div><h3>纹样消消乐</h3><p>两枚相邻纹样交换，连成三枚即可消除</p></div>
   <div class="world-mission-stars">${selectedWin?'★'.repeat(selectedWin.stars)+'☆'.repeat(3-selectedWin.stars):'☆☆☆'}</div></div>
   <div class="world-mission-goals"><span>目标分数 <b>${420+level*70}</b></span><span>可用步数 <b>${Math.max(17,24-Math.floor(level/3))}</b></span><span>图案数 <b>6种</b></span></div>
   <button type="button" id="park-start" class="world-mission-play">开始挑战 <span>➜</span></button>
   <p id="park-count-info" role="status" aria-live="polite" class="world-ready">准备纹样数据中…</p>
   <details class="world-motif-filters"><summary>自选纹样题材与地区 <span>⌄</span></summary><div class="park-filters">
     <label>文化地区<select id="park-region">${regionOptions}</select></label>
     <label>纹样风格<select id="park-style">${styleOptions}</select></label>
     <label>搜索题材或名称<input id="park-query" type="search" value="${safe(keyword)}" placeholder="莲花、祥云、鱼纹…"/></label>
   </div></details>
  </aside>
  <aside class="ref-chapter-rewards" aria-label="章节星级里程碑">
    <strong>❖ 章节奖励</strong>
    <div class="ref-reward-track">
     <span><img alt="" src="./assets/basic-elements/basic-cn-lotus-bloom.svg">★ 3</span>
     <span><img alt="" src="./assets/basic-elements/basic-iq-diamond.svg">★ 6</span>
     <span><img alt="" src="./assets/basic-elements/basic-fr-flower.svg">★ 9</span>
     <span><img alt="" src="./assets/basic-elements/basic-it-tendril.svg">★ 10</span>
    </div>
   </aside>
<p class="park-feedback" id="park-feedback" role="status" hidden></p>
 </section>`;
}
export function missionProgress(level,score,moves,goal){
 const next=Math.min(100,Math.round(score/goal*100));
 return `<div class="world-match-head"><span>梨花绣田 · 第${level}关</span><span>目标 ${goal} 分</span></div>
 <div class="world-match-track" aria-label="本关目标进度 ${next}%"><span style="width:${next}%"></span></div>
 <div class="world-match-scoring"><span>已得 <b>${score}</b> 分</span><span>剩余 <b>${moves}</b> 步</span></div>`;
}
export function rewardForStars(stars){return Number.isInteger(stars)&&stars>=1&&stars<=3?20+stars*10:0}
export function gardenRewardTotal(save){
 const levels=save?.results?.match3||{};
 return Object.values(levels).reduce((sum,result)=>sum+rewardForStars(result?.stars),0);
}
export function gardenRewardGain(before,after,level){
 return rewardForStars(after?.results?.match3?.[level]?.stars)-rewardForStars(before?.results?.match3?.[level]?.stars);
}
export const WORLD_STAGE_POINTS=stagePoints.map(x=>x.slice());
