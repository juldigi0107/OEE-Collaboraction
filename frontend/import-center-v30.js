/* BMJ OEE Import Center v30 — staged validation before D1 mutation. */
(()=>{
 const specs={
  sources:7,sheets:7,documents:4,record_chunks:9,entries:8,source_files:6,source_file_chunks:3,asset_catalog:3
 };
 const labels={sources:'Sumber',sheets:'Sheet',documents:'Dokumen',record_chunks:'Arsip baris',entries:'Transaksi',source_files:'File sumber',source_file_chunks:'Chunk file',asset_catalog:'Katalog aset'};
 const enc=new TextEncoder();
 let staged=[];
 const bytes=n=>{const v=Number(n||0);if(v<1024)return v+' B';if(v<1048576)return (v/1024).toLocaleString('id-ID',{maximumFractionDigits:1})+' KB';return (v/1048576).toLocaleString('id-ID',{maximumFractionDigits:1})+' MB';};
 const formatIssue=x=>`${x.file}${x.line?` · baris ${x.line}`:''}: ${x.message}`;
 function blankSummary(){return {files:0,batches:0,rows:0,bytes:0,byTable:{},issues:[],warnings:[]};}
 function validateBatch(obj,file,line){
  const issues=[],table=String(obj?.table||''),rows=obj?.rows;
  if(!specs[table])issues.push({file,line,message:'Jenis data tidak dikenali.'});
  if(!Array.isArray(rows)||rows.length<1||rows.length>20)issues.push({file,line,message:'Batch harus berisi 1–20 row.'});
  if(Array.isArray(rows)&&specs[table])rows.forEach((r,i)=>{if(!Array.isArray(r)||r.length!==specs[table])issues.push({file,line,message:`Row ${i+1} memiliki jumlah kolom yang tidak sesuai untuk ${labels[table]||table}.`});});
  if(table==='source_file_chunks'&&Array.isArray(rows))rows.forEach((r,i)=>{const v=r?.[2];if(typeof v!=='string'||!v.length)issues.push({file,line,message:`Chunk file row ${i+1} tidak memiliki payload base64.`});});
  const wire=JSON.stringify(obj??{}),size=enc.encode(wire).length;
  if(size>450000)issues.push({file,line,message:`Ukuran batch ${bytes(size)} melebihi batas backend 450 KB.`});
  return {issues,size,table,rows:Array.isArray(rows)?rows.length:0,obj};
 }
 async function stageFiles(files){
  staged=[];const summary=blankSummary();summary.files=files.length;summary.bytes=files.reduce((n,f)=>n+f.size,0);
  if(!files.length){summary.issues.push({file:'Paket',message:'Belum ada file JSONL dipilih.'});return summary;}
  if(files.length>250)summary.warnings.push({file:'Paket',message:'Jumlah file sangat banyak; impor tetap bisa dilakukan tetapi proses dapat memerlukan waktu lebih lama.'});
  if(summary.bytes>250*1024*1024)summary.warnings.push({file:'Paket',message:'Ukuran paket di atas 250 MB. Pastikan koneksi stabil sebelum menjalankan impor.'});
  for(const file of files){
   if(!/\.jsonl$/i.test(file.name)){summary.issues.push({file:file.name,message:'Format file harus .jsonl.'});continue;}
   const text=await file.text(),lines=text.split(/\r?\n/);
   let nonempty=0;
   for(let i=0;i<lines.length;i++){
    const raw=lines[i].trim();if(!raw)continue;nonempty++;
    let obj;try{obj=JSON.parse(raw);}catch{summary.issues.push({file:file.name,line:i+1,message:'JSON tidak valid.'});continue;}
    const v=validateBatch(obj,file.name,i+1);summary.issues.push(...v.issues);
    if(!v.issues.length){
     const item={file:file.name,line:i+1,table:v.table,rows:v.rows,size:v.size,obj:v.obj};staged.push(item);summary.batches++;summary.rows+=v.rows;summary.byTable[v.table]=(summary.byTable[v.table]||0)+v.rows;
    }
   }
   if(!nonempty)summary.issues.push({file:file.name,message:'File kosong.'});
  }
  return summary;
 }
 function tableRows(by){return Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,n])=>`<tr><td>${esc(labels[k]||k)}</td><td><code>${esc(k)}</code></td><td>${fmt(n)} row</td></tr>`).join('')||'<tr><td colspan="3">Belum ada batch valid.</td></tr>';}
 function renderReview(s){
  const host=$('#ic30Review');if(!host)return;
  const ok=s.issues.length===0&&s.batches>0;
  host.innerHTML=`<div class="ic30-summary"><div><span>File</span><strong>${fmt(s.files)}</strong></div><div><span>Batch valid</span><strong>${fmt(s.batches)}</strong></div><div><span>Row siap impor</span><strong>${fmt(s.rows)}</strong></div><div><span>Ukuran paket</span><strong>${bytes(s.bytes)}</strong></div></div><div class="ic30-review-grid"><section><h3>Komposisi paket</h3><div class="tablewrap"><table><thead><tr><th>Jenis data</th><th>Table</th><th>Row</th></tr></thead><tbody>${tableRows(s.byTable)}</tbody></table></div></section><section><h3>Hasil validasi</h3>${s.issues.length?`<div class="ic30-issues">${s.issues.slice(0,50).map(x=>`<div class="error">${esc(formatIssue(x))}</div>`).join('')}${s.issues.length>50?`<div class="muted">+${fmt(s.issues.length-50)} issue lain.</div>`:''}</div>`:`<div class="ic30-ok"><strong>Paket lolos validasi lokal</strong><span>Belum ada data yang dikirim ke D1.</span></div>`}${s.warnings.length?`<div class="ic30-warnings">${s.warnings.map(x=>`<div>${esc(formatIssue(x))}</div>`).join('')}</div>`:''}</section></div><label class="ic30-confirm ${ok?'':'disabled'}"><input id="ic30Confirm" type="checkbox" ${ok?'':'disabled'}> Saya sudah memeriksa ringkasan paket dan memahami bahwa impor akan menambahkan ID yang belum ada tanpa menghapus data existing.</label><div class="ic30-actions"><button id="ic30Reset">Pilih ulang paket</button><button id="ic30Run" class="primary" ${ok?'disabled':''}>Jalankan Impor</button></div>`;
  $('#ic30Reset').onclick=()=>{staged=[];const input=$('#ic30Files');if(input)input.value='';host.innerHTML='<div class="ic30-empty">Pilih paket JSONL lalu tekan Validasi Paket. Tidak ada perubahan D1 sebelum tahap eksekusi.</div>';};
  const confirm=$('#ic30Confirm'),run=$('#ic30Run');if(confirm&&run)confirm.onchange=()=>{run.disabled=!confirm.checked;};if(run)run.onclick=runImport;
 }
 async function validateSelected(){
  const input=$('#ic30Files'),files=[...(input?.files||[])].sort((a,b)=>a.name.localeCompare(b.name));const b=$('#ic30Validate');if(b)b.disabled=true;
  $('#ic30Status').textContent='Membaca dan memvalidasi paket secara lokal…';
  try{const s=await stageFiles(files);renderReview(s);$('#ic30Status').textContent=s.issues.length?`${fmt(s.issues.length)} issue harus diperbaiki sebelum impor.`:`${fmt(s.batches)} batch siap ditinjau. D1 belum berubah.`;}catch(e){staged=[];$('#ic30Status').textContent='Validasi gagal: '+e.message;}finally{if(b)b.disabled=false;}
 }
 async function runImport(){
  if(!staged.length)return toast('Tidak ada batch valid untuk diimpor.');
  const run=$('#ic30Run'),reset=$('#ic30Reset'),validate=$('#ic30Validate');[run,reset,validate].forEach(b=>{if(b)b.disabled=true;});
  const progress=$('#ic30Progress'),status=$('#ic30Status'),result=$('#ic30Result');progress.max=staged.length;progress.value=0;result.innerHTML='';
  const tableResult={},errors=[];let inserted=0,submitted=0;
  for(let i=0;i<staged.length;i++){
   const x=staged[i];status.textContent=`Mengimpor ${x.file} · batch ${i+1}/${staged.length} · ${labels[x.table]||x.table}`;
   try{const r=await api('/import-data','POST',x.obj),n=Number(r.inserted||0);inserted+=n;submitted+=x.rows;tableResult[x.table]??={submitted:0,inserted:0};tableResult[x.table].submitted+=x.rows;tableResult[x.table].inserted+=n;progress.value=i+1;}
   catch(e){errors.push({item:x,message:e.message});break;}
  }
  const skipped=Math.max(0,submitted-inserted);if(!errors.length){try{catalog=await api('/catalog');}catch{}}
  result.innerHTML=`<div class="ic30-result ${errors.length?'failed':'success'}"><div><span>Row dikirim</span><strong>${fmt(submitted)}</strong></div><div><span>Row baru</span><strong>${fmt(inserted)}</strong></div><div><span>Sudah ada / dilewati</span><strong>${fmt(skipped)}</strong></div><div><span>Status</span><strong>${errors.length?'Dihentikan':'Selesai'}</strong></div></div><div class="tablewrap"><table><thead><tr><th>Jenis data</th><th>Dikirim</th><th>Baru</th><th>Dilewati</th></tr></thead><tbody>${Object.entries(tableResult).map(([k,v])=>`<tr><td>${esc(labels[k]||k)}</td><td>${fmt(v.submitted)}</td><td>${fmt(v.inserted)}</td><td>${fmt(Math.max(0,v.submitted-v.inserted))}</td></tr>`).join('')}</tbody></table></div>${errors.length?`<div class="errorbox">Impor dihentikan pada ${esc(errors[0].item.file)} baris ${errors[0].item.line}: ${esc(errors[0].message)}. Batch sebelumnya mungkin sudah tersimpan; paket aman divalidasi ulang sebelum melanjutkan.</div>`:'<div class="ic30-success-note">Impor selesai. ID yang sudah ada dilewati oleh backend, data existing tidak dihapus atau ditimpa.</div>'}<div class="ic30-result-actions"><button id="ic30Sources">Buka Pusat Data & Dokumen</button><button id="ic30Again">Impor paket lain</button></div>`;
  status.textContent=errors.length?'Impor dihentikan karena error backend.':'Impor selesai dan katalog sudah dimuat ulang.';
  $('#ic30Sources').onclick=()=>navigate('documents');$('#ic30Again').onclick=()=>navigate('import');
  if(errors.length){run.disabled=false;reset.disabled=false;validate.disabled=false;}
 }
 importCenter=function(){
  if(user?.role!=='superadmin')throw Error('Khusus Superadmin');staged=[];
  $('#content').innerHTML=heading('Pusat Impor Data','Validasi paket sumber terlebih dahulu sebelum menambahkan data ke D1')+`<div class="ic30-flow"><div class="active"><span>1</span><strong>Pilih paket</strong><small>JSONL hasil audit</small></div><div><span>2</span><strong>Validasi</strong><small>struktur & ukuran batch</small></div><div><span>3</span><strong>Tinjau</strong><small>komposisi & issue</small></div><div><span>4</span><strong>Impor</strong><small>INSERT OR IGNORE</small></div></div><section class="panel ic30-upload"><div><h2>Paket sumber terkontrol</h2><p>Pilih seluruh file <b>.jsonl</b> dari paket data yang sudah diaudit. Validasi pada tahap ini hanya membaca file di browser dan <b>belum mengubah D1</b>.</p><ul><li>Jenis tabel harus termasuk whitelist aplikasi.</li><li>Maksimal 20 row per batch dan 450 KB per request.</li><li>ID yang sudah ada akan dilewati; data existing tidak dihapus oleh endpoint impor.</li></ul></div><label class="ic30-file"><span>Pilih file JSONL</span><input type="file" id="ic30Files" multiple accept=".jsonl,application/json"><small>File tetap berada di perangkat sampai Anda menjalankan impor.</small></label><button id="ic30Validate" class="primary">Validasi Paket</button><div id="ic30Status" class="muted" role="status">Menunggu paket.</div><progress id="ic30Progress" max="1" value="0"></progress></section><section class="panel" id="ic30Review"><div class="ic30-empty">Pilih paket JSONL lalu tekan Validasi Paket. Tidak ada perubahan D1 sebelum tahap eksekusi.</div></section><section id="ic30Result"></section>`;
  $('#ic30Validate').onclick=validateSelected;
 };
})();
