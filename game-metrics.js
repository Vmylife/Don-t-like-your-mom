/* DON'T LIKE YOUR MOM v0.8.4 — minimal anonymous gameplay metrics.
   No nickname, email, IP, GPS, photo or device fingerprint is stored in these events.
   Tracking is best-effort: failure never interrupts the 45-second game. */
(() => {
  'use strict';
  const raw=window.DLYM_LEADERBOARD_CONFIG||{};
  const base=String(raw.url||'').trim().replace(/\/+$/,'');
  const key=String(raw.publishableKey||'').trim();
  const enabled=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base)&&/^(sb_publishable_|eyJ)/.test(key);
  const id=()=>{
    if(window.crypto?.randomUUID)return crypto.randomUUID();
    const b=new Uint8Array(16);crypto.getRandomValues(b);
    b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
    return [...b].map(x=>x.toString(16).padStart(2,'0')).join('').replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5');
  };
  const SID_KEY='dlym_anon_visit_v084';
  let session;
  try {
    const saved=sessionStorage.getItem(SID_KEY);
    session=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(saved||'')?saved:id();
    sessionStorage.setItem(SID_KEY,session);
  } catch { session=id(); }
  let round=null;
  let queue=Promise.resolve();
  function send(event,mode=null,likes=null,duration=null,roundId=null){
    if(!enabled)return;
    const payload={p_event:event,p_session:session,p_round:roundId,p_mode:mode,p_likes:likes,p_duration_ms:duration};
    // Serial transmission guarantees that fast early losses arrive after their start event.
    queue=queue.catch(()=>{}).then(async()=>{
      const c=new AbortController();
      const timer=setTimeout(()=>c.abort(),6000);
      try {
        const response=await fetch(base+'/rest/v1/rpc/dlym_track_game_event',{
          method:'POST',headers:{apikey:key,'Content-Type':'application/json'},
          body:JSON.stringify(payload),keepalive:true,cache:'no-store',signal:c.signal
        });
        if(!response.ok && response.status!==404)console.warn('Anonymous stats HTTP',response.status);
      } catch { /* analytics are strictly optional */ }
      finally {clearTimeout(timer);}
    });
  }
  send('visit');
  window.DLYMMetrics={
    start(mode){
      round=id();send('start',mode,null,null,round);
    },
    finish({survived,mode,likes,durationMs}){
      if(!round)return;
      const elapsed=Math.min(45000,Math.max(0,Math.round(Number(durationMs)||0)));
      send(survived?'win':'mom',mode,Math.max(0,Math.min(200,Math.trunc(Number(likes)||0))),elapsed,round);
      round=null;
    }
  };
})();
