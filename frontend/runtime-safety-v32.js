/* BMJ OEE Runtime Safety v32 — fail-safe Cycle Target resolution and governed downtime input. */
(()=>{
 const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 const genericScope=v=>{const n=norm(v);return !n||n==='ALL'||String(v||'').trim()==='*';};
 function cycleConfig(){const cfg=window.OC31?OC31.read(OC31.keys.cycle):{};return window.OC31&&OC31.approved(cfg)?cfg:null;}
 function machineRows(machine){const cfg=cycleConfig();if(!cfg)return [];return OC31.items(cfg).filter(x=>norm(x.machine)===norm(machine));}
 function resolveCycle(machine,material=''){
  const rows=machineRows(machine);if(!rows.length)return {status:'none',item:null,candidates:0};
  const mat=norm(material);
  if(mat){
   const exact=rows.filter(x=>norm(x.material_scope)===mat);if(exact.length===1)return {status:'matched',item:exact[0],candidates:1,match:'material'};if(exact.length>1)return {status:'ambiguous',item:null,candidates:exact.length,match:'material'};
   const generic=rows.filter(x=>genericScope(x.material_scope));if(generic.length===1)return {status:'matched',item:generic[0],candidates:1,match:'generic'};if(generic.length>1)return {status:'ambiguous',item:null,candidates:generic.length,match:'generic'};
   return {status:'material_mismatch',item:null,candidates:rows.length};
  }
  const generic=rows.filter(x=>genericScope(x.material_scope));if(generic.length===1)return {status:'matched',item:generic[0],candidates:1,match:'generic'};if(generic.length>1)return {status:'ambiguous',item:null,candidates:generic.length,match:'generic'};
  return {status:'needs_material',item:null,candidates:rows.length};
 }
 function visibleMaterial(){
  const input=document.querySelector('#materialInput');if(input&&String(input.value||'').trim())return String(input.value).trim();
  const p=document.querySelector('.run-hero p');if(!p)return '';const text=String(p.textContent||''),cut=text.indexOf(' · Shift '),value=(cut>=0?text.slice(0,cut):text).trim();return value==='Material belum tercatat'?'':value;
 }
 function standardCard(result,material){
  const card=document.createElement('section');card.className='panel oc31-hmi-standard v32-standard';
  if(result.status==='matched'){
   const x=result.item;card.innerHTML=`<h3>Standard Proses</h3><div><span>Target speed</span><strong>${x.target_speed_per_hour?fmt(Number(x.target_speed_per_hour),2)+' / jam':'—'}</strong></div><div><span>Cycle target</span><strong>${x.cycle_seconds?fmt(Number(x.cycle_seconds),3)+' detik':'—'}</strong></div><div><span>Satuan</span><strong>${esc(x.unit||'—')}</strong></div><small>${esc(x.source_ref||'Referensi belum dicatat')} · efektif ${esc(x.effective_from||'—')}${x.material_scope?' · scope '+esc(x.material_scope):''}</small>`;return card;
  }
  const label=result.status==='ambiguous'?'Standard belum dapat dipilih otomatis':result.status==='material_mismatch'?'Tidak ada Cycle Target untuk material aktif':'Material diperlukan untuk memilih Cycle Target';
  card.innerHTML=`<h3>Standard Proses</h3><div class="oc31-note"><strong>${esc(label)}</strong><span>${material?'Material '+esc(material)+' · ':''}${fmt(result.candidates)} kandidat pada mesin ini. Nilai target tidak ditampilkan agar operator tidak menerima standard yang salah.</span></div>`;return card;
 }
 function paintStandardV32(){
  if(view!=='shopfloor')return;document.querySelectorAll('.oc31-hmi-standard').forEach(x=>x.remove());const side=document.querySelector('.hmi-side');if(!side)return;const machine=typeof hmiMachine!=='undefined'?hmiMachine:'',rows=machineRows(machine);if(!rows.length)return;const material=visibleMaterial(),result=resolveCycle(machine,material);side.append(standardCard(result,material));
 }
 if(typeof shopfloor==='function'){const base=shopfloor;shopfloor=async function(...args){const out=await base(...args);queueMicrotask(paintStandardV32);return out;};}
 document.addEventListener('change',e=>{if(view==='shopfloor'&&['planChoice','materialInput'].includes(e.target?.id||''))queueMicrotask(paintStandardV32);});
 function governDowntimeForm(klass){
  const form=document.querySelector('#downForm');if(!form||!window.OC31)return;const cfg=OC31.read(OC31.keys.loss),approved=OC31.approved(cfg),items=approved?OC31.items(cfg).filter(x=>String(x.class||'').toUpperCase()===String(klass||'').toUpperCase()):[];
  const dept=form.querySelector('[name="department"]');if(dept){const current=String(dept.value||'PROD').toUpperCase(),options=Object.entries(departments||{});dept.innerHTML=options.map(([code,label])=>`<option value="${esc(code)}" ${code===current?'selected':''}>${esc(label)}</option>`).join('');if(!dept.value&&options[0])dept.value=options[0][0];}
  if(!approved)return;
  const submit=form.querySelector('button[type="submit"],button.primary');if(!items.length){const n=document.createElement('div');n.className='notice full';n.textContent=`Belum ada reason ${klass} yang disahkan pada baseline Loss-Time. Hubungi owner proses sebelum mencatat downtime.`;form.prepend(n);if(submit)submit.disabled=true;return;}
  const preset=form.querySelector('#oc31LossPreset');if(preset){preset.required=true;const label=preset.closest('label');if(label)label.firstChild.textContent='Reason baseline wajib ';}
  for(const name of ['code','reason','owner_department']){const el=form.querySelector(`[name="${name}"]`);if(el){el.readOnly=true;el.setAttribute('aria-readonly','true');}}
 }
 if(typeof downtimeDialog==='function'){const base=downtimeDialog;downtimeDialog=function(run,klass){base(run,klass);queueMicrotask(()=>governDowntimeForm(klass));};}
 window.OC32Runtime={resolveCycle,paintStandard:paintStandardV32};
})();
