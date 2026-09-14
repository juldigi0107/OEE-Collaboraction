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

const BUILD_VERSION='6.2.0';
const RELEASE_FINGERPRINT=['data-governance-v16','uat-release-v17','machine-governance-v20','support-recovery-v21','access-governance-v28','display-lifecycle-v29','staged-import-v30','operational-control-v31','release-resilience-v33','period-aware-dashboard-v34','operational-safety-v35','planning-safety-v39','hmi-safety-v40','display-safety-v42','quality-unit-v44'];
let schemaReady=null;
async function addColumnIfMissing(env,table,column,ddl){
  const columns=(await env.DB.prepare(`PRAGMA table_info('${table}')`).all()).results||[];
  if(columns.some(x=>x.name===column))return;
  try{await env.DB.prepare(ddl).run();}catch(error){if(!/duplicate column/i.test(String(error?.message||error)))throw error;}
}
async function ensureAdditiveSchema(env){
  if(!schemaReady){
    schemaReady=(async()=>{
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS asset_catalog(id TEXT PRIMARY KEY,parent TEXT NOT NULL,path TEXT NOT NULL)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS asset_parent ON asset_catalog(parent)').run();
      await addColumnIfMissing(env,'quality_events','unit','ALTER TABLE quality_events ADD COLUMN unit TEXT');
    })().catch(error=>{schemaReady=null;throw error;});
  }
  return schemaReady;
}

export default {
  async fetch(req,env,ctx){
    const path=new URL(req.url).pathname;
    if(path==='/api/version')return new Response(JSON.stringify({ok:true,service:'OEE Collaboraction',version:BUILD_VERSION,storage:'D1-only',r2:false,release_fingerprint:RELEASE_FINGERPRINT}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
    if(['/api/assets','/api/import-data','/api/readiness','/api/shopfloor/quality','/api/role-dashboard'].includes(path))await ensureAdditiveSchema(env);
    const supportResponse=await handleSupportV21(req,env,BUILD_VERSION,RELEASE_FINGERPRINT);
    if(supportResponse)return supportResponse;
    const planningSafetyResponse=await handlePlanningSafetyV39(req,env);
    if(planningSafetyResponse)return planningSafetyResponse;
    const machineGovernanceResponse=await handleMachineGovernanceV20(req,env);
    if(machineGovernanceResponse)return machineGovernanceResponse;
    const operationalSafetyResponse=await handleOperationalSafetyV35(req,env);
    if(operationalSafetyResponse)return operationalSafetyResponse;
    const displaySafetyResponse=await handleDisplaySafetyV42(req,env);
    if(displaySafetyResponse)return displaySafetyResponse;
    const governanceResponse=await handleGovernanceV19(req,env);
    if(governanceResponse)return governanceResponse;
    const securityResponse=await handleSecurityV15(req,env);
    if(securityResponse)return securityResponse;
    const hmiSafetyResponse=await handleHmiSafetyV40(req,env);
    if(hmiSafetyResponse)return hmiSafetyResponse;
    const qualityUnitResponse=await handleQualityUnitV44(req,env);
    if(qualityUnitResponse)return qualityUnitResponse;
    const releaseResponse=await handleReleaseV11(req,env);
    if(releaseResponse)return releaseResponse;
    const signal=await captureReleaseV11(req);
    const response=await app.fetch(req,env,ctx);
    if(signal&&response.ok)ctx.waitUntil(afterReleaseV11(signal,response.clone(),req,env));
    return response;
  },
  scheduled(controller,env,ctx){
    return app.scheduled?.(controller,env,ctx);
  }
};
