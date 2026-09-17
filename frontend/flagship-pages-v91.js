/* OEE Collaboraction Flagship Pages v91 — route-specific spatial identity. */
(()=>{
 'use strict';
 let pending=false,observer=null;
 const meta={
  dashboard:['Executive Overview','KPI, authority, dan fokus operasional'],
  departments:['Department Network','Workspace lintas fungsi'],
  workspace:['Department Network','Workspace lintas fungsi'],
  documents:['Data Library','Source registry, lineage, dan dokumen asli'],
  quality:['Data Assurance','Rekonsiliasi, definisi, dan source authority'],
  operations:['Operational Register','Transaksi terkontrol dan traceability'],
  live:['Realtime Operations','Status mesin, heartbeat, dan telemetry'],
  shopfloor:['HMI Cockpit','Eksekusi produksi dan event shopfloor'],
  patrol:['Field Reliability','Patrol, abnormality, evidence, dan closure verification'],
  approvals:['Decision Desk','Approval, verifikasi, dan aging'],
  governance:['Release Governance','Readiness, control, dan keputusan go-live'],
  'data-governance':['Data Authority','Definisi KPI, canonical data, dan source of truth'],
  'operational-control':['Operational Standards','Cycle target, loss-time, trigger, ownership, dan delivery'],
  'uat-release':['UAT Control','Evidence, blocker, dan final sign-off'],
  'support-recovery':['Resilience Center','Support, backup, restore, dan recovery evidence'],
  settings:['System Control','Konfigurasi, display lifecycle, dan baseline'],
  users:['Access Control','Role, department scope, dan least privilege'],
  audit:['Audit Trail','Riwayat perubahan dan traceability'],
  integrations:['Integration Hub','Konektivitas, credential policy, dan sync health'],
  import:['Import Control','Staged ingestion dan rekonsiliasi D1']
 };
 const currentView=()=>typeof view!=='undefined'&&view?String(view):String(document.body.dataset.uiView||'dashboard');
 function definition(v){if(v.startsWith('dept:'))return ['Department Workspace','Register, transaksi, dan arsip sumber department'];return meta[v]||['OEE Workspace','Operational intelligence'];}
 function decorate(){
  const v=currentView(),root=document.querySelector('#content');document.body.dataset.uiView=v;if(!root)return;
  root.classList.add('flagship-route-layout');root.dataset.flagshipRoute=v.startsWith('dept:')?'department':v.replace(/[^a-z0-9-]/gi,'-');
  const heading=root.querySelector(':scope > .heading,:scope > .ref-head,:scope > .page-intro')||root.querySelector('.heading,.ref-head,.page-intro');if(!heading)return;
  const [label,desc]=definition(v);let bar=root.querySelector(':scope > .flagship-routebar');
  if(!bar){bar=document.createElement('div');bar.className='flagship-routebar';root.insertBefore(bar,heading);}
  if(bar.dataset.route!==v){bar.dataset.route=v;bar.replaceChildren();const title=document.createElement('span');title.textContent=label;const small=document.createElement('small');small.textContent=desc;bar.append(title,small);}
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;try{decorate();}catch(err){console.error('Flagship Pages v91',err);}});}
 function start(){schedule();observer=new MutationObserver(schedule);observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.FlagshipPagesV91={refresh:schedule,definition};
})();