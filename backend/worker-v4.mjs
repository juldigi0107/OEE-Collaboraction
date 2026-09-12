import app from './worker-v4-core.mjs';

const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const importTables=new Set(['sources','sheets','documents','record_chunks','records','entries','source_files','source_file_chunks']);

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

const responseJson=(body,status=200,extra)=>{const h=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(extra)for(const[k,v]of extra)h.set(k,v);return new Response(JSON.stringify(body),{status,headers:h});};

async function requireSuperadmin(req,env){
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)throw Object.assign(new Error('Silakan login sebagai superadmin'),{status:401});
  const u=await env.DB.prepare('SELECT u.id,u.username,u.name,u.role,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1').bind(await hash(token),Date.now()).first();
  if(!u)throw Object.assign(new Error('Sesi login sudah berakhir'),{status:401});
  if(u.role!=='superadmin')throw Object.assign(new Error('Import data hanya untuk superadmin'),{status:403});
  return u;
}

function hasUnquotedSemicolon(s){let q=false;for(let i=0;i<s.length;i++){if(s[i]==="'")q=!q;else if(s[i]===';'&&!q)return true;}return false;}
function validateImportStatement(raw){
  let s=String(raw||'').trim();
  while(s.endsWith(';'))s=s.slice(0,-1).trim();
  if(!s||enc.encode(s).byteLength>100000)throw Object.assign(new Error('Statement kosong atau melebihi batas 100 KB D1'),{status:400});
  if(hasUnquotedSemicolon(s))throw Object.assign(new Error('Statement ganda tidak diizinkan'),{status:400});
  const m=s.match(/^INSERT\s+OR\s+IGNORE\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/i);
  if(!m||!importTables.has(m[1]))throw Object.assign(new Error('Hanya seed INSERT OR IGNORE ke tabel historis yang diizinkan'),{status:400});
  return s;
}

async function importApi(req,env,path){
  try{
    const u=await requireSuperadmin(req,env);
    if(path==='/api/admin/import/status'&&req.method==='GET'){
      const r=await env.DB.prepare(`SELECT
        (SELECT count(*) FROM sources) sources,
        (SELECT count(*) FROM sheets) sheets,
        (SELECT count(*) FROM documents) documents,
        (SELECT count(*) FROM entries) entries,
        (SELECT count(*) FROM record_chunks) record_chunks,
        (SELECT count(*) FROM source_files) source_files,
        (SELECT count(*) FROM source_file_chunks) source_file_chunks`).first();
      return responseJson({...r,user:u.username});
    }
    if(path==='/api/admin/import/batch'&&req.method==='POST'){
      if(Number(req.headers.get('Content-Length')||0)>900000)throw Object.assign(new Error('Batch terlalu besar'),{status:413});
      const raw=await req.text();if(raw.length>900000)throw Object.assign(new Error('Batch terlalu besar'),{status:413});
      let body;try{body=JSON.parse(raw);}catch{throw Object.assign(new Error('Payload JSON tidak valid'),{status:400});}
      if(!Array.isArray(body.statements)||body.statements.length<1||body.statements.length>8)throw Object.assign(new Error('Satu batch harus berisi 1–8 statement'),{status:400});
      const statements=body.statements.map(validateImportStatement);
      const result=await env.DB.batch(statements.map(s=>env.DB.prepare(s)));
      return responseJson({ok:true,executed:statements.length,duration_ms:result.reduce((n,x)=>n+Number(x?.meta?.duration||0),0)});
    }
    if(path==='/api/admin/import/finish'&&req.method==='POST'){
      const id=crypto.randomUUID();
      await env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(id,u.id,'historical.import','d1-web-import',null,JSON.stringify({completed:new Date().toISOString()})).run();
      return responseJson({ok:true});
    }
    return responseJson({error:'Endpoint import tidak ditemukan'},404);
  }catch(e){return responseJson({error:String(e?.message||e)},e?.status||500);}
}

export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==='OPTIONS'){
      const {origin,allowed,headers}=corsHeaders(req,env);
      if(origin&&!allowed.includes(origin)){
        headers.set('Content-Type','application/json; charset=utf-8');
        return new Response(JSON.stringify({error:'Origin tidak diizinkan'}),{status:403,headers});
      }
      return new Response(null,{status:204,headers});
    }
    if(url.pathname.startsWith('/api/admin/import/'))return importApi(req,env,url.pathname);
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){return app.scheduled(controller,env,ctx);}
};
