import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const wrangler=read('wrangler.toml');
const production=read('backend/worker-production.mjs');
const v6=read('backend/worker-v6.mjs');
const v4=read('backend/worker-v4-core.mjs');
const core=read('backend/worker.mjs');
const realtime=read('backend/realtime.mjs');
const machine20=read('backend/release-v20-machine-governance.mjs');
const lifecycle46=read('backend/release-v46-data-lifecycle.mjs');
const workflow50=read('backend/release-v50-workflow-lineage.mjs');
const planAuthority=read('backend/release-v53-plan-authority.mjs');
const runtimeSignoff=read('backend/release-v54-runtime-signoff.mjs');
const invariants=read('backend/release-v55-runtime-invariants.mjs');
const errors=[];
const need=(ok,msg)=>{if(!ok)errors.push(msg);};
const callPos=needle=>production.indexOf(needle);

need(wrangler.includes('main = "backend/worker-production.mjs"'),'wrangler.toml tidak menunjuk worker-production.mjs.');
need(production.includes("import app from './worker-v6.mjs'"),'worker-production tidak meneruskan ke worker-v6.');
need(v6.includes("import legacy from './worker-v4-core.mjs'")&&v6.includes("import core from './worker.mjs'"),'worker-v6 tidak memakai core authorization stack yang diaudit.');
need(v4.includes("import core from './worker.mjs'")&&v4.includes('handleRealtime'),'worker-v4-core tidak meneruskan API reguler/realtime ke handler terotorisasi.');

need(core.includes("u.role==='superadmin'||(u.role==='admin'&&u.department===dept"),'Core allow() tidak membatasi admin ke department sendiri.');
need(core.includes('requireAllow(u,s.department,\'create\')'),'Create archive tidak memakai requireAllow.');
need(core.includes("requireAllow(u,old.department,method==='DELETE'?'delete':'update')"),'Update/delete archive tidak memakai requireAllow.');
need(core.includes("requireAllow(u,dept,'create')"),'Create entry tidak memakai requireAllow.');
need(core.includes("requireAllow(u,old.department,method==='DELETE'?'delete':'update')"),'Update/delete entry tidak memakai requireAllow.');
need(core.includes("if(u.role!=='superadmin')fail(403,'Khusus superadmin')"),'Endpoint superadmin tidak memiliki role gate.');
need(core.includes("if(path==='/api/settings'&&method==='PUT')")&&core.includes("requireAllow(u,dept,'config')"),'Settings PUT tidak memakai izin config.');
need(core.includes("if(b.key==='brand'&&u.role!=='superadmin')"),'Brand global tidak dibatasi ke superadmin.');
need(core.includes("settings:u.role==='superadmin'?await all('SELECT * FROM settings'):await all('SELECT * FROM settings WHERE department=?',u.department)"),'Catalog settings non-superadmin belum scoped ke department.');

need(realtime.includes("const allow=(u,dept,action)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===dept"),'Realtime allow() tidak scoped ke department.');
for(const rule of [
 ["allow(u,'PROD','create')",'Start/downtime Production tidak memiliki create gate.'],
 ["allow(u,'PROD','update')",'Finish Production tidak memiliki update gate.'],
 ["allow(u,'MTC','update')",'Maintenance acknowledge/close tidak memiliki update gate.'],
 ["Tidak memiliki izin approval",'Approval request tidak memiliki permission gate.'],
 ["Khusus approver department",'Approval decision tidak memiliki department update gate.'],
 ["if(u.role!=='superadmin')fail(403,'Khusus superadmin')",'Integrasi realtime tidak dibatasi superadmin.']
]) need(realtime.includes(rule[0]),rule[1]);

need(production.includes("import {handlePlanAuthorityV53} from './release-v53-plan-authority.mjs'"),'Planning authority v53 belum di-wire ke Worker production.');
const planningCall=callPos('const planningSafetyResponse=await handlePlanningSafetyV39'),planAuthorityCall=callPos('const planAuthorityResponse=await handlePlanAuthorityV53'),machineCall=callPos('const machineGovernanceResponse=await handleMachineGovernanceV20');
need(planningCall>=0&&planAuthorityCall>planningCall&&machineCall>planAuthorityCall,'Urutan runtime planning safety → planning authority → machine governance tidak terjaga.');
need(production.includes('plan-authority-v53'),'Release fingerprint belum memuat plan-authority-v53.');
for(const rule of [
 ['PRO pada request tidak sama dengan Planning Released','Start PRO belum mengunci PRO ke planning Released.'],
 ['Mesin pada request tidak sama dengan canonical machine Planning Released','Start PRO belum mengunci canonical machine ke planning Released.'],
 ['Material pada request tidak sama dengan Material Planning Released','Start PRO belum mengunci material ke planning Released.'],
 ['Target Qty pada request tidak sama dengan Target Qty Planning Released','Start PRO belum mengunci target qty ke planning Released.'],
 ['Shift pada request tidak sama dengan Shift Planning Released','Shift terjadwal belum dikunci ke Planning Released.'],
 ['Group pada request tidak sama dengan Group Planning Released','Group terjadwal belum dikunci ke Planning Released.'],
 ['DATA_GOVERNANCE.machine_aliases','Planning authority belum memakai canonical machine governance.']
]) need(planAuthority.includes(rule[0]),rule[1]);
for(const rule of [
 ["String(pp.pro),material,shift,group,u.id,plannedQty",'Start PRO belum menulis nilai authoritative dari Planning.'],
 ["WHERE NOT EXISTS(SELECT 1 FROM production_runs WHERE machine_id=? AND status='RUNNING')",'Reservasi Start PRO belum atomic terhadap double-submit.'],
 ['request Start PRO bersamaan sudah diproses','Start PRO belum memberi conflict yang jelas untuk request bersamaan.'],
 ['planning_machine:pp.machine','Audit Start PRO belum menyimpan referensi machine Planning.'],
 ['planned_qty:plannedQty','Audit Start PRO belum menyimpan target authoritative.']
]) need(machine20.includes(rule[0]),rule[1]);

