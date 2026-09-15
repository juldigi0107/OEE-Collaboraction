const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const parse=(v,f=[])=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const json=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&parse(u.permissions,[]).includes(action));
const present=v=>v!==undefined&&v!==null&&clean(v)!=='';
async function governance(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.kpi_definitions'"),cfg=parse(row?.value,{}),approved=cfg?.approved===true,rule=['good_total','good_nc_total'].includes(cfg?.quality_rule)?cfg.quality_rule:'good_total';return {approved,rule,label:rule==='good_nc_total'?'(Good + NC) / Total':'Good / Total',updated_at:cfg?.updated_at||null};}
const freshHeartbeat=v=>{const t=Date.parse(v||'');return Number.isFinite(t)&&Date.now()-t<180000;};
export async function handleHmiOeeV81(req,env){
 const path=new URL(req.url).pathname;if(req.method!=='POST'||path!=='/api/shopfloor/finish')return null;
 const u=await auth(req,env);if(!u)return json(req,env,{error:'Silakan login kembali'},401);const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return json(req,env,{error:'Ganti password awal terlebih dahulu'},403);if(!allow(u,'PROD','update'))return json(req,env,{error:'Tidak memiliki izin Finish PRO'},403);
 let b;try{b=await req.clone().json();}catch{return json(req,env,{error:'Payload Finish PRO tidak valid'},400);}const id=clean(b.run_id),r=await one(env.DB,"SELECT * FROM production_runs WHERE id=? AND status='RUNNING'",id);if(!r)return json(req,env,{error:'PRO aktif tidak ditemukan atau sudah diproses'},409);if(await one(env.DB,"SELECT id FROM downtime_events WHERE run_id=? AND status='OPEN'",id))return json(req,env,{error:'Tutup downtime dahulu'},409);
 const gov=await governance(env),st=await one(env.DB,'SELECT counter FROM machine_state WHERE machine_id=?',r.machine_id),endCounter=Number(st?.counter??r.start_counter??0),actual=present(b.actual_qty)?Number(b.actual_qty):Math.max(0,endCounter-Number(r.start_counter||0)),reject=Number(b.reject_qty||0),ncProvided=present(b.nc_qty),nc=ncProvided?Number(b.nc_qty):0;
 if(gov.approved&&gov.rule==='good_nc_total'&&!ncProvided)return json(req,env,{error:'NC wajib diisi karena Quality Printing authoritative menggunakan (Good + NC) / Total'},409);
 if([actual,reject,nc].some(x=>!Number.isFinite(x)||x<0))return json(req,env,{error:'Actual, Reject, dan NC harus berupa angka tidak negatif'},400);
 const good=present(b.good_qty)?Number(b.good_qty):Math.max(0,actual-reject-nc);if(!Number.isFinite(good)||good<0)return json(req,env,{error:'Good Qty tidak valid'},400);if(good+reject+nc>actual+1e-9)return json(req,env,{error:'Good + NC + Reject tidak boleh melebihi Actual Qty'},400);
 const quality=actual>0?(gov.rule==='good_nc_total'?(good+nc)/actual:good/actual):null,complete=Math.abs(good+reject+nc-actual)<=1e-6,ts=new Date().toISOString();
 const done=await run(env.DB,"UPDATE production_runs SET status='FINISHED',actual_qty=?,good_qty=?,reject_qty=?,nc_qty=?,end_counter=?,end_ts=?,quality_rule=?,governance_approved=?,governance_updated_at=?,version=version+1 WHERE id=? AND status='RUNNING'",actual,good,reject,ncProvided?nc:null,endCounter,ts,gov.rule,gov.approved?1:0,gov.updated_at,id);if(Number(done?.meta?.changes||0)!==1)return json(req,env,{error:'Finish PRO sudah diproses oleh request lain'},409);
 const registry=await one(env.DB,'SELECT heartbeat_at FROM machine_registry WHERE id=?',r.machine_id),nextState=freshHeartbeat(registry?.heartbeat_at)?'IDLE':'OFFLINE';await run(env.DB,"UPDATE machine_state SET state=?,pro=NULL,material=NULL,since_ts=?,updated_ts=? WHERE machine_id=?",nextState,ts,ts,r.machine_id);
 return json(req,env,{ok:true,id,actual_qty:actual,good_qty:good,nc_qty:ncProvided?nc:null,reject_qty:reject,unclassified_qty:Math.max(0,actual-good-nc-reject),classification_complete:complete,quality_rate:Number.isFinite(quality)?quality:null,quality_rule:gov.rule,quality_rule_label:gov.label,governance_approved:gov.approved,governance_updated_at:gov.updated_at,concurrency_guard:'atomic_status_transition'});
}
export const HmiOeeV81={governance};
