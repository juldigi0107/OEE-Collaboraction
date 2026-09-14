/* BMJ OEE Access Governance v28 — business-facing account and permission presentation. */
(()=>{
 const roleLabel={superadmin:'Superadmin',admin:'Admin Department',user:'Viewer'};
 const permissionLabel={create:'Tambah data',update:'Ubah data',delete:'Hapus data',config:'Konfigurasi'};
 const accessSummary=u=>{
  if(u.role==='superadmin')return ['Akses penuh'];
  if(u.role==='user')return ['View only'];
  const p=Array.isArray(u.permissions)?u.permissions:[];
  return p.length?p.map(x=>permissionLabel[x]||x):['Tanpa izin perubahan'];
 };
 users=async function(){
  if(user?.role!=='superadmin')return navigate('dashboard');
  const data=await api('/users'),active=data.filter(x=>x.active).length,admins=data.filter(x=>x.role==='admin'&&x.active).length,viewers=data.filter(x=>x.role==='user'&&x.active).length;
  $('#content').innerHTML=heading('Akun & Izin','Kelola identitas, scope department, dan kewenangan perubahan data','<button id="newUser" class="primary">Tambah akun</button>')+
   `<div class="release-kpis ag28-kpis"><div><span>Total akun</span><strong>${fmt(data.length)}</strong><small>seluruh status</small></div><div><span>Akun aktif</span><strong>${fmt(active)}</strong><small>dapat digunakan untuk login</small></div><div><span>Admin Department</span><strong>${fmt(admins)}</strong><small>aktif dengan scope department</small></div><div><span>Viewer</span><strong>${fmt(viewers)}</strong><small>aktif · view-only</small></div></div>`+
   `<section class="panel ag28-panel"><div class="release-section-head"><div><h2>Daftar akses pengguna</h2><p>Hak tulis selalu divalidasi kembali oleh backend. Viewer tidak memperoleh CRUD meskipun konfigurasi lama memiliki permission.</p></div></div><div class="ag28-filters"><input id="ag28Search" placeholder="Cari nama, username, atau department…" aria-label="Cari akun"><select id="ag28Role" aria-label="Filter role"><option value="">Semua role</option><option value="superadmin">Superadmin</option><option value="admin">Admin Department</option><option value="user">Viewer</option></select><select id="ag28Status" aria-label="Filter status"><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div><div class="tablewrap"><table class="release-table ag28-table"><thead><tr><th>Pengguna</th><th>Peran</th><th>Scope department</th><th>Kewenangan</th><th>Status</th><th></th></tr></thead><tbody id="ag28Rows"></tbody></table></div><div id="ag28Empty" class="release-empty" hidden>Tidak ada akun yang sesuai filter.</div></section>`;
  const search=$('#ag28Search'),role=$('#ag28Role'),status=$('#ag28Status'),tbody=$('#ag28Rows'),empty=$('#ag28Empty');
  const draw=()=>{
   const q=String(search.value||'').trim().toLowerCase(),rv=role.value,sv=status.value;
   const rows=data.map((u,i)=>({u,i})).filter(({u})=>{
    const text=`${u.name||''} ${u.username||''} ${u.department||''} ${departments[u.department]||''}`.toLowerCase();
    if(q&&!text.includes(q))return false;if(rv&&u.role!==rv)return false;if(sv==='active'&&!u.active)return false;if(sv==='inactive'&&u.active)return false;return true;
   });
   tbody.innerHTML=rows.map(({u,i})=>`<tr class="${u.active?'':'ag28-inactive'}"><td><strong>${esc(u.name||'Tanpa nama')}</strong><small>@${esc(u.username||'—')}</small></td><td><span class="ag28-role role-${esc(u.role||'user')}">${esc(roleLabel[u.role]||u.role||'Viewer')}</span></td><td><strong>${esc(departments[u.department]||u.department||'—')}</strong><small>${u.role==='superadmin'?'Lintas department':'Scope '+esc(u.department||'—')}</small></td><td><div class="ag28-perms">${accessSummary(u).map(x=>`<span>${esc(x)}</span>`).join('')}</div></td><td><span class="ag28-status ${u.active?'active':'inactive'}">${u.active?'Aktif':'Nonaktif'}</span></td><td><button data-ag28-user="${i}">Atur akses</button></td></tr>`).join('');
   empty.hidden=rows.length>0;
   document.querySelectorAll('[data-ag28-user]').forEach(b=>b.onclick=()=>userForm(data[Number(b.dataset.ag28User)]));
  };
  [search,role,status].forEach(el=>el.addEventListener(el===search?'input':'change',draw));
  $('#newUser').onclick=()=>userForm();draw();
 };

 userForm=function(account={}){
  if(user?.role!=='superadmin')return toast('Pengaturan akun hanya tersedia untuk Superadmin.');
  const existing=!!account.id,active=account.active!==0&&account.active!==false,perms=Array.isArray(account.permissions)?account.permissions:[];
  dialog(existing?'Atur akses pengguna':'Tambah akun',`<form id="ag28AccountForm" class="ag28-account-form"><div class="formgrid"><label>Nama lengkap<input name="name" value="${esc(account.name||'')}" required autocomplete="name"></label><label>Username<input name="username" value="${esc(account.username||'')}" required autocomplete="username"></label><label>Peran<select name="role"><option value="user" ${account.role==='user'||!account.role?'selected':''}>Viewer</option><option value="admin" ${account.role==='admin'?'selected':''}>Admin Department</option><option value="superadmin" ${account.role==='superadmin'?'selected':''}>Superadmin</option></select></label><label>Scope department<select name="department">${Object.entries(departments).map(([code,name])=>`<option value="${code}" ${account.department===code?'selected':''}>${esc(name)} (${code})</option>`).join('')}</select></label><label class="full">${existing?'Password baru · kosongkan jika tidak berubah':'Password awal · minimal 12 karakter'}<input name="password" type="password" minlength="12" ${existing?'':'required'} autocomplete="new-password"></label></div><div id="ag28PermissionBox" class="ag28-permission-box"><strong>Kewenangan Admin Department</strong><p>Hak berlaku hanya pada department yang dipilih dan tetap diverifikasi backend.</p><div class="checkrow">${Object.entries(permissionLabel).map(([code,label])=>`<label><input type="checkbox" name="permissions" value="${code}" ${perms.includes(code)?'checked':''}>${esc(label)}</label>`).join('')}</div></div><div id="ag28ScopeNote" class="ag28-account-note"></div><label class="ag28-active"><input name="active" type="checkbox" ${active?'checked':''}> Akun aktif dan dapat digunakan untuk login</label><div class="ag28-security-note">Perubahan akun mengakhiri seluruh sesi akun tersebut. Sistem juga mencegah Superadmin aktif terakhir dinonaktifkan atau diturunkan perannya.</div><div class="formactions"><button type="button" id="ag28Cancel">Batal</button><button class="primary">Simpan akun</button></div></form>`);
  const form=$('#ag28AccountForm'),role=form.elements.role,dept=form.elements.department,box=$('#ag28PermissionBox'),note=$('#ag28ScopeNote');
  const sync=()=>{const r=role.value,isAdmin=r==='admin';box.hidden=!isAdmin;box.querySelectorAll('input').forEach(x=>{x.disabled=!isAdmin;if(!isAdmin)x.checked=false;});if(r==='superadmin')note.textContent='Superadmin memiliki akses penuh lintas department. Department disimpan sebagai referensi profil dan tidak membatasi kewenangan.';else if(r==='admin')note.textContent='Admin Department hanya dapat melakukan aksi yang dicentang pada department scope.';else note.textContent='Viewer hanya dapat melihat data dan tidak memperoleh izin perubahan, walaupun ada permission lama pada record akun.';};
  role.onchange=sync;sync();$('#ag28Cancel').onclick=()=>modal.close();
  form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),roleValue=String(fd.get('role')||'user'),body={id:account.id,name:String(fd.get('name')||'').trim(),username:String(fd.get('username')||'').trim(),role:roleValue,department:String(fd.get('department')||'PROJECT'),permissions:roleValue==='admin'?fd.getAll('permissions'):[],active:fd.has('active')},password=String(fd.get('password')||'');if(password)body.password=password;try{await api('/users','POST',body);modal.close();toast(existing?'Akun dan kewenangan diperbarui. Sesi lama akun tersebut telah diakhiri.':'Akun dibuat. Pengguna wajib mengganti password awal saat login pertama.');if(account.id===user.id){token='';sessionStorage.removeItem('oee-token');login();}else await render();}catch(err){toast(err.message);}};
 };
})();
