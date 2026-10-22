/* DON'T LIKE YOUR MOM v0.7.0 | independent, no-SDK Supabase client.
   Never put service_role/secret keys in any GitHub Pages file. */
(() => {
  'use strict';
  const raw=window.DLYM_LEADERBOARD_CONFIG || {};
  const base=String(raw.url||'').trim().replace(/\/+$/,'');
  const key=String(raw.publishableKey||'').trim();
  const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base)&&/^(sb_publishable_|eyJ)/.test(key);
  const safeError=(data,status)=>String(data?.message||data?.error_description||data?.error||data?.msg||`HTTP ${status}`);
  const sessionKeys={guest:'dlym_community_guest_v070',admin:'dlym_community_admin_v070'};
  const storage={guest:localStorage,admin:sessionStorage};
  function getSaved(role){try{return JSON.parse(storage[role].getItem(sessionKeys[role])||'null');}catch{return null;}}
  function save(role,data){try{if(data)storage[role].setItem(sessionKeys[role],JSON.stringify(data));else storage[role].removeItem(sessionKeys[role]);}catch{}}
  async function request(route,{method='GET',body,token=null,contentType='application/json'}={}){
    if(!configured)throw new Error('尚未設定 Supabase。請確認 leaderboard-config.js。');
    const headers={apikey:key};
    if(token)headers.Authorization='Bearer '+token;
    if(body!==undefined&&contentType)headers['Content-Type']=contentType;
    const resp=await fetch(base+route,{method,headers,body:body===undefined?undefined:(contentType==='application/json'?JSON.stringify(body):body),cache:'no-store'});
    let data;
    if(contentType==='raw-response')data=resp;
    else{const text=await resp.text();try{data=text?JSON.parse(text):null;}catch{data=text;}}
    if(!resp.ok)throw new Error(safeError(data,resp.status));
    return data;
  }
  async function authFor(role){
    let saved=getSaved(role);
    if(saved?.access_token && saved.expires_at>Date.now()+90000)return saved;
    if(saved?.refresh_token){
      try{
        const renewed=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:saved.refresh_token}});
        saved={...renewed,expires_at:Date.now()+(Number(renewed.expires_in)||3600)*1000};
        save(role,saved);return saved;
      }catch{save(role,null);}
    }
    if(role==='admin')throw new Error('管理員登入已過期，請重新登入。');
    // Same anonymous signup payload as supabase-js auth.signInAnonymously().
    const created=await request('/auth/v1/signup',{method:'POST',body:{data:{}}});
    const session=created.session||created;
    if(!session.access_token)throw new Error('無法建立匿名投稿身份。請先在 Supabase 啟用 Anonymous Sign-Ins。');
    saved={...session,expires_at:Date.now()+(Number(session.expires_in)||3600)*1000};
    save(role,saved);return saved;
  }
  async function adminLogin(email,password){
    if(!email||!password)throw new Error('請輸入管理員 Email 與密碼。');
    const session=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    if(!session?.access_token)throw new Error('登入失敗，沒有收到有效登入憑證。');
    const saved={...session,expires_at:Date.now()+(Number(session.expires_in)||3600)*1000};
    save('admin',saved);
    try{const permitted=await rpc('dlym_is_photo_admin',{},'admin');if(permitted!==true)throw new Error('帳號尚未取得審核權限。請在 SQL 中加入管理員 UUID。');}
    catch(err){save('admin',null);throw err;}
    return saved;
  }
  async function rpc(name,data={},role=null){
    const token=role?(await authFor(role)).access_token:null;
    return request('/rest/v1/rpc/'+name,{method:'POST',body:data,token});
  }
  async function table(path,{method='GET',body,role='guest'}={}){
    const token=(await authFor(role)).access_token;
    return request('/rest/v1/'+path,{method,body,token});
  }
  async function uploadPrivate(file,path){
    const token=(await authFor('guest')).access_token;
    return request('/storage/v1/object/dlym-submissions/'+path,{method:'POST',token,body:file,contentType:'image/webp'});
  }
  async function previewPrivate(path){
    const token=(await authFor('admin')).access_token;
    const headers={apikey:key,Authorization:'Bearer '+token};
    const resp=await fetch(base+'/storage/v1/object/authenticated/dlym-submissions/'+path,{headers,cache:'no-store'});
    if(!resp.ok)throw new Error('審核圖片取得失敗：HTTP '+resp.status);
    return resp.blob();
  }
  async function publishPrivate(path,id){
    const token=(await authFor('admin')).access_token;
    return request('/storage/v1/object/copy',{method:'POST',token,body:{bucketId:'dlym-submissions',sourceKey:path,destinationBucket:'dlym-approved',destinationKey:'approved/'+id+'.webp'}});
  }
  async function deletePrivate(path){
    const token=(await authFor('admin')).access_token;
    const resp=await fetch(base+'/storage/v1/object/dlym-submissions/'+path,{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+token}});
    if(!resp.ok){const json=await resp.json().catch(()=>null);throw new Error(safeError(json,resp.status));}
  }
  async function deletePublic(path){
    const token=(await authFor('admin')).access_token;
    const resp=await fetch(base+'/storage/v1/object/dlym-approved/'+path,{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+token}});
    if(!resp.ok){const json=await resp.json().catch(()=>null);throw new Error(safeError(json,resp.status));}
  }
  function publicPhotoUrl(path){
    if(!/^approved\/[0-9a-f-]{36}\.webp$/.test(path||''))throw new Error('不合法的公開照片路徑');
    return base+'/storage/v1/object/public/dlym-approved/'+path;
  }
  window.DLYMCommunityAPI={base,configured,authFor,adminLogin,rpc,table,uploadPrivate,previewPrivate,publishPrivate,deletePrivate,deletePublic,publicPhotoUrl,logoutAdmin(){save('admin',null)}};
})();
