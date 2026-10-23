/* DON'T LIKE YOUR MOM v0.8.8 - public moderated guestbook */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const API=window.DLYMCommunityAPI;
 const labels={chat:'💬 閒聊',suggestion:'💡 建議',bug:'🐛 問題'};
 let kind='all',offset=0,total=0,fetchSeq=0,busy=false;
 const status=(id,s)=>{$(id).textContent=s;};
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
 const date=(s)=>{
   try{return new Date(s).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}
   catch{return '';}
 };
 function postCard(p){
   const article=node('article','board-post'+(p.pinned?' is-pinned':''));
   const head=node('div','board-post-head');
   head.append(node('div','board-author',p.nickname),node('time','board-post-date',date(p.created_at)));
   const tags=node('div','board-post-tags');
   tags.append(node('span','board-tag',labels[p.category]||'💬 閒聊'));
   if(p.pinned)tags.append(node('span','board-tag pin','📌 站長置頂'));
   const body=node('p','board-post-content',p.content);
   const actions=node('div','board-post-actions');
   const report=node('button','board-report','⚑ 檢舉'); report.type='button';
   report.addEventListener('click',()=>reportPost(p.id));actions.append(report);
   article.append(head,tags,body,actions);return article;
 }
 async function load(append=false){
   const sequence=++fetchSeq;
   if(!append){offset=0;$('boardPosts').replaceChildren();}
   $('boardLoadMore').disabled=true;
   status('boardReadStatus','⏳ 正在取得公開留言…');
   try{
     const data=await API.rpc('dlym_board_feed',{p_category:kind,p_limit:20,p_offset:offset});
     if(sequence!==fetchSeq)return;
     const items=Array.isArray(data?.posts)?data.posts:[];
     total=Number(data?.total)||0;
     for(const p of items)$('boardPosts').append(postCard(p));
     offset+=items.length;
     if(!offset)$('boardPosts').append(node('div','board-placeholder','目前沒有這個分類的公開留言。\n快來當第一個發表建議的人！'));
     status('boardReadStatus',`目前 ${total} 則已公開留言 · 送出後需站長審核才會出現`);
     $('boardLoadMore').classList.toggle('hidden',offset>=total||!items.length);
   }catch(err){
     if(sequence!==fetchSeq)return;
     status('boardReadStatus','❌ 無法讀取留言：'+String(err?.message||err)+'（若首次安裝，請先執行留言板 SQL）');
     $('boardLoadMore').classList.add('hidden');
   }finally{$('boardLoadMore').disabled=false;}
 }
 async function reportPost(id){
   const answer=prompt('檢舉原因：\n1 廣告／洗版\n2 辱罵／騷擾\n3 個資／隱私\n4 其他\n輸入 1～4，按取消就不檢舉');
   if(answer===null)return;
   const reason=({1:'spam',2:'abuse',3:'privacy',4:'other'})[answer.trim()];
   if(!reason){alert('請輸入 1～4');return;}
   try{
     await API.authFor('guest');
     await API.rpc('dlym_board_report',{p_post:id,p_reason:reason},'guest');
     alert('✅ 已收到檢舉，站長會在後台查看。');
   }catch(err){alert('檢舉失敗：'+String(err?.message||err));}
 }
 const form=$('boardForm'),button=$('boardSubmit'),content=$('boardContent');
 try{$('boardNickname').value=localStorage.getItem('dlym_board_nickname_v1')||'';}catch{}
 content.addEventListener('input',()=>{$('boardChars').textContent=[...content.value].length+' / 400';});
 form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy)return;
   const name=$('boardNickname').value.trim(),category=$('boardCategory').value,body=content.value.trim();
   if([...name].length<2||[...name].length>18||[...body].length<6||[...body].length>400){
     status('boardPostStatus','暱稱需 2～18 字，留言需 6～400 字。');return;
   }
   busy=true;button.disabled=true;
   status('boardPostStatus','⏳ 正在建立匿名身份並送出留言…');
   try{
     await API.authFor('guest');
     await API.rpc('dlym_board_submit',{p_nickname:name,p_category:category,p_content:body},'guest');
     try{localStorage.setItem('dlym_board_nickname_v1',name);}catch{}
     content.value='';$('boardChars').textContent='0 / 400';
     status('boardPostStatus','✅ 留言送出成功！目前是待審狀態，站長通過後所有玩家才會看到。');
   }catch(err){status('boardPostStatus','❌ 送出失敗：'+String(err?.message||err));}
   finally{busy=false;button.disabled=false;}
 });
 document.querySelectorAll('.board-filters [data-kind]').forEach(b=>b.addEventListener('click',()=>{
   kind=b.dataset.kind;
   document.querySelectorAll('.board-filters [data-kind]').forEach(el=>{
     const on=el===b;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));
   });load();
 }));
 $('boardReload').addEventListener('click',()=>load());
 $('boardLoadMore').addEventListener('click',()=>load(true));
 if(!API?.configured){status('boardReadStatus','請先設定原本的 Supabase leaderboard-config.js。');button.disabled=true;}
 else load();
})();
