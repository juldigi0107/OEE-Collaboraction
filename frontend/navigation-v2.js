(()=>{
  function enhanceNav(){
    const nav=document.querySelector('.navscroll');
    if(!nav||nav.dataset.navV2==='1')return;
    nav.dataset.navV2='1';
    [...nav.querySelectorAll('.navgroup')].forEach(group=>{
      const key=(group.textContent||'').trim().toUpperCase();
      if(!['INFORMASI','SUPERADMIN'].includes(key))return;
      const items=[];let node=group.nextElementSibling;
      while(node&&!node.classList.contains('navgroup')){if(node.classList.contains('nav'))items.push(node);node=node.nextElementSibling;}
      if(!items.length)return;
      group.style.display='none';items.forEach(x=>x.classList.add('lc-advanced-hidden'));
      const toggle=document.createElement('button');
      toggle.type='button';toggle.className='lc-advanced-toggle';
      const base=key==='SUPERADMIN'?'Administrasi & Pengaturan':'Informasi Lanjutan';
      toggle.textContent=base+' ▾';
      toggle.onclick=()=>{const opening=items[0].classList.contains('lc-advanced-hidden');items.forEach(x=>x.classList.toggle('lc-advanced-hidden',!opening));toggle.textContent=base+(opening?' ▴':' ▾');};
      group.parentNode.insertBefore(toggle,items[0]);
    });
  }
  new MutationObserver(()=>requestAnimationFrame(enhanceNav)).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceNav,{once:true});else enhanceNav();
})();
