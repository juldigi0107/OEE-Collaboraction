const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const clean=v=>String(v??'').trim();
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return {}}};
const unit=v=>clean(v).toLowerCase().replace(/\s+/g,' ').slice(0,24);

async function approvedFgUnit(env){
 const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.kpi_definitions'");
 const cfg=parse(row?.value);return cfg?.approved===true?unit(cfg.fg_unit):'';
}

export async function captureUnitLineageV46(req){
 if(req.method!=='POST'||new URL(req.url).pathname!=='/api/shopfloor/start')return null;
 try{const body=await req.clone().json();return {plan_id:clean(body?.plan_id)};}catch{return null;}
}

export async function afterUnitLineageV46(signal,response,env){
 if(!signal?.plan_id||!response?.ok)return;
 let result;try{result=await response.clone().json();}catch{return;}
 const runId=clean(result?.id);if(!runId)return;
 const plan=await one(env.DB,"SELECT payload FROM entries WHERE id=? AND module='planning' AND deleted=0",signal.plan_id);if(!plan)return;
 const payload=parse(plan.payload);let outputUnit=unit(payload.unit),source='planning.unit';
 if(!outputUnit){outputUnit=await approvedFgUnit(env);source=outputUnit?'DATA_GOVERNANCE.fg_unit':'';}
 if(!outputUnit)return;
 await env.DB.prepare('UPDATE production_runs SET unit=? WHERE id=?').bind(outputUnit,runId).run();
 await env.DB.prepare("INSERT INTO audit_log(id,user_id,action,entity,entity_id,after_json) VALUES(lower(hex(randomblob(16))),'SYSTEM','UNIT_LINEAGE','production_run',?,?)").bind(runId,JSON.stringify({unit:outputUnit,source,plan_id:signal.plan_id})).run().catch(()=>{});
}
