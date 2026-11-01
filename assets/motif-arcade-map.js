/**
 * Presentation-only game map for 梨花季·纹样奇遇记.
 * Inspired by vertical casual-game progression maps; all artwork and layout
 * are original SVG/CSS. No third-party game art, animation assets or dependency.
 * Route runs from the foot of the map upward; actual level state is owned by
 * the existing saved 40-level game engine.
 */
const positions=[
 {x:22,y:87},{x:47,y:78},{x:76,y:68},{x:58,y:58},
 {x:27,y:48},{x:43,y:38},{x:74,y:28},{x:55,y:18}
];
function pathFor(points){
 return points.slice(1).reduce((out,p,i)=>{
  const previous=points[i],midY=(previous.y+p.y)/2;
  return out+' C '+previous.x+' '+midY+', '+p.x+' '+midY+', '+p.x+' '+p.y;
 },'M '+points[0].x+' '+points[0].y);
}
const mapPath=pathFor(positions);
const mountainSvg='<svg class="mg-map-mountains" aria-hidden="true" viewBox="0 0 940 580" preserveAspectRatio="xMidYMid slice"><path d="M0 385Q82 348 154 399Q239 288 313 366Q379 248 452 344Q534 194 625 324Q714 245 781 314Q853 253 940 324V580H0Z" fill="#dce9d8"/><path d="M0 452Q113 379 208 438Q301 331 389 419Q472 342 545 394Q639 314 728 419Q832 373 940 419V580H0Z" fill="#c6dac9"/><path d="M0 512Q128 449 240 508Q342 430 449 497Q553 414 675 492Q807 436 940 475V580H0Z" fill="#a8c6b3"/></svg>';
export function renderVerticalJourney({chapters,levels,progress,selectedLevel,escapeHtml}){
 const esc=escapeHtml;
 if(chapters.length!==5||levels.length!==40)throw Error('Expected full 40-stage game route');
 const completed=new Set(Object.entries(progress.levels||{}).filter(([,v])=>v.stars>0).map(([k])=>Number(k)));
 const scene=chapters.map((_,c)=>{
  const index=4-c,chapter=chapters[index],chapterLevels=levels.slice(index*8,index*8+8);
  const completedCount=chapterLevels.filter(l=>completed.has(l.number)).length;
  const marker=chapterLevels.map((level,j)=>{
   const loc=positions[j],done=completed.has(level.number),current=level.number===selectedLevel,available=level.number<=progress.unlocked;
   const cls=done?'completed':available?'available':'locked';
   const star=progress.levels[level.number]?.stars||0;
   return `<button type="button" class="mg-level mg-route-node ${cls} ${current?'selected':''} ${level.number===progress.unlocked?'frontier':''}"
    data-game-level="${level.number}" style="--node-x:${loc.x}%;--node-y:${loc.y}%" ${available?'':'disabled'}
    aria-label="第${level.number}关${available?'，'+esc(level.title):'，未解锁'}${star?'，'+star+'星':''}"
    aria-pressed="${current?'true':'false'}"
    title="第${level.number}关 · ${esc(level.title)}">
      <span class="mg-node-glow" aria-hidden="true"></span>
      <span class="mg-node-disc"><span class="mg-node-number">${available?String(level.number).padStart(2,'0'):'✦'}</span></span>
      ${current?'<span class="mg-node-arrow" aria-hidden="true">现在挑战 <b>➤</b></span>':''}
      <span class="mg-route-stars" aria-hidden="true">${star?'★'.repeat(star)+'☆'.repeat(3-star):level.number===progress.unlocked?'GO!':'· · ·'}</span>
    </button>`;
  }).join('');
  const title='${esc(chapter.name)}';
  return `<section class="mg-chapter mg-landscape mg-landscape-${index+1}" aria-label="第${index+1}章，${esc(chapter.name)}">
     ${mountainSvg}
     <div class="mg-landscape-cloud mg-cloud-a" aria-hidden="true">〰</div><div class="mg-landscape-cloud mg-cloud-b" aria-hidden="true">〰</div>
     <div class="mg-landscape-petals" aria-hidden="true">✿　✧　✿</div>
     <div class="mg-chapter-banner">
       <span class="mg-chapter-banner-number">第${index+1}章 / ${completedCount} / 8</span>
       <strong>${esc(chapter.name)}</strong>
       <span>${esc(chapter.subtitle)}</span>
     </div>
     <div class="mg-route-field">
       <svg class="mg-route-ink" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
         <path d="${mapPath}" class="mg-route-outline"/>
         <path d="${mapPath}" class="mg-route-highlight"/>
       </svg>
       ${marker}
       <span class="mg-scenery mg-scenery-lotus" aria-hidden="true">❀</span>
       <span class="mg-scenery mg-scenery-bird" aria-hidden="true">⌁</span>
     </div>
    </section>`;
 }).join('');
 // The image is decorative only: the actual game buttons remain accessible.
 return `<div class="mg-chapters mg-vertical-journey">${scene}</div>`;
}
export function currentMission(level,progress,escapeHtml){
 const esc=escapeHtml;
 const win=progress.levels[level.number],chapter=chaptersName(level.chapter);
 const chapterPair=level.chapter>=0?level.chapter+1:1;
 return `<div class="mg-mission-frame">
  <span class="mg-mission-tag">✦ TODAY'S CHALLENGE · 当前关卡</span>
  <div class="mg-mission-medallion" aria-hidden="true">
   <span class="mg-mission-laurel">❀</span>
   <span class="mg-mission-no">LEVEL <b>${String(level.number).padStart(2,'0')}</b></span>
   <span class="mg-mission-ribbon">${esc(chapter)}</span>
  </div>
  <h2>第${level.number}关 · ${esc(level.title)}</h2>
  <p class="mg-mission-lead">${win?'你已通过这一关，来挑战更高的星级吧！':'一场记忆的冒险，正等你开始。'}</p>
  <div class="mg-mission-icons" aria-label="关卡信息">
   <span><b>✿</b> ${level.pairs} 对图案</span>
   <span><b>◷</b> 记忆 ${level.previewSeconds} 秒</span>
   <span><b>⌛</b> 挑战 ${level.timeSeconds} 秒</span>
  </div>
  <div class="mg-mission-achievement">最高战绩：<strong>${win?'★'.repeat(win.stars)+'☆'.repeat(3-win.stars):'尚未通关'}</strong></div>
  <button type="button" id="motif-game-start" class="primary mg-big-play"><span class="mg-play-sparkle" aria-hidden="true">✦</span><span>▶ &nbsp;开始挑战</span><small>START LEVEL ${String(level.number).padStart(2,'0')}</small></button>
  <p class="mg-mission-tips">记住每张纹样的位置 · 翻开相同图案完成配对</p>
 </div>`;
}
function chaptersName(index){return ['初识花叶','云间识纹','百纹寻踪','四海织梦','纹样宗师'][index]||'纹样奇遇记'}
