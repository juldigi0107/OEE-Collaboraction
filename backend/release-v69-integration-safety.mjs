const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const uid=()=>crypto.randomUUID();
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const response=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
const out=(req,env,status,error)=>response(req,env,{error},status);
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const modes=new Set(['REST','ODATA','EDGE_PUSH','PULL_FEED']);
const targets=new Set(['machine_events','planning','analytics_feed']);
function privateHost(host){const h=clean(host).toLowerCase().replace(/^\[|\]$/g,'');if(!h)return true;if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h==='::1'||h.startsWith('fe80:')||h.startsWith('fc')||h.startsWith('fd'))return true;const m=h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);if(!m)return false;const a=m.slice(1).map(Number);if(a.some(x=>x<0||x>255))return true;const [x,y]=a;return x===0||x===10||x===127||(x===100&&y>=64&&y<=127)||(x===169&&y===254)||(x===172&&y>=16&&y<=31)||(x===192&&y===168)||x>=224;}
function safeUrl(raw){const text=clean(raw);if(!text)return {ok:false,error:'Base URL wajib diisi untuk koneksi REST/ODATA'};let url;try{url=new URL(text);}catch{return {ok:false,error:'Base URL integrasi tidak valid'};}if(url.protocol!=='https:')return {ok:false,error:'Base URL integrasi production wajib menggunakan HTTPS'};if(url.username||url.password)return {ok:false,error:'Credential tidak boleh ditanam pada URL; gunakan Worker Secret reference'};if(privateHost(url.hostname))return {ok:false,error:'Base URL localhost/private/link-local tidak diizinkan dari Worker production; gunakan Edge Gateway atau endpoint HTTPS yang dapat diverifikasi'};if(!url.hostname.includes('.'))return {ok:false,error:'Hostname integrasi harus berupa host HTTPS yang lengkap'};return {ok:true,url};}
function validateMapping(mapping){if(mapping===undefined)return '';if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))return 'Mapping integrasi harus berupa object';const rows=Object.entries(mapping);if(rows.length>50)return 'Mapping integrasi melebihi batas 50 field';for(const [to,from] of rows){if(!/^[A-Za-z0-9_.-]{1,64}$/.test(clean(to)))return `Nama field mapping tidak valid: ${to}`;if(typeof from!=='string'||!clean(from)||clean(from).length>256)return `Path sumber mapping ${to} tidak valid`;}return '';}
function validateConfig(connection,{forExecution=false}={}){
 const c=connection||{},mode=clean(c.mode).toUpperCase(),poll=Number(c.poll_minutes),cfg=parse(c.config,{}),target=clean(cfg.target);
 if(!modes.has(mode))return 'Mode integrasi harus REST, ODATA, EDGE_PUSH, atau PULL_FEED';
 if(!Number.isInteger(poll)||poll<1||poll>1440)return 'Interval polling harus bilangan bulat 1–1440 menit';
 if(c.secret_env&&!/^[A-Z][A-Z0-9_]{1,63}$/.test(clean(c.secret_env)))return 'Worker Secret reference harus berupa nama environment variable uppercase, misalnya SAP_API_TOKEN';
 if(!cfg||typeof cfg!=='object'||Array.isArray(cfg))return 'Config integrasi harus berupa object';
 if(!targets.has(target))return 'Target integrasi harus machine_events, planning, atau analytics_feed';
 if(mode==='EDGE_PUSH'&&target!=='machine_events')return 'EDGE_PUSH hanya boleh menargetkan machine_events';
 if(mode==='PULL_FEED'&&target!=='analytics_feed')return 'PULL_FEED hanya boleh menargetkan analytics_feed';
 if(['REST','ODATA'].includes(mode)&&(c.enabled||forExecution)){const check=safeUrl(c.base_url);if(!check.ok)return check.error;}
 if(['EDGE_PUSH','PULL_FEED'].includes(mode)&&clean(c.base_url))return `${mode} tidak menggunakan Base URL pada Worker; kosongkan Base URL untuk menghindari konfigurasi yang menyesatkan`;
 if(cfg.items_path!==undefined&&(typeof cfg.items_path!=='string'||clean(cfg.items_path).length>256))return 'items_path integrasi tidak valid';
 if(cfg.auth_header!==undefined&&!/^[A-Za-z0-9-]{1,64}$/.test(clean(cfg.auth_header)))return 'Nama auth header integrasi tidak valid';
 if(cfg.auth_prefix!==undefined&&(typeof cfg.auth_prefix!=='string'||cfg.auth_prefix.length>64))return 'Auth prefix integrasi terlalu panjang';
 const mappingProblem=validateMapping(cfg.mapping);if(mappingProblem)return mappingProblem;
 const serialized=JSON.stringify(cfg);if(serialized.length>32768)return 'Config integrasi melebihi batas 32 KB';
 return '';
}
async function passwordBlocked(env,u){return !!(await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id))?.must_change;}
async function saveIntegration(req,env,u,old,candidate){
 const signoffRow=await one(env.DB,"SELECT * FROM settings WHERE key='UAT_RELEASE.signoff'"),signoff=parse(signoffRow?.value,{}),invalidates=clean(signoff.status)==='passed',config=typeof candidate.config==='string'?candidate.config:JSON.stringify(candidate.config||{}),after={id:old.id,system:old.system,mode:candidate.mode,base_url:candidate.base_url||null,secret_env:candidate.secret_env||null,enabled:Number(candidate.enabled||0),poll_minutes:Number(candidate.poll_minutes),config:parse(config,{})},statements=[
  env.DB.prepare('UPDATE integration_connections SET mode=?,base_url=?,secret_env=?,enabled=?,poll_minutes=?,config=? WHERE id=?').bind(candidate.mode,candidate.base_url||null,candidate.secret_env||null,Number(candidate.enabled||0),Number(candidate.poll_minutes),config,old.id),
  env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(uid(),u.id,'integration.config.save',old.id,JSON.stringify({...old,config:parse(old.config,{})}),JSON.stringify(after))
 ];
 let staleReason=null;if(invalidates){const stamp=new Date().toISOString(),next={...signoff,status:'in_progress',previous_signoff_status:'passed',stale_at:stamp,stale_reason:`Konfigurasi integrasi ${old.system||old.id} berubah setelah Final Sign-off; gate Integrasi & Hardware dan sign-off ulang wajib diverifikasi.`,updated_at:stamp};staleReason=next.stale_reason;statements.push(env.DB.prepare("INSERT INTO settings(key,value,department) VALUES('UAT_RELEASE.signoff',?,'PROJECT') ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(next)),env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(uid(),u.id,'release.signoff.invalidated','UAT_RELEASE.signoff',signoffRow?JSON.stringify(signoffRow):null,JSON.stringify(next)));}
 await env.DB.batch(statements);return response(req,env,{ok:true,signoff_invalidated:invalidates,stale_reason:staleReason});
}
export async function handleIntegrationSafetyV69(req,env){
 const path=new URL(req.url).pathname;if(!['/api/integrations','/api/integrations/test','/api/integrations/sync'].includes(path))return null;if(!((req.method==='PUT'&&path==='/api/integrations')||(req.method==='POST'&&path!=='/api/integrations')))return null;const origin=req.headers.get('Origin')||'';if(origin&&!allowedOrigin(req,env))return out(req,env,403,'Origin tidak diizinkan');
 const u=await auth(req,env);if(!u)return out(req,env,401,'Silakan login kembali');if(await passwordBlocked(env,u))return out(req,env,403,'Ganti password awal terlebih dahulu');if(u.role!=='superadmin')return out(req,env,403,'Konfigurasi integrasi hanya tersedia untuk Superadmin');
 let body;try{body=await req.clone().json();}catch{return out(req,env,400,'Payload integrasi tidak valid');}const id=clean(body?.id);if(!id)return out(req,env,400,'Koneksi integrasi wajib dipilih');const old=await one(env.DB,'SELECT * FROM integration_connections WHERE id=?',id);if(!old)return out(req,env,404,'Koneksi integrasi tidak ditemukan');
 let candidate={...old};if(req.method==='PUT'){candidate={...old,mode:clean(body.mode||old.mode).toUpperCase(),base_url:body.base_url!==undefined?clean(body.base_url):old.base_url,secret_env:body.secret_env!==undefined?clean(body.secret_env):old.secret_env,enabled:body.enabled?1:0,poll_minutes:body.poll_minutes!==undefined?Number(body.poll_minutes):Number(old.poll_minutes),config:typeof body.config==='object'?body.config:parse(old.config,{})};}
 const problem=validateConfig(candidate,{forExecution:req.method==='POST'});if(problem)return out(req,env,400,problem);if(req.method==='PUT')return saveIntegration(req,env,u,old,candidate);return null;
}
export const IntegrationSafetyV69={safeUrl,privateHost,validateConfig,validateMapping};
