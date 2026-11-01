/* Screenshot 2 / user-approved friend duel page.
 * Live client for the already deployed server-authoritative Supabase Edge Function.
 * Room, score, board and clock come from the server; no local win spoofing. */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const motifNames=['basic-cn-lotus-bloom','basic-cn-lotus-petal','basic-sy-eightstar','basic-fr-flower','basic-iq-diamond','basic-it-tendril'];
function session(){try{return JSON.parse(sessionStorage.getItem('lihuaji.cloud.auth.session.v1')||'null')}catch{return null}}
async function invoke(action,options={}){
 const creds=session();if(!creds?.access_token)throw Error('请先前往「我的账号」登录，才能创建或加入真实好友房间');
 const cfg=await fetch('./content/cloud-config.json',{cache:'no-store',signal:AbortSignal.timeout(7500)}).then(x=>x.json());
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url||''))throw Error('真实对战服务暂未配置');
 const response=await fetch(cfg.url+'/functions/v1/friend-duel',{
  method:'POST',headers:{apikey:cfg.anonKey,'Content-Type':'application/json',Authorization:'Bearer '+creds.access_token},
  body:JSON.stringify({action,...options}),cache:'no-store',signal:AbortSignal.timeout(9000)
 });
 const json=await response.json().catch(()=>({error:'服务器返回内容异常'}));
 if(!response.ok||json?.error)throw Error(json.error||'联机请求暂不可用（'+response.status+'）');
 return json;
}
const img=n=>'<img alt="" src="./assets/basic-elements/'+motifNames[n%motifNames.length]+'.svg">';
export function mountFriendDuel(root,{onBack=()=>{}}={}){
 let disposed=false,pollId=0,room=null,selection=-1,busy=false;
 const $=q=>root.querySelector(q);
 const report=msg=>{const n=$('#ref-duel-feedback');if(n)n.textContent=msg};
 const close=()=>{disposed=true;clearInterval(pollId)};
 const invitationLink=()=>{
  const u=new URL(location.href);u.searchParams.set('friendRoom',room.roomId);u.hash='#game';return u.toString()
 };
 const share=async kind=>{
  if(!room){report('请先创建真实房间');return}
  const text='邀请你来《梨花季·绣境奇遇》同绣对战：'+invitationLink();
  try{
   if(navigator.share&&kind!=='copy')await navigator.share({title:'梨花季·好友对战',text,url:invitationLink()});
   else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);report('邀请链接已复制，请粘贴到'+(kind==='qq'?'QQ':kind==='wechat'?'微信':'好友聊天')+'发送')}
   else{const input=$('#ref-duel-code');if(input){input.value=room.roomId;input.focus();input.select()}report('请手动复制房间编号给好友')}
  }catch(e){if(e?.name!=='AbortError')report('分享未完成：'+e.message)}
 };
 const safeRun=async(callback)=>{
  if(busy||disposed)return;
  busy=true;
  try{await callback()}catch(e){report(e.message||'联机操作失败')}
  finally{busy=false}
 };
 const paint=()=>{
  if(disposed||!root.isConnected)return;
  const player=session()?.user||{};
  root.innerHTML='<button class="ref-duel-back" id="ref-duel-back">← 返回绣境地图</button>'+
   '<div class="ref-duel-story"><span>❖ 同绣切磋</span><h1>好友对战</h1><h2>邀友同绣 · 一较高下</h2><p>与好友一起体验绣境中的趣味挑战，比拼技艺，收获专属奖励。</p></div>'+
   '<article class="ref-duel-self ref-duel-card"><div class="ref-duel-ribbon">我方</div><div class="ref-duel-portrait">绣</div>'+
   '<h3>'+esc(player.email||'梨花小绣士')+'</h3><p>'+(player.id?'已登录 · 真实联网对战':'尚未登录 · 登录后邀请好友')+'</p>'+
   '<strong>本局得分 '+(room?.yourself.score||0)+'</strong></article>'+
   '<article class="ref-duel-center ref-duel-card"><div class="ref-duel-ribbon">对战关卡</div>'+
   '<div class="ref-duel-board">'+(room?.yourself.board||[0,2,4,1,5,3,3,1,0,4,2,5,0,3,2,5,4,1,1,4,5,2,0,3,3,0,1,2,5,4,5,2,4,0,1,3]).map((n,i)=>
    '<button '+(!room||room.status!=='running'?'disabled ':'')+'type="button" data-duel-cell="'+i+'" class="'+(selection===i?'ref-duel-selected':'')+'" aria-label="第'+(i+1)+'格纹样">'+img(n)+'</button>').join('')+'</div>'+
   '<h3>经典三消 · 120秒限时竞技</h3><div class="ref-duel-details"><span>我的得分 '+(room?.yourself.score||0)+'</span><span>好友得分 '+(room?.rival[0]?.score||0)+'</span></div>'+
   '<p class="ref-duel-live">'+(!room?'登录后创建房间并邀请好友':room.status==='waiting'?'等待好友加入房间…':room.status==='running'?'比赛正在进行，交换相邻绣牌形成三连':room.winnerId===null?'本局结束 · 双方平局':room.winnerId===room.yourself.id?'比赛结束 · 恭喜获胜！':'比赛结束 · 好友获胜')+'</p></article>'+
   '<article class="ref-duel-friend ref-duel-card"><div class="ref-duel-ribbon">好友</div><div class="ref-duel-portrait ref-duel-unknown">'+(room?.rival.length?'友':'＋')+'</div>'+
   '<h3>'+(room?.rival.length?'好友已加入':'邀请好友')+'</h3><p>'+ (room?.rival.length?'对方正与你同绣竞技':'分享链接，等好友加入，同台竞技')+'</p>'+
   '<strong>'+(room?.rival.length?'本局得分 '+room.rival[0].score:'等待中')+'</strong></article>'+
   '<div class="ref-duel-vs">VS</div>'+
   '<div class="ref-duel-actions"><button id="ref-duel-create">✿ 创建房间</button>'+
   '<button id="ref-duel-wechat" '+(!room?'disabled':'')+'>❀ 微信邀请</button>'+
   '<button id="ref-duel-qq" '+(!room?'disabled':'')+'>◈ QQ邀请</button>'+
   '<button id="ref-duel-copy" '+(!room?'disabled':'')+'>复制邀请链接</button></div>'+
   '<div class="ref-duel-join"><label for="ref-duel-code">好友房间编号</label><input id="ref-duel-code" autocomplete="off" placeholder="粘贴好友分享的房间编号" value="'+esc(new URLSearchParams(location.search).get('friendRoom')||room?.roomId||'')+'">'+
   '<button id="ref-duel-join">加入好友房间</button></div>'+
   '<div class="ref-duel-feedback" id="ref-duel-feedback" role="status" aria-live="polite">'+
   (session()?'采用真实服务器计分。邀请链接可通过微信、QQ等聊天工具发送。':'尚未登录，请先到「我的账号」登录后再联机。')+
   ' <a href="#profile">账号与云存档</a></div>';
  $('#ref-duel-back').onclick=()=>{close();onBack()};
  $('#ref-duel-create').onclick=()=>void safeRun(async()=>{room=await invoke('create');selection=-1;paint();startPoll();report('真实房间已创建，请分享邀请链接')});
  $('#ref-duel-join').onclick=()=>void safeRun(async()=>{
   const id=$('#ref-duel-code').value.trim();
   if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('请填写有效的好友房间编号');
   room=await invoke('join',{roomId:id});selection=-1;paint();startPoll();report('成功加入好友房间')
  });
  $('#ref-duel-wechat').onclick=()=>void share('wechat');
  $('#ref-duel-qq').onclick=()=>void share('qq');
  $('#ref-duel-copy').onclick=()=>void share('copy');
  root.querySelectorAll('[data-duel-cell]').forEach(tile=>tile.onclick=()=>void safeRun(async()=>{
   if(!room||room.status!=='running')return;
   const i=Number(tile.dataset.duelCell);
   if(selection<0){selection=i;paint();return}
   const a=selection;selection=-1;
   if(a===i){paint();return}
   const next=await invoke('swap',{roomId:room.roomId,a,b:i,sequence:room.yourself.moves+1});
   room=next;paint()
  }));
 };
 const startPoll=()=>{
  clearInterval(pollId);
  pollId=setInterval(async()=>{
   if(!room||disposed||busy||room.status==='finished')return;
   try{
    const current=await invoke('get',{roomId:room.roomId});
    if(disposed)return;
    if(current.version!==room.version||current.status!==room.status){room=current;paint()}
   }catch(e){if(!disposed)report('暂时断线，正在保留房间并重试：'+e.message)}
  },3500);
 };
 paint();
 const incoming=new URLSearchParams(location.search).get('friendRoom');
 if(incoming&&session()&&/^[a-f0-9-]{36}$/i.test(incoming)){
  void safeRun(async()=>{room=await invoke('join',{roomId:incoming});paint();startPoll()});
 }
 return close;
}
