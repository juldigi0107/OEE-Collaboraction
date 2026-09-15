const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=(v,f=[])=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const out=(req,env,message,status=400)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&parse(u.permissions,[]).includes(action));
const has=v=>v!==undefined&&v!==null&&clean(v)!=='';
function validateDevelopment(payload){const p=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};if(p.cost===undefined||p.cost===null||clean(p.cost)==='')return null;const cost=Number(p.cost);if(!Number.isFinite(cost)||cost<0)return 'Biaya aktual Development harus berupa angka tidak negatif';const currency=clean(p.currency).toUpperCase();if(!currency)return 'Mata uang wajib diisi bila Biaya aktual Development diisi';if(!/^[A-Z]{3}$/.test(currency))return 'Mata uang Development harus memakai kode 3 huruf, misalnya IDR atau USD';return null;}
function validateQuality(payload,{creating=false,previous={}}={}){
 const p=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{},old=previous&&typeof previous==='object'?previous:{};
 const qtyKeys=['total','good','reject'],used=qtyKeys.filter(k=>has(p[k]));
 for(const k of used){const n=Number(p[k]);if(!Number.isFinite(n)||n<0)return `${k} Quality harus berupa angka tidak negatif`;}
 if(has(p.total)&&Number(p.good||0)+Number(p.reject||0)>Number(p.total))return 'Good + Reject Quality tidak boleh melebihi jumlah diperiksa';
 const unit=clean(p.unit),qtyChanged=qtyKeys.some(k=>String(p[k]??'')!==String(old[k]??'')),unitTouched=String(p.unit??'')!==String(old.unit??'');
 if(used.length&&(creating||qtyChanged||unitTouched)&&!unit)return 'Satuan wajib diisi untuk quantity Quality baru atau yang diubah';
 if(unit.length>24)return 'Satuan Quality terlalu panjang';
 if(unit&&!/^[A-Za-z0-9._/ -]+$/.test(unit))return 'Satuan Quality hanya boleh berisi huruf, angka, spasi, titik, garis miring, garis bawah, atau tanda minus';
 return null;
}
function validateEnergy(payload,{creating=false}={}){
 const p=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};
 if(creating&&(!clean(p.machine)||!clean(p.date)))return 'Transaksi Energi baru wajib memiliki mesin dan tanggal';
 if(creating&&!has(p.kwh))return 'Pemakaian energi kWh wajib diisi';
 if(has(p.kwh)){const kwh=Number(p.kwh);if(!Number.isFinite(kwh)||kwh<0)return 'Pemakaian energi kWh harus berupa angka tidak negatif';}
 return null;
}
function validateConfirmation(payload,{creating=false,previous={}}={}){
 const p=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{},old=previous&&typeof previous==='object'?previous:{};
 const identity=['date','pro','confirmation','counter','unit'],signed=['qty','scrap','hours'];
 for(const k of signed)if(has(p[k])&&!Number.isFinite(Number(p[k])))return `${k} Confirmation harus berupa angka signed yang valid`;
 const changed=[...identity,...signed,'machine','material'].some(k=>String(p[k]??'')!==String(old[k]??''));
 if(creating||changed){for(const k of identity)if(!clean(p[k]))return `Confirmation PPIC wajib memiliki ${k}`;if(!signed.some(k=>has(p[k])))return 'Confirmation PPIC wajib memiliki minimal satu nilai Yield, Scrap, atau Jam';}
 const unit=clean(p.unit);if(unit.length>24)return 'Satuan Confirmation terlalu panjang';if(unit&&!/^[A-Za-z0-9._/ -]+$/.test(unit))return 'Satuan Confirmation tidak valid';
 if(clean(p.confirmation).length>120||clean(p.counter).length>120)return 'Nomor konfirmasi / counter terlalu panjang';
 return null;
}
function validateByModule(module,payload,options={}){if(module==='development')return validateDevelopment(payload);if(module==='quality')return validateQuality(payload,options);if(module==='energy')return validateEnergy(payload,options);if(module==='confirmation')return validateConfirmation(payload,options);return null;}
export async function handleEntrySemanticsV63(req,env){
 const path=new URL(req.url).pathname;if(!['POST','PUT'].includes(req.method))return null;
 let body;try{body=await req.clone().json();}catch{return null;}
 const u=await auth(req,env);if(!u)return null;
 if(req.method==='POST'&&path==='/api/entries'){
  const module=clean(body?.module),dept={development:'PDS',quality:'QC',energy:'PROD',confirmation:'PPIC'}[module];if(!dept||!allow(u,dept,'create'))return null;
  const error=validateByModule(module,body.payload,{creating:true,previous:{}});return error?out(req,env,error):null;
 }
 if(req.method==='PUT'&&path.startsWith('/api/entries/')){
  let id='';try{id=decodeURIComponent(path.slice('/api/entries/'.length));}catch{id=path.slice('/api/entries/'.length);}const row=await one(env.DB,'SELECT module,department,payload FROM entries WHERE id=? AND deleted=0',id);if(!row||!['development','quality','energy','confirmation'].includes(row.module)||!allow(u,row.department||({development:'PDS',quality:'QC',energy:'PROD',confirmation:'PPIC'}[row.module]),'update'))return null;
  const error=validateByModule(row.module,body.payload,{creating:false,previous:parse(row.payload,{})});return error?out(req,env,error):null;
 }
 return null;
}
export const EntrySemanticsV63={validateDevelopment,validateQuality,validateEnergy,validateConfirmation,validateByModule};
