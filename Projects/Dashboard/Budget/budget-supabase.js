/*
  Budget 0.5.0 · Supabase cross-device sync
  One protected JSON snapshot per authenticated Dashboard user.
*/
(function () {
  "use strict";
  let client=null,user=null,ready=false,saveTimer=null,saving=false,pending=false;
  const TABLE="budget_sync_state_v1";
  const app=()=>window.BudgetApp;
  function status(message,error=false){const el=document.getElementById("syncStatus");if(!el)return;el.textContent=message;el.style.color=error?"var(--red)":""}
  const currentState=()=>app()?.getState?.()||null;
  async function uploadState(state){if(!ready||!client||!user||!state)return false;const {error}=await client.from(TABLE).upsert({user_id:user.id,data:state},{onConflict:"user_id"});if(error)throw error;return true}
  async function getCloudRow(){const {data,error}=await client.from(TABLE).select("data,updated_at").eq("user_id",user.id).maybeSingle();if(error)throw error;return data||null}
  async function saveNow(state){if(!ready)return;if(saving){pending=true;return}saving=true;status("Saving…");try{await uploadState(state||currentState());status("Synced")}catch(error){console.error("Budget sync save failed:",error);status("Local only — sync failed",true)}finally{saving=false;if(pending){pending=false;scheduleSave(currentState())}}}
  function scheduleSave(state){if(!ready)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNow(state||currentState()),450)}
  async function reloadFromCloud(){if(!ready)return false;try{const row=await getCloudRow();if(!row?.data)return false;app()?.replaceState?.(row.data);status("Synced");return true}catch(error){console.error("Budget cloud reload failed:",error);status("Local only — sync failed",true);return false}}
  async function init(detail){if(ready)return;client=detail?.client||window.DashboardAuth?.client||null;user=detail?.user||window.DashboardAuth?.user||null;if(!client||!user){status("Waiting for login…");return}status("Connecting…");try{const row=await getCloudRow();ready=true;if(row?.data){app()?.replaceState?.(row.data);status("Synced")}else{const local=currentState();if(local){await uploadState(local);status("Uploaded local Budget")}else status("Synced")}}catch(error){console.error("Budget Supabase initialization failed:",error);ready=false;status("Local only — Supabase not ready",true)}}
  window.BudgetCloud={scheduleSave,saveNow,reloadFromCloud,get userId(){return user?.id||null}};
  window.addEventListener("dashboard-auth-ready",event=>init(event.detail),{once:true});
  setTimeout(()=>{if(!ready&&window.DashboardAuth?.client&&window.DashboardAuth?.user)init({client:window.DashboardAuth.client,user:window.DashboardAuth.user})},0);
})();
