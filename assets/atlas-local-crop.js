// Browser-native, dependency-free region sampling. No museum image is modified.
// Six colors are computed from pixels inside the user's selected rectangle.
import {setAtlasCustomPalette} from './engine.js';

const HEX=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
function regionColors(data){
 const bins=new Map(),src=data.data;
 // Ignore near-white paper backgrounds only when diverse artwork colors exist.
 for(let i=0;i<src.length;i+=16){
  const rgb=[src[i],src[i+1],src[i+2]];
  if(src[i+3]<80)continue;
  const key=rgb.map(v=>Math.min(15,Math.floor(v/16))).join(',');
  const b=bins.get(key)||{n:0,r:0,g:0,b:0};
  b.n++;b.r+=rgb[0];b.g+=rgb[1];b.b+=rgb[2];bins.set(key,b);
 }
 const entries=[...bins.values()].map(x=>({n:x.n,rgb:[x.r/x.n,x.g/x.n,x.b/x.n]})).sort((a,b)=>b.n-a.n);
 const gap=(a,b)=>Math.sqrt(a.reduce((sum,v,i)=>sum+(v-b[i])**2,0));
 const select=[];const taken=new Set();
 for(const min of [67,49,35,20,10,0]){
  for(const x of entries){
   const hex=HEX(x.rgb);
   if(!taken.has(hex)&&select.every(c=>gap(c.rgb,x.rgb)>=min)){
    select.push({...x,hex});taken.add(hex);
   }
   if(select.length===6)break;
  }
  if(select.length===6)break;
 }
 return select.slice(0,6).map(c=>c.hex);
}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const cropLookups=new WeakMap();
export function attachLocalCrop(root,findScheme){
 if(cropLookups.has(root)){cropLookups.set(root,findScheme);return;}
 cropLookups.set(root,findScheme);
 root.addEventListener('click',e=>{
  const b=e.target.closest('button[data-crop]');
  if(!b||!root.contains(b))return;
  const scheme=cropLookups.get(root)?.(b.dataset.crop);
  const image=scheme?.artwork?.imagePath;
  if(!image||!/^assets\/[\w./-]+$/.test(image)||image.includes('..'))return;
  openCrop(root,scheme,image);
 });
}
function openCrop(root,scheme,imagePath){
 const dialog=document.createElement('dialog');
 dialog.className='atlas-crop-dialog';
 dialog.innerHTML='<div class="atlas-crop-head"><div><strong>从原作局部取色</strong><p>在图片上拖出矩形区域，仅取选区实际像素。支持触屏拖动。</p></div><button type="button" data-close aria-label="关闭局部取色">×</button></div>'+
 '<div class="atlas-crop-stage"><canvas aria-label="拖动框选取色区域" role="img"></canvas></div>'+
 '<div class="atlas-crop-foot"><p id="atlas-crop-status" role="status">图片正在加载…</p><div class="atlas-crop-samples" aria-label="局部提取的六种颜色"></div><div class="atlas-crop-actions"><button type="button" data-reset>重新选区</button><button type="button" data-export-local disabled>导出局部色卡</button><button type="button" data-use-local disabled>应用到故事纹样</button></div><p class="atlas-crop-note">局部色卡是本机实时计算的创作参考，不是馆方原始色值。使用浏览器会话保存个人配色；不更改原始馆藏色卡和版权信息。</p></div>';
 root.append(dialog);dialog.showModal();
 const close=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('[data-close]').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const status=dialog.querySelector('#atlas-crop-status'),samples=dialog.querySelector('.atlas-crop-samples');
 const exportButton=dialog.querySelector('[data-export-local]'),useButton=dialog.querySelector('[data-use-local]');
 let coords=null,selection=null,colors=[],ready=false;
 const picture=new Image();picture.decoding='async';
 const draw=()=>{
  if(!ready||!dialog.isConnected)return;
  ctx.drawImage(picture,0,0,canvas.width,canvas.height);
  if(!selection)return;
  const [x,y,w,h]=selection;
  ctx.fillStyle='rgba(22,46,38,.15)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.clearRect(x,y,w,h);
  ctx.drawImage(picture,x*picture.naturalWidth/canvas.width,y*picture.naturalHeight/canvas.height,w*picture.naturalWidth/canvas.width,h*picture.naturalHeight/canvas.height,x,y,w,h);
  ctx.strokeStyle='#FFFBF0';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
 };
 picture.onload=()=>{
  if(!dialog.isConnected)return;
  const factor=Math.min(1,760/picture.naturalWidth,480/picture.naturalHeight);
  canvas.width=Math.max(1,Math.round(picture.naturalWidth*factor));
  canvas.height=Math.max(1,Math.round(picture.naturalHeight*factor));
  ready=true;draw();status.textContent='拖动框选一块你喜欢的画面；默认显示完整馆藏图。';
 };
 picture.onerror=()=>{status.textContent='馆藏图像暂时无法加载，请检查原始图片路径。'};
 picture.src='./'+imagePath;
 const point=e=>{const rect=canvas.getBoundingClientRect();return [clamp(Math.round((e.clientX-rect.left)*canvas.width/rect.width),0,canvas.width),clamp(Math.round((e.clientY-rect.top)*canvas.height/rect.height),0,canvas.height)]};
 canvas.addEventListener('pointerdown',e=>{
  if(!ready)return;canvas.setPointerCapture(e.pointerId);coords=point(e);selection=[coords[0],coords[1],1,1];draw();
 });
 canvas.addEventListener('pointermove',e=>{
  if(!coords||!ready)return;const p=point(e);
  selection=[Math.min(coords[0],p[0]),Math.min(coords[1],p[1]),Math.abs(p[0]-coords[0]),Math.abs(p[1]-coords[1])];draw();
 });
 canvas.addEventListener('pointerup',e=>{
  if(!coords||!ready)return;
  const p=point(e);selection=[Math.min(coords[0],p[0]),Math.min(coords[1],p[1]),Math.abs(p[0]-coords[0]),Math.abs(p[1]-coords[1])];coords=null;
  if(selection[2]<12||selection[3]<12){status.textContent='选区过小，请拖动选择稍大一些的区域。';return;}
  draw();const off=document.createElement('canvas');off.width=selection[2];off.height=selection[3];
  const oc=off.getContext('2d',{willReadFrequently:true});
  const [x,y,w,h]=selection;
  oc.drawImage(picture,x*picture.naturalWidth/canvas.width,y*picture.naturalHeight/canvas.height,w*picture.naturalWidth/canvas.width,h*picture.naturalHeight/canvas.height,0,0,w,h);
  colors=regionColors(oc.getImageData(0,0,w,h));
  if(colors.length!==6){status.textContent='这块区域的实际色彩不足六种，请扩大选区。';return;}
  samples.innerHTML=colors.map(c=>'<button type="button" data-hex="'+c+'" aria-label="复制 '+c+'" style="background:'+c+'"><span>'+c+'</span></button>').join('');
  status.textContent='局部取色成功 · 六色取自你框选的区域（数字图像 RGB）';
  exportButton.disabled=false;useButton.disabled=false;
 });
 dialog.querySelector('[data-reset]').onclick=()=>{selection=null;colors=[];samples.replaceChildren();exportButton.disabled=true;useButton.disabled=true;draw();status.textContent='选区已重置，可重新框选。'};
 samples.onclick=async e=>{const c=e.target.closest('[data-hex]')?.dataset.hex;if(c){try{await navigator.clipboard.writeText(c);status.textContent='已复制 '+c}catch{status.textContent='无法自动复制，请手动选择色值 '+c}}};
 const record=()=>({name:scheme.name+' · 局部取色',colors,source:scheme.source,sourceUrl:scheme.sourceUrl,license:scheme.license,artwork:scheme.artwork,region:scheme.region||null,country:scheme.country||null,selection:selection?{x:selection[0]/canvas.width,y:selection[1]/canvas.height,width:selection[2]/canvas.width,height:selection[3]/canvas.height}:null,method:'Original image pixels, user-selected rectangle, local browser quantized sampling',notice:'非馆方认证色值或真丝线号；原始馆藏图片不变。'});
 exportButton.onclick=()=>{if(colors.length!==6)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(record(),null,2)],{type:'application/json'}));a.href=url;a.download='lihuaji-local-palette.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 useButton.onclick=()=>{if(colors.length!==6)return;const i=setAtlasCustomPalette(scheme.name+' · 局部',colors);if(i<0){status.textContent='无法保存本次局部配色';return}try{sessionStorage.setItem('lihuaji:color-atlas-preset',String(i))}catch{}close();location.hash='#story'};
}
