// Hotfix: backend intentionally revokes the old session after a password change.
// Re-authenticate immediately with the newly saved password so the user is not
// dropped into a confusing manual-login loop.
window.forcePasswordChange=async function(){
  app.innerHTML=`<div class="first-password"><section class="password-visual"><img src="assets/splash-factory.png" alt=""><div><img class="pw-logo" src="assets/logo-bmj.png" alt="BMJ"><h1>Amankan akun superadmin</h1><p>Password awal hanya untuk aktivasi pertama. Buat password baru sebelum menggunakan platform.</p></div></section>
  <section class="password-panel"><form id="forcePasswordForm" class="login-card"><div class="eyebrow">LANGKAH WAJIB</div><h2>Ganti password pertama</h2><p class="muted">Minimal 12 karakter. Setelah disimpan, aplikasi akan masuk kembali secara otomatis.</p>
  <label>Password saat ini<input name="current" type="password" autocomplete="current-password" required></label>
  <label>Password baru<input name="password" type="password" minlength="12" autocomplete="new-password" required></label>
  <label>Konfirmasi password baru<input name="confirm" type="password" minlength="12" autocomplete="new-password" required></label>
  <div id="pwError"></div><button class="primary">Simpan password baru</button></form></section></div>`;

  $('#forcePasswordForm').onsubmit=async e=>{
    e.preventDefault();
    const b=Object.fromEntries(new FormData(e.target));
    if(b.password!==b.confirm){
      $('#pwError').innerHTML='<div class="errorbox">Konfirmasi password tidak sama.</div>';
      return;
    }
    delete b.confirm;
    const username=user?.username||'superadmin';
    try{
      await api('/password','PUT',b);
      token='';
      sessionStorage.removeItem('oee-token');
      const r=await api('/login','POST',{username,password:b.password});
      token=r.token;
      user=r.user;
      sessionStorage.setItem('oee-token',token);
      catalog=await api('/catalog');
      shell();
      await render();
      toast('Password berhasil diganti. Anda sudah masuk dengan password baru.');
    }catch(err){
      $('#pwError').innerHTML=`<div class="errorbox">${esc(err.message)}</div>`;
    }
  };
};
