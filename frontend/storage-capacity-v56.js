/* BMJ OEE D1 Capacity Guard v56 — release-facing storage headroom without auto-purge. */
(()=>{
 const baseRenderV56=render;
 render=async function(...args){const out=await baseRenderV56(...args);if(view==='support-recovery')queueMicrotask(()=>paint().catch(()=>{}));return out;};
 const mib=v=>Number.isFinite(Number(v))?(Number(v)/1048576).toLocaleString('id-ID',{maximumFractionDigits:1})+' MiB':'—';
 const pctv=v=>Number.isFinite(Number(v))?(Number(v)*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'—';
 const statusLabel=s=>({ok:'Aman',warning:'Perlu perhatian',critical:'Kritis',unknown:'Belum dapat dibaca'}[s]||'Belum dapat dibaca');
 async function paint(){
  if(view!=='support-recovery')return;const root=$('#content');if(!root||root.querySelector('.v56-capacity'))return;
  let data;try{data=await api('/storage-health');}catch{return;}const c=data?.capacity||{},section=document.createElement('section');section.className='panel v56-capacity '+(c.status||'unknown');
  if(c.available!==true){section.innerHTML=`<div class="release-section-head"><div><h2>D1 Capacity Guard</h2><p>Kapasitas database tidak dapat dibaca dari SQLite page metrics pada runtime ini.</p></div><span class="release-status warn">Belum terukur</span></div><div class="v56-note">${esc(c.note||'Pantau kapasitas langsung dari Cloudflare D1 sebelum go-live atau import besar.')}</div>`;}
  else{
   const ratio=Number(c.soft_budget_usage_ratio||0),width=Math.max(0,Math.min(100,ratio*100)),headroom=Number(c.headroom_to_soft_budget_bytes||0),active=Number(c.active_page_estimate_bytes||0),allocated=Number(c.allocated_bytes||0),freePages=Number(c.free_pages||0);
   section.innerHTML=`<div class="release-section-head"><div><h2>D1 Capacity Guard</h2><p>Guard kapasitas aplikasi untuk menjaga deployment D1-only tetap terkendali tanpa menghapus histori bisnis otomatis.</p></div><span class="release-status ${c.status==='ok'?'ok':c.status==='critical'?'danger':'warn'}">${esc(statusLabel(c.status))}</span></div><div class="v56-grid"><div><span>Allocated database</span><strong>${mib(allocated)}</strong><small>SQLite page_count × page_size</small></div><div><span>Active page estimate</span><strong>${mib(active)}</strong><small>allocated dikurangi freelist</small></div><div><span>Soft budget</span><strong>${mib(c.soft_budget_bytes)}</strong><small>guard aplikasi</small></div><div><span>Headroom soft budget</span><strong>${mib(headroom)}</strong><small>${pctv(1-ratio)} tersisa terhadap soft budget</small></div><div><span>Architecture ceiling</span><strong>${mib(c.architecture_ceiling_bytes)}</strong><small>ceiling desain proyek</small></div><div><span>Free pages</span><strong>${fmt(freePages)}</strong><small>belum berarti file fisik menyusut</small></div></div><div class="v56-meter" role="img" aria-label="Pemakaian soft budget D1 ${pctv(ratio)}"><span style="width:${width}%"></span></div><div class="v56-meter-label"><span>Pemakaian soft budget ${pctv(ratio)}</span><span>${mib(headroom)} headroom</span></div><div class="v56-note">${esc(c.note||'Business history dipertahankan. Lakukan capacity review sebelum import besar.')}</div>`;
  }
  const hero=root.querySelector('.sr21-hero');if(hero)hero.insertAdjacentElement('afterend',section);else root.querySelector('.sr21-grid')?.insertAdjacentElement('beforebegin',section);
 }
 window.StorageCapacityV56={paint};
})();
