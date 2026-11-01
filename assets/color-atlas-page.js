import {palettes as editingPalettes} from './engine.js';
import {attachLocalCrop} from './atlas-local-crop.js';

const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const goodHex=h=>/^#[0-9A-Fa-f]{6}$/.test(h);
const safeLink=url=>/^https:\/\//.test(String(url||''))?url:'';
const styleOf=s=>s.styleFamily||(s.source==='artist-open-access'?(s.artist==='Claude Monet'?'印象派 · 馆藏作品':s.artist==='Vincent van Gogh'?'后印象派 · 馆藏作品':''): '');
const painterDisplay=s=>s.artistLabel||({'Claude Monet':'克劳德·莫奈','Vincent van Gogh':'文森特·梵高'})[s.artist]||s.artist;



function atlasDirectories(schemes){
 const actual=schemes.filter(x=>x.source==='artist-open-access'&&x.artwork);
 const people=[...new Map(actual.map(x=>[x.artist,x])).entries()].map(([key])=>{
  const artworks=actual.filter(x=>x.artist===key),first=artworks[0];
  return {key,display:painterDisplay(first),country:first.artistCountry||first.country||'未标明',
   style:styleOf(first)||'馆藏艺术',era:first.era||'',count:artworks.length,image:first.artwork.imagePath};
 }).sort((a,b)=>a.country.localeCompare(b.country,'zh-CN')||a.display.localeCompare(b.display,'zh-CN'));
 const categories=[...new Map(schemes.filter(x=>x.source==='art-style-original').map(x=>[styleOf(x),x])).entries()]
  .map(([key,first])=>({key,first,count:schemes.filter(x=>x.source==='art-style-original'&&styleOf(x)===key).length}))
  .sort((a,b)=>(a.first.culturalContext||'').localeCompare(b.first.culturalContext||'','zh-CN')||a.key.localeCompare(b.key,'zh-CN'));
 return {people,categories};
}
const sourceName=s=>({'museum-derivative':'克利夫兰艺术博物馆 · CC0 图像取色','radix-derived':'Radix Colors · 二次配色','radix-colors':'Radix Colors · MIT','chinese-colors':'中华传统色开源参考','brand':'梨花季原配色','world-pattern':'世界馆藏纹样取色','artist-open-access':'艺术家开放作品取色','art-style-original':'艺术风格灵感 · 梨花季原创'})[s]||'设计参考';
async function readJson(file){
 const response=await fetch('./content/'+file+'.json');
 if(!response.ok)throw Error(file+' 加载失败');
 return response.json();
}
function swatchBar(colors){
 return '<div class="atlas-swatches" aria-label="六色搭配">'+colors.map(c=>'<span style="background:'+ (goodHex(c)?c:'#fff')+'" title="'+escapeHTML(c)+'"></span>').join('')+'</div>';
}
function schemeCard(s){
 const work=s.artwork;
 const picture=work&&/^assets\/[\w./-]+$/.test(work.imagePath)&&!work.imagePath.includes('..')?work.imagePath:null;
 const origin=safeLink(s.sourceUrl);
 const facts=work?[['作品',work.title],['馆藏',work.institution],['创作年代',work.date],['馆藏编号',work.accession],['图片许可',work.license]]
  .filter(([,v])=>v!==undefined&&v!==null&&String(v).trim())
  .map(([label,value])=>'<div><dt>'+escapeHTML(label)+'</dt><dd>'+escapeHTML(value)+'</dd></div>').join(''):'';
 const catalogId=work?.catalogPatternId||work?.workId;
 const libraryLink=['world-pattern','museum-derivative'].includes(s.source)&&/^(?:CMA-[A-Za-z0-9-]+|met-cloud-\d{3})$/.test(String(catalogId||''))
  ?'#library/'+encodeURIComponent(catalogId):'';
 return '<article class="atlas-scheme">'+
   (picture?'<figure class="atlas-work-figure"><img class="atlas-work-img" src="./'+escapeHTML(picture)+'" loading="lazy" alt="'+escapeHTML(work.title)+' · 馆藏数字图像"><figcaption>原作数字图像 · 用于颜色参考，并非颜料实测</figcaption></figure>':'')+
   '<div class="atlas-scheme-inner"><small>'+escapeHTML(sourceName(s.source))+'</small><h3>'+escapeHTML(s.name)+'</h3>'+
   (s.artist||s.region||s.styleFamily?'<div class="atlas-context">'+escapeHTML([s.artist,s.region,s.styleFamily,s.artwork?.date].filter(Boolean).join(' · '))+'</div>':'')+
   (s.source==='world-pattern'&&s.relatedStyleIds?.length?'<p class="atlas-suggest"><span>文化设计延伸</span> · <button type="button" data-culture-pick="'+escapeHTML(s.region)+'">浏览相关地区艺术风格 ↗</button>'+(s.relatedArtistNames?.length?'<button type="button" data-culture-artist="'+escapeHTML(s.relatedArtistNames[0])+'">浏览关联地区画家 ↗</button>':'')+'<small>馆藏作品、画家与艺术风格之间仅作地区层级的当代设计联想；不代表历史作者或流派归属</small></p>':'')+
   (s.source==='art-style-original'&&s.referenceUrl?'<div class="atlas-context">文化语境：'+escapeHTML(s.culturalContext||'跨文化')+' · '+escapeHTML(s.era||'跨时期')+'</div>':'')+
   swatchBar(s.colors)+
   '<div class="atlas-hex-row">'+s.colors.map(h=>'<button type="button" data-copy="'+escapeHTML(h)+'" title="复制此色">'+escapeHTML(h)+'</button>').join('')+'</div>'+
   (facts?'<dl class="atlas-work-facts">'+facts+'</dl>':'')+
   '<p>'+escapeHTML(s.description||'数字屏幕设计参考，不等于实物丝线色号。')+'</p>'+
   '<div class="atlas-actions"><button type="button" class="atlas-use" data-use="'+s.paletteIndex+'">用于故事纹样</button>'+
   '<button type="button" data-export="'+escapeHTML(s.id)+'">导出配色及出处</button>'+ 
   (picture?'<button type="button" class="atlas-crop-open" data-crop="'+escapeHTML(s.id)+'">框选局部取色</button>':'')+
   (libraryLink?'<a href="'+escapeHTML(libraryLink)+'">在纹样库查看 ↗</a>':'')+
   (s.referenceUrl?'<a href="'+escapeHTML(safeLink(s.referenceUrl))+'" target="_blank" rel="noopener noreferrer">查阅博物馆艺术史 ↗</a>':'')+
   (origin?'<a href="'+escapeHTML(origin)+'" rel="noopener noreferrer" target="_blank">查看原始出处 ↗</a>':'')+
   '</div></div></article>';
}
function colorCard(c){
 return '<article class="atlas-color-card"><button type="button" class="atlas-color-block" data-copy="'+escapeHTML(c.hex)+'" style="background:'+c.hex+'" aria-label="复制'+escapeHTML(c.name)+' '+c.hex+'"></button>'+
 '<div class="atlas-color-meta"><strong>'+escapeHTML(c.name)+'</strong><button type="button" data-copy="'+escapeHTML(c.hex)+'">'+escapeHTML(c.hex)+'</button>'+
 '<small>'+escapeHTML(sourceName(c.source))+'</small></div></article>';
}
function saveScheme(s){
 const record={name:s.name,colors:s.colors,source:s.source,sourceUrl:s.sourceUrl||null,
  license:s.license||null,region:s.region||null,country:s.country||null,
  artist:s.artist||null,styleFamily:s.styleFamily||null,styleCategory:s.styleCategory||null,era:s.era||null,culturalContext:s.culturalContext||null,referenceUrl:s.referenceUrl||null,
  artwork:s.artwork?{
   title:s.artwork.title||null,institution:s.artwork.institution||null,
   workId:s.artwork.workId||null,catalogPatternId:s.artwork.catalogPatternId||null,accession:s.artwork.accession||null,
   date:s.artwork.date||null,url:s.artwork.url||null,
   imagePath:s.artwork.imagePath||null,license:s.artwork.license||null,
   rightsPolicy:s.artwork.rightsPolicy||null
  }:null,
  notice:'数字屏幕参考色谱；馆藏图片颜色是算法取样，非馆方官方色卡、历史颜料测色或真丝绣线色号。原创风格方案并非具体画家作品的实测色。'};
 const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='lihuaji-palette-'+String(s.id).replace(/[^a-z0-9_-]/gi,'-')+'.json';
 document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
}
export async function mountColorAtlas(root,{isCurrent=()=>true}={}){
 root.innerHTML='<section role="status" class="atlas-loading"><h1>东方色谱</h1><p>正在整理有出处的色彩档案…</p></section>';
 let design,museum,world;
 try{[design,museum,world]=await Promise.all([readJson('color-atlas-design'),readJson('color-atlas-museum'),readJson('color-atlas-world')]);}
 catch(e){if(isCurrent()&&root.isConnected)root.innerHTML='<article class="card"><h2>色谱暂时未能加载</h2><p>'+escapeHTML(e.message)+'</p><a class="btn" href="#palette">重新加载</a></article>';return;}
 if(!isCurrent()||!root.isConnected)return;
 if(museum.schemes.length!==100||design.schemes.length<100)throw Error('色谱方案数量尚未达到已审定的最低值');
 const originals=editingPalettes.slice(0,4).map((p,i)=>({id:'brand-'+i,name:p.name,colors:p.colors,source:'brand',paletteIndex:i,description:'梨花季保留的原始六色搭配。'}));
 const designSchemes=design.schemes.map((s,i)=>({...s,paletteIndex:i+4}));
 const museumSchemes=museum.schemes.map((s,i)=>({...s,paletteIndex:i+4+designSchemes.length}));
 const worldSchemes=world.schemes.map((s,i)=>({...s,paletteIndex:i+4+designSchemes.length+museumSchemes.length}));
 const schemes=[...originals,...worldSchemes,...museumSchemes,...designSchemes];
 const colors=[...design.colors,...museum.colors,...world.colors].filter(c=>goodHex(c.hex));
 const regionNames=[...new Set(worldSchemes.filter(x=>x.source==='world-pattern'&&x.region).map(x=>x.region))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 const countryNames=[...new Set(schemes.filter(x=>x.country&&x.artwork).map(x=>x.country))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 const styleNames=[...new Set(schemes.map(styleOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 const artistNames=[...new Set(worldSchemes.filter(x=>x.source==='artist-open-access'&&x.artist).map(x=>x.artist))].sort();
 const regionSelect=regionNames.map(n=>'<option value="'+escapeHTML(n)+'">'+escapeHTML(n)+'</option>').join('');
 const artistSelect=artistNames.map(n=>{const sample=worldSchemes.find(s=>s.artist===n);return '<option value="'+escapeHTML(n)+'">'+escapeHTML(painterDisplay(sample)+' / '+n)+'</option>';}).join('');
 const countrySelect=countryNames.map(n=>'<option value="'+escapeHTML(n)+'">'+escapeHTML(n==='China'?'中国（馆方记录：China）':n)+'</option>').join('');
 const styleSelect=styleNames.map(n=>'<option value="'+escapeHTML(n)+'">'+escapeHTML(n)+'</option>').join('');
 const uniqueHex=new Set(colors.map(c=>c.hex.toUpperCase())).size;
 const directories=atlasDirectories(worldSchemes);
 if((editingPalettes.length!==schemes.length&&editingPalettes.length!==schemes.length+1)||world.stats.schemeCount!==worldSchemes.length)throw Error('色库与纹样引擎的选项编号不一致');
 const statusSource= '<p>馆藏方案来自经确认 CC0 或 Public Domain 的开放图像；颜色由梨花季计算取样，<b>不是馆方官方色卡</b>。莫兰迪式等艺术风格组合是本站原创搭配，<b>不是画家具体作品的提取色</b>。开源传统色及 Radix 标准色遵循 MIT 许可；屏幕颜色不等于实物绣线色号。</p>';
 root.innerHTML='<div class="atlas-root">'+
  '<header class="atlas-hero"><span class="atlas-kicker">LIHUAJI / WORLD ART COLOUR ARCHIVE</span><h1>东方色谱</h1><p>从东方传统色走向世界：按画家姓名进入开放馆藏原作和六色配色，按国家、时代浏览原创艺术风格，与各地文化纹样相互启发。所有真实作品保留可追溯出处。</p>'+
  '<div class="atlas-counts"><div><b>'+uniqueHex+'</b><span>种不同 HEX</span></div><div><b>'+schemes.length+'</b><span>套六色搭配</span></div><div><b>'+world.stats.artistSchemes+'</b><span>套艺术家作品取色</span></div></div></header>'+
  '<aside class="atlas-provenance">'+statusSource+'</aside>'+ 
 '<div class="atlas-shortcuts" role="group" aria-label="世界艺术色谱三大分类"><button type="button" data-jump="artist">画家作品 · '+directories.people.length+' 位画家</button><button type="button" data-jump="style">艺术风格 · '+world.stats.originalStyleSchemes+' 套</button><button type="button" data-jump="world">世界文化纹样 · '+world.stats.culturalSchemes+' 套</button></div>'+
  '<div class="atlas-controls"><div class="atlas-mode"><button type="button" data-mode="schemes" aria-pressed="true">多色搭配</button><button type="button" data-mode="colors" aria-pressed="false">单色检索</button></div>'+
  '<label>搜索色名、色系、作品<input type="search" id="atlas-query" placeholder="梨花、胭脂、jade、花鸟…"></label>'+
  '<label>资料来源<select id="atlas-source"><option value="all">全部来源</option><option value="artist">画家作品</option><option value="style">艺术风格</option><option value="world">世界文化纹样</option><option value="museum">全部开放馆藏</option><option value="design">Radix 现代设计色</option><option value="chinese">中华传统色</option><option value="brand">梨花季原有色</option></select></label>'+ 
 '<label>文化地区<select id="atlas-region"><option value="">全部文化地区</option>'+regionSelect+'</select></label>'+ 
 '<label>画家姓名<select id="atlas-artist"><option value="">全部画家</option>'+artistSelect+'</select></label>'+
 '<label>国家／文化归属<select id="atlas-country"><option value="">全部已核实国家</option>'+countrySelect+'</select><small>仅按馆藏资料标明的归属；未注明者不强行归国。</small></label>'+
 '<label>艺术流派／风格<select id="atlas-style"><option value="">全部流派与风格</option>'+styleSelect+'</select><small>区分真实画作与本站原创风格灵感。</small></label></div>'+
  '<section id="atlas-directory" class="atlas-directory" aria-live="polite"></section><p class="atlas-results" id="atlas-results" role="status"></p><div id="atlas-cards" class="atlas-scheme-grid"></div><div id="atlas-more"></div>'+
  '<footer class="atlas-footer"><h2>取色与许可说明</h2>'+statusSource+
  '<p><a href="https://www.clevelandart.org/open-access" target="_blank" rel="noopener noreferrer">克利夫兰艺术博物馆开放数据</a> · <a href="https://github.com/radix-ui/colors" target="_blank" rel="noopener noreferrer">Radix Colors</a> · <a href="https://github.com/zerosoul/chinese-colors" target="_blank" rel="noopener noreferrer">中华传统色社区</a> · <a href="https://github.com/yzou6525-ai/lihuaji/blob/main/docs/color-atlas/WORLD-SOURCES.md" target="_blank" rel="noopener noreferrer">世界艺术来源审计</a> · <a href="https://github.com/yzou6525-ai/lihuaji/blob/main/docs/color-atlas/SOURCES.md" target="_blank" rel="noopener noreferrer">原有开源色库许可</a></p></footer></div>';
 const querySelector=s=>root.querySelector(s);
 const state={mode:'schemes',query:'',source:'all',region:'',artist:'',country:'',style:'',page:1,view:''};
 try{const pending=sessionStorage.getItem('lihuaji:color-atlas-query');if(pending){state.query=pending;querySelector('#atlas-query').value=pending;sessionStorage.removeItem('lihuaji:color-atlas-query');}}catch{}
 const sourceMatch=x=>state.source==='all'||state.source==='museum'&&['museum-derivative','world-pattern','artist-open-access'].includes(x.source)||state.source==='world'&&x.source==='world-pattern'||state.source==='artist'&&x.source==='artist-open-access'||state.source==='style'&&x.source==='art-style-original'||state.source==='chinese'&&x.source==='chinese-colors'||state.source==='brand'&&x.source==='brand'||state.source==='design'&&['radix-derived','radix-colors'].includes(x.source);
 function render(){
  if(!isCurrent()||!root.isConnected)return;
  const data=state.mode==='schemes'?schemes:colors;
  const q=state.query.toLowerCase();
  const filtered=data.filter(x=>sourceMatch(x)&&(!state.region||x.region===state.region)&&(!state.artist||x.artist===state.artist)&&(!state.country||x.country===state.country)&&(!state.style||styleOf(x)===state.style)&&(!q||[x.name,x.hex,x.group,x.id,x.artwork?.title,x.artwork?.accession,x.artwork?.workId,x.artist,x.region,x.country,x.cultureLabel,x.styleFamily].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))));
  const displayed=filtered.slice(0,state.page*24);
  const directory=querySelector('#atlas-directory');
  if(state.mode==='schemes'&&state.view==='artist'&&state.source==='artist'&&!state.artist&&!state.query){
   const people=directories.people.filter(p=>(!state.country||state.country===p.country)&&(!state.style||state.style===p.style));
   directory.innerHTML='<div class="atlas-directory-heading"><div><span class="atlas-kicker">PAINTERS / OPEN ACCESS WORKS</span><h2>画家作品</h2><p>先选择画家，再进入此人的真实馆藏原作及六色配色。仅显示已核验许可、作者和原图的作品。</p></div><span>'+people.length+' 位画家</span></div>'+
    '<div class="atlas-artist-directory">'+people.map(p=>'<button type="button" class="atlas-artist-entry" data-artist-pick="'+escapeHTML(p.key)+'"><img src="./'+escapeHTML(p.image)+'" alt="'+escapeHTML(p.display)+'代表开放馆藏作品" loading="lazy"><span class="atlas-artist-entry-info"><b>'+escapeHTML(p.display)+'</b><small>'+escapeHTML(p.key)+'</small><small>'+escapeHTML([p.country,p.era,p.style].filter(Boolean).join(' · '))+'</small><strong>'+p.count+' 件馆藏作品 →</strong></span></button>').join('')+'</div>';
   querySelector('#atlas-results').textContent='当前找到 '+world.stats.artistSchemes+' 套真实画作配色。请选择上方画家姓名，进入对应作品。';
   querySelector('#atlas-cards').replaceChildren();querySelector('#atlas-more').replaceChildren();return;
  }
  if(state.mode==='schemes'&&state.view==='style'&&state.source==='style'&&!state.style&&!state.query){
   directory.innerHTML='<div class="atlas-directory-heading"><div><span class="atlas-kicker">WORLD ART STYLES / EDITORIAL PALETTES</span><h2>艺术风格</h2><p>按文化地域与历史语境选择艺术风格。以下色卡均由梨花季原创设计，参考权威博物馆的艺术史资料，但不是馆方或原艺术家认证色卡。</p></div><span>'+directories.categories.length+' 个风格分类</span></div>'+
   '<div class="atlas-style-directory">'+directories.categories.map(p=>'<button type="button" class="atlas-style-entry" data-style-pick="'+escapeHTML(p.key)+'">'+swatchBar(p.first.colors)+'<b>'+escapeHTML(p.key)+'</b><small>'+escapeHTML([p.first.culturalContext||p.first.cultureLabel,p.first.era].filter(Boolean).join(' · '))+'</small><span>'+p.count+' 套配色 →</span></button>').join('')+'</div>';
  }else if(state.mode==='schemes'&&state.view==='artist'&&state.artist){
   const p=directories.people.find(p=>p.key===state.artist);
   directory.innerHTML=p?'<div class="atlas-directory-heading atlas-artist-detail"><div><button type="button" class="atlas-back" data-back-artists>← 返回全部画家</button><span class="atlas-kicker">ARTIST / VERIFIED MUSEUM WORKS</span><h2>'+escapeHTML(p.display)+'</h2><p>'+escapeHTML([p.key,p.country,p.era,p.style].filter(Boolean).join(' · '))+' · '+p.count+' 件作品</p>'+(world.culturalDiscovery?.regions?.find(x=>x.artistNames.includes(p.key))?'<button type="button" class="atlas-back" data-artist-region="'+escapeHTML(world.culturalDiscovery.regions.find(x=>x.artistNames.includes(p.key)).region)+'">探索相关文化地区馆藏纹样 →</button>':'')+'</div></div>':'';
  }else{directory.replaceChildren();}
  if(state.mode==='schemes'&&state.view==='world'&&state.source==='world'&&!state.region&&!state.query){
   const groups=[...new Set(worldSchemes.filter(x=>x.source==='world-pattern').map(s=>s.region))];
   directory.innerHTML='<div class="atlas-directory-heading"><div><span class="atlas-kicker">GLOBAL MOTIFS / VERIFIED COLLECTIONS</span><h2>世界文化纹样</h2><p>文化地区是馆藏目录中的宏观索引；传统纹样与现代风格之间提供设计灵感关联，不推断历史传承关系。</p></div></div><div class="atlas-culture-directory">'+groups.map(g=>'<button type="button" data-region-pick="'+escapeHTML(g)+'">'+escapeHTML(g)+' · '+worldSchemes.filter(x=>x.source==='world-pattern'&&x.region===g).length+' 件 ↗</button>').join('')+'</div>';
  }
  querySelector('#atlas-results').textContent='当前找到 '+filtered.length+' '+(state.mode==='schemes'?'套配色方案':'条单色记录')+'；已显示 '+displayed.length+' 条。'+(state.mode==='colors'?'不同来源可能含相同 HEX。':'');
  const area=querySelector('#atlas-cards');area.className=state.mode==='schemes'?'atlas-scheme-grid':'atlas-color-grid';
  area.innerHTML=displayed.length?displayed.map(state.mode==='schemes'?schemeCard:colorCard).join(''):'<p>没有找到匹配颜色，请换个关键词。</p>';
  querySelector('#atlas-more').innerHTML=filtered.length>displayed.length?'<button id="atlas-load-next" type="button">加载下一批色卡</button>':'';
  querySelector('#atlas-load-next')?.addEventListener('click',()=>{state.page++;render();});
 }
 const reset=()=>{state.page=1;render()};
 root.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
  state.mode=b.dataset.mode;if(state.mode==='schemes'&&state.source==='chinese'){state.source='all';querySelector('#atlas-source').value='all';}root.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));reset();
 }));
 querySelector('#atlas-query').addEventListener('input',e=>{state.query=e.target.value.trim();reset()});
 querySelector('#atlas-source').addEventListener('change',e=>{state.source=e.target.value;state.view=['artist','style','world'].includes(state.source)?state.source:'';state.region='';state.artist='';state.country='';state.style='';querySelector('#atlas-region').value='';querySelector('#atlas-artist').value='';querySelector('#atlas-country').value='';querySelector('#atlas-style').value='';if(state.source==='chinese'&&state.mode==='schemes'){state.mode='colors';root.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode==='colors')));}reset()});
 querySelector('#atlas-region').addEventListener('change',e=>{state.view='world';state.region=e.target.value;state.artist='';querySelector('#atlas-artist').value='';state.source='world';querySelector('#atlas-source').value='world';reset()});
 querySelector('#atlas-artist').addEventListener('change',e=>{state.view='artist';state.artist=e.target.value;state.region='';querySelector('#atlas-region').value='';state.source='artist';querySelector('#atlas-source').value='artist';reset()});
 querySelector('#atlas-country').addEventListener('change',e=>{state.country=e.target.value;reset()});
 querySelector('#atlas-style').addEventListener('change',e=>{state.view=state.style?'':'style';state.style=e.target.value;if(state.style&&state.source!=='all'){state.source='all';querySelector('#atlas-source').value='all';}reset()});
 root.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{state.mode='schemes';state.source=b.dataset.jump;state.view=b.dataset.jump;state.region='';state.artist='';state.country='';state.style='';state.query='';querySelector('#atlas-query').value='';querySelector('#atlas-country').value='';querySelector('#atlas-style').value='';querySelector('#atlas-source').value=state.source;querySelector('#atlas-region').value='';querySelector('#atlas-artist').value='';root.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode==='schemes')));reset();querySelector('#atlas-results').scrollIntoView({behavior:'smooth',block:'start'});}));
 attachLocalCrop(root,id=>schemes.find(s=>s.id===id));
 root.addEventListener('click',async e=>{
  const artistPick=e.target.closest('[data-artist-pick]');
  if(artistPick&&root.contains(artistPick)){
   state.view='artist';state.source='artist';state.artist=artistPick.dataset.artistPick;state.region='';state.country='';state.style='';state.query='';
   querySelector('#atlas-source').value='artist';querySelector('#atlas-artist').value=state.artist;querySelector('#atlas-query').value='';querySelector('#atlas-country').value='';querySelector('#atlas-style').value='';reset();return;
  }
  if(e.target.closest('[data-back-artists]')){state.view='artist';state.artist='';state.query='';state.country='';state.style='';querySelector('#atlas-artist').value='';querySelector('#atlas-query').value='';querySelector('#atlas-country').value='';querySelector('#atlas-style').value='';reset();return;}
  const pick=e.target.closest('[data-style-pick]');
  if(pick){state.view='style';state.source='style';state.style=pick.dataset.stylePick;state.query='';state.artist='';state.country='';state.region='';querySelector('#atlas-source').value='style';querySelector('#atlas-style').value=state.style;querySelector('#atlas-artist').value='';querySelector('#atlas-country').value='';querySelector('#atlas-region').value='';querySelector('#atlas-query').value='';reset();return;}
  const reg=e.target.closest('[data-region-pick]');
  if(reg){state.view='world';state.source='world';state.region=reg.dataset.regionPick;querySelector('#atlas-source').value='world';querySelector('#atlas-region').value=state.region;reset();return;}
  const shared=e.target.closest('[data-culture-artist]');
  if(shared){
   const person=directories.people.find(p=>p.key===shared.dataset.cultureArtist);
   if(person){state.view='artist';state.source='artist';state.artist=person.key;state.region='';state.country='';state.style='';state.query='';querySelector('#atlas-source').value='artist';querySelector('#atlas-artist').value=person.key;querySelector('#atlas-region').value='';querySelector('#atlas-country').value='';querySelector('#atlas-style').value='';querySelector('#atlas-query').value='';reset();}
   return;
  }
  const artistRegion=e.target.closest('[data-artist-region]');
  if(artistRegion){state.view='world';state.source='world';state.artist='';state.region=artistRegion.dataset.artistRegion;state.query='';state.country='';state.style='';querySelector('#atlas-source').value='world';querySelector('#atlas-region').value=state.region;querySelector('#atlas-artist').value='';querySelector('#atlas-query').value='';querySelector('#atlas-country').value='';querySelector('#atlas-style').value='';reset();return;}
  const cul=e.target.closest('[data-culture-pick]');
  if(cul){state.view='style';state.source='style';state.region='';state.artist='';state.style='';state.country='';state.query='';querySelector('#atlas-source').value='style';querySelector('#atlas-region').value='';querySelector('#atlas-artist').value='';querySelector('#atlas-country').value='';querySelector('#atlas-style').value='';querySelector('#atlas-query').value='';reset();const supported=new Set(world.culturalDiscovery?.regions?.find(r=>r.region===cul.dataset.culturePick)?.styleIds||[]);querySelector('#atlas-directory').querySelectorAll('[data-style-pick]').forEach(btn=>{const p=directories.categories.find(x=>x.key===btn.dataset.stylePick);btn.hidden=!p||!worldSchemes.some(s=>s.source==='art-style-original'&&styleOf(s)===p.key&&supported.has(s.id))});return;}

  const b=e.target.closest('button');if(!b||!root.contains(b))return;
  if(b.dataset.copy&&goodHex(b.dataset.copy)){
   try{await navigator.clipboard.writeText(b.dataset.copy);querySelector('#atlas-results').textContent='已复制：'+b.dataset.copy;}
   catch{querySelector('#atlas-results').textContent='浏览器未允许自动复制，请手动复制：'+b.dataset.copy;}
  }
  if(b.dataset.use!==undefined){
   const i=Number(b.dataset.use);if(!Number.isInteger(i)||i<0||i>=editingPalettes.length)return;
   try{sessionStorage.setItem('lihuaji:color-atlas-preset',String(i));}catch{}
   location.hash='#story';
  }
  if(b.dataset.export){
   const s=schemes.find(x=>x.id===b.dataset.export);if(s)saveScheme(s);
  }
 });
 render();
}
