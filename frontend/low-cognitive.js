(()=>{
  const labels={operations:'Input & Aktivitas',documents:'Dokumen',quality:'Validasi Data',users:'Akun',settings:'Konfigurasi',audit:'Audit'};
  function enhance(){
    const nav=document.querySelector('.navscroll');
    if(!nav||nav.dataset.lcReady)return;
    nav.dataset.lcReady='1';
    const groups=[...nav.querySelectorAll('.navgroup')];
    groups.forEach(g=>{
      const text=(g.textContent||'').trim().toUpperCase();
      if(text==='INFORMASI'||text==='SUPERADMIN'){
        const members=[];let n=g.nextElementSibling;
        while(n&&!n.classList.contains('navgroup')){if(n.classList.contains('nav'))members.push(n);n=n.nextElementSibling;}
        g.style.display='none';members.forEach(x=>x.classList.add('lc-advanced-hidden'));
        if(members.length){
          const btn=document.createElement('button');btn.className='lc-advanced-toggle';btn.type='button';
          const baseLabel=text==='SUPERADMIN'?'Administrasi & Pengaturan':'Informasi Lanjutan';
          btn.textContent=baseLabel+' ▾';
          g.parentNode.insertBefore(btn,members[0]);
          btn.onclick=()=>{const hidden=members[0].classList.contains('lc-advanced-hidden');members.forEach(x=>x.classList.toggle('lc-advanced-hidden',!hidden));btn.textContent=baseLabel+(hidden?' ▴':' ▾');};
        }
      }
    });
    nav.querySelectorAll('.nav').forEach(n=>{const v=n.dataset.view;if(v&&labels[v]){const s=n.querySelector('span:last-child');if(s)s.textContent=labels[v];}});
  }
  const mo=new MutationObserver(()=>requestAnimationFrame(enhance));
  mo.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('DOMContentLoaded',enhance);
  enhance();
})();