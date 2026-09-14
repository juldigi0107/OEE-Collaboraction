const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const J=(v,f=[])=>{try{return JSON.parse(v||'[]')}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,status,error)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&J(u.permissions).includes(action));
export async function handleHmiSafetyV40(req,env){
 if(req.method!=='POST')return null;const path=new URL(req.url).pathname;if(!['/api/shopfloor/quality','/api/shopfloor/maintenance/call'].includes(path))return null;
 const u=await auth(req,env);if(!u)return null;let body;try{body=await req.clone().json();}catch{return null;}
 if(path==='/api/shopfloor/quality'){
  if(!allow(u,'QC','create')&&!allow(u,'PROD','create'))return null;
  const events=new Set(['NG','QC_SAMPLE','RECHECK']),decisions=new Set(['HOLD','RELEASE','REWORK','REJECT']),event=clean(body.event_type||'NG').toUpperCase(),decision=clean(body.decision).toUpperCase();
  if(!events.has(event))return out(req,env,400,'Jenis Quality Event tidak valid');
  if(decision&&!decisions.has(decision))return out(req,env,400,'Keputusan Quality Event tidak valid');
  if(clean(body.note).length>1000)return out(req,env,400,'Catatan Quality Event terlalu panjang');
 }
 if(path==='/api/shopfloor/maintenance/call'){
  if(!allow(u,'PROD','create')&&!allow(u,'MTC','create'))return null;
  const priorities=new Set(['LOW','MEDIUM','HIGH','CRITICAL']),priority=clean(body.priority||'HIGH').toUpperCase(),note=clean(body.note);
  if(!priorities.has(priority))return out(req,env,400,'Prioritas Maintenance Call tidak valid');
  if(note.length<5)return out(req,env,400,'Gejala / alasan Maintenance Call wajib dijelaskan minimal 5 karakter');
  if(note.length>1000)return out(req,env,400,'Catatan Maintenance Call terlalu panjang');
 }
 return null;
}
