// Inactive decision primitive. Observations are data, never executable instructions.
// No fetching, credentials, database writes, scheduler or deletion executor.
const DAY=24*60*60*1000;
const nonblank=value=>typeof value==='string'&&value.trim().length>0;
function publicHttps(value){
 try{
  const u=new URL(value),h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
  if(!h.includes('.')||h.endsWith('.local')||h.endsWith('.localhost')||h.endsWith('.ts.net')||h.endsWith('.internal')||h.includes(':')||/^\d+(\.\d+){3}$/.test(h))return null;
  return u.href;
 }catch{return null;}
}

/** Caller must supply independently matched employer/ATS evidence for this exact
 * listing. This checks the evidence contract, not source truth or DNS/network safety.
 * A future observer needs separate reviewed fetching/SSRF and authenticity controls.
 */
export function assessAvailability(job,observation,{now=Date.now()}={}){
 if(!job||!nonblank(job.id)||!nonblank(job.listing_id)||!publicHttps(job.employer_listing_url)||!Number.isFinite(now))throw Error('Valid job identity, employer listing and clock required');
 const result={job_id:job.id,availability:'unverified',disposition:'review',reason:'missing_or_invalid_evidence',checked_at:null,evidence_url:null,remove_candidate:false,execution_enabled:false};
 if(!observation||typeof observation!=='object'||Array.isArray(observation))return result;
 const timestamp=observation.checked_at;
 const checked=typeof timestamp==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)?Date.parse(timestamp):NaN;
 if(!Number.isFinite(checked)||checked>now||now-checked>DAY)return {...result,reason:'missing_stale_or_future_check'};
 const url=publicHttps(observation.url);
 if(!url||url!==publicHttps(job.employer_listing_url)||observation.listing_id!==job.listing_id||observation.source!=='employer_or_authorized_ats'||observation.identity_matched!==true)return {...result,reason:'listing_identity_or_source_unverified'};
 const evidence=observation.evidence;
 const checkedResult={...result,checked_at:new Date(checked).toISOString(),evidence_url:url};
 if(!evidence||!nonblank(evidence.text)||evidence.text.length>5000)return checkedResult;
 // Availability needs a successful, readable listing: 404/403, login and errors
 // cannot establish closure. Conflicting signals always stop for review.
 if(observation.http_status!==200||observation.access!=='readable'||observation.conflicting_signals!==false)return {...checkedResult,reason:'blocked_error_or_ambiguous'};
 if(evidence.kind==='accepting_applications'&&observation.apply_available===true)return {...checkedResult,availability:'open',disposition:'keep',reason:'exact_listing_accepts_applications'};
 if(evidence.kind==='explicit_listing_closed'&&observation.apply_available===false)return {...checkedResult,availability:'closed',disposition:'backup_then_remove',reason:'exact_listing_explicitly_closed',remove_candidate:true};
 return {...checkedResult,reason:'no_conclusive_listing_signal'};
}
