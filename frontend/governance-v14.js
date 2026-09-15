/* BMJ OEE governance v14 — business-facing administration and safe audit presentation. */
(()=>{
  const roleLabel={superadmin:'Superadmin',admin:'Admin Department',user:'Viewer'};
  const permissionLabel={create:'Tambah data',update:'Ubah data',delete:'Arsipkan data',config:'Konfigurasi'};
  const redact=value=>{
    let v=value;try{v=typeof value==='string'?JSON.parse(value):value;}catch{return String(value||'—')}
    const walk=x=>{if(Array.isArray(x))return x.map(walk);if(x&&typeof x==='object'){const out={};for(const [k,val] of Object.entries(x))out[k]=/(password|hash|salt|token|secret|credential)/i.test(k)?'[disamarkan]':walk(val);return out;}return x;};
    return JSON.stringify(walk(v),null,2);
  };
  const actionText=a=>String(a||'Aktivitas').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/Create/g,'Tambah').replace(/Update/g,'Ubah').replace(/Delete/g,'Arsipkan').replace(/Login/g,'Login').replace(/Logout/g,'Logout');

  const userFormBase=userForm;
  userForm=function(u={}){
    userFormBase(u);
    const role=document.querySelector('#userForm select[name="role"]');if(role)[...role.options].forEach(o=>o.textContent=roleLabel[o.value]||o.value);
    const dept=document.querySelector('#userForm select[name="department"]');if(dept)[...dept.options].forEach(o=>o.textContent=departments[o.value]||o.value);
    document.querySelectorAll('#userForm input[name="permissions"]').forEach(input=>{const label=input.closest('label');if(!label)return;const text=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(text)text.textContent=' '+(permissionLabel[input.value]||input.value);});
    const sheet=document.querySelector('#userForm .sheetinfo');if(sheet)sheet.textContent='Admin hanya dapat mengubah data pada department sendiri sesuai izin. Viewer selalu read-only. Arsip menggunakan soft delete sehingga jejak sumber/audit dipertahankan. Perubahan akun mengakhiri sesi akun terkait untuk keamanan.';
  };

  audit=async function(){
    const data=await api('/audit'),actors=new Set(data.map(x=>x.user_id||x.name).filter(Boolean)),today=new Date().toISOString().slice(0,10),todayCount=data.filter(x=>String(x.created||'').slice(0,10)===today).length,archived=data.filter(x=>/delete|hapus|arsip/i.test(x.action||'')).length;
    $('#content').innerHTML=heading('Riwayat Aktivitas','Jejak perubahan dan aktivitas administratif yang dapat ditelusuri')+
      `<div class="release-kpis"><div><span>Aktivitas ditampilkan</span><strong>${fmt(data.length)}</strong><small>maksimum 200 terbaru</small></div><div><span>Pengguna terkait</span><strong>${fmt(actors.size)}</strong><small>berdasarkan audit aktif</small></div><div><span>Aktivitas hari ini</span><strong>${fmt(todayCount)}</strong><small>mengikuti timestamp server</small></div><div><span>Aksi pengarsipan</span><strong>${fmt(archived)}</strong><small>soft delete tetap memiliki jejak audit</small></div></div>`+
      `<section class="panel"><div class="release-section-head"><div><h2>Riwayat aktivitas</h2><p>Nilai sensitif disamarkan pada tampilan ini. Data yang diarsipkan tidak dianggap hilang dari audit trail.</p></div></div><div class="tablewrap"><table class="release-table audit-release-table"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Objek</th><th>Detail</th></tr></thead><tbody>${data.map((a,i)=>`<tr><td>${esc(new Date(a.created).toLocaleString('id-ID'))}</td><td><strong>${esc(a.name||'System')}</strong></td><td>${esc(actionText(a.action))}</td><td>${esc(a.entity_id||'—')}</td><td><details><summary>Lihat perubahan</summary><div class="audit-diff"><div><span>Sebelum</span><pre>${esc(redact(a.before_json))}</pre></div><div><span>Sesudah</span><pre>${esc(redact(a.after_json))}</pre></div></div></details></td></tr>`).join('')||'<tr><td colspan="5"><div class="release-empty">Belum ada aktivitas yang tercatat.</div></td></tr>'}</tbody></table></div></section>`;
  };

  const integrationsBase=integrations;
  integrations=async function(){
    await integrationsBase();
    const h=document.querySelector('#content .heading h1');if(h)h.textContent='Integrasi & Sumber Realtime';
    const d=document.querySelector('#content .heading .muted');if(d)d.textContent='Kelola koneksi mesin, ODIN, SAP, dan analytics tanpa menyimpan credential pada browser';
    document.querySelectorAll('.integration-card').forEach(card=>{
      const badge=card.querySelector('.connection-status');if(!badge)return;const text=badge.textContent||'';
      if(/^Disabled/i.test(text))badge.textContent='Nonaktif';
      else if(/OK/i.test(text))badge.textContent='Terhubung · sinkron terakhir OK';
      else if(/ERROR/i.test(text))badge.textContent='Aktif · sinkronisasi error';
      else badge.textContent='Aktif · menunggu verifikasi koneksi';
    });
    const flow=document.querySelector('.architecture-flow');if(flow){const spans=flow.querySelectorAll('span');if(spans[0])spans[0].textContent='Mesin / Sistem Lokal';if(spans[1])spans[1].textContent='Secure Edge Gateway';if(spans[2])spans[2].textContent='Cloudflare Worker';if(spans[3])spans[3].textContent='D1 Operational Data';if(spans[4])spans[4].textContent='HMI · Dashboard · Analytics';}
  };
})();
