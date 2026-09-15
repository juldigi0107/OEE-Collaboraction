/* OEE Collaboraction Support Evidence v74 — visible semantic coverage for release evidence. */
(()=>{
 const n=v=>Number.isFinite(Number(v))?Number(v):null;
 const shown=v=>n(v)===null?'—':fmt(n(v));
 const ratio=(a,b)=>{a=n(a);b=n(b);return a===null||b===null||b<=0?'—':pct(a/b);};
 async function paint(){
  if(view!=='support-recovery'||user?.role!=='superadmin')return;
  const root=$('#content');if(!root||root.querySelector('.support-evidence-v74'))return;
  let m;try{m=await api('/release-manifest');}catch{return;}
  const c=m?.data_coverage||{},q=c.quality_units||{},p=c.production_units||{},d=c.pds_currency||{},e=c.energy||{},pc=c.process_capability||{},fp=Array.isArray(m?.release_fingerprint)?m.release_fingerprint:[];
  const qMissing=n(q.missing_unit)||0,pMissing=n(p.missing_unit)||0,dMissing=n(d.cost_missing_currency)||0,eUndated=n(e.undated_or_invalid_date)||0,issues=qMissing+pMissing+dMissing+eUndated;
  const sec=document.createElement('section');sec.className='panel sr21-wide support-evidence-v74';
  sec.innerHTML=`<div class="release-section-head"><div><h2>Cakupan Semantik Data</h2><p>Evidence kelengkapan satuan, currency, tanggal, dan kesiapan data capability. Nilai legacy yang belum lengkap tidak ditebak.</p></div><span class="release-status ${issues?'warn':'ok'}">${issues?`${fmt(issues)} item perlu rekonsiliasi`:'Coverage kritis konsisten'}</span></div><div class="release-kpis"><div><span>Quality · unit diketahui</span><strong>${shown(q.with_unit)} / ${shown(q.total)}</strong><small>${ratio(q.with_unit,q.total)} coverage · ${shown(q.missing_unit)} tanpa unit</small></div><div><span>Production run · unit diketahui</span><strong>${shown(p.with_unit)} / ${shown(p.total)}</strong><small>${ratio(p.with_unit,p.total)} coverage · ${shown(p.missing_unit)} legacy tanpa unit</small></div><div><span>PDS cost · currency lengkap</span><strong>${shown((n(d.with_cost)||0)-(n(d.cost_missing_currency)||0))} / ${shown(d.with_cost)}</strong><small>${shown(d.cost_missing_currency)} cost record tanpa currency</small></div><div><span>Energy · kWh valid</span><strong>${shown(e.valid_kwh)} / ${shown(e.total)}</strong><small>${shown(e.valid_date)} tanggal valid · ${shown(e.undated_or_invalid_date)} tanggal perlu rekonsiliasi</small></div><div><span>Process · measurement lengkap</span><strong>${shown(pc.complete_measurement)} / ${shown(pc.total)}</strong><small>${shown(pc.with_valid_spec)} dengan LSL/USL valid · ${shown(pc.with_subgroup)} dengan Subgroup ID</small></div></div><div class="sr21-list"><div><span>Policy Quality</span><small>${esc(q.aggregation_policy||'Kuantitas tidak dijumlahkan lintas unit.')}</small></div><div><span>Policy Production Unit</span><small>${esc(p.policy||'Unit run legacy tidak ditebak.')}</small></div><div><span>Policy Development Cost</span><small>${esc(d.policy||'Biaya tidak dijumlahkan lintas currency.')}</small></div><div><span>Policy Energy / ENPI</span><small>${esc(e.policy||'Energy mengikuti tanggal transaksi; ENPI menunggu denominator authoritative.')}</small></div><div><span>Policy Process Capability</span><small>${esc(pc.policy||'Ppk mengikuti subset konsisten; Cpk membutuhkan rational subgroup yang memadai.')}</small></div></div><details class="sheetinfo"><summary>Capability fingerprint build · ${fmt(fp.length)} capability</summary><p>${fp.map(esc).join(' · ')||'Fingerprint belum tersedia.'}</p></details>`;
  const hero=root.querySelector('.sr21-hero');if(hero)hero.insertAdjacentElement('afterend',sec);else root.append(sec);
 }
 const baseRender=typeof render==='function'?render:null;
 if(baseRender){render=async function(...args){const out=await baseRender(...args);if(view==='support-recovery')queueMicrotask(()=>paint().catch(()=>{}));return out;};}
 window.SupportEvidenceV74={paint};
})();
