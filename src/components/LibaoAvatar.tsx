import {useEffect,useRef,useState} from 'react';

interface Avatar {dispose:()=>void}
interface AvatarModule {createXiaoli3D:(node:HTMLElement,options:{modelPath:string;reducedMotion:boolean;modelRotationY:number;keepFacing:boolean;onLoadStatus:(status:string)=>void})=>Avatar}
export function LibaoAvatar(){
  const container=useRef<HTMLSpanElement>(null);
  const [status,setStatus]=useState('loading');
  useEffect(()=>{
    let disposed=false,instance:Avatar|undefined;
    const asset=(path:string)=>new URL(`${import.meta.env.BASE_URL}${path}`,location.origin).href;
    // Reuse the existing renderer and original pear model; no perpetual WebGL animation.
    import(/* @vite-ignore */ asset('assets/agents/xiaoli-3d.js')).then((api:AvatarModule)=>{
      if(disposed||!container.current)return;
      instance=api.createXiaoli3D(container.current,{modelPath:asset('assets/models/libao.glb'),reducedMotion:true,modelRotationY:-Math.PI/2,keepFacing:true,onLoadStatus:s=>{if(!disposed)setStatus(s);}});
    }).catch(()=>{if(!disposed)setStatus('error');});
    return()=>{disposed=true;instance?.dispose();};
  },[]);
  return <span className="libao-avatar" aria-hidden="true" ref={container} data-status={status}>{status!=='ready'&&<span className="libao-avatar-fallback">梨</span>}</span>;
}
