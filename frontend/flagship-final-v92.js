/* OEE Collaboraction Flagship Final v92 — presentation-only responsive adapters. */
(()=>{
 'use strict';
 function decorateTable(table){
  if(!table||table.dataset.v92Responsive)return;
  const heads=[...table.querySelectorAll('thead th')].map(th=>String(th.textContent||'').replace(/\s+/g,' ').trim());
  if(heads.length<2)return;
  table.dataset.v92Responsive='1';table.classList.add('v92-responsive-table');
  table.querySelectorAll('tbody tr').forEach(tr=>{[...tr.children].forEach((td,i)=>{if(td.tagName==='TD')td.dataset.label=heads[i]||`Kolom ${i+1}`;});});
 }
 function enhance(root=document){
  root.querySelectorAll('table.module-table-v25,table.release-table,table.audit-release-table').forEach(decorateTable);
 }
 if(typeof render==='function'){
  const baseRenderV92=render;
  render=async function(...args){const out=await baseRenderV92(...args);queueMicrotask(()=>enhance(document));return out;};
 }
 const observer=new MutationObserver(records=>{
  let needed=false;
  for(const r of records){for(const n of r.addedNodes){if(n.nodeType===1&&(n.matches?.('table.module-table-v25,table.release-table,table.audit-release-table')||n.querySelector?.('table.module-table-v25,table.release-table,table.audit-release-table'))){needed=true;break;}}if(needed)break;}
  if(needed)queueMicrotask(()=>enhance(document));
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 queueMicrotask(()=>enhance(document));
 window.FlagshipFinalV92={enhance,decorateTable};
})();
