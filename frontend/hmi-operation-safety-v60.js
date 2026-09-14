/* BMJ OEE HMI Operation Safety v60 — never mutate a fallback machine after refresh. */
(()=>{
 const SENTINEL='__RESELECT_REQUIRED__';
 const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 function blockForReselect(requested,fallback){
  if(view!=='shopfloor')return;hmiMachine=SENTINEL;
  document.querySelectorAll('[data-machine]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  const headingEl=document.querySelector('#content .heading');let notice=document.querySelector('.v60-machine-reselect');if(!notice){notice=document.createElement('div');notice.className='notice v60-machine-reselect';headingEl?.insertAdjacentElement('afterend',notice);}
  notice.textContent=`Mesin ${requested||'yang dipilih'} tidak lagi tersedia pada overview. ${fallback?`Data fallback ${fallback} hanya ditampilkan untuk konteks dan tidak boleh dipakai untuk transaksi. `:''}Pilih mesin secara eksplisit sebelum menjalankan Start PRO, Downtime, Quality, Maintenance, atau Finish.`;
  document.querySelectorAll('#startRun input,#startRun select,#startRun button,.hmi-actions button,#stopDown,#callMtc,#ackMtc').forEach(el=>{el.disabled=true;el.setAttribute('aria-disabled','true');});
  const main=document.querySelector('.hmi-main');if(main)main.setAttribute('data-operation-locked','machine-reselect');
 }
 function machineExists(code){const key=norm(code);return !!key&&[...document.querySelectorAll('[data-machine]')].some(b=>norm(b.dataset.machine)===key);}
 if(typeof shopfloor==='function'){
  const baseShopfloorV60=shopfloor;
  shopfloor=async function(...args){const requested=String(hmiMachine||''),explicitBefore=!!requested&&requested!==SENTINEL,out=await baseShopfloorV60(...args),fallback=String(hmiMachine||'');if(requested===SENTINEL||explicitBefore&&!machineExists(requested)||explicitBefore&&norm(fallback)!==norm(requested))blockForReselect(requested===SENTINEL?'mesin sebelumnya':requested,fallback===SENTINEL?'':fallback);return out;};
 }
 window.HMIOperationSafetyV60={blockForReselect,machineExists};
})();
