/* Offline-ready v0.6.2: visible mobile MOM roasts / first-60 preload; 99 photos unchanged. */
const VERSION = 'dlym-v0.7.1-daily-champions-20261022';
const PHOTO_CACHE = 'dlym-photo-v061';
const SHELL = ["./","./index.html","./style.css","./script.js","./deck-engine.js","./photo-preload.js","./community-api.js","./community-feed.js","./community-ui.js","./community.css","./submit.html","./admin.html","./live-duel.js","./art-data.js","./leaderboard-config.js","./leaderboard.js","./feedback.js","./manifest.webmanifest","./assets/icon-192-mom-v1.png","./assets/icon-512-mom-v1.png","./assets/apple-touch-icon-mom-v1.png"];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('dlym-') && key !== VERSION && key !== PHOTO_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 if (event.request.method !== 'GET') return;
 const url = new URL(event.request.url);
 if (url.origin !== self.location.origin) return;
 if (/\/assets\/profiles\/[^/]+\.webp$/.test(url.pathname)) {
  event.respondWith(caches.open(PHOTO_CACHE).then(async cache => {
   const retry=url.searchParams.has('retry');
   if (retry) {
     const keys = await cache.keys();
     await Promise.all(keys.filter(req=>new URL(req.url).pathname===url.pathname).map(req=>cache.delete(req)));
   }
   const cached = retry ? null : await cache.match(event.request, {ignoreSearch:true});
   if (cached) return cached;
   const res = await fetch(event.request, retry ? {cache:'reload'} : undefined);
   if (res.ok && res.type === 'basic') {
     const copy=res.clone(); event.waitUntil(cache.put(new Request(url.origin+url.pathname),copy).catch(()=>{}));
   }
   return res;
  }));
  return;
 }
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
