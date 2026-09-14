/* BMJ OEE Transaction Form v38 — module-aware, production-safe dialog enhancement. */
(()=>{
 const baseEntryFormV38=entryForm;
 const requiredByModule={
  production:['title','date','machine','total','good','planned','runtime','speed'],
  downtime:['title','date','machine','minutes'],
  maintenance:['title','date','machine','minutes'],
  quality:['title','date','machine'],
  planning:['title','date','machine'],
  batch:['title','date','machine','pro','input_batch','output_batch','qty','good','reject','nc','unit']
 };
 const numericNonNegative={production:['total','good','planned','runtime','speed'],downtime:['minutes'],maintenance:['minutes'],quality:['reject','total','good'],batch:['qty','good','reject','nc'],development:['minutes','cost'],energy:['kwh'],project:['progress']};
 const help={
  production:'Good tidak boleh melebihi total. Runtime tidak boleh melebihi planned time. Ideal speed mengikuti baseline proses yang disahkan.',
  downtime:'Gunakan klasifikasi/reason yang sesuai baseline Loss-Time bila baseline sudah disahkan. Root cause final dicatat saat closure HMI.',
  maintenance:'Durasi adalah durasi perbaikan transaksi ini. Jangan menurunkan MTTR dari selisih timestamp histori tanpa validasi.',
  quality:'Pertahankan satuan inspeksi. Jangan mencampur pcs, sheet, kg, atau unit lain dalam satu agregasi tanpa konversi resmi.',
  planning:'Planning hanya tersedia di HMI setelah berstatus Released / Siap Produksi. Target produksi harus mempunyai satuan eksplisit atau FG Unit authoritative.',
  confirmation:'Yield, scrap, dan jam bersifat signed. Nilai negatif dipertahankan sebagai kandidat reversal dan tidak diubah menjadi nol.',
  development:'Gunakan durasi dan biaya aktual. Nilai agregat historis yang anomali tetap direkonsiliasi pada Kualitas Data.',
  batch:'Qty Good + NC + Reject tidak boleh melebihi Qty Input. Satuan wajib eksplisit.',
  checklist:'Checklist ini melengkapi register. Gate Start PRO pada HMI tetap memakai checklist pre-start HMI.',
  process:'Gunakan parameter dan satuan yang sama ketika membandingkan LSL/USL atau menjalankan analisis Ppk.',
  energy:'Masukkan kWh aktual bila tersedia; aplikasi tidak membuat estimasi konsumsi.',
  master:'Master yang dipakai sebagai authority harus melalui governance/baseline terkait sebelum menjadi rule operasional.',
  project:'Progress 0–100%. Due date dan deliverable sebaiknya mencerminkan action plan aktual.'
 };
 const owner=()=>modules[opModule]?.[1]||'PROJECT';
 entryForm=function(row){
  const out=baseEntryFormV38(row);queueMicrotask(()=>enhance(row));return out;
 };
 function field(form,name){return form?.elements?.namedItem(name)||form?.querySelector(`[name="${CSS.escape(name)}"]`);}
 function rowPayload(row){try{return row?JSON.parse(row.payload||'{}'):{};}catch{return {};}}
 function markRequired(form,row){
  const names=requiredByModule[opModule]||['title'];for(const name of names){const el=field(form,name);if(!el)continue;if(!row||['title','date','machine'].includes(name))el.required=true;const label=el.closest('label');if(label&&!label.querySelector('.v38-required'))label.insertAdjacentHTML('afterbegin','<span class="v38-required" aria-hidden="true">Wajib</span>');}
  for(const name of numericNonNegative[opModule]||[]){const el=field(form,name);if(!el||el.type!=='number')continue;if(opModule!=='confirmation')el.min='0';el.inputMode='decimal';}
  if(opModule==='production'){const planned=field(form,'planned'),speed=field(form,'speed');if(planned)planned.min='0.000001';if(speed)speed.min='0.000001';}
  if(opModule==='project'){const progress=field(form,'progress');if(progress){progress.min='0';progress.max='100';}}
 }
 function checklistControls(form){if(opModule!=='checklist')return;for(const name of ['material','qc','safety','tools']){const old=field(form,name);if(!old||old.tagName==='SELECT')continue;const select=document.createElement('select');select.name=name;select.disabled=old.disabled;select.innerHTML='<option value="">Belum ditetapkan</option><option value="true">Ya / Siap</option><option value="false">Tidak / Belum</option>';const raw=String(old.value||'').toLowerCase();select.value=['true','ya','siap','ok'].includes(raw)?'true':['false','tidak','belum'].includes(raw)?'false':'';old.replaceWith(select);}}
 function sourceContext(form,row){let payload={};try{payload=row?JSON.parse(row.payload||'{}'):{};}catch{}const dept=owner(),box=document.createElement('div');box.className='v38-context';box.innerHTML=`<div><span>Modul</span><strong>${esc(modules[opModule]?.[0]||opModule)}</strong></div><div><span>Pemilik proses</span><strong>${esc(departments[dept]||dept)}</strong></div><div><span>Mode</span><strong>${row?'Ubah transaksi':'Transaksi baru'}</strong></div><div><span>Traceability</span><strong>${payload.source_record?'Sumber terpetakan':'D1 operasional'}</strong>${payload.source_sheet?`<small>${esc(payload.source_sheet)} · ${esc(payload.source_record||'')}</small>`:''}</div>`;form.insertAdjacentElement('beforebegin',box);const note=document.createElement('div');note.className='v38-help';note.innerHTML=`<strong>Aturan input</strong><span>${esc(help[opModule]||'Isi data sesuai transaksi aktual dan pertahankan satuan serta sumbernya.')}</span>`;form.prepend(note);}
 function planningUnit(form,row){
  if(opModule!=='planning'||field(form,'unit'))return;const p=rowPayload(row),kpi=window.DG16?DG16.read(DG16.keys.kpi):{},approved=!!(window.DG16&&DG16.approved(kpi)),defaultUnit=String(p.unit||(approved?kpi.fg_unit:'')||'').trim();
  const label=document.createElement('label'),input=document.createElement('input'),hint=document.createElement('small');label.append(document.createTextNode('Satuan target'));input.name='unit';input.maxLength=24;input.placeholder='sheet / pcs / kg / unit';input.value=defaultUnit;hint.className='v38-field-hint';hint.textContent=defaultUnit&&!p.unit&&approved?'Diambil dari FG Unit authoritative. Ubah hanya bila planning memakai satuan lain.':'Satuan target mengikuti transaksi aktual dan tidak digabungkan lintas unit.';label.append(input,hint);const target=field(form,'target')?.closest('label'),status=field(form,'status')?.closest('label');if(target)target.insertAdjacentElement('afterend',label);else status?.insertAdjacentElement('beforebegin',label);
  const statusField=field(form,'status'),sync=()=>{const released=statusField?.value==='Released';input.required=released;let chip=label.querySelector('.v38-planning-unit-required');if(released&&!chip){chip=document.createElement('span');chip.className='v38-required v38-planning-unit-required';chip.textContent='Wajib saat Released';label.prepend(chip);}if(!released&&chip)chip.remove();};statusField?.addEventListener('change',sync);sync();
 }
 function unitNotice(form){if(!['production','quality','confirmation','batch','process'].includes(opModule))return;const unit=field(form,'unit');if(!unit)return;unit.placeholder=unit.placeholder||'sheet / pcs / kg / unit aktual';const small=document.createElement('small');small.className='v38-field-hint';small.textContent='Satuan disimpan apa adanya. Jangan mengganti satuan hanya agar angka dapat dijumlahkan.';unit.insertAdjacentElement('afterend',small);}
 function signedNotice(form){if(opModule!=='confirmation')return;for(const name of ['qty','scrap','hours']){const el=field(form,name);if(!el)continue;el.removeAttribute('min');const small=document.createElement('small');small.className='v38-field-hint';small.textContent='Signed value · negatif diperbolehkan untuk reversal.';el.insertAdjacentElement('afterend',small);}}
 function productionPreview(form){if(opModule!=='production')return;const box=document.createElement('div');box.className='v38-oee-preview';box.innerHTML='<span>Preview kalkulasi</span><div><b>Availability</b><strong>—</strong></div><div><b>Performance</b><strong>—</strong></div><div><b>Quality</b><strong>—</strong></div><div><b>OEE</b><strong>—</strong></div><small>Preview browser untuk membantu input. Nilai tersimpan tetap dihitung/validasi oleh backend.</small>';const actions=form.querySelector('.formactions');actions?.insertAdjacentElement('beforebegin',box);const vals=()=>{const n=k=>Number(field(form,k)?.value),planned=n('planned'),runtime=n('runtime'),speed=n('speed'),total=n('total'),good=n('good');const a=planned>0?runtime/planned:null,p=runtime>0&&speed>0?total/(runtime/60*speed):null,q=total>0?good/total:null,o=[a,p,q].every(Number.isFinite)?a*p*q:null;return[a,p,q,o];};const draw=()=>{const v=vals(),els=box.querySelectorAll('div strong');v.forEach((x,i)=>els[i].textContent=Number.isFinite(x)?pct(x):'—');box.classList.toggle('warn',v.some(x=>Number.isFinite(x)&&x>1.05));};for(const k of ['planned','runtime','speed','total','good'])field(form,k)?.addEventListener('input',draw);draw();}
 function statusContext(form){const select=field(form,'status');if(!select)return;const hint=document.createElement('small');hint.className='v38-status-hint';if(opModule==='planning')hint.textContent='Released berarti planning lengkap dan siap dipilih operator pada HMI.';else hint.textContent='Status mencerminkan lifecycle register; approval operasional tetap dicatat pada antrean verifikasi bila workflow terkait aktif.';select.insertAdjacentElement('afterend',hint);}
 function enhance(row){const form=$('#entryForm');if(!form||form.dataset.v38)return;form.dataset.v38='1';sourceContext(form,row);checklistControls(form);planningUnit(form,row);markRequired(form,row);unitNotice(form);signedNotice(form);statusContext(form);productionPreview(form);const save=form.querySelector('.formactions .primary');if(save)save.textContent=row?'Simpan perubahan':'Simpan transaksi';}
 window.TransactionFormV38={enhance};
})();
