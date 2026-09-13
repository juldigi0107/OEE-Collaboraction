(()=>{
  const labels={operations:'Transaksi',documents:'Dokumen',quality:'Validasi',users:'Akun',settings:'Konfigurasi',audit:'Audit'};
  function enhance(){
    const shell=document.querySelector('.shell');
    if(!shell)return;
    const content=document.querySelector('#content');
    if(content&&!content.querySelector('.lc-quickbar')&&typeof view!=='undefined'&&view==='dashboard'){
      const bar=document.createElement('div');
      bar.className='lc-quickbar';
      bar.innerHTML=`
        <button class="lc-quick" data-lc-view="dept:PROD">${icon('production')}<span><strong>Produksi</strong><small>Lihat OEE & kondisi proses</small></span></button>
        <button class="lc-quick" data-lc-view="operations">${icon('transactions')}<span><strong>Input / Transaksi</strong><small>Catat aktivitas operasional</small></span></button>
        <button class="lc-quick" data-lc-view="dept:MTC">${icon('maintenance')}<span><strong>Masalah Mesin</strong><small>Downtime & maintenance</small></span></button>
        <button class="lc-quick" data-lc-view="documents">${icon('documents')}<span><strong>Cari Dokumen</strong><small>Referensi kerja & sumber</small></span></button>`;
      content.insertBefore(bar,content.firstChild);
      bar.querySelectorAll('[data-lc-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.lcView));
    }
    const nav=document.querySelector('.navscroll');
    if(nav&&!nav.dataset.lcReady){
      nav.dataset.lcReady='1';
      const groups=[...nav.querySelectorAll('.navgroup')];
      groups.forEach(g=>{
        const text=(g.textContent||'').trim().toUpperCase();
        if(text==='INFORMASI'||text==='SUPERADMIN'){
          const members=[];let n=g.nextElementSibling;
          while(n&&!n.classList.contains('navgroup')){if(n.classList.contains('nav'))members.push(n);n=n.nextElementSibling;}
          g.style.display='none';members.forEach(x=>x.classList.add('lc-advanced-hidden'));
          if(members.length){
            const btn=document.createElement('button');btn.className='lc-advanced-toggle';btn.type='button';btn.textContent=text==='SUPERADMIN'?'Administrasi & Pengaturan ▾':'Informasi Lanjutan ▾';
            g.parentNode.insertBefore(btn,members[0]);
            btn.onclick=()=>{const hidden=members[0].classList.contains('lc-advanced-hidden');members.forEach(x=>x.classList.toggle('lc-advanced-hidden',!hidden));btn.textContent=(text==='SUPERADMIN'?'Administrasi & Pengaturan ':'Informasi Lanjutan ')+(hidden?'▴':'▾');};
          }
        }
      });
      nav.querySelectorAll('.nav').forEach(n=>{const v=n.dataset.view;if(v&&labels[v]){const s=n.querySelector('span:last-child');if(s)s.textContent=labels[v];}});
    }
  }
  const mo=new MutationObserver(()=>requestAnimationFrame(enhance));
  mo.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('DOMContentLoaded',enhance);
  enhance();
})();