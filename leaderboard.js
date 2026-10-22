/* GitHub Pages-compatible Supabase REST leaderboard. All public writes use guarded SQL RPCs. */
(() => {
  'use strict';
  const raw = window.DLYM_LEADERBOARD_CONFIG || {};
  const url = String(raw.url || '').trim().replace(/\/+$/, '');
  const key = String(raw.publishableKey || '').trim();
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && /^(sb_publishable_|eyJ)/.test(key);
  let ticketPromise = null;
  let gameId = 0;
  let submittedGameId = -1;
  let backTo = 'welcome';
  let scope = 'all';
  let lastPayload = null;
  const $ = id => document.getElementById(id);
  const ui = {
    screen: $('leaderboardScreen'), list: $('leaderboardRows'), status: $('leaderboardStatus'),
    scopeAll: $('boardAllBtn'), scopeToday: $('boardTodayBtn'),
    entry: $('scoreSubmitArea'), nickname: $('leaderboardNickname'),
    submit: $('submitScoreBtn'), submitStatus: $('scoreSubmitStatus')
  };
  const noCloudMessage = '尚未啟用全球排行：請先依 ZIP 內 README 設定 Supabase。';
  function statusText(text) { ui.status.textContent = text; }
  function submitText(text) { ui.submitStatus.textContent = text; }

  async function rpc(name, data, ms = 8500) {
    if (!configured) throw new Error(noCloudMessage);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: {
          apikey: key, 'Content-Type': 'application/json', Accept: 'application/json'
        },
        body: JSON.stringify(data),
        cache: 'no-store', signal: controller.signal
      });
      const text = await response.text();
      let value;
      try { value = text ? JSON.parse(text) : null; } catch { value = null; }
      if (!response.ok) throw new Error((value && (value.message || value.error)) || `HTTP ${response.status}`);
      return value;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('雲端連線逾時，請檢查網路。');
      throw e;
    } finally { clearTimeout(timer); }
  }
  function startRound() {
    gameId++;
    lastPayload = null;
    submittedGameId = -1;
    const id = gameId;
    ui.entry.classList.add('hidden');
    submitText('');
    ticketPromise = configured
      ? rpc('dlym_start_round', {})
          .then(ticket => id === gameId && typeof ticket === 'string' ? ticket : null)
          .catch(err => { console.warn('Leaderboard start:', err.message); return null; })
      : Promise.resolve(null);
    return ticketPromise;
  }
  function endRound(survived, result) {
    ui.entry.classList.remove('hidden');
    ui.submit.disabled = false;
    ui.submit.dataset.sent = 'false';
    if (!survived) {
      ui.entry.classList.add('hidden');
      return;
    }
    if (!configured) { submitText(noCloudMessage); ui.submit.disabled = true; }
    else submitText('存活 45 秒即可上榜！輸入暱稱並送出戰績。');
    ui.entry.dataset.score = String(result.score);
    ui.entry.dataset.avoided = String(result.avoided);
    ui.entry.dataset.combo = String(result.maxCombo);
    ui.entry.dataset.elapsed = String(result.elapsed);
  }
  async function submit() {
    if (!configured || ui.submit.disabled || ui.submit.dataset.sent === 'true') return;
    const name = ui.nickname.value.trim();
    if (Array.from(name).length < 2 || Array.from(name).length > 16 || /[\u0000-\u001f\u007f]/.test(name)) {
      submitText('暱稱請填 2～16 個字元，不能含換行或控制字元。');
      ui.nickname.focus();
      return;
    }
    const id = gameId;
    ui.submit.disabled = true;
    submitText('正在送出成績…');
    try {
      const ticket = await ticketPromise;
      if (id !== gameId) return;
      if (!ticket) throw new Error('本局未能取得雲端挑戰票券，無法送出。請檢查雲端設定／網路。');
      // Save the precise submission payload so rejected scores are diagnosable.
      // A survived game really finishes at 45 seconds. The visible timer is
      // clamped to 45s and SQL expects 44–45s; send the canonical full duration.
      const likes = Number(ui.entry.dataset.score);
      const avoided = Number(ui.entry.dataset.avoided);
      const combo = Number(ui.entry.dataset.combo);
      const realElapsed = Number(ui.entry.dataset.elapsed);
      const payload = {
        p_ticket: ticket,
        p_name: name,
        p_likes: likes,
        p_hidden_avoided: avoided,
        p_best_combo: combo,
        p_elapsed_ms: 45000
      };
      lastPayload = {likes, avoided, combo, elapsed: realElapsed, ms:payload.p_elapsed_ms};
      if (!Number.isInteger(likes) || likes < 0 || likes > 160 ||
          !Number.isInteger(avoided) || avoided < 0 || avoided > 160 ||
          !Number.isInteger(combo) || combo < 0 || combo > 160 ||
          combo > likes + avoided || !Number.isFinite(realElapsed) || realElapsed < 44000) {
        throw new Error('本局資料驗證未通過，請截圖下方診斷碼');
      }
      await rpc('dlym_submit_score', payload);
      if (id !== gameId) return;
      submittedGameId = id;
      ui.submit.dataset.sent = 'true';
      try { localStorage.setItem('dlym_player_name_v050', name); } catch {}
      submitText('✓ 已提交全球排行榜！可以點「查看排行榜」確認。');
    } catch (err) {
      if (id !== gameId) return;
      const message = err.message || '請稍後重試';
      // Do not display the private ticket UUID, publishable key or anything
      // sensitive. Numeric diagnostics let us pinpoint SQL vs cache mismatch.
      const p = lastPayload;
      const diag = p ? `v0.5.9｜LIKE ${p.likes}｜媽媽 ${p.avoided}｜COMBO ${p.combo}｜實測 ${Math.round(p.elapsed)}ms｜送出 ${p.ms}ms` : 'v0.5.9｜尚無送榜數據';
      const hint = /Invalid score submission/i.test(message)
        ? '（資料庫拒絕，請截圖診斷資料；若是舊 SQL 規則需在 Supabase 修正）' : '';
      submitText(`送出失敗：${message}${hint}\n${diag}`);
      ui.submit.disabled = false;
    }
  }
  function renderRows(rows) {
    ui.list.replaceChildren();
    if (!Array.isArray(rows) || !rows.length) {
      statusText('目前還沒有人上榜，第一名就等你了！');
      return;
    }
    statusText(`${scope === 'today' ? '今日榜（台灣時間）' : '歷史總榜'} · 前 ${rows.length} 名`);
    for (const entry of rows) {
      const rank = Number(entry.rank_no);
      const li = document.createElement('li');
      li.className = 'board-row' + (rank <= 3 ? ' top-three' : '');
      const place = document.createElement('span'); place.className = 'board-rank'; place.textContent = rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : '#' + rank;
      const name = document.createElement('span'); name.className = 'board-name'; name.textContent = String(entry.player_name || '玩家');
      const likes = Math.max(0, Number(entry.likes) || 0);
      const dodged = Math.max(0, Number(entry.hidden_avoided) || 0);
      const extra = document.createElement('span'); extra.className = 'board-extra';
      const likeText = document.createElement('span'); likeText.className = 'board-likes';
      likeText.textContent = `❤️ ${likes} LIKE`;
      likeText.title = `成功 LIKE ${likes} 位正常路人`;
      const momText = document.createElement('span'); momText.className = 'board-mom-dodged';
      momText.textContent = `🛡️ ${dodged} MOM DODGED`;
      momText.title = `成功避開 ${dodged} 張有媽媽的照片`;
      extra.append(likeText, momText);
      li.append(place, name, extra);
      ui.list.append(li);
    }
  }
  let refreshSerial = 0;
  async function refresh() {
    const serial = ++refreshSerial;
    ui.list.replaceChildren();
    statusText(configured ? '正在取得全球成績…' : noCloudMessage);
    if (!configured) return;
    try {
      const rows = await rpc('dlym_get_leaderboard', { p_scope: scope });
      if (serial === refreshSerial) renderRows(rows);
    } catch (e) {
      if (serial === refreshSerial) statusText('排行榜讀取失敗：' + (e.message || '請稍後再試'));
    }
  }
  function chooseScope(value) {
    scope = value;
    ui.scopeAll.setAttribute('aria-pressed', String(scope === 'all'));
    ui.scopeToday.setAttribute('aria-pressed', String(scope === 'today'));
    refresh();
  }
  function open(from) {
    backTo = from === 'result' ? 'result' : 'welcome';
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    ui.screen.classList.remove('hidden');
    window.scrollTo(0, 0);
    chooseScope(scope);
  }
  function close() {
    refreshSerial++;
    ui.screen.classList.add('hidden');
    $(backTo === 'result' ? 'resultScreen' : 'welcomeScreen').classList.remove('hidden');
    window.scrollTo(0, 0);
  }
  $('openLeaderboardWelcome')?.addEventListener('click', () => open('welcome'));
  $('openLeaderboardResult')?.addEventListener('click', () => open('result'));
  $('closeLeaderboard')?.addEventListener('click', close);
  ui.scopeAll.addEventListener('click', () => chooseScope('all'));
  ui.scopeToday.addEventListener('click', () => chooseScope('today'));
  $('refreshLeaderboard')?.addEventListener('click', refresh);
  ui.submit.addEventListener('click', submit);
  ui.nickname.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  try { const name = localStorage.getItem('dlym_player_name_v050'); if (name) ui.nickname.value = name.slice(0, 16); } catch {}
  window.DLYMLeaderboard = { startRound, endRound, configured, isUploaded: () => submittedGameId === gameId };
})();
