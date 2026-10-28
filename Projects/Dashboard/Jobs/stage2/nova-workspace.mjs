import {novaApplications} from '../stage1/nova-applications.mjs';
import {createMockIntent,claimMockIntent} from '../stage4/mock-preflight.mjs';
export function workspace({client,root,confirm=()=>false,mode='mock'}){
 if(!['mock','authenticated'].includes(mode))throw new Error('Unknown workspace mode');
 const mock=mode==='mock';
 const doc=root.ownerDocument,api=novaApplications(client);let dirty=false,busy=false,dead=false,current=null,intent=null,refreshSequence=0,needsReload=false;
 const el=(tag,text,parent=root)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
 const input=(label,value,parent,multiline=false)=>{const l=el('label',label,parent),n=el(multiline?'textarea':'input',undefined,l);n.value=value??'';if(multiline)n.rows=5;return n;};
 const status=()=>root.querySelector('[role=status]');
 const message=text=>{if(!dead&&status())status().textContent=text;};
 const call=async request=>{const {data,error}=await request;if(error)throw error;return data;};
 function button(label,fn,parent=root){const b=el('button',label,parent);b.type='button';b.addEventListener('click',async()=>{if(busy||dead)return;busy=true;const controls=[...root.querySelectorAll('input,textarea,select,button')].map(n=>[n,n.disabled]);for(const [n] of controls)n.disabled=true;try{await fn();}catch(e){message((e.code==='40001'?'Version conflict. Your unsaved work is preserved. ': 'Action stopped. ')+e.message);}finally{for(const [n,disabled] of controls)if(root.contains(n))n.disabled=needsReload?true:disabled;busy=false;}});return b;}
 async function refresh(force=false){
  if(dead)return;if(dirty&&!force&&!confirm('Discard unsaved changes and reload?'))return;
  const sequence=++refreshSequence;
  // Read everything before replacing the view, preserving buffers on network failure.
  const admin=await call(client.rpc('jobs_v040_is_admin')),nova=await call(client.rpc('jobs_v040_is_nova'));
  let apps=[],jobs=[],events=[],attempts=[];
  if(admin||nova){apps=await api.assigned();if(admin)jobs=await call(client.from('dashboard_job_records').select('*'));
   const selected=apps.find(a=>a.id===current)||apps[0];
   if(selected){current=selected.id;events=await call(client.from('jobs_v040_events').select('*').eq('application_id',current).order('happened_at'));attempts=await call(client.from('jobs_v040_attempts').select('*').eq('application_id',current).order('created_at'));}}
  if(dead||sequence!==refreshSequence)return;root.replaceChildren();dirty=false;needsReload=false;intent=null;
  el('h2','Nova-Assisted Applications · Jobs 0.4.0');el('p',mock?'LOCAL MOCK DATABASE — synthetic identities and records. Real submissions disabled.':'Application review — real submissions disabled.');el('p','',root).setAttribute('role','status');
  if(!admin&&!nova){el('p','Access denied. This account cannot access Nova’s assignments.');return;}
  el('p',admin?(mock?'Synthetic Main Admin review':'Main Admin review'):(mock?'Synthetic Nova assigned applications':'Nova assigned applications'));
  button('Reload',()=>refresh());
  if(nova){const discovery=el('section');el('h3','Recommend a job',discovery);const url=input('Public listing URL','',discovery);button('Recommend listing',async()=>{const id=await api.recommend(url.value);url.value='';message('Recommendation recorded: '+id+'. Assignment still requires Main Admin approval.');},discovery);}
  if(admin){const section=el('section');el('h3','Approve an assignment',section);const eligible=jobs.filter(j=>['accepted','answers_review','ready_to_apply'].includes(j.payload.status)&&!apps.some(a=>a.job_id===j.id&&!a.revoked));
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
  if(!apps.length){el('p','No assigned applications.');return;}
  const select=el('select');for(const a of apps){const o=el('option',a.job_id+' · '+a.state,select);o.value=a.id;}select.value=current;
  select.addEventListener('change',async()=>{if(busy||dead){select.value=current;return;}const previous=current;if(dirty&&!confirm('Discard unsaved changes?')){select.value=previous;return;}current=select.value;try{await refresh(true);}catch(e){current=previous;select.value=previous;message(e.message);}});
  const a=apps.find(a=>a.id===current);if(!a)return;
  el('h3',a.job_snapshot.company+' · '+(a.job_snapshot.position||'Application'));
  el('pre',JSON.stringify(a.job_snapshot,null,2));el('p',`State: ${a.state} · Version: ${a.version}`);
  if(a.correction_note)el('p','Corrections requested: '+a.correction_note);
  if(a.approved_hash)el('p','Approved hash: '+a.approved_hash+' · Expires: '+a.approval_expires_at);
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
  const approveControls=[];form.addEventListener('input',()=>{dirty=true;for(const b of approveControls)b.disabled=true;message('Unsaved changes. Save before approval or a mock attempt.');});
  for(const n of form.querySelectorAll('input,textarea'))n.disabled=locked;for(const update of optionalControls)update();
  const mutate=async fn=>{await fn();if(dead)return;dirty=false;needsReload=true;/* Lock stale controls if the subsequent refresh fails. */for(const b of root.querySelectorAll('button'))b.disabled=true;try{await refresh(true);}catch(e){button('Reload after completed action',()=>refresh(true));throw e;}};
  const save=button('Save draft',()=>mutate(()=>api.save(a.id,a.version,{answers:Object.fromEntries(answerFields.filter(f=>f.required||f.choice.checked).map(f=>[f.id,{text:f.text.value,source:f.source.value,needs_dylan_input:f.flag.checked}])),documents:Object.fromEntries(documentFields.filter(f=>f.required||f.content.value.trim()||f.source.value.trim()).map(f=>[f.name,{content:f.content.value,source:f.source.value}])),cover_letter:cover.value,open_questions:questions.value.split('\n').map(s=>s.trim()).filter(Boolean),requires_consent:consent.checked,requires_attestation:attestation.checked})),form);save.disabled=locked;
  if(admin){const note=input('Correction request','',root);button('Request corrections',()=>{if(dirty)throw new Error('Save or discard edits first');return mutate(()=>api.requestCorrections(a.id,a.version,note.value));});
   const approve=button('Approve final application',async()=>{if(dirty)throw new Error('Save edits first');if(!confirm(mock?'Approve this exact saved application version for a mock attempt, expiring in 15 minutes?':'Approve this exact saved application version for 15 minutes? Real submissions remain disabled.'))return;await mutate(()=>api.approveFinal(a.id,a.version));});approve.disabled=a.state!=='review';approveControls.push(approve);
   button('Revoke assignment',async()=>{if(confirm('Revoke Nova access to this assignment?'))await mutate(()=>api.revoke(a.id,a.version));});
  }
  if(nova&&mock){el('h3','Synthetic mock observation');el('p','These inputs simulate a mock form; they are not an employer-site inspection.');const observedCover=input('Observed mock cover letter',draft.cover_letter,root,true);const blockers=input('Unexpected questions, consent or attestations (one per line)','',root,true);const observedConsent=input('Mock form requests consent','',root);observedConsent.type='checkbox';observedConsent.checked=false;const observedAttestation=input('Mock form requests attestation','',root);observedAttestation.type='checkbox';observedAttestation.checked=false;
   const begin=button('Begin mock attempt',async()=>{if(dirty)throw new Error('Save edits first');const candidate=createMockIntent(a,{job:structuredClone(a.job_snapshot),requirements:structuredClone(a.requirements),draft:{...structuredClone(draft),cover_letter:observedCover.value},unexpected_questions:blockers.value.split('\n').map(s=>s.trim()).filter(Boolean),requires_consent:observedConsent.checked,requires_attestation:observedAttestation.checked},{idempotencyKey:intent?.idempotency_key??globalThis.crypto.randomUUID()});if(intent&&JSON.stringify(intent.blockers)!==JSON.stringify(candidate.blockers))throw new Error('Mock observation changed. Reload to review before reusing an attempt.');intent??=candidate;
    const decision=await claimMockIntent(client,intent);await refresh(true);message(decision.dispatch_authorized?'Mock attempt authorized. Record mock evidence below.':'Replay or blocker: no new dispatch authorized.');});begin.disabled=a.state!=='approved';approveControls.push(begin);
   for(const attempt of attempts.filter(x=>x.result==='pending')){const receipt=input('Mock receipt ID','',root),reason=input('Failure or uncertain-outcome reason','',root);
    for(const result of ['verified','failed','unknown'])button('Record mock '+result,()=>mutate(()=>api.mockFinish(attempt.id,result,result==='verified'?{provider:'mock',content_hash:attempt.content_hash,receipt_id:receipt.value}:{reason:reason.value})));}
  }
  el('h3','Activity history');for(const e of events)el('p',`${e.happened_at} · ${e.action} · version ${e.application_version}`);
  el('h3','Mock attempts');for(const attempt of attempts)el('p',`${attempt.id} · ${attempt.result}`);
 }
 return {start:()=>refresh(true),refresh,hasUnsavedEdits:()=>dirty,isBusy:()=>busy,destroy(){dead=true;refreshSequence++;root.replaceChildren();}};
}
