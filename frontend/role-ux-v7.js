/* BMJ OEE role UX v7 — presentation and navigation guard only. Backend remains authority. */
(()=>{
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const superViews=new Set(['users','audit','integrations','import']);
  const roleLabel=()=>user?.role==='superadmin'?'Superadmin':user?.role==='admin'?'Admin Department':'View Only';
  const perms=()=>Array.isArray(user?.permissions)?user.permissions:[];
  const configAllowed=()=>user?.role==='superadmin'||(user?.role==='admin'&&perms().includes('config'));
  const viewAllowed=v=>(!superViews.has(v)&&v!=='settings')||user?.role==='superadmin'||(v==='settings'&&configAllowed());
  const mutationSummary=()=>{
    if(user?.role==='superadmin')return 'Akses penuh seluruh department, akun, konfigurasi, dan CRUD.';
    if(user?.role==='admin'){
      const p=perms();
      return `Scope ${user.department||'department'} · ${p.length?p.join(', '):'tanpa izin perubahan'}.`;
    }
    return 'Mode view-only. Data dapat dilihat dan ditelusuri tanpa izin perubahan.';
  };
  function guardNavigation(){
    qa('[data-view]').forEach(el=>{
      const allowed=viewAllowed(el.dataset.view);
      if(el.hidden===allowed)el.hidden=!allowed;
      if(allowed)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden','true');
    });
  }
  function roleChip(){
    const host=q('.user');if(!host||!user)return;
    let chip=host.querySelector('.role-ux-chip');
    if(!chip){chip=document.createElement('span');chip.className='role-ux-chip';const logout=host.querySelector('#logout,.logout-compact');host.insertBefore(chip,logout||null);}
    const cls=`role-ux-chip role-${user.role||'user'}`;if(chip.className!==cls)chip.className=cls;
    const label=roleLabel(),title=mutationSummary();if(chip.textContent!==label)chip.textContent=label;if(chip.title!==title)chip.title=title;
  }
  function scopeBanner(){
    const c=q('#content');if(!c||!user)return;
    const current=typeof view==='string'?view:'dashboard';
    const dataViews=current==='workspace'||current.startsWith('dept:')||['operations','documents','quality','shopfloor','live','settings'].includes(current);
    let n=c.querySelector(':scope > .role-ux-scope');
    if(!dataViews||user.role==='superadmin'){if(n)n.remove();return;}
    const mode=user.role==='user'?'Mode View Only':'Scope Admin Department';
    const summary=mutationSummary();
    const klass=`role-ux-scope ${user.role==='user'?'is-readonly':'is-admin'}`;
    if(!n){n=document.createElement('div');const h=c.querySelector('.heading');if(h)h.insertAdjacentElement('afterend',n);else c.prepend(n);}
    if(n.className!==klass)n.className=klass;
    const signature=`${mode}|${summary}`;
    if(n.dataset.signature!==signature){n.dataset.signature=signature;n.innerHTML=`<strong>${esc(mode)}</strong><span>${esc(summary)}</span>`;}
  }
  function scopeConfigDepartment(){
    if(user?.role!=='admin')return;
    const select=q('#de5Config select[name="department"]');
    if(!select||select.dataset.roleScoped)return;
    const own=user.department||'';
    [...select.options].forEach(o=>{if(o.value!==own)o.remove();});
    if(own){select.value=own;select.disabled=true;select.setAttribute('aria-label','Department dikunci sesuai scope admin');}
    select.dataset.roleScoped='1';
  }
  function markReadOnlyDialogs(){
    const d=q('#modal');if(!d?.open||user?.role!=='user')return;
    const form=d.querySelector('form');if(!form)return;
    const hasMutation=[...form.querySelectorAll('button')].some(b=>/simpan|hapus|start|finish|publikasi|tambah|ubah/i.test(b.textContent||''));
    if(hasMutation&&!d.querySelector('.role-ux-dialog-note')){
      const note=document.createElement('div');note.className='role-ux-dialog-note';note.textContent='Akun ini view-only. Aksi perubahan data tidak tersedia.';d.querySelector('.dialogbody')?.prepend(note);
    }
  }
  function emptyStatePolish(){
    qa('.empty').forEach(e=>{if(e.dataset.roleUx)return;e.dataset.roleUx='1';e.setAttribute('role','status');});
    qa('.errorbox').forEach(e=>{if(e.dataset.roleUx)return;e.dataset.roleUx='1';e.setAttribute('role','alert');});
    qa('.loading-panel').forEach(e=>{if(e.dataset.roleUx)return;e.dataset.roleUx='1';e.setAttribute('role','status');e.setAttribute('aria-live','polite');});
  }
  function enhance(){guardNavigation();roleChip();scopeBanner();scopeConfigDepartment();markReadOnlyDialogs();emptyStatePolish();}
  let raf=0;const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(enhance);};
  document.addEventListener('click',e=>{
    const nav=e.target.closest?.('[data-view]');if(!nav)return;
    if(!viewAllowed(nav.dataset.view)){e.preventDefault();e.stopImmediatePropagation();toast('Menu tersebut tidak tersedia untuk role akun ini.');}
  },true);
  const boot=()=>{enhance();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
