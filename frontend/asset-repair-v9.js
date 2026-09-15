/* BMJ OEE asset repair v9.2 — keeps original user-provided hero asset and normalizes BMJ identity on every entry state. */
(()=>{
  const REV='20260915-1';
  const HERO=`assets/hero-bmj-photo.jpg?v=${REV}`;
  const LOGO=`assets/logo-bmj.svg?v=${REV}`;
  let heroObjectUrl='';
  const heroSelectors=['.auth-story','.home-hero-v4','.login-visual','.home-hero','.password-visual','.splash-v4','.splash-card'];
  const brandContexts='.brand,.auth-brand,.auth-story,.splash-brand,.splash-card,.de5-brand,.sidebar-brand,.login-card';

  function normalizeLogo(root=document){
    root.querySelectorAll?.('img').forEach(img=>{
      const src=img.getAttribute('src')||'',legacy=src.includes('favicon.svg')||src.includes('logo-bmj-source.webp')||src.includes('logo-bmj.png')||src.includes('logo-bmj.svg');
      if(legacy||img.classList.contains('auth-mark')||img.closest(brandContexts)){
        if(img.getAttribute('src')!==LOGO) img.setAttribute('src',LOGO);
        img.alt='BMJ';
      }
    });
    const top=document.querySelector('.top-left');
    if(top&&!top.querySelector('.bmj-top-logo')){
      const img=document.createElement('img');
      img.src=LOGO;img.alt='BMJ';img.className='bmj-top-logo';
      const menu=top.querySelector('.mobilemenu');
      if(menu)menu.insertAdjacentElement('afterend',img);else top.prepend(img);
    }
  }

  function applyHero(url){
    for(const selector of heroSelectors){
      document.querySelectorAll(selector).forEach(el=>{
        el.style.setProperty('background-image',`url("${url}")`,'important');
        el.style.setProperty('background-size','cover','important');
        el.style.setProperty('background-position',selector==='.home-hero-v4'?'center 62%':'center','important');
        el.classList.add('bmj-hero-loaded');
      });
    }
  }

  function bytesFromBase64(text){
    const clean=text.replace(/^data:image\/[^;]+;base64,/i,'').replace(/\s+/g,'');
    const bin=atob(clean),out=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
    return out;
  }

  async function repairHero(){
    try{
      const r=await fetch(HERO,{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const raw=new Uint8Array(await r.arrayBuffer());
      let bytes=raw;
      const isJpeg=raw[0]===0xff&&raw[1]===0xd8&&raw[2]===0xff;
      if(!isJpeg){
        const text=new TextDecoder().decode(raw).trim();
        if(!text.startsWith('/9j/'))throw new Error('Format hero tidak dikenali');
        bytes=bytesFromBase64(text);
      }
      heroObjectUrl=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));
      applyHero(heroObjectUrl);
    }catch(e){
      console.warn('BMJ hero repair:',e);
      applyHero(`assets/hero-bmj.svg?v=${REV}`);
    }
  }

  let raf=0;
  const enhance=()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{normalizeLogo();if(heroObjectUrl)applyHero(heroObjectUrl);});
  };
  const boot=()=>{
    normalizeLogo();repairHero();
    new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  addEventListener('beforeunload',()=>{if(heroObjectUrl)URL.revokeObjectURL(heroObjectUrl);},{once:true});
})();
