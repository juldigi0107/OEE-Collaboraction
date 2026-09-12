const $=s=>document.querySelector(s),app=$('#app'),modal=$('#modal');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:d}):'—';const pct=n=>typeof n==='number'?fmt(n*100,2)+'%':'—';
const APP_NAME='OEE COLLABORACTION - BMJ PACKAGING OFFSET';
const APP_TAG='Intelligent Platform © 2026 IDJ';
const APP_SHORT='OEE COLLABORACTION';
let base=window.OEE_CONFIG.apiBase||'',token=sessionStorage.getItem('oee-token')||'',user,catalog,view='dashboard',activeSheet='',page=0,query='',rows=[],total=0;
const iconIndex={dashboard:0,production:1,quality:2,maintenance:3,planning:4,development:5,project:6,transactions:7,documents:8,validation:9,users:10,config:11,audit:12,logout:13,search:14,shield:15,availability:16,performance:17,oee:18,trend:19,calendar:20,machine:21,file:22,database:23,alert:24,check:25,edit:26,trash:27,upload:28,download:29,filter:30,menu:31};
const icon=(name,cls='')=>{const i=iconIndex[name]??0;return `<span class="raster-icon ${cls}" style="--ix:${i%8};--iy:${Math.floor(i/8)}" aria-hidden="true"></span>`;};
const departments={PROD:'Produksi',QC:'Quality Control',MTC:'Maintenance',PPIC:'Planning & Konfirmasi',PDS:'Development',PROJECT:'Proyek & Master'};
const modules={confirmation:['Konfirmasi PPIC','PPIC'],planning:['Planning produksi','PPIC'],production:['Hasil produksi','PROD'],downtime:['PDT / UPDT & COJ','PROD'],quality:['Reject & QC','QC'],maintenance:['Corrective maintenance','MTC'],development:['Biaya & trial','PDS'],checklist:['Checklist persiapan','PROD'],logbook:['Logbook','PROD'],process:['Process performance','QC'],energy:['Energi','PROD'],master:['Master data','PROJECT'],project:['Action plan proyek','PROJECT']};
const can=(d,a)=>user?.role==='superadmin'||(user?.role==='admin'&&user.department===d&&user.permissions.includes(a));
const toast=t=>{$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',6500);};
async function api(path,method='GET',data){if(!base)throw Error('Backend Cloudflare belum terhubung.');const r=await fetch(base.replace(/\/$/,'')+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});let v;try{v=await r.json();}catch{throw Error('Respons backend bukan JSON.');}if(!r.ok){if(r.status===401&&user){user=null;token='';sessionStorage.removeItem('oee-token');login();}throw Error(v.error||'Permintaan gagal');}return v;}
function dialog(title,content){modal.innerHTML=`<div class="dialoghead"><h2 style="margin:0">${esc(title)}</h2><button id="closeDialog" aria-label="Tutup">×</button></div><div class="dialogbody">${content}</div>`;$('#closeDialog').onclick=()=>modal.close();modal.showModal();}
