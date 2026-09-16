const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const parse=(v,f=[])=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const cleanCode=v=>clean(v).toUpperCase().replace(/[^A-Z0-9_.-]/g,'').slice(0,64);
const matchCode=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const json=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
const out=(req,env,message,status=409)=>json(req,env,{error:message},status);
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&parse(u.permissions,[]).includes(action));
const fresh=v=>{const t=Date.parse(v||''),age=Date.now()-t;return Number.isFinite(t)&&age>=0&&age<180000;};
const externalSource=v=>{const s=clean(v).toLowerCase();return !!s&&!s.startsWith('hmi');};
const heartbeatAge=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/1000)):null;};
async function canonicalMachine(env,raw){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.machine_aliases'"),cfg=parse(row?.value,{}),input=matchCode(raw);if(cfg?.approved===true&&input){for(const item of cfg.items||[]){for(const code of [item?.canonical,...(Array.isArray(item?.aliases)?item.aliases:[])])if(matchCode(code)===input)return cleanCode(item.canonical);}}return cleanCode(raw);}
export async function telemetryHealthV61(env){
 const rows=await all(env.DB,"SELECT m.id machine_id,m.code,m.heartbeat_at,m.source_type,pr.id run_id,pr.pro,COALESCE(pr.counter_start_trusted,0) counter_start_trusted FROM machine_registry m LEFT JOIN production_runs pr ON pr.machine_id=m.id AND pr.status='RUNNING' WHERE m.active=1 ORDER BY m.code"),machines=rows.map(r=>{const isFresh=fresh(r.heartbeat_at),external=externalSource(r.source_type),trusted=isFresh&&external,startTrusted=Number(r.counter_start_trusted||0)===1;return {machine_id:r.machine_id,code:r.code,heartbeat_at:r.heartbeat_at||null,heartbeat_age_seconds:heartbeatAge(r.heartbeat_at),source_type:r.source_type||'',fresh:isFresh,external_source:external,telemetry_trusted:trusted,run_id:r.run_id||null,pro:r.pro||null,counter_start_trusted:startTrusted,auto_counter_finish_ready:!!r.run_id&&trusted&&startTrusted};}),active=machines.filter(x=>x.run_id),issues=active.filter(x=>!x.telemetry_trusted);
 return {generated_at:new Date().toISOString(),freshness_seconds:180,ready:issues.length===0,running_runs:active.length,issues:issues.length,machines};
}
export async function captureTelemetryStartV61(req,env){
 const path=new URL(req.url).pathname;if(req.method!=='POST'||path!=='/api/shopfloor/start')return null;
 const u=await auth(req,env);if(!u||!allow(u,'PROD','create'))return null;const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return null;
 let body;try{body=await req.clone().json();}catch{return null;}const code=await canonicalMachine(env,body?.machine);if(!code)return {code:'',trusted:false};
 const row=await one(env.DB,'SELECT m.heartbeat_at,m.source_type,s.counter FROM machine_registry m LEFT JOIN machine_state s ON s.machine_id=m.id WHERE m.code=?',code),counter=Number(row?.counter),trusted=!!row&&fresh(row.heartbeat_at)&&externalSource(row.source_type)&&Number.isFinite(counter);return {code,trusted,counter:trusted?counter:null,captured_at:new Date().toISOString()};
}
export async function afterTelemetryStartV61(signal,response,env){
 if(!signal||!response?.ok)return;let data;try{data=await response.clone().json();}catch{return;}const id=clean(data?.id);if(!id)return;await env.DB.prepare("UPDATE production_runs SET counter_start_trusted=? WHERE id=? AND status='RUNNING'").bind(signal.trusted?1:0,id).run();
}
async function telemetryStatus(req,env){
 const u=await auth(req,env);if(!u)return out(req,env,'Silakan login kembali',401);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return out(req,env,'Ganti password awal terlebih dahulu',403);
 return json(req,env,await telemetryHealthV61(env));
}
export async function handleTelemetryFreshnessV61(req,env){
 const path=new URL(req.url).pathname;if(req.method==='GET'&&path==='/api/telemetry-status')return telemetryStatus(req,env);if(req.method!=='POST'||path!=='/api/shopfloor/finish')return null;
 const u=await auth(req,env);if(!u||!allow(u,'PROD','update'))return null;
 let b;try{b=await req.clone().json();}catch{return null;}
 const raw=b?.actual_qty,manual=raw!==undefined&&raw!==null&&clean(raw)!=='';
 if(raw!==undefined&&!manual)return out(req,env,'Actual Qty kosong tidak boleh dikirim sebagai nilai 0. Isi angka aktual atau kosongkan field agar aturan counter dapat diperiksa.',400);
 if(manual)return null;
 const run=await one(env.DB,"SELECT pr.id,pr.machine_id,pr.counter_start_trusted,m.heartbeat_at,m.source_type FROM production_runs pr JOIN machine_registry m ON m.id=pr.machine_id WHERE pr.id=? AND pr.status='RUNNING'",clean(b?.run_id));if(!run)return null;
 const startTrusted=Number(run.counter_start_trusted||0)===1,endTrusted=fresh(run.heartbeat_at)&&externalSource(run.source_type);
 if(startTrusted&&endTrusted)return null;
 const reason=!startTrusted?'counter awal PRO tidak berasal dari telemetry fresh/external':'telemetry akhir tidak fresh/external';
 return out(req,env,`Actual Qty wajib diisi manual karena ${reason}. Aplikasi tidak menurunkan hasil produksi dari selisih counter yang lineage-nya tidak authoritative.`,409);
}
export const TelemetryFreshnessV61={fresh,externalSource,canonicalMachine};
