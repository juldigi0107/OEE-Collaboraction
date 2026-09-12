import core from './worker.mjs';
import {handleRealtime,runScheduledIntegrations,runAutomation} from './realtime.mjs';

export default {
 async fetch(req,env,ctx){
  const url=new URL(req.url);
  if(url.pathname.startsWith('/api/realtime/')||url.pathname.startsWith('/api/shopfloor/')||url.pathname.startsWith('/api/edge/')||url.pathname.startsWith('/api/integrations/')||url.pathname.startsWith('/api/approvals')){
   const r=await handleRealtime(req,env,ctx);if(r)return r;
  }
  return core.fetch(req,env,ctx);
 },
 async scheduled(controller,env,ctx){
  ctx.waitUntil(Promise.all([runScheduledIntegrations(env),runAutomation(env)]));
 }
};