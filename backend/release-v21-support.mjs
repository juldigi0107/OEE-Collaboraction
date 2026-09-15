const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const J=(v,f={})=>{try{return JSON.parse(v||'{}')}catch{return f}};
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,v,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
function redact(value,key=''){
 if(/password|hash|salt|token|secret|credential|authorization|api[_-]?key/i.test(key))return '[disamarkan]';
 if(Array.isArray(value))return value.map(v=>redact(v,key));
 if(value&&typeof value==='object'){const o={};for(const [k,v] of Object.entries(value))o[k]=redact(v,k);return o;}
 return value;
}
async function count(db,table,where='1=1'){try{return Number((await one(db,`SELECT COUNT(*) n FROM ${table} WHERE ${where}`))?.n||0)}catch{return null}}
async function tableCounts(db){
 const specs=[['users','users','active=1'],['sources','sources'],['sheets','sheets'],['record_chunks','record_chunks'],['entries','entries','deleted=0'],['source_files','source_files'],['asset_catalog','asset_catalog'],['audit','audit'],['machine_registry','machine_registry','active=1'],['production_runs','production_runs'],['downtime_events','downtime_events'],['maintenance_calls','maintenance_calls'],['quality_events','quality_events'],['approvals','approvals']];
 const rows=[];for(const [key,table,where] of specs)rows.push({key,count:await count(db,table,where||'1=1')});return rows;
}
async function qualityCoverage(db){
 try{
  const totals=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN unit IS NULL OR trim(unit)='' THEN 1 ELSE 0 END) missing_unit,SUM(CASE WHEN unit IS NOT NULL AND trim(unit)<>'' THEN 1 ELSE 0 END) with_unit FROM quality_events")||{};
  const units=await all(db,"SELECT lower(trim(unit)) unit,COUNT(*) events FROM quality_events WHERE unit IS NOT NULL AND trim(unit)<>'' GROUP BY lower(trim(unit)) ORDER BY events DESC,unit");
  return {total:Number(totals.total||0),with_unit:Number(totals.with_unit||0),missing_unit:Number(totals.missing_unit||0),units:units.map(x=>({unit:x.unit,events:Number(x.events||0)})),aggregation_policy:'Kuantitas Quality live hanya diagregasi di dalam unit yang sama; event legacy tanpa unit tidak ditebak.'};
 }catch{return {total:null,with_unit:null,missing_unit:null,units:[],aggregation_policy:'Kolom unit belum dapat diverifikasi.'};}
}
async function productionUnitCoverage(db){
 try{
  const totals=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN unit IS NULL OR trim(unit)='' THEN 1 ELSE 0 END) missing_unit,SUM(CASE WHEN unit IS NOT NULL AND trim(unit)<>'' THEN 1 ELSE 0 END) with_unit FROM production_runs")||{};
  const units=await all(db,"SELECT lower(trim(unit)) unit,COUNT(*) runs FROM production_runs WHERE unit IS NOT NULL AND trim(unit)<>'' GROUP BY lower(trim(unit)) ORDER BY runs DESC,unit");
  return {total:Number(totals.total||0),with_unit:Number(totals.with_unit||0),missing_unit:Number(totals.missing_unit||0),units:units.map(x=>({unit:x.unit,runs:Number(x.runs||0)})),policy:'Run baru mewarisi unit dari Planning atau FG Unit authoritative; run legacy tidak ditebak.'};
 }catch{return {total:null,with_unit:null,missing_unit:null,units:[],policy:'Kolom production unit belum dapat diverifikasi.'};}
}
async function pdsCurrencyCoverage(db){
 try{
  const totals=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN json_extract(payload,'$.cost') IS NOT NULL AND trim(CAST(json_extract(payload,'$.cost') AS TEXT))<>'' THEN 1 ELSE 0 END) with_cost,SUM(CASE WHEN json_extract(payload,'$.cost') IS NOT NULL AND trim(CAST(json_extract(payload,'$.cost') AS TEXT))<>'' AND (json_extract(payload,'$.currency') IS NULL OR trim(json_extract(payload,'$.currency'))='') THEN 1 ELSE 0 END) cost_missing_currency FROM entries WHERE module='development' AND deleted=0")||{};
  const currencies=await all(db,"SELECT upper(trim(json_extract(payload,'$.currency'))) currency,COUNT(*) records FROM entries WHERE module='development' AND deleted=0 AND json_extract(payload,'$.currency') IS NOT NULL AND trim(json_extract(payload,'$.currency'))<>'' GROUP BY upper(trim(json_extract(payload,'$.currency'))) ORDER BY records DESC,currency");
  return {total:Number(totals.total||0),with_cost:Number(totals.with_cost||0),cost_missing_currency:Number(totals.cost_missing_currency||0),currencies:currencies.map(x=>({currency:x.currency,records:Number(x.records||0)})),policy:'Biaya hanya diagregasi di dalam currency yang sama; currency legacy tidak diasumsikan.'};
 }catch{return {total:null,with_cost:null,cost_missing_currency:null,currencies:[],policy:'Coverage currency PDS belum dapat diverifikasi.'};}
}
async function energyCoverage(db){
 try{
  const t=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN json_extract(payload,'$.date') IS NOT NULL AND trim(json_extract(payload,'$.date'))<>'' AND date(json_extract(payload,'$.date')) IS NOT NULL THEN 1 ELSE 0 END) valid_date,SUM(CASE WHEN json_extract(payload,'$.kwh') IS NOT NULL AND trim(CAST(json_extract(payload,'$.kwh') AS TEXT))<>'' AND CAST(json_extract(payload,'$.kwh') AS REAL)>=0 THEN 1 ELSE 0 END) valid_kwh,MIN(CASE WHEN date(json_extract(payload,'$.date')) IS NOT NULL THEN date(json_extract(payload,'$.date')) END) first_date,MAX(CASE WHEN date(json_extract(payload,'$.date')) IS NOT NULL THEN date(json_extract(payload,'$.date')) END) last_date FROM entries WHERE module='energy' AND deleted=0")||{};
  const total=Number(t.total||0),validDate=Number(t.valid_date||0),validKwh=Number(t.valid_kwh||0);
  return {total,valid_date:validDate,valid_kwh:validKwh,undated_or_invalid_date:Math.max(0,total-validDate),first_date:t.first_date||null,last_date:t.last_date||null,policy:'Energy 30 hari hanya memakai field tanggal transaksi yang valid dan nilai kWh non-negatif. ENPI tidak dihitung sebelum denominator output/capacity dan satuan output disahkan.'};
 }catch{return {total:null,valid_date:null,valid_kwh:null,undated_or_invalid_date:null,first_date:null,last_date:null,policy:'Coverage Energy belum dapat diverifikasi.'};}
}
async function processCoverage(db){
 try{
  const r=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN trim(COALESCE(json_extract(payload,'$.machine'),''))<>'' AND trim(COALESCE(json_extract(payload,'$.parameter'),''))<>'' AND trim(COALESCE(json_extract(payload,'$.unit'),''))<>'' AND json_type(payload,'$.value') IN ('integer','real') THEN 1 ELSE 0 END) complete_measurement,SUM(CASE WHEN json_type(payload,'$.lsl') IN ('integer','real') AND json_type(payload,'$.usl') IN ('integer','real') AND CAST(json_extract(payload,'$.lsl') AS REAL)<CAST(json_extract(payload,'$.usl') AS REAL) THEN 1 ELSE 0 END) with_valid_spec,SUM(CASE WHEN trim(COALESCE(json_extract(payload,'$.subgroup'),''))<>'' THEN 1 ELSE 0 END) with_subgroup,SUM(CASE WHEN trim(COALESCE(json_extract(payload,'$.subgroup'),''))<>'' AND json_type(payload,'$.value') IN ('integer','real') AND json_type(payload,'$.lsl') IN ('integer','real') AND json_type(payload,'$.usl') IN ('integer','real') AND CAST(json_extract(payload,'$.lsl') AS REAL)<CAST(json_extract(payload,'$.usl') AS REAL) THEN 1 ELSE 0 END) subgroup_spec_measurement FROM entries WHERE module='process' AND deleted=0")||{};
  const total=Number(r.total||0),withSubgroup=Number(r.with_subgroup||0);
  return {total,complete_measurement:Number(r.complete_measurement||0),with_valid_spec:Number(r.with_valid_spec||0),with_subgroup:withSubgroup,missing_subgroup:Math.max(0,total-withSubgroup),subgroup_spec_measurement:Number(r.subgroup_spec_measurement||0),policy:'Ppk dapat dihitung pada subset mesin + parameter + unit + specification yang konsisten. Cpk hanya dihitung bila struktur rational subgroup memadai; keberadaan Subgroup ID saja bukan bukti rationality.'};
 }catch{return {total:null,complete_measurement:null,with_valid_spec:null,with_subgroup:null,missing_subgroup:null,subgroup_spec_measurement:null,policy:'Coverage Process Capability belum dapat diverifikasi.'};}
}
async function mediaCoverage(db){
 try{
  const total=Number((await one(db,'SELECT COUNT(*) n FROM asset_catalog'))?.n||0),parents=Number((await one(db,'SELECT COUNT(DISTINCT parent) n FROM asset_catalog'))?.n||0),web=Number((await one(db,"SELECT COUNT(*) n FROM asset_catalog WHERE lower(path) LIKE '%.png' OR lower(path) LIKE '%.jpg' OR lower(path) LIKE '%.jpeg' OR lower(path) LIKE '%.gif' OR lower(path) LIKE '%.webp' OR lower(path) LIKE '%.svg'"))?.n||0);
  return {embedded_assets:total,parent_sources:parents,web_previewable_assets:web,status:total>0?'catalogued':'not_backfilled',note:total>0?'Child media tersedia untuk preview/traceability; file Office asli tetap source authority.':'Builder sudah mendukung embedded media, tetapi D1 production belum memiliki child asset yang terindeks.'};
 }catch{return {embedded_assets:null,parent_sources:null,web_previewable_assets:null,status:'unavailable',note:'Asset Catalog belum dapat dibaca.'};}
}
function selectedSetting(key){return /^(DATA_GOVERNANCE\.|OPERATIONAL_CONTROL\.|UAT_RELEASE\.|RELEASE_READINESS\.|DISPLAY_LAYOUT\.|brand$)/.test(key);}
export async function handleSupportV21(req,env,buildVersion,releaseFingerprint=[]){
 const path=new URL(req.url).pathname;if(req.method!=='GET'||path!=='/api/release-manifest')return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(u.role!=='superadmin')return out(req,env,{error:'Release Manifest khusus Superadmin'},403);
 const settingsRaw=await all(env.DB,'SELECT key,value,department FROM settings ORDER BY key'),settings=settingsRaw.filter(x=>selectedSetting(x.key)).map(x=>{const parsed=J(x.value,x.value);return {key:x.key,department:x.department,value:redact(parsed,x.key)}});
 const integrations=(await all(env.DB,'SELECT id,system,mode,enabled,poll_minutes,last_sync,last_status,last_message FROM integration_connections ORDER BY system')).map(x=>({...x,enabled:!!x.enabled}));
 const sources=(await all(env.DB,'SELECT id,name,path,department,kind,sha256,bytes FROM sources ORDER BY department,name')).map(x=>({...x,path:x.path?String(x.path).split(/[\\/]/).pop():null}));
 const activeUsers=await all(env.DB,"SELECT role,department,COUNT(*) count FROM users WHERE active=1 GROUP BY role,department ORDER BY role,department");
 const pendingApprovals=await count(env.DB,'approvals',"status='PENDING'"),openDowntime=await count(env.DB,'downtime_events',"status='OPEN'"),openMaintenance=await count(env.DB,'maintenance_calls',"status<>'CLOSED'");
 const governance=settings.filter(x=>x.key.startsWith('DATA_GOVERNANCE.')).map(x=>({key:x.key,approved:x.value?.approved===true,updated_at:x.value?.updated_at||null}));
 const operationalControl=settings.filter(x=>x.key.startsWith('OPERATIONAL_CONTROL.')).map(x=>({key:x.key,approved:x.value?.approved===true,item_count:Array.isArray(x.value?.items)?x.value.items.length:0,updated_at:x.value?.updated_at||null}));
 const delivery=settings.find(x=>x.key==='OPERATIONAL_CONTROL.delivery_plan')?.value||{},deliveryOpen=Array.isArray(delivery.items)?delivery.items.filter(x=>!['closed','not_applicable'].includes(String(x.status||'').toLowerCase())).length:0;
 const uat=settings.filter(x=>x.key.startsWith('UAT_RELEASE.')).map(x=>({key:x.key,status:x.value?.status||'not_started',owner:x.value?.owner||'',evidence_present:!!String(x.value?.evidence||'').trim(),updated_at:x.value?.updated_at||null}));
 const [qualityUnitCoverage,productionUnits,pdsCurrencies,energyData,processData,embeddedMediaCoverage,counts]=await Promise.all([qualityCoverage(env.DB),productionUnitCoverage(env.DB),pdsCurrencyCoverage(env.DB),energyCoverage(env.DB),processCoverage(env.DB),mediaCoverage(env.DB),tableCounts(env.DB)]);
 return out(req,env,{
  manifest_type:'configuration_and_release_manifest',
  disclaimer:'Manifest ini bukan full backup D1 dan tidak dapat menggantikan prosedur export/restore database Cloudflare.',
  generated_at:new Date().toISOString(),service:'OEE Collaboraction',build_version:buildVersion,release_fingerprint:[...releaseFingerprint],storage:'D1-only',r2:false,
  runtime:{database_binding:'DB',schema:'ready',frontend_assets:'Worker assets + GitHub Pages'},
  operational:{pending_approvals:pendingApprovals,open_downtime:openDowntime,open_maintenance_calls:openMaintenance,delivery_open_actions:deliveryOpen},
  data_coverage:{quality_units:qualityUnitCoverage,production_units:productionUnits,pds_currency:pdsCurrencies,energy:energyData,process_capability:processData,embedded_media:embeddedMediaCoverage},
  table_counts:counts,governance,operational_control:operationalControl,uat,active_users:activeUsers,integrations,sources,settings
 });
}
