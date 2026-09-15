/* BMJ OEE Field Display v8 — authenticated, read-only live refresh for published machine displays. */
(()=>{
  const params=new URLSearchParams(location.search),displayId=params.get('display');
  if(!displayId)return;
  const REFRESH_MS=15000,LAYOUT_MS=60000;
  let timer=0,layoutTimer=0,lastLayout='',refreshing=false,blocked=false;
  const q=s=>document.querySelector(s);
  const safe=v=>{try{return typeof v==='string'?JSON.parse(v):v||{};}catch{return {};}};
  const pct=v=>typeof v==='number'&&Number.isFinite(v)?(v*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%':'—';
  const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('id-ID',{maximumFractionDigits:1}):'—';
  const minutes=ts=>ts?Math.max(0,Math.floor((Date.now()-new Date(ts).getTime())/60000)):null;
  const normalize=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const settingFrom=list=>(list||[]).find(x=>x.key===`DISPLAY_LAYOUT.${displayId}`);
  function currentLayout(){
    const item=settingFrom(catalog?.settings);if(!item)return null;
    const layout=safe(item.value);
    return layout.status==='published'&&String(layout.machine||'').trim()?layout:null;
  }
  function blockDisplay(message){
    if(blocked)return;blocked=true;clearInterval(timer);clearInterval(layoutTimer);
    const host=q('#fieldDisplay');if(!host)return;
    host.replaceChildren();
    const card=document.createElement('section');card.className='field-display-blocked';
    const logo=document.createElement('img');logo.src='assets/logo-bmj.svg';logo.alt='BMJ';
    const title=document.createElement('h1');title.textContent='Display belum siap ditayangkan';
    const text=document.createElement('p');text.textContent=message;
    const code=document.createElement('small');code.textContent='ID display: '+displayId;
    card.append(logo,title,text,code);host.append(card);
  }
  function statusNode(){
    let el=q('#fieldDisplayLiveStatus');
    if(!el&&q('#fieldDisplay')){el=document.createElement('div');el.id='fieldDisplayLiveStatus';el.className='field-display-live';q('#fieldDisplay').appendChild(el);}
    return el;
  }
  function status(ok,message){const el=statusNode();if(!el)return;el.classList.toggle('is-stale',!ok);el.innerHTML=`<i></i><span>${message}</span>`;}
  function widgetEl(id){try{return q(`.de5-widget[data-wid="${CSS.escape(id)}"],.display-widget[data-widget-id="${CSS.escape(id)}"]`);}catch{return null;}}
  function setValue(widget,value,meta){
    const el=widgetEl(widget.id);if(!el||value===undefined||value===null)return;
    const body=el.querySelector('.de5-widget-body')||el;
    let strong=body.querySelector('strong,.display-widget-value');
    if(!strong){strong=document.createElement('strong');body.appendChild(strong);}
    strong.textContent=String(value);
    if(meta){let small=body.querySelector('small,.display-widget-meta');if(!small){small=document.createElement('small');body.appendChild(small);}small.textContent=meta;}
  }
  const apRow=(dash,n)=>dash?.series?.find(s=>s.name==='OEE AP')?.rows?.find(r=>r.row===n)?.cells?.J?.v;
  function machineContext(rt,telemetry,layout){
    const code=normalize(layout.machine),machine=(rt?.machines||[]).find(m=>normalize(m.code)===code)||null,mid=machine?.machine_id||machine?.id||null;
    const run=mid?(rt?.runs||[]).find(r=>r.machine_id===mid)||null:null,down=mid?(rt?.downtime||[]).find(d=>d.machine_id===mid)||null:null,mtc=mid?(rt?.maintenance||[]).find(m=>m.machine_id===mid)||null:null;
    const trust=(telemetry?.machines||[]).find(t=>normalize(t.code)===code)||null;
    return {code,machine,run,down,mtc,trust};
  }
  function resolve(widget,dash,ctx){
    const s=widget.source,historical='Snapshot dashboard historis/global · bukan KPI live mesin';
    if(s==='dashboard.oee')return [pct(apRow(dash,2)),historical];
    if(s==='dashboard.availability')return [pct(apRow(dash,3)),historical];
    if(s==='dashboard.performance')return [pct(apRow(dash,4)),historical];
    if(s==='dashboard.quality')return [pct(apRow(dash,5)),historical];
    if(s==='system.clock')return [new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'medium'}).format(new Date()),'Waktu lokal'];
    if(s==='realtime.status')return [ctx.machine?.state||'OFFLINE',ctx.machine?.heartbeat_at?'Exact machine · heartbeat tersedia':`Mesin ${ctx.code||'—'} belum terdaftar / heartbeat belum tersedia`];
    if(s==='realtime.shift')return [ctx.machine?.shift?`Shift ${ctx.machine.shift}${ctx.machine.group_name?' · '+ctx.machine.group_name:''}`:'—','Shift / Group exact machine'];
    if(s==='production.total'){
      if(!ctx.run)return ['—','Belum ada PRO aktif pada exact machine'];
      const trusted=ctx.trust?.telemetry_trusted===true&&ctx.trust?.counter_start_trusted===true;
      if(!trusted)return ['—','Counter ditahan · telemetry/start counter belum authoritative'];
      const actual=Number(ctx.machine?.counter)-Number(ctx.run.start_counter||0);
      return [fmt(Number.isFinite(actual)&&actual>=0?actual:null),'Aktual dari counter authoritative'];
    }
    if(s==='downtime.minutes')return [ctx.down?`${minutes(ctx.down.start_ts)??0} min`:'0 min',ctx.down?`${ctx.down.class||'Downtime'} aktif · exact machine`:'Tidak ada downtime aktif'];
    if(s==='maintenance.status')return [ctx.mtc?.status||'Tidak aktif',ctx.mtc?.priority||'Maintenance · exact machine'];
    return [undefined,undefined];
  }
  function renderClock(layout){for(const w of layout?.widgets||[]){if(w.source==='system.clock'){const [v,m]=resolve(w,null,{});setValue(w,v,m);}}}
  async function refresh(){
    if(refreshing||document.hidden||!q('#fieldDisplay')||blocked)return;refreshing=true;
    try{
      const layout=currentLayout();
      if(!layout){blockDisplay('Layout harus berstatus Published dan memiliki kode mesin sebelum dipasang di lapangan.');return;}
      const [dash,rt,telemetry]=await Promise.all([api('/dashboard'),api('/realtime/overview').catch(()=>null),api('/telemetry-status').catch(()=>null)]);
      const ctx=machineContext(rt,telemetry,layout);
      for(const w of layout.widgets||[]){const [v,m]=resolve(w,dash,ctx);if(v!==undefined)setValue(w,v,m);}
      renderClock(layout);
      const exact=!!ctx.machine,trust=ctx.trust?.telemetry_trusted===true;
      status(exact,exact?`Live exact machine · ${trust?'telemetry authoritative':'telemetry belum authoritative'} · ${new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:`Machine assignment ${layout.machine} belum ditemukan pada realtime overview`);
    }catch(e){status(false,'Data terakhir · koneksi refresh tertunda');}
    finally{refreshing=false;}
  }
  async function checkLayout(){
    if(!q('#fieldDisplay')||blocked)return;
    try{
      const next=await api('/catalog');
      const item=settingFrom(next.settings);
      if(!item){blockDisplay('Layout display tidak ditemukan. Periksa ID display pada URL mesin.');return;}
      const layout=safe(item.value);
      if(layout.status!=='published'||!String(layout.machine||'').trim()){blockDisplay('Layout harus dipublikasikan oleh superadmin dan ditetapkan ke mesin sebelum dapat ditampilkan.');return;}
      const signature=typeof item.value==='string'?item.value:JSON.stringify(item.value);
      if(lastLayout&&signature!==lastLayout){location.reload();return;}
      lastLayout=signature;catalog=next;
    }catch{/* keep current published layout */}
  }
  function boot(){
    const wait=()=>{
      if(blocked)return;
      const item=settingFrom(catalog?.settings);
      if(!item||!q('#fieldDisplay')){setTimeout(wait,350);return;}
      const layout=safe(item.value);
      if(layout.status!=='published'||!String(layout.machine||'').trim()){
        blockDisplay('Layout harus dipublikasikan oleh superadmin dan ditetapkan ke mesin sebelum dapat ditampilkan.');return;
      }
      lastLayout=typeof item.value==='string'?item.value:JSON.stringify(item.value);
      status(true,'Menyiapkan data live exact machine…');refresh();
      timer=setInterval(refresh,REFRESH_MS);layoutTimer=setInterval(checkLayout,LAYOUT_MS);
      setInterval(()=>renderClock(currentLayout()),1000);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
      window.addEventListener('online',refresh);
    };
    wait();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('beforeunload',()=>{clearInterval(timer);clearInterval(layoutTimer);});
})();
