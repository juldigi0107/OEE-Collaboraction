(()=>{
  const normalize=()=>{
    document.querySelectorAll('img[src="assets/logo-bmj.png"]').forEach(img=>img.setAttribute('src','assets/logo-bmj.svg'));
    document.querySelectorAll('img[src="assets/splash-factory.png"]').forEach(img=>img.setAttribute('src','assets/splash-factory.svg'));
  };
  const css=document.createElement('style');
  css.textContent='.home-hero,.login-visual,.password-visual{background-image:url("assets/hero-bmj.svg")!important;background-size:cover!important;background-position:center!important}';
  document.head.appendChild(css);
  new MutationObserver(normalize).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalize,{once:true});else normalize();
})();
