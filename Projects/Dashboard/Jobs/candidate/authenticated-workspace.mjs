import {preparationQueue} from './preparation-queue.mjs?v=0.5.0';
import {workspace} from '../stage2/nova-workspace.mjs?v=0.5.0';
const project='https://pyefiovoicvhigkjhhts.supabase.co';
const novaId='06ecc8e7-0efd-4daf-bc49-3cabdda0132b';
/** Shared Dashboard session; each mutation still requires server authorization. */
export function authenticatedWorkspace({enabled=false,enableRemovalReview=false,client,config,root,confirm=()=>false,openLegacy=()=>{},closeLegacy=()=>{},openRecommendations=()=>{},hasLegacyEdits=()=>false,isLegacyBusy=()=>false}){
 let generation=0,view=null,subscription=null,destroyed=false,identity=null,active=false,style=null,removal=null,recommendationCleanup=null,prep=null;
 const clear=()=>{prep?.destroy();prep=null;removal?.destroy();removal=null;view?.destroy();view=null;recommendationCleanup?.();recommendationCleanup=null;root.replaceChildren();closeLegacy();active=false;};
 const notice=message=>{const p=root.ownerDocument.createElement('p');p.setAttribute('role','status');p.textContent=message;root.replaceChildren(p);};
 async function allowed(){
  const {data,error}=await client.auth.getUser();if(error||!data?.user)throw Error('Sign in to Dashboard to continue.');
  const user=data.user;
  const rpc=async(name,args={})=>{const {data,error}=await client.rpc(name,args);if(error)throw Error('Account verification unavailable. Reload to retry.');return data;};
  const access=await rpc('dashboard_account_access_state');
  if(access?.allowed!==true||await rpc('can_access_dashboard_project',{requested_project_id:'jobs'})!==true)throw Error('Your account does not have approved Jobs access.');
  const admin=await rpc('jobs_v040_is_admin'),nova=await rpc('jobs_v040_is_nova');
  if(admin!==true&&!(nova===true&&user.id===novaId&&user.email?.toLowerCase()==='nova@ai-helper.dashboard'))throw Error('This account cannot access Nova applications.');
  return {id:user.id,admin:admin===true};
 }
 async function revalidate({refresh=false}={}){
  if(!enabled||destroyed)return false;const attempt=++generation;
  try{
   const verified=await allowed();if(destroyed||attempt!==generation)return false;
   if(active&&identity?.id===verified.id&&identity.admin===verified.admin&&!refresh)return true;
   clear();identity=verified;const doc=root.ownerDocument;
   const top=doc.createElement('div');top.className='jobs-context';top.textContent=verified.admin?'Your workspace · Main Admin':'Your workspace · Nova';root.append(top);
   const nav=doc.createElement('nav');nav.className='jobs-shell-nav';nav.setAttribute('aria-label','Jobs sections');root.append(nav);
   const announce=doc.createElement('p');announce.className='jobs-shell-notice';announce.setAttribute('role','status');root.append(announce);
   const panels={},buttons={},loaded=new Set();let navigating=false;
   const sections=verified.admin?[['applications','Applications'],['recommendations','Recommendations'],['saved','Saved jobs'],...(enableRemovalReview?[['availability','Check listing availability']]:[])]:[['applications','My applications']];
   for(const [key,label] of sections){
    const button=doc.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(key==='applications'));buttons[key]=button;nav.append(button);
    const panel=doc.createElement('section');panel.className='jobs-section';panel.id='jobs-section-'+key;panel.hidden=key!=='applications';panel.setAttribute('aria-label',label);panels[key]=panel;root.append(panel);
    button.onclick=async()=>{
     if(destroyed||navigating||view?.isBusy()||prep?.isBusy()||removal?.isBusy()||isLegacyBusy()||recommendationCleanup?.isBusy?.())return;
     navigating=true;button.disabled=true;const epoch=generation;
     try{
      const current=await allowed();if(destroyed||epoch!==generation)return;
      if(current.id!==identity?.id||current.admin!==identity?.admin){generation++;clear();notice('Access changed. Reload to verify your account.');return;}
      announce.textContent='';
      if(!loaded.has(key)){
       if(key==='saved'){await openLegacy({container:panel});}
       if(key==='recommendations'){const cleanup=await openRecommendations({container:panel});if(destroyed||epoch!==generation){cleanup?.();return;}recommendationCleanup=cleanup;}
       if(key==='availability'){
        const {removalReview}=await import('../stage5/removal-review.mjs?v=0.5.0');if(destroyed||epoch!==generation)return;
        removal=removalReview({enabled:true,client,root:panel,protectedJobIds:view?.getLinkedJobIds?.()||[]});await removal.start();
       }
       loaded.add(key);
      }
      if(destroyed||epoch!==generation){closeLegacy();return;}
      for(const [id,pane] of Object.entries(panels)){pane.hidden=id!==key;buttons[id].setAttribute('aria-pressed',String(id===key));}
     }catch{if(!destroyed&&epoch===generation)announce.textContent='This section could not load. Your current work is still here. Select it again to retry.';}
     finally{navigating=false;if(root.contains(button))button.disabled=false;}
    };
   }
   const prepRoot=doc.createElement('section'),applicationRoot=doc.createElement('section');panels.applications.append(prepRoot,applicationRoot);
   view=workspace({client,root:applicationRoot,confirm,mode:'authenticated'});await view.start();
   prep=preparationQueue({client,root:prepRoot,canStart:()=>!view.hasUnsavedEdits(),onStarted:async()=>{await view.refresh(true);}});await prep.start();loaded.add('applications');
   if(destroyed||attempt!==generation)return false;
   active=true;return true;
  }catch{
   if(!destroyed&&attempt===generation){clear();identity=null;notice('Jobs application access could not be verified. Sign in or reload after access is approved.');}
   return false;
  }
 }
 function onAuth(event,session){
  if(destroyed)return;
  if(event==='SIGNED_OUT'){generation++;clear();identity=null;notice('Signed out. Private application content cleared.');return;}
  if(['SIGNED_IN','USER_UPDATED','TOKEN_REFRESHED'].includes(event)){
   if(event!=='TOKEN_REFRESHED'&&(!session?.user?.id||session.user.id!==identity?.id)){generation++;clear();identity=null;}
   setTimeout(()=>{if(!destroyed)void revalidate();},0);
  }
 }
 return {
  async start(){
   if(!enabled||destroyed)return false;
   if(config?.supabaseUrl!==project||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.supabasePublishableKey??'')||!client?.auth?.getUser||!client.auth.onAuthStateChange)throw Error('Verified Dashboard public configuration and authenticated client required');
   if(client.supabaseUrl&&new URL(client.supabaseUrl).origin!==project)throw Error('Supabase client project mismatch');
   root.classList.add('jobs-v040-authenticated');
   if(!style){style=root.ownerDocument.createElement('link');style.rel='stylesheet';style.href=new URL('./workspace.css?v=0.5.0',import.meta.url).href;root.ownerDocument.head.append(style);}
   if(!subscription)subscription=client.auth.onAuthStateChange(onAuth)?.data?.subscription;
   return revalidate();
  },revalidate,isBusy:()=>Boolean(prep?.isBusy()||view?.isBusy()||removal?.isBusy()||isLegacyBusy()||recommendationCleanup?.isBusy?.()),hasUnsavedEdits:()=>Boolean(prep?.hasUnsavedEdits()||view?.hasUnsavedEdits()||hasLegacyEdits()||recommendationCleanup?.hasUnsavedEdits?.()),
  destroy(){destroyed=true;generation++;subscription?.unsubscribe();subscription=null;identity=null;clear();style?.remove();style=null;root.classList.remove('jobs-v040-authenticated');}
 };
}
