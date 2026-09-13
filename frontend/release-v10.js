/* BMJ OEE Release v10 — blueprint governance, business presentation, and field safety. */
(()=>{
  const displayId=new URLSearchParams(location.search).get('display');
  const roleNames={superadmin:'Superadmin',admin:'Admin Department',user:'Viewer'};
  const readinessLabels={ready:'Siap',gap:'Ada gap',unknown:'Belum diverifikasi',not_required:'Tidak diperlukan'};
  const readinessClass={ready:'ok',gap:'warn',unknown:'neutral',not_required:'neutral'};
  const blueprintTerms={
    PRO:'Production Order / Process Order',PR:'Production Request / Planning Reference',PL:'Packing List / Production List',
    UPDT:'Unplanned Downtime',PDT:'Planned Downtime',NC:'Non-Conformance / Sorting Result',Good:'Good Output',
    Reject:'Final / Provisional Reject',Rework:'Rework / Good after Sorting',Patrol:'Quality Patrol / Inspection',
    Setup:'Setup / Changeover',Preparation:'Awal Shift / Pre-Start Activity','Over Time Downtime':'Planned Downtime Over Standard'
  };
  const safeSetting=(key,fallback={})=>{
    const s=(catalog?.settings||[]).find(x=>x.key===key);
    if(!s)return fallback;
    try{return typeof s.value==='string'?JSON.parse(s.value):s.value||fallback;}catch{return fallback;}
  };
  const sourceMeta=s=>{try{return typeof s.meta==='string'?JSON.parse(s.meta):s.meta||{};}catch{return {};}};
  const humanBytes=n=>{const v=Number(n||0);if(v<1024)return v+' B';if(v<1048576)return (v/1024).toLocaleString('id-ID',{maximumFractionDigits:1})+' KB';return (v/1048576).toLocaleString('id-ID',{maximumFractionDigits:1})+' MB';};
  const statusPill=(status,label)=>`<span class="release-status ${status}">${esc(label)}</span>`;
  const normalize=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');

  /* Field displays must never borrow another machine's realtime stream. */
  const rawApi=api;
  api=async function(path,method='GET',data){
    const result=await rawApi(path,method,data);
    if(displayId&&path==='/realtime/overview'&&result&&catalog){
      const item=(catalog.settings||[]).find(x=>x.key===`DISPLAY_LAYOUT.${displayId}`);
      let layout={};try{layout=typeof item?.value==='string'?JSON.parse(item.value):item?.value||{};}catch{}
      const code=normalize(layout.machine);
      if(code){
        const machines=(result.machines||[]).filter(m=>normalize(m.code)===code);
        const ids=new Set(machines.map(m=>m.machine_id||m.id).filter(Boolean));
        return {...result,machines,runs:(result.runs||[]).filter(r=>ids.has(r.machine_id)),downtime:(result.downtime||[]).filter(d=>ids.has(d.machine_id)),maintenance:(result.maintenance||[]).filter(m=>ids.has(m.machine_id))};
      }
    }
    return result;
  };

  /* Block draft / unassigned layouts before the field screen is painted. */
  if(typeof renderFieldDisplay==='function'){
    const rawRenderFieldDisplay=renderFieldDisplay;
    renderFieldDisplay=function(layout){
      if(layout?.status==='published'&&String(layout.machine||'').trim())return rawRenderFieldDisplay(layout);
      const host=document.createElement('div');host.id='fieldDisplay';host.className='field-display-release-block';
      const card=document.createElement('section');card.className='field-display-blocked';
      const logo=document.createElement('img');logo.src='assets/logo-bmj.svg';logo.alt='BMJ';
      const h=document.createElement('h1');h.textContent='Display belum siap ditayangkan';
      const p=document.createElement('p');p.textContent='Publikasikan layout dan tetapkan kode mesin melalui Konfigurasi sebelum layar dipasang di lapangan.';
      const small=document.createElement('small');small.textContent='ID display: '+(displayId||'—');
      card.append(logo,h,p,small);host.append(card);document.body.replaceChildren(host);
    };
  }

  const rawShell=shell;
  shell=function(){
    rawShell();
    document.body.classList.add('release-v10');
    const role=document.querySelector('.user small');
    if(role&&user)role.textContent=`${roleNames[user.role]||user.role} · ${departments[user.department]||user.department}`;
    const nav=document.querySelector('.navscroll');
    if(nav){
      [...nav.querySelectorAll('.nav span')].forEach(span=>{if(span.textContent==='Data Sumber')span.textContent='Pusat Data & Dokumen';if(span.textContent==='Validasi Sumber')span.textContent='Kualitas Data';});
      if(user?.role==='superadmin'&&!nav.querySelector('[data-view="governance"]')){
        const btn=document.createElement('button');btn.className='nav';btn.dataset.view='governance';btn.innerHTML=`${icon('shield')}<span>Tata Kelola & Readiness</span>`;btn.onclick=()=>navigate('governance');
        const settingsBtn=nav.querySelector('[data-view="settings"]');if(settingsBtn)settingsBtn.insertAdjacentElement('beforebegin',btn);else nav.append(btn);
      }
    }
  };

  const rawRender=render;
  render=async function(){
    if(view==='governance')return renderGovernance();
    const r=await rawRender();
    queueMicrotask(polishCurrentView);
    return r;
  };

  function polishCurrentView(){
    document.querySelectorAll('.tablewrap table').forEach(t=>t.classList.add('release-table'));
    const headingEl=document.querySelector('#content .heading');
    if(headingEl&&!document.querySelector('#content .release-context')){
      const bar=document.createElement('div');bar.className='release-context';
      const dept=view.startsWith('dept:')?departments[view.split(':')[1]]:'';
      bar.textContent=dept?`Ruang kerja ${dept} · sumber dan transaksi dapat ditelusuri`:'Data operasional · perubahan tersimpan dengan audit trail';
      headingEl.insertAdjacentElement('afterend',bar);
    }
  }

  /* Business-facing source registry replaces a file-card dump. */
  documents=function(){
    const all=catalog.sources||[],business=all.filter(s=>!/thumbs\.db$/i.test(s.name||'')),system=all.length-business.length;
    const deptCount=Object.keys(departments).filter(d=>business.some(s=>s.department===d)).length;
    const totalBytes=business.reduce((n,s)=>n+Number(s.bytes||0),0);
    $('#content').innerHTML=heading('Pusat Data & Dokumen','Sumber resmi, arsip historis, dan dokumen referensi yang dapat ditelusuri')+
      `<div class="release-kpis"><div><span>Sumber bisnis</span><strong>${fmt(business.length)}</strong><small>${deptCount} area pemilik data</small></div><div><span>Workbook / sheet</span><strong>${fmt((catalog.sheets||[]).length)}</strong><small>tersimpan dalam katalog</small></div><div><span>Ukuran arsip</span><strong>${humanBytes(totalBytes)}</strong><small>file asli dipertahankan</small></div><div><span>File sistem</span><strong>${fmt(system)}</strong><small>disimpan, tidak dipakai sebagai data bisnis</small></div></div>`+
      `<section class="panel source-registry"><div class="release-section-head"><div><h2>Register sumber</h2><p>Gunakan pencarian untuk menemukan workbook, PDF, presentasi, atau referensi gambar.</p></div><input id="sourceSearch" placeholder="Cari nama file atau department…" aria-label="Cari sumber"></div><div class="tablewrap"><table class="release-table"><thead><tr><th>Sumber</th><th>Pemilik</th><th>Jenis</th><th>Ukuran</th><th>Cakupan</th><th></th></tr></thead><tbody id="sourceRows"></tbody></table></div></section>`;
    const draw=()=>{const q=normalize($('#sourceSearch')?.value),rows=business.filter(s=>!q||normalize(`${s.name} ${s.department} ${s.kind}`).includes(q));$('#sourceRows').innerHTML=rows.map((s,i)=>{const sheets=(catalog.sheets||[]).filter(x=>x.source_id===s.id).length;return `<tr><td><strong>${esc(s.name)}</strong><small class="source-path">${esc(s.path||'Arsip sumber')}</small></td><td>${esc(departments[s.department]||s.department)}</td><td>${statusPill('neutral',String(s.kind||'file').toUpperCase())}</td><td>${humanBytes(s.bytes)}</td><td>${sheets?fmt(sheets)+' sheet':'Dokumen / media'}</td><td><button data-source-id="${esc(s.id)}">Buka</button></td></tr>`;}).join('')||'<tr><td colspan="6"><div class="release-empty">Tidak ada sumber yang cocok dengan pencarian.</div></td></tr>';document.querySelectorAll('[data-source-id]').forEach(b=>b.onclick=()=>openFile(business.find(s=>s.id===b.dataset.sourceId)));};
    $('#sourceSearch').oninput=draw;draw();polishCurrentView();
  };

  /* Source quality becomes a release-quality dashboard, while preserving audit facts. */
  quality=function(){
    const sheets=(catalog.sheets||[]).map(s=>({s,m:sourceMeta(s)}));
    const errors=sheets.reduce((n,x)=>n+Number(x.m.errors||0),0),missing=sheets.reduce((n,x)=>n+Number(x.m.missing_cache||0),0);
    const affected=sheets.filter(x=>Number(x.m.errors||0)>0||Number(x.m.missing_cache||0)>0).length;
    const top=[...sheets].sort((a,b)=>(Number(b.m.errors||0)+Number(b.m.missing_cache||0))-(Number(a.m.errors||0)+Number(a.m.missing_cache||0))).slice(0,15);
    $('#content').innerHTML=heading('Kualitas Data','Kesehatan sumber, isu definisi, dan prioritas rekonsiliasi')+
      `<div class="release-kpis"><div><span>Sheet terdaftar</span><strong>${fmt(sheets.length)}</strong><small>seluruh periode tetap dipertahankan</small></div><div><span>Sheet perlu perhatian</span><strong>${fmt(affected)}</strong><small>error atau formula tanpa hasil</small></div><div><span>Sel error sumber</span><strong>${fmt(errors)}</strong><small>tidak diganti nol</small></div><div><span>Formula tanpa cache</span><strong>${fmt(missing)}</strong><small>perlu rekonsiliasi pemilik data</small></div></div>`+
      `<div class="release-grid"><section class="panel"><div class="release-section-head"><div><h2>Keputusan definisi yang belum boleh diasumsikan</h2><p>Catatan audit baseline dari sumber asli.</p></div></div><div class="release-finding"><strong>Quality Printing</strong><span>NC pada workbook sumber ikut mempengaruhi definisi quality. Aplikasi tidak mengubah definisi historis secara diam-diam.</span></div><div class="release-finding"><strong>PPIC confirmation</strong><span>Nilai signed negatif dipertahankan sebagai kandidat reversal dan perlu rekonsiliasi berdasarkan confirmation/counter.</span></div><div class="release-finding"><strong>MTC corrective</strong><span>Versi Ori dan Verifikasi dipertahankan terpisah; timestamp lintas periode tidak otomatis dianggap MTTR.</span></div><div class="release-finding"><strong>PDS development</strong><span>Nilai agregat trial/cost yang tidak wajar tetap ditandai sebagai isu sumber, bukan diperbaiki tanpa persetujuan owner.</span></div></section><section class="panel"><div class="release-section-head"><div><h2>Prinsip penyajian production</h2></div></div><ul class="release-checklist"><li>Periode mengikuti tanggal pada data, bukan nama file.</li><li>Satuan sheet, pcs, kg, menit dan rupiah tidak dicampur tanpa konversi resmi.</li><li>Raw, pivot, summary dan transaksi tidak dijumlahkan sebagai satu populasi.</li><li>Nilai realtime hanya muncul bila heartbeat atau transaksi live tersedia.</li><li>Data yang belum tervalidasi ditampilkan sebagai status, bukan angka buatan.</li></ul></section></div>`+
      `<section class="panel"><div class="release-section-head"><div><h2>Prioritas rekonsiliasi</h2><p>15 sheet dengan temuan terbanyak.</p></div></div><div class="tablewrap"><table class="release-table"><thead><tr><th>Department</th><th>Sheet</th><th>Baris</th><th>Error</th><th>Formula kosong</th><th>Status</th></tr></thead><tbody>${top.map(x=>{const issue=Number(x.m.errors||0)+Number(x.m.missing_cache||0);return `<tr><td>${esc(departments[x.s.department]||x.s.department)}</td><td>${esc(x.s.name)}</td><td>${fmt(x.s.rows)}</td><td>${fmt(Number(x.m.errors||0))}</td><td>${fmt(Number(x.m.missing_cache||0))}</td><td>${issue?statusPill('warn','Perlu rekonsiliasi'):statusPill('ok','Bersih')}</td></tr>`;}).join('')}</tbody></table></div></section>`;
    polishCurrentView();
  };

  async function renderGovernance(){
    if(user?.role!=='superadmin')return navigate('dashboard');
    const infra=safeSetting('RELEASE_READINESS.infrastructure',{}),owners=safeSetting('RELEASE_READINESS.data_owners',{}),terms=safeSetting('RELEASE_READINESS.terminology',{});
    let integrations=[];try{integrations=await api('/integrations');}catch{}
    const sources=(catalog.sources||[]).filter(s=>!/thumbs\.db$/i.test(s.name||''));
    const sheets=catalog.sheets||[];
    const issueCells=sheets.reduce((n,s)=>{const m=sourceMeta(s);return n+Number(m.errors||0)+Number(m.missing_cache||0);},0);
    const connected=re=>integrations.some(x=>x.enabled&&re.test(String(x.system||''))&&String(x.last_status||'').toUpperCase()==='OK');
    const edgeReady=connected(/EDGE|PLC|MACHINE|SENSOR/i),odinReady=connected(/ODIN/i),sapReady=connected(/SAP/i);
    const infraFields=[['pc','PC client / dashboard'],['lan','LAN network'],['power','Power / UPS'],['tv','TV / mini PC'],['barcode','Barcode scanner'],['hmi','Panel HMI'],['install_window','Installation window'],['pic','PIC lapangan']];
    const infraReady=infraFields.filter(([k])=>infra[k]==='ready').length;
    const termOpen=Object.keys(blueprintTerms).filter(k=>!String(terms[k]||'').trim()).length;
    const cards=[
      ['ok','Role-based access','Superadmin, Admin Department, dan Viewer diterapkan di frontend dan backend.'],
      [sources.length?'ok':'warn','Source archive',`${sources.length} sumber bisnis dan ${sheets.length} sheet terdaftar.`],
      ['ok','PPIC → HMI → produksi','Planning dipilih sebelum Start PRO; checklist pre-start wajib lengkap.'],
      ['ok','PDT / UPDT / COJ','Downtime terstruktur tersedia; UPDT >10 menit memiliki automation maintenance.'],
      [infra.barcode==='ready'?'ok':'neutral','Barcode validation',infra.barcode==='ready'?'Scanner telah diverifikasi pada readiness.':'Input scanner keyboard-ready tersedia; perangkat dan format barcode belum diverifikasi.'],
      [edgeReady?'ok':'neutral','Machine trigger',edgeReady?'Feed machine/edge terakhir berstatus OK.':'Framework edge tersedia; tag PLC/sensor menunggu endpoint/perangkat nyata.'],
      [odinReady||sapReady?'ok':'neutral','ODIN / SAP',odinReady||sapReady?'Minimal satu koneksi enterprise berstatus OK.':'Tidak diklaim terhubung sampai endpoint dan Worker Secret dikonfigurasi.'],
      [infraReady===infraFields.length?'ok':infraReady?'warn':'neutral','Infrastructure readiness',`${infraReady}/${infraFields.length} area telah ditandai siap.`],
      [Object.keys(owners).length?'ok':'neutral','Data owner & approval',Object.keys(owners).length?'Owner baseline telah disimpan.':'Owner/approver final masih perlu disahkan BMJ.'],
      [issueCells?'warn':'ok','Source data quality',issueCells?`${fmt(issueCells)} temuan sumber masih harus direkonsiliasi.`:'Tidak ada temuan sumber pada katalog aktif.'],
      [termOpen?'warn':'ok','Terminology',termOpen?`${termOpen} istilah masih menunggu definisi internal BMJ.`:'Kamus internal telah dilengkapi.']
    ];
    const actions=[];
    infraFields.forEach(([k,l])=>{if(infra[k]!=='ready'&&infra[k]!=='not_required')actions.push(`Verifikasi ${l}`);});
    if(!edgeReady)actions.push('Finalisasi mapping trigger PLC/sensor dan heartbeat mesin');
    if(!odinReady)actions.push('Konfirmasi endpoint ODIN atau tetapkan tidak diperlukan');
    if(!sapReady)actions.push('Konfirmasi endpoint SAP atau tetapkan tidak diperlukan');
    if(!Object.keys(owners).length)actions.push('Sahkan data owner, verifier, dan final approver');
    if(termOpen)actions.push('Lengkapi definisi internal BMJ pada kamus istilah');
    if(issueCells)actions.push('Rekonsiliasi error/formula sumber prioritas tinggi');

    $('#content').innerHTML=heading('Tata Kelola & Release Readiness','Kontrol requirement blueprint, dependency lapangan, dan integrasi sebelum go-live')+
      `<div class="release-readiness-banner"><div><span class="eyebrow">BLUEPRINT CONTROL</span><strong>${cards.filter(x=>x[0]==='ok').length} capability siap</strong><small>${cards.filter(x=>x[0]!=='ok').length} area memerlukan verifikasi atau rekonsiliasi</small></div><div>${statusPill(actions.length?'warn':'ok',actions.length?'Belum final sign-off':'Siap sign-off')}</div></div>`+
      `<section class="release-capability-grid">${cards.map(([s,t,d])=>`<article><div>${statusPill(s,s==='ok'?'Siap':s==='warn'?'Perlu perhatian':'Belum diverifikasi')}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')}</section>`+
      `<div class="release-grid"><section class="panel"><div class="release-section-head"><div><h2>Readiness lapangan</h2><p>PC, LAN, power, display, scanner, HMI, window instalasi dan PIC.</p></div></div><form id="infraReadiness" class="release-readiness-form">${infraFields.map(([k,l])=>`<label><span>${esc(l)}</span><select name="${k}">${Object.entries(readinessLabels).map(([v,n])=>`<option value="${v}" ${infra[k]===v?'selected':''}>${n}</option>`).join('')}</select></label>`).join('')}<label class="full"><span>Catatan lapangan</span><textarea name="note" placeholder="Catat lokasi, gap hardware, jadwal instalasi, atau dependensi lain.">${esc(infra.note||'')}</textarea></label><button class="primary full">Simpan readiness</button></form></section><section class="panel"><div class="release-section-head"><div><h2>Open action sebelum sign-off</h2><p>Daftar ini dibentuk dari status nyata di atas.</p></div></div><ol class="release-action-list">${actions.map(a=>`<li>${esc(a)}</li>`).join('')||'<li class="done">Tidak ada blocker blueprint yang terbuka.</li>'}</ol></section></div>`+
      `<div class="release-grid"><section class="panel"><div class="release-section-head"><div><h2>Data owner & approval</h2><p>Baseline mengikuti blueprint; dapat dikunci sesuai keputusan BMJ.</p></div></div><form id="ownerForm" class="release-owner-form">${[['planning','Planning / Target','PPIC'],['output','Actual Output','Production / Machine'],['downtime','Downtime','Production / Maintenance'],['quality','Defect & Quality Final','Quality'],['maintenance','Maintenance Breakdown','Maintenance'],['action','Action Plan','Lintas fungsi'],['report','Final Report','Management']].map(([k,l,d])=>`<label><span>${l}</span><input name="${k}" value="${esc(owners[k]||d)}"></label>`).join('')}<button class="primary full">Simpan owner baseline</button></form></section><section class="panel"><div class="release-section-head"><div><h2>Integrasi & machine trigger</h2><p>Status koneksi tidak dianggap live sebelum heartbeat/sync sukses.</p></div></div><div class="release-integration-list">${integrations.map(x=>`<div><span><strong>${esc(x.system)}</strong><small>${esc(x.mode||'')}</small></span>${statusPill(x.enabled&&String(x.last_status).toUpperCase()==='OK'?'ok':x.enabled?'warn':'neutral',x.enabled?(x.last_status||'Enabled'):'Disabled')}</div>`).join('')||'<div class="release-empty">Belum ada koneksi enterprise yang dikonfigurasi.</div>'}</div></section></div>`+
      `<section class="panel"><div class="release-section-head"><div><h2>Kamus istilah BMJ</h2><p>Padanan sistem berasal dari inquiry blueprint. Kolom definisi internal harus disahkan pemilik proses.</p></div></div><form id="termForm"><div class="tablewrap"><table class="release-table"><thead><tr><th>Istilah</th><th>Padanan sistem</th><th>Definisi internal BMJ</th><th>Status</th></tr></thead><tbody>${Object.entries(blueprintTerms).map(([k,v])=>`<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td><td><input name="term_${esc(k)}" value="${esc(terms[k]||'')}" placeholder="Isi definisi yang disepakati"></td><td>${statusPill(terms[k]?'ok':'neutral',terms[k]?'Terverifikasi':'Perlu konfirmasi')}</td></tr>`).join('')}</tbody></table></div><button class="primary">Simpan kamus</button></form></section>`;

    $('#infraReadiness').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));await api('/settings','PUT',{department:'PROJECT',key:'RELEASE_READINESS.infrastructure',value:b});catalog=await api('/catalog');toast('Readiness lapangan disimpan.');renderGovernance();};
    $('#ownerForm').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));await api('/settings','PUT',{department:'PROJECT',key:'RELEASE_READINESS.data_owners',value:b});catalog=await api('/catalog');toast('Data owner baseline disimpan.');renderGovernance();};
    $('#termForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b={};for(const k of Object.keys(blueprintTerms))b[k]=String(f.get('term_'+k)||'').trim();await api('/settings','PUT',{department:'PROJECT',key:'RELEASE_READINESS.terminology',value:b});catalog=await api('/catalog');toast('Kamus istilah disimpan.');renderGovernance();};
    polishCurrentView();
  }

  /* Scanner-as-keyboard support for PRO/planning validation. */
  if(typeof shopfloor==='function'){
    const rawShopfloor=shopfloor;
    shopfloor=async function(refresh=false){
      const r=await rawShopfloor(refresh);installBarcodeAssistant();return r;
    };
  }
  function installBarcodeAssistant(){
    const form=document.querySelector('#startRun'),select=document.querySelector('#planChoice');if(!form||!select||document.querySelector('#barcodePlanScan'))return;
    const label=document.createElement('label');label.className='hmi-barcode-field';label.innerHTML='<span>Scan PRO / barcode planning</span><input id="barcodePlanScan" inputmode="text" autocomplete="off" placeholder="Scan atau ketik PRO lalu Enter"><small id="barcodePlanHint">Scanner USB yang bertindak sebagai keyboard dapat digunakan langsung.</small>';
    form.insertBefore(label,select.closest('label'));
    const input=label.querySelector('input'),hint=label.querySelector('small');
    const resolve=()=>{const value=normalize(input.value);if(!value)return;const options=[...select.options].filter(o=>o.value);const found=options.find(o=>[o.value,o.dataset.pro,o.dataset.material,o.textContent].some(v=>{const n=normalize(v);return n&& (n===value||n.includes(value)||value.includes(n));}));if(found){select.value=found.value;select.dispatchEvent(new Event('change',{bubbles:true}));hint.textContent='Planning ditemukan dan dipilih: '+found.textContent.trim();hint.className='scan-ok';}else{hint.textContent='Tidak ada planning aktif yang cocok. Periksa barcode atau minta PPIC merilis planning.';hint.className='scan-warn';}};
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolve();}});input.addEventListener('change',resolve);
    const note=document.createElement('div');note.className='hmi-policy-note';note.textContent='UPDT yang tetap terbuka lebih dari 10 menit akan dieskalasikan otomatis ke Maintenance. Call Maintenance juga dapat dilakukan manual.';form.insertAdjacentElement('afterend',note);
  }
})();
