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
  const dashboardV11=dashboard;
  dashboard=async function(){
    await dashboardV11();
    renderDataContext();
    await renderRoleOperationalKpi(user?.role==='superadmin'?'PROD':user?.department);
  };
  function renderDataContext(){
    const content=$('#content');if(!content)return;
    const subtitle=content.querySelector('.heading .muted');if(subtitle)subtitle.textContent='Snapshot sumber terpetakan dan KPI operasional dari D1/live';
    if(content.querySelector('.role-data-context'))return;
    const headingEl=content.querySelector('.heading');if(!headingEl)return;
    const context=document.createElement('div');context.className='role-data-context';
    context.innerHTML='<div><strong>Konteks historis</strong><span>Snapshot workbook ditampilkan sesuai periode transaksi/cell sumber</span></div><div><strong>Operasional</strong><span>KPI department: D1 dan event live yang tersedia</span></div><div><strong>Aturan periode</strong><span>Tanggal transaksi/tanggal kerja menjadi acuan; nama file tidak dijadikan periode</span></div>';
    headingEl.insertAdjacentElement('afterend',context);
  }
  async function renderRoleOperationalKpi(dept){
    const content=$('#content');if(!content)return;
    let data;try{data=await api('/role-dashboard?department='+encodeURIComponent(dept));}catch(e){return;}
    let host=content.querySelector('.role-operational-kpi');
    if(!host){host=document.createElement('section');host.className='panel role-operational-kpi';const focus=content.querySelector('.role-focus-panel');if(focus)focus.insertAdjacentElement('beforebegin',host);else content.append(host);}
    const department=data.department||dept;
    host.innerHTML=`<div class="release-section-head"><div><h2>KPI Operasional · ${esc(departments[department]||department)}</h2><p>Data dihitung dari D1 dan event live yang tersedia. Nilai kosong tidak diganti dengan estimasi.</p></div>${user?.role==='superadmin'?`<label class="role-dept-select">Fokus<select id="roleDeptSelect">${Object.entries(departments).map(([k,n])=>`<option value="${k}" ${k===department?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}</div><div class="role-kpi-grid">${(data.metrics||[]).map(m=>`<article><span>${esc(m.label)}</span><strong>${esc(metricValue(m))}</strong><small>${esc(m.source||'D1')}</small>${m.note?`<p>${esc(m.note)}</p>`:''}</article>`).join('')||'<div class="release-empty">Belum ada KPI operasional untuk department ini.</div>'}</div>`;
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
    let data;try{data=await api('/entries?module=master&page=0&q='+encodeURIComponent(klass));}catch{return;}
    const items=(data.rows||[]).map(r=>{try{return JSON.parse(r.payload)}catch{return {}}}).filter(p=>p.code||p.value);
    if(!items.length)return;
    const id='downtimeReasonList';let list=document.getElementById(id);if(!list){list=document.createElement('datalist');list.id=id;document.body.append(list);modal.addEventListener('close',()=>list.remove(),{once:true});}
    list.replaceChildren(...items.slice(0,80).map(p=>{const o=document.createElement('option');o.value=String(p.code||p.value||'');o.label=String(p.value||p.title||p.reason||p.code||'');return o;}));
    input.setAttribute('list',id);input.placeholder='Pilih / scan kode loss time';
    const hint=document.createElement('small');hint.className='downtime-master-hint';hint.textContent=`Saran kode diambil dari Master Data yang cocok dengan ${klass}. Jika belum tersedia, input tetap dicatat untuk rekonsiliasi master.`;input.insertAdjacentElement('afterend',hint);
  }
})();
