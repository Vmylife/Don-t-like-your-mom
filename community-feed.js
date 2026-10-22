/* v0.7.0: approved photos join FREE mode only; deterministic duels stay on 99 fixed images. */
(() => {
  'use strict';
  const API=window.DLYMCommunityAPI;
  let cards=[];
  let loading=null;
  let fetchedAt=0;
  async function load(){
    if(!API?.configured)return [];
    if(loading)return loading;
    if(Date.now()-fetchedAt < 120000)return cards;
    loading=(async()=>{
      try{
        const incoming=await API.rpc('dlym_approved_photos');
        if(!Array.isArray(incoming))return cards;
        cards=incoming.filter(x=>x && /^approved\/[0-9a-f-]{36}\.webp$/.test(x.photo_path||'')).map(x=>({
          file:API.publicPhotoUrl(x.photo_path),
          url:API.publicPhotoUrl(x.photo_path),
          name:String(x.nickname||'玩家投稿').slice(0,24),
          age:Number(x.age)||25,city:String(x.city||'台灣').slice(0,24),
          bio:String(x.bio||'玩家投稿的生活照片').slice(0,100),
          persona:1
        }));
        fetchedAt=Date.now();
        return cards;
      }catch(err){console.warn('[community] approved photo query skipped:',err.message);return cards;}
      finally{loading=null;}
    })();
    return loading;
  }
  function artForFree(baseArt){
    return {...baseArt,normal:baseArt.normal.concat(cards)};
  }
  window.DLYMCommunity={load,artForFree,get count(){return cards.length}};
})();
