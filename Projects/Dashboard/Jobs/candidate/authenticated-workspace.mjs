import {workspace} from '../stage2/nova-workspace.mjs';
const project='https://pyefiovoicvhigkjhhts.supabase.co';
const novaId='06ecc8e7-0efd-4daf-bc49-3cabdda0132b';
/** Inactive authenticated UI integration. Reuse Dashboard's normal client, never create keys/users.
 * Feature flags are rollout switches, not permissions; RPC/RLS remain authoritative.
 */
export function authenticatedWorkspace({enabled=false,client,config,root,confirm=()=>false,openLegacy=()=>{},closeLegacy=()=>{}}){
 let generation=0,view=null,subscription=null,destroyed=false,identity=null,active=false,style=null;
 const clear=()=>{view?.destroy();view=null;root.replaceChildren();closeLegacy();active=false;};
 const notice=message=>{const p=root.ownerDocument.createElement('p');p.setAttribute('role','status');p.textContent=message;root.replaceChildren(p);};
 async function allowed(){
  const {data,error}=await client.auth.getUser();if(error||!data?.user)throw new Error('Sign in to Dashboard to continue.');
  const user=data.user;
  const rpc=async(name,args={})=>{const {data,error}=await client.rpc(name,args);if(error)throw new Error('Account verification unavailable. Reload to retry.');return data;};
  const access=await rpc('dashboard_account_access_state');
  if(access?.allowed!==true||await rpc('can_access_dashboard_project',{requested_project_id:'jobs'})!==true)throw new Error('Your account does not have approved Jobs access.');
  const admin=await rpc('jobs_v040_is_admin'),nova=await rpc('jobs_v040_is_nova');
  if(admin!==true&&!(nova===true&&user.id===novaId&&user.email?.toLowerCase()==='nova@ai-helper.dashboard'))throw new Error('This account cannot access Nova applications.');
  return {id:user.id,admin:admin===true};
 }
 async function revalidate({refresh=false}={}){
  if(!enabled||destroyed)return false;const attempt=++generation;
  try{
   const verified=await allowed();if(destroyed||attempt!==generation)return false;
   if(active&&identity?.id===verified.id&&identity.admin===verified.admin&&!refresh)return true;
   clear();identity=verified;
   const body=root.ownerDocument.createElement('section');root.append(body);
   view=workspace({client,root:body,confirm,mode:'authenticated'});await view.start();
   if(destroyed||attempt!==generation)return false;
   if(verified.admin){const legacy=root.ownerDocument.createElement('button');legacy.type='button';legacy.textContent='Existing Jobs workspace';legacy.onclick=async()=>{if(destroyed)return;const epoch=generation,current=await allowed().catch(()=>null);if(destroyed||epoch!==generation)return;if(!current?.admin||current.id!==identity?.id){generation++;clear();notice('Access changed. Reload to verify your account.');return;}try{await openLegacy();if(destroyed||epoch!==generation)closeLegacy();}catch{if(!destroyed&&epoch===generation)notice('Existing Jobs workspace could not load. Reload to retry.');}};root.append(legacy);}
   active=true;return true;
  }catch{
   if(!destroyed&&attempt===generation){clear();identity=null;notice('Jobs application access could not be verified. Sign in or reload after access is approved.');}
   return false;
  }
 }
 function onAuth(event){
  if(destroyed)return;
  if(event==='SIGNED_OUT'){generation++;clear();identity=null;notice('Signed out. Private application content cleared.');return;}
  if(['SIGNED_IN','USER_UPDATED','TOKEN_REFRESHED'].includes(event)){
   if(event!=='TOKEN_REFRESHED'){generation++;clear();identity=null;}
   // Do not await Auth calls inside Supabase's auth callback.
   setTimeout(()=>{if(!destroyed)void revalidate();},0);
  }
 }
 return {
  async start(){
   if(!enabled||destroyed)return false;
   if(config?.supabaseUrl!==project||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.supabasePublishableKey??'')||!client?.auth?.getUser||!client.auth.onAuthStateChange)throw new Error('Verified Dashboard public configuration and authenticated client required');
   if(client.supabaseUrl&&new URL(client.supabaseUrl).origin!==project)throw new Error('Supabase client project mismatch');
   root.classList.add('jobs-v040-authenticated');
   if(!style){style=root.ownerDocument.createElement('link');style.rel='stylesheet';style.href=new URL('./workspace.css',import.meta.url).href;root.ownerDocument.head.append(style);}
   if(!subscription)subscription=client.auth.onAuthStateChange(onAuth)?.data?.subscription;
   return revalidate();
  },
  revalidate,
  isBusy:()=>view?.isBusy()??false,
  hasUnsavedEdits:()=>view?.hasUnsavedEdits()??false,
  destroy(){destroyed=true;generation++;subscription?.unsubscribe();subscription=null;identity=null;clear();style?.remove();style=null;root.classList.remove('jobs-v040-authenticated');}
 };
}
