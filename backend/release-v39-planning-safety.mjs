const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const J=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,status,error)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department==='PPIC'&&J(u.permissions,[]).includes(action));
function validateReleased(p){if(clean(p?.status)!=='Released')return '';for(const k of ['pro','machine','material','date'])if(!clean(p?.[k]))return `Planning Released wajib memiliki ${k}`;const target=Number(p?.target);if(!Number.isFinite(target)||target<=0)return 'Planning Released wajib memiliki Target Qty lebih dari nol';return '';}
export async function handlePlanningSafetyV39(req,env){
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(method==='POST'&&path==='/api/entries'){
  let body;try{body=await req.clone().json();}catch{return null;}if(body?.module!=='planning')return null;const u=await auth(req,env);if(!u||!allow(u,'create'))return null;const error=validateReleased(body.payload);return error?out(req,env,400,error):null;
 }
 if(method==='PUT'&&path.startsWith('/api/entries/')){
  const id=decodeURIComponent(path.slice('/api/entries/'.length)),entry=await one(env.DB,'SELECT module,department FROM entries WHERE id=? AND deleted=0',id);if(!entry||entry.module!=='planning')return null;const u=await auth(req,env);if(!u||!allow(u,'update'))return null;let body;try{body=await req.clone().json();}catch{return null;}const error=validateReleased(body.payload);return error?out(req,env,400,error):null;
 }
 return null;
}
