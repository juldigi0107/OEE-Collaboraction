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
 window.OperationalSafetyV35={canonicalMachines,cycleDecision,cycleFor,enhanceTriggerEditor};
})();
