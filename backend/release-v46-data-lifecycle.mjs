import {handleSupportV21} from './release-v21-support.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function safeStat(db,sql,...args){try{return await one(db,sql,...args)||{};}catch{return {};}}
export async function storageHealthV46(env){
 const now=Date.now(),staleLoginBefore=now-86400000;
 const [sessions,attempts,snapshots,events,logs,audit,runs,quality]=await Promise.all([
  safeStat(env.DB,'SELECT COUNT(*) total,SUM(CASE WHEN expires<=? THEN 1 ELSE 0 END) expired,MIN(expires) oldest_expiry FROM sessions',now),
  safeStat(env.DB,'SELECT COUNT(*) total,SUM(CASE WHEN until_ts<? THEN 1 ELSE 0 END) stale,MIN(until_ts) oldest_until FROM login_attempts',staleLoginBefore),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(bucket_ts) oldest,MAX(bucket_ts) newest FROM machine_minute_snapshot'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(event_ts) oldest,MAX(event_ts) newest FROM machine_events'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(started_ts) oldest,MAX(started_ts) newest FROM integration_sync_log'),
  safeStat(env.DB,'SELECT COUNT(*) total FROM audit'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(start_ts) oldest,MAX(COALESCE(end_ts,start_ts)) newest FROM production_runs'),
  safeStat(env.DB,'SELECT COUNT(*) total,MIN(created_ts) oldest,MAX(created_ts) newest FROM quality_events')
 ]);
 return {
  generated_at:new Date().toISOString(),
  policy:{ephemeral:'auto_cleanup',operational:'monitor_only',business_history:'no_automatic_delete'},
  ephemeral:{sessions:{total:Number(sessions.total||0),expired:Number(sessions.expired||0)},login_attempts:{total:Number(attempts.total||0),stale:Number(attempts.stale||0),stale_after_hours:24}},
  growth:[
   {table:'machine_minute_snapshot',label:'Minute snapshot mesin',count:Number(snapshots.total||0),oldest:snapshots.oldest||null,newest:snapshots.newest||null,retention:'monitor_only'},
   {table:'machine_events',label:'Machine event',count:Number(events.total||0),oldest:events.oldest||null,newest:events.newest||null,retention:'monitor_only'},
   {table:'integration_sync_log',label:'Log sinkronisasi',count:Number(logs.total||0),oldest:logs.oldest||null,newest:logs.newest||null,retention:'monitor_only'},
   {table:'audit',label:'Audit trail',count:Number(audit.total||0),oldest:null,newest:null,retention:'preserve'},
   {table:'production_runs',label:'Production run',count:Number(runs.total||0),oldest:runs.oldest||null,newest:runs.newest||null,retention:'preserve'},
   {table:'quality_events',label:'Quality event',count:Number(quality.total||0),oldest:quality.oldest||null,newest:quality.newest||null,retention:'preserve'}
  ],
  note:'Data operasional dan audit tidak dihapus otomatis. Tetapkan retention policy resmi sebelum mengaktifkan purge historis.'
 };
}
export async function runLifecycleHousekeepingV46(env){
 const now=Date.now(),staleLoginBefore=now-86400000;
 await env.DB.batch([
  env.DB.prepare('DELETE FROM sessions WHERE expires<=?').bind(now),
  env.DB.prepare('DELETE FROM login_attempts WHERE until_ts<?').bind(staleLoginBefore)
 ]);
}
function responseFrom(base,body){const headers=new Headers(base.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.set('Cache-Control','no-store');return new Response(JSON.stringify(body),{status:base.status,headers});}
export async function handleDataLifecycleV46(req,env,buildVersion,releaseFingerprint=[]){
 const path=new URL(req.url).pathname;if(req.method!=='GET'||!['/api/storage-health','/api/release-manifest'].includes(path))return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(u.role!=='superadmin')return out(req,env,{error:'Storage Health khusus Superadmin'},403);
 if(path==='/api/storage-health')return out(req,env,await storageHealthV46(env));
 const base=await handleSupportV21(req,env,buildVersion,releaseFingerprint);if(!base||!base.ok)return base;let body;try{body=await base.clone().json();}catch{return base;}body.storage_health=await storageHealthV46(env);return responseFrom(base,body);
}
