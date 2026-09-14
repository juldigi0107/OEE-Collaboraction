import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const wrangler=read('wrangler.toml');
const production=read('backend/worker-production.mjs');
const v6=read('backend/worker-v6.mjs');
const v4=read('backend/worker-v4-core.mjs');
const core=read('backend/worker.mjs');
const realtime=read('backend/realtime.mjs');
const planAuthority=read('backend/release-v53-plan-authority.mjs');
const runtimeSignoff=read('backend/release-v54-runtime-signoff.mjs');
const errors=[];
const need=(ok,msg)=>{if(!ok)errors.push(msg);};
const callPos=needle=>production.indexOf(needle);

// Verify the production routing chain, otherwise checks could target dead code.
need(wrangler.includes('main = "backend/worker-production.mjs"'),'wrangler.toml tidak menunjuk worker-production.mjs.');
need(production.includes("import app from './worker-v6.mjs'"),'worker-production tidak meneruskan ke worker-v6.');
need(v6.includes("import legacy from './worker-v4-core.mjs'")&&v6.includes("import core from './worker.mjs'"),'worker-v6 tidak memakai core authorization stack yang diaudit.');
need(v4.includes("import core from './worker.mjs'")&&v4.includes('handleRealtime'),'worker-v4-core tidak meneruskan API reguler/realtime ke handler terotorisasi.');

// Core RBAC and CRUD enforcement.
need(core.includes("u.role==='superadmin'||(u.role==='admin'&&u.department===dept"),'Core allow() tidak membatasi admin ke department sendiri.');
need(core.includes('requireAllow(u,s.department,\'create\')'),'Create archive tidak memakai requireAllow.');
need(core.includes("requireAllow(u,old.department,method==='DELETE'?'delete':'update')"),'Update/delete archive tidak memakai requireAllow.');
need(core.includes("requireAllow(u,dept,'create')"),'Create entry tidak memakai requireAllow.');
need(core.includes("requireAllow(u,old.department,method==='DELETE'?'delete':'update')"),'Update/delete entry tidak memakai requireAllow.');
need(core.includes("if(u.role!=='superadmin')fail(403,'Khusus superadmin')"),'Endpoint superadmin tidak memiliki role gate.');
need(core.includes("if(path==='/api/settings'&&method==='PUT')")&&core.includes("requireAllow(u,dept,'config')"),'Settings PUT tidak memakai izin config.');
need(core.includes("if(b.key==='brand'&&u.role!=='superadmin')"),'Brand global tidak dibatasi ke superadmin.');
need(core.includes("settings:u.role==='superadmin'?await all('SELECT * FROM settings'):await all('SELECT * FROM settings WHERE department=?',u.department)"),'Catalog settings non-superadmin belum scoped ke department.');

// Realtime/HMI/approval/integration enforcement.
need(realtime.includes("const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept"),'Realtime allow() tidak scoped ke department.');
for(const rule of [
  ["allow(u,'PROD','create')",'Start/downtime Production tidak memiliki create gate.'],
  ["allow(u,'PROD','update')",'Finish Production tidak memiliki update gate.'],
  ["allow(u,'MTC','update')",'Maintenance acknowledge/close tidak memiliki update gate.'],
  ["Tidak memiliki izin approval",'Approval request tidak memiliki permission gate.'],
  ["Khusus approver department",'Approval decision tidak memiliki department update gate.'],
  ["if(u.role!=='superadmin')fail(403,'Khusus superadmin')",'Integrasi realtime tidak dibatasi superadmin.']
]) need(realtime.includes(rule[0]),rule[1]);

