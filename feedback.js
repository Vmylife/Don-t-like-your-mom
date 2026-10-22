/* Lightweight synthesized sound effects: no external assets, no network request. */
(() => {
  'use strict';
  const SOUND_KEY = 'dlym_sound_v050';
  const VIBRATE_KEY = 'dlym_vibration_v050';
  function read(key, fallback) {
    try { const item = localStorage.getItem(key); return item === null ? fallback : item === 'on'; }
    catch { return fallback; }
  }
  function save(key, enabled) { try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch {} }
  let sound = read(SOUND_KEY, true);
  let vibration = read(VIBRATE_KEY, true);
  let audio = null;
  let lastComboSound = -1;

  function context() {
    if (!sound) return null;
    try {
      if (!audio) {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!A) return null;
        audio = new A();
      }
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      return audio;
    } catch { return null; }
  }
  function tone(freq, start, duration, volume, type = 'sine', dest = null) {
    const a = context();
    if (!a) return;
    try {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, a.currentTime + start);
      gain.gain.setValueAtTime(0.0001, a.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), a.currentTime + start + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, a.currentTime + start + duration);
      osc.connect(gain).connect(dest || a.destination);
      osc.start(a.currentTime + start);
      osc.stop(a.currentTime + start + duration + .01);
    } catch { /* Audio is optional. */ }
  }
  function play(kind, count = 0) {
    if (!sound) return;
    if (kind === 'like') { tone(660, 0, .095, .09); tone(880, .075, .12, .08); }
    else if (kind === 'nope') { tone(340, 0, .09, .055, 'triangle'); tone(240, .07, .12, .04, 'triangle'); }
    else if (kind === 'mom') { tone(380, 0, .21, .13, 'sawtooth'); tone(270, .17, .23, .10, 'sawtooth'); tone(180, .34, .3, .08, 'sawtooth'); }
    else if (kind === 'win') { tone(580, 0, .15, .08); tone(740, .13, .16, .08); tone(980, .27, .23, .1); }
    else if (kind === 'combo' && count >= 10 && count % 10 === 0 && count !== lastComboSound) {
      lastComboSound = count;
      [690, 860, 1060].forEach((freq, i) => tone(freq, i * .07, .14, .045));
    }
  }
  function vibrate(pattern) {
    if (!vibration || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch {}
  }
  function setSound(v) { sound = Boolean(v); save(SOUND_KEY, sound); if (sound) context(); sync(); }
  function setVibration(v) { vibration = Boolean(v); save(VIBRATE_KEY, vibration); sync(); }
  function sync() {
    const soundBtn = document.getElementById('soundToggle');
    const vibrateBtn = document.getElementById('vibrationToggle');
    if (soundBtn) {
      soundBtn.textContent = sound ? '🔊' : '🔇';
      soundBtn.setAttribute('aria-label', sound ? '關閉音效' : '開啟音效');
      soundBtn.setAttribute('aria-pressed', String(sound));
      soundBtn.title = sound ? '音效已開啟' : '音效已關閉';
    }
    if (vibrateBtn) {
      vibrateBtn.textContent = vibration ? '📳' : '📴';
      vibrateBtn.setAttribute('aria-label', vibration ? '關閉震動' : '開啟震動');
      vibrateBtn.setAttribute('aria-pressed', String(vibration));
      vibrateBtn.title = vibration ? '震動已開啟（依手機支援情況）' : '震動已關閉';
    }
  }
  document.getElementById('soundToggle')?.addEventListener('click', () => setSound(!sound));
  document.getElementById('vibrationToggle')?.addEventListener('click', () => setVibration(!vibration));
  sync();
  window.DLYMFeedback = {
    unlock: () => { lastComboSound = -1; context(); },
    play,
    vibrate,
    resetCombo: () => { lastComboSound = -1; },
    get soundEnabled() { return sound; },
    get vibrationEnabled() { return vibration; }
  };
})();
