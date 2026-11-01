// Profile account panel. Never asks for API secrets or handles auth passwords
// outside the official HTTPS Supabase Auth endpoint.
import {snapshotFromStorage} from './cloud-save-model.js';
const clear=root=>{while(root.firstChild)root.removeChild(root.firstChild)};
const node=(tag,text,parent,props={})=>{const element=document.createElement(tag);if(text!=null)element.textContent=text;
 for(const [k,v] of Object.entries(props))element.setAttribute(k,v);parent.append(element);return element};
export async function mountCloudAccountPanel(root,account,{requestReload=()=>location.reload()}={}){
 if(!root)return()=>{};
 if(!document.querySelector('link[data-cloud-account]')){
  const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';
  stylesheet.href='./assets/cloud-account.css?v=20261021-1';stylesheet.dataset.cloudAccount='';
  document.head.append(stylesheet);
 }
 let alive=true;
 clear(root);
 node('h2','账号与125关云存档',root);
 const sub=node('p','密码由身份认证服务器处理；未登录时保留原有本机存档。',root);
 const status=node('p','正在检查云端服务…',root,{role:'status',id:'cloud-account-message'});
 const controls=node('div',null,root,{class:'cloud-account-controls'});
 const say=text=>{if(alive){status.textContent=text;status.dataset.cloudStatus=''}}
 const busy=async(action)=>{
  for(const btn of controls.querySelectorAll('button'))btn.disabled=true;
  try{await action()}catch(error){say(error.message||'账号操作失败')}
  finally{for(const btn of controls.querySelectorAll('button'))btn.disabled=false}
 };
 const display=async()=>{
  clear(controls);
  if(account.current){
   sub.textContent='当前账号 '+account.current.email+'。进度将加密传输到受此账号权限保护的数据库。';
   node('strong','已登录 · '+account.current.email,controls,{class:'cloud-user-label'});
   if(account.paused){
    node('p','该账号已删除云存档，已暂停所有自动上传。本机进度保留，只有你明确点击恢复才会重新创建云存档。',controls,{role:'status'});
    const resume=node('button','确认重新开启云存档并上传本机进度',controls,{type:'button',id:'cloud-resume-remote'});
    resume.onclick=()=>{if(confirm('确定重新开启当前账号的云存档并上传本机备份吗？'))busy(async()=>{
     await account.resumeRemoteSave();say('云存档已重新开启并完成同步');await display();
    })};
   }else{
    const sync=node('button','立即同步云端',controls,{type:'button',id:'cloud-sync-now'});
    sync.onclick=()=>busy(async()=>{await account.syncNow();say('云端已同步；刷新页面可查看来自其他设备的新关卡')});
   }
   const exportButton=node('button','导出本机存档备份',controls,{type:'button',id:'cloud-export-backup'});
   exportButton.onclick=()=>{
    const data=JSON.stringify({exportedAt:new Date().toISOString(),save:snapshotFromStorage(localStorage)},null,2);
    const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='梨花季-游戏云存档备份.json';anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    say('备份已导出到本机下载目录');
   };
   const logout=node('button','安全退出账号',controls,{type:'button',id:'cloud-sign-out'});
   logout.onclick=()=>busy(()=>account.signOut());
   const logoutLocal=node('button','网络故障时仅退出本机',controls,{type:'button',id:'cloud-local-logout'});
   logoutLocal.onclick=()=>{
    if(confirm('仅退出本机会保留远端会话有效性。确定要这样退出吗？'))
     busy(()=>account.signOut({localOnly:true}));
   };
   const deleteButton=node('button','删除我的云存档（不删除账号）',controls,{type:'button',id:'cloud-delete-save'});
   deleteButton.onclick=()=>{
    if(confirm('这会删除当前账号的云端游戏存档并停止所有自动同步，本机备份保留。确定删除吗？'))
     busy(async()=>{await account.removeRemoteSave();say('云存档已删除，自动同步已暂停');await display()});
   };
   say(account.status||'已登录。成绩变化会自动同步，也可以立即手动同步。');
   return;
  }
  let ready=false;
  try{ready=await account.checkConfiguration()}catch{}
  if(!alive)return;
  if(!ready){
   sub.textContent='当前游戏可继续本机游玩，云端服务暂时无法连接。';
   say(account.error||'无法连接云端，请检查网络后重试；本机存档不会删除。');
   const retry=node('button','重新检查云端连接',controls,{type:'button'});retry.onclick=()=>void display();
   return;
  }
  say('云端已连接。你可以注册或登录，随后选择是否导入以前的访客存档。');
  const form=node('form',null,controls,{id:'cloud-account-form'});
  const emailWrap=node('label','邮箱地址 ',form);
  const email=node('input',null,emailWrap,{type:'email',required:'',autocomplete:'email',id:'cloud-account-email',placeholder:'you@example.com'});
  const pwWrap=node('label','账号密码 ',form);
  const password=node('input',null,pwWrap,{type:'password',required:'',minlength:'8',autocomplete:'current-password',id:'cloud-account-password'});
  const importWrap=node('label',null,form,{class:'cloud-import-label'});
  const checkbox=node('input',null,importWrap,{type:'checkbox',id:'cloud-import-guest'});
  node('span','首次登录时把此前的访客进度导入该账号（不会覆盖已有更好成绩）',importWrap);
  const login=node('button','登录并恢复我的云存档',form,{type:'submit',id:'cloud-account-login'});
  const signup=node('button','注册新账号',form,{type:'button',id:'cloud-account-signup'});
  const action=async(method)=>{
   if(!email.validity.valid||password.value.length<8){say('请输入有效邮箱和至少8位密码');return}
   await busy(async()=>{
    if(method==='signup'){
     const result=await account.signUp(email.value.trim(),password.value);
     if(result?.pendingEmail)say('注册请求已提交，请查收确认邮件，然后回来登录');
    }else await account.signIn(email.value.trim(),password.value,{importGuest:checkbox.checked});
   });
   password.value='';
  };
  form.onsubmit=event=>{event.preventDefault();void action('login')};
  signup.onclick=()=>void action('signup');
 };
 await display();
 const handler=()=>{if(alive&&account.current)say(account.status)};
 window.addEventListener('lihuaji:cloud-status',handler);
 return ()=>{alive=false;window.removeEventListener('lihuaji:cloud-status',handler)};
}
