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

/* Data interpretation safeguards for business registers. */
(()=>{
 if(typeof operations!=='function')return;
 const baseOperations=operations;
 const payload=r=>{try{return JSON.parse(r?.payload||'{}')}catch{return {}}};
 const domainMap={production:'production',downtime:'production',checklist:'production',logbook:'production',process:'production',energy:'production',batch:'production',quality:'quality',maintenance:'maintenance',confirmation:'ppic',planning:'ppic',development:'development',master:'master',project:'master'};
 const domainLabel={production:'Production / OEE',quality:'Quality / Reject',maintenance:'Maintenance / Breakdown',ppic:'PPIC / Planning & Confirmation',development:'PDS / Development',master:'Master / Project'};
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(String(v)));
 const uniq=a=>[...new Set(a.filter(Boolean))];
 function sourceAuthority(){const domain=domainMap[opModule],cfg=window.DG16?DG16.read(DG16.keys.sources):{},approved=!!(window.DG16&&DG16.approved(cfg)),raw=cfg?.domains?.[domain],id=typeof raw==='string'?raw:raw?.source_id,src=(catalog?.sources||[]).find(s=>s.id===id);return {domain,approved,id:id||'',name:src?.name||raw?.source_name||''};}
 function notes(list){const out=[];
  if(opModule==='confirmation'){const n=list.filter(p=>['qty','scrap','hours'].some(k=>Number.isFinite(Number(p[k]))&&Number(p[k])<0)).length;if(n)out.push(`${n} baris tampil memiliki nilai negatif yang dipertahankan sebagai reversal candidate.`);out.push('PRO bukan natural key tunggal; gunakan transaction key/join grain yang disahkan.');}
  if(opModule==='quality'){const units=uniq(list.map(p=>String(p.unit||'').trim()));if(units.length>1)out.push(`Multi-unit terdeteksi (${units.join(', ')}); jangan agregasikan reject/sample lintas satuan.`);out.push('Field kosong tidak dianggap nol.');}
  if(opModule==='maintenance')out.push('Periode maintenance mengikuti rule tanggal kerja yang disahkan; timestamp dapat melintasi akhir bulan.');
  if(opModule==='development')out.push('Periode mengikuti field transaksi dan source authority, bukan nama file.');
  if(opModule==='production'){const kpi=window.DG16?DG16.read(DG16.keys.kpi):{};if(!(window.DG16&&DG16.approved(kpi)))out.push('Definisi KPI/Quality Printing belum disahkan; KPI lintas sumber belum authoritative.');}
  if(opModule==='downtime')out.push('PDT/UPDT/COJ authoritative hanya berasal dari baseline Loss-Time yang disahkan.');
  return out;
 }
 function add(parent,tag,text,cls=''){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=text;parent.append(el);return el;}
 function paintDataContext(){if(!Array.isArray(rows)||!opModule)return;const table=document.querySelector('#content .module-table-v25');if(!table)return;document.querySelector('#content .data-context-v32')?.remove();const list=rows.map(payload),auth=sourceAuthority(),dates=list.map(p=>p.date).filter(validDate).sort(),historical=list.filter(p=>p.source_sheet||p.source_record).length,live=list.length-historical;
  const box=document.createElement('section');box.className='panel data-context-v32';const head=document.createElement('div');head.className='release-section-head';const left=document.createElement('div');add(left,'span','DATA CONTEXT','eyebrow');add(left,'h3',domainLabel[auth.domain]||modules[opModule]?.[0]||opModule);add(left,'p','Periode mengikuti tanggal transaksi; nama file tidak digunakan sebagai periode laporan.');head.append(left);add(head,'span',auth.approved&&auth.id?`Authoritative · ${auth.name||auth.id}`:'Source authority belum disahkan','release-status '+(auth.approved&&auth.id?'ok':'warn'));box.append(head);
  const facts=document.createElement('div');facts.className='release-grid';const range=dates.length?(dates[0]===dates[dates.length-1]?dates[0]:`${dates[0]} — ${dates[dates.length-1]}`):'Belum tersedia pada baris tampil';for(const [label,value] of [['Rentang baris tampil',range],['Asal data',`${historical} historis · ${live} operasional`],['Kebijakan unit','Satuan sumber dipertahankan; tidak agregasi lintas unit']]){const card=document.createElement('div');card.className='release-card';add(card,'small',label);add(card,'strong',value);facts.append(card);}box.append(facts);
  const msg=notes(list);if(msg.length){const details=document.createElement('details');details.className='sheetinfo';add(details,'summary',`Catatan interpretasi (${msg.length})`);const ul=document.createElement('ul');msg.forEach(n=>add(ul,'li',n));details.append(ul);box.append(details);}table.closest('.tablewrap')?.insertAdjacentElement('beforebegin',box);
  if(opModule==='confirmation'){[...table.querySelectorAll('tbody tr')].forEach((tr,i)=>{const p=list[i];if(!p||!['qty','scrap','hours'].some(k=>Number.isFinite(Number(p[k]))&&Number(p[k])<0))return;tr.dataset.reversal='1';const first=tr.querySelector('td');if(first&&!first.querySelector('.v32-reversal'))add(first,'span','Reversal','pill v32-reversal');});}
 }
 operations=async function(...args){const out=await baseOperations(...args);queueMicrotask(paintDataContext);return out;};
 window.DataContextV32={paint:paintDataContext,sourceAuthority,notes};
})();
