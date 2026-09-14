/* BMJ OEE role dashboard v12 — department KPI context and controlled downtime reasons. */
(()=>{
  const metricValue=m=>{
    if(m.value===null||m.value===undefined||!Number.isFinite(Number(m.value)))return '—';
    const v=Number(m.value);
    if(m.unit==='ratio')return pct(v);
    if(m.unit==='persen')return fmt(v,1)+'%';
    if(m.unit==='Rp')return 'Rp '+fmt(v);
    return fmt(v,1)+(m.unit?' '+m.unit:'');
  };
  const metricLabel=(m,dept)=>dept==='MTC'&&m.key==='mtbf'?'MTBF fleet · live estimate':dept==='MTC'&&m.key==='mttr'?'MTTR fleet · maintenance live':m.label;
  const dashboardV11=dashboard;
  dashboard=async function(){
    await dashboardV11();
    renderDataContext();
    renderKpiGovernanceNotice();
    await renderRoleOperationalKpi(user?.role==='superadmin'?'PROD':user?.department);
  };
  function renderDataContext(){
    const content=$('#content');if(!content)return;
    const subtitle=content.querySelector('.heading .muted');if(subtitle)subtitle.textContent='Snapshot sumber terpetakan dan KPI operasional dari D1/live';
    if(content.querySelector('.role-data-context'))return;
    const headingEl=content.querySelector('.heading');if(!headingEl)return;
    const context=document.createElement('div');context.className='role-data-context';
    context.innerHTML='<div><strong>Konteks data historis</strong><span>Snapshot workbook ditampilkan sesuai periode transaksi/cell sumber</span></div><div><strong>Operasional</strong><span>KPI department: D1 dan event live yang tersedia</span></div><div><strong>Aturan periode</strong><span>Tanggal transaksi/tanggal kerja menjadi acuan; nama file tidak dijadikan periode</span></div>';
    headingEl.insertAdjacentElement('afterend',context);
  }
  function renderKpiGovernanceNotice(){
    const content=$('#content');if(!content||!window.DG16)return;const cfg=DG16.read(DG16.keys.kpi),approved=DG16.approved(cfg),notice=[...content.querySelectorAll('.notice')].find(x=>/Quality Printing|\bNC\b/i.test(x.textContent||''));if(!notice)return;
    notice.textContent='';const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=approved?'Definisi Quality Printing disahkan:':'Definisi Quality Printing belum disahkan:';
    const rules={good_total:'Good / Total',good_nc_total:'(Good + NC) / Total'};span.textContent=approved?` ${rules[cfg.quality_rule]||cfg.quality_rule||'rule governance'} menjadi rule authoritative. Snapshot workbook tetap ditampilkan apa adanya dan tidak ditulis ulang.`:' dashboard hanya menampilkan snapshot sumber. Good vs Good+NC tidak diasumsikan sampai owner menyelesaikan Data Governance.';
    notice.append(strong,span);notice.classList.toggle('ok',approved);notice.classList.toggle('warn',!approved);
  }
  async function renderRoleOperationalKpi(dept){
    const content=$('#content');if(!content)return;
    let data;try{data=await api('/role-dashboard?department='+encodeURIComponent(dept));}catch(e){return;}
    let host=content.querySelector('.role-operational-kpi');
    if(!host){host=document.createElement('section');host.className='panel role-operational-kpi';const focus=content.querySelector('.role-focus-panel');if(focus)focus.insertAdjacentElement('beforebegin',host);else content.append(host);}
    const department=data.department||dept,updated=data.generated_at?new Date(data.generated_at).toLocaleString('id-ID'):'waktu server tidak tersedia',scopeNote=department==='MTC'?'MTBF/MTTR live di sini adalah indikator fleet dari event D1 yang tersedia, bukan pengganti KPI historis sampai definisi dan source authority disahkan.':department==='QC'?'Kuantitas QC live ditampilkan per satuan. Event lama tanpa satuan tidak dimasukkan ke total kuantitas lintas unit.':'KPI live tidak mengganti definisi historis/source authority yang belum disahkan.';
    host.innerHTML=`<div class="release-section-head"><div><h2>KPI Operasional · ${esc(departments[department]||department)}</h2><p>Data dihitung dari D1 dan event live yang tersedia. Nilai kosong tidak diganti dengan estimasi. Diperbarui ${esc(updated)}.</p></div>${user?.role==='superadmin'?`<label class="role-dept-select">Fokus<select id="roleDeptSelect">${Object.entries(departments).map(([k,n])=>`<option value="${k}" ${k===department?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}</div><div class="role-kpi-grid">${(data.metrics||[]).map(m=>`<article><span>${esc(metricLabel(m,department))}</span><strong>${esc(metricValue(m))}</strong><small>${esc(m.source||'D1')}</small>${m.note?`<p>${esc(m.note)}</p>`:''}</article>`).join('')||'<div class="release-empty">Belum ada KPI operasional untuk department ini.</div>'}</div><p class="muted role-kpi-scope">${esc(scopeNote)}</p>`;
    const sel=host.querySelector('#roleDeptSelect');if(sel)sel.onchange=()=>renderRoleOperationalKpi(sel.value);
  }

  if(typeof downtimeDialog==='function'){
    const downtimeDialogBase=downtimeDialog;
    downtimeDialog=function(run,klass){
      downtimeDialogBase(run,klass);
      enhanceDowntimeMaster(klass).catch(()=>{});
    };
  }
  async function enhanceDowntimeMaster(klass){
    const input=document.querySelector('#downForm input[name="code"]');if(!input)return;
    const approvedLoss=window.OC31?OC31.read(OC31.keys.loss):null;
    if(window.OC31&&OC31.approved(approvedLoss))return;
    let data;try{data=await api('/entries?module=master&page=0&q='+encodeURIComponent(klass));}catch{return;}
    const items=(data.rows||[]).map(r=>{try{return JSON.parse(r.payload)}catch{return {}}}).filter(p=>p.code||p.value);
    if(!items.length)return;
    const id='downtimeReasonList';let list=document.getElementById(id);if(!list){list=document.createElement('datalist');list.id=id;document.body.append(list);modal.addEventListener('close',()=>list.remove(),{once:true});}
    list.replaceChildren(...items.slice(0,80).map(p=>{const o=document.createElement('option');o.value=String(p.code||p.value||'');o.label=String(p.value||p.title||p.reason||p.code||'');return o;}));
    input.setAttribute('list',id);input.placeholder='Pilih / scan kode loss time';
    const hint=document.createElement('small');hint.className='downtime-master-hint';hint.textContent=`Baseline Loss-Time resmi belum disahkan. Saran sementara diambil dari Master Data yang cocok dengan ${klass} untuk rekonsiliasi owner proses.`;input.insertAdjacentElement('afterend',hint);
  }
})();
