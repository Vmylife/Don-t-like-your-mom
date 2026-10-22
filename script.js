/* DON'T LIKE YOUR MOM — v0.5.9: submission diagnostics & runtime version; corrected MOM dodges in leaderboard payload; no-repeat decks, MOM roasts, friend challenges. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SCREENS = { welcome: $('welcomeScreen'), game: $('gameScreen'), result: $('resultScreen') };
  const ui = {
    start: $('startButton'), retry: $('retryButton'), share: $('shareButton'),
    card: $('swipeCard'), cardArea: $('cardArea'), profileImage: $('profileImage'),
    profileName: $('profileName'), profileBio: $('profileBio'), profileCity: $('profileCity'),
    likeStamp: $('likeStamp'), nopeStamp: $('nopeStamp'),
    nope: $('nopeButton'), like: $('likeButton'),
    timer: $('timerValue'), timerFill: $('timerFill'), score: $('scoreValue'), best: $('bestValue'),
    stagePill: $('stagePill'), stageName: $('stageName'), combo: $('comboChip'),
    resultEmoji: $('resultEmoji'), resultEyebrow: $('resultEyebrow'),
    resultTitle: $('resultTitle'), resultSubtitle: $('resultSubtitle'),
    finalScore: $('finalScore'), finalTime: $('finalTime'), finalAvoided: $('finalAvoided'),
    evidencePanel: $('evidencePanel'), evidenceImage: $('evidenceImage'),
    evidenceSpot: $('evidenceSpot'), evidenceIdentity: $('evidenceIdentity'),
    evidenceReason: $('evidenceReason'), recordMessage: $('recordMessage')
  };
  const DURATION = 45_000;
  const LEVELS = [
    { at: 0, title: '先認清媽媽本人', momChance: 0.15, hiddenChance: 0 },
    { at: 5, title: '媽媽開始亂入背景', momChance: 0.24, hiddenChance: .50 },
    { at: 12, title: '媽媽藏在人群裡', momChance: 0.32, hiddenChance: .60 },
    { at: 22, title: '眼尖地獄', momChance: 0.4, hiddenChance: .65 }
  ];
  const NAMES = [
    'Jessie','Alex','Yuki','Ryan','Mia','Leo','Ariel','Kevin','Nina','Evan',
    'Tina','Marcus','Olivia','Jay','Claire','Ethan','Amber','Kai','Emma','Lucas',
    'Ruby','Jason','Naomi','Ben','Zoe','Daniel','Lily','Max','Nora','Peter',
    'Sophie','Noah','Alice','Oscar','Hana','Tom','Emily','Felix','Chloe','Andy',
    'Bella','Chris','Ivy','Robin','Jade','Theo','Luna','Eric','Grace','Henry',
    'Daisy','Sam','Vicky','Allen','Annie','Sean','Eva','Jack','Lucy',
    'Rita','Owen','Rose','Finn','Wendy'
  ];
  const BIOS = [
    '喜歡咖啡、電影，還有散步。','週末想去海邊發呆。','可以一起吃宵夜嗎？',
    '我有一隻很黏人的貓。','旅行的意義是找到好吃的。','新手登山客，缺個旅伴。',
    '最愛下雨天聽音樂。','一起探索城市的小角落。','想找人一起看恐怖片！',
    '每天都要喝一杯拿鐵。','最近開始學做甜點。','有沒有推薦的漫畫？',
    '交友第一天，請多指教。','喜歡小動物和慢慢的生活。','一起去逛夜市吧！',
    '我會煮義大利麵，真的。','希望遇到幽默的人。','想挑戰人生第一場馬拉松。',
    '海邊夕陽真的很療癒。','想找人一起練英文。'
  ];
  const CITIES = ['台北','高雄','台中','台南','桃園','新竹','嘉義','花蓮','宜蘭','基隆'];
  const MOM_NAMES = ['Momoko','MOM_1998','OnlyMom','MommyLove','MommaMia','SuperMOM','MOM_IS_HERE','Mommy_Queen'];
  const MOM_BIOS = ['週末都和 MOM 一起做甜點。','我的暱稱就是 MOM，你猜為什麼？','#MOM #Coffee #Love','喜歡旅行、貓咪、還有 MOM。'];
  const ART = window.ART_DATA;
  if (!ART) {
    console.error('Art data failed to load. Check that art-data.js is uploaded.');
    $('welcomeTitle').textContent = '素材未載入，請重新整理';
    ui.start.disabled = true;
    return;
  }

  let best = readBest();
  let hiddenAvoided = 0;
  let active = false;
  let locked = false;
  let ended = false;
  let score = 0;
  let avoided = 0;
  let skipped = 0;
  let combo = 0;
  let maxCombo = 0;
  let shown = 0;
  const ENGINE = window.DLYMDeckEngine;
  let roundDeck = null;
  let currentMode = 'free';
  let currentChallengeSeed = null;
  let currentFriendTarget = null;
  let incomingInvite = ENGINE?.parseInvite(ART) || null;
  const inviteInfo = $('challengeInviteInfo');
  const friendBtn = $('friendChallengeButton');
  const notice = $('resultNotice');
  const MOM_ROASTS = [
    '寶貝，你是在找對象還是在找媽媽？','我已經截圖傳給你爸了。',
    '我是你媽耶！眼鏡要不要換一副？','回家洗碗，順便反省一下。',
    '你連媽媽都認不出來喔？','你小時候我可沒認錯過你！',
    '這個讚我會記一輩子。','還敢說你眼力很好？',
    '下次滑慢點，媽媽很傷心。','你的交友眼光，媽媽很擔心。',
    '我只是路過也能被你滑到？','你是不是把我設成最愛了？',
    '媽媽不是你的配對對象！','晚餐不用回來吃了……開玩笑的。',
    '這都認不出來，罰你拖地！','我跟你爸都看到囉。'
  ];
  let current = null;
  let endAt = 0;
  let startAt = 0;
  let frame = null;
  let pendingTransition = null;
  let lastOutcome = null;
  let dragging = null;
  let momPending = false;

  // Prepare/decode a small deck before the user swipes. Use the SAME decoded
  // <img> node for the visible card, instead of changing src on the old image.
  const DECK_AHEAD = 5;
  let upcoming = [];
  let preparedLevel = -1;
  let renderSerial = 0;
  let previewSerial = 0;

  // The rear card is a real clone of the active card's COMPLETE template.
  // They therefore share the photo aspect ratio, gradient, bio, badges,
  // typography and spacing (including all responsive styles).
  const preview = ui.card.cloneNode(true);
  preview.removeAttribute('id');
  preview.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  preview.className = 'swipe-card prepared-card';
  preview.setAttribute('aria-hidden', 'true');
  const previewPhoto = preview.querySelector('.profile-photo');
  const previewName = preview.querySelector('.identity-line h3');
  const previewBio = preview.querySelector('.profile-details p');
  const previewCity = preview.querySelector('.distance-row span');
  // Never use the HTML's initial profile art on the rear card.
  previewPhoto.querySelector('img').remove();
  let previewImg = null;
  ui.cardArea.insertBefore(preview, ui.card);

  function prepareEntry(person) {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.alt = `${person.name} 的真人風格交友照片`;
    // Always preserve the *entire* photo. The card uses a softened copy of
    // the same URL for the side-fill, not another network image file.
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center center';
    const entry = { person, img, ready: false, failed: false, promise: null };
    img.src = person.image;
    // decode() resolves only once the complete image can be painted.
    // Safari and older browsers may reject or not support it; fall back to load.
    entry.promise = (typeof img.decode === 'function'
      ? img.decode().catch(() => {
          if (img.complete) {
            if (img.naturalWidth > 0) return;
            throw new Error(`Failed to load ${person.image}`);
          }
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', reject, { once: true });
          });
        })
      : new Promise((resolve, reject) => {
          if (img.complete) return img.naturalWidth > 0 ? resolve() : reject(new Error(`Failed to load ${person.image}`));
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', reject, { once: true });
        }))
      .then(() => { entry.ready = true; return true; })
      .catch(() => { entry.failed = true; return false; });
    return entry;
  }

  function fillDeck() {
    const nowLevel = level();
    if (currentMode !== 'challenge' && preparedLevel !== nowLevel) {
      // Discard stale prepared cards on a level-up, so difficulty changes right away.
      upcoming = [];
      preparedLevel = nowLevel;
    }
    while (upcoming.length < DECK_AHEAD) {
      const position = shown + upcoming.length + 1;
      upcoming.push(prepareEntry(nextProfile(position)));
    }
  }

  function takeReadyCard() {
    fillDeck();
    const entry = upcoming.shift();
    shown++;
    fillDeck();
    return entry;
  }

  function paintPreview() {
    const entry = upcoming[0];
    const serial = ++previewSerial;
    // Clear only the photo element, NOT the photo overlay / gradients / labels.
    // Once promoted, the prepared <img> belongs to the front card.
    // Never delete it while clearing the rear preview.
    if (previewImg && previewImg.parentElement === previewPhoto) previewImg.remove();
    previewImg = null;
    if (!entry) {
      previewName.textContent = '';
      previewBio.textContent = '';
      previewCity.textContent = '';
      return;
    }
    const person = entry.person;
    // Keep blurred backdrop and original image in lockstep on the rear card.
    previewPhoto.style.setProperty('--portrait-background', `url("${person.image}")`);
    previewName.replaceChildren(document.createTextNode(person.name + ' '));
    const age = document.createElement('span');
    age.textContent = person.age;
    previewName.appendChild(age);
    previewBio.textContent = person.bio;
    previewCity.textContent = person.city;
    const apply = () => {
      if (serial !== previewSerial || upcoming[0] !== entry || !active || !entry.ready) return;
      // Move the already-decoded node directly into the *same* photo template.
      // On the next swipe, this exact node moves to the front card.
      previewImg = entry.img;
      previewPhoto.insertBefore(entry.img, previewPhoto.firstChild);
    };
    if (entry.ready) apply();
    else entry.promise.then(apply);
  }

  function readBest() {
    try { return Number(localStorage.getItem('dlym_best_v04_likes')) || 0; }
    catch { return 0; }
  }
  function saveBest(value) {
    try { localStorage.setItem('dlym_best_v04_likes', String(value)); } catch { /* private browsing */ }
  }
  function makeProfile(art) {
    const idx = ((art.persona || 1) - 1) % 64;
    return {
      image: `./assets/profiles/${art.file}`,
      name: art.name || NAMES[idx],
      age: art.age || (22 + (idx * 7) % 19),
      bio: art.bio || BIOS[(idx * 7 + 3) % BIOS.length],
      city: art.city || CITIES[(idx * 3) % CITIES.length],
      isMom: false,
      trapType: null,
      spot: null,
      reason: ''
    };
  }
  function level() {
    if (currentMode === 'challenge' && roundDeck) return roundDeck.stageForCard(Math.max(1,shown));
    let idx = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (score >= LEVELS[i].at) { idx = i; break; }
    }
    return idx;
  }
  function nextProfile(position) {
    const {art,type} = roundDeck.next(position, level());
    if (type === 'normal') return makeProfile(art);
    if (type === 'background') return {
      ...makeProfile(art), isMom: true, trapType: 'background', spot: art.spot, reason: art.reason
    };
    return { image: `./assets/profiles/${art.file}`, name: 'MOM', age: 56,
      bio: '寶貝，媽媽看見你囉。', city: '就在你家附近',
      isMom: true, trapType: 'direct', spot: art.spot, reason: art.reason };
  }

  function showScreen(name) {
    for (const [key, element] of Object.entries(SCREENS)) element.classList.toggle('hidden', key !== name);
    // Fullscreen shell does not scroll; each screen owns its layout.
  }
  function syncHUD() {
    ui.score.textContent = score;
    ui.best.textContent = best;
    const lvl = level();
    ui.stagePill.textContent = currentMode === 'challenge' ? `DUEL ${lvl + 1}` : `LEVEL ${lvl + 1}`;
    ui.stageName.textContent = LEVELS[lvl].title;
    ui.combo.textContent = combo >= 3 ? `🔥 ${combo} COMBO` : '';
  }
  function setCard(entry) {
    const person = entry.person;
    current = person;
    const serial = ++renderSerial;
    // Hide the previous image AND previous backdrop to prevent stale-card flashes.
    ui.profileImage.style.visibility = 'hidden';
    const photoSurface = ui.profileImage.closest('.profile-photo');
    photoSurface?.style.setProperty('--portrait-background', 'none');
    const reveal = () => {
      if (serial !== renderSerial || !active || current !== person || !entry.ready) return;
      const oldImage = ui.profileImage;
      entry.img.id = 'profileImage';
      entry.img.style.visibility = 'visible';
      oldImage.removeAttribute('id');
      oldImage.replaceWith(entry.img); // Atomically move already-decoded img into place.
      ui.profileImage = entry.img;
      photoSurface?.style.setProperty('--portrait-background', `url("${person.image}")`);
    };
    if (entry.ready) reveal();
    else entry.promise.then(reveal);

    ui.profileName.replaceChildren(document.createTextNode(person.name + ' '));
    const age = document.createElement('span');
    age.textContent = person.age;
    ui.profileName.appendChild(age);
    ui.profileBio.textContent = person.bio;
    ui.profileCity.textContent = person.city;
    ui.card.setAttribute('aria-label', `${person.name}，${person.age} 歲，${person.bio}；左滑略過，右滑喜歡`);
    clearDrag();
  }
  function clearDrag() {
    ui.card.classList.remove('dragging','animating');
    ui.card.style.transform = '';
    ui.card.style.opacity = '1';
    ui.likeStamp.style.opacity = '0';
    ui.nopeStamp.style.opacity = '0';
    dragging = null;
  }
  function startGame(mode='free', seed=null, friendTarget=null) {
    if (!ENGINE) { alert('照片抽牌功能未載入，請確認 deck-engine.js 已上傳。'); return; }
    currentMode = mode;
    currentChallengeSeed = mode === 'challenge' ? (seed || ENGINE.newSeed()) : null;
    currentFriendTarget = mode === 'challenge' ? friendTarget : null;
    roundDeck = ENGINE.create(ART, {mode,seed:currentChallengeSeed});
    if (pendingTransition) { clearTimeout(pendingTransition); pendingTransition = null; }
    if (frame) cancelAnimationFrame(frame);
    score = 0; avoided = 0; hiddenAvoided = 0; skipped = 0; combo = 0; maxCombo = 0; shown = 0;
    window.DLYMFeedback?.unlock();
    window.DLYMFeedback?.resetCombo();
    window.DLYMLeaderboard?.startRound();
    upcoming = []; preparedLevel = -1;
    ++renderSerial; ++previewSerial; // Cancel previous round's in-flight image work.
    // Once promoted, the prepared <img> belongs to the front card.
    // Never delete it while clearing the rear preview.
    if (previewImg && previewImg.parentElement === previewPhoto) previewImg.remove();
    previewImg = null;
    active = true; ended = false; locked = false; momPending = false;
    ui.share.textContent = mode === 'challenge' ? '👥 分享好友挑戰 ↗' : '分享戰績 ↗';
    ui.timer.classList.remove('danger');
    startAt = performance.now();
    endAt = startAt + DURATION;
    ui.timer.textContent = (DURATION / 1000).toFixed(1);
    ui.timerFill.style.width = '100%';
    syncHUD();
    showScreen('game');
    setCard(takeReadyCard());
    paintPreview();
    frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!active || ended) return;
    const ms = Math.max(0, endAt - now);
    ui.timer.textContent = (ms / 1000).toFixed(1);
    ui.timerFill.style.width = (ms / DURATION * 100).toFixed(2) + '%';
    if (ms <= 5000) ui.timer.classList.add('danger');
    if (ms <= 0) { if (!momPending) endGame(false); return; }
    frame = requestAnimationFrame(tick);
  }
  function swipe(which) {
    if (!active || locked || ended) return;
    if (performance.now() >= endAt) { endGame(false); return; }
    locked = true;
    const person = current;
    if (which === 'like' && person.isMom) {
      momPending = true;
      window.DLYMFeedback?.play('mom');
      window.DLYMFeedback?.vibrate([120,60,180]);
      ui.likeStamp.style.opacity = '1';
      ui.card.classList.add('animating');
      ui.card.style.transform = 'translate3d(120%, -6px, 0) rotate(21deg)';
      pendingTransition = setTimeout(() => {
        pendingTransition = null;
        endGame(true, person);
      }, 240);
      return;
    }
    if (which === 'like' && !person.isMom) {
      score++; combo++;
    } else if (which === 'nope' && person.isMom) {
      avoided++; combo++;
      if (person.trapType === 'background') hiddenAvoided++;
    } else { skipped++; combo = 0; }
    if (combo > maxCombo) maxCombo = combo;
    window.DLYMFeedback?.play(which === 'like' ? 'like' : 'nope');
    window.DLYMFeedback?.play('combo', combo);
    // Level can change on this swipe; replace prepared cards for the new level.
    fillDeck();
    paintPreview();
    window.DLYMFeedback?.vibrate(which === 'like' ? 12 : 7);
    const direction = which === 'like' ? 1 : -1;
    ui.card.classList.add('animating');
    ui.card.classList.remove('dragging');
    ui.card.style.transform = `translate3d(${direction * 135}%, -10px, 0) rotate(${direction * 23}deg)`;
    ui.card.style.opacity = '0';
    ui.likeStamp.style.opacity = direction === 1 ? '1' : '0';
    ui.nopeStamp.style.opacity = direction === -1 ? '1' : '0';
    syncHUD();
    pendingTransition = setTimeout(() => {
      pendingTransition = null;
      if (!active) return;
      setCard(takeReadyCard());
      paintPreview();
      locked = false;
    }, 225);
  }
  function endGame(likedMom, culprit = null) {
    if (!active || ended) return;
    ended = true; active = false; locked = true;
    ++renderSerial; ++previewSerial;
    if (frame) cancelAnimationFrame(frame);
    if (pendingTransition) { clearTimeout(pendingTransition); pendingTransition = null; }
    const elapsed = Math.min(DURATION, performance.now() - startAt);
    const survived = !likedMom;
    if (survived) {
      window.DLYMFeedback?.play('win');
      window.DLYMFeedback?.vibrate([38,25,75]);
    }
    const isNewRecord = survived && score > best;
    if (isNewRecord) { best = score; saveBest(best); }
    ui.resultEmoji.textContent = likedMom ? '💔' : '🏆';
    ui.resultEyebrow.textContent = likedMom ? 'MOM ALERT · GAME OVER' : 'MISSION COMPLETED';
    ui.resultTitle.innerHTML = likedMom ? 'YOU LIKED<br>YOUR MOM.' : 'YOU SURVIVED<br>YOUR MOM.';
    ui.resultSubtitle.textContent = likedMom ? "BRO. THAT'S YOUR MOM." : `成功 LIKE ${score} 位正常交友對象！`; 
    ui.finalScore.textContent = score;
    ui.finalTime.textContent = (elapsed / 1000).toFixed(1) + 's';
    ui.finalAvoided.textContent = hiddenAvoided;
    ui.recordMessage.classList.toggle('hidden', !isNewRecord);
    ui.evidencePanel.classList.toggle('hidden', !likedMom);
    const roast = MOM_ROASTS[Math.floor(Math.random() * MOM_ROASTS.length)];
    notice.textContent = likedMom ? `👩 媽媽：「${roast}」` : '只有 45 秒，看看下一局能 LIKE 幾個人。';
    if (currentMode === 'challenge') {
      if (currentFriendTarget && currentFriendTarget.target != null) {
        const friend = currentFriendTarget;
        const won = (survived && !friend.survived) || (survived === friend.survived && score > friend.target);
        const tie = survived === friend.survived && score === friend.target;
        notice.textContent = `${won ? '🏆 你贏了！' : tie ? '🤝 平手！' : '🎯 再挑戰！'} 你 ${score} LIKE ${survived ? '（存活）' : '（失敗）'} · 朋友 ${friend.target} LIKE ${friend.survived ? '（存活）' : '（失敗）'}`;
      } else notice.textContent = '👥 同一組照片已鎖定，點「分享好友挑戰」邀朋友 PK！';
    }
    lastOutcome = { likedMom, score, avoided, elapsed, maxCombo, mode:currentMode, seed:currentChallengeSeed };
    // SQL verifies best_combo <= likes + mom dodges. A valid combo includes
    // both direct MOMs and background MOMs. Send the TOTAL, not only hidden
    // background MOMs, or a flawless round can be rejected as invalid.
    window.DLYMLeaderboard?.endRound(survived, {
      score, avoided, maxCombo, elapsed
    });
    if (likedMom && culprit) {
      const evidenceFrame = ui.evidenceImage.parentElement;
      evidenceFrame.style.removeProperty('--evidence-aspect');
      ui.evidenceImage.onload = () => {
        const { naturalWidth, naturalHeight } = ui.evidenceImage;
        if (naturalWidth > 0 && naturalHeight > 0) {
          evidenceFrame.style.setProperty('--evidence-aspect', String(naturalWidth / naturalHeight));
        }
      };
      ui.evidenceImage.src = culprit.image;
      if (ui.evidenceImage.complete && ui.evidenceImage.naturalWidth) ui.evidenceImage.onload();
      ui.evidenceImage.alt = `${culprit.name}，剛剛沒發現的媽媽陷阱`;
      ui.evidenceReason.textContent = '↳ ' + culprit.reason + (currentMode === 'challenge' ? ` · 媽媽：「${roast}」` : '');
      ui.evidenceIdentity.replaceChildren();
      const lead = document.createTextNode(`${culprit.name}，${culprit.age} 歲`);
      const label = document.createElement('span');
      ui.evidenceIdentity.appendChild(lead);
      if (culprit.trapType === 'name' || culprit.trapType === 'bio') {
        const marked = document.createElement('mark');
        marked.textContent = culprit.trapType === 'name' ? ' ← 名字有 MOM！' : '自介：「' + culprit.bio + '」';
        ui.evidenceIdentity.appendChild(document.createTextNode(' '));
        ui.evidenceIdentity.appendChild(marked);
      }
      ui.evidenceSpot.className = 'evidence-spot hidden';
      ui.evidenceSpot.style.width = '';
      ui.evidenceSpot.style.height = '';
      if (culprit.spot) {
        const isBackgroundMom = culprit.trapType !== 'direct';
        // v0.4.8: show a broad area rather than trying to circle an exact face.
        // A background MOM marker is THREE TIMES its original diameter.
        // Nudge only markers close to the image edge so the larger circle stays visible.
        const originalSize = Number(culprit.spot.size) || 16;
        const markerSize = isBackgroundMom ? Math.min(90, originalSize * 3) : originalSize;
        const originalX = Number(culprit.spot.x) || 50;
        const markerX = isBackgroundMom
          ? Math.max(markerSize / 2, Math.min(100 - markerSize / 2, originalX))
          : originalX;
        ui.evidenceSpot.classList.remove('hidden');
        ui.evidenceSpot.classList.add(isBackgroundMom ? 'spot-small' : 'spot-direct');
        ui.evidenceSpot.style.left = markerX + '%';
        ui.evidenceSpot.style.top = culprit.spot.y + '%';
        ui.evidenceSpot.style.width = markerSize + '%';
        ui.evidenceSpot.style.height = 'auto';
      }
    }
    showScreen('result');
  }

  // Pointer events work with fingers, mice and digital pens.
  ui.card.addEventListener('pointerdown', event => {
    if (!active || locked || ended || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    ui.card.setPointerCapture(event.pointerId);
    ui.card.classList.add('dragging');
    ui.card.classList.remove('animating');
  });
  ui.card.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== dragging.pointerId || !active) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    ui.card.style.transform = `translate3d(${dx}px, ${Math.min(50,Math.max(-50,dy*.28))}px,0) rotate(${Math.min(18,Math.max(-18,dx*.06))}deg)`;
    ui.likeStamp.style.opacity = String(Math.max(0, Math.min(1, dx / 110)));
    ui.nopeStamp.style.opacity = String(Math.max(0, Math.min(1, -dx / 110)));
  });
  ui.card.addEventListener('pointerup', event => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
    const dx = event.clientX - dragging.x;
    dragging = null;
    try { ui.card.releasePointerCapture(event.pointerId); } catch { /* no-op */ }
    ui.card.classList.remove('dragging');
    if (dx > 68) swipe('like');
    else if (dx < -68) swipe('nope');
    else {
      ui.card.classList.add('animating');
      ui.card.style.transform = '';
      ui.likeStamp.style.opacity = '0';
      ui.nopeStamp.style.opacity = '0';
      setTimeout(() => { if (active && !locked) ui.card.classList.remove('animating'); }, 240);
    }
  });
  ui.card.addEventListener('pointercancel', () => {
    if (!active || locked) return;
    clearDrag();
  });

  ui.nope.addEventListener('click', () => swipe('nope'));
  ui.like.addEventListener('click', () => swipe('like'));
  function refreshInvite() {
    if (incomingInvite?.invalid) {
      inviteInfo.textContent = incomingInvite.reason;
      inviteInfo.classList.remove('hidden');
      ui.start.textContent = '開始一般滑卡 ➜';
      friendBtn.textContent = '👥 建立新挑戰';
      return;
    }
    if (incomingInvite) {
      ui.start.textContent = '接受好友挑戰 ➜';
      friendBtn.textContent = '🎮 自由模式';
      inviteInfo.textContent = incomingInvite.target != null
        ? `👥 朋友的目標：${incomingInvite.target} LIKE ${incomingInvite.survived ? '（45 秒存活）' : '（誤滑媽媽）'} · 相同照片順序`
        : '👥 你收到好友挑戰！45 秒，雙方會遇到同樣的照片順序。';
      inviteInfo.classList.remove('hidden');
    } else {
      ui.start.textContent = '開始滑卡 ➜';
      friendBtn.textContent = '👥 挑戰朋友';
      inviteInfo.classList.add('hidden');
    }
  }
  ui.start.addEventListener('click', () => {
    if (incomingInvite && !incomingInvite.invalid) startGame('challenge',incomingInvite.seed,incomingInvite);
    else startGame('free');
  });
  friendBtn.addEventListener('click', () => {
    if (incomingInvite) {
      incomingInvite = null;
      const url = new URL(location.href);
      url.searchParams.delete('duel');url.searchParams.delete('deck');url.searchParams.delete('target');url.searchParams.delete('won');
      history.replaceState(null,'',url.toString());
      refreshInvite();
      startGame('free');
    } else startGame('challenge');
  });
  ui.retry.addEventListener('click', () => startGame(currentMode,currentMode === 'challenge' ? currentChallengeSeed : null,currentFriendTarget));
  $('homeButton').addEventListener('click', () => {
    // No result dialog, timer, or pending swipe should continue on home.
    active = false; ended = true; locked = false; momPending = false;
    if (frame) { cancelAnimationFrame(frame); frame = null; }
    if (pendingTransition) { clearTimeout(pendingTransition); pendingTransition = null; }
    ++renderSerial; ++previewSerial;
    clearDrag();
    showScreen('welcome');
  });
  // Stop browser double-tap gestures without affecting horizontal swipe-card dragging.
  document.addEventListener('gesturestart', event => { if (event.cancelable) event.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', event => { if (event.cancelable) event.preventDefault(); }, { passive: false });
  const nicknameField = $('leaderboardNickname');
  const onKeyboardFocus = () => document.documentElement.classList.add('keyboard-open');
  const onKeyboardBlur = () => document.documentElement.classList.remove('keyboard-open');
  nicknameField?.addEventListener('focus', onKeyboardFocus);
  nicknameField?.addEventListener('blur', onKeyboardBlur);
  document.addEventListener('keydown', e => {
    if (!active || e.repeat) return;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { e.preventDefault(); swipe('nope'); }
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { e.preventDefault(); swipe('like'); }
  });
  document.addEventListener('visibilitychange', () => {
    if (active && !document.hidden && performance.now() >= endAt) endGame(false);
  });
  ui.share.addEventListener('click', async () => {
    if (!lastOutcome) return;
    const message = lastOutcome.likedMom
      ? `💔 DON'T LIKE YOUR MOM！我在 ${(lastOutcome.elapsed / 1000).toFixed(1)} 秒內成功 LIKE ${lastOutcome.score} 人，結果還是誤滑到媽媽了！你敢挑戰嗎？`
      : `🏆 DON'T LIKE YOUR MOM！我在 45 秒內成功 LIKE ${lastOutcome.score} 位交友對象！你能破我的紀錄嗎？`;
    const text = lastOutcome.mode === 'challenge'
      ? `👥 DON'T LIKE YOUR MOM 好友同題挑戰！${lastOutcome.likedMom ? '我誤滑媽媽了' : '我活過了 45 秒'}，獲得 ${lastOutcome.score} LIKE。你能贏我嗎？\n${ENGINE.challengeUrl(ART,lastOutcome.seed,lastOutcome)}`
      : message + '\n' + new URL(location.pathname,location.origin).toString();
    if (navigator.share) {
      try { await navigator.share({ title: "DON'T LIKE YOUR MOM", text }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed'; textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try { copied = document.execCommand('copy'); } catch { /* fallback */ }
      textarea.remove();
    }
    if (copied) {
      ui.share.textContent = '✓ 連結已複製';
      setTimeout(() => { ui.share.textContent = lastOutcome?.mode === 'challenge' ? '👥 分享好友挑戰 ↗' : '分享戰績 ↗'; }, 1800);
    } else ui.share.textContent = '無法複製，請手動分享網址';
  });
  ui.best.textContent = best;
  refreshInvite();
  // The badge is set from the JS that actually executed, not merely HTML.
  const activeBuild = 'v0.5.9';
  document.querySelector('.app-footer span:last-child').textContent = activeBuild + ' · 70 NORMAL + 29 MOM';
  const badge = document.getElementById('gameVersionBadge');
  if (badge) badge.textContent = activeBuild + ' · 99 張照片';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=0.5.9', {updateViaCache:'none'}).then(reg => reg.update()).catch(() => {});
    });
  }
})();
