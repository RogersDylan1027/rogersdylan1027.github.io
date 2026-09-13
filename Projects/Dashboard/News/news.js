/* My Dashboard · News · Version 0.2.0 · Short-Form Video News */
(function(){
  "use strict";

  const feed=document.getElementById("feed");
  const feedStatus=document.getElementById("feedStatus");
  const tabs=[...document.querySelectorAll(".tab")];
  const settingsDialog=document.getElementById("settingsDialog");
  const defaultMuted=document.getElementById("defaultMuted");
  const showSeen=document.getElementById("showSeen");
  const toast=document.getElementById("toast");
  const STORAGE_KEY="dashboard-news-v0.2.0";
  const CATEGORY_LABELS={top:"For You",latest:"Latest",us:"U.S.",world:"World",technology:"Tech",business:"Business",sports:"Sports",entertainment:"Entertainment"};
  const state={category:"top",stories:[],saved:new Set(),seen:new Set(),showSeen:false,muted:true,players:new Map(),activeId:null,activePlayer:null,activePlaying:false,seenTimer:null,progressTimer:null};
  let ytReadyPromise=null;

  function client(){return window.DashboardEntryAuth?.client||window.DashboardAuth?.client||window.supabaseClient||null}
  function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
  function showToast(message){toast.textContent=message;toast.classList.remove("hidden");clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.add("hidden"),1500)}
  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify({saved:[...state.saved],seen:[...state.seen],showSeen:state.showSeen,muted:state.muted}))}
  function loadState(){try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");state.saved=new Set(raw.saved||[]);state.seen=new Set(raw.seen||[]);state.showSeen=!!raw.showSeen;state.muted=raw.muted!==false}catch{} defaultMuted.checked=state.muted;showSeen.checked=state.showSeen}
  function relTime(iso){const t=new Date(iso).getTime();if(!Number.isFinite(t))return"recent";const mins=Math.max(0,Math.floor((Date.now()-t)/60000));if(mins<1)return"now";if(mins<60)return mins+"m";const h=Math.floor(mins/60);if(h<24)return h+"h";return Math.floor(h/24)+"d"}
  function compactSummary(text){const clean=String(text||"").replace(/https?:\/\/\S+/g,"").replace(/\s+/g," ").trim();return clean.length>260?clean.slice(0,257).trim()+"…":clean}
  function preparedStories(){const list=state.showSeen?[...state.stories]:state.stories.filter(s=>!state.seen.has(s.id));return list.length?list:[...state.stories]}

  function loadYouTubeApi(){
    if(window.YT?.Player)return Promise.resolve(window.YT);
    if(ytReadyPromise)return ytReadyPromise;
    ytReadyPromise=new Promise((resolve,reject)=>{
      const old=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{try{old?.()}catch{} resolve(window.YT)};
      const script=document.createElement("script");
      script.src="https://www.youtube.com/iframe_api";
      script.async=true;
      script.onerror=()=>reject(new Error("YouTube player could not load."));
      document.head.appendChild(script);
      setTimeout(()=>{if(window.YT?.Player)resolve(window.YT)},4000);
    });
    return ytReadyPromise;
  }

  function storyHtml(story){
    const saved=state.saved.has(story.id);
    const summary=compactSummary(story.summary)||"Watch the publisher's video for the full update.";
    return `<section class="video-card" data-id="${escapeHtml(story.id)}" data-video-id="${escapeHtml(story.videoId)}">
      <div class="video-stage"><img class="poster" src="${escapeHtml(story.thumbnail)}" alt=""><div class="yt-host" id="yt-${escapeHtml(story.id.replace(/[^a-zA-Z0-9_-]/g,"-"))}"></div></div>
      <div class="shade"></div><div class="tap-zone" data-action="toggle-play"></div><div class="pause-indicator">▶</div>
      <div class="content"><div class="meta"><span class="source">${escapeHtml(story.source)}</span><span>·</span><span>${relTime(story.publishedAt)}</span>${story.shortHint?'<span class="short-badge">Short</span>':''}</div><h1 class="headline">${escapeHtml(story.title)}</h1><p class="summary">${escapeHtml(summary)}</p><button class="more-btn" data-action="more">more</button></div>
      <div class="rail">
        <button class="rail-btn mute-btn" data-action="mute"><span class="circle">${state.muted?"🔇":"🔊"}</span><span>${state.muted?"Muted":"Sound"}</span></button>
        <button class="rail-btn save-btn ${saved?"saved":""}" data-action="save"><span class="circle">${saved?"★":"☆"}</span><span>${saved?"Saved":"Save"}</span></button>
        <button class="rail-btn" data-action="share"><span class="circle">↗</span><span>Share</span></button>
        <button class="rail-btn" data-action="open"><span class="circle">↗</span><span>Source</span></button>
      </div>
      <div class="progress"><span></span></div>
    </section>`;
  }

  function render(){
    stopAllPlayers();
    const list=preparedStories();
    if(!list.length){feed.innerHTML='<section class="empty"><div><h2>No videos here yet</h2><p>Try another category or refresh for the newest publisher videos.</p><button id="retryEmpty">Refresh</button></div></section>';document.getElementById("retryEmpty")?.addEventListener("click",()=>loadFeed(state.category,true));return}
    feed.innerHTML=list.map(storyHtml).join("")+`<section class="caught"><div><h2>✓ You're caught up</h2><p>You've reached the end of the current ${escapeHtml(CATEGORY_LABELS[state.category]||state.category)} video feed.</p><button id="refreshCaught">Check for new videos</button></div></section>`;
    bindCardActions();observeCards();document.getElementById("refreshCaught")?.addEventListener("click",()=>loadFeed(state.category,true));
  }

  function bindCardActions(){
    feed.querySelectorAll(".video-card").forEach(card=>card.addEventListener("click",async event=>{
      const button=event.target.closest("[data-action]");if(!button)return;
      const action=button.dataset.action;const story=state.stories.find(s=>s.id===card.dataset.id);if(!story)return;
      if(action==="toggle-play"){togglePlay(card);return}
      if(action==="mute"){state.muted=!state.muted;defaultMuted.checked=state.muted;saveState();applyMute();syncMuteButtons();showToast(state.muted?"Muted":"Sound on");return}
      if(action==="save"){if(state.saved.has(story.id))state.saved.delete(story.id);else state.saved.add(story.id);saveState();button.classList.toggle("saved",state.saved.has(story.id));button.querySelector(".circle").textContent=state.saved.has(story.id)?"★":"☆";button.lastElementChild.textContent=state.saved.has(story.id)?"Saved":"Save";showToast(state.saved.has(story.id)?"Video saved":"Removed from saved");return}
      if(action==="share"){try{if(navigator.share)await navigator.share({title:story.title,url:story.url});else{await navigator.clipboard.writeText(story.url);showToast("Link copied")}}catch{}return}
      if(action==="open"){window.open(story.url,"_blank","noopener,noreferrer");return}
      if(action==="more"){const summary=card.querySelector(".summary");summary.classList.toggle("expanded");button.textContent=summary.classList.contains("expanded")?"less":"more"}
    }));
  }

  function observeCards(){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=.72)activateCard(entry.target)}},{root:feed,threshold:[.72]});
    feed.querySelectorAll(".video-card").forEach(card=>observer.observe(card));
  }

  async function ensurePlayer(card){
    const id=card.dataset.id;if(state.players.has(id))return state.players.get(id);
    const story=state.stories.find(s=>s.id===id);if(!story)return null;
    const YT=await loadYouTubeApi();
    const host=card.querySelector(".yt-host");
    const player=new YT.Player(host,{host:"https://www.youtube-nocookie.com",videoId:story.videoId,playerVars:{playsinline:1,controls:0,rel:0,modestbranding:1,cc_load_policy:1,iv_load_policy:3,enablejsapi:1,origin:location.origin},events:{onReady:event=>{if(state.muted)event.target.mute();else event.target.unMute();if(state.activeId===id){event.target.playVideo();state.activePlaying=true;card.querySelector(".poster")?.classList.add("hidden")}},onStateChange:event=>{if(state.activeId!==id)return;if(event.data===YT.PlayerState.PLAYING){state.activePlaying=true;card.querySelector(".poster")?.classList.add("hidden");startProgress()}else if(event.data===YT.PlayerState.PAUSED){state.activePlaying=false}else if(event.data===YT.PlayerState.ENDED){state.activePlaying=false;scrollNext(card)}}}});
    state.players.set(id,player);return player;
  }

  async function activateCard(card){
    const id=card.dataset.id;if(state.activeId===id)return;
    clearTimeout(state.seenTimer);state.activeId=id;
    for(const [playerId,player] of state.players){if(playerId!==id){try{player.pauseVideo()}catch{}}}
    const player=await ensurePlayer(card);if(!player||state.activeId!==id)return;state.activePlayer=player;
    try{if(state.muted)player.mute();else player.unMute();player.playVideo();state.activePlaying=true}catch{}
    state.seenTimer=setTimeout(()=>{if(state.activeId===id&&!state.seen.has(id)){state.seen.add(id);saveState()}},3500);
    startProgress();
  }

  function togglePlay(card){
    if(card.dataset.id!==state.activeId){activateCard(card);return}
    const player=state.activePlayer;if(!player)return;
    const indicator=card.querySelector(".pause-indicator");
    try{if(state.activePlaying){player.pauseVideo();state.activePlaying=false;indicator.textContent="▶"}else{player.playVideo();state.activePlaying=true;indicator.textContent="❚❚"}indicator.classList.add("show");setTimeout(()=>indicator.classList.remove("show"),500)}catch{}
  }
  function applyMute(){if(!state.activePlayer)return;try{state.muted?state.activePlayer.mute():state.activePlayer.unMute()}catch{}}
  function syncMuteButtons(){feed.querySelectorAll(".mute-btn").forEach(btn=>{btn.querySelector(".circle").textContent=state.muted?"🔇":"🔊";btn.lastElementChild.textContent=state.muted?"Muted":"Sound"})}
  function startProgress(){clearInterval(state.progressTimer);state.progressTimer=setInterval(()=>{if(!state.activePlayer||!state.activeId)return;try{const duration=state.activePlayer.getDuration();const current=state.activePlayer.getCurrentTime();const card=feed.querySelector(`.video-card[data-id="${CSS.escape(state.activeId)}"]`);if(duration>0&&card)card.querySelector(".progress span").style.width=Math.min(100,current/duration*100)+"%"}catch{}},250)}
  function scrollNext(card){const next=card.nextElementSibling;if(next)next.scrollIntoView({behavior:"smooth",block:"start"})}
  function stopAllPlayers(){clearInterval(state.progressTimer);clearTimeout(state.seenTimer);for(const player of state.players.values()){try{player.destroy()}catch{}}state.players.clear();state.activeId=null;state.activePlayer=null;state.activePlaying=false}

  async function loadFeed(category,force=false){
    state.category=category;tabs.forEach(t=>t.classList.toggle("active",t.dataset.category===category));feedStatus.textContent=(CATEGORY_LABELS[category]||category)+" · Video";feed.innerHTML='<section class="status-card"><div><div class="spinner"></div><strong>Loading short-form news…</strong><p>Getting the latest publisher videos.</p></div></section>';
    try{const c=client();if(!c)throw new Error("Dashboard session is still loading.");const {data,error}=await c.functions.invoke("news-feed",{body:{category,mode:"video",force}});if(error)throw error;if(data?.error)throw new Error(data.error);state.stories=Array.isArray(data?.stories)?data.stories:[];render()}catch(error){feed.innerHTML=`<section class="empty"><div><h2>Couldn't load video news</h2><p>${escapeHtml(error?.message||String(error))}</p><button id="retryFeed">Try again</button></div></section>`;document.getElementById("retryFeed")?.addEventListener("click",()=>loadFeed(category,true))}
  }

  document.getElementById("dashboardBtn").addEventListener("click",()=>location.href=window.DashboardConfig?.dashboardUrl||"../");
  document.getElementById("settingsBtn").addEventListener("click",()=>settingsDialog.showModal());
  document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(btn.dataset.close)?.close()));
  tabs.forEach(tab=>tab.addEventListener("click",()=>loadFeed(tab.dataset.category)));
  defaultMuted.addEventListener("change",()=>{state.muted=defaultMuted.checked;saveState();applyMute();syncMuteButtons()});
  showSeen.addEventListener("change",()=>{state.showSeen=showSeen.checked;saveState();render()});
  document.getElementById("resetHistoryBtn").addEventListener("click",()=>{state.seen.clear();saveState();render();showToast("Video history reset")});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){try{state.activePlayer?.pauseVideo()}catch{}}else if(state.activePlayer&&state.activePlaying){try{state.activePlayer.playVideo()}catch{}}});

  loadState();let tries=0;const start=()=>{if(client())loadFeed("top");else if(tries++<30)setTimeout(start,150);else loadFeed("top")};start();
})();