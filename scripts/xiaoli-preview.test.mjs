import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../assets/embroidery-knowledge.js';
import {prepareAnswer,acceptModelAnswer,modelMessages,speechText} from '../src/features/xiaoli/knowledge.ts';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const legacy=read('content/suxiu-knowledge.json'),world=read('content/embroidery-world.json');
const sources=new Map(read('content/suxiu-sources.json').map(s=>[s.id,s]));
for(const r of world.records){sources.set(r.source.url,{...r.source,title:r.title});for(const s of r.additionalSources||[])sources.set(s.url,s);}
const archive={records:api.makeIndex(legacy,world.records),sources};
const cases=read('docs/xiaoli/evaluation-cases.json');
test('100 real-corpus retrieval, follow-up, greeting and insufficient-evidence cases',()=>{
 assert.equal(cases.length,100);
 const failures=[];
 for(const c of cases){const answer=prepareAnswer(c.question,c.history||[],archive,api,'brief');if(answer.kind!==c.expected)failures.push({question:c.question,expected:c.expected,actual:answer.kind});if(answer.kind==='evidence'){assert(answer.citations.length>0);assert(answer.records.every(id=>archive.records.some(r=>r.id===id)));assert(answer.citations.every(s=>s.url.startsWith('https://')));}}
 assert.deepEqual(failures,[]);
});
test('Citation markers refer to the same record as the displayed summary',()=>{
 const a=prepareAnswer('苏绣和湘绣有什么区别？',[],archive,api,'brief');
 for(let i=0;i<a.records.length;i++)assert.equal(a.citations[i].recordId,a.records[i]);
 assert(a.answer.includes('〔1〕'));assert(a.answer.includes('〔2〕'));
});
test('Model output with invented citation or unsupported date falls back',()=>{
 const a=prepareAnswer('苏绣是什么？',[],archive,api,'brief');
 assert.equal(acceptModelAnswer('创立于2099年。〔1〕',a),null);
 assert.equal(acceptModelAnswer('苏绣。〔999〕',a),null);
 assert.equal(acceptModelAnswer('没有引用的答案',a),null);
 assert.equal(acceptModelAnswer('https://evil.invalid〔1〕',a),null);
 assert.equal(acceptModelAnswer('苏绣起源于苏州。〔1〕',a),null);
 assert.equal(acceptModelAnswer('苏绣是唯一的刺绣。〔1〕',a),null);
 assert.equal(acceptModelAnswer(a.answer,a)?.kind,'model');
});
test('Prompt history is bounded and original reference text remains a data block',()=>{
 const a=prepareAnswer('苏绣是什么？',[],archive,api,'brief');
 const messages=modelMessages(a,Array.from({length:30},()=>({role:'user',content:'长'.repeat(5000)})),'brief');
 assert.equal(messages.length,4);assert(messages.slice(1,-1).every(m=>m.content.length<=180));assert(messages.at(-1).content.includes(JSON.stringify(a.answer)));
});
test('Read-aloud omits reference markers and links without sending questions anywhere',()=>{
 assert.equal(speechText('苏绣〔1〕\nhttps://example.com'),'苏绣。');
});
