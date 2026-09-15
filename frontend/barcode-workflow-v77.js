/* OEE Collaboraction Barcode Workflow v77 — exact Released-plan resolution for keyboard scanners. */
(()=>{
 const clean=v=>String(v??'').trim();
 let resolving=false;
 function statusNode(label){let n=label.querySelector('.barcode-v77-status');if(!n){n=document.createElement('div');n.className='barcode-v77-status';label.append(n);}return n;}
 function paintStatus(node,state,title,detail=''){node.className='barcode-v77-status '+state;node.replaceChildren();const strong=document.createElement('strong');strong.textContent=title;node.append(strong);if(detail){const small=document.createElement('small');small.textContent=detail;node.append(small);}}
 function machineValue(form){return clean(form?.elements?.namedItem('machine')?.value||window.hmiMachine||'');}
 function enhance(){
  if(view!=='shopfloor')return;const form=$('#startRun'),old=$('#barcodePlanScan'),select=$('#planChoice');if(!form||!old||!select||old.dataset.v77)return;
  const input=old.cloneNode(true);old.replaceWith(input);input.dataset.v77='1';input.autocomplete='off';input.setAttribute('aria-describedby','barcodePlanHint barcodeV77Status');
  const label=input.closest('label'),hint=$('#barcodePlanHint'),status=statusNode(label);status.id='barcodeV77Status';
  if(hint){hint.textContent='Mode scanner keyboard · exact match only · Planning harus Released dan sesuai mesin HMI.';hint.className='';}
  const policy=document.createElement('div');policy.className='hmi-policy-note barcode-v77-policy';policy.textContent='Scan tidak melakukan Start otomatis. Sistem hanya memilih Planning setelah barcode/Planning ID/PRO cocok persis dan tidak ambigu. Verifikasi scanner fisik tetap menjadi evidence UAT perangkat.';label.insertAdjacentElement('afterend',policy);
  const focus=document.createElement('button');focus.type='button';focus.className='barcode-v77-focus';focus.textContent='Fokus Scanner';focus.onclick=()=>{input.focus();input.select();};policy.append(' ',focus);
  const clearResolution=()=>{delete form.dataset.v77ResolvedPlan;delete form.dataset.v77ScanValue;paintStatus(status,'neutral','Menunggu scan','Planning manual tetap dapat dipilih tanpa scan.');};
  clearResolution();
  async function resolve(){
   const raw=clean(input.value);if(!raw){clearResolution();return;}if(resolving)return;resolving=true;paintStatus(status,'pending','Memvalidasi barcode…','Mencari exact match pada Planning Released untuk mesin aktif.');
   try{
    const r=await api('/barcode/resolve?value='+encodeURIComponent(raw)+'&machine='+encodeURIComponent(machineValue(form)));
    if(!r?.resolved||!r.plan_id)throw Error('Planning belum dapat di-resolve.');
    const option=[...select.options].find(o=>o.value===r.plan_id);if(!option){paintStatus(status,'warn','Planning valid, daftar HMI belum sinkron','Tunggu refresh Planning lalu scan ulang. Sistem tidak memilih Planning lain.');return;}
    select.value=r.plan_id;select.dispatchEvent(new Event('change',{bubbles:true}));form.dataset.v77ResolvedPlan=r.plan_id;form.dataset.v77ScanValue=raw;paintStatus(status,'ok','Planning tervalidasi',`${r.pro||'PRO —'} · ${r.material||'material —'} · ${r.machine||machineValue(form)||'mesin —'} · match: ${r.match_by||'exact'}`);
    if(hint){hint.textContent='Exact match berhasil. Lengkapi checklist lalu Start Production secara manual.';hint.className='scan-ok';}
   }catch(err){delete form.dataset.v77ResolvedPlan;delete form.dataset.v77ScanValue;paintStatus(status,'warn','Scan tidak dapat dipilih',err.message||'Barcode tidak cocok dengan Planning Released.');if(hint){hint.textContent='Tidak ada pemilihan otomatis. Periksa barcode, mesin, atau status release PPIC.';hint.className='scan-warn';}}
   finally{resolving=false;}
  }
  input.addEventListener('input',()=>{if(clean(input.value)!==clean(form.dataset.v77ScanValue)){delete form.dataset.v77ResolvedPlan;paintStatus(status,'neutral','Scan berubah','Tekan Enter untuk memvalidasi ulang exact match.');}});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();resolve();}},true);
  input.addEventListener('change',()=>resolve());
  select.addEventListener('change',()=>{const resolved=form.dataset.v77ResolvedPlan;if(resolved&&select.value!==resolved){delete form.dataset.v77ResolvedPlan;paintStatus(status,'warn','Planning diubah setelah scan','Scan sebelumnya tidak lagi menjadi evidence pemilihan Planning.');}},true);
  form.addEventListener('submit',e=>{const raw=clean(input.value);if(!raw)return;const resolved=form.dataset.v77ResolvedPlan;if(!resolved||select.value!==resolved){e.preventDefault();e.stopImmediatePropagation();toast('Barcode terisi tetapi belum tervalidasi. Tekan Enter untuk exact resolve atau kosongkan field scan bila memilih Planning manual.');}},true);
 }
 if(typeof shopfloor==='function'){
  const baseShopfloor=shopfloor;shopfloor=async function(refresh=false,...args){if(refresh&&document.activeElement?.id==='barcodePlanScan')return;const out=await baseShopfloor(refresh,...args);queueMicrotask(enhance);return out;};
 }
 const observer=new MutationObserver(()=>{if(view==='shopfloor'&&$('#barcodePlanScan')&&!$('#barcodePlanScan').dataset.v77)queueMicrotask(enhance);});observer.observe(document.documentElement,{childList:true,subtree:true});
 window.BarcodeWorkflowV77={enhance};
})();
