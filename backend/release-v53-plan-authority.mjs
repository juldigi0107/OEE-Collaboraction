const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const normMachine=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const cleanCode=v=>clean(v).toUpperCase().replace(/[^A-Z0-9_.-]/g,'').slice(0,64);
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,status,error)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const perms=u=>parse(u?.permissions,[]);
const allowed=u=>u?.role==='superadmin'||(u?.role==='admin'&&u.department==='PROD'&&perms(u).includes('create'));
async function machineConfig(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.machine_aliases'"),cfg=parse(row?.value,{});return cfg?.approved===true?cfg:null;}
function canonical(cfg,raw){if(!cfg)return cleanCode(raw);const input=normMachine(raw);if(!input)return '';for(const row of cfg.items||[]){for(const code of [row?.canonical,...(Array.isArray(row?.aliases)?row.aliases:[])])if(normMachine(code)===input)return cleanCode(row.canonical);}return cleanCode(raw);}
const sameText=(a,b)=>clean(a).toUpperCase()===clean(b).toUpperCase();
const hasValue=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
function sameNumber(a,b){const x=Number(a),y=Number(b);return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<=1e-9*Math.max(1,Math.abs(x),Math.abs(y));}
export async function handlePlanAuthorityV53(req,env){
 const url=new URL(req.url);if(req.method!=='POST'||url.pathname!=='/api/shopfloor/start')return null;
 const u=await auth(req,env);if(!u||!allowed(u))return null;
 let body;try{body=await req.clone().json();}catch{return null;}
 const planId=clean(body.plan_id);if(!planId)return null;
 const row=await one(env.DB,"SELECT payload FROM entries WHERE id=? AND module='planning' AND deleted=0",planId);if(!row)return null;
 const plan=parse(row.payload,{});if(clean(plan.status)!=='Released')return null;
 if(hasValue(body.pro)&&String(body.pro)!==String(plan.pro))return out(req,env,409,'PRO pada request tidak sama dengan Planning Released');
 const cfg=await machineConfig(env),planMachine=canonical(cfg,plan.machine),requestMachine=canonical(cfg,body.machine);if(requestMachine&&planMachine&&requestMachine!==planMachine)return out(req,env,409,'Mesin pada request tidak sama dengan canonical machine Planning Released');
 if(hasValue(body.material)&&!sameText(body.material,plan.material))return out(req,env,409,'Material pada request tidak sama dengan Material Planning Released');
 if(hasValue(body.planned_qty)&&!sameNumber(body.planned_qty,plan.target))return out(req,env,409,'Target Qty pada request tidak sama dengan Target Qty Planning Released');
 if(hasValue(plan.shift)&&hasValue(body.shift)&&!sameText(body.shift,plan.shift))return out(req,env,409,'Shift pada request tidak sama dengan Shift Planning Released');
 if(hasValue(plan.group)&&hasValue(body.group)&&!sameText(body.group,plan.group))return out(req,env,409,'Group pada request tidak sama dengan Group Planning Released');
 return null;
}
