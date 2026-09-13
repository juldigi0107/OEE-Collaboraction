/* BMJ OEE workflow v13 — PPIC release state and business-facing account governance. */
(()=>{
  const entryFormBase=entryForm;
  entryForm=function(row){
    entryFormBase(row);
    if(opModule!=='planning')return;
    const select=document.querySelector('#entryForm select[name="status"]');if(!select)return;
    if(![...select.options].some(o=>o.value==='Released')){
      const option=document.createElement('option');option.value='Released';option.textContent='Released / Siap Produksi';
      const before=[...select.options].find(o=>o.value==='Dimulai');if(before)select.insertBefore(option,before);else select.append(option);
    }
    for(const o of select.options){if(o.value==='Direncanakan')o.textContent='Direncanakan / Belum dirilis';if(o.value==='Dimulai')o.textContent='Dimulai di HMI';if(o.value==='Terverifikasi')o.textContent='Terverifikasi';}
    let payload={};try{payload=row?JSON.parse(row.payload):{};}catch{}
    if(payload.status==='Released')select.value='Released';
    const form=document.querySelector('#entryForm');if(form&&!form.querySelector('.planning-release-note')){
      const note=document.createElement('div');note.className='planning-release-note';note.textContent='Hanya planning berstatus Released yang tersedia pada HMI Production. Periksa PRO, mesin, material dan target sebelum release.';
      const actions=form.querySelector('.formactions');if(actions)actions.insertAdjacentElement('beforebegin',note);
    }
  };

  const usersBase=users;
  users=async function(){
    await usersBase();
    const table=document.querySelector('#content table');if(!table)return;
    const roleMap={superadmin:'Superadmin',admin:'Admin Department',user:'Viewer'};
    const permMap={create:'Tambah',update:'Ubah',delete:'Hapus',config:'Konfigurasi'};
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const role=tr.children[1],dept=tr.children[2],perm=tr.children[3],status=tr.children[4];
      if(role)role.textContent=roleMap[role.textContent.trim()]||role.textContent;
      if(dept)dept.textContent=departments[dept.textContent.trim()]||dept.textContent;
      if(perm){const items=perm.textContent.split(',').map(x=>x.trim()).filter(Boolean);perm.textContent=items.length?items.map(x=>permMap[x]||x).join(' · '):'View only';}
      if(status){const active=status.textContent.trim()==='Aktif';status.innerHTML=`<span class="release-status ${active?'ok':'neutral'}">${active?'Aktif':'Nonaktif'}</span>`;}
    });
    const h=document.querySelector('#content .heading h1');if(h)h.textContent='Akun & Izin Akses';
    const d=document.querySelector('#content .heading .muted');if(d)d.textContent='Kelola role, department, status akun, dan kewenangan perubahan data';
  };
})();
