/* OEE Collaboraction Flagship UI v89 — dynamic layout and modal classification. */
(()=>{
 'use strict';
 let pending=false,observer=null,modalObserver=null;
 const viewGroup=v=>{
  if(v==='dashboard')return 'overview';
  if(v==='workspace'||String(v||'').startsWith('dept:'))return 'workspace';
  if(['documents','quality','operations'].includes(v))return 'data';
  if(['live','shopfloor','approvals'].includes(v))return 'operations';
  if(['governance','data-governance','operational-control','uat-release','support-recovery'].includes(v))return 'governance';
  if(['settings','users','audit','integrations','import'].includes(v))return 'admin';
  return 'standard';
 };
 function dialogKind(){
  const d=document.querySelector('#modal');if(!d||!d.open)return;
  const body=d.querySelector('.dialogbody');if(!body)return;
  const text=(d.querySelector('.dialoghead')?.textContent||'').toLowerCase();
  const hasMedia=!!body.querySelector('iframe,.source-image-preview,img[style*="max-height"]');
  const hasTable=!!body.querySelector('.tablewrap,table');
  const form=body.querySelector('form');
  const controls=form?[...form.querySelectorAll('input,select,textarea')].length:0;
  const operational=/downtime|maintenance|quality|finish pro|produksi|hmi|planning|approval|verifikasi/.test(text);
  const kind=hasMedia?'media':hasTable||controls>8?'wide':operational?'operational':'compact';
  d.dataset.flagshipDialog=kind;
  body.classList.add('flagship-dialog-body');
  if(!body.querySelector(':scope > .flagship-dialog-context')){
   const c=document.createElement('div');c.className='flagship-dialog-context';
   c.textContent=operational?'Operational workflow':hasTable?'Data & traceability':hasMedia?'Source preview':form?'Controlled input':'OEE Collaboraction';
   body.prepend(c);
  }
  body.querySelectorAll('.tablewrap').forEach((w,i)=>{w.classList.add('flagship-table-wrap');if(!w.hasAttribute('tabindex'))w.tabIndex=0;if(!w.hasAttribute('aria-label'))w.setAttribute('aria-label',`Tabel pada dialog ${i+1}`);});
 }
 function classifyPanels(root){
  const panels=[...root.querySelectorAll('.panel,.card,.ref-kpi,.ref-depts>article')];
  panels.forEach((p,i)=>{
   p.classList.add('flagship-panel');p.style.setProperty('--flagship-index',String(i));
   if(p.matches('.ref-kpi'))p.dataset.flagshipKind='kpi';
   else if(p.querySelector('.tablewrap,table'))p.dataset.flagshipKind='table';
   else if(p.querySelector('.release-kpis,.role-kpi-grid,.v37-display-kpis'))p.dataset.flagshipKind='metrics';
   else if(i===0&&!p.closest('.ref-kpis,.ref-depts'))p.dataset.flagshipKind='hero';
   else p.dataset.flagshipKind='content';
  });
 }
 function classifyTables(root){
  const wraps=[...root.querySelectorAll('.tablewrap')];
  wraps.forEach((w,i)=>{
   w.classList.add('flagship-table-wrap');
   if(!w.hasAttribute('tabindex'))w.tabIndex=0;
   if(!w.hasAttribute('aria-label'))w.setAttribute('aria-label',`Register data ${i+1}`);
   const t=w.querySelector('table');if(t)t.classList.add('flagship-table');
  });
  root.classList.toggle('flagship-dense',wraps.length>1||root.querySelectorAll('tbody tr').length>30);
 }
 function classifyForms(root){
  root.querySelectorAll('form').forEach(f=>{
   f.classList.add('flagship-form');
   const controls=f.querySelectorAll('input,select,textarea').length;
   f.dataset.flagshipDensity=controls>10?'dense':controls>4?'medium':'compact';
  });
 }
 function classifyPage(){
  document.body.classList.add('flagship-v89');
  document.body.dataset.flagshipGroup=viewGroup(typeof view!=='undefined'?view:'');
  const root=document.querySelector('#content');if(!root)return;
  root.dataset.flagshipView=typeof view!=='undefined'?view:'';
  classifyPanels(root);classifyTables(root);classifyForms(root);dialogKind();
  const head=root.querySelector('.heading,.ref-head,.page-intro');if(head)head.classList.add('flagship-heading');
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;try{classifyPage();}catch(err){console.error('Flagship UI v89',err);}});}
 const baseRender=typeof render==='function'?render:null;
 if(baseRender){render=async function(...args){const out=await baseRender(...args);queueMicrotask(schedule);return out;};}
 function start(){
  document.body.classList.add('flagship-v89');schedule();
  observer=new MutationObserver(schedule);observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
  const m=document.querySelector('#modal');if(m){modalObserver=new MutationObserver(dialogKind);modalObserver.observe(m,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});m.addEventListener('close',()=>{delete m.dataset.flagshipDialog;});}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('reference-menu-open'))document.querySelector('.ref-backdrop')?.click();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.FlagshipUIV89={refresh:schedule,classifyPage,dialogKind,viewGroup};
})();
