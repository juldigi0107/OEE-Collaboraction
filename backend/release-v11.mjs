const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const parse=v=>{try{return JSON.parse(v||'[]')}catch{return []}};
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const one=async(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const json=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function authorizedUser(req,env){const u=await auth(req,env);if(!u)return {error:json(req,env,{error:'Silakan login kembali'},401)};const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return {error:json(req,env,{error:'Ganti password awal terlebih dahulu'},403)};return {u};}
const entityDept=t=>t==='quality'?'QC':'PROD';
const canReview=(u,t)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===entityDept(t)&&parse(u.permissions).includes('update'));
const scopeTypes=u=>u?.role==='superadmin'?['production_run','downtime','quality']:u?.role==='admin'&&u.department==='PROD'?['production_run','downtime']:u?.role==='admin'&&u.department==='QC'?['quality']:[];
const countEntries=async(db,module)=>Number((await one(db,'SELECT COUNT(*) n FROM entries WHERE module=? AND deleted=0',module))?.n||0);
const metric=(key,label,value,unit='',source='D1',note='')=>({key,label,value:value===undefined?null:value,unit,source,note});
async function entityInfo(db,a){
 if(a.entity_type==='production_run')return await one(db,"SELECT r.id,r.pro,r.material,r.status,r.planned_qty,r.actual_qty,r.good_qty,r.reject_qty,r.start_ts,r.end_ts,m.code machine,m.name machine_name FROM production_runs r LEFT JOIN machine_registry m ON m.id=r.machine_id WHERE r.id=?",a.entity_id)||{};
 if(a.entity_type==='downtime')return await one(db,"SELECT d.id,d.class,d.code,d.reason,d.root_cause,d.status,d.start_ts,d.end_ts,m.code machine,m.name machine_name FROM downtime_events d LEFT JOIN machine_registry m ON m.id=d.machine_id WHERE d.id=?",a.entity_id)||{};
 if(a.entity_type==='quality')return await one(db,"SELECT q.id,q.event_type,q.sample_qty,q.good_qty,q.reject_qty,q.decision,q.note,q.created_ts,m.code machine,m.name machine_name,r.pro FROM quality_events q LEFT JOIN machine_registry m ON m.id=q.machine_id LEFT JOIN production_runs r ON r.id=q.run_id WHERE q.id=?",a.entity_id)||{};
 return {};
}
async function roleDashboard(db,dept){
 const metrics=[];
 if(dept==='PROD'){
  const running=Number((await one(db,"SELECT COUNT(*) n FROM production_runs WHERE status='RUNNING'"))?.n||0);
  const openDown=Number((await one(db,"SELECT COUNT(*) n FROM downtime_events WHERE status='OPEN'"))?.n||0);
  const online=Number((await one(db,"SELECT COUNT(*) n FROM machine_registry WHERE active=1 AND heartbeat_at IS NOT NULL AND datetime(heartbeat_at,'+3 minutes')>=datetime('now')"))?.n||0);
  metrics.push(metric('running','PRO aktif',running,'','Realtime HMI'),metric('downtime','Downtime aktif',openDown,'','Realtime HMI'),metric('online','Mesin heartbeat',online,'','Machine registry'),metric('records','Register hasil produksi',await countEntries(db,'production'),'','Transaksi terpetakan'));
 }
 if(dept==='QC'){
  const q=await one(db,"SELECT COUNT(*) events,COALESCE(SUM(sample_qty),0) sample,COALESCE(SUM(good_qty),0) good,COALESCE(SUM(reject_qty),0) reject FROM quality_events WHERE created_ts>=datetime('now','-30 days')")||{};
  const rate=Number(q.sample)>0?Number(q.good)/Number(q.sample):null;
  metrics.push(metric('events','Quality event 30 hari',Number(q.events||0),'','HMI Quality'),metric('sample','Sample live',Number(q.sample||0),'','HMI Quality'),metric('reject','Reject live',Number(q.reject||0),'','HMI Quality'),metric('quality_rate','Quality rate live',rate,'ratio','HMI Quality','Good / sample pada event live; tidak mengganti definisi historis workbook'),metric('records','Register QC historis',await countEntries(db,'quality'),'','Transaksi terpetakan'));
 }
 if(dept==='MTC'){
  const calls=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN status<>'CLOSED' THEN 1 ELSE 0 END) open_calls,AVG(CASE WHEN acknowledged_ts IS NOT NULL THEN (julianday(acknowledged_ts)-julianday(requested_ts))*1440.0 END) response_min,AVG(CASE WHEN closed_ts IS NOT NULL AND acknowledged_ts IS NOT NULL THEN (julianday(closed_ts)-julianday(acknowledged_ts))*1440.0 END) repair_min FROM maintenance_calls WHERE requested_ts>=datetime('now','-30 days')")||{};
  const run=await one(db,"SELECT SUM((julianday(end_ts)-julianday(start_ts))*24.0) run_hours FROM production_runs WHERE end_ts IS NOT NULL AND start_ts>=datetime('now','-30 days')")||{};
  const br=Number((await one(db,"SELECT COUNT(*) n FROM downtime_events WHERE class='UPDT' AND start_ts>=datetime('now','-30 days')"))?.n||0),hours=Number(run.run_hours||0),mtbf=br>0&&hours>0?hours/br:null;
  metrics.push(metric('open_calls','Maintenance call aktif',Number(calls.open_calls||0),'','Maintenance call'),metric('response','Response time rata-rata',calls.response_min==null?null:Number(calls.response_min),'menit','Maintenance call','Requested → acknowledged'),metric('mttr','MTTR maintenance live',calls.repair_min==null?null:Number(calls.repair_min),'menit','Maintenance call','Acknowledged → closed; hanya event live'),metric('mtbf','MTBF live estimate',mtbf,'jam','Production run + UPDT','Run hours / jumlah UPDT 30 hari; tampil — bila data live belum cukup'),metric('records','Register corrective',await countEntries(db,'maintenance'),'','Transaksi terpetakan'));
 }
 if(dept==='PPIC'){
  const planning=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN json_extract(payload,'$.status') IN ('Released','Direncanakan') THEN 1 ELSE 0 END) ready,SUM(CASE WHEN json_extract(payload,'$.status')='Dimulai' THEN 1 ELSE 0 END) started FROM entries WHERE module='planning' AND deleted=0")||{};
  metrics.push(metric('planning','Planning terdaftar',Number(planning.total||0),'','Planning D1'),metric('ready','Planning siap/dirilis',Number(planning.ready||0),'','Planning D1'),metric('started','Planning dimulai',Number(planning.started||0),'','Planning D1'),metric('confirmation','Konfirmasi terdaftar',await countEntries(db,'confirmation'),'','Konfirmasi PPIC'));
 }
 if(dept==='PDS'){
  const d=await one(db,"SELECT COUNT(*) total,SUM(CASE WHEN CAST(json_extract(payload,'$.cost') AS REAL)>0 THEN CAST(json_extract(payload,'$.cost') AS REAL) ELSE 0 END) cost FROM entries WHERE module='development' AND deleted=0")||{};
  metrics.push(metric('trial','Trial/development',Number(d.total||0),'','Register Development'),metric('cost','Biaya tercatat',Number(d.cost||0),'Rp','Register Development','Mengikuti nilai sumber; anomali workbook tetap ditandai di Kualitas Data'));
 }
 if(dept==='PROJECT'){
  const p=await one(db,"SELECT COUNT(*) total,AVG(CASE WHEN CAST(json_extract(payload,'$.progress') AS REAL) BETWEEN 0 AND 100 THEN CAST(json_extract(payload,'$.progress') AS REAL) END) progress FROM entries WHERE module='project' AND deleted=0")||{};
  const readiness=Number((await one(db,"SELECT COUNT(*) n FROM settings WHERE key LIKE 'RELEASE_READINESS.%'"))?.n||0);
  metrics.push(metric('projects','Action plan / project',Number(p.total||0),'','Project register'),metric('progress','Progress rata-rata',p.progress==null?null:Number(p.progress),'persen','Project register'),metric('master','Master data',await countEntries(db,'master'),'','Master register'),metric('readiness','Readiness configuration',readiness,'area','Release governance'));
 }
 return metrics;
}
export async function handleReleaseV11(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(req.method!=='GET'||!['/api/approvals','/api/role-dashboard'].includes(path))return null;
 const {u,error}=await authorizedUser(req,env);if(error)return error;
 if(path==='/api/role-dashboard'){
   const requested=String(url.searchParams.get('department')||u.department||'PROJECT').toUpperCase();
   const dept=u.role==='superadmin'?requested:u.department;
   if(!['PROD','QC','MTC','PPIC','PDS','PROJECT'].includes(dept))return json(req,env,{error:'Department tidak valid'},400);
   return json(req,env,{department:dept,generated_at:now(),metrics:await roleDashboard(env.DB,dept)});
 }
 const types=scopeTypes(u);if(!types.length)return json(req,env,{rows:[],summary:{pending:0,approved:0,rejected:0,total:0},can_decide:false});
 const placeholders=types.map(()=>'?').join(',');
 const rows=await all(env.DB,`SELECT a.*,ru.name requested_by_name,du.name decided_by_name FROM approvals a LEFT JOIN users ru ON ru.id=a.requested_by LEFT JOIN users du ON du.id=a.decided_by WHERE a.entity_type IN (${placeholders}) ORDER BY CASE a.status WHEN 'PENDING' THEN 0 ELSE 1 END,a.requested_ts DESC LIMIT 250`,...types);
 for(const a of rows)a.entity=await entityInfo(env.DB,a);
 const summary={pending:rows.filter(x=>x.status==='PENDING').length,approved:rows.filter(x=>x.status==='APPROVED').length,rejected:rows.filter(x=>x.status==='REJECTED').length,total:rows.length};
 return json(req,env,{rows,summary,can_decide:rows.some(a=>a.status==='PENDING'&&canReview(u,a.entity_type))});
}
export async function captureReleaseV11(req){
 if(req.method!=='POST')return null;const path=new URL(req.url).pathname;
 if(!['/api/shopfloor/finish','/api/shopfloor/downtime/stop','/api/shopfloor/quality'].includes(path))return null;
 try{return {path,body:await req.clone().json()};}catch{return {path,body:{}};}
}
export async function afterReleaseV11(signal,response,req,env){
 if(!signal||!response?.ok)return;
 const u=await auth(req,env);if(!u)return;
 let entityType='',entityId='',step='VERIFY';
 if(signal.path==='/api/shopfloor/finish'){entityType='production_run';entityId=signal.body.run_id||'';step='FINAL_VERIFY';}
 if(signal.path==='/api/shopfloor/downtime/stop'){entityType='downtime';entityId=signal.body.id||'';step='ROOT_CAUSE_VERIFY';}
 if(signal.path==='/api/shopfloor/quality'){
   entityType='quality';step='QC_VERIFY';
   try{entityId=(await response.clone().json()).id||'';}catch{}
 }
 if(!entityType||!entityId)return;
 await run(env.DB,"INSERT INTO approvals(id,entity_type,entity_id,step,status,requested_by,requested_ts) VALUES(?,?,?,?, 'PENDING',?,?) ON CONFLICT(entity_type,entity_id,step) DO NOTHING",uid(),entityType,entityId,step,u.id,now());
}
