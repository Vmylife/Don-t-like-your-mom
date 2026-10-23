/* DON'T LIKE YOUR MOM — admin-only dashboard, v0.8.4 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const API=window.DLYMCommunityAPI;
  const login=$('analyticsLogin'),workspace=$('analyticsWorkspace'),status=$('analyticsStatus');
  const refresh=$('analyticsRefresh'),logout=$('analyticsLogout');
  let days=14,busy=false;
  const msg=s=>{status.textContent=s;};
  const num=v=>Number(v||0).toLocaleString('zh-TW');
  const total=(list,key)=>list.reduce((a,d)=>a+Number(d[key]||0),0);
  const textNode=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=txt;return n;};
  async function validate(){return await API.rpc('dlym_is_photo_admin',{},'admin')===true;}
  function show(yes){login.hidden=yes;workspace.hidden=!yes;}
  function metric(title,value,sub,klass=''){
    const c=textNode('article','metric-card '+klass,'');
    c.append(textNode('div','metric-title',title),textNode('div','metric-value',value),textNode('div','metric-sub',sub));
    $('analyticsCards').append(c);
  }
  function render(info){
    const list=Array.isArray(info?.daily)?info.daily:[];
    const starts=total(list,'starts'),wins=total(list,'wins'),moms=total(list,'moms');
    const visits=total(list,'visits'),scoreSub=total(list,'submissions');
    const rate=starts?(wins/starts*100).toFixed(1)+'%':'—';
    const since=info.tracking_since?new Date(info.tracking_since).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):null;
    $('analyticsAsOf').textContent=`台灣時間 · 最近 ${info.period_days||days} 天｜統計啟用：${since||'尚未有新遊戲事件'}｜更新於 ${new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}`;
    $('analyticsCards').replaceChildren();
    metric('🚪 進站訪次',num(visits),'匿名分頁工作階段；非精準人數');
    metric('🎮 開局次數',num(starts),'包含自由、好友同題與同步對戰');
    metric('🏆 完賽局數',num(wins),'成功生存到 45 秒','win');
    metric('💔 誤滑媽媽',num(moms),'遊戲中誤按 LIKE 媽媽','mom');
    metric('🎯 完賽率',rate,`${num(starts)} 開局 · ${num(wins)} 完賽`);
    metric('📨 區間成功送榜',num(scoreSub),'取自原本的排行榜資料');
    metric('📚 歷史總送榜',num(info.historic_submissions),'含統計功能安裝前的戰績');
    metric('👤 歷史不同暱稱',num(info.historic_distinct_names),'同一人可用多個暱稱，不等於玩家數');
    metric('👑 歷史最高 LIKE',info.historic_best_like==null?'—':num(info.historic_best_like),'只計入正式成功上榜的戰績','record');

    const chart=$('analyticsTrend');chart.replaceChildren();
    const max=Math.max(1,...list.map(d=>Number(d.starts)||0));
    for(const d of list){
      const day=textNode('div','trend-day','');
      const vs=[{key:'starts',cls:'start'},{key:'wins',cls:'win'},{key:'moms',cls:'mom'}];
      const bars=textNode('div','trend-bars','');
      const values=vs.map(v=>Number(d[v.key]||0));
      day.append(textNode('div','trend-value',String(values[0])));
      vs.forEach((v,i)=>{
        const col=textNode('span','trend-col '+v.cls,'');
        col.style.height=Math.max(1,Math.round(150*values[i]/max))+'px';
        col.title=`${d.d}: ${v.key} ${num(values[i])}`;
        bars.append(col);
      });
      day.append(bars,textNode('div','trend-label',String(d.d||'').slice(5)));
      chart.append(day);
    }
    if(!list.length)chart.textContent='目前沒有統計資料。';
    const tbody=$('analyticsDailyRows');tbody.replaceChildren();
    [...list].reverse().forEach(d=>{
      const tr=document.createElement('tr');
      const start=Number(d.starts)||0;
      const ratio=start?(Number(d.wins||0)/start*100).toFixed(1)+'%':'—';
      [d.d,num(d.visits),num(d.starts),num(d.wins),num(d.moms),ratio,num(d.submissions),d.best_submitted==null?'—':num(d.best_submitted)].forEach(value=>tr.append(textNode('td','',String(value))));
      tbody.append(tr);
    });
  }
  async function load(){
    if(busy)return;busy=true;refresh.disabled=true;
    try{
      msg('⏳ 正在讀取私人統計…');
      const result=await API.rpc('dlym_admin_analytics',{p_days:days},'admin');
      render(result);
      msg('✅ 統計讀取完成。只有白名單管理員可以查詢這些資料。');
    }catch(err){msg('❌ 讀取失敗：'+String(err.message||err)+'。若是第一次使用，請先執行 v0.8.4 SQL。');}
    finally{busy=false;refresh.disabled=false;}
  }
  login.addEventListener('submit',async e=>{
    e.preventDefault();const btn=$('analyticsLoginBtn');btn.disabled=true;
    try{
      msg('⏳ 正在驗證管理員…');
      await API.adminLogin($('analyticsEmail').value.trim(),$('analyticsPassword').value);
      $('analyticsPassword').value='';show(true);await load();
    }catch(err){msg('登入失敗：'+String(err.message||err));}
    finally{btn.disabled=false;}
  });
  refresh.addEventListener('click',load);
  document.querySelectorAll('[data-days]').forEach(b=>b.addEventListener('click',()=>{
    days=Number(b.dataset.days)||14;
    document.querySelectorAll('[data-days]').forEach(c=>c.classList.toggle('chosen',c===b));
    load();
  }));
  logout.addEventListener('click',()=>{API.logoutAdmin();show(false);$('analyticsCards').replaceChildren();$('analyticsTrend').replaceChildren();$('analyticsDailyRows').replaceChildren();msg('已登出。');});
  (async()=>{
    if(!API?.configured){show(false);msg('找不到 Supabase 設定，請檢查 leaderboard-config.js。');return;}
    try{
      await API.authFor('admin');
      if(!await validate())throw new Error('管理員授權無效');
      show(true);await load();
    }catch{show(false);msg('請用投稿審核後台的管理員 Email 和密碼登入。');}
  })();
})();
