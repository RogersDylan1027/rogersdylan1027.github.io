import {jobLabel} from './job-label.mjs?v=0.6.0';
/** Guided requirement entry. Only the caller performs the existing assignment RPC. */
export function assignmentForm({root,jobs,button,onAssign,onDirty=()=>{},onCancel=()=>{},isBusy=()=>false,labels={}}){
 const doc=root.ownerDocument;
 const el=(tag,text,parent=root)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
 const field=(label,parent,multiline=false)=>{const l=el('label',label,parent),n=el(multiline?'textarea':'input',undefined,l);if(multiline)n.rows=3;return n;};
 const details=el('details');details.className='jobs-new-application';el('summary',labels.heading||'Start an application with Nova',details);
 el('p',labels.help||'Choose a saved job, then enter the employer’s actual questions and documents. This assigns preparation only. Nothing is submitted.',details);
 const label=el('label','1. Choose a saved job',details),select=el('select',undefined,label);select.setAttribute('aria-label','Job to assign');
 const placeholder=el('option','Choose a job…',select);placeholder.value='';
 for(const j of jobs){const o=el('option',jobLabel(j.payload),select);o.value=j.id;}
 if(!jobs.length){el('p','No saved jobs are available for a new assignment. Review your recommendations or check existing applications.',details);select.disabled=true;}
 const selection=el('p','No job selected.',details);selection.className='jobs-assignment-selection';
 el('h3','2. Confirm what the employer asks for',details);
 el('p','Add each actual question and document. Leave a section empty only when the employer does not ask for it. There are no practice questions or documents to replace.',details);
 const questions=el('div',undefined,details),documents=el('div',undefined,details);questions.className=documents.className='jobs-requirement-list';
 const qrows=[],drows=[];
 function addQuestion(){
  const box=el('fieldset',undefined,questions),index=qrows.length;el('legend','Application question '+(index+1),box);
  const text=field('Question',box,true);text.placeholder='Copy the employer’s exact question';
  const required=field('Required answer',box);required.type='checkbox';required.checked=true;
  const row={id:'question_'+(index+1),text,required,box,removed:false};qrows.push(row);
  button('Remove question',()=>{row.removed=true;box.remove();onDirty();},box);return row;
 }
 function addDocument(){
  const box=el('fieldset',undefined,documents),index=drows.length;el('legend','Document '+(index+1),box);
  const name=field('Document name',box);name.placeholder='For example, Resume or Portfolio';
  const required=field('Required document',box);required.type='checkbox';required.checked=true;
  const row={name,required,box,removed:false};drows.push(row);button('Remove document',()=>{row.removed=true;box.remove();onDirty();},box);return row;
 }
 button('Add a question',()=>{addQuestion();onDirty();},details);button('Add a document',()=>{addDocument();onDirty();},details);
 const cover=field('The employer requires a cover letter',details);cover.type='checkbox';cover.checked=false;
 const reviewed=field('I checked the actual application requirements',details);reviewed.type='checkbox';reviewed.checked=false;
 el('p','Requirements are fixed after assignment. Double-check the selected job before continuing.',details);
 const assign=button(labels.action||'Approve assignment to Nova',async()=>{
  const job=jobs.find(j=>j.id===select.value);if(!job||!reviewed.checked)throw Error('Choose a job and confirm its actual requirements first.');
  const requirements={questions:qrows.filter(r=>!r.removed&&r.text.value.trim()).map(r=>({id:r.id,text:r.text.value.trim(),required:r.required.checked})),documents:drows.filter(r=>!r.removed&&r.name.value.trim()).map(r=>({name:r.name.value.trim(),required:r.required.checked})),cover_letter_required:cover.checked};
  await onAssign(job,requirements);
 },details);
 button('Cancel setup',()=>{questions.replaceChildren();documents.replaceChildren();qrows.length=0;drows.length=0;select.value='';reviewed.checked=false;cover.checked=false;details.open=false;onCancel();update();},details);
 function update(){const j=jobs.find(j=>j.id===select.value);selection.textContent=j?`Selected: ${jobLabel(j.payload)}`:'No job selected.';assign.disabled=isBusy()||!j||!reviewed.checked;}
 details.addEventListener('input',()=>{onDirty();update();});select.addEventListener('change',()=>{reviewed.checked=false;onDirty();update();});update();
 return {destroy:()=>details.remove(),refreshControls:update};
}
