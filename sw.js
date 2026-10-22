/* Offline-ready v0.6.0: simultaneous two-player rooms; 99 photos unchanged. */
const VERSION = 'dlym-v0.6.0-live-duel-20261022';
const SHELL = ["./","./index.html","./style.css","./script.js","./deck-engine.js","./live-duel.js","./art-data.js","./leaderboard-config.js","./leaderboard.js","./feedback.js","./manifest.webmanifest","./assets/icon-192-mom-v1.png","./assets/icon-512-mom-v1.png","./assets/apple-touch-icon-mom-v1.png","./assets/profiles/hidden_01.webp","./assets/profiles/hidden_02.webp","./assets/profiles/hidden_03.webp","./assets/profiles/hidden_04.webp","./assets/profiles/hidden_05.webp","./assets/profiles/hidden_06.webp","./assets/profiles/hidden_07.webp","./assets/profiles/hidden_08.webp","./assets/profiles/hidden_09.webp","./assets/profiles/hidden_10.webp","./assets/profiles/hidden_11.webp","./assets/profiles/hidden_12.webp","./assets/profiles/hidden_13.webp","./assets/profiles/hidden_14.webp","./assets/profiles/hidden_15.webp","./assets/profiles/mom_01.webp","./assets/profiles/mom_02.webp","./assets/profiles/mom_03.webp","./assets/profiles/mom_04.webp","./assets/profiles/mom_05.webp","./assets/profiles/mom_06.webp","./assets/profiles/mom_07.webp","./assets/profiles/normal_01.webp","./assets/profiles/normal_02.webp","./assets/profiles/normal_03.webp","./assets/profiles/normal_04.webp","./assets/profiles/normal_05.webp","./assets/profiles/normal_06.webp","./assets/profiles/normal_07.webp","./assets/profiles/normal_08.webp","./assets/profiles/normal_09.webp","./assets/profiles/normal_10.webp","./assets/profiles/normal_11.webp","./assets/profiles/normal_12.webp","./assets/profiles/normal_13.webp","./assets/profiles/normal_14.webp","./assets/profiles/normal_15.webp","./assets/profiles/normal_16.webp","./assets/profiles/normal_17.webp","./assets/profiles/normal_18.webp","./assets/profiles/normal_19.webp","./assets/profiles/normal_20.webp","./assets/profiles/normal_21.webp","./assets/profiles/normal_22.webp","./assets/profiles/normal_23.webp","./assets/profiles/normal_24.webp","./assets/profiles/normal_25.webp","./assets/profiles/normal_26.webp","./assets/profiles/normal_27.webp","./assets/profiles/normal_28.webp","./assets/profiles/normal_29.webp","./assets/profiles/normal_30.webp","./assets/profiles/normal_31.webp","./assets/profiles/normal_32.webp","./assets/profiles/normal_33.webp","./assets/profiles/normal_34.webp","./assets/profiles/normal_35.webp","./assets/profiles/normal_36.webp","./assets/profiles/normal_37.webp","./assets/profiles/normal_38.webp","./assets/profiles/normal_39.webp","./assets/profiles/normal_40.webp","./assets/profiles/normal_41.webp","./assets/profiles/normal_42.webp","./assets/profiles/normal_43.webp","./assets/profiles/mom_08.webp","./assets/profiles/mom_09.webp","./assets/profiles/mom_10.webp","./assets/profiles/mom_11.webp","./assets/profiles/mom_12.webp","./assets/profiles/mom_13.webp","./assets/profiles/mom_14.webp","./assets/profiles/normal_44.webp","./assets/profiles/normal_45.webp","./assets/profiles/normal_46.webp","./assets/profiles/normal_47.webp","./assets/profiles/normal_48.webp","./assets/profiles/normal_49.webp","./assets/profiles/normal_50.webp","./assets/profiles/normal_51.webp","./assets/profiles/normal_52.webp","./assets/profiles/normal_53.webp","./assets/profiles/normal_54.webp","./assets/profiles/normal_55.webp","./assets/profiles/normal_56.webp","./assets/profiles/normal_57.webp","./assets/profiles/normal_58.webp","./assets/profiles/normal_59.webp","./assets/profiles/normal_60.webp","./assets/profiles/normal_61.webp","./assets/profiles/normal_62.webp","./assets/profiles/normal_63.webp","./assets/profiles/normal_64.webp","./assets/profiles/normal_65.webp","./assets/profiles/normal_66.webp","./assets/profiles/normal_67.webp","./assets/profiles/normal_68.webp","./assets/profiles/normal_69.webp","./assets/profiles/normal_70.webp"];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dlym-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 if (event.request.method !== 'GET') return;
 const url = new URL(event.request.url);
 if (url.origin !== self.location.origin) return;
 const core = /\.(js|css|html)$/.test(url.pathname) || url.pathname.endsWith('/') || url.pathname.endsWith('/manifest.webmanifest');
 if (core) {
  event.respondWith(fetch(event.request).then(res => {
   if (res.ok) { const copy=res.clone(); event.waitUntil(caches.open(VERSION).then(c=>c.put(event.request,copy))); }
   return res;
  }).catch(()=>caches.match(event.request)));
 } else {
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached => cached || fetch(event.request).then(res=> {
   if(res.ok && res.type==='basic') { const copy=res.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put(event.request,copy))); }
   return res;
  })));
 }
});
