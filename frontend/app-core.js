const $=s=>document.querySelector(s),app=$('#app'),modal=$('#modal');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:d}):'—';const pct=n=>typeof n==='number'?fmt(n*100,2)+'%':'—';
const APP_NAME='OEE COLLABORACTION - BMJ PACKAGING OFFSET';
const APP_TAG='Intelligent Platform © 2026 IDJ';
const APP_SHORT='OEE COLLABORACTION';
let base=window.OEE_CONFIG.apiBase||'',token=sessionStorage.getItem('oee-token')||'',user,catalog,view='dashboard',activeSheet='',page=0,query='',rows=[],total=0;
const svgPaths={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 production:'<path d="M3 21V9l6 3V9l6 3V5h6v16z"/><path d="M7 17h2m3 0h2m3 0h2"/>',
 quality:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-5"/>',
 maintenance:'<path d="M14 7a4 4 0 0 0-5-4l2.5 2.5L9 8 6.5 5.5A4 4 0 0 0 11 10l7.5 7.5a2 2 0 1 0 2.8-2.8z"/>',
 planning:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18M8 14h3m2 0h3m-8 4h3"/>',
 development:'<path d="M9 18h6M10 22h4M8 14c-2-1-3-3-3-5a7 7 0 0 1 14 0c0 2-1 4-3 5-1 1-1 2-1 3H9c0-1 0-2-1-3z"/>',
 project:'<path d="M4 7h16v13H4zM8 7V4h8v3"/><path d="M9 13h6"/>',
 transactions:'<path d="M4 7h16M4 12h16M4 17h16"/><path d="M8 4v16"/>',
 documents:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6m-6 4h6"/>',
 validation:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6"/>',
 config:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3h4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.1v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
 audit:'<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5M8 17h3"/>',
 logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 shield:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
 availability:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 performance:'<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>',
 oee:'<circle cx="12" cy="12" r="9"/><path d="M12 12l5-3M8 17h8"/>',
 trend:'<path d="M3 17l6-6 4 4 8-9"/><path d="M16 6h5v5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
 machine:'<path d="M4 20V8h16v12zM8 8V4h8v4"/><circle cx="9" cy="14" r="2"/><path d="M14 13h3m-3 4h3"/>',
 file:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/>',
 database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
 alert:'<path d="M12 3l10 18H2z"/><path d="M12 9v5m0 3h.01"/>',
 check:'<path d="M4 12l5 5L20 6"/>',
 edit:'<path d="M4 20h4l11-11-4-4L4 16zM13 7l4 4"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/>',
 upload:'<path d="M12 16V4m-4 4l4-4 4 4M4 20h16"/>',
 download:'<path d="M12 4v12m-4-4l4 4 4-4M4 20h16"/>',
 filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>'
};
const icon=(name,cls='')=>`<span class="svg-icon ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${svgPaths[name]||svgPaths.dashboard}</svg></span>`;
const departments={PROD:'Produksi',QC:'Quality Control',MTC:'Maintenance',PPIC:'Planning & Konfirmasi',PDS:'Development',PROJECT:'Proyek & Master'};
const modules={confirmation:['Konfirmasi PPIC','PPIC'],planning:['Planning produksi','PPIC'],production:['Hasil produksi','PROD'],downtime:['PDT / UPDT & COJ','PROD'],quality:['Reject & QC','QC'],maintenance:['Corrective maintenance','MTC'],development:['Biaya & trial','PDS'],checklist:['Checklist persiapan','PROD'],logbook:['Logbook','PROD'],process:['Process performance','QC'],energy:['Energi','PROD'],master:['Master data','PROJECT'],project:['Action plan proyek','PROJECT']};
const can=(d,a)=>user?.role==='superadmin'||(user?.role==='admin'&&user.department===d&&user.permissions.includes(a));
const toast=t=>{$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',6500);};
async function api(path,method='GET',data){if(!base)throw Error('Backend Cloudflare belum terhubung.');const r=await fetch(base.replace(/\/$/,'')+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});let v;try{v=await r.json();}catch{throw Error('Respons backend bukan JSON.');}if(!r.ok){if(r.status===401&&user){user=null;token='';sessionStorage.removeItem('oee-token');login();}throw Error(v.error||'Permintaan gagal');}return v;}
function dialog(title,content){modal.innerHTML=`<div class="dialoghead"><h2 style="margin:0">${esc(title)}</h2><button id="closeDialog" aria-label="Tutup">×</button></div><div class="dialogbody">${content}</div>`;$('#closeDialog').onclick=()=>modal.close();modal.showModal();}