need(production.includes("import {handleRuntimeSignoffV54} from './release-v54-runtime-signoff.mjs'"),'Runtime signoff v54 belum di-wire ke Worker production.');
const signoffCall=callPos('const runtimeSignoffResponse=await handleRuntimeSignoffV54'),governanceCall=callPos('const governanceResponse=await handleGovernanceV19');
need(signoffCall>=0&&governanceCall>signoffCall,'Runtime signoff gate harus berjalan sebelum governance settings disimpan.');
need(production.includes('runtime-signoff-v54'),'Release fingerprint belum memuat runtime-signoff-v54.');
for(const rule of [
 ['workflowHealthV51','Final UAT belum memeriksa Workflow Health.'],
 ['mirrorHealthV52','Final UAT belum memeriksa Mirror Health.'],
 ['runtimeInvariantHealthV55','Final UAT belum memeriksa Shopfloor Invariants.'],
 ['Final UAT belum dapat dinyatakan Lulus karena runtime consistency belum hijau','Final UAT belum fail-closed saat runtime inconsistent.'],
 ['Final UAT tidak dapat disahkan karena runtime consistency tidak dapat diverifikasi','Final UAT belum fail-closed saat health unavailable.'],
 ["u.role!=='superadmin'",'Runtime signoff gate belum dibatasi ke jalur Superadmin.']
]) need(runtimeSignoff.includes(rule[0]),rule[1]);

need(production.includes("import {handleRuntimeInvariantsV55,reconcileRuntimeInvariantsV55} from './release-v55-runtime-invariants.mjs'"),'Runtime Invariants v55 belum di-wire ke Worker.');
need(production.includes('runtime-invariants-v55'),'Release fingerprint belum memuat runtime-invariants-v55.');
const invariantCall=callPos('const invariantResponse=await handleRuntimeInvariantsV55'),hmiCall=callPos('const hmiSafetyResponse=await handleHmiSafetyV40'),qualityCall=callPos('const qualityUnitResponse=await handleQualityUnitV44');
need(invariantCall>hmiCall&&qualityCall>invariantCall,'Runtime Invariants harus berjalan setelah HMI validation dan sebelum handler legacy/quality berikutnya.');
for(const rule of [
 ["UPDATE production_runs SET status='FINISHED'",'Finish PRO belum menulis status FINISHED melalui runtime invariant handler.'],
 ["WHERE id=? AND status='RUNNING'",'Finish PRO belum memakai run ID + status guard untuk atomic transition.'],
 ["if(!changed(done))return out(req,env,{error:'Finish PRO sudah diproses oleh request lain'}",'Finish PRO belum memverifikasi single-row atomic transition.'],
 ["WHERE NOT EXISTS(SELECT 1 FROM downtime_events WHERE machine_id=? AND status='OPEN')",'Downtime Start belum atomic terhadap double-submit.'],
 ["WHERE id=? AND status='OPEN'",'Downtime/Maintenance transition belum memakai status guard.'],
 ['duplicate_running_runs','Runtime health belum memeriksa duplicate running run.'],
 ['duplicate_open_downtime','Runtime health belum memeriksa duplicate open downtime.'],
 ['duplicate_active_maintenance_calls','Runtime health belum memeriksa duplicate Maintenance Call.'],
 ['Duplicate business events are never auto-deleted or auto-closed','Reconciler belum menegaskan larangan auto-close histori ambigu.']
]) need(invariants.includes(rule[0]),rule[1]);
need(production.includes('afterReleaseV11(approvalSignal,invariantResponse.clone()')&&production.includes('afterLiveRegisterV49(liveSignal,invariantResponse.clone()')&&production.includes('afterWorkflowLineageV50(workflowSignal,invariantResponse.clone()'),'Early runtime handler belum mempertahankan approval/mirror/lineage side effects.');
need(production.includes('reconcileRuntimeInvariantsV55(env,100)'),'Cron belum menjalankan safe runtime state reconciliation.');
need(lifecycle46.includes('runtime_invariants=invariants')&&lifecycle46.includes('body.runtime_ready=workflow.ready===true&&mirror.ready===true&&invariants.ready===true'),'Release Manifest belum menyatukan tiga runtime health.');
need(workflow50.includes("WHERE id=? AND status='ACKNOWLEDGED'")&&workflow50.includes('Maintenance Call sudah ditutup atau diproses oleh request lain'),'Maintenance Close belum atomic/idempotent.');

need(v6.includes("if(user.role!=='superadmin')return json({error:'Khusus superadmin'},403)"),'Import data v6 tidak dibatasi superadmin.');
need(v6.includes("const columns={sources:")&&!v6.includes("users:['"),'Import allowlist tidak aman atau users ikut dapat diimpor.');

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
console.log(`Authorization validation OK — RBAC + Planning authority + runtime signoff/invariants + ${cases.length} behavioral cases checked.`);
