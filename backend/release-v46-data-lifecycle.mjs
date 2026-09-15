import {handleSupportV21} from './release-v21-support.mjs';
import {workflowHealthV51} from './release-v51-workflow-reconciliation.mjs';
import {mirrorHealthV52} from './release-v52-mirror-reconciliation.mjs';
import {runtimeInvariantHealthV55} from './release-v55-runtime-invariants.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function safeStat(db,sql,...args){try{return await one(db,sql,...args)||{};}catch{return {};}}
async function pragmaNumber(db,name){try{const row=await one(db,`PRAGMA ${name}`);if(!row)return null;const raw=row[name]??Object.values(row)[0],n=Number(raw);return Number.isFinite(n)?n:null;}catch{return null;}}
const MIB=1024*1024,SOFT_BUDGET=450*MIB,ARCHITECTURE_CEILING=500*MIB;
async function capacityHealth(db){
 const [pageCount,pageSize,freePages]=await Promise.all([pragmaNumber(db,'page_count'),pragmaNumber(db,'page_size'),pragmaNumber(db,'freelist_count')]);
 if(pageCount===null||pageSize===null)return {available:false,status:'unknown',soft_budget_bytes:SOFT_BUDGET,architecture_ceiling_bytes:ARCHITECTURE_CEILING,note:'SQLite page metrics tidak tersedia pada runtime ini; kapasitas tetap harus dipantau dari Cloudflare D1.'};
 const free=Math.max(0,freePages||0),allocated=Math.max(0,pageCount*pageSize),active=Math.max(0,(pageCount-free)*pageSize),ratio=SOFT_BUDGET>0?allocated/SOFT_BUDGET:null,status=allocated>=SOFT_BUDGET?'critical':allocated>=SOFT_BUDGET*.85?'warning':'ok';
 return {available:true,status,page_count:pageCount,page_size:pageSize,free_pages:free,allocated_bytes:allocated,active_page_estimate_bytes:active,soft_budget_bytes:SOFT_BUDGET,architecture_ceiling_bytes:ARCHITECTURE_CEILING,soft_budget_usage_ratio:ratio,headroom_to_soft_budget_bytes:Math.max(0,SOFT_BUDGET-allocated),headroom_to_architecture_ceiling_bytes:Math.max(0,ARCHITECTURE_CEILING-allocated),policy:'application_capacity_guard',note:'450 MiB adalah soft-budget aplikasi dan 500 MiB adalah ceiling arsitektur proyek. Ini bukan pembacaan quota plan provider; data bisnis tidak dipurge otomatis.'};
}
export async function storageHealthV46(env){
 const now=Date.now(),staleLoginBefore=now-86400000;
 const [sessions,attempts,pairCodes,displayDevices,snapshots,events,logs,audit,runs,quality,capacity]=await Promise.all([
  safeStat(env.DB,'SELECT COUNT(*) total,SUM(CASE WHEN expires<=? THEN 1 ELSE 0 END) expired,MIN(expires) oldest_expiry FROM sessions',now),
  safeStat(env.DB,'SELECT COUNT(*) total,SUM(CASE WHEN until_ts<? THEN 1 ELSE 0 END) stale,MIN(until_ts) oldest_until FROM login_attempts',staleLoginBefore),
  safeStat(env.DB,'SELECT COUNT(*) total,SUM(CASE WHEN used_ts IS NULL AND expires_ts<=? THEN 1 ELSE 0 END) expired_unused,SUM(CASE WHEN used_ts IS NOT NULL THEN 1 ELSE 0 END) used FROM display_pair_codes',now),
  safeStat(env.DB,'SELECT COUNT(*) total,SUM(CASE WHEN active=1 AND expires_ts>? THEN 1 ELSE 0 END) active,SUM(CASE WHEN active=1 AND expires_ts<=? THEN 1 ELSE 0 END) expired,SUM(CASE WHEN active=0 THEN 1 ELSE 0 END) revoked FROM display_devices',now,now),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(bucket_ts) oldest,MAX(bucket_ts) newest FROM machine_minute_snapshot'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(event_ts) oldest,MAX(event_ts) newest FROM machine_events'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(started_ts) oldest,MAX(started_ts) newest FROM integration_sync_log'),
  safeStat(env.DB,'SELECT COUNT(*) total FROM audit'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(start_ts) oldest,MAX(COALESCE(end_ts,start_ts)) newest FROM production_runs'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(created_ts) oldest,MAX(created_ts) newest FROM quality_events'),
  capacityHealth(env.DB)
 ]);
 return {
  generated_at:new Date().toISOString(),
  policy:{ephemeral:'auto_cleanup',operational:'monitor_only',business_history:'no_automatic_delete'},
  capacity,
  ephemeral:{
   sessions:{total:Number(sessions.total||0),expired:Number(sessions.expired||0)},
   login_attempts:{total:Number(attempts.total||0),stale:Number(attempts.stale||0),stale_after_hours:24},
   display_pair_codes:{total:Number(pairCodes.total||0),expired_unused:Number(pairCodes.expired_unused||0),used:Number(pairCodes.used||0),cleanup_after_days:7}
  },
  display_devices:{total:Number(displayDevices.total||0),active:Number(displayDevices.active||0),expired:Number(displayDevices.expired||0),revoked:Number(displayDevices.revoked||0),retention:'preserve_for_audit'},
  growth:[
   {table:'machine_minute_snapshot',label:'Minute snapshot mesin',count:Number(snapshots.total||0),oldest:snapshots.oldest||null,newest:snapshots.newest||null,retention:'monitor_only'},
   {table:'machine_events',label:'Machine event',count:Number(events.total||0),oldest:events.oldest||null,newest:events.newest||null,retention:'monitor_only'},
   {table:'integration_sync_log',label:'Log sinkronisasi',count:Number(logs.total||0),oldest:logs.oldest||null,newest:logs.newest||null,retention:'monitor_only'},
   {table:'audit',label:'Audit trail',count:Number(audit.total||0),oldest:null,newest:null,retention:'preserve'},
   {table:'production_runs',label:'Production run',count:Number(runs.total||0),oldest:runs.oldest||null,newest:runs.newest||null,retention:'preserve'},
   {table:'quality_events',label:'Quality event',count:Number(quality.total||0),oldest:quality.oldest||null,newest:quality.newest||null,retention:'preserve'}
  ],
  note:'Data operasional, device registration, dan audit tidak dihapus otomatis. Hanya session, rate-limit state, dan pairing code ephemeral yang dibersihkan otomatis.'
 };
}
export async function runLifecycleHousekeepingV46(env){
 const now=Date.now(),staleLoginBefore=now-86400000,pairCodeBefore=now-7*86400000;
 await env.DB.batch([
  env.DB.prepare('DELETE FROM sessions WHERE expires<=?').bind(now),
  env.DB.prepare('DELETE FROM login_attempts WHERE until_ts<?').bind(staleLoginBefore)
 ]);
 try{await env.DB.prepare('DELETE FROM display_pair_codes WHERE (expires_ts<?) OR (used_ts IS NOT NULL AND used_ts<?)').bind(pairCodeBefore,pairCodeBefore).run();}catch(error){console.error('[lifecycle] display pairing cleanup skipped',error);}
}
function responseFrom(base,body){const headers=new Headers(base.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.set('Cache-Control','no-store');return new Response(JSON.stringify(body),{status:base.status,headers});}
export async function handleDataLifecycleV46(req,env,buildVersion,releaseFingerprint=[]){
 const path=new URL(req.url).pathname;if(req.method!=='GET'||!['/api/storage-health','/api/release-manifest'].includes(path))return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(u.role!=='superadmin')return out(req,env,{error:'Storage Health khusus Superadmin'},403);
 if(path==='/api/storage-health')return out(req,env,await storageHealthV46(env));
 const base=await handleSupportV21(req,env,buildVersion,releaseFingerprint);if(!base||!base.ok)return base;let body;try{body=await base.clone().json();}catch{return base;}const [storage,workflow,mirror,invariants]=await Promise.all([storageHealthV46(env),workflowHealthV51(env),mirrorHealthV52(env),runtimeInvariantHealthV55(env)]);body.storage_health=storage;body.workflow_health=workflow;body.mirror_health=mirror;body.runtime_invariants=invariants;body.runtime_ready=workflow.ready===true&&mirror.ready===true&&invariants.ready===true;return responseFrom(base,body);
}
