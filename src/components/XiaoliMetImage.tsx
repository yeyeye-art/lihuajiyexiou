import React, {useEffect,useRef,useState} from 'react';
import type {RecordEntry} from '../features/xiaoli/knowledge';
interface PreviewModule {mountMetImagePreview:(node:HTMLElement,records:RecordEntry[])=>()=>void}
export const XiaoliMetImage:React.FC<{record:RecordEntry}>=({record})=>{
  const root=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let active=true,dispose:(()=>void)|undefined;
    const url=new URL(`${import.meta.env.BASE_URL}assets/embroidery-met-preview.js`,location.origin).href;
    import(/* @vite-ignore */ url).then((module:PreviewModule)=>{
      if(active&&root.current){dispose=module.mountMetImagePreview(root.current,[record]);setReady(true);}
    }).catch(()=>{if(active)setReady(false);});
    return()=>{active=false;dispose?.();};
  },[record]);
  return <div ref={root} className="xiaoli-object-preview">
    <p>馆藏编号：{record.museum?.objectNumber}</p>
    <button disabled={!ready} data-met-preview={record.id}>查看馆方开放图像</button>
    <div data-met-preview-region aria-live="polite">点击后核对馆方图像许可并加载；无法加载时仍可打开作品档案。</div>
  </div>;
};
