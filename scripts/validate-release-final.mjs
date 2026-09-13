import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const core=read('frontend/app-core.js');
const shop=read('frontend/shopfloor.js');
const field=read('frontend/field-display-v8.js');
const r10=read('frontend/release-v10.js');
const r11=read('frontend/release-v11.js');
const r12=read('frontend/role-dashboard-v12.js');
const r13=read('frontend/workflow-v13.js');
const r14=read('frontend/governance-v14.js');
const back=read('backend/release-v11.mjs');
const security=read('backend/release-v15-security.mjs');
const production=read('backend/worker-production.mjs');
const realtime=read('backend/realtime.mjs');
const wrangler=read('wrangler.toml');
const active=[r10,r11,r12,r13,r14].join('\n');
const checks=[
 ['release bundles active',['release-v10.js','release-v11.js','role-dashboard-v12.js','workflow-v13.js','governance-v14.js'].every(x=>index.includes(x))],
 ['core department modules',['confirmation','planning','production','downtime','quality','maintenance','development','checklist','logbook','process','energy','master','project','batch'].every(x=>core.includes(x))],
 ['published display gate',field.includes("layout.status==='published'")||field.includes("layout.status!=='published'")],
 ['exact display machine scope',r10.includes("filter(m=>normalize(m.code)===code)")],
 ['release readiness governance',r10.includes('RELEASE_READINESS.infrastructure')&&r10.includes('RELEASE_READINESS.data_owners')&&r10.includes('RELEASE_READINESS.terminology')],
 ['barcode planning assistant',r10.includes('barcodePlanScan')],
 ['approval navigation and decisions',r11.includes("view==='approvals'")&&r11.includes('/approvals/decide')],
 ['automatic approval creation',back.includes('FINAL_VERIFY')&&back.includes('ROOT_CAUSE_VERIFY')&&back.includes('QC_VERIFY')],
 ['approval listing endpoint',back.includes("path==='/api/approvals'")],
 ['role dashboard endpoint',back.includes("path==='/api/role-dashboard'")&&r12.includes('/role-dashboard?department=')],
 ['maintenance KPI semantics',back.includes('MTTR maintenance live')&&back.includes('MTBF live estimate')],
 ['released planning enforced',back.includes("payload.status!=='Released'")&&back.includes("json_extract(payload,'$.status')='Released'")&&r13.includes('Released / Siap Produksi')],
 ['downtime root cause gate',back.includes('Root cause / tindakan wajib diisi')],
 ['maintenance acknowledge and closure gate',back.includes("c.status!=='ACKNOWLEDGED'")&&r11.includes('Close Maintenance')],
 ['rejection reason gate',back.includes('Alasan wajib diisi untuk penolakan')],
 ['permission gate before workflow lookup',production.indexOf('handleSecurityV15')<production.indexOf('handleReleaseV11')&&security.includes('Tidak memiliki izin verifikasi')],
 ['UPDT escalation automation',realtime.includes("class='UPDT'")&&realtime.includes("'+10 minutes'")],
 ['audit sensitive-value redaction',r14.includes('(password|hash|salt|token|secret|credential)')],
 ['business-facing source registry',r10.includes('Pusat Data & Dokumen')&&r10.includes('Register sumber')],
 ['source quality reconciliation',r10.includes('Kualitas Data')&&r10.includes('Prioritas rekonsiliasi')],
 ['D1 only configuration',wrangler.includes('[[d1_databases]]')&&!/\[\[r2_buckets\]\]/.test(wrangler)],
 ['no prototype language in active release UI',!/\b(prototype|mockup|dummy|lorem ipsum|data demo|contoh data)\b/i.test(active)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Final release validation OK — ${checks.length} blueprint and release guards checked.`);
