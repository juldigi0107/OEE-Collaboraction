const clean=v=>String(v??'').trim();
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
export async function captureWorkflowLineageV50(req){
 if(req.method!=='POST')return null;const path=new URL(req.url).pathname;if(!['/api/shopfloor/start','/api/shopfloor/finish','/api/shopfloor/maintenance/close','/api/approvals/decide'].includes(path))return null;
 try{return {path,body:await req.clone().json()};}catch{return {path,body:{}};}
}
async function markPlan(env,planId,status,extra={}){
 if(!clean(planId))return;
 const row=await one(env.DB,"SELECT payload FROM entries WHERE id=? AND module='planning' AND deleted=0",planId);if(!row)return;
 let payload={};try{payload=JSON.parse(row.payload||'{}');}catch{}
 payload={...payload,status,...extra};
 await run(env.DB,"UPDATE entries SET payload=?,version=version+1,updated=CURRENT_TIMESTAMP WHERE id=? AND module='planning' AND deleted=0",JSON.stringify(payload),planId);
}
export async function afterWorkflowLineageV50(signal,response,env){
 if(!signal||!response?.ok)return;let body={};try{body=await response.clone().json();}catch{}
 if(signal.path==='/api/shopfloor/start'){
  const runId=clean(body.id),planId=clean(signal.body.plan_id);if(runId&&planId){await run(env.DB,'UPDATE production_runs SET plan_id=? WHERE id=?',planId,runId);await markPlan(env,planId,'Dimulai',{active_run_id:runId});}
 }
 if(signal.path==='/api/shopfloor/finish'){
  const runId=clean(signal.body.run_id);if(!runId)return;const r=await one(env.DB,'SELECT plan_id FROM production_runs WHERE id=?',runId);if(r?.plan_id)await markPlan(env,r.plan_id,'Selesai',{active_run_id:null,finished_run_id:runId});
 }
 if(signal.path==='/api/approvals/decide'){
  const approvalId=clean(signal.body.id);if(!approvalId)return;const a=await one(env.DB,"SELECT entity_type,entity_id,status,decided_ts FROM approvals WHERE id=?",approvalId);if(a?.entity_type!=='production_run')return;const r=await one(env.DB,'SELECT plan_id FROM production_runs WHERE id=?',a.entity_id);if(!r?.plan_id)return;if(a.status==='APPROVED')await markPlan(env,r.plan_id,'Terverifikasi',{verified_run_id:a.entity_id,verified_ts:a.decided_ts||new Date().toISOString()});else if(a.status==='REJECTED')await markPlan(env,r.plan_id,'Selesai',{verification_status:'REJECTED',verification_note:clean(signal.body.note)});
 }
 if(signal.path==='/api/shopfloor/maintenance/close'){
  const id=clean(signal.body.id),note=clean(signal.body.note);if(id&&note)await run(env.DB,'UPDATE maintenance_calls SET resolution_note=? WHERE id=? AND status=\'CLOSED\'',note,id);
 }
}
