// Public-domain, official-source previews for the separate global motif accession archive.
// Existing 1,088 traditional pattern records and all original local images remain immutable.
const normalize=s=>String(s??'').normalize('NFKC').toLowerCase().trim();
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pdImage=u=>{try{const url=new URL(u);return url.protocol==='https:'&&url.hostname==='images.metmuseum.org'&&!url.username&&!url.password;}catch{return false}};
export function validateWorldMotifs(data,existing=[]){
 if(data?.version!==1||!Array.isArray(data.records)||data.records.length<30)throw Error('全球馆藏扩展数据缺失');
 const ids=new Set(),origins=new Set(),existingRefs=new Set(existing.flatMap(x=>[x.sourceUrl,x.sourceApiUrl,x.museumObjectId&&String(x.museumObjectId)].filter(Boolean)));
 const filtered=[],duplicates=[];
 for(const r of data.records){
  if(!/^worldmotif-met-\d+$/.test(r.id)||!Number.isSafeInteger(r.museumObjectId)||r.id!==`worldmotif-met-${r.museumObjectId}`)throw Error('无效原作编号 '+r.id);
  const url=`https://www.metmuseum.org/art/collection/search/${r.museumObjectId}`;
  if(r.sourceUrl!==url||r.sourceApiUrl!==`https://collectionapi.metmuseum.org/public/collection/v1/objects/${r.museumObjectId}`)throw Error('馆方原始链接不一致 '+r.id);
  if(!r.title||!r.originalTitle||!r.description||!r.culture||!r.date||!r.region||!r.motif||!r.tags?.length||!r.review?.sourceUrlChecked)throw Error('馆藏来源信息不完整 '+r.id);
  if(r.collection!=='world'||r.imagePolicy!=='on-demand-official-api-public-domain-only'||r.batch!==data.batch||!r.semanticScope)throw Error('来源与图像政策不合规 '+r.id);
  if(!['auspicious','decorative','status','cultural'].includes(r.meaningStatus)||r.review.expertReviewed!==false)throw Error('图案文化意义边界无效 '+r.id);
  if(ids.has(r.id)||origins.has(url))throw Error('本批纹样重复 '+r.id);ids.add(r.id);origins.add(url);
  if(existingRefs.has(url)||existingRefs.has(r.sourceApiUrl)||existingRefs.has(String(r.museumObjectId))){duplicates.push(r.id);continue}
  filtered.push(r);
 }
 return {rows:filtered,duplicates};
}
export function verifyMetPatternImage(record,apiData){
 if(apiData?.objectID!==record?.museumObjectId)return {ok:false,reason:'馆藏 ID 不一致'};
 if(apiData.isPublicDomain!==true)return {ok:false,reason:'馆方未标明 Public Domain'};
 const picture=String(apiData.primaryImageSmall||'');
 if(!pdImage(picture))return {ok:false,reason:'未获得合规的官方图像地址'};
 if(!normalize(apiData.title))return {ok:false,reason:'馆方作品名称缺失'};
 return {ok:true,image:picture,originalTitle:apiData.title,accession:apiData.accessionNumber||'馆方未公布',date:apiData.objectDate||record.date,culture:apiData.culture||record.culture};
}
export async function loadWorldMotifCatalog(fetcher=fetch){
 const resp=await fetcher(new URL('../content/world-motifs.json',import.meta.url));
 if(!resp.ok)throw Error('全球馆藏资料暂不可用');
 return resp.json();
}
const sections=[{key:'',label:'全部地区'},{key:'东亚邻邦',label:'东亚邻邦'},{key:'南亚',label:'南亚'},{key:'东南亚',label:'东南亚'},{key:'中亚',label:'中亚'},{key:'波斯与西亚',label:'波斯与西亚'},{key:'埃及与地中海',label:'埃及与地中海'},{key:'欧洲',label:'欧洲'},{key:'非洲',label:'非洲'},{key:'美洲',label:'美洲'}];
export async function mountWorldMotifs(root,existing=[],{isCurrent=()=>true,fetcher=fetch}={}){
 let alive=true,observer=null,fetchAbort=new AbortController(),region='',query='',data=[],pending=new Set();
 const drawStatus=t=>{const node=root.querySelector('#world-motif-status');if(node)node.textContent=t};
 let report;
 try{const v=await loadWorldMotifCatalog(fetcher);report=validateWorldMotifs(v,existing);data=report.rows;}
 catch(e){root.textContent='世界馆藏补充资料尚未完成加载。原有纹样库不受影响。';return()=>{}}
 if(!isCurrent())return()=>{};
 if(!document.querySelector('link[data-world-motif-style]')){
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./world-motifs.css',import.meta.url).href;
  style.dataset.worldMotifStyle='';document.head.append(style);
 }
 root.innerHTML=`<section class="world-motifs" aria-label="世界装饰纹样馆藏增补"><header class="world-motif-heading"><div>
  <span class="world-motif-eyebrow">GLOBAL MOTIF ARCHIVE / THE MET OPEN ACCESS</span>
  <h2>世界纹样 · 馆藏增补</h2>
  <p>原有1,088份传统纹样完整保留；这里另展示 ${data.length} 条馆藏原作参考。由真实年代、地域、材料和装饰构图出发，不将所有图案翻译为“中国祥纹”。</p>
  </div><a href="https://www.metmuseum.org/hubs/open-access" target="_blank" rel="noopener noreferrer">查阅馆方开放图像政策 ↗</a></header>
  <div class="world-motif-filter"><label>检索全球纹样<input id="world-motif-search" type="search" placeholder="鹤、棕榈叶、伊朗、古埃及、星纹…" autocomplete="off"></label><div id="world-motif-tabs" role="group" aria-label="按原产文化区域分类"></div></div>
  <p id="world-motif-status" role="status"></p><div id="world-motif-grid" class="world-motif-grid"></div>
  <p class="world-motif-caution">文化身份不等于馆藏所在地。对吉祥、宗教、官阶或仪式含义，仅在有明确资料时才标示；没有把历史原作裁切成未经核实的“原创纹样”。馆方 API 无法验证授权时，将仅保留文字与原始链接。图像来自馆方 CDN，未保存或复制到梨花季仓库；收藏并不代表传统文化已授权商业衍生设计。</p></section>`;
 const grid=root.querySelector('#world-motif-grid'),tabs=root.querySelector('#world-motif-tabs');
 tabs.innerHTML=sections.map(t=>`<button type="button" data-motif-region="${escapeHTML(t.key)}" aria-pressed="${!t.key?'true':'false'}">${escapeHTML(t.label)}</button>`).join('');
 root.querySelector('#world-motif-search').addEventListener('input',e=>{query=normalize(e.target.value);draw()});
 tabs.addEventListener('click',e=>{const btn=e.target.closest('[data-motif-region]');if(!btn)return;region=btn.dataset.motifRegion;for(const el of tabs.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el===btn));draw()});
 const imageCache=new Map();
 let count=0;
 async function loadVisual(record,area){
  if(!alive||!isCurrent()||pending.has(record.id))return;
  const cached=imageCache.get(record.id);
  if(cached){renderVisual(area,cached,record);return}
  pending.add(record.id);area.textContent='正在核对馆方图像授权…';
  try{
   const response=await fetcher(record.sourceApiUrl,{signal:fetchAbort.signal});
   if(!response.ok)throw Error('馆方暂不可访问');
   const official=await response.json();
   if(!alive||!isCurrent()||!root.contains(area))return;
   const verdict=verifyMetPatternImage(record,official);
   imageCache.set(record.id,verdict);renderVisual(area,verdict,record);
  }catch(error){
   if(!fetchAbort.signal.aborted&&root.contains(area))area.textContent='图像暂不可用，请使用下方官方来源链接核对。';
  }finally{pending.delete(record.id)}
 }
 function renderVisual(area,result,record){
  if(!root.contains(area))return;
  if(!result.ok){area.textContent=result.reason+'；仅展示馆藏来源。';return}
  const img=document.createElement('img');img.src=result.image;img.alt=record.title+'：大都会博物馆公有领域原作缩略图';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.onerror=()=>{if(root.contains(area))area.textContent='图像未能载入，请通过官方藏品页查看。'};
  const cap=document.createElement('small');cap.textContent='The Met · Public Domain · '+result.accession;
  area.replaceChildren(img,cap);
 }
 function draw(){
  if(!alive||!isCurrent())return;
  observer?.disconnect();observer=null;
  const list=data.filter(x=>(!region||x.region===region)&&(!query||[x.title,x.culture,x.region,x.motif,x.date,x.description,x.tags.join('、')].join(' ').toLowerCase().includes(query))).slice(0,60);
  drawStatus('此批独立馆藏记录 '+data.length+' 条，当前匹配 '+list.length+' 条'+(report.duplicates.length?'；与原库去重 '+report.duplicates.length+' 条':'')+'。只有授权核实成功才加载官方图像。');
  grid.innerHTML=list.map(row=>`<article class="world-motif-item" data-world-motif="${row.id}"><div class="world-motif-picture" data-motif-image="${row.id}">馆方开放图像 · 点击核验加载</div><div class="world-motif-body"><span class="world-motif-place">${escapeHTML(row.region)} · ${escapeHTML(row.culture)}</span><h3>${escapeHTML(row.title)}</h3><p>${escapeHTML(row.description)}</p><p class="world-motif-metadata">${escapeHTML(row.date)} · ${escapeHTML(row.motif)}</p><span class="world-motif-semantics">${escapeHTML(row.semanticScope)}</span><div class="world-motif-actions"><button type="button" data-motif-show="${row.id}">核验并看馆藏原图</button><a href="${escapeHTML(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">馆方原始记录 ↗</a></div></div></article>`).join('')||'<p>当前分类无匹配馆藏，请改用其他地区或题材关键词。</p>';
  if('IntersectionObserver'in window){observer=new IntersectionObserver(items=>{for(const v of items){if(!v.isIntersecting)continue;observer?.unobserve(v.target);const id=v.target.dataset.motifImage;const record=list.find(x=>x.id===id);if(record)void loadVisual(record,v.target)}},{rootMargin:'80px 0px'});for(const el of grid.querySelectorAll('[data-motif-image]'))observer.observe(el)}
 }
 grid.addEventListener('click',e=>{const button=e.target.closest('[data-motif-show]');if(!button)return;const record=data.find(x=>x.id===button.dataset.motifShow);const area=button.closest('[data-world-motif]')?.querySelector('[data-motif-image]');if(record&&area)void loadVisual(record,area)});
 draw();
 return()=>{alive=false;observer?.disconnect();fetchAbort.abort();root.replaceChildren()};
}
