import {handleReleaseV11} from './release-v11.mjs';
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return {}}};
const clean=v=>String(v??'').trim();
const jsonFrom=async response=>{try{return await response.clone().json();}catch{return null;}};
const responseFrom=(base,body)=>{const headers=new Headers(base.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.set('Cache-Control','no-store');return new Response(JSON.stringify(body),{status:base.status,headers});};
async function kpiGovernance(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.kpi_definitions'");return parse(row?.value);}
function annotate(metrics,key,note,label=null,unit=null){const m=(metrics||[]).find(x=>x.key===key);if(!m)return;if(label)m.label=label;if(unit!==null)m.unit=unit;m.note=[clean(m.note),clean(note)].filter(Boolean).join(' · ');}
function setMetric(metrics,key,patch){const m=(metrics||[]).find(x=>x.key===key);if(m)Object.assign(m,patch);else metrics.push({key,...patch});}
async function pdsMetrics(env,baseMetrics){
 const metrics=(baseMetrics||[]).filter(m=>m.key!=='cost');annotate(metrics,'trial','Cakupan seluruh register Development terpetakan.');
 const groups=await all(env.DB,"SELECT COALESCE(NULLIF(upper(trim(json_extract(payload,'$.currency'))),''),'__MISSING__') currency,COUNT(*) records,SUM(CASE WHEN json_extract(payload,'$.cost') IS NOT NULL AND trim(CAST(json_extract(payload,'$.cost') AS TEXT))<>'' THEN 1 ELSE 0 END) cost_records,SUM(CASE WHEN CAST(json_extract(payload,'$.cost') AS REAL)>0 THEN CAST(json_extract(payload,'$.cost') AS REAL) ELSE 0 END) cost FROM entries WHERE module='development' AND deleted=0 GROUP BY COALESCE(NULLIF(upper(trim(json_extract(payload,'$.currency'))),''),'__MISSING__') ORDER BY currency");
 for(const g of groups){if(g.currency==='__MISSING__')continue;const value=Number(g.cost||0),key=String(g.currency).toLowerCase().replace(/[^a-z0-9]+/g,'_');metrics.push({key:'cost_'+key,label:'Biaya tercatat · '+g.currency,value,unit:g.currency,source:'Register Development',note:'Agregasi hanya dalam mata uang yang sama; tidak dikonversi otomatis.'});}
 const missing=groups.find(g=>g.currency==='__MISSING__'),missingCost=Number(missing?.cost_records||0);if(missingCost)metrics.push({key:'cost_missing_currency',label:'Biaya tanpa currency',value:missingCost,unit:'record',source:'Register Development',note:'Nilai biaya legacy tidak dijumlahkan sampai mata uangnya direkonsiliasi.'});
 return metrics;
}
async function maintenanceMetrics(env,baseMetrics,gov){
 const metrics=[...(baseMetrics||[])],window="datetime('now','-30 days')";
 const response=await one(env.DB,`SELECT COUNT(*) n,AVG((julianday(acknowledged_ts)-julianday(requested_ts))*1440.0) avg_min FROM maintenance_calls WHERE requested_ts>=${window} AND requested_ts<=datetime('now') AND acknowledged_ts IS NOT NULL AND julianday(acknowledged_ts)>=julianday(requested_ts)` )||{};
 const repair=await one(env.DB,`SELECT COUNT(*) n,AVG((julianday(closed_ts)-julianday(acknowledged_ts))*1440.0) avg_min FROM maintenance_calls WHERE closed_ts>=${window} AND closed_ts<=datetime('now') AND acknowledged_ts IS NOT NULL AND julianday(closed_ts)>=julianday(acknowledged_ts)` )||{};
 const runs=await one(env.DB,`SELECT SUM(MAX(0,(julianday(CASE WHEN end_ts<datetime('now') THEN end_ts ELSE datetime('now') END)-julianday(CASE WHEN start_ts>${window} THEN start_ts ELSE ${window} END))*24.0)) hours FROM production_runs WHERE end_ts IS NOT NULL AND end_ts>${window} AND start_ts<datetime('now')` )||{};
 const failures=Number((await one(env.DB,`SELECT COUNT(*) n FROM downtime_events WHERE class='UPDT' AND start_ts>=${window} AND start_ts<datetime('now')`))?.n||0),hours=Number(runs.hours||0),perFailure=failures>0&&hours>0?hours/failures:null,approved=gov.approved===true;
 setMetric(metrics,'response',{label:'Response time rata-rata · request 30d',value:response.avg_min==null?null:Number(response.avg_min),unit:'menit',source:'Maintenance call',note:`Requested → acknowledged; ${Number(response.n||0)} call masuk window berdasarkan requested_ts.`});
 setMetric(metrics,'mttr',{label:'Repair duration rata-rata · closure 30d',value:repair.avg_min==null?null:Number(repair.avg_min),unit:'menit',source:'Maintenance call',note:`Acknowledged → closed; ${Number(repair.n||0)} call ditutup dalam window berdasarkan closed_ts.${approved?' Definisi MTTR governance: '+(clean(gov.mttr_definition)||'belum ditulis'):' Baseline KPI belum disahkan; angka ini tidak diklaim sebagai MTTR resmi.'}`});
 setMetric(metrics,'updt_30d',{label:'UPDT mulai · 30 hari',value:failures,unit:'event',source:'Downtime live',note:'Event dihitung berdasarkan start_ts yang jatuh di rolling window 30 hari.'});
 setMetric(metrics,'mtbf',{label:'Elapsed production hours per UPDT · 30d',value:perFailure,unit:'jam',source:'Production run + UPDT',note:`Jam run dihitung hanya pada bagian run yang overlap rolling window 30 hari, lalu dibagi ${failures} UPDT yang mulai dalam window.${approved?' Definisi MTBF governance: '+(clean(gov.mtbf_definition)||'belum ditulis'):' Baseline KPI belum disahkan; angka ini bukan klaim MTBF resmi.'}`});
 setMetric(metrics,'closed_calls_30d',{label:'Maintenance call closed · 30 hari',value:Number(repair.n||0),unit:'call',source:'Maintenance call',note:'Denominator transparan untuk repair duration rata-rata; berdasarkan closed_ts.'});
 annotate(metrics,'records','Seluruh register corrective terpetakan; tidak dibatasi 30 hari.');
 return metrics;
}
export async function handleKpiSemanticsV45(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/role-dashboard')return null;
 const response=await handleReleaseV11(req,env);if(!response||!response.ok)return response;const body=await jsonFrom(response);if(!body)return response;let metrics=Array.isArray(body.metrics)?body.metrics:[],dept=body.department;
 if(dept==='MTC')metrics=await maintenanceMetrics(env,metrics,await kpiGovernance(env));
 if(dept==='PPIC')for(const key of ['planning','ready','started','confirmation','reversal'])annotate(metrics,key,'Cakupan seluruh register D1 terpetakan; bukan rolling 30 hari.');
 if(dept==='PDS')metrics=await pdsMetrics(env,metrics);
 if(dept==='PROJECT'){
  annotate(metrics,'projects','Cakupan seluruh register project/action plan terpetakan.');
  annotate(metrics,'progress','Rata-rata aritmatik record dengan progress 0–100; bukan weighted portfolio progress.');
  annotate(metrics,'readiness','Jumlah area readiness yang tercatat, bukan jumlah area yang sudah lulus.');
 }
 if(dept==='PROD'){
  annotate(metrics,'records','Seluruh register hasil produksi terpetakan; KPI realtime lain mengikuti state saat ini.');
  annotate(metrics,'online','Heartbeat aktif bila update mesin ≤ 3 menit.');
 }
 body.metrics=metrics;body.semantic_policy='Label KPI mengikuti formula aktual; status authoritative mengikuti baseline Data Governance.';body.window_policy='Rolling metrics memakai timestamp event yang dinyatakan pada label; run duration dipotong pada boundary window, bukan dipilih dari nama file.';return responseFrom(response,body);
}
