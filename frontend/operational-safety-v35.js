/* BMJ OEE Operational Safety v35 — compatibility safety layer over canonical v31 governance. */
(()=>{
 const clean=v=>String(v||'').trim();
 const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
 const approvedAliases=()=>window.DG16?DG16.read(DG16.keys.machines):{};
 const canonicalMachines=()=>{const c=approvedAliases();if(!window.DG16||!DG16.approved(c))return [];return (c.items||[]).map(x=>clean(x?.canonical)).filter(Boolean);};
 function duplicateTriggerRows(form){
  const rows=[...form.querySelectorAll('tbody tr')],seen=new Map(),duplicates=[];
  rows.forEach((tr,i)=>{const get=n=>tr.querySelector(`[name="${n}"]`),enabled=get('enabled');if(enabled&&!enabled.checked)return;const parts=['machine_scope','rule_name','source_tag','operator','compare_value','event_type','action'].map(k=>clean(get(k)?.value));const sig=[norm(parts[0]),norm(parts[1]),parts[2],parts[3],parts[4],parts[5],parts[6]].join('|');if(!sig.replaceAll('|',''))return;if(seen.has(sig))duplicates.push([seen.get(sig)+1,i+1]);else seen.set(sig,i);});return duplicates;
 }
 function enhanceTriggerEditor(){
  const form=$('#oc31Form');if(!form||!form.querySelector('[name="machine_scope"]')||form.dataset.v35)return;form.dataset.v35='1';
  const aliases=canonicalMachines(),table=form.querySelector('.oc31-editor-table')||form.querySelector('.tablewrap');if(table){const note=document.createElement('div');note.className='v35-scope-note';note.innerHTML=`<strong>Scope canonical machine</strong><span>${aliases.length?`${aliases.length} canonical machine telah disahkan. Gunakan * hanya untuk rule yang benar-benar berlaku lintas mesin.`:'Canonical machine belum disahkan. Baseline Machine Trigger tidak dapat di-approve sebelum Data Governance selesai.'}</span>`;table.insertAdjacentElement('beforebegin',note);}
  form.addEventListener('submit',e=>{const dup=duplicateTriggerRows(form);if(!dup.length)return;e.preventDefault();e.stopImmediatePropagation();toast(`Rule Machine Trigger duplikat pada baris ${dup[0][0]} dan ${dup[0][1]}.`);},true);
 }
 if(window.OC31Edit){const baseOpen=OC31Edit.open.bind(OC31Edit);OC31Edit.open=function(name){const out=baseOpen(name);if(name==='triggers')queueMicrotask(enhanceTriggerEditor);return out;};}
 const cycleDecision=(machine,material='',process='')=>window.OC31Runtime?.cycleDecision?OC31Runtime.cycleDecision(machine,material,process):{item:null,reason:'runtime_unavailable',candidates:[]};
 const cycleFor=(machine,material='',process='')=>cycleDecision(machine,material,process).item;
 function lockField(form,name){const el=form?.elements?.namedItem(name);if(!el)return;el.readOnly=true;el.setAttribute('aria-readonly','true');el.classList.add('v35-authoritative-field');const label=el.closest('label');if(label&&!label.querySelector('.v35-authority-chip')){const chip=document.createElement('small');chip.className='v35-authority-chip';chip.textContent='Planning Released';label.append(chip);}}
 function lockScheduled(select,value){if(!select)return;const scheduled=clean(value);select.disabled=!!scheduled;if(scheduled){const option=[...select.options].find(o=>clean(o.value).toUpperCase()===scheduled.toUpperCase()||clean(o.textContent).toUpperCase()===scheduled.toUpperCase());if(option)select.value=option.value;select.setAttribute('aria-disabled','true');}else select.removeAttribute('aria-disabled');}
 async function enhanceStartAuthorityUI(){
  if(typeof view!=='undefined'&&view!=='shopfloor')return;const form=$('#startRun');if(!form||form.dataset.v35PlanAuthority)return;form.dataset.v35PlanAuthority='1';
  ['machine','pro','material','planned_qty'].forEach(name=>lockField(form,name));
  const gate=form.querySelector('.checklist-gate'),notice=document.createElement('div');notice.className='notice full v35-plan-authority';notice.innerHTML='<strong>Planning Released menjadi sumber eksekusi.</strong><span>Mesin, PRO, material, target qty, dan unit berasal dari planning/baseline yang disahkan. Shift dan group ikut dikunci bila sudah dijadwalkan PPIC.</span>';(gate||form.querySelector('button.primary'))?.insertAdjacentElement('beforebegin',notice);
  const plan=$('#planChoice'),shift=form.elements.namedItem('shift'),group=form.elements.namedItem('group');if(!plan)return;
  const unitLine=document.createElement('small');unitLine.className='v35-authoritative-unit';unitLine.textContent='Satuan target akan mengikuti Planning Released / FG Unit authoritative.';form.elements.namedItem('planned_qty')?.insertAdjacentElement('afterend',unitLine);
  async function applyPlan(){
   const id=clean(plan.value);if(!id){if(shift)shift.disabled=false;if(group)group.disabled=false;unitLine.textContent='Satuan target akan mengikuti Planning Released / FG Unit authoritative.';return;}
   try{const list=await api('/shopfloor/plans'),row=(list||[]).find(x=>String(x.id)===id);if(!row)return;const p=typeof row.payload==='string'?JSON.parse(row.payload||'{}'):row.payload||{};const pro=form.elements.namedItem('pro'),material=form.elements.namedItem('material'),target=form.elements.namedItem('planned_qty');if(pro)pro.value=p.pro||'';if(material)material.value=p.material||'';if(target)target.value=p.target??'';lockScheduled(shift,p.shift);lockScheduled(group,p.group);unitLine.textContent=p.unit?`Satuan target: ${p.unit} · authoritative`:'Satuan target mengikuti FG Unit authoritative pada backend.';}catch(err){unitLine.textContent='Detail planning belum dapat diverifikasi ulang. Start PRO tetap divalidasi backend.';}
  }
  plan.addEventListener('change',applyPlan);if(plan.value)applyPlan();
 }
 if(typeof shopfloor==='function'){const baseShopfloorV35=shopfloor;shopfloor=async function(...args){const out=await baseShopfloorV35(...args);queueMicrotask(enhanceStartAuthorityUI);return out;};}
 window.OperationalSafetyV35={canonicalMachines,cycleDecision,cycleFor,enhanceTriggerEditor,enhanceStartAuthorityUI};
})();
