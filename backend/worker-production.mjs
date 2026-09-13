import app from './worker-v6.mjs';

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
    if(path==='/api/assets'||path==='/api/import-data')await ensureAdditiveSchema(env);
    return app.fetch(req,env,ctx);
  },
  scheduled(controller,env,ctx){
    return app.scheduled?.(controller,env,ctx);
  }
};
