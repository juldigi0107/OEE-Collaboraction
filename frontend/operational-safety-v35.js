/* BMJ OEE Operational Safety v35 — scoped trigger editor + fail-safe cycle standard selection. */
(()=>{
 const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 const clean=v=>String(v||'').trim();
 const approvedAliases=()=>window.DG16?DG16.read(DG16.keys.machines):{};
 const canonicalMachines=()=>{const c=approvedAliases();if(!window.DG16||!DG16.approved(c))return [];return (c.items||[]).map(x=>clean(x?.canonical)).filter(Boolean);};
 const escAttr=v=>esc(v??'');
 const currentTriggerConfig=()=>window.OC31?OC31.state().triggers||{}:{};

 if(window.OC31Edit){
  const baseOpen=OC31Edit.open.bind(OC31Edit);
  OC31Edit.open=function(name){if(name!=='triggers')return baseOpen(name);return openTriggerEditor();};
 }
 function triggerRow(x={}){
  const canonical=canonicalMachines(),scope=clean(x.machine_scope);
  const options=['', '*', ...canonical].filter((v,i,a)=>a.indexOf(v)===i).map(v=>`<option value="${escAttr(v)}" ${scope===v?'selected':''}>${v===''?'Pilih scope':v==='*'?'Semua canonical machine (*)':esc(v)}</option>`).join('');
  return `<tr><td><input name="rule_name" value="${escAttr(x.rule_name)}" required></td><td><select name="machine_scope" required>${options}</select></td><td><input name="source_tag" value="${escAttr(x.source_tag)}" placeholder="tag/path aktual" required></td><td><select name="operator">${['eq','ne','gt','gte','lt','lte','truthy','falsy'].map(o=>`<option value="${o}" ${x.operator===o?'selected':''}>${o}</option>`).join('')}</select><input name="compare_value" value="${escAttr(x.compare_value)}" placeholder="nilai pembanding"></td><td><select name="event_type">${['STATE','HEARTBEAT','COUNTER','ALARM','JOB'].map(t=>`<option value="${t}" ${x.event_type===t?'selected':''}>${t}</option>`).join('')}</select><input name="action" value="${escAttr(x.action)}" placeholder="RUNNING / UPDT / dst"></td><td><input name="owner" value="${escAttr(x.owner)}" placeholder="Owner"><label><input type="checkbox" name="enabled" ${x.enabled===false?'':'checked'}> Aktif</label><button type="button" data-v35-remove aria-label="Hapus rule">×</button></td></tr>`;
 }
 function wireTriggerRows(form){form.querySelectorAll('[data-v35-remove]').forEach(b=>b.onclick=()=>b.closest('tr')?.remove());$('#v35AddTrigger').onclick=()=>{form.querySelector('tbody').insertAdjacentHTML('beforeend',triggerRow({}));wireTriggerRows(form);};}
 function collectTriggers(form){return [...form.querySelectorAll('tbody tr')].map(tr=>{const get=n=>tr.querySelector(`[name="${n}"]`);return {rule_name:clean(get('rule_name')?.value),machine_scope:clean(get('machine_scope')?.value),source_tag:clean(get('source_tag')?.value),operator:clean(get('operator')?.value),compare_value:clean(get('compare_value')?.value),event_type:clean(get('event_type')?.value),action:clean(get('action')?.value),owner:clean(get('owner')?.value),enabled:!!get('enabled')?.checked};});}
 function openTriggerEditor(){
  if(user?.role!=='superadmin')return toast('Machine Trigger hanya dapat dikelola oleh Superadmin.');
  const cfg=currentTriggerConfig(),items=Array.isArray(cfg.items)?cfg.items:[],aliases=canonicalMachines();
  dialog('Machine Trigger Rules',`<form id="v35TriggerForm"><div class="v35-scope-note"><strong>Scope canonical machine</strong><span>${aliases.length?`${aliases.length} canonical machine tersedia dari Data Governance.`:'Canonical machine belum disahkan. Rule dapat disimpan sebagai draft, tetapi tidak dapat disahkan.'}</span></div><div class="tablewrap v35-trigger-table"><table><thead><tr><th>Rule</th><th>Machine scope</th><th>Source tag</th><th>Kondisi</th><th>Event / action</th><th>Owner</th></tr></thead><tbody>${items.map(triggerRow).join('')}</tbody></table></div><div class="formactions"><button type="button" id="v35AddTrigger">+ Tambah rule</button></div><div class="formgrid"><label class="full">Catatan keputusan<textarea name="notes">${esc(cfg.notes||'')}</textarea></label><label class="full"><input type="checkbox" name="approved" ${cfg.approved===true?'checked':''}> Mapping tag/event dan machine scope telah diverifikasi terhadap endpoint PLC/Edge aktual.</label><button class="primary full">Simpan baseline</button></div></form>`);
  const form=$('#v35TriggerForm');wireTriggerRows(form);if(!items.length){form.querySelector('tbody').insertAdjacentHTML('beforeend',triggerRow({}));wireTriggerRows(form);}
  form.onsubmit=async e=>{e.preventDefault();const rows=collectTriggers(form),approved=form.elements.approved.checked;if(approved){if(!aliases.length)return toast('Sahkan canonical machine pada Data Governance terlebih dahulu.');if(!rows.some(x=>x.enabled))return toast('Minimal satu rule aktif diperlukan sebelum baseline disahkan.');for(const [i,r] of rows.entries()){if(!r.rule_name||!r.machine_scope||!r.source_tag||!r.owner)return toast(`Baris ${i+1}: rule, machine scope, source tag, dan owner wajib lengkap.`);}}
   try{await api('/settings','PUT',{department:'PROD',key:OC31.keys.triggers,value:{items:rows,notes:clean(form.elements.notes.value),approved,updated_at:new Date().toISOString()}});catalog=await api('/catalog');modal.close();toast('Machine Trigger baseline disimpan.');navigate('operational-control');}catch(err){toast(err.message);}
  };
 }

 function cycleConfig(){return window.OC31?OC31.read(OC31.keys.cycle):{};}
 function currentMaterial(){const form=document.querySelector('#materialInput');if(form?.value)return clean(form.value);const plan=document.querySelector('#planChoice')?.selectedOptions?.[0]?.dataset?.material;if(plan)return clean(plan);const p=document.querySelector('.run-hero p')?.textContent||'';const candidate=clean(p.split('· Shift')[0]);return /material belum tercatat/i.test(candidate)?'':candidate;}
 function candidates(machine){const cfg=cycleConfig();if(!window.OC31||!OC31.approved(cfg))return [];return OC31.items(cfg).filter(x=>norm(x.machine)===norm(machine));}
 function selectCycle(machine,material=''){
  const rows=candidates(machine);if(!rows.length)return {item:null,reason:'none',count:0};
  if(rows.length===1)return {item:rows[0],reason:'unique',count:1};
  const mat=norm(material),exact=mat?rows.filter(x=>norm(x.material_scope)===mat):[];
  if(exact.length===1)return {item:exact[0],reason:'material',count:rows.length};
  const generic=rows.filter(x=>!clean(x.material_scope)||clean(x.material_scope)==='*');
  if(!exact.length&&generic.length===1)return {item:generic[0],reason:'generic',count:rows.length};
  return {item:null,reason:'ambiguous',count:rows.length};
 }
 function standardCard(item,meta){const card=document.createElement('section');card.className='panel oc31-hmi-standard v35-safe-standard';card.dataset.v35='1';if(!item){card.innerHTML=`<h3>Standard Proses</h3><div class="v35-standard-warning"><strong>Standard belum dapat dipilih otomatis</strong><span>${meta.count?`${meta.count} baseline tersedia untuk mesin ini. Pilih material/planning yang spesifik atau rapikan material scope pada Cycle Target.`:'Belum ada Cycle Target approved untuk mesin ini.'}</span></div>`;return card;}card.innerHTML=`<h3>Standard Proses</h3><div><span>Target speed</span><strong>${item.target_speed_per_hour?fmt(Number(item.target_speed_per_hour),2)+' / jam':'—'}</strong></div><div><span>Cycle target</span><strong>${item.cycle_seconds?fmt(Number(item.cycle_seconds),3)+' detik':'—'}</strong></div><div><span>Satuan</span><strong>${esc(item.unit||'—')}</strong></div><div><span>Material scope</span><strong>${esc(item.material_scope||'*')}</strong></div><small>${esc(item.source_ref||'Referensi belum dicatat')} · efektif ${esc(item.effective_from||'—')}</small>`;return card;}
 function paintSafeStandard(){if(view!=='shopfloor')return;const side=document.querySelector('.hmi-side');if(!side)return;side.querySelectorAll('.oc31-hmi-standard').forEach(x=>x.remove());const machine=typeof hmiMachine!=='undefined'?hmiMachine:'',selection=selectCycle(machine,currentMaterial());if(selection.reason==='none')return;side.append(standardCard(selection.item,selection));bindStandardRefresh();}
 function bindStandardRefresh(){const material=document.querySelector('#materialInput'),plan=document.querySelector('#planChoice');if(material&&!material.dataset.v35){material.dataset.v35='1';material.addEventListener('input',()=>queueMicrotask(paintSafeStandard));}if(plan&&!plan.dataset.v35){plan.dataset.v35='1';plan.addEventListener('change',()=>queueMicrotask(paintSafeStandard));}}
 if(typeof shopfloor==='function'){const baseShopfloor=shopfloor;shopfloor=async function(...args){const out=await baseShopfloor(...args);queueMicrotask(paintSafeStandard);return out;};}
 window.OperationalSafetyV35={canonicalMachines,selectCycle,paintSafeStandard};
})();
