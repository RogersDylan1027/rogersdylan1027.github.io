import {assignmentForm} from './assignment-form.mjs?v=0.6.2';
/** Partial observations never assert complete form coverage. */
export function formVerification({root,application,button,isBusy,onDirty,onCancel,onRecord}){
 const doc=root.ownerDocument,el=(t,s,p=root)=>{const n=doc.createElement(t);if(s!==undefined)n.textContent=s;p.append(n);return n;};
 el('h4','Record application-form inspection');
 el('p','Record only fields actually seen. Partial inspection preserves active requirements and all draft text; it does not verify the complete form. Never advance employer steps that save data, upload files or accept consent without authorization.');
 const field=(label,multi=false)=>{const l=el('label',label),n=el(multi?'textarea':'input',undefined,l);n.setAttribute('aria-label',label);return n;};
 const coverageLabel=el('label','Inspection coverage'),coverage=el('select',undefined,coverageLabel);coverage.setAttribute('aria-label','Inspection coverage');
 for(const [value,label] of [['partial','Partial — later steps or requirements unknown'],['complete','Complete — every application step inspected']]){const o=el('option',label,coverage);o.value=value;}coverage.value='partial';
 const url=field('Actual form URL'),time=field('Actual form checked at (ISO time with timezone)'),excerpt=field('Evidence from the actual form (not the listing)',true),steps=field('Number of steps inspected'),total=field('Total application steps'),unknown=field('Sections or requirements still unknown',true),inspected=field('I inspected the actual application form, not listing qualifications'),complete=field('I inspected every step and checked all questions and documents');inspected.type='checkbox';complete.type='checkbox';
 for(const n of [steps,total]){n.type='number';n.min='1';n.max='50';}
 const help=el('p','Partial inspection: save observed fields separately. Final approval stays blocked.');
 const update=()=>{complete.disabled=coverage.value!=='complete';if(complete.disabled)complete.checked=false;help.textContent=coverage.value==='complete'?'Complete inspection replaces active requirements and clears approval; all previous research is preserved. Unknown later steps cannot qualify.':'Partial inspection: save observed fields separately. Final approval stays blocked.';};coverage.addEventListener('change',()=>{update();onDirty();});update();
 const host=el('section');
 const form=assignmentForm({root:host,jobs:[{id:application.id,payload:application.job_snapshot}],button,isBusy,onDirty,onCancel,labels:{heading:'Observed questions and documents',help:'Enter only observed fields. A partial list is research, not the full set of application requirements.',action:'Record form inspection',reviewed:'I accurately recorded the fields I actually observed',fixedHelp:'Unseen steps remain unknown. Partial observations do not replace current requirements.'},onAssign:async(_job,requirements)=>{
  const count=Number(steps.value),all=Number(total.value),full=coverage.value==='complete';
  if(!inspected.checked||!url.value.trim()||!time.value.trim()||!excerpt.value.trim()||!Number.isInteger(count)||!Number.isInteger(all)||count<1||all<count||all>50||(!full&&!unknown.value.trim())||(full&&(!complete.checked||count!==all||unknown.value.trim()))){const e=Error('State actual inspection coverage. Complete inspection requires every step and explicit confirmation; unknown sections must remain partial.');e.code='VALIDATION';throw e;}
  await onRecord(requirements,{source_type:'application_form',form_url:url.value.trim(),checked_at:time.value.trim(),excerpt:excerpt.value.trim(),actual_form_inspected:true,inspection_scope:full?'complete':'partial',steps_inspected:count,total_steps:all,unknown_sections:unknown.value.trim(),all_steps_reviewed:full&&complete.checked,all_questions_and_documents_checked:full&&complete.checked});
 }});
 root.addEventListener('input',onDirty);return form;
}
