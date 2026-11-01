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
  for(const id of t.records){const r=records.get(id);assert(r,'Topic refers to unverified/missing record: '+id);assert(r.source?.url?.startsWith('https://')||r.sourceIds?.some(id=>sourceIds.has(id)),'Missing provenance');}
  assert(Array.isArray(t.simple)&&t.simple.length>0,'Topic needs a sourced simple explanation');
  for(const s of t.simple)assert(t.records.includes(s.recordId)&&typeof s.text==='string'&&s.text.length>4,'Unlinked explanation');
  if(t.demo){assert(/^demo-[a-z-]+$/.test(t.demo));const d=read('content/stitch-demos/'+t.demo+'.json');assert(t.records.includes(d.knowledgeId),'Wrong lesson topic');assert(fs.existsSync(root+'assets/xiaoli-lessons/'+t.demo+'.svg'),'Missing illustration');}
 }
 return {topics:data.topics.length,records:new Set(data.topics.flatMap(t=>t.records)).size};
}
