import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const approvedHosts=['www.ihchina.cn','ich.unesco.org','www.metmuseum.org','www.vam.ac.uk','www.dpm.org.cn'];
export function validateWorldEncyclopedia(data){
 const errors=[],ids=new Set();
 if(!Array.isArray(data?.records)||data.records.length<70)errors.push('At least 70 sourced cross-cultural dossiers are required');
 const coverage=new Set(),four=new Set();
 for(const row of data.records||[]){
  if(!/^world-[a-z0-9-]+$/.test(row.id))errors.push('Invalid record id '+row.id);
  if(ids.has(row.id))errors.push('Duplicate record '+row.id);ids.add(row.id);
  if(!['suxiu','four','china','world','history','craft','museum','heritage','modern'].includes(row.section))errors.push('Invalid section '+row.id);
  if(row.lineage!==undefined&&(row.lineage!=='suxiu'||!row.source?.url?.startsWith('https://www.ihchina.cn/')))errors.push('Unsupported Su genealogy '+row.id);
  if(!row.title?.trim()||row.summary?.length<25)errors.push('Missing content '+row.id);
  if(!row.region||!row.period||!row.keywords?.length)errors.push('Missing provenance context '+row.id);
  if(row.verified!==true||row.reviewStatus!=='source-paraphrased-not-expert-reviewed')errors.push('Unverified or falsely expert approved '+row.id);
  if(row.copyright!=='original-short-summary-no-rehosted-media')errors.push('Rights scope '+row.id);
  const source=row.source?.url;
  const allSources=[row.source,...(row.additionalSources||[])];
  if(!Array.isArray(row.additionalSources||[]))errors.push('Additional sources malformed '+row.id);
  for(const item of allSources){
   try{
    const url=new URL(item?.url);
    if(url.protocol!=='https:'||!approvedHosts.includes(url.hostname)||url.username||url.password||!item.title?.trim())errors.push('Unsafe source '+row.id);
   }catch{errors.push('Malformed source '+row.id)}
  }
  const allowed=new Set(allSources.map(s=>s?.url));
  if(allowed.size!==allSources.length)errors.push('Duplicate source URL '+row.id);
  if(!Array.isArray(row.facts)||row.facts.length===0||!row.facts.every(f=>f.text?.length>10&&allowed.has(f.sourceUrl)))errors.push('Uncited facts '+row.id);
  if(row.id.startsWith('world-met-')){
   const idFromPath=Number(String(source).split('/').at(-1));
   if(!Number.isSafeInteger(idFromPath)||idFromPath<=0||row.museum?.apiObjectId&&row.museum.apiObjectId!==idFromPath)errors.push('Mismatched Met API ID '+row.id);
   if(row.museum?.rights!=='Public Domain on the linked Met collection page')errors.push('Met image license not fully checked '+row.id);
   if(!source.startsWith('https://www.metmuseum.org/art/collection/search/'))errors.push('Museum source must be an object record '+row.id);
   if(!row.museum||row.museum.institution!=='The Metropolitan Museum of Art'||!row.museum.objectNumber||!row.museum.classification||!row.museum.attributionNote)errors.push('Missing museum item provenance '+row.id);
   if(/(?:^|[ ,])苏绣(?:[ ,]|$)/.test(row.museum.attributionNote||''))errors.push('Potential unsupported museum Suzhou attribution '+row.id);
  }
  coverage.add(row.section);
  if(['湘绣：湖南传统刺绣','粤绣：广绣与潮绣的关联','蜀绣：四川传统刺绣','四大名绣应怎样比较？'].includes(row.title))four.add(row.title);
 }
 if(!['suxiu','four','china','world','museum','craft','heritage','modern'].every(x=>coverage.has(x)))errors.push('Missing cultural breadth');
 if(four.size!==4)errors.push('Missing four famous embroidery coverage');
 if((data.records||[]).filter(row=>row.id.startsWith('world-met-')).length!==24)errors.push('Expected 24 accession-linked museum items');
 for(const row of data.records||[]){if(row.id.startsWith('world-met-')&&!row.museum?.objectNumber)errors.push('Missing real accession '+row.id)}
 if(errors.length)throw Error(errors.join('\n'));
 return {ok:true,records:data.records.length,sections:[...coverage],sources:new Set(data.records.flatMap(x=>[x.source.url,...(x.additionalSources||[]).map(s=>s.url)])).size,
  claim:'Each fact has an official referenced webpage; not expert signed off; no third-party images copied'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const data=JSON.parse(fs.readFileSync(new URL('../content/embroidery-world.json',import.meta.url),'utf8'));
 console.log(JSON.stringify(validateWorldEncyclopedia(data),null,2));
}
