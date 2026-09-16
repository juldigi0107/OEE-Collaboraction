import {workflowHealthV51} from './release-v51-workflow-reconciliation.mjs';
import {mirrorHealthV52} from './release-v52-mirror-reconciliation.mjs';
import {runtimeInvariantHealthV55} from './release-v55-runtime-invariants.mjs';
import {storageHealthV46} from './release-v46-data-lifecycle.mjs';
import {telemetryHealthV61} from './release-v61-telemetry-freshness.mjs';
import {WorkCalendarV62} from './release-v62-work-calendar.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const uid=()=>crypto.randomUUID();
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const clean=v=>String(v??'').trim();
const parse=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function workCalendarHealth(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.shift_calendar'");return WorkCalendarV62.deriveContext(parse(row?.value,{}));}
const compactWorkflow=v=>({ready:v?.ready===true,checked_runs:Number(v?.checked_runs||0),linked_runs:Number(v?.linked_runs||0),lineage_mismatches:Number(v?.lineage_mismatches||0),orphaned_plan_links:Number(v?.orphaned_plan_links||0),pending_production_verification:Number(v?.pending_production_verification||0),multi_run_plans:Number(v?.multi_run_plans||0)});
const compactMirror=v=>({ready:v?.ready===true,issues:Number(v?.issues||0),missing_mirrors:Number(v?.missing_mirrors||0),stale_mirrors:Number(v?.stale_mirrors||0),by_type:v?.by_type||{}});
const compactInvariant=v=>({ready:v?.ready===true,issues:Number(v?.issues||0),duplicate_running_runs:Number(v?.duplicate_running_runs||0),duplicate_open_downtime:Number(v?.duplicate_open_downtime||0),duplicate_active_maintenance_calls:Number(v?.duplicate_active_maintenance_calls||0),run_state_mismatches:Number(v?.run_state_mismatches||0),downtime_state_mismatches:Number(v?.downtime_state_mismatches||0),orphan_hmi_states:Number(v?.orphan_hmi_states||0),missing_work_date_lineage:Number(v?.missing_work_date_lineage||0)});
const compactCalendar=v=>({runtime_ready:v?.runtime_ready===true,work_date:v?.work_date||null,shift:v?.shift||null,timezone:v?.timezone||null,workday_cutoff:v?.workday_cutoff||null,group_model:v?.group_model||null,reason:v?.reason||null});
const compactStorage=v=>{const c=v?.capacity||{};return {available:c.available===true,status:c.status||'unknown',allocated_bytes:Number.isFinite(Number(c.allocated_bytes))?Number(c.allocated_bytes):null,soft_budget_bytes:Number(c.soft_budget_bytes||0),architecture_ceiling_bytes:Number(c.architecture_ceiling_bytes||0),soft_budget_usage_ratio:Number.isFinite(Number(c.soft_budget_usage_ratio))?Number(c.soft_budget_usage_ratio):null,headroom_to_soft_budget_bytes:Number.isFinite(Number(c.headroom_to_soft_budget_bytes))?Number(c.headroom_to_soft_budget_bytes):null};};
const compactTelemetry=v=>({ready:v?.ready===true,freshness_seconds:Number(v?.freshness_seconds||180),running_runs:Number(v?.running_runs||0),issues:Number(v?.issues||0),issue_machines:(v?.machines||[]).filter(x=>x.run_id&&!x.telemetry_trusted).map(x=>({machine:x.code||null,pro:x.pro||null,heartbeat_at:x.heartbeat_at||null,source_type:x.source_type||null,fresh:x.fresh===true,external_source:x.external_source===true}))});
async function runtimeSnapshot(env){
 const [workflow,mirror,invariants,workCalendar,storage,telemetry]=await Promise.all([workflowHealthV51(env),mirrorHealthV52(env),runtimeInvariantHealthV55(env),workCalendarHealth(env),storageHealthV46(env),telemetryHealthV61(env)]),blockers=[];
 if(workflow?.ready!==true)blockers.push(`Workflow: ${Number(workflow?.lineage_mismatches||0)} mismatch, ${Number(workflow?.orphaned_plan_links||0)} orphan plan link`);
 if(mirror?.ready!==true)blockers.push(`Mirror: ${Number(mirror?.missing_mirrors||0)} missing, ${Number(mirror?.stale_mirrors||0)} stale`);
 if(invariants?.ready!==true)blockers.push(`Shopfloor invariant: ${Number(invariants?.issues||0)} issue (${Number(invariants?.duplicate_running_runs||0)} duplicate run, ${Number(invariants?.duplicate_open_downtime||0)} duplicate downtime, ${Number(invariants?.run_state_mismatches||0)+Number(invariants?.downtime_state_mismatches||0)+Number(invariants?.orphan_hmi_states||0)} state mismatch)`);
 if(workCalendar?.runtime_ready!==true)blockers.push(`Work Calendar: ${clean(workCalendar?.reason)||'baseline kalender shift belum runtime-ready'}`);
 if(storage?.capacity?.available===true&&storage.capacity.status==='critical')blockers.push(`D1 Capacity: pemakaian sudah mencapai soft budget aplikasi (${Math.round(Number(storage.capacity.soft_budget_usage_ratio||0)*100)}%)`);
 if(telemetry?.ready!==true)blockers.push(`Telemetry: ${Number(telemetry?.issues||0)} PRO aktif tidak memiliki heartbeat fresh dari source external`);
 return {ready:blockers.length===0,blockers,workflow:compactWorkflow(workflow),mirror:compactMirror(mirror),runtime_invariants:compactInvariant(invariants),work_calendar:compactCalendar(workCalendar),storage:compactStorage(storage),telemetry:compactTelemetry(telemetry)};
}
export async function handleRuntimeSignoffV54(req,env,buildVersion='',releaseFingerprint=[]){
 const url=new URL(req.url);if(req.method!=='PUT'||url.pathname!=='/api/settings')return null;const origin=req.headers.get('Origin')||'';if(origin&&!allowedOrigin(req,env))return out(req,env,{error:'Origin tidak diizinkan'},403);
 let body;try{body=await req.clone().json();}catch{return null;}const key=clean(body?.key);
 if(key==='UAT_RELEASE.runtime_snapshot'){const u=await auth(req,env);return out(req,env,{error:u?'Runtime snapshot adalah evidence system-managed dan tidak dapat diubah manual':'Silakan login kembali'},u?403:401);}
 if(key!=='UAT_RELEASE.signoff')return null;
 const value=typeof body.value==='string'?(()=>{try{return JSON.parse(body.value)}catch{return {}}})():body.value||{};if(clean(value.status)!=='passed')return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);if(u.role!=='superadmin')return out(req,env,{error:'Final sign-off hanya dapat disahkan oleh Superadmin'},403);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);
 try{
  const health=await runtimeSnapshot(env);if(!health.ready)return out(req,env,{error:'Final UAT belum dapat dinyatakan Lulus karena runtime consistency belum hijau',blockers:health.blockers,workflow_health:health.workflow,mirror_health:health.mirror,runtime_invariants:health.runtime_invariants,work_calendar:health.work_calendar,storage_health:health.storage,active_telemetry:health.telemetry},409);
  const capturedAt=new Date().toISOString(),snapshot={captured_at:capturedAt,signoff_status:'passed',signed_by:{id:u.id,name:u.name,username:u.username},build:{version:clean(buildVersion)||null,release_fingerprint:Array.isArray(releaseFingerprint)?releaseFingerprint:[]},ready:true,blockers:[],workflow:health.workflow,mirror:health.mirror,runtime_invariants:health.runtime_invariants,work_calendar:health.work_calendar,storage:health.storage,telemetry:health.telemetry},signoffKey='UAT_RELEASE.signoff',snapshotKey='UAT_RELEASE.runtime_snapshot',oldSignoff=await one(env.DB,'SELECT * FROM settings WHERE key=?',signoffKey),oldSnapshot=await one(env.DB,'SELECT * FROM settings WHERE key=?',snapshotKey);
  await env.DB.batch([
   env.DB.prepare("INSERT INTO settings(key,value,department) VALUES(?,?,'PROJECT') ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(signoffKey,JSON.stringify(value)),
   env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(uid(),u.id,'config.save',signoffKey,oldSignoff?JSON.stringify(oldSignoff):null,JSON.stringify(value)),
   env.DB.prepare("INSERT INTO settings(key,value,department) VALUES(?,?,'PROJECT') ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(snapshotKey,JSON.stringify(snapshot)),
   env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(uid(),u.id,'release.signoff.snapshot',snapshotKey,oldSnapshot?JSON.stringify(oldSnapshot):null,JSON.stringify(snapshot))
  ]);
  return out(req,env,{ok:true,runtime_ready:true,snapshot_key:snapshotKey,captured_at:capturedAt,build_version:snapshot.build.version});
 }catch(error){return out(req,env,{error:'Final UAT tidak dapat disahkan karena runtime consistency/evidence tidak dapat diverifikasi atau disimpan',detail:clean(error?.message||error)},503);}
}
export const RuntimeSignoffV54={runtimeSnapshot};
