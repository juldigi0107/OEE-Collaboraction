import {handleReleaseV11} from './release-v11.mjs';
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return {}}};
const clean=v=>String(v??'').trim();
const jsonFrom=async response=>{try{return await response.clone().json();}catch{return null;}};
const responseFrom=(base,body)=>{const headers=new Headers(base.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.set('Cache-Control','no-store');return new Response(JSON.stringify(body),{status:base.status,headers});};
async function kpiGovernance(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.kpi_definitions'");return parse(row?.value);}
function annotate(metrics,key,note,label=null,unit=null){const m=(metrics||[]).find(x=>x.key===key);if(!m)return;if(label)m.label=label;if(unit!==null)m.unit=unit;m.note=[clean(m.note),clean(note)].filter(Boolean).join(' · ');}
async function pdsMetrics(env,baseMetrics){
 const metrics=(baseMetrics||[]).filter(m=>m.key!=='cost');annotate(metrics,'trial','Cakupan seluruh register Development terpetakan.');
 const groups=await all(env.DB,"SELECT COALESCE(NULLIF(upper(trim(json_extract(payload,'$.currency'))),''),'__MISSING__') currency,COUNT(*) records,SUM(CASE WHEN json_extract(payload,'$.cost') IS NOT NULL AND trim(CAST(json_extract(payload,'$.cost') AS TEXT))<>'' THEN 1 ELSE 0 END) cost_records,SUM(CASE WHEN CAST(json_extract(payload,'$.cost') AS REAL)>0 THEN CAST(json_extract(payload,'$.cost') AS REAL) ELSE 0 END) cost FROM entries WHERE module='development' AND deleted=0 GROUP BY COALESCE(NULLIF(upper(trim(json_extract(payload,'$.currency'))),''),'__MISSING__') ORDER BY currency");
 for(const g of groups){if(g.currency==='__MISSING__')continue;const value=Number(g.cost||0),key=String(g.currency).toLowerCase().replace(/[^a-z0-9]+/g,'_');metrics.push({key:'cost_'+key,label:'Biaya tercatat · '+g.currency,value,unit:g.currency,source:'Register Development',note:'Agregasi hanya dalam mata uang yang sama; tidak dikonversi otomatis.'});}
 const missing=groups.find(g=>g.currency==='__MISSING__'),missingCost=Number(missing?.cost_records||0);if(missingCost)metrics.push({key:'cost_missing_currency',label:'Biaya tanpa currency',value:missingCost,unit:'record',source:'Register Development',note:'Nilai biaya legacy tidak dijumlahkan sampai mata uangnya direkonsiliasi.'});
 return metrics;
}
export async function handleKpiSemanticsV45(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/role-dashboard')return null;
 const response=await handleReleaseV11(req,env);if(!response||!response.ok)return response;const body=await jsonFrom(response);if(!body)return response;let metrics=Array.isArray(body.metrics)?body.metrics:[],dept=body.department;
 if(dept==='MTC'){
  const gov=await kpiGovernance(env),approved=gov.approved===true;
  annotate(metrics,'response','Window live 30 hari; Requested → Acknowledged.');
  annotate(metrics,'mttr',approved?`Baseline MTTR resmi: ${clean(gov.mttr_definition)||'belum ditulis'}. Nilai card ini tetap Acknowledged → Closed dan hanya boleh disebut MTTR bila definisinya sama.`:'Baseline KPI belum disahkan; nilai ini tidak diklaim sebagai MTTR resmi.','Durasi perbaikan rata-rata · live');
  annotate(metrics,'mtbf',approved?`Baseline MTBF resmi: ${clean(gov.mtbf_definition)||'belum ditulis'}. Nilai card ini adalah run hours / jumlah UPDT live 30 hari.`:'Baseline KPI belum disahkan; nilai ini hanya indikator run hours per UPDT.','Run hours per UPDT · live');
  annotate(metrics,'updt_30d','Window live 30 hari. Event historis workbook tidak dicampur ke denominator live.');
  annotate(metrics,'records','Seluruh register corrective terpetakan; tidak dibatasi 30 hari.');
 }
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
 body.metrics=metrics;body.semantic_policy='Label KPI mengikuti formula aktual; status authoritative mengikuti baseline Data Governance.';return responseFrom(response,body);
}
