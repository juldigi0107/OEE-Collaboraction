import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const core=read('frontend/app-core.js');
const field=read('frontend/field-display-v8.js');
const r10=read('frontend/release-v10.js');
const r11=read('frontend/release-v11.js');
const r12=read('frontend/role-dashboard-v12.js');
const r13=read('frontend/workflow-v13.js');
const r14=read('frontend/governance-v14.js');
const dgCore=read('frontend/data-governance-core-v16.js');
const dgView=read('frontend/data-governance-view-v16.js');
const dgEdit=read('frontend/data-governance-edit-v16.js');
const machine20ui=read('frontend/machine-governance-v20.js');
const uatCore=read('frontend/uat-release-core-v17.js');
const uatView=read('frontend/uat-release-view-v17.js');
const uatEdit=read('frontend/uat-release-edit-v17.js');
const release18=read('frontend/release-status-v18.js');
const support21=read('frontend/support-recovery-v21.js');
const settings27=read('frontend/settings-polish-v27.js');
const oc31core=read('frontend/operational-control-core-v31.js');
const oc31view=read('frontend/operational-control-view-v31.js');
const oc31edit=read('frontend/operational-control-edit-v31.js');
const oc31runtime=read('frontend/operational-control-runtime-v31.js');
const back=read('backend/release-v11.mjs');
const security=read('backend/release-v15-security.mjs');
const governance19=read('backend/release-v19-governance.mjs');
const machine20=read('backend/release-v20-machine-governance.mjs');
const supportBackend21=read('backend/release-v21-support.mjs');
const production=read('backend/worker-production.mjs');
const realtime=read('backend/realtime.mjs');
const wrangler=read('wrangler.toml');
const active=[r10,r11,r12,r13,r14,dgCore,dgView,dgEdit,machine20ui,uatCore,uatView,uatEdit,release18,support21,oc31core,oc31view,oc31edit,oc31runtime].join('\n');
const supportCall=production.indexOf('const supportResponse=await handleSupportV21');
const machineCall=production.indexOf('const machineGovernanceResponse=await handleMachineGovernanceV20');
const governanceCall=production.indexOf('const governanceResponse=await handleGovernanceV19');
const securityCall=production.indexOf('const securityResponse=await handleSecurityV15');
const releaseCall=production.indexOf('const releaseResponse=await handleReleaseV11');
const bundles=['release-v10.js','release-v11.js','role-dashboard-v12.js','workflow-v13.js','governance-v14.js','data-governance-core-v16.js','data-governance-view-v16.js','data-governance-edit-v16.js','machine-governance-v20.js','uat-release-core-v17.js','uat-release-view-v17.js','uat-release-edit-v17.js','release-status-v18.js','support-recovery-v21.js','operational-control-core-v31.js','operational-control-view-v31.js','operational-control-edit-v31.js','operational-control-runtime-v31.js'];
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
 ['worker guard order',supportCall>=0&&machineCall>=0&&governanceCall>=0&&securityCall>=0&&releaseCall>=0&&supportCall<machineCall&&machineCall<governanceCall&&governanceCall<securityCall&&securityCall<releaseCall],
 ['permission gate before workflow lookup',securityCall>=0&&releaseCall>=0&&securityCall<releaseCall&&security.includes('Tidak memiliki izin verifikasi')],
 ['UPDT escalation automation',realtime.includes("class='UPDT'")&&realtime.includes("'+10 minutes'")],
 ['audit sensitive-value redaction',r14.includes('(password|hash|salt|token|secret|credential)')],
 ['business-facing source registry',r10.includes('Pusat Data & Dokumen')&&r10.includes('Register sumber')],
 ['source quality reconciliation',r10.includes('Kualitas Data')&&r10.includes('Prioritas rekonsiliasi')],
 ['data governance five baselines',['kpi_definitions','machine_aliases','shift_calendar','source_authority','join_grain'].every(x=>dgCore.includes(x))],
 ['data governance business presentation',dgView.includes('Definisi Data & KPI')&&dgView.includes('Belum disahkan')&&dgView.includes('Perlu keputusan owner')],
 ['data governance uses native controlled forms',dgEdit.includes('id="dgNative"')&&dgEdit.includes("api('/settings','PUT'")&&dgEdit.includes("department:'PROJECT'")&&!dgEdit.includes("navigate('settings')")],
 ['data governance approval remains explicit',dgEdit.includes('name="approved"')&&dgEdit.includes('sudah diverifikasi dan disetujui pemilik proses')],
 ['backend governance approval completeness',governance19.includes('Baseline KPI belum lengkap')&&governance19.includes('Canonical machine tidak boleh kosong')&&governance19.includes('Kalender shift belum lengkap')&&governance19.includes('Sumber authoritative belum ditetapkan')&&governance19.includes('Join grain wajib')],
 ['backend governance restricted to superadmin',governance19.includes("u.role!=='superadmin'")&&governance19.includes('hanya dapat disahkan oleh Superadmin')],
 ['approved machine aliases gate runtime',machine20.includes("c?.approved===true")&&machine20.includes('DATA_GOVERNANCE.machine_aliases')],
 ['canonical Start PRO validates plan equivalence',machine20.includes('planCode=canonical(cfg,pp.machine)')&&machine20.includes('planCode!==code')&&machine20.includes("pp.status!=='Released'")],
 ['canonical Edge preserves source machine',machine20.includes('source_machine_code')&&machine20.includes("ingestMachineEvents(env,applied.events,'machine-edge-governed')")],
 ['canonical start audit trace',machine20.includes('SHOPFLOOR_START_CANONICAL')&&machine20.includes('source_machine:b.machine')&&machine20.includes('planning_machine:pp.machine')],
 ['frontend planning alias adapter gated by approval',machine20ui.includes('DG16.approved(c)')&&machine20ui.includes("startsWith('/shopfloor/plans')")],
 ['frontend adapter preserves source machine in response clone',machine20ui.includes('p.source_machine=original')&&machine20ui.includes('return {...row,payload:JSON.stringify(p)}')],
 ['UAT seven release gates',['UAT_RELEASE.roles','UAT_RELEASE.devices','UAT_RELEASE.data','UAT_RELEASE.display','UAT_RELEASE.recovery','UAT_RELEASE.integrations','UAT_RELEASE.signoff'].every(x=>uatCore.includes(x))],
 ['UAT native v22 editor',uatEdit.includes('UAT & Go-Live v22 native editor')&&uatEdit.includes('id="uatNative"')&&uatEdit.includes("api('/settings','PUT'")&&!uatEdit.includes("navigate('settings')")],
 ['UAT starts unverified',uatEdit.includes("status:'not_started'")&&!uatEdit.includes("status:'passed'")],
 ['UAT evidence and blockers',uatView.includes('Evidence')&&uatView.includes('Blocker')&&uatEdit.includes("evidence:''")&&uatEdit.includes("blocker:''")],
 ['UAT requires data governance and release gates',uatView.includes('dgDone')&&uatView.includes('done===rows.length')],
 ['backend UAT evidence enforcement',governance19.includes('PIC wajib diisi')&&governance19.includes('Evidence atau alasan wajib diisi')&&governance19.includes('Blocker wajib dijelaskan')],
 ['backend final signoff integrity',governance19.includes('Tanggal go-live wajib diisi')&&governance19.includes('Final sign-off belum lengkap')],
 ['dashboard warns until governance approved',release18.includes('KPI lintas sumber belum final')&&release18.includes("s.dgDone<s.dg.length")],
 ['authoritative source badge requires approval',release18.includes('DG16.approved(a)')&&release18.includes('Authoritative')],
 ['release control links governance and UAT',release18.includes("navigate('data-governance')")&&release18.includes("navigate('uat-release')")],
 ['support and recovery bundle active',index.includes('support-recovery-v21.js')&&support21.length>0&&supportBackend21.length>0&&production.includes('handleSupportV21')],
 ['operational control five blueprint baselines',['cycle_targets','loss_time_classification','machine_triggers','field_ownership','delivery_plan'].every(x=>oc31core.includes(x))],
 ['operational control business view',oc31view.includes('Cycle Target & Ideal Speed')&&oc31view.includes('Klasifikasi Loss-Time')&&oc31view.includes('Machine Trigger Rules')&&oc31view.includes('Field Ownership & Source of Truth')&&oc31view.includes('Delivery Plan & Open Action')],
 ['loss-time source seeds preserve ambiguity',['Cleaning','No Operator','Start Up','Trial','No Material','No Tools'].every(x=>oc31edit.includes(x))&&oc31edit.includes('Belum diputuskan')],
 ['cycle target has no fabricated default number',oc31edit.includes('target_speed_per_hour')&&oc31edit.includes('cycle_seconds')&&!oc31edit.includes('target_speed_per_hour:')&&!oc31edit.includes('cycle_seconds:')],
 ['operational approval explicit',oc31edit.includes('name="approved"')&&oc31edit.includes('telah diverifikasi')],
 ['machine trigger editor requires canonical scope',oc31edit.includes('triggerMachineOptions')&&oc31edit.includes('name="machine_scope"')&&oc31view.includes('Machine scope')],
 ['generic settings reserves operational control',settings27.includes("['OPERATIONAL_CONTROL.','Standar Operasional','operational-control']")],
 ['backend operational control restricted to superadmin',governance19.includes("key.startsWith('OPERATIONAL_CONTROL.')")&&governance19.includes('validateOperational')&&governance19.includes('Standar Operasional hanya dapat disahkan oleh Superadmin')],
 ['backend cycle and delivery approval integrity',governance19.includes('Minimal satu Cycle Target wajib ditetapkan')&&governance19.includes('evidence closure wajib diisi')],
 ['backend operational machine scope bound to canonical aliases',governance19.includes('canonicalMachines')&&governance19.includes('machine scope harus * atau canonical machine yang sudah disahkan')&&governance19.includes('mesin harus memakai canonical machine yang sudah disahkan')],
 ['approved loss-time baseline enforced at runtime',machine20.includes('OPERATIONAL_CONTROL.loss_time_classification')&&machine20.includes('Reason code belum terdaftar pada baseline Loss-Time')&&machine20.includes('Owner Department harus')],
 ['approved edge triggers enforce machine scope',machine20.includes("scope!=='*'")&&machine20.includes('next.trigger_scope=scope')&&machine20.includes('trigger_rules_matched')],
 ['HMI standard card uses approved cycle baseline',oc31runtime.includes('OC31.approved(cfg)')&&oc31runtime.includes('Standard Proses')&&oc31runtime.includes('cycle_seconds')],
 ['HMI cycle matching fails safe on material ambiguity',oc31runtime.includes('cycleDecision')&&oc31runtime.includes('ambiguous_material')&&oc31runtime.includes('material_context_required')&&oc31runtime.includes('Belum dapat dipilih otomatis')],
 ['downtime preset uses approved loss baseline',oc31runtime.includes('Pilih reason code yang disahkan')&&oc31runtime.includes('lossFor(klass)')],
 ['D1 only configuration',wrangler.includes('[[d1_databases]]')&&!/\[\[r2_buckets\]\]/.test(wrangler)],
 ['no prototype language in active release UI',!/\b(prototype|mockup|dummy|lorem ipsum|data demo|contoh data)\b/i.test(active)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Final release validation OK — ${checks.length} blueprint and release guards checked.`);
