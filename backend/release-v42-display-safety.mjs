const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const uid=()=>crypto.randomUUID();
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const J=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const response=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
const out=(req,env,status,error)=>response(req,env,{error},status);
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function passwordBlocked(env,u){return !!(await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id))?.must_change;}
const sources=new Set(['dashboard.oee','dashboard.availability','dashboard.performance','dashboard.quality','dashboard.trend','realtime.status','realtime.shift','production.total','production.table','downtime.minutes','quality.reject','maintenance.status','planning.target','system.clock','text.announcement','text.custom']);
const resolutions=new Set(['1920x1080','1366x768','1280x720','1080x1920']);
const departments=new Set(['MTC','QC','PROD','PPIC','PDS','PROJECT']);
function validateLayout(v){
 if(!['draft','published'].includes(clean(v.status)||'draft'))return 'Status layout harus draft atau published';
 if(!clean(v.id)||!clean(v.name))return 'ID dan nama layout wajib diisi';
 if(!resolutions.has(clean(v.resolution)))return 'Resolusi layout tidak didukung';
 const widgets=Array.isArray(v.widgets)?v.widgets:[];if(widgets.length>60)return 'Jumlah widget melebihi batas layout';const ids=new Set();
 for(let i=0;i<widgets.length;i++){const w=widgets[i],n=i+1,id=clean(w?.id),x=Number(w?.x),y=Number(w?.y),width=Number(w?.w),height=Number(w?.h);if(!id)return `Widget ${n}: ID wajib diisi`;if(ids.has(id))return `Widget ${n}: ID duplikat`;ids.add(id);if(!sources.has(clean(w?.source)))return `Widget ${n}: sumber data tidak didukung`;if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<1||height<1||x+width>12||y+height>8)return `Widget ${n}: posisi/ukuran keluar dari grid 12 × 8`;}
 if(v.status==='published'){if(!clean(v.machine))return 'Kode mesin/display wajib diisi sebelum publikasi';if(!widgets.length)return 'Minimal satu widget wajib ada sebelum publikasi';}
 return '';
}
async function canonicalMachineProblem(env,v){
 if(v.status!=='published')return '';
 const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.machine_aliases'"),cfg=J(row?.value,{});if(cfg.approved!==true)return 'Canonical machine/alias harus disahkan pada Data Governance sebelum layout dipublikasikan';
 const canonical=new Set((Array.isArray(cfg.items)?cfg.items:[]).map(x=>norm(x?.canonical)).filter(Boolean));if(!canonical.has(norm(v.machine)))return 'Machine assignment harus memakai canonical machine yang sudah disahkan pada Data Governance';return '';
}
async function saveLayout(req,env,u,key,value,old,department){
 const signoffKey='UAT_RELEASE.signoff',signoffRow=await one(env.DB,'SELECT * FROM settings WHERE key=?',signoffKey),signoff=J(signoffRow?.value,{}),oldLayout=J(old?.value,{}),releaseImpact=clean(signoff.status)==='passed'&&(oldLayout.status==='published'||value.status==='published'),statements=[
  env.DB.prepare('INSERT INTO settings(key,value,department) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value),department),
  env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(uid(),u.id,'config.save',key,old?JSON.stringify(old):null,JSON.stringify(value))
 ];
 let staleReason=null,staleAt=null;if(releaseImpact){staleAt=new Date().toISOString();const label=clean(value.name||oldLayout.name||key.slice('DISPLAY_LAYOUT.'.length)),next={...signoff,status:'in_progress',previous_signoff_status:'passed',stale_at:staleAt,stale_reason:`Published Field Display ${label} berubah setelah Final Sign-off; UAT Field Display dan sign-off ulang wajib diverifikasi.`,updated_at:staleAt};staleReason=next.stale_reason;statements.push(env.DB.prepare("INSERT INTO settings(key,value,department) VALUES(?,?,'PROJECT') ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(signoffKey,JSON.stringify(next)),env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(uid(),u.id,'release.signoff.invalidated',signoffKey,signoffRow?JSON.stringify(signoffRow):null,JSON.stringify(next)));}
 await env.DB.batch(statements);return response(req,env,{ok:true,status:value.status,signoff_invalidated:releaseImpact,stale_at:staleAt,stale_reason:staleReason});
}
export async function handleDisplaySafetyV42(req,env){
 if(req.method!=='PUT'||new URL(req.url).pathname!=='/api/settings')return null;const origin=req.headers.get('Origin')||'';if(origin&&!allowedOrigin(req,env))return out(req,env,403,'Origin tidak diizinkan');let body;try{body=await req.clone().json();}catch{return null;}const key=clean(body?.key);if(!key.startsWith('DISPLAY_LAYOUT.'))return null;const u=await auth(req,env);if(!u)return out(req,env,401,'Silakan login kembali');if(await passwordBlocked(env,u))return out(req,env,403,'Ganti password awal terlebih dahulu');if(u.role!=='superadmin')return out(req,env,403,'Layout Display Mesin hanya dapat dikelola oleh Superadmin');
 const value=J(body.value,{});if(clean(value.id)!==key.slice('DISPLAY_LAYOUT.'.length))return out(req,env,400,'ID layout harus sama dengan key konfigurasi');let problem=validateLayout(value);if(!problem)problem=await canonicalMachineProblem(env,value);if(problem)return out(req,env,400,problem);const old=await one(env.DB,'SELECT * FROM settings WHERE key=?',key),department=clean(old?.department||body?.department||value.department||'PROD').toUpperCase();if(!departments.has(department))return out(req,env,400,'Department layout tidak valid');return saveLayout(req,env,u,key,value,old,department);
}
export const DisplaySafetyV42={validateLayout,canonicalMachineProblem};
