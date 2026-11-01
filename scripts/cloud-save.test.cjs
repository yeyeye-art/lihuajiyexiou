const test=require('node:test');
const assert=require('node:assert/strict');
const saveModel=import('../assets/cloud-save-model.js');
const cloud=import('../assets/cloud-account-controller.js');
const api=import('../assets/cloud-save-api.js');
const rules=import('../assets/motif-minigames-engine.js');
const ledger=import('../assets/motif-park-economy.js');

class LocalMap{
 constructor(){this.db=new Map()}
 getItem(key){return this.db.get(key)??null}
 setItem(key,value){this.db.set(key,String(value))}
 removeItem(key){this.db.delete(key)}
 clear(){this.db.clear()}
}
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const success=(status,value)=>({ok:status>=200&&status<300,status,text:async()=>value==null?'':JSON.stringify(value),json:async()=>value});
function fakeCloud(){
 const creds=new Map([['first@example.com',{id:uid(1),password:'password123'}],['second@example.com',{id:uid(2),password:'password456'}]]);
 const tokens=new Map(),saves=new Map();
 let tokenCounter=0,online=true;
 const request=async (url,options={})=>{
  if(url==='./content/cloud-config.json')return success(200,{url:'https://previewgame.supabase.co',anonKey:'public_test_anonymous_key_1234567890_example'});
  if(!online)throw Error('offline');
  const parsed=new URL(url),p=parsed.pathname,method=options.method||'GET';
  const payload=options.body?JSON.parse(options.body):null;
  if(p==='/auth/v1/settings')return success(200,{external:{email:true}});
  if(p==='/auth/v1/token'){
   const user=[...creds.entries()].find(([email,c])=>email===payload.email&&c.password===payload.password);
   if(!user)return success(400,{message:'bad email or password'});
   const token='test_access_token_'+(++tokenCounter);
   tokens.set(token,user[1].id);
   return success(200,{access_token:token,refresh_token:'refresh_token_'+token,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:user[1].id,email:user[0]}});
  }
  const auth=options.headers?.Authorization?.replace(/^Bearer /,'');
  const actor=tokens.get(auth);
  if(p==='/auth/v1/user'){
   if(!actor)return success(401,{message:'Unauthorized'});
   const email=[...creds].find(([,c])=>c.id===actor)?.[0];
   return success(200,{id:actor,email});
  }
  if(p==='/auth/v1/logout'){
   if(!actor)return success(401,{message:'Unauthorized'});
   tokens.delete(auth);return success(204,null);
  }
  if(p==='/rest/v1/game_saves'){
   if(!actor)return success(401,{message:'Unauthorized'});
   const queryId=parsed.searchParams.get('user_id')?.replace('eq.','');
   if(queryId&&queryId!==actor)return success(403,{message:'RLS denied'});
   if(method==='GET')return success(200,saves.has(actor)?[structuredClone(saves.get(actor))]:[]);
   if(method==='POST'){
    if(payload.user_id!==actor)return success(403,{message:'RLS denied'});
    if(saves.has(actor))return success(409,{message:'Duplicate row'});
    saves.set(actor,{user_id:actor,version:1,data:structuredClone(payload.data)});
    return success(201,[structuredClone(saves.get(actor))]);
   }
   if(method==='PATCH'){
    const old=saves.get(actor);
    if(!old||old.version!==Number(parsed.searchParams.get('version')?.replace('eq.','')))return success(200,[]);
    const next={user_id:actor,version:payload.version,data:structuredClone(payload.data)};
    saves.set(actor,next);return success(200,[structuredClone(next)]);
   }
   if(method==='DELETE'){saves.delete(actor);return success(204,null)}
  }
  return success(404,{message:'No route for '+method+' '+p});
 };
 return {request,saves,tokens,setOnline:x=>online=x,uid};
}
function installBrowserGlobals(){
 globalThis.window={dispatchEvent:()=>{}};
 globalThis.CustomEvent=class CustomEvent{constructor(type,options){this.type=type;this.detail=options?.detail}};
}
test('Cloud save migration preserves all three legacy on-device save formats and restricts forged store merges',async()=>{
 const {blankCloudSave,mergeCloudSave,snapshotFromStorage,installStorageSnapshot,GAME_SAVE_KEYS,hasGuestProgress}=await saveModel;
 const {saveParkWin,newParkSave}=await rules;
 const {purchaseParkItem,newParkStore,parkPointBalance}=await ledger;
 const guest=blankCloudSave();
 const progress=saveParkWin(newParkSave(),'match3',1,910,3);
 guest.park=progress;
 guest.store=purchaseParkItem(newParkStore(),progress,'extra-moves');
 const s=new LocalMap();
 for(const key of Object.values(GAME_SAVE_KEYS))assert.equal(s.getItem(key),null);
 installStorageSnapshot(s,guest);
 const roundtrip=snapshotFromStorage(s);
 assert.deepEqual(roundtrip,guest);
 assert(hasGuestProgress(roundtrip));
 const remote=blankCloudSave();remote.park=saveParkWin(newParkSave(),'link',1,400,2);
 const combo=mergeCloudSave(remote,guest);
 assert.equal(combo.ok,true,combo.reason);
 assert(combo.save.park.results.match3[1].stars===3&&combo.save.park.results.link[1].stars===2);
 assert.equal(parkPointBalance(combo.save.park,combo.save.store,combo.save.memory),55);
 assert.equal(s.getItem(GAME_SAVE_KEYS.park),JSON.stringify(guest.park),'Merge cannot modify old local files');
 const other=blankCloudSave();other.park=progress;other.store=purchaseParkItem(newParkStore(),progress,'extra-moves');
 const duplicate=mergeCloudSave(guest,other);
 assert.equal(duplicate.ok,false,'Two different devices must not spend 70 points of the same 50-point earning');
});

