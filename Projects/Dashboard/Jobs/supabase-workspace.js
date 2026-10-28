/* Jobs v0.4.1: saved jobs; existing Main Admin/version-checked RPCs remain authoritative. */
(() => {
  const assetBase=new URL('.',document.currentScript.src);
  let root, client, jobs = [], selected = null, embedded=false;
  const node = (tag, cls, text) => { const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x; };
  const button = (label,cb) => {const b=node('button','j31-button',label);b.type='button';b.onclick=cb;return b;};
  const safe = (value) => value == null ? '' : String(value);
  const input = (label,value,change,textarea=false) => {const w=node('label','j31-field');w.append(node('span','',label));const i=node(textarea?'textarea':'input');i.value=safe(value);if(textarea)i.rows=4;i.oninput=()=>change(i.value);w.append(i);return w;};
  let editing={};
  const flagged=v=>v!=null && ![false,'false',''].includes(v);
  const needsInput=a=>flagged(a?.needs_dylan_input)||flagged(a?.needs_input);
  const questionDone=q=>q && typeof q==='object' && !needsInput(q) && ((String(q.resolved)==='true' && typeof q.resolution==='string' && q.resolution.trim()) || (String(q.reviewed)==='true' && typeof q.review_note==='string' && q.review_note.trim()));
  function draftComplete(d){if(!d || typeof d!=='object')return false;const answers=d.answers===undefined?[]:d.answers,questions=d.open_questions===undefined?[]:d.open_questions;return !needsInput(d) && typeof d.cover_letter_draft==='string' && !!d.cover_letter_draft.trim() && Array.isArray(answers) && answers.every(a=>a && typeof a.answer==='string' && a.answer.trim() && !needsInput(a)) && Array.isArray(questions) && questions.every(questionDone);}

  async function fetchJobs(){const {data,error}=await client.from('dashboard_job_records').select('id,payload,version').order('updated_at',{ascending:false});if(error)throw error;jobs=data||[];}
  function panel(content){root.replaceChildren(content);}
  const friendly=value=>({pending_review:'To review',accepted:'Saved',declined:'Not pursuing',answers_review:'Draft needs review',ready_to_apply:'Review complete',applied:'Applied',interviewing:'Interview',offered:'Offer',rejected:'Closed',hired:'Hired'}[value]||value||'Saved');
  function render(){
    if(!selected&&jobs.length)selected=jobs[0].id;
    const view=node('div','j31-content'),top=node('div','j31-top');
    top.append(node('h2','','Saved jobs'),button('Refresh',async()=>{if(busy||!discard())return;dirty=false;editing={};try{await fetchJobs();render();}catch(e){notice=e.message;render();}}));
    if(!embedded)top.append(button('Recommendations',()=>{if(!busy&&discard()){dirty=false;editing={};openRecommendations();}}),button('Close',close));view.append(top);
    view.append(node('p','j31-muted','Your saved listings and earlier preparation drafts. Reviewing or accepting a job does not submit an application.'));
    const tools=node('div','j31-tools'),search=node('input','j31-search');search.type='search';search.placeholder='Search company or job title';search.setAttribute('aria-label','Search saved jobs');tools.append(search);
    const picker=node('select','j31-mobile-picker');picker.setAttribute('aria-label','Choose a saved job');tools.append(picker);view.append(tools);
    const count=node('p','j31-muted',`${jobs.length} saved ${jobs.length===1?'job':'jobs'}`);view.append(count);
    const columns=node('div','j31-columns'),list=node('section','j31-list'),detail=node('section','j31-detail');list.setAttribute('aria-label','Saved job list');columns.append(list,detail);view.append(columns);
    const choose=id=>{if(busy||!discard()){picker.value=selected;return;}dirty=false;notice='';selected=id;editing={};render();};
    picker.onchange=()=>choose(picker.value);
    function drawList(){
      const term=search.value.trim().toLowerCase(),shown=jobs.filter(j=>(`${j.payload.company} ${j.payload.position}`).toLowerCase().includes(term));list.replaceChildren();picker.replaceChildren();
      count.textContent=term?`${shown.length} of ${jobs.length} saved jobs`:`${jobs.length} saved ${jobs.length===1?'job':'jobs'}`;
      for(const j of shown){
        const item=button('',()=>choose(j.id));item.classList.add('j31-item');item.append(node('strong','',j.payload.position||'Untitled role'),node('span','',j.payload.company||'Unknown company'),node('span','j31-muted',friendly(j.payload.status)));
        if(j.id===selected){item.classList.add('j31-selected');item.setAttribute('aria-current','true');}list.append(item);
        const o=node('option','',`${j.payload.company||'Unknown'} · ${j.payload.position||'Untitled'}`);o.value=j.id;picker.append(o);
      }
      picker.value=selected;if(!shown.length)list.append(node('p','','No matching jobs. Try another search.'));
    }
    search.oninput=drawList;drawList();const job=jobs.find(j=>j.id===selected);
    if(job)renderDetails(detail,job);else detail.append(node('h3','','No saved jobs yet'),node('p','','Review recommendations to decide what you want to pursue.'));panel(view);
  }

  // Application state and history are committed together by the existing RPC.
  let busy=false, dirty=false, notice='';
  function discard(){return !dirty || window.confirm('Discard unsaved application edits?');}
  async function action(row,kind,value=null,savedKey=null){
    if(busy)return;
    busy=true;root.querySelectorAll('button,input,textarea').forEach(x=>x.disabled=true);
    try{
      const {error}=await client.rpc('dashboard_job_action',{p_id:row.id,p_expected_version:row.version,p_action:kind,p_value:value});
      if(error)throw error;
      if(savedKey!==null)delete editing[savedKey];dirty=Object.keys(editing).length>0;notice='Action saved.';
      await fetchJobs();render();
    }catch(e){notice=`Could not complete action: ${e.message}. Your edits are still shown. Refresh to load the latest record before retrying a conflict.`;const m=root?.querySelector('[role="status"]');if(m)m.textContent=notice;}
    finally{busy=false;root?.querySelectorAll('[data-action-lock]').forEach(x=>x.disabled=false);root?.querySelectorAll('button,input,textarea').forEach(x=>{if(!x.dataset.keepDisabled)x.disabled=false;});}
  }
  function renderDetails(target,row){
    const p=row.payload,app=p.application||{},d=p.prep_draft;
    target.append(node('h3','',`${p.company} — ${p.position}`),node('p','j31-muted',`${friendly(p.status)} · Revision ${row.version}`));
    const message=node('p','j31-muted',notice);message.setAttribute('role','status');target.append(message);
    const info=node('details','j31-job-info');info.append(node('summary','','Job details · read-only'));target.append(info);
    for(const [key,title] of [['company','Company'],['position','Position'],['location','Location'],['compensation','Compensation'],['work_arrangement','Work arrangement'],['description','Description'],['rationale','Recommendation notes']]){
      if(p[key])info.append(node('h5','',title),node('p','j31-pre',safe(p[key])));
    }
    if(p.source_url){try{const url=new URL(p.source_url);if(['https:','http:'].includes(url.protocol)){const a=node('a','','View original job');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';target.append(a);}}catch{target.append(node('p','','Original job URL is unavailable.'));}}
    const control=(label,kind,value=null)=>button(label,()=>{if(kind==='decline'&&!window.confirm('Stop pursuing this saved job? Its existing draft and history will be kept.'))return;if(discard()){dirty=false;editing={};action(row,kind,value);}});
    if(['pending_review','declined'].includes(p.status))target.append(control('Accept job','accept'));
    if(!app.submitted && p.status!=='declined')target.append(control('Decline job','decline'));
    target.append(node('h4','','Preparation review'));const progress=node('div','j31-progress');for(const label of [app.answers_reviewed?'Answers reviewed':'Answers need review',app.cover_letter_approved?'Cover letter reviewed':'Cover letter needs review',app.approved?'Review complete':'Review incomplete',app.submitted?'Submitted':'Not submitted'])progress.append(node('span','',label));target.append(progress);
    if(d){
      const reviewable=['accepted','answers_review','ready_to_apply'].includes(p.status);
      for(const [key,label] of [['company_brief','Company brief'],['role_notes','Role notes'],['pay_guidance','Pay guidance'],['tailored_bullets','Resume suggestions']]){
        if(d[key])target.append(node('h5','',label),node('pre','j31-pre',typeof d[key]==='string'?d[key]:JSON.stringify(d[key],null,2)));
      }
      const reviewNote=(label,kind,index,key)=>{
        let note=editing[key]??'';const field=input(label,note,v=>{note=v;editing[key]=v;dirty=true;},true);field.querySelector('textarea').maxLength=3000;
        target.append(field,button(kind==='review_question'?'Record question reviewed':kind==='resolve_question'?'Resolve question':'Confirm input reviewed',()=>{
          if(!note.trim()){message.textContent='Enter a resolution or review note first.';return;}
          const other=Object.keys(editing).filter(k=>k!==key);
          if(other.length){message.textContent='Save other edits before recording this review.';return;}
          action(row,kind,index===null?note:JSON.stringify({index,note}),key);
        }));
      };
      if(!Array.isArray(d.answers===undefined?[]:d.answers) || !Array.isArray(d.open_questions===undefined?[]:d.open_questions))target.append(node('p','','Draft structure needs correction before approval.'));
      if(needsInput(d)){
        target.append(node('p','','Nova flagged this draft for your input. Review the draft and document your decision.'));
        if(reviewable)reviewNote('Draft input review note','review_draft_input',null,'draft_input');
      }
      const questions=Array.isArray(d.open_questions)?d.open_questions:[];
      if(questions.length)target.append(node('h4','','Nova open questions'));
      questions.forEach((q,index)=>{
        const title=typeof q==='string'?q:q?.question||q?.text||JSON.stringify(q);
        target.append(node('p','j31-pre',title));
        if(questionDone(q))target.append(node('p','j31-muted',`Reviewed: ${q.resolution||q.review_note}`));
        else if(reviewable){
          target.append(node('p','j31-muted','Resolve with the missing information, or explicitly review and explain why this question does not block applying. Required application answers must still be filled in.'));
          reviewNote('Resolution','resolve_question',index,`resolve_${index}`);
          reviewNote('Review explanation (if no resolution is needed)','review_question',index,`review_${index}`);
        }
      });
      const answers=Array.isArray(d.answers)?d.answers:[];
      answers.forEach((a,index)=>{
        const editKey=`answer_${index}`;let answer=editing[editKey]??safe(a?.answer);const label=safe(a?.question)||`Answer ${index+1}`;
        if(reviewable){const field=input(label,answer,v=>{answer=v;editing[editKey]=v;dirty=true;},true);field.querySelector('textarea').maxLength=3000;target.append(field,button('Save answer',()=>action(row,'edit_answer',JSON.stringify({index,answer}),editKey)));}
        else target.append(node('h5','',label),node('p','j31-pre',answer||'Requires your input'));
        if(needsInput(a)){
          target.append(node('p','','Nova needs your input for this answer. Save the completed answer, then confirm your review.'));
          if(reviewable)reviewNote(`Input review for answer ${index+1}`,'resolve_answer_input',index,`input_${index}`);
        }
      });
      target.append(node('h5','','Cover letter'));
      if(reviewable){
        let letter=editing.letter??safe(d.cover_letter_draft);const field=input('Cover letter draft',letter,v=>{letter=v;editing.letter=v;dirty=true;},true);field.querySelector('textarea').maxLength=12000;target.append(field,button('Save cover letter',()=>action(row,'edit_cover_letter',letter,'letter')));
        const approve=(label,kind,enabled)=>{const b=button(label,()=>{if(dirty){message.textContent='Save your edits before approving.';return;}action(row,kind);});if(!enabled){b.disabled=true;b.dataset.keepDisabled='true';}target.append(b);};
        approve('Approve answers','review_answers',draftComplete(d));
        approve('Approve cover letter','approve_cover_letter',!!safe(d.cover_letter_draft).trim());
        target.append(node('p','j31-muted','Save each edit before approving. Editing clears the affected approval. All answers, input flags, open questions and both approvals must be complete before Ready to Apply. Approval does not submit it.'));
      }else target.append(node('pre','j31-pre',safe(d.cover_letter_draft)||'No cover letter draft.'));
    }else target.append(node('p','','No preparation draft yet. Assign this saved job from Applications when you are ready for Nova to work on it.'));
    if(p.status==='ready_to_apply' && !draftComplete(d))target.append(node('p','','Review required: this stored Ready status has outstanding draft requirements. Submission confirmation is blocked.'));
    if(p.status==='ready_to_apply' && app.approved && app.answers_reviewed && app.cover_letter_approved && draftComplete(d)){
      let confirmation='';target.append(node('p','','Application review is complete. Manual submission recording is blocked by the existing database safety constraint and requires a separately approved update. No application is submitted by this workspace.'));
    }
    if(app.submitted && ['applied','interviewing','offered','rejected'].includes(p.status))for(const stage of ['interviewing','offered','rejected','hired'])if(stage!==p.status)target.append(control(`Record ${stage}`,stage));
    const history=node('section');history.append(node('h4','','Activity history'),node('p','j31-muted','Loading activity…'));target.append(history);
    client.from('dashboard_job_events').select('id,action,previous_status,new_status,happened_at').eq('job_id',row.id).order('happened_at',{ascending:false}).then(({data,error})=>{
      history.replaceChildren(node('h4','','Activity history'));
      if(error){history.append(node('p','','Could not load activity. Refresh to retry.'));return;}
      if(!data?.length)history.append(node('p','j31-muted','No application actions recorded yet.'));
      for(const event of data||[])history.append(node('p','j31-muted',`${event.happened_at} · ${event.action.replaceAll('_',' ')} · ${event.previous_status} → ${event.new_status}`));
    }).catch(()=>{history.replaceChildren(node('p','','Could not load activity. Refresh to retry.'));});
  }
  async function openRecommendations(){if(!window.DashboardJobRecommendations){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('recommendations.js',assetBase).href;s.onload=resolve;s.onerror=reject;document.head.append(s);});}await window.DashboardJobRecommendations.open(client,'main_admin');}
  function close(force=false){if(force!==true && (busy||!discard()))return;dirty=false;editing={};jobs=[];selected=null;root?.remove();root=null;if(!embedded)document.body.style.overflow='';embedded=false;}
  async function open(authClient,options={}){client=authClient;const user=await client.auth.getUser();if(!user.data?.user)throw new Error('Sign in first.');const {data:admin,error}=await client.rpc('is_admin');if(error||admin!==true)throw new Error('Main Admin access required.');if(!root){selected=null;editing={};dirty=false;notice='';embedded=!!options.container;root=node('div',embedded?'j31-embedded':'j31-overlay');if(!embedded){root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Saved jobs');}else root.setAttribute('aria-label','Saved jobs');(options.container||document.body).append(root);}if(!embedded)document.body.style.overflow='hidden';try{await fetchJobs();render();}catch(e){const p=node('div','j31-error');p.append(node('p','',e.message),button('Retry',()=>open(authClient,options)));panel(p);}}

  const style=node('style');style.textContent=`.j31-overlay *,.j31-embedded *{box-sizing:border-box}.j31-button:disabled{opacity:.5;cursor:default}.j31-overlay{position:fixed;inset:0;z-index:2147483000;background:#f4f6fa;overflow:auto;color:#263345;font-family:system-ui,sans-serif}.j31-content{max-width:1250px;margin:auto;padding:18px}.j31-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.j31-top h2{margin:0 auto 0 0}.j31-button{cursor:pointer;border:1px solid #b9c9d9;border-radius:9px;background:white;color:#263b5f;padding:10px 12px;text-align:left}.j31-item{width:100%;margin-bottom:8px}.j31-selected{background:#e2edff}.j31-muted{color:#57667b;font-size:13px}.j31-columns{display:grid;grid-template-columns:minmax(210px,1fr) minmax(300px,2fr);gap:18px}.j31-list,.j31-detail{background:white;border:1px solid #d5deea;border-radius:14px;padding:15px;min-width:0}.j31-field{display:grid;gap:5px;margin:10px 0;font-size:13px;font-weight:650}.j31-field input,.j31-field textarea,.j31-field select{font:inherit;font-weight:400;padding:10px;border:1px solid #a9b9cd;border-radius:8px;width:100%;background:white;color:#263345}.j31-pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 system-ui;background:#f4f6fa;border-radius:8px;padding:12px}.j31-detail li{margin:8px 0;overflow-wrap:anywhere}.j31-error{padding:30px}@media(max-width:700px){.j31-columns{grid-template-columns:1fr}.j31-content{padding:12px}.j31-top h2{width:100%}.j31-embedded .j31-top h2{width:auto;flex:1}.j31-embedded .j31-top .j31-button{width:auto}}`;style.textContent+=`.j31-embedded{color:#243449;font:16px/1.6 system-ui}.j31-embedded .j31-content{padding:0}.j31-tools{display:flex;gap:12px}.j31-search,.j31-mobile-picker{min-height:46px;border:1px solid #b9c9d9;border-radius:10px;padding:10px 12px;font:inherit;width:100%;min-width:0}.j31-mobile-picker{display:none}.j31-item{display:grid;gap:4px;overflow-wrap:anywhere;min-height:72px}.j31-item strong{font-size:15px}.j31-progress{display:flex;gap:8px;flex-wrap:wrap}.j31-progress span{padding:5px 10px;border-radius:20px;background:#edf2f8;font-size:13px}.j31-job-info{padding:12px;border:1px solid #d5deea;border-radius:10px}.j31-job-info summary{font-weight:650;cursor:pointer}.j31-detail h3{font-size:22px;line-height:1.35}.j31-button{min-height:44px}.j31-embedded button:focus-visible,.j31-embedded input:focus-visible,.j31-embedded select:focus-visible{outline:3px solid #538ad2;outline-offset:3px}@media(max-width:700px){.j31-list{display:none}.j31-mobile-picker{display:block}.j31-tools{flex-direction:column}.j31-detail{padding:16px}.j31-button{width:100%;text-align:center}.j31-field{font-size:16px}}`;document.head.append(style);
  window.DashboardSupabaseJobs={open,close,hasUnsavedEdits:()=>dirty,isBusy:()=>busy};
})();
