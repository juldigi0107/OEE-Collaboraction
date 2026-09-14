import {ingestMachineEvents} from './realtime.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const J=(v,f={})=>{try{return JSON.parse(v||'{}')}catch{return f}};
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const cleanCode=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_.-]/g,'').slice(0,64);
const matchCode=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const machineId=code=>'machine:'+cleanCode(code);
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,v,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&J(u.permissions,[]).includes(action));
async function setting(env,key){const r=await one(env.DB,'SELECT value FROM settings WHERE key=?',key),c=J(r?.value,{});return c?.approved===true?c:null;}
const config=env=>setting(env,'DATA_GOVERNANCE.machine_aliases');
const lossConfig=env=>setting(env,'OPERATIONAL_CONTROL.loss_time_classification');
function canonical(cfg,raw){const input=matchCode(raw);if(!input)return '';for(const row of cfg.items||[]){for(const code of [row?.canonical,...(Array.isArray(row?.aliases)?row.aliases:[])])if(matchCode(code)===input)return cleanCode(row.canonical);}return cleanCode(raw);}
async function secureEdge(req,env){const got=req.headers.get('X-Edge-Key')||'',want=env.EDGE_INGEST_KEY||'';return !!want&&(await sha(got))===(await sha(want));}
async function canonicalStart(req,env,cfg){
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(!allow(u,'PROD','create'))return out(req,env,{error:'Akun ini hanya dapat melihat HMI'},403);
 let b;try{b=await req.json();}catch{return out(req,env,{error:'Payload Start PRO tidak valid'},400);}const code=canonical(cfg,b.machine);if(!code||!b.pro)return out(req,env,{error:'Mesin dan PRO wajib dipilih'},400);
 const plan=await one(env.DB,"SELECT * FROM entries WHERE id=? AND module='planning' AND deleted=0",b.plan_id||'');if(!plan)return out(req,env,{error:'Pilih planning yang telah dirilis PPIC'},409);const pp=J(plan.payload,{}),planCode=canonical(cfg,pp.machine);
 if(String(pp.pro)!==String(b.pro)||planCode!==code||pp.status!=='Released')return out(req,env,{error:'Planning, mesin canonical, PRO atau status Released tidak cocok'},409);
 const checks=b.checklist||{};if(!['material','qc','safety','tools'].every(k=>checks[k]===true))return out(req,env,{error:'Checklist material, QC, safety dan tools harus lengkap sebelum Start PRO'},409);
 const mid=machineId(code);if(await one(env.DB,"SELECT id FROM production_runs WHERE machine_id=? AND status='RUNNING'",mid))return out(req,env,{error:'Mesin masih memiliki PRO aktif'},409);
 await run(env.DB,"INSERT INTO machine_registry(id,code,name,department,source_type,active,heartbeat_at) VALUES(?,?,?,'PROD','hmi-governed',1,?) ON CONFLICT(code) DO UPDATE SET active=1",mid,code,code,now());
 const st=await one(env.DB,'SELECT counter FROM machine_state WHERE machine_id=?',mid),id=uid(),ts=now();
 await run(env.DB,"INSERT INTO production_runs(id,machine_id,pro,material,shift,group_name,operator_user_id,status,planned_qty,start_counter,start_ts,source) VALUES(?,?,?,?,?,?,?,'RUNNING',?,?,?,'hmi-governed')",id,mid,String(b.pro),b.material||pp.material||null,b.shift||null,b.group||null,u.id,Number(b.planned_qty||pp.target||0),Number(st?.counter||0),ts);
 await run(env.DB,"INSERT INTO machine_state(machine_id,state,pro,material,shift,group_name,counter,speed,since_ts,updated_ts,source) VALUES(?,?,?,?,?,?,0,0,?,?,?) ON CONFLICT(machine_id) DO UPDATE SET state='RUNNING',pro=excluded.pro,material=excluded.material,shift=excluded.shift,group_name=excluded.group_name,since_ts=excluded.since_ts,updated_ts=excluded.updated_ts,source=excluded.source",mid,'RUNNING',String(b.pro),b.material||pp.material||null,b.shift||null,b.group||null,ts,ts,'hmi-governed');
 await run(env.DB,"UPDATE entries SET payload=json_set(payload,'$.status','Dimulai'),version=version+1,updated=CURRENT_TIMESTAMP WHERE id=? AND module='planning'",b.plan_id);
 await run(env.DB,'INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)',uid(),u.id,'SHOPFLOOR_START_CANONICAL',id,null,JSON.stringify({machine:code,source_machine:b.machine,planning_machine:pp.machine,pro:b.pro}));
 return out(req,env,{ok:true,id,machine_code:code,source_machine:b.machine,canonicalized:cleanCode(b.machine)!==code});
}
async function canonicalEdge(req,env,cfg){
 if(!await secureEdge(req,env))return out(req,env,{error:'Edge key tidak valid'},401);let b;try{b=await req.json();}catch{return out(req,env,{error:'Payload Edge tidak valid'},400);}const events=Array.isArray(b)?b:b.events;if(!Array.isArray(events))return out(req,env,{error:'events wajib berupa array'},400);let changed=0;const mapped=events.map(raw=>{const source=raw.machine_code||raw.machine||raw.code,code=canonical(cfg,source);if(cleanCode(source)!==code)changed++;return {...raw,machine_code:code,...(cleanCode(source)!==code?{source_machine_code:source}:{})};});return out(req,env,{ok:true,accepted:await ingestMachineEvents(env,mapped,'machine-edge-governed'),canonicalized:changed});
}
async function governedDowntime(req,env,cfg){
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);if(!allow(u,'PROD','create'))return out(req,env,{error:'Tidak memiliki izin input downtime'},403);let b;try{b=await req.clone().json();}catch{return out(req,env,{error:'Payload downtime tidak valid'},400);}const code=matchCode(b.code),rule=(cfg.items||[]).find(x=>matchCode(x.code)===code);if(!rule)return out(req,env,{error:'Reason code belum terdaftar pada baseline Loss-Time yang disahkan'},409);if(String(rule.class||'').toUpperCase()!==String(b.class||'').toUpperCase())return out(req,env,{error:`Reason code ${rule.code} ditetapkan sebagai ${rule.class}, bukan ${b.class}`},409);if(String(rule.owner_department||'').toUpperCase()!==String(b.owner_department||'').toUpperCase())return out(req,env,{error:`Owner Department harus ${rule.owner_department} sesuai baseline Loss-Time`},409);return null;
}
export async function handleMachineGovernanceV20(req,env){
 const path=new URL(req.url).pathname;if(req.method!=='POST')return null;
 if(path==='/api/shopfloor/downtime/start'){const loss=await lossConfig(env);return loss?governedDowntime(req,env,loss):null;}
 if(!['/api/shopfloor/start','/api/edge/events'].includes(path))return null;const cfg=await config(env);if(!cfg)return null;return path==='/api/shopfloor/start'?canonicalStart(req,env,cfg):canonicalEdge(req,env,cfg);
}
