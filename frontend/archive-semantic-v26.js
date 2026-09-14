/* BMJ OEE Archive Semantic v26 — preserves Excel coordinates while adding conservative business labels. */
(()=>{
 const baseDepartmentHomeV26=departmentHome;
 departmentHome=async function(dept){
  const out=await baseDepartmentHomeV26(dept);
  if(departmentMode==='archive')queueMicrotask(()=>enhanceArchiveV26(dept));
  return out;
 };
 const payload=r=>{try{return JSON.parse(r?.payload||'{}')}catch{return {}}};
 const value=c=>c&&typeof c==='object'&&'v' in c?c.v:c;
 const column=k=>/^[A-Z]{1,3}$/.test(String(k||''));
 const textish=v=>{
  if(typeof v!=='string')return false;
  const s=v.trim();if(!s||s.length>64)return false;
  if(/^#(N\/A|VALUE!|DIV\/0!|REF!|NAME\?|NUM!|NULL!)$/i.test(s))return false;
  if(/^[-+]?\d+(?:[.,]\d+)?%?$/.test(s))return false;
  if(/^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(s))return false;
  return /[A-Za-zÀ-ÿ]/.test(s);
 };
 function inferHeader(){
  const candidates=(rows||[]).filter(r=>Number(r.row_num||999)<=15).map(r=>{
   const p=payload(r),cells=Object.entries(p).filter(([k,c])=>column(k)&&value(c)!==null&&value(c)!=='');
   if(cells.length<3)return null;
   const labels=cells.filter(([,c])=>textish(value(c))).map(([k,c])=>[k,String(value(c)).trim().replace(/\s+/g,' ')]);
   const ratio=labels.length/cells.length,unique=new Set(labels.map(([,v])=>v.toLowerCase())).size;
   if(labels.length<3||ratio<0.6||unique/labels.length<0.8)return null;
   const score=labels.length*5+ratio*5-Number(r.row_num||0)*0.12;
   return {row:r.row_num,labels:Object.fromEntries(labels),score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.row-b.row);
  return candidates[0]||null;
 }
 function enhanceArchiveV26(dept){
  const table=document.querySelector('#content .tablewrap table');if(!table||table.classList.contains('module-table-v25')||table.dataset.archiveV26)return;
  table.dataset.archiveV26='1';table.classList.add('archive-semantic-v26');
  const inferred=inferHeader(),heads=[...table.querySelectorAll('thead th')].slice(1);
  heads.forEach(th=>{
   const coord=(th.textContent||'').trim();if(!column(coord))return;
   const label=inferred?.labels?.[coord];th.textContent='';
   const c=document.createElement('span');c.className='v26-col-coordinate';c.textContent=coord;th.append(c);
   if(label){const l=document.createElement('span');l.className='v26-col-label';l.textContent=label;th.append(l);th.title=`Kolom ${coord} · label sumber: ${label}`;}
  });
  if(inferred){
   const idx=(rows||[]).findIndex(r=>Number(r.row_num)===Number(inferred.row));
   if(idx>=0)table.querySelectorAll('tbody tr')[idx]?.classList.add('v26-source-header-row');
  }
  const wrap=table.closest('.tablewrap');if(!wrap||document.querySelector('.v26-archive-context'))return;
  const sheet=(catalog?.sheets||[]).find(s=>s.id===activeSheet),source=(catalog?.sources||[]).find(s=>s.id===sheet?.source_id);
  const bar=document.createElement('div');bar.className='v26-archive-context';
  const left=document.createElement('div');
  const title=document.createElement('strong');title.textContent='Arsip sumber · '+(sheet?.name||'Sheet');
  const desc=document.createElement('span');desc.textContent=inferred?`Label bisnis terdeteksi dari baris ${inferred.row}; koordinat Excel tetap ditampilkan untuk audit.`:'Header bisnis belum dapat disimpulkan secara aman; koordinat Excel ditampilkan apa adanya.';
  left.append(title,desc);
  const right=document.createElement('div');right.className='v26-archive-meta';
  const owner=document.createElement('span');owner.textContent=departments[dept]||dept;
  const file=document.createElement('span');file.textContent=source?.name||'Sumber terdaftar';
  const count=document.createElement('span');count.textContent=`${fmt(total||0)} baris`;
  right.append(owner,file,count);bar.append(left,right);wrap.insertAdjacentElement('beforebegin',bar);
  wrap.setAttribute('aria-label',`Arsip sumber ${sheet?.name||''}. Koordinat Excel dan nilai asli dipertahankan.`);
 }
})();
