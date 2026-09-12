function login(){
 app.innerHTML=`<div class="login premium-login">
   <section class="login-visual">
     <div class="login-shade"></div>
     <div class="login-brand"><img src="assets/logo-bmj.png" alt="BMJ"><div><strong>${APP_SHORT}</strong><span>BMJ PACKAGING OFFSET</span><small>${APP_TAG}</small></div></div>
     <div class="login-copy"><span class="eyebrow light">INTELLIGENT MANUFACTURING PLATFORM</span><h1>Kolaborasi data.<br>Kinerja yang lebih pasti.</h1><p>Menyatukan produksi, kualitas, maintenance, planning, dan development dalam satu platform operasional.</p>
       <div class="value-strip"><div>${icon('database')}<span>Integrated Data</span></div><div>${icon('trend')}<span>Performance Insight</span></div><div>${icon('shield')}<span>Controlled Access</span></div></div>
     </div>
   </section>
   <section class="login-panel">
     <form id="loginForm" class="login-card">
       <div class="mobile-logo"><img src="assets/logo-bmj.png" alt="BMJ"></div>
       <div><div class="eyebrow">SELAMAT DATANG</div><h2>Masuk ke OEE Collaboraction</h2><p class="muted">Gunakan akun yang diberikan administrator.</p></div>
       <label>Username<div class="input-shell">${icon('users')}<input name="username" autocomplete="username" placeholder="Masukkan username" required></div></label>
       <label>Password<div class="input-shell">${icon('shield')}<input name="password" type="password" autocomplete="current-password" placeholder="Masukkan password" required><button type="button" class="show-pass" aria-label="Tampilkan password">Lihat</button></div></label>
       <div id="loginError"></div>
       <button class="primary login-button">Masuk</button>
       <div class="login-security">${icon('shield')}<span>Akses terbatas untuk pengguna terdaftar. Aktivitas penting dicatat pada audit trail.</span></div>
       <footer>${APP_NAME}<br><strong>${APP_TAG}</strong></footer>
     </form>
   </section>
 </div>`;
 const pass=$('input[name="password"]');$('.show-pass').onclick=e=>{pass.type=pass.type==='password'?'text':'password';e.currentTarget.textContent=pass.type==='password'?'Lihat':'Sembunyikan';};
 $('#loginForm').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));try{const r=await api('/login','POST',b);token=r.token;sessionStorage.setItem('oee-token',token);await start();}catch(err){$('#loginError').innerHTML=`<div class="errorbox">${esc(err.message)}</div>`;}};
}
async function forcePasswordChange(){
 app.innerHTML=`<div class="first-password"><section class="password-visual"><img src="assets/splash-factory.png" alt=""><div><img class="pw-logo" src="assets/logo-bmj.png" alt="BMJ"><h1>Amankan akun superadmin</h1><p>Password awal hanya untuk aktivasi pertama. Buat password baru sebelum menggunakan platform.</p></div></section>
 <section class="password-panel"><form id="forcePasswordForm" class="login-card"><div class="eyebrow">LANGKAH WAJIB</div><h2>Ganti password pertama</h2><p class="muted">Minimal 12 karakter. Setelah disimpan, Anda akan diminta login kembali.</p>
 <label>Password saat ini<input name="current" type="password" autocomplete="current-password" required></label>
 <label>Password baru<input name="password" type="password" minlength="12" autocomplete="new-password" required></label>
 <label>Konfirmasi password baru<input name="confirm" type="password" minlength="12" autocomplete="new-password" required></label>
 <div id="pwError"></div><button class="primary">Simpan password baru</button></form></section></div>`;
 $('#forcePasswordForm').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));if(b.password!==b.confirm){$('#pwError').innerHTML='<div class="errorbox">Konfirmasi password tidak sama.</div>';return;}delete b.confirm;try{await api('/password','PUT',b);token='';sessionStorage.removeItem('oee-token');login();toast('Password berhasil diganti. Silakan login menggunakan password baru.');}catch(err){$('#pwError').innerHTML=`<div class="errorbox">${esc(err.message)}</div>`;}};
}
async function start(){
 app.innerHTML=`<div class="splash premium-splash"><div class="splash-card"><img class="splash-logo" src="assets/logo-bmj.png" alt="BMJ"><div class="splash-title"><strong>${APP_SHORT}</strong><span>BMJ PACKAGING OFFSET</span><small>${APP_TAG}</small></div><img class="factory-illustration" src="assets/splash-factory.png" alt="Ilustrasi digital factory"><h2>Menyiapkan workspace Anda</h2><div class="progress"><i></i></div><div class="splash-steps"><span>${icon('database')}Menghubungkan layanan</span><span>${icon('config')}Memuat konfigurasi</span><span>${icon('check')}Menyiapkan data master</span><span>${icon('dashboard')}Menyusun workspace</span></div></div></div>`;
 try{user=await api('/me');if(user.must_change_password){await forcePasswordChange();return;}catalog=await api('/catalog');shell();await render();}catch(e){login();toast(e.message);}
}
function shell(){
 const nav=(id,label,ico)=>`<button class="nav ${view===id?'active':''}" data-view="${id}">${icon(ico)}<span>${label}</span></button>`;
 const superOnly=user.role==='superadmin';
 app.innerHTML=`<div class="shell"><aside class="sidebar">
   <div class="sidebar-brand"><img src="assets/logo-bmj.png" alt="BMJ"><div><strong>OEE COLLABORACTION</strong><span>BMJ PACKAGING OFFSET</span></div></div>
   <div class="navscroll">${nav('dashboard','Beranda','dashboard')}<div class="navgroup">OPERASIONAL</div>
   ${nav('dept:PROD','Produksi','production')}${nav('dept:QC','Quality Control','quality')}${nav('dept:MTC','Maintenance','maintenance')}${nav('dept:PPIC','Planning & Konfirmasi','planning')}${nav('dept:PDS','Development','development')}${nav('dept:PROJECT','Proyek & Master','project')}
   <div class="navgroup">INFORMASI</div>${nav('operations','Transaksi & Monitoring','transactions')}${nav('documents','Dokumen & Referensi','documents')}${nav('quality','Validasi Sumber','validation')}
   ${superOnly?`<div class="navgroup">SUPERADMIN</div>${nav('users','Akun & Hak Akses','users')}${nav('settings','Konfigurasi Sistem','config')}${nav('audit','Audit Aktivitas','audit')}`:''}</div>
   <div class="sidebar-foot"><span>${APP_TAG}</span><small>People · Process · Data</small></div>
 </aside><section class="workspace"><header class="topbar">
   <div class="top-left"><button class="mobilemenu" aria-label="Menu">${icon('menu')}</button><div class="product-title"><strong>${APP_SHORT}</strong><span>BMJ PACKAGING OFFSET · ${APP_TAG}</span></div></div>
   <div class="top-actions"><div class="system-badge"><i></i> D1 Connected</div><div class="user"><div class="avatar">${esc(user.name.slice(0,1).toUpperCase())}</div><div><strong>${esc(user.name)}</strong><small>${esc(user.role)} · ${esc(user.department)}</small></div><button id="logout" class="icon-button">${icon('logout')}<span>Keluar</span></button></div></div>
 </header><main class="content" id="content"></main></section></div><button class="toTop" aria-label="Kembali ke atas">↑</button>`;
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
 $('#logout').onclick=async()=>{try{await api('/logout','POST',{});}finally{token='';user=null;sessionStorage.removeItem('oee-token');login();}};
 $('.mobilemenu').onclick=()=>$('.sidebar').classList.toggle('open');$('.toTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
}
async function navigate(v){if(['users','settings','audit'].includes(v)&&user?.role!=='superadmin'){toast('Menu ini khusus superadmin.');v='dashboard';}view=v;page=0;query='';activeSheet='';shell();await render();}
const heading=(title,desc,action='')=>`<div class="heading"><div><div class="eyebrow">${APP_SHORT}</div><h1>${title}</h1><span class="muted">${desc}</span></div>${action}</div>`;
async function render(){const c=$('#content');if(['users','settings','audit'].includes(view)&&user?.role!=='superadmin'){view='dashboard';shell();return render();}c.innerHTML='<div class="panel loading-panel">Memuat data…</div>';try{if(view==='dashboard')await dashboard();else if(view.startsWith('dept:'))await department(view.split(':')[1]);else if(view==='documents')documents();else if(view==='quality')quality();else if(view==='operations')await operations();else if(view==='users')await users();else if(view==='settings')settings();else if(view==='audit')await audit();}catch(e){c.innerHTML=`<div class="errorbox">${esc(e.message)}</div><button id="retry">Coba lagi</button>`;$('#retry').onclick=render;}}
function chart(series){const colors=['#108c9b','#5789d7','#e3a552'];const w=760,h=250,px=40,py=20;let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trend OEE harian Agustus 2026">`;[0,.25,.5,.75,1].forEach(t=>{const y=h-30-t*(h-50);s+=`<line x1="40" x2="745" y1="${y}" y2="${y}" stroke="#e5edf1"/><text x="0" y="${y+4}">${t*100}%</text>`;});series.forEach((x,i)=>{const col=i===0?'K':'J',points=x.rows.filter(r=>r.row>=8&&r.row<=38&&typeof r.cells[col]?.v==='number'&&typeof r.cells.A?.v==='number'&&r.cells.A.v>=46235&&r.cells.A.v<=46265).map(r=>{const day=r.cells.A.v-46235;return `${px+day*(w-px-15)/30},${h-30-r.cells[col].v*(h-50)}`;});s+=`<polyline fill="none" stroke="${colors[i]}" stroke-width="2.5" points="${points.join(' ')}"/>`;});[1,5,10,15,20,25,31].forEach(d=>s+=`<text x="${px+(d-1)*(w-px-15)/30}" y="245">${d}</text>`);return s+'</svg>';}
async function dashboard(){
 const d=await api('/dashboard');const vals=d.series.map((s,i)=>s.rows.find(r=>r.row===2)?.cells[i===0?'K':'J']?.v);
 const printing=vals[0],ap=vals[1],fg=vals[2];
 $('#content').innerHTML=`<section class="home-hero"><div class="hero-overlay"></div><div class="hero-content"><span class="hero-kicker">BMJ PACKAGING OFFSET · INTELLIGENT PLATFORM</span><h1>Operational intelligence<br>through collaboration.</h1><p>Real data · Real collaboration · Real improvement</p><div class="hero-badges"><span>${icon('database')}Integrated data</span><span>${icon('trend')}Performance insight</span><span>${icon('shield')}Governed access</span></div></div><div class="hero-date">${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div></section>
 ${heading('Beranda','Ringkasan OEE dan kondisi sumber data aktual',`<span class="pill live-pill"><i></i> Live workspace</span>`)}
 <div class="cards premium-cards">
   <div class="card kpi-card"><div class="kpi-top">${icon('oee')}<span class="label">OEE Printing</span></div><div class="value">${pct(printing)}</div><div class="kpi-note">Source · OEE Printing (2) K2</div></div>
   <div class="card kpi-card"><div class="kpi-top">${icon('availability')}<span class="label">OEE AP</span></div><div class="value">${pct(ap)}</div><div class="kpi-note">Source · OEE AP J2</div></div>
   <div class="card kpi-card"><div class="kpi-top">${icon('performance')}<span class="label">OEE FG</span></div><div class="value">${pct(fg)}</div><div class="kpi-note">Source · OEE FG J2</div></div>
   <div class="card kpi-card source-card"><div class="kpi-top">${icon('database')}<span class="label">Cakupan Sumber</span></div><div class="value">${fmt(d.stats.sheets)} <small>sheet</small></div><div class="kpi-note">${fmt(d.stats.rows)} baris termasuk formula/template</div></div>
 </div>
 <div class="notice premium-notice">${icon('alert')}<div><strong>Data provenance aktif.</strong><span>Angka OEE berasal dari nilai tersimpan pada workbook sumber. Definisi Printing masih memasukkan NC ke Quality dan perlu kesepakatan sebelum menjadi KPI resmi.</span></div></div>
 <div class="grid"><section class="panel premium-panel"><div class="panel-title"><div>${icon('trend')}<div><h2>Trend OEE harian</h2><span>01–31 Agustus 2026</span></div></div><span class="pill">Actual source</span></div>${chart(d.series)}<div class="legend">${['Printing','AP','FG'].map((n,i)=>`<span style="--c:${['#0f82ff','#12a594','#f59e0b'][i]}">${n}</span>`).join('')}</div></section>
 <section class="panel premium-panel"><div class="panel-title"><div>${icon('oee')}<div><h2>Komponen OEE · AP</h2><span>Availability · Performance · Quality</span></div></div></div>${[3,4,5].map((r,i)=>{const v=d.series[1]?.rows.find(x=>x.row===r)?.cells.J?.v;return `<div class="barrow"><div class="barlabel"><span>${['Availability','Performance','Quality'][i]}</span><strong>${pct(v)}</strong></div><div class="bar"><i style="width:${typeof v==='number'?Math.max(0,Math.min(100,v*100)):0}%"></i></div></div>`;}).join('')}<p class="sheetinfo">OEE = Availability × Performance × Quality. Satuan output antar proses tidak dijumlahkan.</p></section></div>
 <div class="grid"><section class="panel premium-panel"><div class="panel-title"><div>${icon('project')}<div><h2>Status Department</h2><span>Workspace data tersedia</span></div></div></div>${Object.entries(departments).map(([k,v])=>`<button class="department-line" data-dept="${k}"><span>${icon(({PROD:'production',QC:'quality',MTC:'maintenance',PPIC:'planning',PDS:'development',PROJECT:'project'})[k])}${v}</span><strong>${catalog.sheets.filter(s=>s.department===k).length} sheet</strong></button>`).join('')}</section>
 <section class="panel premium-panel"><div class="panel-title"><div>${icon('validation')}<div><h2>Prioritas Validasi</h2><span>Data quality checkpoints</span></div></div></div><div class="metric-line"><span>Sel error Excel</span><strong>${fmt(d.stats.errors)}</strong></div><div class="metric-line"><span>Formula tanpa cached result</span><strong>${fmt(d.stats.missing_cache)}</strong></div><button id="validation" class="soft-primary">Buka validasi sumber →</button></section></div>`;
 document.querySelectorAll('[data-dept]').forEach(b=>b.onclick=()=>navigate('dept:'+b.dataset.dept));$('#validation').onclick=()=>navigate('quality');
}
