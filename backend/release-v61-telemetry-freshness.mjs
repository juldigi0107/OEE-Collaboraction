const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=(v,f=[])=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,message,status=409)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&parse(u.permissions,[]).includes(action));
const fresh=v=>{const t=Date.parse(v||'');return Number.isFinite(t)&&Date.now()-t>=0&&Date.now()-t<180000;};
const externalSource=v=>{const s=clean(v).toLowerCase();return !!s&&!s.startsWith('hmi');};
export async function handleTelemetryFreshnessV61(req,env){
 const path=new URL(req.url).pathname;if(req.method!=='POST'||path!=='/api/shopfloor/finish')return null;
 const u=await auth(req,env);if(!u||!allow(u,'PROD','update'))return null;
 let b;try{b=await req.clone().json();}catch{return null;}
 const raw=b?.actual_qty,manual=raw!==undefined&&raw!==null&&clean(raw)!=='';
 if(raw!==undefined&&!manual)return out(req,env,'Actual Qty kosong tidak boleh dikirim sebagai nilai 0. Isi angka aktual atau kosongkan field agar aturan counter dapat diperiksa.',400);
 if(manual)return null;
 const run=await one(env.DB,"SELECT pr.id,pr.machine_id,m.heartbeat_at,m.source_type,s.source state_source FROM production_runs pr JOIN machine_registry m ON m.id=pr.machine_id LEFT JOIN machine_state s ON s.machine_id=pr.machine_id WHERE pr.id=? AND pr.status='RUNNING'",clean(b?.run_id));if(!run)return null;
 const trusted=fresh(run.heartbeat_at)&&externalSource(run.source_type)&&externalSource(run.state_source);
 if(trusted)return null;
 return out(req,env,'Counter mesin tidak fresh/authoritative. Isi Actual Qty manual sebelum Finish PRO; aplikasi tidak akan menurunkan hasil dari counter stale.',409);
}
export const TelemetryFreshnessV61={fresh,externalSource};
