/* 別滑到班長的媽媽 — local-only army scorecard + collectible achievements v2. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const KEY='army_sergeant_mom_achievements_v2';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const n=x=>Math.max(0,Number(x)||0);
const A=[
 ['first','🪖','交友新兵報到','完成第一局交友鑑測','普通',s=>true],
 ['like1','♥️','愛心有在上班','一局 LIKE 至少 1 位正常路人','普通',s=>s.likes>=1],
 ['like5','💌','五個愛心不算愛','一局 LIKE 至少 5 位正常路人','普通',s=>s.likes>=5],
 ['like10','🔥','聯誼中心營業中','一局 LIKE 至少 10 位正常路人','稀有',s=>s.likes>=10],
 ['like15','💝','全連都知道你單身','一局 LIKE 至少 15 位正常路人','稀有',s=>s.likes>=15],
 ['like20','📱','國軍交友代言人','一局 LIKE 至少 20 位正常路人','史詩',s=>s.likes>=20],
 ['like30','👑','交友軟體董事長','一局 LIKE 至少 30 位正常路人','傳說',s=>s.likes>=30,true],
 ['survive','🛡️','班長媽媽防火牆','安全撐滿 45 秒','普通',s=>s.survived],
 ['safe10','🎖️','滑卡一等兵','通關且 LIKE 至少 10 人','稀有',s=>s.survived&&s.likes>=10],
 ['safe20','🏅','榮譽交友士官長','通關且 LIKE 至少 20 人','史詩',s=>s.survived&&s.likes>=20],
 ['safeClean','🕊️','媽媽與路人都平安','通關且沒有錯左滑路人，至少滑 5 張','史詩',s=>s.survived&&s.skipped===0&&s.choices>=5],
 ['safeS','💯','長官親自頒愛心','安全存活且獲得 S 級','傳說',s=>s.survived&&s.points>=90],
 ['mom','💔','義母候選人','右滑班長的媽媽而失敗','普通',s=>s.likedMom],
 ['direct','🤦','正面照還認不出來','右滑媽媽獨照而失敗','普通',s=>s.culpritKind==='direct'],
 ['hiddenBad','🔍','背景那位是誰啦','右滑背景有媽媽的照片而失敗','稀有',s=>s.culpritKind==='background'],
 ['fail10','⚡','光速認親','10 秒內就滑到媽媽','稀有',s=>s.likedMom&&s.elapsed<=10],
 ['fail3','🚑','報到比退伍還快','3 秒內就滑到媽媽','史詩',s=>s.likedMom&&s.elapsed<=3,true],
 ['failLate','🥲','差一步就放假','撐過 35 秒後才滑到媽媽','史詩',s=>s.likedMom&&s.elapsed>=35],
 ['fail10likes','📋','十個愛心換一張檢討','LIKE 至少 10 人才滑到媽媽','稀有',s=>s.likedMom&&s.likes>=10],
 ['failZero','🫠','一個對象都沒找到','0 LIKE 就滑到媽媽','普通',s=>s.likedMom&&s.likes===0],
 ['firstMom','🪦','第一位媽媽就認親','遇到的第一位媽媽就右滑失敗','傳說',s=>s.likedMom&&s.avoided===0,true],
 ['avoid1','🙅','有眼睛的士兵','成功避開至少 1 張媽媽照片','普通',s=>s.avoided>=1],
 ['avoid3','👓','眼鏡有擦乾淨','一局避開至少 3 張媽媽照片','稀有',s=>s.avoided>=3],
 ['avoid5','🕵️','反媽媽雷達','一局避開至少 5 張媽媽照片','史詩',s=>s.avoided>=5],
 ['avoid8','🛰️','長官的衛星監控','一局避開至少 8 張媽媽照片','傳說',s=>s.avoided>=8,true],
 ['hidden1','🪞','鏡子裡面有長官','避開至少 1 張背景媽媽','普通',s=>s.hiddenAvoided>=1],
 ['hidden3','🔎','角落藏人專家','避開至少 3 張背景媽媽','稀有',s=>s.hiddenAvoided>=3],
 ['hidden5','🎯','媽媽在哪都看得到','避開至少 5 張背景媽媽','傳說',s=>s.hiddenAvoided>=5,true],
 ['direct3','👩','媽媽本人請靠邊','避開至少 3 張媽媽獨照','稀有',s=>s.avoided-s.hiddenAvoided>=3],
 ['wrong1','🧊','寧可錯殺路人','錯左滑至少 1 位正常路人','普通',s=>s.skipped>=1],
 ['wrong5','🥶','今天誰都別想交往','錯左滑至少 5 位正常路人','稀有',s=>s.skipped>=5],
 ['wrong10','🚪','交友軟體被你關門','錯左滑至少 10 位正常路人','史詩',s=>s.skipped>=10,true],
 ['zeroLikes','🕊️','全營禁愛令','存活 45 秒且 0 LIKE','稀有',s=>s.survived&&s.likes===0],
 ['combo3','🥉','連續三張沒出包','最高連續正確判斷達 3 次','普通',s=>s.maxCombo>=3],
 ['combo7','🥈','愛心連射模式','最高連續正確判斷達 7 次','稀有',s=>s.maxCombo>=7],
 ['combo12','🥇','班長也來請教你','最高連續正確判斷達 12 次','史詩',s=>s.maxCombo>=12],
 ['combo20','✨','交友鑑測無雙','最高連續正確判斷達 20 次','傳說',s=>s.maxCombo>=20,true],
 ['momStreak2','🧹','連續兩次掃掉媽媽','連續 2 次正確避開媽媽','稀有',s=>s.maxMomStreak>=2],
 ['momStreak4','🧯','媽媽消防隊隊長','連續 4 次正確避開媽媽','傳說',s=>s.maxMomStreak>=4,true],
 ['fastLike','🏃','集合前還能滑三張','前 5 秒 LIKE 3 人','稀有',s=>s.earlyLikes>=3],
 ['cards10','📇','十張履歷面試官','一局滑過至少 10 張卡片','普通',s=>s.choices>=10],
 ['cards20','🪪','全營月老辦事處','一局滑過至少 20 張卡片','稀有',s=>s.choices>=20],
 ['cards35','📚','人事官看到眼花','一局滑過至少 35 張卡片','史詩',s=>s.choices>=35,true],
 ['tap5','👆','手指比腦袋快','一局使用按鈕至少滑卡 5 次','普通',s=>s.buttonUses>=5],
 ['drag5','👉','右手滑到抽筋','一局拖曳卡片至少 5 次','普通',s=>s.dragUses>=5],
 ['keyboard5','⌨️','鍵盤兵不需要手機','一局使用鍵盤至少滑卡 5 次','稀有',s=>s.keyboardUses>=5],
 ['mixed','🎮','十八般武藝都會滑','單局用過按鈕、拖曳和鍵盤','史詩',s=>s.buttonUses>0&&s.dragUses>0&&s.keyboardUses>0,true],
 ['score70','📜','班長勉強肯蓋章','一局得到 70 分以上','稀有',s=>s.points>=70],
 ['score100','👑','愛心軍功狀','100 分滿分且安全存活','傳說',s=>s.points===100&&s.survived,true]
];
const ACH=A.map(([id,icon,name,desc,rarity,test,secret=false])=>({id,icon,name,desc,rarity,test,secret}));
function scoreFor(s){
 const p=s.survived
  ?28+s.likes*3+s.avoided*2+s.hiddenAvoided*3+Math.min(14,s.maxCombo*1.4)-s.skipped*2
  :Math.min(59,s.likes*2+s.avoided*3+s.hiddenAvoided*4+Math.min(12,s.maxCombo)-s.skipped*2);
 return clamp(Math.round(p),0,100);
}
const gradeFor=p=>p>=90?'S':p>=75?'A':p>=55?'B':p>=35?'C':p>=20?'D':'F';
function load(){
 try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');return {
  ids:Array.isArray(p.ids)?[...new Set(p.ids.filter(id=>ACH.some(a=>a.id===id)))]:[],
  played:Math.floor(n(p.played)),best:clamp(Math.floor(n(p.best)),0,100)
 }}catch{return {ids:[],played:0,best:0}}
}
let progress=load(),last=null,filter='all',previousFocus=null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress))}catch{}}
const LINES=[
 [s=>s.likedMom&&s.culpritKind==='background',[
  '媽媽藏在角落，你的愛心卻精準導航過去了。',
  '打靶要看目標，滑卡要看背景。你這次兩項都得重測。',
  '這麼小一張臉你也找得到，怎麼偏偏按了 LIKE？']],
 [s=>s.likedMom&&s.culpritKind==='direct',[
  '正面照都認不出來，班長說你不用再解釋了。',
  '媽媽本人直接站出來，你照樣按愛心，國軍需要你的勇氣。',
  '你成功滑進班長家庭群組，恭喜。']],
 [s=>s.survived&&s.likes>=20,[
  '45 秒滑出半個連的人脈，下次聯誼活動交給你主持。',
  '班長：有這個手速，集合時就不要遲到了。',
  '全連都知道你想脫單了，先去掃寢室。']],
 [s=>s.survived&&s.hiddenAvoided>=3,[
  '連鏡子裡的媽媽都躲得掉，偵察能力可以寫進考績。',
  '背景媽媽全部被識破，班長終於相信你有在看照片。',
  '眼力值得表揚，但不要拿這個請榮譽假。']],
 [s=>s.survived&&s.likes===0,[
  '整場零個愛心，你是在執行全營禁愛令嗎？',
  '45 秒沒找到對象，但成功維護班長家族安全。',
  '全世界都被你左滑，只有班長同意這份判斷。']],
 [s=>s.survived,[
  '恭喜沒滑到班長的媽媽，晚點名可以挺胸站著。',
  '交友鑑測過關！班長說很好，然後回去擦地板。',
  '你成功閃開媽媽陷阱，國軍之光暫時由你保管。',
  '媽媽有避開，愛心有送出去，班長終於不用找你談話。']],
 [s=>true,[
  '一份交友鑑測換一份檢討。班長正在印表機前等你。',
  '我叫你找對象，沒有叫你找新的家庭關係。',
  '全營那麼多人，你偏偏跟班長家屬扯上關係。',
  '重點不是你滑得多快，是你到底滑到誰。']]
];
const HEAD=[
 [s=>s.likedMom&&s.culpritKind==='background','班長的媽媽無所不在','軍紀調查'],
 [s=>s.likedMom&&s.elapsed<10,'進場不到十秒就認親','重大違規'],
 [s=>s.likedMom,'班長正在找你','檢討預備'],
 [s=>s.survived&&s.points>=90,'國軍交友界傳說','鑑測特優'],
 [s=>s.survived&&s.likes>=15,'愛心連隊模範兵','優等'],
 [s=>s.survived&&s.likes===0,'交友軟體和平使者','保守安全'],
 [s=>true,'班長媽媽保衛戰成功','安全過關']
];
function finalize(raw){
 const s={
  likedMom:!!raw.likedMom,survived:!raw.likedMom,culpritKind:raw.culpritKind||null,
  likes:n(raw.likes)|0,avoided:n(raw.avoided)|0,hiddenAvoided:n(raw.hiddenAvoided)|0,
  skipped:n(raw.skipped)|0,maxCombo:n(raw.maxCombo)|0,maxMomStreak:n(raw.maxMomStreak)|0,
  earlyLikes:n(raw.earlyLikes)|0,choices:n(raw.choices)|0,elapsed:clamp(n(raw.elapsed)/1000,0,45),
  buttonUses:n(raw.buttonUses)|0,dragUses:n(raw.dragUses)|0,keyboardUses:n(raw.keyboardUses)|0
 };
 s.points=scoreFor(s);s.grade=gradeFor(s.points);
 const old=new Set(progress.ids),earned=ACH.filter(a=>a.test(s)).sort((a,b)=>['傳說','史詩','稀有','普通'].indexOf(a.rarity)-['傳說','史詩','稀有','普通'].indexOf(b.rarity));
 const fresh=earned.filter(a=>!old.has(a.id));
 progress.ids=[...new Set([...progress.ids,...earned.map(a=>a.id)])];
 progress.best=Math.max(progress.best,s.points);progress.played++;
 save();last={s,earned,fresh};
 return {points:s.points,grade:s.grade,newAchievements:fresh.map(a=>a.id)};
}
const make=(tag,cls,value)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(value!==undefined)el.textContent=String(value);return el
};
function paintMedals(){
 const root=$('armyReportAwards');root.replaceChildren();
 const {earned,fresh}=last;
 const selection=[...fresh,...earned.filter(a=>!fresh.includes(a))].slice(0,3);
 if(!selection.length){root.append(make('p','armyNoAwards','本輪還沒拿到成就，班長叫你再認真一點。'));return}
 for(const a of selection){
  const btn=make('button','armyAwardCard');btn.type='button';
  btn.append(make('span','armyAwardIcon',a.icon),make('strong','',a.name),make('small','',a.rarity));
  if(fresh.includes(a))btn.append(make('b','armyNew','NEW'));
  btn.addEventListener('click',()=>showDetail(a));
  root.append(btn);
 }
}
function present(){
 if(!last)return false;
 const s=last.s;
 const head=HEAD.find(item=>item[0](s));
 const texts=LINES.find(item=>item[0](s))[1];
 $('armyReportTitle').textContent=head[1];
 $('armyReportSub').textContent=(s.survived?'鑑測安全完成':'交友鑑測失敗')+' · '+s.grade+' 級';
 $('armyReportStamp').textContent=head[2];
 $('armyReportPoints').textContent=s.points;
 $('armyReportGrade').textContent=s.grade+' 級';
 $('armyReportBest').textContent='歷史最高 '+progress.best+' 分';
 $('armyReportLikes').textContent=s.likes;
 $('armyReportAvoided').textContent=s.avoided;
 $('armyReportHidden').textContent=s.hiddenAvoided;
 $('armyReportTime').textContent=s.elapsed.toFixed(1)+' 秒';
 $('armyReportComment').textContent=texts[Math.floor(Math.random()*texts.length)];
 $('armyReportAchievementCount').textContent='本輪達成 '+last.earned.length+' 項 · 新收集 '+last.fresh.length+' 項';
 $('armyReportGalleryButton').textContent='🏅 成就圖鑑 '+progress.ids.length+' / '+ACH.length;
 paintMedals();
 $('resultScreen').classList.add('hidden');
 $('armyReportScreen').classList.remove('hidden');
 // ARMY3 training receipt: display only, does not change the minigame.
 window.armyProgression?.rewardPanel('swipe',s.points,$('armyReportPoints').closest('.armyReportScore')||$('armyReportPoints'));
 return true;
}
function renderGallery(){
 $('armyGalleryCount').textContent='已收藏 '+progress.ids.length+' / '+ACH.length+' 項';
 for(const [id,v] of [['armyFilterAll','all'],['armyFilterUnlocked','unlocked'],['armyFilterLocked','locked']]){
  const btn=$(id);btn.classList.toggle('selected',filter===v);btn.setAttribute('aria-pressed',String(filter===v));
 }
 const grid=$('armyGalleryItems');grid.replaceChildren();
 const subset=ACH.filter(a=>filter==='all'||(filter==='unlocked'?progress.ids.includes(a.id):!progress.ids.includes(a.id)));
 for(const a of subset){
  const owned=progress.ids.includes(a.id);
  const item=make('button','armyGalleryItem'+(owned?'':' locked'));item.type='button';
  item.append(make('span','armyGalleryIcon',owned?a.icon:'🔒'));
  item.append(make('strong','',owned||!a.secret?a.name:'？？？'));
  item.append(make('small','',a.rarity+' · '+(owned?'已收集':'未解鎖')));
  item.append(make('p','',owned||!a.secret?a.desc:'神秘成就，條件保密'));
  if(!owned&&a.secret)item.disabled=true;
  else item.addEventListener('click',()=>showDetail(a));
  grid.append(item);
 }
}
function gallery(){
 filter='all';renderGallery();
 previousFocus=document.activeElement;
 $('armyGallery').classList.remove('hidden');
 $('armyGalleryClose').focus();
}
function showDetail(a){
 $('armyDetailIcon').textContent=a.icon;
 $('armyDetailTitle').textContent=a.name;
 $('armyDetailRarity').textContent=a.rarity;
 $('armyDetailCondition').textContent=a.desc;
 $('armyDetailState').textContent=progress.ids.includes(a.id)?'✓ 已收進國軍交友榮譽簿':'尚未解鎖，班長等著看你的成績。';
 $('armyDetail').classList.remove('hidden');$('armyDetailClose').focus();
}
function closeModal(id){
 $(id).classList.add('hidden');
 if(id==='armyDetail'&&!$('armyGallery').classList.contains('hidden'))$('armyGalleryClose').focus();
 else previousFocus?.focus?.();
}
$('armyReportGalleryButton').addEventListener('click',gallery);
$('armyGalleryClose').addEventListener('click',()=>closeModal('armyGallery'));
$('armyDetailClose').addEventListener('click',()=>closeModal('armyDetail'));
for(const [id,val] of [['armyFilterAll','all'],['armyFilterUnlocked','unlocked'],['armyFilterLocked','locked']]){
 $(id).addEventListener('click',()=>{filter=val;renderGallery()});
}
for(const id of ['armyGallery','armyDetail'])$(id).addEventListener('pointerdown',e=>{if(e.target===$(id))closeModal(id)});
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if(!$('armyDetail').classList.contains('hidden')){closeModal('armyDetail');e.preventDefault()}
 else if(!$('armyGallery').classList.contains('hidden')){closeModal('armyGallery');e.preventDefault()}
});
window.armySwipeReport={finalize,present,gallery,scoreFor,gradeFor,achievements:ACH.map(({test,...rest})=>rest),progress:()=>({...progress}),latest:()=>last};
})();
