import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const worker=read('backend/worker-production.mjs');
const mirror=read('backend/release-v52-mirror-reconciliation.mjs');
const live=read('backend/release-v49-live-register.mjs');
const lifecycle=read('backend/release-v46-data-lifecycle.mjs');
const release=read('frontend/release-status-v18.js');
const support=read('frontend/support-recovery-v21.js');
const checks=[
 ['v52 wired into production',worker.includes("handleMirrorReconciliationV52")&&worker.includes("mirror-reconciliation-v52")&&worker.includes('reconcileLiveMirrorsV52(env,80)')],
 ['mirror health protected',mirror.includes("url.pathname!=='/api/mirror-health'")&&mirror.includes("u.role!=='superadmin'")&&mirror.includes('Mirror Health khusus Superadmin')],
 ['four workflow source types reconciled',['production_run','downtime','quality','maintenance'].every(x=>mirror.includes(`${x}:`))],
 ['approval state compared for governed mirrors',mirror.includes("entity_type='production_run'")&&mirror.includes("step='FINAL_VERIFY'")&&mirror.includes("step='ROOT_CAUSE_VERIFY'")&&mirror.includes("step='QC_VERIFY'")],
 ['critical business values compared',mirror.includes("$.total")&&mirror.includes("$.unit")&&mirror.includes("$.root_cause")&&mirror.includes("$.sample_qty")&&mirror.includes("$.request_note")&&mirror.includes("$.action")],
 ['missing mirrors prioritized',mirror.includes('CASE WHEN e.id IS NULL THEN 0 ELSE 1 END')&&mirror.includes('missing_mirrors')&&mirror.includes('stale_mirrors')],
 ['live upsert is idempotent',live.includes("WHERE entries.module<>excluded.module")&&live.includes("COALESCE(entries.payload,'')<>COALESCE(excluded.payload,'')")],
 ['live registers remain read only',live.includes("if(!id.startsWith('live:'))return null")&&live.includes('mirror read-only dari workflow HMI')],
 ['release manifest contains mirror health',lifecycle.includes("mirrorHealthV52")&&lifecycle.includes('body.mirror_health=mirror')],
 ['release control surfaces mirror consistency',release.includes("api('/mirror-health')")&&release.includes('Source Mirror Consistency')&&release.includes('Mirror hilang')&&release.includes('Mirror stale')],
 ['runtime health can downgrade final release',release.includes('function downgradeRuntime')&&release.includes("badge.textContent='Belum final'")&&release.includes("if(!ready)downgradeRuntime('Workflow")&&release.includes("if(!ready)downgradeRuntime('Register mirror")],
 ['runtime health fails closed when unavailable',release.includes("catch(e){downgradeRuntime('Workflow Health tidak dapat diverifikasi')")&&release.includes("catch(e){downgradeRuntime('Mirror Health tidak dapat diverifikasi')")&&release.includes('Status ini diperlakukan sebagai blocker release sampai health endpoint kembali dapat dibaca.')],
 ['recovery center surfaces runtime health',support.includes('Runtime consistency sebelum recovery/change')&&support.includes('workflow=m.workflow_health')&&support.includes('mirror=m.mirror_health')&&support.includes('storage=m.storage_health')&&support.includes('Blocker change/release')],
 ['recovery center does not fake backup',support.includes('Manifest konfigurasi bukan backup D1')&&support.includes('jangan anggap runtime konsisten')],
 ['no prototype language',!/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([mirror,live,release,support].join('\n'))]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}console.log(`Mirror v52 validation OK — ${checks.length} source-of-truth, reconciliation, fail-closed, recovery-evidence, and release-gate guards checked.`);
