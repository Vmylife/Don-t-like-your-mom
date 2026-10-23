/* DON'T LIKE YOUR MOM - v0.8.9 head-centered reveal markers. */
const VERSION = 'dlym-v0.8.9-big-accurate-rings-20261024b';
const PHOTO_CACHE = 'dlym-photo-v061';
const SHELL = ["./","./index.html","./style.css","./script.js","./deck-engine.js","./photo-preload.js","./community-api.js","./community-feed.js","./community-ui.js","./photo-compress.js","./community.css","./submit.html","./admin.html","./live-duel.js","./art-data.js","./leaderboard-config.js","./leaderboard.js","./achievements.js","./feedback.js","./game-metrics.js","./analytics.html","./analytics.css","./analytics-ui.js","./board.html","./board.css","./board.js","./board-admin.html","./board-admin.js","./manifest.webmanifest","./assets/icon-192-mom-v1.png","./assets/icon-512-mom-v1.png","./assets/apple-touch-icon-mom-v1.png"];
// Per-photo actual MOM face centers (% of the original, uncropped image).
const MOM_HEADS = {"hidden_01.webp": [83, 35], "hidden_02.webp": [55, 17], "hidden_03.webp": [83, 34], "hidden_04.webp": [76, 36], "hidden_05.webp": [83, 37], "hidden_06.webp": [8, 24], "hidden_07.webp": [75, 22], "hidden_08.webp": [77, 34], "hidden_09.webp": [24, 69], "hidden_10.webp": [85, 56], "mom_06.webp": [82, 22], "mom_07.webp": [82, 44], "hidden_11.webp": [12, 37], "hidden_12.webp": [93, 42], "hidden_13.webp": [92, 36], "hidden_14.webp": [15, 24], "hidden_15.webp": [8, 28], "hidden_16.webp": [94, 72], "hidden_17.webp": [94, 29], "hidden_18.webp": [6, 29], "hidden_19.webp": [96, 71], "hidden_20.webp": [45, 32], "hidden_21.webp": [6, 49], "hidden_22.webp": [30, 86], "hidden_23.webp": [86, 32], "hidden_24.webp": [17.0, 33.0], "hidden_25.webp": [14.0, 55.0], "hidden_26.webp": [15.0, 24.0], "hidden_27.webp": [24.0, 35.0], "hidden_28.webp": [20.0, 33.0], "hidden_29.webp": [25.0, 34.0], "hidden_30.webp": [25.0, 42.0], "hidden_31.webp": [81.0, 38.0], "hidden_32.webp": [80.0, 35.0], "hidden_33.webp": [70.0, 40.0], "hidden_34.webp": [26.0, 41.0], "hidden_35.webp": [22.0, 38.0], "hidden_36.webp": [17.0, 34.0], "hidden_37.webp": [35.0, 30.0], "hidden_38.webp": [14.5, 38.0], "hidden_39.webp": [36.5, 43.0], "hidden_40.webp": [12.0, 33.0], "hidden_41.webp": [24.0, 24.0], "hidden_42.webp": [18.5, 31.0], "hidden_43.webp": [26.0, 31.0], "hidden_44.webp": [9.0, 43.0], "hidden_45.webp": [15.0, 41.0], "hidden_46.webp": [19.0, 42.0], "hidden_47.webp": [17.0, 35.0], "hidden_48.webp": [21.0, 42.0], "hidden_49.webp": [11.0, 26.0], "hidden_50.webp": [20.0, 38.0], "hidden_51.webp": [23.0, 38.0], "hidden_52.webp": [33.0, 34.0], "hidden_53.webp": [10.5, 47.0], "hidden_54.webp": [28.0, 35.0], "hidden_55.webp": [15.5, 32.5], "hidden_56.webp": [72.0, 37.0], "hidden_57.webp": [72.5, 34.0], "hidden_58.webp": [76.0, 35.0], "hidden_59.webp": [76.0, 35.0], "hidden_60.webp": [77.0, 33.0], "hidden_61.webp": [17.0, 27.0], "hidden_62.webp": [77.0, 21.0], "hidden_63.webp": [74.0, 33.0], "hidden_64.webp": [94.0, 34.0], "hidden_65.webp": [90.0, 35.0]};
function patchArtData(source) {
  if (typeof source !== 'string' || !source.includes('window.ART_DATA')) return source;
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end < start) return source;
  try {
    const art = JSON.parse(source.slice(start, end + 1));
    if (!Array.isArray(art.background)) return source;
    for (const item of art.background) {
      if (!item.spot || typeof item.spot !== 'object') continue;
      const center = MOM_HEADS[item.file];
      if (center) { item.spot.x = center[0]; item.spot.y = center[1]; }
      item.spot.ring = Math.max(40, Number(item.spot.ring) || 0, Math.round((Number(item.spot.size) || 0) * 3));
    }
    return source.slice(0,start) + JSON.stringify(art) + source.slice(end+1);
  } catch (_) { return source; }
}
async function patchArtResponse(response, path) {
  if (!/\/art-data\.js$/.test(path) || !response || !response.ok) return response;
  const code = patchArtData(await response.text());
  // Do not reuse Content-Length/Content-Encoding from the original response.
  return new Response(code, {
    status: 200,
    headers: {'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}
  });
}
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
  event.respondWith(fetch(event.request).then(async res => {
   const patched = await patchArtResponse(res, url.pathname);
   if (patched && patched.ok) { const copy=patched.clone(); event.waitUntil(caches.open(VERSION).then(c=>c.put(event.request,copy))); }
   return patched;
  }).catch(async () => {
   // Patch cached raw data too, so photo markers remain correct when offline.
   return patchArtResponse(await caches.match(event.request), url.pathname);
  }));
 } else {
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached => cached || fetch(event.request).then(res=> {
   if(res.ok && res.type==='basic') { const copy=res.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put(event.request,copy))); }
   return res;
  })));
 }
});
