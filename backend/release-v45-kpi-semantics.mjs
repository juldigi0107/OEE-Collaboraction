import {handleReleaseV11} from './release-v11.mjs';
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return {}}};
const clean=v=>String(v??'').trim();
const jsonFrom=async response=>{try{return await response.clone().json();}catch{return null;}};
const responseFrom=(base,body)=>{const headers=new Headers(base.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.set('Cache-Control','no-store');return new Response(JSON.stringify(body),{status:base.status,headers});};
async function kpiGovernance(env){const row=await one(env.DB,"SELECT value FROM settings WHERE key='DATA_GOVERNANCE.kpi_definitions'");return parse(row?.value);}
function annotate(metrics,key,note,label=null,unit=null){const m=(metrics||[]).find(x=>x.key===key);if(!m)return;if(label)m.label=label;if(unit!==null)m.unit=unit;m.note=[clean(m.note),clean(note)].filter(Boolean).join(' · ');}
export async function handleKpiSemanticsV45(req,env){
 const url=new URL(req.url);if(req.method!=='GET'||url.pathname!=='/api/role-dashboard')return null;
 const response=await handleReleaseV11(req,env);if(!response||!response.ok)return response;const body=await jsonFrom(response);if(!body)return response;const metrics=Array.isArray(body.metrics)?body.metrics:[],dept=body.department;
 if(dept==='MTC'){
  const gov=await kpiGovernance(env),approved=gov.approved===true;
  annotate(metrics,'response','Window live 30 hari; Requested → Acknowledged.');
  annotate(metrics,'mttr',approved?`Baseline MTTR resmi: ${clean(gov.mttr_definition)||'belum ditulis'}. Nilai card ini tetap Acknowledged → Closed dan hanya boleh disebut MTTR bila definisinya sama.`:'Baseline KPI belum disahkan; nilai ini tidak diklaim sebagai MTTR resmi.','Durasi perbaikan rata-rata · live');
  annotate(metrics,'mtbf',approved?`Baseline MTBF resmi: ${clean(gov.mtbf_definition)||'belum ditulis'}. Nilai card ini adalah run hours / jumlah UPDT live 30 hari.`:'Baseline KPI belum disahkan; nilai ini hanya indikator run hours per UPDT.','Run hours per UPDT · live');
  annotate(metrics,'updt_30d','Window live 30 hari. Event historis workbook tidak dicampur ke denominator live.');
  annotate(metrics,'records','Seluruh register corrective terpetakan; tidak dibatasi 30 hari.');
 }
 if(dept==='PPIC'){
  for(const key of ['planning','ready','started','confirmation','reversal'])annotate(metrics,key,'Cakupan seluruh register D1 terpetakan; bukan rolling 30 hari.');
 }
 if(dept==='PDS'){
  annotate(metrics,'trial','Cakupan seluruh register Development terpetakan.');
  annotate(metrics,'cost','Satuan mata uang mengikuti sumber; agregasi ini tidak boleh dianggap Rupiah authoritative tanpa standardisasi currency.','Nilai biaya tercatat','');
 }
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
