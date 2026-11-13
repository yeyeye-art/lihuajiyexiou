import {useEffect, useRef, useState} from 'react';
import {speechText} from '../features/xiaoli/knowledge';

interface Props {text:string; stopSignal:number; onSpeaking:(speaking:boolean)=>void;onStart?:()=>void;label?:string;idPrefix?:string}

/** Use only installed voices: no text is handed to a remote voice provider. */
export function XiaoliReadAloud({text,stopSignal,onSpeaking,onStart,label='听小梨讲 · 设备朗读',idPrefix='xiaoli'}:Props) {
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [selected,setSelected]=useState('');
  const [rate,setRate]=useState(0.95);
  const [reading,setReading]=useState(false);
  const [status,setStatus]=useState('正在检查设备上的中文声音…');
  const epoch=useRef(0),owned=useRef(false),timer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const utterance=useRef<SpeechSynthesisUtterance | undefined>(undefined);
  const notify=useRef(onSpeaking);notify.current=onSpeaking;
  const cancel=()=>{
    epoch.current++;clearTimeout(timer.current);
    if(owned.current){window.speechSynthesis?.cancel();owned.current=false;notify.current(false);}
    utterance.current=undefined;
  };
  useEffect(()=>{
    if(!('speechSynthesis'in window)){setStatus('此浏览器没有朗读功能，文字讲解可以照常使用。');return;}
    const synth=window.speechSynthesis;
    const refresh=()=>{
      const available=synth.getVoices().filter(v=>v.localService&&/^zh(?:[-_]|$)/i.test(v.lang));
      setVoices(available);setSelected(value=>available.some(v=>v.voiceURI===value)?value:available[0]?.voiceURI||'');
      setStatus(available.length?'使用设备自带中文声音，按句朗读；声音效果取决于设备。':'没有找到设备自带的中文声音，可在系统语音设置中安装中文语音后重试。');
    };
    refresh();synth.addEventListener('voiceschanged',refresh);
    return()=>{synth.removeEventListener('voiceschanged',refresh);cancel();};
  },[]);
  useEffect(()=>{if(owned.current)setStatus('已停止朗读。');cancel();setReading(false);},[stopSignal,text]);
  const stop=()=>{cancel();setReading(false);setStatus('已停止朗读。');};
  const play=()=>{
    onStart?.();
    cancel();
    const voice=voices.find(v=>v.voiceURI===selected);
    const sentences=speechText(text).match(/[^。！？!?]+[。！？!?]?/g)||[];
    if(!voice||!sentences.length)return;
    const token=epoch.current;owned.current=true;setReading(true);setStatus('正在朗读，可随时停止。');
    const next=(index:number)=>{
      if(token!==epoch.current)return;
      if(index===sentences.length){owned.current=false;utterance.current=undefined;setReading(false);setStatus('朗读完成。');notify.current(false);return;}
      const item=new SpeechSynthesisUtterance(sentences[index]);utterance.current=item;
      item.voice=voice;item.lang=voice.lang;item.rate=rate;
      item.onstart=()=>{if(token===epoch.current)notify.current(true);};
      item.onend=()=>{if(token===epoch.current)timer.current=setTimeout(()=>next(index+1),180);};
      item.onerror=()=>{if(token===epoch.current){cancel();setReading(false);setStatus('此声音未能播放，请换一个声音或检查设备音量。');}};
      try{window.speechSynthesis.speak(item);}catch{cancel();setReading(false);setStatus('朗读未能开始，请重试。');}
    };
    next(0);
  };
  return <details className="xiaoli-read-aloud">
    <summary>{label}</summary>
    {voices.length>0&&<><label htmlFor={`${idPrefix}-device-voice`}>中文声音</label><select id={`${idPrefix}-device-voice`} value={selected} onChange={e=>{stop();setSelected(e.target.value);}}>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select><label htmlFor={`${idPrefix}-speech-rate`}>讲解速度</label><select id={`${idPrefix}-speech-rate`} value={rate} onChange={e=>{stop();setRate(Number(e.target.value));}}><option value={0.85}>慢一点</option><option value={0.95}>舒缓</option><option value={1.1}>明快</option></select></>}
    <p role="status">{status}</p>
    {text.length>500&&<p>长回答先朗读前 500 字，完整内容可在上方阅读。</p>}
    <button type="button" onClick={play} disabled={!voices.length||!text||reading}>朗读这条回答</button>
    <button type="button" onClick={stop} disabled={!reading}>停止朗读</button>
  </details>;
}
