/* OEE Collaboraction Page Integrity v66 — explicit mutation context and decision audit detail. */
(()=>{
 const RESELECT='__RESELECT_REQUIRED__';
 const fmtTime=v=>{if(!v)return 'Waktu keputusan tidak tersedia';const d=new Date(v);return Number.isNaN(d.getTime())?'Waktu keputusan tidak valid':d.toLocaleString('id-ID');};
 if(typeof shopfloor==='function'){
  const baseShopfloorV66=shopfloor;
  shopfloor=async function(...args){
   if(!hmiMachine){
    try{const o=await api('/realtime/overview'),machines=Array.isArray(o?.machines)?o.machines:[];if(machines.length>1)hmiMachine=RESELECT;}
    catch{hmiMachine=RESELECT;}
   }
   const out=await baseShopfloorV66(...args);
   if(view==='shopfloor'&&hmiMachine===RESELECT){
    const strip=document.querySelector('.hmi-machine-strip');if(strip&&!strip.querySelector('.v66-machine-choice')){const n=document.createElement('div');n.className='notice v66-machine-choice';n.textContent='Pilih mesin secara eksplisit sebelum menjalankan aksi produksi. Tidak ada mesin yang dipilih otomatis ketika lebih dari satu mesin tersedia atau verifikasi daftar mesin belum berhasil.';strip.insertAdjacentElement('afterend',n);}
   }
   return out;
  };
 }
 function approvalMetadataNotice(message){
  if(view!=='approvals')return;const root=$('#content');if(!root)return;let box=root.querySelector('.v66-approval-metadata-warning');if(!box){box=document.createElement('div');box.className='errorbox v66-approval-metadata-warning';const history=root.querySelector('.approval-history');history?.insertAdjacentElement('beforebegin',box);if(!box.isConnected)root.prepend(box);}box.replaceChildren();const strong=document.createElement('strong'),span=document.createElement('span'),button=document.createElement('button');strong.textContent='Metadata audit keputusan belum dapat diverifikasi.';span.textContent=' Tabel keputusan utama tetap ditampilkan, tetapi reviewer, waktu keputusan, atau catatan tambahan mungkin belum lengkap. '+String(message||'');button.type='button';button.className='primary';button.textContent='Coba muat metadata';button.onclick=()=>{box.remove();const table=document.querySelector('.approval-history tbody');if(table)delete table.dataset.v66;decorateApprovalHistory();};box.append(strong,span,button);
 }
 async function decorateApprovalHistory(){
  if(view!=='approvals')return;const table=document.querySelector('.approval-history tbody');if(!table||table.dataset.v66)return;table.dataset.v66='loading';let data;
  try{data=await api('/approvals');}
  catch(err){delete table.dataset.v66;approvalMetadataNotice(err?.message||'Endpoint approval belum dapat dibaca.');return;}
  document.querySelector('.v66-approval-metadata-warning')?.remove();table.dataset.v66='1';const history=(data.rows||[]).filter(x=>x.status!=='PENDING').slice(0,100),trs=[...table.querySelectorAll('tr')];trs.forEach((tr,i)=>{const a=history[i];if(!a)return;const requester=tr.children[4],status=tr.children[5];if(requester&&!requester.querySelector('.v66-decision-owner')){const meta=document.createElement('small');meta.className='v66-decision-owner';meta.textContent=`Keputusan: ${a.decided_by_name||'System / reviewer'} · ${fmtTime(a.decided_ts)}`;requester.append(meta);}if(status&&a.note&&!status.querySelector('.v66-decision-note')){const note=document.createElement('small');note.className='v66-decision-note';note.textContent='Catatan: '+String(a.note);status.append(note);}});
 }
 const baseRenderV66=typeof render==='function'?render:null;
 if(baseRenderV66){render=async function(...args){const out=await baseRenderV66(...args);if(view==='approvals')queueMicrotask(()=>decorateApprovalHistory().catch(err=>approvalMetadataNotice(err?.message)));return out;};}
 window.PageIntegrityV66={decorateApprovalHistory,approvalMetadataNotice};
})();
