/** Display only: never fills or rewrites employer records from guessed URL text. */
const usable=value=>typeof value==='string'&&value.trim()&&!['null','undefined'].includes(value.trim().toLowerCase())?value.trim():null;
export function jobLabel(job={}){
 const company=usable(job.company),position=usable(job.position);
 if(company&&position)return `${company} · ${position}`;
 let source='';try{const u=new URL(job.source_url||job.url);if(u.protocol==='https:'&&!u.username&&!u.password)source=u.hostname;}catch{}
 return [company||position||'Employer and role not supplied',company&&!position?'Role not supplied':!company&&position?'Employer not supplied':null,source].filter(Boolean).join(' · ');
}
