/* Preserve configuration CRUD and password controls after display-editor-v5 override. */
(()=>{
const baseSettings=window.settings;
window.settings=function(){
  baseSettings();
  const system=$('#de5System .panel'),security=$('#de5Security');
  if(system&&!$('#de5Config')){
    system.insertAdjacentHTML('beforeend',`<form id="de5Config" class="formgrid de5-config-form"><label>Department<select name="department">${Object.keys(departments).map(d=>`<option>${d}</option>`).join('')}</select></label><label>Kunci konfigurasi<input name="key" required placeholder="PROD.target"></label><label class="full">Nilai JSON<textarea name="value" required>{}</textarea></label><button class="primary full">Simpan konfigurasi</button></form>`);
    $('#de5Config').onsubmit=async e=>{e.preventDefault();try{const b=Object.fromEntries(new FormData(e.target));b.value=JSON.parse(b.value);await api('/settings','PUT',b);catalog=await api('/catalog');settings();toast('Konfigurasi disimpan');}catch(err){toast(err.message)}};
  }
  if(security){
    security.innerHTML=`<section class="panel" style="max-width:620px"><h2>Keamanan Akun</h2><p class="muted">Mengganti password akan mengakhiri sesi akun aktif.</p><form id="de5Password" class="formgrid"><label class="full">Password saat ini<input type="password" name="current" required autocomplete="current-password"></label><label class="full">Password baru<input type="password" name="password" minlength="12" required autocomplete="new-password"></label><button class="primary full">Ganti password</button></form></section>`;
    $('#de5Password').onsubmit=async e=>{e.preventDefault();try{await api('/password','PUT',Object.fromEntries(new FormData(e.target)));token='';sessionStorage.removeItem('oee-token');login();toast('Password diganti. Silakan login kembali.')}catch(err){toast(err.message)}};
  }
};
})();
