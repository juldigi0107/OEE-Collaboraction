const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const J=(v,f=[])=>{try{return JSON.parse(v||'[]')}catch{return f}};
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const UNITS=new Set(['sheet','pcs','kg','unit','meter','set','roll']);
let schemaReady=null;
async function ensureSchema(db){
 if(schemaReady)return schemaReady;
 schemaReady=(async()=>{const cols=await all(db,'PRAGMA table_info(quality_events)');if(!cols.some(c=>c.name==='unit'))await run(db,'ALTER TABLE quality_events ADD COLUMN unit TEXT');return true;})().catch(e=>{schemaReady=null;throw e;});
 return schemaReady;
}
const origin=(req,env)=>{const got=req.headers.get('Origin')||'',allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return got&&allow.includes(got)?got:'';};
const out=(req,env,value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin(req,env)?{'Access-Control-Allow-Origin':origin(req,env),'Vary':'Origin'}:{})}});
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&J(u.permissions,[]).includes(action));
const normalizeUnit=v=>{const x=String(v||'').trim().toLowerCase(),a={sheets:'sheet',lembar:'sheet',piece:'pcs',pieces:'pcs',buah:'pcs',kgs:'kg',kilogram:'kg',units:'unit',metre:'meter',meters:'meter',metres:'meter',sets:'set',rolls:'roll'};return a[x]||x;};
async function authorized(req,env){const u=await auth(req,env);if(!u)return {error:out(req,env,{error:'Silakan login kembali'},401)};const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return {error:out(req,env,{error:'Ganti password awal terlebih dahulu'},403)};return {u};}
async function qualityDashboard(req,env,u){
 const rows=await all(env.DB,"SELECT COALESCE(NULLIF(TRIM(unit),''),'UNSPECIFIED') unit,COUNT(*) events,COALESCE(SUM(sample_qty),0) sample,COALESCE(SUM(good_qty),0) good,COALESCE(SUM(reject_qty),0) reject FROM quality_events WHERE created_ts>=datetime('now','-30 days') GROUP BY COALESCE(NULLIF(TRIM(unit),''),'UNSPECIFIED') ORDER BY unit");
 const known=rows.filter(r=>r.unit!=='UNSPECIFIED'),legacy=rows.find(r=>r.unit==='UNSPECIFIED');
 const metrics=[];
 metrics.push({key:'events',label:'Quality event 30 hari',value:rows.reduce((n,r)=>n+Number(r.events||0),0),unit:'',source:'HMI Quality',note:'Jumlah event; aman dihitung lintas satuan karena bukan kuantitas fisik.'});
 for(const r of known){const unit=normalizeUnit(r.unit),sample=Number(r.sample||0),good=Number(r.good||0),reject=Number(r.reject||0);metrics.push({key:'sample_'+unit,label:'Sample live · '+unit,value:sample,unit,source:'HMI Quality',note:'Hanya event dengan satuan '+unit+'.'});metrics.push({key:'reject_'+unit,label:'Reject live · '+unit,value:reject,unit,source:'HMI Quality',note:'Tidak digabung dengan satuan lain.'});metrics.push({key:'quality_rate_'+unit,label:'Quality rate · '+unit,value:sample>0?good/sample:null,unit:'ratio',source:'HMI Quality',note:'Good / sample untuk '+unit+'; tidak mengganti definisi historis workbook.'});}
 if(legacy)metrics.push({key:'unit_reconciliation',label:'Event tanpa satuan',value:Number(legacy.events||0),unit:'event',source:'HMI Quality',note:'Data lama dipertahankan tanpa menebak satuan; perlu rekonsiliasi sebelum dibandingkan.'});
 const records=Number((await one(env.DB,"SELECT COUNT(*) n FROM entries WHERE module='quality' AND deleted=0"))?.n||0);metrics.push({key:'records',label:'Register QC historis',value:records,unit:'',source:'Transaksi terpetakan',note:'Unit historis mengikuti sumber dan tidak dijumlahkan lintas unit.'});
 return out(req,env,{department:'QC',generated_at:now(),metrics});
}
export async function handleQualityUnitsV80(req,env){
 const path=new URL(req.url).pathname;
 if(path!=='/api/shopfloor/quality'&&path!=='/api/role-dashboard')return null;
 const {u,error}=await authorized(req,env);if(error)return error;
 await ensureSchema(env.DB);
 if(path==='/api/role-dashboard'&&req.method==='GET'){
  const requested=String(new URL(req.url).searchParams.get('department')||u.department||'PROJECT').toUpperCase(),dept=u.role==='superadmin'?requested:u.department;
  if(dept!=='QC')return null;
  return qualityDashboard(req,env,u);
 }
 if(path==='/api/shopfloor/quality'&&req.method==='POST'){
  if(!allow(u,'QC','create')&&!allow(u,'PROD','create'))return out(req,env,{error:'Tidak memiliki izin input quality event'},403);
  let b={};try{b=await req.clone().json();}catch{return out(req,env,{error:'Payload Quality Event tidak valid'},400);}
  const unit=normalizeUnit(b.unit);if(!UNITS.has(unit))return out(req,env,{error:'Satuan wajib dipilih: sheet, pcs, kg, unit, meter, set, atau roll'},400);
  const events=new Set(['NG','QC_SAMPLE','RECHECK']),decisions=new Set(['HOLD','RELEASE','REWORK','REJECT']),event=String(b.event_type||'NG').trim().toUpperCase(),decision=String(b.decision||'').trim().toUpperCase();
  if(!events.has(event))return out(req,env,{error:'Jenis Quality Event tidak valid'},400);if(decision&&!decisions.has(decision))return out(req,env,{error:'Keputusan Quality Event tidak valid'},400);if(String(b.note||'').trim().length>1000)return out(req,env,{error:'Catatan Quality Event terlalu panjang'},400);
  const r=await one(env.DB,'SELECT * FROM production_runs WHERE id=?',b.run_id||'');if(!r)return out(req,env,{error:'PRO tidak ditemukan'},404);
  const sample=Number(b.sample_qty||0),good=Number(b.good_qty||0),reject=Number(b.reject_qty||0);if([sample,good,reject].some(x=>!Number.isFinite(x)||x<0)||good+reject>sample)return out(req,env,{error:'Qty sampling tidak valid'},400);
  const id=uid();await run(env.DB,'INSERT INTO quality_events(id,run_id,machine_id,event_type,sample_qty,good_qty,reject_qty,decision,note,created_by,unit) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,r.id,r.machine_id,event,sample,good,reject,decision||null,b.note||null,u.id,unit);
  await run(env.DB,"INSERT INTO approvals(id,entity_type,entity_id,step,status,requested_by,requested_ts) VALUES(?,'quality',?,'QC_VERIFY','PENDING',?,?) ON CONFLICT(entity_type,entity_id,step) DO NOTHING",uid(),id,u.id,now());
  return out(req,env,{ok:true,id,unit,verification:'PENDING'});
 }
 return null;
}
