/* BMJ OEE Planning Release v39 — visible completeness gate for PPIC Released state. */
(()=>{
 const baseEntryFormV39=entryForm;
 entryForm=function(row){const out=baseEntryFormV39(row);queueMicrotask(enhancePlanningRelease);return out;};
 const field=(form,name)=>form?.elements?.namedItem(name)||form?.querySelector(`[name="${name}"]`);
 function enhancePlanningRelease(){
  if(opModule!=='planning')return;const form=$('#entryForm');if(!form||form.dataset.v39)return;form.dataset.v39='1';const status=field(form,'status');if(!status)return;
  const gate=document.createElement('div');gate.className='v39-release-gate';const actions=form.querySelector('.formactions');actions?.insertAdjacentElement('beforebegin',gate);
  const required=['pro','machine','material','date','target'];
  const labels={pro:'PRO',machine:'Mesin',material:'Material',date:'Tanggal kerja / eksekusi',target:'Target Qty'};
  const dateField=field(form,'date');if(dateField){const lab=dateField.closest('label');if(lab&&!lab.querySelector('.v39-date-hint')){const hint=document.createElement('small');hint.className='v39-date-hint';hint.textContent='Saat Work Calendar sudah authoritative, tanggal ini harus sama dengan tanggal kerja runtime pada saat Start PRO.';dateField.insertAdjacentElement('afterend',hint);}}
  function draw(){
   const released=status.value==='Released',state=required.map(k=>{const el=field(form,k),raw=String(el?.value??'').trim(),ok=k==='target'?Number(raw)>0:!!raw;if(el){el.required=released||['machine','date'].includes(k);if(k==='target')el.min=released?'0.000001':'0';const lab=el.closest('label');if(lab){let chip=lab.querySelector('.v39-required');if(released&&!chip){chip=document.createElement('span');chip.className='v39-required';chip.textContent='Wajib saat Released';lab.prepend(chip);}if(!released&&chip)chip.remove();}}return {k,ok};});
   const missing=state.filter(x=>!x.ok);gate.className='v39-release-gate '+(released?(missing.length?'blocked':'ready'):'draft');gate.innerHTML=`<div><span>${released?'RELEASE GATE':'DRAFT PLANNING'}</span><strong>${released?(missing.length?`${missing.length} field belum siap`:'Siap dilepas ke HMI'):'Boleh disimpan bertahap'}</strong><small>${released?'HMI hanya menerima planning Released yang lengkap. Tanggal akan divalidasi terhadap work-date runtime saat kalender authoritative.':'Ubah status menjadi Released setelah data eksekusi final.'}</small></div><div class="v39-gate-items">${state.map(x=>`<span class="${x.ok?'ok':'pending'}">${x.ok?'✓':'○'} ${labels[x.k]}</span>`).join('')}</div>`;
   const save=form.querySelector('.formactions .primary');if(save){save.disabled=released&&missing.length>0;save.title=save.disabled?'Lengkapi seluruh release gate sebelum menyimpan Planning Released':'';}
  }
  status.addEventListener('change',draw);for(const k of required)field(form,k)?.addEventListener('input',draw);draw();
 }
 window.PlanningReleaseV39={enhance:enhancePlanningRelease};
})();
