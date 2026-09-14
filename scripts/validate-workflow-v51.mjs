import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const worker=read('backend/worker-production.mjs');
const lineage=read('backend/release-v50-workflow-lineage.mjs');
const reconcile=read('backend/release-v51-workflow-reconciliation.mjs');
const table=read('frontend/module-table-v25.js');
const release=read('frontend/release-status-v18.js');
const checks=[
 ['v51 wired into production',worker.includes("handleWorkflowReconciliationV51")&&worker.includes("workflow-reconciliation-v51")&&worker.includes('reconcileWorkflowLineageV51(env,150)')],
 ['workflow health protected',reconcile.includes("url.pathname!=='/api/workflow-health'")&&reconcile.includes("u.role!=='superadmin'")&&reconcile.includes('Workflow Health khusus Superadmin')],
 ['latest run per planning authority',reconcile.includes('NOT EXISTS (SELECT 1 FROM production_runs newer WHERE newer.plan_id=r.plan_id')&&reconcile.includes('COALESCE(newer.end_ts,newer.start_ts)>COALESCE(r.end_ts,r.start_ts)')],
 ['optimistic planning reconciliation',reconcile.includes('AND version=?')&&reconcile.includes('version=version+1')],
 ['lineage states preserved',lineage.includes("markPlan(env,planId,'Dimulai'")&&lineage.includes("markPlan(env,r.plan_id,'Terverifikasi'")&&lineage.includes("verification_status:'REJECTED'")],
 ['planning lifecycle and verification separate',table.includes("col('Lifecycle'")&&table.includes("col('Verifikasi hasil'")&&table.includes('verification_status')],
 ['release control surfaces workflow health',release.includes("api('/workflow-health')")&&release.includes('Workflow Consistency')&&release.includes('Lineage mismatch')&&release.includes('Orphan plan link')],
 ['no prototype language',!/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([reconcile,table,release].join('\n'))]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}console.log(`Workflow v51 validation OK — ${checks.length} lineage and presentation guards checked.`);
