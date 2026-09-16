import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const ui=read('frontend/app-ui.js');
const role=read('frontend/role-dashboard-v12.js');
const hmi60=read('frontend/hmi-operation-safety-v60.js');
const page66=read('frontend/page-integrity-v66.js');
const live71=read('frontend/live-monitoring-v71.js');
const gate87=read('frontend/release-runtime-gate-v87.js');
const checks=[
 ['runtime gate v87 active',index.includes('release-runtime-gate-v87.js')],
 ['current hardened bundles cache-busted',index.includes('app-ui.js?v=20260916-1')&&index.includes('role-dashboard-v12.js?v=20260916-1')&&index.includes('hmi-operation-safety-v60.js?v=20260916-1')&&index.includes('page-integrity-v66.js?v=20260916-1')&&index.includes('live-monitoring-v71.js?v=20260916-1')],
 ['role KPI failure is visible and retryable',role.includes('KPI operasional belum dapat dimuat.')&&role.includes('retryRoleKpi')&&role.includes('Coba lagi')],
 ['downtime master fallback failure is visible',role.includes('downtime-master-unavailable')&&role.includes('Input downtime tetap tersedia')],
 ['HMI initial multi-machine ambiguity fails closed in v60',hmi60.includes('multipleMachineChoices')&&hmi60.includes('ambiguousInitial')&&hmi60.includes('Pilih mesin secara eksplisit')],
 ['HMI precheck failure fails closed in v66',page66.includes('catch{hmiMachine=RESELECT;}')&&page66.includes('verifikasi daftar mesin belum berhasil')],
 ['realtime refresh failure is stale-aware',live71.includes('Pembaruan realtime terputus.')&&live71.includes('lastSuccessAt')&&live71.includes('Data terakhir dipertahankan')&&live71.includes('Coba lagi')],
 ['attention center never treats refresh failure as all-clear',ui.includes('attentionLastSuccess')&&ui.includes('attentionError')&&ui.includes('Pembaruan Pusat Perhatian tertunda.')&&ui.includes('tidak dianggap sebagai kondisi terbaru')],
 ['operational-ready requires runtime verification',gate87.includes("'/workflow-health'")&&gate87.includes("'/mirror-health'")&&gate87.includes("'/runtime-invariants'")&&gate87.includes("'/work-calendar/context'")&&gate87.includes('Verifikasi runtime…')&&gate87.includes('runtimeVerified')],
 ['runtime endpoint failure remains blocker',gate87.includes('available:false')&&gate87.includes('Tidak dapat diverifikasi')===false&&gate87.includes('tidak dapat diverifikasi')],
 ['no prototype language',!(/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([ui,role,hmi60,page66,live71,gate87].join('\n')))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Release hardening v87 validation OK — ${checks.length} stale-state, HMI identity, attention, KPI fallback, and runtime-release guards checked.`);
