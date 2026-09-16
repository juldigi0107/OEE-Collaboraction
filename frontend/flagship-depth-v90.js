/* OEE Collaboraction Flagship Depth v90 — deepest UI states and premium confirmation flow. */
(()=>{
 'use strict';
 let observer=null,pending=false;
 function confirmDialog(message,{title='Konfirmasi tindakan',confirmLabel='Lanjutkan',cancelLabel='Batal',danger=true}={}){
  return new Promise(resolve=>{
   const d=document.createElement('dialog');d.className='flagship-confirm-v90';d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','f90ConfirmTitle');
   const top=document.createElement('div');top.className='f90-confirm-top';
   const icon=document.createElement('div');icon.className='f90-confirm-icon';icon.setAttribute('aria-hidden','true');icon.textContent=danger?'!':'?';
   const copy=document.createElement('div');const h=document.createElement('h2');h.id='f90ConfirmTitle';h.textContent=title;const p=document.createElement('p');p.textContent=String(message||'Pastikan tindakan ini memang ingin dilanjutkan.');copy.append(h,p);top.append(icon,copy);
   const actions=document.createElement('div');actions.className='f90-confirm-actions';const cancel=document.createElement('button');cancel.type='button';cancel.textContent=cancelLabel;const accept=document.createElement('button');accept.type='button';accept.className=danger?'f90-confirm-danger':'primary';accept.textContent=confirmLabel;actions.append(cancel,accept);d.append(top,actions);document.body.append(d);
   let settled=false;const finish=value=>{if(settled)return;settled=true;try{d.close();}catch{}d.remove();resolve(value);};
   cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);d.addEventListener('cancel',e=>{e.preventDefault();finish(false);});d.addEventListener('close',()=>finish(false),{once:true});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)finish(false);}});
   d.showModal();queueMicrotask(()=>cancel.focus({preventScroll:true}));
  });
 }
 async function runLegacyConfirmed(button,message,title){
  const ok=await confirmDialog(message,{title,confirmLabel:'Hapus',danger:true});if(!ok)return;
  const handler=button.onclick;if(typeof handler!=='function')return;
  const original=window.confirm;button.dataset.f90Confirmed='1';
  try{window.confirm=()=>true;await handler.call(button);}finally{window.confirm=original;delete button.dataset.f90Confirmed;}
 }
 function wireLegacyConfirmations(){
  const defs=[
   ['#deleteRow','Hapus baris sumber ini dari tampilan aktif? File asli dan jejak audit tetap dipertahankan.','Hapus baris sumber'],
   ['#delEntry','Hapus transaksi ini dari register aktif? Tindakan akan mengikuti audit dan aturan backend yang berlaku.','Hapus transaksi']
  ];
  for(const [selector,message,title] of defs){const b=document.querySelector(selector);if(!b||b.dataset.f90ConfirmBound)return;b.dataset.f90ConfirmBound='1';b.addEventListener('click',e=>{if(b.dataset.f90Confirmed==='1')return;e.preventDefault();e.stopImmediatePropagation();runLegacyConfirmed(b,message,title).catch(err=>{console.error('Flagship confirmation',err);if(typeof toast==='function')toast('Konfirmasi belum dapat diproses. Coba lagi.');});},true);}
 }
 function decorateDeep(){
  const body=document.body;body.classList.add('flagship-depth-v90');
  if(document.querySelector('#fieldDisplay'))body.classList.add('flagship-field-display');else body.classList.remove('flagship-field-display');
  if(body.classList.contains('display-pairing-mode'))body.classList.add('flagship-pairing-v90');
  document.querySelectorAll('.loading-panel,.runtime-empty-state,.empty-state-card,.release-empty,.errorbox,.notice').forEach((el,i)=>{el.dataset.flagshipState=el.classList.contains('loading-panel')?'loading':el.classList.contains('errorbox')?'error':el.classList.contains('notice')?'notice':'empty';el.style.setProperty('--flagship-state-index',String(i));});
  document.querySelectorAll('details').forEach(d=>{if(!d.dataset.f90)d.dataset.f90='1';});
  wireLegacyConfirmations();
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorateDeep();});}
 function start(){schedule();observer=new MutationObserver(schedule);observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});const modal=document.querySelector('#modal');if(modal)observer.observe(modal,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.FlagshipDepthV90={confirm:confirmDialog,refresh:schedule};
})();
