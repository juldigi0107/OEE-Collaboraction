/* BMJ OEE Field Display v8 — authenticated or paired read-only exact-machine refresh for published displays. */
(()=>{
 const params=new URLSearchParams(location.search),displayId=params.get('display');
 if(!displayId)return;
 const REFRESH_MS=15000,LAYOUT_MS=60000,HISTORICAL_MS=300000,DAY=86400000,EXCEL_EPOCH=Date.UTC(1899,11,30),DEVICE_KEY='oee-display-device:'+displayId;
 let timer=0,layoutTimer=0,lastLayout='',refreshing=false,blocked=false,dashboardCache=null,dashboardAt=0,deviceMode=!token,deviceToken='';
 const q=s=>document.querySelector(s);
 const safe=v=>{try{return typeof v==='string'?JSON.parse(v):v||{};}catch{return {};}};
 const pct=v=>typeof v==='number'&&Number.isFinite(v)?(v*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'—';
 const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('id-ID',{maximumFractionDigits:1}):'—';
 const minutes=ts=>{const t=Date.parse(ts||'');return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/60000)):null;};
 const toDate=v=>{if(typeof v==='number'&&Number.isFinite(v)&&v>20000&&v<80000)return new Date(EXCEL_EPOCH+Math.round(v)*DAY);if(typeof v==='string'){const t=Date.parse(v);if(Number.isFinite(t))return new Date(t);}return null;};
 const settingFrom=list=>(list||[]).find(x=>x.key===`DISPLAY_LAYOUT.${displayId}`);
 const apiRoot=()=>String(base||window.OEE_CONFIG?.apiBase||'').replace(/\/$/,'')+'/api';
 const storedDevice=()=>{try{return localStorage.getItem(DEVICE_KEY)||'';}catch{return '';}};
 const storeDevice=v=>{try{if(v)localStorage.setItem(DEVICE_KEY,v);else localStorage.removeItem(DEVICE_KEY);}catch{}};
 function cleanResetParam(){if(params.get('reset-display')!=='1')return;storeDevice('');params.delete('reset-display');const qs=params.toString();history.replaceState(null,'',location.pathname+(qs?'?'+qs:''));}
 cleanResetParam();deviceToken=storedDevice();
 async function rawDevice(route,method='GET',data,sendToken=true){
  const headers={...(data?{'Content-Type':'application/json'}:{}),...(sendToken&&deviceToken?{'X-Display-Token':deviceToken}:{})};
  const r=await fetch(apiRoot()+route,{method,headers,body:data?JSON.stringify(data):undefined});let value={};try{value=await r.json();}catch{}if(!r.ok){const e=new Error(value.error||'Permintaan display device gagal');e.status=r.status;throw e;}return value;
 }
 function pairedCatalog(layout){return {sources:[],sheets:[],settings:[{key:`DISPLAY_LAYOUT.${displayId}`,department:layout.department||'PROD',value:layout}]};}
 async function deviceApi(path,method='GET',data){
  if(path==='/catalog'){const c=await rawDevice('/field-display/config?display='+encodeURIComponent(displayId));catalog=pairedCatalog(c.layout);return catalog;}
  if(path==='/dashboard')return rawDevice('/field-display/dashboard?display='+encodeURIComponent(displayId));
  if(path.startsWith('/field-display/machine')){const sep=path.includes('?')?'&':'?';return rawDevice(path+sep+'display='+encodeURIComponent(displayId));}
  throw Error('Display device hanya memiliki akses read-only ke layout, projection mesin, dan snapshot dashboard.');
 }
 function pairScreen(message=''){
  clearInterval(timer);clearInterval(layoutTimer);blocked=false;document.body.replaceChildren();document.body.className='display-pairing-mode';
  const main=document.createElement('main');main.className='display-pairing';const card=document.createElement('section');card.className='display-pairing-card';
  const logo=document.createElement('img');logo.src='assets/logo-bmj-source.webp';logo.alt='BMJ';const eyebrow=document.createElement('span');eyebrow.className='display-pairing-eyebrow';eyebrow.textContent='FIELD DISPLAY · READ ONLY';const title=document.createElement('h1');title.textContent='Pasangkan Display Lapangan';const intro=document.createElement('p');intro.textContent='Perangkat ini belum memiliki akses display. Gunakan kode pairing sekali pakai yang dibuat Superadmin dari Konfigurasi → Layout Display Mesin.';
  const scope=document.createElement('div');scope.className='display-pairing-scope';scope.innerHTML=`<span>Display ID</span><strong>${displayId.replace(/[<>]/g,'')}</strong>`;
  const form=document.createElement('form');form.id='displayPairForm';form.innerHTML='<label>Nama perangkat<input name="name" maxlength="80" required placeholder="Contoh: TV Offset 5"></label><label>Kode pairing<input name="code" inputmode="text" autocomplete="one-time-code" minlength="6" maxlength="12" required placeholder="8 karakter"></label><div id="displayPairError" role="alert"></div><button class="primary">Pasangkan perangkat</button>';
  const note=document.createElement('small');note.textContent='Kode pairing berlaku sekali dan kedaluwarsa sekitar 10 menit. Setelah berhasil, perangkat menerima token read-only scoped ke layout dan mesin ini; akun pengguna tidak disimpan.';
  card.append(logo,eyebrow,title,intro,scope,form,note);main.append(card);document.body.append(main);if(message){const er=form.querySelector('#displayPairError');er.textContent=message;er.hidden=false;}
  form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;const er=form.querySelector('#displayPairError');er.textContent='';try{const d=Object.fromEntries(new FormData(form));const r=await rawDevice('/display-devices/pair','POST',{display_id:displayId,name:String(d.name||'').trim(),code:String(d.code||'').trim()},false);storeDevice(r.token);deviceToken=r.token;location.reload();}catch(err){er.textContent=err.message;button.disabled=false;}};
 }
 async function bootstrapDevice(){
  if(!deviceMode)return;if(!deviceToken){pairScreen();return;}api=deviceApi;
  try{const cfg=await rawDevice('/field-display/config?display='+encodeURIComponent(displayId));catalog=pairedCatalog(cfg.layout);user={id:'display-device',name:cfg.device?.name||'Field Display',role:'user',department:cfg.layout?.department||'PROD',permissions:[]};document.title=(cfg.device?.name||'Field Display')+' · BMJ OEE';renderFieldDisplay(cfg.layout);}
  catch(err){storeDevice('');deviceToken='';pairScreen(err.message);}
 }
 function resetDevice(message){if(!deviceMode)return;storeDevice('');deviceToken='';pairScreen(message||'Akses perangkat perlu dipasangkan ulang.');}
 if(deviceMode)login=()=>bootstrapDevice();
 function currentLayout(){const item=settingFrom(catalog?.settings);if(!item)return null;const layout=safe(item.value);return layout.status==='published'&&String(layout.machine||'').trim()?layout:null;}
 function blockDisplay(message){if(blocked)return;blocked=true;clearInterval(timer);clearInterval(layoutTimer);const host=q('#fieldDisplay');if(!host)return;host.replaceChildren();const card=document.createElement('section');card.className='field-display-blocked';const logo=document.createElement('img');logo.src='assets/logo-bmj.svg';logo.alt='BMJ';const title=document.createElement('h1');title.textContent='Display belum siap ditayangkan';const text=document.createElement('p');text.textContent=message;const code=document.createElement('small');code.textContent='ID display: '+displayId;card.append(logo,title,text,code);host.append(card);}
 function statusNode(){let el=q('#fieldDisplayLiveStatus');if(!el&&q('#fieldDisplay')){el=document.createElement('div');el.id='fieldDisplayLiveStatus';el.className='field-display-live';q('#fieldDisplay').appendChild(el);}return el;}
 function status(ok,message){const el=statusNode();if(!el)return;el.classList.toggle('is-stale',!ok);el.replaceChildren();const dot=document.createElement('i'),text=document.createElement('span');text.textContent=message;el.append(dot,text);}
 function widgetEl(id){try{return q(`.de5-widget[data-wid="${CSS.escape(id)}"],.display-widget[data-widget-id="${CSS.escape(id)}"]`);}catch{return null;}}
 function setValue(widget,value,meta){const el=widgetEl(widget.id);if(!el||value===undefined||value===null)return;const body=el.querySelector('.de5-widget-body')||el;let strong=body.querySelector('strong,.display-widget-value');if(!strong){strong=document.createElement('strong');body.appendChild(strong);}strong.textContent=String(value);if(meta!==undefined){let small=body.querySelector('small,.display-widget-meta');if(!small){small=document.createElement('small');body.appendChild(small);}small.textContent=meta||'';}}
 const apRow=(dash,n)=>dash?.series?.find(s=>s.name==='OEE AP')?.rows?.find(r=>r.row===n)?.cells?.J?.v;
 async function historicalDashboard(){if(dashboardCache&&Date.now()-dashboardAt<HISTORICAL_MS)return dashboardCache;try{const next=await api('/dashboard');dashboardCache=next;dashboardAt=Date.now();return next;}catch{return dashboardCache;}}
 function trendData(dash){const ap=dash?.series?.find(s=>s.name==='OEE AP'),pts=(ap?.rows||[]).map(r=>{const date=toDate(r.cells?.A?.v),value=r.cells?.J?.v;return date&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1?{date,value}:null;}).filter(Boolean).sort((a,b)=>a.date-b.date);if(!pts.length)return null;const min=pts[0].date,max=pts[pts.length-1].date,span=Math.max(DAY,max-min),label=min.getUTCFullYear()===max.getUTCFullYear()&&min.getUTCMonth()===max.getUTCMonth()?min.toLocaleDateString('id-ID',{month:'short',year:'numeric',timeZone:'UTC'}):`${min.toLocaleDateString('id-ID',{day:'2-digit',month:'short',timeZone:'UTC'})}–${max.toLocaleDateString('id-ID',{day:'2-digit',month:'short',timeZone:'UTC'})}`;return {pts,min,max,span,label};}
 function setTrend(widget,dash){const el=widgetEl(widget.id);if(!el)return;const body=el.querySelector('.de5-widget-body')||el,data=trendData(dash);body.replaceChildren();if(!data){const msg=document.createElement('div');msg.className='display-widget-meta';msg.textContent='Trend snapshot belum tersedia dari cell tanggal sumber.';body.append(msg);return;}const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('class','display-mini-chart');svg.setAttribute('viewBox','0 0 100 46');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');svg.setAttribute('aria-label','Trend OEE '+data.label);const line=document.createElementNS(ns,'line');line.setAttribute('x1','0');line.setAttribute('y1','43');line.setAttribute('x2','100');line.setAttribute('y2','43');const poly=document.createElementNS(ns,'polyline');poly.setAttribute('fill','none');poly.setAttribute('points',data.pts.map(p=>`${(p.date-data.min)*100/data.span},${44-p.value*38}`).join(' '));svg.append(line,poly);const meta=document.createElement('small');meta.className='display-widget-meta';meta.textContent=`${data.label} · snapshot historis/global · bukan KPI live mesin`;body.append(svg,meta);}
 function prepareTrend(layout){for(const w of layout?.widgets||[]){if(w.source!=='dashboard.trend')continue;const el=widgetEl(w.id),body=el?.querySelector('.de5-widget-body')||el;if(body){body.replaceChildren();const msg=document.createElement('div');msg.className='display-widget-meta';msg.textContent='Menyiapkan trend dari tanggal cell sumber…';body.append(msg);}}}
 function liveMeta(projection){const m=projection?.machine,t=projection?.telemetry;if(!m)return 'Exact machine belum ditemukan';const hb=t?.heartbeat_age_seconds===null||t?.heartbeat_age_seconds===undefined?'heartbeat belum tersedia':`heartbeat ${fmt(Number(t.heartbeat_age_seconds))} dtk`;return `Exact machine · ${hb} · ${t?.trusted?'telemetry authoritative':'telemetry belum authoritative'}`;}
 function resolve(widget,dash,p){
  const s=widget.source,historical='Snapshot dashboard historis/global · bukan KPI live mesin',m=p?.machine,run=p?.run,down=p?.downtime,mtc=p?.maintenance,qc=p?.quality,unit=String(run?.unit||qc?.unit||'').trim();
  if(s==='dashboard.oee')return [pct(apRow(dash,2)),historical];
  if(s==='dashboard.availability')return [pct(apRow(dash,3)),historical];
  if(s==='dashboard.performance')return [pct(apRow(dash,4)),historical];
  if(s==='dashboard.quality')return [pct(apRow(dash,5)),historical];
  if(s==='system.clock')return [new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'medium'}).format(new Date()),'Waktu lokal display'];
  if(s==='realtime.status')return [m?.state||'OFFLINE',liveMeta(p)];
  if(s==='realtime.shift')return [m?.shift?`Shift ${m.shift}${m.group_name?' · '+m.group_name:''}`:'—','Shift / Group exact machine'];
  if(s==='production.total'){
   if(!run)return ['—','Belum ada PRO aktif pada exact machine'];
   if(!run.auto_counter_ready)return ['—','Counter ditahan · telemetry/start counter belum authoritative'];
   const actual=Number(m?.counter)-Number(run.start_counter||0);return [Number.isFinite(actual)&&actual>=0?`${fmt(actual)}${unit?' '+unit:''}`:'—','Aktual dari counter authoritative · exact machine'];
  }
  if(s==='production.table'){
   if(!run)return ['Belum ada PRO aktif','Exact machine'];
   const target=Number(run.planned_qty);return [`PRO ${run.pro||'—'}`,`${run.material||'Material —'} · target ${Number.isFinite(target)?fmt(target):'—'}${unit?' '+unit:''}`];
  }
  if(s==='planning.target'){
   if(!run)return ['—','Planning target tampil saat PRO aktif'];const target=Number(run.planned_qty);return [Number.isFinite(target)?`${fmt(target)}${unit?' '+unit:''}`:'—',`PRO ${run.pro||'—'} · exact machine`];
  }
  if(s==='downtime.minutes')return [down?`${minutes(down.start_ts)??0} min`:'0 min',down?`${down.class||'Downtime'} · ${down.code||down.reason||'reason belum dicatat'}`:'Tidak ada downtime aktif · exact machine'];
  if(s==='maintenance.status')return [mtc?.status||'Tidak aktif',mtc?`${mtc.priority||'—'} · ${mtc.note||'Maintenance Call exact machine'}`:'Tidak ada Maintenance Call aktif'];
  if(s==='quality.reject'){
   if(!run)return ['—','Belum ada PRO aktif'];
   if(!qc||qc.unit_status==='ambiguous_or_mismatch')return ['—',`${Number(qc?.mismatched_or_missing_unit_events||0)} QC event tidak cocok / tanpa unit; tidak diagregasikan`];
   const excluded=Number(qc.mismatched_or_missing_unit_events||0),incomplete=Number(qc.incomplete_events||0),meta=[`Sample ${fmt(Number(qc.sample||0))}${qc.unit?' '+qc.unit:''}`,qc.quality_rate===null||qc.quality_rate===undefined?'Quality rate belum lengkap':`Quality ${pct(Number(qc.quality_rate))}`,incomplete?`${incomplete} event belum fully classified`:'',excluded?`${excluded} event unit lain/legacy dikeluarkan`:''].filter(Boolean).join(' · ');return [`${fmt(Number(qc.reject||0))}${qc.unit?' '+qc.unit:''}`,meta];
  }
  return [undefined,undefined];
 }
 function renderClock(layout){for(const w of layout?.widgets||[]){if(w.source==='system.clock'){const [v,m]=resolve(w,null,null);setValue(w,v,m);}}}
 async function refresh(){if(refreshing||document.hidden||!q('#fieldDisplay')||blocked)return;refreshing=true;try{const layout=currentLayout();if(!layout){blockDisplay('Layout harus berstatus Published dan memiliki kode mesin sebelum dipasang di lapangan.');return;}const [dash,projection]=await Promise.all([historicalDashboard(),api('/field-display/machine?machine='+encodeURIComponent(layout.machine))]);for(const w of layout.widgets||[]){if(w.source==='dashboard.trend'){setTrend(w,dash);continue;}const [v,m]=resolve(w,dash,projection);if(v!==undefined)setValue(w,v,m);}renderClock(layout);if(projection?.status==='machine_not_found'){status(false,`Machine assignment ${layout.machine} belum ditemukan pada registry exact-machine`);return;}if(projection?.status==='machine_ambiguous'){status(false,`Machine assignment ${layout.machine} ambigu setelah normalisasi. Perbaiki canonical machine / alias sebelum display digunakan.`);return;}const trusted=projection?.telemetry?.trusted===true;status(trusted,`${deviceMode?'Paired display · ':''}${liveMeta(projection)} · ${new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);}catch(e){if(deviceMode&&[401,403,409].includes(Number(e.status)))return resetDevice(e.message);status(false,'Data terakhir · refresh exact-machine tertunda');}finally{refreshing=false;}}
 async function checkLayout(){if(!q('#fieldDisplay')||blocked)return;try{const next=await api('/catalog');const item=settingFrom(next.settings);if(!item){blockDisplay('Layout display tidak ditemukan. Periksa ID display pada URL mesin.');return;}const layout=safe(item.value);if(layout.status!=='published'||!String(layout.machine||'').trim()){blockDisplay('Layout harus dipublikasikan oleh superadmin dan ditetapkan ke mesin sebelum dapat ditampilkan.');return;}const signature=typeof item.value==='string'?item.value:JSON.stringify(item.value);if(lastLayout&&signature!==lastLayout){location.reload();return;}lastLayout=signature;catalog=next;}catch(e){if(deviceMode&&[401,403,409].includes(Number(e.status)))resetDevice(e.message);}}
 function boot(){const wait=()=>{if(blocked)return;const item=settingFrom(catalog?.settings);if(!item||!q('#fieldDisplay')){setTimeout(wait,350);return;}const layout=safe(item.value);if(layout.status!=='published'||!String(layout.machine||'').trim()){blockDisplay('Layout harus dipublikasikan oleh superadmin dan ditetapkan ke mesin sebelum dapat ditampilkan.');return;}lastLayout=typeof item.value==='string'?item.value:JSON.stringify(item.value);prepareTrend(layout);status(false,deviceMode?'Memverifikasi paired device dan projection exact-machine…':'Menyiapkan projection exact-machine…');refresh();timer=setInterval(refresh,REFRESH_MS);layoutTimer=setInterval(checkLayout,LAYOUT_MS);setInterval(()=>renderClock(currentLayout()),1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',refresh);};wait();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(deviceMode)bootstrapDevice();boot();},{once:true});else{if(deviceMode)bootstrapDevice();boot();}
 window.addEventListener('beforeunload',()=>{clearInterval(timer);clearInterval(layoutTimer);});
 window.FieldDisplayDevice={reset:()=>resetDevice('Pairing perangkat direset. Masukkan kode baru untuk melanjutkan.'),paired:()=>deviceMode&&!!deviceToken};
})();
