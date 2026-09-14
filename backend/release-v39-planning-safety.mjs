const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const J=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const response=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
const error=(req,env,status,message)=>response(req,env,{error:message},status);
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const perms=u=>J(u?.permissions,[]);
const allowPpic=(u,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department==='PPIC'&&perms(u).includes(action));
const allowProd=(u,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department==='PROD'&&perms(u).includes(action));
async function approvedFgUnit(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.kpi_definitions'"),cfg=J(row?.value,{});return cfg?.approved===true?clean(cfg.fg_unit).toLowerCase():'';}
async function shiftGovernance(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.shift_calendar'"),cfg=J(row?.value,{});if(cfg?.approved!==true)return {approved:false,require_shift:false,require_group:false,group_model:''};const model=clean(cfg.group_model),fourGroup=/(?:^|\D)4(?:\D|$).*group|group.*(?:^|\D)4(?:\D|$)/i.test(model)||/^4\s*group/i.test(model);return {approved:true,require_shift:true,require_group:fourGroup,group_model:model};}
const validShift=v=>['1','2','3'].includes(clean(v).toUpperCase().replace(/^SHIFT\s*/,'').trim());
const validGroup=v=>['A','B','C','D'].includes(clean(v).toUpperCase().replace(/^(GROUP|GRUP)\s*/,'').trim());
function baseProblem(p){if(clean(p?.status)!=='Released')return '';for(const k of ['pro','machine','material','date'])if(!clean(p?.[k]))return `Planning Released wajib memiliki ${k}`;const target=Number(p?.target);if(!Number.isFinite(target)||target<=0)return 'Planning Released wajib memiliki Target Qty lebih dari nol';return '';}
async function validateReleased(env,p,fgUnit=''){const problem=baseProblem(p);if(problem)return problem;if(clean(p?.status)!=='Released')return '';const unit=clean(p?.unit).toLowerCase()||clean(fgUnit).toLowerCase()||await approvedFgUnit(env);if(!clean(unit))return 'Planning Released wajib memiliki Satuan target atau FG Unit authoritative yang sudah disahkan';if(!/^[a-z0-9%/._ -]{1,24}$/i.test(unit))return 'Satuan target Planning Released tidak valid';const shiftCfg=await shiftGovernance(env);if(shiftCfg.require_shift&&!validShift(p?.shift))return 'Planning Released wajib memiliki Shift 1, 2, atau 3 karena Kalender Shift sudah authoritative';if(shiftCfg.require_group&&!validGroup(p?.group))return `Planning Released wajib memiliki Group A, B, C, atau D karena model operasi ${shiftCfg.group_model||'4 group'} sudah disahkan`;return '';}
async function passwordGate(env,u){return !!(await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id))?.must_change;}
export async function handlePlanningSafetyV39(req,env){
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(method==='GET'&&path==='/api/shopfloor/plans'){
  const u=await auth(req,env);if(!u)return null;if(await passwordGate(env,u))return error(req,env,403,'Ganti password awal terlebih dahulu');
  const rows=await all(env.DB,"SELECT id,payload,version,updated FROM entries WHERE module='planning' AND deleted=0 AND json_extract(payload,'$.status')='Released' ORDER BY json_extract(payload,'$.date'),updated LIMIT 200"),fgUnit=await approvedFgUnit(env),ready=[];
  for(const row of rows){const p=J(row.payload,{});if(await validateReleased(env,p,fgUnit))continue;if(!clean(p.unit)&&fgUnit){p.unit=fgUnit;p.unit_source='DATA_GOVERNANCE.fg_unit';ready.push({...row,payload:JSON.stringify(p)});}else ready.push(row);}return response(req,env,ready);
 }
 if(method==='POST'&&path==='/api/shopfloor/start'){
  const u=await auth(req,env);if(!u||!allowProd(u,'create'))return null;if(await passwordGate(env,u))return error(req,env,403,'Ganti password awal terlebih dahulu');let body;try{body=await req.clone().json();}catch{return null;}const plan=await one(env.DB,"SELECT payload FROM entries WHERE id=? AND module='planning' AND deleted=0",body.plan_id||'');if(!plan)return null;const problem=await validateReleased(env,J(plan.payload,{}));return problem?error(req,env,409,problem):null;
 }
 if(method==='POST'&&path==='/api/entries'){
  let body;try{body=await req.clone().json();}catch{return null;}if(body?.module!=='planning')return null;const u=await auth(req,env);if(!u||!allowPpic(u,'create'))return null;const problem=await validateReleased(env,body.payload);return problem?error(req,env,400,problem):null;
 }
 if(method==='PUT'&&path.startsWith('/api/entries/')){
  const id=decodeURIComponent(path.slice('/api/entries/'.length)),entry=await one(env.DB,'SELECT module FROM entries WHERE id=? AND deleted=0',id);if(!entry||entry.module!=='planning')return null;const u=await auth(req,env);if(!u||!allowPpic(u,'update'))return null;let body;try{body=await req.clone().json();}catch{return null;}const problem=await validateReleased(env,body.payload);return problem?error(req,env,400,problem):null;
 }
 return null;
}
export const PlanningSafetyV39={shiftGovernance,validShift,validGroup,validateReleased};
