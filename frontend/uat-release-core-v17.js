/* BMJ OEE UAT & Go-Live Center v17 core */
(()=>{
 const keys={roles:'UAT_RELEASE.roles',devices:'UAT_RELEASE.devices',data:'UAT_RELEASE.data',display:'UAT_RELEASE.display',recovery:'UAT_RELEASE.recovery',integrations:'UAT_RELEASE.integrations',signoff:'UAT_RELEASE.signoff'};
 const read=key=>{const s=(catalog?.settings||[]).find(x=>x.key===key);if(!s)return {};try{return typeof s.value==='string'?JSON.parse(s.value):s.value||{}}catch{return {}}};
 const pass=v=>['passed','not_applicable'].includes(String(v?.status||''));
 const rows=()=>[['UAT role & permission',read(keys.roles)],['Browser & device',read(keys.devices)],['Rekonsiliasi data',read(keys.data)],['Display mesin',read(keys.display)],['Backup & recovery',read(keys.recovery)],['Integrasi & hardware',read(keys.integrations)],['Final sign-off',read(keys.signoff)]];
 window.UAT17={keys,read,pass,rows};
 const oldShell=shell;shell=function(){oldShell();const nav=document.querySelector('.navscroll');if(!nav||nav.querySelector('[data-view="uat-release"]'))return;const b=document.createElement('button');b.className='nav';b.dataset.view='uat-release';b.innerHTML=`${icon('shield')}<span>UAT & Go-Live</span>`;b.onclick=()=>navigate('uat-release');nav.append(b)};
 const oldRender=render;render=async function(){if(view==='uat-release')return window.UAT17View?.render();return oldRender()};
})();
