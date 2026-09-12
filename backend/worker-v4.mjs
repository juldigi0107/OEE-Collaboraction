import app from './worker-v4-core.mjs';

function corsHeaders(req,env){
  const origin=req.headers.get('Origin');
  const allowed=(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);
  const headers=new Headers({'Vary':'Origin'});
  if(origin&&allowed.includes(origin)){
    headers.set('Access-Control-Allow-Origin',origin);
    headers.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-Edge-Key, X-Integration-Key');
    headers.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
    headers.set('Access-Control-Max-Age','86400');
  }
  return {origin,allowed,headers};
}

export default {
  async fetch(req,env,ctx){
    if(req.method==='OPTIONS'){
      const {origin,allowed,headers}=corsHeaders(req,env);
      if(origin&&!allowed.includes(origin)){
        headers.set('Content-Type','application/json; charset=utf-8');
        return new Response(JSON.stringify({error:'Origin tidak diizinkan'}),{status:403,headers});
      }
      return new Response(null,{status:204,headers});
    }
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){
    return app.scheduled(controller,env,ctx);
  }
};
