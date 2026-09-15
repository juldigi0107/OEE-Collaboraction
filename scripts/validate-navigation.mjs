import fs from 'node:fs';

const index=fs.readFileSync('frontend/index.html','utf8');
const workspace=fs.readFileSync('frontend/workspace.js','utf8');
const active=[...index.matchAll(/<script[^>]+src="([^"]+\.js)(?:\?[^\"]*)?"/g)].map(m=>m[1]);
const bundle=active.map(p=>fs.readFileSync('frontend/'+p,'utf8')).join('\n');
const displayFront=fs.readFileSync('frontend/display-depth-v42.js','utf8');
const displayBack=fs.readFileSync('backend/release-v42-display-safety.mjs','utf8');
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

const releaseRoutes=[
  ['governance',"view==='governance'",'renderGovernance','data-view="governance"'],
  ['data-governance',"view==='data-governance'",'DG16View?.render','data-view="data-governance"'],
  ['operational-control',"view==='operational-control'",'OC31View?.render','data-view="operational-control"'],
  ['uat-release',"view==='uat-release'",'UAT17View?.render','data-view="uat-release"'],
  ['support-recovery',"view==='support-recovery'",'supportRecovery','data-view="support-recovery"'],
  ['approvals',"view==='approvals'",'approvalWorkspace','data-view="approvals"']
];
for(const [view,routeMarker,handlerMarker,menuMarker] of releaseRoutes){
  need(bundle.includes(routeMarker),`Route release-control ${view} tidak ditemukan.`);
  need(bundle.includes(handlerMarker),`Handler release-control ${view} tidak ditemukan.`);
  need(bundle.includes(menuMarker),`Menu release-control ${view} tidak ditemukan.`);
}
need(bundle.includes("view==='departments'")&&bundle.includes('departmentHub64')&&bundle.includes("hub.dataset.view='departments'"),'Department Hub route/menu tidak lengkap.');
need(bundle.includes("user?.role==='superadmin'&&!nav.querySelector('[data-view=\"governance\"]')"),'Tata Kelola & Readiness tidak dijaga untuk Superadmin.');
need(bundle.includes("if(user?.role!=='superadmin')return")&&bundle.includes('data-view="support-recovery"'),'Support & Recovery tidak dijaga untuk Superadmin.');
need(index.includes('role-ux-v7.js'),'Role UX guard tidak dimuat.');
need(index.includes('asset-repair-v9.js'),'BMJ logo/hero runtime tidak dimuat.');
need(index.includes('field-display-v8.js'),'Field display runtime tidak dimuat.');
need(index.includes('data-governance-core-v16.js'),'Data Governance runtime tidak dimuat.');
need(index.includes('operational-control-core-v31.js'),'Operational Control runtime tidak dimuat.');
need(index.includes('uat-release-core-v17.js'),'UAT & Go-Live runtime tidak dimuat.');
need(index.includes('support-recovery-v21.js'),'Support & Recovery runtime tidak dimuat.');
need(index.includes('form-semantics-v65.js')&&bundle.includes('Arsipkan transaksi')&&bundle.includes('Satuan wajib'),'Form Semantics v65 tidak aktif/lengkap.');
need(index.includes('page-integrity-v66.js')&&bundle.includes('__RESELECT_REQUIRED__')&&bundle.includes('decorateApprovalHistory'),'Page Integrity v66 tidak aktif/lengkap.');
need(index.includes('live-page-integrity-v67.js')&&bundle.includes('telemetry_trusted')&&bundle.includes('counter/speed disembunyikan'),'Live Page Integrity v67 tidak aktif/lengkap.');
need(index.includes('dashboard-role-depth-v68.js')&&bundle.includes('Role Depth v68')&&bundle.includes('Definisi, authority & periode KPI'),'Dashboard Role Depth v68 tidak aktif/lengkap.');
need(
  displayFront.includes('function machineAuthority')&&
  displayFront.includes('machineCanonical')&&
  displayFront.includes("ready:!!name&&!!machine&&authority.canonical")&&
  displayBack.includes('canonicalMachineProblem')&&
  displayBack.includes('Machine assignment harus memakai canonical machine yang sudah disahkan pada Data Governance'),
  'Display publish canonical-machine guard tidak lengkap.'
);
need(
  index.includes('integration-safety-v69.js')&&
  bundle.includes('PRODUCTION CONNECTION POLICY')&&
  bundle.includes('Worker Secret')&&
  bundle.includes('private/link-local address'),
  'Integration Safety v69 tidak aktif/lengkap.'
);

if(errors.length){
  console.error('Navigation validation FAILED');
  for(const e of errors)console.error('- '+e);
  process.exit(1);
}
console.log(`Navigation validation OK — ${Object.keys(handlers).length+1+releaseRoutes.length+1} routes + critical guards checked across ${active.length} active JS bundles.`);
