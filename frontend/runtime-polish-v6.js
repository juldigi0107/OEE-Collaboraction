/* BMJ OEE runtime polish v6 — progressive enhancement only. */
(()=>{
  let raf=0;
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  function ensureBackdrop(){
    let b=q('.runtime-sidebar-backdrop');
    if(!b){b=document.createElement('button');b.type='button';b.className='runtime-sidebar-backdrop';b.setAttribute('aria-label','Tutup menu');document.body.appendChild(b);b.onclick=closeMenu;}
    return b;
  }
  function closeMenu(){const s=q('.sidebar');if(s)s.classList.remove('open');document.body.classList.remove('runtime-menu-open');const b=q('.runtime-sidebar-backdrop');if(b)b.classList.remove('show');const m=q('.mobilemenu');if(m)m.setAttribute('aria-expanded','false');}
  function toggleMenu(){const s=q('.sidebar');if(!s)return;const open=!s.classList.contains('open');s.classList.toggle('open',open);document.body.classList.toggle('runtime-menu-open',open);ensureBackdrop().classList.toggle('show',open);const m=q('.mobilemenu');if(m)m.setAttribute('aria-expanded',String(open));}
  function bindMenu(){
    const m=q('.mobilemenu');
    if(m&&!m.dataset.runtimeBound){m.dataset.runtimeBound='1';m.setAttribute('aria-expanded',q('.sidebar')?.classList.contains('open')?'true':'false');m.onclick=toggleMenu;}
    qa('.nav[data-view]').forEach(n=>{if(n.dataset.runtimeBound)return;n.dataset.runtimeBound='1';n.addEventListener('click',()=>{if(matchMedia('(max-width:820px)').matches)closeMenu();});});
  }
  function bindToTop(){const b=q('.toTop');if(!b)return;if(!b.dataset.runtimeBound){b.dataset.runtimeBound='1';b.onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}b.classList.toggle('visible',window.scrollY>360);}
  function connectionLabel(){return navigator.onLine?'Online':'Offline';}
  function updateConnection(){const c=q('.runtime-status');if(!c)return;c.textContent=connectionLabel();c.classList.toggle('offline',!navigator.onLine);c.title=navigator.onLine?'Browser terhubung ke jaringan':'Browser tidak terhubung ke jaringan';}
  function ensureConnection(){const top=q('.top-actions');if(!top||q('.runtime-status'))return;const c=document.createElement('span');c.className='runtime-status';top.prepend(c);updateConnection();}
  function enhanceTables(){qa('.tablewrap').forEach(w=>{if(w.dataset.runtimeBound)return;w.dataset.runtimeBound='1';w.tabIndex=0;w.setAttribute('role','region');w.setAttribute('aria-label','Tabel data dapat digeser horizontal dan vertikal');});}
  function enhanceDialogs(){const d=q('dialog#modal');if(!d||d.dataset.runtimeBound)return;d.dataset.runtimeBound='1';d.addEventListener('close',()=>{document.body.classList.remove('runtime-dialog-open');});d.addEventListener('cancel',()=>{document.body.classList.remove('runtime-dialog-open');});const original=d.showModal?.bind(d);if(original){d.showModal=function(){document.body.classList.add('runtime-dialog-open');return original();};}}
  function enhanceShell(){bindMenu();bindToTop();ensureConnection();enhanceTables();enhanceDialogs();}
  function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(enhanceShell);}
  window.addEventListener('scroll',bindToTop,{passive:true});
  window.addEventListener('resize',()=>{if(!matchMedia('(max-width:820px)').matches)closeMenu();schedule();},{passive:true});
  window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&q('.sidebar.open'))closeMenu();});
  const boot=()=>{enhanceShell();const app=q('#app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
