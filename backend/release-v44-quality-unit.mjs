import {handleReleaseV11} from './release-v11.mjs';
import {handleKpiSemanticsV45} from './release-v45-kpi-semantics.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const J=(v,f=[])=>{try{return JSON.parse(v||'[]')}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&J(u.permissions).includes(action));
let schemaPromise=null;
async function ensureQualityUnit(db){
 if(!schemaPromise)schemaPromise=(async()=>{const info=(await db.prepare("PRAGMA table_info('quality_events')").all()).results||[];if(info.some(x=>x.name==='unit'))return;try{await db.prepare('ALTER TABLE quality_events ADD COLUMN unit TEXT').run();}catch(e){if(!/duplicate column/i.test(String(e?.message||e)))throw e;}})().catch(e=>{schemaPromise=null;throw e;});
 return schemaPromise;
}
function unitOf(v){return clean(v).toLowerCase().replace(/\s+/g,' ').slice(0,24);}
const metric=(key,label,value,unit='',source='HMI Quality',note='')=>({key,label,value:value===undefined?null:value,unit,source,note});
async function qualityPost(req,env,u){
 if(!allow(u,'QC','create')&&!allow(u,'PROD','create'))return out(req,env,{error:'Tidak memiliki izin input quality event'},403);
 let b;try{b=await req.json();}catch{return out(req,env,{error:'Payload Quality Event tidak valid'},400);}
 const unit=unitOf(b.unit);if(!unit)return out(req,env,{error:'Satuan Quality Event wajib diisi'},400);if(!/^[a-z0-9._/ -]+$/.test(unit))return out(req,env,{error:'Satuan Quality Event tidak valid'},400);
 const r=await one(env.DB,'SELECT * FROM production_runs WHERE id=?',b.run_id||'');if(!r)return out(req,env,{error:'PRO tidak ditemukan'},404);
 const sample=Number(b.sample_qty||0),good=Number(b.good_qty||0),reject=Number(b.reject_qty||0);if([sample,good,reject].some(x=>!Number.isFinite(x)||x<0)||good+reject>sample)return out(req,env,{error:'Qty sampling tidak valid'},400);
 const event=clean(b.event_type||'NG').toUpperCase(),decision=clean(b.decision).toUpperCase();if(!['NG','QC_SAMPLE','RECHECK'].includes(event))return out(req,env,{error:'Jenis Quality Event tidak valid'},400);if(decision&&!['HOLD','RELEASE','REWORK','REJECT'].includes(decision))return out(req,env,{error:'Keputusan Quality Event tidak valid'},400);if(clean(b.note).length>1000)return out(req,env,{error:'Catatan Quality Event terlalu panjang'},400);
 const id=uid(),approval=uid(),ts=now();await env.DB.batch([
  env.DB.prepare('INSERT INTO quality_events(id,run_id,machine_id,event_type,sample_qty,good_qty,reject_qty,decision,note,created_by,created_ts,unit) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,r.id,r.machine_id,event,sample,good,reject,decision||null,clean(b.note)||null,u.id,ts,unit),
  env.DB.prepare("INSERT INTO approvals(id,entity_type,entity_id,step,status,requested_by,requested_ts) VALUES(?,'quality',?,'QC_VERIFY','PENDING',?,?) ON CONFLICT(entity_type,entity_id,step) DO NOTHING").bind(approval,id,u.id,ts)
 ]);
 return out(req,env,{ok:true,id,unit,verification:'PENDING'});
}
async function qcDashboard(req,env,u,url){
 const requested=clean(url.searchParams.get('department')||u.department||'PROJECT').toUpperCase(),dept=u.role==='superadmin'?requested:String(u.department||'').toUpperCase();if(dept!=='QC')return null;
 const groups=await all(env.DB,"SELECT COALESCE(NULLIF(lower(trim(unit)),''),'__missing__') unit,COUNT(*) events,COALESCE(SUM(sample_qty),0) sample,COALESCE(SUM(good_qty),0) good,COALESCE(SUM(reject_qty),0) reject FROM quality_events WHERE created_ts>=datetime('now','-30 days') GROUP BY COALESCE(NULLIF(lower(trim(unit)),''),'__missing__') ORDER BY unit"),total=groups.reduce((n,x)=>n+Number(x.events||0),0),metrics=[metric('events','Quality event 30 hari',total,'','HMI Quality','Jumlah event; kuantitas tidak dijumlahkan lintas satuan')];
 let known=0,missing=0;for(const g of groups){const events=Number(g.events||0);if(g.unit==='__missing__'){missing+=events;continue;}known++;const key=String(g.unit).replace(/[^a-z0-9]+/g,'_'),sample=Number(g.sample||0),good=Number(g.good||0),reject=Number(g.reject||0),rate=sample>0?good/sample:null;metrics.push(metric('sample_'+key,'Sample · '+g.unit,sample,g.unit,'HMI Quality','30 hari · hanya unit yang sama'),metric('reject_'+key,'Reject · '+g.unit,reject,g.unit,'HMI Quality','30 hari · hanya unit yang sama'),metric('quality_'+key,'Quality rate · '+g.unit,rate,'ratio','HMI Quality','Good / sample dalam satuan yang sama'));}
 metrics.push(metric('units','Satuan live teridentifikasi',known,'unit','HMI Quality',known>1?'Kuantitas ditampilkan per unit; tidak dibuat total lintas unit':'Tidak ada agregasi lintas unit'));
 if(missing)metrics.push(metric('missing_unit','Event lama tanpa satuan',missing,'event','HMI Quality','Dikeluarkan dari agregasi qty per unit; perlu rekonsiliasi jika akan dibandingkan'));
 const historical=Number((await one(env.DB,"SELECT COUNT(*) n FROM entries WHERE module='quality' AND deleted=0"))?.n||0);metrics.push(metric('records','Register QC historis',historical,'','Transaksi terpetakan','Unit historis tetap mengikuti payload sumber'));
 return out(req,env,{department:'QC',generated_at:now(),metrics});
}
async function approvalList(req,env){
 const response=await handleReleaseV11(req,env);if(!response||!response.ok)return response;let data;try{data=await response.clone().json();}catch{return response;}const rows=Array.isArray(data?.rows)?data.rows:[],qualityIds=[...new Set(rows.filter(x=>x.entity_type==='quality'&&x.entity_id).map(x=>x.entity_id))],runIds=[...new Set(rows.filter(x=>x.entity_type==='production_run'&&x.entity_id).map(x=>x.entity_id))];if(!qualityIds.length&&!runIds.length)return out(req,env,data,response.status);
 const qualityMap=new Map(),runMap=new Map();if(qualityIds.length){const placeholders=qualityIds.map(()=>'?').join(','),unitRows=await all(env.DB,`SELECT id,lower(trim(unit)) unit FROM quality_events WHERE id IN (${placeholders})`,...qualityIds);unitRows.forEach(x=>qualityMap.set(x.id,clean(x.unit)));}if(runIds.length){const placeholders=runIds.map(()=>'?').join(','),unitRows=await all(env.DB,`SELECT id,lower(trim(unit)) unit FROM production_runs WHERE id IN (${placeholders})`,...runIds);unitRows.forEach(x=>runMap.set(x.id,clean(x.unit)));}
 for(const a of rows){if(a.entity_type==='quality'){const unit=qualityMap.get(a.entity_id)||'';a.entity={...(a.entity||{}),unit,unit_status:unit?'known':'legacy_missing'};}if(a.entity_type==='production_run'){const unit=runMap.get(a.entity_id)||'';a.entity={...(a.entity||{}),unit,unit_status:unit?'known':'legacy_missing'};}}
 return out(req,env,data,response.status);
}
export async function handleQualityUnitV44(req,env){
 const url=new URL(req.url),path=url.pathname,qualityPostRoute=req.method==='POST'&&path==='/api/shopfloor/quality',dashboardRoute=req.method==='GET'&&path==='/api/role-dashboard',approvalRoute=req.method==='GET'&&path==='/api/approvals';if(!qualityPostRoute&&!dashboardRoute&&!approvalRoute)return null;
 await ensureQualityUnit(env.DB);
 if(approvalRoute)return approvalList(req,env);
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);
 if(qualityPostRoute)return qualityPost(req,env,u);
 const qc=await qcDashboard(req,env,u,url);if(qc)return qc;
 return handleKpiSemanticsV45(req,env);
}
