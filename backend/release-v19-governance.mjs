const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return {}}};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,status,error)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const required=(v,fields)=>fields.find(k=>!clean(v?.[k]));
function validateGovernance(key,v){
 if(v.approved!==true)return null;
 if(key.endsWith('kpi_definitions')){
  if(!['good_total','good_nc_total'].includes(v.quality_rule))return 'Pilih definisi Quality Printing sebelum baseline KPI disahkan';
  const miss=required(v,['fg_unit','ideal_speed_basis','mtbf_definition','mttr_definition','utilization_definition']);if(miss)return `Baseline KPI belum lengkap: ${miss}`;
 }
 if(key.endsWith('machine_aliases')){
  if(!Array.isArray(v.items)||!v.items.length)return 'Minimal satu canonical machine wajib ditetapkan sebelum mapping disahkan';
  const used=new Set();for(const row of v.items){if(!clean(row?.canonical))return 'Canonical machine tidak boleh kosong';for(const code of [row.canonical,...(Array.isArray(row.aliases)?row.aliases:[])]){const n=norm(code);if(!n)continue;if(used.has(n))return `Kode/alias mesin ganda: ${code}`;used.add(n);}}
 }
 if(key.endsWith('shift_calendar')){const miss=required(v,['group_model','workday_cutoff','s1_start','s1_end','s2_start','s2_end','s3_start','s3_end']);if(miss)return `Kalender shift belum lengkap: ${miss}`;}
 if(key.endsWith('source_authority')){
  const d=v.domains||{};for(const k of ['production','quality','maintenance','ppic','development','master']){const id=typeof d[k]==='string'?d[k]:d[k]?.source_id;if(!clean(id))return `Sumber authoritative belum ditetapkan untuk domain ${k}`;}
 }
 if(key.endsWith('join_grain')){
  if(!Array.isArray(v.fields)||!v.fields.length)return 'Join grain wajib memiliki field';const f=new Set(v.fields.map(norm));for(const k of ['plant','machine','pro','material','workdate','shift','unit'])if(!f.has(norm(k)))return `Join grain wajib memuat ${k}`;
  if(!Array.isArray(v.transaction_keys)||!v.transaction_keys.length)return 'Minimal satu transaction key wajib ditetapkan';if(!clean(v.dedupe_rule))return 'Aturan deduplikasi wajib ditulis sebelum join grain disahkan';
 }
 return null;
}
function validateUAT(key,v){
 const allowed=['not_started','in_progress','passed','blocked','not_applicable'];if(!allowed.includes(v.status||'not_started'))return 'Status UAT tidak valid';
 if(v.status==='blocked'&&!clean(v.blocker))return 'Blocker wajib dijelaskan ketika status Terhambat';
 if(['passed','not_applicable'].includes(v.status)){if(!clean(v.owner))return 'PIC wajib diisi sebelum gate dinyatakan lulus/tidak diperlukan';if(!clean(v.evidence))return 'Evidence atau alasan wajib diisi sebelum gate dinyatakan lulus/tidak diperlukan';}
 if(key.endsWith('signoff')&&v.status==='passed'){
  if(!clean(v.go_live_date))return 'Tanggal go-live wajib diisi sebelum final sign-off';const a=v.approvals||{};for(const k of ['software_owner','production','quality','maintenance','ppic','management'])if(!['passed','not_applicable'].includes(a[k]))return `Final sign-off belum lengkap: ${k}`;
 }
 return null;
}
export async function handleGovernanceV19(req,env){
 if(req.method!=='PUT'||new URL(req.url).pathname!=='/api/settings')return null;
 let body;try{body=await req.clone().json();}catch{return null;}const key=clean(body?.key);if(!key.startsWith('DATA_GOVERNANCE.')&&!key.startsWith('UAT_RELEASE.'))return null;
 const u=await auth(req,env);if(!u)return null;if(u.role!=='superadmin')return out(req,env,403,'Data Governance dan UAT Release hanya dapat disahkan oleh Superadmin');
 const value=parse(body.value);const error=key.startsWith('DATA_GOVERNANCE.')?validateGovernance(key,value):validateUAT(key,value);return error?out(req,env,400,error):null;
}
