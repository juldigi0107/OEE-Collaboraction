const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const J=(v,f={})=>{try{return JSON.parse(v||'{}')}catch{return f}};
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const out=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const cleanCode=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_.-]/g,'').slice(0,64);
const machineId=code=>'machine:'+cleanCode(code);
const bucketMinute=ts=>new Date(ts||Date.now()).toISOString().slice(0,16)+':00.000Z';
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&J(u.permissions,[]).includes(action));
async function authUser(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function secureSecret(req,env,keyName,header='X-Edge-Key'){const got=req.headers.get(header)||'';const want=env[keyName]||'';return !!want&&(await sha(got))===(await sha(want));}
function mapped(obj,path){if(!path)return undefined;return String(path).split('.').reduce((v,k)=>v==null?undefined:v[k],obj);}
function normalizeItem(item,mapping={}){const r={};for(const [to,from] of Object.entries(mapping||{}))r[to]=mapped(item,from);return r;}
export async function ingestMachineEvents(env,events,source='edge'){
 const db=env.DB;let accepted=0;
 for(const raw of (events||[]).slice(0,100)){
  const code=cleanCode(raw.machine_code||raw.machine||raw.code);if(!code)continue;
  const id=machineId(code),ts=new Date(raw.ts||Date.now()).toISOString(),state=String(raw.state||'UNKNOWN').toUpperCase().slice(0,24),eventType=String(raw.event_type||'snapshot').toLowerCase().slice(0,32),counter=Number(raw.counter||0),speed=Number(raw.speed||0);
  await run(db,"INSERT INTO machine_registry(id,code,name,department,source_type,active,heartbeat_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name,source_type=excluded.source_type,active=1,heartbeat_at=excluded.heartbeat_at",id,code,String(raw.name||code).slice(0,120),'PROD',source,ts);
  await run(db,"INSERT INTO machine_state(machine_id,state,pro,material,shift,group_name,counter,speed,alarm,since_ts,updated_ts,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(machine_id) DO UPDATE SET since_ts=CASE WHEN machine_state.state<>excluded.state THEN excluded.updated_ts ELSE machine_state.since_ts END,state=excluded.state,pro=COALESCE(excluded.pro,machine_state.pro),material=COALESCE(excluded.material,machine_state.material),shift=COALESCE(excluded.shift,machine_state.shift),group_name=COALESCE(excluded.group_name,machine_state.group_name),counter=excluded.counter,speed=excluded.speed,alarm=excluded.alarm,updated_ts=excluded.updated_ts,source=excluded.source",id,state,raw.pro||null,raw.material||null,raw.shift||null,raw.group||raw.group_name||null,Number.isFinite(counter)?counter:0,Number.isFinite(speed)?speed:0,raw.alarm?String(raw.alarm).slice(0,300):null,ts,ts,source);
  await run(db,"INSERT INTO machine_minute_snapshot(machine_id,bucket_ts,counter,speed,state,pro,payload) VALUES(?,?,?,?,?,?,?) ON CONFLICT(machine_id,bucket_ts) DO UPDATE SET counter=excluded.counter,speed=excluded.speed,state=excluded.state,pro=excluded.pro,payload=excluded.payload",id,bucketMinute(ts),Number.isFinite(counter)?counter:0,Number.isFinite(speed)?speed:0,state,raw.pro||null,JSON.stringify(raw));
  if(!['snapshot','heartbeat','counter'].includes(eventType))await run(db,'INSERT INTO machine_events(id,machine_id,event_type,event_ts,state,counter,payload) VALUES(?,?,?,?,?,?,?)',uid(),id,eventType,ts,state,Number.isFinite(counter)?counter:null,JSON.stringify(raw));
  accepted++;
 }
 return accepted;
}
async function syncConnection(env,c){
 const db=env.DB,started=now(),logId=uid(),cfg=J(c.config,{});await run(db,'INSERT INTO integration_sync_log(id,connection_id,started_ts,status) VALUES(?,?,?,?)',logId,c.id,started,'RUNNING');
 try{
  if(!c.base_url)throw Error('Alamat koneksi belum diisi');
  const headers={'Accept':'application/json'};const secret=c.secret_env?env[c.secret_env]:null;if(secret)headers[cfg.auth_header||'Authorization']=(cfg.auth_prefix??'Bearer ')+secret;
  const r=await fetch(c.base_url,{headers});if(!r.ok)throw Error('HTTP '+r.status);const payload=await r.json();let items=cfg.items_path?mapped(payload,cfg.items_path):payload;if(!Array.isArray(items))items=[items];let rows=0;
  if(cfg.target==='machine_events')rows=await ingestMachineEvents(env,items.map(x=>({...x,...normalizeItem(x,cfg.mapping)})),c.system.toLowerCase());
  else if(cfg.target==='planning'){
   for(const item of items.slice(0,500)){const m={...item,...normalizeItem(item,cfg.mapping)},external=String(m.id||m.order||m.pro||uid()),id='sync:'+c.id+':'+external,p={title:m.title||('Planning '+(m.pro||external)),date:m.date||new Date().toISOString().slice(0,10),machine:m.machine||'',shift:m.shift||'',group:m.group||'',pro:m.pro||external,material:m.material||'',target:Number(m.target||m.qty||0),status:m.status||'Direncanakan',source_system:c.system,external_id:external};await run(db,"INSERT INTO entries(id,module,department,payload,version,deleted) VALUES(?,'planning','PPIC',?,1,0) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=entries.version+1,updated=CURRENT_TIMESTAMP",id,JSON.stringify(p));rows++;}
  }
  const finished=now();await run(db,"UPDATE integration_connections SET last_sync=?,last_status='OK',last_message=? WHERE id=?",finished,rows+' record tersinkron',c.id);await run(db,"UPDATE integration_sync_log SET finished_ts=?,status='OK',rows_in=?,message=? WHERE id=?",finished,rows,'Sinkron berhasil',logId);return {ok:true,rows};
 }catch(e){const finished=now();await run(db,"UPDATE integration_connections SET last_sync=?,last_status='ERROR',last_message=? WHERE id=?",finished,String(e.message).slice(0,500),c.id);await run(db,"UPDATE integration_sync_log SET finished_ts=?,status='ERROR',message=? WHERE id=?",finished,String(e.message).slice(0,500),logId);return {ok:false,error:e.message};}
}
export async function runScheduledIntegrations(env){const due=await all(env.DB,"SELECT * FROM integration_connections WHERE enabled=1 AND mode NOT IN ('EDGE_PUSH','PULL_FEED') AND (last_sync IS NULL OR datetime(last_sync,'+'||poll_minutes||' minutes')<=datetime('now'))");for(const c of due)await syncConnection(env,c);}
export async function runAutomation(env){
 const db=env.DB;const stale=await all(db,"SELECT * FROM downtime_events WHERE status='OPEN' AND class='UPDT' AND maintenance_call_id IS NULL AND datetime(start_ts,'+10 minutes')<=datetime('now') LIMIT 50");
 for(const d of stale){const id=uid();await run(db,"INSERT INTO maintenance_calls(id,machine_id,run_id,downtime_id,priority,requested_by,status,note) VALUES(?,?,?,?,?,'SYSTEM','OPEN',?)",id,d.machine_id,d.run_id,d.id,'HIGH','Otomatis: downtime > 10 menit');await run(db,'UPDATE downtime_events SET maintenance_call_id=? WHERE id=?',id,d.id);}
 await run(db,"UPDATE machine_state SET state='OFFLINE' WHERE machine_id IN (SELECT id FROM machine_registry WHERE heartbeat_at IS NULL OR datetime(heartbeat_at,'+3 minutes')<datetime('now')) AND updated_ts<datetime('now','-3 minutes')");
}
async function qlikFeed(env){const db=env.DB;return {generated_at:now(),machines:await all(db,"SELECT r.code,r.name,s.* FROM machine_registry r LEFT JOIN machine_state s ON s.machine_id=r.id WHERE r.active=1 ORDER BY r.code"),runs:await all(db,"SELECT * FROM production_runs WHERE start_ts>=datetime('now','-7 days') ORDER BY start_ts DESC LIMIT 5000"),downtime:await all(db,"SELECT * FROM downtime_events WHERE start_ts>=datetime('now','-7 days') ORDER BY start_ts DESC LIMIT 5000"),quality:await all(db,"SELECT * FROM quality_events WHERE created_ts>=datetime('now','-7 days') ORDER BY created_ts DESC LIMIT 5000")};}
export async function handleRealtime(req,env){
 const url=new URL(req.url),path=url.pathname,method=req.method,db=env.DB;
 try{
  if(path==='/api/edge/events'&&method==='POST'){
   if(!await secureSecret(req,env,'EDGE_INGEST_KEY'))fail(401,'Edge key tidak valid');const b=await req.json();const events=Array.isArray(b)?b:b.events;if(!Array.isArray(events))fail(400,'events wajib berupa array');return out({ok:true,accepted:await ingestMachineEvents(env,events,'machine-edge')});
  }
  if(path==='/api/integrations/qlik/feed'&&method==='GET'){
   if(!await secureSecret(req,env,'QLIK_FEED_KEY','X-Integration-Key'))fail(401,'Integration key tidak valid');return out(await qlikFeed(env));
  }
  const u=await authUser(req,env);if(!u)fail(401,'Silakan login kembali');
  if(path==='/api/realtime/overview'&&method==='GET')return out({generated_at:now(),machines:await all(db,"SELECT r.code,r.name,r.heartbeat_at,s.* FROM machine_registry r LEFT JOIN machine_state s ON s.machine_id=r.id WHERE r.active=1 ORDER BY r.code"),runs:await all(db,"SELECT * FROM production_runs WHERE status='RUNNING' ORDER BY start_ts"),downtime:await all(db,"SELECT * FROM downtime_events WHERE status='OPEN' ORDER BY start_ts"),maintenance:await all(db,"SELECT * FROM maintenance_calls WHERE status<>'CLOSED' ORDER BY requested_ts"),integrations:u.role==='superadmin'?await all(db,'SELECT id,system,mode,enabled,poll_minutes,last_sync,last_status,last_message FROM integration_connections ORDER BY system'):[]});
  if(path==='/api/shopfloor/plans'&&method==='GET')return out(await all(db,"SELECT id,payload,version,updated FROM entries WHERE module='planning' AND deleted=0 AND json_extract(payload,'$.status') IN ('Draft','Direncanakan','Released') ORDER BY json_extract(payload,'$.date'),updated LIMIT 200"));
  if(path==='/api/shopfloor/start'&&method==='POST'){
   if(!allow(u,'PROD','create'))fail(403,'Akun ini hanya dapat melihat HMI');const b=await req.json(),code=cleanCode(b.machine),mid=machineId(code);if(!code||!b.pro)fail(400,'Mesin dan PRO wajib dipilih');const checks=b.checklist||{};if(!['material','qc','safety','tools'].every(k=>checks[k]===true))fail(409,'Checklist material, QC, safety dan tools harus lengkap sebelum Start PRO');if(await one(db,"SELECT id FROM production_runs WHERE machine_id=? AND status='RUNNING'",mid))fail(409,'Mesin masih memiliki PRO aktif');
   await run(db,"INSERT INTO machine_registry(id,code,name,source_type,active,heartbeat_at) VALUES(?,?,?,'hmi',1,?) ON CONFLICT(code) DO NOTHING",mid,code,code,now());const st=await one(db,'SELECT counter FROM machine_state WHERE machine_id=?',mid),id=uid();await run(db,'INSERT INTO production_runs(id,machine_id,pro,material,shift,group_name,operator_user_id,status,planned_qty,start_counter,start_ts,source) VALUES(?,?,?,?,?,?,?,\'RUNNING\',?,?,?,\'hmi\')',id,mid,String(b.pro),b.material||null,b.shift||null,b.group||null,u.id,Number(b.planned_qty||0),Number(st?.counter||0),now());await run(db,"INSERT INTO machine_state(machine_id,state,pro,material,shift,group_name,counter,speed,since_ts,updated_ts,source) VALUES(?,?,?,?,?,?,0,0,?,?,?) ON CONFLICT(machine_id) DO UPDATE SET state='RUNNING',pro=excluded.pro,material=excluded.material,shift=excluded.shift,group_name=excluded.group_name,since_ts=excluded.since_ts,updated_ts=excluded.updated_ts",mid,'RUNNING',String(b.pro),b.material||null,b.shift||null,b.group||null,now(),now(),'hmi');if(b.plan_id)await run(db,"UPDATE entries SET payload=json_set(payload,'$.status','Dimulai'),version=version+1,updated=CURRENT_TIMESTAMP WHERE id=? AND module='planning'",b.plan_id);return out({ok:true,id});
  }
  if(path==='/api/shopfloor/finish'&&method==='POST'){
   if(!allow(u,'PROD','update'))fail(403,'Tidak memiliki izin Finish PRO');const b=await req.json(),r=await one(db,"SELECT * FROM production_runs WHERE id=? AND status='RUNNING'",b.run_id);if(!r)fail(404,'PRO aktif tidak ditemukan');const st=await one(db,'SELECT counter FROM machine_state WHERE machine_id=?',r.machine_id),endCounter=Number(st?.counter||r.start_counter||0),actual=b.actual_qty!==undefined?Number(b.actual_qty):Math.max(0,endCounter-Number(r.start_counter||0)),reject=Number(b.reject_qty||0),good=b.good_qty!==undefined?Number(b.good_qty):Math.max(0,actual-reject);await run(db,"UPDATE production_runs SET status='FINISHED',actual_qty=?,good_qty=?,reject_qty=?,end_counter=?,end_ts=?,version=version+1 WHERE id=?",actual,good,reject,endCounter,now(),r.id);await run(db,"UPDATE machine_state SET state='IDLE',pro=NULL,material=NULL,since_ts=?,updated_ts=? WHERE machine_id=?",now(),now(),r.machine_id);return out({ok:true,actual_qty:actual,good_qty:good,reject_qty:reject});
  }
  if(path==='/api/shopfloor/downtime/start'&&method==='POST'){
   if(!allow(u,'PROD','create'))fail(403,'Tidak memiliki izin input downtime');const b=await req.json();if(!['PDT','UPDT','COJ'].includes(b.class))fail(400,'Class downtime tidak valid');const r=await one(db,"SELECT * FROM production_runs WHERE id=? AND status='RUNNING'",b.run_id);if(!r)fail(404,'PRO aktif tidak ditemukan');if(await one(db,"SELECT id FROM downtime_events WHERE machine_id=? AND status='OPEN'",r.machine_id))fail(409,'Masih ada downtime aktif');const id=uid();await run(db,'INSERT INTO downtime_events(id,run_id,machine_id,class,department,code,reason,root_cause,owner_department,start_ts,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,? ,\'OPEN\',?)',id,r.id,r.machine_id,b.class,b.department||null,b.code||null,b.reason||null,b.root_cause||null,b.owner_department||null,now(),u.id);await run(db,"UPDATE machine_state SET state=?,since_ts=?,updated_ts=? WHERE machine_id=?",b.class,now(),now(),r.machine_id);return out({ok:true,id});
  }
  if(path==='/api/shopfloor/downtime/stop'&&method==='POST'){
   if(!allow(u,'PROD','update'))fail(403,'Tidak memiliki izin menutup downtime');const b=await req.json(),d=await one(db,"SELECT * FROM downtime_events WHERE id=? AND status='OPEN'",b.id);if(!d)fail(404,'Downtime aktif tidak ditemukan');await run(db,"UPDATE downtime_events SET end_ts=?,status='CLOSED',root_cause=COALESCE(?,root_cause) WHERE id=?",now(),b.root_cause||null,d.id);await run(db,"UPDATE machine_state SET state='RUNNING',since_ts=?,updated_ts=? WHERE machine_id=?",now(),now(),d.machine_id);return out({ok:true});
  }
  if(path==='/api/shopfloor/quality'&&method==='POST'){
   if(!allow(u,'QC','create')&&!allow(u,'PROD','create'))fail(403,'Tidak memiliki izin input quality event');const b=await req.json(),r=await one(db,'SELECT * FROM production_runs WHERE id=?',b.run_id);if(!r)fail(404,'PRO tidak ditemukan');const id=uid();await run(db,'INSERT INTO quality_events(id,run_id,machine_id,event_type,sample_qty,good_qty,reject_qty,decision,note,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)',id,r.id,r.machine_id,b.event_type||'NG',Number(b.sample_qty||0),Number(b.good_qty||0),Number(b.reject_qty||0),b.decision||null,b.note||null,u.id);return out({ok:true,id});
  }
  if(path==='/api/shopfloor/maintenance/call'&&method==='POST'){
   if(!allow(u,'PROD','create')&&!allow(u,'MTC','create'))fail(403,'Tidak memiliki izin memanggil maintenance');const b=await req.json(),d=b.downtime_id?await one(db,'SELECT * FROM downtime_events WHERE id=?',b.downtime_id):null,mid=d?.machine_id||machineId(b.machine);const id=uid();await run(db,'INSERT INTO maintenance_calls(id,machine_id,run_id,downtime_id,priority,requested_by,status,note) VALUES(?,?,?,?,?,?,\'OPEN\',?)',id,mid,d?.run_id||b.run_id||null,d?.id||null,b.priority||'HIGH',u.id,b.note||null);if(d)await run(db,'UPDATE downtime_events SET maintenance_call_id=? WHERE id=?',id,d.id);return out({ok:true,id});
  }
  if(path==='/api/shopfloor/maintenance/ack'&&method==='POST'){
   if(!allow(u,'MTC','update'))fail(403,'Khusus maintenance');const b=await req.json();await run(db,"UPDATE maintenance_calls SET status='ACKNOWLEDGED',acknowledged_ts=?,acknowledged_by=? WHERE id=? AND status='OPEN'",now(),u.id,b.id);return out({ok:true});
  }
  if(path==='/api/shopfloor/maintenance/close'&&method==='POST'){
   if(!allow(u,'MTC','update'))fail(403,'Khusus maintenance');const b=await req.json();await run(db,"UPDATE maintenance_calls SET status='CLOSED',closed_ts=?,acknowledged_by=COALESCE(acknowledged_by,?),note=COALESCE(?,note) WHERE id=?",now(),u.id,b.note||null,b.id);return out({ok:true});
  }
  if(path==='/api/approvals'&&method==='POST'){
   const b=await req.json();if(!['production_run','downtime','quality'].includes(b.entity_type))fail(400,'Jenis approval tidak valid');const id=uid();await run(db,"INSERT INTO approvals(id,entity_type,entity_id,step,status,requested_by) VALUES(?,?,?,?, 'PENDING',?) ON CONFLICT(entity_type,entity_id,step) DO NOTHING",id,b.entity_type,b.entity_id,b.step||'VERIFY',u.id);return out({ok:true,id});
  }
  if(path==='/api/approvals/decide'&&method==='POST'){
   if(!['superadmin','admin'].includes(u.role))fail(403,'Khusus approver');const b=await req.json();if(!['APPROVED','REJECTED'].includes(b.status))fail(400,'Keputusan tidak valid');await run(db,'UPDATE approvals SET status=?,decided_by=?,decided_ts=?,note=? WHERE id=?',b.status,u.id,now(),b.note||null,b.id);return out({ok:true});
  }
  if(path==='/api/integrations'&&method==='GET'){if(u.role!=='superadmin')fail(403,'Khusus superadmin');return out(await all(db,'SELECT * FROM integration_connections ORDER BY system'));}
  if(path==='/api/integrations'&&method==='PUT'){
   if(u.role!=='superadmin')fail(403,'Khusus superadmin');const b=await req.json(),old=await one(db,'SELECT * FROM integration_connections WHERE id=?',b.id);if(!old)fail(404,'Koneksi tidak ditemukan');const cfg=typeof b.config==='object'?JSON.stringify(b.config):old.config;await run(db,'UPDATE integration_connections SET mode=?,base_url=?,secret_env=?,enabled=?,poll_minutes=?,config=? WHERE id=?',b.mode||old.mode,b.base_url??old.base_url,b.secret_env??old.secret_env,b.enabled?1:0,Math.max(1,Number(b.poll_minutes||old.poll_minutes||5)),cfg,b.id);return out({ok:true});
  }
  if(path==='/api/integrations/test'&&method==='POST'){if(u.role!=='superadmin')fail(403,'Khusus superadmin');const b=await req.json(),c=await one(db,'SELECT * FROM integration_connections WHERE id=?',b.id);if(!c)fail(404,'Koneksi tidak ditemukan');if(c.mode==='EDGE_PUSH')return out({ok:!!env.EDGE_INGEST_KEY,message:env.EDGE_INGEST_KEY?'Edge ingest siap menerima event':'Secret EDGE_INGEST_KEY belum dipasang'});if(c.mode==='PULL_FEED')return out({ok:!!env.QLIK_FEED_KEY,message:env.QLIK_FEED_KEY?'Feed analytics siap':'Secret QLIK_FEED_KEY belum dipasang'});return out(await syncConnection(env,c));}
  if(path==='/api/integrations/sync'&&method==='POST'){if(u.role!=='superadmin')fail(403,'Khusus superadmin');const b=await req.json(),c=await one(db,'SELECT * FROM integration_connections WHERE id=?',b.id);if(!c)fail(404,'Koneksi tidak ditemukan');return out(await syncConnection(env,c));}
  return null;
 }catch(e){return out({error:e.status?e.message:'Realtime service error'},e.status||500);}
}