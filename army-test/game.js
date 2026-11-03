/* 別滑到班長的媽媽 — ARMY standalone swipe test v1.
   Local single-player only. No Supabase, realtime multiplayer, community
   content, achievements, analytics, uploads, sharing or service worker. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ART = window.ART_DATA;
  const TIME_LIMIT = 45000;
  const LEVELS = [
    {score:0,name:'先認清班長的媽媽',mom:.15,hidden:0},
    {score:5,name:'媽媽開始亂入背景',mom:.24,hidden:.5},
    {score:12,name:'媽媽藏在人群裡',mom:.32,hidden:.6},
    {score:22,name:'眼尖地獄',mom:.40,hidden:.65}
  ];
  const ROASTS = [
    '班長：你對我媽按愛心之前，有沒有先想一下後果？',
    '這個交友軟體是給你找對象，不是給你找家長的。',
    '我媽都能認成戀愛對象，你今天晚點名站前排。',
    '連班長的媽媽都敢右滑，你真的很有勇氣。',
    '你這不是喜歡，是自願簽下留營切結書。',
    '幹得漂亮，現在換班長親自跟你談談。',
    '今天的國軍交友鑑測，就敗在一張熟悉的臉。',
    '媽媽：你不是我兒子的學弟嗎？',
    '班長：這張截圖我已經存起來，等一下來我辦公室。',
    '全營交友對象那麼多，你偏偏選到我媽。',
    '你是沒看到照片背景，還是想跟班長當親戚？',
    '班長：你先別解釋，我已經看到你的 LIKE 了。'
  ];
  const ui = {
    welcome:$('welcomeScreen'),game:$('gameScreen'),result:$('resultScreen'),
    start:$('startButton'),retry:$('retryButton'),home:$('homeButton'),
    card:$('swipeCard'),cardArea:$('cardArea'),nope:$('nopeButton'),like:$('likeButton'),
    likeStamp:$('likeStamp'),nopeStamp:$('nopeStamp'),
    timer:$('timerValue'),timerFill:$('timerFill'),score:$('scoreValue'),best:$('bestValue'),
    stagePill:$('stagePill'),stageName:$('stageName'),combo:$('comboChip'),
    resultEmoji:$('resultEmoji'),resultEyebrow:$('resultEyebrow'),
    resultTitle:$('resultTitle'),resultSubtitle:$('resultSubtitle'),
    finalScore:$('finalScore'),finalTime:$('finalTime'),finalAvoided:$('finalAvoided'),
    evidencePanel:$('evidencePanel'),evidenceImage:$('evidenceImage'),
    evidenceSpot:$('evidenceSpot'),evidenceIdentity:$('evidenceIdentity'),
    evidenceReason:$('evidenceReason'),recordMessage:$('recordMessage'),
    momRoast:$('momRoast'),loadingStatus:$('loadingStatus')
  };

  function showScreen(name){
    for(const key of ['welcome','game','result'])ui[key].classList.toggle('hidden',key!==name);
  }
  function getBest(){try{return Math.max(0,Number(localStorage.getItem('army_no_sergeant_mom_best_v1'))||0)}catch{return 0}}
  function saveBest(x){try{localStorage.setItem('army_no_sergeant_mom_best_v1',String(x))}catch{}}
  let best=getBest();
  let score=0,avoided=0,hiddenAvoided=0,combo=0,shown=0;
  let running=false,ended=false,locked=false,cardReady=false,momPending=false;
  let startAt=0,endAt=0,frame=0,pending=0,drag=null;
  let current=null,currentEntry=null,upcoming=[],preparedLevel=-1,deck=null;
  let renderToken=0,previewToken=0,prevRoast=-1;
  let starting=false,evidenceTarget=null;
  const portraitSurface=ui.card.querySelector('.profile-photo');
  const preview=ui.card.cloneNode(true);
  preview.removeAttribute('id');
  preview.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  preview.className='swipe-card prepared-card';
  preview.setAttribute('aria-hidden','true');
  const previewSurface=preview.querySelector('.profile-photo');
  const previewName=preview.querySelector('.identity-line h3');
  const previewBio=preview.querySelector('.profile-details p');
  const previewCity=preview.querySelector('.distance-row span');
  previewSurface.querySelector('img')?.remove();
  ui.cardArea.insertBefore(preview,ui.card);
  let previewImg=null;
  const photoLoader=document.createElement('button');
  photoLoader.type='button';photoLoader.className='photo-loading-indicator hidden';
  photoLoader.textContent='⏳ 照片載入中…';
  portraitSurface.append(photoLoader);
  function showLoader(message,allowRetry=false){
    photoLoader.textContent=message;photoLoader.disabled=!allowRetry;
    photoLoader.classList.remove('hidden');
  }
  photoLoader.addEventListener('click',()=>{
    if(!running||cardReady||!currentEntry)return;
    const next=prepare(currentEntry.person,true);
    currentEntry=next;paintFront(next);
  });

  const shuffle=arr=>{
    const out=arr.slice();
    for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
    return out;
  };
  function makeDeck(){
    // Original game's per-stage MOM probabilities and early first-MOM rule.
    const firstMom=4+Math.floor(Math.random()*3);
    const bags={normal:[],background:[],direct:[]};
    return {
      next(position,stage){
        const rule=LEVELS[stage];
        let type;
        if(position<firstMom)type='normal';
        else if(position===firstMom)type='direct';
        else if(Math.random()>=rule.mom)type='normal';
        else type=Math.random()<rule.hidden?'background':'direct';
        if(!bags[type].length)bags[type]=shuffle(ART[type]);
        return {type,art:bags[type].pop()};
      }
    };
  }
  function stage(){
    for(let i=LEVELS.length-1;i>=0;i--)if(score>=LEVELS[i].score)return i;
    return 0;
  }
  function profileFor(position){
    const {type,art}=deck.next(position,stage());
    const image='../assets/profiles/'+art.file;
    if(type==='normal')return {image,name:art.name||'路人',age:art.age||27,
      bio:art.bio||'交個朋友吧。',city:art.city||'台灣',isMom:false,trapType:null,spot:null,reason:''};
    if(type==='background')return {image,name:art.name||'路人',age:art.age||28,
      bio:art.bio||'喜歡拍照。',city:art.city||'台灣',isMom:true,
      trapType:'background',spot:art.spot,reason:art.reason||'班長的媽媽藏在背景！'};
    return {image,name:'MOM',age:56,bio:'學弟，怎麼又在這裡遇見你？',
      city:'班長家附近',isMom:true,trapType:'direct',spot:null,
      reason:art.reason||'這就是班長的媽媽本人！'};
  }
  function prepare(person,retry=false){
    const img=new Image();
    img.decoding='async';img.loading='eager';img.alt=person.name+' 的交友照片';
    img.style.objectFit='contain';img.style.objectPosition='center center';
    const entry={person,img,ready:false,failed:false,promise:null};
    entry.promise=new Promise(resolve=>{
      img.onload=()=>{entry.ready=true;resolve(true)};
      img.onerror=()=>{entry.failed=true;resolve(false)};
    });
    img.src=person.image+(retry?'?retry='+Date.now():'');
    if(img.complete&&img.naturalWidth>0){entry.ready=true;entry.promise=Promise.resolve(true)}
    return entry;
  }
  function fillDeck(){
    const lvl=stage();
    if(preparedLevel!==lvl){upcoming=[];preparedLevel=lvl}
    while(upcoming.length<5){const pos=shown+upcoming.length+1;upcoming.push(prepare(profileFor(pos)))}
  }
  function takeCard(){
    fillDeck();const entry=upcoming.shift();shown++;fillDeck();return entry;
  }
  function paintPreview(){
    const entry=upcoming[0],token=++previewToken;
    if(previewImg?.parentElement===previewSurface)previewImg.remove();
    previewImg=null;
    if(!entry)return;
    const person=entry.person;
    previewSurface.style.setProperty('--portrait-background','url("'+person.image+'")');
    previewName.replaceChildren(document.createTextNode(person.name+' '));
    const age=document.createElement('span');age.textContent=String(person.age);previewName.append(age);
    previewBio.textContent=person.bio;previewCity.textContent=person.city;
    const apply=()=>{
      if(!running||token!==previewToken||upcoming[0]!==entry||!entry.ready)return;
      previewImg=entry.img;previewSurface.insertBefore(entry.img,previewSurface.firstChild);
    };
    if(entry.ready)apply();else entry.promise.then(apply);
  }
  function resetCardTransform(){
    ui.card.classList.remove('animating','dragging');
    ui.card.style.transform='';ui.card.style.opacity='1';
    ui.likeStamp.style.opacity='0';ui.nopeStamp.style.opacity='0';drag=null;
  }
  function paintFront(entry){
    current=entry.person;currentEntry=entry;cardReady=false;
    const token=++renderToken;
    const person=entry.person;
    resetCardTransform();
    portraitSurface.style.setProperty('--portrait-background','url("'+person.image+'")');
    const title=$('profileName');
    title.replaceChildren(document.createTextNode(person.name+' '));
    const age=document.createElement('span');age.textContent=String(person.age);title.append(age);
    $('profileBio').textContent=person.bio;
    $('profileCity').textContent=person.city;
    showLoader('⏳ 照片載入中…');
    const apply=()=>{
      if(!running||token!==renderToken||entry!==currentEntry)return;
      if(!entry.ready){showLoader('照片載入失敗，點此重試',true);return}
      const old=portraitSurface.querySelector('img');
      if(old&&old!==entry.img)old.remove();
      entry.img.id='profileImage';
      portraitSurface.insertBefore(entry.img,portraitSurface.firstChild);
      photoLoader.classList.add('hidden');
      cardReady=true;
    };
    if(entry.ready)apply();else entry.promise.then(apply);
  }
  function syncHUD(){
    ui.score.textContent=String(score);ui.best.textContent=String(best);
    const level=stage();
    ui.stagePill.textContent='LEVEL '+(level+1);
    ui.stageName.textContent=LEVELS[level].name;
    ui.combo.textContent=combo>=3?'🔥 '+combo+' COMBO':'';
  }
  function clearTimers(){
    if(frame){cancelAnimationFrame(frame);frame=0}
    if(pending){clearTimeout(pending);pending=0}
  }
  async function startRound(){
    if(starting)return;
    if(!ART||!ART.normal?.length||!ART.direct?.length||!ART.background?.length){
      ui.loadingStatus.textContent='照片資料尚未載入，請重新整理。';return;
    }
    starting=true;ui.start.disabled=true;ui.loadingStatus.textContent='正在準備照片…';
    clearTimers();running=false;ended=false;locked=false;momPending=false;
    score=0;avoided=0;hiddenAvoided=0;combo=0;shown=0;preparedLevel=-1;upcoming=[];
    ++renderToken;++previewToken;
    deck=makeDeck();
    fillDeck();
    // The first photo must finish loading before the countdown starts.
    const first=upcoming[0];
    const loaded=await Promise.race([first.promise,new Promise(resolve=>setTimeout(()=>resolve(false),12000))]);
    starting=false;ui.start.disabled=false;
    if(!loaded){ui.loadingStatus.textContent='照片尚未載入，請確認連線後再按開始。';return}
    ui.loadingStatus.textContent='';
    running=true;locked=false;ended=false;
    startAt=performance.now();endAt=startAt+TIME_LIMIT;
    ui.timer.classList.remove('danger');
    ui.timer.textContent='45.0';ui.timerFill.style.width='100%';
    syncHUD();showScreen('game');
    paintFront(takeCard());paintPreview();
    frame=requestAnimationFrame(tick);
  }
  function tick(now){
    if(!running||ended)return;
    const remain=Math.max(0,endAt-now);
    ui.timer.textContent=(remain/1000).toFixed(1);
    ui.timerFill.style.width=(remain/TIME_LIMIT*100).toFixed(2)+'%';
    if(remain<=5000)ui.timer.classList.add('danger');
    if(remain<=0){if(!momPending)finish(false);return}
    frame=requestAnimationFrame(tick);
  }
  function swipe(choice){
    if(!running||locked||ended||!cardReady)return;
    if(performance.now()>=endAt){finish(false);return}
    locked=true;
    const person=current,like=choice==='like';
    if(like&&person.isMom){
      momPending=true;
      ui.card.classList.add('animating');
      ui.card.style.transform='translate3d(120%,-6px,0) rotate(21deg)';
      ui.likeStamp.style.opacity='1';
      pending=setTimeout(()=>{pending=0;finish(true,person)},240);
      return;
    }
    if(like&&!person.isMom){score++;combo++}
    else if(!like&&person.isMom){avoided++;combo++;if(person.trapType==='background')hiddenAvoided++}
    else combo=0;
    const direction=like?1:-1;
    ui.card.classList.remove('dragging');ui.card.classList.add('animating');
    ui.card.style.transform='translate3d('+(direction*135)+'%,-10px,0) rotate('+(direction*23)+'deg)';
    ui.card.style.opacity='0';
    ui.likeStamp.style.opacity=like?'1':'0';ui.nopeStamp.style.opacity=like?'0':'1';
    syncHUD();fillDeck();paintPreview();
    pending=setTimeout(()=>{
      pending=0;if(!running)return;
      paintFront(takeCard());paintPreview();locked=false;
    },225);
  }
  function repositionEvidenceMarker(){
    if(!evidenceTarget||!ui.evidenceImage.naturalWidth)return;
    const frame=ui.evidenceImage.parentElement;
    if(frame.classList.contains('hidden')||!frame.getClientRects().length)return;
    const box=ui.evidenceImage.getBoundingClientRect(),parent=frame.getBoundingClientRect();
    const nw=ui.evidenceImage.naturalWidth,nh=ui.evidenceImage.naturalHeight;
    const scale=Math.min(box.width/nw,box.height/nh),w=nw*scale,h=nh*scale;
    if(!(w>0&&h>0))return;
    const lx=box.left-parent.left+(box.width-w)/2,ty=box.top-parent.top+(box.height-h)/2;
    const pct=v=>Math.max(0,Math.min(100,Number(v)||0));
    const ring=Number(evidenceTarget.ring)||Math.min(90,(Number(evidenceTarget.size)||16)*3);
    const diameter=Math.min(w*.86,Math.max(32,w*ring/100));
    // Never shift the circle center inward: the full face must remain inside
    // even when it sits close to the edge of the actual, uncropped photo.
    Object.assign(ui.evidenceSpot.style,{
      left:(lx+w*pct(evidenceTarget.x)/100)+'px',
      top:(ty+h*pct(evidenceTarget.y)/100)+'px',
      width:diameter+'px',height:diameter+'px'
    });
  }
  function finish(likedMom,culprit=null){
    if(!running||ended)return;
    running=false;ended=true;locked=true;cardReady=false;
    ++renderToken;++previewToken;clearTimers();resetCardTransform();
    const elapsed=Math.min(TIME_LIMIT,performance.now()-startAt);
    const survived=!likedMom;
    const isBest=survived&&score>best;
    if(isBest){best=score;saveBest(best)}
    ui.resultEmoji.textContent=likedMom?'💔':'🏆';
    ui.resultEyebrow.textContent=likedMom?'班長注意到你了':'鑑測結束';
    ui.resultTitle.innerHTML=likedMom?'你滑到<br>班長的媽媽了。':'45 秒過關！<br>沒滑到班長的媽媽。';
    ui.resultSubtitle.textContent=likedMom?'班長：你是不是對我媽有什麼想法？':'成功 LIKE '+score+' 位正常交友對象！';
    ui.finalScore.textContent=String(score);
    ui.finalTime.textContent=(elapsed/1000).toFixed(1)+'s';
    ui.finalAvoided.textContent=String(hiddenAvoided);
    ui.recordMessage.classList.toggle('hidden',!isBest);
    ui.evidencePanel.classList.toggle('hidden',!likedMom);
    if(likedMom&&culprit){
      let idx=Math.floor(Math.random()*ROASTS.length);
      if(idx===prevRoast)idx=(idx+1)%ROASTS.length;
      prevRoast=idx;
      ui.momRoast.textContent='🪖 班長講評：「'+ROASTS[idx]+'」';
      ui.momRoast.classList.remove('hidden');
      evidenceTarget=culprit.trapType==='background'?culprit.spot:null;
      ui.evidenceSpot.className='evidence-spot '+(evidenceTarget?'spot-small':'hidden');
      const frame=ui.evidenceImage.parentElement;
      frame.style.removeProperty('--evidence-aspect');
      ui.evidenceImage.onload=()=>{
        if(ui.evidenceImage.naturalWidth>0&&ui.evidenceImage.naturalHeight>0)
          frame.style.setProperty('--evidence-aspect',String(ui.evidenceImage.naturalWidth/ui.evidenceImage.naturalHeight));
        requestAnimationFrame(repositionEvidenceMarker);
      };
      ui.evidenceImage.src=culprit.image;
      ui.evidenceImage.alt=culprit.name+' — 誤滑的交友照片';
      ui.evidenceReason.textContent='↳ '+culprit.reason.replaceAll('媽媽','班長的媽媽');
      ui.evidenceIdentity.replaceChildren(document.createTextNode(culprit.name+'，'+culprit.age+' 歲'));
      if(ui.evidenceImage.complete&&ui.evidenceImage.naturalWidth)ui.evidenceImage.onload();
    }else{
      evidenceTarget=null;ui.momRoast.textContent='';ui.momRoast.classList.add('hidden');
    }
    showScreen('result');
    if(likedMom&&evidenceTarget)requestAnimationFrame(()=>requestAnimationFrame(repositionEvidenceMarker));
  }
  function goHome(){
    clearTimers();running=false;ended=true;locked=false;momPending=false;
    ++renderToken;++previewToken;resetCardTransform();
    ui.loadingStatus.textContent='';showScreen('welcome');
  }

  ui.start.addEventListener('click',startRound);
  ui.retry.addEventListener('click',startRound);
  ui.home.addEventListener('click',goHome);
  ui.like.addEventListener('click',()=>swipe('like'));
  ui.nope.addEventListener('click',()=>swipe('nope'));
  ui.card.addEventListener('pointerdown',e=>{
    if(!running||locked||!cardReady||drag)return;
    e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    try{ui.card.setPointerCapture(e.pointerId)}catch{}
    ui.card.classList.add('dragging');
  },{passive:false});
  ui.card.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId||!running||locked)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    ui.card.style.transform='translate3d('+dx+'px,'+Math.max(-38,Math.min(60,dy*.28))+'px,0) rotate('+(dx/16)+'deg)';
    ui.likeStamp.style.opacity=String(Math.max(0,Math.min(1,dx/95)));
    ui.nopeStamp.style.opacity=String(Math.max(0,Math.min(1,-dx/95)));
  });
  ui.card.addEventListener('pointerup',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x;drag=null;
    if(dx>65)swipe('like');else if(dx< -65)swipe('nope');else resetCardTransform();
  });
  ui.card.addEventListener('pointercancel',resetCardTransform);
  document.addEventListener('keydown',e=>{
    if(!running||e.repeat)return;
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a'){e.preventDefault();swipe('nope')}
    if(e.key==='ArrowRight'||e.key.toLowerCase()==='d'){e.preventDefault();swipe('like')}
  });
  document.addEventListener('gesturestart',e=>{if(e.cancelable)e.preventDefault()},{passive:false});
  window.addEventListener('resize',()=>requestAnimationFrame(repositionEvidenceMarker));
  document.addEventListener('visibilitychange',()=>{
    if(running&&!document.hidden&&performance.now()>=endAt)finish(false);
  });
  ui.best.textContent=String(best);
  if(!ART||!ART.normal?.length||!ART.direct?.length||!ART.background?.length){
    ui.start.disabled=true;ui.loadingStatus.textContent='照片資料未載入，請重新整理。';
  }
  window.armySwipeTest={status:()=>({running,ended,score,shown,avoided,hiddenAvoided,online:false,achievements:false}),start:startRound,swipe,home:goHome};
})();
