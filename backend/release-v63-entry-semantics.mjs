const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=(v,f=[])=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,message,status=400)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&parse(u.permissions,[]).includes(action));
function validateDevelopment(payload){const p=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};if(p.cost===undefined||p.cost===null||clean(p.cost)==='')return null;const cost=Number(p.cost);if(!Number.isFinite(cost)||cost<0)return 'Biaya aktual Development harus berupa angka tidak negatif';const currency=clean(p.currency).toUpperCase();if(!currency)return 'Mata uang wajib diisi bila Biaya aktual Development diisi';if(!/^[A-Z]{3}$/.test(currency))return 'Mata uang Development harus memakai kode 3 huruf, misalnya IDR atau USD';return null;}
export async function handleEntrySemanticsV63(req,env){
 const path=new URL(req.url).pathname;if(!['POST','PUT'].includes(req.method))return null;
 let body;try{body=await req.clone().json();}catch{return null;}
 if(req.method==='POST'&&path==='/api/entries'){
  if(body?.module!=='development')return null;const u=await auth(req,env);if(!u||!allow(u,'PDS','create'))return null;const error=validateDevelopment(body.payload);return error?out(req,env,error):null;
 }
 if(req.method==='PUT'&&path.startsWith('/api/entries/')){
  const u=await auth(req,env);if(!u)return null;let id='';try{id=decodeURIComponent(path.slice('/api/entries/'.length));}catch{id=path.slice('/api/entries/'.length);}const row=await one(env.DB,'SELECT module,department FROM entries WHERE id=? AND deleted=0',id);if(!row||row.module!=='development'||!allow(u,row.department||'PDS','update'))return null;const error=validateDevelopment(body.payload);return error?out(req,env,error):null;
 }
 return null;
}
export const EntrySemanticsV63={validateDevelopment};
