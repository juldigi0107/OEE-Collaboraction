/* BMJ OEE Module Table v25 — business-facing register presentation without changing stored data */
(()=>{
 const baseOperationsV25=operations;
 const P=r=>{try{return JSON.parse(r?.payload||'{}')}catch{return {}}};
 const has=v=>v!==undefined&&v!==null&&v!=='';
 const txt=v=>esc(has(v)?v:'—');
 const num=(v,d=1)=>{const n=Number(v);return has(v)&&Number.isFinite(n)?fmt(n,d):'—';};
 const money=v=>{const n=Number(v);return has(v)&&Number.isFinite(n)?'Rp '+fmt(n):'—';};
 const pair=(a,b)=>`${txt(a)}${has(b)?`<small>${txt(b)}</small>`:''}`;
 const statusName=s=>({PENDING:'Menunggu verifikasi',APPROVED:'Disetujui',REJECTED:'Ditolak',RUNNING:'Berjalan',FINISHED:'Selesai',OPEN:'Terbuka',CLOSED:'Selesai',ACKNOWLEDGED:'Diterima Maintenance',Draft:'Draft',Direncanakan:'Direncanakan',Released:'Siap Produksi',Dimulai:'Berjalan',Selesai:'Selesai',Terverifikasi:'Terverifikasi'}[s]||s||'Tercatat');
 const statusClass=s=>['APPROVED','FINISHED','CLOSED','Selesai','Terverifikasi'].includes(s)?'ok':['REJECTED'].includes(s)?'danger':['PENDING','OPEN','Draft','Direncanakan'].includes(s)?'warn':['Released'].includes(s)?'ok':'neutral';
 const status=s=>`<span class="release-status ${statusClass(s)}">${esc(statusName(s))}</span>`;
 const source=p=>p.source_sheet||p.source_record?`${txt(p.source_sheet||'Sumber')}<small>${txt(p.source_record||'')}</small>`:'<span class="v25-source-live">D1 operasional</span>';
 const boolLabel=v=>{if(v===true||v==='true'||v==='Siap'||v==='OK'||v==='Ya')return '<span class="release-status ok">Siap</span>';if(v===false||v==='false'||v==='Tidak')return '<span class="release-status danger">Belum</span>';return '<span class="release-status neutral">—</span>';};
 const col=(label,render,cls='')=>({label,render,cls});
 const commonDate=col('Tanggal',p=>pair(p.date,p.shift?`Shift ${p.shift}${p.group?' · Group '+p.group:''}`:''));
 const commonMachine=col('Mesin / PRO',p=>pair(p.machine,p.pro));
 const sourceCol=col('Sumber',p=>source(p));
 const statusCol=col('Status',p=>status(p.status));
 const specs={
  production:[commonDate,commonMachine,col('Material',p=>pair(p.material,p.unit)),col('Total output',p=>num(p.total), 'v25-num'),col('Good output',p=>num(p.good),'v25-num'),col('Runtime',p=>has(p.runtime)?num(p.runtime)+' menit':'—','v25-num'),col('OEE',p=>p.metrics&&Number.isFinite(Number(p.metrics.oee))?pct(Number(p.metrics.oee)):'—','v25-num'),statusCol,sourceCol],
  downtime:[commonDate,commonMachine,col('Klasifikasi',p=>txt(p.category||p.class)),col('Penyebab',p=>pair(p.reason,p.code)),col('Durasi',p=>has(p.minutes)?num(p.minutes)+' menit':'—','v25-num'),statusCol,sourceCol],
  quality:[commonDate,commonMachine,col('Material / Batch',p=>pair(p.material,p.batch)),col('Defect / alasan',p=>txt(p.reason)),col('Reject',p=>num(p.reject),'v25-num'),col('Diperiksa',p=>num(p.total),'v25-num'),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  maintenance:[commonDate,col('Mesin',p=>txt(p.machine)),col('Notifikasi',p=>txt(p.notification)),col('Kategori',p=>txt(p.category)),col('Durasi perbaikan',p=>has(p.minutes)?num(p.minutes)+' menit':'—','v25-num'),col('Tindakan korektif',p=>txt(p.action)),statusCol,sourceCol],
  confirmation:[commonDate,col('PRO / Material',p=>pair(p.pro,p.material)),col('Konfirmasi / Counter',p=>pair(p.confirmation,p.counter)),col('Yield',p=>num(p.qty),'v25-num'),col('Scrap',p=>num(p.scrap),'v25-num'),col('Jam',p=>num(p.hours,2),'v25-num'),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  planning:[commonDate,commonMachine,col('Material',p=>txt(p.material)),col('Target',p=>num(p.target),'v25-num'),col('Shift / Group',p=>pair(p.shift,p.group)),statusCol,sourceCol],
  development:[commonDate,col('Material / item',p=>txt(p.material)),col('Kategori trial',p=>txt(p.category)),col('Durasi trial',p=>has(p.minutes)?num(p.minutes)+' menit':'—','v25-num'),col('Biaya aktual',p=>money(p.cost),'v25-num'),statusCol,sourceCol],
  batch:[commonDate,col('PRO',p=>txt(p.pro)),col('Batch input',p=>txt(p.input_batch)),col('Batch output',p=>txt(p.output_batch)),col('Qty input',p=>num(p.qty),'v25-num'),col('Good / NC / Reject',p=>`${num(p.good)} / ${num(p.nc)} / ${num(p.reject)}`,'v25-num'),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  checklist:[commonDate,commonMachine,col('Material',p=>boolLabel(p.material)),col('QC',p=>boolLabel(p.qc)),col('Safety',p=>boolLabel(p.safety)),col('Tools & area',p=>boolLabel(p.tools)),statusCol,sourceCol],
  logbook:[commonDate,commonMachine,col('Pekerjaan / tindak lanjut',p=>txt(p.action||p.title)),statusCol,sourceCol],
  process:[commonDate,col('Mesin',p=>txt(p.machine)),col('Parameter',p=>txt(p.parameter)),col('Nilai',p=>pair(has(p.value)?num(p.value,4):'—',p.unit)),col('Batas spesifikasi',p=>`LSL ${num(p.lsl,4)}<small>USL ${num(p.usl,4)}</small>`),statusCol,sourceCol],
  energy:[commonDate,commonMachine,col('Pemakaian energi',p=>has(p.kwh)?num(p.kwh,2)+' kWh':'—','v25-num'),statusCol,sourceCol],
  master:[col('Kategori',p=>txt(p.category)),col('Kode',p=>txt(p.code)),col('Nilai / deskripsi',p=>txt(p.value)),col('Satuan',p=>txt(p.unit)),statusCol,sourceCol],
  project:[commonDate,col('Judul',p=>txt(p.title)),col('PIC',p=>txt(p.owner)),col('Jatuh tempo',p=>txt(p.due)),col('Progress',p=>has(p.progress)?num(p.progress,1)+'%':'—','v25-num'),col('Output / deliverable',p=>txt(p.output)),statusCol,sourceCol]
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
