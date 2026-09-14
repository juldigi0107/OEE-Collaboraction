const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const J=(v,f={})=>{try{return JSON.parse(v||'{}')}catch{return f}};
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,v,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
function redact(value,key=''){
 if(/password|hash|salt|token|secret|credential|authorization|api[_-]?key/i.test(key))return '[disamarkan]';
 if(Array.isArray(value))return value.map(v=>redact(v,key));
 if(value&&typeof value==='object'){const o={};for(const [k,v] of Object.entries(value))o[k]=redact(v,k);return o;}
 return value;
}
async function count(db,table,where='1=1'){try{return Number((await one(db,`SELECT COUNT(*) n FROM ${table} WHERE ${where}`))?.n||0)}catch{return null}}
async function tableCounts(db){
 const specs=[['users','users','active=1'],['sources','sources'],['sheets','sheets'],['record_chunks','record_chunks'],['entries','entries','deleted=0'],['source_files','source_files'],['audit','audit'],['machine_registry','machine_registry','active=1'],['production_runs','production_runs'],['downtime_events','downtime_events'],['maintenance_calls','maintenance_calls'],['quality_events','quality_events'],['approvals','approvals']];
 const rows=[];for(const [key,table,where] of specs)rows.push({key,count:await count(db,table,where||'1=1')});return rows;
}
function selectedSetting(key){return /^(DATA_GOVERNANCE\.|UAT_RELEASE\.|RELEASE_READINESS\.|DISPLAY_LAYOUT\.|brand$)/.test(key);}
export async function handleSupportV21(req,env,buildVersion){
 const path=new URL(req.url).pathname;if(req.method!=='GET'||path!=='/api/release-manifest')return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(u.role!=='superadmin')return out(req,env,{error:'Release Manifest khusus Superadmin'},403);
 const settingsRaw=await all(env.DB,'SELECT key,value,department FROM settings ORDER BY key'),settings=settingsRaw.filter(x=>selectedSetting(x.key)).map(x=>{const parsed=J(x.value,x.value);return {key:x.key,department:x.department,value:redact(parsed,x.key)}});
 const integrations=(await all(env.DB,'SELECT id,system,mode,enabled,poll_minutes,last_sync,last_status,last_message FROM integration_connections ORDER BY system')).map(x=>({...x,enabled:!!x.enabled}));
 const sources=(await all(env.DB,'SELECT id,name,path,department,kind,sha256,bytes FROM sources ORDER BY department,name')).map(x=>({...x,path:x.path?String(x.path).split(/[\\/]/).pop():null}));
 const activeUsers=await all(env.DB,"SELECT role,department,COUNT(*) count FROM users WHERE active=1 GROUP BY role,department ORDER BY role,department");
 const pendingApprovals=await count(env.DB,'approvals',"status='PENDING'"),openDowntime=await count(env.DB,'downtime_events',"status='OPEN'"),openMaintenance=await count(env.DB,'maintenance_calls',"status<>'CLOSED'");
 const governance=settings.filter(x=>x.key.startsWith('DATA_GOVERNANCE.')).map(x=>({key:x.key,approved:x.value?.approved===true,updated_at:x.value?.updated_at||null}));
 const uat=settings.filter(x=>x.key.startsWith('UAT_RELEASE.')).map(x=>({key:x.key,status:x.value?.status||'not_started',owner:x.value?.owner||'',evidence_present:!!String(x.value?.evidence||'').trim(),updated_at:x.value?.updated_at||null}));
 return out(req,env,{
  manifest_type:'configuration_and_release_manifest',
  disclaimer:'Manifest ini bukan full backup D1 dan tidak dapat menggantikan prosedur export/restore database Cloudflare.',
  generated_at:new Date().toISOString(),service:'OEE Collaboraction',build_version:buildVersion,storage:'D1-only',r2:false,
  runtime:{database_binding:'DB',schema:'ready',frontend_assets:'Worker assets + GitHub Pages'},
  operational:{pending_approvals:pendingApprovals,open_downtime:openDowntime,open_maintenance_calls:openMaintenance},
  table_counts:await tableCounts(env.DB),governance,uat,active_users:activeUsers,integrations,sources,settings
 });
}
