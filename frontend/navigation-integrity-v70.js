/* OEE Collaboraction Navigation Integrity v70 — remove dead controls and make top-level navigation truthful. */
(()=>{
 const menuIntent=[
  [/(hmi|shopfloor|start pro|finish pro)/i,'shopfloor'],
  [/(status mesin|monitoring|realtime|heartbeat)/i,'live'],
  [/(quality|kualitas data|validasi|rekonsiliasi)/i,'quality'],
  [/(approval|verifikasi|persetujuan)/i,'approvals'],
  [/(akun|user|izin|akses)/i,'users'],
  [/(integrasi|sap|odin|qlik|edge|plc)/i,'integrations'],
  [/(audit|riwayat aktivitas)/i,'audit'],
  [/(impor|import)/i,'import'],
  [/(konfigurasi|settings|display|layout)/i,'settings'],
  [/(governance|tata kelola|readiness)/i,'governance'],
  [/(standar operasional|cycle target|loss time|machine trigger)/i,'operational-control'],
  [/(uat|go live|signoff)/i,'uat-release'],
  [/(support|pemulihan|backup|restore)/i,'support-recovery'],
  [/(department|workspace)/i,'departments']
 ];
 const allowedView=v=>{
  if(['users','integrations','audit','import','governance','operational-control','uat-release','support-recovery'].includes(v))return user?.role==='superadmin';
  if(v==='settings')return user?.role==='superadmin'||can(user?.department,'config');
  if(v==='approvals')return user?.role==='superadmin'||(user?.role==='admin'&&['PROD','QC'].includes(user?.department));
  return true;
 };
 function patchLogin(){
  const foot=document.querySelector('.login-foot');if(!foot||foot.dataset.v70)return;foot.dataset.v70='1';
  const remember=foot.querySelector('#rememberHint')?.closest('label');if(remember)remember.remove();
  let info=foot.querySelector('.v70-session-note');if(!info){info=document.createElement('span');info.className='v70-session-note';foot.prepend(info);}info.textContent='Sesi hanya disimpan untuk sesi browser ini.';
 }
 if(typeof login==='function'){
  const baseLogin=login;login=function(...args){const out=baseLogin(...args);queueMicrotask(patchLogin);return out;};
 }
 function routeSearch(raw){
  const q=String(raw||'').trim();if(!q)return;
  const intent=menuIntent.find(([re,v])=>re.test(q)&&allowedView(v));
  if(intent){navigate(intent[1]);return;}
  view='documents';query=q;page=0;shell();render();
 }
 const baseDocuments=typeof documents==='function'?documents:null;
 if(baseDocuments){documents=function(...args){const out=baseDocuments(...args);queueMicrotask(()=>{const input=$('#sourceSearch');if(input&&query){input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}));}});return out;};}
 async function operationalInbox(){
  let pending=0,openDown=0,openMtc=0,offline=0,approvalAvailable=false;
  try{const d=await api('/realtime/overview');openDown=(d.downtime||[]).length;openMtc=(d.maintenance||[]).length;offline=(d.machines||[]).filter(m=>String(m.state||'').toUpperCase()==='OFFLINE').length;}catch{}
  if(user?.role==='superadmin'||(user?.role==='admin'&&['PROD','QC'].includes(user?.department))){try{const a=await api('/approvals');pending=Number(a?.summary?.pending||0);approvalAvailable=true;}catch{}}
  const sheets=(catalog?.sheets||[]),attention=sheets.filter(s=>{try{const m=typeof s.meta==='string'?JSON.parse(s.meta):s.meta||{};return Number(m.errors||0)>0||Number(m.missing_cache||0)>0;}catch{return false;}}).length;
  dialog('Operational Inbox',`<div class="release-kpis v70-inbox-kpis"><div><span>Approval pending</span><strong>${approvalAvailable?fmt(pending):'—'}</strong><small>${approvalAvailable?'scope akun Anda':'tidak termasuk scope role'}</small></div><div><span>Downtime aktif</span><strong>${fmt(openDown)}</strong><small>realtime overview</small></div><div><span>Maintenance aktif</span><strong>${fmt(openMtc)}</strong><small>belum closed</small></div><div><span>Sheet perlu perhatian</span><strong>${fmt(attention)}</strong><small>error / formula kosong</small></div></div><div class="formactions v70-inbox-actions">${approvalAvailable?'<button type="button" data-v70-go="approvals">Buka Approval</button>':''}<button type="button" data-v70-go="live">Status Mesin${offline?` · ${fmt(offline)} offline`:''}</button><button type="button" data-v70-go="quality">Kualitas Data</button></div><p class="muted">Inbox ini merangkum kondisi yang tersedia saat dibuka. Nilai kosong tidak diganti dengan estimasi.</p>`);
  document.querySelectorAll('#modal [data-v70-go]').forEach(b=>b.onclick=()=>{modal.close();navigate(b.dataset.v70Go);});
 }
 function patchNetworkLabel(){const s=document.querySelector('.top-status');if(!s)return;s.textContent=navigator.onLine?'Jaringan online':'Jaringan offline';s.title='Status koneksi jaringan perangkat. Health backend diverifikasi terpisah oleh aplikasi/CI.';}
 function patchShell(){
  const search=$('#globalSearch');if(search&&!search.dataset.v70){search.dataset.v70='1';search.placeholder='Cari menu atau sumber data…';search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();routeSearch(e.currentTarget.value);}};}
  const actions=document.querySelector('.top-actions');if(actions){const bell=[...actions.querySelectorAll('button')].find(b=>b.title==='Notifikasi'||b.getAttribute('aria-label')==='Notifikasi'||b.querySelector('use')?.getAttribute('href')?.includes('#bell'));if(bell&&!bell.dataset.v70){bell.dataset.v70='1';bell.title='Operational Inbox';bell.setAttribute('aria-label','Buka Operational Inbox');bell.onclick=operationalInbox;}}
  const workspace=document.querySelector('[data-view="workspace"] span');if(workspace)workspace.textContent='Department Hub';
  patchNetworkLabel();
 }
 if(typeof shell==='function'){
  const baseShell=shell;shell=function(...args){const out=baseShell(...args);queueMicrotask(patchShell);return out;};
 }
 addEventListener('online',()=>setTimeout(patchNetworkLabel,0));addEventListener('offline',()=>setTimeout(patchNetworkLabel,0));
 queueMicrotask(()=>{patchLogin();patchShell();});
 window.NavigationIntegrityV70={patchLogin,patchShell,routeSearch,operationalInbox};
})();
