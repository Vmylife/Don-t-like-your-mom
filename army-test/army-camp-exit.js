/* ARMY3 fourth minigame — cross-repository, same-origin camp return bridge.
 * Uses only bundled artwork; no Supabase/networked gameplay systems.
 * Location: /Don-t-like-your-mom/army-test/index.html.
 */
(()=>{
 'use strict';
 const fromCamp=new URLSearchParams(location.search).has('fromCamp');
 const button=document.getElementById('armyCampExit');
 const reportHome=document.getElementById('armyReportHome');
 if(!button)return;
 const BASE=new URL('/ARMY3/index.html?armyResume=1&v=200',location.origin);
 const SAVE_KEY='ARMY3_camp_resume_v1';
 let leaving=false;
 function exitToCamp(){
  if(leaving)return;
  leaving=true;button.disabled=true;button.textContent='返回中…';
  // All Vmylife GitHub Pages project paths share the same origin.
  // Return the live camp iframe without reloading it when possible.
  try{
   const frame=window.frameElement;
   if(window.parent!==window&&frame?.dataset?.armyPrewarmedGame==='swipe'){
    window.parent.postMessage({type:'ARMY3_RETURN_TO_CAMP'},location.origin);
    return;
   }
  }catch(error){console.warn('交友鑑測預載返回改走備援',error)}
  // Cold navigation fallback: sessionStorage is shared by all Pages project
  // paths under the origin. Mark the existing ARMY3 snapshot as returning.
  try{
   const data=JSON.parse(sessionStorage.getItem(SAVE_KEY)||'null');
   if(data?.version===1&&data?.status==='away'&&
      Number.isFinite(data.player?.x)&&Number.isFinite(data.player?.z)){
    data.status='returning';
    sessionStorage.setItem(SAVE_KEY,JSON.stringify(data));
   }
  }catch(error){console.warn('交友鑑測返回存檔標記失敗',error)}
  location.replace(BASE.href);
 }
 button.addEventListener('pointerdown',event=>event.stopPropagation(),{passive:true});
 button.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  exitToCamp();
 });
 if(fromCamp&&reportHome){
  reportHome.textContent='返回軍營';
  // Prevent the standalone game's home handler when returning to camp.
  reportHome.addEventListener('click',event=>{
   event.stopImmediatePropagation();
   event.preventDefault();
   exitToCamp();
  },true);
 }
 window.armySwipeCampExit=exitToCamp;
})();
