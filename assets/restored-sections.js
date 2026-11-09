// Restored adapters from final local source d8fa327. Data and feature modules retain their original provenance.
import {lessons,knowledge,retrieve} from './knowledge.js';
import {categories as suxiuCategories,scopes as suxiuScopes} from './suxiu-knowledge-store.js';
import {icon} from './ui.js';
import {createCloudAccountController} from './cloud-account-controller.js';
let account;
let initialized;
const gameStyles=[
 ['motifPark','motif-game-park.css?v=20261021'],
 ['worldScene','embroidered-world.css?v=wayfinding-20261021'],
 ['pearGardenStage','pear-garden-stage.css?v=scene2-font-20261021'],
 ['pearMatchScene','pear-match-experience.css?v=20261021-silk-relief'],
 ['motifParkBrand','motif-park-brand.css?v=20261021-functional-store'],
 ['referenceVisual','reference-visuals.css?v=20261022-materials'],
 ['worldHome','world-home.css?v=20261022'],
 ['referenceArt','reference-art.css?v=20261022-materials'],
 ['chapterScenes','chapter-scenes.css?v=20261022'],
 ['motifGame','motif-game.css?v=20261021'],
 ['motifArcade','motif-arcade.css?v=20261021-stage-hit-target']
];
// Native modules add styles lazily. Finish that work before exposing their controls.
function ensureStyle(key,file){
 const selector='link[data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+']';
 let link=document.querySelector(selector);
 if(link?.sheet)return Promise.resolve();
 const fresh=!link;
 if(fresh){link=document.createElement('link');link.rel='stylesheet';link.href=new URL(file,import.meta.url).href;link.dataset[key]='';}
 return new Promise((resolve,reject)=>{
  const finish=error=>{clearTimeout(timer);link.removeEventListener('load',loaded);link.removeEventListener('error',failed);if(error){link.remove();reject(error);}else resolve();};
  const loaded=()=>finish();
  const failed=()=>finish(Error('界面样式加载失败，请刷新重试。'));
  const timer=setTimeout(failed,30000);
  link.addEventListener('load',loaded,{once:true});link.addEventListener('error',failed,{once:true});
  if(fresh)document.head.append(link);
 });
}
export function cloudReady(){
 if(!account){
  account=createCloudAccountController();
  let timer;
  window.addEventListener('lihuaji:save-changed',()=>{
   if(!account.current||account.paused)return;
   clearTimeout(timer);timer=setTimeout(()=>account.syncNow().catch(error=>console.warn(error.message)),900);
  });
  window.addEventListener('online',()=>{if(account.current&&!account.paused)account.syncNow().catch(()=>{});});
  initialized=account.init().catch(error=>console.warn(error.message));
 }
 return initialized.then(()=>account);
}
export async function mountRestoredSection(root,{page,query='',isCurrent=()=>true,onProgress=()=>{},onToast=()=>{}}){
 const main=root,epoch=1,cleanups=[];
 const $=(selector)=>root.querySelector(selector);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeLink=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?esc(u.href):'#';}catch{return '#';}};
 const navigate=hash=>{location.hash=hash;};
 let progress={days:[],best:0};try{progress={...progress,...JSON.parse(localStorage.getItem('lihuaji.pages.progress.v1')||'{}')}}catch{}
 const save=()=>{localStorage.setItem('lihuaji.pages.progress.v1',JSON.stringify(progress));onProgress(progress);};
 const toast=onToast;
 let patterns=[],worldMotifVerifier=null,worldCmaVerifier=null,worldAicVerifier=null;
 const worldImageCache=new Map();
 const cleanup=()=>{for(const fn of cleanups.splice(0))try{fn?.()}catch(error){console.warn(error)}};
