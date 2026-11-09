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
 assert.equal(acceptModelAnswer('苏绣起源于苏州。〔1〕\n'+a.answer,a),null);
 const history=prepareAnswer('苏绣起源',[],archive,api,'brief');
 assert.equal(acceptModelAnswer('苏绣起源于宋代。〔1〕',history),null);
 assert.equal(acceptModelAnswer('苏绣是唯一的刺绣。〔1〕',a),null);
 const person=prepareAnswer('沈寿是谁？',[],archive,api,'brief');
 assert.equal(acceptModelAnswer('沈寿是代表性传承人。〔1〕',person),null);
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

import {learningTopics,questionIntent} from '../src/features/xiaoli/knowledge.ts';
import {validateXiaoliTopics} from './validate-xiaoli-topics.mjs';
import {readConversation,saveConversation,hasConversation} from '../src/features/xiaoli/session.ts';
const talk=(history,q,detail='brief')=>{const reply=prepareAnswer(q,history,archive,api,detail);history.push({role:'user',content:q},{role:'assistant',content:reply.answer,records:reply.records,question:reply.question,topicId:reply.topicId});return reply;};
test('Every curated topic has existing verified records, cited explanations and real lesson assets',()=>{
 assert.equal(validateXiaoliTopics().topics,12);
 for(const t of learningTopics){
  const h=[];const brief=talk(h,t.question);const simple=talk(h,'我还是不懂');const detailed=talk(h,'详细一点');
  for(const a of [brief,simple,detailed]){assert.equal(a.kind,'evidence',t.id);assert.equal(a.topicId,t.id);assert(a.records.every(id=>t.records.includes(id)));assert(a.citations.length>0);}
  assert(simple.answer.includes(t.simple[0].text));assert(detailed.answer.includes(t.prompt));
 }
 const bad=read('content/xiaoli-topics.json');bad.topics[0].records=['invented'];assert.throws(()=>validateXiaoliTopics(bad));
 const wrong=read('content/xiaoli-topics.json');wrong.topics.find(t=>t.id==='gun').demo='demo-santao-pear-petal';assert.throws(()=>validateXiaoliTopics(wrong));
});
test('Rephrase-show-source chain stays on santao and a new gun question switches cleanly',()=>{
 const h=[];talk(h,'散套针怎么理解？');
 const simple=talk(h,'我还是不懂');assert.match(simple.answer,/由外向内/);assert.equal(simple.topicId,'santao');
 const visual=talk(h,'给我看看');assert.equal(visual.kind,'guide');assert(visual.actions.some(a=>a.href==='#guide/practice-demo-santao-pear-petal'));assert(visual.illustration.src.endsWith('demo-santao-pear-petal.svg'));
 assert.equal(talk(h,'出处在哪里').topicId,'santao');
 talk(h,'那滚针呢');const gun=talk(h,'给我看看');assert.equal(gun.topicId,'gun');assert(!gun.actions.some(a=>a.href.includes('santao')));
});
test('Polite acknowledgements preserve topic; unsupported subjects do not resurrect the previous one',()=>{
 const h=[];talk(h,'滚针');talk(h,'谢谢');assert.equal(talk(h,'我还是不懂').topicId,'gun');
 talk(h,'苏绣在2099年获得了什么奖？');assert.equal(talk(h,'给我看看').kind,'missing');
 assert.equal(prepareAnswer('给我看看',[],archive,api,'brief').kind,'missing');
});
test('Four-school overview includes all four cited lineages and never bypasses unknown factual claims',()=>{
 const a=prepareAnswer('四大名绣有什么区别？',[],archive,api,'brief');assert.equal(a.records.length,4);
 for(const label of ['苏绣','湘绣','粤绣','蜀绣'])assert(a.answer.includes(label));
 for(const t of learningTopics)assert.equal(prepareAnswer(t.question+'在2099年获得什么奖',[],archive,api,'brief').kind,'missing');
});
test('Guide actions resolve to the exact record, lesson or palette without generated destinations',()=>{
 for(const t of learningTopics){const h=[];talk(h,t.question);const a=talk(h,'给我看看');
  assert(a.actions.length>0);for(const action of a.actions){assert(/^#(?:guide\/[a-z0-9-]+|palette)$/.test(action.href));if(action.href.startsWith('#guide/')&&!action.href.includes('/practice-')&&!action.href.includes('/learn-'))assert(archive.records.some(r=>r.id===action.href.slice(7)));}
 }
 const h=[];talk(h,'我想看看配色');assert(talk(h,'给我看看').actions.some(a=>a.href==='#palette'));
 const museum=[];talk(museum,'带我看辽代龙虎纹刺绣残片');assert.equal(talk(museum,'给我看看').museumRecordId,'world-met-liao');
});
test('Reading-trip conversation state is bounded, resettable and independent of browser storage',()=>{
 saveConversation(Array.from({length:55},(_,i)=>({id:i,role:'user',text:'question '+i})));assert.equal(readConversation().length,40);assert(hasConversation());
 const copy=readConversation();copy.pop();assert.equal(readConversation().length,40);
 saveConversation([]);assert.equal(hasConversation(),false);
});
test('Follow-up intent accepts everyday phrasing without treating a new subject as a generic follow-up',()=>{
 for(const q of ['我没听懂','说简单一点','换个说法'])assert.equal(questionIntent(q),'simple');
 for(const q of ['让我看看图片','带我看演示','怎么练'])assert.equal(questionIntent(q),'show');
 assert.equal(questionIntent('那滚针呢'),'ask');assert.equal(questionIntent('苏绣在2099年获得什么奖'),'ask');
});

test('Everyday pronouns lead to clarification or the current lesson without guessing a comparison',()=>{
 assert.equal(prepareAnswer('这个是什么？',[],archive,api,'brief').kind,'clarify');
 assert.equal(prepareAnswer('这个怎么绣？',[],archive,api,'brief').kind,'missing');
 const h=[];talk(h,'请问散套针怎么理解呀？');
 assert.equal(talk(h,'能不能讲简单一点？').topicId,'santao');
 assert(talk(h,'这个怎么绣？').actions.some(a=>a.href==='#guide/practice-demo-santao-pear-petal'));
 assert.equal(talk(h,'跟刚才那个有什么区别？').kind,'clarify');
 assert.equal(talk(h,'请给我看看图片').kind,'missing');
 for(const q of ['请问苏绣在2099年获得什么奖呀','请问散套针在2099年获得什么奖'])assert.equal(prepareAnswer(q,[],archive,api,'brief').kind,'missing');
});
