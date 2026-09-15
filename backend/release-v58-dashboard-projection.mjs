const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const archiveCTE=`WITH combined AS (
 SELECT json_extract(j.value,'$.id') AS id,c.sheet_id,CAST(json_extract(j.value,'$.row_num') AS INTEGER) AS row_num,json_extract(j.value,'$.payload') AS payload,COALESCE(CAST(json_extract(j.value,'$.deleted') AS INTEGER),0) AS deleted
 FROM record_chunks c,json_each(c.payload) j WHERE c.sheet_id=? AND NOT EXISTS(SELECT 1 FROM records o WHERE o.id=json_extract(j.value,'$.id'))
 UNION ALL SELECT id,sheet_id,row_num,payload,deleted FROM records WHERE sheet_id=?
)`;
function projectedCells(raw){let p={};try{p=JSON.parse(raw||'{}');}catch{}const cells={};for(const k of ['A','J','K'])if(p[k]!==undefined)cells[k]=p[k];return cells;}
export async function dashboardProjectionV58(env){
 const names=['OEE Printing (2)','OEE AP','OEE FG'],series=[];
 for(const name of names){
  const sheet=await one(env.DB,"SELECT id,name FROM sheets WHERE department='PROD' AND name=?",name);
  if(!sheet){series.push({name,sheet_id:null,rows:[],source_status:'missing'});continue;}
  const rows=await all(env.DB,archiveCTE+' SELECT row_num,payload FROM combined WHERE deleted=0 ORDER BY row_num',sheet.id,sheet.id);
  series.push({name,sheet_id:sheet.id,rows:rows.map(r=>({row:r.row_num,cells:projectedCells(r.payload)})),source_status:'available'});
 }
 const rawStats=await one(env.DB,"SELECT count(*) sheets,sum(rows) rows,sum(json_extract(meta,'$.errors')) errors,sum(json_extract(meta,'$.missing_cache')) missing_cache FROM sheets")||{};
 const stats={sheets:Number(rawStats.sheets||0),rows:Number(rawStats.rows||0),errors:Number(rawStats.errors||0),missing_cache:Number(rawStats.missing_cache||0)};
 return {series,stats,projection:['A','J','K'],projection_policy:'Dashboard mengirim hanya cell yang dipakai untuk tanggal, komponen dan trend OEE; slot proses tetap stabil bila sumber belum tersedia; arsip lengkap tetap tersedia pada ruang kerja sumber.'};
}
export async function handleDashboardProjectionV58(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/dashboard')return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);if((await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id))?.must_change)return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);
 return out(req,env,await dashboardProjectionV58(env));
}
