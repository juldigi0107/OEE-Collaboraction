const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=(v,f=[])=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,message,status=400)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department==='QC'&&parse(u.permissions,[]).includes(action));
function validateProcess(p,{creating=false}={}){
 if(!p||typeof p!=='object'||Array.isArray(p))return 'Payload Process tidak valid';
 const parameter=clean(p.parameter),unit=clean(p.unit),machine=clean(p.machine),date=clean(p.date),subgroup=clean(p.subgroup);
 if(creating&&(!machine||!date))return 'Process measurement baru wajib memiliki mesin dan tanggal';
 if(!parameter)return 'Parameter Process wajib diisi';
 if(p.value===undefined||p.value===''||!Number.isFinite(Number(p.value)))return 'Nilai ukur Process wajib berupa angka';
 if(!unit)return 'Satuan Process wajib diisi';
 if(unit.length>24)return 'Satuan Process terlalu panjang';
 if(subgroup.length>80)return 'Subgroup ID terlalu panjang';
 const hasLsl=p.lsl!==undefined&&p.lsl!=='',hasUsl=p.usl!==undefined&&p.usl!=='';
 if(hasLsl!==hasUsl)return 'LSL dan USL harus diisi berpasangan';
 if(hasLsl){const lsl=Number(p.lsl),usl=Number(p.usl);if(!Number.isFinite(lsl)||!Number.isFinite(usl))return 'LSL dan USL harus berupa angka';if(!(lsl<usl))return 'LSL harus lebih kecil dari USL';}
 return '';
}
export async function handleProcessCapabilityV59(req,env){
 const url=new URL(req.url),path=url.pathname;if(!['POST','PUT'].includes(req.method))return null;if(path!=='/api/entries'&&!path.startsWith('/api/entries/'))return null;
 let body;try{body=await req.clone().json();}catch{return null;}if(body?.module!=='process')return null;
 const u=await auth(req,env);if(!u||!allow(u,req.method==='POST'?'create':'update'))return null;
 const problem=validateProcess(body.payload,{creating:req.method==='POST'});return problem?out(req,env,problem,400):null;
}
export const ProcessCapabilityV59={validateProcess};
