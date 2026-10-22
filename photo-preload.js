/* DON'T LIKE YOUR MOM v0.6.1 — bounded download preloader for Android/iOS.
   Cache compressed WebP bytes; decode only the few cards near the front. */
(() => {
  'use strict';
  const CACHE = 'dlym-photo-v061';
  const COUNT = 60;
  const CONCURRENCY = 4;
  const ART = window.ART_DATA;
  const ENGINE = window.DLYMDeckEngine;
  const pending = new Map();
  let remainderStarted=false;
  let cachePromise;
  function imageUrl(file) { return /^https:\/\//i.test(file) ? file : new URL('./assets/profiles/' + file, location.href).href; }
  function photoCache() {
    if (!cachePromise) cachePromise = ('caches' in window ? caches.open(CACHE).catch(() => null) : Promise.resolve(null));
    return cachePromise;
  }
  async function download(file) {
    const url = imageUrl(file);
    const cache = await photoCache();
    if (cache) {
      try { if (await cache.match(url)) return; } catch { /* browser storage blocked */ }
    }
    let error;
    for (let attempt=0; attempt<2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 13000);
      try {
        const response = await fetch(url, {
          credentials: 'same-origin',
          cache: attempt ? 'reload' : 'force-cache',
          signal: controller.signal
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const bytes = await response.blob();
        if (!bytes.size || (bytes.type && !bytes.type.startsWith('image/'))) throw new Error('不是有效圖片');
        // Only compressed bytes are stored. Do NOT retain 60 decoded Image objects.
        if (cache) {
          try { await cache.put(url, new Response(bytes, {headers:{'Content-Type':bytes.type || 'image/webp'}})); }
          catch { /* HTTP cache may still retain this downloaded image */ }
        }
        return;
      } catch (e) { error=e; }
      finally { clearTimeout(timer); }
    }
    throw error;
  }
  function ensure(file) {
    if (!pending.has(file)) {
      const task = download(file).catch(err => {pending.delete(file);throw err;});
      pending.set(file,task);
    }
    return pending.get(file);
  }
  function shuffle(list) {
    for (let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
    return list;
  }
  function freeFiles() {
    // 45 normal / 10 hidden / 5 direct; distinct assets; background download
    // continues opportunistically after the round begins.
    const freeArt=window.DLYMCommunity?.artForFree(ART)||ART;
    const result = [...shuffle(freeArt.normal.map(v=>v.file)).slice(0,45),
      ...shuffle(ART.background.map(v=>v.file)).slice(0,10),
      ...shuffle(ART.direct.map(v=>v.file)).slice(0,5)];
    return shuffle([...new Set(result)]).slice(0,COUNT);
  }
  function duelFiles(seed) {
    const deck = ENGINE.create(ART,{mode:'challenge',seed});
    const files=[];
    // Generate the exact first 60 *card positions* with the same deterministic
    // engine as the actual match (do not consume the actual match's deck).
    for(let i=1;i<=COUNT;i++) files.push(deck.next(i).art.file);
    return [...new Set(files)];
  }
  async function prepare(files,onProgress) {
    const unique=[...new Set(files)];
    let complete=0,failed=0;
    onProgress?.({done:0,total:unique.length,failed:0});
    let cursor=0;
    async function worker() {
      while(cursor<unique.length){
        const file=unique[cursor++];
        try { await ensure(file); } catch(e) {failed++;console.warn('[photo-preload] unable to warm',file,e);}
        complete++;
        onProgress?.({done:complete,total:unique.length,failed});
      }
    }
    await Promise.all(Array.from({length:Math.min(CONCURRENCY,unique.length)},worker));
    return {done:complete,total:unique.length,failed};
  }
  // No guesswork in duels: this preloads the actual first 60 cards.
  const free = cb => prepare(freeFiles(),cb);
  const duel = (seed,cb) => prepare(duelFiles(seed),cb);
  function remainder() {
    // Low-priority background fetch of the rest: at most one request at a time.
    const base=window.DLYMCommunity?.artForFree(ART)||ART;
    const all=[...base.normal,...base.background,...base.direct].map(v=>v.file);
    const queue=shuffle([...new Set(all)]);
    const idle=window.requestIdleCallback || (callback => setTimeout(callback,1100));
    if (remainderStarted) return;
    remainderStarted=true;
    let index=0;
    async function advance() {
      if(index>=queue.length) return;
      try { await ensure(queue[index]); } catch { /* retry on later game */ }
      index++;
      idle(advance);
    }
    idle(advance);
  }
  window.DLYMPhotoPreload={free,duel,remainder,COUNT};
})();
