/* BMJ OEE Release Polish v23 — production-safe source archive and media UX */
(()=>{
 const imageKinds=new Set(['png','jpg','jpeg','webp','gif']);
 const normalizeKind=s=>String(s?.kind||s?.name?.split('.').pop()||'').toLowerCase().replace(/^image\//,'');

 /* Prevent empty department archives from dereferencing a missing sheet. */
 const baseDepartmentHome=departmentHome;
 departmentHome=async function(dept){
  const sheets=(catalog?.sheets||[]).filter(s=>s.department===dept);
  if(departmentMode==='archive'&&!sheets.length){
   $('#content').innerHTML=heading(departments[dept]||dept,'Arsip sumber belum memiliki sheet yang dapat ditampilkan')+
    `<section class="panel rp23-empty"><div class="rp23-empty-icon">${icon('documents')}</div><h2>Belum ada sheet sumber</h2><p>Department ini tetap dapat menggunakan transaksi operasional. Arsip sheet akan muncul setelah paket sumber yang sesuai tersedia di katalog.</p><div class="formactions"><button id="rp23BackWork" class="primary">Kembali ke ruang kerja</button><button id="rp23Sources">Buka Pusat Data & Dokumen</button></div></section>`;
   $('#rp23BackWork').onclick=()=>{departmentMode='records';page=0;render();};
   $('#rp23Sources').onclick=()=>navigate('documents');
   return;
  }
  return baseDepartmentHome(dept);
 };

 /* Enhance the existing secure file dialog: jpg/webp/gif are first-class previews too. */
 const baseOpenFile=openFile;
 openFile=async function(s){
  await baseOpenFile(s);
  const kind=normalizeKind(s);
  if(!imageKinds.has(kind)||!modal?.open)return;
  const body=modal.querySelector('.dialogbody');if(!body)return;
  const link=body.querySelector('a[href^="blob:"]');if(!link||body.querySelector('.rp23-primary-image'))return;
  [...body.querySelectorAll('p')].forEach(p=>{if(/Buka workbook asli/i.test(p.textContent||''))p.remove();});
  const figure=document.createElement('figure');figure.className='rp23-primary-image';
  const img=document.createElement('img');img.src=link.href;img.alt=s.name||'Pratinjau gambar sumber';
  const cap=document.createElement('figcaption');cap.textContent='Pratinjau file sumber · '+(s.name||'gambar');
  figure.append(img,cap);link.insertAdjacentElement('afterend',figure);
 };

 /* Replace the legacy free-form JSON field for new rows and remove native browser confirmation for archive deletion. */
 const baseRowDetail=rowDetail;
 rowDetail=function(row,dept){
  if(!row)return openNativeSourceRow(dept);
  const out=baseRowDetail(row,dept);
  const del=$('#deleteRow');if(del)del.onclick=()=>archiveRowDialog(row,dept);
  return out;
 };
 function archiveRowDialog(row,dept){
  const sheet=(catalog?.sheets||[]).find(s=>s.id===activeSheet),source=(catalog?.sources||[]).find(s=>s.id===sheet?.source_id);
  dialog('Arsipkan baris sumber',`<div class="rp23-source-context"><strong>Baris ${esc(row.row_num)}</strong><span>${esc(sheet?.name||'Sheet sumber')} · ${esc(source?.name||departments[dept]||dept)}</span></div><div class="notice">Baris akan dihapus dari tampilan aktif melalui soft delete. File sumber asli tetap dipertahankan dan aktivitas ini tercatat pada audit trail.</div><div class="formactions"><button type="button" id="rp23DeleteCancel">Batal</button><button type="button" id="rp23DeleteConfirm" class="danger">Arsipkan baris</button></div>`);
  $('#rp23DeleteCancel').onclick=()=>rowDetail(row,dept);
  $('#rp23DeleteConfirm').onclick=async()=>{const btn=$('#rp23DeleteConfirm');btn.disabled=true;try{await api('/records/'+encodeURIComponent(row.id),'DELETE',{version:row.version});modal.close();toast('Baris diarsipkan. File sumber asli dan jejak audit tetap tersedia.');await render();}catch(err){btn.disabled=false;toast(err.message);}};
 }
 function openNativeSourceRow(dept){
  if(!can(dept,'create'))return toast('Akun ini tidak memiliki izin menambah baris sumber.');
  const sheet=(catalog?.sheets||[]).find(s=>s.id===activeSheet);
  if(!sheet)return toast('Pilih sheet sumber sebelum menambah baris.');
  dialog('Tambah baris sumber',`<div class="rp23-source-context"><strong>${esc(sheet.name)}</strong><span>${esc(departments[dept]||dept)} · arsip sumber</span></div><p class="notice">Gunakan editor ini hanya untuk koreksi atau penambahan arsip yang telah disetujui pemilik data. File asli tetap dipertahankan, formula Excel tidak dihitung ulang di browser, dan aktivitas pengguna tercatat pada audit trail.</p><form id="rp23RowForm"><div id="rp23Fields" class="rp23-fields"></div><div class="rp23-row-actions"><button type="button" id="rp23AddField">+ Tambah kolom</button></div><div class="formactions"><button type="button" id="rp23Cancel">Batal</button><button class="primary">Simpan baris</button></div></form>`);
  const host=$('#rp23Fields');
  const adaptValue=(line,type)=>{
   const label=line.querySelector('.rp23-value-label'),old=line.querySelector('.rp23-value'),v=old?.value||'';let input;
   if(type==='boolean'){input=document.createElement('select');input.innerHTML='<option value="true">Ya</option><option value="false">Tidak</option>';input.value=v==='false'?'false':'true';}
   else{input=document.createElement('input');input.type=type==='number'?'number':type==='date'?'date':'text';if(type==='number')input.step='any';input.value=v;}
   input.className='rp23-value';input.setAttribute('aria-label','Nilai kolom');old?.replaceWith(input);label.append(input);
  };
  const add=(column='',value='',type='text')=>{
   const line=document.createElement('div');line.className='rp23-field';
   line.innerHTML=`<label>Kolom<input class="rp23-col" maxlength="3" placeholder="A" value="${esc(column)}" aria-label="Nama kolom"></label><label>Tipe<select class="rp23-type"><option value="text">Teks</option><option value="number">Angka</option><option value="date">Tanggal</option><option value="boolean">Ya / Tidak</option></select></label><label class="rp23-value-label">Nilai<input class="rp23-value" value="${esc(value)}" aria-label="Nilai kolom"></label><button type="button" class="rp23-remove" aria-label="Hapus kolom">×</button>`;
   line.querySelector('.rp23-type').value=type;
   line.querySelector('.rp23-col').oninput=e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
   line.querySelector('.rp23-type').onchange=e=>adaptValue(line,e.target.value);
   line.querySelector('.rp23-remove').onclick=()=>{if(host.children.length>1)line.remove();else toast('Minimal satu kolom diperlukan.');};
   host.append(line);adaptValue(line,type);
  };
  add('A','','text');
  $('#rp23AddField').onclick=()=>add();
  $('#rp23Cancel').onclick=()=>modal.close();
  $('#rp23RowForm').onsubmit=async e=>{
   e.preventDefault();const payload={},seen=new Set();
   try{
    for(const line of host.querySelectorAll('.rp23-field')){
     const column=line.querySelector('.rp23-col').value.trim().toUpperCase(),type=line.querySelector('.rp23-type').value,raw=line.querySelector('.rp23-value').value;
     if(!/^[A-Z]{1,3}$/.test(column))throw Error('Nama kolom wajib A–ZZZ.');
     if(seen.has(column))throw Error(`Kolom ${column} digunakan lebih dari sekali.`);seen.add(column);
     let value=raw,t='str';if(type==='number'){if(raw==='')value=null;else{value=Number(raw);if(!Number.isFinite(value))throw Error(`Nilai ${column} harus berupa angka.`);}t='n';}else if(type==='boolean'){value=raw==='true';t='b';}else if(type==='date'){value=raw;t='str';}
     payload[column]={v:value,t};
    }
    if(!Object.keys(payload).length)throw Error('Minimal satu kolom wajib diisi.');
    await api('/records','POST',{payload,sheet_id:activeSheet});modal.close();toast('Baris arsip disimpan. Aktivitas tercatat pada audit trail.');await render();
   }catch(err){toast(err.message);}
  };
 }
})();
