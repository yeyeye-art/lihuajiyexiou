interface VoiceMessage { type:string; status?:string; message?:string; samples?:Float32Array; sampleRate?:number }
export class LocalVoice {
  private worker?:Worker;
  private ready=false;
  private pending?:{resolve:(audio:Blob)=>void;reject:(error:Error)=>void};
  private loading?:{reject:(error:Error)=>void};
  private timer?:ReturnType<typeof setTimeout>;
  async load(onProgress:(text:string)=>void) {
    if(this.ready)return;
    this.worker=new Worker(new URL(`${import.meta.env.BASE_URL}assets/xiaoli-voice/sherpa-onnx-tts.worker.js`,location.origin));
    return new Promise<void>((resolve,reject)=>{
      this.loading={reject};
      this.timer=setTimeout(()=>this.dispose(),180000);
      if(!this.worker)return reject(Error('声音加载失败'));
      this.worker.onerror=()=>this.fail(Error('声音加载失败，请重试。'));
      this.worker.onmessage=(event:MessageEvent<VoiceMessage>)=>{
        const message=event.data;
        if(message.type==='sherpa-onnx-tts-progress')onProgress('正在加载免费中文声音…');
        if(message.type==='sherpa-onnx-tts-ready'){
          clearTimeout(this.timer);this.ready=true;this.loading=undefined;resolve();
        }else if(message.type==='error')this.fail(Error('本机语音生成失败，请缩短文字后重试。'));
        else if(message.type==='sherpa-onnx-tts-result'&&message.samples&&message.sampleRate){
          clearTimeout(this.timer);this.pending?.resolve(toWav(message.samples,message.sampleRate));this.pending=undefined;
        }
      };
    });
  }
  generate(text:string,speed:number):Promise<Blob>{
    if(!this.ready||!this.worker)return Promise.reject(Error('请先加载声音'));
    if(this.pending)return Promise.reject(Error('正在生成上一段声音'));
    return new Promise((resolve,reject)=>{
      this.pending={resolve,reject};this.timer=setTimeout(()=>this.dispose(),90000);
      this.worker?.postMessage({type:'generate',text:text.slice(0,500),sid:0,speed});
    });
  }
  private fail(error:Error){this.pending?.reject(error);this.loading?.reject(error);this.pending=undefined;this.loading=undefined;this.dispose();}
  dispose(){
    clearTimeout(this.timer);this.worker?.terminate();this.worker=undefined;this.ready=false;
    const error=new DOMException('语音已停止','AbortError');
    this.pending?.reject(error);this.loading?.reject(error);this.pending=undefined;this.loading=undefined;
  }
}
export function toWav(samples:Float32Array,rate:number):Blob{
  const bytes=new ArrayBuffer(44+samples.length*2),view=new DataView(bytes);
  const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  text(36,'data');view.setUint32(40,samples.length*2,true);
  samples.forEach((sample,i)=>view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,sample))*(sample<0?32768:32767)),true));
  return new Blob([bytes],{type:'audio/wav'});
}
