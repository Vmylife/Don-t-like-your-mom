/* DON'T LIKE YOUR MOM v0.8.0 — optional, local-only achievements. No login or leaderboard writes. */
(() => {
  'use strict';
  const STORAGE_KEY = 'dlym_achievements_v1';
  const CATEGORIES = [
    ['all','全部'],['rookie','入門'],['score','高分'],['combo','連擊'],
    ['spot','認媽'],['lifetime','累積'],['special','特殊']
  ];
  const DEFINITIONS = [];
  const add = (category, stat, milestones, icon) => {
    for (const [target,title] of milestones) {
      DEFINITIONS.push({id: `${stat}-${target}`,category,stat,target,title,icon});
    }
  };
  add('rookie','totalLikes',[[1,'右滑初體驗']], '❤️');
  add('rookie','totalAvoided',[[1,'媽！是妳！']], '👩');
  add('rookie','totalHidden',[[1,'背後有人！']], '👀');
  add('rookie','wins',[[1,'45 秒生還者']], '🏁');
  add('score','bestScore',[
    [10,'心動新手'],[20,'交友達人'],[30,'滑卡快手'],[40,'情場老司機'],
    [50,'LIKE 收割機'],[60,'六十讚霸主'],[65,'海王見習'],
    [70,'滑卡魔王'],[75,'指尖傳說'],[80,'八十連心動']
  ],'💘');
  add('combo','bestCombo',[
    [5,'手感來了'],[10,'眼睛開光'],[20,'絕不斷線'],[30,'連擊魔人'],
    [40,'無情刷卡機'],[50,'連擊暴走'],[60,'天選之手'],[70,'手指有神']
  ],'🔥');
  add('spot','bestRoundAvoided',[
    [2,'耳目一新'],[4,'媽感應器'],[6,'背景搜查官'],
    [8,'媽媽雷達 PRO'],[10,'認媽特勤隊'],[12,'反媽總司令']
  ],'🛡️');
  add('lifetime','totalLikes',[
    [50,'五十次心動'],[200,'桃花流水'],[500,'LIKE 批發商'],
    [1000,'千人斬（滑卡版）'],[3000,'按讚不會累']
  ],'💗');
  add('lifetime','totalAvoided',[
    [10,'家族辨識課'],[50,'媽媽躲避學徒'],[100,'認媽老司機'],
    [300,'親媽都怕我'],[1000,'千媽防線']
  ],'🧿');
  add('lifetime','wins',[
    [3,'三度生還'],[10,'十次求生'],[30,'職業倖存者'],[100,'百場全勤王']
  ],'🏆');
  add('spot','totalHidden',[
    [10,'路人甲裡找媽媽'],[50,'背景偵探'],[200,'人群透視眼']
  ],'🔍');
  add('special','bestCleanScore',[
    [20,'絕不亂 NOPE'],[40,'完美滑卡王']
  ],'✨');
  add('special','bestWinStreak',[
    [2,'連續存活'],[5,'親媽奈何不了我']
  ],'🌟');
  // 4 rookie + 10 score + 8 combo + 6 single-round dodges + 5 likes +
  // 5 dodges + 4 wins + 3 background + 2 flawless + 2 survival streak = 49.
  const STATS = ['played','wins','totalLikes','totalAvoided','totalHidden','bestScore',
    'bestCombo','bestRoundAvoided','bestCleanScore','winStreak','bestWinStreak'];
  const blank = () => Object.fromEntries(STATS.map(key=>[key,0]));
  function read() {
    let raw={};
    try { raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}') || {}; } catch {}
    const state={stats:blank(),unlocked:{}};
    for(const key of STATS){
      const v=Number(raw.stats?.[key]);
      if(Number.isFinite(v) && v>=0)state.stats[key]=Math.min(10_000_000,Math.floor(v));
    }
    if(raw.unlocked && typeof raw.unlocked==='object') {
      for(const def of DEFINITIONS){
        if(typeof raw.unlocked[def.id]==='string')state.unlocked[def.id]=raw.unlocked[def.id];
      }
    }
    // Existing personal best is a legitimate completed-round score saved by
    // older versions. Award only the corresponding best-score achievements.
    try {
      const oldBest=Number(localStorage.getItem('dlym_best_v04_likes'))||0;
      if(Number.isFinite(oldBest) && oldBest>0 && oldBest<=10000)
        state.stats.bestScore=Math.max(state.stats.bestScore,Math.floor(oldBest));
    } catch {}
    unlockMet(state);
    persist(state);
    return state;
  }
  function persist(state) {
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));} catch {/* Storage disabled */}
  }
  function unlockMet(state) {
    const newly=[];
    for(const def of DEFINITIONS){
      if(state.unlocked[def.id] || state.stats[def.stat] < def.target)continue;
      state.unlocked[def.id]=new Date().toISOString();newly.push(def);
    }
    return newly;
  }
  const state=read();
  const view=document.getElementById('achievementsScreen');
  const list=document.getElementById('achievementList');
  const count=document.getElementById('achievementCount');
  const progress=document.getElementById('achievementProgress');
  const filters=document.getElementById('achievementFilters');
  const next=document.getElementById('achievementNext');
  const note=document.getElementById('achievementRoundNotice');
  let selected='all';
  let backTo='welcomeScreen';
  const val=def => Math.min(def.target,state.stats[def.stat]||0);
  function render() {
    if(!view||!list||!count||!filters)return;
    const unlocked=Object.keys(state.unlocked).length;
    count.textContent=`${unlocked} / ${DEFINITIONS.length}`;
    progress.style.width=(100*unlocked/DEFINITIONS.length).toFixed(1)+'%';
    filters.replaceChildren();
    for(const [code,label] of CATEGORIES){
      const btn=document.createElement('button');btn.type='button';btn.textContent=label;
      btn.setAttribute('aria-pressed',String(selected===code));
      btn.addEventListener('click',()=>{selected=code;render();});filters.appendChild(btn);
    }
    const nearest=DEFINITIONS.filter(d=>!state.unlocked[d.id])
      .sort((a,b)=> (a.target-val(a))/a.target-(b.target-val(b))/b.target)[0];
    next.textContent=nearest
      ? `🎯 下一個目標：${nearest.title} · ${val(nearest)}/${nearest.target}`
      : '🎉 全部成就達成！你的親媽都服了。';
    list.replaceChildren();
    const visible=DEFINITIONS.filter(d=>selected==='all'||d.category===selected)
      .sort((a,b)=>Number(Boolean(state.unlocked[b.id]))-Number(Boolean(state.unlocked[a.id])));
    for(const def of visible){
      const have=Boolean(state.unlocked[def.id]);
      const row=document.createElement('article');row.className='ach-item'+(have?' achieved':'');
      const icon=document.createElement('span');icon.className='ach-icon';icon.textContent=have?def.icon:'🔒';
      const body=document.createElement('div');body.className='ach-info';
      const name=document.createElement('strong');name.textContent=def.title;
      const desc=document.createElement('small');
      const type = CATEGORIES.find(v=>v[0]===def.category)?.[1]||'';
      const detail={
        bestScore:'單局完賽 LIKE',bestCombo:'單局最高 COMBO',bestRoundAvoided:'單局避開媽媽',
        totalLikes:'累積 LIKE',totalAvoided:'累積避開媽媽',totalHidden:'累積識破背景媽媽',
        wins:'累積完賽',bestCleanScore:'未錯誤 NOPE 的完賽 LIKE',bestWinStreak:'連續完賽'
      }[def.stat]||type;
      desc.textContent=have?`✓ 已解鎖 · ${detail} ${def.target}`:`${detail} ${val(def)}/${def.target}`;
      const meter=document.createElement('span');meter.className='ach-meter';
      const fill=document.createElement('span');fill.style.width=(val(def)/def.target*100).toFixed(1)+'%';meter.appendChild(fill);
      body.append(name,desc,meter);row.append(icon,body);list.appendChild(row);
    }
  }
  function open(from='welcomeScreen') {
    if(!view)return;
    backTo=from;
    render();
    document.querySelectorAll('.app .screen').forEach(screen=>screen.classList.toggle('hidden',screen!==view));
  }
  function close() {
    document.querySelectorAll('.app .screen').forEach(screen=>screen.classList.toggle('hidden',screen.id!==backTo));
  }
  function record(round) {
    if(!round || !Number.isFinite(round.likes))return [];
    const likes=Math.max(0,Math.floor(round.likes));
    const dodged=Math.max(0,Math.floor(round.avoided||0));
    const hidden=Math.max(0,Math.floor(round.hiddenAvoided||0));
    const combo=Math.max(0,Math.floor(round.maxCombo||0));
    const skipped=Math.max(0,Math.floor(round.skipped||0));
    const survived=Boolean(round.survived);
    const s=state.stats;
    s.played++;
    s.totalLikes+=likes;s.totalAvoided+=dodged;s.totalHidden+=hidden;
    s.bestCombo=Math.max(s.bestCombo,combo);
    s.bestRoundAvoided=Math.max(s.bestRoundAvoided,dodged);
    if(survived){
      s.wins++;s.winStreak++;s.bestWinStreak=Math.max(s.bestWinStreak,s.winStreak);
      s.bestScore=Math.max(s.bestScore,likes);
      if(skipped===0)s.bestCleanScore=Math.max(s.bestCleanScore,likes);
    }else s.winStreak=0;
    const awards=unlockMet(state);persist(state);
    if(note){
      note.classList.toggle('hidden',awards.length===0);
      note.textContent=awards.length===1?`🏅 新成就：${awards[0].title}（點我查看）`:
        `🏅 本局解鎖 ${awards.length} 項成就（點我查看）`;
    }
    return awards;
  }
  document.getElementById('openAchievementsWelcome')?.addEventListener('click',()=>open('welcomeScreen'));
  document.getElementById('closeAchievements')?.addEventListener('click',close);
  note?.addEventListener('click',()=>open('resultScreen'));
  window.DLYMAchievements={record,open,count:()=>Object.keys(state.unlocked).length,total:DEFINITIONS.length};
})();
