/* OEE Collaboraction Live Page Integrity v67 — align machine wall with telemetry authority. */
(()=>{
 function paint(){
  if(view!=='live')return;const telemetry=window.HMIOperationSafetyV60?.telemetry||{},rows=Array.isArray(telemetry.machines)?telemetry.machines:[],cards=[...document.querySelectorAll('.machine-live-card')];
  cards.forEach((card,i)=>{
   const s=rows[i];if(!s)return;card.dataset.machineCode=s.code||'';
   const header=card.querySelector('header>div');if(header&&!header.querySelector('.v67-machine-code')){const code=document.createElement('small');code.className='v67-machine-code';code.textContent=s.code||'—';header.append(code);}
   if(s.telemetry_trusted)return;
   const values=card.querySelectorAll('.machine-live-body>div strong');if(values[1]){values[1].textContent='—';values[1].title='Counter disembunyikan karena heartbeat/source telemetry belum authoritative.';}if(values[2]){values[2].textContent='—';values[2].title='Speed disembunyikan karena heartbeat/source telemetry belum authoritative.';}
   const foot=card.querySelector('footer');if(foot){const age=Number(s.heartbeat_age_seconds),ageText=Number.isFinite(age)?`${age} detik sejak heartbeat`:'umur heartbeat tidak tersedia';foot.classList.add('warn','v67-telemetry-foot');foot.textContent=`Telemetry belum authoritative · ${ageText} · ${s.source_type||'source belum diketahui'} · counter/speed disembunyikan`;}
  });
 }
 if(typeof liveMachines==='function'){const baseLiveV67=liveMachines;liveMachines=async function(...args){const out=await baseLiveV67(...args);paint();return out;};}
 window.LivePageIntegrityV67={paint};
})();