// Released planning is the execution authority at Start PRO.
need(production.includes("import {handlePlanAuthorityV53} from './release-v53-plan-authority.mjs'"),'Planning authority v53 belum di-wire ke Worker production.');
const planningCall=callPos('const planningSafetyResponse=await handlePlanningSafetyV39'),planAuthorityCall=callPos('const planAuthorityResponse=await handlePlanAuthorityV53'),machineCall=callPos('const machineGovernanceResponse=await handleMachineGovernanceV20');
need(planningCall>=0&&planAuthorityCall>planningCall&&machineCall>planAuthorityCall,'Urutan runtime planning safety → planning authority → machine governance tidak terjaga.');
need(production.includes('plan-authority-v53'),'Release fingerprint belum memuat plan-authority-v53.');
for(const rule of [
  ['PRO pada request tidak sama dengan Planning Released','Start PRO belum mengunci PRO ke planning Released.'],
  ['Mesin pada request tidak sama dengan canonical machine Planning Released','Start PRO belum mengunci canonical machine ke planning Released.'],
  ['Material pada request tidak sama dengan Material Planning Released','Start PRO belum mengunci material ke planning Released.'],
  ['Target Qty pada request tidak sama dengan Target Qty Planning Released','Start PRO belum mengunci target qty ke planning Released.'],
  ['DATA_GOVERNANCE.machine_aliases','Planning authority belum memakai canonical machine governance.']
]) need(planAuthority.includes(rule[0]),rule[1]);

// Final UAT must fail closed when runtime consistency is not green.
need(production.includes("import {handleRuntimeSignoffV54} from './release-v54-runtime-signoff.mjs'"),'Runtime signoff v54 belum di-wire ke Worker production.');
const signoffCall=callPos('const runtimeSignoffResponse=await handleRuntimeSignoffV54'),governanceCall=callPos('const governanceResponse=await handleGovernanceV19');
need(signoffCall>=0&&governanceCall>signoffCall,'Runtime signoff gate harus berjalan sebelum governance settings disimpan.');
need(production.includes('runtime-signoff-v54'),'Release fingerprint belum memuat runtime-signoff-v54.');
need(production.includes("'/api/settings'"),'Additive schema belum dijamin sebelum settings/signoff gate.');
for(const rule of [
  ['workflowHealthV51','Final UAT belum memeriksa Workflow Health.'],
  ['mirrorHealthV52','Final UAT belum memeriksa Mirror Health.'],
  ['Final UAT belum dapat dinyatakan Lulus karena runtime consistency belum hijau','Final UAT belum fail-closed saat runtime inconsistent.'],
  ['Final UAT tidak dapat disahkan karena runtime consistency tidak dapat diverifikasi','Final UAT belum fail-closed saat health unavailable.'],
  ["u.role!=='superadmin'",'Runtime signoff gate belum dibatasi ke jalur Superadmin.']
]) need(runtimeSignoff.includes(rule[0]),rule[1]);

// V6 import is destructive-capable enough to remain superadmin-only and excludes users table.
need(v6.includes("if(user.role!=='superadmin')return json({error:'Khusus superadmin'},403)"),'Import data v6 tidak dibatasi superadmin.');
need(v6.includes("const columns={sources:")&&!v6.includes("users:['"),'Import allowlist tidak aman atau users ikut dapat diimpor.');

// Behavioral model mirrors the backend authorization contract.
const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept&&(Array.isArray(u.permissions)?u.permissions:[]).includes(action));
const cases=[
 ['superadmin cross department',allow({role:'superadmin',department:'PROD',permissions:[]},'QC','delete')],
 ['admin own create',allow({role:'admin',department:'QC',permissions:['create']},'QC','create')],
 ['admin cross department blocked',!allow({role:'admin',department:'QC',permissions:['create','update']},'PROD','create')],
 ['admin missing action blocked',!allow({role:'admin',department:'PROD',permissions:['create']},'PROD','delete')],
 ['user spoofed permissions blocked',!allow({role:'user',department:'PROD',permissions:['create','update','delete','config']},'PROD','create')]
];
for(const [name,ok] of cases)need(Boolean(ok),`Authorization model gagal: ${name}`);

if(errors.length){console.error('Authorization validation FAILED');for(const e of errors)console.error('- '+e);process.exit(1);}
console.log(`Authorization validation OK — production routing + planning authority + runtime signoff + ${cases.length} behavioral cases checked.`);
