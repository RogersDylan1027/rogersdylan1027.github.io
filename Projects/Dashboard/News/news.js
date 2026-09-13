/* My Dashboard · News · Version 0.1.0 */
(function(){
  "use strict";
  const feed=document.getElementById("feed");
  const feedStatus=document.getElementById("feedStatus");
  const tabs=[...document.querySelectorAll(".tab")];
  const searchDialog=document.getElementById("searchDialog");
  const settingsDialog=document.getElementById("settingsDialog");
  const searchInput=document.getElementById("searchInput");
  const feedStyle=document.getElementById("feedStyle");
  const showRead=document.getElementById("showRead");
  const toast=document.getElementById("toast");
  const state={category:"top",stories:[],query:"",saved:new Set(),seen:new Set(),style:"personalized",showRead:false};
  const STORAGE_KEY="dashboard-news-v0.1.0";
  const CATEGORY_LABELS={top:"For You",us:"U.S.",world:"World",technology:"Tech",business:"Business",sports:"Sports",entertainment:"Entertainment",science:"Science",health:"Health",apple:"Apple",nhl:"NHL"};

  function client(){return window.DashboardEntryAuth?.client||window.DashboardAuth?.client||window.supabaseClient||null}
  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify({saved:[...state.saved],seen:[...state.seen],style:state.style,showRead:state.showRead}))}
  function loadState(){try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");state.saved=new Set(raw.saved||[]);state.seen=new Set(raw.seen||[]);state.style=raw.style||"personalized";state.showRead=!!raw.showRead}catch{} feedStyle.value=state.style;showRead.checked=state.showRead}
  function showToast(message){toast.textContent=message;toast.classList.remove("hidden");clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.add("hidden"),1500)}
  function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
  function relTime(iso){const ms=Date.now()-new Date(iso).getTime();const m=Math.max(0,Math.floor(ms/60000));if(m<1)return"now";if(m<60)return m+"m";const h=Math.floor(m/60);if(h<24)return h+"h";return Math.floor(h/24)+"d"}
  function initials(source){return source.split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"NEWS"}
  function score(story){let s=new Date(story.publishedAt).getTime()/1e12;if(state.saved.has(story.id))s+=8;if(state.seen.has(story.id))s-=state.showRead?1:100;return s}
  function preparedStories(){let list=[...state.stories];if(!state.showRead)list=list.filter(x=>!state.seen.has(x.id));if(state.query){const q=state.query.toLowerCase();list=list.filter(x=>(x.title+" "+x.summary+" "+x.source).toLowerCase().includes(q))}if(state.style==="chronological")list.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));else if(state.style==="personalized")list.sort((a,b)=>score(b)-score(a));return list}
  function storyHtml(story){const saved=state.saved.has(story.id);return `<section class="story" data-id="${escapeHtml(story.id)}"><div class="source-mark">${escapeHtml(initials(story.source))}</div><div class="story-content"><div class="meta"><span class="pill">${escapeHtml(CATEGORY_LABELS[story.category]||story.category)}</span><span>${escapeHtml(story.source)}</span><span>·</span><span>${relTime(story.publishedAt)}</span></div><h1 class="headline">${escapeHtml(story.title)}</h1><p class="summary">${escapeHtml(story.summary)}</p><a class="read-link" href="${escapeHtml(story.url)}" target="_blank" rel="noopener noreferrer">Read full story →</a></div><div class="rail"><button class="rail-btn save-btn ${saved?"saved":""}" data-id="${escapeHtml(story.id)}"><span class="circle">${saved?"★":"☆"}</span><span>${saved?"Saved":"Save"}</span></button><button class="rail-btn share-btn" data-url="${escapeHtml(story.url)}" data-title="${escapeHtml(story.title)}"><span class="circle">↗</span><span>Share</span></button></div></section>`}
  function render(){const list=preparedStories();if(!list.length){feed.innerHTML=`<section class="empty"><div><h2>No stories here</h2><p>${state.query?"Nothing matches your search.":"You are caught up in this feed."}</p><button id="refreshEmpty">Refresh</button></div></section>`;document.getElementById("refreshEmpty")?.addEventListener("click",()=>loadFeed(state.category,true));return}feed.innerHTML=list.map(storyHtml).join("")+`<section class="caught"><div><h2>✓ You're caught up</h2><p>You've reached the end of the current ${escapeHtml(CATEGORY_LABELS[state.category]||state.category)} feed.</p><button id="refreshCaught">Check for new stories</button></div></section>`;bindStoryActions();observeStories()}
  function bindStoryActions(){document.querySelectorAll(".save-btn").forEach(btn=>btn.addEventListener("click",()=>{const id=btn.dataset.id;if(state.saved.has(id))state.saved.delete(id);else state.saved.add(id);saveState();render();showToast(state.saved.has(id)?"Story saved":"Removed from saved")}));document.querySelectorAll(".share-btn").forEach(btn=>btn.addEventListener("click",async()=>{const data={title:btn.dataset.title,url:btn.dataset.url};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(data.url);showToast("Link copied")}}catch{}}));document.getElementById("refreshCaught")?.addEventListener("click",()=>loadFeed(state.category,true))}
  function observeStories(){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>.7){const id=entry.target.dataset.id;if(id&&!state.seen.has(id)){state.seen.add(id);saveState()}}}},{root:feed,threshold:[.7]});document.querySelectorAll(".story").forEach(el=>observer.observe(el))}
  async function loadFeed(category,force=false){state.category=category;tabs.forEach(t=>t.classList.toggle("active",t.dataset.category===category));feedStatus.textContent=(CATEGORY_LABELS[category]||category)+" · Live";feed.innerHTML='<section class="status-card"><div><div class="spinner"></div><strong>Loading your feed…</strong><p>Getting the latest stories.</p></div></section>';try{const c=client();if(!c)throw new Error("Dashboard session is still loading.");const {data,error}=await c.functions.invoke("news-feed",{body:{category,force}});if(error)throw error;if(data?.error)throw new Error(data.error);state.stories=Array.isArray(data?.stories)?data.stories:[];render()}catch(error){feed.innerHTML=`<section class="empty"><div><h2>Couldn't load News</h2><p>${escapeHtml(error?.message||String(error))}</p><button id="retryFeed">Try again</button></div></section>`;document.getElementById("retryFeed")?.addEventListener("click",()=>loadFeed(category,true))}}

  document.getElementById("dashboardBtn").addEventListener("click",()=>location.href=window.DashboardConfig?.dashboardUrl||"../");
  document.getElementById("searchBtn").addEventListener("click",()=>{searchDialog.showModal();setTimeout(()=>searchInput.focus(),50)});
  document.getElementById("settingsBtn").addEventListener("click",()=>settingsDialog.showModal());
  document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(btn.dataset.close)?.close()));
  tabs.forEach(tab=>tab.addEventListener("click",()=>loadFeed(tab.dataset.category)));
  searchInput.addEventListener("input",()=>{state.query=searchInput.value.trim();render()});
  document.getElementById("clearSearchBtn").addEventListener("click",()=>{searchInput.value="";state.query="";render()});
  feedStyle.addEventListener("change",()=>{state.style=feedStyle.value;saveState();render()});
  showRead.addEventListener("change",()=>{state.showRead=showRead.checked;saveState();render()});
  document.getElementById("resetHistoryBtn").addEventListener("click",()=>{state.seen.clear();saveState();render();showToast("News history reset")});

  loadState();
  let tries=0;const start=()=>{if(client())loadFeed("top");else if(tries++<30)setTimeout(start,150);else loadFeed("top")};start();
})();