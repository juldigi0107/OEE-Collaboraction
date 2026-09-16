import {workflowHealthV51} from './release-v51-workflow-reconciliation.mjs';
import {mirrorHealthV52} from './release-v52-mirror-reconciliation.mjs';
import {runtimeInvariantHealthV55} from './release-v55-runtime-invariants.mjs';
import {storageHealthV46} from './release-v46-data-lifecycle.mjs';
import {TelemetryFreshnessV61} from './release-v61-telemetry-freshness.mjs';
import {WorkCalendarV62} from './release-v62-work-calendar.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const clean=v=>String(v??'').trim();
const parse=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function workCalendarHealth(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.shift_calendar'");return WorkCalendarV62.deriveContext(parse(row?.value,{}));}
async function activeTelemetryHealth(env){
 const rows=await all(env.DB,"SELECT pr.id run_id,pr.pro,m.code,m.heartbeat_at,m.source_type FROM production_runs pr JOIN machine_registry m ON m.id=pr.machine_id WHERE pr.status='RUNNING' ORDER BY m.code");
 const issues=rows.filter(r=>!TelemetryFreshnessV61.fresh(r.heartbeat_at)||!TelemetryFreshnessV61.externalSource(r.source_type));
 return {ready:issues.length===0,running_runs:rows.length,issues:issues.length,machines:issues.map(r=>({run_id:r.run_id,pro:r.pro||null,machine:r.code||null,heartbeat_at:r.heartbeat_at||null,source_type:r.source_type||null,reason:!TelemetryFreshnessV61.fresh(r.heartbeat_at)?'heartbeat_stale_or_missing':'source_not_external'}))};
}
export async function handleRuntimeSignoffV54(req,env){
 const url=new URL(req.url);if(req.method!=='PUT'||url.pathname!=='/api/settings')return null;
 let body;try{body=await req.clone().json();}catch{return null;}
 if(clean(body?.key)!=='UAT_RELEASE.signoff')return null;
 const value=typeof body.value==='string'?(()=>{try{return JSON.parse(body.value)}catch{return {}}})():body.value||{};if(clean(value.status)!=='passed')return null;
 const u=await auth(req,env);if(!u||u.role!=='superadmin')return null;
 try{
  const [workflow,mirror,invariants,workCalendar,storage,telemetry]=await Promise.all([workflowHealthV51(env),mirrorHealthV52(env),runtimeInvariantHealthV55(env),workCalendarHealth(env),storageHealthV46(env),activeTelemetryHealth(env)]),blockers=[];
  if(workflow?.ready!==true)blockers.push(`Workflow: ${Number(workflow?.lineage_mismatches||0)} mismatch, ${Number(workflow?.orphaned_plan_links||0)} orphan plan link`);
  if(mirror?.ready!==true)blockers.push(`Mirror: ${Number(mirror?.missing_mirrors||0)} missing, ${Number(mirror?.stale_mirrors||0)} stale`);
  if(invariants?.ready!==true)blockers.push(`Shopfloor invariant: ${Number(invariants?.issues||0)} issue (${Number(invariants?.duplicate_running_runs||0)} duplicate run, ${Number(invariants?.duplicate_open_downtime||0)} duplicate downtime, ${Number(invariants?.run_state_mismatches||0)+Number(invariants?.downtime_state_mismatches||0)+Number(invariants?.orphan_hmi_states||0)} state mismatch)`);
  if(workCalendar?.runtime_ready!==true)blockers.push(`Work Calendar: ${clean(workCalendar?.reason)||'baseline kalender shift belum runtime-ready'}`);
  if(storage?.capacity?.available===true&&storage.capacity.status==='critical')blockers.push(`D1 Capacity: pemakaian sudah mencapai soft budget aplikasi (${Math.round(Number(storage.capacity.soft_budget_usage_ratio||0)*100)}%)`);
  if(telemetry?.ready!==true)blockers.push(`Telemetry: ${Number(telemetry?.issues||0)} PRO aktif tidak memiliki heartbeat fresh dari source external`);
  if(blockers.length)return out(req,env,{error:'Final UAT belum dapat dinyatakan Lulus karena runtime consistency belum hijau',blockers,workflow_health:workflow,mirror_health:mirror,runtime_invariants:invariants,work_calendar:workCalendar,storage_health:storage,active_telemetry:telemetry},409);
  return null;
 }catch(error){return out(req,env,{error:'Final UAT tidak dapat disahkan karena runtime consistency tidak dapat diverifikasi',detail:clean(error?.message||error)},503);}
}
