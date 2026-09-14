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
const dgCore=read('frontend/data-governance-core-v16.js');
const dgView=read('frontend/data-governance-view-v16.js');
const dgEdit=read('frontend/data-governance-edit-v16.js');
const uatCore=read('frontend/uat-release-core-v17.js');
const uatView=read('frontend/uat-release-view-v17.js');
const uatEdit=read('frontend/uat-release-edit-v17.js');
const release18=read('frontend/release-status-v18.js');
const back=read('backend/release-v11.mjs');
const security=read('backend/release-v15-security.mjs');
const governance19=read('backend/release-v19-governance.mjs');
const production=read('backend/worker-production.mjs');
const realtime=read('backend/realtime.mjs');
const wrangler=read('wrangler.toml');
const active=[r10,r11,r12,r13,r14,dgCore,dgView,dgEdit,uatCore,uatView,uatEdit,release18].join('\n');
const governanceCall=production.indexOf('const governanceResponse=await handleGovernanceV19');
const securityCall=production.indexOf('const securityResponse=await handleSecurityV15');
const releaseCall=production.indexOf('const releaseResponse=await handleReleaseV11');
const bundles=['release-v10.js','release-v11.js','role-dashboard-v12.js','workflow-v13.js','governance-v14.js','data-governance-core-v16.js','data-governance-view-v16.js','data-governance-edit-v16.js','uat-release-core-v17.js','uat-release-view-v17.js','uat-release-edit-v17.js','release-status-v18.js'];
const checks=[
 ['release bundles active',bundles.every(x=>index.includes(x))],
 ['core department modules',['confirmation','planning','production','downtime','quality','maintenance','development','checklist','logbook','process','energy','master','project','batch'].every(x=>core.includes(x))],
 ['published display gate',field.includes("layout.status==='published'")||field.includes("layout.status!=='published'")],
 ['exact display machine scope',r10.includes("filter(m=>normalize(m.code)===code)")],
 ['release readiness governance',r10.includes('RELEASE_READINESS.infrastructure')&&r10.includes('RELEASE_READINESS.data_owners')&&r10.includes('RELEASE_READINESS.terminology')],
 ['barcode planning assistant',r10.includes('barcodePlanScan')],
 ['approval navigation and decisions',r11.includes("view==='approvals'")&&r11.includes('/approvals/decide')],
 ['automatic approval creation',back.includes('FINAL_VERIFY')&&back.includes('ROOT_CAUSE_VERIFY')&&back.includes('QC_VERIFY')],
 ['approval listing endpoint',back.includes("'/api/approvals'")&&back.includes('requested_by_name')],
 ['role dashboard endpoint',back.includes("'/api/role-dashboard'")&&r12.includes('/role-dashboard?department=')],
 ['maintenance KPI semantics',back.includes('MTTR maintenance live')&&back.includes('MTBF live estimate')],
 ['released planning enforced',back.includes("payload.status!=='Released'")&&back.includes("json_extract(payload,'$.status')='Released'")&&r13.includes('Released / Siap Produksi')],
 ['downtime root cause gate',back.includes('Root cause / tindakan wajib diisi')],
 ['maintenance acknowledge and closure gate',back.includes("c.status!=='ACKNOWLEDGED'")&&r11.includes('Close Maintenance')],
 ['rejection reason gate',back.includes('Alasan wajib diisi untuk penolakan')],
 ['governance guard precedes operational guards',governanceCall>=0&&securityCall>=0&&releaseCall>=0&&governanceCall<securityCall&&securityCall<releaseCall],
 ['permission gate before workflow lookup',securityCall>=0&&releaseCall>=0&&securityCall<releaseCall&&security.includes('Tidak memiliki izin verifikasi')],
 ['UPDT escalation automation',realtime.includes("class='UPDT'")&&realtime.includes("'+10 minutes'")],
 ['audit sensitive-value redaction',r14.includes('(password|hash|salt|token|secret|credential)')],
 ['business-facing source registry',r10.includes('Pusat Data & Dokumen')&&r10.includes('Register sumber')],
 ['source quality reconciliation',r10.includes('Kualitas Data')&&r10.includes('Prioritas rekonsiliasi')],
 ['data governance five baselines',['kpi_definitions','machine_aliases','shift_calendar','source_authority','join_grain'].every(x=>dgCore.includes(x))],
 ['data governance business presentation',dgView.includes('Definisi Data & KPI')&&dgView.includes('Belum disahkan')&&dgView.includes('Perlu keputusan owner')],
 ['data governance uses controlled config path',dgEdit.includes("navigate('settings')")&&dgEdit.includes("f.elements.key.value=key")&&!dgEdit.includes("api('/settings'")],
 ['backend governance approval completeness',governance19.includes('Baseline KPI belum lengkap')&&governance19.includes('Canonical machine tidak boleh kosong')&&governance19.includes('Kalender shift belum lengkap')&&governance19.includes('Sumber authoritative belum ditetapkan')&&governance19.includes('Join grain wajib')],
 ['backend governance restricted to superadmin',governance19.includes("u.role!=='superadmin'")&&governance19.includes('hanya dapat disahkan oleh Superadmin')],
 ['UAT seven release gates',['UAT_RELEASE.roles','UAT_RELEASE.devices','UAT_RELEASE.data','UAT_RELEASE.display','UAT_RELEASE.recovery','UAT_RELEASE.integrations','UAT_RELEASE.signoff'].every(x=>uatCore.includes(x))],
 ['UAT starts unverified',uatEdit.includes("status:'not_started'")&&!uatEdit.includes("status:'passed'")],
 ['UAT evidence and blockers',uatView.includes('Evidence')&&uatView.includes('Blocker')&&uatEdit.includes("evidence:''")&&uatEdit.includes("blocker:''")],
 ['UAT requires data governance and release gates',uatView.includes('dgDone')&&uatView.includes('done===rows.length')],
 ['backend UAT evidence enforcement',governance19.includes('PIC wajib diisi')&&governance19.includes('Evidence atau alasan wajib diisi')&&governance19.includes('Blocker wajib dijelaskan')],
 ['backend final signoff integrity',governance19.includes('Tanggal go-live wajib diisi')&&governance19.includes('Final sign-off belum lengkap')],
 ['dashboard warns until governance approved',release18.includes('KPI lintas sumber belum final')&&release18.includes("s.dgDone<s.dg.length")],
 ['authoritative source badge requires approval',release18.includes('DG16.approved(a)')&&release18.includes('Authoritative')],
 ['release control links governance and UAT',release18.includes("navigate('data-governance')")&&release18.includes("navigate('uat-release')")],
 ['D1 only configuration',wrangler.includes('[[d1_databases]]')&&!/\[\[r2_buckets\]\]/.test(wrangler)],
 ['no prototype language in active release UI',!/\b(prototype|mockup|dummy|lorem ipsum|data demo|contoh data)\b/i.test(active)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Final release validation OK — ${checks.length} blueprint and release guards checked.`);
