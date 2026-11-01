// Standalone, editorially redrawn teaching SVGs; never confuse these assets with
// crops of or certified faithful facsimiles of historical museum originals.
const regions=new Set(['中国传统','东亚邻邦','东南亚','南亚','中亚','波斯与西亚','埃及与地中海','欧洲','非洲','美洲']);
const classes=new Set(['花卉枝叶果实','鸟兽鱼虫羽毛','自然云水天象','基础几何结构','连续纹与边饰','文化符号']);
const forms=new Set(['single','repeatable','cornerConnector']);
export function validateBasicElements(data,knownMuseumRows=[],originalPatterns=[]){
 if(data?.version!==1||!Array.isArray(data.records)||data.records.length<1||data.records.length>1000)throw Error('元素库批次或数量无效');
 if(data.type!=='independent-educational-vector-studies')throw Error('仅接受独立教学矢量素材');
 const existingIDs=new Set(originalPatterns.map(x=>x.id));
 const museumSources=new Map(knownMuseumRows.map(x=>[x.sourcePlatform+'|'+x.museumObjectId,x]));
 const uniqueIDs=new Set(),shapes=new Set(),urls=new Set();
 for(const r of data.records){
  if(!/^basic-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id)||uniqueIDs.has(r.id)||existingIDs.has(r.id))throw Error('重复或非法基础元素ID');
  uniqueIDs.add(r.id);
  if(r.collection!=='basic'||r.isBasicElement!==true||r.artworkType!=='editorial-redraw'||r.designReferenceOnly!==true||r.historicalOriginCertified!==false)throw Error('必须公开声明为原创教学重绘，不能冒充历史原纹');
  if(!regions.has(r.region)||!classes.has(r.motifClass)||!forms.has(r.elementForm)||!r.title||!r.culture||!r.date||!r.tags?.length)throw Error('地区、元素种类或来源背景缺失');
  if(r.image!=='./assets/basic-elements/'+r.id+'.svg'||r.image.includes('..'))throw Error('独立本地SVG路径无效');
  if(!/^[a-f0-9]{64}$/.test(r.shapeSignature)||shapes.has(r.shapeSignature))throw Error('元素几何结构签名缺失或相同');
  shapes.add(r.shapeSignature);
  if(r.sourcePlatform!=='CMA'&&r.sourcePlatform!=='AIC')throw Error('馆方来源平台无效');
  const src=museumSources.get(r.sourcePlatform+'|'+r.museumObjectId);
  if(!src||src.sourceUrl!==r.sourceUrl||src.accession!==r.accession||src.culture!==r.culture||src.sourceApiUrl!==r.sourceApiUrl||src.source!==r.source)throw Error('无法将元素和真实唯一馆藏来源对应 '+r.id);
  if(r.sourcePlatform==='CMA'&&r.licenseUrl!=='https://www.clevelandart.org/open-access')throw Error('CMA许可出处无效');
  if(!r.description?.includes('不是馆藏原作像素裁切')||r.review?.curatorialFaithfulnessVerified!==false||r.review?.independentVector!==true)throw Error('不能虚构来源图形精确复原或完成视觉审定');
  if(r.repeatable!==(r.elementForm==='repeatable')||!r.supportedUse?.includes('SVG导出'))throw Error('元素适用属性无效');
  if(!r.usageCaution||!r.semanticScope?.includes('不推定吉祥'))throw Error('不得省略文化注意事项');
  urls.add(r.sourceUrl);
 }
 const actualRegions=new Set(data.records.map(x=>x.region));
 return {rows:data.records,regions:[...actualRegions],count:data.records.length,uniqueGeometryCount:shapes.size,sourceCount:urls.size};
}
export async function loadBasicElements(fetcher=fetch){
 const response=await fetcher(new URL('../content/basic-elements-v1.json',import.meta.url));
 if(!response.ok)throw Error('新增独立基础元素素材尚未发布');
 return response.json();
}
