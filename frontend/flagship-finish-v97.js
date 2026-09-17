/* OEE Collaboraction Flagship Finish v97 — runtime contrast, collision and adaptive-depth guard. */
(()=>{
 'use strict';
 let raf=0,observer,resizeObserver,seen=new WeakSet();
 const textSelector='h1,h2,h3,h4,h5,h6,p,small,strong,label,legend,span,li,summary,caption,dt,dd,td,th,code,a';
 const reflowSelector='.heading,.release-section-head,.surface-head,.filters,.formactions,.row,.settings-tabs,.config-tabs,.de5-toolbar,.de5-actions,.v42-field-link,.topbar,.topbar .user,.v26-archive-context';
 const surfaceSelector='.panel,.card,.flagship-panel,.ref-kpi,.department-card-v4,.machine-card,.integration-card,.doccard,.dialogbody,.login-card,.auth-panel,.splash-card,.v96-surface,.home-hero-v4,.login-hero,.v94-hero,.flagship-hero';
 const knownDark='.sidebar,.auth-story,.login-hero,.home-hero-v4,.home-hero-copy,.run-hero,.oc31-banner,.de5-stage,.display-pairing-card,#fieldDisplay,.field-display-blocked,.field-display-live,.v94-hero,.flagship-hero';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const rgb=v=>{const m=String(v||'').match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null;};
 const blend=(fg,bg)=>{const a=fg?.[3]??1;if(!fg)return bg;if(a>=.995)return fg;return[fg[0]*a+bg[0]*(1-a),fg[1]*a+bg[1]*(1-a),fg[2]*a+bg[2]*(1-a),1];};
 const lum=c=>{const a=c.slice(0,3).map(v=>{const n=clamp(v,0,255)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return(hi+.05)/(lo+.05);};
 function gradientTone(image){
  const matches=String(image||'').match(/rgba?\([^)]*\)/gi)||[],colors=matches.map(rgb).filter(Boolean).filter(c=>(c[3]??1)>.12);if(!colors.length)return null;
  const total=colors.reduce((a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]], [0,0,0]);return[total[0]/colors.length,total[1]/colors.length,total[2]/colors.length,1];
 }
 function backgroundFor(el){
  if(el.closest?.(knownDark+', [data-v96-tone="dark"], [data-v97-tone="dark"]'))return[7,29,48,1];
  const chain=[];let n=el;
  while(n&&n!==document.documentElement){chain.push(n);n=n.parentElement;}
  let out=[248,252,255,1];
  for(let i=chain.length-1;i>=0;i--){const style=getComputedStyle(chain[i]),gradient=gradientTone(style.backgroundImage),c=rgb(style.backgroundColor);if(gradient)out=blend(gradient,out);if(c&&c[3]>0)out=blend(c,out);}
  return out;
 }
 function visible(el){const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>.05&&el.getClientRects().length>0;}
 function textContrast(root){
  let fixed=0;root.querySelectorAll(textSelector).forEach(el=>{
   if(!visible(el)||!String(el.textContent||'').trim()||el.closest('button,.release-status,.pill,.oc31-state,[hidden]')||el.matches('input,select,textarea,.svg-icon'))return;
   const cs=getComputedStyle(el),fg=rgb(cs.color),bg=backgroundFor(el);if(!fg)return;
   const weight=parseInt(cs.fontWeight,10)||400,large=parseFloat(cs.fontSize)>=18&&weight>=600;
   const min=large?3:4.5,r=ratio(fg,bg);
   if(r<min){el.dataset.v97ContrastFix=lum(bg)<.42?'light':'dark';fixed++;}else delete el.dataset.v97ContrastFix;
  });
  document.documentElement.dataset.v97ContrastFixes=String(fixed);
 }
 function collisionGuard(root){
  root.querySelectorAll(reflowSelector).forEach(el=>{if(!visible(el))return;const overflow=el.scrollWidth>el.clientWidth+3;el.classList.toggle('v97-reflow',overflow);});
  root.querySelectorAll(textSelector).forEach(el=>{if(!visible(el))return;const cs=getComputedStyle(el),nowrap=cs.whiteSpace==='nowrap',overflow=el.clientWidth>0&&el.scrollWidth>el.clientWidth+3;if(nowrap&&overflow&&!el.closest('.avatar,.release-status,.pill,.oc31-state'))el.classList.add('v97-text-wrap');else if(!overflow)el.classList.remove('v97-text-wrap');});
 }
 function classify(root){
  root.querySelectorAll(surfaceSelector).forEach((el,i)=>{
   if(!el.classList.contains('v97-surface'))el.classList.add('v97-surface');const bg=backgroundFor(el),dark=lum(bg)<.34,tone=dark?'dark':'light';if(el.dataset.v97Tone!==tone)el.dataset.v97Tone=tone;
   if(!seen.has(el)){seen.add(el);el.style.setProperty('--v97-index',String(i));if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el.classList.add('v97-enter');}
  });
  root.querySelectorAll(knownDark).forEach(el=>{if(el.dataset.v97Tone!=='dark')el.dataset.v97Tone='dark';});
 }
 function viewport(){
  const w=innerWidth,h=innerHeight,coarse=matchMedia('(pointer: coarse)').matches;
  document.body.dataset.v97Viewport=w<560?'phone':w<900?'tablet':w<1500?'desktop':'wide';
  document.body.dataset.v97Height=h<650?'short':h<900?'normal':'tall';
  document.body.dataset.v97Pointer=coarse?'coarse':'fine';
  document.documentElement.style.setProperty('--v97-vw',w+'px');document.documentElement.style.setProperty('--v97-vh',h+'px');
 }
 function deepenTables(root){
  root.querySelectorAll('.tablewrap>table').forEach(table=>{
   const cols=table.querySelectorAll('thead th').length,rows=table.querySelectorAll('tbody tr').length,density=cols>=12?'ultra':cols>=8?'dense':'normal';
   if(table.dataset.v97Density!==density)table.dataset.v97Density=density;
   if(table.style.getPropertyValue('--v97-cols')!==String(cols))table.style.setProperty('--v97-cols',String(cols));
   if(table.style.getPropertyValue('--v97-rows')!==String(rows))table.style.setProperty('--v97-rows',String(rows));
  });
 }
 function dialogState(){document.body.classList.toggle('v97-modal-open',!!document.querySelector('dialog[open]'));}
 function enhance(root=document){
  if(!document.body)return;document.body.classList.add('flagship-master-v96','flagship-v97');viewport();classify(root);deepenTables(root);collisionGuard(root);textContrast(root);dialogState();document.documentElement.dataset.v97Ready='1';
 }
 function schedule(root=document){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{try{enhance(root);}catch(err){console.error('Flagship Finish v97',err);}});}
 function boot(){
  document.body.classList.add('flagship-master-v96','flagship-v97');schedule(document);
  const app=document.querySelector('#app')||document.body,modal=document.querySelector('#modal');
  observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.removedNodes.length||r.type==='attributes'))schedule(document);});observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','open']});
  if(modal)observer.observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open']});
  resizeObserver=new ResizeObserver(entries=>{if(entries.some(e=>e.contentRect.width||e.contentRect.height))schedule(document);});resizeObserver.observe(app);if(modal)resizeObserver.observe(modal);
  addEventListener('resize',()=>schedule(document),{passive:true});addEventListener('orientationchange',()=>setTimeout(()=>schedule(document),120),{passive:true});
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>schedule(document));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.FlagshipFinishV97={enhance,schedule,textContrast,collisionGuard,viewport};
})();
