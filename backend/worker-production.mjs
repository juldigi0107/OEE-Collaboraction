import app from './worker-v6.mjs';
import {handleReleaseV11,captureReleaseV11,afterReleaseV11} from './release-v11.mjs';
import {handleSecurityV15} from './release-v15-security.mjs';
import {handleGovernanceV19} from './release-v19-governance.mjs';
import {handleMachineGovernanceV20} from './release-v20-machine-governance.mjs';
import {handleSupportV21} from './release-v21-support.mjs';

const BUILD_VERSION='6.2.0';
const RELEASE_FINGERPRINT=['data-governance-v16','uat-release-v17','machine-governance-v20','support-recovery-v21','access-governance-v28','display-lifecycle-v29','staged-import-v30','operational-control-v31','release-resilience-v33','period-aware-dashboard-v34'];
let schemaReady=null;
async function ensureAdditiveSchema(env){
  if(!schemaReady){
    schemaReady=(async()=>{
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS asset_catalog(id TEXT PRIMARY KEY,parent TEXT NOT NULL,path TEXT NOT NULL)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS asset_parent ON asset_catalog(parent)').run();
    })().catch(error=>{schemaReady=null;throw error;});
  }
  return schemaReady;
}

export default {
  async fetch(req,env,ctx){
    const path=new URL(req.url).pathname;
    if(path==='/api/version')return new Response(JSON.stringify({ok:true,service:'OEE Collaboraction',version:BUILD_VERSION,storage:'D1-only',r2:false,release_fingerprint:RELEASE_FINGERPRINT}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
    if(path==='/api/assets'||path==='/api/import-data')await ensureAdditiveSchema(env);
    const supportResponse=await handleSupportV21(req,env,BUILD_VERSION);
    if(supportResponse)return supportResponse;
    const machineGovernanceResponse=await handleMachineGovernanceV20(req,env);
    if(machineGovernanceResponse)return machineGovernanceResponse;
    const governanceResponse=await handleGovernanceV19(req,env);
    if(governanceResponse)return governanceResponse;
    const securityResponse=await handleSecurityV15(req,env);
    if(securityResponse)return securityResponse;
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
