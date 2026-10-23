/* DON'T LIKE YOUR MOM v0.8.8 -- message moderation */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),API=window.DLYMCommunityAPI;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
 let state='pending', busy=false;
 const tell=s=>{$('boardAdminStatus').textContent=s;};
 const workspace=$('boardAdminWorkspace'),login=$('boardAdminLogin');
 function show(inAdmin){workspace.hidden=!inAdmin;login.hidden=inAdmin;}
 const labels={chat:'💬 閒聊',suggestion:'💡 建議',bug:'🐛 問題'};
 const date=s=>new Date(s).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'});
 function actionBtn(label,kind,id,klass=''){
   const b=node('button',klass,label);b.type='button';
   b.addEventListener('click',()=>moderate(id,kind));return b;
 }
 function card(post){
   const c=node('article','board-admin-card');
   const hdr=node('div','board-author',post.nickname+' · '+(labels[post.category]||post.category));
   const meta=node('div','board-admin-meta',`${date(post.created_at)}　·　狀態：${post.status}`+(post.pinned?'　📌 已置頂':'')+(post.reports?'　🚩 '+post.reports+' 次檢舉':''));
   const body=node('p','board-admin-body',post.content);
   const buttons=node('div','board-admin-buttons');
   if(post.status==='pending'){
     buttons.append(actionBtn('✅ 審核通過','approve',post.id,'approve'),actionBtn('❌ 拒絕公開','reject',post.id,'danger'));
   }else if(post.status==='approved'){
     buttons.append(actionBtn(post.pinned?'取消置頂':'📌 置頂',post.pinned?'unpin':'pin',post.id),actionBtn('🗑 下架','remove',post.id,'danger'));
   }
   c.append(hdr,meta,body,buttons);return c;
 }
 async function load(){
   if(busy)return;busy=true;$('boardAdminRefresh').disabled=true;
   $('boardAdminListStatus').textContent='⏳ 正在載入…';
   try{
     const result=await API.rpc('dlym_board_admin_list',{p_status:state,p_limit:100},'admin');
     $('boardAdminCards').replaceChildren();
     if(Array.isArray(result))for(const row of result)$('boardAdminCards').append(card(row));
     if(!Array.isArray(result)||!result.length)$('boardAdminCards').append(node('div','board-placeholder','這裡目前沒有留言。'));
     $('boardAdminListStatus').textContent=`讀取完成：${Array.isArray(result)?result.length:0} 則（最多顯示 100 則）`;
     tell('');
   }catch(err){tell('❌ 讀取失敗：'+String(err?.message||err)+'。請先確認 SQL 已執行。');}
   finally{busy=false;$('boardAdminRefresh').disabled=false;}
 }
 async function moderate(id,act){
   if(busy)return;
   const message=({approve:'公開這則留言',reject:'拒絕這則留言',remove:'將這則留言下架',pin:'將這則留言置頂',unpin:'取消置頂'})[act];
   if(!confirm('確定要'+message+'？'))return;
   busy=true;
   try{
     tell('⏳ 正在處理…');
     const ok=await API.rpc('dlym_board_moderate',{p_id:id,p_action:act},'admin');
     tell(ok?'✅ 操作完成。':'找不到可以處理的留言，請重新整理。');
   }catch(err){tell('❌ 操作失敗：'+String(err?.message||err));}
   finally{busy=false;}
   await load();
 }
 login.addEventListener('submit',async ev=>{
   ev.preventDefault();if(busy)return;
   busy=true;$('boardAdminLoginBtn').disabled=true;
   try{
     tell('⏳ 正在登入管理員…');
     await API.adminLogin($('boardAdminEmail').value.trim(),$('boardAdminPassword').value);
     $('boardAdminPassword').value='';show(true);
   }catch(err){tell('❌ 登入失敗：'+String(err?.message||err));}
   finally{busy=false;$('boardAdminLoginBtn').disabled=false;}
   if(!login.hidden)await load();
 });
 $('boardAdminRefresh').addEventListener('click',load);
 $('boardAdminLogout').addEventListener('click',()=>{API.logoutAdmin();show(false);$('boardAdminCards').replaceChildren();tell('已登出。');});
 document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{
   state=b.dataset.state;
   document.querySelectorAll('[data-state]').forEach(x=>x.classList.toggle('selected',x===b));
   load();
 }));
 (async()=>{
   if(!API?.configured){show(false);tell('尚未設定 Supabase，請檢查 leaderboard-config.js。');return;}
   try{
     await API.authFor('admin');
     const valid=await API.rpc('dlym_is_photo_admin',{},'admin');
     if(valid!==true)throw new Error('沒有站長權限');
     show(true);await load();
   }catch{show(false);tell('請用原本審核照片的管理員帳號登入。');}
 })();
})();
