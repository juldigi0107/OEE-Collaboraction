(()=>{
  const pickUrl=v=>{const m=String(v||'').match(/url\(["']?(data:image\/[^"')]+)["']?\)/);return m?m[1]:'';};
  const svgData=s=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(s);
  const fallbackLogo=svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 90"><rect width="240" height="90" rx="12" fill="white"/><rect x="12" y="17" width="56" height="56" fill="#1590e8"/><text x="82" y="61" font-family="Arial,sans-serif" font-size="49" font-weight="800" fill="#ed1c24">BMJ</text></svg>`);
  const fallbackHero=svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 560"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#092f52"/><stop offset="1" stop-color="#0d75a8"/></linearGradient></defs><rect width="1200" height="560" fill="url(#g)"/><g fill="#fff" opacity=".10"><rect x="70" y="220" width="430" height="230" rx="10"/><rect x="540" y="160" width="560" height="290" rx="12"/><rect x="115" y="170" width="55" height="280"/><rect x="230" y="130" width="45" height="320"/><rect x="680" y="90" width="52" height="360"/><rect x="830" y="125" width="44" height="325"/><path d="M0 455h1200v105H0z"/></g><g fill="none" stroke="#bfe5ff" stroke-width="7" opacity=".5"><path d="M90 390h330v-95H90zM590 370h430v-140H590z"/><path d="M155 295v95m85-95v95m85-95v95m340-160v140m100-140v140m100-140v140"/></g><text x="70" y="105" fill="#fff" font-family="Arial,sans-serif" font-size="54" font-weight="700">BMJ Packaging Offset</text><text x="73" y="148" fill="#c7e7ff" font-family="Arial,sans-serif" font-size="23">Operational Intelligence Platform</text></svg>`);
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
  logo=logo||fallbackLogo;hero=hero||fallbackHero;splash=splash||hero;
  const st=document.createElement('style');
  st.textContent=`.home-hero,.login-visual,.password-visual{background-image:url("${hero}")!important;background-size:cover;background-position:center}`;
  document.head.appendChild(st);
  const apply=()=>{
    document.querySelectorAll('img[src="assets/logo-bmj.png"]').forEach(i=>{if(i.src!==logo)i.src=logo;i.onerror=()=>{i.onerror=null;i.src=fallbackLogo;};});
    document.querySelectorAll('img[src="assets/splash-factory.png"]').forEach(i=>{if(i.src!==splash)i.src=splash;i.onerror=()=>{i.onerror=null;i.src=fallbackHero;};});
  };
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  apply();
})();