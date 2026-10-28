import {assessAvailability} from './availability.mjs';

/** Inactive review controller. No endpoint/key creation or background execution.
 * The server repeats all actor/version/evidence checks. Only enable after review.
 */
export function removalReview({enabled=false,client,root,now=()=>Date.now(),protectedJobIds=[]}){
 let destroyed=false,generation=0,busy=false,locked=false,subscription=null,identity=null;
 const clear=message=>{root.replaceChildren();const p=root.ownerDocument.createElement('p');p.textContent=message;p.setAttribute('role','status');root.append(p);};
 const call=async(name,args)=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};
 async function authorize(){
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user||await call('jobs_v040_is_admin')!==true)throw Error('Main Admin authorization required');
  if(identity&&identity!==data.user.id)throw Error('Account changed');
  identity=data.user.id;
 }
 async function load(){
  const epoch=++generation;locked=true;clear('Verifying Main Admin access…');
  try{
   await authorize();const {data,error}=await client.from('dashboard_job_records').select('*');if(error)throw error;
   if(destroyed||epoch!==generation)return false;
   locked=false;render(data);return true;
  }catch{if(!destroyed&&epoch===generation)clear('Main Admin access or listing load unavailable. Close and reopen after access is verified.');return false;}
 }
 function render(jobs){
  root.replaceChildren();const doc=root.ownerDocument;
  const el=(tag,text,parent=root)=>{const n=doc.createElement(tag);n.textContent=text;parent.append(n);return n;};
  el('h2','Check a saved listing’s availability');
  el('p','These are saved jobs, not confirmed-closed positions. Appearing here does not mean a job is unavailable. Leave jobs on hold unchanged.');
  el('p','Removal requires Main Admin review of an explicit closure notice, an exact confirmation and a private backup.');
  const select=el('select','');select.setAttribute('aria-label','Listing to review');
  for(const job of jobs){const o=el('option',`${job.payload.company} · ${job.payload.position}`,select);o.value=job.id;}
  const body=el('section',''),status=el('p','');status.setAttribute('role','status');
  const reload=el('button','Reload listings');reload.onclick=()=>{if(!busy&&!destroyed)void load();};
  function show(){
   body.replaceChildren();status.textContent='';const job=jobs.find(j=>j.id===select.value);if(!job){el('p','No listings.',body);return;}
   el('h3',job.payload.company+' · '+job.payload.position,body);
   if(protectedJobIds.includes(job.id)){el('p','This job has an application record. It cannot be removed here, even if the assignment was revoked. Keep it unchanged and request a separate review if needed.',body);return;}
   el('p',`Confirmation ID: ${job.id} · Revision: ${job.version}`,body);
   const url=job.payload.source_url;
   // Invalid/private URLs never become clickable and cannot produce a removal plan.
   let validUrl=false;try{assessAvailability({id:job.id,listing_id:job.id,employer_listing_url:url},null,{now:now()});validUrl=true;}catch{}
   if(validUrl){const a=el('a','Review original employer listing',body);a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
   else el('p','Employer URL needs review; removal unavailable.',body);
   function field(label,tag='input',type='text'){
    const wrap=el('label',label,body),n=doc.createElement(tag);if(tag==='input')n.type=type;n.setAttribute('aria-label',label);wrap.append(n);return n;
   }
   const checkedAt=field('Availability checked at (ISO timestamp with timezone)');
   const excerpt=field('Exact position-specific closure notice','textarea');
   const reviewed=field('I reviewed the original employer or authorized ATS page and matched this exact position','input','checkbox');
   const readable=field('The page loaded successfully without a login, CAPTCHA or error','input','checkbox');
   const noApply=field('This exact listing explicitly says it is closed and no application action is available','input','checkbox');
   const consistent=field('No conflicting open or apply signals were present','input','checkbox');
   const confirmation=field('Type REMOVE CLOSED '+job.id);
   const remove=el('button','Back up and remove this closed listing',body);
   const controls=[select,reload,checkedAt,excerpt,reviewed,readable,noApply,consistent,confirmation,remove];
   function evidence(){return {job_id:job.id,availability:'closed',listing_id:job.id,url,source:'employer_or_authorized_ats',checked_at:checkedAt.value,identity_matched:reviewed.checked,http_status:readable.checked?200:0,access:readable.checked?'readable':'unverified',conflicting_signals:!consistent.checked,apply_available:!noApply.checked,evidence:{kind:'explicit_listing_closed',text:excerpt.value}};}
   function update(){let qualifies=false;try{qualifies=assessAvailability({id:job.id,listing_id:job.id,employer_listing_url:url},evidence(),{now:now()}).remove_candidate;}catch{}
    for(const n of controls)n.disabled=busy||locked;
    reload.disabled=busy;
    remove.disabled=busy||locked||!qualifies||confirmation.value!=='REMOVE CLOSED '+job.id;
   }
   for(const n of controls)n.addEventListener('input',update);
   remove.onclick=async()=>{
    update();if(remove.disabled)return;const epoch=generation,payload=evidence(),text=confirmation.value;
    busy=true;update();status.textContent='Verifying access and saving a private backup before removal…';
    try{
     await authorize();if(destroyed||epoch!==generation)return;
     const backup=await call('jobs_v040_remove_closed_listing',{p_job_id:job.id,p_expected_version:job.version,p_evidence:payload,p_confirmation:text});
     if(destroyed||epoch!==generation)return;
     locked=true;status.textContent='Listing removed; private backup reference: '+backup+'. Reload before another action.';
    }catch(error){if(!destroyed&&epoch===generation){locked=true;status.textContent=error.code==='40001'?'Version changed. Reload and review again; no automatic retry.':'Removal outcome unavailable. Do not retry. Reconcile the listing and backup before another action.';}}
    finally{busy=false;if(!destroyed&&epoch===generation)update();}
   };
   update();
  }
  select.onchange=()=>{if(!busy&&!locked)show();};show();

 }
 return {async start(){
  if(!enabled)return false;
  if(client?.supabaseUrl!=='https://pyefiovoicvhigkjhhts.supabase.co')throw Error('Reviewed Dashboard project client required');
  subscription=client.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event)){generation++;locked=true;clear('Session changed. Close and reopen for verification.');}})?.data?.subscription;
  return load();
 },destroy(){destroyed=true;generation++;locked=true;subscription?.unsubscribe();root.replaceChildren();},isBusy:()=>busy};
}
