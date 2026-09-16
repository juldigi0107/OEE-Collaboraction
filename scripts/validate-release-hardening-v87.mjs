import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const headers=read('frontend/_headers');
const core=read('frontend/app-core.js');
const ui=read('frontend/app-ui.js');
const role=read('frontend/role-dashboard-v12.js');
const hmi60=read('frontend/hmi-operation-safety-v60.js');
const page66=read('frontend/page-integrity-v66.js');
const live71=read('frontend/live-monitoring-v71.js');
const gate87=read('frontend/release-runtime-gate-v87.js');
const dash88=read('frontend/premium-dashboard-integrity-v88.js');
const flagshipCss=read('frontend/flagship-v89.css');
const flagshipJs=read('frontend/flagship-v89.js');
const depthCss=read('frontend/flagship-depth-v90.css');
const depthJs=read('frontend/flagship-depth-v90.js');
const scriptTags=[...index.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)><\/script>/g)].map(m=>({attrs:(m[1]+' '+m[3]),src:m[2]}));
const order=['config.js','app-core.js','workspace.js','reference-release-v85.js','release-runtime-gate-v87.js','premium-dashboard-integrity-v88.js','flagship-v89.js','flagship-depth-v90.js'].map(name=>index.indexOf(name));
const cssOrder=['reference-release-v85.css','release-hardening-v86.css','flagship-v89.css','flagship-depth-v90.css'].map(name=>index.indexOf(name));
const hasAll=(text,items)=>items.every(x=>text.includes(x));
const checks=[
 ['runtime gate v87 active',index.includes('release-runtime-gate-v87.js')],
 ['premium dashboard integrity v88 active',index.includes('premium-dashboard-integrity-v88.js?v=20260916-1')],
 ['flagship visual v89 active and cache-busted',index.includes('flagship-v89.css?v=20260917-1')&&index.includes('flagship-v89.js?v=20260917-1')&&index.includes('flagship-v89')],
 ['flagship depth v90 active and cache-busted',index.includes('flagship-depth-v90.css?v=20260917-1')&&index.includes('flagship-depth-v90.js?v=20260917-1')&&index.includes('flagship-depth-v90')],
 ['flagship layers are final visual/runtime authority',cssOrder.every(x=>x>=0)&&cssOrder.every((x,i)=>i===0||x>cssOrder[i-1])&&order.every(x=>x>=0)&&order.every((x,i)=>i===0||x>order[i-1])],
 ['current hardened bundles cache-busted',index.includes('app-ui.js?v=20260916-1')&&index.includes('role-dashboard-v12.js?v=20260916-1')&&index.includes('hmi-operation-safety-v60.js?v=20260916-1')&&index.includes('page-integrity-v66.js?v=20260916-2')&&index.includes('live-monitoring-v71.js?v=20260916-1')],
 ['static security headers declared',headers.includes('X-Content-Type-Options: nosniff')&&headers.includes('X-Frame-Options: DENY')&&headers.includes('Referrer-Policy: strict-origin-when-cross-origin')],
 ['all active classic scripts use defer',scriptTags.length>20&&scriptTags.every(s=>/\bdefer\b/.test(s.attrs))],
 ['no active script uses async ordering',scriptTags.every(s=>!/\basync\b/.test(s.attrs))],
 ['bootstrap and wrapper authority order preserved',order.every(x=>x>=0)&&order.every((x,i)=>i===0||x>order[i-1])],
 ['critical auth imagery preloaded',index.includes('rel="preload" href="assets/logo-bmj-source.webp"')&&index.includes('rel="preload" href="assets/hero-bmj-photo.jpg"')&&index.includes('fetchpriority="high"')],
 ['session expiry is visible',core.includes('Sesi berakhir. Silakan login kembali.')&&core.includes("if(r.status===401&&user)")&&core.includes('endLocalSession')],
 ['network/offline failure is recoverable',core.includes('Perangkat sedang offline. Sambungkan jaringan lalu coba lagi.')&&core.includes('Tidak dapat terhubung ke server OEE. Periksa jaringan atau koneksi Cloudflare lalu coba lagi.')],
 ['role KPI failure is visible and retryable',role.includes('KPI operasional belum dapat dimuat.')&&role.includes('retryRoleKpi')&&role.includes('Coba lagi')],
 ['downtime master fallback failure is visible',role.includes('downtime-master-unavailable')&&role.includes('Input downtime tetap tersedia')],
 ['HMI initial multi-machine ambiguity fails closed in v60',hmi60.includes('multipleMachineChoices')&&hmi60.includes('ambiguousInitial')&&hmi60.includes('Pilih mesin secara eksplisit')],
 ['HMI precheck failure fails closed in v66',page66.includes('catch{hmiMachine=RESELECT;}')&&page66.includes('verifikasi daftar mesin belum berhasil')],
 ['approval audit metadata failure is visible and retryable',page66.includes('Metadata audit keputusan belum dapat diverifikasi.')&&page66.includes('Coba muat metadata')&&page66.includes('approvalMetadataNotice')],
 ['realtime refresh failure is stale-aware',live71.includes('Pembaruan realtime terputus.')&&live71.includes('lastSuccessAt')&&live71.includes('Data terakhir dipertahankan')&&live71.includes('Coba lagi')],
 ['attention center never treats refresh failure as all-clear',ui.includes('attentionLastSuccess')&&ui.includes('attentionError')&&ui.includes('Pembaruan Pusat Perhatian tertunda.')&&ui.includes('tidak dianggap sebagai kondisi terbaru')],
 ['operational-ready requires runtime verification',gate87.includes("'/workflow-health'")&&gate87.includes("'/mirror-health'")&&gate87.includes("'/runtime-invariants'")&&gate87.includes("'/work-calendar/context'")&&gate87.includes('Verifikasi runtime…')&&gate87.includes('runtimeVerified')],
 ['runtime endpoint failure remains blocker',gate87.includes('available:false')&&gate87.includes('tidak dapat diverifikasi')],
 ['runtime gate can recover without page reload',gate87.includes('staticReadyOf')&&gate87.includes('Verifikasi ulang runtime')&&gate87.includes("dataset.staticReady==='true'")&&gate87.includes('lastResults')],
 ['premium dashboard empty state is independently verified',gate87.includes('verifyDashboardProjection')&&gate87.includes("user.role==='superadmin'?'/audit':'/attention-center'")&&gate87.includes('Kondisi ini tidak berarti tidak ada')],
 ['premium trend derives period from source cell dates',dash88.includes('r.cells?.A?.v')&&dash88.includes('sourceDate')&&dash88.includes('periodOf(groups)')&&dash88.includes('periode berasal dari cell tanggal sumber')],
 ['premium trend never guesses period when source date is absent',dash88.includes('Periode trend belum dapat ditentukan dari cell tanggal sumber')&&dash88.includes('tidak menebak periode dari nama file atau posisi baris')],
 ['premium trend expresses data gaps instead of connecting long gaps',dash88.includes('p.date-prev>DAY*4')&&dash88.includes('flush()')],
 ['premium dashboard fallback also uses source period',dash88.includes('applyFallbackPeriod')&&dash88.includes('Trend OEE harian')&&dash88.includes('Snapshot sumber · ${period.label}')&&dash88.includes('periode berasal dari cell tanggal sumber')],
 ['fallback quality guidance follows governance',dash88.includes('applyFallbackGovernance')&&dash88.includes('Definisi KPI authoritative:')&&dash88.includes('Definisi KPI belum final:')&&dash88.includes('Definisi KPI belum dapat diverifikasi:')&&!dash88.includes('gunakan definisi Good tanpa NC')],
 ['premium dashboard exposes KPI authority',dash88.includes("api('/oee-governance')")&&dash88.includes('KPI authoritative')&&dash88.includes('KPI belum authoritative')&&dash88.includes('Authority belum terverifikasi')&&dash88.includes('authorityState')],
 ['flagship shell and command rail covered',hasAll(flagshipCss,['.sidebar{','.topbar{','.nav.active','--f89-navy','backdrop-filter:blur(22px)'])],
 ['flagship login and splash covered',hasAll(flagshipCss,['.auth{','.auth-story','.login-card','.splash-v4'])],
 ['flagship dashboard and workspace covered',hasAll(flagshipCss,['.ref-hero','.ref-kpis','.ref-grid','.ref-depts'])],
 ['flagship dense data tables covered',hasAll(flagshipCss,['.tablewrap{','thead th{','tbody tr:hover','flagship-table-wrap'])],
 ['flagship operational cockpit covered',hasAll(flagshipCss,['data-ui-view="live"','data-ui-view="shopfloor"','.machine-live-card','.run-hero','.v40-event-context'])],
 ['flagship governance and release control covered',hasAll(flagshipCss,['data-ui-view="data-governance"','data-ui-view="operational-control"','data-ui-view="uat-release"','.oc31-banner'])],
 ['flagship display editor covered',hasAll(flagshipCss,['#displayEditorRoot','.de5-stage','.de5-widget','.v42-display-readiness'])],
 ['flagship modal system covered through deepest layer',hasAll(flagshipCss,['dialog[data-flagship-dialog="wide"]','dialog[data-flagship-dialog="media"]','dialog[data-flagship-dialog="operational"]','.dialoghead','.dialogbody','.formactions'])],
 ['flagship mobile and reduced-motion covered',hasAll(flagshipCss,['@media (max-width:980px)','@media (max-width:680px)','prefers-reduced-motion'])],
 ['flagship runtime classifies page panels tables forms and dialogs',hasAll(flagshipJs,['viewGroup','classifyPanels','classifyTables','classifyForms','dialogKind','flagship-dialog-context','MutationObserver'])],
 ['flagship runtime leaves backend authority untouched',!(/\b(fetch\(|api\(|localStorage|sessionStorage|\/api\/)/.test(flagshipJs))],
 ['deep feedback states covered',hasAll(depthCss,['#toast','.runtime-status','.loading-panel','.runtime-state-spinner','.runtime-empty-state','.errorbox','.toTop'])],
 ['deep pagination accordions and source preview covered',hasAll(depthCss,['.pagination','details>summary','.source-image-preview','dialog iframe'])],
 ['field display and pairing are in flagship DNA',hasAll(depthCss,['#fieldDisplay','.field-display-live','.display-pairing-mode','.display-pairing-card'])],
 ['premium destructive confirmation implemented',hasAll(depthCss,['dialog.flagship-confirm-v90','.f90-confirm-danger'])&&hasAll(depthJs,['confirmDialog','runLegacyConfirmed','#deleteRow','#delEntry','stopImmediatePropagation'])],
 ['confirmation adapter restores native confirm before async completion',depthJs.includes('result=handler.call(button)')&&depthJs.includes('finally{window.confirm=original;}')&&depthJs.includes('await result')],
 ['deep runtime is presentation only',!(/\b(fetch\(|api\(|localStorage|sessionStorage|\/api\/)/.test(depthJs))],
 ['no prototype language',!(/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([core,ui,role,hmi60,page66,live71,gate87,dash88,flagshipCss,flagshipJs,depthCss,depthJs].join('\n')))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Release hardening v90 validation OK — ${checks.length} runtime, data-integrity, flagship visual, kiosk, feedback, confirmation, responsive, modal, and production-readiness guards checked.`);
