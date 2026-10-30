import {assignmentForm} from './assignment-form.mjs?v=0.6.0';
/** Explicit observation only; never fetches a form, guesses its fields or submits. */
export function formVerification({root,application,button,isBusy,onDirty,onCancel,onRecord}){
 const doc=root.ownerDocument,el=(t,s,p=root)=>{const n=doc.createElement(t);if(s!==undefined)n.textContent=s;p.append(n);return n;};
 el('h4','Verify actual application-form requirements');
 el('p','Use only questions and documents actually seen in the employer application form. Listing qualifications, a job description, search snippets and hidden/login-only fields do not count. Stop if opening the form would require an unauthorized account, consent or submission.');
 const field=(label,multi=false)=>{const l=el('label',label),n=el(multi?'textarea':'input',undefined,l);n.setAttribute('aria-label',label);return n;};
 const url=field('Actual form URL'),time=field('Actual form checked at (ISO time with timezone)'),excerpt=field('Evidence from the actual form (not the listing)',true),inspected=field('I inspected the actual application form, not listing qualifications');inspected.type='checkbox';
 const host=el('section');
 const form=assignmentForm({root:host,jobs:[{id:application.id,payload:application.job_snapshot}],button,isBusy,onDirty,onCancel,labels:{heading:'Record verified form questions and documents',help:'Copy the actual form fields below. The old requirements and draft are preserved in activity history; new fields must be reconciled before approval.',action:'Record actual form requirements'},onAssign:async(_job,requirements)=>{
  if(!inspected.checked||!url.value.trim()||!time.value.trim()||!excerpt.value.trim()){const e=Error('Actual form observation and evidence are required; a job listing does not qualify.');e.code='VALIDATION';throw e;}
  await onRecord(requirements,{source_type:'application_form',form_url:url.value.trim(),checked_at:time.value.trim(),excerpt:excerpt.value.trim(),actual_form_inspected:true,all_questions_and_documents_checked:true});
 }});
 root.addEventListener('input',onDirty);return form;
}
