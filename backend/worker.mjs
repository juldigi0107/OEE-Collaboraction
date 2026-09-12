const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const pwd=async(s,salt)=>{const k=await crypto.subtle.importKey('raw',enc.encode(s),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},k,256));};
const uid=()=>crypto.randomUUID();
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const publicUser=u=>({id:u.id,username:u.username,name:u.name,role:u.role,department:u.department,permissions:JSON.parse(u.permissions),active:u.active});
const allow=(u,dept,action)=>u.role==='superadmin'||(u.role==='admin'&&u.department===dept&&JSON.parse(u.permissions).includes(action));
const requireAllow=(u,d,a)=>{if(!allow(u,d,a))fail(403,'Anda tidak memiliki izin '+a+' untuk '+d);};
const modules={confirmation:'PPIC',planning:'PPIC',production:'PROD',downtime:'PROD',quality:'QC',maintenance:'MTC',development:'PDS',checklist:'PROD',logbook:'PROD',process:'QC',energy:'PROD',master:'PROJECT',project:'PROJECT'};
export function validateEntry(module,p){
 if(!p||typeof p!=='object'||Array.isArray(p))fail(400,'Isi formulir tidak valid');
 if(typeof p.title!=='string'||!p.title.trim())fail(400,'Judul wajib diisi');
 if(p.title.length>300)fail(400,'Judul terlalu panjang');
 for(const k of ['total','good','planned','runtime','speed','minutes','cost','lsl','usl','value','kwh','reject','qty','scrap','hours','progress'])if(p[k]!==undefined&&p[k]!==''&&!Number.isFinite(Number(p[k])))fail(400,k+' harus berupa angka');
 if(['production','downtime','maintenance','quality','planning'].includes(module)&&(!p.machine||!p.date))fail(400,'Mesin dan tanggal wajib diisi');
 if(module==='production'){
  for(const k of ['total','good','planned','runtime','speed'])if(p[k]===''||p[k]===undefined||Number(p[k])<0)fail(400,k+' wajib diisi dan tidak negatif');
  if(+p.good>+p.total||+p.runtime>+p.planned)fail(400,'Good tidak boleh melebihi total; runtime tidak boleh melebihi planned');
  if(+p.speed<=0||+p.planned<=0)fail(400,'Speed dan planned harus lebih dari nol');
 }
 if(['downtime','maintenance'].includes(module)&&(!(Number(p.minutes)>=0)||p.minutes===''))fail(400,'Durasi menit wajib diisi');
 if(module==='quality'&&p.reject!==undefined&&p.reject!==''&&Number(p.reject)<0)fail(400,'Qty reject tidak boleh negatif');
 if(module==='project'&&p.progress!==undefined&&p.progress!==''&&(Number(p.progress)<0||Number(p.progress)>100))fail(400,'Progress harus 0–100');
 if(p.date&&!/^\d{4}-\d{2}-\d{2}$/.test(p.date))fail(400,'Format tanggal harus YYYY-MM-DD');
 return p;
}
export function calculate(p){const n=k=>Number(p[k]);const a=n('planned')>0?n('runtime')/n('planned'):null;const performance=n('runtime')>0&&n('speed')>0?n('total')/(n('runtime')/60*n('speed')):null;const q=n('total')>0?n('good')/n('total'):null;return {availability:a,performance,quality:q,oee:[a,performance,q].every(x=>x!==null)?a*performance*q:null};}
export default {async fetch(req,env){
 const origin=req.headers.get('Origin');const accepted=(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim());
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin&&accepted.includes(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Authorization, Content-Type';headers['Access-Control-Allow-Methods']='GET,POST,PUT,DELETE,OPTIONS';}
 const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
 try{
  if(origin&&!accepted.includes(origin))fail(403,'Origin tidak diizinkan');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  const url=new URL(req.url),path=url.pathname,method=req.method;const db=env.DB;
  const one=(sql,...args)=>db.prepare(sql).bind(...args).first();const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
  const run=(sql,...args)=>db.prepare(sql).bind(...args).run();
  const body=async()=>{if(Number(req.headers.get('Content-Length')||0)>2000000)fail(413,'Data terlalu besar');const raw=await req.text();if(raw.length>2000000)fail(413,'Data terlalu besar');try{return JSON.parse(raw);}catch{fail(400,'JSON tidak valid');}};
  const audit=(u,a,id,b,c)=>db.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(uid(),u.id,a,id,b?JSON.stringify(b):null,c?JSON.stringify(c):null);
  if(path==='/api/health')return json({ok:true,service:'OEE Collaboraction'});
  if(path==='/api/bootstrap'&&method==='POST'){
   const b=await body();if(!env.BOOTSTRAP_TOKEN||b.token!==env.BOOTSTRAP_TOKEN)fail(403,'Token penyiapan tidak valid');
   if(await one("SELECT id FROM users WHERE role='superadmin'"))fail(409,'Superadmin sudah disiapkan');
   if(!b.username||!b.name||typeof b.password!=='string'||b.password.length<12)fail(400,'Nama, username dan password minimal 12 karakter wajib diisi');
   const salt=uid(),ph=await pwd(b.password,salt);
   await run("INSERT INTO users(id,username,name,role,department,permissions,password_hash,salt) SELECT ?,?,?,'superadmin','PROJECT','[]',?,? WHERE NOT EXISTS(SELECT 1 FROM users WHERE role='superadmin')",uid(),b.username.toLowerCase().trim(),b.name,ph,salt);
   return json({ok:true});
  }
  if(path==='/api/login'&&method==='POST'){
   const b=await body(),username=String(b.username||'').toLowerCase().trim();
   const key=await hash((req.headers.get('CF-Connecting-IP')||'local')+':'+username),now=Date.now();const attempt=await one('SELECT * FROM login_attempts WHERE key=?',key);
   if(attempt&&attempt.until_ts>now&&attempt.count>=8)fail(429,'Terlalu banyak percobaan. Coba kembali setelah 15 menit.');
   await run('INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until_ts<? THEN 1 ELSE count+1 END,until_ts=CASE WHEN until_ts<? THEN excluded.until_ts ELSE until_ts END',key,now+900000,now,now);
   const u=await one('SELECT * FROM users WHERE username=?',username);const ph=await pwd(String(b.password||''),u?.salt||'nonexistent-account');
   if(!u||!u.active||ph!==u.password_hash)fail(401,'Username atau password salah');
   await run('DELETE FROM login_attempts WHERE key=?',key);const token=uid()+uid();await run('INSERT INTO sessions VALUES(?,?,?)',await hash(token),u.id,now+28800000);return json({token,user:publicUser(u)});
  }
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
  const u=await one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await hash(token),Date.now());
  if(!u)fail(401,'Silakan login kembali');
  if(path==='/api/me')return json(publicUser(u));
  if(path==='/api/logout'&&method==='POST'){await run('DELETE FROM sessions WHERE token_hash=?',await hash(token));return json({ok:true});}
  if(path==='/api/password'&&method==='PUT'){
   const b=await body();if(typeof b.password!=='string'||b.password.length<12)fail(400,'Password minimal 12 karakter');if(await pwd(String(b.current||''),u.salt)!==u.password_hash)fail(403,'Password saat ini salah');
   const salt=uid();await db.batch([db.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').bind(await pwd(b.password,salt),salt,u.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id),audit(u,'password',u.id,null,null)]);return json({ok:true});
  }
  if(path==='/api/catalog')return json({sources:await all('SELECT * FROM sources ORDER BY department,name'),sheets:await all('SELECT * FROM sheets ORDER BY department,source_id,name'),settings:await all('SELECT * FROM settings')});
  if(path==='/api/dashboard'){
   const names=['OEE Printing (2)','OEE AP','OEE FG'];let series=[];
   for(const name of names){const s=await one("SELECT * FROM sheets WHERE department='PROD' AND name=?",name);if(!s)continue;const rows=await all('SELECT row_num,payload FROM records WHERE sheet_id=? AND deleted=0 ORDER BY row_num',s.id);series.push({name,sheet_id:s.id,rows:rows.map(r=>({row:r.row_num,cells:JSON.parse(r.payload)}))});}
   const stats=await one("SELECT count(*) sheets,sum(rows) rows,sum(json_extract(meta,'$.errors')) errors,sum(json_extract(meta,'$.missing_cache')) missing_cache FROM sheets");
   return json({series,stats});
  }
  if(path==='/api/records'&&method==='GET'){
   const sheet=url.searchParams.get('sheet'),q=url.searchParams.get('q')||'',page=Math.max(0,Number(url.searchParams.get('page'))||0),limit=50;
   const where='sheet_id=? AND deleted=0 AND (?=\'\' OR payload LIKE ?)';const args=[sheet,q,'%'+q+'%'];
   return json({rows:await all('SELECT * FROM records WHERE '+where+' ORDER BY row_num LIMIT ? OFFSET ?',...args,limit,page*limit),total:(await one('SELECT count(*) n FROM records WHERE '+where,...args)).n,page});
  }
  if(path.startsWith('/api/records/')&&['PUT','DELETE'].includes(method)){
   const id=decodeURIComponent(path.slice(13)),old=await one('SELECT * FROM records WHERE id=? AND deleted=0',id);if(!old)fail(404,'Baris tidak ditemukan');requireAllow(u,old.department,method==='DELETE'?'delete':'update');const b=await body();if(b.version!==old.version)fail(409,'Data telah berubah. Muat ulang dahulu.');
   if(method==='DELETE')await db.batch([db.prepare('UPDATE records SET deleted=1,version=version+1 WHERE id=? AND version=?').bind(id,b.version),audit(u,'archive.delete',id,old,null)]);
   else {const p=b.payload;if(!p||Array.isArray(p)||typeof p!=='object')fail(400,'Payload tidak valid');for(const [k,v]of Object.entries(p)){if(!/^[A-Z]{1,3}$/.test(k)||!v||typeof v!=='object'||!('v'in v))fail(400,'Struktur kolom tidak valid');}
    await db.batch([db.prepare('UPDATE records SET payload=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(p),id,b.version),audit(u,'archive.update',id,old,p)]);}
   return json({ok:true,warning:'Snapshot formula sumber tidak dihitung ulang otomatis; gunakan modul transaksi untuk kalkulasi baru.'});
  }
  if(path==='/api/records'&&method==='POST'){
   const b=await body(),s=await one('SELECT * FROM sheets WHERE id=?',b.sheet_id);if(!s)fail(404,'Sheet tidak ditemukan');requireAllow(u,s.department,'create');if(!b.payload||typeof b.payload!=='object'||Array.isArray(b.payload))fail(400,'Payload wajib diisi');const id=uid();await db.batch([db.prepare('INSERT INTO records(id,sheet_id,department,row_num,payload) VALUES(?,?,?,(SELECT coalesce(max(row_num),0)+1 FROM records WHERE sheet_id=?),?)').bind(id,s.id,s.department,s.id,JSON.stringify(b.payload)),audit(u,'archive.create',id,null,b.payload)]);return json({id});
  }
  if(path==='/api/entries'&&method==='GET'){
   const module=url.searchParams.get('module');if(!modules[module])fail(400,'Modul tidak valid');const page=Math.max(0,Number(url.searchParams.get('page'))||0),q=url.searchParams.get('q')||'';
   return json({rows:await all('SELECT * FROM entries WHERE module=? AND deleted=0 AND payload LIKE ? ORDER BY updated DESC LIMIT 50 OFFSET ?',module,'%'+q+'%',page*50),total:(await one('SELECT count(*) n FROM entries WHERE module=? AND deleted=0 AND payload LIKE ?',module,'%'+q+'%')).n,page});
  }
  if(path==='/api/entries'&&method==='POST'){
   const b=await body(),dept=modules[b.module];if(!dept)fail(400,'Modul tidak valid');requireAllow(u,dept,'create');const p=validateEntry(b.module,b.payload),id=uid();if(b.module==='production')p.metrics=calculate(p);
   await db.batch([db.prepare('INSERT INTO entries(id,module,department,payload) VALUES(?,?,?,?)').bind(id,b.module,dept,JSON.stringify(p)),audit(u,'entry.create',id,null,p)]);return json({id});
  }
  if(path.startsWith('/api/entries/')&&['PUT','DELETE'].includes(method)){
   const id=path.slice(13),old=await one('SELECT * FROM entries WHERE id=? AND deleted=0',id);if(!old)fail(404,'Data tidak ditemukan');requireAllow(u,old.department,method==='DELETE'?'delete':'update');const b=await body();if(b.version!==old.version)fail(409,'Data telah berubah. Muat ulang.');
   if(old.module==='planning'&&JSON.parse(old.payload).status==='Dimulai')fail(409,'Planning yang sudah dimulai dikunci; buat revisi terpisah');
   const p=method==='PUT'?validateEntry(old.module,b.payload):null;if(old.module==='production'&&p)p.metrics=calculate(p);
   await db.batch([db.prepare('UPDATE entries SET payload=?,deleted=?,version=version+1,updated=CURRENT_TIMESTAMP WHERE id=? AND version=?').bind(p?JSON.stringify(p):old.payload,method==='DELETE'?1:0,id,b.version),audit(u,'entry.'+method.toLowerCase(),id,old,p)]);return json({ok:true});
  }
  if(path==='/api/documents')return json(await all('SELECT * FROM documents WHERE source_id=? ORDER BY page',url.searchParams.get('source')));
  if(path.startsWith('/api/files/')){
   const id=path.slice(11),s=await one('SELECT * FROM sources WHERE id=?',id);if(!s)fail(404,'File tidak ditemukan');const obj=await env.FILES.get(s.id+'/'+s.name);if(!obj)fail(404,'File sumber belum diunggah ke penyimpanan dokumen');
   const type={pdf:'application/pdf',png:'image/png',jpeg:'image/jpeg',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[s.kind]||'application/octet-stream';return new Response(obj.body,{headers:{...headers,'Content-Type':type,'Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(s.name)}});
  }
  if(path==='/api/users'){
   if(u.role!=='superadmin')fail(403,'Khusus superadmin');if(method==='GET')return json((await all('SELECT * FROM users ORDER BY name')).map(publicUser));
   if(method==='POST'){
    const b=await body();if(!['superadmin','admin','user'].includes(b.role)||!['MTC','QC','PROD','PPIC','PDS','PROJECT'].includes(b.department))fail(400,'Role atau department tidak valid');if(!b.username||!b.name)fail(400,'Nama dan username wajib diisi');
    const perms=(b.permissions||[]).filter(x=>['create','update','delete','config'].includes(x));const old=b.id?await one('SELECT * FROM users WHERE id=?',b.id):null;
    if(b.id&&!old)fail(404,'Akun tidak ditemukan');if(old?.role==='superadmin'&&(b.role!=='superadmin'||b.active===false)){const n=await one("SELECT count(*) n FROM users WHERE role='superadmin' AND active=1");if(n.n<=1)fail(409,'Superadmin aktif terakhir tidak dapat dinonaktifkan');}
    if(!old&&(typeof b.password!=='string'||b.password.length<12))fail(400,'Password minimal 12 karakter');if(b.password&&b.password.length<12)fail(400,'Password minimal 12 karakter');
    const salt=b.password?uid():old.salt,ph=b.password?await pwd(b.password,salt):old.password_hash,id=old?.id||uid();
    await db.batch([db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,department=excluded.department,permissions=excluded.permissions,password_hash=excluded.password_hash,salt=excluded.salt,active=excluded.active').bind(id,b.username.toLowerCase().trim(),b.name,b.role,b.department,JSON.stringify(perms),ph,salt,b.active===false?0:1),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),audit(u,'user.save',id,old?publicUser(old):null,{name:b.name,role:b.role,department:b.department,permissions:perms})]);return json({ok:true});
   }
  }
  if(path==='/api/settings'&&method==='PUT'){
   const b=await body();const dept=b.department||'PROJECT';requireAllow(u,dept,'config');if(!['MTC','QC','PROD','PPIC','PDS','PROJECT'].includes(dept)||!b.key)fail(400,'Konfigurasi tidak valid');const old=await one('SELECT * FROM settings WHERE key=?',b.key);if(old)requireAllow(u,old.department,'config');if(b.key==='brand'&&u.role!=='superadmin')fail(403,'Brand khusus superadmin');
   await db.batch([db.prepare('INSERT INTO settings VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(b.key,JSON.stringify(b.value),dept),audit(u,'config.save',b.key,old,b.value)]);return json({ok:true});
  }
  if(path==='/api/audit'){if(u.role!=='superadmin')fail(403,'Khusus superadmin');return json(await all('SELECT a.*,u.name FROM audit a LEFT JOIN users u ON a.user_id=u.id ORDER BY created DESC LIMIT 200'));}
  fail(404,'Endpoint tidak ditemukan');
 }catch(e){return json({error:e.status?e.message:'Terjadi kesalahan server. Periksa konfigurasi dan log Worker.'},e.status||500);}
}};