test('Two isolated controller profiles exchange private progress through a mocked authenticated API and preserve guests on logout',async()=>{
 installBrowserGlobals();
 const backend=fakeCloud();
 const {createCloudAccountController}=await cloud;
 const {GAME_SAVE_KEYS,blankCloudSave,snapshotFromStorage,installStorageSnapshot}=await saveModel;
 const {newParkSave,saveParkWin}=await rules;
 const guestA=new LocalMap(),sessionA=new LocalMap(),guestB=new LocalMap(),sessionB=new LocalMap();
 const visitorProgress=saveParkWin(newParkSave(),'match3',1,1000,3);
 installStorageSnapshot(guestA,{...blankCloudSave(),park:visitorProgress});
 const options={request:backend.request,refreshPage:()=>{}};
 const a=createCloudAccountController({...options,storage:guestA,session:sessionA});
 const b=createCloudAccountController({...options,storage:guestB,session:sessionB});
 assert.equal((await a.init()).loggedIn,false);
 assert.equal(await a.checkConfiguration(),true);
 await a.signIn('first@example.com','password123',{importGuest:true});
 assert.equal(a.current.id,uid(1));
 assert.equal(backend.saves.get(uid(1)).data.park.results.match3[1].stars,3);
 await b.signIn('first@example.com','password123');
 assert.equal(snapshotFromStorage(guestB).park.results.match3[1].stars,3,'Other device downloads earned stars');
 guestA.setItem(GAME_SAVE_KEYS.park,JSON.stringify(saveParkWin(snapshotFromStorage(guestA).park,'match3',2,500,2)));
 guestB.setItem(GAME_SAVE_KEYS.park,JSON.stringify(saveParkWin(snapshotFromStorage(guestB).park,'link',1,450,3)));
 await Promise.all([a.syncNow(),b.syncNow()]);
 await a.syncNow();await b.syncNow();
 const viewA=snapshotFromStorage(guestA),viewB=snapshotFromStorage(guestB);
 for(const view of [viewA,viewB]){
  assert.equal(view.park.results.match3[2].stars,2,'Concurrent wins from device A must survive');
  assert.equal(view.park.results.link[1].stars,3,'Concurrent wins from device B must survive');
 }
 assert.equal(backend.saves.get(uid(1)).data.park.results.link[1].stars,3);
 await a.signOut();
 assert.equal(a.current,null);
 assert.equal(snapshotFromStorage(guestA).park.results.match3[1].stars,3,'Guest data survives signed-in account logout');
 assert.equal(snapshotFromStorage(guestA).park.results.match3[2],undefined,'Guest cannot see account-only stage two');
 assert.equal(sessionA.getItem('lihuaji.cloud.auth.session.v1'),null,'Remote session is revoked in device A');
 await a.signIn('second@example.com','password456');
 assert.equal(a.current.id,uid(2));
 assert.equal(snapshotFromStorage(guestA).park.results.match3?.[1],undefined,'Second user has no first-account stages');
 await a.signOut();
 await a.signIn('first@example.com','password123');
 assert.equal(snapshotFromStorage(guestA).park.results.match3[2].stars,2,'Re-logging restores first account records');
 const fresh=new LocalMap(),sesh=new LocalMap();
 const c=createCloudAccountController({...options,storage:fresh,session:sesh});
 await c.signIn('second@example.com','password456');
 await assert.rejects(
  async()=>{const token=JSON.parse(sesh.getItem('lihuaji.cloud.auth.session.v1')).access_token;
  await (await api).createCloudApi({url:'https://previewgame.supabase.co',anonKey:'public_test_anonymous_key_1234567890_example'},{request:backend.request}).listSave(uid(1),token)},
  /拒绝|RLS denied/,'An authenticated user may not read another user by guessing ID');
});
test('Offline cloud writes never overwrite a guest or destroy a pending original save',async()=>{
 installBrowserGlobals();const backend=fakeCloud(),{createCloudAccountController}=await cloud;
 const {GAME_SAVE_KEYS,snapshotFromStorage}=await saveModel,{saveParkWin}=await rules;
 const storage=new LocalMap(),session=new LocalMap(),ctrl=createCloudAccountController({storage,session,request:backend.request,refreshPage:()=>{}});
 await ctrl.signIn('first@example.com','password123');
 storage.setItem(GAME_SAVE_KEYS.park,JSON.stringify(saveParkWin(snapshotFromStorage(storage).park,'match3',1,500,1)));
 backend.setOnline(false);
 await assert.rejects(()=>ctrl.syncNow(),/无法连接/);
 assert.equal(snapshotFromStorage(storage).park.results.match3[1].stars,1,'Network outage must not erase offline earned points');
 backend.setOnline(true);
 await ctrl.syncNow();
 assert.equal(backend.saves.get(uid(1)).data.park.results.match3[1].stars,1);
});

