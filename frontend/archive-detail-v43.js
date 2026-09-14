/* BMJ OEE Archive Detail v43 — business context without mutating source coordinates. */
(()=>{
 const J=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return {}}};
 const sourceStats=id=>{const ss=(catalog?.sheets||[]).filter(x=>x.source_id===id);return {sheets:ss.length,rows:ss.reduce((n,x)=>n+Number(x.rows||0),0),errors:ss.reduce((n,x)=>n+Number(J(x.meta).errors||0),0),missing:ss.reduce((n,x)=>n+Number(J(x.meta).missing_cache||0),0)};};
 const authorityIds=()=>{const cfg=window.DG16?DG16.read(DG16.keys.sources):{};if(!window.DG16||!DG16.approved(cfg))return new Set();return new Set(Object.values(cfg.domains||{}).map(v=>typeof v==='string'?v:v?.source_id).filter(Boolean));};
 function currentLabels(){const map={};document.querySelectorAll('#content table.archive-semantic-v26 thead th').forEach(th=>{const coord=th.querySelector('.v26-col-coordinate')?.textContent?.trim(),label=th.querySelector('.v26-col-label')?.textContent?.trim();if(coord&&label)map[coord]=label;});return map;}
 if(typeof rowDetail==='function'){
  const baseRowDetailV43=rowDetail;
  rowDetail=function(row,dept){const labels=currentLabels(),out=baseRowDetailV43(row,dept);queueMicrotask(()=>decorateRow(row,dept,labels));return out;};
 }
 function decorateRow(row,dept,labels){
  const form=$('#rowForm');if(!form||form.dataset.v43)return;form.dataset.v43='1';const sheet=(catalog?.sheets||[]).find(x=>x.id===activeSheet),source=(catalog?.sources||[]).find(x=>x.id===sheet?.source_id),sm=J(sheet?.meta),head=document.createElement('div');head.className='v43-row-context';head.innerHTML=`<div><span>File sumber</span><strong>${esc(source?.name||'—')}</strong></div><div><span>Sheet / baris</span><strong>${esc(sheet?.name||'—')} · ${row?fmt(row.row_num):'baru'}</strong></div><div><span>Owner</span><strong>${esc(departments[dept]||dept)}</strong></div><div><span>Jejak formula</span><strong>${fmt(Number(sm.formulas||0))} formula pada sheet</strong></div>`;form.insertAdjacentElement('beforebegin',head);
  form.querySelectorAll('.formgrid>label').forEach(label=>{const input=label.querySelector('input[name]');if(!input)return;const coord=input.name,business=labels[coord];if(!business)return;const chip=document.createElement('span');chip.className='v43-business-label';chip.textContent=business;label.insertBefore(chip,input);input.setAttribute('aria-label',`${business} · kolom ${coord}`);});
  const notice=form.previousElementSibling?.previousElementSibling;if(notice?.classList.contains('notice'))notice.textContent='Koordinat Excel, nilai asli, dan formula dipertahankan untuk audit. Label bisnis hanya membantu membaca sumber dan tidak mengubah struktur workbook.';
 }
 if(typeof openFile==='function'){
  const baseOpenFileV43=openFile;
  openFile=async function(source){const out=await baseOpenFileV43(source);decorateFile(source);return out;};
 }
 function decorateFile(source){
  const body=document.querySelector('#modal .dialogbody');if(!body||body.querySelector('.v43-file-context'))return;const st=sourceStats(source.id),m=J(source.meta),authority=authorityIds().has(source.id),card=document.createElement('section');card.className='v43-file-context';card.innerHTML=`<div class="v43-file-head"><div><span>SOURCE DETAIL</span><strong>${esc(source.name||'Sumber')}</strong><small>${esc(source.path||'Arsip D1')}</small></div><span class="release-status ${authority?'ok':'neutral'}">${authority?'Authoritative':'Referensi / belum authoritative'}</span></div><div class="v43-file-grid"><div><span>Pemilik</span><strong>${esc(departments[source.department]||source.department||'—')}</strong></div><div><span>Jenis / ukuran</span><strong>${esc(String(source.kind||'file').toUpperCase())} · ${humanBytesV43(source.bytes)}</strong></div><div><span>Sheet / baris</span><strong>${fmt(st.sheets)} / ${fmt(st.rows)}</strong></div><div><span>Temuan sumber</span><strong>${fmt(st.errors)} error · ${fmt(st.missing)} formula kosong</strong></div><div><span>Checksum</span><strong>${esc(source.sha256?String(source.sha256).slice(0,16)+'…':'—')}</strong></div><div><span>Periode metadata</span><strong>${esc(m.period||m.date_range||'Ikuti isi transaksi/cell')}</strong></div></div><p>File asli tetap menjadi bukti sumber. Preview aplikasi tidak mengubah formula, layout, gambar tertanam, atau periode di dalam file.</p>`;body.prepend(card);
 }
 function humanBytesV43(v){const n=Number(v||0);if(n<1024)return n+' B';if(n<1048576)return (n/1024).toLocaleString('id-ID',{maximumFractionDigits:1})+' KB';return (n/1048576).toLocaleString('id-ID',{maximumFractionDigits:1})+' MB';}
 window.ArchiveDetailV43={decorateRow,decorateFile,currentLabels,sourceStats};
})();
