import type {Driver} from 'driver.js';
import {gatePassed,gateHints,type GuideStep} from './guide';

export function visibleTarget(selector:string):HTMLElement|undefined{
  return [...document.querySelectorAll<HTMLElement>(selector)].find(el=>!el.closest('[hidden]')&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
}
function snapshot(answerAfter:number){
  const image=document.querySelector<HTMLImageElement>('#source-preview');
  const latest=[...document.querySelectorAll<HTMLElement>('[data-libao-answer]')].at(-1);
  const progress=document.querySelector<HTMLInputElement>('#lab-scrubber');
  return {
    imageReady:!!image?.complete&&image.naturalWidth>0&&document.querySelector('[data-guide="photo-source"]')?.getAttribute('data-source-state')==='ready',
    generated:!!visibleTarget('#result #save-svg'),
    answered:latest?.dataset.libaoTopic==='gun'&&Number(latest.dataset.libaoAnswer)>answerAfter,
    played:document.querySelector<HTMLSelectElement>('#lab-demo')?.value==='demo-gun-basic'&&!!progress&&!progress.disabled&&Number(progress.value)>0,
  };
}
export function waitForTarget(selector:string,signal:AbortSignal):Promise<HTMLElement>{
  return new Promise((resolve,reject)=>{
    const check=()=>{const target=visibleTarget(selector);if(target){clean();resolve(target);}};
    const stop=()=>{clean();reject(new Error('已结束导览。'));};
    const observer=new MutationObserver(check);
    const timer=setTimeout(()=>{clean();reject(new Error('这一页的操作区暂时没有载入。可以重试这一步，或结束导览；没有记录为完成。'));},15000);
    const clean=()=>{clearTimeout(timer);observer.disconnect();signal.removeEventListener('abort',stop);};
    signal.addEventListener('abort',stop,{once:true});
    if(signal.aborted){stop();return;}
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','data-page']});check();
  });
}
export async function showGuideStep(options:{step:GuideStep;index:number;total:number;answerAfter:number;signal:AbortSignal;next:()=>void;previous:()=>void;close:()=>void}):Promise<Driver|undefined>{
  const {step,index,total,answerAfter,signal}=options;
  const [{driver},target]=await Promise.all([import('driver.js'),waitForTarget(step.target,signal),import('driver.js/dist/driver.css')]);
  if(signal.aborted)return;
  const next=()=>{
    if(!gatePassed(step.gate,snapshot(answerAfter))){instance.nudge(step.gate?gateHints[step.gate]:'请先完成当前操作。');return;}
    options.next();
  };
  const instance=driver({
    animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,
    smoothScroll:false,overlayOpacity:.35,stagePadding:6,stageRadius:12,
    popoverClass:'libao-tour-popover',allowClose:true,overlayClickBehavior:'none',allowedElements:'.libao-tour-status',
    onNextClick:next,onDoneClick:next,onPrevClick:options.previous,
    onCloseClick:options.close,onDestroyed:()=>{if(!signal.aborted)options.close();},
  });
  signal.addEventListener('abort',()=>instance.destroy(),{once:true});
  instance.highlight({element:target,popover:{
    title:`梨宝带路 · ${index+1}/${total} · ${step.title}`,
    description:step.text,side:'bottom',align:'center',
    showButtons:index?['previous','next','close']:['next','close'],
    nextBtnText:step.next||(index===total-1?'结束导览':'下一步'),
    doneBtnText:step.next||(index===total-1?'结束导览':'下一步'),
    prevBtnText:'上一步',closeBtnLabel:'停止导览',
    onPopoverRender:popover=>{popover.description.setAttribute('aria-live','polite');},
  }});
  return instance;
}
