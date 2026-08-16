/*
  My Dashboard · Streaming Settings UI · Version 0.6.10
  Mobile Streaming Controls & Connected Project Settings · 2026-08-15
*/
(function () {
  "use strict";

  const VERSION = "0.6.10";
  const TITLE = "Caught-Up TV & Continue Watching Cleanup";
  const DESCRIPTION =
    "Adds episode-aware Continue Watching behavior for TV shows and makes Continue Watching exclusive from the rest of Streaming. Ongoing shows hide while waiting for their next episode or season and return automatically when new content is released. Ended series trigger the completion feedback prompt, and anything currently in Continue Watching is filtered out of every other discovery row.";
  let initialized = false;
  const get = id => document.getElementById(id);

  function css() {
    if (get("dashboard-streaming-settings-style")) return;
    const style = document.createElement("style");
    style.id = "dashboard-streaming-settings-style";
    style.textContent = `
      .streaming-provider-list{display:grid;gap:10px}
      .streaming-provider-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid #dfe3e8;border-radius:12px;background:#f7f8fa}
      .streaming-provider-main{display:flex;align-items:center;gap:10px;min-width:0}
      .streaming-provider-logo{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border-radius:10px;background:white;border:1px solid #dfe3e8;overflow:hidden;font-weight:900;color:#28487e}
      .streaming-provider-logo img{width:100%;height:100%;object-fit:cover}
      .streaming-provider-name{font-size:13px;font-weight:800}
      .streaming-provider-note{display:block;margin-top:2px;color:#777;font-size:11px;line-height:1.35}
      .streaming-action{min-height:44px;padding:9px 12px;border:1px solid #28487e;border-radius:10px;background:white;color:#28487e;font:inherit;font-size:13px;font-weight:800;cursor:pointer;touch-action:manipulation}
      .streaming-action.primary{background:#28487e;color:white}
      .streaming-choice{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid #dfe3e8;border-radius:11px;background:#f7f8fa}
      .streaming-choice input{margin-top:3px}
      .streaming-choice strong{display:block;font-size:13px}
      .streaming-choice small{display:block;margin-top:2px;color:#777;line-height:1.4}
      .streaming-priority-list{display:grid;gap:8px}
      .streaming-priority-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:center;gap:8px;padding:10px 11px;border:1px solid #dfe3e8;border-radius:10px;background:white}
      .streaming-priority-number{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#eef3fb;color:#28487e;font-size:12px;font-weight:900}
      .streaming-priority-controls{display:flex;gap:6px}
      .streaming-priority-controls button{width:44px;height:44px;border:1px solid #c8cdd5;border-radius:10px;background:white;cursor:pointer;font-weight:900;touch-action:manipulation}
      .streaming-status{margin:10px 0 0;color:#777;font-size:11px;line-height:1.45}
      .streaming-status.error{color:#b3261e}
      .streaming-settings-link{display:inline-flex;margin-top:12px;min-height:44px;align-items:center;padding:9px 12px;border-radius:10px;background:#28487e;color:white;text-decoration:none;font-size:13px;font-weight:800}
      .streaming-reset-warning{margin-top:10px;min-height:44px;padding:8px 0;border:0;background:transparent;color:#28487e;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .streaming-warning-backdrop{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom));background:rgba(15,23,42,.48)}
      .streaming-warning-backdrop[hidden]{display:none}
      .streaming-warning-dialog{width:min(100%,470px);max-height:calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:auto;padding:22px;border:1px solid #d5d9df;border-radius:18px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.22);color:#252525;-webkit-overflow-scrolling:touch}
      .streaming-warning-dialog h3{margin:0 0 8px;font-size:20px}
      .streaming-warning-dialog p{margin:0 0 12px;color:#606873;font-size:13px;line-height:1.55}
      .streaming-warning-check{display:flex;align-items:flex-start;gap:9px;margin:16px 0 0;padding:11px;border:1px solid #dfe3e8;border-radius:11px;background:#f7f8fa;font-size:12px;font-weight:700;line-height:1.4}
      .streaming-warning-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
      .streaming-warning-actions button{min-height:44px;padding:9px 12px;border-radius:10px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .streaming-warning-cancel{border:1px solid #c8cdd5;background:#fff;color:#252525}
      .streaming-warning-enable{border:1px solid #28487e;background:#28487e;color:#fff}
      @media(max-width:520px){
        .streaming-provider-row{align-items:stretch;flex-direction:column}
        .streaming-action{width:100%}
        .streaming-priority-row{grid-template-columns:32px minmax(0,1fr)}
        .streaming-priority-controls{grid-column:1/-1;justify-content:flex-end}
        .streaming-warning-actions{flex-direction:column-reverse}
        .streaming-warning-actions button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function makeSection() {
    const section = document.createElement("section");
    section.id = "streaming-settings-section";
    section.className = "settings-section";
    section.innerHTML = `
      <h3>Streaming</h3>
      <p class="settings-section-description">Streaming settings are shared with the Streaming project and saved to this My Dashboard account.</p>
      <div class="settings-provider-block">
        <p class="settings-provider-title">Your Streaming Services</p>
        <div id="streaming-provider-list" class="streaming-provider-list"></div>
        <p id="streaming-provider-status" class="streaming-status" role="status"></p>
      </div>
      <div class="settings-provider-block">
        <p class="settings-provider-title">Playback Preference</p>
        <label class="streaming-choice">
          <input id="streaming-dashboard-first" type="checkbox">
          <span><strong>Prefer My Dashboard Playback</strong><small>When available, temporarily place My Dashboard first. If this is off, My Dashboard uses its saved place in Provider Priority.</small></span>
        </label>
        <button id="streaming-reset-playback-warning" class="streaming-reset-warning" type="button">Show My Dashboard Playback warning again</button>
      </div>
      <div class="settings-provider-block">
        <p class="settings-provider-title">Provider Priority</p>
        <div id="streaming-priority-list" class="streaming-priority-list"></div>
        <p class="streaming-status">This order chooses the default option beside Watch. You can override it for any title.</p>
      </div>
      <div class="settings-provider-block">
        <p class="settings-provider-title">Streaming Page</p>
        <a class="streaming-settings-link" href="./Streaming/">Open Streaming</a>
      </div>`;
    const admin=get("admin-settings-section");
    if(admin?.parentNode) admin.parentNode.insertBefore(section,admin);
    else {
      const settings=get("settings-view");
      const content=settings?.querySelector(".settings-content")||settings?.querySelector(".internal-view-content")||settings?.querySelector(".internal-view");
      content?.appendChild(section);
    }
  }

  function ensurePlaybackWarningModal() {
    let backdrop=get("streaming-playback-warning-backdrop");
    if(backdrop) return backdrop;
    backdrop=document.createElement("div");
    backdrop.id="streaming-playback-warning-backdrop";
    backdrop.className="streaming-warning-backdrop";
    backdrop.hidden=true;
    backdrop.innerHTML=`<section class="streaming-warning-dialog" role="dialog" aria-modal="true" aria-labelledby="streaming-playback-warning-title">
      <h3 id="streaming-playback-warning-title">My Dashboard Playback Notice</h3>
      <p>My Dashboard Playback uses a third-party player. Third-party tabs, windows, advertisements, or other content may open while using it. Close any tabs or windows you do not want to use.</p>
      <p>My Dashboard is not affiliated with, endorsed by, responsible for, or associated with third-party advertisements, pop-ups, websites, or other content that may appear.</p>
      <label class="streaming-warning-check"><input id="streaming-warning-dont-show" type="checkbox"><span>Don’t show this warning again</span></label>
      <div class="streaming-warning-actions"><button id="streaming-warning-cancel" class="streaming-warning-cancel" type="button">Cancel</button><button id="streaming-warning-enable" class="streaming-warning-enable" type="button">Prefer My Dashboard Playback</button></div>
    </section>`;
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function showPlaybackWarning() {
    const backdrop=ensurePlaybackWarningModal(), checkbox=get("streaming-warning-dont-show"), cancel=get("streaming-warning-cancel"), enable=get("streaming-warning-enable");
    checkbox.checked=false; backdrop.hidden=false;
    return new Promise(resolve=>{
      let done=false;
      const finish=result=>{if(done)return;done=true;backdrop.hidden=true;cleanup();resolve(result)};
      const onCancel=()=>finish({accepted:false,dontShowAgain:false});
      const onEnable=()=>finish({accepted:true,dontShowAgain:checkbox.checked});
      const onBack=e=>{if(e.target===backdrop)onCancel()};
      const onKey=e=>{if(e.key==="Escape")onCancel()};
      const cleanup=()=>{cancel.removeEventListener("click",onCancel);enable.removeEventListener("click",onEnable);backdrop.removeEventListener("click",onBack);document.removeEventListener("keydown",onKey)};
      cancel.addEventListener("click",onCancel); enable.addEventListener("click",onEnable); backdrop.addEventListener("click",onBack); document.addEventListener("keydown",onKey);
    });
  }

  function hierarchyRows(rows,prefs) {
    const result=rows.filter(r=>r.enabled).map(r=>({key:String(r.provider_id),name:r.streaming_providers?.name||"Provider",priority:Number(r.priority)||999}));
    result.push({key:"dashboard",name:"My Dashboard",priority:Number(prefs.dashboard_provider_priority)||1,isDashboard:true});
    return result.sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name));
  }

  function renderPriority(rows,prefs) {
    const list=get("streaming-priority-list"); list.innerHTML="";
    const sorted=hierarchyRows(rows,prefs);
    sorted.forEach((row,index)=>{
      const item=document.createElement("div"); item.className="streaming-priority-row";
      const number=document.createElement("span");number.className="streaming-priority-number";number.textContent=String(index+1);
      const name=document.createElement("div");name.innerHTML=`<strong>${row.name}</strong>${row.isDashboard?'<span class="streaming-provider-note">Built-in player</span>':''}`;
      const controls=document.createElement("div");controls.className="streaming-priority-controls";
      const up=document.createElement("button"),down=document.createElement("button");up.type=down.type="button";up.textContent="↑";down.textContent="↓";up.disabled=index===0;down.disabled=index===sorted.length-1;
      const move=async direction=>{const target=index+direction;if(target<0||target>=sorted.length)return;const keys=sorted.map(x=>x.key);[keys[index],keys[target]]=[keys[target],keys[index]];await DashboardStreaming.saveProviderHierarchy(keys);await refresh()};
      up.addEventListener("click",()=>move(-1));down.addEventListener("click",()=>move(1));controls.append(up,down);item.append(number,name,controls);list.appendChild(item);
    });
  }

  async function refresh() {
    const list=get("streaming-provider-list"), status=get("streaming-provider-status");
    if(!list||!status) return;
    try {
      status.textContent="Loading streaming services…";status.classList.remove("error");
      const [providers,enabledRows,prefs]=await Promise.all([DashboardStreaming.listProviders(),DashboardStreaming.loadUserProviders(),DashboardStreaming.loadPreferences()]);
      const enabledMap=new Map(enabledRows.map(row=>[String(row.provider_id),row]));list.innerHTML="";
      providers.forEach(provider=>{
        const current=enabledMap.get(String(provider.id)), row=document.createElement("div");row.className="streaming-provider-row";
        const main=document.createElement("div");main.className="streaming-provider-main";const logo=document.createElement("div");logo.className="streaming-provider-logo";
        if(provider.logo_path){const img=document.createElement("img");img.alt="";img.src="https://image.tmdb.org/t/p/w92"+provider.logo_path;logo.appendChild(img)}else logo.textContent=provider.name.slice(0,1);
        const text=document.createElement("div"), name=document.createElement("span"), note=document.createElement("span");name.className="streaming-provider-name";name.textContent=provider.name;note.className="streaming-provider-note";note.textContent=current?"Added · available for Watch selection":"Add this subscription to My Dashboard";text.append(name,note);main.append(logo,text);
        const button=document.createElement("button");button.type="button";button.className="streaming-action "+(current?"":"primary");button.textContent=current?"Remove":"Add";button.addEventListener("click",async()=>{button.disabled=true;try{current?await DashboardStreaming.removeProvider(provider.id):await DashboardStreaming.addProvider(provider.id);await refresh()}catch(error){status.textContent=error.message||"Streaming service could not be updated.";status.classList.add("error")}finally{button.disabled=false}});
        row.append(main,button);list.appendChild(row);
      });
      get("streaming-dashboard-first").checked=Boolean(prefs.prefer_dashboard_playback);
      const reset=get("streaming-reset-playback-warning");if(reset)reset.hidden=!Boolean(prefs.dashboard_playback_warning_acknowledged);
      renderPriority(enabledRows,prefs);
      status.textContent=enabledRows.length?`${enabledRows.length} streaming service${enabledRows.length===1?"":"s"} added.`:"Add the services this account can watch.";
    } catch(error) {console.error(error);status.textContent=error.message||"Streaming settings are unavailable.";status.classList.add("error")}
  }

  function bind() {
    get("streaming-dashboard-first")?.addEventListener("change",async event=>{
      const checkbox=event.target;
      try {
        if(!checkbox.checked){await DashboardStreaming.savePreferences({prefer_dashboard_playback:false});await refresh();return}
        const prefs=await DashboardStreaming.loadPreferences();
        if(prefs.dashboard_playback_warning_acknowledged){await DashboardStreaming.savePreferences({prefer_dashboard_playback:true});await refresh();return}
        checkbox.checked=false;const decision=await showPlaybackWarning();
        await DashboardStreaming.savePreferences({prefer_dashboard_playback:Boolean(decision.accepted),dashboard_playback_warning_acknowledged:Boolean(decision.accepted&&decision.dontShowAgain)});await refresh();
      } catch(error) {checkbox.checked=false;console.error(error)}
    });
    get("streaming-reset-playback-warning")?.addEventListener("click",async()=>{await DashboardStreaming.savePreferences({dashboard_playback_warning_acknowledged:false});await refresh()});
    const settings=get("settings-view");if(settings&&window.MutationObserver)new MutationObserver(()=>{if(!settings.hidden)refresh()}).observe(settings,{attributes:true,attributeFilter:["hidden"]});
  }

  function addChangelogRuntimeEntry() {
    const view=get("changelog-view");if(!view)return;
    const inject=()=>{const body=view.querySelector(".changelog-list")||view.querySelector("tbody")||view.querySelector(".internal-view-content")||view.querySelector(".changelog-content");if(!body||get("streaming-0610-changelog-entry"))return;
      const bug='Improves iPhone safe-area, touch and modal behavior; keeps My Dashboard in the provider hierarchy; makes Watch provider selection persistent and visible; connects Streaming project settings to the same saved account preferences; and makes title menus reflect watch state.';
      if(body.tagName==="TBODY"){const tr=document.createElement("tr");tr.id="streaming-0610-changelog-entry";tr.innerHTML=`<td>${VERSION}</td><td>${TITLE}</td><td>${DESCRIPTION}<br><strong>Bug Fixes:</strong> ${bug}</td>`;body.prepend(tr)}
      else{const card=document.createElement("div");card.id="streaming-0610-changelog-entry";card.style.cssText="margin:0 0 12px;padding:14px;border:1px solid #dfe3e8;border-radius:12px;background:#f7f8fa";card.innerHTML=`<strong>${VERSION} · ${TITLE}</strong><p style="margin:7px 0 0;line-height:1.5">${DESCRIPTION}</p><p style="margin:7px 0 0;line-height:1.5"><strong>Bug Fixes:</strong> ${bug}</p>`;body.prepend(card)}
    };new MutationObserver(inject).observe(view,{attributes:true,childList:true,subtree:true});inject();
  }

  async function init() {if(initialized||!get("settings-view")||!window.DashboardStreaming)return;initialized=true;css();makeSection();bind();addChangelogRuntimeEntry();window.DashboardApplyCurrentVersionLabel?.();await refresh()}
  const timer=setInterval(()=>{if(initialized){clearInterval(timer);return}init().catch(console.error)},150);setTimeout(()=>clearInterval(timer),20000);
})();
