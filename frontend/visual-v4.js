/* BMJ OEE visual system v4 — real application UI, no mock data. */
(()=>{
  const ASSET_LOGO='assets/logo-bmj-source.webp';
  const ASSET_HERO='assets/hero-bmj-photo.jpg';
  const sprite=(name,cls='')=>`<svg class="svg-icon ${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><use href="assets/icons.svg#${name}"></use></svg>`;
  const safeJson=v=>{try{return typeof v==='string'?JSON.parse(v):v||{};}catch{return {};}};
  const settingValue=s=>safeJson(s?.value);
  const slug=s=>String(s||'layout').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'layout';
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  let dashboardCache=null;
  let displayEditor=null;
  let selectedWidgetId=null;

  const originalRender=render;

  login=function(){
    app.innerHTML=`<div class="auth">
      <section class="auth-story">
        <div class="auth-brand"><img src="${ASSET_LOGO}" alt="BMJ"></div>
        <div class="auth-copy">
          <div class="eyebrow">BMJ PACKAGING OFFSET</div>
          <h1>BMJ OEE Platform</h1>
          <p>Pantau kinerja produksi, telusuri sumber masalah, dan kolaborasikan tindak lanjut dalam satu ruang kerja yang ringkas.</p>
          <div class="auth-benefits">
            <div class="auth-benefit">${sprite('trend')}<span>Produksi lebih efisien</span></div>
            <div class="auth-benefit">${sprite('clock')}<span>Data operasional terintegrasi</span></div>
            <div class="auth-benefit">${sprite('quality')}<span>Kualitas terukur dan tertelusur</span></div>
            <div class="auth-benefit">${sprite('users')}<span>Kolaborasi lintas department</span></div>
          </div>
        </div>
        <div class="auth-tagline">Better Process &nbsp;•&nbsp; Brighter Tomorrow</div>
      </section>
      <section class="auth-panel">
        <form id="loginForm" class="login-card">
          <div><div class="eyebrow">OEE COLLABORACTION</div><h2>Login</h2><p class="muted">Masuk ke akun Anda untuk melanjutkan.</p></div>
          <label>Username<input name="username" required autocomplete="username" placeholder="Masukkan username"></label>
          <label>Password<div class="input-shell"><input name="password" type="password" required autocomplete="current-password" placeholder="Masukkan password"><button type="button" class="show-pass">Lihat</button></div></label>
          <div class="login-foot"><label><input type="checkbox" id="rememberHint"> Ingat sesi browser</label><span>Hak akses mengikuti akun</span></div>
          <div id="loginError" class="errorbox" role="alert" style="display:none"></div>
          <button class="primary">Login</button>
          <small>Akun dan izin dikelola oleh superadmin.</small>
        </form>
      </section>
    </div>`;
    $('.show-pass').onclick=()=>{const p=$('[name=password]');p.type=p.type==='password'?'text':'password';$('.show-pass').textContent=p.type==='password'?'Lihat':'Sembunyi';};
    $('#loginForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button.primary');b.disabled=true;$('#loginError').style.display='none';try{const r=await api('/login','POST',Object.fromEntries(new FormData(e.target)));token=r.token;sessionStorage.setItem('oee-token',token);await start();}catch(err){$('#loginError').textContent=err.message;$('#loginError').style.display='block';b.disabled=false;}};
    document.body.classList.add('v4-ready');document.body.classList.remove('v4-boot');
  };

  start=async function(){
    app.innerHTML=`<div class="splash-v4">
      <div class="splash-brand"><img src="${ASSET_LOGO}" alt="BMJ"></div>
      <div class="splash-card">
        <div class="eyebrow">OEE COLLABORACTION</div><h2>Menyiapkan Aplikasi</h2><p class="muted">Memuat hak akses, sumber data, dan modul produksi…</p>
        <div class="splash-progress"><i></i></div>
        <div class="splash-steps">
          <div class="splash-step done"><span class="step-dot">✓</span><span>Menghubungkan ke server</span></div>
          <div class="splash-step" id="stepMaster"><span class="step-dot">2</span><span>Memuat data master</span></div>
          <div class="splash-step" id="stepModules"><span class="step-dot">3</span><span>Menyiapkan modul dan hak akses</span></div>
          <div class="splash-step" id="stepDashboard"><span class="step-dot">4</span><span>Menyiapkan dashboard</span></div>
        </div>
        <p class="muted" id="loadingStep">Memeriksa akun dan hak akses…</p>
      </div>
    </div>`;
    document.body.classList.add('v4-ready');document.body.classList.remove('v4-boot');
    try{
      user=await api('/me');
      if(user.must_change_password)return forcePasswordChange();
      $('#stepMaster')?.classList.add('done');$('#stepMaster .step-dot')?.replaceChildren(document.createTextNode('✓'));
      $('#loadingStep').textContent='Memuat sumber dan konfigurasi…';
      catalog=await api('/catalog');
      $('#stepModules')?.classList.add('done');$('#stepModules .step-dot')?.replaceChildren(document.createTextNode('✓'));
      const displayId=new URLSearchParams(location.search).get('display');
      if(displayId){const s=(catalog.settings||[]).find(x=>x.key===`DISPLAY_LAYOUT.${displayId}`);if(s){renderFieldDisplay(settingValue(s));return;}}
      $('#stepDashboard')?.classList.add('done');$('#stepDashboard .step-dot')?.replaceChildren(document.createTextNode('✓'));
      shell();await render();
    }catch(e){login();toast(e.message);}
  };

  shell=function(){
    const nav=(id,label,ico)=>`<button class="nav ${view===id?'active':''}" data-view="${id}">${icon(ico)}<span>${label}</span></button>`;
    const admin=user.role==='superadmin';
    app.innerHTML=`<div class="shell">
      <aside class="sidebar">
        <div class="brand"><img src="${ASSET_LOGO}" alt="BMJ"><div><strong>OEE Platform</strong><small>Packaging Offset</small></div></div>
        <nav class="navscroll">
          ${nav('dashboard','Beranda','dashboard')}
          ${nav('workspace','Workspace Department','project')}
          ${nav('documents','Data Sumber','documents')}
          ${nav('live','Monitoring Realtime','trend')}
          ${nav('shopfloor','HMI Produksi','machine')}
          <div class="navgroup">Kualitas Data</div>
          ${nav('quality','Validasi Sumber','validation')}
          ${admin?`<div class="navgroup">Superadmin</div>${nav('settings','Konfigurasi','config')}${nav('users','Akun & Izin','users')}${nav('integrations','Integrasi','database')}${nav('import','Impor Data','upload')}${nav('audit','Audit Log','audit')}`:(can(user.department,'config')?`<div class="navgroup">Administrasi</div>${nav('settings','Konfigurasi','config')}`:'')}
        </nav>
        <div class="sidebar-foot">Better Process · Brighter Tomorrow</div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="top-left"><button class="mobilemenu icon-btn" aria-label="Menu">${icon('menu')}</button><strong>BMJ OEE Platform</strong><div class="global-search">${sprite('search')}<input id="globalSearch" placeholder="Cari menu, sumber data, atau laporan…"></div></div>
          <div class="top-actions"><button class="icon-btn" id="quickMonitor" title="Monitoring realtime">${sprite('trend')}</button><button class="icon-btn" title="Notifikasi">${sprite('bell')}</button></div>
          <div class="user"><div class="avatar">${esc(user.name?.[0]||'U')}</div><div><strong>${esc(user.name)}</strong><small>${esc(user.role)} · ${esc(user.department)}</small></div><button id="logout" class="logout-compact">Keluar</button></div>
        </header>
        <main id="content" class="content"></main>
      </section>
    </div><button class="toTop" aria-label="Kembali ke atas">↑</button>`;
    document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
    $('.mobilemenu').onclick=()=>$('.sidebar').classList.toggle('open');
    $('.toTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    $('#quickMonitor').onclick=()=>navigate('live');
    $('#globalSearch').onkeydown=e=>{if(e.key==='Enter'&&e.target.value.trim()){view='documents';query=e.target.value.trim();page=0;shell();render();}};
    $('#logout').onclick=async()=>{try{await api('/logout','POST',{});}finally{token='';user=null;sessionStorage.removeItem('oee-token');login();}};
  };

  render=async function(){
    const c=$('#content');if(!c)return;c.innerHTML='<div class="panel loading-panel">Memuat data…</div>';
    try{
      if(view==='workspace')return workspaceHub();
      if(view==='dashboard')return dashboard();
      if(view.startsWith('dept:'))return departmentHome(view.split(':')[1]);
      if(view==='documents')return documents();
      if(view==='quality')return quality();
      if(view==='operations')return operations();
      if(view==='users')return users();
      if(view==='settings')return settings();
      if(view==='audit')return audit();
      if(view==='import')return importCenter();
      if(view==='shopfloor')return shopfloor();
      if(view==='live')return liveMachines();
      if(view==='integrations')return integrations();
      return originalRender();
    }catch(e){c.innerHTML=`<div class="errorbox">${esc(e.message)}</div><button id="retry">Coba lagi</button>`;$('#retry').onclick=render;}
  };

  function workspaceHub(){
    const data=[
      ['PROD','Produksi','production','Pencatatan output, downtime, batch, checklist dan energi'],
      ['QC','Quality Control','quality','Reject, process performance dan validasi kualitas'],
      ['MTC','Maintenance','maintenance','Corrective maintenance dan tindak lanjut peralatan'],
      ['PPIC','Planning & Konfirmasi','planning','Planning produksi dan konfirmasi aktual'],
      ['PDS','Development','development','Trial, biaya development dan improvement'],
      ['PROJECT','Proyek & Master','project','Action plan, master data dan proyek digitalisasi']
    ];
    $('#content').innerHTML=heading('Workspace Department','Kelola aktivitas sesuai peran dan akses department',`<span class="pill">${catalog.sheets.length} sheet sumber</span>`)+`<div class="department-hub">${data.map(([d,n,i,desc])=>`<button class="department-card-v4" data-dept="${d}"><div class="dept-cover">${icon(i)}</div><div class="dept-body"><strong>${esc(n)}</strong><p>${esc(desc)}</p><div class="dept-meta"><span>${catalog.sheets.filter(s=>s.department===d).length} sheet</span><span class="status-dot">Tersedia</span></div></div></button>`).join('')}</div>`;
    document.querySelectorAll('[data-dept]').forEach(b=>b.onclick=()=>navigate('dept:'+b.dataset.dept));
  }

  function enhancedChart(series){
    const colors=['#168eff','#19b36b','#f5a623'];let svg='<svg class="chart" viewBox="0 0 760 230" role="img" aria-label="Trend OEE sumber">';
    [0,.25,.5,.75,1].forEach(v=>{const y=200-v*172;svg+=`<line x1="44" x2="744" y1="${y}" y2="${y}" stroke="#e8eff5"/><text x="3" y="${y+4}">${v*100}%</text>`;});
    series.forEach((s,i)=>{let pts=[];const flush=()=>{if(pts.length){svg+=`<polyline fill="none" stroke="${colors[i]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}"/>`;pts.forEach(p=>{const[x,y]=p.split(',');svg+=`<circle cx="${x}" cy="${y}" r="2.4" fill="#fff" stroke="${colors[i]}" stroke-width="1.6"/>`;});pts=[];}};s.rows.filter(r=>r.row>=8&&r.row<=38).forEach(r=>{const v=r.cells[i===0?'K':'J']?.v,a=r.cells.A?.v;let day=typeof a==='number'?a-46234:/^2026-08-/.test(a)?Number(a.slice(8,10)):null;if(day&&day<=31&&finite(v)&&v>=0&&v<=1)pts.push(`${44+(day-1)*700/30},${200-v*172}`);else flush();});flush();});
    [1,5,10,15,20,25,31].forEach(d=>svg+=`<text x="${44+(d-1)*700/30}" y="224">${d}</text>`);return svg+'</svg>';
  }

  dashboard=async function(){
    const d=dashboardCache||await api('/dashboard');dashboardCache=d;
    const ap=d.series.find(s=>s.name==='OEE AP');
    const get=row=>ap?.rows.find(x=>x.row===row)?.cells.J?.v;
    const oee=get(2),availability=get(3),performance=get(4),qualityV=get(5);
    const maxSheets=Math.max(...Object.keys(departments).map(k=>catalog.sheets.filter(s=>s.department===k).length),1);
    const sourceItems=(catalog.sources||[]).slice(0,4);
    $('#content').innerHTML=`
      ${heading('Dashboard Utama','Ringkasan kinerja dan cakupan data BMJ Packaging Offset',`<span class="pill">Snapshot sumber · Agustus 2026</span>`)}
      <section class="home-hero-v4"><div class="home-hero-copy"><div class="hero-kicker">BMJ Packaging Offset</div><h2>Bersama Menuju<br>Produksi yang Lebih Baik</h2><p>Efisiensi · Kualitas · Kolaborasi · Data yang dapat ditelusuri</p></div><div class="hero-badge">Sumber aktual &amp; terkontrol</div></section>
      <div class="kpi-grid-v4">
        ${kpi('gauge','OEE AP',oee,'#0b84f3','#e9f5ff','A × P × Q')}
        ${kpi('clock','Availability AP',availability,'#19b36b','#eaf9f2','Sumber OEE AP')}
        ${kpi('trend','Performance AP',performance,'#f04d45','#fff0ef','Sumber OEE AP')}
        ${kpi('quality','Quality AP',qualityV,'#1caa64','#eaf9f2','Sumber OEE AP')}
      </div>
      <div class="home-main-grid">
        <section class="panel"><div class="panel-title-v4"><h2>Trend OEE</h2><span>1–31 Agustus 2026</span></div>${enhancedChart(d.series)}<div class="legend">${['Printing','AP','FG'].map((n,i)=>`<span style="--c:${['#168eff','#19b36b','#f5a623'][i]}">${n}</span>`).join('')}</div><p class="sheetinfo">Nilai kosong atau error pada workbook sumber tidak diubah menjadi nol.</p></section>
        <div class="home-side-stack">
          <section class="panel"><div class="panel-title-v4"><h2>Cakupan Sumber per Department</h2><span>${fmt(d.stats.sheets)} sheet</span></div>${Object.entries(departments).map(([k,n])=>{const v=catalog.sheets.filter(s=>s.department===k).length;return `<div class="coverage-row"><span>${esc(n)}</span><div class="coverage-track"><i style="width:${v/maxSheets*100}%"></i></div><strong>${v}</strong></div>`;}).join('')}</section>
          <section class="panel"><div class="panel-title-v4"><h2>Sumber Tersedia</h2><button id="openSources" style="min-height:28px;padding:4px 8px;font-size:.65rem">Lihat Semua</button></div><div class="source-activity">${sourceItems.map(s=>`<div class="source-activity-item"><span class="mini-icon">${sprite(s.kind==='xlsx'?'table':'documents')}</span><div><strong>${esc(s.name)}</strong><small>${esc(s.department)} · ${esc(s.kind||'file')}</small></div></div>`).join('')||'<div class="empty">Belum ada sumber.</div>'}</div></section>
        </div>
      </div>`;
    $('#openSources').onclick=()=>navigate('documents');
  };

  function kpi(ico,label,value,accent,tint,note){return `<div class="kpi-v4" style="--accent:${accent};--tint:${tint}"><div class="kpi-icon">${sprite(ico)}</div><div><small>${label}</small><strong>${pct(value)}</strong><em>${note}</em></div></div>`;}

  settings=function(){
    if(!can(user.department,'config')){navigate('dashboard');return;}
    const isSuper=user.role==='superadmin';
    $('#content').innerHTML=heading('Konfigurasi','Parameter sistem dan tampilan display mesin')+`
      <div class="settings-tabs"><button class="settings-tab active" data-tab="system">Sistem</button>${isSuper?'<button class="settings-tab" data-tab="display">Layout Display Mesin</button>':''}<button class="settings-tab" data-tab="security">Keamanan</button></div>
      <section class="settings-section active" data-section="system">${systemSettingsMarkup()}</section>
      ${isSuper?'<section class="settings-section" data-section="display"><div id="displayEditorRoot"></div></section>':''}
      <section class="settings-section" data-section="security">${securityMarkup()}</section>`;
    document.querySelectorAll('.settings-tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.settings-tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.settings-section').forEach(x=>x.classList.toggle('active',x.dataset.section===b.dataset.tab));if(b.dataset.tab==='display')mountDisplayEditor();});
    bindSystemSettings();bindSecurity();
  };

  function systemSettingsMarkup(){
    const depts=user.role==='superadmin'?Object.keys(departments):[user.department];
    return `<div class="settings-card-grid"><section class="panel settings-list"><div class="panel-title-v4"><h2>Parameter Sistem</h2><span>Tersimpan di D1</span></div>${(catalog.settings||[]).filter(s=>!s.key.startsWith('DISPLAY_LAYOUT.')).map(s=>`<details><summary>${esc(s.key)} · ${esc(s.department)}</summary><pre>${esc(s.value)}</pre></details>`).join('')||'<p class="empty">Belum ada parameter.</p>'}</section><section class="panel"><div class="panel-title-v4"><h2>Tambah / Ubah Parameter</h2><span>Sesuai izin akun</span></div><form id="configForm" class="formgrid"><label>Department<select name="department">${depts.map(d=>`<option>${d}</option>`).join('')}</select></label><label>Kunci<input name="key" required placeholder="PROD.target"></label><label class="full">Nilai JSON<textarea name="value" required>{}</textarea></label><button class="primary full">Simpan konfigurasi</button></form></section></div>`;
  }
  function bindSystemSettings(){const f=$('#configForm');if(!f)return;f.onsubmit=async e=>{e.preventDefault();try{const b=Object.fromEntries(new FormData(e.target));b.value=JSON.parse(b.value);await api('/settings','PUT',b);catalog=await api('/catalog');settings();toast('Konfigurasi disimpan');}catch(err){toast(err.message);}};}
  function securityMarkup(){return `<section class="panel" style="max-width:620px"><div class="panel-title-v4"><h2>Keamanan Akun</h2><span>Perubahan mengakhiri sesi aktif</span></div><form id="passwordForm" class="formgrid"><label class="full">Password saat ini<input type="password" name="current" required autocomplete="current-password"></label><label class="full">Password baru<input type="password" name="password" minlength="12" required autocomplete="new-password"></label><button class="primary full">Ganti password</button></form></section>`;}
  function bindSecurity(){const f=$('#passwordForm');if(!f)return;f.onsubmit=async e=>{e.preventDefault();try{await api('/password','PUT',Object.fromEntries(new FormData(e.target)));token='';sessionStorage.removeItem('oee-token');login();toast('Password diganti. Silakan login kembali.');}catch(err){toast(err.message);}};}

  const WIDGETS={
    oee:{name:'OEE',icon:'gauge',title:'OEE',source:'dashboard.oee'},status:{name:'Status Mesin',icon:'status',title:'Status Mesin',source:'realtime.status'},production:{name:'Produksi',icon:'production',title:'Total Produksi',source:'production.total'},downtime:{name:'Downtime',icon:'downtime',title:'Downtime',source:'downtime.minutes'},quality:{name:'Kualitas',icon:'quality',title:'Quality',source:'dashboard.quality'},trend:{name:'Grafik Trend',icon:'trend',title:'Trend Produksi / OEE',source:'dashboard.trend'},shift:{name:'Shift',icon:'shift',title:'Shift / Group',source:'realtime.shift'},clock:{name:'Jam & Tanggal',icon:'clock',title:'Waktu',source:'system.clock'},announcement:{name:'Pengumuman',icon:'announcement',title:'Pengumuman',source:'text.announcement'},text:{name:'Teks',icon:'text',title:'Teks Informasi',source:'text.custom'},logo:{name:'Logo BMJ',icon:'image',title:'Logo',source:'asset.logo'},table:{name:'Tabel Data',icon:'table',title:'Data Produksi',source:'production.table'}
  };
  const sourceOptions=[['dashboard.oee','OEE snapshot'],['dashboard.availability','Availability snapshot'],['dashboard.performance','Performance snapshot'],['dashboard.quality','Quality snapshot'],['dashboard.trend','Trend OEE snapshot'],['realtime.status','Status mesin realtime'],['realtime.shift','Shift / group realtime'],['production.total','Total produksi'],['production.table','Tabel produksi'],['downtime.minutes','Downtime'],['quality.reject','Reject / QC'],['maintenance.status','Maintenance'],['planning.target','Planning PPIC'],['system.clock','Jam & tanggal'],['text.announcement','Pengumuman'],['text.custom','Teks custom'],['asset.logo','Logo BMJ']];

  function defaultDisplayLayout(){return {id:'default-mesin-produksi',name:'Default - Mesin Produksi',department:'PROD',machine:'',resolution:'1920x1080',background:'#071521',status:'draft',updatedAt:new Date().toISOString(),widgets:[
    widget('status',8,0,2,1),widget('clock',10,0,2,1),widget('oee',0,2,3,2),widget('production',3,2,3,2),widget('quality',6,2,3,2),widget('shift',9,2,3,2),widget('trend',0,4,8,3),widget('announcement',8,4,4,3)
  ]};}
  function widget(type,x=0,y=0,w=3,h=2){const def=WIDGETS[type];return {id:`w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,type,title:def.title,source:def.source,x,y,w,h,showTitle:true,transparent:false,accent:'#48b6ff',text:''};}
  function existingLayouts(){return (catalog.settings||[]).filter(s=>s.key.startsWith('DISPLAY_LAYOUT.')).map(s=>{const v=settingValue(s);return {...v,id:v.id||s.key.slice('DISPLAY_LAYOUT.'.length),department:v.department||s.department};}).filter(x=>x&&x.id);}

  async function mountDisplayEditor(){
    const root=$('#displayEditorRoot');if(!root||root.dataset.mounted)return;root.dataset.mounted='1';
    const layouts=existingLayouts();displayEditor=structuredClone(layouts[0]||defaultDisplayLayout());selectedWidgetId=displayEditor.widgets?.[0]?.id||null;
    if(!dashboardCache){try{dashboardCache=await api('/dashboard');}catch{dashboardCache=null;}}
    renderDisplayEditor();
  }

  function renderDisplayEditor(){
    const root=$('#displayEditorRoot');if(!root||!displayEditor)return;
    const layouts=existingLayouts();
    root.innerHTML=`<div class="layout-editor">
      <div class="layout-toolbar">
        <strong style="font-size:.78rem">Layout Display Mesin</strong>
        <select id="layoutSelect"><option value="">Layout aktif</option>${layouts.map(x=>`<option value="${esc(x.id)}" ${x.id===displayEditor.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
        <input id="layoutName" value="${esc(displayEditor.name)}" aria-label="Nama layout">
        <select id="layoutResolution"><option ${displayEditor.resolution==='1920x1080'?'selected':''}>1920x1080</option><option ${displayEditor.resolution==='1366x768'?'selected':''}>1366x768</option><option ${displayEditor.resolution==='1280x720'?'selected':''}>1280x720</option><option ${displayEditor.resolution==='1080x1920'?'selected':''}>1080x1920</option></select>
        <span class="grow"></span><button id="newLayout">Reset</button><button id="previewLayout">${sprite('preview')} Preview</button><button id="saveLayout" class="primary">${sprite('save')} Simpan Draft</button><button id="publishLayout" class="primary">Publikasikan</button>
      </div>
      <aside class="widget-palette"><h3>Widget Tersedia</h3><p>Drag ke area canvas atau klik untuk menambahkan.</p><input class="widget-search" id="widgetSearch" placeholder="Cari widget…"><div class="widget-list" id="widgetList">${widgetPalette()}</div><p class="layout-hint">Logo BMJ halaman display terkunci di kiri atas. Widget lain dapat digeser dan diubah ukurannya melalui panel properti.</p></aside>
      <div class="layout-stage-wrap"><div class="layout-stage" id="layoutStage">${renderCanvasWidgets()}</div></div>
      <aside class="layout-inspector" id="layoutInspector">${inspectorMarkup()}</aside>
    </div>`;
    bindEditor();
  }
  function widgetPalette(filter=''){return Object.entries(WIDGETS).filter(([,v])=>v.name.toLowerCase().includes(filter.toLowerCase())).map(([k,v])=>`<button class="widget-pick" draggable="true" data-widget-type="${k}">${sprite(v.icon)}<span>${esc(v.name)}</span></button>`).join('');}
  function renderCanvasWidgets(){return `<div class="display-brand-lock"><img src="${ASSET_LOGO}" alt="BMJ"><small>${esc(displayEditor.machine||'DISPLAY MESIN')}</small></div>${(displayEditor.widgets||[]).map(w=>widgetMarkup(w,false)).join('')}`;}
  function widgetMarkup(w,preview){const style=`left:${w.x/12*100}%;top:${w.y/8*100}%;width:${w.w/12*100}%;height:${w.h/8*100}%;--accent:${esc(w.accent||'#48b6ff')}`;let body='';const val=valueForWidget(w);if(w.type==='logo')body=`<img src="${ASSET_LOGO}" alt="BMJ">`;else if(w.type==='trend')body=miniChart();else if(w.type==='status')body=`<div class="display-widget-value">${esc(val||'Menunggu heartbeat')}</div><div class="display-widget-meta">Monitoring realtime</div>`;else if(w.type==='announcement'||w.type==='text')body=`<div class="display-widget-value" style="font-size:.72rem">${esc(w.text||'Teks belum diisi')}</div>`;else if(w.type==='table')body=`<div class="display-widget-meta">Data tabel mengikuti sumber yang dipilih.<br>Preview tidak membuat data contoh.</div>`;else body=`<div class="display-widget-value">${esc(val||'—')}</div><div class="display-widget-meta">${esc(sourceOptions.find(x=>x[0]===w.source)?.[1]||w.source)}</div>`;return `<div class="display-widget ${w.type} ${w.id===selectedWidgetId&&!preview?'selected':''} ${w.transparent?'is-transparent':''}" data-widget-id="${w.id}" style="${style}">${w.showTitle?`<div class="display-widget-title">${esc(w.title)}</div>`:''}${body}${preview?'':'<span class="widget-resize-dot"></span>'}</div>`;}
  function valueForWidget(w){const d=dashboardCache;if(!d)return null;const ap=d.series?.find(s=>s.name==='OEE AP');const row=n=>ap?.rows?.find(x=>x.row===n)?.cells?.J?.v;if(w.source==='dashboard.oee')return pct(row(2));if(w.source==='dashboard.availability')return pct(row(3));if(w.source==='dashboard.performance')return pct(row(4));if(w.source==='dashboard.quality')return pct(row(5));if(w.source==='system.clock')return new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit'}).format(new Date());return null;}
  function miniChart(){const ap=dashboardCache?.series?.find(s=>s.name==='OEE AP');if(!ap)return '<div class="display-widget-meta">Trend belum tersedia</div>';const pts=[];ap.rows.filter(r=>r.row>=8&&r.row<=38).forEach(r=>{const v=r.cells.J?.v,a=r.cells.A?.v;let day=typeof a==='number'?a-46234:/^2026-08-/.test(a)?Number(a.slice(8,10)):null;if(day&&day<=31&&finite(v)&&v>=0&&v<=1)pts.push(`${(day-1)*100/30},${44-v*38}`);});return `<svg class="display-mini-chart" viewBox="0 0 100 46" preserveAspectRatio="none"><line x1="0" y1="43" x2="100" y2="43" stroke="#31536e"/><polyline points="${pts.join(' ')}"/></svg>`;}
  function inspectorMarkup(){const w=displayEditor?.widgets?.find(x=>x.id===selectedWidgetId);if(!w)return '<div class="inspector-empty">Pilih widget pada canvas untuk mengatur konten, sumber data, posisi, dan ukuran.</div>';return `<h3>Pengaturan Widget</h3><form class="inspector-form" id="inspectorForm"><label>Jenis Widget<input value="${esc(WIDGETS[w.type]?.name||w.type)}" disabled></label><label>Judul<input name="title" value="${esc(w.title)}"></label><label>Sumber Data<select name="source">${sourceOptions.map(([v,n])=>`<option value="${v}" ${w.source===v?'selected':''}>${n}</option>`).join('')}</select></label>${['announcement','text'].includes(w.type)?`<label>Isi Teks<textarea name="text">${esc(w.text||'')}</textarea></label>`:''}<label>Warna aksen<input name="accent" type="color" value="${esc(w.accent||'#48b6ff')}"></label><div class="inspector-grid"><label>X (kolom)<input name="x" type="number" min="0" max="11" value="${w.x}"></label><label>Y (baris)<input name="y" type="number" min="0" max="7" value="${w.y}"></label><label>Lebar<input name="w" type="number" min="1" max="12" value="${w.w}"></label><label>Tinggi<input name="h" type="number" min="1" max="8" value="${w.h}"></label></div><label class="inspector-check"><input type="checkbox" name="showTitle" ${w.showTitle?'checked':''}>Tampilkan judul</label><label class="inspector-check"><input type="checkbox" name="transparent" ${w.transparent?'checked':''}>Background transparan</label><button type="button" class="danger-soft" id="deleteWidget">${sprite('trash')} Hapus Widget</button></form>`;}

  function bindEditor(){
    $('#layoutSelect').onchange=e=>{const l=existingLayouts().find(x=>x.id===e.target.value);if(l){displayEditor=structuredClone(l);selectedWidgetId=displayEditor.widgets?.[0]?.id||null;renderDisplayEditor();}};
    $('#layoutName').oninput=e=>displayEditor.name=e.target.value;
    $('#layoutResolution').onchange=e=>displayEditor.resolution=e.target.value;
    $('#newLayout').onclick=()=>{if(confirm('Reset ke layout default? Perubahan yang belum disimpan akan hilang.')){displayEditor=defaultDisplayLayout();selectedWidgetId=displayEditor.widgets[0].id;renderDisplayEditor();}};
    $('#widgetSearch').oninput=e=>{$('#widgetList').innerHTML=widgetPalette(e.target.value);bindPalette();};
    bindPalette();bindStage();bindInspector();
    $('#previewLayout').onclick=previewDisplayLayout;
    $('#saveLayout').onclick=()=>saveDisplayLayout(false);
    $('#publishLayout').onclick=()=>saveDisplayLayout(true);
  }
  function bindPalette(){document.querySelectorAll('[data-widget-type]').forEach(b=>{b.ondragstart=e=>{e.dataTransfer.setData('text/widget-type',b.dataset.widgetType);};b.onclick=()=>addWidget(b.dataset.widgetType);});}
  function addWidget(type){const w=widget(type,0,1,3,type==='trend'?3:2);for(let y=1;y<8;y++){for(let x=0;x<12;x++){if(x+w.w<=12&&y+w.h<=8&&!overlapsAny(x,y,w.w,w.h)){w.x=x;w.y=y;y=8;break;}}}displayEditor.widgets.push(w);selectedWidgetId=w.id;renderDisplayEditor();}
  function overlapsAny(x,y,w,h,ignore){return displayEditor.widgets.some(a=>a.id!==ignore&&x<a.x+a.w&&x+w>a.x&&y<a.y+a.h&&y+h>a.y);}
  function bindStage(){const stage=$('#layoutStage');stage.ondragover=e=>{e.preventDefault();stage.classList.add('drop-active');};stage.ondragleave=()=>stage.classList.remove('drop-active');stage.ondrop=e=>{e.preventDefault();stage.classList.remove('drop-active');const type=e.dataTransfer.getData('text/widget-type');if(type)addWidget(type);};document.querySelectorAll('.display-widget').forEach(el=>{el.onclick=e=>{e.stopPropagation();selectedWidgetId=el.dataset.widgetId;refreshCanvasSelection();};el.onpointerdown=e=>startWidgetDrag(e,el.dataset.widgetId);});stage.onclick=()=>{selectedWidgetId=null;refreshCanvasSelection();};}
  function refreshCanvasSelection(){const stage=$('#layoutStage');if(stage)stage.innerHTML=renderCanvasWidgets();const ins=$('#layoutInspector');if(ins)ins.innerHTML=inspectorMarkup();bindStage();bindInspector();}
  function startWidgetDrag(e,id){if(e.button!==0)return;e.preventDefault();e.stopPropagation();selectedWidgetId=id;const stage=$('#layoutStage'),item=displayEditor.widgets.find(x=>x.id===id);if(!stage||!item)return;const r=stage.getBoundingClientRect(),start={x:e.clientX,y:e.clientY,gx:item.x,gy:item.y};const move=ev=>{const dx=Math.round((ev.clientX-start.x)/r.width*12),dy=Math.round((ev.clientY-start.y)/r.height*8);item.x=Math.max(0,Math.min(12-item.w,start.gx+dx));item.y=Math.max(0,Math.min(8-item.h,start.gy+dy));const el=stage.querySelector(`[data-widget-id="${CSS.escape(id)}"]`);if(el){el.style.left=`${item.x/12*100}%`;el.style.top=`${item.y/8*100}%`;}};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);refreshCanvasSelection();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function bindInspector(){const f=$('#inspectorForm');if(!f)return;const w=displayEditor.widgets.find(x=>x.id===selectedWidgetId);f.oninput=()=>{const d=Object.fromEntries(new FormData(f));w.title=d.title??w.title;w.source=d.source??w.source;w.text=d.text??w.text;w.accent=d.accent||w.accent;w.x=Math.max(0,Math.min(11,+d.x||0));w.y=Math.max(0,Math.min(7,+d.y||0));w.w=Math.max(1,Math.min(12-w.x,+d.w||1));w.h=Math.max(1,Math.min(8-w.y,+d.h||1));w.showTitle=f.elements.showTitle.checked;w.transparent=f.elements.transparent.checked;const stage=$('#layoutStage');if(stage)stage.innerHTML=renderCanvasWidgets();bindStage();};$('#deleteWidget').onclick=()=>{displayEditor.widgets=displayEditor.widgets.filter(x=>x.id!==selectedWidgetId);selectedWidgetId=displayEditor.widgets[0]?.id||null;renderDisplayEditor();};}

  async function saveDisplayLayout(publish){
    try{
      displayEditor.name=$('#layoutName')?.value.trim()||displayEditor.name;displayEditor.resolution=$('#layoutResolution')?.value||displayEditor.resolution;
      if(publish){const machine=prompt('Masukkan kode mesin / display tujuan. Nilai ini tidak membuat data mesin; hanya menjadi identitas layout.',displayEditor.machine||'');if(machine===null)return;if(!machine.trim())throw Error('Kode mesin/display wajib diisi untuk publikasi.');displayEditor.machine=machine.trim();}
      displayEditor.id=displayEditor.id||slug(displayEditor.name);displayEditor.status=publish?'published':'draft';displayEditor.updatedAt=new Date().toISOString();
      await api('/settings','PUT',{department:displayEditor.department||'PROD',key:`DISPLAY_LAYOUT.${displayEditor.id}`,value:displayEditor});
      catalog=await api('/catalog');toast(publish?'Layout dipublikasikan untuk display mesin.':'Draft layout disimpan.');renderDisplayEditor();
    }catch(e){toast(e.message);}
  }
  function previewDisplayLayout(){dialog('Preview Layout Display Mesin',`<div class="preview-screen">${renderPreviewWidgets()}</div>`);modal.classList.add('machine-display-preview');modal.addEventListener('close',()=>modal.classList.remove('machine-display-preview'),{once:true});}
  function renderPreviewWidgets(){return `<div class="display-brand-lock"><img src="${ASSET_LOGO}" alt="BMJ"><small>${esc(displayEditor.machine||'DISPLAY MESIN')}</small></div>${(displayEditor.widgets||[]).map(w=>widgetMarkup(w,true)).join('')}`;}

  function renderFieldDisplay(layout){
    displayEditor=layout;selectedWidgetId=null;document.body.innerHTML=`<div id="fieldDisplay" style="position:fixed;inset:0;background:#071521;overflow:hidden"><div class="preview-screen" style="width:100%;height:100%;aspect-ratio:auto">${renderPreviewWidgets()}</div><button id="exitDisplay" style="position:fixed;right:12px;bottom:12px;opacity:.15">Keluar</button></div>`;$('#exitDisplay').onclick=()=>{history.replaceState(null,'',location.pathname);location.reload();};
  }

  const boot=()=>{document.body.classList.add('v4-boot');setTimeout(()=>{if(token&&base)start();else login();},0);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
