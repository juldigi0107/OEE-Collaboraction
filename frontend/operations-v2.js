(()=>{
  const groups=[
    {title:'Produksi',dept:'PROD',items:['production','downtime','checklist','logbook','energy']},
    {title:'Quality',dept:'QC',items:['quality','process']},
    {title:'Maintenance',dept:'MTC',items:['maintenance']},
    {title:'Planning',dept:'PPIC',items:['planning','confirmation']},
    {title:'Development',dept:'PDS',items:['development']},
    {title:'Project & Master',dept:'PROJECT',items:['project','master']}
  ];
  const ico={production:'production',downtime:'alert',checklist:'check',logbook:'documents',energy:'performance',quality:'quality',process:'trend',maintenance:'maintenance',planning:'planning',confirmation:'check',development:'development',project:'project',master:'database'};
  const safeParse=r=>{try{return JSON.parse(r.payload||'{}')}catch{return {}}};
  const done=p=>['selesai','terverifikasi','closed','done'].includes(String(p.status||'').toLowerCase());
  window.operations=async function(){
    const d=await api('/entries?module='+opModule+'&page='+page+'&q='+encodeURIComponent(query));
    rows=d.rows||[];total=d.total||0;
    const [label,dept]=modules[opModule]||[opModule,'PROJECT'];
    const active=groups.find(g=>g.items.includes(opModule));
    const open=rows.filter(r=>!done(safeParse(r))).length;
    $('#content').innerHTML=`<div class="op2">
      <div class="lc2-dept-head"><button class="lc2-back" data-op-view="dashboard">← Beranda</button><div>${icon('transactions')}<span><small>INPUT & AKTIVITAS</small><h1>Catat pekerjaan tanpa mencari menu</h1><p>Pilih jenis aktivitas, isi seperlunya, lalu simpan. Data teknis tetap tersimpan di belakang layar.</p></span></div></div>
      <section class="op2-picker"><div class="lc2-section-head compact"><div><span>LANGKAH 1</span><h2>Pilih pekerjaan</h2></div><small>Jenis aktif: ${esc(label)}</small></div>
        <div class="op2-groups">${groups.map(g=>`<div class="op2-group"><strong>${g.title}</strong><div>${g.items.map(m=>`<button data-op-module="${m}" class="${opModule===m?'active':''}">${icon(ico[m]||'database')}<span>${esc(modules[m]?.[0]||m)}</span></button>`).join('')}</div></div>`).join('')}</div>
      </section>
      <section class="op2-summary"><article><span>Total tercatat</span><strong>${fmt(total)}</strong><small>${esc(label)}</small></article><article><span>Belum selesai</span><strong>${fmt(open)}</strong><small>pada 50 data terbaru</small></article><article><span>Hak akses</span><strong>${can(dept,'create')?'Input':'View'}</strong><small>${esc(dept)}</small></article><article><span>Halaman</span><strong>${page+1}</strong><small>dari ${Math.max(1,Math.ceil(total/50))}</small></article></section>
      <section class="op2-work"><div class="op2-work-head"><div><small>LANGKAH 2</small><h2>${esc(label)}</h2><p>${active?'Kelompok '+active.title+' · ':''}lihat aktivitas terakhir atau tambahkan catatan baru.</p></div><div>${can(dept,'create')?'<button id="op2New" class="primary">+ Tambah aktivitas</button>':''}</div></div>
        <form id="op2Search" class="op2-search">${icon('search')}<input name="q" value="${esc(query)}" placeholder="Cari judul, mesin, PRO, tanggal…"><button>Cari</button></form>
        ${opModule==='process'?'<button id="op2Spc" class="lc2-secondary">Analisis process performance</button>':''}
        <div class="op2-list">${rows.length?rows.map((r,i)=>{const p=safeParse(r);return `<button data-op-row="${i}" class="op2-row"><span class="op2-status ${done(p)?'done':'open'}"></span><span class="op2-main"><strong>${esc(p.title||'Aktivitas tanpa judul')}</strong><small>${esc(p.date||'Tanggal tidak tersedia')} · ${esc(p.machine||p.pro||p.material||'—')}</small></span><span class="op2-result">${p.metrics?'OEE '+pct(p.metrics.oee):p.minutes?esc(p.minutes)+' mnt':p.reject!==undefined?'Reject '+esc(p.reject):esc(p.status||'Tercatat')}</span><b>›</b></button>`;}).join(''):'<div class="lc2-empty">Belum ada aktivitas pada pilihan ini.</div>'}</div>
        <div class="op2-pager"><button id="op2Prev" ${page===0?'disabled':''}>← Sebelumnya</button><small>${fmt(total)} aktivitas</small><button id="op2Next" ${(page+1)*50>=total?'disabled':''}>Berikutnya →</button></div>
      </section>
    </div>`;
    $('#content').querySelectorAll('[data-op-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.opView));
    $('#content').querySelectorAll('[data-op-module]').forEach(b=>b.onclick=()=>{opModule=b.dataset.opModule;page=0;query='';render();});
    $('#op2Search').onsubmit=e=>{e.preventDefault();query=new FormData(e.target).get('q')||'';page=0;render();};
    if($('#op2New'))$('#op2New').onclick=()=>entryForm();
    $('#content').querySelectorAll('[data-op-row]').forEach(b=>b.onclick=()=>entryForm(rows[+b.dataset.opRow]));
    $('#op2Prev').onclick=()=>{page=Math.max(0,page-1);render();};
    $('#op2Next').onclick=()=>{page++;render();};
    if($('#op2Spc'))$('#op2Spc').onclick=spc;
  };
})();