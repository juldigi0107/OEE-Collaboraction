(()=>{
  const add=()=>{
    const c=document.querySelector('#content');
    if(!c||document.getElementById('webImportLink'))return;
    const h=c.querySelector('.heading');
    if(!h||!h.textContent.includes('Konfigurasi Sistem'))return;
    const a=document.createElement('a');
    a.id='webImportLink';a.href='import.html';a.className='primary';a.textContent='Import Data via Web';a.style.textDecoration='none';a.style.display='inline-flex';a.style.alignItems='center';a.style.padding='9px 13px';a.style.borderRadius='8px';
    h.appendChild(a);
  };
  new MutationObserver(add).observe(document.documentElement,{childList:true,subtree:true});
  add();
})();
