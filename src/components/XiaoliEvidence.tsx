import {Fragment,useId,useRef,useState} from 'react';
import type {Archive,Source} from '../features/xiaoli/knowledge';
import {sourceEvidence} from '../features/xiaoli/evidence';

export function XiaoliEvidence({text,sources,archive}:{text:string;sources:Source[];archive?:Archive}){
  const id=useId();const [open,setOpen]=useState(false),[selected,setSelected]=useState<number>();
  const entries=useRef<Array<HTMLLIElement|null>>([]);
  const reveal=(index:number)=>{
    setOpen(true);setSelected(index);
    requestAnimationFrame(()=>{entries.current[index]?.focus({preventScroll:true});entries.current[index]?.scrollIntoView({block:'nearest'});});
  };
  return <>
    <p>{text.split(/(〔\d+〕)/g).map((part,i)=>{
      const marker=part.match(/^〔(\d+)〕$/);const index=marker?Number(marker[1])-1:-1;
      return marker&&sources[index]?<button className="xiaoli-citation" type="button" key={i} aria-label={`查看第${index+1}项出处`} aria-controls={id} aria-expanded={open&&selected===index} onClick={()=>reveal(index)}>{part}</button>:<Fragment key={i}>{part}</Fragment>;
    })}</p>
    {!!sources.length&&<details className="xiaoli-evidence" id={id} open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
      <summary>查看出处 · {sources.length} 项</summary>
      <ol>{sources.map((source,i)=>{
        const evidence=sourceEvidence(source,archive);
        const row=archive?.records.find(r=>r.id===source.recordId);
        const related=(row?.citations.map(key=>archive?.sources.get(key))||[]).filter((s):s is Source=>!!s&&s.url.startsWith('https://')&&s.url!==source.url);
        return <li key={`${source.recordId}-${i}`} ref={node=>{entries.current[i]=node;}} tabIndex={-1} data-selected={selected===i}>
          <strong>{evidence?.title||source.title}</strong>
          {evidence?.original&&<div className="xiaoli-original"><small>来源原文 · 短摘</small><blockquote>{evidence.original.text}</blockquote><small>核对日期：{evidence.original.checkedAt}；完整内容见原网页。</small></div>}
          {evidence&&<div className="xiaoli-record-excerpt"><small>本站资料摘录 · 据来源整理，非逐字原文</small><p>{evidence.summary}</p></div>}
          {!evidence&&<p>此条尚未附摘录，可打开来源核对。</p>}
          <a href={source.url} target="_blank" rel="noopener noreferrer">打开来源原网页：{source.title} ↗</a>
          {source.organization&&<small>{source.organization}</small>}
          {related.map(extra=><p key={extra.url}><a href={extra.url} target="_blank" rel="noopener noreferrer">相关出处：{extra.title} ↗</a></p>)}
        </li>;
      })}</ol>
    </details>}
  </>;
}
