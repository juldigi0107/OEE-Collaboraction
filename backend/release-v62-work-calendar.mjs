const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.some(x=>origin===x||origin.startsWith(x+'/'))?origin:'';};
const json=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
async function calendar(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.shift_calendar'");return parse(row?.value,{});}
function validTime(v){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean(v));}
function minuteOf(v){const [h,m]=clean(v).split(':').map(Number);return h*60+m;}
function validTimezone(tz){try{new Intl.DateTimeFormat('en-US',{timeZone:clean(tz)}).format(new Date());return !!clean(tz);}catch{return false;}}
function inWindow(minute,start,end){return start<end?minute>=start&&minute<end:minute>=start||minute<end;}
function validateCalendarConfig(v){
 if(v?.approved!==true)return null;
 const required=['timezone','group_model','workday_cutoff','s1_start','s1_end','s2_start','s2_end','s3_start','s3_end'];for(const k of required)if(!clean(v?.[k]))return `Kalender shift belum lengkap: ${k}`;
 if(!validTimezone(v.timezone))return 'Zona waktu kalender shift harus berupa IANA timezone yang valid, misalnya Asia/Jakarta';
 for(const k of ['workday_cutoff','s1_start','s1_end','s2_start','s2_end','s3_start','s3_end'])if(!validTime(v[k]))return `Format waktu tidak valid: ${k}`;
 const windows=[[v.s1_start,v.s1_end],[v.s2_start,v.s2_end],[v.s3_start,v.s3_end]].map(([a,b])=>[minuteOf(a),minuteOf(b)]);if(windows.some(([a,b])=>a===b))return 'Jam mulai dan selesai shift tidak boleh sama';
 for(let minute=0;minute<1440;minute++){const hits=windows.filter(([a,b])=>inWindow(minute,a,b)).length;if(hits>1)return 'Window Shift 1–3 saling overlap; perbaiki kalender sebelum disahkan';}
 return null;
}
function zonedParts(date,tz){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date),o={};for(const p of parts)if(p.type!=='literal')o[p.type]=p.value;return {year:Number(o.year),month:Number(o.month),day:Number(o.day),hour:Number(o.hour),minute:Number(o.minute),second:Number(o.second)};}
function isoDate(y,m,d){return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10);}
function previousDate(y,m,d){return new Date(Date.UTC(y,m-1,d)-86400000).toISOString().slice(0,10);}
function normalizeShift(v){const s=clean(v).toUpperCase().replace(/\s+/g,'');const digit=s.match(/(?:SHIFT|S)?([123])$/)?.[1];if(digit)return digit;if(['I','II','III'].includes(s))return String(['I','II','III'].indexOf(s)+1);return '';}
function deriveContext(v,date=new Date()){
 const approved=v?.approved===true,timezone=clean(v?.timezone),runtimeReady=approved&&validTimezone(timezone)&&['workday_cutoff','s1_start','s1_end','s2_start','s2_end','s3_start','s3_end'].every(k=>validTime(v?.[k]));
 if(!runtimeReady)return {approved,configured:Object.keys(v||{}).length>0,runtime_ready:false,timezone:timezone||null,reason:approved?'Timezone atau window shift belum valid':'Kalender shift belum disahkan'};
 const p=zonedParts(date,timezone),minute=p.hour*60+p.minute,cutoff=minuteOf(v.workday_cutoff),windows=[['1',minuteOf(v.s1_start),minuteOf(v.s1_end)],['2',minuteOf(v.s2_start),minuteOf(v.s2_end)],['3',minuteOf(v.s3_start),minuteOf(v.s3_end)]],matches=windows.filter(([,a,b])=>inWindow(minute,a,b)),shift=matches.length===1?matches[0][0]:null,workDate=minute<cutoff?previousDate(p.year,p.month,p.day):isoDate(p.year,p.month,p.day);
 return {approved:true,configured:true,runtime_ready:true,timezone,local_date:isoDate(p.year,p.month,p.day),local_time:`${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}:${String(p.second).padStart(2,'0')}`,work_date:workDate,shift,group_model:clean(v.group_model)||null,workday_cutoff:v.workday_cutoff,windows:{'1':{start:v.s1_start,end:v.s1_end},'2':{start:v.s2_start,end:v.s2_end},'3':{start:v.s3_start,end:v.s3_end}},reason:shift?null:'Waktu sekarang berada di luar window Shift 1–3 yang disahkan'};
}
async function guardStart(req,env){
 const cfg=await calendar(env),ctx=deriveContext(cfg);if(!ctx.approved||!ctx.runtime_ready)return null;
 const u=await auth(req,env);if(!u)return null;let body;try{body=await req.clone().json();}catch{return null;}const planId=clean(body?.plan_id);if(!planId)return null;
 const row=await one(env.DB,"SELECT payload FROM entries WHERE id=? AND module='planning' AND deleted=0",planId);if(!row)return null;const plan=parse(row.payload,{});
 if(!ctx.shift)return json(req,env,{error:'Waktu saat ini berada di luar window shift yang disahkan. Start PRO ditahan sampai kalender diperbaiki atau shift aktif.'},409);
 const planShift=normalizeShift(plan.shift),requestShift=normalizeShift(body.shift);if(planShift&&planShift!==ctx.shift)return json(req,env,{error:`Planning Released berada pada Shift ${planShift}, sedangkan kalender runtime menunjukkan Shift ${ctx.shift} untuk tanggal kerja ${ctx.work_date}`},409);if(requestShift&&requestShift!==ctx.shift)return json(req,env,{error:`Shift pada request (${requestShift}) tidak sama dengan kalender runtime (Shift ${ctx.shift})`},409);
 return null;
}
export async function handleWorkCalendarV62(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(req.method==='PUT'&&path==='/api/settings'){let body;try{body=await req.clone().json();}catch{return null;}if(clean(body?.key)!=='DATA_GOVERNANCE.shift_calendar')return null;const v=parse(body?.value,{}),error=validateCalendarConfig(v);return error?json(req,env,{error},400):null;}
 if(req.method==='POST'&&path==='/api/shopfloor/start')return guardStart(req,env);
 if(req.method!=='GET'||path!=='/api/work-calendar/context')return null;
 const u=await auth(req,env);if(!u)return json(req,env,{error:'Silakan login kembali'},401);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return json(req,env,{error:'Ganti password awal terlebih dahulu'},403);const cfg=await calendar(env),ctx=deriveContext(cfg);return json(req,env,{...ctx,source:'DATA_GOVERNANCE.shift_calendar'});
}
export async function captureWorkCalendarStartV62(req,env){if(req.method!=='POST'||new URL(req.url).pathname!=='/api/shopfloor/start')return null;const cfg=await calendar(env),ctx=deriveContext(cfg);if(!ctx.approved||!ctx.runtime_ready||!ctx.shift)return null;const u=await auth(req,env);if(!u)return null;let body={};try{body=await req.clone().json();}catch{}return {user_id:u.id,plan_id:clean(body.plan_id),work_date:ctx.work_date,shift:ctx.shift,timezone:ctx.timezone,local_time:ctx.local_time};}
export async function afterWorkCalendarStartV62(signal,response,env){if(!signal||!response?.ok)return;let body={};try{body=await response.clone().json();}catch{}const id=clean(body?.id);if(!id)return;const run=await one(env.DB,'SELECT machine_id FROM production_runs WHERE id=?',id);if(!run)return;await env.DB.batch([env.DB.prepare('UPDATE production_runs SET work_date=?,shift=? WHERE id=?').bind(signal.work_date,signal.shift,id),env.DB.prepare('UPDATE machine_state SET shift=? WHERE machine_id=?').bind(signal.shift,run.machine_id),env.DB.prepare('INSERT INTO audit(id,user_id,action,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),signal.user_id,'WORK_CALENDAR_APPLIED',id,null,JSON.stringify({plan_id:signal.plan_id,work_date:signal.work_date,shift:signal.shift,timezone:signal.timezone,local_time:signal.local_time}))]);}
export const WorkCalendarV62={deriveContext,normalizeShift,validateCalendarConfig};
