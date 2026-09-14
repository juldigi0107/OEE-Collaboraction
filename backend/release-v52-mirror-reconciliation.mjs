import {LiveRegisterV49} from './release-v49-live-register.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const specs={
 production_run:{
  rows:`SELECT r.id,CASE WHEN e.id IS NULL THEN 1 ELSE 0 END missing
   FROM production_runs r
   LEFT JOIN entries e ON e.id='live:production:'||r.id
   LEFT JOIN approvals a ON a.entity_type='production_run' AND a.entity_id=r.id AND a.step='FINAL_VERIFY'
   WHERE r.status='FINISHED' AND (e.id IS NULL
    OR COALESCE(json_extract(e.payload,'$.verification_status'),'')<>COALESCE(a.status,'PENDING')
    OR COALESCE(CAST(json_extract(e.payload,'$.total') AS REAL),-1)<>COALESCE(r.actual_qty,0)
    OR COALESCE(CAST(json_extract(e.payload,'$.good') AS REAL),-1)<>COALESCE(r.good_qty,0)
    OR COALESCE(CAST(json_extract(e.payload,'$.reject') AS REAL),-1)<>COALESCE(r.reject_qty,0)
    OR lower(trim(COALESCE(json_extract(e.payload,'$.unit'),'')))<>lower(trim(COALESCE(r.unit,'')))
    OR COALESCE(json_extract(e.payload,'$.plan_id'),'')<>COALESCE(r.plan_id,''))
   ORDER BY CASE WHEN e.id IS NULL THEN 0 ELSE 1 END,COALESCE(r.end_ts,r.start_ts) DESC LIMIT ?`,
  count:`SELECT COUNT(*) n,SUM(CASE WHEN e.id IS NULL THEN 1 ELSE 0 END) missing FROM production_runs r LEFT JOIN entries e ON e.id='live:production:'||r.id LEFT JOIN approvals a ON a.entity_type='production_run' AND a.entity_id=r.id AND a.step='FINAL_VERIFY' WHERE r.status='FINISHED' AND (e.id IS NULL OR COALESCE(json_extract(e.payload,'$.verification_status'),'')<>COALESCE(a.status,'PENDING') OR COALESCE(CAST(json_extract(e.payload,'$.total') AS REAL),-1)<>COALESCE(r.actual_qty,0) OR COALESCE(CAST(json_extract(e.payload,'$.good') AS REAL),-1)<>COALESCE(r.good_qty,0) OR COALESCE(CAST(json_extract(e.payload,'$.reject') AS REAL),-1)<>COALESCE(r.reject_qty,0) OR lower(trim(COALESCE(json_extract(e.payload,'$.unit'),'')))<>lower(trim(COALESCE(r.unit,''))) OR COALESCE(json_extract(e.payload,'$.plan_id'),'')<>COALESCE(r.plan_id,''))`
 },
 downtime:{
  rows:`SELECT d.id,CASE WHEN e.id IS NULL THEN 1 ELSE 0 END missing
   FROM downtime_events d
   LEFT JOIN entries e ON e.id='live:downtime:'||d.id
   LEFT JOIN approvals a ON a.entity_type='downtime' AND a.entity_id=d.id AND a.step='ROOT_CAUSE_VERIFY'
   WHERE d.status='CLOSED' AND (e.id IS NULL
    OR COALESCE(json_extract(e.payload,'$.verification_status'),'')<>COALESCE(a.status,'PENDING')
    OR COALESCE(json_extract(e.payload,'$.root_cause'),'')<>COALESCE(d.root_cause,'')
    OR COALESCE(json_extract(e.payload,'$.class'),'')<>COALESCE(d.class,'')
    OR COALESCE(json_extract(e.payload,'$.code'),'')<>COALESCE(d.code,''))
   ORDER BY CASE WHEN e.id IS NULL THEN 0 ELSE 1 END,d.end_ts DESC LIMIT ?`,
  count:`SELECT COUNT(*) n,SUM(CASE WHEN e.id IS NULL THEN 1 ELSE 0 END) missing FROM downtime_events d LEFT JOIN entries e ON e.id='live:downtime:'||d.id LEFT JOIN approvals a ON a.entity_type='downtime' AND a.entity_id=d.id AND a.step='ROOT_CAUSE_VERIFY' WHERE d.status='CLOSED' AND (e.id IS NULL OR COALESCE(json_extract(e.payload,'$.verification_status'),'')<>COALESCE(a.status,'PENDING') OR COALESCE(json_extract(e.payload,'$.root_cause'),'')<>COALESCE(d.root_cause,'') OR COALESCE(json_extract(e.payload,'$.class'),'')<>COALESCE(d.class,'') OR COALESCE(json_extract(e.payload,'$.code'),'')<>COALESCE(d.code,''))`
 },
 quality:{
  rows:`SELECT q.id,CASE WHEN e.id IS NULL THEN 1 ELSE 0 END missing
   FROM quality_events q
   LEFT JOIN entries e ON e.id='live:quality:'||q.id
   LEFT JOIN approvals a ON a.entity_type='quality' AND a.entity_id=q.id AND a.step='QC_VERIFY'
   WHERE e.id IS NULL
    OR COALESCE(json_extract(e.payload,'$.verification_status'),'')<>COALESCE(a.status,'PENDING')
    OR COALESCE(CAST(json_extract(e.payload,'$.sample_qty') AS REAL),-1)<>COALESCE(q.sample_qty,0)
    OR COALESCE(CAST(json_extract(e.payload,'$.good_qty') AS REAL),-1)<>COALESCE(q.good_qty,0)
    OR COALESCE(CAST(json_extract(e.payload,'$.reject_qty') AS REAL),-1)<>COALESCE(q.reject_qty,0)
    OR lower(trim(COALESCE(json_extract(e.payload,'$.unit'),'')))<>lower(trim(COALESCE(q.unit,'')))
    OR COALESCE(json_extract(e.payload,'$.decision'),'')<>COALESCE(q.decision,'')
   ORDER BY CASE WHEN e.id IS NULL THEN 0 ELSE 1 END,q.created_ts DESC LIMIT ?`,
  count:`SELECT COUNT(*) n,SUM(CASE WHEN e.id IS NULL THEN 1 ELSE 0 END) missing FROM quality_events q LEFT JOIN entries e ON e.id='live:quality:'||q.id LEFT JOIN approvals a ON a.entity_type='quality' AND a.entity_id=q.id AND a.step='QC_VERIFY' WHERE e.id IS NULL OR COALESCE(json_extract(e.payload,'$.verification_status'),'')<>COALESCE(a.status,'PENDING') OR COALESCE(CAST(json_extract(e.payload,'$.sample_qty') AS REAL),-1)<>COALESCE(q.sample_qty,0) OR COALESCE(CAST(json_extract(e.payload,'$.good_qty') AS REAL),-1)<>COALESCE(q.good_qty,0) OR COALESCE(CAST(json_extract(e.payload,'$.reject_qty') AS REAL),-1)<>COALESCE(q.reject_qty,0) OR lower(trim(COALESCE(json_extract(e.payload,'$.unit'),'')))<>lower(trim(COALESCE(q.unit,''))) OR COALESCE(json_extract(e.payload,'$.decision'),'')<>COALESCE(q.decision,'')`
 },
 maintenance:{
  rows:`SELECT c.id,CASE WHEN e.id IS NULL THEN 1 ELSE 0 END missing
   FROM maintenance_calls c
   LEFT JOIN entries e ON e.id='live:maintenance:'||c.id
   WHERE c.status='CLOSED' AND (e.id IS NULL
    OR COALESCE(json_extract(e.payload,'$.request_note'),'')<>COALESCE(c.note,'')
    OR COALESCE(json_extract(e.payload,'$.action'),'')<>COALESCE(c.resolution_note,'')
    OR COALESCE(json_extract(e.payload,'$.status'),'')<>'Selesai')
   ORDER BY CASE WHEN e.id IS NULL THEN 0 ELSE 1 END,c.closed_ts DESC LIMIT ?`,
  count:`SELECT COUNT(*) n,SUM(CASE WHEN e.id IS NULL THEN 1 ELSE 0 END) missing FROM maintenance_calls c LEFT JOIN entries e ON e.id='live:maintenance:'||c.id WHERE c.status='CLOSED' AND (e.id IS NULL OR COALESCE(json_extract(e.payload,'$.request_note'),'')<>COALESCE(c.note,'') OR COALESCE(json_extract(e.payload,'$.action'),'')<>COALESCE(c.resolution_note,'') OR COALESCE(json_extract(e.payload,'$.status'),'')<>'Selesai')`
 }
};
async function candidates(env,perType=25){const out=[];for(const [type,spec] of Object.entries(specs)){for(const row of await all(env.DB,spec.rows,Math.max(1,Math.min(100,Number(perType)||25))))out.push({type,id:row.id,missing:Number(row.missing||0)>0});}return out.sort((a,b)=>Number(b.missing)-Number(a.missing));}
export async function reconcileLiveMirrorsV52(env,limit=80){const list=(await candidates(env,Math.max(10,Math.ceil(limit/4)))).slice(0,Math.max(1,Math.min(200,Number(limit)||80)));let rebuilt=0,missing=0,stale=0;for(const item of list){if(item.missing)missing++;else stale++;if(await LiveRegisterV49.build(env,item.type,item.id))rebuilt++;}return {checked:list.length,rebuilt,missing,stale};}
export async function mirrorHealthV52(env){let missing=0,stale=0,total=0;const by_type={};for(const [type,spec] of Object.entries(specs)){const row=await one(env.DB,spec.count)||{},n=Number(row.n||0),m=Number(row.missing||0);by_type[type]={issues:n,missing:m,stale:Math.max(0,n-m)};total+=n;missing+=m;stale+=Math.max(0,n-m);}return {generated_at:new Date().toISOString(),ready:total===0,issues:total,missing_mirrors:missing,stale_mirrors:stale,by_type,note:'Mirror register bersifat read-only dan direkonsiliasi dari workflow HMI/approval. Source workflow tetap menjadi authority.'};}
export async function handleMirrorReconciliationV52(req,env){const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/mirror-health')return null;const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(u.role!=='superadmin')return out(req,env,{error:'Mirror Health khusus Superadmin'},403);return out(req,env,await mirrorHealthV52(env));}
