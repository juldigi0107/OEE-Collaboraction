const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
let schemaReady=null;
async function ensureSchema(env){
 if(!schemaReady)schemaReady=run(env.DB,"CREATE TABLE IF NOT EXISTS quality_event_units(event_id TEXT PRIMARY KEY,unit TEXT NOT NULL,created_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").catch(e=>{schemaReady=null;throw e;});
 return schemaReady;
}
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const cleanUnit=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,24);
export async function validateQualityUnitV44(req,env){
 const path=new URL(req.url).pathname;if(req.method!=='POST'||path!=='/api/shopfloor/quality')return null;
 const u=await auth(req,env);if(!u)return null;let body={};try{body=await req.clone().json();}catch{return null;}
 const unit=cleanUnit(body.unit);if(!unit)return json({error:'Satuan inspeksi wajib diisi untuk Quality Event baru'},400);
 if(!/^[a-z0-9._%/-]+(?: [a-z0-9._%/-]+)*$/i.test(unit))return json({error:'Satuan inspeksi mengandung karakter yang tidak didukung'},400);
 return null;
}
export async function captureQualityUnitV44(req){
 const path=new URL(req.url).pathname;if(req.method!=='POST'||path!=='/api/shopfloor/quality')return null;try{const b=await req.clone().json();const unit=cleanUnit(b.unit);return unit?{unit}:null;}catch{return null;}
}
export async function persistQualityUnitV44(signal,response,env){
 if(!signal||!response?.ok)return;let body={};try{body=await response.clone().json();}catch{return;}if(!body.id)return;await ensureSchema(env);await run(env.DB,'INSERT INTO quality_event_units(event_id,unit) VALUES(?,?) ON CONFLICT(event_id) DO UPDATE SET unit=excluded.unit',body.id,signal.unit);
}
export async function qualityDashboardV44(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/role-dashboard'||String(url.searchParams.get('department')||'').toUpperCase()!=='QC')return null;
 const u=await auth(req,env);if(!u)return null;const pf=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(pf?.must_change)return null;if(u.role!=='superadmin'&&u.department!=='QC')return null;
 await ensureSchema(env);
 const groups=await all(env.DB,"SELECT qu.unit,COUNT(*) events,COALESCE(SUM(q.sample_qty),0) sample,COALESCE(SUM(q.good_qty),0) good,COALESCE(SUM(q.reject_qty),0) reject FROM quality_events q JOIN quality_event_units qu ON qu.event_id=q.id WHERE q.created_ts>=datetime('now','-30 days') GROUP BY qu.unit ORDER BY events DESC,qu.unit");
 const legacy=Number((await one(env.DB,"SELECT COUNT(*) n FROM quality_events q LEFT JOIN quality_event_units qu ON qu.event_id=q.id WHERE q.created_ts>=datetime('now','-30 days') AND qu.event_id IS NULL"))?.n||0);
 const historical=Number((await one(env.DB,"SELECT COUNT(*) n FROM entries WHERE module='quality' AND deleted=0"))?.n||0);
 const metrics=[];for(const g of groups){const sample=Number(g.sample||0),good=Number(g.good||0),reject=Number(g.reject||0),unit=String(g.unit||'');metrics.push({key:'sample_'+unit,label:'Sample live · '+unit,value:sample,unit,source:'HMI Quality',note:'Agregasi hanya untuk unit yang sama'},{key:'reject_'+unit,label:'Reject live · '+unit,value:reject,unit,source:'HMI Quality',note:'Tidak digabung dengan unit lain'},{key:'rate_'+unit,label:'Quality rate · '+unit,value:sample>0?good/sample:null,unit:'ratio',source:'HMI Quality',note:'Good / sample pada unit '+unit});}
 metrics.unshift({key:'events',label:'Quality event berunit 30 hari',value:groups.reduce((n,g)=>n+Number(g.events||0),0),unit:'event',source:'HMI Quality',note:'Event baru menyimpan satuan inspeksi'});
 if(legacy)metrics.push({key:'legacy_unit',label:'Event legacy tanpa unit',value:legacy,unit:'event',source:'HMI Quality',note:'Perlu rekonsiliasi; unit tidak ditebak otomatis'});
 metrics.push({key:'records',label:'Register QC historis',value:historical,unit:'',source:'Transaksi terpetakan',note:'Satuan historis mengikuti record sumber'});
 return json({department:'QC',generated_at:new Date().toISOString(),metrics,unit_groups:groups.map(g=>g.unit),legacy_without_unit:legacy});
}
