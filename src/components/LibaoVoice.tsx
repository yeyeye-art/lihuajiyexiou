import {useEffect,useRef,useState} from 'react';
import {beginListening,recognitionConstructor} from '../features/libao/voice';
import {XiaoliReadAloud} from './XiaoliReadAloud';

export function LibaoVoice({text,onTranscript}:{text:string;onTranscript:(text:string)=>void}){
  const [consent,setConsent]=useState(false),[listening,setListening]=useState(false),[status,setStatus]=useState(''),[stopSpeech,setStopSpeech]=useState(0);
  const session=useRef<ReturnType<typeof beginListening>|undefined>(undefined);
  const Constructor=recognitionConstructor();
  const cancel=()=>{session.current?.dispose();session.current=undefined;setListening(false);};
  useEffect(()=>()=>session.current?.dispose(),[]);
  return <div className="libao-voice">
    <details onToggle={event=>{if(!event.currentTarget.open)cancel();}}><summary>和梨宝说话</summary>
      <p id="libao-voice-privacy">点下方按钮才使用麦克风。浏览器可能将语音交给其在线识别服务；本站不保存录音，文字只留在当前页面。</p>
      {Constructor?<><label className="libao-voice-consent"><input type="checkbox" checked={consent} onChange={event=>{setConsent(event.target.checked);if(!event.target.checked)cancel();}}/>我了解并愿意使用浏览器语音识别</label>
      <button type="button" disabled={!consent} aria-describedby="libao-voice-privacy" aria-pressed={listening} onClick={()=>{
        if(listening){session.current?.stop();return;}
        cancel();setStopSpeech(value=>value+1);setListening(true);
        session.current=beginListening(Constructor,{text:onTranscript,status:setStatus,end:()=>setListening(false)});
      }}>{listening?'结束录音':'按一下说话'}</button></>:<p>此浏览器没有语音输入，仍可在上方打字找入口。</p>}
      <p role="status">{status}</p>
    </details>
    <XiaoliReadAloud text={text} stopSignal={stopSpeech} onSpeaking={speaking=>{if(speaking)cancel();}} onStart={cancel} label="听梨宝讲 · 设备朗读" idPrefix="libao"/>
  </div>;
}
