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
 if(request){
  el('p',request.waiting?'You reported completing secure setup. Access is still unverified and final approval remains blocked.':'Open Muse and ask Nova to show the secure account-creation or sign-in card for this employer. Complete it there and save the login if you wish.');
  try{const url=accountUrl(request.url,application.job_snapshot.source_url);const link=el('a','View employer account page');link.href=url;link.target='_blank';link.rel='noopener noreferrer';}catch{el('p','Account link needs correction. Ask Nova to record a valid page on the original listing website.');}
  const prompt=el('textarea','');prompt.readOnly=true;prompt.rows=5;prompt.setAttribute('aria-label','Message for Nova about employer account setup');prompt.value=`For application ${application.id}, help me securely ${request.waiting?'verify the saved employer login':'create or sign into the employer account'}. Show your secure credential card if needed. Never put passwords in chat or Dashboard fields. Confirm access only after successful sign-in to the correct employer site. Do not submit an application or accept consent or attestations for me.`;
  if(admin&&!request.waiting){const b=button('I completed the secure setup',()=>onQuestions(questions.map(q=>q===request.question?accountWaiting(request):q)),root);b.disabled=locked;}
  if(!admin){const label=el('label','I successfully signed in to the correct employer site');const check=doc.createElement('input');check.type='checkbox';label.append(check);const b=button('Confirm account access',()=>{if(!check.checked)throw Error('Verify successful employer sign-in first.');return onQuestions(questions.filter(q=>q!==request.question));},root);b.disabled=locked;}
 }else if(!admin){
  const label=el('label','Employer account page URL');const url=doc.createElement('input');url.type='url';label.append(url);
  const b=button('Request secure account setup',()=>onQuestions([...questions,accountQuestion(accountUrl(url.value,application.job_snapshot.source_url))]),root);b.disabled=locked;
 }else el('p','No employer-account request recorded. Nova can flag a login or account-creation blocker here.');
}
