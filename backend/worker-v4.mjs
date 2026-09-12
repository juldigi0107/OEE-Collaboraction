import core from './worker.mjs';
import {handleRealtime,runScheduledIntegrations,runAutomation} from './realtime.mjs';
import {handleEdgeSync} from './edge-sync.mjs';

const hidden=new Set(['General flow New Sistem.pdf','BMJ_Inquiry_Form_Print_20260604.xlsx','01 des 2023 HMI Display.pdf']);
const routed=p=>p.startsWith('/api/realtime/')||p.startsWith('/api/shopfloor/')||p.startsWith('/api/edge/')||p.startsWith('/api/integrations/')||p.startsWith('/api/approvals');

function cors(req,env){
  const origin=req.headers.get('Origin');
  const ok=(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);
  const h=new Headers({'Vary':'Origin'});
  if(origin&&ok.includes(origin)){
    h.set('Access-Control-Allow-Origin',origin);
    h.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-Edge-Key, X-Integration-Key');
    h.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  }
  return {origin,ok,h};
}

function wrap(r,h){
  const headers=new Headers(r.headers);
  for(const [k,v] of h)headers.set(k,v);
  return new Response(r.body,{status:r.status,statusText:r.statusText,headers});
}

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});

async function sourceIsHidden(env,id){
  if(!id)return false;
  const s=await env.DB.prepare('SELECT name FROM sources WHERE id=?').bind(id).first();
  return !!s&&hidden.has(s.name);
}

export default {
  async fetch(req,env,ctx){
    const u=new URL(req.url);

    if(u.pathname==='/'){
      return json({
        ok:true,
        service:'OEE Collaboraction',
        storage:'D1-only',
        health:'/api/health',
        readiness:'/api/readiness',
        frontend:'https://juldigi0107.github.io/OEE-Collaboraction/'
      });
    }

    if(u.pathname==='/api/readiness'){
      try{
        if(!env.DB)return json({ok:false,ready:false,reason:'D1 binding DB belum tersedia'},503);
        await env.DB.prepare('SELECT id FROM users LIMIT 1').first();
        return json({ok:true,ready:true,database:'oee-collaboraction',schema:'ready'});
      }catch{
        return json({ok:true,ready:false,database:'oee-collaboraction',schema:'not-initialized'},503);
      }
    }

    if(u.pathname==='/api/catalog'){
      const r=await core.fetch(req,env,ctx);
      if(!r.ok)return r;
      const data=await r.json();
      const ids=new Set((data.sources||[]).filter(s=>hidden.has(s.name)).map(s=>s.id));
      data.sources=(data.sources||[]).filter(s=>!ids.has(s.id));
      data.sheets=(data.sheets||[]).filter(s=>!ids.has(s.source_id));
      return new Response(JSON.stringify(data),{status:r.status,headers:r.headers});
    }

    if(u.pathname.startsWith('/api/files/')){
      const id=u.pathname.slice(11);
      if(await sourceIsHidden(env,id))return json({error:'Dokumen internal tidak ditampilkan pada workspace aplikasi'},404);
      return core.fetch(req,env,ctx);
    }

    if(u.pathname==='/api/documents'&&await sourceIsHidden(env,u.searchParams.get('source'))){
      return json({error:'Dokumen internal tidak ditampilkan pada workspace aplikasi'},404);
    }

    if(!routed(u.pathname))return core.fetch(req,env,ctx);

    const {origin,ok,h}=cors(req,env);
    if(origin&&!ok.includes(origin))return json({error:'Origin tidak diizinkan'},403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h});
    if(u.pathname==='/api/edge/sync'&&req.method==='POST')return wrap(await handleEdgeSync(req,env),h);
    const r=await handleRealtime(req,env,ctx);
    return r?wrap(r,h):core.fetch(req,env,ctx);
  },

  async scheduled(controller,env,ctx){
    ctx.waitUntil(Promise.all([runScheduledIntegrations(env),runAutomation(env)]));
  }
};
