/* DON'T LIKE YOUR MOM v0.6.0: simultaneous two-player duel via Supabase RPC.
   Polling is used instead of a WebSocket to keep GitHub Pages dependencies small.
   These results are friendly comparisons, NOT trusted global ranking entries. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const raw = window.DLYM_LEADERBOARD_CONFIG || {};
  const base = String(raw.url || '').trim().replace(/\/+$/, '');
  const key = String(raw.publishableKey || '').trim();
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base) && /^(sb_publishable_|eyJ)/.test(key);
  const ui = {
    screen: $('duelLobbyScreen'), title: $('duelLobbyTitle'), info: $('duelLobbyStatus'),
    name: $('duelPlayerName'), host: $('duelHostName'), guest: $('duelGuestName'),
    create: $('duelCreateJoin'), share: $('duelShareInvite'), ready: $('duelReadyButton'),
    exit: $('duelLeaveButton'), result: $('duelResultStatus'), resultRefresh: $('duelResultRefresh')
  };
  const engine = window.DLYMDeckEngine;
  const art = window.ART_DATA;
  const incoming = new URL(location.href).searchParams.get('room');
  const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  let id = null, token = null, seed = null, role = null, started = false, ready = false;
  let live = false, finishPending = false, lastState = null, polling = null, startingTimer = null;
  let onStart = null, onShowScreen = null, onExit = null, lastRequestMs = 0;
  let refreshInFlight = false;
  let pendingOutcome = null;
  let scoreSent = false;
  let activeInvite = incoming && UUID.test(incoming) ? incoming : null;
  const NAME_KEY = 'dlym_duel_player_name_v060';
  const recordKey = room => `dlym_duel_token_${room}`;
  try { ui.name.value = localStorage.getItem(NAME_KEY) || localStorage.getItem('dlym_player_name_v050') || ''; } catch {}
  const safeName = () => (ui.name.value || '').trim().slice(0,16);
  function message(value) { ui.info.textContent = value; }
  function showLoginUI() {
    ui.create.classList.remove('hidden');
    ui.ready.classList.add('hidden');
    ui.share.classList.add('hidden');
  }
  async function rpc(func, data, timeout = 10000) {
    if (!configured) throw new Error('還沒設定 Supabase。請先完成排行榜設定，再執行好友房間 SQL。');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();
    try {
      const res = await fetch(`${base}/rest/v1/rpc/${func}`, {
        method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json', apikey:key },
        body:JSON.stringify(data), signal:controller.signal, cache:'no-store'
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const errorCode = body?.message || `HTTP ${res.status}`;
        const errors = {
          ROOM_NOT_FOUND:'房間不存在或已過期，請朋友重新建立。', ROOM_FULL:'這個房間已滿（只能兩人）。',
          ROOM_ALREADY_STARTED:'對戰已開始，請建立新房間。',INVALID_ROOM_TOKEN:'房間憑證無效，請重新建立或加入。',
          INVALID_NAME:'請填寫 1～16 字的暱稱。',ROUND_EXPIRED:'本次對戰已過期。',
          SCORE_ALREADY_SUBMITTED:'這局結果已上傳。',ROUND_TOO_SHORT:'伺服器判定尚未完成 45 秒。',
          ROUND_NOT_STARTED:'對局尚未開始。',INVALID_SCORE:'成績數值異常。'
        };
        throw new Error(errors[errorCode] || `Supabase：${errorCode}`);
      }
      return { body, start, end:Date.now() };
    } catch (err) {
      if (err?.name === 'AbortError') throw new Error('連線逾時，請確認網路。');
      throw err;
    } finally { clearTimeout(timer); }
  }
  function roomUrl(room) {
    const url = new URL(location.pathname,location.origin);
    url.searchParams.set('room', room);
    url.searchParams.set('deck', engine.fingerprint(art));
    return url.toString();
  }
  function store(room,secret) { try { localStorage.setItem(recordKey(room), secret); } catch {} }
  function saved(room) { try { return localStorage.getItem(recordKey(room)); } catch { return null; } }
  function updateUrl(room) {
    const url = new URL(location.href);
    url.search = ''; url.hash = '';
    if (room) { url.searchParams.set('room',room); url.searchParams.set('deck',engine.fingerprint(art)); }
    history.replaceState(null,'',url.toString());
  }
  async function createOrJoin() {
    if (!safeName()) { message('請先輸入 1～16 字的玩家暱稱。'); ui.name.focus(); return; }
    ui.create.disabled = true;
    try {
      try { localStorage.setItem(NAME_KEY,safeName()); } catch {}
      const isJoining = !!activeInvite;
      const output = await rpc(isJoining?'dlym_duel_join':'dlym_duel_create',
        isJoining ? {p_room:activeInvite,p_name:safeName()} :
          {p_seed:engine.newSeed(),p_deck:engine.fingerprint(art),p_name:safeName()});
      id = output.body.id; token = output.body.token; seed = output.body.seed;
      live = true; started = false; ready = false; pendingOutcome=null; scoreSent=false;
      store(id,token); updateUrl(id);
      showLoginUI(); ui.create.classList.add('hidden');
      ui.ready.classList.remove('hidden'); ui.share.classList.toggle('hidden',isJoining);
      message(isJoining?'已加入房間！按「我準備好了」，等朋友一起開局。':'房間已建立！先把連結傳給朋友，再一起按準備。');
      await refresh(); startPolling();
    } catch(e) { message('無法建立／加入：'+e.message); }
    finally { ui.create.disabled = false; }
  }
  function resultText(s) {
    if (!(s.host_finished && s.guest_finished)) {
      const other = role==='host'?'guest':'host';
      return `✅ 你已完成這局，等待 ${s[other+'_name']||'朋友'} 送出成績…`;
    }
    const own = role==='host'?'host':'guest';
    const other = role==='host'?'guest':'host';
    const mineScore = s[own+'_score'], theirs = s[other+'_score'];
    const mineLive = s[own+'_survived'], theirLive = s[other+'_survived'];
    const win = (mineLive && !theirLive) || (mineLive === theirLive && mineScore > theirs);
    const tie = mineLive === theirLive && mineScore === theirs;
    return `${win?'🏆 你贏了！':tie?'🤝 平手！':'💔 朋友贏了！'}\n你：${mineScore} LIKE ${mineLive?'（存活）':'（被媽媽抓到）'}\n${s[other+'_name']}：${theirs} LIKE ${theirLive?'（存活）':'（被媽媽抓到）'}`;
  }
  function paintRoom(s) {
    lastState = s; role = s.role; seed = s.seed;
    ui.host.textContent = `${s.host_name || '房主'} ${s.host_ready?'✓ 已準備':'· 未準備'}`;
    ui.guest.textContent = s.guest_name ? `${s.guest_name} ${s.guest_ready?'✓ 已準備':'· 未準備'}` : '等待第二位玩家加入…';
    if (s.starts_at) {
      ui.ready.classList.add('hidden');
      if (live && !started) scheduleStart(s);
    } else {
      ready = role==='host'?s.host_ready:s.guest_ready;
      ui.ready.disabled = ready;
      ui.ready.textContent = ready ? '✓ 你已準備，等待朋友' : '✓ 我準備好了';
      if (ready && s.guest_name) message('等另一位玩家準備好，就會一起倒數 3、2、1！');
    }
    const ownFinished = s[role+'_finished'];
    if (ui.result && live && (s.host_finished || s.guest_finished) && ownFinished && scoreSent) {
      ui.result.textContent = resultText(s);
    }
  }
  function scheduleStart(s) {
    if (startingTimer != null || started) return;
    if (s.deck_hash !== engine.fingerprint(art)) { message('雙方素材版本不一致，不能公平對戰。請都更新網站。'); return; }
    const startAt = Date.parse(s.starts_at);
    // The RPC reports server_time; estimated offset corrects device clock skew.
    const estimatedOffset = Date.parse(s.server_time) - ((lastRequestMs || Date.now()) + Date.now())/2;
    const untilStart = startAt - (Date.now()+estimatedOffset);
    if (untilStart < -7000) { message('你錯過了開局時間，請開新房間。'); return; }
    if (untilStart > 0) {
      let remain = Math.max(1,Math.ceil(untilStart/1000));
      message(`雙方已準備！${remain} 秒後同時開始！`);
      startingTimer = setInterval(() => {
        const left = startAt - (Date.now()+estimatedOffset);
        remain = Math.max(0,Math.ceil(left/1000));
        message(remain > 0 ? `🎮 ${remain} 秒後開始！` : 'GO!');
        if (left <= 0) { clearInterval(startingTimer); startingTimer=null; launch(startAt,estimatedOffset); }
      }, 80);
    } else launch(startAt,estimatedOffset);
  }
  function launch(startServerMs, offset) {
    if (started || !live) return;
    started = true;
    const msLate = Math.max(0,Date.now()+offset-startServerMs);
    onStart?.(seed,msLate);
  }
  async function refresh() {
    if (!id || !token || refreshInFlight) return;
    refreshInFlight = true;
    try {
      const response = await rpc('dlym_duel_state',{p_room:id,p_token:token},7000);
      lastRequestMs=response.start;
      paintRoom(response.body);
    } catch(e) { if (!started) message('連線中斷：'+e.message+'（會自動重試）'); }
    finally { refreshInFlight=false; }
  }
  function startPolling() {
    clearInterval(polling);
    polling = setInterval(() => { if(live) refresh(); },1000);
  }
  async function markReady() {
    if (!id || !token || ready || !live) return;
    ui.ready.disabled = true;
    try { await rpc('dlym_duel_ready',{p_room:id,p_token:token}); await refresh(); }
    catch(e) {ui.ready.disabled=false;message('準備失敗：'+e.message);}
  }
  async function share() {
    if (!id) return;
    const url = roomUrl(id);
    const text = `👥 DON'T LIKE YOUR MOM 即時雙人 PK！\n進房間一起按準備，45 秒同時開滑！\n${url}`;
    if (navigator.share) { try { await navigator.share({title:"DON'T LIKE YOUR MOM",text});return; } catch(e) {if(e?.name==='AbortError')return;} }
    try { await navigator.clipboard.writeText(text); message('✓ 已複製邀請連結，傳給朋友加入！'); }
    catch { window.prompt('請複製房間網址',url); }
  }
  function abandon() {
    clearInterval(polling); polling=null;
    clearInterval(startingTimer); startingTimer=null;
    live=false; started=false; ready=false;id=null;token=null;seed=null;role=null;scoreSent=false;pendingOutcome=null;
    activeInvite=null; lastState=null;
    updateUrl(null);
    ui.result?.classList.add('hidden'); ui.resultRefresh?.classList.add('hidden');
    onExit?.();
  }
  async function open(fromInvite=false) {
    if (!engine || !art) { alert('抽牌資料尚未載入。'); return; }
    if (fromInvite && new URL(location.href).searchParams.get('deck') !== engine.fingerprint(art)) {
      alert('你和朋友的照片版本不同，請兩人都更新遊戲再重新建立房間。'); return;
    }
    if (id && token) { onShowScreen?.('duel'); await refresh(); return; }
    const room = fromInvite ? activeInvite : null;
    activeInvite = room;
    ui.title.textContent = room ? '加入好友房間' : '建立好友房間';
    ui.create.textContent = room ? '加入這個房間' : '建立房間';
    showLoginUI(); ui.result.textContent='';
    ui.host.textContent='房主：等待建立…';ui.guest.textContent='好友：尚未加入';
    message(room ? '這是朋友的邀請！輸入暱稱後加入，兩個人一起開始。' : '先建立房間分享連結；雙方準備後一起開滑。');
    onShowScreen?.('duel');
    const savedToken = room && saved(room);
    if (savedToken) {
      id=room;token=savedToken;live=true;
      try {
        const state = await rpc('dlym_duel_state',{p_room:id,p_token:token});
        seed=state.body.seed; lastRequestMs=state.start;
        ui.create.classList.add('hidden');ui.ready.classList.remove('hidden');
        ui.share.classList.toggle('hidden',state.body.role!=='host');
        paintRoom(state.body);startPolling();
      } catch(e) { id=null;token=null;live=false;message('舊房間已失效，請重新取得邀請連結。'); }
    }
  }
  async function finish(outcome) {
    if (!live || !started || finishPending || scoreSent) return;
    pendingOutcome = outcome || pendingOutcome;
    finishPending=true;
    if (ui.result) ui.result.textContent='⏳ 已結束對局，正在同步你與朋友的成績…';
    try { await rpc('dlym_duel_finish',{p_room:id,p_token:token,p_score:pendingOutcome.score,p_survived:pendingOutcome.survived});scoreSent=true; await refresh(); }
    catch(e) { if (ui.result) ui.result.textContent=`無法同步成績：${e.message}。點「重新同步」再試一次。`; }
    finally {finishPending=false;}
  }
  function setCallbacks(callbacks) { onStart=callbacks.start;onShowScreen=callbacks.show;onExit=callbacks.exit; }
  ui.create?.addEventListener('click',createOrJoin);
  ui.ready?.addEventListener('click',markReady);
  ui.share?.addEventListener('click',share);
  ui.exit?.addEventListener('click',abandon);
  ui.name?.addEventListener('focus',()=>document.documentElement.classList.add('keyboard-open'));
  ui.name?.addEventListener('blur',()=>document.documentElement.classList.remove('keyboard-open'));
  ui.resultRefresh?.addEventListener('click',() => {if(pendingOutcome && !scoreSent) finish(pendingOutcome);else refresh();});
  window.DLYMDuel = {open,finish,abandon,setCallbacks,share,get active(){return live;},get started(){return started;},get incoming(){return activeInvite;},get url(){return id?roomUrl(id):null;}};
})();
