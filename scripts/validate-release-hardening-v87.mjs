import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const headers=read('frontend/_headers');
const ui=read('frontend/app-ui.js');
const role=read('frontend/role-dashboard-v12.js');
const hmi60=read('frontend/hmi-operation-safety-v60.js');
const page66=read('frontend/page-integrity-v66.js');
const live71=read('frontend/live-monitoring-v71.js');
const gate87=read('frontend/release-runtime-gate-v87.js');
const dash88=read('frontend/premium-dashboard-integrity-v88.js');
const checks=[
 ['runtime gate v87 active',index.includes('release-runtime-gate-v87.js')],
 ['premium dashboard integrity v88 active',index.includes('premium-dashboard-integrity-v88.js?v=20260916-1')],
 ['current hardened bundles cache-busted',index.includes('app-ui.js?v=20260916-1')&&index.includes('role-dashboard-v12.js?v=20260916-1')&&index.includes('hmi-operation-safety-v60.js?v=20260916-1')&&index.includes('page-integrity-v66.js?v=20260916-2')&&index.includes('live-monitoring-v71.js?v=20260916-1')],
 ['static security headers declared',headers.includes('X-Content-Type-Options: nosniff')&&headers.includes('X-Frame-Options: DENY')&&headers.includes('Referrer-Policy: strict-origin-when-cross-origin')],
 ['role KPI failure is visible and retryable',role.includes('KPI operasional belum dapat dimuat.')&&role.includes('retryRoleKpi')&&role.includes('Coba lagi')],
 ['downtime master fallback failure is visible',role.includes('downtime-master-unavailable')&&role.includes('Input downtime tetap tersedia')],
 ['HMI initial multi-machine ambiguity fails closed in v60',hmi60.includes('multipleMachineChoices')&&hmi60.includes('ambiguousInitial')&&hmi60.includes('Pilih mesin secara eksplisit')],
 ['HMI precheck failure fails closed in v66',page66.includes('catch{hmiMachine=RESELECT;}')&&page66.includes('verifikasi daftar mesin belum berhasil')],
 ['approval audit metadata failure is visible and retryable',page66.includes('Metadata audit keputusan belum dapat diverifikasi.')&&page66.includes('Coba muat metadata')&&page66.includes('approvalMetadataNotice')],
 ['realtime refresh failure is stale-aware',live71.includes('Pembaruan realtime terputus.')&&live71.includes('lastSuccessAt')&&live71.includes('Data terakhir dipertahankan')&&live71.includes('Coba lagi')],
 ['attention center never treats refresh failure as all-clear',ui.includes('attentionLastSuccess')&&ui.includes('attentionError')&&ui.includes('Pembaruan Pusat Perhatian tertunda.')&&ui.includes('tidak dianggap sebagai kondisi terbaru')],
 ['operational-ready requires runtime verification',gate87.includes("'/workflow-health'")&&gate87.includes("'/mirror-health'")&&gate87.includes("'/runtime-invariants'")&&gate87.includes("'/work-calendar/context'")&&gate87.includes('Verifikasi runtime…')&&gate87.includes('runtimeVerified')],
 ['runtime endpoint failure remains blocker',gate87.includes('available:false')&&gate87.includes('tidak dapat diverifikasi')],
 ['premium dashboard empty state is independently verified',gate87.includes('verifyDashboardProjection')&&gate87.includes("user.role==='superadmin'?'/audit':'/attention-center'")&&gate87.includes('Kondisi ini tidak berarti tidak ada')],
 ['premium trend derives period from source cell dates',dash88.includes('r.cells?.A?.v')&&dash88.includes('sourceDate')&&dash88.includes('periodOf(groups)')&&dash88.includes('periode berasal dari cell tanggal sumber')],
 ['premium trend never guesses period when source date is absent',dash88.includes('Periode trend belum dapat ditentukan dari cell tanggal sumber')&&dash88.includes('tidak menebak periode dari nama file atau posisi baris')],
 ['premium trend expresses data gaps instead of connecting long gaps',dash88.includes('p.date-prev>DAY*4')&&dash88.includes('flush()')],
 ['no prototype language',!(/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([ui,role,hmi60,page66,live71,gate87,dash88].join('\n')))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Release hardening v88 validation OK — ${checks.length} security-header, stale-state, HMI identity, approval audit, attention, KPI fallback, dashboard projection, runtime-release, and source-date trend guards checked.`);
