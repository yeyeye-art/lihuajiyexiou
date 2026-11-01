// Reference visual system for 梨花季·绣境奇遇.
// Every number is read from actual game state. No screenshot-as-interface.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountReferenceHeader(root,{points=0,cleared=0,onHome=()=>{},onShop=()=>{},onDuel=()=>{}}={}){
 const old=root.querySelector('.ref-global-header');old?.remove();
 const header=document.createElement('header');
 header.className='ref-global-header';
 header.setAttribute('aria-label','绣境奇遇游戏导航');
 header.innerHTML='<a class="ref-home" href="#home" aria-label="返回梨花季首页">⌂</a>'+
  '<span class="ref-separator" aria-hidden="true"></span>'+
  '<div class="ref-brand"><strong>梨花季·绣境奇遇</strong><span class="ref-red-seal">绣</span><small>一针一线，绣见东方美</small></div>'+
  '<nav class="ref-wallet" aria-label="游戏进度与功能">'+
  '<button type="button" class="ref-pill ref-points" id="ref-shop" aria-label="打开积分商店">✿ <span>'+Math.floor(points)+'</span> <b>＋</b></button>'+
  '<span class="ref-pill" title="六大游戏模式">◈ <span>6/6</span></span>'+
  '<span class="ref-pill" title="累计完成关卡">❀ <span>'+cleared+'</span></span>'+
  '<button type="button" class="ref-pill ref-duel" id="ref-duel" aria-label="好友对战">对战</button>'+
  '<a class="ref-avatar" href="#profile" aria-label="个人账号和云存档"><span aria-hidden="true"><img src="./assets/reference-art/avatar.webp" alt=""></span><small>梨花小绣士<em>我的账号</em></small></a>'+
  '<a class="ref-settings" href="#profile" aria-label="账号设置">⚙</a></nav>';
 root.prepend(header);
 header.querySelector('#ref-shop').addEventListener('click',onShop);
 header.querySelector('#ref-duel').addEventListener('click',onDuel);
 return header;
}
export const screenIntro={
 match3:['梨花绣田','纹样消消乐','以锦为田，以纹为花。沿梨花绣线，将相同纹样串成一幅春日锦绣。'],
 link:['云水连廊','祥云连连看','廊随云水，纹起祥意。连一连，看见清澈好兆头。'],
 jigsaw:['锦画藏阁','绣样拼图大师','典藏流转，锦绣成画。以心拼缀残片，重现一幅东方之美。'],
 color:['东方染坊','纹样填色坊','以天地为色，染就山河纹样。拾起一抹东方的色彩。'],
 studio:['百工绣坊','小小纹样设计师','以草木山水为灵感，将喜爱的纹样自由组合，绣出独一无二的东方之美。'],
 memory:['梨林秘境','云绣记忆之旅','穿行云雾梨林，拾起散落的绣境记忆，以心为线，唤醒沉睡的东方故事。']
};
export function referenceStageIntro(mode){
 const [name,subtitle,story]=screenIntro[mode]||screenIntro.match3;
 return '<aside class="ref-scene-story"><div class="ref-story-kicker">❖ 东方绣境 · 纹样奇遇</div><h2>'+name+'</h2><h3>'+subtitle+'</h3><p>'+story+'</p><div class="ref-story-ornament" aria-hidden="true">✿　❁　✿</div></aside>';
}
