import {createCloudApi,validateCloudConfig,CLOUD_AUTH_SESSION_KEY} from './cloud-save-api.js';
import {blankCloudSave,normalizeCloudSave,mergeCloudSave,hasGuestProgress,
 snapshotFromStorage,installStorageSnapshot,encodeSnapshot} from './cloud-save-model.js';
const GUEST_KEY='lihuaji.cloud.guest.v1',OWNER_KEY='lihuaji.cloud.active-owner.v1';
const ACCOUNT_PREFIX='lihuaji.cloud.backup.';
const REMOTE_DELETED_PREFIX='lihuaji.cloud.deleted.';
function fromJson(storage,key){try{return JSON.parse(storage.getItem(key)||'null')}catch{return null}}
function strictUser(value){if(!/^[0-9a-f-]{36}$/i.test(value||''))throw Error('不合法的用户身份');return value}
const waitLogin=()=>new Error('请先登录，再同步云端进度');
export function createCloudAccountController({storage=localStorage,session=sessionStorage,
 configUrl='./content/cloud-config.json',request=fetch,refreshPage=()=>location.reload()}={}){
 let api=null,current=null,apiError='',syncing=null,pending=false,notice='';
 const owner=()=>storage.getItem(OWNER_KEY);
 function assertOwnership(){
  if(current&&owner()!==current.id)throw Error('另一个浏览器标签页已经切换账号，请刷新此页面后再继续');
 }
 const sessionData=()=>fromJson(session,CLOUD_AUTH_SESSION_KEY);
 function setSession(data){
  session.setItem(CLOUD_AUTH_SESSION_KEY,JSON.stringify({
   access_token:data.access_token,refresh_token:data.refresh_token,
   expires_at:data.expires_at||0,user:{id:strictUser(data.user?.id),email:data.user?.email||''}
  }));
 }
 async function readyApi(){
  if(api)return api;
  let response;
  try{response=await request(configUrl,{cache:'no-store',signal:AbortSignal.timeout(5000)})}
  catch{apiError='无法读取云端配置';throw Error(apiError)}
  if(!response.ok){apiError='云存档服务尚未配置';throw Error(apiError)}
  const settings=validateCloudConfig(await response.json());
  api=createCloudApi(settings,{request});apiError='';return api;
 }
 function snapshotBackup(key){
  const snap=snapshotFromStorage(storage);storage.setItem(key,JSON.stringify(snap));return snap;
 }
 function restoreBackup(key){
  const data=fromJson(storage,key);
  return installStorageSnapshot(storage,data||blankCloudSave());
 }
 function stashActive(){
  const id=owner();return snapshotBackup(id?ACCOUNT_PREFIX+id:GUEST_KEY);
 }
 function restoreGuest(){
  const id=owner();if(!id)return;
  snapshotBackup(ACCOUNT_PREFIX+id);
  restoreBackup(GUEST_KEY);storage.removeItem(OWNER_KEY);
 }
 function emit(msg){notice=msg;window.dispatchEvent?.(new CustomEvent('lihuaji:cloud-status',{detail:msg}))}
 async function authenticate(data,{importGuest=false}={}){
  const identity=strictUser(data.user?.id);
  if(!data.access_token||!data.refresh_token)throw Error('身份认证没有返回有效会话');
  if(storage.getItem(REMOTE_DELETED_PREFIX+identity)==='1'){
   if(importGuest)throw Error('该账号已删除云存档并暂停同步，请先手动恢复云同步后再导入访客进度');
   stashActive();restoreBackup(ACCOUNT_PREFIX+identity);
   storage.setItem(OWNER_KEY,identity);setSession(data);
   current={...data.user,id:identity};
   emit('云存档已删除，同步已暂停；本机旧存档仅在此设备保留');
   refreshPage();return {user:current,paused:true};
  }
  const backend=await readyApi();
  // Network and permission checks complete before changing existing guest files.
  const rows=await backend.listSave(identity,data.access_token);
  if(!Array.isArray(rows))throw Error('云端响应异常');
  const target=rows[0] ? normalizeCloudSave(rows[0].data) : blankCloudSave();
  const guest=owner()?fromJson(storage,GUEST_KEY)||blankCloudSave():snapshotFromStorage(storage);
  const oldAccount=fromJson(storage,ACCOUNT_PREFIX+identity);
  const previous=oldAccount?mergeCloudSave(target,oldAccount):{ok:true,save:target};
  if(!previous.ok)throw Error(previous.reason);
  let joined=previous.save;
  if(importGuest&&hasGuestProgress(guest)){
   const result=mergeCloudSave(joined,guest);
   if(!result.ok)throw Error(result.reason);
   joined=result.save;
  }
  const saved=await writeCloud(backend,identity,data.access_token,joined);
  stashActive();
  installStorageSnapshot(storage,saved);
  storage.setItem(OWNER_KEY,identity);
  storage.setItem(ACCOUNT_PREFIX+identity,JSON.stringify(saved));
  setSession(data);current={...data.user,id:identity};
  emit('账号已登录，125关进度已从云端恢复');
  refreshPage();return {user:current};
 }
 async function writeCloud(backend,userId,accessToken,snapshot){
  let intended=normalizeCloudSave(snapshot);
  for(let attempt=0;attempt<6;attempt++){
   const rows=await backend.listSave(userId,accessToken);
   if(!Array.isArray(rows))throw Error('无法读取云存档版本');
   const remote=rows[0],merged=remote?mergeCloudSave(remote.data,intended):{ok:true,save:intended};
   if(!merged.ok)throw Error(merged.reason);
   intended=merged.save;
   try{
    const result=remote?
     await backend.updateSave(userId,accessToken,remote.version,encodeSnapshot(intended)):
     await backend.createSave(userId,accessToken,encodeSnapshot(intended));
    if(Array.isArray(result)&&result.length===1)return intended;
    if(Array.isArray(result)&&!result.length)continue; // lost CAS race: re-read and merge
    throw Error('无法确认云端保存结果');
   }catch(error){if(error.status===409)continue;throw error}
  }
  throw Error('存档并发更新过于频繁，请稍后再同步；本机数据已保留');
 }
 async function signIn(email,password,{importGuest=false}={}){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('请输入有效邮箱地址');
  if(typeof password!=='string'||password.length<8)throw Error('密码至少需要8个字符');
  const result=await (await readyApi()).signIn(email,password);
  return authenticate(result,{importGuest});
 }
 async function signUp(email,password){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('请输入有效邮箱地址');
  if(typeof password!=='string'||password.length<8)throw Error('密码至少需要8个字符');
  const data=await (await readyApi()).signUp(email,password);
  if(!data?.session&&!data?.access_token){emit('注册请求已提交，请到邮箱确认后再登录');return {pendingEmail:true}}
  return authenticate(data.session||data,{importGuest:false});
 }
 async function init(){
  const saved=sessionData();
  if(!saved){restoreGuest();return {loggedIn:false,configured:false}}
  try{
   const backend=await readyApi();
   let creds=saved;
   if(creds.expires_at&&Date.now()>creds.expires_at*1000-60000){
    creds=await backend.refresh(creds.refresh_token);setSession(creds);
   }
   let user;
   try{user=await backend.getUser(creds.access_token)}
   catch(error){
    if(error.status!==401)throw error;
    creds=await backend.refresh(creds.refresh_token);setSession(creds);
    user=await backend.getUser(creds.access_token);
   }
   const id=strictUser(user.id);current={id,email:user.email||''};
   if(owner()!==id){
    stashActive();
    restoreBackup(ACCOUNT_PREFIX+id);
    storage.setItem(OWNER_KEY,id);
   }
   if(storage.getItem(REMOTE_DELETED_PREFIX+id)==='1'){
    emit('云存档已删除并暂停同步；本机备份保留，需要手动恢复才能重新上传');
    return {loggedIn:true,user:current,paused:true};
   }
   const savedCloud=await backend.listSave(id,creds.access_token);
   if(savedCloud?.length){
    const result=mergeCloudSave(savedCloud[0].data,snapshotFromStorage(storage));
    if(!result.ok){emit(result.reason);return {loggedIn:true,needsResolution:true}}
    // Do not erase account-local offline edits: synchronize before UI loads.
    const merged=await writeCloud(backend,id,creds.access_token,result.save);
    installStorageSnapshot(storage,merged);
    storage.setItem(ACCOUNT_PREFIX+id,JSON.stringify(merged));
   }
   emit('云存档已连接');
   return {loggedIn:true,user:current};
  }catch(error){
   apiError=error.message;
   if(error.status===401){session.removeItem(CLOUD_AUTH_SESSION_KEY);restoreGuest();current=null}
   else{
    // If no identity was validated, isolate the previous account's local save
    // from a guest. Retain its backup until authentication is available.
    if(!current&&owner())restoreGuest();
    emit('当前无法验证云端连接，保留本机进度：'+error.message);
   }
   return {loggedIn:!!current,offline:true,error:apiError};
  }
 }
 async function syncNow(){
  if(!current)throw waitLogin();
  assertOwnership();
  if(storage.getItem(REMOTE_DELETED_PREFIX+current.id)==='1')
   throw Error('该账号已删除云存档，自动同步已暂停；请在账号页面明确恢复后再上传');
  if(syncing){pending=true;return syncing}
  syncing=(async()=>{
   const backend=await readyApi();
   const creds=sessionData();if(!creds)throw waitLogin();
   const actor=current.id;
   const before=snapshotFromStorage(storage);
   const merged=await writeCloud(backend,actor,creds.access_token,before);
   if(current?.id!==actor||owner()!==actor)throw Error('账号已变更，本次同步已取消');
   const latest=snapshotFromStorage(storage);
   // A move can finish while network requests are pending; never roll it back.
   const verify=mergeCloudSave(merged,latest);
   if(!verify.ok)throw Error(verify.reason);
   if(JSON.stringify(verify.save)!==JSON.stringify(merged)){
    pending=true;
   }
   installStorageSnapshot(storage,verify.save);
   storage.setItem(ACCOUNT_PREFIX+actor,JSON.stringify(verify.save));
   emit('云端已保存；其他设备新增的成绩已合并');
   return verify.save;
  })();
  try{return await syncing}
  finally{
   syncing=null;
   if(pending){pending=false;queueMicrotask(()=>{if(current)syncNow().catch(error=>emit('同步尚未完成：'+error.message))})}
  }
 }
 async function signOut({localOnly=false}={}){
  if(!current)return;
  if(owner()!==current.id){
   // A different tab has switched account. Never backup its save under this identity.
   current=null;session.removeItem(CLOUD_AUTH_SESSION_KEY);refreshPage();return;
  }
  if(!localOnly){
   const creds=sessionData();await (await readyApi()).signOut(creds.access_token);
  }
  restoreGuest();current=null;session.removeItem(CLOUD_AUTH_SESSION_KEY);
  emit(localOnly?'本机已退出；远端会话可能仍然有效':'已安全退出并恢复原本机访客进度');
  refreshPage();
 }
 async function removeRemoteSave(){
  if(!current)throw waitLogin();
  assertOwnership();
  // A pending upload must settle BEFORE a deletion, otherwise it can re-create
  // the cloud row after the user has explicitly requested removal.
  const id=current.id;
  storage.setItem(REMOTE_DELETED_PREFIX+id,'1');
  try{
   if(syncing)await syncing.catch(()=>{});
   await (await readyApi()).deleteSave(id,sessionData().access_token);
  }catch(error){
   storage.removeItem(REMOTE_DELETED_PREFIX+id);
   throw error;
  }
  snapshotBackup(ACCOUNT_PREFIX+id);
  emit('当前账号云存档已删除并暂停同步，本机副本保留，只有明确重新开启才会上传');
 }
 async function resumeRemoteSave(){
  if(!current)throw waitLogin();
  assertOwnership();
  const id=current.id;
  if(storage.getItem(REMOTE_DELETED_PREFIX+id)!=='1')return syncNow();
  storage.removeItem(REMOTE_DELETED_PREFIX+id);
  try{return await syncNow()}
  catch(error){storage.setItem(REMOTE_DELETED_PREFIX+id,'1');throw error}
 }
 return {
  get current(){return current},get available(){return !!api},get error(){return apiError},
  get paused(){return !!current&&storage.getItem(REMOTE_DELETED_PREFIX+current.id)==='1'},
  get status(){return notice},checkConfiguration:async()=>{try{await (await readyApi()).health();apiError='';return true}catch(error){apiError=error.message;return false}},
  init,signIn,signUp,signOut,syncNow,removeRemoteSave,resumeRemoteSave,
  hasGuestProgress:()=>hasGuestProgress(fromJson(storage,GUEST_KEY)||snapshotFromStorage(storage))
 };
}
