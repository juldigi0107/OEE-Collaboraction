/* OEE Collaboraction Flagship Ultra v93 — responsive presentation runtime. */
(()=>{
 'use strict';
 let scheduled=false;
 const darkSelectors=['.sidebar','.run-hero','.oc31-banner','.de5-stage','.display-pairing-card','#fieldDisplay','.field-display-blocked','.auth-story'];
 const tableSelector='#content .tablewrap > table,#modal .tablewrap > table,#content table.flagship-table,#modal table.flagship-table';
 function markDark(root=document){for(const sel of darkSelectors)root.querySelectorAll(sel).forEach(el=>el.dataset.v93Tone='dark');}
 function labelTable(table){
  if(!table||table.dataset.v93Table)return;
  const heads=[...table.querySelectorAll('thead th')].map(th=>String(th.textContent||'').replace(/\s+/g,' ').trim());
  if(heads.length<2)return;
  table.dataset.v93Table='1';
  table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(td.tagName==='TD'&&!td.dataset.label)td.dataset.label=heads[i]||`Kolom ${i+1}`;}));
 }
 function classifyPanels(root){
  root.querySelectorAll('.panel,.card,.ref-kpi,.flagship-panel').forEach((el,i)=>{
   el.classList.add('v93-fluid-panel');
   if(!el.style.getPropertyValue('--flagship-index'))el.style.setProperty('--flagship-index',String(i));
  });
 }
 function classifyControls(root){
  root.querySelectorAll('form').forEach(form=>{
   const n=form.querySelectorAll('input,select,textarea,button').length;
   form.dataset.v93Form=n>14?'dense':n>7?'medium':'compact';
  });
 }
 function density(){
  const w=window.innerWidth;
  document.body.dataset.v93Density=w<700?'compact':w<1180?'medium':'wide';
  document.documentElement.style.setProperty('--v93-viewport-w',`${w}px`);
  document.documentElement.style.setProperty('--v93-viewport-h',`${window.innerHeight}px`);
 }
 function enhance(root=document){
  document.body.classList.add('flagship-ultra-v93');
  document.documentElement.dataset.v93Ready='1';
  density();markDark(root);
  root.querySelectorAll(tableSelector).forEach(labelTable);
  const content=root.querySelector?.('#content')||document.querySelector('#content');if(content){classifyPanels(content);classifyControls(content);}
  const modal=document.querySelector('#modal');if(modal?.open){classifyPanels(modal);classifyControls(modal);markDark(modal);modal.querySelectorAll('.tablewrap > table,table.flagship-table').forEach(labelTable);}
 }
 function schedule(root=document){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;try{enhance(root);}catch(err){console.error('Flagship Ultra v93',err);}});}
 function start(){
  document.body.classList.add('flagship-ultra-v93');schedule(document);
  const app=document.querySelector('#app')||document.body;
  new MutationObserver(records=>{for(const r of records){if(r.addedNodes.length||r.type==='attributes'){schedule(document);break;}}}).observe(app,{childList:true,subtree:true});
  const modal=document.querySelector('#modal');if(modal)new MutationObserver(()=>schedule(modal)).observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  window.addEventListener('resize',()=>schedule(document),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(()=>schedule(document),80),{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.FlagshipUltraV93={enhance,schedule,labelTable,density};
})();