test('Deleting a cloud save creates a durable upload hold until the user explicitly restores it',async()=>{
 installBrowserGlobals();const backend=fakeCloud(),{createCloudAccountController}=await cloud;
 const {GAME_SAVE_KEYS,snapshotFromStorage}=await saveModel,{saveParkWin}=await rules;
 const storage=new LocalMap(),session=new LocalMap(),options={storage,session,request:backend.request,refreshPage:()=>{}};
 const ctrl=createCloudAccountController(options);
 await ctrl.signIn('first@example.com','password123');
 storage.setItem(GAME_SAVE_KEYS.park,JSON.stringify(saveParkWin(snapshotFromStorage(storage).park,'match3',1,510,2)));
 await ctrl.syncNow();
 assert.equal(backend.saves.get(uid(1)).data.park.results.match3[1].stars,2);
 await ctrl.removeRemoteSave();
 assert.equal(backend.saves.has(uid(1)),false,'User-requested deletion must actually delete remote record');
 assert.equal(ctrl.paused,true,'Deletion must persist a stop-upload flag');
 await assert.rejects(()=>ctrl.syncNow(),/暂停/);
 assert.equal(backend.saves.has(uid(1)),false,'A later auto sync cannot re-create deleted data');
 assert.equal(snapshotFromStorage(storage).park.results.match3[1].stars,2,'Local backup is preserved');
 await ctrl.signOut();
 await ctrl.signIn('first@example.com','password123');
 assert.equal(ctrl.paused,true,'Deleted marker survives login and page restart');
 assert.equal(backend.saves.has(uid(1)),false,'Login may not silently recreate deleted cloud save');
 await ctrl.resumeRemoteSave();
 assert.equal(ctrl.paused,false);
 assert.equal(backend.saves.get(uid(1)).data.park.results.match3[1].stars,2,
  'Explicit resumption, not login, restores deleted cloud data');
});
test('Offline expired or unverifiable session does not leak the previous owner save into guest mode',async()=>{
 installBrowserGlobals();const backend=fakeCloud(),{createCloudAccountController}=await cloud;
 const {GAME_SAVE_KEYS,snapshotFromStorage}=await saveModel,{saveParkWin}=await rules;
 const storage=new LocalMap(),session=new LocalMap(),options={storage,session,request:backend.request,refreshPage:()=>{}};
 const ctrl=createCloudAccountController(options);
 await ctrl.signIn('first@example.com','password123');
 storage.setItem(GAME_SAVE_KEYS.park,JSON.stringify(saveParkWin(snapshotFromStorage(storage).park,'match3',1,400,2)));
 await ctrl.syncNow();
 const reloadCtrl=createCloudAccountController(options);
 backend.setOnline(false);
 const result=await reloadCtrl.init();
 assert.equal(result.offline,true);
 assert.equal(snapshotFromStorage(storage).park.results.match3?.[1],undefined,'Guest must not see cached player progress while identity is unverified');
 assert.equal(storage.getItem('lihuaji.cloud.active-owner.v1'),null);
 const backup=JSON.parse(storage.getItem('lihuaji.cloud.backup.'+uid(1)));
 assert.equal(backup.park.results.match3[1].stars,2,'Account data must be safely backed up for later recovery');
 backend.setOnline(true);
 await reloadCtrl.init();
 assert.equal(snapshotFromStorage(storage).park.results.match3[1].stars,2,'Authenticated user recovers their saved account');
});


