/** Small Web Speech boundary; no audio or transcript is stored by the site. */
interface RecognitionResult {isFinal:boolean; readonly length:number; [index:number]:{transcript:string}}
interface RecognitionEvent {resultIndex:number; results:{readonly length:number; [index:number]:RecognitionResult}}
export interface Recognition {
  lang:string; continuous:boolean; interimResults:boolean; maxAlternatives:number;
  onresult:((event:RecognitionEvent)=>void)|null;
  onerror:((event:{error:string})=>void)|null;
  onend:(()=>void)|null;
  start:()=>void; stop:()=>void; abort:()=>void;
}
export type RecognitionConstructor=new()=>Recognition;
export function recognitionConstructor():RecognitionConstructor|undefined {
  const browser=window as Window & {SpeechRecognition?:RecognitionConstructor; webkitSpeechRecognition?:RecognitionConstructor};
  return browser.SpeechRecognition||browser.webkitSpeechRecognition;
}
export function voiceError(error:string):string {
  switch(error){
    case 'not-allowed':case 'service-not-allowed':return '麦克风未获授权。可以在浏览器设置中允许，也可以继续打字。';
    case 'audio-capture':return '没有找到可用麦克风，请检查设备，或继续打字。';
    case 'network':return '浏览器语音服务暂时连不上，请重试或继续打字。';
    case 'no-speech':return '没有听清楚，请再说一次，或继续打字。';
    case 'language-not-supported':return '此浏览器暂不支持中文识别，请继续打字。';
    default:return '语音输入未能完成，请重试或继续打字。';
  }
}
export function beginListening(Constructor:RecognitionConstructor,callbacks:{text:(text:string)=>void;status:(text:string)=>void;end:()=>void}):{stop:()=>void;dispose:()=>void}{
  const recognition=new Constructor();let disposed=false,ended=false,received=false,failed=false;
  recognition.lang='zh-CN';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
  const finish=()=>{if(ended)return;ended=true;clearTimeout(timer);callbacks.end();};
  const timer=setTimeout(()=>{if(!disposed&&!ended){recognition.abort();callbacks.status('本次录音已到时，请重试或继续打字。');finish();}},20000);
  recognition.onresult=event=>{
    if(disposed||ended)return;
    let text='';
    for(let index=event.resultIndex;index<event.results.length;index++)if(event.results[index].isFinal)text+=event.results[index][0]?.transcript||'';
    if(text.trim()){received=true;callbacks.text(text.trim().slice(0,500));callbacks.status('已转成文字，你可以修改，再点“找入口”。');}
  };
  recognition.onerror=event=>{if(disposed||ended)return;failed=true;callbacks.status(voiceError(event.error));finish();};
  recognition.onend=()=>{if(disposed||ended)return;if(!received&&!failed)callbacks.status('没有收到语音文字，请重试或继续打字。');finish();};
  try{recognition.start();callbacks.status('正在听，请说出你想做的事。最多录音 20 秒。');}
  catch{failed=true;callbacks.status('麦克风未能启动，请重试或继续打字。');finish();}
  return {
    stop:()=>{if(disposed||ended)return;recognition.stop();},
    dispose:()=>{disposed=true;clearTimeout(timer);recognition.onresult=null;recognition.onerror=null;recognition.onend=null;recognition.abort();},
  };
}