async function loadWorldPreview(p){if(worldImageCache.has(p.id))return worldImageCache.get(p.id);try{const response=await fetch(p.sourceApiUrl);if(!response.ok)throw Error('馆方暂时不可用');const api=await response.json();let verified=(p.sourcePlatform==='CMA'?worldCmaVerifier?.verifyCmaPatternImage(p,api):p.sourcePlatform==='AIC'?worldAicVerifier?.verifyAicPatternImage(p,api):worldMotifVerifier?.verifyMetPatternImage(p,api))||{ok:false};worldImageCache.set(p.id,verified);return verified;}catch{return {ok:false,reason:'馆方图像核验暂不可用'}}}
async function game(){
 const gameEpoch=epoch;
 const {mountMotifGamePark}=await import('./motif-game-park.js?v=20261022-chapter-scenes');
 if(!isCurrent())return;
 let archivePromise=null;
 const getArchive=()=>{
  if(!archivePromise)archivePromise=Promise.all([
   import('./world-motifs-page.js').then(async m=>({m,data:await m.loadWorldMotifCatalog()})),
   import('./world-motifs-cma.js').then(async m=>({m,data:await m.loadCmaWorldMotifs()})),
   import('./world-motifs-aic.js').then(async m=>({m,data:await m.loadAicWorldMotifs()})),
   import('./world-motifs-cma.js').then(async m=>({m,data:await m.loadCmaExpansionWorldMotifs()}))
  ]).then(([met,cma,aic,extra])=>{
   const fromMet=met.m.validateWorldMotifs(met.data,patterns).rows;
   const fromCma=cma.m.validateCmaWorldMotifs(cma.data,[...patterns,...fromMet]).rows;
   const fromAic=aic.m.validateAicWorldMotifs(aic.data,[...patterns,...fromMet,...fromCma]).rows;
   const fromExtra=extra.m.validateCmaExpansionWorldMotifs(extra.data,[...patterns,...fromMet,...fromCma,...fromAic]).rows;
   worldMotifVerifier=met.m;worldCmaVerifier=cma.m;worldAicVerifier=aic.m;
   return [...fromMet,...fromCma,...fromAic,...fromExtra];
  }).catch(e=>{archivePromise=null;throw e});
  return archivePromise;
 };
 const dispose=mountMotifGamePark(main,{
  patterns,
  loadBasic:async()=>{
   const [basic,archive]=await Promise.all([import('./basic-elements-page.js?v=20261020'),getArchive()]);
   const raw=await basic.loadBasicElements();
   return basic.validateBasicElements(raw,archive,patterns).rows;
  },
  loadMuseum:async()=>{const archive=await getArchive();return archive.map(row=>({...row,isWorldMotif:true,collection:'archive'}))},
  verifyMuseum:async row=>loadWorldPreview(row),
  onLegacyScore:score=>{progress.best=Math.max(progress.best,score);save()},
  isCurrent:()=>isCurrent()
 });
 if(isCurrent())cleanups.push(dispose);else dispose();
}
function officialKnowledgeCard(k,data,heading='h2'){
 const sourceById=new Map(data.sources.map(s=>[s.id,s])),byId=new Map(data.knowledge.map(x=>[x.id,x]));
 const links=ids=>ids.map(id=>sourceById.get(id)).filter(Boolean).map(s=>`<a href="${safeLink(s.url)}" target="_blank" rel="noopener noreferrer">查看官方来源：${esc(s.organization)} · ${esc(s.title)}</a>`).join('<br>');
 const relations=[...k.relations.map(r=>({id:r.target,label:({subtypeOf:'属于',relatedTo:'相关',partOf:'所属',stepOf:'所属流程'})[r.type]})),...data.knowledge.filter(x=>x.relations.some(r=>r.target===k.id&&r.type==='subtypeOf')).map(x=>({id:x.id,label:'分型'}))];
 return `<article class="card" data-suxiu="${esc(k.id)}"><${heading}>${esc(k.title)}</${heading}><p>${esc(k.summary)}</p><p class="small">官方来源核验 · ${esc(suxiuCategories[k.category])} · ${esc(suxiuScopes[k.scope])}</p><p class="small">${links(k.sourceIds)}</p><details><summary>事实与关联资料</summary>${k.facts.map(f=>`<p>${esc(f.text)}</p><p class="small">${links(f.sourceIds)}</p>`).join('')}${k.orderedSteps?'<ol>'+k.orderedSteps.map(id=>`<li><a href="#guide/${encodeURIComponent(id)}">${esc(byId.get(id)?.title)}</a></li>`).join('')+'</ol>':''}${relations.map(r=>`<p class="small">${esc(r.label)}：<a href="#guide/${encodeURIComponent(r.id)}">${esc(byId.get(r.id)?.title)}</a></p>`).join('')}${k.limitations?`<p>${esc(k.limitations)}</p>`:''}<p class="small">核验日期：${esc(k.review.accessedDate)}。${esc(k.review.note)}</p></details></article>`;
}
function practiceKnowledgeCard(k,heading='h2'){return `<article class="card" data-practice="true"><${heading}>${esc(k.title)}</${heading}><p>${esc(k.body)}</p><p class="small">${esc(k.source)}${k.url?' · 原项目概述，非本次核验条目':' · 项目自编内容，非官方教程'}</p>${heading==='h3'?'<a class="text-link" href="#ar">进入基础课堂 '+icon('arrow')+'</a>':''}</article>`}
async function guide(query=''){
 const routeEpoch=epoch;
 const module=await import('./embroidery-encyclopedia.js');if(!isCurrent())return;
 const {mountEmbroideryEncyclopedia}=module;
 const dispose=await mountEmbroideryEncyclopedia(main,{
  initialQuery:query,officialRenderer:officialKnowledgeCard,practiceRenderer:practiceKnowledgeCard,
  isCurrent:()=>isCurrent(),onOpenAR:()=>navigate('#ar')
 });
 if(!isCurrent()){dispose?.();return;}
 // Learning paths and official MOOC remain intact; only their page changes.
 const [learningModule,labModule,videoModule,toolsModule]=await Promise.all([
  import('./learning-path.js'),import('./stitch-lab.js'),
  import('./stitch-video-store.js'),import('./digital-tools-store.js')
 ]);
 if(!isCurrent()){dispose?.();return;}
 let videoController,labController,digitalController;
 const learningController=learningModule.mountLearningPath($('#learning-path'),{
  initialPath:query==='learn-gun'?'gun':'tao',
  onOpenCourse:({target})=>{document.querySelector('#official-videos')?.scrollIntoView({behavior:'smooth',block:'start'});return videoController?.selectCourseModule(target)??false;},
  onOpenKnowledge:({target})=>{navigate('#guide/'+encodeURIComponent(target));return true;},
  onOpenPractice:async({target})=>{document.querySelector('#stitch-lab')?.scrollIntoView({behavior:'smooth',block:'start'});return await labController?.selectDemo(target)??false;},
  onOpenArt:()=>{navigate('#ar');return true;},
  onOpenTool:async()=>{document.querySelector('#digital-tools')?.scrollIntoView({behavior:'smooth',block:'start'});return await digitalController?.focusOpenButton()??false;}
 });
 labController=labModule.mountStitchLab($('#stitch-lab'),{onDemoProgress:detail=>learningController.recordDemoProgress(detail)});
 digitalController=toolsModule.mountDigitalTools($('#digital-tools'));
 videoController=videoModule.mountVideoArchive($('#official-videos'),{openCourse:query==='mooc-suxiu'});
 $('#encyclopedia-practice').innerHTML=lessons.map((l,i)=>`<article class="card"><h3>${esc(l.name)}</h3><p>${esc(l.summary)}</p><ol>${l.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="small">${esc(l.tip)}</p><button type="button" data-learn="${i}">记录今日练习</button></article>`).join('');
 main.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{const day=new Date().toLocaleDateString('sv-SE');if(!progress.days.includes(day))progress.days.push(day);save();toast('今日练习已记在此浏览器')});
 cleanups.push(()=>{dispose?.();learningController.dispose();labController?.();digitalController?.();videoController?.();});
 if(['learn-tao','learn-gun','mooc-suxiu'].includes(query))requestAnimationFrame(()=>document.querySelector('#encyclopedia-learning')?.scrollIntoView({block:'start'}));
 const requestedDemo=query.startsWith('practice-')?query.slice('practice-'.length):'';
 if(labModule.demoCatalogue.some(d=>d.id===requestedDemo)){
  await labController.selectDemo(requestedDemo);
  if(isCurrent())$('#stitch-lab')?.scrollIntoView({block:'start'});
 }else if(query&&!query.startsWith('learn-')){
  const record=main.querySelector(`[data-global-embroidery="${CSS.escape(query)}"], [data-suxiu="${CSS.escape(query)}"]`);
  if(isCurrent())record?.scrollIntoView({block:'start'});
 }
}

 try{
  if(page==='palette'){
   await ensureStyle('restoredAtlas','./color-atlas.css');
   const {mountColorAtlas}=await import('./color-atlas-page.js');
   if(isCurrent()){const dispose=await mountColorAtlas(root,{isCurrent});if(dispose)cleanups.push(dispose);}
  }else if(page==='guide')await guide(query);
  else if(page==='game'){
   await Promise.all(gameStyles.map(([key,file])=>ensureStyle(key,file)));
   const response=await fetch(new URL('../content/patterns.json',import.meta.url));if(!response.ok)throw Error('纹样资料暂未加载');patterns=await response.json();
   if(isCurrent())await game();
  }else if(page==='account'){
   const controller=await cloudReady();
   const {mountCloudAccountPanel}=await import('./cloud-account-ui.js');
   if(isCurrent()){const dispose=await mountCloudAccountPanel(root,controller);if(dispose)cleanups.push(dispose);}
  }
  if(!isCurrent())cleanup();
  return cleanup;
 }catch(error){cleanup();throw error;}
}
