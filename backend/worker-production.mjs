import app from './worker-v6.mjs';
import {handleReleaseV11,captureReleaseV11,afterReleaseV11} from './release-v11.mjs';
import {handleSecurityV15} from './release-v15-security.mjs';
import {handleGovernanceV19} from './release-v19-governance.mjs';
import {handleMachineGovernanceV20} from './release-v20-machine-governance.mjs';
import {handleSupportV21} from './release-v21-support.mjs';
import {handleOperationalSafetyV35} from './release-v35-operational-safety.mjs';
import {handlePlanningSafetyV39} from './release-v39-planning-safety.mjs';
import {handleHmiSafetyV40} from './release-v40-hmi-safety.mjs';
import {handleDisplaySafetyV42} from './release-v42-display-safety.mjs';
import {handleQualityUnitV44} from './release-v44-quality-unit.mjs';
import {handleDataLifecycleV46,runLifecycleHousekeepingV46} from './release-v46-data-lifecycle.mjs';
import {handleQueryPerformanceV47} from './release-v47-query-performance.mjs';
import {handleLiveRegisterV49,captureLiveRegisterV49,afterLiveRegisterV49,backfillLiveRegistersV49} from './release-v49-live-register.mjs';
import {handleWorkflowLineageV50,captureWorkflowLineageV50,afterWorkflowLineageV50} from './release-v50-workflow-lineage.mjs';
import {handleWorkflowReconciliationV51,reconcileWorkflowLineageV51} from './release-v51-workflow-reconciliation.mjs';

