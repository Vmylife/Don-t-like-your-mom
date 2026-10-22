/* DON'T LIKE YOUR MOM v0.7.0 submission and administrator UI. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const API=window.DLYMCommunityAPI;
 const sendForm=$('communitySubmissionForm');
 const status=(target,text)=>{target.textContent=text;};
 const utfLength=s=>[...s].length;
 function newUUID(){
   if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
   const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
   return [...b].map(x=>x.toString(16).padStart(2,'0')).join('').replace(/^(........)(....)(....)(....)(............)$/, '$1-$2-$3-$4-$5');
 }
 const compress=window.DLYMPhotoCompress?.compress;
 if(!compress)throw new Error('照片壓縮程式沒有載入，請重新整理。');
 if(sendForm){
   const file=$('communityPhoto'),picture=$('communityPreview'),holder=$('previewPlaceholder'),out=$('communityStatus'),button=$('communitySend');
   let previewUrl=null;
   file.addEventListener('change',()=>{
     if(previewUrl)URL.revokeObjectURL(previewUrl);
     const selected=file.files?.[0];
     if(selected){previewUrl=URL.createObjectURL(selected);picture.src=previewUrl;picture.hidden=false;holder.hidden=true;}
     else{picture.hidden=true;holder.hidden=false;}
   });
   sendForm.addEventListener('submit',async ev=>{
     ev.preventDefault();if(button.disabled)return;
     const name=$('communityName').value.trim(),age=Number($('communityAge').value),city=$('communityCity').value.trim(),bio=$('communityBio').value.trim();
     if(!file.files?.length||!$('communityConsent').checked){status(out,'請選擇照片並確認投稿授權。');return;}
     if(utfLength(name)<1||utfLength(name)>24||utfLength(city)<1||utfLength(city)>24||utfLength(bio)<1||utfLength(bio)>100||!Number.isInteger(age)||age<18||age>99){status(out,'請確認暱稱、城市、介紹與年齡。');return;}
     button.disabled=true;
     try{
       status(out,'⏳ 正在壓縮照片（目標約 300 KB、上限 500 KB）並移除定位資料…');
       const bytes=await compress(file.files[0]);
       status(out,`✅ 壓縮完成：${Math.round(bytes.size/1024)} KB，正在建立投稿身份…`);
       const session=await API.authFor('guest');
       const owner=session.user?.id || JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub;
       if(!/^[a-f0-9-]{36}$/i.test(owner))throw new Error('投稿身份無效，請重新開啟頁面。');
       const ext=bytes.type==='image/webp'?'webp':bytes.type==='image/jpeg'?'jpg':null;
       if(!ext)throw new Error('圖片格式無法辨識，請重新選擇照片。');
       const path=owner+'/'+newUUID()+'.'+ext;
       status(out,'⏳ 正在上傳到私人待審區…');
       await API.uploadPrivate(bytes,path);
       status(out,'⏳ 已安全上傳，正在建立待審紀錄…');
       await API.table('dlym_photo_submissions',{method:'POST',role:'guest',body:{nickname:name,age,city,bio,private_path:path,consent:true}});
       status(out,'✅ 投稿成功！照片目前只有站長能審核，核准後才會出現在自由模式。');
       sendForm.reset();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;picture.hidden=true;holder.hidden=false;
     }catch(err){
       const msg=String(err?.message||err);
       const hint=/mime|unsupported|type|content.?type|jpg|jpeg/i.test(msg)?' 請先在 Supabase 執行 v0.7.2 相容格式 SQL。':/permission|row.level|policy|401|403|unauthorized/i.test(msg)?' 請確認 Supabase SQL 與匿名登入已啟用。':'';
       status(out,'❌ 送出失敗：'+msg+hint);
     }
     finally{button.disabled=false;}
   });
 }
 const loginForm=$('communityAdminLogin');
 if(!loginForm)return;
 const out=$('adminStatus'),workspace=$('adminWorkspace');
 let busy=false;
 async function listPhotos(){
   status(out,'正在讀取待審核照片…');
   const list=await API.table('dlym_photo_submissions?select=id,nickname,age,city,bio,private_path,approved_path,status,created_at&order=created_at.desc&limit=150',{role:'admin'});
   renderList($('adminPendingList'),list.filter(v=>v.status==='pending'));
   renderList($('adminApprovedList'),list.filter(v=>v.status==='approved'));
   status(out,`讀取完成：${list.filter(v=>v.status==='pending').length} 件待審、${list.filter(v=>v.status==='approved').length} 件已公開。`);
 }
 function button(text,klass,onClick){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=klass;b.addEventListener('click',onClick);return b;}
 async function moderate(row,approve){
   if(busy)return;
   if(!confirm(approve?'確定通過這張照片，讓玩家公開看見？':'確定拒絕這張投稿？'))return;
   busy=true;
   try{
     status(out,approve?'正在發佈審核通過的照片…':'正在拒絕投稿…');
     if(approve){
       try{await API.publishPrivate(row.private_path,row.id);}
       catch(err){if(!/already exists|duplicate|409/i.test(err.message))throw err;}
     }
     await API.rpc('dlym_review_photo',{p_id:row.id,p_approve:approve},'admin');
     // After approval the public copy is authoritative; after rejection the
     // private original is no longer needed. Reduce retained sensitive photos.
     try{await API.deletePrivate(row.private_path);}
     catch(err){console.warn('Original cleanup needs attention:',err.message);}
     await listPhotos();
   }catch(err){status(out,'審核失敗：'+err.message+'。請勿重複狂按；若圖片已複製，重新整理後再處理。');}
   finally{busy=false;}
 }
 async function optimizePublished(row){
   if(busy)return;
   const path=row.approved_path;
   if(!/^approved\/[0-9a-f-]{36}\.(webp|jpg)$/.test(path||'')){
     status(out,'照片路徑不正確，無法安全壓縮。');return;
   }
   if(!confirm(`將「${row.nickname}」已公開的照片壓縮到 500 KB 以下並覆蓋原圖嗎？\n此動作只限管理員。`))return;
   busy=true;
   try {
     status(out,'⏳ 正在讀取已公開照片…');
     const existing=await API.downloadPublicPhoto(path);
     if(existing.size<=500*1024){status(out,`✅ 這張已是 ${Math.ceil(existing.size/1024)} KB，無需壓縮。`);return;}
     const mime=path.endsWith('.jpg')?'image/jpeg':'image/webp';
     status(out,`⏳ 原圖 ${Math.round(existing.size/1024)} KB，正在安全壓縮…`);
     const compressed=await compress(existing,{preserveMime:mime});
     if(compressed.type!==mime)throw new Error('轉檔格式與既有副檔名不同，已取消覆蓋。');
     if(compressed.size>=existing.size){status(out,'原照片已足夠小，保留原始畫質。');return;}
     status(out,`⏳ 壓縮後 ${Math.round(compressed.size/1024)} KB，正在更新公開圖…`);
     await API.overwritePublicPhoto(path,compressed);
     await listPhotos();
     status(out,`✅ 已完成：${Math.round(existing.size/1024)} → ${Math.round(compressed.size/1024)} KB。社群快取更新可能需要一點時間。`);
   }catch(err){status(out,'❌ 舊照片優化失敗（原檔不會由本程式主動刪除）：'+err.message);}
   finally{busy=false;}
 }
 async function unpublish(row){
   if(busy||!confirm('確定把這張照片從遊戲撤下，並刪除公開檔案？'))return;
   busy=true;
   try{
     status(out,'正在下架…');
     // Stop public game feed first, then remove the publicly retrievable bytes.
     await API.rpc('dlym_unpublish_photo',{p_id:row.id},'admin');
     await API.deletePublic(row.approved_path);
     await listPhotos();
   }catch(err){status(out,'下架過程有部分步驟未完成：'+err.message+'。請檢查 Storage 的 dlym-approved 是否還有該檔案。');}
   finally{busy=false;}
 }
 function formatPhotoBytes(size){
   if(!Number.isFinite(size)||size<=0)return '無法取得';
   return size>=1048576?(size/1048576).toFixed(2)+' MB':Math.ceil(size/1024)+' KB';
 }
 async function approvedPhotoSize(path){
   // HEAD avoids a second full download; the <img> tag already handles the photo itself.
   const res=await fetch(API.publicPhotoUrl(path),{method:'HEAD',cache:'no-store'});
   if(!res.ok)throw new Error('HEAD '+res.status);
   const bytes=Number(res.headers.get('content-length'));
   return Number.isFinite(bytes)&&bytes>0?bytes:null;
 }
 function releasePreviewUrls(container){
   container.querySelectorAll('img[data-review-preview]').forEach(img=>{
     if(img.src.startsWith('blob:'))URL.revokeObjectURL(img.src);
   });
 }
 function renderList(container,rows){
   releasePreviewUrls(container);
   container.replaceChildren();
   if(!rows.length){const empty=document.createElement('div');empty.className='empty-message';empty.textContent='目前沒有這類投稿。';container.append(empty);return;}
   for(const row of rows){
     const item=document.createElement('article');item.className='review-item';
     const img=document.createElement('img');img.className='review-image';img.alt='投稿照片，僅供審核';
     const details=document.createElement('div');details.className='review-details';
     const heading=document.createElement('strong');heading.textContent=`${row.nickname} · ${row.age} 歲`;
     const bio=document.createElement('p');bio.textContent=`${row.city}｜${row.bio}`;
     const meta=document.createElement('small');meta.textContent=new Date(row.created_at).toLocaleString('zh-TW');
     const sizeLabel=document.createElement('span');sizeLabel.className='review-file-size';
     sizeLabel.textContent='📦 檔案大小：讀取中…';
     if(row.status==='approved'){
       img.src=API.publicPhotoUrl(row.approved_path);
       approvedPhotoSize(row.approved_path).then(bytes=>{
         if(item.isConnected)sizeLabel.textContent='📦 檔案大小：'+formatPhotoBytes(bytes);
       }).catch(()=>{if(item.isConnected)sizeLabel.textContent='📦 檔案大小：無法取得';});
     }else{
       img.dataset.reviewPreview='true';
       API.previewPrivate(row.private_path).then(blob=>{
         if(!item.isConnected)return;
         sizeLabel.textContent='📦 檔案大小：'+formatPhotoBytes(blob.size);
         img.src=URL.createObjectURL(blob);
       }).catch(()=>{
         if(!item.isConnected)return;
         sizeLabel.textContent='📦 檔案大小：無法取得';
         img.alt='圖片讀取失敗';
       });
     }
     const actions=document.createElement('div');actions.className='review-buttons';
     if(row.status==='pending'){
       actions.append(button('✓ 通過','approve',()=>moderate(row,true)),button('✕ 拒絕','reject',()=>moderate(row,false)));
     }else {actions.append(button('🗜️ 壓縮舊照片','approve',()=>optimizePublished(row)),button('撤下照片','reject',()=>unpublish(row)));}
     details.append(heading,bio,sizeLabel,meta,actions);item.append(img,details);container.append(item);
   }
 }
 loginForm.addEventListener('submit',async ev=>{
   ev.preventDefault();if(busy)return;busy=true;
   try{
     status(out,'正在登入並確認審核權限…');
     await API.adminLogin($('adminEmail').value.trim(),$('adminPassword').value);
     $('adminPassword').value='';loginForm.classList.add('hidden');workspace.classList.remove('hidden');await listPhotos();
   }catch(err){status(out,'無法進入審核中心：'+err.message);}
   finally{busy=false;}
 });
 $('adminRefresh').addEventListener('click',()=>listPhotos().catch(err=>status(out,'重新整理失敗：'+err.message)));
 $('adminLogout').addEventListener('click',()=>{API.logoutAdmin();workspace.classList.add('hidden');loginForm.classList.remove('hidden');status(out,'已登出。');});
})();
