const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const modules=new Set(['confirmation','planning','production','downtime','quality','maintenance','development','checklist','logbook','process','energy','master','project','batch']);
export async function handleQueryPerformanceV47(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/entries')return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);
 const module=String(url.searchParams.get('module')||'').trim();if(!modules.has(module))return out(req,env,{error:'Modul tidak valid'},400);
 const page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0)),q=String(url.searchParams.get('q')||'').trim().slice(0,46),offset=page*50;
 if(!q){
  const [rows,totalRow]=await Promise.all([
   all(env.DB,'SELECT * FROM entries WHERE module=? AND deleted=0 ORDER BY updated DESC LIMIT 50 OFFSET ?',module,offset),
   one(env.DB,'SELECT COUNT(*) n FROM entries WHERE module=? AND deleted=0',module)
  ]);
  return out(req,env,{rows,total:Number(totalRow?.n||0),page,query_mode:'indexed_default'});
 }
 const [rows,totalRow]=await Promise.all([
  all(env.DB,'SELECT * FROM entries WHERE module=? AND deleted=0 AND instr(lower(payload),lower(?))>0 ORDER BY updated DESC LIMIT 50 OFFSET ?',module,q,offset),
  one(env.DB,'SELECT COUNT(*) n FROM entries WHERE module=? AND deleted=0 AND instr(lower(payload),lower(?))>0',module,q)
 ]);
 return out(req,env,{rows,total:Number(totalRow?.n||0),page,query_mode:'text_scan'});
}
