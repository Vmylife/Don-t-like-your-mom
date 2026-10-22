/* v0.5.7 — deterministic friend decks + no-repeat normal games. No dependencies. */
(() => {
  'use strict';
  const TYPES = ['normal', 'background', 'direct'];
  const HISTORY_LIMIT = { normal: 22, background: 8, direct: 6 };
  const STORAGE_KEY = 'dlym_recent_cards_v057';
  const DECK_VERSION = 'friend-v1';
  function fingerprint(art) {
    let h = 2166136261 >>> 0;
    for (const type of TYPES) for (const record of art[type]) {
      for (const ch of record.file) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
      h ^= 124; h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }
  function pseudoRandom(seed) {
    // FNV-1a followed by mulberry32. No browser-dependent Math.random in friend mode.
    let state = 2166136261 >>> 0;
    for (const ch of (DECK_VERSION + ':' + seed)) {
      state ^= ch.charCodeAt(0); state = Math.imul(state, 16777619) >>> 0;
    }
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function newSeed() {
    const values = new Uint32Array(2);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(values);
    else { values[0] = (Math.random() * 0x100000000) >>> 0; values[1] = (Math.random() * 0x100000000) >>> 0; }
    return Array.from(values, num => num.toString(16).padStart(8, '0')).join('');
  }
  function readHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return Object.fromEntries(TYPES.map(type => [type,
        Array.isArray(data[type]) ? data[type].filter(s => typeof s === 'string').slice(-HISTORY_LIMIT[type]) : []]));
    } catch { return {normal:[],background:[],direct:[]}; }
  }
  function saveHistory(history) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch { /* offline private mode */ }
  }
  function create(art, {mode='free', seed=null}={}) {
    const isChallenge = mode === 'challenge';
    if (isChallenge && !/^[a-f0-9]{16}$/.test(seed || '')) throw new Error('Invalid challenge seed');
    const rnd = isChallenge ? pseudoRandom(seed) : Math.random;
    const history = isChallenge ? {normal:[],background:[],direct:[]} : readHistory();
    const bags = {};
    const drawn = {normal:new Set(),background:new Set(),direct:new Set()};
    const sequence = [];
    let firstMomAt = 4 + Math.floor(rnd() * 3);
    function shuffle(a) {
      for (let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
      return a;
    }
    function pull(type) {
      if (!bags[type]?.length) {
        bags[type] = shuffle(art[type].slice());
        drawn[type].clear();
      }
      let index = bags[type].length - 1;
      // When possible, exclude cards seen in the last few games, and cards
      // already shown in this cycle. The bags ensure no repeat until exhausted.
      if (!isChallenge && bags[type].length > 1) {
        for (let i=bags[type].length-1;i>=0;i--) {
          if (!history[type].includes(bags[type][i].file)) { index=i; break; }
        }
      }
      const [record] = bags[type].splice(index,1);
      drawn[type].add(record.file);
      if (!isChallenge) {
        history[type].push(record.file);
        history[type] = history[type].slice(-HISTORY_LIMIT[type]);
        saveHistory(history);
      }
      return record;
    }
    // In friend mode level depends ONLY on the card number, never on score:
    // a fast player and a slow player always see the same cards in the same order.
    function stageForCard(position) {
      if (position <= 9) return 0;
      if (position <= 20) return 1;
      if (position <= 36) return 2;
      return 3;
    }
    function generate(position, lvl) {
      const chances = [{mom:.15, hidden:0},{mom:.24,hidden:.5},
        {mom:.32,hidden:.6},{mom:.4,hidden:.65}][lvl];
      let type;
      if (position < firstMomAt) type = 'normal';
      else if (position === firstMomAt) type = 'direct';
      else if (rnd() >= chances.mom) type = 'normal';
      else type = rnd() > chances.hidden ? 'direct' : 'background';
      return {type, art:pull(type)};
    }
    return {
      mode, seed, firstMomAt,
      stageForCard,
      next(position, scoreLevel=0) {
        if (isChallenge) {
          while (sequence.length < position) sequence.push(generate(sequence.length+1,stageForCard(sequence.length+1)));
          return sequence[position-1];
        }
        return generate(position,scoreLevel);
      }
    };
  }
  function parseInvite(art, search=location.search) {
    const query = new URLSearchParams(search);
    const seed = query.get('duel');
    if (!seed || !/^[a-f0-9]{16}$/.test(seed)) return null;
    const version = query.get('deck');
    if (version !== fingerprint(art)) return {invalid:true,reason:'照片版本不同，無法保證兩邊題目一致。請雙方更新到最新版後重新分享挑戰。'};
    const raw = query.get('target');
    const target = raw != null && /^\d{1,3}$/.test(raw) ? Number(raw) : null;
    const won = query.get('won');
    return {seed, target, survived: won === '1' ? true : won === '0' ? false : null};
  }
  function challengeUrl(art, seed, outcome=null) {
    const url = new URL(location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set('duel',seed);
    url.searchParams.set('deck',fingerprint(art));
    if (outcome) {
      url.searchParams.set('target',String(Math.min(999,Math.max(0,outcome.score|0))));
      url.searchParams.set('won',outcome.likedMom?'0':'1');
    }
    return url.toString();
  }
  window.DLYMDeckEngine = {create,newSeed,parseInvite,challengeUrl,fingerprint,DECK_VERSION};
})();
