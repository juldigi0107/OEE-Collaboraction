import fs from 'node:fs';

const index=fs.readFileSync('frontend/index.html','utf8');
const workspace=fs.readFileSync('frontend/workspace.js','utf8');
const active=[...index.matchAll(/<script[^>]+src="([^"]+\.js)(?:\?[^\"]*)?"/g)].map(m=>m[1]);
const bundle=active.map(p=>fs.readFileSync('frontend/'+p,'utf8')).join('\n');
const errors=[];
const need=(ok,msg)=>{if(!ok)errors.push(msg);};

const handlers={
  dashboard:'dashboard',
  documents:'documents',
  quality:'quality',
  operations:'operations',
  users:'users',
  settings:'settings',
  audit:'audit',
  import:'importCenter',
  shopfloor:'shopfloor',
  live:'liveMachines',
  integrations:'integrations'
};

const defined=name=>
  new RegExp(`function\\s+${name}\\s*\\(`).test(bundle)||
  new RegExp(`(?:window\\.)?${name}\\s*=\\s*(?:async\\s*)?function\\s*\\(`).test(bundle)||
  new RegExp(`(?:window\\.)?${name}\\s*=\\s*(?:async\\s*)?\\(`).test(bundle);

for(const [view,handler] of Object.entries(handlers)){
  need(workspace.includes(`view==='${view}'`)||workspace.includes(`view === '${view}'`),`Render route ${view} tidak ditemukan.`);
  need(defined(handler),`Handler ${handler} untuk route ${view} tidak ditemukan pada bundle aktif.`);
}

need(workspace.includes("view.startsWith('dept:')"),'Render route department dinamis tidak ditemukan.');
need(defined('departmentHome'),'Handler departmentHome tidak ditemukan.');
need(workspace.includes("nav('dashboard'"),'Menu Beranda hilang.');
need(workspace.includes("nav('shopfloor'"),'Menu HMI produksi hilang.');
need(workspace.includes("nav('live'"),'Menu Status mesin hilang.');
need(workspace.includes("nav('documents'"),'Menu Dokumen & aset hilang.');
need(workspace.includes("nav('quality'"),'Menu Validasi sumber hilang.');
need(workspace.includes("user.role==='superadmin'"),'Guard menu Superadmin hilang.');
need(workspace.includes("can(user.department,'config')"),'Guard menu Konfigurasi hilang.');
need(index.includes('role-ux-v7.js'),'Role UX guard tidak dimuat.');
need(index.includes('asset-repair-v9.js'),'BMJ logo/hero runtime tidak dimuat.');
need(index.includes('field-display-v8.js'),'Field display runtime tidak dimuat.');

if(errors.length){
  console.error('Navigation validation FAILED');
  for(const e of errors)console.error('- '+e);
  process.exit(1);
}
console.log(`Navigation validation OK — ${Object.keys(handlers).length+1} routes + critical guards checked across ${active.length} active JS bundles.`);
