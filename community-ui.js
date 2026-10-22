/* DON'T LIKE YOUR MOM v0.7.0 submission and administrator UI. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const API=window.DLYMCommunityAPI;
 const sendForm=$('communitySubmissionForm');
 const status=(target,text)=>{target.textContent=text;};
 const utfLength=s=>[...s].length;
 async function compress(file){
   if(!file||!file.type.startsWith('image/'))throw new Error('請選擇圖片檔案。');
   if(file.size>8*1024*1024)throw new Error('原始照片上限是 8 MB，請選小一點的檔案。');
   const url=URL.createObjectURL(file);
   try{
     const image=new Image();
     const ready=new Promise((res,rej)=>{image.onload=res;image.onerror=()=>rej(new Error('圖片無法解碼。若是 HEIC，請先在相簿轉成 JPG 再投稿。'));});
     image.src=url;await ready;
     const max=1400,ratio=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
     const w=Math.max(1,Math.round(image.naturalWidth*ratio)),h=Math.max(1,Math.round(image.naturalHeight*ratio));
     if(w*h>5e6)throw new Error('照片尺寸超出可處理範圍');
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const ctx=canvas.getContext('2d');if(!ctx)throw new Error('瀏覽器無法處理圖片');
     ctx.drawImage(image,0,0,w,h);
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.80));
     if(!blob||blob.type!=='image/webp')throw new Error('這個瀏覽器無法輸出 WebP，請改用 Chrome 或 Safari。');
     if(blob.size>2*1024*1024)throw new Error('壓縮後仍超過 2MB，請改選較小照片。');
     return blob; // canvas output drops original EXIF location metadata
   }finally{URL.revokeObjectURL(url);}
 }
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
       status(out,'⏳ 正在轉換圖片、移除定位中繼資料…');
       const bytes=await compress(file.files[0]);
       status(out,'⏳ 正在建立安全的投稿身份…');
       const session=await API.authFor('guest');
       const owner=session.user?.id || JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub;
       if(!/^[a-f0-9-]{36}$/i.test(owner))throw new Error('投稿身份無效，請重新開啟頁面。');
       const path=owner+'/'+crypto.randomUUID()+'.webp';
       status(out,'⏳ 正在上傳到私人待審區…');
       await API.uploadPrivate(bytes,path);
       status(out,'⏳ 已安全上傳，正在建立待審紀錄…');
       await API.table('dlym_photo_submissions',{method:'POST',role:'guest',body:{nickname:name,age,city,bio,private_path:path,consent:true}});
       status(out,'✅ 投稿成功！照片目前只有站長能審核，核准後才會出現在自由模式。');
       sendForm.reset();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;picture.hidden=true;holder.hidden=false;
     }catch(err){status(out,'❌ 送出失敗：'+err.message+'（若提示無權限，請確認 Supabase SQL 及匿名登入已啟用。）');}
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
 function renderList(container,rows){
   container.replaceChildren();
   if(!rows.length){const empty=document.createElement('div');empty.className='empty-message';empty.textContent='目前沒有這類投稿。';container.append(empty);return;}
   for(const row of rows){
     const item=document.createElement('article');item.className='review-item';
     const img=document.createElement('img');img.className='review-image';img.alt='投稿照片，僅供審核';
     if(row.status==='approved')img.src=API.publicPhotoUrl(row.approved_path);
     else API.previewPrivate(row.private_path).then(blob=>{if(item.isConnected)img.src=URL.createObjectURL(blob);}).catch(()=>{img.alt='圖片讀取失敗';});
     const details=document.createElement('div');details.className='review-details';
     const heading=document.createElement('strong');heading.textContent=`${row.nickname} · ${row.age} 歲`;
     const bio=document.createElement('p');bio.textContent=`${row.city}｜${row.bio}`;
     const meta=document.createElement('small');meta.textContent=new Date(row.created_at).toLocaleString('zh-TW');
     const actions=document.createElement('div');actions.className='review-buttons';
     if(row.status==='pending'){
       actions.append(button('✓ 通過','approve',()=>moderate(row,true)),button('✕ 拒絕','reject',()=>moderate(row,false)));
     }else actions.append(button('撤下照片','reject',()=>unpublish(row)));
     details.append(heading,bio,meta,actions);item.append(img,details);container.append(item);
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
