(() => {
  "use strict";
  const VERSION = "0.3.7";
  const HISTORY_URL = "/All%20Results.json";
  const TODAY_URL = "/Game%20Results.json";
  const PICKS_STORAGE_KEY = "nhlAnalyticsModelPicks:v1";
  const $ = id => document.getElementById(id);
  const state = { history: [], games: [], today: [], filtered: [], shown: 100, loadedAt: null, isAdmin: false, selectedPicks: new Map(), selectedSeason: "", overviewMode: "", pickHistory: [] };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const num = value => { const n = Number(value); return Number.isFinite(n) ? n : null; };
  const pct = value => Number.isFinite(value) ? (value * 100).toFixed(1) + "%" : "—";
  const fixed = (value, digits=3) => Number.isFinite(value) ? value.toFixed(digits) : "—";
  const sum = values => values.reduce((a,b) => a + (Number.isFinite(b) ? b : 0), 0);
  const avg = values => { const valid = values.filter(Number.isFinite); return valid.length ? sum(valid)/valid.length : null; };
  const formatDate = value => { if (!value) return "Unknown"; const d = new Date(value + "T12:00:00"); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };
  const normalizeList = value => {
    if (Array.isArray(value)) return value.filter(v => v != null && String(v).trim()).map(String);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    if (value && typeof value === "object") return Object.keys(value).length ? Object.values(value).flatMap(normalizeList) : [];
    return [];
  };
  const normalizeGoalie = value => typeof value === "string" && value.trim() ? value.trim() : "Not confirmed";
  const bettingSelections = value => {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value !== "string" || !value.trim()) return [];
    return value.split(/\s*;\s*|\s*\|\s*/).map(s=>s.trim()).filter(Boolean);
  };
  function normalizeCorrectBettingLines(value) {
    if (Array.isArray(value)) return value.map(num);
    const single=num(value);
    if (Number.isFinite(single)) return [single];
    if (value && typeof value==="object") return Object.values(value).map(num);
    return [];
  }
  function bettingAccuracyBreakdown(games) {
    const result={
      moneyline:{correct:0,total:0},
      player:{correct:0,total:0},
      overall:{correct:0,total:0}
    };
    games.forEach(g=>{
      const lines=Array.isArray(g.bets)?g.bets:[];
      const scored=Array.isArray(g.correctBettingResults)?g.correctBettingResults:[];
      lines.forEach((line,index)=>{
        const correct=scored[index];
        if(!Number.isFinite(correct)) return;
        const bucket=index===0?result.moneyline:result.player;
        bucket.total+=1;
        bucket.correct+=correct===1?1:0;
        result.overall.total+=1;
        result.overall.correct+=correct===1?1:0;
      });
    });
    [result.moneyline,result.player,result.overall].forEach(row=>row.accuracy=row.total?row.correct/row.total:null);
    return result;
  }

  function escapeReg(value){ return String(value||"").replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&"); }
  function parseOutcome(text, home, away) {
    const raw = typeof text === "string" ? text : "";
    const winner = raw.includes(",") ? raw.split(",")[0].trim().replace(/\s*\(OTW\)\s*/i,"") : "";
    const diff = raw.match(/Expected difference:\s*([-+]?\d*\.?\d+)/i);
    const first = raw.match(new RegExp(escapeReg(home)+":\\s*([-+]?\\d*\\.?\\d+)\\s*v\\s*"+escapeReg(away)+":\\s*([-+]?\\d*\\.?\\d+)","i"));
    const perc = raw.match(new RegExp("\\("+escapeReg(home)+":\\s*([\\d.]+)%\\s*,\\s*"+escapeReg(away)+":\\s*([\\d.]+)%\\)","i"));
    return { raw, winner, expectedDifference: diff ? Number(diff[1]) : null, homeExpected: first ? Number(first[1]) : null, awayExpected: first ? Number(first[2]) : null, homeWinPct: perc ? Number(perc[1])/100 : null, awayWinPct: perc ? Number(perc[2])/100 : null };
  }
  function easternDateKey() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type)?.value || "";
    return get("year") + "-" + get("month") + "-" + get("day");
  }
  function zonedLocalToUtc(dateKey, timeText, timeZone) {
    const match = String(timeText || "").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match || !dateKey) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    const target = { year, month, day, hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] || 0) };
    let guess = Date.UTC(year, month - 1, day, target.hour, target.minute, target.second);
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    for (let i = 0; i < 3; i++) {
      const parts = formatter.formatToParts(new Date(guess));
      const value = type => Number(parts.find(p => p.type === type)?.value || 0);
      const seen = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour") % 24, value("minute"), value("second"));
      const wanted = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second);
      guess += wanted - seen;
    }
    return new Date(guess);
  }
  function formatStartTimeForViewer(timeText, dateKey="") {
    const instant = zonedLocalToUtc(dateKey || easternDateKey(), timeText, "America/New_York");
    if (!instant || Number.isNaN(instant.getTime())) return timeText || "—";
    return instant.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function latestModelRunForViewer(games) {
    const dateKey=easternDateKey();
    const runs=(games||[]).map(g=>zonedLocalToUtc(dateKey,g.timeLastRun,"America/New_York")).filter(d=>d && !Number.isNaN(d.getTime()));
    if(!runs.length) return "—";
    const latest=new Date(Math.max(...runs.map(d=>d.getTime())));
    return latest.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit",hour12:true});
  }

  function dashboardSupabaseClient() {
    return window.DashboardEntryAuth?.client || window.DashboardAuth?.client || window.supabaseClient || null;
  }
  function normalizeStoredPick(row) {
    if(!row) return null;
    const id=String(row.pick_id||row.id||"");
    const date=String(row.pick_date||row.date||"");
    const type=String(row.pick_type||row.type||"");
    const label=String(row.label||"");
    let target=String(row.target||"");
    let teamAbv=String(row.team_abv||row.teamAbv||"");
    if(!target && type==="Moneyline") target=label.split(/\s+/)[0]||"";
    if(!target && type==="Player Point") target=label.split(":")[0].trim();
    if(!teamAbv && type==="Moneyline") teamAbv=target;
    if(!teamAbv && type==="Player Point"){
      const after=label.split(":")[1]||"";
      teamAbv=after.trim().split(/\s+/)[0]||"";
    }
    return {id,date,matchup:String(row.matchup||""),type,target,label,teamAbv,detail:""};
  }
  async function currentDashboardUser() {
    const client=dashboardSupabaseClient();
    if(!client?.auth?.getUser) return null;
    try {
      const {data,error}=await client.auth.getUser();
      if(error) throw error;
      return data?.user||null;
    } catch(error) {
      console.warn("NHL Analytics user lookup failed.",error);
      return null;
    }
  }
  async function persistModelPick(pick) {
    const client=dashboardSupabaseClient(),user=await currentDashboardUser();
    if(!client?.from||!user||!pick) return;
    const row={
      user_id:user.id,
      pick_id:pick.id,
      pick_date:pick.date,
      matchup:pick.matchup,
      pick_type:pick.type,
      target:pick.target||"",
      label:pick.label,
      team_abv:pick.teamAbv||null
    };
    const {error}=await client.from("nhl_model_picks").upsert(row,{onConflict:"user_id,pick_id"});
    if(error) throw error;
  }
  async function deleteModelPickFromAccount(pickId) {
    const client=dashboardSupabaseClient(),user=await currentDashboardUser();
    if(!client?.from||!user) return;
    const {error}=await client.from("nhl_model_picks").delete().eq("user_id",user.id).eq("pick_id",pickId);
    if(error) throw error;
  }
  async function loadAccountPickHistory() {
    const client=dashboardSupabaseClient(),user=await currentDashboardUser();
    if(!client?.from||!user){state.pickHistory=[...state.selectedPicks.values()];return;}
    try {
      const {data,error}=await client.from("nhl_model_picks").select("pick_id,pick_date,matchup,pick_type,target,label,team_abv,created_at").order("pick_date",{ascending:true});
      if(error) throw error;
      let rows=(data||[]).map(normalizeStoredPick).filter(Boolean);
      const local=[...state.selectedPicks.values()].map(normalizeStoredPick).filter(Boolean);
      for(const pick of local){
        if(!rows.some(row=>row.id===pick.id)){
          try{await persistModelPick(pick);rows.push(pick);}catch(error){console.warn("NHL Analytics local pick migration failed.",error);}
        }
      }
      state.pickHistory=rows;
      const today=easternDateKey();
      state.selectedPicks=new Map(rows.filter(p=>p.date===today).map(p=>[p.id,p]));
      saveSelectedPicks();
    } catch(error) {
      console.warn("NHL Analytics pick history load failed.",error);
      state.pickHistory=[...state.selectedPicks.values()];
    }
  }

  function loadSelectedPicks() {
    try {
      const raw=JSON.parse(localStorage.getItem(PICKS_STORAGE_KEY)||"[]");
      const today=easternDateKey();
      state.selectedPicks=new Map((Array.isArray(raw)?raw:[]).filter(p=>p?.date===today&&p?.id).map(p=>[p.id,p]));
    } catch { state.selectedPicks=new Map(); }
  }
  function saveSelectedPicks() {
    try { localStorage.setItem(PICKS_STORAGE_KEY,JSON.stringify([...state.selectedPicks.values()])); } catch {}
  }
  function playerPercentForName(g,name,side) {
    const list=side==="home"?g.homePlayerPredictions:g.awayPlayerPredictions;
    return list.find(p=>p.name===name)?.percentText||"";
  }
  function modelPicksForGame(g,index) {
    const date=easternDateKey(),matchup=g.away+" @ "+g.home,picks=[];
    if(g.outcome.winner){
      const id=[date,matchup,"moneyline",g.outcome.winner].join("|");
      picks.push({id,date,matchup,type:"Moneyline",target:g.outcome.winner,teamAbv:g.outcome.winner,label:g.outcome.winner+" Moneyline",detail:""});
    }
    [...g.awayScorerNames].forEach(name=>{
      const id=[date,matchup,"point",name].join("|");
      picks.push({id,date,matchup,type:"Player Point",target:name,teamAbv:g.away,label:name+": "+g.away+" 1+ Point",detail:""});
    });
    [...g.homeScorerNames].forEach(name=>{
      const id=[date,matchup,"point",name].join("|");
      picks.push({id,date,matchup,type:"Player Point",target:name,teamAbv:g.home,label:name+": "+g.home+" 1+ Point",detail:""});
    });
    return picks;
  }
  async function toggleModelPick(pick) {
    const removing=state.selectedPicks.has(pick.id);
    if(removing) state.selectedPicks.delete(pick.id);
    else state.selectedPicks.set(pick.id,pick);
    saveSelectedPicks();
    if(removing) state.pickHistory=state.pickHistory.filter(p=>p.id!==pick.id);
    else if(!state.pickHistory.some(p=>p.id===pick.id)) state.pickHistory.push(pick);
    renderToday();
    renderSelectedModelPicks();
    renderOverview();
    try {
      if(removing) await deleteModelPickFromAccount(pick.id);
      else await persistModelPick(pick);
    } catch(error) {
      console.warn("NHL Analytics pick sync failed.",error);
    }
  }
  function renderModelPicks(g,index) {
    const picks=modelPicksForGame(g,index);
    if(!picks.length) return '<div class="model-picks"><div class="model-picks-head"><strong>Model Picks</strong><span>No selectable predictions</span></div></div>';
    return '<div class="model-picks"><div class="model-picks-head"><strong>Model Picks</strong><span>Select only what the model predicted</span></div><div class="pick-options">'+picks.map(p=>'<button type="button" class="pick-option'+(state.selectedPicks.has(p.id)?" selected":"")+'" data-model-pick="'+esc(p.id)+'">'+esc(p.label)+'</button>').join("")+'</div></div>';
  }
  function bindModelPickButtons() {
    document.querySelectorAll("[data-model-pick]").forEach(button=>{
      button.addEventListener("click",()=>{
        const id=button.dataset.modelPick;
        const pick=state.today.flatMap((g,i)=>modelPicksForGame(g,i)).find(p=>p.id===id);
        if(pick) toggleModelPick(pick).catch(error=>console.warn("NHL Analytics pick update failed.",error));
      });
    });
  }
  function renderSelectedModelPicks() {
    const host=$("selectedModelPicks"); if(!host) return;
    const picks=[...state.selectedPicks.values()];
    if(!picks.length){host.innerHTML='<div class="selected-picks-empty">No model picks selected yet.</div>';return;}
    host.innerHTML='<div class="selected-picks-list">'+picks.map(p=>'<div class="selected-pick-row"><div><strong>'+esc(p.label)+'</strong><span>'+esc(p.matchup)+' · '+esc(p.type)+(p.detail?' · '+esc(p.detail):'')+'</span></div><button type="button" class="selected-pick-remove" data-remove-pick="'+esc(p.id)+'">Remove</button></div>').join("")+'</div>';
    host.querySelectorAll("[data-remove-pick]").forEach(button=>button.addEventListener("click",()=>{
      const id=button.dataset.removePick; state.selectedPicks.delete(id); state.pickHistory=state.pickHistory.filter(p=>p.id!==id); saveSelectedPicks(); renderSelectedModelPicks(); renderToday(); renderOverview(); deleteModelPickFromAccount(id).catch(error=>console.warn("NHL Analytics pick removal sync failed.",error));
    }));
  }

  function expectedScorerDisplayName(value) {
    const text=String(value||"").trim();
    if(!text) return "";
    return text.split(",")[0].trim();
  }

  function normalizePlayerPredictions(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    return Object.entries(value).map(([name, raw]) => {
      const parts = Array.isArray(raw) ? raw : [raw];
      const modelValue = num(parts[0]);
      const percentText = typeof parts[1] === "string" ? parts[1].trim() : "";
      const percentValue = percentText ? Number(percentText.replace("%","")) : null;
      return { name, modelValue, percentText: percentText || (Number.isFinite(percentValue) ? percentValue.toFixed(2)+"%" : "—"), percentValue: Number.isFinite(percentValue) ? percentValue : null };
    }).sort((a,b) => (b.percentValue ?? -1) - (a.percentValue ?? -1) || a.name.localeCompare(b.name));
  }
  function scorerNameSet(value) {
    if (!value) return new Set();
    const clean = item => expectedScorerDisplayName(item);
    if (Array.isArray(value)) return new Set(value.map(clean).filter(Boolean));
    if (typeof value === "string") return new Set([clean(value)].filter(Boolean));
    if (typeof value === "object") {
      const keys=Object.keys(value);
      const source=keys.length ? keys : Object.values(value).flatMap(normalizeList);
      return new Set(source.map(clean).filter(Boolean));
    }
    return new Set();
  }

  function normalizeGame(game={}, date="") {
    const home = String(game.homeABV || "?"), away = String(game.awayABV || "?"), outcome = parseOutcome(game.outcome, home, away);
    const correct = num(game.correctLines), total = num(game.totalLines), bets = bettingSelections(game.bettingLines);
    return {...game,date,home,away,outcome,homeGoalie:normalizeGoalie(game.homeGoalie),awayGoalie:normalizeGoalie(game.awayGoalie),homeScorersList:normalizeList(game.homeScorers),awayScorersList:normalizeList(game.awayScorers),homeScorerNames:scorerNameSet(game.homeScorers),awayScorerNames:scorerNameSet(game.awayScorers),homePlayerPredictions:normalizePlayerPredictions(game.allHomePoints),awayPlayerPredictions:normalizePlayerPredictions(game.allAwayPoints),correct,total,lineAccuracy:Number.isFinite(correct)&&Number.isFinite(total)&&total>0?correct/total:null,homeMSE:num(game.homeMeanSquaredError),awayMSE:num(game.awayMeanSquaredError),homeLL:num(game.homeLogLoss),awayLL:num(game.awayLogLoss),bets,correctBettingResults:normalizeCorrectBettingLines(game.correctBettingLines),correctBets:sum(normalizeCorrectBettingLines(game.correctBettingLines))};
  }

  async function resolveAdminAccess() {
    const access = window.DashboardEntryAuth?.access;
    if (typeof access?.admin === "boolean") return access.admin;
    const client = window.DashboardEntryAuth?.client || window.DashboardAuth?.client || window.supabaseClient || null;
    if (!client?.rpc) return false;
    try {
      const { data, error } = await client.rpc("is_admin");
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.warn("NHL Analytics admin check failed.", error);
      return false;
    }
  }
  function applyAdminAccess() {
    document.querySelectorAll("[data-admin-only='true']").forEach(el => el.classList.toggle("hidden", !state.isAdmin));
    if (!state.isAdmin) state.overviewMode="mine";
    else if(!state.overviewMode) state.overviewMode="all";
    if ($("overviewMode")) $("overviewMode").value=state.overviewMode||"mine";
    if (!state.isAdmin && location.hash === "#model") switchView("overview");
  }
  function setupRosterSimulation() {
    const frame = $("rosterFrame"), loading = $("rosterLoading");
    if (!frame || !loading) return;
    frame.addEventListener("load", () => loading.classList.add("hidden"));
  }

  async function fetchJson(url) { const response=await fetch(url+"?t="+Date.now(),{cache:"no-store"}); if(!response.ok) throw new Error(response.status+" "+response.statusText); return response.json(); }
  async function loadData() {
    $("refreshBtn").disabled=true; setStatus("Loading NHL prediction data…","");
    const [historyResult,todayResult]=await Promise.allSettled([fetchJson(HISTORY_URL),fetchJson(TODAY_URL)]);
    if(historyResult.status==="fulfilled"&&Array.isArray(historyResult.value)){state.history=historyResult.value;state.games=state.history.flatMap(day=>Array.isArray(day?.games)?day.games.map(g=>normalizeGame(g,day.date||"")):[]);state.games.sort((a,b)=>(b.date||"").localeCompare(a.date||"")||String(b.startingTime||"").localeCompare(String(a.startingTime||"")));}else{state.history=[];state.games=[];}
    state.today=todayResult.status==="fulfilled"&&Array.isArray(todayResult.value)?todayResult.value.map(g=>normalizeGame(g,"")):[];
    state.loadedAt=new Date();state.shown=100;populateTeamFilter();populateSeasonSelectors();await loadAccountPickHistory();renderAll();
    if(state.games.length&&state.today.length)setStatus("Historical and current-day NHL data loaded.","good");else if(state.games.length||state.today.length)setStatus("Part of the NHL data loaded. One source is currently unavailable.","warn");else setStatus("NHL data could not be loaded. Check the JSON outputs and try again.","bad");
    $("refreshBtn").disabled=false;
  }
  function setStatus(message,type){const el=$("dataStatus");el.className="status"+(type?" "+type:"");el.querySelector("span:last-child").textContent=message;}
  function metric(label,value,sub=""){return '<article class="metric"><span class="metric-label">'+esc(label)+'</span><strong class="metric-value">'+esc(value)+'</strong><span class="metric-sub">'+esc(sub)+'</span></article>';}
  function seasonKeyFromDate(dateText) {
    const m=String(dateText||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return "";
    const year=Number(m[1]),month=Number(m[2]);
    const start=month>=7?year:year-1;
    return start+"-"+String((start+1)%100).padStart(2,"0");
  }
  function currentSeasonKey() {
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const year=Number(parts.find(p=>p.type==="year")?.value||0),month=Number(parts.find(p=>p.type==="month")?.value||0);
    const start=month>=7?year:year-1;
    return start+"-"+String((start+1)%100).padStart(2,"0");
  }
  function availableSeasons() {
    return [...new Set(state.games.map(g=>seasonKeyFromDate(g.date)).filter(Boolean))].sort().reverse();
  }
  function seasonFilteredGames() {
    if(!state.selectedSeason) return state.games;
    return state.games.filter(g=>seasonKeyFromDate(g.date)===state.selectedSeason);
  }
  function populateSeasonSelectors() {
    const seasons=availableSeasons(),current=currentSeasonKey();
    if(!state.selectedSeason) state.selectedSeason=seasons.includes(current)?current:(seasons[0]||"");
    const options='<option value="">Everything</option>'+seasons.map(s=>'<option value="'+esc(s)+'">'+esc(s.replace("-", "–"))+'</option>').join("");
    ["overviewSeason","gamesSeason"].forEach(id=>{
      const el=$(id); if(!el) return;
      el.innerHTML=options;
      el.value=state.selectedSeason;
    });
  }
  function setSelectedSeason(value) {
    state.selectedSeason=value||"";
    ["overviewSeason","gamesSeason"].forEach(id=>{const el=$(id);if(el)el.value=state.selectedSeason;});
    renderOverview();
    applyGameFilters();
  }

  function pickGame(pick) {
    return state.games.find(g=>g.date===pick.date && (g.away+" @ "+g.home)===pick.matchup)||null;
  }
  function bettingLinePlayerName(line) {
    return String(line||"").split(":")[0].trim();
  }
  function scorePersonalPick(pick) {
    const game=pickGame(pick);
    if(!game) return null;
    let index=-1;
    if(pick.type==="Moneyline") index=0;
    else if(pick.type==="Player Point") index=game.bets.findIndex((line,i)=>i>0&&bettingLinePlayerName(line)===pick.target);
    if(index<0) return null;
    const result=game.correctBettingResults[index];
    return Number.isFinite(result)?(result===1?1:0):null;
  }
  function personalPickRecords() {
    return state.pickHistory.filter(p=>!state.selectedSeason||seasonKeyFromDate(p.date)===state.selectedSeason).map(p=>({...p,correct:scorePersonalPick(p)})).sort((a,b)=>b.date.localeCompare(a.date));
  }
  function personalAggregate(records) {
    const scored=records.filter(r=>Number.isFinite(r.correct));
    const correct=sum(scored.map(r=>r.correct));
    return {correct,total:scored.length,accuracy:scored.length?correct/scored.length:null,picks:records.length};
  }
  function personalInLastDays(days,records) {
    const dates=records.map(r=>r.date).filter(Boolean).sort();
    if(!dates.length) return [];
    const end=new Date(dates.at(-1)+"T12:00:00"),start=new Date(end);start.setDate(start.getDate()-(days-1));
    return records.filter(r=>{const d=new Date(r.date+"T12:00:00");return d>=start&&d<=end;});
  }
  function personalDailySeries(records) {
    const map=new Map();
    records.forEach(r=>{
      if(!Number.isFinite(r.correct)||!r.date)return;
      const row=map.get(r.date)||{date:r.date,correct:0,total:0};
      row.correct+=r.correct;row.total+=1;map.set(r.date,row);
    });
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({...r,accuracy:r.total?r.correct/r.total:null}));
  }
  function personalWindowRows(records) {
    if(!records.length)return'<div class="empty">No selected picks are stored for this season.</div>';
    return '<div class="table-wrap"><table class="data-table" style="min-width:0"><thead><tr><th>Window</th><th>Accuracy</th><th>Picks</th></tr></thead><tbody>'+[7,14,30,60].map(days=>{const a=personalAggregate(personalInLastDays(days,records));return '<tr><td>Last '+days+' days</td><td><strong>'+pct(a.accuracy)+'</strong></td><td>'+a.correct+' / '+a.total+'</td></tr>';}).join("")+'</tbody></table></div>';
  }
  function personalPickTable(records) {
    if(!records.length)return'<div class="empty">No model picks selected for this season yet.</div>';
    return '<div class="table-wrap"><table class="data-table" style="min-width:620px"><thead><tr><th>Date</th><th>Matchup</th><th>Pick</th><th>Result</th></tr></thead><tbody>'+records.slice(0,50).map(r=>'<tr><td class="nowrap">'+esc(formatDate(r.date))+'</td><td>'+esc(r.matchup)+'</td><td><strong>'+esc(r.label)+'</strong></td><td>'+(!Number.isFinite(r.correct)?'Pending':r.correct===1?'Correct':'Incorrect')+'</td></tr>').join("")+'</tbody></table></div>';
  }
  function setOverviewLabels(mode) {
    const mine=mode==="mine";
    if($("overviewDescription"))$("overviewDescription").textContent=mine?"Historical performance for the model picks you selected.":"Historical line accuracy and model performance across completed prediction days.";
    if($("overviewChartTitle"))$("overviewChartTitle").textContent=mine?"My Pick Accuracy Over Time":"Accuracy Over Time";
    if($("overviewChartNote"))$("overviewChartNote").textContent=mine?"Daily accuracy for your scored selections":"Daily correct lines ÷ total lines";
    if($("overviewWindowTitle"))$("overviewWindowTitle").textContent="Recent Windows";
    if($("overviewWindowNote"))$("overviewWindowNote").textContent=mine?"Based on your latest selected-pick date":"Based on latest stored date";
    if($("overviewLatestTitle"))$("overviewLatestTitle").textContent=mine?"Latest Selected Picks":"Latest Completed Games";
    if($("overviewLatestNote"))$("overviewLatestNote").textContent=mine?"Your most recent tracked selections":"Most recent historical results";
  }
  function renderPersonalOverview() {
    const records=personalPickRecords(),all=personalAggregate(records),last7=personalAggregate(personalInLastDays(7,records)),last30=personalAggregate(personalInLastDays(30,records));
    const scored=records.filter(r=>Number.isFinite(r.correct)).length;
    $("overviewMetrics").innerHTML=
      metric("Overall Accuracy",pct(all.accuracy),all.total?all.correct+" of "+all.total+" scored picks":"No scored picks")+
      metric("Picks",all.picks.toLocaleString(),"Model picks you selected")+
      metric("Scored Picks",scored.toLocaleString(),(all.picks-scored)+" pending")+
      metric("Last 7 Days",pct(last7.accuracy),last7.total?last7.correct+" of "+last7.total+" picks":"No scored picks")+
      metric("Last 30 Days",pct(last30.accuracy),last30.total?last30.correct+" of "+last30.total+" picks":"No scored picks");
    lineChart("accuracyChart",personalDailySeries(records),[{label:"My Accuracy",value:r=>Number.isFinite(r.accuracy)?r.accuracy*100:null}],100);
    $("recentWindows").innerHTML=personalWindowRows(records);
    $("latestGames").innerHTML=personalPickTable(records);
  }

  function aggregateLineAccuracy(games){const correct=sum(games.map(g=>g.correct)),total=sum(games.map(g=>g.total));return{correct,total,accuracy:total>0?correct/total:null};}
  function latestDatasetDate(games=state.games){return games.map(g=>g.date).filter(Boolean).sort().at(-1)||null;}
  function gamesInLastDays(days,games=state.games){const latest=latestDatasetDate(games);if(!latest)return[];const end=new Date(latest+"T12:00:00"),start=new Date(end);start.setDate(start.getDate()-(days-1));return games.filter(g=>{const d=new Date(g.date+"T12:00:00");return d>=start&&d<=end;});}
  function renderOverview(){
    const mode=state.isAdmin?(state.overviewMode||"all"):"mine";
    if($("overviewMode"))$("overviewMode").value=mode;
    setOverviewLabels(mode);
    if(mode==="mine"){renderPersonalOverview();return;}
    const seasonGames=seasonFilteredGames(),all=aggregateLineAccuracy(seasonGames),last7=aggregateLineAccuracy(gamesInLastDays(7,seasonGames)),last30=aggregateLineAccuracy(gamesInLastDays(30,seasonGames));
    $("overviewMetrics").innerHTML=metric("Overall Accuracy",pct(all.accuracy),all.correct+" of "+all.total+" tracked lines")+metric("Bets",all.total.toLocaleString(),"Total prediction lines tracked")+metric("Prediction Days",new Set(seasonGames.map(g=>g.date).filter(Boolean)).size.toLocaleString(),"Historical dates stored")+metric("Last 7 Days",pct(last7.accuracy),last7.total?last7.correct+" of "+last7.total+" lines":"No stored lines")+metric("Last 30 Days",pct(last30.accuracy),last30.total?last30.correct+" of "+last30.total+" lines":"No stored lines");
    renderAccuracyChart(seasonGames);$("recentWindows").innerHTML=windowRows([7,14,30,60].map(days=>({days,data:aggregateLineAccuracy(gamesInLastDays(days,seasonGames))})));renderLatestGames(seasonGames);
  }
  function windowRows(rows){if(!state.games.length)return'<div class="empty">No historical results are available.</div>';return'<div class="table-wrap"><table class="data-table" style="min-width:0"><thead><tr><th>Window</th><th>Accuracy</th><th>Lines</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>Last '+r.days+' days</td><td><strong>'+pct(r.data.accuracy)+'</strong></td><td>'+r.data.correct+' / '+r.data.total+'</td></tr>').join("")+'</tbody></table></div>';}
  function dailySeries(games=state.games){const map=new Map();games.forEach(g=>{if(!g.date)return;const row=map.get(g.date)||{date:g.date,correct:0,total:0,mse:[],ll:[]};row.correct+=Number.isFinite(g.correct)?g.correct:0;row.total+=Number.isFinite(g.total)?g.total:0;row.mse.push(g.homeMSE,g.awayMSE);row.ll.push(g.homeLL,g.awayLL);map.set(g.date,row);});return[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({...r,accuracy:r.total?r.correct/r.total:null,mseAvg:avg(r.mse),llAvg:avg(r.ll)}));}
  function lineChart(containerId,series,accessors,yMaxOverride=null){
    const host=$(containerId),valid=series.filter(row=>accessors.some(a=>Number.isFinite(a.value(row))));
    if(!valid.length){host.innerHTML='<div class="chart-empty">Not enough stored data to draw this chart.</div>';return;}
    const recent=valid.slice(-60),width=900,height=245,pad={l:36,r:14,t:16,b:28},vals=recent.flatMap(r=>accessors.map(a=>a.value(r)).filter(Number.isFinite)),min=Math.min(...vals),max=yMaxOverride??Math.max(...vals),low=yMaxOverride!==null?0:Math.max(0,min-(max-min)*.12),high=max===low?low+1:max+(max-low)*.08,x=i=>pad.l+(recent.length===1?0:(i/(recent.length-1))*(width-pad.l-pad.r)),y=v=>pad.t+(high-v)/(high-low)*(height-pad.t-pad.b);
    let svg='<svg class="chart" viewBox="0 0 '+width+' '+height+'" role="img">';[0,.25,.5,.75,1].forEach(t=>{const yy=pad.t+t*(height-pad.t-pad.b);svg+='<line class="chart-grid" x1="'+pad.l+'" x2="'+(width-pad.r)+'" y1="'+yy+'" y2="'+yy+'"/>';});
    accessors.forEach((a,ai)=>{const points=recent.map((r,i)=>({x:x(i),y:Number.isFinite(a.value(r))?y(a.value(r)):null})).filter(p=>p.y!==null);if(points.length){const d=points.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");svg+='<path d="'+d+'" fill="none" stroke="'+(ai===0?"#3769b0":"#9a6515")+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'; }});
    if(recent.length)svg+='<text class="chart-label" x="'+pad.l+'" y="'+(height-7)+'">'+esc(recent[0].date.slice(5))+'</text><text class="chart-label" text-anchor="end" x="'+(width-pad.r)+'" y="'+(height-7)+'">'+esc(recent.at(-1).date.slice(5))+'</text>';
    svg+='</svg><div class="panel-note">'+accessors.map((a,i)=>'<span style="margin-right:12px"><b style="color:'+(i===0?"#3769b0":"#9a6515")+'">●</b> '+esc(a.label)+'</span>').join("")+'</div>';host.innerHTML=svg;
  }
  function renderAccuracyChart(games=state.games){lineChart("accuracyChart",dailySeries(games),[{label:"Accuracy",value:r=>Number.isFinite(r.accuracy)?r.accuracy*100:null}],100);}
  function gameRow(g){return'<tr><td class="nowrap">'+esc(formatDate(g.date))+'</td><td><span class="team">'+esc(g.away)+'</span> @ <span class="team">'+esc(g.home)+'</span></td><td>'+esc(g.outcome.winner||"—")+'</td><td>'+esc(Number.isFinite(g.lineAccuracy)?pct(g.lineAccuracy):"—")+'</td><td>'+esc(Number.isFinite(g.correct)&&Number.isFinite(g.total)?g.correct+" / "+g.total:"—")+'</td><td>'+esc(g.bets.join("; ")||"—")+'</td></tr>';}
  function gameTable(games){if(!games.length)return'<div class="empty">No games match this view.</div>';return'<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Matchup</th><th>Predicted Winner</th><th>Line Accuracy</th><th>Correct / Total</th><th>Betting</th></tr></thead><tbody>'+games.map(gameRow).join("")+'</tbody></table></div>';}
  function renderLatestGames(games=state.games){$("latestGames").innerHTML=gameTable(games.slice(0,10));}
  function renderToday(){
    const predicted=state.today.filter(g=>g.outcome.winner).length,confirmedGoalies=sum(state.today.map(g=>(g.homeGoalie!=="Not confirmed"?1:0)+(g.awayGoalie!=="Not confirmed"?1:0))),totalGoalieSlots=state.today.length*2,betCount=sum(state.today.map(g=>g.bets.length));
    $("todaySummary").innerHTML=metric("Games",state.today.length.toString(),"Current Game Results.json")+metric("Predictions",predicted.toString(),"Games with a parsed winner")+metric("Goalies Confirmed",confirmedGoalies+" / "+totalGoalieSlots,"Confirmed starting goalies")+metric("Betting Picks",betCount.toString(),"Current tracked selections")+metric("Last Refresh",latestModelRunForViewer(state.today),"Latest Start Day / Loop for Games model run");
    $("todayGames").innerHTML=state.today.length?state.today.map((g,i)=>todayCard(g,i)).join(""):'<div class="panel empty">No current-day games are available in Game Results.json.</div>';setupPlayerPredictionToggles();bindModelPickButtons();
  }
  function playerTeamSection(team, players, scorerNames) {
    if (!players.length) return '<section class="player-team-section"><div class="player-team-header"><strong>'+esc(team)+'</strong><span>0 players</span></div><div class="player-empty">No player prediction data stored for this team.</div></section>';
    return '<section class="player-team-section"><div class="player-team-header"><strong>'+esc(team)+'</strong><span>'+players.length+' players</span></div><div class="player-list">'+players.map(player => {
      const badge=scorerNames.has(player.name)?'<span class="player-badge">Expected scorer</span>':'';
      return '<div class="player-row"><div class="player-name"><div class="player-name-line">'+esc(player.name)+badge+'</div></div><div class="player-value"><span>Model value</span><strong>'+esc(Number.isFinite(player.modelValue)?fixed(player.modelValue,4):"—")+'</strong></div><div class="player-percent"><span>Point %</span><strong>'+esc(player.percentText||"—")+'</strong></div></div>';
    }).join("")+'</div></section>';
  }
  function playerPredictionsBlock(g,index) {
    const id='player-predictions-'+index;
    const total=g.awayPlayerPredictions.length+g.homePlayerPredictions.length;
    return '<button class="player-prediction-toggle" type="button" aria-expanded="false" aria-controls="'+id+'" data-player-toggle="'+id+'">View Player Predictions'+(total?' ('+total+')':'')+'</button><div id="'+id+'" class="player-predictions hidden">'+playerTeamSection(g.away,g.awayPlayerPredictions,g.awayScorerNames)+playerTeamSection(g.home,g.homePlayerPredictions,g.homeScorerNames)+'</div>';
  }
  function setupPlayerPredictionToggles() {
    document.querySelectorAll("[data-player-toggle]").forEach(button => {
      button.addEventListener("click", () => {
        const target=$(button.dataset.playerToggle);
        if (!target) return;
        const opening=target.classList.contains("hidden");
        target.classList.toggle("hidden",!opening);
        button.setAttribute("aria-expanded",opening?"true":"false");
        button.textContent=opening?"Hide Player Predictions":button.dataset.closedLabel||"View Player Predictions";
      });
      if (!button.dataset.closedLabel) button.dataset.closedLabel=button.textContent;
    });
  }

  function todayCard(g,index){
    const confidence=g.outcome.winner===g.home?g.outcome.homeWinPct:g.outcome.winner===g.away?g.outcome.awayWinPct:null,scorers=[...g.awayScorersList,...g.homeScorersList];
    return'<article class="game-card"><div class="matchup"><div class="club"><strong>'+esc(g.away)+'</strong><span>'+esc(g.awayGoalie)+'</span></div><span class="at">@</span><div class="club" style="text-align:right"><strong>'+esc(g.home)+'</strong><span>'+esc(g.homeGoalie)+'</span></div></div><div class="prediction"><strong>Prediction: '+esc(g.outcome.winner||"Unavailable")+(Number.isFinite(confidence)?" · "+pct(confidence):"")+'</strong></div><div class="game-details"><div class="detail"><label>Start</label><p>'+esc(formatStartTimeForViewer(g.startingTime,g.date))+'</p></div><div class="detail"><label>Last Model Run</label><p>'+esc(formatStartTimeForViewer(g.timeLastRun,g.date))+'</p></div><div class="detail"><label>Betting</label><p>'+esc(g.bets.join("; ")||"No betting line stored")+'</p></div><div class="detail"><label>Expected Difference</label><p>'+esc(Number.isFinite(g.outcome.expectedDifference)?fixed(g.outcome.expectedDifference,3):"—")+'</p></div><div class="detail scorers"><label>Expected Point Scorers</label>'+(scorers.length?'<div class="chips">'+scorers.map(s=>'<span class="chip">'+esc(expectedScorerDisplayName(s))+'</span>').join("")+'</div>':'<p>No scorer prediction stored for this game.</p>')+'</div></div>'+renderModelPicks(g,index)+playerPredictionsBlock(g,index)+'</article>';
  }
  function populateTeamFilter(){const teams=[...new Set(state.games.flatMap(g=>[g.home,g.away]).filter(t=>t&&t!=="?"))].sort(),select=$("teamFilter"),current=select.value;select.innerHTML='<option value="">All teams</option>'+teams.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join("");select.value=teams.includes(current)?current:"";}
  function applyGameFilters(){const q=$("gameSearch").value.trim().toLowerCase(),team=$("teamFilter").value,from=$("dateFrom").value,to=$("dateTo").value;state.filtered=seasonFilteredGames().filter(g=>{if(team&&g.home!==team&&g.away!==team)return false;if(from&&g.date<from)return false;if(to&&g.date>to)return false;if(q){const text=[g.home,g.away,g.homeGoalie,g.awayGoalie,g.outcome.raw,g.bets.join(" "),...g.homeScorersList,...g.awayScorersList].join(" ").toLowerCase();if(!text.includes(q))return false;}return true;});state.shown=100;renderGamesTable();}
  function renderGames(){const seasonGames=seasonFilteredGames();if(!state.filtered.length&&seasonGames.length)state.filtered=[...seasonGames];renderGamesTable();}
  function renderGamesTable(){const shown=state.filtered.slice(0,state.shown);$("gameCountNote").textContent=state.filtered.length.toLocaleString()+" matching games";$("gamesTable").innerHTML=gameTable(shown);$("loadMoreGames").classList.toggle("hidden",shown.length>=state.filtered.length);}
  function teamAggregates(){const map=new Map();state.games.forEach(g=>{[[g.home,g.homeMSE,g.homeLL],[g.away,g.awayMSE,g.awayLL]].forEach(([team,mse,ll])=>{if(!team||team==="?")return;const r=map.get(team)||{team,games:0,correct:0,total:0,mse:[],ll:[]};r.games++;if(Number.isFinite(g.correct))r.correct+=g.correct;if(Number.isFinite(g.total))r.total+=g.total;if(Number.isFinite(mse))r.mse.push(mse);if(Number.isFinite(ll))r.ll.push(ll);map.set(team,r);});});return[...map.values()].map(r=>({...r,accuracy:r.total?r.correct/r.total:null,mseAvg:avg(r.mse),llAvg:avg(r.ll)})).sort((a,b)=>a.team.localeCompare(b.team));}
  function renderModel(){
    const mse=state.games.flatMap(g=>[g.homeMSE,g.awayMSE]).filter(Number.isFinite),ll=state.games.flatMap(g=>[g.homeLL,g.awayLL]).filter(Number.isFinite),all=aggregateLineAccuracy(state.games);
    $("modelMetrics").innerHTML=metric("Average MSE",fixed(avg(mse),4),mse.length.toLocaleString()+" team-game values")+metric("Average Log Loss",fixed(avg(ll),4),ll.length.toLocaleString()+" team-game values")+metric("Line Accuracy",pct(all.accuracy),all.correct+" of "+all.total+" lines")+metric("Games With MSE",state.games.filter(g=>Number.isFinite(g.homeMSE)||Number.isFinite(g.awayMSE)).length.toString(),"Historical games")+metric("Games With Log Loss",state.games.filter(g=>Number.isFinite(g.homeLL)||Number.isFinite(g.awayLL)).length.toString(),"Historical games");
    lineChart("modelChart",dailySeries(),[{label:"Average MSE",value:r=>r.mseAvg},{label:"Average Log Loss",value:r=>r.llAvg}]);
    const teams=teamAggregates();$("teamModelTable").innerHTML=teams.length?'<div class="table-wrap"><table class="data-table" style="min-width:0"><thead><tr><th>Team</th><th>MSE</th><th>Log Loss</th></tr></thead><tbody>'+teams.map(r=>'<tr><td class="team">'+esc(r.team)+'</td><td>'+fixed(r.mseAvg,4)+'</td><td>'+fixed(r.llAvg,4)+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty">No team model metrics are available.</div>';
    $("teamCards").innerHTML=teams.map(r=>'<article class="team-card"><div class="team-card-head"><h4>'+esc(r.team)+'</h4><span class="big">'+pct(r.accuracy)+'</span></div><dl><dt>Games</dt><dd>'+r.games+'</dd><dt>Correct / Total Lines</dt><dd>'+r.correct+' / '+r.total+'</dd><dt>Average MSE</dt><dd>'+fixed(r.mseAvg,4)+'</dd><dt>Average Log Loss</dt><dd>'+fixed(r.llAvg,4)+'</dd></dl></article>').join("")||'<div class="empty">No team data available.</div>';
  }
  function renderBetting(){
    renderSelectedModelPicks();
    const accuracy=bettingAccuracyBreakdown(state.games);
    $("bettingMetrics").innerHTML=
      metric("Moneyline Accuracy",pct(accuracy.moneyline.accuracy),accuracy.moneyline.total?accuracy.moneyline.correct+" of "+accuracy.moneyline.total+" moneylines":"No scored moneylines")+
      metric("Player Pick Accuracy",pct(accuracy.player.accuracy),accuracy.player.total?accuracy.player.correct+" of "+accuracy.player.total+" player picks":"No scored player picks")+
      metric("Overall Accuracy",pct(accuracy.overall.accuracy),accuracy.overall.total?accuracy.overall.correct+" of "+accuracy.overall.total+" model picks":"No scored model picks");
    const games=state.games.filter(g=>g.bets.length||g.correctBettingResults.length);
    $("bettingTable").innerHTML=games.length?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Matchup</th><th>Betting Selection</th><th>Correct Picks</th><th>Game Line Accuracy</th></tr></thead><tbody>'+games.slice(0,500).map(g=>'<tr><td class="nowrap">'+esc(formatDate(g.date))+'</td><td><span class="team">'+esc(g.away)+'</span> @ <span class="team">'+esc(g.home)+'</span></td><td>'+esc(g.bets.join("; ")||"—")+'</td><td>'+esc(g.correctBettingResults.length?g.correctBets+" / "+g.correctBettingResults.length:"—")+'</td><td>'+pct(g.lineAccuracy)+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty">No historical betting fields are available yet.</div>';
  }
  function renderAll(){state.filtered=[...seasonFilteredGames()];renderOverview();renderToday();renderGames();renderBetting();if(state.isAdmin)renderModel();}
  function switchView(id){if(id==="model"&&!state.isAdmin)id="overview";document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===id));history.replaceState(null,"","#"+id);window.scrollTo({top:0,behavior:"smooth"});}
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
  $("backBtn").addEventListener("click",()=>location.href="../");$("refreshBtn").addEventListener("click",loadData);
  ["gameSearch","teamFilter","dateFrom","dateTo"].forEach(id=>$(id).addEventListener(id==="gameSearch"?"input":"change",applyGameFilters));
  ["overviewSeason","gamesSeason"].forEach(id=>$(id).addEventListener("change",event=>setSelectedSeason(event.target.value)));
  $("overviewMode").addEventListener("change",event=>{if(!state.isAdmin)return;state.overviewMode=event.target.value==="mine"?"mine":"all";renderOverview();});
  $("clearFilters").addEventListener("click",()=>{$("gameSearch").value="";$("teamFilter").value="";$("dateFrom").value="";$("dateTo").value="";applyGameFilters();});
  $("loadMoreGames").addEventListener("click",()=>{state.shown+=100;renderGamesTable();});
  const initial=location.hash.slice(1);if(["overview","today","games","model","betting","roster"].includes(initial))switchView(initial);
  loadSelectedPicks();
  setupRosterSimulation();
  resolveAdminAccess().then(isAdmin=>{state.isAdmin=isAdmin;applyAdminAccess();if(state.games.length)renderAll();}).catch(()=>{state.isAdmin=false;applyAdminAccess();});
  loadData().catch(error=>{console.error(error);setStatus("NHL Analytics could not initialize. "+error.message,"bad");$("refreshBtn").disabled=false;});
})();