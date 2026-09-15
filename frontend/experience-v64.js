/* OEE Collaboraction Experience v64
   Final interaction layer: operational briefing + compact intent-based navigation. */
(()=>{
  document.body.classList.add('experience-v64');
  const deptMeta={
    PROD:{desc:'Eksekusi produksi, output, downtime, batch, checklist dan energi.',icon:'production'},
    QC:{desc:'Quality event, reject, process performance dan verifikasi hasil.',icon:'quality'},
    MTC:{desc:'Corrective maintenance, response, repair dan reliability.',icon:'maintenance'},
    PPIC:{desc:'Planning Released, konfirmasi, reversal dan kesiapan eksekusi.',icon:'planning'},
    PDS:{desc:'Trial, development, biaya aktual dan pembelajaran proses.',icon:'development'},
    PROJECT:{desc:'Action plan, master data, governance dan kesiapan rilis.',icon:'project'}
  };
  const safeMetricValue=m=>{if(!m||m.value===null||m.value===undefined)return '—';if(m.unit==='ratio')return pct(Number(m.value));if(m.unit==='persen')return fmt(Number(m.value),1)+'%';return fmt(Number(m.value),Number.isInteger(Number(m.value))?0:2)+(m.unit&&!['','record','event','call','area','transaksi'].includes(m.unit)?' '+esc(m.unit):'');};
  const viewLabel=()=>{
    if(view==='dashboard')return ['Operational Briefing','Ringkasan kinerja dan tindakan berikutnya'];
    if(view==='departments')return ['Department Hub','Pilih ruang kerja berdasarkan proses'];
    if(view.startsWith('dept:'))return [departments[view.split(':')[1]]||'Ruang kerja','Transaksi, monitoring dan sumber'];
    const labels={
      operations:['Register Transaksi','Pencatatan, monitoring, dan traceability operasional'],
      shopfloor:['HMI Produksi','Eksekusi produksi terkendali'],
      live:['Status Mesin','Kondisi mesin, heartbeat, dan freshness telemetry'],
      documents:['Pusat Sumber','Dokumen, aset, dan source authority'],
      quality:['Kualitas Data','Rekonsiliasi, definisi, dan validasi sumber'],
      approvals:['Approval & Verifikasi','Keputusan hasil, root cause, dan Quality Event'],
      users:['Akun & Izin','Identitas, scope department, dan least-privilege'],
      settings:['Konfigurasi & Display','Parameter terkontrol dan layout display mesin'],
      integrations:['Integrasi Sistem','Koneksi Edge, ODIN, SAP, Qlik, dan status sinkronisasi'],
      audit:['Riwayat Aktivitas','Jejak perubahan dan audit trail'],
      import:['Impor Data','Staging, validasi, dan penambahan sumber'],
      governance:['Tata Kelola & Readiness','Kesiapan perangkat, integrasi, terminology, dan owner'],
      'data-governance':['Definisi Data & KPI','Authority, definisi KPI, mesin, kalender, dan join grain'],
      'operational-control':['Standar Operasional','Cycle Target, Loss-Time, Machine Trigger, dan ownership'],
      'uat-release':['UAT & Go-Live','Evidence, blocker, dan final operational sign-off'],
      'support-recovery':['Dukungan & Pemulihan','Health, backup, restore, rollback, dan support evidence']
    };
    return labels[view]||['OEE Collaboraction','BMJ Packaging Offset'];
  };
  const syncNetworkState=()=>{const status=document.querySelector('.top-status');if(!status)return;status.classList.toggle('offline',!navigator.onLine);status.textContent=navigator.onLine?'Terhubung':'Offline';};
  if(!window.__oeeExperienceV64NetworkBound){window.addEventListener('online',syncNetworkState);window.addEventListener('offline',syncNetworkState);window.__oeeExperienceV64NetworkBound=true;}

  const baseShell=typeof shell==='function'?shell:null;
  if(baseShell){shell=function(){baseShell();queueMicrotask(enhanceShell);};}
  function enhanceShell(){
    const sidebar=$('.sidebar'),topbar=$('.topbar');if(!sidebar||!topbar)return;
    document.body.classList.add('experience-v64');
    const deptButtons=[...sidebar.querySelectorAll('[data-view^="dept:"]')];
    if(deptButtons.length){
      const anchor=deptButtons[0],hub=document.createElement('button');
      hub.className='nav '+((view==='departments'||view.startsWith('dept:'))?'active':'');hub.dataset.view='departments';hub.innerHTML=icon('documents')+'<span>Department Hub</span>';hub.onclick=()=>navigate('departments');anchor.before(hub);deptButtons.forEach(x=>x.remove());
    }
    const rename=(v,t)=>{const b=sidebar.querySelector(`[data-view="${v}"] span`);if(b)b.textContent=t;};
    rename('documents','Pusat sumber');rename('quality','Kualitas data');rename('live','Status mesin');rename('shopfloor','HMI produksi');rename('users','Akun & izin');rename('audit','Riwayat aktivitas');
    const foot=sidebar.querySelector('.sidebar-foot');if(foot)foot.innerHTML='<div class="sidebar-health">Workspace production</div><span>Data aktual · source authority terjaga</span>';
    if(!document.querySelector('.sidebar-backdrop')){const backdrop=document.createElement('div');backdrop.className='sidebar-backdrop';sidebar.insertAdjacentElement('afterend',backdrop);backdrop.onclick=()=>sidebar.classList.remove('open');}
    const topLeft=topbar.querySelector('.top-left');if(topLeft){const [title,sub]=viewLabel();const oldStrong=topLeft.querySelector(':scope > strong');if(oldStrong)oldStrong.remove();let ctx=topLeft.querySelector('.context-title');if(!ctx){ctx=document.createElement('div');ctx.className='context-title';topLeft.append(ctx);}ctx.innerHTML=`<strong>${esc(title)}</strong><small>${esc(sub)}</small>`;}
    if(!topbar.querySelector('.top-status')){const st=document.createElement('div');st.className='top-status';const usr=topbar.querySelector('.user');usr?.before(st);}syncNetworkState();
    const menu=topbar.querySelector('.mobilemenu');if(menu)menu.onclick=()=>sidebar.classList.toggle('open');
    sidebar.querySelectorAll('.nav').forEach(b=>{const old=b.onclick;b.onclick=e=>{sidebar.classList.remove('open');if(typeof old==='function')old.call(b,e);};});
  }

  const baseRender=typeof render==='function'?render:null;
  if(baseRender){render=async function(){if(view==='departments')return departmentHub64();return baseRender();};}

  async function dashboard64(){
    const d=await api('/dashboard');
    const values=d.series.map((s,i)=>s.rows.find(r=>r.row===2)?.cells[i===0?'K':'J']?.v);
    const focusDept=user.role==='superadmin'?'PROD':user.department;
    let roleData={metrics:[]};try{roleData=await api('/role-dashboard?department='+encodeURIComponent(focusDept));}catch{}
    const ap=d.series.find(s=>s.name==='OEE AP');
    const components=[3,4,5].map((r,i)=>({label:['Availability','Performance','Quality'][i],value:ap?.rows.find(x=>x.row===r)?.cells.J?.v}));
    const primaryTarget=user.role==='superadmin'?'departments':'dept:'+user.department;
    const primaryLabel=user.role==='superadmin'?'Pilih department':'Buka '+(departments[user.department]||'ruang kerja');
    const m=(roleData.metrics||[]).slice(0,4),chartHtml=chart(d.series),periodLabel=window.DashboardPeriodV34?.period?.label||'Periode source belum dapat ditentukan';
    $('#content').innerHTML=`
      <section class="briefing-hero" aria-label="Operational briefing">
        <div class="briefing-meta"><span>${esc(user.role==='superadmin'?'Superadmin':departments[user.department]||user.department)}</span><span>D1 production</span><span>${fmt(d.stats.sheets)} source sheet</span></div>
        <div class="briefing-copy"><span class="briefing-kicker">BMJ PACKAGING OFFSET · OEE COLLABORACTION</span><h1>Kinerja yang jelas.<br>Tindakan yang terarah.</h1><p>Satu ruang kerja untuk membaca kondisi proses, masuk ke pekerjaan yang perlu dilakukan, dan menelusuri source authority tanpa memenuhi layar dengan widget yang tidak perlu.</p></div>
      </section>
      <section class="process-strip" aria-label="OEE proses utama">
        ${['Printing','AP','FG'].map((n,i)=>`<div class="process-metric"><span>OEE ${n}</span><strong>${pct(values[i])}</strong><small>${esc(d.series[i]?.name||'Source belum tersedia')}</small></div>`).join('')}
        <div class="process-source"><div><strong>${fmt(d.stats.rows)}</strong><span>baris sumber terpetakan</span></div></div>
      </section>
      <div class="briefing-layout">
        <section class="intelligence-surface briefing-chart">
          <div class="surface-head"><div><h2>Pergerakan OEE harian</h2><p>Trend sumber aktual; nilai kosong/error tidak dipaksa menjadi nol.</p></div><span class="pill">${esc(periodLabel)}</span></div>
          <div class="surface-body">${chartHtml}<div class="legend">${['Printing','AP','FG'].map((n,i)=>`<span style="--c:${['#138cf5','#17a99b','#dc8f20'][i]}">${n}</span>`).join('')}</div></div>
        </section>
        <aside class="briefing-aside">
          <section class="focus-panel"><h2>Tindakan berikutnya</h2>
            <button class="focus-action" data-x64-go="${primaryTarget}"><span class="focus-icon">${icon('documents')}</span><span><strong>${esc(primaryLabel)}</strong><small>Masuk ke transaksi dan tindak lanjut.</small></span><b>→</b></button>
            <button class="focus-action" data-x64-go="shopfloor"><span class="focus-icon">${icon('machine')}</span><span><strong>HMI produksi</strong><small>Planning Released → Start PRO → Finish.</small></span><b>→</b></button>
            <button class="focus-action" data-x64-go="quality"><span class="focus-icon">${icon('validation')}</span><span><strong>Kualitas data</strong><small>Telusuri rekonsiliasi dan source debt.</small></span><b>→</b></button>
          </section>
          <section class="focus-panel"><h2>${esc(departments[focusDept]||focusDept)} · konteks saat ini</h2>
            <div class="context-list-v64">${m.length?m.map(x=>`<div class="context-line-v64"><span><strong>${esc(x.label)}</strong><small>${esc(x.source||'D1')}</small></span><b>${safeMetricValue(x)}</b></div>`).join(''):'<div class="context-empty-v64">Belum ada metrik live yang cukup untuk konteks ini.</div>'}</div>
            <div class="ap-breakdown">${components.map(x=>`<div class="ap-breakdown-row"><div><span>${x.label}</span><strong>${pct(x.value)}</strong></div><div class="ap-track"><i style="width:${typeof x.value==='number'?Math.min(100,Math.max(0,x.value*100)):0}%"></i></div></div>`).join('')}</div>
          </section>
        </aside>
      </div>
      <details class="attention-drawer"><summary>Data integrity & source attention</summary><div class="attention-content"><div class="attention-item"><span>Sel error sumber</span><strong>${fmt(d.stats.errors)}</strong></div><div class="attention-item"><span>Formula tanpa cached result</span><strong>${fmt(d.stats.missing_cache)}</strong></div><div class="attention-item"><span>Source sheet</span><strong>${fmt(d.stats.sheets)}</strong></div><div class="attention-note">Quality Printing pada workbook sumber masih memakai konvensi yang memasukkan NC. Aplikasi mempertahankan nilai sumber sebagai bukti dan memisahkan definisi transaksi baru melalui governance—tidak mengoreksi histori secara diam-diam.</div></div></details>`;
    document.querySelectorAll('[data-x64-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.x64Go));
  }
  dashboard=dashboard64;

  function departmentHub64(){
    const desc=user.role==='superadmin'?'Pilih area proses. Setiap ruang kerja membuka transaksi, monitoring, tindak lanjut, dan sumber yang relevan tanpa memenuhi sidebar.':'Pilih ruang kerja yang tersedia. Hak ubah tetap mengikuti role dan department Anda.';
    $('#content').innerHTML=`<div class="page-intro"><div class="page-intro-copy"><div class="eyebrow">WORKSPACE DIRECTORY</div><h1>Department Hub</h1><span class="muted">${esc(desc)}</span></div><div class="page-intro-actions"><button data-hub="dashboard">← Operational Briefing</button></div></div><div class="hub-note-v64">${icon('shield')}<span>Source archive tetap dapat ditelusuri dari masing-masing department. Akses edit tidak berubah—backend tetap menjadi authority permission.</span></div><section class="department-hub-v64">${Object.entries(departments).map(([code,name])=>{const meta=deptMeta[code]||{},count=(catalog?.sheets||[]).filter(x=>x.department===code).length,owned=user.role==='superadmin'||user.department===code;return `<button class="dept-row-v64" data-dept64="${code}"><span class="dept-icon-v64">${icon(meta.icon||'documents')}</span><span><strong>${esc(name)}</strong><p>${esc(meta.desc||'Ruang kerja department.')}</p></span><span class="dept-count-v64">${fmt(count)} source sheet${owned?' · scope Anda':''}</span><span class="dept-arrow-v64">→</span></button>`;}).join('')}</section>`;
    document.querySelector('[data-hub="dashboard"]')?.addEventListener('click',()=>navigate('dashboard'));
    document.querySelectorAll('[data-dept64]').forEach(b=>b.onclick=()=>navigate('dept:'+b.dataset.dept64));
  }

  if(document.querySelector('.shell'))enhanceShell();
  window.ExperienceV64={enhanceShell,departmentHub64,dashboard64,syncNetworkState,viewLabel};
})();
