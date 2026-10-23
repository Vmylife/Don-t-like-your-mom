/* v0.9.0 — Update log. To record a new version, add one release to the TOP.
   Dates shown are Taiwan calendar dates, based on known update/deployment history.
   Historical minor hotfixes with no confirmed descriptions are not invented. */
(() => {
  'use strict';
  const releases = [
    { version: 'v0.9.0', date: '2026-10-24', title: '首頁新增更新日誌', changes: [
      '首頁「我要投稿」正下方新增「更新日誌」按鈕，方便查看更新內容。',
      '整理歷史主要版本，顯示版本、日期與更新摘要。'
    ]},
    { version: 'v0.8.9', date: '2026-10-24', title: '媽媽亂入標記調整', changes: [
      '調整照片結算的媽媽圈圈座標與大小，改善遠景人物辨識。',
      '更新離線快取版本，降低舊圈位持續顯示的情況。'
    ]},
    { version: 'v0.8.8', date: '2026-10-23', title: '玩家留言板', changes: [
      '新增留言板，玩家可留下閒聊、建議與問題回報。',
      '新增管理員留言審核、檢舉與下架功能。'
    ]},
    { version: 'v0.8.7', date: '2026-10-23', title: '媽媽照片擴充', changes: [
      '新增 12 張媽媽獨照，內建照片增加至 205 張。'
    ]},
    { version: 'v0.8.6', date: '2026-10-23', title: '更多交友照片', changes: [
      '此版內建素材達 193 張，加入更多生活場景與媽媽陷阱。'
    ]},
    { version: 'v0.8.4', date: '2026-10-23', title: '私人營運統計', changes: [
      '新增管理員專用統計，查看進站、開局、完賽及誤滑媽媽數據。',
      '支援 7、14、30 天區間比較與每日明細。'
    ]},
    { version: 'v0.8.2', date: '2026-10-23', title: '失敗提示優化', changes: [
      '優化結算圖片與圈圈邊緣顯示，減少貼近圖片邊界時的標記偏移。'
    ]},
    { version: 'v0.7.4', date: '2026-10-23', title: '投稿審核改進', changes: [
      '投稿審核後台可查看照片檔案大小，方便管理與壓縮。'
    ]},
    { version: 'v0.7.3', date: '2026-10-23', title: '照片載入與投稿優化', changes: [
      '改善照片預先載入流程及玩家投稿照片壓縮。'
    ]},
    { version: 'v0.7.1', date: '2026-10-23', title: '歷代日冠排行榜', changes: [
      '加入歷代每日冠軍紀錄，讓每日第一名能被保存與查閱。'
    ]},
    { version: 'v0.7.0', date: '2026-10-22', title: '玩家照片投稿', changes: [
      '支援玩家上傳交友照片，管理員審核通過後加入遊戲。'
    ]},
    { version: 'v0.6.0', date: '2026-10-22', title: '好友即時同步對戰', changes: [
      '加入雙人同步挑戰房間與分享邀請連結功能。'
    ]},
    { version: 'v0.5.9', date: '2026-10-22', title: '版本資訊顯示', changes: [
      '首頁上方顯示實際載入的遊戲版本，方便確認更新狀態。'
    ]}
  ];

  const open = document.getElementById('openChangelog');
  const close = document.getElementById('closeChangelog');
  const dialog = document.getElementById('changelogDialog');
  const entries = document.getElementById('changelogEntries');
  if (!open || !close || !dialog || !entries) return;
  let populated = false;
  const el = (tag, cls, value) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (value !== undefined) n.textContent = value;
    return n;
  };
  function render() {
    if (populated) return;
    const frag = document.createDocumentFragment();
    releases.forEach((release, index) => {
      const card = el('article', 'changelog-release' + (index === 0 ? ' latest' : ''));
      const head = el('div', 'changelog-release-head');
      head.append(el('span', 'changelog-version', release.version));
      if (index === 0) head.append(el('span', 'changelog-new', '最新版本'));
      const date = el('time', 'changelog-date', release.date.replaceAll('-', '/'));
      date.dateTime = release.date;
      head.append(date);
      card.append(head, el('h3', '', release.title));
      const list = el('ul');
      release.changes.forEach(line => list.append(el('li', '', line)));
      card.append(list);
      frag.append(card);
    });
    entries.append(frag);
    populated = true;
  }
  open.addEventListener('click', () => {
    render();
    if (!dialog.open) dialog.showModal();
    entries.scrollTop = 0;
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => open.focus({ preventScroll: true }));
})();
