/* BMJ OEE Data Governance v16 core */
(()=>{
 const keys={kpi:'DATA_GOVERNANCE.kpi_definitions',machines:'DATA_GOVERNANCE.machine_aliases',shift:'DATA_GOVERNANCE.shift_calendar',sources:'DATA_GOVERNANCE.source_authority',grain:'DATA_GOVERNANCE.join_grain'};
 const read=(key)=>{const s=(catalog?.settings||[]).find(x=>x.key===key);if(!s)return {};try{return typeof s.value==='string'?JSON.parse(s.value):s.value||{}}catch{return {}}};
 const approved=v=>v?.approved===true||v?.approved==='true'||v?.approved===1;
 const state=()=>({kpi:read(keys.kpi),machines:read(keys.machines),shift:read(keys.shift),sources:read(keys.sources),grain:read(keys.grain)});
 const rows=s=>[['Definisi KPI',s.kpi],['Alias mesin',s.machines],['Kalender shift',s.shift],['Sumber authoritative',s.sources],['Join grain',s.grain]];
 window.DG16={keys,read,approved,state,rows};
 const oldShell=shell;shell=function(){oldShell();const nav=document.querySelector('.navscroll');if(!nav||nav.querySelector('[data-view="data-governance"]'))return;const b=document.createElement('button');b.className='nav';b.dataset.view='data-governance';b.innerHTML=`${icon('shield')}<span>Definisi Data & KPI</span>`;b.onclick=()=>navigate('data-governance');nav.append(b)};
 const oldRender=render;render=async function(){if(view==='data-governance')return window.DG16View?.render();return oldRender()};
})();
