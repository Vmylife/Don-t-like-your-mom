/* DON'T LIKE YOUR MOM - v0.8.9 head-centered reveal markers. */
const VERSION = 'dlym-v0.8.9-mom-head-rings-20261024';
const PHOTO_CACHE = 'dlym-photo-v061';
const SHELL = ["./","./index.html","./style.css","./script.js","./deck-engine.js","./photo-preload.js","./community-api.js","./community-feed.js","./community-ui.js","./photo-compress.js","./community.css","./submit.html","./admin.html","./live-duel.js","./art-data.js","./leaderboard-config.js","./leaderboard.js","./achievements.js","./feedback.js","./game-metrics.js","./analytics.html","./analytics.css","./analytics-ui.js","./board.html","./board.css","./board.js","./board-admin.html","./board-admin.js","./manifest.webmanifest","./assets/icon-192-mom-v1.png","./assets/icon-512-mom-v1.png","./assets/apple-touch-icon-mom-v1.png"];
// Per-photo actual MOM face centers (% of the original, uncropped image).
const MOM_HEADS = {"hidden_01.webp":[84,26],"hidden_02.webp":[54,17],"hidden_03.webp":[83,33],"hidden_04.webp":[76,35],"hidden_05.webp":[81,38],"hidden_06.webp":[8,30],"hidden_07.webp":[75,21],"hidden_08.webp":[76,34],"hidden_09.webp":[24,70],"hidden_10.webp":[84,59],"hidden_11.webp":[12,35],"hidden_12.webp":[91,42],"hidden_13.webp":[92,35],"hidden_14.webp":[14,25],"hidden_15.webp":[7,29],"hidden_16.webp":[94,72],"hidden_17.webp":[94,29],"hidden_18.webp":[5,29],"hidden_19.webp":[96,71],"hidden_20.webp":[47,32],"hidden_21.webp":[5,49],"hidden_22.webp":[29,85],"hidden_23.webp":[86,34],"hidden_24.webp":[17,34],"hidden_25.webp":[18,42],"hidden_26.webp":[15,25],"hidden_27.webp":[24,36],"hidden_28.webp":[20,33],"hidden_29.webp":[25,35],"hidden_30.webp":[25,42],"hidden_31.webp":[81,31],"hidden_32.webp":[80,37],"hidden_33.webp":[77,35],"hidden_34.webp":[81,41],"hidden_35.webp":[22,39],"hidden_36.webp":[16,33],"hidden_37.webp":[34,33],"hidden_38.webp":[16,36],"hidden_39.webp":[37,31],"hidden_40.webp":[21,32],"hidden_41.webp":[23,26],"hidden_42.webp":[25,35],"hidden_43.webp":[25,35],"hidden_44.webp":[17,37],"hidden_45.webp":[20,42],"hidden_46.webp":[30,36],"hidden_47.webp":[27,27],"hidden_48.webp":[21,44],"hidden_49.webp":[17,26],"hidden_50.webp":[22,37],"hidden_51.webp":[23,40],"hidden_52.webp":[32,35],"hidden_53.webp":[16,40],"hidden_54.webp":[27,34],"hidden_55.webp":[20,41],"hidden_56.webp":[78,31],"hidden_57.webp":[72,30],"hidden_58.webp":[86,26],"hidden_59.webp":[82,28],"hidden_60.webp":[79,28],"hidden_61.webp":[18,19],"hidden_62.webp":[76,19],"hidden_63.webp":[76,22],"hidden_64.webp":[94,35],"hidden_65.webp":[91,30],"mom_06.webp":[82,22],"mom_07.webp":[82,44]};
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
      item.spot.ring = Math.max(44, Number(item.spot.ring) || 0, Math.round((Number(item.spot.size) || 0) * 3));
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
