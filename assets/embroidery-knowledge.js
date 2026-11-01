// An explainable, evidence-first multilingual embroidery archive. Local answers are not LLM outputs.
import {loadSuxiuKnowledge} from './suxiu-knowledge-store.js';
import {assessEvidenceCoverage} from './embroidery-evidence-coverage.js';
const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s，。？！、“”《》：；,.!?()（）]+/g,'');
const stop=new Set(['什么','怎么','如何','为什么','有没有','是谁','区别','介绍','告诉我','请问','了解','一下','那些','这些','这个','有什么','详细','继续','是否','我们','他们','这里','那里']);
const domainWords=['苏绣','湘绣','粤绣','蜀绣','广绣','潮绣','京绣','顾绣','汴绣','羌绣','苗绣','马尾绣','乱针绣','沈寿','杨守玉','韩希孟','丁佩','绣谱','精微绣','镇湖','套针','散套针','滚针','针法','刺绣','博物馆','非遗','Chakan','Al Talli','Kebaya','Altiță','Antep','Zmijanje','巴勒斯坦','塔吉克斯坦','土耳其'];
export const TOPICS=[
 {id:'all',label:'全部刺绣'}, {id:'suxiu',label:'苏绣专藏'}, {id:'four',label:'四大名绣'},
 {id:'china',label:'中国其他刺绣'}, {id:'world',label:'世界刺绣'},
 {id:'history',label:'历史与发展'}, {id:'craft',label:'工艺与针法'},
 {id:'museum',label:'馆藏与名作'}, {id:'heritage',label:'非遗与传承'},
 {id:'modern',label:'数字与现代'}
];
const topicForOfficial=k=>{
 if(k.category==='history')return 'history';
 if(['stitch','tool','material','process','craft-system','terminology'].includes(k.category))return 'craft';
 if(['institution','branch','inheritor','standard'].includes(k.category))return 'heritage';
 return 'suxiu';
};
export function makeIndex(official,world){
 const original=official.filter(k=>k?.verified===true).map(k=>({
   id:k.id,title:k.title,section:topicForOfficial(k),lineage:'suxiu',
   summary:k.summary,region:'苏绣体系',period:'',
   keywords:[...(k.aliases||[]),...(k.keywords||[])],
   facts:(k.facts||[]).map(f=>f.text),citations:[...new Set(k.sourceIds||[])],official:k,verified:true
 }));
 const expanded=world.filter(k=>k?.verified===true).map(k=>({
   id:k.id,title:k.title,section:k.section,lineage:k.lineage|| (k.section==='suxiu'?'suxiu':k.section),
   summary:k.summary,region:k.region,period:k.period,keywords:k.keywords||[],
   facts:(k.facts||[]).map(f=>f.text),citations:[k.source?.url,...(k.additionalSources||[]).map(s=>s.url)],
   source:k.source,museum:k.museum||null,verified:true
 }));
 const ids=new Set();return [...original,...expanded].filter(row=>{
   if(!row.id||ids.has(row.id))return false;ids.add(row.id);return true;
 });
}
function terms(query){
 const q=normalize(query),keys=new Set();
 for(const token of q.split(/与|和|或|跟|以及|的|有哪些|区别|比较|有什么|是|为什么|怎么样|如何|请|怎么|一下|介绍|简单|详细|关于|再|呢|那/)){
  if(token.length>=2&&!stop.has(token))keys.add(token);
 }
 for(const word of domainWords)if(q.includes(normalize(word)))keys.add(normalize(word));
 for(let i=0;i<q.length-1;i++)if(!stop.has(q.slice(i,i+2)))keys.add(q.slice(i,i+2));
 return [...keys].filter(t=>t.length>=2).slice(0,48);
}
export function rankKnowledge(records,query,{section='all',limit=60}={}){
 const subset=records.filter(row=>section==='all'||row.section===section||(section==='suxiu'&&row.lineage==='suxiu'));
 const q=normalize(query);if(!q)return subset.slice(0,limit);
 const tokens=terms(q);
 return subset.map(row=>{
  const title=normalize(row.title),aliases=(row.keywords||[]).map(normalize),region=normalize(row.region);
  const body=normalize([row.summary,...row.facts,row.period].join(' '));
  const score=(title===q?480:0)+(title.includes(q)?120:0)+aliases.reduce((n,a)=>n+(a.length>1&&q.includes(a)?27:0),0)
   +tokens.reduce((n,t)=>n+(title.includes(t)?Math.min(13+t.length*6,47):0)
    +(aliases.some(a=>a.includes(t))?Math.min(12+t.length*3,25):0)
    +(region.includes(t)?6:0)+(body.includes(t)?Math.min(2+t.length*2,11):0),0);
  return {...row,score};
 }).filter(row=>row.score>=9).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'zh-CN')).slice(0,limit);
}
export async function loadEmbroideryArchive(fetcher=(...args)=>fetch(...args)){
 const [original,wide]=await Promise.all([
  loadSuxiuKnowledge(),
  fetcher(new URL('../content/embroidery-world.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('跨文化刺绣资料暂时不可用');return r.json()})
 ]);
 if(!Array.isArray(wide.records))throw Error('跨文化刺绣数据格式不正确');
 const safe=wide.records.filter(k=>/^world-[a-z0-9-]+$/.test(k.id)&&k.verified===true&&
   /^https:\/\//.test(k.source?.url||'')&&k.facts?.length&&k.facts.every(f=>[k.source.url,...(k.additionalSources||[]).map(s=>s.url)].includes(f.sourceUrl)));
 const archive=makeIndex(original.knowledge,safe);
 const sources=new Map(original.sources.filter(s=>s.verified&&/^https:\/\//.test(s.url)).map(s=>[s.id,{url:s.url,title:s.title,organization:s.organization}]));
 for(const item of safe){sources.set(item.source.url,{url:item.source.url,title:item.title,organization:item.source.title||'馆藏与非遗权威资料'});for(const s of item.additionalSources||[])sources.set(s.url,{url:s.url,title:s.title,organization:'中国非物质文化遗产网'});}
 return {records:archive,sources,original,wide};
}
export function resolveFollowUpQuestion(question,history=[]){
 const q=String(question||'').trim(),n=normalize(q);
 const named=domainWords.filter(w=>w!=='刺绣'&&w!=='针法'&&n.includes(normalize(w)));
 if(named.length||!/(它们|他们|她们|它|她|这个|那个|刚才|上面|继续|详细|然后|为什么|还有|具体|那|再说|呢)/.test(q)||q.length>50)return {query:q,contextUsed:false};
 const prior=[...history].reverse().find(x=>x?.role==='user'&&typeof x.content==='string'&&x.content.trim()!==q)?.content||'';
 if(!prior)return {query:q,contextUsed:false};
 const p=normalize(prior),themes=domainWords.filter(w=>w!=='刺绣'&&w!=='针法'&&p.includes(normalize(w)));
 if(!themes.length)return {query:q,contextUsed:false};
 // Distinct specific terms take precedence; do not force a language model to guess a new entity.
 const top=themes.filter(w=>!themes.some(t=>t!==w&&t.includes(w))).slice(0,4);
 return {query:top.join('、')+'：'+q,contextUsed:true,referents:top};
}
function citationsFor(rows,sources){
 const seen=new Map();
 for(const row of rows)for(const id of row.citations||[]){
  const s=sources.get(id);
  if(s?.url?.startsWith('https://'))seen.set(s.url,{url:s.url,title:s.title,organization:s.organization,recordId:row.id});
 }
 return [...seen.values()].slice(0,8);
}
const dedupe=arr=>[...new Set(arr.map(x=>String(x).trim()).filter(Boolean))];
function compactExplanation(row){
 const f=dedupe(row.facts).filter(text=>text!==row.summary&&!row.summary.includes(text)).slice(0,2);
 return row.title+'：'+[row.summary,...f].join(' ');
}
function famousComparison(rows,query){
 if(!/区别|比较|不同|对比|各自|差别/.test(query))return [];
 const names=['苏绣','湘绣','粤绣','蜀绣'];
 const wanted=names.filter(x=>query.includes(x));
 if(wanted.length<2)return [];
 return wanted.map(name=>rows.find(r=>r.title===name)||rows.find(r=>r.title.startsWith(name+'：')||r.title.startsWith(name+':'))).filter(Boolean);
}
export function evidenceReply(question,archive,history=[]){
 const q=String(question||'').trim();const context=resolveFollowUpQuestion(q,history);
 if(q.length<2||(!/[\u3400-\u9FFF]/u.test(q)&&!/Zmijanje|embroidery|Palestine|UNESCO|Chakan|Alti|Antep|Kebaya/i.test(q)))
  return {mode:'evidence',answer:'目前未能从已收录资料找到足够依据。我不会为无关问题编造出处。请提供具体绣种、针法、地区或年代。',citations:[],records:[],contextUsed:false};
 const coverage=assessEvidenceCoverage(context.query,archive.records);
 if(!coverage.allowed)return {mode:'evidence',answer:'现有已收录资料不足以核实这个问题涉及的具体人物、年代、事件或文化归属；我不能因为看到相关绣种，就把无关文献当作答案。请尝试更明确的馆藏编号、针法或来源。',citations:[],records:[],contextUsed:context.contextUsed,coverageReason:coverage.reason};
 const pool=rankKnowledge(coverage.records,context.query,{limit:25});
 const matched=famousComparison(coverage.records,context.query);
 const selected=matched.length>=2?matched:pool.slice(0,3);
 if(!selected.length)return {mode:'evidence',answer:'目前已经核验的资料里没有足够依据直接回答这个问题。我不能用猜测替代文献。可以尝试提供具体绣种、时代、针法或馆藏名称。',citations:[],records:[],contextUsed:context.contextUsed};
 const prefix='以下是已核验公开资料的检索归纳（不是大语言模型生成）：';
 const contextNote=context.contextUsed?'\n承接上一问的主题：'+context.referents.join('、')+'。':'';
 const lines=selected.map((row,i)=>'（'+(i+1)+'）'+compactExplanation(row));
 const answer=prefix+contextNote+'\n\n'+lines.join('\n\n')+'\n\n可点击下方知识条目阅读更多事实并核对原始出处。当前未接入真正的大模型。';
 return {mode:'evidence',answer,citations:citationsFor(selected,archive.sources),
  records:selected.map(x=>x.id),contextUsed:context.contextUsed,resolvedQuestion:context.query};
}
