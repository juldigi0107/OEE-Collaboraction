/* BMJ OEE Settings Polish v27 — business-facing typed parameter editor. */
(()=>{
 const baseSettingsV27=window.settings;
 const reserved=[
  ['DISPLAY_LAYOUT.','Layout Display Mesin','settings'],
  ['DATA_GOVERNANCE.','Definisi Data & KPI','data-governance'],
  ['UAT_RELEASE.','UAT & Go-Live','uat-release'],
  ['RELEASE_READINESS.','Tata Kelola & Readiness','governance']
 ];
 const roleName=()=>user?.role==='superadmin'?'Superadmin':user?.role==='admin'?'Admin Department':'Viewer';
 const parse=(kind,raw)=>{if(kind==='number'){const n=Number(raw);if(raw===''||!Number.isFinite(n))throw Error('Nilai angka belum valid.');return n;}if(kind==='boolean')return raw==='true';if(kind==='json'){try{return JSON.parse(raw||'{}')}catch{throw Error('JSON lanjutan belum valid.')}}return String(raw??'');};
 function dedicated(key){return reserved.find(([prefix])=>String(key||'').startsWith(prefix));}
 function renderValue(host,kind,value=''){
  host.textContent='';let control;
  if(kind==='boolean'){control=document.createElement('select');control.innerHTML='<option value="true">Ya / Aktif</option><option value="false">Tidak / Nonaktif</option>';control.value=String(value)==='false'?'false':'true';}
  else if(kind==='json'){control=document.createElement('textarea');control.rows=8;control.value=typeof value==='string'?value:JSON.stringify(value||{},null,2);control.placeholder='{"parameter":"nilai"}';}
  else{control=document.createElement('input');control.type=kind==='number'?'number':'text';if(kind==='number')control.step='any';control.value=value??'';control.placeholder=kind==='number'?'Masukkan angka':'Masukkan nilai parameter';}
  control.name='typed_value';control.required=true;control.setAttribute('aria-label','Nilai parameter');host.append(control);
 }
 function shortcuts(panel){
  if(user?.role!=='superadmin'||panel.querySelector('.v27-shortcuts'))return;
  const box=document.createElement('div');box.className='v27-shortcuts';box.innerHTML='<div><strong>Editor khusus</strong><span>Gunakan halaman khusus untuk konfigurasi terstruktur agar validasi bisnis tetap aktif.</span></div><div class="v27-shortcut-actions"><button type="button" data-v27-view="data-governance">Definisi Data & KPI</button><button type="button" data-v27-view="uat-release">UAT & Go-Live</button><button type="button" data-v27-view="governance">Tata Kelola & Readiness</button></div>';panel.prepend(box);box.querySelectorAll('[data-v27-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.v27View));
 }
 function labelExisting(panel){
  panel.querySelectorAll('details').forEach(d=>{
   if(d.dataset.v27)return;
   d.dataset.v27='1';
   const summary=d.querySelector('summary'),pre=d.querySelector('pre');if(!summary)return;
   const raw=summary.textContent||'',parts=raw.split('·').map(x=>x.trim()),key=parts[0]||'Parameter',dept=parts[1]||user?.department||'';
   summary.textContent='';
   const name=document.createElement('strong');name.textContent=key;
   const meta=document.createElement('span');meta.textContent=(departments[dept]||dept)+' · nilai tersimpan';
   summary.append(name,meta);
   if(pre){pre.classList.add('v27-stored-value');pre.setAttribute('aria-label','Nilai tersimpan untuk '+key);}
  });
 }
 function enhanceSettingsV27(){
  const system=document.querySelector('#de5System .panel'),form=document.querySelector('#de5Config');if(!system||!form||form.dataset.v27)return;
  form.dataset.v27='1';shortcuts(system);labelExisting(system);
  const own=user?.department||'',isSuper=user?.role==='superadmin';
  form.className='formgrid de5-config-form v27-settings-form';
  form.innerHTML=`<div class="full v27-form-head"><div><strong>Parameter Sistem</strong><span>${isSuper?'Kelola parameter lintas department dengan tipe data terkontrol.':'Kelola parameter untuk '+esc(departments[own]||own)+' sesuai izin akun.'}</span></div><span class="v27-role">${esc(roleName())}</span></div><label>Department${isSuper?`<select name="department">${Object.keys(departments).map(d=>`<option value="${d}">${esc(departments[d]||d)}</option>`).join('')}</select>`:`<input value="${esc(departments[own]||own)}" disabled><input type="hidden" name="department" value="${esc(own)}">`}</label><label>Kunci parameter<input name="key" required placeholder="Contoh: PROD.target_shift"></label><label>Tipe nilai<select name="kind"><option value="text">Teks</option><option value="number">Angka</option><option value="boolean">Ya / Tidak</option>${isSuper?'<option value="json">JSON lanjutan</option>':''}</select></label><label class="full">Nilai<div id="v27Value"></div></label><div class="full v27-form-note">Parameter Data Governance, UAT, Release Readiness, dan Layout Display dikelola melalui editor khusus. Perubahan tetap tercatat pada audit trail.</div><button class="primary full">Simpan parameter</button>`;
  const kind=form.elements.kind,valueHost=form.querySelector('#v27Value');renderValue(valueHost,kind.value,'');kind.onchange=()=>renderValue(valueHost,kind.value,'');
  form.onsubmit=async e=>{
   e.preventDefault();const fd=new FormData(form),key=String(fd.get('key')||'').trim(),match=dedicated(key);
   if(match){toast(`Gunakan ${match[1]} untuk parameter ini.`);if(match[2]!=='settings')navigate(match[2]);return;}
   if(!key||!/^[A-Za-z0-9_.:-]{2,120}$/.test(key)){toast('Kunci parameter hanya boleh berisi huruf, angka, titik, garis bawah, titik dua, atau tanda minus.');return;}
   try{const body={department:String(fd.get('department')||own),key,value:parse(fd.get('kind'),fd.get('typed_value'))};await api('/settings','PUT',body);catalog=await api('/catalog');settings();toast('Parameter sistem disimpan.');}catch(err){toast(err.message);}
  };
  const roleNote=document.createElement('div');roleNote.className='v27-scope-note';roleNote.innerHTML=`<strong>${esc(roleName())}</strong><span>${isSuper?'Akses konfigurasi global. Gunakan editor khusus untuk baseline dan release-control.':'Scope konfigurasi dikunci ke department '+esc(departments[own]||own)+'. Backend tetap menjadi authority permission.'}</span>`;system.insertBefore(roleNote,form);
 }
 window.settings=function(){baseSettingsV27();queueMicrotask(enhanceSettingsV27);};
})();
