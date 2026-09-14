const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const J=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,status,error)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const sources=new Set(['dashboard.oee','dashboard.availability','dashboard.performance','dashboard.quality','dashboard.trend','realtime.status','realtime.shift','production.total','production.table','downtime.minutes','quality.reject','maintenance.status','planning.target','system.clock','text.announcement','text.custom']);
const resolutions=new Set(['1920x1080','1366x768','1280x720','1080x1920']);
function validateLayout(v){
 if(!['draft','published'].includes(clean(v.status)||'draft'))return 'Status layout harus draft atau published';
 if(!clean(v.id)||!clean(v.name))return 'ID dan nama layout wajib diisi';
 if(!resolutions.has(clean(v.resolution)))return 'Resolusi layout tidak didukung';
 const widgets=Array.isArray(v.widgets)?v.widgets:[];if(widgets.length>60)return 'Jumlah widget melebihi batas layout';const ids=new Set();
 for(let i=0;i<widgets.length;i++){const w=widgets[i],n=i+1,id=clean(w?.id),x=Number(w?.x),y=Number(w?.y),width=Number(w?.w),height=Number(w?.h);if(!id)return `Widget ${n}: ID wajib diisi`;if(ids.has(id))return `Widget ${n}: ID duplikat`;ids.add(id);if(!sources.has(clean(w?.source)))return `Widget ${n}: sumber data tidak didukung`;if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<1||height<1||x+width>12||y+height>8)return `Widget ${n}: posisi/ukuran keluar dari grid 12 × 8`;}
 if(v.status==='published'){if(!clean(v.machine))return 'Kode mesin/display wajib diisi sebelum publikasi';if(!widgets.length)return 'Minimal satu widget wajib ada sebelum publikasi';}
 return '';
}
export async function handleDisplaySafetyV42(req,env){
 if(req.method!=='PUT'||new URL(req.url).pathname!=='/api/settings')return null;let body;try{body=await req.clone().json();}catch{return null;}if(!clean(body?.key).startsWith('DISPLAY_LAYOUT.'))return null;const u=await auth(req,env);if(!u)return null;if(u.role!=='superadmin')return out(req,env,403,'Layout Display Mesin hanya dapat dikelola oleh Superadmin');const problem=validateLayout(J(body.value,{}));return problem?out(req,env,400,problem):null;
}
