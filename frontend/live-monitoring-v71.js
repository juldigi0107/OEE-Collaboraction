/* OEE Collaboraction Live Monitoring v71 — machine-code keyed realtime renderer with fail-closed telemetry. */
(()=>{
 const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 const ageText=seconds=>Number.isFinite(Number(seconds))?(Number(seconds)<60?`${fmt(Number(seconds),0)} detik`:`${fmt(Number(seconds)/60,1)} menit`):'umur heartbeat tidak tersedia';
 const telemetryMap=rows=>new Map((rows||[]).map(x=>[norm(x.code),x]));
 let liveMonitoringTimer=null,lastSuccessAt=0,refreshing=false;
 function trustContext(machine,t){
  const trusted=t?.telemetry_trusted===true;
  const source=t?.source_type||machine?.source_type||'source belum diketahui';
  const age=t?.heartbeat_age_seconds;
  return {trusted,source,age,label:trusted?`Telemetry authoritative · ${ageText(age)}`:`Telemetry belum authoritative · ${ageText(age)} · ${source}`};
 }
 function machineCard(m,o,t){
  const r=(o.runs||[]).find(x=>x.machine_id===m.machine_id),d=(o.downtime||[]).find(x=>x.machine_id===m.machine_id),ctx=trustContext(m,t),state=String(m.state||'OFFLINE').toUpperCase(),klass=liveStateClass(state);
  const counter=ctx.trusted?fmt(Number(m.counter||0)):'—',speed=ctx.trusted?fmt(Number(m.speed||0),1):'—';
  const footer=d?`${esc(d.class)} · ${esc(d.reason||d.code||'Downtime')} · ${durationText(d.start_ts)}`:`${esc(ctx.label)}`;
  return `<article class="machine-live-card ${klass}" data-machine-code="${esc(m.code||'')}"><header><div><i class="state-dot ${klass}"></i><div><strong>${esc(m.name||m.code||'Mesin')}</strong><small>${esc(m.code||'—')}</small></div></div><span>${esc(state)}</span></header><div class="machine-live-body"><div><span>PRO</span><strong>${esc(r?.pro||m.pro||'—')}</strong></div><div><span>Counter</span><strong title="${ctx.trusted?'Telemetry fresh/external':'Disembunyikan karena telemetry belum authoritative'}">${counter}</strong></div><div><span>Speed</span><strong title="${ctx.trusted?'Telemetry fresh/external':'Disembunyikan karena telemetry belum authoritative'}">${speed}</strong></div><div><span>State Time</span><strong>${durationText(m.since_ts)}</strong></div></div><footer class="${ctx.trusted?'':'warn'}">${footer}</footer></article>`;
 }
 function lastSuccessText(){return lastSuccessAt?new Date(lastSuccessAt).toLocaleTimeString('id-ID'):'belum ada refresh sukses';}
 function markRefreshFailure(error){
  if(view!=='live')return;const root=$('#content');if(!root)return;let box=root.querySelector('#v71RefreshStatus');if(!box){box=document.createElement('div');box.id='v71RefreshStatus';box.className='errorbox';const wall=root.querySelector('.machine-wall'),kpis=root.querySelector('.v71-live-kpis');(wall||kpis||root.firstElementChild)?.insertAdjacentElement('beforebegin',box);if(!box.isConnected)root.prepend(box);}box.textContent='';const strong=document.createElement('strong'),span=document.createElement('span'),button=document.createElement('button');strong.textContent='Pembaruan realtime terputus.';span.textContent=` Data terakhir dipertahankan · refresh sukses terakhir ${lastSuccessText()}. ${String(error?.message||'Endpoint realtime belum dapat dihubungi.')}`;button.type='button';button.className='primary';button.textContent='Coba lagi';button.onclick=()=>liveMachines({manual:true}).catch(markRefreshFailure);box.append(strong,span,button);
 }
 function clearRefreshFailure(){const box=document.querySelector('#v71RefreshStatus');if(box)box.remove();}
 function initialFailure(error){
  const root=$('#content');if(!root)return;root.innerHTML=heading('Monitoring Realtime','Status mesin belum dapat dimuat dari backend operasional')+'<section class="panel"><div class="errorbox" id="v71InitialError"><strong>Monitoring realtime belum tersedia.</strong><span>Data tidak diganti dengan contoh atau snapshot lama tanpa penanda.</span></div><button type="button" class="primary" id="v71InitialRetry">Coba lagi</button></section>';const retry=$('#v71InitialRetry');if(retry)retry.onclick=()=>liveMachines({manual:true}).catch(markRefreshFailure);const box=$('#v71InitialError');if(box){const detail=document.createElement('small');detail.textContent=String(error?.message||'Endpoint realtime belum dapat dihubungi.');box.append(detail);}
 }
 function armRefresh(){if(liveMonitoringTimer)return;liveMonitoringTimer=setInterval(async()=>{if(view!=='live'||refreshing)return;try{await liveMachines({background:true});}catch(e){markRefreshFailure(e);}},5000);}
 liveMachines=async function(options={}){
  if(refreshing&&options.manual)return;refreshing=true;let overview,telemetry,error='';
  try{
   try{[overview,telemetry]=await Promise.all([api('/realtime/overview'),api('/telemetry-status')]);}
   catch(e){error=e?.message||'Status telemetry belum dapat dimuat';if(!overview)try{overview=await api('/realtime/overview');}catch(e2){if(document.querySelector('#content .machine-wall')){markRefreshFailure(e2);return;}initialFailure(e2);return;}}
   overview=overview||{};telemetry=telemetry||{machines:[]};const byCode=telemetryMap(telemetry.machines),machines=overview.machines||[],trusted=machines.filter(m=>byCode.get(norm(m.code))?.telemetry_trusted===true).length,untrusted=Math.max(0,machines.length-trusted),generated=overview.generated_at?new Date(overview.generated_at).toLocaleTimeString('id-ID'):'—';
   $('#content').innerHTML=heading('Monitoring Realtime','Status mesin berdasarkan overview operasional; Counter dan Speed hanya tampil dari telemetry fresh/external',`<span class="pill live-pill"><i></i>${esc(generated)}</span>`)+`${error?`<div class="errorbox">Telemetry authority belum dapat diverifikasi: ${esc(error)}. Counter dan Speed disembunyikan sampai endpoint kembali tersedia.</div>`:''}<div class="release-kpis v71-live-kpis"><div><span>Mesin terdaftar</span><strong>${fmt(machines.length)}</strong><small>overview aktif</small></div><div><span>Telemetry authoritative</span><strong>${fmt(trusted)}</strong><small>heartbeat fresh + external source</small></div><div><span>Telemetry ditahan</span><strong>${fmt(untrusted)}</strong><small>counter/speed disembunyikan</small></div><div><span>Downtime aktif</span><strong>${fmt((overview.downtime||[]).length)}</strong><small>PDT · UPDT · COJ</small></div></div><div class="machine-wall">${machines.map(m=>machineCard(m,overview,byCode.get(norm(m.code)))).join('')||'<div class="panel empty">Belum ada machine data realtime. Edge gateway dapat mulai mengirim event setelah koneksi mesin dipetakan.</div>'}</div>`;
   lastSuccessAt=Date.now();clearRefreshFailure();armRefresh();
  }finally{refreshing=false;}
 };
 window.LiveMonitoringV71={telemetryMap,trustContext,machineCard,armRefresh,markRefreshFailure,get lastSuccessAt(){return lastSuccessAt;}};
})();
