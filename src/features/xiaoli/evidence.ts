import excerpts from '../../../content/xiaoli-source-excerpts.json' with {type:'json'};
import type {Archive,Source} from './knowledge';
export function sourceEvidence(source:Source,archive?:Archive){
  const row=archive?.records.find(r=>r.id===source.recordId);
  if(!row||!row.citations.some(id=>archive?.sources.get(id)?.url===source.url))return undefined;
  const original=excerpts.excerpts.find(e=>e.recordIds.includes(row.id)&&e.url===source.url&&row.citations.includes(e.sourceId));
  return {title:row.title,summary:[...new Set([row.summary,...row.facts])].join('\n'),original};
}
