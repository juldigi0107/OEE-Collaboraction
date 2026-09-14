const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const J=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,status,error)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
export async function handleOperationalSafetyV35(req,env){
 if(req.method!=='PUT'||new URL(req.url).pathname!=='/api/settings')return null;
 let body;try{body=await req.clone().json();}catch{return null;}
 if(clean(body?.key)!=='OPERATIONAL_CONTROL.machine_triggers')return null;
 const value=J(body.value,{});if(value.approved!==true)return null;
 const user=await auth(req,env);if(!user)return null;if(user.role!=='superadmin')return out(req,env,403,'Machine Trigger hanya dapat disahkan oleh Superadmin');
 const aliasRow=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.machine_aliases'"),aliases=J(aliasRow?.value,{});
 if(aliases.approved!==true)return out(req,env,400,'Canonical machine/alias harus disahkan sebelum Machine Trigger diaktifkan');
 const canonical=new Set((aliases.items||[]).map(x=>norm(x?.canonical)).filter(Boolean));
 const active=(Array.isArray(value.items)?value.items:[]).filter(x=>x?.enabled!==false),seen=new Set();
 for(let i=0;i<active.length;i++){
  const row=active[i],scope=clean(row.machine_scope),n=i+1;
  if(!scope)return out(req,env,400,`Machine Trigger baris ${n}: machine scope wajib diisi`);
  if(scope!=='*'&&!canonical.has(norm(scope)))return out(req,env,400,`Machine Trigger baris ${n}: machine scope ${scope} bukan canonical machine yang disahkan`);
  const key=[norm(scope),norm(row.rule_name),clean(row.source_tag),clean(row.operator),clean(row.compare_value)].join('|');
  if(seen.has(key))return out(req,env,400,`Machine Trigger baris ${n}: rule duplikat pada scope yang sama`);seen.add(key);
 }
 return null;
}
