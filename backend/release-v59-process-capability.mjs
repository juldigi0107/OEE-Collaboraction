const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const parse=(v,f=[])=>{try{return typeof v==='string'?JSON.parse(v):v||f}catch{return f}};
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const headers=(req,env)=>{const origin=allowedOrigin(req,env);return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})};};
const error=(req,env,message,status=400)=>new Response(JSON.stringify({error:message}),{status,headers:headers(req,env)});
const json=(req,env,value,status=200)=>new Response(JSON.stringify(value),{status,headers:headers(req,env)});
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
const allow=(u,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department==='QC'&&parse(u.permissions,[]).includes(action));
const validDate=v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v)));
function validateProcess(p,{creating=false}={}){
 if(!p||typeof p!=='object'||Array.isArray(p))return 'Payload Process tidak valid';
 const parameter=clean(p.parameter),unit=clean(p.unit),machine=clean(p.machine),date=clean(p.date),subgroup=clean(p.subgroup);
 if(creating&&(!machine||!date))return 'Process measurement baru wajib memiliki mesin dan tanggal';
 if(!parameter)return 'Parameter Process wajib diisi';
 if(p.value===undefined||p.value===''||!Number.isFinite(Number(p.value)))return 'Nilai ukur Process wajib berupa angka';
 if(!unit)return 'Satuan Process wajib diisi';
 if(unit.length>24)return 'Satuan Process terlalu panjang';
 if(subgroup.length>80)return 'Subgroup ID terlalu panjang';
 const hasLsl=p.lsl!==undefined&&p.lsl!=='',hasUsl=p.usl!==undefined&&p.usl!=='';
 if(hasLsl!==hasUsl)return 'LSL dan USL harus diisi berpasangan';
 if(hasLsl){const lsl=Number(p.lsl),usl=Number(p.usl);if(!Number.isFinite(lsl)||!Number.isFinite(usl))return 'LSL dan USL harus berupa angka';if(!(lsl<usl))return 'LSL harus lebih kecil dari USL';}
 return '';
}
function stats(values,lsl,usl){
 const sorted=[...values].sort((a,b)=>a-b),n=sorted.length,mean=sorted.reduce((a,b)=>a+b,0)/n,median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2,sd=n>1?Math.sqrt(sorted.reduce((s,x)=>s+(x-mean)**2,0)/(n-1)):null,ppk=sd>0?Math.min((usl-mean)/(3*sd),(mean-lsl)/(3*sd)):null,outCount=sorted.filter(x=>x<lsl||x>usl).length;
 return {n,mean,median,min:sorted[0],max:sorted[n-1],sd,ppk,out_of_spec_count:outCount,out_of_spec_rate:n?outCount/n:null};
}
function subgroupCapability(records,lsl,usl,overallMean){
 const labelled=records.filter(p=>clean(p.subgroup)&&Number.isFinite(Number(p.value))),groups=new Map();
 for(const p of labelled){const id=clean(p.subgroup);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(Number(p.value));}
 const eligible=[...groups.entries()].filter(([,values])=>values.length>=2),measurements=eligible.reduce((n,[,v])=>n+v.length,0),df=eligible.reduce((n,[,v])=>n+v.length-1,0),coverage=records.length?labelled.length/records.length:null,base={cpk:null,within_sd:null,subgroup_count:eligible.length,subgroup_measurements:measurements,subgroup_df:df,subgroup_labelled:labelled.length,subgroup_coverage:coverage};
 if(!groups.size)return {...base,subgroup_count:0,subgroup_measurements:0,subgroup_df:0,cpk_status:'subgroup_required'};
 if(labelled.length!==records.length)return {...base,cpk_status:'partial_subgroup_coverage'};
 if(eligible.length!==groups.size)return {...base,cpk_status:'incomplete_subgroup_structure'};
 if(eligible.length<2||df<2)return {...base,cpk_status:'insufficient_subgroup_data'};
 let ss=0;for(const [,values] of eligible){const mean=values.reduce((a,b)=>a+b,0)/values.length;ss+=values.reduce((n,x)=>n+(x-mean)**2,0);}const withinSd=df>0?Math.sqrt(ss/df):null;
 if(!(withinSd>0))return {...base,within_sd:withinSd,cpk_status:'zero_within_variation'};
 const cpk=Math.min((usl-overallMean)/(3*withinSd),(overallMean-lsl)/(3*withinSd));
 return {...base,cpk,within_sd:withinSd,cpk_status:'ready'};
}
async function capabilityGet(req,env,url){
 const u=await auth(req,env);if(!u)return error(req,env,'Silakan login kembali',401);const flag=await one(env.DB,'SELECT must_change FROM password_flags WHERE user_id=?',u.id);if(flag?.must_change)return error(req,env,'Ganti password awal terlebih dahulu',403);
 const dimensions=(await all(env.DB,"SELECT trim(COALESCE(json_extract(payload,'$.machine'),'')) machine,trim(COALESCE(json_extract(payload,'$.parameter'),'')) parameter,trim(COALESCE(json_extract(payload,'$.unit'),'')) unit,COUNT(*) records,MIN(json_extract(payload,'$.date')) first_date,MAX(json_extract(payload,'$.date')) last_date FROM entries WHERE module='process' AND deleted=0 GROUP BY trim(COALESCE(json_extract(payload,'$.machine'),'')),trim(COALESCE(json_extract(payload,'$.parameter'),'')),trim(COALESCE(json_extract(payload,'$.unit'),'')) ORDER BY machine,parameter,unit LIMIT 1000")).filter(x=>clean(x.machine)&&clean(x.parameter)&&clean(x.unit)).map(x=>({...x,records:Number(x.records||0)}));
 const machine=clean(url.searchParams.get('machine')),parameter=clean(url.searchParams.get('parameter')),unit=clean(url.searchParams.get('unit')),from=clean(url.searchParams.get('from')),to=clean(url.searchParams.get('to'));
 if(!validDate(from)||!validDate(to)||from&&to&&from>to)return error(req,env,'Rentang tanggal Process Capability tidak valid',400);
 const base={dimensions,selection:{machine,parameter,unit,from,to},policy:'Ppk memakai standard deviation keseluruhan untuk satu kombinasi mesin + parameter + satuan dengan satu pasangan LSL/USL konsisten. Cpk hanya dihitung dari pooled within-subgroup standard deviation bila seluruh measurement pada subset memiliki Subgroup ID, seluruh subgroup minimal berisi dua measurement, dan tersedia minimal dua subgroup. Rationality subgroup tetap merupakan keputusan owner proses.'};
 if(!machine||!parameter||!unit)return json(req,env,{...base,status:'selection_required',result:null});
 const rows=await all(env.DB,"SELECT payload FROM entries WHERE module='process' AND deleted=0 AND lower(trim(COALESCE(json_extract(payload,'$.machine'),'')))=lower(?) AND lower(trim(COALESCE(json_extract(payload,'$.parameter'),'')))=lower(?) AND lower(trim(COALESCE(json_extract(payload,'$.unit'),'')))=lower(?) AND (?='' OR json_extract(payload,'$.date')>=?) AND (?='' OR json_extract(payload,'$.date')<=?) ORDER BY json_extract(payload,'$.date'),updated LIMIT 5001",machine,parameter,unit,from,from,to,to);
 const truncated=rows.length>5000,records=rows.slice(0,5000).map(r=>parse(r.payload,{})),validValues=records.filter(p=>p.value!==''&&Number.isFinite(Number(p.value))),withSpec=validValues.filter(p=>p.lsl!==''&&p.lsl!==undefined&&p.usl!==''&&p.usl!==undefined&&Number.isFinite(Number(p.lsl))&&Number.isFinite(Number(p.usl))&&Number(p.lsl)<Number(p.usl));
 const specMap=new Map();for(const p of withSpec){const l=Number(p.lsl),u2=Number(p.usl),key=`${l}|${u2}`;if(!specMap.has(key))specMap.set(key,{lsl:l,usl:u2,records:[]});specMap.get(key).records.push(p);}
 const common={...base,records_total:records.length,valid_measurements:validValues.length,specified_measurements:withSpec.length,missing_spec:Math.max(0,validValues.length-withSpec.length),truncated};
 if(!validValues.length)return json(req,env,{...common,status:'no_measurement',result:null});
 if(!specMap.size)return json(req,env,{...common,status:'no_specification',result:null});
 if(specMap.size>1)return json(req,env,{...common,status:'ambiguous_specification',specifications:[...specMap.values()].map(x=>({lsl:x.lsl,usl:x.usl,n:x.records.length})),result:null});
 const spec=[...specMap.values()][0],values=spec.records.map(p=>Number(p.value));if(values.length<2)return json(req,env,{...common,status:'insufficient_sample',specification:{lsl:spec.lsl,usl:spec.usl},result:null});
 const result=stats(values,spec.lsl,spec.usl),cpk=subgroupCapability(spec.records,spec.lsl,spec.usl,result.mean);
 return json(req,env,{...common,status:'ready',specification:{lsl:spec.lsl,usl:spec.usl},result:{...result,...cpk}});
}
export async function handleProcessCapabilityV59(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(req.method==='GET'&&path==='/api/process-capability')return capabilityGet(req,env,url);
 if(!['POST','PUT'].includes(req.method))return null;if(path!=='/api/entries'&&!path.startsWith('/api/entries/'))return null;
 let body;try{body=await req.clone().json();}catch{return null;}if(body?.module!=='process')return null;
 const u=await auth(req,env);if(!u||!allow(u,req.method==='POST'?'create':'update'))return null;
 const problem=validateProcess(body.payload,{creating:req.method==='POST'});return problem?error(req,env,problem,400):null;
}
export const ProcessCapabilityV59={validateProcess,stats,subgroupCapability};
