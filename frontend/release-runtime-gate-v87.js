/* OEE Collaboraction Release Runtime Gate v87 — operational-ready is earned only after runtime health is verified. */
(()=>{
 const checks=[
  {key:'workflow',label:'Workflow Consistency',path:'/workflow-health',ready:d=>d?.ready===true},
  {key:'mirror',label:'Source Mirror Consistency',path:'/mirror-health',ready:d=>d?.ready===true},
  {key:'invariants',label:'Shopfloor Invariants',path:'/runtime-invariants',ready:d=>d?.ready===true},
  {key:'calendar',label:'Work Calendar Authority',path:'/work-calendar/context',ready:d=>d?.runtime_ready===true&&!!d?.shift}
 ];
 let cycle=0,lastResults=[];
 function badge(){return document.querySelector('.release18-summary .uat17-status');}
 function summary(){return document.querySelector('.release18-summary');}
 function retryButton(host){let b=host?.querySelector('.v87-runtime-retry');if(!b&&host){b=document.createElement('button');b.type='button';b.className='v87-runtime-retry';b.textContent='Verifikasi ulang runtime';b.onclick=()=>verify().catch(()=>{});host.append(b);}return b;}
 function removeRetry(host){host?.querySelector('.v87-runtime-retry')?.remove();}
 function staticReadyOf(b){
  const observed=b.classList.contains('ok')&&/Operational ready/i.test(b.textContent||'');
  if(observed&&b.dataset.runtimeVerified!=='true'){b.dataset.staticReady='true';return true;}
  if(b.dataset.staticReady==='true')return true;
  if(b.dataset.staticReady==='false')return false;
  b.dataset.staticReady=observed?'true':'false';return observed;
 }
 function setPending(b,text,title){b.classList.remove('ok');b.classList.add('pending');b.textContent=text;b.title=title||'';b.dataset.runtimeVerified='false';}
 function setReady(b,host){b.classList.remove('pending');b.classList.add('ok');b.textContent='Operational ready';b.title='Data Governance, Standar Operasional, UAT, Delivery Plan, dan runtime health terverifikasi pada sesi ini.';b.dataset.runtimeVerified='true';removeRetry(host);}
 async function verify(){
  if(view!=='governance'||user?.role!=='superadmin')return;const b=badge(),host=summary();if(!b||!host)return;
  const staticReady=staticReadyOf(b);
  if(!staticReady){removeRetry(host);setPending(b,'Belum final','Baseline governance/UAT/delivery belum lengkap.');return;}
  const myCycle=++cycle;removeRetry(host);setPending(b,'Verifikasi runtime…','Memeriksa Workflow, Source Mirror, Shopfloor Invariants, dan Work Calendar.');host.setAttribute('aria-busy','true');
  const results=await Promise.all(checks.map(async c=>{try{const data=await api(c.path);return {...c,ok:c.ready(data),available:true,data};}catch(error){return {...c,ok:false,available:false,error:String(error?.message||error||'Tidak dapat diverifikasi')};}}));
  if(myCycle!==cycle||view!=='governance')return;lastResults=results;host.removeAttribute('aria-busy');
  const failed=results.filter(x=>!x.ok);if(!failed.length){setReady(b,host);return;}
  const unavailable=failed.filter(x=>!x.available).map(x=>x.label),notReady=failed.filter(x=>x.available).map(x=>x.label),parts=[];
  if(notReady.length)parts.push('belum konsisten: '+notReady.join(', '));if(unavailable.length)parts.push('tidak dapat diverifikasi: '+unavailable.join(', '));setPending(b,'Belum final',parts.join(' · ')||'Runtime health belum memenuhi release gate.');retryButton(host);
 }
 function dashboardEmpty(){return [...document.querySelectorAll('#content .ref-empty')].find(x=>/Belum ada aktivitas yang perlu ditampilkan/i.test(x.textContent||''));}
 async function verifyDashboardProjection(){
  if(view!=='dashboard'||!user)return;const empty=dashboardEmpty();if(!empty)return;
  const endpoint=user.role==='superadmin'?'/audit':'/attention-center';
  try{
   const data=await api(endpoint),items=Array.isArray(data)?data:Array.isArray(data?.items)?data.items:[];
   if(!items.length)return;
   empty.className='notice ref-empty';empty.textContent=user.role==='superadmin'?'Aktivitas terbaru tersedia, tetapi panel ringkas belum tersinkron. Buka Audit Log untuk melihat data aktual.':'Perhatian operasional tersedia. Buka Pusat Perhatian untuk melihat kondisi aktual.';
   const button=document.createElement('button');button.type='button';button.textContent=user.role==='superadmin'?'Buka Audit Log':'Buka Pusat Perhatian';button.onclick=()=>user.role==='superadmin'?navigate('audit'):(typeof attentionDialog==='function'?attentionDialog():null);empty.append(document.createElement('br'),button);
  }catch{
   empty.className='errorbox ref-empty';empty.textContent=user.role==='superadmin'?'Aktivitas terbaru belum dapat diverifikasi. Kondisi ini tidak berarti tidak ada aktivitas.':'Status perhatian operasional belum dapat diverifikasi. Kondisi ini tidak berarti tidak ada perhatian.';
  }
 }
 const baseRender=typeof render==='function'?render:null;
 if(baseRender){render=async function(...args){const out=await baseRender(...args);queueMicrotask(()=>{verify().catch(()=>{const b=badge(),host=summary();if(b){setPending(b,'Belum final','Runtime health tidak dapat diverifikasi.');retryButton(host);}});verifyDashboardProjection().catch(()=>{});});return out;};}
 window.ReleaseRuntimeGateV87={verify,verifyDashboardProjection,checks,get lastResults(){return lastResults;}};
})();
