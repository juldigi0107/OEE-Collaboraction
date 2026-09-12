// Prevent post-login initialization errors from masquerading as authentication failures.
window.start=async function(){
  app.innerHTML=`<div class="splash premium-splash"><div class="splash-card"><img class="splash-logo" src="assets/logo-bmj.png" alt="BMJ"><div class="splash-title"><strong>${APP_SHORT}</strong><span>BMJ PACKAGING OFFSET</span><small>${APP_TAG}</small></div><img class="factory-illustration" src="assets/splash-factory.png" alt="Ilustrasi digital factory"><h2>Menyiapkan workspace Anda</h2><div class="progress"><i></i></div><div class="splash-steps"><span>${icon('database')}Menghubungkan layanan</span><span>${icon('config')}Memuat konfigurasi</span><span>${icon('check')}Menyiapkan data master</span><span>${icon('dashboard')}Menyusun workspace</span></div></div></div>`;

  try{
    user=await api('/me');
  }catch(e){
    login();
    toast(e.message);
    return;
  }

  if(user.must_change_password){
    await forcePasswordChange();
    return;
  }

  try{
    const rr=await fetch(base.replace(/\/$/,'')+'/api/readiness',{cache:'no-store'});
    const readiness=await rr.json();
    if(!readiness.ready){
      const missing=(readiness.missing_tables||[]).map(x=>`<code>${esc(x)}</code>`).join(' ');
      app.innerHTML=`<div class="first-password"><section class="password-visual"><img src="assets/splash-factory.png" alt=""><div><img class="pw-logo" src="assets/logo-bmj.png" alt="BMJ"><h1>Login berhasil</h1><p>Akun Anda sudah terautentikasi. Workspace belum dapat dibuka karena struktur database D1 belum lengkap.</p></div></section><section class="password-panel"><div class="login-card"><div class="eyebrow">DATABASE INITIALIZATION</div><h2>Database belum siap</h2><p class="muted">Selesaikan schema D1, lalu tekan Coba lagi. Sesi login Anda tetap dipertahankan.</p><div class="notice"><strong>Status:</strong> ${esc(readiness.schema||'partial')}</div>${missing?`<div class="sheetinfo" style="margin-top:14px"><strong>Tabel yang masih kurang:</strong><br>${missing}</div>`:''}<button class="primary" id="retryWorkspace" style="margin-top:20px">Coba lagi</button><button id="logoutInit" style="margin-top:10px">Keluar</button></div></section></div>`;
      $('#retryWorkspace').onclick=()=>start();
      $('#logoutInit').onclick=async()=>{try{await api('/logout','POST',{});}catch{}token='';user=null;sessionStorage.removeItem('oee-token');login();};
      return;
    }
  }catch(e){
    app.innerHTML=`<div class="first-password"><section class="password-panel"><div class="login-card"><div class="eyebrow">WORKSPACE ERROR</div><h2>Login berhasil, tetapi status database tidak dapat diperiksa</h2><div class="errorbox">${esc(e.message)}</div><button class="primary" id="retryWorkspace">Coba lagi</button></div></section></div>`;
    $('#retryWorkspace').onclick=()=>start();
    return;
  }

  try{
    catalog=await api('/catalog');
    shell();
    await render();
  }catch(e){
    app.innerHTML=`<div class="first-password"><section class="password-panel"><div class="login-card"><div class="eyebrow">WORKSPACE ERROR</div><h2>Login berhasil, tetapi data workspace gagal dimuat</h2><div class="errorbox">${esc(e.message)}</div><p class="muted">Sesi login tidak dihapus. Periksa schema/data D1 lalu coba lagi.</p><button class="primary" id="retryWorkspace">Coba lagi</button></div></section></div>`;
    $('#retryWorkspace').onclick=()=>start();
  }
};
