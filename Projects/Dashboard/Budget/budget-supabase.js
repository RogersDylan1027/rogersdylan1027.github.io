/*
  Budget · Supabase Persistence · Version 0.4.0
  Uses the existing My Dashboard authenticated Supabase session.
*/
(function () {
  "use strict";

  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let client=null,user=null,ready=false,saveTimer=null,saving=false,pending=false;
  const api=()=>window.BudgetApp;
  const uuid=()=>crypto.randomUUID();

  function status(message,error=false){api()?.setCloudStatus?.(message,error)}

  function ensureIds(state){
    const idMap=new Map();
    state.budgets=(state.budgets||[]).map(b=>{
      const old=String(b.id||"");
      if(!UUID_RE.test(old)){const fresh=uuid();idMap.set(old,fresh);b.id=fresh}
      b.ownerUserId=b.ownerUserId||user.id;
      b.items=(b.items||[]).map(i=>{if(!UUID_RE.test(String(i.id||"")))i.id=uuid();return i});
      b.purchases=(b.purchases||[]).map(p=>{if(!UUID_RE.test(String(p.id||"")))p.id=uuid();return p});
      return b
    });
    if(idMap.has(String(state.current)))state.current=idMap.get(String(state.current));
    const nextPrefs={};
    Object.entries(state.prefs||{}).forEach(([k,v])=>nextPrefs[idMap.get(String(k))||k]=v);
    state.prefs=nextPrefs;
    return state
  }

  function normalizeState(input){
    const state=structuredClone(input||{});
    state.view||={period:"week",sort:"default"};
    state.prefs||={};
    state.pay||={payType:"hourly",payAmount:17,hoursPerDay:5.5,daysPerWeek:5};
    state.gas||={distance:45,distancePeriod:"week",mpg:15,gasPrice:3.93,tankSize:22.5,oilMiles:6000};
    state.budgets||=[];

    let main=state.budgets.find(b=>b.type==="main"||b.systemKey==="main");
    if(!main){
      main={id:uuid(),systemKey:"main",name:"Main Budget",type:"main",ownerUserId:user.id,members:[{id:user.id,name:"You",role:"owner"}],splitMode:"whole",customSplitCount:2,items:[],purchases:[]};
      state.budgets.unshift(main)
    }
    main.type="main";main.systemKey="main";main.name="Main Budget";main.ownerUserId=user.id;main.items||=[];main.purchases=[];

    let monthly=state.budgets.find(b=>b.type==="monthly"||b.systemKey==="monthly_expenses");
    if(!monthly){
      monthly={id:uuid(),systemKey:"monthly_expenses",name:"Monthly Expenses",type:"monthly",ownerUserId:user.id,members:[{id:user.id,name:"You",role:"owner"}],splitMode:"whole",customSplitCount:2,monthlyLimit:0,closingDay:1,purchases:[],items:[]};
      state.budgets.splice(Math.min(1,state.budgets.length),0,monthly)
    }
    monthly.type="monthly";monthly.systemKey="monthly_expenses";monthly.name="Monthly Expenses";monthly.ownerUserId=user.id;
    monthly.monthlyLimit=Math.max(0,Number(monthly.monthlyLimit)||0);
    monthly.closingDay=Math.max(1,Math.min(31,Number(monthly.closingDay)||1));monthly.purchaseView=monthly.purchaseView==="all"?"all":"current";
    monthly.items=[];monthly.purchases||=[];

    state.budgets.forEach(b=>{
      b.members=(b.members||[]).filter(m=>m?.id==="local-user"||UUID_RE.test(String(m?.id||""))).map(m=>({id:m.id==="local-user"?user.id:m.id,name:m.id==="local-user"?"You":(m.name||"Member"),role:m.role||((m.id==="local-user"||m.id===user.id)?"owner":"member")}));
      if((b.ownerUserId||user.id)===user.id&&!b.members.some(m=>m.id===user.id))b.members.unshift({id:user.id,name:"You",role:"owner"})
    });
    ensureIds(state);
    if(!state.current||!state.budgets.some(b=>b.id===state.current))state.current=main.id;
    return state
  }

  async function fetchCloudState(){
    const [budgets,items,members,prefs,userState,purchases]=await Promise.all([
      client.from("budget_budgets").select("*").order("created_at",{ascending:true}),
      client.from("budget_items").select("*").order("created_at",{ascending:true}),
      client.from("budget_members").select("budget_id,user_id,role"),
      client.from("budget_user_preferences").select("budget_id,include_in_main"),
      client.from("budget_user_state").select("*").maybeSingle(),
      client.from("budget_purchases").select("*").order("purchase_date",{ascending:false})
    ]);
    for(const r of [budgets,items,members,prefs,userState,purchases])if(r.error)throw r.error;

    const rows=(budgets.data||[]).map(row=>({
      id:row.id,systemKey:row.system_key||null,name:row.name,type:row.type,ownerUserId:row.owner_user_id,
      splitMode:row.split_mode,customSplitCount:Number(row.custom_split_count||2),
      monthlyLimit:Number(row.monthly_limit||0),closingDay:Number(row.closing_day||1),purchaseView:row.purchase_view==="all"?"all":"current",
      members:(members.data||[]).filter(m=>m.budget_id===row.id).map(m=>({id:m.user_id,name:m.user_id===user.id?"You":"Member",role:m.role})),
      items:(items.data||[]).filter(i=>i.budget_id===row.id).map(i=>({id:i.id,type:i.type,name:i.name,category:i.category||"Other",amount:Number(i.amount||0),period:i.period,enabled:i.enabled})),
      purchases:(purchases.data||[]).filter(p=>p.budget_id===row.id).map(p=>({id:p.id,date:p.purchase_date,name:p.name,amount:Number(p.amount||0),category:p.category||"Other",notes:p.notes||""}))
    }));

    const prefMap={};(prefs.data||[]).forEach(p=>prefMap[p.budget_id]={include:!!p.include_in_main});
    const us=userState.data||{};
    const main=rows.find(b=>b.type==="main"||b.systemKey==="main");
    return {
      current:rows.some(b=>b.id===us.current_budget_id)?us.current_budget_id:(main?.id||rows[0]?.id||null),
      view:{period:us.view_period||"week",sort:us.sort_mode||"default"},
      prefs:prefMap,pay:us.pay||{},gas:us.gas||{},budgets:rows
    }
  }

  async function syncRows(table,budgetId,localRows,rowMapper){
    const remote=await client.from(table).select("id").eq("budget_id",budgetId);
    if(remote.error)throw remote.error;
    const localIds=new Set(localRows.map(x=>x.id));
    const removed=(remote.data||[]).map(x=>x.id).filter(id=>!localIds.has(id));
    if(removed.length){const r=await client.from(table).delete().in("id",removed);if(r.error)throw r.error}
    if(localRows.length){const r=await client.from(table).upsert(localRows.map(rowMapper),{onConflict:"id"});if(r.error)throw r.error}
  }

  async function syncSnapshot(raw){
    if(!ready||saving)return;
    saving=true;
    try{
      const state=normalizeState(raw);

      const owned=await client.from("budget_budgets").select("id,system_key").eq("owner_user_id",user.id);
      if(owned.error)throw owned.error;
      const localOwned=new Set(state.budgets.filter(b=>b.ownerUserId===user.id).map(b=>b.id));
      const removable=(owned.data||[]).filter(x=>!x.system_key&&!localOwned.has(x.id)).map(x=>x.id);
      if(removable.length){const r=await client.from("budget_budgets").delete().in("id",removable);if(r.error)throw r.error}

      for(const b of state.budgets){
        if((b.ownerUserId||user.id)===user.id){
          const budgetRow={
            id:b.id,owner_user_id:user.id,system_key:b.systemKey||null,name:b.name,type:b.type,
            split_mode:b.splitMode||"whole",custom_split_count:Math.max(1,Number(b.customSplitCount)||2),
            monthly_limit:b.type==="monthly"?Math.max(0,Number(b.monthlyLimit)||0):0,
            closing_day:b.type==="monthly"?Math.max(1,Math.min(31,Number(b.closingDay)||1)):1,
            purchase_view:b.type==="monthly"&&b.purchaseView==="all"?"all":"current"
          };
          const br=await client.from("budget_budgets").upsert(budgetRow,{onConflict:"id"});if(br.error)throw br.error;
        }

        await syncRows("budget_items",b.id,b.type==="monthly"?[]:(b.items||[]),i=>({
          id:i.id,budget_id:b.id,type:i.type,name:i.name,category:i.category||"Other",
          amount:Number(i.amount)||0,period:i.period,enabled:i.enabled!==false,created_by:user.id
        }));

        await syncRows("budget_purchases",b.id,b.type==="monthly"?(b.purchases||[]):[],p=>({
          id:p.id,budget_id:b.id,purchase_date:p.date,name:p.name,amount:Number(p.amount)||0,
          category:p.category||"Other",notes:p.notes||"",created_by:user.id
        }));
      }

      const prefRows=Object.entries(state.prefs||{}).filter(([id])=>state.budgets.some(b=>b.id===id&&b.type!=="monthly")).map(([id,p])=>({user_id:user.id,budget_id:id,include_in_main:!!p.include}));
      const clear=await client.from("budget_user_preferences").delete().eq("user_id",user.id);if(clear.error)throw clear.error;
      if(prefRows.length){const r=await client.from("budget_user_preferences").upsert(prefRows,{onConflict:"user_id,budget_id"});if(r.error)throw r.error}

      const sr=await client.from("budget_user_state").upsert({
        user_id:user.id,current_budget_id:state.current||null,view_period:state.view?.period||"week",sort_mode:state.view?.sort||"default",pay:state.pay||{},gas:state.gas||{}
      },{onConflict:"user_id"});if(sr.error)throw sr.error;

      status("Saved to your Dashboard account")
    }catch(error){
      console.error("Budget Supabase sync:",error);status("Saved locally, but Supabase sync failed",true)
    }finally{
      saving=false;if(pending){pending=false;scheduleSave(api()?.getState?.())}
    }
  }

  function scheduleSave(state){
    if(!ready)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(saving){pending=true;return}syncSnapshot(state||api()?.getState?.())},350)
  }

  async function reload(){
    if(!ready)return false;
    try{const cloud=normalizeState(await fetchCloudState());api()?.replaceState?.(cloud);status("Loaded from your Dashboard account");return true}
    catch(error){console.error("Budget reload:",error);status("Could not reload Budget from Supabase",true);return false}
  }

  async function addMemberByEmail(budgetId){
    const email=prompt("Enter the Dashboard account email to add to this shared budget:");if(!email)return false;
    try{const {data,error}=await client.rpc("budget_add_member_by_email",{requested_budget_id:budgetId,member_email:email.trim()});if(error)throw error;alert(data||"Member added.");return true}
    catch(error){console.error("Add Budget member:",error);alert(error.message||"Could not add that Dashboard account.");return false}
  }

  async function deleteOrLeaveBudget(budget){
    if(["main","monthly"].includes(budget.type)||budget.systemKey)return false;
    try{
      if(budget.ownerUserId===user.id||!budget.ownerUserId){const {error}=await client.from("budget_budgets").delete().eq("id",budget.id);if(error)throw error}
      else{const {error}=await client.rpc("budget_leave_shared_budget",{requested_budget_id:budget.id});if(error)throw error}
      return true
    }catch(error){console.error("Delete/leave Budget:",error);alert(error.message||"Could not update this budget in Supabase.");return false}
  }

  async function init(detail){
    client=detail?.client||window.DashboardAuth?.client;user=detail?.user||window.DashboardAuth?.user;if(!client||!user)return;
    try{
      status("Connecting Budget to your Dashboard account…");
      let cloud=await fetchCloudState();
      if(!cloud.budgets.length){ready=true;const local=normalizeState(api()?.getState?.());await syncSnapshot(local);cloud=await fetchCloudState()}
      else ready=true;
      const normalized=normalizeState(cloud);
      api()?.replaceState?.(normalized);
      await syncSnapshot(normalized);
      status("Saved to your Dashboard account")
    }catch(error){console.error("Budget Supabase initialization:",error);status("Supabase setup is not ready. Budget is using the local cache.",true)}
  }

  window.BudgetCloud={get userId(){return user?.id||null},scheduleSave,reload,addMemberByEmail,deleteOrLeaveBudget};
  window.addEventListener("dashboard-auth-ready",event=>init(event.detail),{once:true});
  if(window.DashboardAuth?.user&&window.DashboardAuth?.client)init({user:window.DashboardAuth.user,client:window.DashboardAuth.client})
})();
