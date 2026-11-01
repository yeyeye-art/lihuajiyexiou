// Supabase Auth + PostgREST browser transport. Only the public ANON key is
// ever sent to the browser. RLS must be enabled in the SQL migration.
export const CLOUD_AUTH_SESSION_KEY='lihuaji.cloud.auth.session.v1';
export function validateCloudConfig(input){
 const url=String(input?.url||'').replace(/\/$/,'');
 const anonKey=String(input?.anonKey||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||anonKey.length<30)
  throw Error('尚未配置安全的云端账号服务');
 return {url,anonKey};
}
export class CloudApiError extends Error {
 constructor(msg,status=0){super(msg);this.name='CloudApiError';this.status=status}
}
export function createCloudApi(config,{request=fetch}={}){
 const {url,anonKey}=validateCloudConfig(config);
 async function invoke(endpoint,{method='GET',token,body,query,extraHeaders={}}={}){
  const u=url+endpoint+(query||'');
  const headers={apikey:anonKey,...extraHeaders};
  if(token)headers.Authorization='Bearer '+token;
  // Modern sb_publishable_ keys are API keys, not JWT bearer tokens.
  // Only user JWTs belong in the Authorization header.
  if(body!==undefined)headers['Content-Type']='application/json';
  let response;
  try{response=await request(u,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(10000)})}
  catch{throw new CloudApiError('无法连接云服务器，请检查网络并重试')}
  let data=null;const raw=await response.text().catch(()=> '');
  try{data=raw?JSON.parse(raw):null}catch{}
  if(!response.ok){
   const detail=String(data?.msg||data?.message||data?.error_description||data?.error||'');
   const known=response.status===401?'登录已过期，请重新登录':response.status===403?'服务器拒绝此账号访问存档':response.status===409?'云端版本已改变，请进行冲突合并':response.status===429?'操作过于频繁，请稍后重试':'云端请求失败';
   throw new CloudApiError(detail&&response.status!==401?known+'：'+detail.slice(0,130):known,response.status);
  }
  return data;
 }
 const auth='/auth/v1';
 return {
  health(){return invoke(auth+'/settings')},
  signUp(email,password){
   return invoke(auth+'/signup',{method:'POST',body:{email,password}});
  },
  signIn(email,password){
   return invoke(auth+'/token',{method:'POST',query:'?grant_type=password',body:{email,password}});
  },
  refresh(refresh_token){
   return invoke(auth+'/token',{method:'POST',query:'?grant_type=refresh_token',body:{refresh_token}});
  },
  getUser(access_token){return invoke(auth+'/user',{token:access_token})},
  signOut(access_token){return invoke(auth+'/logout',{method:'POST',token:access_token})},
  listSave(userId,access_token){
   return invoke('/rest/v1/game_saves',{token:access_token,query:'?user_id=eq.'+encodeURIComponent(userId)+'&select=user_id,version,data,updated_at&limit=1'});
  },
  createSave(userId,access_token,data){
   return invoke('/rest/v1/game_saves',{method:'POST',token:access_token,
    extraHeaders:{Prefer:'return=representation'},body:{user_id:userId,version:1,data}});
  },
  updateSave(userId,access_token,version,data){
   return invoke('/rest/v1/game_saves',{method:'PATCH',token:access_token,
    extraHeaders:{Prefer:'return=representation'},
    query:'?user_id=eq.'+encodeURIComponent(userId)+'&version=eq.'+version+'&select=user_id,version,data,updated_at',
    body:{data,version:version+1}});
  },
  exportSave(userId,access_token){return this.listSave(userId,access_token)},
  deleteSave(userId,access_token){
   return invoke('/rest/v1/game_saves',{method:'DELETE',token:access_token,
    query:'?user_id=eq.'+encodeURIComponent(userId)});
  }
 };
}
