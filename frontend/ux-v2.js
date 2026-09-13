(()=>{
  const legacyDepartment=window.department;
  const legacyOperations=window.operations;
  const deptModules={
    PROD:['production','downtime','checklist','logbook','energy'],
    QC:['quality','process'],
    MTC:['maintenance'],
    PPIC:['planning','confirmation'],
    PDS:['development'],
    PROJECT:['project','master']
  };
  const deptIcons={PROD:'production',QC:'quality',MTC:'maintenance',PPIC:'planning',PDS:'development',PROJECT:'project'};
  const parse=r=>{try{return JSON.parse(r.payload||'{}')}catch{return {}}};
  const n=v=>Number.isFinite(Number(v))?Number(v):0;
  const sum=(arr,key)=>arr.reduce((a,r)=>a+n(parse(r)[key]),0);
  const statusText=v=>typeof v!=='number'||!Number.isFinite(v)?'Belum tersedia':v>=.85?'Stabil':v>=.70?'Perlu perhatian':'Prioritas';
  const statusClass=v=>typeof v!=='number'||!Number.isFinite(v)?'neutral':v>=.85?'good':v>=.70?'warn':'bad';
  const fmtDate=d=>{if(!d)return '—';const x=new Date(d+'T00:00:00');return Number.isNaN(x.getTime())?d:x.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});};
  const latestDate=rows=>rows.map(parse).map(p=>p.date).filter(Boolean).sort().at(-1)||'';
  const ring=(label,value)=>{
    const v=typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
    const p=Math.round(v*1000)/10;
    return `<div class="lc2-ring-wrap"><div class="lc2-ring ${statusClass(value)}" style="--p:${p}"><div><strong>${typeof value==='number'?p.toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'—'}</strong><span>${esc(label)}</span></div></div><small class="lc2-state ${statusClass(value)}">${statusText(value)}</small></div>`;
  };
  const sourceSummary=dept=>{
    const s=(catalog?.sheets||[]).filter(x=>x.department===dept);
    let rows=0,errors=0,missing=0;
    s.forEach(x=>{rows+=n(x.rows);try{const m=JSON.parse(x.meta||'{}');errors+=n(m.errors);missing+=n(m.missing_cache);}catch{}});
    return {sheets:s.length,rows,errors,missing};
  };
  async function loadModules(dept){
    const mods=deptModules[dept]||[];
    const settled=await Promise.all(mods.map(async module=>{try{const d=await api('/entries?module='+module+'&page=0&q=');return {module,total:n(d.total),rows:d.rows||[]};}catch{return {module,total:0,rows:[]};}}));
    return settled;
  }
  const moduleData=(packs,module)=>packs.find(x=>x.module===module)||{total:0,rows:[]};
  const attentionRows=(packs,limit=5)=>{
    const all=[];
    packs.forEach(x=>x.rows.forEach(r=>{const p=parse(r);const st=String(p.status||'').toLowerCase();if(!['selesai','terverifikasi','closed','done'].includes(st))all.push({module:x.module,p,r});}));
    return all.slice(0,limit);
  };
  function spark(series){
    const colors=['#1473e6','#14a389','#e79a19'];
    const data=series.map((s,i)=>{const col=i===0?'K':'J';return s.rows.filter(r=>r.row>=8&&r.row<=38&&typeof r.cells?.[col]?.v==='number').map(r=>Number(r.cells[col].v)).filter(Number.isFinite)});
    const w=760,h=230,pad=28;
    let out=`<svg class="lc2-trend" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trend OEE">`;
    [0,.25,.5,.75,1].forEach(t=>{const y=h-pad-t*(h-pad*2);out+=`<line x1="${pad}" x2="${w-pad}" y1="${y}" y2="${y}"/><text x="2" y="${y+4}">${Math.round(t*100)}%</text>`;});
    data.forEach((vals,i)=>{if(vals.length<2)return;const pts=vals.map((v,j)=>`${pad+j*(w-pad*2)/(vals.length-1)},${h-pad-Math.max(0,Math.min(1,v))*(h-pad*2)}`).join(' ');out+=`<polyline points="${pts}" style="--series:${colors[i]}"/>`;});
    return out+'</svg>';
  }
  function actionButton(viewId,ico,title,desc,kind=''){
    return `<button class="lc2-action ${kind}" data-lc2-view="${viewId}">${icon(ico)}<span><strong>${title}</strong><small>${desc}</small></span><b>›</b></button>`;
  }
  function bindViews(root=document){root.querySelectorAll('[data-lc2-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.lc2View));}
  window.dashboard=async function(){
    const [d,prod,mtc,qc,ppic]=await Promise.all([
      api('/dashboard'),
      api('/entries?module=production&page=0&q=').catch(()=>({rows:[],total:0})),
      api('/entries?module=maintenance&page=0&q=').catch(()=>({rows:[],total:0})),
      api('/entries?module=quality&page=0&q=').catch(()=>({rows:[],total:0})),
      api('/entries?module=planning&page=0&q=').catch(()=>({rows:[],total:0}))
    ]);
    const vals=d.series.map((s,i)=>s.rows.find(r=>r.row===2)?.cells?.[i===0?'K':'J']?.v);
    const [printing,ap,fg]=[vals[0],vals[1],vals[2]];
    const lowest=[['Printing',printing],['AP',ap],['FG',fg]].filter(x=>typeof x[1]==='number').sort((a,b)=>a[1]-b[1])[0];
    const openMtc=(mtc.rows||[]).filter(r=>!['selesai','terverifikasi','closed','done'].includes(String(parse(r).status||'').toLowerCase())).length;
    const reject=sum(qc.rows||[],'reject');
    const latest=[latestDate(prod.rows||[]),latestDate(mtc.rows||[]),latestDate(qc.rows||[]),latestDate(ppic.rows||[])].filter(Boolean).sort().at(-1);
    const src=sourceSummary('PROD');
    $('#content').innerHTML=`<div class="lc2-dashboard">
      <section class="lc2-welcome">
        <div><span class="lc2-kicker">RINGKASAN OPERASIONAL</span><h1>Kondisi pabrik dalam satu pandangan</h1><p>Lihat kondisi utama, prioritaskan masalah, lalu masuk ke detail hanya bila diperlukan.</p></div>
        <div class="lc2-date"><span>Data terbaru</span><strong>${fmtDate(latest)}</strong><small>${fmt(d.stats?.sheets||0)} sheet · ${fmt(d.stats?.rows||0)} baris sumber</small></div>
      </section>
      <section class="lc2-actions">
        ${actionButton('dept:PROD','production','Produksi','OEE, output, downtime')}
        ${actionButton('dept:MTC','maintenance','Maintenance','Gangguan & tindak lanjut',openMtc?'attention':'')}
        ${actionButton('operations','transactions','Input Aktivitas','Catat pekerjaan operasional')}
        ${actionButton('documents','documents','Cari Dokumen','File sumber & referensi')}
      </section>
      <section class="lc2-section"><div class="lc2-section-head"><div><span>KINERJA UTAMA</span><h2>OEE proses</h2></div><small>Target resmi mengikuti konfigurasi department</small></div>
        <div class="lc2-oee-grid">${ring('Printing',printing)}${ring('AP',ap)}${ring('FG',fg)}
          <div class="lc2-focus-card"><span>Fokus perhatian</span><strong>${lowest?lowest[0]:'Belum ada data'}</strong><p>${lowest?'OEE '+pct(lowest[1])+' merupakan nilai terendah pada ringkasan saat ini.':'Data OEE belum tersedia.'}</p><button data-lc2-view="dept:PROD">Lihat penyebab →</button></div>
        </div>
      </section>
      <section class="lc2-grid-2">
        <article class="lc2-panel"><div class="lc2-section-head compact"><div><span>TREND</span><h2>Pergerakan OEE</h2></div></div>${spark(d.series)}<div class="lc2-legend"><span><i class="p"></i>Printing</span><span><i class="a"></i>AP</span><span><i class="f"></i>FG</span></div></article>
        <article class="lc2-panel"><div class="lc2-section-head compact"><div><span>PERLU PERHATIAN</span><h2>Prioritas sekarang</h2></div></div>
          <button class="lc2-priority" data-lc2-view="dept:MTC"><span>${icon('maintenance')}<b>Maintenance belum selesai</b></span><strong>${fmt(openMtc)}</strong></button>
          <button class="lc2-priority" data-lc2-view="dept:QC"><span>${icon('quality')}<b>Reject pada data terbaru</b></span><strong>${fmt(reject)}</strong></button>
          <button class="lc2-priority" data-lc2-view="dept:PPIC"><span>${icon('planning')}<b>Planning tercatat</b></span><strong>${fmt(ppic.total||0)}</strong></button>
          <button class="lc2-priority" data-lc2-view="quality"><span>${icon('validation')}<b>Error sumber / formula</b></span><strong>${fmt(src.errors+src.missing)}</strong></button>
        </article>
      </section>
      <section class="lc2-dept-strip">${Object.entries(departments).map(([k,v])=>`<button data-lc2-view="dept:${k}">${icon(deptIcons[k])}<span><strong>${v}</strong><small>${(catalog.sheets||[]).filter(s=>s.department===k).length} sumber</small></span><b>›</b></button>`).join('')}</section>
    </div>`;
    bindViews($('#content'));
  };
  window.department=async function(dept){
    const packs=await loadModules(dept),src=sourceSummary(dept),attention=attentionRows(packs);
    const tx=packs.reduce((a,x)=>a+x.total,0);
    const latest=packs.flatMap(x=>x.rows).map(parse).map(p=>p.date).filter(Boolean).sort().at(-1)||'';
    const prod=moduleData(packs,'production'),down=moduleData(packs,'downtime'),mtc=moduleData(packs,'maintenance'),qual=moduleData(packs,'quality'),plan=moduleData(packs,'planning');
    let metricA={label:'Transaksi',value:fmt(tx),note:'data operasional'},metricB={label:'Sumber data',value:fmt(src.sheets),note:fmt(src.rows)+' baris'};
    if(dept==='PROD'){metricA={label:'Output tercatat',value:fmt(sum(prod.rows,'total')),note:fmt(prod.total)+' transaksi produksi'};metricB={label:'Downtime',value:fmt(sum(down.rows,'minutes'))+' mnt',note:fmt(down.total)+' kejadian'};}
    if(dept==='MTC'){metricA={label:'Pekerjaan maintenance',value:fmt(mtc.total),note:'historis + transaksi'};metricB={label:'Durasi tercatat',value:fmt(sum(mtc.rows,'minutes'))+' mnt',note:'halaman data terbaru'};}
    if(dept==='QC'){metricA={label:'Reject tercatat',value:fmt(sum(qual.rows,'reject')),note:fmt(qual.total)+' transaksi QC'};metricB={label:'Total diperiksa',value:fmt(sum(qual.rows,'total')),note:'data terbaru'};}
    if(dept==='PPIC'){metricA={label:'Planning',value:fmt(plan.total),note:'record terintegrasi'};metricB={label:'Target qty',value:fmt(sum(plan.rows,'target')),note:'data terbaru'};}
    const modulesHtml=(deptModules[dept]||[]).map(m=>{const x=moduleData(packs,m),label=modules[m]?.[0]||m;return `<button class="lc2-module" data-module="${m}"><span>${icon(({production:'production',downtime:'alert',checklist:'check',logbook:'documents',energy:'performance',quality:'quality',process:'trend',maintenance:'maintenance',planning:'planning',confirmation:'check',development:'development',project:'project',master:'database'})[m]||'database')}<b>${esc(label)}</b></span><strong>${fmt(x.total)}</strong><small>Buka aktivitas →</small></button>`;}).join('');
    $('#content').innerHTML=`<div class="lc2-department">
      <div class="lc2-dept-head"><button class="lc2-back" data-lc2-view="dashboard">← Beranda</button><div>${icon(deptIcons[dept])}<span><small>DEPARTMENT</small><h1>${esc(departments[dept])}</h1><p>Mulai dari kondisi dan tindakan; buka data mentah hanya jika perlu.</p></span></div><button id="lc2Source" class="lc2-secondary">Data sumber</button></div>
      <div class="lc2-metrics"><article><span>${metricA.label}</span><strong>${metricA.value}</strong><small>${metricA.note}</small></article><article><span>${metricB.label}</span><strong>${metricB.value}</strong><small>${metricB.note}</small></article><article><span>Data terbaru</span><strong>${fmtDate(latest)}</strong><small>${fmt(tx)} transaksi tersedia</small></article><article class="${src.errors+src.missing?'warn':''}"><span>Perlu validasi</span><strong>${fmt(src.errors+src.missing)}</strong><small>error / formula kosong</small></article></div>
      <div class="lc2-grid-2">
        <section class="lc2-panel"><div class="lc2-section-head compact"><div><span>AKSI</span><h2>Apa yang ingin dilakukan?</h2></div></div><div class="lc2-module-grid">${modulesHtml}</div></section>
        <section class="lc2-panel"><div class="lc2-section-head compact"><div><span>PERLU PERHATIAN</span><h2>Aktivitas terbuka</h2></div><small>${attention.length?'ditampilkan '+attention.length:'tidak ada pada halaman terbaru'}</small></div>
          <div class="lc2-attention-list">${attention.length?attention.map(a=>`<button data-module="${a.module}"><span><b>${esc(a.p.title||modules[a.module]?.[0]||a.module)}</b><small>${fmtDate(a.p.date)} · ${esc(a.p.machine||a.p.pro||a.p.status||'Tercatat')}</small></span><strong>›</strong></button>`).join(''):'<div class="lc2-empty">Tidak ada aktivitas terbuka pada data terbaru.</div>'}</div>
        </section>
      </div>
      <section class="lc2-panel"><div class="lc2-section-head compact"><div><span>SUMBER DATA</span><h2>Ringkasan integritas</h2></div><button id="lc2Validation" class="lc2-link">Buka validasi →</button></div><div class="lc2-integrity"><div><strong>${fmt(src.sheets)}</strong><span>sheet</span></div><div><strong>${fmt(src.rows)}</strong><span>baris sumber</span></div><div><strong>${fmt(src.errors)}</strong><span>sel error</span></div><div><strong>${fmt(src.missing)}</strong><span>formula tanpa hasil</span></div></div></section>
    </div>`;
    bindViews($('#content'));
    $('#lc2Source').onclick=async()=>{await legacyDepartment(dept);const c=$('#content');const b=document.createElement('button');b.className='lc2-floating-back';b.textContent='← Kembali ke Ringkasan';b.onclick=()=>window.department(dept);c.prepend(b);};
    $('#lc2Validation').onclick=()=>navigate('quality');
    $('#content').querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>{opModule=b.dataset.module;page=0;query='';navigate('operations');});
  };
  window.documents=function(){
    const sources=catalog.sources||[];
    $('#content').innerHTML=`<div class="lc2-docs"><div class="lc2-dept-head"><button class="lc2-back" data-lc2-view="dashboard">← Beranda</button><div>${icon('documents')}<span><small>REFERENSI KERJA</small><h1>Dokumen & sumber</h1><p>Cari file berdasarkan nama atau department, lalu buka hanya yang dibutuhkan.</p></span></div></div><div class="lc2-doc-search">${icon('search')}<input id="lc2DocQ" placeholder="Cari nama file, department, atau tipe…"><span>${fmt(sources.length)} file</span></div><div id="lc2DocGrid" class="lc2-doc-grid"></div></div>`;
    const draw=q=>{q=(q||'').toLowerCase();const filtered=sources.filter(s=>`${s.name} ${s.department} ${s.kind}`.toLowerCase().includes(q));$('#lc2DocGrid').innerHTML=filtered.map((s,i)=>`<button class="lc2-doc-card" data-src="${sources.indexOf(s)}"><span class="lc2-file-icon">${icon(s.kind==='pdf'?'file':s.kind==='xlsx'?'database':'documents')}</span><span><small>${esc(s.department)} · ${esc(String(s.kind).toUpperCase())}</small><strong>${esc(s.name)}</strong><em>${fmt((s.bytes||0)/1024,1)} KB</em></span><b>›</b></button>`).join('')||'<div class="lc2-empty">Dokumen tidak ditemukan.</div>';$('#lc2DocGrid').querySelectorAll('[data-src]').forEach(b=>b.onclick=()=>openFile(sources[+b.dataset.src]));};
    $('#lc2DocQ').oninput=e=>draw(e.target.value);draw('');bindViews($('#content'));
  };
  window.quality=function(){
    const sorted=[...(catalog.sheets||[])].map(s=>{let m={};try{m=JSON.parse(s.meta||'{}')}catch{}return {s,m,score:n(m.errors)+n(m.missing_cache)};}).sort((a,b)=>b.score-a.score);
    const totalErr=sorted.reduce((a,x)=>a+n(x.m.errors),0),totalMissing=sorted.reduce((a,x)=>a+n(x.m.missing_cache),0);
    $('#content').innerHTML=`<div class="lc2-quality"><div class="lc2-dept-head"><button class="lc2-back" data-lc2-view="dashboard">← Beranda</button><div>${icon('validation')}<span><small>DATA QUALITY</small><h1>Validasi sumber</h1><p>Fokus pada sumber yang paling membutuhkan tindakan, bukan membaca seluruh daftar sekaligus.</p></span></div></div><div class="lc2-metrics"><article><span>Sel error</span><strong>${fmt(totalErr)}</strong><small>dipertahankan sebagai evidence</small></article><article><span>Formula tanpa hasil</span><strong>${fmt(totalMissing)}</strong><small>perlu rekonsiliasi</small></article><article><span>Sheet diperiksa</span><strong>${fmt(sorted.length)}</strong><small>seluruh department</small></article><article><span>Prioritas tinggi</span><strong>${fmt(sorted.filter(x=>x.score>0).length)}</strong><small>sheet dengan temuan</small></article></div><section class="lc2-panel"><div class="lc2-section-head compact"><div><span>PRIORITAS</span><h2>Sumber yang perlu ditinjau</h2></div></div><div class="lc2-quality-list">${sorted.slice(0,12).map(x=>`<div><span><b>${esc(x.s.name)}</b><small>${esc(x.s.department)} · ${fmt(x.s.rows)} baris</small></span><span><strong>${fmt(n(x.m.errors))}</strong><small>error</small></span><span><strong>${fmt(n(x.m.missing_cache))}</strong><small>formula kosong</small></span></div>`).join('')}</div></section><details class="lc2-decision"><summary>Catatan keputusan data & aturan integrasi</summary><div><p>Data sumber tetap dipertahankan apa adanya untuk provenance. Koreksi dilakukan melalui transaksi/overlay sehingga file historis tidak hilang.</p><p>Join lintas proses harus menggunakan kombinasi plant, mesin, PRO, material, tanggal kerja, shift/group, batch/confirmation, dan satuan yang sesuai.</p></div></details></div>`;bindViews($('#content'));
  };
})();