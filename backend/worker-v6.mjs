import legacy from './worker-v4-core.mjs';
import core from './worker.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const digest=async t=>hex(await crypto.subtle.digest('SHA-256',enc.encode(t)));
export default {
 async fetch(req,env,ctx){
 const u=new URL(req.url),p=u.pathname;
 if(!p.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(req):new Response('OEE API');
 if(!['/api/source-audit','/api/assets','/api/import-data','/api/summary'].includes(p)&&!p.startsWith('/api/media/'))return legacy.fetch(req,env,ctx);
 const origin=req.headers.get('Origin'),allowed=(env.ALLOWED_ORIGIN||'').split(',').map(s=>s.trim());
 const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(origin&&allowed.includes(origin))Object.assign(h,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});
 const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:h});
 if(origin&&!allowed.includes(origin))return json({error:'Origin tidak diizinkan'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h});
 try{
 const me=await core.fetch(new Request(new URL('/api/me',u),{headers:req.headers}),env);if(!me.ok)return me;const user=await me.json();if(user.must_change_password)return json({error:'Ganti password awal terlebih dahulu'},403);
 const db=env.DB;const all=async(q,...a)=>(await db.prepare(q).bind(...a).all()).results;
 if(p==='/api/summary'){
 const totals=await all("SELECT module,department,count(*) n FROM entries WHERE deleted=0 GROUP BY module,department");
 return json({totals});
 }
 if(p==='/api/source-audit')return json(await all("SELECT id,name,department,rows,cols,meta FROM sheets ORDER BY json_extract(meta,'$.errors') DESC"));
 if(p==='/api/assets')return json(await all('SELECT id,parent,path FROM asset_catalog WHERE parent=?',u.searchParams.get('source')));
 if(p.startsWith('/api/media/')){
 const id=p.slice(11),m=await db.prepare('SELECT * FROM source_files WHERE source_id=?').bind(id).first();if(!m)return json({error:'Aset tidak ditemukan'},404);
 let next=0;const stream=new ReadableStream({async pull(c){try{if(next>=m.chunks){c.close();return;}const parts=await all('SELECT chunk_no,data FROM source_file_chunks WHERE source_id=? AND chunk_no>=? ORDER BY chunk_no LIMIT 32',id,next);if(!parts.length)throw Error('Aset tidak lengkap');for(const x of parts){c.enqueue(Uint8Array.from(x.data));next=x.chunk_no+1;}}catch(e){c.error(e);}}});return new Response(stream,{headers:{...h,'Content-Type':m.mime_type,'Content-Length':String(m.bytes)}});
 }
 if(p==='/api/import-data'&&req.method==='POST'){
 if(user.role!=='superadmin')return json({error:'Khusus superadmin'},403);
 const text=await req.text();if(enc.encode(text).length>450000)return json({error:'Batch maksimal 450 KB'},413);const b=JSON.parse(text);
 const columns={sources:['id','name','path','department','kind','sha256','bytes'],sheets:['id','source_id','name','department','rows','cols','meta'],documents:['id','source_id','page','text'],record_chunks:['id','sheet_id','department','chunk_no','ordinal_start','ordinal_end','row_start','row_end','payload'],entries:['id','module','department','payload','version','deleted','created','updated'],source_files:['source_id','name','mime_type','bytes','sha256','chunks'],source_file_chunks:['source_id','chunk_no','data'],asset_catalog:['id','parent','path']};
 const cols=columns[b.table];if(!cols||!Array.isArray(b.rows)||b.rows.length<1||b.rows.length>20)return json({error:'Batch tidak valid'},400);
 const stmts=b.rows.map(row=>{if(!Array.isArray(row)||row.length!==cols.length)throw Error('Kolom tidak sesuai');if(b.table==='source_file_chunks')row[2]=Uint8Array.from(atob(row[2]),c=>c.charCodeAt(0));return db.prepare(`INSERT OR IGNORE INTO ${b.table}(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`).bind(...row);});
 const r=await db.batch(stmts);return json({ok:true,inserted:r.reduce((n,x)=>n+x.meta.changes,0)});
 }
 return json({error:'Endpoint tidak ditemukan'},404);
 }catch(e){console.error(e);return json({error:'Operasi gagal. Periksa struktur data dan konfigurasi.'},500);}
 },scheduled:legacy.scheduled
};
