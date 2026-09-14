/* BMJ OEE Operational Control v31 core */
(()=>{
 const keys={
  cycle:'OPERATIONAL_CONTROL.cycle_targets',
  loss:'OPERATIONAL_CONTROL.loss_time_classification',
  triggers:'OPERATIONAL_CONTROL.machine_triggers',
  owners:'OPERATIONAL_CONTROL.field_ownership',
  delivery:'OPERATIONAL_CONTROL.delivery_plan'
 };
 const read=key=>{const s=(catalog?.settings||[]).find(x=>x.key===key);if(!s)return {};try{return typeof s.value==='string'?JSON.parse(s.value):s.value||{}}catch{return {}}};
 const approved=v=>v?.approved===true||v?.approved==='true'||v?.approved===1;
 const items=v=>Array.isArray(v?.items)?v.items:[];
 const state=()=>({cycle:read(keys.cycle),loss:read(keys.loss),triggers:read(keys.triggers),owners:read(keys.owners),delivery:read(keys.delivery)});
 const rows=s=>[
  ['Cycle Target & Ideal Speed',s.cycle],
  ['Klasifikasi Loss-Time',s.loss],
  ['Machine Trigger',s.triggers],
  ['Field Ownership',s.owners],
  ['Delivery & Open Action',s.delivery]
 ];
 window.OC31={keys,read,approved,items,state,rows};
 const oldShell=shell;
 shell=function(){oldShell();if(user?.role!=='superadmin')return;const nav=document.querySelector('.navscroll');if(!nav||nav.querySelector('[data-view="operational-control"]'))return;const b=document.createElement('button');b.className='nav';b.dataset.view='operational-control';b.innerHTML=`${icon('config')}<span>Standar Operasional</span>`;b.onclick=()=>navigate('operational-control');const anchor=nav.querySelector('[data-view="uat-release"]')||nav.querySelector('[data-view="settings"]');if(anchor)anchor.insertAdjacentElement('beforebegin',b);else nav.append(b);};
 const oldRender=render;
 render=async function(){if(view==='operational-control')return window.OC31View?.render();return oldRender();};
})();