test('Two tabs sharing localStorage must not mix users or upload another account save',async()=>{
 installBrowserGlobals();const backend=fakeCloud(),{createCloudAccountController}=await cloud;
 const {snapshotFromStorage,GAME_SAVE_KEYS}=await saveModel,{saveParkWin}=await rules;
 const storage=new LocalMap(),sessionA=new LocalMap(),sessionB=new LocalMap(),options={storage,request:backend.request,refreshPage:()=>{}};
 const tabA=createCloudAccountController({...options,session:sessionA});
 const tabB=createCloudAccountController({...options,session:sessionB});
 await tabA.signIn('first@example.com','password123');
 storage.setItem(GAME_SAVE_KEYS.park,JSON.stringify(saveParkWin(snapshotFromStorage(storage).park,'match3',1,350,2)));
 await tabA.syncNow();
 await tabB.signIn('second@example.com','password456');
 assert.equal(tabB.current.id,uid(2));
 assert.equal(snapshotFromStorage(storage).park.results.match3?.[1],undefined);
 await assert.rejects(()=>tabA.syncNow(),/已经切换账号/);
 await assert.rejects(()=>tabA.removeRemoteSave(),/已经切换账号/);
 await tabA.signOut({localOnly:true});
 assert.equal(storage.getItem('lihuaji.cloud.active-owner.v1'),uid(2),'Stale tab logout must not reset the active account');
 assert.equal(tabB.current.id,uid(2));
 storage.setItem(GAME_SAVE_KEYS.park,JSON.stringify(saveParkWin(snapshotFromStorage(storage).park,'link',1,456,3)));
 await tabB.syncNow();
 assert.equal(backend.saves.get(uid(2)).data.park.results.link[1].stars,3);
 assert.equal(backend.saves.get(uid(1)).data.park.results.link?.[1],undefined,'Player two data cannot be copied into player one save');
});
