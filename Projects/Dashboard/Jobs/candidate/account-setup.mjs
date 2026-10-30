// Account notices are blocking questions, never credential storage.
const needed='[Employer account setup needed] ';
const waiting='[Employer account awaiting Nova verification] ';
export function accountRequest(questions=[]){
 for(const question of questions){
  if(typeof question!=='string')continue;
  const prefix=question.startsWith(needed)?needed:question.startsWith(waiting)?waiting:null;
  if(prefix)return {question,url:question.slice(prefix.length),waiting:prefix===waiting};
 }
 return null;
}
export function accountUrl(value,listing){
 const url=new URL(value),source=new URL(listing);
 if(url.protocol!=='https:'||url.username||url.password||url.origin!==source.origin||url.search||url.hash)throw Error('Use an HTTPS account page on the original listing website, without query parameters, passwords or tokens.');
 return url.href;
}
export function accountQuestion(url){return needed+url;}
export function accountWaiting(request){return waiting+request.url;}
export function accountSetup({root,application,admin,button,onQuestions}){
 const doc=root.ownerDocument,questions=application.draft?.open_questions||[],request=accountRequest(questions);
 const el=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;root.append(n);return n;};
 root.className='jobs-next-step jobs-account-setup';
 el('h4',request?(request.waiting?'Waiting for Nova to verify account access':'Your action needed · Employer account setup'):'Employer account access');
 el('p','Never enter passwords, verification codes or recovery links in Dashboard fields. Use Muse’s secure card. Account creation and consent remain your decision; nothing starts automatically.');
 const locked=application.revoked||['mock_pending','mock_verified','blocked'].includes(application.state);
 let edited=false,pending=null,urlField=null;
 const review=el('section','');review.hidden=true;review.setAttribute('aria-label','Confirm account-access update');review.setAttribute('role','group');
 const summary=doc.createElement('p');review.append(summary);
 const feedback=el('p','');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const confirmButton=button('Confirm account update',async()=>{
  if(!pending)throw Error('Review an account update first.');
  feedback.textContent='Saving account-access update…';
  try{await onQuestions(pending);edited=false;pending=null;review.hidden=true;feedback.textContent='Account-access update saved.';}
  catch(error){feedback.textContent=error.code==='40001'?'Version conflict. Your entry is preserved. Refresh and review the latest application before retrying.':'Save could not be confirmed. Your entry is preserved. Refresh to check the outcome before retrying.';throw error;}
 },review);confirmButton.disabled=locked;
 const cancelButton=button('Cancel account update',()=>{pending=null;edited=false;if(urlField)urlField.value='';review.hidden=true;feedback.textContent='Account update cancelled. No request was saved.';},review);cancelButton.disabled=locked;
 const propose=(next,description)=>{pending=next;summary.textContent=description+' Application content is preserved; saving clears any final approval. No credential is sent to Muse and nothing starts automatically.';review.hidden=false;feedback.textContent='Review the account update below, then confirm or cancel.';};

 if(request){
  el('p',request.waiting?'You reported completing secure setup. Access is still unverified and final approval remains blocked.':'Open Muse and ask Nova to show the secure account-creation or sign-in card for this employer. Complete it there and save the login if you wish.');
  try{const url=accountUrl(request.url,application.job_snapshot.source_url);const link=el('a','View employer account page');link.href=url;link.target='_blank';link.rel='noopener noreferrer';}catch{el('p','Account link needs correction. Ask Nova to record a valid page on the original listing website.');}
  const prompt=el('textarea','');prompt.readOnly=true;prompt.rows=5;prompt.setAttribute('aria-label','Message for Nova about employer account setup');prompt.value=`For application ${application.id}, help me securely ${request.waiting?'verify the saved employer login':'create or sign into the employer account'}. Show your secure credential card if needed. Never put passwords in chat or Dashboard fields. Confirm access only after successful sign-in to the correct employer site. Do not submit an application or accept consent or attestations for me.`;
  if(admin&&!request.waiting){const b=button('I completed the secure setup',()=>propose(questions.map(q=>q===request.question?accountWaiting(request):q),'Report secure setup completed. Access remains unverified and approval stays blocked.'),root);b.disabled=locked;}
  if(!admin){const label=el('label','I successfully signed in to the correct employer site');const check=doc.createElement('input');check.type='checkbox';label.append(check);check.addEventListener('input',()=>{pending=null;review.hidden=true;});const b=button('Confirm account access',()=>{if(!check.checked)throw Error('Verify successful employer sign-in first.');return propose(questions.filter(q=>q!==request.question),'Record your confirmation of successful sign-in and remove this account blocker.');},root);b.disabled=locked;}
 }else if(!admin){
  const label=el('label','Employer account page URL');const url=doc.createElement('input');url.type='url';urlField=url;label.append(url);
  url.addEventListener('input',()=>{edited=true;pending=null;review.hidden=true;feedback.textContent='Account URL not saved. Select Request secure account setup to review it.';});
  const b=button('Request secure account setup',()=>{const checked=accountUrl(url.value,application.job_snapshot.source_url);propose([...questions,accountQuestion(checked)],'Request secure account setup for '+checked+'.');},root);b.disabled=locked;
 }else el('p','No employer-account request recorded. Nova can flag a login or account-creation blocker here.');
 root.append(review);
 return {hasUnsavedEdits:()=>edited||pending!==null};
}
