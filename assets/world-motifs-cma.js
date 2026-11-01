// CMA open-license verifier, separate from immutable original 1088 records.
const regions=new Set(['东亚邻邦','东南亚','南亚','中亚','波斯与西亚','埃及与地中海','欧洲','非洲','美洲']);
const imageAllowed=value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='openaccess-cdn.clevelandart.org'&&!u.username&&!u.password}catch{return false}};
export function verifyCmaPatternImage(record,response){
 const art=response?.data&&!Array.isArray(response.data)?response.data:response;
 if(record?.sourcePlatform!=='CMA'||art?.id!==record.museumObjectId)return {ok:false,reason:'馆藏ID不一致'};
 if(art.accession_number!==record.accession||art.url!==record.sourceUrl)return {ok:false,reason:'馆方原始出处或藏品编号不符'};
 if(art.share_license_status!=='CC0')return {ok:false,reason:'馆方未确认该图片为CC0开放许可'};
 const url=art.images?.web?.url;
 if(!imageAllowed(url))return {ok:false,reason:'未获得官方安全图像链接'};
 if(!art.title)return {ok:false,reason:'馆方原作标题缺失'};
 return {ok:true,image:url,originalTitle:art.title,accession:art.accession_number,culture:art.culture||[],date:art.creation_date||'馆方未注明'};
}
export function validateCmaWorldMotifs(data,existing=[]){
 if(data?.version!==1||!Array.isArray(data?.records)||data.records.length<400||data.records.length>450)throw Error('CMA开放馆藏数据量不足');
 const origins=new Set(existing.flatMap(x=>[x.sourceUrl,x.sourceApiUrl,x.museumObjectId&&String(x.museumObjectId),x.accession].filter(Boolean).map(String)));
 const ids=new Set(),srcs=new Set(),accs=new Set(),regionCounts=Object.fromEntries([...regions].map(x=>[x,0]));
 for(const r of data.records){
  if(!/^worldmotif-cma-\d+$/.test(r.id)||r.id!=='worldmotif-cma-'+r.museumObjectId||!Number.isSafeInteger(r.museumObjectId))throw Error('无效CMA馆藏编号');
  if(r.sourcePlatform!=='CMA'||r.source!=='The Cleveland Museum of Art'||!r.accession||r.sourceUrl!=='https://clevelandart.org/art/'+r.accession||r.sourceApiUrl!=='https://openaccess-api.clevelandart.org/api/artworks/'+r.museumObjectId)throw Error('CMA来源不可溯源');
  if(r.licenseUrl!=='https://www.clevelandart.org/open-access'||r.imagePolicy!=='on-demand-official-api-cc0-only'||r.imageStatus!=='awaiting-live-api-check')throw Error('开放图像政策无效');
  if(r.meaningStatus!=='unverified'||!r.semanticScope?.includes('不推定吉祥')||r.review?.expertReviewed!==false||r.review?.historicalOriginCertified!==false)throw Error('不可虚构纹样文化含义');
  if(!regions.has(r.region)||!r.title||!r.culture||!r.date||!r.description||!r.tags?.length)throw Error('来源文化信息不完整');
  if(ids.has(r.id)||srcs.has(r.sourceUrl)||accs.has(r.accession))throw Error('馆藏原作重复');ids.add(r.id);srcs.add(r.sourceUrl);accs.add(r.accession);
  if(origins.has(r.sourceUrl)||origins.has(r.sourceApiUrl)||origins.has(String(r.museumObjectId))||origins.has(r.accession))throw Error('与原库或其他馆藏重复 '+r.id);
  if(r.image||r.thumbnail||r.downloadUrl)throw Error('未实时核验的原图不得嵌入库');
  regionCounts[r.region]++;
 }
 for(const region of regions){if(regionCounts[region]!==data.counts?.[region]||regionCounts[region]>50||(region!=='中亚'&&regionCounts[region]!==50))throw Error('文化地区数额不足或超出 '+region+' '+regionCounts[region]);}
 return {rows:data.records,regions:regionCounts};
}
export async function loadCmaWorldMotifs(fetcher=fetch){
 const response=await fetcher(new URL('../content/world-motifs-cma.json',import.meta.url));
 if(!response.ok)throw Error('第二批全球馆藏数据尚未生成');
 return response.json();
}

/** Follow-on official museum accessions: independently verify 540 records before displaying. */
export function validateCmaExpansionWorldMotifs(data,existing=[]){
 const quota={'东亚邻邦':70,'东南亚':0,'南亚':70,'中亚':0,'波斯与西亚':95,'埃及与地中海':70,'欧洲':95,'非洲':70,'美洲':70};
 if(data?.version!==1||data?.batch!=='world-motifs-cma-expansion-20261020'||!Array.isArray(data.records)||data.records.length!==540)throw Error('世界纹样扩充馆藏数量或批次不匹配');
 const keys=new Set(existing.flatMap(x=>[x.id,x.sourceUrl,x.sourceApiUrl,x.accession,x.sourcePlatform==='CMA'&&String(x.museumObjectId)].filter(Boolean).map(String)));
 const own=new Set(),counts=Object.fromEntries(Object.keys(quota).map(k=>[k,0]));
 for(const r of data.records){
  if(!Number.isSafeInteger(r.museumObjectId)||r.id!=='worldmotif-cma-'+r.museumObjectId||r.sourcePlatform!=='CMA'||r.source!=='The Cleveland Museum of Art')throw Error('扩充馆藏编号或机构异常');
  if(!r.accession||r.sourceUrl!=='https://clevelandart.org/art/'+r.accession||r.sourceApiUrl!=='https://openaccess-api.clevelandart.org/api/artworks/'+r.museumObjectId)throw Error('扩充馆藏官方链接无效');
  if(r.licenseUrl!=='https://www.clevelandart.org/open-access'||r.imagePolicy!=='on-demand-official-api-cc0-only'||r.imageStatus!=='awaiting-live-api-check'||r.license?.includes('CC0')!==true)throw Error('扩充馆藏开放许可标注无效');
  if(r.meaningStatus!=='unverified'||r.review?.expertReviewed!==false||r.review?.historicalOriginCertified!==false||!r.semanticScope?.includes('不推定吉祥'))throw Error('不能推断文化象征');
  if(!Object.hasOwn(quota,r.region)||!r.title||!r.originalTitle||!r.culture||!r.date||!r.description||!Array.isArray(r.tags)||!r.tags.length)throw Error('扩充馆藏文化字段不全');
  if(r.image||r.thumbnail||r.downloadUrl)throw Error('未经在线核验禁止嵌入馆藏图片');
  for(const key of [r.id,r.sourceUrl,r.sourceApiUrl,r.accession,String(r.museumObjectId)]){if(own.has(key)||keys.has(key))throw Error('重复馆藏来源 '+r.id);own.add(key);}
  counts[r.region]++;
 }
 for(const [region,n] of Object.entries(quota))if(counts[region]!==n||data.counts?.[region]!==n)throw Error('扩充地区馆藏数量不匹配：'+region);
 return {rows:data.records,regions:counts};
}
export async function loadCmaExpansionWorldMotifs(fetcher=fetch){
 const response=await fetcher(new URL('../content/world-motifs-cma-expansion.json',import.meta.url));
 if(!response.ok)throw Error('新增世界馆藏来源暂不可用');
 return response.json();
}
