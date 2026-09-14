/* BMJ OEE Release Resilience v33 — prevent stale sheet state and safely preview browser-native source types. */
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
 const imageMime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml'};
 openFile=async function(source){
  if(!source)return toast('Sumber dokumen tidak ditemukan.');const kind=String(source.kind||'').toLowerCase();if(!imageMime[kind])return baseOpenFileV33(source);
  dialog(source.name,'<p>Menyiapkan pratinjau gambar…</p>');
  try{
   const r=await fetch(base+'/api/files/'+encodeURIComponent(source.id),{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('File belum tersedia pada backend. Jalankan unggah dokumen sumber.');
   const bytes=await r.arrayBuffer(),blob=new Blob([bytes],{type:imageMime[kind]}),url=URL.createObjectURL(blob);$('.dialogbody').innerHTML=`<div class="source-image-preview"><img src="${url}" alt="${esc(source.name)}" style="display:block;max-width:100%;max-height:70vh;margin:auto;object-fit:contain"><div class="formactions"><a href="${url}" download="${esc(source.name)}">Unduh file asli</a></div></div>`;modal.addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});
  }catch(e){$('.dialogbody').innerHTML=`<div class="errorbox">${esc(e.message)}</div>`;}
 };
})();
