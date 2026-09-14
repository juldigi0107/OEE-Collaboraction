/* BMJ OEE HMI Operation Safety v60 — fail closed on machine identity and telemetry freshness. */
(()=>{
 const SENTINEL='__RESELECT_REQUIRED__';
 const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 let telemetry={generated_at:null,freshness_seconds:180,machines:[]};
 const telemetryRow=code=>(telemetry.machines||[]).find(x=>norm(x.code)===norm(code));
 async function loadTelemetry(){try{telemetry=await api('/telemetry-status');}catch{telemetry={generated_at:null,freshness_seconds:180,machines:[]};}return telemetry;}
 function blockForReselect(requested,fallback){
  if(view!=='shopfloor')return;hmiMachine=SENTINEL;
  document.querySelectorAll('[data-machine]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  const headingEl=document.querySelector('#content .heading');let notice=document.querySelector('.v60-machine-reselect');if(!notice){notice=document.createElement('div');notice.className='notice v60-machine-reselect';headingEl?.insertAdjacentElement('afterend',notice);}
  notice.textContent=`Mesin ${requested||'yang dipilih'} tidak lagi tersedia pada overview. ${fallback?`Data fallback ${fallback} hanya ditampilkan untuk konteks dan tidak boleh dipakai untuk transaksi. `:''}Pilih mesin secara eksplisit sebelum menjalankan Start PRO, Downtime, Quality, Maintenance, atau Finish.`;
  document.querySelectorAll('#startRun input,#startRun select,#startRun button,.hmi-actions button,#stopDown,#callMtc,#ackMtc').forEach(el=>{el.disabled=true;el.setAttribute('aria-disabled','true');});
  const main=document.querySelector('.hmi-main');if(main)main.setAttribute('data-operation-locked','machine-reselect');
 }
 function machineExists(code){const key=norm(code);return !!key&&[...document.querySelectorAll('[data-machine]')].some(b=>norm(b.dataset.machine)===key);}
 function freshnessText(s){if(!s)return 'Telemetry machine belum terdaftar';if(!s.heartbeat_at)return `Heartbeat belum tersedia · source ${s.source_type||'belum diketahui'}`;const age=Number(s.heartbeat_age_seconds);return `${s.telemetry_trusted?'Telemetry fresh':'Telemetry tidak authoritative'} · ${Number.isFinite(age)?age+' detik sejak heartbeat':'umur heartbeat tidak tersedia'} · ${s.source_type||'source belum diketahui'}`;}
 function maskSelectedTelemetry(){
  if(view!=='shopfloor'||hmiMachine===SENTINEL)return;const s=telemetryRow(hmiMachine),trusted=!!s?.telemetry_trusted,live=document.querySelector('.live-metrics');
  document.querySelector('.v60-telemetry-warning')?.remove();if(trusted)return;
  const counter=live?.querySelector('.metric-big strong'),speed=live?.querySelector('.metric-pair>div:first-child strong');if(counter){counter.textContent='—';counter.title='Counter disembunyikan karena telemetry tidak fresh/authoritative.';}if(speed){speed.textContent='—';speed.title='Speed disembunyikan karena telemetry tidak fresh/authoritative.';}
  if(s?.run_id&&!s.auto_counter_finish_ready){const actual=document.querySelector('.run-kpis>div:nth-child(2) strong');if(actual){actual.textContent='—';actual.title='Actual live dari counter tidak authoritative untuk run ini.';}}
  const anchor=live||document.querySelector('.hmi-side'),notice=document.createElement('div');notice.className='notice v60-telemetry-warning';notice.textContent=`${freshnessText(s)}. Counter/speed yang tidak fresh ditampilkan sebagai —.${s?.run_id&&!s.auto_counter_finish_ready?' Finish PRO wajib memakai Actual Qty manual karena lineage counter awal/akhir tidak memenuhi syarat.':''}`;anchor?.insertAdjacentElement('afterend',notice);
 }
 function maskMachineWall(){
  if(view!=='live')return;document.querySelectorAll('.machine-live-card').forEach(card=>{const code=card.querySelector('.machine-live-head small')?.textContent?.trim(),s=telemetryRow(code);if(s?.telemetry_trusted)return;const values=card.querySelectorAll('.machine-live-body>div strong');if(values[1])values[1].textContent='—';if(values[2])values[2].textContent='—';const foot=card.querySelector('.machine-live-foot');if(foot){foot.classList.add('warn');foot.textContent=`${freshnessText(s)} · counter/speed tidak ditampilkan`;}});
 }
 function decorateFinish(run){
  const form=$('#v40Finish');if(!form)return;const s=(telemetry.machines||[]).find(x=>String(x.run_id||'')===String(run?.id||''));if(s?.auto_counter_finish_ready)return;const actual=form.elements.actual_qty;if(actual){actual.required=true;actual.placeholder='Wajib diisi manual';const label=actual.closest('label'),small=label?.querySelector('small');if(small)small.textContent='wajib manual · counter tidak authoritative';}
  const balance=$('#v40FinishBalance'),n=document.createElement('div');n.className='full notice v60-finish-manual';n.textContent=`Actual Qty manual wajib diisi. ${freshnessText(s)}${s&&!s.counter_start_trusted?' · counter awal run tidak trusted':''}.`;balance?.insertAdjacentElement('beforebegin',n);
  const baseDraw=()=>{const raw=String(actual?.value||'').trim(),save=$('#v40FinishSave');if(save&&raw==='')save.disabled=true;};actual?.addEventListener('input',baseDraw);baseDraw();
 }
 if(typeof finishDialog==='function'){const baseFinishV60=finishDialog;finishDialog=function(run){const out=baseFinishV60(run);queueMicrotask(()=>decorateFinish(run));return out;};}
 if(typeof shopfloor==='function'){
  const baseShopfloorV60=shopfloor;
  shopfloor=async function(...args){const requested=String(hmiMachine||''),explicitBefore=!!requested&&requested!==SENTINEL,out=await baseShopfloorV60(...args),fallback=String(hmiMachine||'');await loadTelemetry();if(requested===SENTINEL||explicitBefore&&!machineExists(requested)||explicitBefore&&norm(fallback)!==norm(requested))blockForReselect(requested===SENTINEL?'mesin sebelumnya':requested,fallback===SENTINEL?'':fallback);else maskSelectedTelemetry();return out;};
 }
 if(typeof liveMachines==='function'){const baseLiveV60=liveMachines;liveMachines=async function(...args){const out=await baseLiveV60(...args);await loadTelemetry();maskMachineWall();return out;};}
 window.HMIOperationSafetyV60={blockForReselect,machineExists,loadTelemetry,maskSelectedTelemetry,maskMachineWall,get telemetry(){return telemetry;}};
})();
