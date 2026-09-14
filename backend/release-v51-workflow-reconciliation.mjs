const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const clean=v=>String(v??'').trim();
const parse=v=>{try{return JSON.parse(v||'{}')}catch{return {}}};
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
function expected(row){
 const approval=clean(row.approval_status).toUpperCase();
 if(row.run_status==='RUNNING')return {status:'Dimulai',active_run_id:row.run_id,finished_run_id:null,verified_run_id:null,verified_ts:null,verification_status:null,verification_note:''};
 if(row.run_status!=='FINISHED')return null;
 if(approval==='APPROVED')return {status:'Terverifikasi',active_run_id:null,finished_run_id:row.run_id,verified_run_id:row.run_id,verified_ts:row.decided_ts||null,verification_status:'APPROVED',verification_note:row.approval_note||''};
 if(approval==='REJECTED')return {status:'Selesai',active_run_id:null,finished_run_id:row.run_id,verified_run_id:null,verified_ts:null,verification_status:'REJECTED',verification_note:row.approval_note||''};
 return {status:'Selesai',active_run_id:null,finished_run_id:row.run_id,verified_run_id:null,verified_ts:null,verification_status:'PENDING',verification_note:''};
}
function differs(payload,want){if(!want)return false;return Object.entries(want).some(([k,v])=>(payload[k]??null)!==(v??null));}
function apply(payload,want){const next={...payload};for(const [k,v] of Object.entries(want||{})){if(v===null){delete next[k];continue;}next[k]=v;}return next;}
async function lineageRows(env,limit=500){return all(env.DB,"SELECT r.id run_id,r.plan_id,r.status run_status,r.start_ts,r.end_ts,e.payload plan_payload,e.version plan_version,a.status approval_status,a.decided_ts,a.note approval_note FROM production_runs r LEFT JOIN entries e ON e.id=r.plan_id AND e.module='planning' AND e.deleted=0 LEFT JOIN approvals a ON a.entity_type='production_run' AND a.entity_id=r.id AND a.step='FINAL_VERIFY' WHERE trim(COALESCE(r.plan_id,''))<>'' AND NOT EXISTS (SELECT 1 FROM production_runs newer WHERE newer.plan_id=r.plan_id AND (COALESCE(newer.end_ts,newer.start_ts)>COALESCE(r.end_ts,r.start_ts) OR (COALESCE(newer.end_ts,newer.start_ts)=COALESCE(r.end_ts,r.start_ts) AND newer.id>r.id))) ORDER BY COALESCE(r.end_ts,r.start_ts) DESC LIMIT ?",Math.max(1,Math.min(1000,Number(limit)||500)));}
export async function reconcileWorkflowLineageV51(env,limit=150){
 const rows=await lineageRows(env,limit);let checked=0,updated=0,orphaned=0;
 for(const row of rows){checked++;if(row.plan_payload==null){orphaned++;continue;}const payload=parse(row.plan_payload),want=expected(row);if(!differs(payload,want))continue;const next=apply(payload,want),result=await env.DB.prepare("UPDATE entries SET payload=?,version=version+1,updated=CURRENT_TIMESTAMP WHERE id=? AND module='planning' AND deleted=0 AND version=?").bind(JSON.stringify(next),row.plan_id,Number(row.plan_version||1)).run();if(Number(result?.meta?.changes||0)>0)updated++;}
 return {checked,updated,orphaned};
}
export async function workflowHealthV51(env){
 const rows=await lineageRows(env,500);let mismatches=0,orphaned=0;for(const row of rows){if(row.plan_payload==null){orphaned++;continue;}if(differs(parse(row.plan_payload),expected(row)))mismatches++;}
 const linked=Number((await one(env.DB,"SELECT COUNT(*) n FROM production_runs WHERE trim(COALESCE(plan_id,''))<>''"))?.n||0),multi=Number((await one(env.DB,"SELECT COUNT(*) n FROM (SELECT plan_id FROM production_runs WHERE trim(COALESCE(plan_id,''))<>'' GROUP BY plan_id HAVING COUNT(*)>1)"))?.n||0),pending=Number((await one(env.DB,"SELECT COUNT(*) n FROM approvals WHERE entity_type='production_run' AND step='FINAL_VERIFY' AND status='PENDING'"))?.n||0);
 return {generated_at:new Date().toISOString(),ready:orphaned===0&&mismatches===0,linked_runs:linked,checked_runs:rows.length,lineage_mismatches:mismatches,orphaned_plan_links:orphaned,multi_run_plans:multi,pending_production_verification:pending,note:'Rekonsiliasi memakai run terbaru per Planning. Multi-run plan tetap dilaporkan untuk audit karena rerun terkontrol dapat mempertahankan lineage plan yang sama.'};
}
export async function handleWorkflowReconciliationV51(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/workflow-health')return null;const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(u.role!=='superadmin')return out(req,env,{error:'Workflow Health khusus Superadmin'},403);return out(req,env,await workflowHealthV51(env));
}
