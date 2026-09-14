/* BMJ OEE Data Context v32 — interpretation safeguards without changing stored values. */
(()=>{
 const baseOperationsV32=operations;
 const P=r=>{try{return JSON.parse(r?.payload||'{}')}catch{return {}}};
 const domainByModule={production:'production',downtime:'production',checklist:'production',logbook:'production',process:'production',energy:'production',batch:'production',quality:'quality',maintenance:'maintenance',confirmation:'ppic',planning:'ppic',development:'development',master:'master',project:'master'};
 const domainLabel={production:'Production / OEE',quality:'Quality / Reject',maintenance:'Maintenance / Breakdown',ppic:'PPIC / Planning & Confirmation',development:'PDS / Development',master:'Master / Project'};
 const isDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(String(v)));
 const uniq=a=>[...new Set(a.filter(Boolean))];
 function authority(){const domain=domainByModule[opModule],cfg=window.DG16?DG16.read(DG16.keys.sources):{},approved=!!(window.DG16&&DG16.approved(cfg)),raw=cfg?.domains?.[domain],id=typeof raw==='string'?raw:raw?.source_id,src=(catalog?.sources||[]).find(s=>s.id===id);return {domain,approved,id:id||'',name:src?.name||raw?.source_name||''};}
 function messages(payloads){const out=[];
  if(opModule==='confirmation'){const n=payloads.filter(p=>['qty','scrap','hours'].some(k=>Number.isFinite(Number(p[k]))&&Number(p[k])<0)).length;if(n)out.push(`${n} baris tampil memiliki nilai negatif yang dipertahankan sebagai reversal candidate.`);out.push('PRO bukan natural key tunggal; gunakan transaction key/join grain yang disahkan.');}
  if(opModule==='quality'){const u=uniq(payloads.map(p=>String(p.unit||'').trim()));if(u.length>1)out.push(`Multi-unit terdeteksi (${u.join(', ')}); jangan agregasikan reject/sample lintas satuan.`);out.push('Field kosong tidak dianggap nol.');}
  if(opModule==='maintenance')out.push('Periode maintenance mengikuti rule tanggal kerja yang disahkan; timestamp dapat melintasi akhir bulan.');
  if(opModule==='development')out.push('Periode mengikuti field transaksi dan source authority, bukan nama file.');
  if(opModule==='production'){const k=window.DG16?DG16.read(DG16.keys.kpi):{};if(!(window.DG16&&DG16.approved(k)))out.push('Definisi KPI/Quality Printing belum disahkan; KPI lintas sumber belum authoritative.');}
  if(opModule==='downtime')out.push('PDT/UPDT/COJ authoritative hanya berasal dari baseline Loss-Time yang disahkan.');
  return out;
 }
 function addText(parent,tag,text,cls=''){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=text;parent.append(el);return el;}
 function paint(){if(!Array.isArray(rows)||!opModule)return;const table=document.querySelector('#content .module-table-v25');if(!table)return;document.querySelector('#content .v32-context')?.remove();const payloads=rows.map(P),a=authority(),dates=payloads.map(p=>p.date).filter(isDate).sort(),mix={historical:0,live:0};payloads.forEach(p=>(p.source_sheet||p.source_record)?mix.historical++:mix.live++);
  const box=document.createElement('section');box.className='v32-context';const top=document.createElement('div');top.className='v32-context-main';const title=document.createElement('div');addText(title,'span','DATA CONTEXT','eyebrow');addText(title,'strong',domainLabel[a.domain]||modules[opModule]?.[0]||opModule);addText(title,'small','Periode mengikuti tanggal transaksi, bukan nama file.');top.append(title);addText(top,'span',a.approved&&a.id?`Sumber authoritative · ${a.name||a.id}`:'Source authority belum disahkan',`v32-authority ${a.approved&&a.id?'ok':'pending'}`);box.append(top);
  const facts=document.createElement('div');facts.className='v32-facts';const range=dates.length?(dates[0]===dates.at(-1)?dates[0]:`${dates[0]} — ${dates.at(-1)}`):'Belum tersedia pada baris tampil';for(const [k,v] of [['Rentang baris tampil',range],['Asal baris tampil',`${mix.historical} historis · ${mix.live} operasional`],['Kebijakan unit','Pertahankan satuan sumber; tanpa agregasi lintas unit']]){const s=document.createElement('span');addText(s,'b',k);s.append(document.createTextNode(v));facts.append(s);}box.append(facts);
  const notes=messages(payloads);if(notes.length){const d=document.createElement('details');d.className='v32-notes';addText(d,'summary',`Catatan interpretasi (${notes.length})`);const ul=document.createElement('ul');notes.forEach(n=>addText(ul,'li',n));d.append(ul);box.append(d);}table.closest('.tablewrap')?.insertAdjacentElement('beforebegin',box);
  if(opModule==='confirmation'){[...table.querySelectorAll('tbody tr')].forEach((tr,i)=>{const p=payloads[i];if(!p||!['qty','scrap','hours'].some(k=>Number.isFinite(Number(p[k]))&&Number(p[k])<0))return;tr.classList.add('v32-reversal-row');if(!tr.querySelector('.v32-reversal-badge'))addText(tr.querySelector('td')||tr,'span','Reversal','v32-reversal-badge');});}
 }
 operations=async function(...args){const out=await baseOperationsV32(...args);queueMicrotask(paint);return out;};
 window.DataContextV32={paint,authority,messages};
})();
