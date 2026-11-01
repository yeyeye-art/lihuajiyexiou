// Art Institute of Chicago public-domain object verifier, used in the ORIGINAL pattern grid.
// Official AIC IIIF images are hotlinked only after the current object API confirms rights.
const okOrigin=/\b(central asia|uzbekistan|turkmenistan|afghanistan|tajikistan|kyrgyzstan|kazakhstan|turkestan|bukhara|samarkand|sogdiana|sogdian|gandhara)\b/i;
export function verifyAicPatternImage(record,response){
 const a=response?.data;
 if(record?.sourcePlatform!=='AIC'||a?.id!==record.museumObjectId)return {ok:false,reason:'馆方藏品ID不一致'};
 if(a.main_reference_number!==record.accession||a.is_public_domain!==true)return {ok:false,reason:'馆方尚未确认该对象为公共领域及原始藏品号'};
 if(!a.image_id||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(a.image_id))return {ok:false,reason:'馆方图像ID缺失或无效'};
 if(!okOrigin.test(a.place_of_origin||'')||a.place_of_origin!==record.culture)return {ok:false,reason:'文化地区归属无法由馆方确证'};
 const url=new URL(response?.config?.iiif_url||'https://www.artic.edu/iiif/2');
 if(url.protocol!=='https:'||url.hostname!=='www.artic.edu'||url.pathname!=='/iiif/2')return {ok:false,reason:'图像来源不是馆方IIIF'};
 return {ok:true,image:url.href.replace(/\/$/,'')+'/'+a.image_id+'/full/400,/0/default.jpg',originalTitle:a.title,accession:a.main_reference_number,date:a.date_display};
}
export function validateAicWorldMotifs(data,existing=[]){
 if(data?.version!==1||data.records?.length!==45)throw Error('芝加哥中亚馆藏补充应为45件');
 const seen=new Set(),acc=new Set(),origins=new Set(existing.flatMap(x=>[x.sourceUrl,x.sourceApiUrl,x.accession].filter(Boolean).map(String)));
 for(const r of data.records){
  if(r.region!=='中亚'||r.sourcePlatform!=='AIC'||r.source!=='Art Institute of Chicago'||r.id!=='worldmotif-aic-'+r.museumObjectId||!Number.isSafeInteger(r.museumObjectId))throw Error('AIC来源及地区无效');
  if(r.sourceUrl!=='https://www.artic.edu/artworks/'+r.museumObjectId||r.sourceApiUrl!=='https://api.artic.edu/api/v1/artworks/'+r.museumObjectId)throw Error('AIC官方记录链接无效');
  if(!okOrigin.test(r.culture)||!r.title||!r.accession||!r.date||!r.tags?.length||!r.description)throw Error('中亚馆藏来源字段缺失');
  if(r.imagePolicy!=='on-demand-official-api-public-domain-only'||r.meaningStatus!=='unverified'||r.review?.expertReviewed!==false||!r.semanticScope.includes('不推定吉祥'))throw Error('馆藏许可或文化分类未审');
  if(r.image||r.thumbnail||r.downloadUrl)throw Error('未实时核验图像不能提前嵌入');
  if(seen.has(r.id)||acc.has(r.accession)||origins.has(r.sourceUrl)||origins.has(r.sourceApiUrl)||origins.has(r.accession))throw Error('重复中亚馆藏');
  seen.add(r.id);acc.add(r.accession);
 }
 return {rows:data.records,regions:{中亚:45}};
}
export async function loadAicWorldMotifs(fetcher=fetch){
 const res=await fetcher(new URL('../content/world-motifs-aic.json',import.meta.url));
 if(!res.ok)throw Error('芝加哥美术馆资料暂不可用');
 return res.json();
}
