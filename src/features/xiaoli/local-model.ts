import { CreateWebWorkerMLCEngine, deleteModelAllInfoInCache } from '@mlc-ai/web-llm';
import type { WebWorkerMLCEngine, ChatCompletionMessageParam } from '@mlc-ai/web-llm';
const MODEL='Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
export class LocalModel {
  private worker?:Worker;
  private engine?:WebWorkerMLCEngine;
  private pendingReject?: (reason:Error)=>void;
  async load(progress:(text:string)=>void) {
    this.worker=new Worker(new URL('./webllm-worker.ts',import.meta.url),{type:'module'});
    try {
      const cancelled=new Promise<never>((_,reject)=>{this.pendingReject=reject;});
      this.engine=await Promise.race([CreateWebWorkerMLCEngine(this.worker,MODEL,{initProgressCallback:p=>progress(p.text)}, {context_window_size:2048}),cancelled]);
    } catch(error) {this.dispose();throw error;}
    finally {this.pendingReject=undefined;}
  }
  async answer(messages:ChatCompletionMessageParam[], signal:AbortSignal) {
    const engine=this.engine;
    if(!engine)throw Error('模型尚未载入');
    if(signal.aborted)throw new DOMException('已停止','AbortError');
    const stop=()=>this.dispose();
    signal.addEventListener('abort',stop,{once:true});
    const cancelled=new Promise<never>((_,reject)=>{this.pendingReject=reject;});
    const timer=setTimeout(()=>this.dispose(Error('本机模型等待超过90秒，已释放内存。')),90000);
    try {
      const generation=(async()=>{
        let text='';
        const stream=await engine.chat.completions.create({messages,stream:true,max_tokens:240,temperature:0.2});
        for await (const part of stream) {
          if(signal.aborted)throw new DOMException('已停止','AbortError');
          text+=part.choices[0]?.delta.content||'';
        }
        return text;
      })();
      return await Promise.race([generation,cancelled]);
    } finally {clearTimeout(timer);this.pendingReject=undefined;signal.removeEventListener('abort',stop);}
  }
  dispose(reason:Error=new DOMException('模型已停止','AbortError')){
    this.pendingReject?.(reason);this.pendingReject=undefined;
    this.worker?.terminate();this.worker=undefined;this.engine=undefined;
  }
}
export async function clearModelCache(){await deleteModelAllInfoInCache(MODEL);}
