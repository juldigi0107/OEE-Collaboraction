/* BMJ OEE Module Table v25 — business-facing register presentation without changing stored data */
(()=>{
 const baseOperationsV25=operations;
 const P=r=>{try{return JSON.parse(r?.payload||'{}')}catch{return {}}};
 const has=v=>v!==undefined&&v!==null&&v!=='';
 const first=(...v)=>v.find(has);
 const txt=v=>esc(has(v)?v:'—');
 const num=(v,d=1)=>{const n=Number(v);return has(v)&&Number.isFinite(n)?fmt(n,d):'—';};
 const money=v=>{const n=Number(v);return has(v)&&Number.isFinite(n)?'Rp '+fmt(n):'—';};
 const pair=(a,b)=>`${txt(a)}${has(b)?`<small>${txt(b)}</small>`:''}`;
 const quantity=(v,unit)=>`${num(v)}${has(unit)?`<small>${txt(unit)}</small>`:''}`;
 const duration=p=>has(first(p.minutes,p.runtime_minutes,p.repair_minutes))?num(first(p.minutes,p.runtime_minutes,p.repair_minutes))+' menit':has(p.hours)?num(p.hours,2)+' jam':'—';
 const statusName=s=>({PENDING:'Menunggu verifikasi',APPROVED:'Disetujui',REJECTED:'Ditolak',RUNNING:'Berjalan',FINISHED:'Selesai',OPEN:'Terbuka',CLOSED:'Selesai',ACKNOWLEDGED:'Diterima Maintenance',Draft:'Draft',Direncanakan:'Direncanakan',Released:'Siap Produksi',Dimulai:'Berjalan',Selesai:'Selesai',Terverifikasi:'Terverifikasi'}[s]||s||'Tercatat');
 const statusClass=s=>['APPROVED','FINISHED','CLOSED','Selesai','Terverifikasi'].includes(s)?'ok':['REJECTED'].includes(s)?'danger':['PENDING','OPEN','Draft','Direncanakan'].includes(s)?'warn':['Released'].includes(s)?'ok':'neutral';
 const status=s=>`<span class="release-status ${statusClass(s)}">${esc(statusName(s))}</span>`;
 const source=p=>p.source_sheet||p.source_record?`${txt(p.source_sheet||'Sumber')}<small>${txt(p.source_record||'')}</small>`:'<span class="v25-source-live">D1 operasional</span>';
 const boolLabel=v=>{if(v===true||v==='true'||v==='Siap'||v==='OK'||v==='Ya')return '<span class="release-status ok">Siap</span>';if(v===false||v==='false'||v==='Tidak')return '<span class="release-status danger">Belum</span>';return '<span class="release-status neutral">—</span>';};
 const col=(label,render,cls='')=>({label,render,cls});
 const commonDate=col('Tanggal',p=>pair(first(p.date,p.work_date),p.shift?`Shift ${p.shift}${p.group?' · Group '+p.group:''}`:''));
 const commonMachine=col('Mesin / PRO',p=>pair(first(p.machine,p.machine_code),first(p.pro,p.PRO)));
 const sourceCol=col('Sumber',p=>source(p));
 const statusCol=col('Status',p=>status(p.status));
 const specs={
  production:[commonDate,commonMachine,col('Material',p=>pair(first(p.material,p.material_no),p.unit)),col('Total output',p=>quantity(first(p.total,p.actual_qty,p.qty),p.unit),'v25-num'),col('Good output',p=>quantity(first(p.good,p.good_qty),p.unit),'v25-num'),col('Runtime',p=>duration(p),'v25-num'),col('OEE',p=>p.metrics&&Number.isFinite(Number(p.metrics.oee))?pct(Number(p.metrics.oee)):'—','v25-num'),statusCol,sourceCol],
  downtime:[commonDate,commonMachine,col('Klasifikasi',p=>txt(first(p.category,p.class))),col('Penyebab',p=>pair(first(p.reason,p.root_cause),p.code)),col('Durasi',p=>duration(p),'v25-num'),statusCol,sourceCol],
  quality:[commonDate,commonMachine,col('Material / Batch',p=>pair(first(p.material,p.material_no),p.batch)),col('Defect / alasan',p=>txt(first(p.reason,p.defect,p.note))),col('Reject',p=>num(first(p.reject,p.reject_qty)),'v25-num'),col('Diperiksa',p=>num(first(p.total,p.sample_qty)),'v25-num'),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  maintenance:[commonDate,col('Mesin',p=>txt(first(p.machine,p.machine_code))),col('Notifikasi',p=>txt(first(p.notification,p.notification_id))),col('Kategori',p=>txt(first(p.category,p.type))),col('Durasi perbaikan',p=>duration(p),'v25-num'),col('Tindakan korektif',p=>txt(first(p.action,p.corrective_action,p.root_cause))),statusCol,sourceCol],
  confirmation:[commonDate,col('PRO / Material',p=>pair(first(p.pro,p.PRO),first(p.material,p.material_no))),col('Konfirmasi / Counter',p=>pair(first(p.confirmation,p.confirmation_no),p.counter)),col('Yield',p=>num(first(p.qty,p.yield)),'v25-num'),col('Scrap',p=>num(p.scrap),'v25-num'),col('Jam',p=>num(p.hours,2),'v25-num'),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  planning:[commonDate,commonMachine,col('Material',p=>txt(first(p.material,p.material_no))),col('Target',p=>quantity(first(p.target,p.planned_qty),p.unit),'v25-num'),col('Shift / Group',p=>pair(p.shift,p.group)),statusCol,sourceCol],
  development:[commonDate,col('Material / item',p=>txt(first(p.material,p.item))),col('Kategori trial',p=>txt(first(p.category,p.trial_type))),col('Durasi trial',p=>duration(p),'v25-num'),col('Biaya aktual',p=>money(first(p.cost,p.actual_cost)),'v25-num'),statusCol,sourceCol],
  batch:[commonDate,col('PRO',p=>txt(first(p.pro,p.PRO))),col('Batch input',p=>txt(p.input_batch)),col('Batch output',p=>txt(p.output_batch)),col('Qty input',p=>num(p.qty),'v25-num'),col('Good / NC / Reject',p=>`${num(first(p.good,p.good_qty))} / ${num(p.nc)} / ${num(first(p.reject,p.reject_qty))}`,'v25-num'),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  checklist:[commonDate,commonMachine,col('Material',p=>boolLabel(p.material)),col('QC',p=>boolLabel(p.qc)),col('Safety',p=>boolLabel(p.safety)),col('Tools & area',p=>boolLabel(p.tools)),statusCol,sourceCol],
  logbook:[commonDate,commonMachine,col('Pekerjaan / tindak lanjut',p=>txt(first(p.action,p.title,p.note))),statusCol,sourceCol],
  process:[commonDate,col('Mesin',p=>txt(first(p.machine,p.machine_code))),col('Parameter',p=>txt(p.parameter)),col('Nilai',p=>pair(has(p.value)?num(p.value,4):'—',p.unit)),col('Batas spesifikasi',p=>`LSL ${num(p.lsl,4)}<small>USL ${num(p.usl,4)}</small>`),statusCol,sourceCol],
  energy:[commonDate,commonMachine,col('Pemakaian energi',p=>has(p.kwh)?num(p.kwh,2)+' kWh':'—','v25-num'),statusCol,sourceCol],
  master:[col('Kategori',p=>txt(p.category)),col('Kode',p=>txt(p.code)),col('Nilai / deskripsi',p=>txt(first(p.value,p.description,p.title))),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  project:[commonDate,col('Judul',p=>txt(p.title)),col('PIC',p=>txt(first(p.owner,p.pic))),col('Jatuh tempo',p=>txt(first(p.due,p.due_date))),col('Progress',p=>has(p.progress)?num(p.progress,1)+'%':'—','v25-num'),col('Output / deliverable',p=>txt(first(p.output,p.deliverable))),statusCol,sourceCol]
 };
 operations=async function(){
  await baseOperationsV25();
  renderModuleTableV25();
 };
 function renderModuleTableV25(){
  const table=$('#content .tablewrap table'),columns=specs[opModule];if(!table||!columns)return;
  table.classList.add('module-table-v25');
  const thead=table.querySelector('thead'),tbody=table.querySelector('tbody');if(!thead||!tbody)return;
  thead.innerHTML=`<tr>${columns.map(c=>`<th class="${c.cls||''}">${esc(c.label)}</th>`).join('')}<th>Aksi</th></tr>`;
  tbody.innerHTML=(rows||[]).map((r,i)=>{const p=P(r);return `<tr>${columns.map(c=>`<td class="${c.cls||''}">${c.render(p,r)}</td>`).join('')}<td><button data-v25-entry="${i}">Detail</button></td></tr>`;}).join('');
  document.querySelectorAll('[data-v25-entry]').forEach(b=>b.onclick=()=>entryForm(rows[Number(b.dataset.v25Entry)]));
  const empty=$('#content .tablewrap .empty');if(empty)empty.textContent=`Belum ada data pada register ${modules[opModule]?.[0]||opModule}. Data historis sumber tetap dapat ditelusuri dari ruang kerja department.`;
  let note=$('#content .v25-table-note');if(!note){note=document.createElement('p');note.className='sheetinfo v25-table-note';table.closest('.tablewrap')?.insertAdjacentElement('afterend',note);}if(note)note.textContent='Kolom mengikuti konteks modul. Satuan dan sumber dipertahankan; aplikasi tidak menggabungkan unit berbeda atau membuat nilai estimasi untuk field yang kosong.';
 }
})();
