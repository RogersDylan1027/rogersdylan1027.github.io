/* Jobs v0.6.1: same-origin entry. Supabase approval, project access and RLS stay authoritative. */
(() => {
  'use strict';
  // Source-only rollout switch. Do not enable without reviewed deployment/access authorization.
  const ENABLE_V040_AUTHENTICATED_CANDIDATE=true;
  const config=window.DashboardConfig;
  const status=document.getElementById('jobs-status');
  const openButton=document.getElementById('jobs-open');
  const signIn=document.getElementById('jobs-sign-in');
  let client,cleanupRecommendations,checking=false,generation=0,activeRole=null,candidateController=null;
  function clearWorkspace(){
    candidateController?.destroy();candidateController=null;document.getElementById('jobs-v040-candidate')?.remove();
    window.DashboardSupabaseJobs?.close(true);document.querySelector('.panel')?.classList.remove('jobs-connected');
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
      if(ENABLE_V040_AUTHENTICATED_CANDIDATE&&(access?.main_admin===true||userData.user.id==='06ecc8e7-0efd-4daf-bc49-3cabdda0132b')){
        if(attempt!==generation)return;
        if(preserve&&candidateController){if(!await candidateController.revalidate())status.textContent='Application access could not be verified. Reload after access is approved.';return;}
        clearWorkspace();
        const {authenticatedWorkspace}=await import('./candidate/authenticated-workspace.mjs?v=0.6.1');
        if(attempt!==generation)return;
        const root=document.createElement('section');root.id='jobs-v040-candidate';document.querySelector('main').append(root);
        const controller=authenticatedWorkspace({enabled:true,enableRemovalReview:true,client,config,root,confirm:message=>window.confirm(message),openLegacy:options=>window.DashboardSupabaseJobs.open(client,options),openRecommendations:options=>window.DashboardJobRecommendations.open(client,'main_admin',undefined,options),hasLegacyEdits:()=>window.DashboardSupabaseJobs?.hasUnsavedEdits()??false,isLegacyBusy:()=>window.DashboardSupabaseJobs?.isBusy()??false,closeLegacy:()=>window.DashboardSupabaseJobs?.close(true)});
        candidateController=controller;const opened=await controller.start();
        if(attempt!==generation){controller.destroy();return;}
        document.querySelector('.panel')?.classList.toggle('jobs-connected',opened);openButton.textContent='Refresh workspace';
        status.textContent=opened?'Connected · Nothing is submitted automatically.':'Application access could not be verified. Reload after access is approved.';
        return;
      }
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
      openButton.onclick=async()=>{if(candidateController){if(candidateController.isBusy())return;if(candidateController.hasUnsavedEdits()&&!window.confirm('Discard unsaved Jobs edits and refresh?'))return;await candidateController.revalidate({refresh:true});}else await openWorkspace();};
      await openWorkspace();
    }catch(error){status.textContent=error.message||'Jobs could not start. Reload this page.';}
  })();
})();
