const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function passwordBlocked(env,u){return !!(await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id))?.must_change;}
const archiveSearchCTE=`WITH candidate_chunks AS (
 SELECT * FROM record_chunks WHERE sheet_id=? AND instr(lower(payload),lower(?))>0
), combined AS (
 SELECT json_extract(j.value,'$.id') AS id,c.sheet_id,c.department,CAST(json_extract(j.value,'$.row_num') AS INTEGER) AS row_num,json_extract(j.value,'$.payload') AS payload,COALESCE(CAST(json_extract(j.value,'$.version') AS INTEGER),1) AS version,COALESCE(CAST(json_extract(j.value,'$.deleted') AS INTEGER),0) AS deleted
 FROM candidate_chunks c,json_each(c.payload) j
 WHERE NOT EXISTS(SELECT 1 FROM records o WHERE o.id=json_extract(j.value,'$.id'))
 UNION ALL
 SELECT id,sheet_id,department,row_num,payload,version,deleted FROM records WHERE sheet_id=?
)`;
export async function handleArchiveSearchV57(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/records')return null;
 const q=String(url.searchParams.get('q')||'').trim().slice(0,46);if(!q)return null;
 const u=await auth(req,env);if(!u)return out(req,env,{error:'Silakan login kembali'},401);if(await passwordBlocked(env,u))return out(req,env,{error:'Ganti password awal terlebih dahulu'},403);
 const sheet=String(url.searchParams.get('sheet')||'').trim();if(!sheet)return out(req,env,{error:'Sheet wajib dipilih'},400);if(!await one(env.DB,'SELECT id FROM sheets WHERE id=?',sheet))return out(req,env,{error:'Sheet tidak ditemukan'},404);
 const page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0)),limit=50,offset=page*limit,filter=" WHERE deleted=0 AND instr(lower(payload),lower(?))>0";
 const [rows,totalRow]=await Promise.all([
  all(env.DB,archiveSearchCTE+' SELECT * FROM combined'+filter+' ORDER BY row_num LIMIT ? OFFSET ?',sheet,q,sheet,q,limit,offset),
  one(env.DB,archiveSearchCTE+' SELECT COUNT(*) n FROM combined'+filter,sheet,q,sheet,q)
 ]);
 return out(req,env,{rows,total:Number(totalRow?.n||0),page,query_mode:'chunk_prefilter_exact',query:q});
}