const BUILD_VERSION='6.2.0';
const RELEASE_FINGERPRINT=['data-governance-v16','uat-release-v17','machine-governance-v20','support-recovery-v21','access-governance-v28','display-lifecycle-v29','staged-import-v30','operational-control-v31','release-resilience-v33','period-aware-dashboard-v34','operational-safety-v35','planning-safety-v39','hmi-safety-v40','display-safety-v42','quality-unit-v44','kpi-semantics-v45','data-lifecycle-v46','query-index-v47','query-performance-v47','frontend-security-v48','live-register-v49','workflow-lineage-v50','workflow-reconciliation-v51'];
let schemaReady=null;
async function addColumnIfMissing(env,table,column,ddl){const columns=(await env.DB.prepare(`PRAGMA table_info('${table}')`).all()).results||[];if(columns.some(x=>x.name===column))return;try{await env.DB.prepare(ddl).run();}catch(error){if(!/duplicate column/i.test(String(error?.message||error)))throw error;}}
async function ensureAdditiveSchema(env){if(!schemaReady){schemaReady=(async()=>{await env.DB.prepare('CREATE TABLE IF NOT EXISTS asset_catalog(id TEXT PRIMARY KEY,parent TEXT NOT NULL,path TEXT NOT NULL)').run();await env.DB.prepare('CREATE INDEX IF NOT EXISTS asset_parent ON asset_catalog(parent)').run();await addColumnIfMissing(env,'quality_events','unit','ALTER TABLE quality_events ADD COLUMN unit TEXT');await addColumnIfMissing(env,'production_runs','unit','ALTER TABLE production_runs ADD COLUMN unit TEXT');await addColumnIfMissing(env,'production_runs','plan_id','ALTER TABLE production_runs ADD COLUMN plan_id TEXT');await addColumnIfMissing(env,'maintenance_calls','resolution_note','ALTER TABLE maintenance_calls ADD COLUMN resolution_note TEXT');const indexes=['CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires)','CREATE INDEX IF NOT EXISTS login_attempts_until ON login_attempts(until_ts)','CREATE INDEX IF NOT EXISTS entries_module_updated ON entries(module,deleted,updated DESC)','CREATE INDEX IF NOT EXISTS production_runs_start ON production_runs(start_ts DESC)','CREATE INDEX IF NOT EXISTS production_runs_plan ON production_runs(plan_id)','CREATE INDEX IF NOT EXISTS downtime_class_start ON downtime_events(class,start_ts DESC)','CREATE INDEX IF NOT EXISTS maintenance_calls_requested ON maintenance_calls(requested_ts DESC)','CREATE INDEX IF NOT EXISTS quality_events_created ON quality_events(created_ts DESC)','CREATE INDEX IF NOT EXISTS approvals_type_status_requested ON approvals(entity_type,status,requested_ts DESC)','CREATE INDEX IF NOT EXISTS integration_sync_connection ON integration_sync_log(connection_id,started_ts DESC)'];for(const sql of indexes)await env.DB.prepare(sql).run();})().catch(error=>{schemaReady=null;throw error;});}return schemaReady;}
function secureFrontendResponse(path,response){if(path.startsWith('/api/'))return response;const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','same-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');headers.set('Cross-Origin-Opener-Policy','same-origin');headers.set('Strict-Transport-Security','max-age=31536000');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' https://oee-collaboraction.offsetbmj.workers.dev; frame-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}

export default {
 async fetch(req,env,ctx){
  const path=new URL(req.url).pathname;
  if(path==='/api/version')return new Response(JSON.stringify({ok:true,service:'OEE Collaboraction',version:BUILD_VERSION,storage:'D1-only',r2:false,release_fingerprint:RELEASE_FINGERPRINT}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  if(['/api/assets','/api/import-data','/api/readiness','/api/release-manifest','/api/approvals','/api/shopfloor/quality','/api/role-dashboard','/api/shopfloor/start','/api/shopfloor/finish','/api/shopfloor/maintenance/close','/api/realtime/overview','/api/workflow-health'].includes(path))await ensureAdditiveSchema(env);
  const liveSignal=await captureLiveRegisterV49(req),workflowSignal=await captureWorkflowLineageV50(req);
  const lifecycleResponse=await handleDataLifecycleV46(req,env,BUILD_VERSION,RELEASE_FINGERPRINT);if(lifecycleResponse)return lifecycleResponse;
  const workflowHealthResponse=await handleWorkflowReconciliationV51(req,env);if(workflowHealthResponse)return workflowHealthResponse;
  const supportResponse=await handleSupportV21(req,env,BUILD_VERSION,RELEASE_FINGERPRINT);if(supportResponse)return supportResponse;
  const planningSafetyResponse=await handlePlanningSafetyV39(req,env);if(planningSafetyResponse)return planningSafetyResponse;
  const machineGovernanceResponse=await handleMachineGovernanceV20(req,env);if(machineGovernanceResponse){if(workflowSignal&&machineGovernanceResponse.ok)ctx.waitUntil(afterWorkflowLineageV50(workflowSignal,machineGovernanceResponse.clone(),env));return machineGovernanceResponse;}
  const operationalSafetyResponse=await handleOperationalSafetyV35(req,env);if(operationalSafetyResponse)return operationalSafetyResponse;
  const displaySafetyResponse=await handleDisplaySafetyV42(req,env);if(displaySafetyResponse)return displaySafetyResponse;
  const governanceResponse=await handleGovernanceV19(req,env);if(governanceResponse)return governanceResponse;
  const securityResponse=await handleSecurityV15(req,env);if(securityResponse)return securityResponse;
  const liveGuard=await handleLiveRegisterV49(req,env);if(liveGuard)return liveGuard;
  const hmiSafetyResponse=await handleHmiSafetyV40(req,env);if(hmiSafetyResponse)return hmiSafetyResponse;
  const qualityUnitResponse=await handleQualityUnitV44(req,env);if(qualityUnitResponse){if(liveSignal&&qualityUnitResponse.ok)ctx.waitUntil(afterLiveRegisterV49(liveSignal,qualityUnitResponse.clone(),env));return qualityUnitResponse;}
  const queryResponse=await handleQueryPerformanceV47(req,env);if(queryResponse)return queryResponse;
  const releaseResponse=await handleReleaseV11(req,env);if(releaseResponse)return releaseResponse;
  const workflowResponse=await handleWorkflowLineageV50(req,env);if(workflowResponse){if(liveSignal&&workflowResponse.ok)ctx.waitUntil(afterLiveRegisterV49(liveSignal,workflowResponse.clone(),env));return workflowResponse;}
  const signal=await captureReleaseV11(req),response=await app.fetch(req,env,ctx);
  if(signal&&response.ok)ctx.waitUntil(afterReleaseV11(signal,response.clone(),req,env));
  if(liveSignal&&response.ok)ctx.waitUntil(afterLiveRegisterV49(liveSignal,response.clone(),env));
  if(workflowSignal&&response.ok)ctx.waitUntil(afterWorkflowLineageV50(workflowSignal,response.clone(),env));
  return secureFrontendResponse(path,response);
 },
 scheduled(controller,env,ctx){const existing=app.scheduled?.(controller,env,ctx);ctx.waitUntil(runLifecycleHousekeepingV46(env));ctx.waitUntil(backfillLiveRegistersV49(env,50));ctx.waitUntil(reconcileWorkflowLineageV51(env,150));return existing;}
};
