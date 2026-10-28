/** Jobs 0.4.0 Stage 1 client. Inject a normal authenticated Supabase client.
 * This module contains no secrets, service credentials, employer adapter or scheduler.
 */
export function novaApplications(client){
  const version=v=>{if(!Number.isInteger(v)||v<1)throw new Error('Loaded record version required');return v;};
  async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
  return Object.freeze({
    async assigned(){const {data,error}=await client.from('jobs_v040_applications').select('*').order('updated_at',{ascending:false});if(error)throw error;return data;},
    recommend:url=>rpc('jobs_v040_recommend',{p_url:url}),
    assign:(jobId,jobVersion,requirements)=>rpc('jobs_v040_assign',{p_job_id:jobId,p_expected_job_version:version(jobVersion),p_requirements:requirements}),
    save:(id,loadedVersion,draft)=>rpc('jobs_v040_save',{p_id:id,p_expected_version:version(loadedVersion),p_draft:draft}),
    requestCorrections:(id,loadedVersion,note)=>rpc('jobs_v040_admin_action',{p_id:id,p_expected_version:version(loadedVersion),p_action:'request_corrections',p_note:note}),
    approveFinal:(id,loadedVersion,ttlSeconds=900)=>rpc('jobs_v040_admin_action',{p_id:id,p_expected_version:version(loadedVersion),p_action:'approve_final',p_ttl_seconds:ttlSeconds}),
    revoke:(id,loadedVersion)=>rpc('jobs_v040_admin_action',{p_id:id,p_expected_version:version(loadedVersion),p_action:'revoke'}),
    mockBegin:(id,loadedVersion,idempotencyKey,observedHash,blockers=[])=>rpc('jobs_v040_mock_begin',{p_id:id,p_expected_version:version(loadedVersion),p_idempotency_key:idempotencyKey,p_observed_hash:observedHash,p_blockers:blockers}),
    mockFinish:(attemptId,result,evidence)=>rpc('jobs_v040_mock_finish',{p_attempt_id:attemptId,p_result:result,p_evidence:evidence}),
    submitLive:()=>{throw new Error('Real employer submissions are disabled in Stage 1');}
  });
}
