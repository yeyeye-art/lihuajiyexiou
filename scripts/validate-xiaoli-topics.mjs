import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
export function validateXiaoliTopics(data=read('content/xiaoli-topics.json')){
 const originals=read('content/suxiu-knowledge.json'),world=read('content/embroidery-world.json').records;
 const records=new Map([...originals,...world].filter(r=>r.verified===true).map(r=>[r.id,r]));
 const sourceIds=new Set(read('content/suxiu-sources.json').filter(s=>s.verified&&/^https:\/\//.test(s.url)).map(s=>s.id));
 assert.equal(data.version,1);assert(Array.isArray(data.topics)&&data.topics.length>0);
 const ids=new Set();
 for(const t of data.topics){
  assert(/^[a-z-]+$/.test(t.id)&&!ids.has(t.id),'Duplicate/invalid topic');ids.add(t.id);
  for(const key of ['category','title','question','prompt'])assert(typeof t[key]==='string'&&t[key].trim(),'Missing topic '+key);
  assert(Array.isArray(t.records)&&t.records.length>0&&new Set(t.records).size===t.records.length);
  if(t.overview!==undefined)assert(typeof t.overview==='boolean'&&t.records.length<=4,'Overview needs at most four cited records');
  for(const id of t.records){const r=records.get(id);assert(r,'Topic refers to unverified/missing record: '+id);assert(r.source?.url?.startsWith('https://')||r.sourceIds?.some(id=>sourceIds.has(id)),'Missing provenance');}
  assert(Array.isArray(t.simple)&&t.simple.length>0,'Topic needs a sourced simple explanation');
  for(const s of t.simple)assert(t.records.includes(s.recordId)&&typeof s.text==='string'&&s.text.length>4,'Unlinked explanation');
  if(t.demo){assert(/^demo-[a-z-]+$/.test(t.demo));const d=read('content/stitch-demos/'+t.demo+'.json');assert(t.records.includes(d.knowledgeId),'Wrong lesson topic');assert(fs.existsSync(root+'assets/xiaoli-lessons/'+t.demo+'.svg'),'Missing illustration');}
 }
 return {topics:data.topics.length,records:new Set(data.topics.flatMap(t=>t.records)).size};
}

export function validateXiaoliSupport(hints=read('content/xiaoli-search-hints.json'),excerpts=read('content/xiaoli-source-excerpts.json')){
 const topics=new Set(read('content/xiaoli-topics.json').topics.map(t=>t.id));
 const records=new Map(read('content/suxiu-knowledge.json').filter(r=>r.verified).map(r=>[r.id,r]));
 const sources=new Map(read('content/suxiu-sources.json').filter(s=>s.verified).map(s=>[s.id,s]));
 assert.equal(hints.version,1);assert.equal(excerpts.version,1);
 const ids=new Set(),phrases=new Set();
 for(const hint of hints.topics){
  assert(topics.has(hint.id)&&!ids.has(hint.id),'Unknown/duplicate search topic');ids.add(hint.id);
  for(const group of [hint.phrases,hint.direct]){assert(Array.isArray(group));for(const text of group)assert(typeof text==='string'&&text.trim().length>=2&&text.length<=150);}
  for(const phrase of hint.direct){assert(!phrases.has(phrase),'Ambiguous automatic match');phrases.add(phrase);}
 }
 for(const excerpt of excerpts.excerpts){
  assert(sources.get(excerpt.sourceId)?.url===excerpt.url,'Excerpt source URL mismatch');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(excerpt.checkedAt),'Missing excerpt verification date');
  assert(typeof excerpt.text==='string'&&excerpt.text.length>0&&excerpt.text.length<=80,'Excerpt must remain short');
  assert(excerpt.recordIds.length>0);for(const id of excerpt.recordIds)assert(records.get(id)?.sourceIds.includes(excerpt.sourceId),'Excerpt record/source mismatch');
 }
 return {searchTopics:ids.size,originalExcerpts:excerpts.excerpts.length};
}
