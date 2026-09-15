import fs from 'node:fs';
const core=fs.readFileSync('frontend/app-core.js','utf8');
const ui=fs.readFileSync('frontend/app-ui.js','utf8');
const runtime=fs.readFileSync('frontend/runtime-polish-v6.js','utf8');
const index=fs.readFileSync('frontend/index.html','utf8');
const checks=[
 ['app-core active before feature bundles',index.indexOf('app-core.js')>=0&&index.indexOf('app-core.js')<index.indexOf('app-ui.js')],
 ['canonical HTML quote escaping',core.includes("'\\\"':'&quot;'")||core.includes("'\"':'&quot;'" )],
 ['dialog refresh does not call showModal twice',core.includes('const opening=!modal.open')&&core.includes('if(opening){modal.showModal()')],
 ['dialog title is accessible',core.includes("aria-labelledby','modalTitle")&&core.includes('id=\"modalTitle\"')],
 ['dialog returns focus to opener',core.includes('dialogReturnFocus')&&core.includes('target?.isConnected')&&core.includes('preventScroll:true')],
 ['global window error boundary',core.includes("window.addEventListener('error'")&&core.includes('surfaceClientIssue')],
 ['global unhandled promise boundary',core.includes("window.addEventListener('unhandledrejection'")&&core.includes("'promise'"))],
 ['client error boundary deduplicates bursts',core.includes('clientIssueLast')&&core.includes('stamp-clientIssueLast.ts<10000')],
 ['diagnostic reference does not render exception text',core.includes('Kode diagnostik')&&core.includes('${esc(ref)}')&&!core.includes('${esc(message)}')],
 ['blank screen has reload recovery',core.includes('Aplikasi belum dapat ditampilkan')&&core.includes('clientRecoveryReload')&&core.includes('location.reload()')],
 ['expected abort and ResizeObserver noise filtered',core.includes('ResizeObserver loop')&&core.includes('AbortError')],
 ['normal runtime states remain active',runtime.includes('Memuat data operasional')&&runtime.includes('Data belum dapat dimuat')&&runtime.includes('runtime-empty-state')],
 ['attention dialog can refresh safely',ui.includes("$('#attentionRefresh').onclick=attentionDialog")&&core.includes('const opening=!modal.open')],
 ['no exception stack persisted or transmitted by recovery layer',!core.includes('stack:')&&!core.includes("api('/client-error")&&!core.includes('localStorage.setItem')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}console.log(`Client resilience v86 validation OK — ${checks.length} dialog, accessibility, and browser recovery guards checked.`);
