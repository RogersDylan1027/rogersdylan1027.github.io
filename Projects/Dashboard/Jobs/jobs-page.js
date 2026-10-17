/* Jobs v0.3.1: same-origin entry. Supabase approval, project access and RLS stay authoritative. */
(() => {
  'use strict';
  const config=window.DashboardConfig;
  const status=document.getElementById('jobs-status');
  const openButton=document.getElementById('jobs-open');
  const signIn=document.getElementById('jobs-sign-in');
  let client,cleanupRecommendations,checking=false,generation=0,activeRole=null;
  function clearWorkspace(){
    window.DashboardSupabaseJobs?.close(true);
    cleanupRecommendations?.();cleanupRecommendations=null;
    document.getElementById('jobs-v030-layer')?.remove();
    document.body.style.overflow='';
  }
  function signedOut(){
    generation++;activeRole=null;clearWorkspace();openButton.disabled=true;signIn.hidden=false;
    status.textContent='Sign in with your existing Dashboard account to continue.';
  }
  async function loadLibrary(){
    if(window.supabase?.createClient)return;
    for(const src of [config.supabaseScriptUrl,'https://unpkg.com/@supabase/supabase-js@2.116.0/dist/umd/supabase.js']){
      try{await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.append(script);
      });if(window.supabase?.createClient)return;}catch{}
    }
    throw new Error('The sign-in library could not load. Check your connection and reload.');
  }
  async function openWorkspace(preserve=false){
    if(checking)return;checking=true;const attempt=++generation;openButton.disabled=true;signIn.hidden=true;
    status.textContent='Verifying account and project access…';
    try{
      const {data:userData,error:userError}=await client.auth.getUser();
      if(userError||!userData?.user){signedOut();return;}
      const {data:access,error:accessError}=await client.rpc('dashboard_account_access_state');
      if(accessError)throw accessError;
      if(access?.allowed!==true)throw new Error('Your Dashboard account must be approved before opening Jobs.');
      const {data:projectAllowed,error:projectError}=await client.rpc('can_access_dashboard_project',{requested_project_id:'jobs'});
      if(projectError)throw projectError;
      if(projectAllowed!==true)throw new Error('Your account does not currently have access to the Jobs project.');
      const {data:role,error:roleError}=await client.from('user_roles').select('role').eq('user_id',userData.user.id).single();
      if(roleError)throw roleError;
      if(attempt!==generation)return;
      if(preserve===true && role?.role===activeRole)return;
      clearWorkspace();
      if(role?.role==='main_admin')await window.DashboardSupabaseJobs.open(client);
      else if(['user','admin','ai_helper'].includes(role?.role))cleanupRecommendations=await window.DashboardJobRecommendations.open(client,role.role);
      else throw new Error('Jobs is unavailable for this account role.');
      activeRole=role.role;
      status.textContent='Connected securely to Supabase. Reopen Jobs after closing the workspace.';
    }catch(error){clearWorkspace();status.textContent=error.message||'Jobs could not load. Try again.';}
    finally{checking=false;openButton.disabled=false;}
  }
  (async()=>{
    try{
      if(!config)throw new Error('Dashboard configuration is unavailable. Reload this page.');
      const login=new URL(config.loginUrl,location.origin);login.searchParams.set('returnTo',location.href);signIn.href=login.href;
      await loadLibrary();
      client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      client.auth.onAuthStateChange((event)=>{
        if(event==='SIGNED_OUT'){signedOut();return;}
        if(['TOKEN_REFRESHED','USER_UPDATED'].includes(event))setTimeout(()=>openWorkspace(true),0);
      });
      openButton.onclick=openWorkspace;
      await openWorkspace();
    }catch(error){status.textContent=error.message||'Jobs could not start. Reload this page.';}
  })();
})();
