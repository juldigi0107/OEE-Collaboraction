import core from './worker.mjs';
import {handleRealtime,runScheduledIntegrations,runAutomation} from './realtime.mjs';

const isRealtime=p=>p.startsWith('/api/realtime/')||p.startsWith('/api/shopfloor/')||p.startsWith('/api/edge/')||p.startsWith('/api/integrations/')||p.startsWith('/api/approvals');
function corsHeaders(req,env){const origin=req.headers.get('Origin'),accepted=(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean),h=new Headers({'Vary':'Origin'});if(origin&&accepted.includes(origin)){h.set('Access-Control-Allow-Origin',origin);h.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-Edge-Key, X-Integration-Key');h.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');}return {origin,accepted,h};}
export default {
 async fetch(req,env,ctx){
  const url=new URL(req.url);if(!isRealtime(url.pathname))return core.fetch(req,env,ctx);
  const {origin,accepted,h}=corsHeaders(req,env);if(origin&&!accepted.includes(origin))return new Response(JSON.stringify({error:'Origin tidak diizinkan'}),{status:403,headers:{'Content-Type':'application/json','Vary':'Origin'}});if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h});
  const r=await handleRealtime(req,env,ctx);if(!r)return core.fetch(req,env,ctx);const headers=new Headers(r.headers);for(const [k,v] of h)headers.set(k,v);return new Response(r.body,{status:r.status,statusText:r.statusText,headers});
 },
 async scheduled(controller,env,ctx){ctx.waitUntil(Promise.all([runScheduledIntegrations(env),runAutomation(env)]));}
};