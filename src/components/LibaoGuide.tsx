import {useEffect,useRef,useState} from 'react';
import {useApp} from '../context/AppContext';
import {navigate,pageNames} from '../utils/router';
import {destinations,destinationName,pageHelp,guideAnswer,tours,quietPage,type TourId,type Help} from '../features/libao/guide';
import {queueQuestion,handoffEvent} from '../features/libao/handoff';
import {readConversation} from '../features/xiaoli/session';
import {LibaoAvatar} from './LibaoAvatar';
import {LibaoVoice} from './LibaoVoice';
import '../styles/libao.css';

const preferenceKey='lihuaji.libao.preferences.v1';
const welcomeKey='lihuaji.libao.welcome.v1';
interface RunningTour {id:TourId;index:number;answerAfter:number}
export function LibaoGuide({page,param}:{page:string;param:string}){
  const {isMenuOpen,modalContent}=useApp();
  const [open,setOpen]=useState(false),[input,setInput]=useState('');
  const [welcome,setWelcome]=useState(false);
  const welcomed=useRef(false);
  const [reply,setReply]=useState<Help>();
  const [muted,setMuted]=useState(()=>{try{return localStorage.getItem(preferenceKey)==='quiet';}catch{return false;}});
  const [visible,setVisible]=useState(!document.hidden);
  const [tour,setTour]=useState<RunningTour>();
  const [retry,setRetry]=useState(0),[notice,setNotice]=useState(''),[failed,setFailed]=useState(false);
  const launcher=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
  const hidden=quietPage(page)||isMenuOpen||!!modalContent;
  const compact=muted||page==='create'||page==='xiaoli';
  const currentHelp=pageHelp(page,param);
  const restoreFocus=()=>requestAnimationFrame(()=>launcher.current?.focus({preventScroll:true}));
  const dismissWelcome=()=>{welcomed.current=true;setWelcome(false);try{localStorage.setItem(welcomeKey,'seen');}catch{/* Still dismissed for this visit. */}};
  const end=(completed=false)=>{
    setTour(undefined);setOpen(true);setFailed(false);
    setNotice(completed?'这一段导览已走完，你可以继续探索，或再选一条路线。':'导览已停止，页面里的操作结果会保留。可重新选择路线开始。');
  };
  const handoff=(question:string)=>{
    queueQuestion(question);window.dispatchEvent(new Event(handoffEvent));navigate('#xiaoli');setOpen(false);
  };
  const start=(id:TourId)=>{
    dismissWelcome();
    const state={id,index:0,answerAfter:Math.max(0,...readConversation().map(message=>message.id))};
    if(id==='learn'){queueQuestion('滚针怎么理解？');window.dispatchEvent(new Event(handoffEvent));}
    setNotice('正在打开导览…');setFailed(false);setOpen(false);setTour(state);
  };
  useEffect(()=>{
    const change=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);
    return()=>document.removeEventListener('visibilitychange',change);
  },[]);
  useEffect(()=>{setReply(undefined);setInput('');setOpen(false);setWelcome(false);},[page,param]);
  useEffect(()=>{
    if(page!=='home'||hidden||muted||open||tour||!visible||welcomed.current)return;
    try{if(localStorage.getItem(welcomeKey)==='seen')return;}catch{/* Welcome remains optional when storage is unavailable. */}
    const timer=setTimeout(()=>{welcomed.current=true;setWelcome(true);},1200);
    return()=>clearTimeout(timer);
  },[page,hidden,muted,open,tour,visible]);
  useEffect(()=>{if(open&&!hidden&&!tour)panel.current?.querySelector<HTMLButtonElement>('button')?.focus();},[open,hidden,tour]);
  useEffect(()=>{
    if(!tour)return;
    const controller=new AbortController();
    const step=tours[tour.id].steps[tour.index];
    setFailed(false);setNotice('正在查找这一页的操作区…');
    const externalNavigation=()=>{
      if(location.hash!==step.route){setTour(undefined);setOpen(false);setNotice('页面已切换，导览已停止。');}
    };
    // Navigate only after the visitor explicitly chose a tour or the next step.
    navigate(step.route);
    window.addEventListener('hashchange',externalNavigation);
    import('../features/libao/tour').then(async module=>{
      if(controller.signal.aborted)return;
      await module.showGuideStep({step,index:tour.index,total:tours[tour.id].steps.length,answerAfter:tour.answerAfter,signal:controller.signal,
        next:()=>{
          if(tour.index===tours[tour.id].steps.length-1)end(true);
          else setTour({...tour,index:tour.index+1});
        },previous:()=>{if(tour.index)setTour({...tour,index:tour.index-1});},close:()=>end(),
      });
      if(!controller.signal.aborted)setNotice('导览中，可以随时停止。');
    }).catch(()=>{
      if(controller.signal.aborted)return;
      setFailed(true);setNotice('这一页的操作区暂时没有载入。请重试这一步，或停止导览；没有记为完成。');
    });
    return()=>{controller.abort();window.removeEventListener('hashchange',externalNavigation);};
  },[tour,retry]);
  useEffect(()=>{
    if(!open||hidden||tour)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);restoreFocus();}};
    document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);
  },[open,hidden,tour]);
  const quiet=()=>{const next=!muted;setMuted(next);try{if(next)localStorage.setItem(preferenceKey,'quiet');else localStorage.removeItem(preferenceKey);}catch{/* The current visit still respects this preference. */}setNotice(next?'已收起形象；仍可从右下角“梨宝带路”打开帮助。':'已恢复梨宝形象。');};
  if(hidden)return null;
  if(tour)return <div className="libao-tour-status" role="status"><span>{notice}</span>{failed&&<button onClick={()=>setRetry(n=>n+1)}>重试这一步</button>}<button onClick={()=>end()}>停止导览</button></div>;
  const answer=reply||currentHelp;
  return <div className={`libao-guide${compact?' is-quiet':''}`}>
    {welcome&&!open&&!muted&&visible&&page==='home'&&<aside className="libao-welcome" aria-label="梨宝迎宾">
      <p><strong>初次见面，我是梨宝。</strong><br/>找纹样、做绣稿、学针法，我可以带你认识这里。</p>
      <div><button onClick={()=>start('visit')}>带我逛一圈</button><button onClick={()=>{dismissWelcome();setOpen(true);}}>我想找个功能</button><button onClick={dismissWelcome}>先自己看看</button></div>
    </aside>}
    {open&&visible&&<section className="libao-panel" id="libao-panel" aria-label="梨宝全站导览" ref={panel}>
      <div className="libao-panel-heading"><div><h2>梨宝带路</h2><p>你想从哪里开始？</p></div><button type="button" onClick={()=>{setOpen(false);restoreFocus();}}>收起</button></div>
      <p className="libao-location">你在：{pageNames[page]||'梨花季'}</p>
      <div className="libao-routes" aria-label="选择短导览">{(Object.keys(tours) as TourId[]).map(id=><button type="button" key={id} onClick={()=>start(id)}>{tours[id].title}<small>{tours[id].steps.length} 步 · 随时可停止</small></button>)}</div>
      <div className="libao-answer" aria-live="polite"><p>{answer.text}</p><div className="libao-destinations">{answer.links.map(item=><a key={item.href} href={item.href} onClick={()=>setOpen(false)}>{destinationName(item)}</a>)}</div>{answer.handoff&&<button type="button" onClick={()=>handoff(answer.handoff!)}>把原问题交给小梨</button>}{answer.tour&&<button type="button" onClick={()=>start(answer.tour!)}>一步步教我：{tours[answer.tour].title}</button>}</div>
      <form onSubmit={event=>{event.preventDefault();if(input.trim())setReply(guideAnswer(input,page,param,reply));}}><label htmlFor="libao-question">告诉梨宝你想做什么</label><div className="libao-input"><input id="libao-question" maxLength={500} value={input} onChange={event=>setInput(event.target.value)} placeholder="比如：图片在哪里上传"/><button type="submit" disabled={!input.trim()}>找入口</button></div></form>
      <LibaoVoice text={answer.text} onTranscript={text=>{setInput(text);panel.current?.querySelector<HTMLInputElement>('#libao-question')?.focus();}}/>
      <details className="libao-directory"><summary>每一页有什么</summary><nav aria-label="梨宝网站入口">{destinations.map(item=><a href={item.href} key={item.page} onClick={()=>setOpen(false)}><strong>{destinationName(item)}</strong><small>{item.description}</small></a>)}</nav></details>
      <div className="libao-settings"><button onClick={()=>setReply(currentHelp)}>这一页怎么用</button><button aria-pressed={muted} onClick={quiet}>{muted?'恢复梨宝形象':'免打扰 · 收起形象'}</button></div>
      {notice&&<p role="status" className="libao-note">{notice}</p>}<p className="libao-note">文字指路在本机完成。选择后才开始导览或录音；游戏和相机体验时隐藏。迎宾与免打扰偏好只存在本机。</p>
    </section>}
    <button type="button" className="libao-launcher" ref={launcher} aria-expanded={open} aria-controls="libao-panel" aria-label={open?'收起梨宝导览':'打开梨宝导览'} onClick={()=>{dismissWelcome();setOpen(value=>!value);}}>
      {!compact&&visible&&<LibaoAvatar/>}<span>梨宝带路</span>
    </button>
  </div>;
}
