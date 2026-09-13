/* BMJ OEE Release v11 — approval workflow, role focus, and final operational presentation. */
(()=>{
  const approvalDept=t=>t==='quality'?'QC':'PROD';
  const approvalType=t=>({production_run:'Hasil Produksi',downtime:'Downtime',quality:'Quality Event'}[t]||t);
  const approvalStep=s=>({FINAL_VERIFY:'Verifikasi hasil akhir',ROOT_CAUSE_VERIFY:'Verifikasi root cause',QC_VERIFY:'Verifikasi QC',VERIFY:'Verifikasi'}[s]||s||'Verifikasi');
  const statusName=s=>({PENDING:'Menunggu verifikasi',APPROVED:'Disetujui',REJECTED:'Ditolak',FINISHED:'Selesai',VERIFIED:'Terverifikasi'}[s]||s||'Tercatat');
  const statusClass=s=>s==='APPROVED'||s==='VERIFIED'?'ok':s==='REJECTED'?'danger':s==='PENDING'?'warn':'neutral';
  const deptModules={
    PROD:['production','downtime','batch','energy','logbook','checklist'],
    QC:['quality','process'],MTC:['maintenance'],PPIC:['planning','confirmation'],PDS:['development'],PROJECT:['project','master']
  };
  const moduleIcon={production:'production',downtime:'clock',batch:'database',energy:'trend',logbook:'documents',checklist:'validation',quality:'quality',process:'trend',maintenance:'maintenance',planning:'planning',confirmation:'documents',development:'development',project:'project',master:'database'};
  const parsePayload=r=>{try{return JSON.parse(r?.payload||'{}')}catch{return {}}};
  const labelStatus=(s)=>`<span class="release-status ${statusClass(s)}">${esc(statusName(s))}</span>`;

  const shellV10=shell;
  shell=function(){
    shellV10();
    const nav=document.querySelector('.navscroll');
    if(!nav||document.querySelector('[data-view="approvals"]'))return;
    const mayReview=user?.role==='superadmin'||(user?.role==='admin'&&['PROD','QC'].includes(user.department));
    if(!mayReview)return;
    const btn=document.createElement('button');btn.className='nav';btn.dataset.view='approvals';btn.innerHTML=`${icon('validation')}<span>Approval & Verifikasi</span>`;btn.onclick=()=>navigate('approvals');
    const settings=nav.querySelector('[data-view="settings"]');
    const governance=nav.querySelector('[data-view="governance"]');
    if(governance)governance.insertAdjacentElement('beforebegin',btn);else if(settings)settings.insertAdjacentElement('beforebegin',btn);else nav.append(btn);
  };

  const renderV10=render;
  render=async function(){
    if(view==='approvals')return approvalWorkspace();
    const result=await renderV10();
    queueMicrotask(()=>{if(view==='settings')polishTechnicalSettings();});
    return result;
  };

  async function approvalWorkspace(){
    const data=await api('/approvals'),rows=data.rows||[],s=data.summary||{};
    const pending=rows.filter(x=>x.status==='PENDING'),history=rows.filter(x=>x.status!=='PENDING');
    $('#content').innerHTML=heading('Approval & Verifikasi','Antrean verifikasi hasil produksi, downtime, dan quality sesuai kewenangan department')+
      `<div class="release-kpis approval-kpis"><div><span>Menunggu</span><strong>${fmt(s.pending||0)}</strong><small>perlu keputusan</small></div><div><span>Disetujui</span><strong>${fmt(s.approved||0)}</strong><small>dalam 250 aktivitas terakhir</small></div><div><span>Ditolak</span><strong>${fmt(s.rejected||0)}</strong><small>perlu tindak lanjut</small></div><div><span>Cakupan</span><strong>${user.role==='superadmin'?'Semua':esc(departments[user.department]||user.department)}</strong><small>mengikuti role & permission</small></div></div>`+
      `<section class="panel"><div class="release-section-head"><div><h2>Menunggu keputusan</h2><p>Request dibuat otomatis setelah event operasional selesai.</p></div>${pending.length?`<span class="release-status warn">${pending.length} pending</span>`:''}</div>${approvalTable(pending,true)}</section>`+
      `<section class="panel approval-history"><div class="release-section-head"><div><h2>Riwayat keputusan</h2><p>Jejak keputusan terakhir; data operasional asli tetap dipertahankan.</p></div></div>${approvalTable(history.slice(0,100),false)}</section>`;
    bindApprovalActions();
  }
  function approvalTable(rows,actionable){
    if(!rows.length)return '<div class="release-empty">Tidak ada item pada antrean ini.</div>';
    return `<div class="tablewrap"><table class="release-table"><thead><tr><th>Waktu</th><th>Jenis</th><th>Mesin / PRO</th><th>Ringkasan</th><th>Requester</th><th>Status</th>${actionable?'<th>Keputusan</th>':''}</tr></thead><tbody>${rows.map(a=>{const e=a.entity||{};const summary=a.entity_type==='production_run'?`Actual ${fmt(Number(e.actual_qty||0))} · Good ${fmt(Number(e.good_qty||0))} · Reject ${fmt(Number(e.reject_qty||0))}`:a.entity_type==='downtime'?`${esc(e.class||'')} · ${esc(e.code||e.reason||'')} ${e.root_cause?`<small>Root cause: ${esc(e.root_cause)}</small>`:''}`:`Sample ${fmt(Number(e.sample_qty||0))} · Reject ${fmt(Number(e.reject_qty||0))} · ${esc(e.decision||'')}`;const canDecide=a.status==='PENDING'&&(user.role==='superadmin'||can(approvalDept(a.entity_type),'update'));return `<tr><td>${esc(new Date(a.requested_ts).toLocaleString('id-ID'))}<small>${esc(approvalStep(a.step))}</small></td><td><strong>${esc(approvalType(a.entity_type))}</strong></td><td>${esc(e.machine_name||e.machine||'—')}<small>${esc(e.pro||'')}</small></td><td>${summary}</td><td>${esc(a.requested_by_name||'System / user')} ${a.note?`<small>${esc(a.note)}</small>`:''}</td><td>${labelStatus(a.status)}</td>${actionable?`<td>${canDecide?`<div class="approval-actions"><button class="approve" data-approval="${esc(a.id)}" data-decision="APPROVED">Setujui</button><button class="reject" data-approval="${esc(a.id)}" data-decision="REJECTED">Tolak</button></div>`:'<small>View only</small>'}</td>`:''}</tr>`;}).join('')}</tbody></table></div>`;
  }
  function bindApprovalActions(){
    document.querySelectorAll('[data-approval]').forEach(btn=>btn.onclick=()=>{const decision=btn.dataset.decision,id=btn.dataset.approval;dialog(decision==='APPROVED'?'Setujui verifikasi':'Tolak verifikasi',`<form id="approvalDecision" class="approval-decision"><p>${decision==='APPROVED'?'Konfirmasi bahwa data telah diperiksa dan dapat diterima.':'Tuliskan alasan penolakan agar owner dapat melakukan koreksi.'}</p><label>Catatan keputusan<textarea name="note" ${decision==='REJECTED'?'required':''} placeholder="Catatan verifikasi / tindak lanjut"></textarea></label><button class="primary">${decision==='APPROVED'?'Setujui':'Simpan penolakan'}</button></form>`);$('#approvalDecision').onsubmit=async e=>{e.preventDefault();const note=new FormData(e.target).get('note');try{await api('/approvals/decide','POST',{id,status:decision,note});modal.close();toast(decision==='APPROVED'?'Verifikasi disetujui.':'Verifikasi ditolak dan tercatat.');approvalWorkspace();}catch(err){toast(err.message);}};});
  }

  const dashboardV10=dashboard;
  dashboard=async function(){
    await dashboardV10();
    await appendRoleFocus();
  };
  async function appendRoleFocus(){
    const dept=user?.department||'PROJECT';
    const list=(deptModules[dept]||[]).slice(0,6);
    if(!list.length||!$('#content'))return;
    const result=await Promise.all(list.map(async module=>{try{return [module,await api('/entries?module='+encodeURIComponent(module)+'&page=0&q=')];}catch{return [module,{rows:[],total:0}];}}));
    let approval=null;if(user.role==='superadmin'||(user.role==='admin'&&['PROD','QC'].includes(dept))){try{approval=await api('/approvals');}catch{}}
    const section=document.createElement('section');section.className='panel role-focus-panel';
    section.innerHTML=`<div class="release-section-head"><div><h2>Fokus ${esc(departments[dept]||dept)}</h2><p>Ringkasan register aktual sesuai role Anda; bukan angka estimasi.</p></div>${approval?`<button id="openPendingApproval">${fmt(approval.summary?.pending||0)} menunggu verifikasi</button>`:''}</div><div class="role-focus-grid">${result.map(([module,d])=>{const latest=d.rows?.[0],p=parsePayload(latest);return `<button data-focus-module="${module}"><span class="role-focus-icon">${icon(moduleIcon[module]||'database')}</span><strong>${fmt(d.total||0)}</strong><b>${esc(modules[module]?.[0]||module)}</b><small>${latest?`${esc(p.date||'')} · ${esc(p.status||'Tercatat')}`:'Belum ada transaksi pada register'}</small></button>`;}).join('')}</div>`;
    $('#content').append(section);
    section.querySelectorAll('[data-focus-module]').forEach(b=>b.onclick=()=>{opModule=b.dataset.focusModule;navigate('operations');});
    if($('#openPendingApproval'))$('#openPendingApproval').onclick=()=>navigate('approvals');
  }

  const operationsBase=operations;
  operations=async function(){
    await operationsBase();
    polishOperations();
  };
  function polishOperations(){
    const root=$('#content');if(!root)return;
    const [label,dept]=modules[opModule]||[opModule,'PROJECT'];
    const h=root.querySelector('.heading h1');if(h)h.textContent=label;
    const desc=root.querySelector('.heading .muted');if(desc)desc.textContent=`Register transaksi ${departments[dept]||dept} · data baru, histori pemetaan, dan jejak perubahan`;
    const headingEl=root.querySelector('.heading');
    if(headingEl&&!root.querySelector('.operation-release-summary')){
      const summary=document.createElement('div');summary.className='operation-release-summary';summary.innerHTML=`<div><span>Total register</span><strong>${fmt(total)}</strong></div><div><span>Kewenangan</span><strong>${can(dept,'create')?'Input & edit':'View only'}</strong></div><div><span>Pemilik proses</span><strong>${esc(departments[dept]||dept)}</strong></div><div><span>Traceability</span><strong>Aktif</strong></div>`;headingEl.insertAdjacentElement('afterend',summary);
    }
    root.querySelectorAll('.tablewrap tbody tr').forEach(tr=>{const cell=tr.children[3];if(!cell||cell.querySelector('.release-status'))return;const value=cell.textContent.trim();cell.textContent='';cell.insertAdjacentHTML('beforeend',labelStatus(value));});
    const empty=root.querySelector('.empty');if(empty)empty.textContent='Belum ada transaksi pada register ini. Gunakan data historis sumber untuk penelusuran atau tambah transaksi baru sesuai kewenangan.';
  }

  const shopfloorV10=shopfloor;
  shopfloor=async function(refresh=false){
    const result=await shopfloorV10(refresh);
    await enhanceMaintenanceClosure();
    return result;
  };
  async function enhanceMaintenanceClosure(){
    const card=document.querySelector('.escalation-card');if(!card)return;
    let overview;try{overview=await api('/realtime/overview');}catch{return;}
    const machine=(overview.machines||[]).find(m=>m.code===hmiMachine)||(overview.machines||[])[0];
    const call=(overview.maintenance||[]).find(x=>x.machine_id===machine?.machine_id);if(!call)return;
    if(!card.querySelector('.maintenance-timeline')){
      const timeline=document.createElement('div');timeline.className='maintenance-timeline';timeline.innerHTML=`<span>Requested <strong>${esc(new Date(call.requested_ts).toLocaleString('id-ID'))}</strong></span>${call.acknowledged_ts?`<span>Acknowledged <strong>${esc(new Date(call.acknowledged_ts).toLocaleString('id-ID'))}</strong></span>`:''}`;card.append(timeline);
    }
    if(call.status==='ACKNOWLEDGED'&&can('MTC','update')&&!card.querySelector('#closeMtc')){
      const btn=document.createElement('button');btn.id='closeMtc';btn.className='primary';btn.textContent='Close Maintenance';card.append(btn);btn.onclick=()=>closeMaintenanceDialog(call);
    }
  }
  function closeMaintenanceDialog(call){
    dialog('Close Maintenance',`<form id="closeMaintenanceForm" class="approval-decision"><p>Isi tindakan penyelesaian sebelum maintenance call ditutup.</p><label>Tindakan / hasil perbaikan<textarea name="note" required placeholder="Contoh: sensor diganti, alignment dikoreksi, test run normal"></textarea></label><button class="primary">Tutup Maintenance</button></form>`);
    $('#closeMaintenanceForm').onsubmit=async e=>{e.preventDefault();const note=new FormData(e.target).get('note');try{await api('/shopfloor/maintenance/close','POST',{id:call.id,note});modal.close();toast('Maintenance call ditutup dan tercatat.');shopfloor();}catch(err){toast(err.message);}};
  }

  function polishTechnicalSettings(){
    const root=$('#content');if(!root||root.querySelector('.technical-settings-note'))return;
    const headingEl=root.querySelector('.heading');if(!headingEl)return;
    const note=document.createElement('div');note.className='technical-settings-note';note.innerHTML='<strong>Konfigurasi teknis lanjutan</strong><span>Gunakan Tata Kelola & Readiness untuk kebutuhan operasional, owner, terminology, dan readiness lapangan. Parameter JSON di halaman ini dipertahankan untuk administrator teknis dan integrasi.</span>';
    headingEl.insertAdjacentElement('afterend',note);
  }
})();
