// Optional grounded AR guide. A 3D silk-medallion marks the active artifact,
// not a realistic animated human avatar or a certified reconstruction.
export function createARStoryGuide(THREE,anchor,{reducedMotion=false,root=document}={}){
 const panel=root.querySelector('#embroiderer-tour');
 const toggle=root.querySelector('#embroiderer-toggle');
 if(!panel||!toggle)return null;
 let entries=new Map(),current=null,open=false,alive=true,voice=null;
 const group=new THREE.Group();
 group.name='EmbroidererSpatialGuideMark';
 group.position.set(.50,.39,.24);
 const jade=new THREE.Mesh(new THREE.CircleGeometry(.106,48),new THREE.MeshStandardMaterial({color:0x385f4b,metalness:.13,roughness:.43,side:THREE.DoubleSide}));
 const gold=new THREE.Mesh(new THREE.TorusGeometry(.112,.007,8,48),new THREE.MeshStandardMaterial({color:0xbda679,metalness:.56,roughness:.33}));
 jade.position.z=.012;gold.position.z=.018;group.add(jade,gold);
 const textCanvas=document.createElement('canvas');textCanvas.width=256;textCanvas.height=256;
 const ctx=textCanvas.getContext('2d');
 if(ctx){
  ctx.clearRect(0,0,256,256);
  ctx.fillStyle='#f8f0de';ctx.font='bold 75px "Noto Serif CJK SC","Songti SC",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('绣娘',128,125);
 }
 const texture=new THREE.CanvasTexture(textCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const words=new THREE.Mesh(new THREE.PlaneGeometry(.188,.188),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 words.position.z=.026;group.add(words);anchor.add(group);group.visible=false;
 const headline=panel.querySelector('#embroiderer-tour-head');
 const detail=panel.querySelector('#embroiderer-tour-desc');
 const disclaimer=panel.querySelector('#embroiderer-tour-provenance');
 const link=panel.querySelector('#embroiderer-tour-link');
 const listen=panel.querySelector('#embroiderer-tour-listen');
 const stop=panel.querySelector('#embroiderer-tour-stop');
 const state=panel.querySelector('#embroiderer-tour-state');
 const accessible=()=>typeof window!=='undefined'&&'speechSynthesis'in window&&'SpeechSynthesisUtterance'in window;
 function halt(){
  const hadVoice=Boolean(voice);
  try{if(accessible())window.speechSynthesis.cancel()}catch{}
  voice=null;group.userData.speaking=false;
  if(state&&hadVoice)state.textContent='朗读已停止';
 }
 function refresh(){
  panel.hidden=!open;group.visible=open&&Boolean(current);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-pressed',String(open));
  toggle.textContent=open?'关闭绣娘导览':'绣娘 · 空间导览';
  if(!current){headline.textContent='数字纹样导览';detail.textContent='当前纹样没有经过核验的导览文稿。';disclaimer.textContent='不进行未经来源核验的历史讲述。';listen.disabled=true;link.hidden=true;return}
  headline.textContent=current.title;detail.textContent=current.spoken;
  disclaimer.textContent=current.note;
  link.href=current.guideLink;link.hidden=false;listen.disabled=!accessible();
  listen.title=accessible()?'点按以朗读当前文稿':'浏览器不支持语音合成，可直接阅读文字文稿';
 }
 async function load(fetcher=fetch){
  try{
   const resp=await fetcher(new URL('../../content/ar-embroiderer-tours.json',import.meta.url));
   if(!resp.ok)throw Error('导览文稿读取失败');
   const data=await resp.json();
   if(!Array.isArray(data.entries)||data.entries.length<7)throw Error('导览文稿缺失');
   for(const item of data.entries){
    if(!/^[a-z0-9-]+$/.test(item.id)||!String(item.spoken||'').trim()||!/^\.\.\/#guide(?:\/[a-z0-9-]+)?$/.test(item.guideLink))throw Error('导览文稿不合法');
   }
   entries=new Map(data.entries.map(item=>[item.id,item]));
   return true;
  }catch{
   entries.clear();state.textContent='导览文稿暂未加载，原有 AR 预览与识别不受影响。';return false;
  }
 }
 function selectTarget(id){
  halt();current=entries.get(String(id||''))||null;
  if(open)refresh();
 }
 function setOpen(value){
  if(!alive)return;
  open=Boolean(value);if(!open)halt();refresh();
 }
 function speak(){
  if(!alive||!current||!accessible())return;
  halt();
  const u=new SpeechSynthesisUtterance(current.spoken);
  u.lang='zh-CN';u.rate=.92;u.pitch=.98;
  const available=window.speechSynthesis.getVoices().find(v=>/zh(-CN|-Hans)/i.test(v.lang));
  if(available)u.voice=available;
  u.onstart=()=>{if(alive){group.userData.speaking=true;state.textContent='正在朗读 · 使用设备或浏览器提供的声音';}};
  u.onend=u.onerror=()=>{if(alive){group.userData.speaking=false;state.textContent='文稿朗读已结束';}};
  voice=u;window.speechSynthesis.speak(u);
 }
 toggle.onclick=()=>setOpen(!open);
 listen.onclick=speak;stop.onclick=halt;
 refresh();
 return {
  load,selectTarget,setOpen,halt,
  update(ms){
   if(!group.visible)return;
   group.rotation.z=reducedMotion?0:Math.sin(ms*.001)*.045;
   group.position.y=.39+(reducedMotion?0:Math.sin(ms*(group.userData.speaking?.0033:.0012))*.009);
   jade.material.emissive?.setHex(group.userData.speaking?0x14291b:0x000000);
  },
  get state(){return {open,target:current?.id||null,hasScript:Boolean(current),speaking:Boolean(group.userData.speaking),spatialMarkVisible:group.visible}},
  dispose(){alive=false;halt();toggle.onclick=null;listen.onclick=null;stop.onclick=null;anchor.remove(group);
   group.traverse(node=>{node.geometry?.dispose();node.material?.map?.dispose();node.material?.dispose()});
  }
 };
}
