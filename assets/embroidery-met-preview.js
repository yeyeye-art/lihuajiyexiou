// Opt-in Met image preview: never fetch dozens of images on encyclopedia load.
// The Met Collection API supplies rights and images for each specific object.
export function validateMetImage(object,record){
 const objId=Number(record?.museum?.apiObjectId||String(record?.source?.url||'').split('/').at(-1));
 if(!Number.isSafeInteger(objId)||objId<1||object?.objectID!==objId)return {ok:false,reason:'馆方编号与本地知识卡不一致'};
 if(object?.classification!=='Textiles-Embroidered')return {ok:false,reason:'馆方当前未将该藏品归入刺绣类'};
 const normal=s=>String(s||'').normalize('NFKC').replace(/[^0-9a-zA-Z]/g,'').toLowerCase();
 if(!normal(object?.accessionNumber)||normal(object.accessionNumber)!==normal(record.museum.objectNumber))return {ok:false,reason:'馆藏登录编号与记录不一致'};
 if(object.isPublicDomain!==true)return {ok:false,reason:'该馆藏图像未明确开放为 Public Domain'};
 const url=String(object.primaryImageSmall||'');
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='images.metmuseum.org'||u.username||u.password)return {ok:false,reason:'未获得可信的馆方缩略图地址'};
 }catch{return {ok:false,reason:'馆方未提供可验证的图像地址'}}
 return {ok:true,url};
}
export function mountMetImagePreview(container,records,fetcher=fetch){
 const byId=new Map(records.filter(r=>r.museum).map(r=>[r.id,r]));
 const controller=new AbortController();
 async function handleClick(e){
  const btn=e.target.closest('[data-met-preview]');
  if(!btn||!container.contains(btn)||controller.signal.aborted)return;
  const item=byId.get(btn.dataset.metPreview);
  if(!item)return;
  const imageArea=btn.parentElement?.querySelector('[data-met-preview-region]');
  if(!imageArea||btn.disabled)return;
  const id=Number(item.museum.apiObjectId||item.source.url.split('/').at(-1));
  if(!Number.isSafeInteger(id))return;
  btn.disabled=true;imageArea.textContent='正在向大都会博物馆读取开放图像与授权状态…';
  try{
   const response=await fetcher('https://collectionapi.metmuseum.org/public/collection/v1/objects/'+id,{
    signal:controller.signal,headers:{accept:'application/json'}
   });
   if(!response.ok)throw Error('博物馆目前未能返回藏品资料（HTTP '+response.status+'）');
   const data=await response.json();if(controller.signal.aborted||!container.contains(imageArea))return;
   const result=validateMetImage(data,item);
   if(!result.ok)throw Error(result.reason);
   const figure=document.createElement('figure');
   figure.className='encyclopedia-met-figure';
   const img=document.createElement('img');
   img.src=result.url;img.alt=item.title+'，大都会博物馆公有领域藏品照片';
   img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
   img.onerror=()=>{if(container.contains(imageArea)){imageArea.textContent='图像加载失败，可以打开馆方原始页面查看。';btn.disabled=false}};
   const cap=document.createElement('figcaption');
   cap.textContent='图像：The Metropolitan Museum of Art · Public Domain · 馆藏编号 '+item.museum.objectNumber;
   figure.append(img,cap);imageArea.replaceChildren(figure);
   btn.textContent='已显示馆方公有领域图像';btn.disabled=true;
  }catch(error){
   if(!controller.signal.aborted&&container.contains(imageArea)){
    imageArea.textContent=String(error.message||'图像暂不可用')+'。可通过下方原始馆藏页面核对。';
    btn.disabled=false;
   }
  }
 }
 container.addEventListener('click',handleClick);
 return ()=>{controller.abort();container.removeEventListener('click',handleClick)};
}
