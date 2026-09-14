/* BMJ OEE Release Resilience v33 — prevent stale sheet state and normalize browser-previewable source types. */
(()=>{
 const baseDepartmentV33=department;
 department=async function(dept){
  const sheets=(catalog?.sheets||[]).filter(s=>s.department===dept);
  if(!sheets.length){activeSheet=null;rows=[];total=0;$('#content').innerHTML=heading(departments[dept]||dept,'Ruang kerja sumber department')+`<section class="panel"><div class="empty-state-card"><strong>Belum ada sheet sumber untuk ${esc(departments[dept]||dept)}.</strong><span>Halaman tetap dapat digunakan setelah sumber department diimpor atau source authority ditetapkan. Tidak ada data contoh yang ditampilkan.</span></div>${can(dept,'create')?'<div class="notice">Input operasional baru tetap tersedia melalui menu Transaksi & Monitoring sesuai izin akun.</div>':''}</section>`;return;
  }
  if(!activeSheet||!sheets.some(s=>s.id===activeSheet)){activeSheet=null;page=0;query='';}
  try{return await baseDepartmentV33(dept);}catch(err){console.error('Department view error',err);rows=[];total=0;$('#content').innerHTML=heading(departments[dept]||dept,'Ruang kerja sumber department')+`<section class="panel"><div class="errorbox"><strong>Data sumber belum dapat ditampilkan.</strong><span>${esc(err?.message||'Terjadi kesalahan membaca metadata sumber.')}</span></div><button id="retryDept" class="primary">Muat ulang sumber</button></section>`;$('#retryDept').onclick=()=>{activeSheet=null;page=0;department(dept);};}
 };
 const baseOpenFileV33=openFile;
 openFile=async function(source){if(!source)return toast('Sumber dokumen tidak ditemukan.');const kind=String(source.kind||'').toLowerCase(),normalized=['jpg','jpeg','webp','gif'].includes(kind)?'jpeg':kind==='svg'?'png':kind;return baseOpenFileV33({...source,kind:normalized});};
})();
