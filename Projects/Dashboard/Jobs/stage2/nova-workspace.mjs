import {accountSetup,accountRequest} from '../candidate/account-setup.mjs?v=0.6.2';
import {formVerification} from '../candidate/form-verification.mjs?v=0.6.2';
import {jobLabel} from '../candidate/job-label.mjs?v=0.6.2';
import {assignmentForm} from '../candidate/assignment-form.mjs?v=0.6.2';
import {novaApplications} from '../stage1/nova-applications.mjs';
import {createMockIntent,claimMockIntent} from '../stage4/mock-preflight.mjs';
export function workspace({client,root,confirm=()=>false,mode='mock'}){
 if(!['mock','authenticated'].includes(mode))throw new Error('Unknown workspace mode');
 const mock=mode==='mock';root.classList.add('jobs-application-workspace');
 const doc=root.ownerDocument,api=novaApplications(client);let dirty=false,busy=false,dead=false,current=null,intent=null,refreshSequence=0,needsReload=false,assignmentDirty=false,showPast=false,linkedJobIds=[],assignmentView=null,accountView=null;
 const el=(tag,text,parent=root)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
 const input=(label,value,parent,multiline=false)=>{const l=el('label',label,parent),n=el(multiline?'textarea':'input',undefined,l);n.value=value??'';if(multiline)n.rows=5;return n;};
 const status=()=>root.querySelector('[role=status]');
 const message=text=>{if(!dead&&status())status().textContent=text;};
 const call=async request=>{const {data,error}=await request;if(error)throw error;return data;};
 function button(label,fn,parent=root){const b=el('button',label,parent);b.type='button';b.addEventListener('click',async()=>{if(busy||dead)return;busy=true;const controls=[...root.querySelectorAll('input,textarea,select,button')].map(n=>[n,n.disabled]);for(const [n] of controls)n.disabled=true;try{await fn();}catch(e){message((e.code==='40001'?'Version conflict. Your unsaved work is preserved. ': 'Action stopped. ')+e.message);}finally{for(const [n,disabled] of controls)if(root.contains(n))n.disabled=needsReload?true:disabled;busy=false;assignmentView?.refreshControls?.();}});return b;}
 async function assignApplication(job,requirements){
  if(dirty||accountView?.hasUnsavedEdits())throw Error('Save or cancel pending application/account edits before starting another assignment.');
  if(!confirm(`Assign ${jobLabel(job.payload)} to Nova for preparation? This does not approve or submit an application.`))return;
  let result;
  try{result=await api.assign(job.id,job.version,requirements);}catch(error){
   if(!error.code){needsReload=true;for(const n of root.querySelectorAll('button,input,textarea,select'))n.disabled=true;button('Reload to check assignment',()=>refresh(true));throw Error('Assignment outcome unavailable. Reload to check applications before trying again.');}
   throw error;
  }
  current=result;assignmentDirty=false;needsReload=true;for(const n of root.querySelectorAll('button,input,textarea,select'))n.disabled=true;
  try{await refresh(true);}catch(error){button('Reload after completed assignment',()=>refresh(true));throw error;}
 }
 async function refresh(force=false){
  if(dead)return;if((dirty||assignmentDirty||accountView?.hasUnsavedEdits())&&!force&&!confirm('Discard unsaved changes and reload?'))return;
  const sequence=++refreshSequence;
  // Read everything before replacing the view, preserving buffers on network failure.
  const admin=await call(client.rpc('jobs_v040_is_admin')),nova=await call(client.rpc('jobs_v040_is_nova'));
  let apps=[],jobs=[],events=[],attempts=[],shown=[],verification={scope:'admin_defined',form_verified:true,documents_verified:true};
  if(admin||nova){apps=await api.assigned();if(admin)jobs=await call(client.from('dashboard_job_records').select('*'));
   linkedJobIds=apps.map(a=>a.job_id);shown=mock||showPast?apps:apps.filter(a=>!a.revoked);
   const selected=shown.find(a=>a.id===current)||shown[0];
   if(selected){current=selected.id;events=await call(client.from('jobs_v040_events').select('*').eq('application_id',current).order('happened_at'));attempts=await call(client.from('jobs_v040_attempts').select('*').eq('application_id',current).order('created_at'));if(!mock&&selected.job_id.startsWith('nova050_')){try{verification=await call(client.rpc('jobs_v051_verification',{p_id:current}));if(!verification||typeof verification.form_verified!=='boolean'||typeof verification.documents_verified!=='boolean')throw Error('Missing verification');if(verification.inspection_protocol!==2)verification={...verification,form_verified:false,inspection_scope:'unverified',unavailable:true};}catch{verification={scope:'nova_discovered',form_verified:false,documents_verified:false,unavailable:true};}}}}
  if(dead||sequence!==refreshSequence)return;root.replaceChildren();assignmentView=null;accountView=null;dirty=false;assignmentDirty=false;needsReload=false;intent=null;
  const toolbar=el('header');toolbar.className='jobs-app-toolbar';el('h2',mock?'Nova-Assisted Applications · Jobs 0.6.2 preview':'Applications',toolbar);button(mock?'Reload':'Refresh applications',()=>refresh(),toolbar);
  const safety=el('p',mock?'LOCAL MOCK DATABASE — synthetic identities and records. Real submissions disabled.':'Application review — real submissions disabled.');safety.className='jobs-safety';el('p','',root).setAttribute('role','status');
  if(!admin&&!nova){el('p','Access denied. This account cannot access Nova’s assignments.');return;}
  const roleNote=el('p',admin?(mock?'Synthetic Main Admin review':'Main Admin review'):(mock?'Synthetic Nova assigned applications':'Nova assigned applications'));roleNote.className=admin&&!mock?'jobs-sr-only':'jobs-section-help';
  if(!mock){const tip=el('p',admin?'Review drafts here. Use Recommendations to find your next job, or start an application below.':'Complete only the applications assigned to you. Save your work and flag anything you cannot answer.');tip.className='jobs-section-help';}
  if(admin&&!mock){const historyToggle=input('Show past assignments','',root);historyToggle.type='checkbox';historyToggle.checked=showPast;historyToggle.addEventListener('change',async()=>{if(busy||dead){historyToggle.checked=showPast;return;}if((dirty||assignmentDirty||accountView?.hasUnsavedEdits())&&!confirm('Discard unsaved changes?')){historyToggle.checked=showPast;return;}showPast=historyToggle.checked;try{await refresh(true);}catch(e){message(e.message);}});}
  if(nova){const discovery=el('section');el('h3','Recommend a job',discovery);const url=input('Public listing URL','',discovery);button('Recommend listing',async()=>{const id=await api.recommend(url.value);url.value='';message('Recommendation recorded: '+id+'. Assignment still requires Main Admin approval.');},discovery);}
  if(admin&&mock){const section=el('section');el('h3','Approve an assignment',section);const eligible=jobs.filter(j=>['accepted','answers_review','ready_to_apply'].includes(j.payload.status)&&!apps.some(a=>a.job_id===j.id&&!a.revoked));
   const select=el('select',undefined,section);for(const j of eligible){const o=el('option',j.id+' · '+j.payload.company,select);o.value=j.id;}
   el('p','Define the application requirements before assignment. These become immutable. Assignment approval does not approve submission.',section);
   const questionSpec=input('Questions: ID | question | required or optional','experience | Describe relevant experience using owner-provided facts. | required',section,true);
   const documentSpec=input('Documents: filename | required or optional','cv.txt | required',section,true);
   const coverRequired=input('Require cover letter','',section);coverRequired.type='checkbox';coverRequired.checked=true;
   const rows=(text,count)=>text.split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{const parts=line.split('|').map(s=>s.trim());if(parts.length!==count||parts.some(s=>!s)||!['required','optional'].includes(parts.at(-1)))throw new Error('Each requirement needs all fields and required or optional');return parts;});
   button('Approve assignment to Nova',async()=>{const job=eligible.find(j=>j.id===select.value);if(!job)throw new Error('Select an eligible job');if(!confirm(mock?'Approve this synthetic job and assign its immutable requirements to Nova?':'Approve this job and assign its immutable requirements to Nova?'))return;
    const requirements={questions:rows(questionSpec.value,3).map(([id,text,required])=>({id,text,required:required==='required'})),documents:rows(documentSpec.value,2).map(([name,required])=>({name,required:required==='required'})),cover_letter_required:coverRequired.checked};
    current=await api.assign(job.id,job.version,requirements);await refresh(true);},section);
  }
  if(admin&&!mock){const section=el('section');assignmentView=assignmentForm({root:section,jobs:jobs.filter(j=>['accepted','answers_review','ready_to_apply'].includes(j.payload.status)&&!apps.some(a=>a.job_id===j.id&&!a.revoked)),button,onDirty:()=>{assignmentDirty=true;},onCancel:()=>{assignmentDirty=false;message('Assignment setup cleared. No assignment was created.');},isBusy:()=>busy||needsReload,onAssign:assignApplication});}
  if(admin&&!mock){const requests=shown.filter(a=>!a.revoked&&accountRequest(a.draft?.open_questions));if(requests.length){const notices=el('section');notices.className='jobs-next-step';el('h3','Account setup needs your attention',notices);for(const item of requests)button(jobLabel(item.job_snapshot)+' · Open account setup',async()=>{if(dirty||assignmentDirty||accountView?.hasUnsavedEdits())throw Error('Save or discard edits first.');current=item.id;await refresh(true);root.querySelector('.jobs-account-setup')?.scrollIntoView?.({block:'start'});},notices);}}
  if(!shown.length){const empty=el('section');empty.className='jobs-empty';el('h3',admin?'No active applications':'No assigned applications.',empty);el('p',admin?'Start with Recommendations, or assign a saved job when you are ready. Past assignments and their history are kept under Show past assignments.':'An application will appear here after Main Admin assigns it to you. Nothing runs automatically.',empty);return;}

  const selectorLabel=el('label','Choose an application'),select=el('select',undefined,selectorLabel);select.setAttribute('aria-label','Choose an application');for(const a of shown){const o=el('option',mock?a.job_id+' · '+a.state:`${jobLabel(a.job_snapshot)} — ${a.job_id.startsWith('nova050_')?(a.id===current?(!verification.form_verified?'Actual form unverified':!verification.documents_verified?'Document review required':stateLabel(a.state)):'Open to check verification'):stateLabel(a.state)}`,select);o.value=a.id;}select.value=current;
  select.addEventListener('change',async()=>{if(busy||dead){select.value=current;return;}const previous=current;if((dirty||assignmentDirty||accountView?.hasUnsavedEdits())&&!confirm('Discard unsaved changes?')){select.value=previous;return;}current=select.value;try{await refresh(true);}catch(e){current=previous;select.value=previous;message(e.message);}});
  const a=shown.find(a=>a.id===current);if(!a)return;
  el('h3',jobLabel(a.job_snapshot));if(!mock)el('p','Application reference: '+a.id);
  if(mock){el('pre',JSON.stringify(a.job_snapshot,null,2));el('p',`State: ${a.state} · Version: ${a.version}`);}else{
   const state=el('p',verification.scope==='nova_discovered'&&!verification.form_verified?'Research or partial inspection · actual application form unverified':stateLabel(a.state));state.className='jobs-state';state.dataset.state=a.state;
   const next=el('section');next.className='jobs-next-step';el('h4','Next step',next);el('p',verification.scope==='nova_discovered'&&!verification.form_verified?'Preserve this research. Inspect and record the actual form before treating these as application questions. Final approval remains blocked.':nextStep(a.state,admin),next);
   const info=el('details');el('summary','Job details · read-only',info);const dl=el('dl',undefined,info);
   for(const [key,label] of [['company','Company'],['position','Role'],['location','Location'],['work_arrangement','Work arrangement'],['description','Description']])if(a.job_snapshot[key]){el('dt',label,dl);el('dd',String(a.job_snapshot[key]),dl);}
   try{const url=new URL(a.job_snapshot.source_url);if(url.protocol==='https:'){const link=el('a','Open original listing',info);link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';}}catch{}
   const checklist=el('section');checklist.className='jobs-readiness';el('h4','Before approval',checklist);const ul=el('ul',undefined,checklist);
   for(const item of readiness(a,verification))el('li',(item.done?'Complete: ':'Needs attention: ')+item.label,ul);
  }

  if(a.correction_note)el('p','Corrections requested: '+a.correction_note);
  if(a.approved_hash)el('p',mock?'Approved hash: '+a.approved_hash+' · Expires: '+a.approval_expires_at:'Approved for this saved revision until '+readableTime(a.approval_expires_at)+'. Editing clears approval.');
  const form=el('section');const answerFields=[],documentFields=[],optionalControls=[];const draft=a.draft||{};
  for(const q of a.requirements.questions){const old=draft.answers?.[q.id]||{},box=el('fieldset',undefined,form);el('legend',q.text+(q.required?' (required)':''),box);
   const choice=q.required?null:input('Answer optional question','',box);if(choice){choice.type='checkbox';choice.setAttribute('role','switch');choice.checked=Object.hasOwn(draft.answers??{},q.id);}
   const text=input('Answer',old.text,box,true),source=input('Source of facts',old.source,box),flag=input('Needs Dylan input','',box);flag.type='checkbox';flag.checked=old.needs_dylan_input??q.required;
   if(choice){const summary=el('p','',box);const update=()=>{choice.setAttribute('aria-checked',String(choice.checked));summary.textContent=choice.checked?'Answer required before approval':'Skipped — no answer required';for(const n of [text,source,flag])n.disabled=!choice.checked||a.revoked||['mock_pending','mock_verified','blocked'].includes(a.state);};choice.addEventListener('input',()=>{if(!choice.checked&&(text.value.trim()||source.value.trim()||flag.checked)&&!confirm('Explicitly skip this optional question? Its answer and input marker will be omitted when you save.'))choice.checked=true;update();});optionalControls.push(update);}
   answerFields.push({id:q.id,required:q.required,choice,text,source,flag});}
  for(const d of a.requirements.documents){const box=el('fieldset',undefined,form);el('legend',d.name+(d.required?' (required)':''),box);const old=draft.documents?.[d.name]||{};documentFields.push({name:d.name,required:d.required,content:input(mock?'Exact mock document text':'Document text',old.content,box,true),source:input('Source',old.source,box)});}
  const cover=input('Cover letter',draft.cover_letter,form,true),questions=input('Outstanding questions (one per line)',(draft.open_questions||[]).join('\n'),form,true);
  const consent=input('Consent requires review','',form);consent.type='checkbox';consent.checked=!!draft.requires_consent;
  const attestation=input('Attestation requires review','',form);attestation.type='checkbox';attestation.checked=!!draft.requires_attestation;
  const locked=a.revoked||['mock_pending','mock_verified','blocked'].includes(a.state);
  const approveControls=[];form.addEventListener('input',()=>{dirty=true;for(const b of approveControls)b.disabled=true;message(mock?'Unsaved changes. Save before approval or a mock attempt.':'Unsaved changes. Save this draft before approval.');});
  for(const n of form.querySelectorAll('input,textarea'))n.disabled=locked;for(const update of optionalControls)update();
  const mutate=async fn=>{if(assignmentDirty)throw Error('Finish or discard the new assignment setup before changing another application.');await fn();if(dead)return;dirty=false;needsReload=true;/* Lock stale controls if the subsequent refresh fails. */for(const b of root.querySelectorAll('button'))b.disabled=true;try{await refresh(true);}catch(e){button('Reload after completed action',()=>refresh(true));throw e;}};
  if(!mock){const accounts=el('section');accountView=accountSetup({root:accounts,application:a,admin,button,onQuestions:async open_questions=>{if(dirty||assignmentDirty)throw Error('Save or discard edits before changing account setup.');await mutate(()=>api.save(a.id,a.version,{...structuredClone(a.draft),open_questions}));message('Account-access update saved.');}});}
  const save=button('Save draft',()=>{if(accountView?.hasUnsavedEdits())throw Error('Confirm or cancel the pending account update before saving the draft.');return mutate(()=>api.save(a.id,a.version,{answers:Object.fromEntries(answerFields.filter(f=>f.required||f.choice.checked).map(f=>[f.id,{text:f.text.value,source:f.source.value,needs_dylan_input:f.flag.checked}])),documents:Object.fromEntries(documentFields.filter(f=>f.required||f.content.value.trim()||f.source.value.trim()).map(f=>[f.name,{content:f.content.value,source:f.source.value}])),cover_letter:cover.value,open_questions:questions.value.split('\n').map(s=>s.trim()).filter(Boolean),requires_consent:consent.checked,requires_attestation:attestation.checked}));},form);save.disabled=locked;
  if(admin){const note=input('Correction request','',root);button('Request corrections',()=>{if(dirty)throw new Error('Save or discard edits first');return mutate(()=>api.requestCorrections(a.id,a.version,note.value));});
   const approve=button('Approve final application',async()=>{if(dirty||accountView?.hasUnsavedEdits())throw new Error('Save or cancel pending edits first');if(!confirm(mock?'Approve this exact saved application version for a mock attempt, expiring in 15 minutes?':'Approve this exact saved application version for 15 minutes? Real submissions remain disabled.'))return;await mutate(()=>api.approveFinal(a.id,a.version));});approve.disabled=a.state!=='review'||!verification.form_verified||!verification.documents_verified;approveControls.push(approve);
   button('Revoke assignment',async()=>{if(confirm('Revoke Nova access to this assignment?'))await mutate(()=>api.revoke(a.id,a.version));});
  }
  if(nova&&mock){el('h3','Synthetic mock observation');el('p','These inputs simulate a mock form; they are not an employer-site inspection.');const observedCover=input('Observed mock cover letter',draft.cover_letter,root,true);const blockers=input('Unexpected questions, consent or attestations (one per line)','',root,true);const observedConsent=input('Mock form requests consent','',root);observedConsent.type='checkbox';observedConsent.checked=false;const observedAttestation=input('Mock form requests attestation','',root);observedAttestation.type='checkbox';observedAttestation.checked=false;
   const begin=button('Begin mock attempt',async()=>{if(dirty)throw new Error('Save edits first');const candidate=createMockIntent(a,{job:structuredClone(a.job_snapshot),requirements:structuredClone(a.requirements),draft:{...structuredClone(draft),cover_letter:observedCover.value},unexpected_questions:blockers.value.split('\n').map(s=>s.trim()).filter(Boolean),requires_consent:observedConsent.checked,requires_attestation:observedAttestation.checked},{idempotencyKey:intent?.idempotency_key??globalThis.crypto.randomUUID()});if(intent&&JSON.stringify(intent.blockers)!==JSON.stringify(candidate.blockers))throw new Error('Mock observation changed. Reload to review before reusing an attempt.');intent??=candidate;
    const decision=await claimMockIntent(client,intent);await refresh(true);message(decision.dispatch_authorized?'Mock attempt authorized. Record mock evidence below.':'Replay or blocker: no new dispatch authorized.');});begin.disabled=a.state!=='approved';approveControls.push(begin);
   for(const attempt of attempts.filter(x=>x.result==='pending')){const receipt=input('Mock receipt ID','',root),reason=input('Failure or uncertain-outcome reason','',root);
    for(const result of ['verified','failed','unknown'])button('Record mock '+result,()=>mutate(()=>api.mockFinish(attempt.id,result,result==='verified'?{provider:'mock',content_hash:attempt.content_hash,receipt_id:receipt.value}:{reason:reason.value})));}
  }
  if(!mock&&verification.scope==='nova_discovered'&&!a.revoked&&!['mock_pending','mock_verified','blocked'].includes(a.state)){
   const observation=el('section');observation.className='jobs-form-verification';
   formVerification({root:observation,application:a,button,isBusy:()=>busy||needsReload,onDirty:()=>{assignmentDirty=true;},onCancel:()=>{assignmentDirty=false;},onRecord:async(requirements,evidence)=>{
    if(dirty)throw Error('Save or discard the current draft edits before recording form requirements.');
    try{await call(client.rpc('jobs_v062_record_inspection',{p_id:a.id,p_expected_version:a.version,p_requirements:requirements,p_evidence:evidence}));}
    catch(error){if(!error.code){needsReload=true;button('Reload to reconcile form verification',()=>refresh(true));}throw error;}
    assignmentDirty=false;needsReload=true;await refresh(true);
   }});
   if(admin){const section=el('section');el('h4','Review actual document contents',section);el('p','The document editor stores text only; it does not upload a resume file. A facts summary is not a complete resume. Review the full intended document text and source before confirming; do not mark summaries as complete.',section);
    const names=Object.keys(a.draft?.documents||{}),checks=names.map(name=>{const check=input('I reviewed the full '+name+' contents, not a summary','',section);check.type='checkbox';check.checked=false;return {name,check};});
    const reviewed=button('Confirm full document contents',async()=>{if(dirty||assignmentDirty)throw Error('Save or discard edits and requirement setup first.');if(!checks.length||checks.some(x=>!x.check.checked))throw Error('Explicitly review each supplied document; a summary is insufficient.');await mutate(()=>call(client.rpc('jobs_v051_review_documents',{p_id:a.id,p_expected_version:a.version,p_confirmed_names:checks.map(x=>x.name)})));},section);reviewed.disabled=!verification.form_verified||!checks.length;
   }
  }
  if(!mock&&verification.scope==='nova_discovered'){
   const inspections=events.filter(e=>e.action==='form_inspection_recorded');
   if(verification.unavailable)el('p','Updated inspection service unavailable. Form verification fails closed; do not use the older recording flow.');
   for(const event of inspections){const pane=el('details');el('summary',(event.detail.inspection_scope==='partial'?'Partial form observations':'Complete inspection record')+' · revision '+event.application_version,pane);el('p',event.detail.evidence?.excerpt||event.detail.reason||'',pane);if(event.detail.evidence?.unknown_sections)el('p','Still unknown: '+event.detail.evidence.unknown_sections,pane);for(const q of event.detail.observed_requirements?.questions||[])el('p',q.text+(q.required?' (required)':' (optional)'),pane);for(const d of event.detail.observed_requirements?.documents||[])el('p','Document: '+d.name,pane);}
   if(admin&&!a.revoked&&!['mock_pending','mock_verified','blocked'].includes(a.state)){const pane=el('section');el('h4','Correct an earlier incomplete form inspection',pane);el('p','Retain the active fields, all answers and earlier research; mark coverage partial, clear approval and record your reason in history.',pane);const reason=input('Why is the earlier inspection partial?','',pane),check=input('I confirm the current form coverage is incomplete','',pane);check.type='checkbox';const action=button('Mark current form coverage partial',async()=>{if(dirty||assignmentDirty||accountView?.hasUnsavedEdits())throw Error('Save or cancel pending edits first.');if(!check.checked||reason.value.trim().length<10)throw Error('Confirm incomplete coverage and provide a reason.');await mutate(()=>call(client.rpc('jobs_v062_reclassify_partial',{p_id:a.id,p_expected_version:a.version,p_note:reason.value.trim()})));});action.disabled=verification.unavailable;}
  }
  const archived=events.filter(e=>['actual_form_requirements_recorded','form_inspection_recorded'].includes(e.action)&&e.detail?.previous_draft);
  if(!mock&&archived.length){const backup=el('details');el('summary','Preserved earlier research drafts',backup);for(const e of archived){el('h4','Before requirements revision '+e.application_version,backup);const old=e.detail.previous_draft;for(const [key,value] of Object.entries(old.answers||{})){el('h5',key,backup);el('p',value.text||'',backup);el('p','Source: '+(value.source||'not supplied'),backup);}for(const [name,value] of Object.entries(old.documents||{})){el('h5',name,backup);el('pre',value.content||'',backup);}if(old.cover_letter)el('p',old.cover_letter,backup);}}
  const history=mock?root:el('details');if(!mock)el('summary','Activity history',history);else el('h3','Activity history');
  for(const e of events)el('p',mock?`${e.happened_at} · ${e.action} · version ${e.application_version}`:`${readableTime(e.happened_at)} · ${eventLabel(e.action)} · revision ${e.application_version}`,history);
  if(!events.length)el('p','No activity recorded yet.',history);
  if(mock||attempts.length){el('h3',mock?'Mock attempts':'Test history');for(const attempt of attempts)el('p',`${attempt.id} · ${attempt.result}`);}

 }
 return {start:()=>refresh(true),refresh,hasUnsavedEdits:()=>dirty||assignmentDirty||Boolean(accountView?.hasUnsavedEdits()),getLinkedJobIds:()=>[...linkedJobIds],isBusy:()=>busy,destroy(){dead=true;refreshSequence++;root.replaceChildren();}};
}

const stateLabel=value=>({assigned:'Assigned to Nova',drafting:'Draft in progress',review:'Ready for your review',corrections:'Corrections requested',approved:'Final review approved',revoked:'Assignment revoked',mock_pending:'Test in progress',mock_verified:'Test complete',mock_failed:'Test failed',blocked:'Needs investigation'}[value]||value);
const nextStep=(state,admin)=>state==='revoked'?'This assignment is closed. Its details and activity are retained for reference.':state==='review'?(admin?'Check the answers and documents, then approve or request corrections. Approval does not submit an application.':'Your draft is ready for Main Admin to review.'):state==='approved'?'This saved revision is approved. Edits clear approval. Real submissions remain disabled.':state==='corrections'?'Read the correction request, revise the draft and save it for another review.':'Complete the required answers and documents. Leave any unknown facts flagged for Dylan’s input.';
const readableTime=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});};
const eventLabel=value=>({job_approved_and_assigned:'Assigned to Nova',draft_saved_approval_invalidated:'Draft saved; any previous approval cleared',approve_final:'Final application review approved',request_corrections:'Corrections requested',revoke:'Assignment revoked'}[value]||String(value).replaceAll('_',' '));
function readiness(a,verification={scope:'admin_defined',form_verified:true,documents_verified:true}){const d=a.draft||{},text=v=>typeof v==='string'&&!!v.trim();return [
 ...(verification.scope==='nova_discovered'?[{label:'Complete application-form inspection verified — all steps, questions and documents',done:verification.form_verified}]:[]),
 {label:verification.scope==='nova_discovered'&&!verification.form_verified?'Preliminary answer text and sources (not verified form answers)':'Required answers, sources and input review',done:a.requirements.questions.every(q=>{const x=d.answers?.[q.id];return !q.required&&!x||text(x?.text)&&text(x?.source)&&x?.needs_dylan_input===false;})},
 {label:verification.scope==='nova_discovered'?'Full document contents reviewed by Main Admin (not a summary)':'Required documents and sources',done:verification.documents_verified&&a.requirements.documents.every(x=>{const v=d.documents?.[x.name];return !x.required&&!v||text(v?.content)&&text(v?.source);})},
 {label:!verification.form_verified?'Cover letter requirement unknown until actual form verification':a.requirements.cover_letter_required?'Required cover letter':'Cover letter not required by recorded requirements',done:verification.form_verified&&(!a.requirements.cover_letter_required||text(d.cover_letter))},
 {label:!verification.form_verified?'Actual form questions, consent and attestations still unknown':'Outstanding questions, consent and attestations reviewed',done:verification.form_verified&&!(d.open_questions||[]).length&&!d.requires_consent&&!d.requires_attestation}
 ];}
