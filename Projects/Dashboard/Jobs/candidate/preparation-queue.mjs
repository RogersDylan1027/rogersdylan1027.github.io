import {assignmentForm} from './assignment-form.mjs?v=0.5.0';
/** Reads only the authorized queue. No polling, notification, keys or employer submission. */
export function preparationQueue({client,root,onStarted=async()=>{},canStart=()=>true}){
 let dead=false,busy=false,dirty=false,locked=false,sequence=0,forms=[],edited=new Set();
 const doc=root.ownerDocument,el=(tag,text,parent=root)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
 const call=async(name,args)=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};
 async function refresh(){
  if(dead||busy||dirty)return;const epoch=++sequence;
  try{
   const capabilities=await call('jobs_v050_capabilities');if(!capabilities?.quick_decisions){root.replaceChildren();return;}
   const nova=await call('jobs_v040_is_nova'),requests=await call('jobs_v050_queue');if(dead||epoch!==sequence)return;
   root.replaceChildren();forms=[];edited.clear();locked=false;el('h2',nova?'New preparation requests':'Nova preparation queue');
   el('p',nova?'Dylan approved preparation for these jobs. Check the exact listing is still open, record its actual requirements, then prepare the application fields. Never invent facts or bypass consent.':'Approve or Decline directly in Recommendations. Nova sees approved work when she opens or refreshes Jobs; automatic wake-up is not connected.');
   const reload=el('button','Refresh preparation queue');reload.onclick=()=>void refresh();
   const message=el('p','');message.setAttribute('role','status');
   const queued=requests.filter(q=>q.state==='queued');if(!queued.length)el('p','No pending preparation requests.');
   for(const q of requests){if(!nova&&q.state!=='queued')continue;const card=el('article');card.className='jobs-preparation-card';el('h3',[q.snapshot.company,q.snapshot.position].filter(Boolean).join(' · ')||'Job recommendation',card);el('p','Awaiting Nova’s requirements check',card);
    const a=el('a','Open original listing',card);try{const url=new URL(q.snapshot.source_url);if(url.protocol==='https:'){a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}
    if(!nova)continue;
    const evidence=el('fieldset',undefined,card);el('legend','Verify the real application',evidence);
    function field(label,multi=false){const wrap=el('label',label,evidence),n=el(multi?'textarea':'input',undefined,wrap);n.setAttribute('aria-label',label);return n;}
    const checked=field('Listing checked at (ISO time with timezone)'),excerpt=field('Evidence that this exact listing is open and requirements were checked',true),open=field('I verified this exact listing is open');open.type='checkbox';
    const area=el('section',undefined,card);
    const button=(label,action,parent=area)=>{const b=el('button',label,parent);b.type='button';b.onclick=async()=>{
     if(busy||dead||locked)return;busy=true;const previous=[...root.querySelectorAll('button,input,textarea,select')].map(n=>[n,n.disabled]);for(const [n] of previous)n.disabled=true;
     try{await action();}catch(error){if(dead)return;if(!error.code||error.code==='40001')locked=true;message.textContent='Stopped: '+(error.code==='40001'?'Request changed. Reload the workspace to reconcile.':error.message||'Outcome unavailable. Reload the workspace before another attempt.');}
     finally{busy=false;if(!dead&&!locked){for(const [n,disabled] of previous)if(root.contains(n))n.disabled=disabled;for(const f of forms)f.refreshControls();}}
    };return b;};
    const form=assignmentForm({root:area,jobs:[{id:q.recommendation_id,payload:q.snapshot}],button,onDirty:()=>{edited.add(q.recommendation_id);dirty=true;},onCancel:()=>{edited.delete(q.recommendation_id);dirty=edited.size>0;},isBusy:()=>busy||locked,labels:{heading:'Record application requirements',help:'Use the employer’s actual questions and documents. Leave unsupported answers for Dylan. This creates draft fields only; no approval or submission.',action:'Create application fields'},onAssign:async(_job,requirements)=>{
     if(!canStart()){const error=Error('Save or discard your existing application edits before creating another application.');error.code='VALIDATION';throw error;}
     if(!open.checked||!checked.value.trim()||!excerpt.value.trim()){const error=Error('Check the original listing and complete the evidence fields first.');error.code='VALIDATION';throw error;}
     const id=await call('jobs_v050_start',{p_id:q.recommendation_id,p_expected_version:q.version,p_requirements:requirements,p_evidence:{url:q.snapshot.source_url,availability:'open',checked_at:checked.value,excerpt:excerpt.value,requirements_complete:true}});
     if(dead)return;locked=true;edited.delete(q.recommendation_id);dirty=edited.size>0;await onStarted(id);message.textContent='Application fields created. Use Refresh workspace to open the assigned draft; answer honestly and flag missing facts.';
    }});
    forms.push(form);evidence.addEventListener('input',()=>{edited.add(q.recommendation_id);dirty=true;});
   }
  }catch{if(!dead&&epoch===sequence){root.replaceChildren();el('p','Preparation queue is unavailable. No background work or submission was started.');}}
 }
 return {start:refresh,refresh,isBusy:()=>busy,hasUnsavedEdits:()=>dirty,destroy(){dead=true;sequence++;root.replaceChildren();}};
}
