import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { prepareAnswer, prepareFeedback, feedbackQuestion, modelMessages, acceptModelAnswer, speechText, learningTopics } from '../features/xiaoli/knowledge';
import type { Archive, KnowledgeModule, Turn, Detail, CandidateSelection, FeedbackKind } from '../features/xiaoli/knowledge';
import type { LocalModel } from '../features/xiaoli/local-model';
import { LocalVoice } from '../features/xiaoli/local-voice';
import {readConversation,saveConversation} from '../features/xiaoli/session';
import type {ConversationMessage} from '../features/xiaoli/session';
import {XiaoliMetImage} from '../components/XiaoliMetImage';
import {XiaoliReadAloud} from '../components/XiaoliReadAloud';
import {XiaoliEvidence} from '../components/XiaoliEvidence';
import '../styles/xiaoli.css';
import {takeQuestion,handoffEvent} from '../features/libao/handoff';

type Message = ConversationMessage;
type Avatar = {dispose:()=>void;setState:(state:string)=>void};
type AvatarStatus='loading'|'ready'|'error';
interface AvatarModule {createXiaoli3D:(container:HTMLElement,options:{reducedMotion:boolean;modelRotationY:number;keepFacing:boolean;onLoadStatus:(status:AvatarStatus)=>void})=>Avatar}
const asset=(path:string)=>new URL(`${import.meta.env.BASE_URL}${path}`,location.origin).href;
const greeting:Message={id:0,role:'assistant',text:'你好，我是小梨。今天想了解一件绣品，还是一起弄懂一种针法？你也可以告诉我：“说简单一点。”'};
const sample='你好，我是小梨。我们慢慢来。你想先听一段刺绣故事，还是看看一根丝线怎样变成一幅画？';
export const Xiaoli:React.FC=()=>{
  const [archive,setArchive]=useState<Archive>();
  const [archiveState,setArchiveState]=useState<'loading'|'ready'|'error'>('loading');
  const [archiveAttempt,setArchiveAttempt]=useState(0);
  const [showLatest,setShowLatest]=useState(false);
  const moduleRef=useRef<KnowledgeModule | undefined>(undefined);
  const [messages,setMessages]=useState<Message[]>(()=>readConversation().length?readConversation():[greeting]);
  const [topicCategory,setTopicCategory]=useState('工具与流程');
  const messagesRef=useRef(messages);messagesRef.current=messages;
  const [input,setInput]=useState('');
  const [detail,setDetail]=useState<Detail>('brief');
  const [remember,setRemember]=useState(false);
  const [busy,setBusy]=useState(false);
  const [speechStop,setSpeechStop]=useState(0);
  const [notice,setNotice]=useState('正在打开刺绣资料…');
  const [modelState,setModelState]=useState<'off'|'loading'|'ready'>('off');
  const [modelNotice,setModelNotice]=useState('可选：在此设备上运行小模型，让资料解释更连贯。');
  const [voiceAvailable,setVoiceAvailable]=useState(false);
  const [voiceNotice,setVoiceNotice]=useState('正在检查试听包…');
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [audioUrl,setAudioUrl]=useState('');
  const [avatarStatus,setAvatarStatus]=useState<AvatarStatus>('loading');
  const [avatarAttempt,setAvatarAttempt]=useState(0);
  const avatarEl=useRef<HTMLDivElement>(null),avatar=useRef<Avatar | undefined>(undefined);
  const log=useRef<HTMLDivElement>(null),audio=useRef<HTMLAudioElement>(null);
  const model=useRef<LocalModel | undefined>(undefined),voice=useRef<LocalVoice | undefined>(undefined),abort=useRef<AbortController | undefined>(undefined);
  const alive=useRef(true),modelEpoch=useRef(0),voiceEpoch=useRef(0),id=useRef(Math.max(0,...messages.map(m=>m.id)));

  useEffect(()=>{
    const receive=()=>{const question=takeQuestion();if(question){setInput(question);requestAnimationFrame(()=>document.getElementById('xiaoli-question')?.focus());}};
    receive();window.addEventListener(handoffEvent,receive);
    return()=>window.removeEventListener(handoffEvent,receive);
  },[]);
  useEffect(()=>{
    alive.current=true;
    fetch(asset('content/xiaoli-runtime.json')).then(r=>r.json()).then((data:unknown)=>{
      if(!alive.current)return;
      const available=import.meta.env.VITE_XIAOLI_VOICE==='true'||(typeof data==='object'&&data!==null&&'voiceAvailable'in data&&data.voiceAvailable===true);
      setVoiceAvailable(available);setVoiceNotice(available?'免费中文女声 · 本机合成 · 非商业试听':'当前公开版未启用此声音包，文字讲解可以照常使用。');
    }).catch(()=>{if(alive.current)setVoiceNotice('声音包暂不可用。');});
    try{const saved=localStorage.getItem('lihuaji.xiaoli.preferences.v1');if(saved){const p=JSON.parse(saved) as {detail?:string};if(p.detail==='detailed')setDetail('detailed');setRemember(true);}}catch{/* storage is optional */}
    return()=>{alive.current=false;modelEpoch.current++;voiceEpoch.current++;abort.current?.abort();model.current?.dispose();voice.current?.dispose();};
  },[]);
  useEffect(()=>{
    let cancelled=false;
    setArchiveState('loading');
    setNotice('正在打开刺绣资料…');
    // Retrying a failed module request needs a fresh URL; a loaded module is reused.
    const url=asset('assets/embroidery-knowledge.js')+(archiveAttempt?`?retry=${archiveAttempt}`:'');
    (async()=>{
      const api=moduleRef.current??await import(/* @vite-ignore */ url) as KnowledgeModule;
      if(cancelled)return;
      moduleRef.current=api;
      const data=await api.loadEmbroideryArchive();
      if(cancelled)return;
      setArchive(data);setArchiveState('ready');setNotice('可以开始了。资料回答会附上出处。');
    })().catch(()=>{if(!cancelled){setArchiveState('error');setNotice('资料暂未载入，可以保留问题并重试。');}});
    return()=>{cancelled=true;};
  },[archiveAttempt]);
  useEffect(()=>{
    let disposed=false;
    if(modelState!=='off')return;
    const node=avatarEl.current;if(!node)return;
    setAvatarStatus('loading');
    // A cached pre-update renderer reports readiness only through this attribute.
    delete node.dataset.modelLoaded;
    const observer=new MutationObserver(()=>{if(!disposed&&node.dataset.modelLoaded==='true')setAvatarStatus('ready');});
    observer.observe(node,{attributes:true,attributeFilter:['data-model-loaded']});
    const url=asset('assets/agents/xiaoli-3d.js');
    import(/* @vite-ignore */ url).then((api:AvatarModule)=>{
      if(disposed)return;
      avatar.current=api.createXiaoli3D(node,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,modelRotationY:-Math.PI/2,keepFacing:true,onLoadStatus:status=>{if(!disposed)setAvatarStatus(status);}});
    }).catch(()=>{if(!disposed)setAvatarStatus('error');});
    return()=>{disposed=true;observer.disconnect();avatar.current?.dispose();avatar.current=undefined;};
  },[modelState,avatarAttempt]);
  const revealLatest=()=>{
    const node=log.current;
    const last=node?.querySelector<HTMLElement>('.xiaoli-message:last-of-type');
    if(!node||!last)return;
    node.scrollTop+=last.getBoundingClientRect().top-node.getBoundingClientRect().top-12;
    setShowLatest(false);
  };
  const checkReadingPosition=()=>{
    const node=log.current;
    const last=node?.querySelector<HTMLElement>('.xiaoli-message:last-of-type');
    if(!node||!last)return;
    const position=last.getBoundingClientRect().top-node.getBoundingClientRect().top;
    setShowLatest(position < -24 || position > node.clientHeight-48);
  };
  // Begin each new answer at its first line, without moving keyboard focus or the page.
  // Expanding a citation or loading an illustration must not pull readers to the bottom.
  useLayoutEffect(revealLatest,[messages]);
  useEffect(()=>{saveConversation(messages);},[messages]);
  useEffect(()=>()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);},[audioUrl]);
  useEffect(()=>{
    try {if(remember)localStorage.setItem('lihuaji.xiaoli.preferences.v1',JSON.stringify({detail}));else localStorage.removeItem('lihuaji.xiaoli.preferences.v1');}catch{/* private browsing */}
  },[detail,remember]);

  const stop=()=>{
    setSpeechStop(value=>value+1);
    if(busy){model.current?.dispose();model.current=undefined;setModelState('off');setBusy(false);}
    if(voiceBusy)setVoiceNotice('声音生成已停止，可以重新试听。');
    abort.current?.abort();audio.current?.pause();voiceEpoch.current++;voice.current?.dispose();voice.current=undefined;setVoiceBusy(false);avatar.current?.setState('idle');setNotice('已停止。你可以换个问题继续。');
  };
  const send=async(value:string, refine=false, selection?:CandidateSelection)=>{
    if(busy||!archive||!moduleRef.current||!value.trim())return;
    stop();const request=new AbortController();abort.current=request;
    const history:Turn[]=messagesRef.current.filter(m=>m.id!==0).map(m=>({role:m.role,content:m.text,records:m.reply?.records,question:m.reply?.question,topicId:m.reply?.topicId}));
    setInput('');setMessages(m=>[...m,{id:++id.current,role:'user',text:refine?'请换一种讲法：'+value.trim():value.trim()}]);setBusy(true);setNotice('正在查找相关资料…');
    try {
      let reply=prepareAnswer(value,history,archive,moduleRef.current,detail,selection);
      let fallbackNotice='';
      if(refine&&reply.kind==='evidence'&&modelState==='ready'&&model.current){
        setNotice('小梨正在用本机模型整理解释…');
        try {
          const answerDetail=/简单|通俗/.test(value)?'brief':/详细/.test(value)?'detailed':detail;
          const generated=await model.current.answer(modelMessages(reply,history,answerDetail),request.signal);
          const verified=acceptModelAnswer(generated,reply);
          if(verified)reply=verified;
          else fallbackNotice='模型的引用检查未通过，已显示原资料摘要。';
        }catch(error){if(request.signal.aborted)throw error;model.current?.dispose();model.current=undefined;setModelState('off');fallbackNotice='本机模型暂未完成，已释放内存并保留资料回答。';}
      }
      if(!alive.current||request.signal.aborted)return;
      setMessages(m=>[...m,{id:++id.current,role:'assistant',text:reply.answer,reply}]);
      setNotice(fallbackNotice||(reply.kind==='model'?'本机模型解释 · 请结合所列出处核对。':reply.contextUsed?'已承接上一问的主题。':reply.kind==='evidence'?'资料摘要已显示。你可以继续追问。':'可以换个角度继续聊。'));
    }catch(error){if(alive.current&&!request.signal.aborted)setNotice(error instanceof Error?error.message:'暂时没有完成，请重试。');}
    finally{if(alive.current&&abort.current===request)setBusy(false);}
  };
  const feedback=(kind:FeedbackKind)=>{
    if(busy||!archive||!moduleRef.current)return;
    const previous=[...messagesRef.current].reverse().find(m=>m.role==='assistant'&&m.reply)?.reply;
    if(!previous)return;
    stop();
    const history:Turn[]=messagesRef.current.filter(m=>m.id!==0).map(m=>({role:m.role,content:m.text,records:m.reply?.records,question:m.reply?.question,topicId:m.reply?.topicId}));
    const reply=prepareFeedback(kind,previous,history,archive,moduleRef.current,detail);
    const labels:Record<FeedbackKind,string>={missed:'没答到点上',complex:'太复杂',demo:'想看示范'};
    setMessages(m=>[...m,{id:++id.current,role:'user',text:labels[kind]},{id:++id.current,role:'assistant',text:reply.answer,reply}]);
    if(kind==='missed'){
      setInput(feedbackQuestion(previous));
      requestAnimationFrame(()=>document.getElementById('xiaoli-question')?.focus());
    }
    setNotice(kind==='missed'?'已把刚才的问题放回输入框，你可以补充或改写。':!previous.records.length?'先选择或补充对象，我再接着讲。':kind==='complex'?'已按刚才的资料换成简明讲解。':'已查找对应示范；有资料边界时会说明。');
  };
  const enableModel=async()=>{
    stop();
    const epoch=++modelEpoch.current;setModelState('loading');setModelNotice('正在检查设备并准备下载模型…');
    try {
      if(!('gpu'in navigator))throw Error('此浏览器不支持本机模型，请使用近期版本的 Chrome 或 Edge；资料问答仍可用。');
      const {LocalModel}=await import('../features/xiaoli/local-model');
      if(epoch!==modelEpoch.current||!alive.current)return;
      const instance=new LocalModel();model.current=instance;
      await instance.load(text=>{if(alive.current&&epoch===modelEpoch.current)setModelNotice(text);});
      if(alive.current&&epoch===modelEpoch.current){setModelState('ready');setModelNotice('模型已就绪。资料回答仍会立即显示；想换一种讲法时，点击“用本机模型再解释”。');}
    }catch(error){if(alive.current&&epoch===modelEpoch.current){setModelState('off');setModelNotice(error instanceof Error?error.message:'模型未能加载。资料问答仍可用。');}}
  };
  const disableModel=()=>{abort.current?.abort();modelEpoch.current++;model.current?.dispose();model.current=undefined;setModelState('off');setBusy(false);setModelNotice('已释放模型运行内存，下载缓存仍保留。');};
  const speak=async(text:string,speed=1)=>{
    if(!voiceAvailable||voiceBusy)return;
    audio.current?.pause();const epoch=++voiceEpoch.current;setVoiceBusy(true);setVoiceNotice('正在准备免费声音…');
    try {
      const instance=voice.current??new LocalVoice();voice.current=instance;
      await instance.load(status=>{if(alive.current&&epoch===voiceEpoch.current)setVoiceNotice(status);});
      if(!alive.current||epoch!==voiceEpoch.current)return;
      setVoiceNotice('正在本机生成声音，请稍候…');
      const blob=await instance.generate(speechText(text),speed);
      if(alive.current&&epoch===voiceEpoch.current){setAudioUrl(URL.createObjectURL(blob));setVoiceNotice('声音已生成，点击下方播放器试听。');}
    }catch(error){if(alive.current&&epoch===voiceEpoch.current)setVoiceNotice(error instanceof Error?error.message:'生成失败，请重试。');}
    finally{if(alive.current&&epoch===voiceEpoch.current)setVoiceBusy(false);}
  };
  const latest=[...messages].reverse().find(m=>m.role==='assistant'&&m.reply);
  const currentTopic=learningTopics.find(t=>t.id===latest?.reply?.topicId);
  return <div className="xiaoli-preview">
    <header className="xiaoli-heading"><a href="#guide">← 刺绣文化百科</a><span>小梨 · 刺绣讲解</span><h1>一针一线，慢慢聊。</h1><p>问一个好奇的问题，听小梨陪你读懂刺绣。</p><a className="xiaoli-ask-jump" href="#xiaoli-question" onClick={e=>{e.preventDefault();document.getElementById('xiaoli-question')?.focus();document.getElementById('xiaoli-question')?.scrollIntoView({block:'center'});}}>直接提问 ↓</a></header>
    <div className="xiaoli-layout">
      <section className="xiaoli-dialogue" aria-label="与小梨对话">
        <div className="xiaoli-dialogue-title"><h2>问问小梨</h2><button onClick={()=>{stop();setMessages([greeting]);setInput('');}}>重新聊</button></div>
        {messages.length===1&&<div className="xiaoli-start"><p>第一次来？可以先从一根线的走向看起。</p><button disabled={busy||!archive} onClick={()=>void send('我是新手，从哪里开始？')}>带我入门</button><button disabled={busy||!archive} onClick={()=>void send('苏绣需要哪些工具？')}>先认识工具</button></div>}
        <details className="xiaoli-topics">
          <summary>从一个专题开始 · {learningTopics.length} 个讲解专题</summary>
          <div className="xiaoli-topic-categories" aria-label="选择专题分类">{[...new Set(learningTopics.map(t=>t.category))].map(category=><button key={category} aria-pressed={topicCategory===category} onClick={()=>setTopicCategory(category)}>{category}</button>)}</div>
          <div className="xiaoli-topic-list">{learningTopics.filter(t=>t.category===topicCategory).map(t=><button key={t.id} disabled={busy||!archive} onClick={()=>void send(t.question)}><strong>{t.title}</strong><span>{t.prompt}</span></button>)}</div>
        </details>
        {currentTopic&&<p className="xiaoli-current-topic">正在聊：{currentTopic.title}</p>}
        <div className="xiaoli-messages" ref={log} onScroll={checkReadingPosition} role="log" aria-live="polite" aria-relevant="additions">
          {messages.map(m=><article key={m.id} data-libao-answer={m.reply?.kind==='evidence'?m.id:undefined} data-libao-topic={m.reply?.topicId} className={`xiaoli-message ${m.role}`}><span>{m.role==='user'?'你':'小梨'}</span>{m.reply?<XiaoliEvidence text={m.text} sources={m.reply.citations} archive={archive}/>:<p>{m.text}</p>}
            {m.reply&&<small>{m.reply.kind==='model'?'本机模型解释':m.reply.kind==='evidence'?'文献摘要':m.reply.kind==='missing'?'需要更多资料':'小梨'}</small>}
            {m.reply?.illustration&&<figure className="xiaoli-lesson-image"><img src={asset(m.reply.illustration.src)} alt="对应针法的数字线条示意" loading="lazy"/><figcaption>{m.reply.illustration.caption}</figcaption></figure>}
            {m.reply?.museumRecordId&&archive?.records.find(r=>r.id===m.reply?.museumRecordId)&&<XiaoliMetImage record={archive.records.find(r=>r.id===m.reply?.museumRecordId)!}/>}
            {!!m.reply?.actions?.length&&<nav className="xiaoli-reading-actions" aria-label="继续看与练习">{m.reply.actions.map(action=><a key={action.href} href={action.href} onClick={stop}><strong>{action.label} ↗</strong><span>{action.description}</span></a>)}</nav>}
            {!!m.reply?.candidates?.length&&<div className="xiaoli-candidates" role="group" aria-label="选择相关资料">{m.reply.candidates.map(candidate=><button type="button" key={candidate.id} disabled={busy} onClick={()=>void send(candidate.question,false,{query:m.reply!.askedQuestion||m.reply!.question,id:candidate.id})}>{candidate.label}</button>)}</div>}
            {m.id===latest?.id&&<div className="xiaoli-feedback" role="group" aria-label="调整这次回答"><button type="button" disabled={busy} onClick={()=>feedback('missed')}>没答到点上</button><button type="button" disabled={busy} onClick={()=>feedback('complex')}>太复杂</button><button type="button" disabled={busy} onClick={()=>feedback('demo')}>想看示范</button></div>}
          </article>)}
          {busy&&<p className="xiaoli-thinking">小梨正在读资料…</p>}
        </div>
        {showLatest&&<button type="button" className="xiaoli-latest" onClick={revealLatest}>回到最新回答开头 ↓</button>}
        <XiaoliReadAloud text={latest?.text||''} stopSignal={speechStop} onSpeaking={speaking=>avatar.current?.setState(speaking?'speaking':'idle')}/>
        <div className="xiaoli-suggestions">{(latest?.reply?.suggestions||['苏绣和湘绣有什么区别？','散套针怎么理解？','沈寿是谁？']).map(q=><button key={q} disabled={busy||!archive} onClick={()=>void send(q)}>{q}</button>)}{modelState==='ready'&&latest?.reply?.kind==='evidence'&&<button disabled={busy} onClick={()=>void send(latest.reply!.question,true)}>用本机模型再解释</button>}</div>
        {archiveState==='error'&&<div className="xiaoli-load-error" role="alert"><p>刺绣资料暂时没打开。输入的内容会保留，检查网络后可以再试一次。</p><button type="button" onClick={()=>{setArchiveState('loading');setArchiveAttempt(n=>n+1);}}>重新加载资料</button></div>}
        <form onSubmit={e=>{e.preventDefault();void send(input);}}><label className="sr-only" htmlFor="xiaoli-question">你的问题</label><textarea id="xiaoli-question" value={input} onChange={e=>setInput(e.target.value)} maxLength={500} rows={3} placeholder="比如：这两种绣法有什么区别？"/><div className="xiaoli-compose"><button type="button" onClick={stop}>停止</button>{voiceAvailable&&<button type="button" disabled={voiceBusy||!latest} onClick={()=>latest&&void speak(latest.text)}>听上一条回答</button>}<button type="submit" disabled={busy||!archive||!input.trim()}>发送 ↗</button></div></form>
        <p className="xiaoli-status" role="status">{notice}</p><p className="xiaoli-footnote">对话仅留在本次页面内存中，站内阅读后可返回接着聊；刷新或关闭页面即清除。专题讲解沿用已收录出处，数字示意不等同实物教学。</p>
      </section>
      <aside className="xiaoli-companion">
        <div className="xiaoli-avatar" ref={avatarEl} aria-label="小梨讲解形象">{(modelState!=='off'||avatarStatus!=='ready')&&<div className="xiaoli-avatar-rest" role="status"><span>梨</span><p>{modelState!=='off'?'小梨正在专心读资料':avatarStatus==='loading'?'小梨的形象正在载入，你可以先提问。':'形象暂未载入，文字讲解可以照常使用。'}</p>{modelState==='off'&&avatarStatus==='error'&&<button onClick={()=>setAvatarAttempt(n=>n+1)}>重新载入形象</button>}</div>}</div>
        <h2>小梨</h2><p>你可以问得很细，也可以让我讲得简单一点。</p>
        <dl><dt>可查资料</dt><dd>{archive?`${archive.records.length} 条`:'加载中'}</dd><dt>当前回答</dt><dd>{modelState==='ready'?'本机模型＋资料':'有出处的资料摘要'}</dd></dl>
        <label htmlFor="xiaoli-detail">你喜欢怎样讲解？</label><select id="xiaoli-detail" value={detail} onChange={e=>setDetail(e.target.value as Detail)}><option value="brief">先简单说说</option><option value="detailed">把细节讲清楚</option></select>
        <label className="xiaoli-check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>只在此设备记住讲解偏好</label>
        <details className="xiaoli-options"><summary>免费模型与声音</summary>
          <p>实验功能：本机小模型首次下载约 300MB，需要较新浏览器及足够内存。一条回答可能需数十秒，也可能退回资料摘要。提问在此设备处理；下载会连接模型托管站点。低性能手机建议继续用资料问答。</p>
          {modelState==='off'?<button onClick={()=>void enableModel()}>下载并启用本机模型</button>:<button onClick={disableModel}>{modelState==='loading'?'取消加载':'关闭本机模型'}</button>}
          <p role="status" className="xiaoli-status">{modelNotice}</p>
          <button onClick={()=>{disableModel();void import('../features/xiaoli/local-model').then(m=>m.clearModelCache()).then(()=>setModelNotice('模型缓存已清除；游戏与云存档未改动。')).catch(()=>setModelNotice('缓存清理未完成，请稍后重试。'));}}>清理此模型的下载缓存</button>
          {voiceAvailable&&<><hr/><p>中文声音在本机合成，首次加载约 145MB。本次提供同一女声的两种语速，供非商业研究试听。</p>
          <div className="xiaoli-voice-actions"><button disabled={!voiceAvailable||voiceBusy} onClick={()=>void speak(sample,0.92)}>舒缓语速试听</button><button disabled={!voiceAvailable||voiceBusy} onClick={()=>void speak(sample,1.08)}>明快语速试听</button></div>
          <p role="status" className="xiaoli-status">{voiceNotice}</p></>}
        </details>
        {audioUrl&&<audio ref={audio} controls src={audioUrl} aria-label="小梨试听播放器" onPlay={()=>avatar.current?.setState('speaking')} onPause={()=>avatar.current?.setState('idle')} onEnded={()=>avatar.current?.setState('idle')}/>}
      </aside>
    </div>
  </div>;
};
