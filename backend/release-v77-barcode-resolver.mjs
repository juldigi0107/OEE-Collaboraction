const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const parse=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const cleanCode=v=>clean(v).toUpperCase().replace(/[^A-Z0-9_.-]/g,'').slice(0,64);
const matchCode=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const json=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function setting(env,key){const r=await one(env.DB,'SELECT value FROM settings WHERE key=?',key);return parse(r?.value,{});}
function canonical(cfg,raw){const input=matchCode(raw);if(!input)return '';if(cfg?.approved===true){for(const row of cfg.items||[]){for(const code of [row?.canonical,...(Array.isArray(row?.aliases)?row.aliases:[])])if(matchCode(code)===input)return cleanCode(row.canonical);}}return cleanCode(raw);}
function exact(a,b){return clean(a).toUpperCase()===clean(b).toUpperCase();}
function candidate(row,cfg){const p=parse(row.payload,{});return {id:row.id,payload:p,machine:canonical(cfg,p.machine),updated:row.updated};}
function publicPlan(x,matchBy){const p=x.payload;return {plan_id:x.id,match_by:matchBy,machine:x.machine,source_machine:clean(p.machine),pro:clean(p.pro),material:clean(p.material),target:Number.isFinite(Number(p.target))?Number(p.target):null,unit:clean(p.unit),date:clean(p.work_date||p.date),shift:clean(p.shift),group:clean(p.group),status:clean(p.status)};}
export async function handleBarcodeResolverV77(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/barcode/resolve')return null;
 const u=await auth(req,env);if(!u)return json(req,env,{error:'Silakan login kembali'},401);if((await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id))?.must_change)return json(req,env,{error:'Ganti password awal terlebih dahulu'},403);
 const raw=clean(url.searchParams.get('value'));if(!raw)return json(req,env,{error:'Nilai barcode / PRO wajib diisi'},400);if(raw.length>160)return json(req,env,{error:'Nilai barcode terlalu panjang'},400);
 const cfg=await setting(env,'DATA_GOVERNANCE.machine_aliases'),requestedMachine=canonical(cfg,url.searchParams.get('machine'));
 const rows=await all(env.DB,"SELECT id,payload,updated FROM entries WHERE module='planning' AND deleted=0 AND json_extract(payload,'$.status')='Released' AND (id=? OR upper(trim(COALESCE(json_extract(payload,'$.barcode'),'')))=upper(?) OR upper(trim(COALESCE(json_extract(payload,'$.pro'),'')))=upper(?)) ORDER BY updated DESC LIMIT 25",raw,raw,raw);
 let candidates=rows.map(r=>candidate(r,cfg));if(!candidates.length)return json(req,env,{resolved:false,status:'not_found',error:'Tidak ada Planning Released yang cocok persis dengan barcode / Planning ID / PRO ini.'},404);
 let matchBy='pro';const barcodeMatches=candidates.filter(x=>clean(x.payload.barcode)&&exact(x.payload.barcode,raw)),idMatches=candidates.filter(x=>x.id===raw);if(barcodeMatches.length){candidates=barcodeMatches;matchBy='barcode';}else if(idMatches.length){candidates=idMatches;matchBy='planning_id';}else candidates=candidates.filter(x=>exact(x.payload.pro,raw));
 if(requestedMachine){const scoped=candidates.filter(x=>matchCode(x.machine)===matchCode(requestedMachine));if(!scoped.length)return json(req,env,{resolved:false,status:'machine_mismatch',error:`Planning ditemukan tetapi bukan untuk mesin ${requestedMachine}. Pindah ke mesin yang sesuai atau periksa barcode.`,candidate_count:candidates.length},409);candidates=scoped;}
 if(candidates.length!==1)return json(req,env,{resolved:false,status:'ambiguous',error:`Barcode / PRO cocok dengan ${candidates.length} Planning Released. Gunakan barcode unik atau Planning ID; aplikasi tidak memilih otomatis.`,candidate_count:candidates.length},409);
 const plan=publicPlan(candidates[0],matchBy);return json(req,env,{resolved:true,status:'resolved',...plan,policy:'Exact match only. Tidak ada fuzzy/substring matching; Planning harus Released dan machine scope harus sesuai bila mesin HMI diberikan.'});
}
