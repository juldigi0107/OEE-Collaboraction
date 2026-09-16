/* BMJ OEE runtime polish v6 — progressive enhancement only. */
(()=>{
  let raf=0,menuScrollY=0,menuLocked=false;
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const mobileQuery=matchMedia('(max-width:820px)');
  const isMobile=()=>mobileQuery.matches;
  function ensureMobileCss(){
    if(document.querySelector('link[data-mobile-sidebar-v44]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='mobile-sidebar-v44.css?v=20260916-1';
    link.dataset.mobileSidebarV44='1';
    document.head.appendChild(link);
  }
  function ensureBackdrop(){
    let b=q('.runtime-sidebar-backdrop');
    if(!b){
      b=document.createElement('button');
      b.type='button';
      b.className='runtime-sidebar-backdrop';
      b.setAttribute('aria-label','Tutup menu navigasi');
      b.setAttribute('aria-hidden','true');
      document.body.appendChild(b);
      b.addEventListener('click',closeMenu);
      b.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
    }
    return b;
  }
  function lockMenuScroll(){
    if(menuLocked)return;
    menuLocked=true;
    menuScrollY=window.scrollY||window.pageYOffset||0;
    const body=document.body;
    body.dataset.runtimeMenuScroll=String(menuScrollY);
    body.style.position='fixed';
    body.style.top=`-${menuScrollY}px`;
    body.style.left='0';
    body.style.right='0';
    body.style.width='100%';
    body.classList.add('runtime-menu-open');
  }
  function unlockMenuScroll(){
    if(!menuLocked){document.body.classList.remove('runtime-menu-open');return;}
    const body=document.body,y=Number(body.dataset.runtimeMenuScroll||menuScrollY||0);
    menuLocked=false;
    body.classList.remove('runtime-menu-open');
    delete body.dataset.runtimeMenuScroll;
    body.style.position='';
    body.style.top='';
    body.style.left='';
    body.style.right='';
    body.style.width='';
    window.scrollTo(0,y);
  }
  function setMenuState(open,{restoreScroll=true}={}){
    const s=q('.sidebar'),m=q('.mobilemenu'),b=ensureBackdrop();
    if(!s)return;
    const next=!!open&&isMobile();
    s.classList.toggle('open',next);
    s.setAttribute('aria-hidden',next?'false':isMobile()?'true':'false');
    if(m){m.setAttribute('aria-expanded',String(next));m.setAttribute('aria-controls','appSidebar');}
    b.classList.toggle('show',next);
    b.setAttribute('aria-hidden',String(!next));
    if(next)lockMenuScroll();else if(restoreScroll)unlockMenuScroll();else{menuLocked=false;document.body.classList.remove('runtime-menu-open');}
  }
  function closeMenu(){setMenuState(false);}
  function toggleMenu(e){
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const s=q('.sidebar');if(!s)return;
    setMenuState(!s.classList.contains('open'));
  }
  function bindMenu(){
    const s=q('.sidebar');if(s){s.id='appSidebar';s.setAttribute('aria-label','Navigasi utama');if(!isMobile())s.setAttribute('aria-hidden','false');}
    const m=q('.mobilemenu');
    if(m&&!m.dataset.runtimeBound){
      m.dataset.runtimeBound='1';
      m.type='button';
      m.setAttribute('aria-label','Buka menu navigasi');
      m.setAttribute('aria-controls','appSidebar');
      m.setAttribute('aria-expanded',s?.classList.contains('open')?'true':'false');
      m.onclick=null;
      m.addEventListener('click',toggleMenu,{capture:true});
    }
    qa('.nav[data-view]').forEach(n=>{
      if(n.dataset.runtimeBound)return;
      n.dataset.runtimeBound='1';
      n.addEventListener('click',()=>{if(isMobile())closeMenu();},{capture:true});
    });
    const backdrop=ensureBackdrop();
    if(!isMobile()&&(s?.classList.contains('open')||backdrop.classList.contains('show')))setMenuState(false);
    else if(isMobile()&&!s?.classList.contains('open')){s?.setAttribute('aria-hidden','true');m?.setAttribute('aria-expanded','false');}
  }
  function bindToTop(){const b=q('.toTop');if(!b)return;if(!b.dataset.runtimeBound){b.dataset.runtimeBound='1';b.onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}b.classList.toggle('visible',window.scrollY>360);}
  function connectionLabel(){return navigator.onLine?'Online':'Offline';}
  function updateConnection(){const c=q('.runtime-status');if(!c)return;c.textContent=connectionLabel();c.classList.toggle('offline',!navigator.onLine);c.title=navigator.onLine?'Browser terhubung ke jaringan':'Browser tidak terhubung ke jaringan';}
  function ensureConnection(){const top=q('.top-actions');if(!top||q('.runtime-status'))return;const c=document.createElement('span');c.className='runtime-status';top.prepend(c);updateConnection();}
  function enhanceTables(){qa('.tablewrap').forEach(w=>{if(w.dataset.runtimeBound)return;w.dataset.runtimeBound='1';w.tabIndex=0;w.setAttribute('role','region');w.setAttribute('aria-label','Tabel data dapat digeser horizontal dan vertikal');});}
  function enhanceDialogs(){const d=q('dialog#modal');if(!d||d.dataset.runtimeBound)return;d.dataset.runtimeBound='1';d.addEventListener('close',()=>{document.body.classList.remove('runtime-dialog-open');});d.addEventListener('cancel',()=>{document.body.classList.remove('runtime-dialog-open');});const original=d.showModal?.bind(d);if(original){d.showModal=function(){if(q('.sidebar.open'))closeMenu();document.body.classList.add('runtime-dialog-open');return original();};}}
  function enhanceStates(){
    const content=q('#content');if(!content)return;
    const loading=content.querySelector(':scope > .loading-panel');
    if(loading&&!loading.dataset.runtimeState){loading.dataset.runtimeState='loading';loading.setAttribute('role','status');loading.setAttribute('aria-live','polite');loading.innerHTML='<span class="runtime-state-spinner" aria-hidden="true"></span><div><strong>Memuat data operasional</strong><small>Menyiapkan informasi terbaru yang tersedia.</small></div>';}
    const error=content.querySelector(':scope > .errorbox');
    if(error&&!error.dataset.runtimeState){const message=(error.textContent||'Permintaan belum dapat diselesaikan.').trim();error.dataset.runtimeState='error';error.setAttribute('role','alert');error.textContent='';const title=document.createElement('strong');title.textContent=navigator.onLine?'Data belum dapat dimuat':'Perangkat sedang offline';const detail=document.createElement('span');detail.textContent=message;error.append(title,detail);const retry=content.querySelector('#retry');if(retry){retry.classList.add('runtime-retry');retry.textContent='Muat ulang';}}
    qa('#content .empty,#content .release-empty').forEach(el=>{if(el.dataset.runtimeState)return;el.dataset.runtimeState='empty';el.classList.add('runtime-empty-state');el.setAttribute('role','status');});
  }
  function enhanceShell(){bindMenu();bindToTop();ensureConnection();enhanceTables();enhanceDialogs();enhanceStates();}
  function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(enhanceShell);}
  function viewportSync(){
    const vv=window.visualViewport;
    if(vv)document.documentElement.style.setProperty('--runtime-vh',`${vv.height}px`);
    if(!isMobile())setMenuState(false);
    schedule();
  }
  window.addEventListener('scroll',bindToTop,{passive:true});
  window.addEventListener('resize',viewportSync,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(viewportSync,120),{passive:true});
  window.visualViewport?.addEventListener('resize',viewportSync,{passive:true});
  mobileQuery.addEventListener?.('change',viewportSync);
  window.addEventListener('online',()=>{updateConnection();schedule();});window.addEventListener('offline',()=>{updateConnection();schedule();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&q('.sidebar.open'))closeMenu();});
  document.addEventListener('click',e=>{if(!isMobile()||!q('.sidebar.open'))return;const t=e.target;if(t instanceof Element&&t.closest('.workspace')&&!t.closest('.mobilemenu'))closeMenu();});
  const boot=()=>{ensureMobileCss();viewportSync();enhanceShell();const app=q('#app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
