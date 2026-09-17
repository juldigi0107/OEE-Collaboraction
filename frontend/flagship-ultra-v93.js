/* OEE Collaboraction Flagship Ultra v93 — responsive presentation runtime. */
(()=>{
 'use strict';
 let scheduled=false;
 const darkSelectors=['.sidebar','.run-hero','.oc31-banner','.de5-stage','.display-pairing-card','#fieldDisplay','.field-display-blocked','.auth-story','.field-display-live','.toTop'];
 const tableSelector='#content .tablewrap > table,#modal .tablewrap > table,#content table.flagship-table,#modal table.flagship-table';
 const textSelector='h1,h2,h3,h4,p,small,strong,label,span,.muted,.sheetinfo,td,th,code';
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
 function rgba(value){
  const m=String(value||'').match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  return m?[Number(m[1]),Number(m[2]),Number(m[3]),m[4]===undefined?1:Number(m[4])]:null;
 }
 function luminance(rgb){
  const c=rgb.slice(0,3).map(v=>{const n=Math.max(0,Math.min(255,v))/255;return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);});
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
 }
 function contrast(a,b){const x=luminance(a),y=luminance(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05);}
 function effectiveBackground(el){
  const dark=el.closest?.('[data-v93-tone="dark"]');if(dark)return [6,25,43,1];
  let node=el;while(node&&node!==document.documentElement){const bg=rgba(getComputedStyle(node).backgroundColor);if(bg&&bg[3]>=.82)return bg;node=node.parentElement;}
  return [248,251,254,1];
 }
 function shouldSkipContrast(el){return !el.textContent?.trim()||el.matches('.release-status,.pill,.oc31-state,button,input,select,textarea,a,.svg-icon')||!!el.closest('button,.release-status,.pill,.oc31-state,.attention-self,[hidden]');}
 function contrastSentry(root=document){
  const host=root.nodeType===1?root:document;let adjusted=0;
  host.querySelectorAll(textSelector).forEach(el=>{
   if(shouldSkipContrast(el))return;const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)<.45)return;
   const fg=rgba(style.color),bg=effectiveBackground(el);if(!fg||contrast(fg,bg)>=4.5)return;
   const target=luminance(bg)<.42?'#f4fbff':'#173950';el.style.setProperty('color',target,'important');el.dataset.v93Contrast='adjusted';adjusted++;
  });
  document.documentElement.dataset.v93ContrastAudit=String(adjusted);
  return adjusted;
 }
 function enhance(root=document){
  document.body.classList.add('flagship-ultra-v93');
  document.documentElement.dataset.v93Ready='1';
  density();markDark(root);
  root.querySelectorAll(tableSelector).forEach(labelTable);
  const content=root.querySelector?.('#content')||document.querySelector('#content');if(content){classifyPanels(content);classifyControls(content);}
  const modal=document.querySelector('#modal');if(modal?.open){classifyPanels(modal);classifyControls(modal);markDark(modal);modal.querySelectorAll('.tablewrap > table,table.flagship-table').forEach(labelTable);}
  contrastSentry(root);
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
 window.FlagshipUltraV93={enhance,schedule,labelTable,density,contrastSentry,contrast,luminance};
})();
