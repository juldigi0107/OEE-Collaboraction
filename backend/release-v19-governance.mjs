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
function duplicate(items,keyFn){const seen=new Set();for(const row of items){const k=keyFn(row);if(!k)continue;if(seen.has(k))return k;seen.add(k);}return '';}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(clean(v))&&!Number.isNaN(Date.parse(clean(v)));}
function validateOperational(key,v){
 if(v.approved!==true)return null;
 const items=Array.isArray(v.items)?v.items:[];
 if(key.endsWith('cycle_targets')){
  if(!items.length)return 'Minimal satu Cycle Target wajib ditetapkan sebelum baseline disahkan';
  const dup=duplicate(items,r=>[norm(r.machine),norm(r.process),norm(r.material_scope||'*'),norm(r.unit)].join('|'));if(dup)return 'Cycle Target ganda ditemukan untuk kombinasi mesin/proses/material/satuan yang sama';
  for(let i=0;i<items.length;i++){const r=items[i],n=i+1;if(!clean(r.machine)||!clean(r.unit))return `Cycle Target baris ${n}: mesin dan satuan wajib diisi`;const speed=Number(r.target_speed_per_hour||0),cycle=Number(r.cycle_seconds||0);if(!(speed>0)&&!(cycle>0))return `Cycle Target baris ${n}: target speed atau cycle time harus lebih dari nol`;if(!clean(r.owner)||!clean(r.source_ref))return `Cycle Target baris ${n}: owner dan referensi standard wajib diisi`;if(!validDate(r.effective_from))return `Cycle Target baris ${n}: effective date wajib valid`;}
 }
 if(key.endsWith('loss_time_classification')){
  if(!items.length)return 'Minimal satu klasifikasi loss-time wajib ditetapkan';const dup=duplicate(items,r=>norm(r.code||r.label));if(dup)return 'Kode/nama loss-time ganda ditemukan';
  for(let i=0;i<items.length;i++){const r=items[i],n=i+1;if(!clean(r.code)||!clean(r.label))return `Loss-Time baris ${n}: code dan deskripsi wajib diisi`;if(!['PDT','UPDT','COJ'].includes(clean(r.class).toUpperCase()))return `Loss-Time baris ${n}: class harus PDT, UPDT, atau COJ`;if(!['PROD','MTC','QC','PPIC','PDS','PROJECT'].includes(clean(r.owner_department).toUpperCase()))return `Loss-Time baris ${n}: owner department tidak valid`;if(!clean(r.source_ref))return `Loss-Time baris ${n}: referensi sumber wajib diisi`;}
 }
 if(key.endsWith('machine_triggers')){
  const active=items.filter(r=>r.enabled!==false);if(!active.length)return 'Minimal satu Machine Trigger aktif wajib ditetapkan';const events=new Set(['STATE','HEARTBEAT','COUNTER','ALARM','JOB']),ops=new Set(['eq','ne','gt','gte','lt','lte','truthy','falsy']),states=new Set(['RUNNING','IDLE','PDT','UPDT','COJ','OFFLINE']);
  for(let i=0;i<active.length;i++){const r=active[i],n=i+1,type=clean(r.event_type).toUpperCase();if(!clean(r.rule_name)||!clean(r.source_tag)||!clean(r.owner))return `Machine Trigger baris ${n}: rule, source tag, dan owner wajib diisi`;if(!ops.has(clean(r.operator)))return `Machine Trigger baris ${n}: operator tidak valid`;if(!events.has(type))return `Machine Trigger baris ${n}: event type tidak valid`;if(type==='STATE'&&!states.has(clean(r.action).toUpperCase()))return `Machine Trigger baris ${n}: action STATE harus RUNNING, IDLE, PDT, UPDT, COJ, atau OFFLINE`;}
 }
 if(key.endsWith('field_ownership')){
  if(!items.length)return 'Field Ownership belum diisi';const domains=new Set(items.map(r=>clean(r.domain).toLowerCase()));for(const d of ['production','quality','maintenance','ppic','development','master'])if(!domains.has(d))return `Field Ownership belum mencakup domain ${d}`;
  for(let i=0;i<items.length;i++){const r=items[i],n=i+1;if(!Array.isArray(r.fields)||!r.fields.length)return `Field Ownership baris ${n}: minimal satu field wajib diisi`;if(!clean(r.owner)||!clean(r.approver)||!clean(r.source_of_truth)||!clean(r.refresh_sla))return `Field Ownership baris ${n}: owner, approver, source of truth, dan refresh SLA wajib diisi`;}
 }
 if(key.endsWith('delivery_plan')){
  if(!clean(v.release_owner)||!validDate(v.target_go_live_date))return 'Release owner dan target go-live date wajib valid sebelum Delivery Plan disahkan';
  for(let i=0;i<items.length;i++){const r=items[i],n=i+1;if(!clean(r.title)||!clean(r.owner))return `Open Action baris ${n}: judul dan owner wajib diisi`;const status=clean(r.status).toLowerCase();if(!['closed','not_applicable'].includes(status))return `Open Action baris ${n} belum ditutup`;if(status==='closed'&&!clean(r.evidence))return `Open Action baris ${n}: evidence closure wajib diisi`;}
 }
 return null;
}
async function saved(env,key){const row=await one(env.DB,'SELECT value FROM settings WHERE key=?',key);return parse(row?.value);}
async function baselineApproved(env,key){return (await saved(env,key)).approved===true;}
async function validateDependencies(env,key,value){
 if(key==='OPERATIONAL_CONTROL.cycle_targets'&&value.approved===true&&!await baselineApproved(env,'DATA_GOVERNANCE.machine_aliases'))return 'Canonical machine/alias harus disahkan sebelum Cycle Target menjadi baseline';
 if(key==='OPERATIONAL_CONTROL.machine_triggers'&&value.approved===true&&!await baselineApproved(env,'DATA_GOVERNANCE.machine_aliases'))return 'Canonical machine/alias harus disahkan sebelum Machine Trigger diaktifkan';
 if(key==='OPERATIONAL_CONTROL.field_ownership'&&value.approved===true&&!await baselineApproved(env,'DATA_GOVERNANCE.source_authority'))return 'Source Authority harus disahkan sebelum Field Ownership menjadi baseline';
 if(key==='UAT_RELEASE.signoff'&&value.status==='passed'){
  for(const k of ['kpi_definitions','machine_aliases','shift_calendar','source_authority','join_grain'])if(!await baselineApproved(env,'DATA_GOVERNANCE.'+k))return `Final UAT menunggu Data Governance: ${k}`;
  for(const k of ['cycle_targets','loss_time_classification','machine_triggers','field_ownership'])if(!await baselineApproved(env,'OPERATIONAL_CONTROL.'+k))return `Final UAT menunggu Standar Operasional: ${k}`;
 }
 if(key==='OPERATIONAL_CONTROL.delivery_plan'&&value.approved===true){
  const signoff=await saved(env,'UAT_RELEASE.signoff');if(signoff.status!=='passed')return 'Delivery Plan baru dapat dikunci setelah Final UAT berstatus Lulus';
  for(const k of ['cycle_targets','loss_time_classification','machine_triggers','field_ownership'])if(!await baselineApproved(env,'OPERATIONAL_CONTROL.'+k))return `Delivery Plan menunggu Standar Operasional: ${k}`;
 }
 return null;
}
export async function handleGovernanceV19(req,env){
 if(req.method!=='PUT'||new URL(req.url).pathname!=='/api/settings')return null;
 let body;try{body=await req.clone().json();}catch{return null;}const key=clean(body?.key),isDG=key.startsWith('DATA_GOVERNANCE.'),isUAT=key.startsWith('UAT_RELEASE.'),isOC=key.startsWith('OPERATIONAL_CONTROL.');if(!isDG&&!isUAT&&!isOC)return null;
 const u=await auth(req,env);if(!u)return null;if(u.role!=='superadmin')return out(req,env,403,'Baseline governance, UAT, dan Standar Operasional hanya dapat disahkan oleh Superadmin');
 const value=parse(body.value);let error=isDG?validateGovernance(key,value):isUAT?validateUAT(key,value):validateOperational(key,value);if(!error)error=await validateDependencies(env,key,value);return error?out(req,env,400,error):null;
}
