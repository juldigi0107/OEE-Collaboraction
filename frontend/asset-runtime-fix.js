(()=>{
  const pickUrl=v=>{const m=String(v||'').match(/url\(["']?(data:image\/[^"')]+)["']?\)/);return m?m[1]:'';};
  let logo='',hero='',splash='';
  for(const sheet of Array.from(document.styleSheets)){
    try{
      for(const rule of Array.from(sheet.cssRules||[])){
        const s=String(rule.selectorText||'');
        if(s.includes('.home-hero')&&s.includes('.login-visual')) hero=pickUrl(rule.style.backgroundImage)||hero;
        if(s.includes('assets/logo-bmj.png')) logo=pickUrl(rule.style.content)||logo;
        if(s.includes('assets/splash-factory.png')) splash=pickUrl(rule.style.content)||splash;
      }
    }catch{}
  }
  splash=splash||hero;
  if(hero){
    const st=document.createElement('style');
    st.textContent=`.home-hero,.login-visual{background-image:url("${hero}")!important}`;
    document.head.appendChild(st);
  }
  const apply=()=>{
    if(logo) document.querySelectorAll('img[src="assets/logo-bmj.png"]').forEach(i=>{i.src=logo;});
    if(splash) document.querySelectorAll('img[src="assets/splash-factory.png"]').forEach(i=>{i.src=splash;});
  };
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  apply();
})();
