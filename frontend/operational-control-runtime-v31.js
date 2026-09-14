/* BMJ OEE Operational Control v31 runtime adapter */
(()=>{
 const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 let context={machine:'',material:'',process:''};
 function cycleDecision(machine,material='',process=''){
  const cfg=OC31.read(OC31.keys.cycle);if(!OC31.approved(cfg))return {item:null,reason:'not_approved',candidates:[]};
  const machineKey=norm(machine),materialKey=norm(material),processKey=norm(process),all=OC31.items(cfg).filter(x=>norm(x.machine)===machineKey);
  if(!all.length)return {item:null,reason:'no_machine_standard',candidates:[]};
  const processCompatible=x=>!processKey||!norm(x.process)||norm(x.process)===processKey;
  const compatible=all.filter(processCompatible);
  if(materialKey){
   const exact=compatible.filter(x=>norm(x.material_scope)===materialKey);if(exact.length===1)return {item:exact[0],reason:'exact_material',candidates:exact};if(exact.length>1)return {item:null,reason:'ambiguous_material',candidates:exact};
   const generic=compatible.filter(x=>!norm(x.material_scope)||String(x.material_scope||'').trim()==='*');if(generic.length===1)return {item:generic[0],reason:'generic_material',candidates:generic};if(generic.length>1)return {item:null,reason:'ambiguous_generic',candidates:generic};
   return {item:null,reason:'no_material_match',candidates:compatible};
  }
  const generic=compatible.filter(x=>!norm(x.material_scope)||String(x.material_scope||'').trim()==='*');if(generic.length===1)return {item:generic[0],reason:'generic_without_material',candidates:generic};if(generic.length>1)return {item:null,reason:'ambiguous_generic',candidates:generic};
  return {item:null,reason:compatible.length>1?'ambiguous_without_material':'material_context_required',candidates:compatible};
 }
 const cycleFor=(machine,material='',process='')=>cycleDecision(machine,material,process).item;
 function lossFor(klass){const cfg=OC31.read(OC31.keys.loss);if(!OC31.approved(cfg))return [];return OC31.items(cfg).filter(x=>String(x.class||'').toUpperCase()===String(klass||'').toUpperCase());}
 function paintStandard(){
  if(view!=='shopfloor')return;const side=document.querySelector('.hmi-side');if(!side)return;side.querySelector('.oc31-hmi-standard')?.remove();
  const machine=context.machine||(typeof hmiMachine!=='undefined'?hmiMachine:''),decision=cycleDecision(machine,context.material,context.process),cfg=OC31.read(OC31.keys.cycle);if(!OC31.approved(cfg)||decision.reason==='no_machine_standard')return;
  const card=document.createElement('section');card.className='panel oc31-hmi-standard';
  if(decision.item){const item=decision.item;card.innerHTML=`<h3>Standard Proses</h3><div><span>Target speed</span><strong>${item.target_speed_per_hour?fmt(Number(item.target_speed_per_hour),2)+' / jam':'—'}</strong></div><div><span>Cycle target</span><strong>${item.cycle_seconds?fmt(Number(item.cycle_seconds),3)+' detik':'—'}</strong></div><div><span>Satuan</span><strong>${esc(item.unit||'—')}</strong></div><small>${esc(item.source_ref||'Referensi belum dicatat')} · efektif ${esc(item.effective_from||'—')}${context.material?' · material '+esc(context.material):''}</small>`;}
  else{const reason=decision.reason==='no_material_match'?'Tidak ada Cycle Target yang cocok dengan material aktif.':decision.reason==='material_context_required'?'Pilih planning/PRO agar material aktif dapat dicocokkan.':'Lebih dari satu Cycle Target cocok; aplikasi tidak memilih angka secara otomatis.';card.innerHTML=`<h3>Standard Proses</h3><div class="oc31-standard-pending"><strong>Belum dapat dipilih otomatis</strong><span>${esc(reason)}</span></div><small>Mesin ${esc(machine||'—')}${context.material?' · material '+esc(context.material):''} · ${decision.candidates.length} kandidat baseline</small>`;}
  side.append(card);
 }
 function bindPlanContext(){const choice=$('#planChoice');if(!choice||choice.dataset.oc31Context)return;choice.dataset.oc31Context='1';choice.addEventListener('change',()=>{const opt=choice.selectedOptions?.[0];context={machine:typeof hmiMachine!=='undefined'?hmiMachine:context.machine,material:opt?.dataset.material||'',process:''};paintStandard();});}
 if(typeof runPanel==='function'){const baseRunPanel=runPanel;runPanel=function(r,m,d,c){context={machine:m?.code||(typeof hmiMachine!=='undefined'?hmiMachine:''),material:r?.material||'',process:r?.process||''};return baseRunPanel(r,m,d,c);};}
 if(typeof startPanel==='function'){const baseStartPanel=startPanel;startPanel=function(m,plans){context={machine:m?.code||(typeof hmiMachine!=='undefined'?hmiMachine:''),material:'',process:''};return baseStartPanel(m,plans);};}
 if(typeof shopfloor==='function'){const base=shopfloor;shopfloor=async function(...args){const out=await base(...args);queueMicrotask(()=>{bindPlanContext();paintStandard();});return out;};}
 if(typeof downtimeDialog==='function'){const base=downtimeDialog;downtimeDialog=function(run,klass){base(run,klass);const items=lossFor(klass),form=$('#downForm');if(!form||!items.length)return;const label=document.createElement('label');label.className='full oc31-loss-preset';const select=document.createElement('select');select.id='oc31LossPreset';select.innerHTML='<option value="">Pilih reason code yang disahkan</option>'+items.map((x,i)=>`<option value="${i}">${esc(x.code)} · ${esc(x.label)}</option>`).join('');label.append(document.createTextNode('Reason baseline'),select);form.prepend(label);select.onchange=()=>{const x=items[Number(select.value)];if(!x)return;const code=form.querySelector('[name="code"]'),reason=form.querySelector('[name="reason"]'),owner=form.querySelector('[name="owner_department"]');if(code)code.value=x.code||'';if(reason)reason.value=x.label||'';if(owner)owner.value=x.owner_department||'';};};}
 window.OC31Runtime={cycleFor,cycleDecision,lossFor};
})();
