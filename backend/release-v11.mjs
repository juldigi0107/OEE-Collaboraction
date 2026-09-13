const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const parse=v=>{try{return JSON.parse(v||'[]')}catch{return []}};
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const json=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const entityDept=t=>t==='quality'?'QC':'PROD';
const canReview=(u,t)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===entityDept(t)&&parse(u.permissions).includes('update'));
const scopeTypes=u=>u?.role==='superadmin'?['production_run','downtime','quality']:u?.role==='admin'&&u.department==='PROD'?['production_run','downtime']:u?.role==='admin'&&u.department==='QC'?['quality']:[];
async function entityInfo(db,a){
 if(a.entity_type==='production_run')return one(db,"SELECT r.id,r.pro,r.material,r.status,r.planned_qty,r.actual_qty,r.good_qty,r.reject_qty,r.start_ts,r.end_ts,m.code machine,m.name machine_name FROM production_runs r LEFT JOIN machine_registry m ON m.id=r.machine_id WHERE r.id=?",a.entity_id)||{};
 if(a.entity_type==='downtime')return one(db,"SELECT d.id,d.class,d.code,d.reason,d.root_cause,d.status,d.start_ts,d.end_ts,m.code machine,m.name machine_name FROM downtime_events d LEFT JOIN machine_registry m ON m.id=d.machine_id WHERE d.id=?",a.entity_id)||{};
 if(a.entity_type==='quality')return one(db,"SELECT q.id,q.event_type,q.sample_qty,q.good_qty,q.reject_qty,q.decision,q.note,q.created_ts,m.code machine,m.name machine_name,r.pro FROM quality_events q LEFT JOIN machine_registry m ON m.id=q.machine_id LEFT JOIN production_runs r ON r.id=q.run_id WHERE q.id=?",a.entity_id)||{};
 return {};
}
export async function handleReleaseV11(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(path!=='/api/approvals'||req.method!=='GET')return null;
 const u=await auth(req,env);if(!u)return json(req,env,{error:'Silakan login kembali'},401);
 const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return json(req,env,{error:'Ganti password awal terlebih dahulu'},403);
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
