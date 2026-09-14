const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const clean=v=>String(v??'').trim();
const parse=v=>{try{return JSON.parse(v||'[]')}catch{return []}};
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&parse(u.permissions).includes(action));

export async function captureWorkflowLineageV50(req){
 if(req.method!=='POST')return null;const path=new URL(req.url).pathname;if(!['/api/shopfloor/start','/api/shopfloor/finish','/api/shopfloor/maintenance/close','/api/approvals/decide'].includes(path))return null;
 try{return {path,body:await req.clone().json()};}catch{return {path,body:{}};}
}
async function markPlan(env,planId,status,extra={}){
 if(!clean(planId))return;const row=await one(env.DB,"SELECT payload FROM entries WHERE id=? AND module='planning' AND deleted=0",planId);if(!row)return;let payload={};try{payload=JSON.parse(row.payload||'{}');}catch{}payload={...payload,status,...extra};await run(env.DB,"UPDATE entries SET payload=?,version=version+1,updated=CURRENT_TIMESTAMP WHERE id=? AND module='planning' AND deleted=0",JSON.stringify(payload),planId);
}
export async function handleWorkflowLineageV50(req,env){
 const path=new URL(req.url).pathname;if(req.method!=='POST'||path!=='/api/shopfloor/maintenance/close')return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(!allow(u,'MTC','update'))return out(req,env,{error:'Khusus Maintenance yang memiliki izin update'},403);
 let body;try{body=await req.clone().json();}catch{return out(req,env,{error:'Payload Maintenance Close tidak valid'},400);}const id=clean(body.id),resolution=clean(body.note);if(!id)return out(req,env,{error:'Maintenance Call wajib dipilih'},400);if(!resolution)return out(req,env,{error:'Tindakan penyelesaian wajib diisi sebelum Maintenance Close'},400);
 const c=await one(env.DB,'SELECT status,note FROM maintenance_calls WHERE id=?',id);if(!c)return out(req,env,{error:'Maintenance Call tidak ditemukan'},404);if(c.status!=='ACKNOWLEDGED')return out(req,env,{error:'Maintenance Call harus di-acknowledge sebelum ditutup'},409);
 const result=await run(env.DB,"UPDATE maintenance_calls SET status='CLOSED',closed_ts=CURRENT_TIMESTAMP,acknowledged_by=COALESCE(acknowledged_by,?),resolution_note=? WHERE id=? AND status='ACKNOWLEDGED'",u.id,resolution,id);if(Number(result?.meta?.changes||0)!==1)return out(req,env,{error:'Maintenance Call sudah ditutup atau diproses oleh request lain'},409);
 return out(req,env,{ok:true,id,request_note_preserved:!!clean(c.note),resolution_recorded:true,concurrency_guard:'atomic_status_transition'});
}
export async function afterWorkflowLineageV50(signal,response,env){
 if(!signal||!response?.ok)return;let body={};try{body=await response.clone().json();}catch{}
 if(signal.path==='/api/shopfloor/start'){
  const runId=clean(body.id),planId=clean(signal.body.plan_id);if(runId&&planId){await run(env.DB,'UPDATE production_runs SET plan_id=? WHERE id=?',planId,runId);await markPlan(env,planId,'Dimulai',{active_run_id:runId});}
 }
 if(signal.path==='/api/shopfloor/finish'){
  const runId=clean(signal.body.run_id);if(!runId)return;const r=await one(env.DB,'SELECT plan_id FROM production_runs WHERE id=?',runId);if(r?.plan_id)await markPlan(env,r.plan_id,'Selesai',{active_run_id:null,finished_run_id:runId,verification_status:'PENDING'});
 }
 if(signal.path==='/api/approvals/decide'){
  const approvalId=clean(signal.body.id);if(!approvalId)return;const a=await one(env.DB,"SELECT entity_type,entity_id,status,decided_ts,note FROM approvals WHERE id=?",approvalId);if(a?.entity_type!=='production_run')return;const r=await one(env.DB,'SELECT plan_id FROM production_runs WHERE id=?',a.entity_id);if(!r?.plan_id)return;if(a.status==='APPROVED')await markPlan(env,r.plan_id,'Terverifikasi',{active_run_id:null,finished_run_id:a.entity_id,verified_run_id:a.entity_id,verified_ts:a.decided_ts||new Date().toISOString(),verification_status:'APPROVED',verification_note:a.note||''});else if(a.status==='REJECTED')await markPlan(env,r.plan_id,'Selesai',{active_run_id:null,finished_run_id:a.entity_id,verification_status:'REJECTED',verification_note:a.note||clean(signal.body.note)});
 }
}
