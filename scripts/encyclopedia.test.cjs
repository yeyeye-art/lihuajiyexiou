const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const wide=read('content/embroidery-world.json'),legacy=read('content/suxiu-knowledge.json'),sources=read('content/suxiu-sources.json');
const units=Promise.all([import('../assets/embroidery-knowledge.js'),import('./validate-embroidery-world.mjs'),import('../workers/embroidery-ai-worker.js')]);
test('Sourced global/Chinese embroidery dossiers are verified and cannot masquerade as expert-reviewed',async()=>{
 const [,validator]=await units;const report=validator.validateWorldEncyclopedia(wide);
 assert.equal(report.records,70);assert(report.sources>=18);
 assert(wide.records.some(x=>x.title.includes('湘绣'))&&wide.records.some(x=>x.title.includes('蜀绣'))&&wide.records.some(x=>x.title.includes('潮绣')));
 assert(wide.records.some(x=>x.title.includes('巴勒斯坦')));
 assert(wide.records.some(x=>x.title.includes('羌族刺绣'))&&wide.records.some(x=>x.title.includes('顾绣')));
 assert(wide.records.filter(x=>x.museum?.institution==='The Metropolitan Museum of Art').length===24);
 assert(wide.records.every(x=>x.source?.url?.startsWith('https://')));
 assert(wide.records.every(x=>x.reviewStatus==='source-paraphrased-not-expert-reviewed'));
});
test('Offline Q&A is source-backed retrieval, not a fabricated LLM conversation',async()=>{
 const [mod]=await units,archive={records:mod.makeIndex(legacy,wide.records),sources:new Map(sources.map(s=>[s.id,s]))};
 for(const x of wide.records)archive.sources.set(x.source.url,{title:x.title,url:x.source.url,organization:x.source.title});
 assert.equal(archive.records.length,legacy.length+wide.records.length);
 assert.equal(new Set(archive.records.map(x=>x.id)).size,archive.records.length);
 const result=mod.evidenceReply('苏绣和湘绣有什么区别？',archive);
 assert.equal(result.mode,'evidence');assert.match(result.answer,/湘绣/);
 assert(result.citations.some(x=>x.url.startsWith('https://www.ihchina.cn/')));
 assert(result.answer.includes('不是大语言模型生成'));
 const other=mod.evidenceReply('巴勒斯坦刺绣在什么名录里？',archive);
 assert(other.citations.some(x=>x.url.includes('ich.unesco.org')));
 const missing=mod.evidenceReply('zzqvxyz-will-never-match-78324',archive);
 assert.equal(missing.records.length,0);
});
test('New article categories and identity routing retain the original verified knowledge archive',async()=>{
 const [mod]=await units,rows=mod.makeIndex(legacy,wide.records);
 const su=mod.rankKnowledge(rows,'沈寿',{section:'suxiu'});assert(su.some(x=>x.title.includes('沈寿')));
 assert(mod.rankKnowledge(rows,'',{section:'suxiu',limit:200}).some(x=>x.id==='world-yangshouyu-date-difference'),'Su history must remain navigable in its own specialty portal');
 const four=mod.rankKnowledge(rows,'',{section:'four'});assert(four.length>=5);
 const world=mod.rankKnowledge(rows,'',{section:'world'});assert(world.length>=3);
 const exact=mod.rankKnowledge(rows,'湘绣');assert.equal(exact[0].title,'湘绣：湖南传统刺绣');
 const ids=rows.filter(x=>x.official).map(x=>x.id);
 assert.equal(ids.length,85);assert(ids.includes('stitch-tao')&&ids.includes('stitch-gun'));
});
test('Optional secure Worker cannot call AI without trusted origin or mandatory rate limit',async()=>{
 const [,,worker]=await units;
 const base='https://embroidery.test/api/embroidery/ask';
 const invalid=await worker.default.fetch(new Request(base,{method:'POST',headers:{Origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({question:'苏绣是什么'})}),{});
 assert.equal(invalid.status,403);
 const origin='https://yeyeye-art.github.io';
 const req=new Request(base,{method:'POST',headers:{Origin:origin,'content-type':'application/json'},body:JSON.stringify({question:'苏绣是什么'})});
 const failClosed=await worker.default.fetch(req,{});assert.equal(failClosed.status,503);
 const preflight=await worker.default.fetch(new Request(base,{method:'OPTIONS',headers:{Origin:origin}}),{});assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
 const corpus=worker.chooseEvidence('苏绣 湘绣 区别',{knowledge:legacy,sources},wide);
 assert(corpus.some(x=>x.title==='湘绣：湖南传统刺绣'));
 assert(corpus.some(x=>x.title==='苏绣'));
});
test('Historical conflict is documented with both official source citations, not a fabricated consensus',async()=>{
 const [mod,validator]=await units;
 const conflict=wide.records.find(x=>x.id==='world-yangshouyu-date-difference');
 assert(conflict.additionalSources?.some(s=>s.url.includes('/13978/')));
 assert(conflict.facts.some(f=>f.text.includes('1912'))&&conflict.facts.some(f=>f.text.includes('30年代')));
 const archive={records:mod.makeIndex(legacy,wide.records),sources:new Map(sources.map(s=>[s.id,s]))};
 for(const x of wide.records){archive.sources.set(x.source.url,{url:x.source.url,title:x.title,organization:x.source.title});for(const s of x.additionalSources||[])archive.sources.set(s.url,{...s,organization:'非遗官方项目'});}
 const answer=mod.evidenceReply('乱针绣创制年代有什么争议？',archive);
 assert(answer.records.includes('world-yangshouyu-date-difference'));
 assert(answer.citations.some(s=>s.url.includes('/13978/'))&&answer.citations.some(s=>s.url.includes('/23716.html')));
 const bad=structuredClone(wide);
 bad.records.find(x=>x.id==='world-yangshouyu-date-difference').additionalSources[0].url='https://untrusted.example/fiction';
 assert.throws(()=>validator.validateWorldEncyclopedia(bad),/Unsafe source|Uncited facts/);
});
test('Contextual followups resolve prior topics and do not silently claim generative intelligence',async()=>{
 const [mod]=await units;
 const context=mod.resolveFollowUpQuestion('那它们的历史呢？',[{role:'user',content:'苏绣和湘绣有什么区别？'},{role:'assistant',content:'可查看两种绣种'}]);
 assert.equal(context.contextUsed,true);assert(context.query.includes('苏绣')&&context.query.includes('湘绣'));
 const explicit=mod.resolveFollowUpQuestion('那粤绣呢？',[{role:'user',content:'苏绣是什么？'}]);
 assert.equal(explicit.contextUsed,false);
 const archive={records:mod.makeIndex(legacy,wide.records),sources:new Map(sources.map(s=>[s.id,s]))};
 for(const x of wide.records){archive.sources.set(x.source.url,{url:x.source.url,title:x.title,organization:x.source.title});for(const s of x.additionalSources||[])archive.sources.set(s.url,{...s,organization:'非遗官方项目'});}
 const answer=mod.evidenceReply('那它们的历史呢？',archive,[{role:'user',content:'苏绣和湘绣有什么区别？'}]);
 assert.equal(answer.contextUsed,true);assert.match(answer.answer,/承接上一问/);assert(answer.records.length>0);
 assert.equal(mod.evidenceReply('zzqvxyz-invalid',archive).records.length,0);
});
test('Met embroidered objects retain actual accession IDs and never acquire invented Suzhou provenance',()=>{
 const records=wide.records.filter(x=>x.id.startsWith('world-met-'));
 assert.equal(records.length,24);
 for(const row of records){
  assert(row.museum.objectNumber&&row.museum.classification==='Textiles-Embroidered');
  assert(/未|not |China|Macau|Europe|Chinese/.test(row.museum.attributionNote));
  assert(/^https:\/\/www.metmuseum.org\/art\/collection\/search\/\d+$/.test(row.source.url));
 }
});
test('Open-access museum image preview validates genuine Met object identity, classification and per-object rights',async()=>{
 const image=await import('../assets/embroidery-met-preview.js');
 const item=wide.records.find(x=>x.id==='world-met-854572');
 assert(item&&item.museum.objectNumber==='2022.147.9');
 const base={objectID:854572,classification:'Textiles-Embroidered',accessionNumber:'2022.147.9',isPublicDomain:true,
  primaryImageSmall:'https://images.metmuseum.org/CRDImages/es/web-large/DP_IMG.jpg'};
 const pass=image.validateMetImage(base,item);
 assert.equal(pass.ok,true);
 for(const incorrect of [
  {...base,objectID:999},{...base,isPublicDomain:false},{...base,classification:'Paintings'},
  {...base,accessionNumber:'2022.147.8'},
  {...base,primaryImageSmall:'https://evil.example/museum.jpg'},
  {...base,primaryImageSmall:'http://images.metmuseum.org/file.jpg'}
 ])assert.equal(image.validateMetImage(incorrect,item).ok,false);
});
test('Museum object sources maintain global diversity and no unsupported Suzhou attribution',()=>{
 const objects=wide.records.filter(x=>x.id.startsWith('world-met-'));
 assert.equal(objects.length,24);
 assert(objects.some(x=>x.region.includes('印度'))&&objects.some(x=>x.region.includes('日本'))&&objects.some(x=>x.region.includes('中国')));
 const numbers=objects.map(x=>x.museum.objectNumber);
 assert.equal(new Set(numbers).size,numbers.length);
 assert(objects.every(x=>/Public Domain/.test(x.museum.rights)));
});
test('A published but unactivated Worker cannot create a billable AI request',async()=>{
 const [,,worker]=await units;
 let requests=0,limits=0;
 const AI={run:async()=>{requests++;return {response:'fake answer'}}};
 const RATE_LIMITER={limit:async()=>{limits++;return {success:true}}};
 const TOTAL_RATE_LIMITER={limit:async()=>{limits++;return {success:true}}};
 const request=()=>new Request('https://worker.example/api/embroidery/ask',{method:'POST',headers:{
  Origin:'https://yeyeye-art.github.io','content-type':'application/json'
 },body:JSON.stringify({question:'苏绣的起源是什么？'})});
 const disabled=await worker.default.fetch(request(),{AI,AI_ENABLED:'false',RATE_LIMITER,TOTAL_RATE_LIMITER});
 assert.equal(disabled.status,503);assert.equal(requests,0);assert.equal(limits,0);
 const noGlobal=await worker.default.fetch(request(),{AI,AI_ENABLED:'true',RATE_LIMITER});
 assert.equal(noGlobal.status,503);
 const throttled=await worker.default.fetch(request(),{AI,AI_ENABLED:'true',RATE_LIMITER:{limit:async()=>({success:false})},TOTAL_RATE_LIMITER});
 assert.equal(throttled.status,429);assert.equal(requests,0);
 const wrangler=JSON.parse(fs.readFileSync(path.join(root,'workers/wrangler.jsonc'),'utf8'));
 assert.equal(wrangler.vars.AI_ENABLED,'false');
 assert.deepEqual(wrangler.ratelimits.map(x=>x.name).sort(),['RATE_LIMITER','TOTAL_RATE_LIMITER']);
});
test('Restored guide mounts the full encyclopedia and learning tools in the React shell',()=>{
 const bridge=fs.readFileSync(path.join(root,'assets/restored-sections.js'),'utf8');
 const guide=fs.readFileSync(path.join(root,'src/pages/Guide.tsx'),'utf8');
 const ar=fs.readFileSync(path.join(root,'src/pages/Ar.tsx'),'utf8');
 assert(guide.includes('RestoredSection')&&guide.includes('page="guide"'));
 for(const name of ['mountEmbroideryEncyclopedia','mountLearningPath','mountVideoArchive','mountStitchLab'])assert(bridge.includes(name));
 assert(ar.includes('ar-frame')&&ar.includes('cameraConsent'));
});
