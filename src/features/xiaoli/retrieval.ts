import MiniSearch from 'minisearch';
import hints from '../../../content/xiaoli-search-hints.json' with {type:'json'};
import topicData from '../../../content/xiaoli-topics.json' with {type:'json'};
import type {Archive} from './knowledge';

export interface SearchCandidate {id:string;label:string;question:string;records:string[];topicId?:string}
interface SearchDocument extends SearchCandidate {terms:string;body:string}
const indexes=new WeakMap<Archive,{index:MiniSearch<SearchDocument>;documents:Map<string,SearchDocument>}>();
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s。？！!?，、：；,.]/g,'');
const stop=new Set(['什么','怎么','哪些','之前','一点','我想','告诉','一个','一种','一幅','出来','今天','明天','需要','是','的','了','我','要','呢','吗','请问','可以']);
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh-CN',{granularity:'word'}):undefined;
export function searchTerms(text:string):string[]{
  const tokens=new Set<string>();
  const normalized=text.normalize('NFKC').toLowerCase();
  const segments=segmenter?[...segmenter.segment(normalized)]:[...normalized.matchAll(/[\p{Script=Han}]+|[a-z0-9]+/gu)].map(m=>({segment:m[0],isWordLike:true}));
  for(let index=0;index<segments.length;index++){
    const item=segments[index],next=segments[index+1];
    if(item.isWordLike&&item.segment.length===1&&!stop.has(item.segment)&&next?.isWordLike&&next.segment.length===1&&!stop.has(next.segment))tokens.add(item.segment+next.segment);
    if(!item.isWordLike||stop.has(item.segment)||item.segment.length<2)continue;
    tokens.add(item.segment);
    if(/^[\p{Script=Han}]+$/u.test(item.segment))for(let i=0;i<item.segment.length-1;i++){
      const pair=item.segment.slice(i,i+2);if(!stop.has(pair))tokens.add(pair);
    }
  }
  return [...tokens];
}
function getIndex(archive:Archive){
  const existing=indexes.get(archive);if(existing)return existing;
  const docs:SearchDocument[]=archive.records.filter(r=>r.citations.some(id=>archive.sources.get(id)?.url.startsWith('https://'))).map(r=>({id:'record:'+r.id,label:r.title,question:r.title,records:[r.id],terms:r.keywords?.join(' ')||'',body:[r.summary,...r.facts].join(' ')}));
  for(const topic of topicData.topics){
    const hint=hints.topics.find(h=>h.id===topic.id);
    const aliases='aliases'in topic?topic.aliases||[]:[];
    docs.push({id:'topic:'+topic.id,topicId:topic.id,label:topic.title,question:topic.question,records:topic.records,terms:[topic.question,...aliases,...(hint?.phrases||[])].join(' '),body:topic.records.map(id=>archive.records.find(r=>r.id===id)?.summary||'').join(' ')});
  }
  const index=new MiniSearch<SearchDocument>({fields:['label','terms','body'],tokenize:searchTerms,searchOptions:{boost:{label:4,terms:3,body:1},combineWith:'OR'}});
  index.addAll(docs);const result={index,documents:new Map(docs.map(d=>[d.id,d]))};indexes.set(archive,result);return result;
}
export function searchCandidates(query:string,archive:Archive):SearchCandidate[]{
  if(!query.trim()||query.length>500)return [];
  const {index,documents}=getIndex(archive);const selected:SearchCandidate[]=[];
  const hits=index.search(query);
  const queryTerms=searchTerms(query);
  for(const hit of hits){
    if(hit.queryTerms.length<queryTerms.length*0.6)continue;
    const row=documents.get(String(hit.id));if(!row||hit.score<Math.max(2,(hits[0]?.score||0)*0.35))continue;
    // A topic and its single-record result should not occupy two choices.
    if(selected.some(s=>row.records.every(id=>s.records.includes(id))||s.records.every(id=>row.records.includes(id))))continue;
    selected.push({id:row.id,label:row.label,question:row.question,records:row.records,topicId:row.topicId});
    if(selected.length===3)break;
  }
  return selected;
}
export function directSearchTopic(query:string):string|undefined {
  const q=normalize(query).replace(/^(?:小梨)?(?:请问|请)?/,'').replace(/[呀啊吗]$/,'');
  return hints.topics.find(t=>t.direct.some(p=>normalize(p)===q))?.id;
}
// Candidates are navigation choices, never evidence for an unsupported claim.
export function canSuggestCandidates(query:string):boolean {
  return !/[0-9０-９]|年代|朝代|起源|发明|最早|首次|唯一|获奖|获得|获授|获评|诺贝尔|治疗|保证|一定|不可能/.test(query);
}
