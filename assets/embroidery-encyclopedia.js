import {TOPICS,rankKnowledge,loadEmbroideryArchive,evidenceReply} from './embroidery-knowledge.js';
import {knowledge as practice,retrieve as findPractice} from './knowledge.js';
import {mountMetImagePreview} from './embroidery-met-preview.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=url=>/^https:\/\/[^\s<>"']+$/.test(String(url||''))?url:'';
const validAI=url=>/^https:\/\/[A-Za-z0-9.-]+\.workers\.dev\/?$/.test(String(url||''))||/^https:\/\/api\.[a-z0-9.-]+\/?$/.test(String(url||''));
const persona=`<svg viewBox="0 0 210 214" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="梨花季原创绣娘形象插画示意">
<circle cx="105" cy="105" r="100" fill="#E8EBE0"/><path d="M14 172q27-37 70-35h43q51-1 70 43v15H14z" fill="#738C7A"/><path d="m25 188 68-46 12 56H15zm170 0-68-46-12 56h80z" fill="#BDD0C0"/><path d="m87 149 18 42 19-42" fill="#F0E2CD"/>
<path d="M70 110q-19-23-15-59 5-39 46-38 41-4 53 37 6 40-13 65z" fill="#2E3934"/>
<ellipse cx="104" cy="91" rx="38" ry="48" fill="#EBD6BE"/><path d="M63 66q21 0 35-25 16 17 45 21L136 34 85 22 60 49z" fill="#303A34"/>
<path d="M85 88q7-5 13 0m14 0q7-5 13 0" stroke="#5B4941" stroke-width="2.7" stroke-linecap="round"/>
<path d="M103 104q3 3 6 0" stroke="#C28F80" stroke-width="1.6"/><path d="M98 115q6 4 13 0" stroke="#B66F72" stroke-width="2" stroke-linecap="round" class="embroider-mouth"/>
<path d="M145 43q21-15 26 1" stroke="#C9A96E" stroke-width="4" stroke-linecap="round"/><path d="m167 30-11 14 16 7" stroke="#CFB579" stroke-width="3" stroke-linecap="round"/>
<path d="M35 181q37-23 70 9 28-24 66-10" stroke="#D8E1CC" stroke-width="3"/><path d="m140 157 20 18m-20 0 20-18" stroke="#EBDCC2" stroke-width="3"/>
<path d="M158 166c14 7 19 3 20-6" stroke="#DCCB9C" stroke-width="2" stroke-linecap="round"/><circle cx="179" cy="158" r="4" fill="#D0A9A0"/><path d="m168 166 15 24" stroke="#E3BA93" stroke-width="2"/>
</svg>`;
function validWorld(data){
 return Array.isArray(data?.records)&&data.records.every(x=>x.id.startsWith('world-')&&x.source?.url?.startsWith('https://')&&x.verified===true);
}
function itemCard(record,archive,officialRenderer){
 if(record.official)return officialRenderer(record.official,archive.original);
 const links=record.citations.map(id=>archive.sources.get(id)).filter(Boolean);
 const provenance=record.museum?'<div class="encyclopedia-object"><strong>THE MET · 馆藏实物</strong><span>馆藏编号 '+esc(record.museum.objectNumber)+'</span><span>'+esc(record.museum.classification)+'</span></div>'+
 '<div class="encyclopedia-met-preview"><button type="button" data-met-preview="'+esc(record.id)+'">查看馆方开放图像 ↗</button><div data-met-preview-region aria-live="polite">由馆方 API 验证图片是否为 Public Domain，点击后才加载。</div></div>':'';
 return '<article class="card encyclopedia-record" data-global-embroidery="'+esc(record.id)+'"><h2>'+esc(record.title)+'</h2><p>'+esc(record.summary)+'</p>'+provenance+
 '<div class="encyclopedia-meta">'+esc(record.region)+' · '+esc(record.period)+' · 来源整理未获专业审定</div>'+
 '<details><summary>事实与来源</summary>'+record.facts.map(x=>'<p>'+esc(x)+'</p>').join('')+
 (record.museum?'<p class="encyclopedia-attribution">归属边界：'+esc(record.museum.attributionNote)+'</p><p class="small">图像许可：'+esc(record.museum.rights)+'</p>':'')+
 links.map(s=>'<a href="'+esc(safeUrl(s.url))+'" target="_blank" rel="noopener noreferrer">打开原始公开资料 ↗ '+esc(s.organization)+'</a>').join('')+
 '<p class="small">不转载馆方原文或受保护图片；时代／文化分类为编辑性索引。</p></details></article>';
}
function appendMessage(chat,role,text,citations=[],records=[],archive=null){
 const article=document.createElement('article');article.className='embroider-message '+(role==='user'?'is-user':'is-guide');
 const meta=document.createElement('span');meta.className='embroider-message-label';meta.textContent=role==='user'?'你':'绣娘 · '+(role==='ai'?'AI 文献问答':'有出处的资料检索');article.append(meta);
 const p=document.createElement('p');p.textContent=text;article.append(p);
 if(citations.length){const refs=document.createElement('div');refs.className='embroider-citations';
  const seen=new Set();for(const s of citations){const url=safeUrl(s.url);if(!url||seen.has(url))continue;seen.add(url);const a=document.createElement('a');a.href=url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='出处 ↗ '+(s.organization||s.title||'原始来源');refs.append(a);}article.append(refs);}
 if(archive&&records.length){const nav=document.createElement('div');nav.className='embroider-related-records';const label=document.createElement('span');label.textContent='打开引用的知识档案';nav.append(label);
  for(const id of records){const row=archive.records.find(x=>x.id===id);if(!row)continue;
   const button=document.createElement('button');button.type='button';button.textContent=row.title;button.dataset.guideRecord=row.id;nav.append(button);}
  if(nav.children.length>1)article.append(nav);
 }
 chat.append(article);chat.scrollTop=chat.scrollHeight;return article;
}
 export async function mountEmbroideryEncyclopedia(root,{initialQuery='',officialRenderer,practiceRenderer,isCurrent=()=>true,onOpenAR=()=>{location.hash='#ar'}}={}){
 let alive=true,abort=null,listening=null,speaking=false,archive=null,endpoint='',searchRevision=0,conversation=[];
 let xiaoliApi=null;  // { dispose, setState } 3D 小梨 API
 let phoneMode=false;  // 电话式连续对话模式
 let silenceTimer=0;   // 检测停顿后自动提交
 if(!document.querySelector('link[data-encyclopedia-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./embroidery-encyclopedia.css',import.meta.url).href;link.dataset.encyclopediaCss='';document.head.append(link);}
 const status=message=>{const el=root.querySelector('#embroider-state');if(el)el.textContent=message;};
 const stopVoice=()=>{
  try{speechSynthesis.cancel();}catch{}
  try{listening?.abort();}catch{}
  root.querySelector('.embroider-persona')?.setAttribute('data-speaking','false');
  speaking=false;
  if(xiaoliApi){xiaoliApi.setState('idle');}
  clearTimeout(silenceTimer);
 };
 root.innerHTML=`<div class="encyclopedia-root">
 <header class="encyclopedia-hero"><div><span class="encyclopedia-eyebrow">LIHUAJI / EMBROIDERY CULTURE ARCHIVE</span><h1>刺绣文化百科 <small>· 苏绣专藏</small></h1><p>从苏州绣艺到四大名绣，再走向世界刺绣文明。读有出处的文化档案，向绣娘提问；进入 AR 绣境，看针线与纹样在空间中展开。</p><div class="encyclopedia-hero-tags"><span>苏绣重点深研</span><span>原始文献可追溯</span><span>文字与语音互动</span></div></div><a class="encyclopedia-ar-link" href="#ar">进入 AR 绣境 ↗</a></header>
 <section class="encyclopedia-featured" aria-label="刺绣重点典藏入口">
 <button type="button" data-feature-topic="suxiu" data-feature-query=""><span>01 · SUZHOU</span><strong>苏绣 · 源流谱系</strong><small>绣谱、细绣、仿真绣与乱针绣</small><i>浏览专藏 ↗</i></button>
 <button type="button" data-feature-topic="four" data-feature-query=""><span>02 · FOUR SCHOOLS</span><strong>四大名绣 · 地域比较</strong><small>苏、湘、粤、蜀分别考据</small><i>了解流派 ↗</i></button>
 <button type="button" data-feature-topic="museum" data-feature-query=""><span>03 · MUSEUM OBJECTS</span><strong>馆藏 · 一物一证</strong><small>实物编号、年代、材料与出处</small><i>查看实物 ↗</i></button>
 <button type="button" data-feature-topic="world" data-feature-query=""><span>04 · GLOBAL HERITAGE</span><strong>世界 · 针线文明</strong><small>UNESCO 与跨地区刺绣文化</small><i>发现更多 ↗</i></button>
 </section>
 <section class="encyclopedia-headgrid"><div class="encyclopedia-library-panel">
 <div class="encyclopedia-sectionhead"><div><span>01 / KNOWLEDGE ATLAS</span><h2>刺绣知识典藏</h2><p>按文化、技法与时代检索；开放历史记录和学术证据，不以传说替代考据。</p></div><strong id="embroidery-knowledge-count">正在载入…</strong></div>
 <div class="encyclopedia-tabs" id="encyclopedia-tabs" role="group" aria-label="刺绣百科主题分类"></div>
 <label class="encyclopedia-find-label" for="knowledge-search">搜索馆藏、绣种、人物与针法</label><input id="knowledge-search" type="search" placeholder="苏绣历史、四大名绣、湘绣、沈寿、套针…" autocomplete="off">
 <p class="encyclopedia-library-help" id="encyclopedia-library-help" role="status"></p>
 <div id="knowledge-list" class="grid encyclopedia-list" aria-live="polite"></div></div>
 <aside class="embroider-assistant" aria-label="智能绣娘问答"><div class="embroider-assistant-top"><span class="encyclopedia-eyebrow">02 / EMBROIDERY GUIDE</span><h2>问问绣娘</h2><div class="embroider-persona" data-speaking="false"><div class="xiaoli-3d-container" aria-label="3D 小梨顾问"></div><noscript>${persona}</noscript></div><p id="embroider-mode">文献资料问答 · 非大模型模式</p><small>我是《梨花季》设计的数字文化讲解形象，不代表真实苏绣传承人。所有回答应以资料出处为依据。</small></div>
 <div class="embroider-conversation" id="embroider-conversation" role="log" aria-live="polite"></div>
 <div class="embroider-suggestions"><button data-embroider-suggest="苏绣起源于哪个朝代？">苏绣起源</button><button data-embroider-suggest="苏绣和湘绣有什么区别？">四大名绣区别</button><button data-embroider-suggest="散套针怎么理解？">散套针</button></div>
 <form id="embroider-form"><label class="sr-only" for="embroider-question">向绣娘输入问题</label><textarea id="embroider-question" rows="2" maxlength="320" placeholder="例如：沈寿对苏绣的发展有什么影响？" required></textarea><div class="embroider-compose-actions"><button type="button" id="embroider-phone" title="电话式连续对话：无需手操作，说一句答一句">📞 电话对话</button><button type="button" id="embroider-mic" title="语音输入">🎙 语音输入</button><button type="button" id="embroider-speak" title="朗读上一条答复">♫ 朗读</button><button type="button" id="embroider-stop" title="停止语音">■ 停止</button><button type="submit" id="embroider-submit">发送提问 ↗</button></div></form>
 <p class="embroider-privacy" id="embroider-state" role="status">文字问答不需要麦克风。语音识别如由浏览器服务处理，可能把音频发送到浏览器提供商，使用前请确认授权。</p>
 </aside></section>
 <section class="encyclopedia-learning" id="encyclopedia-learning"><div class="encyclopedia-sectionhead"><div><span>03 / STUDY & PRACTICE</span><h2>针法课堂与学习路径</h2><p>官方课程、练习步骤、数字拆针都在知识库学习区。AR 主页面只负责立体观察和动态空间显影。</p></div></div><section id="learning-path" aria-label="针法学习路径"></section><section id="stitch-lab" class="card" aria-label="数字针迹实验室"></section><details id="encyclopedia-basic-lessons"><summary>展开基础练习与入门知识</summary><div class="grid" id="encyclopedia-practice"></div></details><section id="official-videos" aria-label="官方苏绣课程与工艺影像"></section><section id="digital-tools" aria-label="数字刺绣工具拓展"></section></section>
 <footer class="encyclopedia-disclaimer"><h2>知识依据与 AI 能力边界</h2><p>历史、针法、传承及馆藏资料均应核对原始出处；摘要由梨花季整理并非官方原文，也未取得行业专家最终审定。文字回复在后端未配置时是检索式归纳，<strong>不是 DeepSeek、豆包或其他大模型生成。</strong>浏览器语音合成的声音由设备提供，语音识别可能依赖浏览器云服务。数字针法与 AR 可视化不是工艺实体操作考核。</p></footer>

 </div>`;
 const search=root.querySelector('#knowledge-search'),list=root.querySelector('#knowledge-list'),tabArea=root.querySelector('#encyclopedia-tabs'),chat=root.querySelector('#embroider-conversation');
 let topic='all',q=initialQuery;
 if(q.startsWith('learn-')||q.startsWith('practice-')||q==='mooc-suxiu')q='';
 search.value=q;
 const recalc=()=>{
  if(!alive||!isCurrent())return;
  const rows=rankKnowledge(archive.records,search.value,{section:topic,limit:200});
  list.innerHTML=rows.map(row=>itemCard(row,archive,officialRenderer)).join('')+(
   topic==='all'||topic==='craft'||topic==='suxiu'?'<div id="encyclopedia-practice-results">'+(search.value?findPractice(search.value):practice.slice(0,5)).map(k=>practiceRenderer(k)).join('')+'</div>':'');
  root.querySelector('#encyclopedia-library-help').textContent='检索到 '+rows.length+' 条馆藏及专业知识档案；点击标题卡展开事实和原始出处。';
 };
 try{archive=await loadEmbroideryArchive();}catch(e){
  try{const m=await import('./suxiu-knowledge-store.js');const original=await m.loadSuxiuKnowledge();const x=await import('./embroidery-knowledge.js');archive={...original,original,records:x.makeIndex(original.knowledge,[]),sources:new Map(original.sources.map(s=>[s.id,{url:s.url,title:s.title,organization:s.organization}]))};status('世界刺绣数据暂时不可用，现仅显示已验证苏绣知识。');}
  catch{root.querySelector('#knowledge-list').textContent='知识档案载入失败，请刷新重试。';return()=>{alive=false};}
 }
 if(!alive||!isCurrent())return()=>{alive=false};
 const exact=archive.records.find(row=>row.id===q);if(exact){q=exact.title;search.value=q;}
 root.querySelector('#embroidery-knowledge-count').textContent=archive.records.length+' 条有出处的知识记录';
 tabArea.innerHTML=TOPICS.map(t=>'<button type="button" data-encyclopedia-topic="'+esc(t.id)+'" aria-pressed="'+String(t.id==='all')+'">'+esc(t.label)+'</button>').join('');
 const setTopic=code=>{topic=code;tabArea.querySelectorAll('[data-encyclopedia-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.encyclopediaTopic===topic)));recalc()};
 tabArea.addEventListener('click',e=>{const b=e.target.closest('[data-encyclopedia-topic]');if(b)setTopic(b.dataset.encyclopediaTopic)});
 root.querySelectorAll('[data-feature-topic]').forEach(button=>button.addEventListener('click',()=>{
  setTopic(button.dataset.featureTopic);search.value=button.dataset.featureQuery||'';recalc();
  root.querySelector('#encyclopedia-tabs')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 chat.addEventListener('click',e=>{const button=e.target.closest('[data-guide-record]');if(!button)return;
  const row=archive.records.find(x=>x.id===button.dataset.guideRecord);if(!row)return;
  setTopic('all');search.value=row.title;recalc();
  root.querySelector('#knowledge-search')?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 search.addEventListener('input',()=>{searchRevision++;recalc()});recalc();
 const disposeMetImages=mountMetImagePreview(list,archive.records);
 appendMessage(chat,'evidence','你好，我是《梨花季》的数字绣娘。你可以问我苏绣历史、四大名绣、人物与针法。我会标出检索到的原始资料；目前后端未启用时，使用有出处的资料归纳，不冒充实时大模型。');
 let disposeXiaoli3D=null;
 const xiaoliContainer=root.querySelector('.xiaoli-3d-container');
 const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!document.querySelector('link[data-agent-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./agents/agents.css',import.meta.url).href;link.dataset.agentCss='';document.head.append(link);}
 if(xiaoliContainer&&window.WebGLRenderingContext){
  import('./agents/xiaoli-3d.js').then(mod=>{
   if(!alive||!isCurrent())return;
   xiaoliApi=mod.createXiaoli3D(xiaoliContainer,{reducedMotion});
   disposeXiaoli3D=xiaoliApi.dispose;
  }).catch(err=>{console.warn('[embroider] 3D 小梨初始化失败：',err.message);});
 }else if(xiaoliContainer){
  console.warn('[embroider] WebGL 不可用，3D 小梨未启用');
 }
 const lastAnswer={text:''};
 const submit=async prompt=>{
  if(!alive||!isCurrent()||!archive)return;
  const value=String(prompt||'').trim().slice(0,320);if(!value)return;
  abort?.abort();const request=new AbortController();abort=request;stopVoice();
  const historyBeforeQuestion=conversation.slice(-6);
  appendMessage(chat,'user',value);conversation.push({role:'user',content:value});
  const button=root.querySelector('#embroider-submit');button.disabled=true;status('正在核对馆藏与非遗资料…');
  let reply,mode='evidence';
  try{
   if(endpoint){
    try{
     const response=await fetch(endpoint.replace(/\/$/,'')+'/api/embroidery/ask',{
      method:'POST',mode:'cors',headers:{'content-type':'application/json'},
      body:JSON.stringify({question:value,history:historyBeforeQuestion}),signal:request.signal
     });
     if(!response.ok)throw Error('模型服务暂不可用（HTTP '+response.status+'）');
     const data=await response.json();
     if(data.mode!=='ai-rag'||!data.answer||!Array.isArray(data.citations)||!data.citations.length)throw Error('模型没有提供可核验的资料引文');
     reply={answer:String(data.answer).slice(0,4000),citations:data.citations.filter(s=>safeUrl(s.url)).slice(0,8),
      records:Array.isArray(data.usedRecordIds)?data.usedRecordIds.slice(0,8):[]};
     mode='ai';
    }catch(error){
     if(error.name==='AbortError')return;
     reply=evidenceReply(value,archive,historyBeforeQuestion);
     status('云端模型暂不可用，已退回有出处的资料归纳。');
    }
   }else reply=evidenceReply(value,archive,historyBeforeQuestion);
   if(!alive||!isCurrent()||request.signal.aborted)return;
   appendMessage(chat,mode,reply.answer,reply.citations,reply.records,archive);
   lastAnswer.text=reply.answer;
   conversation.push({role:'assistant',content:reply.answer.slice(0,1500)});
   if(conversation.length>10)conversation=conversation.slice(-10);
   if(!endpoint)status(reply.contextUsed?'已结合上一问的主题检索 · 请核对引用资料。':'资料检索归纳 · 非大模型生成；已显示来源。');
   else if(mode==='ai')status('模型文献问答已返回，请以引用的原始出处为准。');
   // 电话模式：自动朗读
   if(phoneMode&&alive){setTimeout(talk,400);}
  }finally{
   if(alive&&abort===request)button.disabled=false;
  }
 };
 root.querySelector('#embroider-form').addEventListener('submit',e=>{e.preventDefault();const input=root.querySelector('#embroider-question');const value=input.value;input.value='';void submit(value)});
 root.querySelectorAll('[data-embroider-suggest]').forEach(b=>b.addEventListener('click',()=>{root.querySelector('#embroider-question').value=b.dataset.embroiderSuggest;void submit(b.dataset.embroiderSuggest)}));
 const talk=()=>{
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){status('当前浏览器未提供语音朗读功能。');return;}
  if(!lastAnswer.text){status('请先向绣娘提问，再播放回答。');return;}
  stopVoice();
  if(xiaoliApi){xiaoliApi.setState('speaking');}
  const u=new SpeechSynthesisUtterance(lastAnswer.text.replace(/https?:\/\/\S+/g,''));u.lang='zh-CN';u.rate=.92;u.pitch=1.02;
  const voices=speechSynthesis.getVoices(),cn=voices.find(v=>/zh(-CN|-Hans)/i.test(v.lang));if(cn)u.voice=cn;
  u.onstart=()=>{if(alive){speaking=true;root.querySelector('.embroider-persona')?.setAttribute('data-speaking','true');status('正在朗读回答…');}};
  u.onend=u.onerror=()=>{
   speaking=false;
   root.querySelector('.embroider-persona')?.setAttribute('data-speaking','false');
   if(xiaoliApi){xiaoliApi.setState('idle');}
   // 电话模式：TTS 完后自动重新监听
   if(phoneMode&&alive){startContinuousListen();}
  };
  speechSynthesis.speak(u);
 };
 root.querySelector('#embroider-speak').onclick=talk;
 root.querySelector('#embroider-stop').onclick=()=>{stopVoice();status('已停止语音。')};
 const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
 const micBtn=root.querySelector('#embroider-mic');
 if(!Rec){micBtn.disabled=true;micBtn.title='此浏览器不支持语音识别，可用文字提问';}

 // 电话式连续对话：持续监听 → 停顿自动提交 → 回答后自动朗读 → 再监听
 function startContinuousListen(){
  if(!Rec||!alive||!isCurrent())return;
  if(speaking||listening)return;
  if(xiaoliApi){xiaoliApi.setState('listening');}
  const recog=new Rec();
  recog.lang='zh-CN';
  recog.continuous=true;
  recog.interimResults=true;
  recog.maxAlternatives=1;
  listening=recog;
  let finalText='';

  // 停顿检测：每次有 interim 就重置计时器，2s 没新内容算说完
  function resetSilence(){
   clearTimeout(silenceTimer);
   silenceTimer=setTimeout(()=>{
    if(!finalText.trim()){
     // 没听清，继续等
     try{recog.stop();}catch{}
     setTimeout(()=>{if(phoneMode&&alive)startContinuousListen();},400);
     return;
    }
    // 用户说完了 → 提交
    try{recog.stop();}catch{}
    listening=null;
    submit(finalText.trim());
    // 电话模式结束后等 submit → TTS 朗读 → talk.onend 里会再 startContinuousListen
   },1800);
  }
  resetSilence();

  recog.onresult=e=>{
   let interim='';
   for(let i=e.resultIndex;i<e.results.length;i++){
    const r=e.results[i];
    if(r.isFinal)finalText+=r[0].transcript;
    else interim+=r[0].transcript;
   }
   const display=finalText+interim;
   root.querySelector('#embroider-question').value=display;
   status('正在聆听… 说完后我会自动回答');
   resetSilence();
  };
  recog.onerror=e=>{
   clearTimeout(silenceTimer);
   if(e.error==='no-speech'){
    status('没听清，继续聆听中…');
    // 继续监听
    if(phoneMode&&alive){
     listening=null;
     setTimeout(()=>{if(phoneMode&&alive)startContinuousListen();},600);
    }
   }else{
    status('语音识别出错：'+e.error);
    listening=null;
    if(xiaoliApi){xiaoliApi.setState('idle');}
   }
  };
  recog.onend=()=>{
   clearTimeout(silenceTimer);
   listening=null;
   // 如果不是我们主动停止，且电话模式还在 → 重开
   if(phoneMode&&alive&&!speaking){
    setTimeout(()=>{if(phoneMode&&alive)startContinuousListen();},500);
   }
  };
  try{
   recog.start();
   status('📞 电话模式开启，说吧…');
  }catch{
   listening=null;
   phoneMode=false;
   status('麦克风无法启动，请检查浏览器权限。');
   if(xiaoliApi){xiaoliApi.setState('idle');}
  }
 }

 function stopContinuousListen(){
  phoneMode=false;
  clearTimeout(silenceTimer);
  try{listening?.abort();}catch{}
  listening=null;
  if(xiaoliApi){xiaoliApi.setState('idle');}
  status('📞 电话模式已关闭');
  const phoneBtn=root.querySelector('#embroider-phone');
  if(phoneBtn){phoneBtn.textContent='📞 电话对话';phoneBtn.classList.remove('is-active');}
 }

 micBtn.onclick=()=>{
  if(listening){
   try{listening.abort()}catch{}
   listening=null;
   if(xiaoliApi){xiaoliApi.setState('idle');}
   status('语音已停止');
   return;
  }
  if(xiaoliApi){xiaoliApi.setState('listening');}
  const recog=new Rec();
  listening=recog;recog.lang='zh-CN';recog.interimResults=false;recog.maxAlternatives=1;
  recog.onresult=e=>{
   if(!alive)return;
   const transcript=(e.results?.[0]?.[0]?.transcript||'').slice(0,320);
   root.querySelector('#embroider-question').value=transcript;
   status('识别完成。请确认文字正确，再点发送。');
   if(xiaoliApi){xiaoliApi.setState('idle');}
   listening=null;
  };
  recog.onerror=e=>{
   status('语音识别失败：'+e.error+'。可以改用文字提问。');
   listening=null;
   if(xiaoliApi){xiaoliApi.setState('idle');}
  };
  recog.onend=()=>{
   if(listening===recog){
    listening=null;
    if(xiaoliApi){xiaoliApi.setState('idle');}
   }
  };
  try{recog.start();status('正在聆听中文问题；可能由浏览器语音服务处理，确认后再发送。');}catch{listening=null;status('麦克风无法启动，请在浏览器权限设置中检查。');}
 };
 try{const response=await fetch('./content/embroidery-assistant-config.json',{cache:'no-store'});if(response.ok){const cfg=await response.json();if(validAI(cfg.endpoint))endpoint=cfg.endpoint;}}
 catch{}
 if(endpoint)root.querySelector('#embroider-mode').textContent='云端 AI 文献问答 · 需来源核查';
 // 📞 电话对话按钮
 const phoneBtn=root.querySelector('#embroider-phone');
 if(phoneBtn){
  if(!Rec){phoneBtn.disabled=true;phoneBtn.title='此浏览器不支持语音识别';}
  phoneBtn.onclick=()=>{
   if(phoneMode){
    stopContinuousListen();
    phoneBtn.classList.remove('is-active');
    phoneBtn.textContent='📞 电话对话';
   }else{
    if(!Rec){status('此浏览器不支持语音识别');return;}
    phoneMode=true;
    phoneBtn.classList.add('is-active');
    phoneBtn.textContent='📞 结束对话';
    startContinuousListen();
   }
  };
 }
 // Mounting study integrations happens in app.js; this module owns the read/chat UI.
 return ()=>{alive=false;abort?.abort();disposeMetImages?.();stopVoice();disposeXiaoli3D?.();root.replaceChildren();};
}
