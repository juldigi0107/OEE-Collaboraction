const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const parse=v=>{try{return JSON.parse(v||'[]')}catch{return []}};
const one=async(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const originFor=(req,env)=>{const origin=req.headers.get('Origin')||'';return String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).includes(origin)?origin:'';};
const out=(req,env,error,status)=>{const origin=originFor(req,env);return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function user(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&parse(u.permissions).includes(action));
export async function handleSecurityV15(req,env){
 if(req.method!=='POST')return null;const path=new URL(req.url).pathname;
 const rules={
  '/api/shopfloor/start':['PROD','create'],
  '/api/shopfloor/downtime/stop':['PROD','update'],
  '/api/shopfloor/maintenance/close':['MTC','update']
 };
 if(!rules[path]&&path!=='/api/approvals/decide')return null;
 const u=await user(req,env);if(!u)return out(req,env,'Silakan login kembali',401);
 const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return out(req,env,'Ganti password awal terlebih dahulu',403);
 if(rules[path]){const [dept,action]=rules[path];if(!allow(u,dept,action))return out(req,env,'Tidak memiliki izin untuk tindakan ini',403);return null;}
 let body={};try{body=await req.clone().json();}catch{}
 const a=await one(env.DB,'SELECT entity_type FROM approvals WHERE id=?',body.id||'');
 if(!a)return null;
 const dept=a.entity_type==='quality'?'QC':'PROD';
 if(!allow(u,dept,'update'))return out(req,env,'Tidak memiliki izin verifikasi untuk department ini',403);
 return null;
}
