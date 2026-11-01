// Artwork is decorative. Existing live controls are moved, never cloned; their
// state, IDs, keyboard handling, save formats and network calls stay unchanged.
export function applyReferenceArt(root){
 if(!document.querySelector('link[data-reference-art]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./assets/reference-art.css?v=20261022-materials';css.dataset.referenceArt='';document.head.append(css)}
 const scene=root.querySelector('.motif-park');if(!scene||scene.classList.contains('world-shell'))return;
 const mode=scene.dataset.parkMode;
 const screen=scene.id==='park-functional-shop'?'shop':scene.id==='park-duel'?'duel':scene.classList.contains('world-garden-screen')?'garden':scene.id==='park-result'?'result':scene.querySelector('#park-memory-inner')?'memory':mode;
 if(!screen)return;
 scene.dataset.referenceScene=screen;scene.classList.add('reference-art-screen');
 if(screen==='result'){const back=scene.querySelector('#park-map');if(back)scene.append(back)}
 if(['link','jigsaw','color','studio'].includes(screen)){
  const titles={link:['云水连廊','祥云连连看'],jigsaw:['锦画藏阁','绣样拼图大师'],color:['东方染坊','纹样填色坊'],studio:['百工绣坊','小小纹样设计师']};
  const heading=scene.querySelector('.park-heading');
  if(heading){heading.querySelector('h2').textContent=titles[screen][0];heading.querySelector('p').textContent=titles[screen][1]}
 }
 if(screen==='garden'){
  const nodes=[...scene.querySelectorAll('[data-park-level]')];
  const points=[[18.7,55.9],[31.5,39],[35.3,22.5],[37.5,57.6],[53.8,28.4],[64.1,34],[70.5,33.3],[77,46],[83.3,64],[70.8,73]];
  const chosen=nodes.findIndex(n=>n.classList.contains('chosen'));
  let page=Math.max(0,Math.floor(chosen/10));
  const bar=document.createElement('nav');bar.className='reference-chapter-pages';bar.setAttribute('aria-label','切换章节关卡');
  bar.innerHTML='<button type="button" data-chapter-page="0">春绣初识 · 1—10</button><button type="button" data-chapter-page="1">锦纹进阶 · 11—20</button>';
  scene.append(bar);
  const display=()=>{nodes.forEach((node,i)=>{const [x,y]=points[i%10];node.style.setProperty('--art-x',x+'%');node.style.setProperty('--art-y',y+'%');node.hidden=Math.floor(i/10)!==page});bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===page)))};
  bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{page=Number(b.dataset.chapterPage);display()});display();
 }
 if(screen==='shop'){
  const products=[...scene.querySelectorAll('.park-shop-product')];
  // Illustration assignments follow actual product functionality, not reference prices.
  const artwork=[1,4,0,2,3];
  products.forEach((card,i)=>{const img=card.querySelector('img');if(img)img.src='./assets/reference-art/shop-item-'+artwork[i]+'.webp'});
 }
 if(screen==='memory'){
  const title=document.createElement('aside');title.className='reference-memory-title';title.innerHTML='<h2>梨林秘境</h2><h3>云绣记忆之旅</h3><p>穿行云雾梨林，拾起散落的绣境记忆。<br>以心为线，唤醒沉睡的东方故事。</p>';scene.append(title);
 }
}
