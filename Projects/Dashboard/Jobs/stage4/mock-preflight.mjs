import {novaApplications} from '../stage1/nova-applications.mjs';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function canonical(value,depth=0){
 if(depth>50)throw new Error('Mock observation too deeply nested');
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+Array.from(value,x=>canonical(x,depth+1)).join(',')+']';
 if(object(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value)))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
 throw new Error('Mock observation must contain JSON values only');
}
function freeze(value){if(object(value)||Array.isArray(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}

/** Local mock observation comparison. This is NOT an employer-site probe or authorization.
 * Neither an observation nor a caller-provided hash proves what a real site would submit.
 * The database repeats authorization, expiry, content/version and duplicate checks.
 */
export function inspectApprovedMock(application,observed,{now=Date.now()}={}){
 if(!object(application)||application.revoked||application.state!=='approved'||application.approved_version!==application.version||!application.approved_by||!Number.isInteger(application.version)||application.version<1||!(/^[0-9a-f]{64}$/).test(application.approved_hash??''))throw new Error('Current final mock approval required');
 const expires=Date.parse(application.approval_expires_at);
 if(!Number.isFinite(now)||!Number.isFinite(expires)||expires<=now)throw new Error('Final mock approval expired or invalid');
 if(!object(observed)||Object.keys(observed).some(k=>!['job','requirements','draft','unexpected_questions','requires_consent','requires_attestation'].includes(k))||!Array.isArray(observed.unexpected_questions)||observed.unexpected_questions.some(x=>typeof x!=='string'||!x.trim())||typeof observed.requires_consent!=='boolean'||typeof observed.requires_attestation!=='boolean')throw new Error('Complete explicit mock observation required');
 if(canonical(observed).length>250000)throw new Error('Mock observation too large');
 const blockers=[];
 for(const [field,expected] of [['job',application.job_snapshot],['requirements',application.requirements],['draft',application.draft]]){
  if(!object(observed[field])||canonical(observed[field])!==canonical(expected))blockers.push(field+'_changed');
 }
 if(observed.unexpected_questions.length)blockers.push('unexpected_questions');
 if(observed.requires_consent)blockers.push('consent_requires_review');
 if(observed.requires_attestation)blockers.push('attestation_requires_review');
 return freeze({mode:'mock',application_id:application.id,expected_version:application.version,approved_hash:application.approved_hash,blockers,ready_for_mock:!blockers.length});
}

/** Create once and retain for ambiguous-response recovery. No retry loop or delivery. */
export function createMockIntent(application,observed,{idempotencyKey,now}={}){
 if(typeof idempotencyKey!=='string'||idempotencyKey.length<8||idempotencyKey.length>100)throw new Error('Explicit retained idempotency key required');
 return freeze({...inspectApprovedMock(application,observed,{now}),idempotency_key:idempotencyKey});
}

/** Invokes only the existing mock broker. No finish, executor, scheduler or HTTP adapter. */
export async function claimMockIntent(client,intent){
 if(!object(intent)||intent.mode!=='mock'||!Array.isArray(intent.blockers)||intent.blockers.some(x=>typeof x!=='string')||typeof intent.idempotency_key!=='string'||intent.idempotency_key.length<8||intent.idempotency_key.length>100)throw new Error('Explicit mock intent required');
 const {data:allowed,error}=await client.rpc('jobs_v040_is_nova');if(error)throw error;
 if(allowed!==true)throw new Error('Verified Nova authorization required');
 const decision=await novaApplications(client).mockBegin(intent.application_id,intent.expected_version,intent.idempotency_key,intent.approved_hash,intent.blockers);
 if(!object(decision)||decision.mode!=='mock'||typeof decision.attempt_id!=='string'||typeof decision.replayed!=='boolean'||typeof decision.dispatch_authorized!=='boolean'||(decision.replayed&&decision.dispatch_authorized)|| (intent.blockers.length&&decision.dispatch_authorized))throw new Error('Invalid mock broker decision; stop for review');
 return freeze({...decision,real_submission_enabled:false});
}
