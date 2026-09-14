import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const hasAll=(text,needles)=>needles.every(x=>text.includes(x));
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
const resilience33=read('frontend/release-resilience-v33.js');
const dashboard34=read('frontend/dashboard-period-v34.js');
const back=read('backend/release-v11.mjs');
const security=read('backend/release-v15-security.mjs');
const governance19=read('backend/release-v19-governance.mjs');
const machine20=read('backend/release-v20-machine-governance.mjs');
const supportBackend21=read('backend/release-v21-support.mjs');
const production=read('backend/worker-production.mjs');
const realtime=read('backend/realtime.mjs');
const wrangler=read('wrangler.toml');
const active=[r10,r11,r12,r13,r14,dgCore,dgView,dgEdit,machine20ui,uatCore,uatView,uatEdit,release18,support21,oc31core,oc31view,oc31edit,oc31runtime,resilience33,dashboard34].join('\n');
const bundles=['release-v10.js','release-v11.js','role-dashboard-v12.js','workflow-v13.js','governance-v14.js','data-governance-core-v16.js','data-governance-view-v16.js','data-governance-edit-v16.js','machine-governance-v20.js','uat-release-core-v17.js','uat-release-view-v17.js','uat-release-edit-v17.js','release-status-v18.js','support-recovery-v21.js','operational-control-core-v31.js','operational-control-view-v31.js','operational-control-edit-v31.js','operational-control-runtime-v31.js','release-resilience-v33.js','dashboard-period-v34.js'];
const order=['const supportResponse=await handleSupportV21','const machineGovernanceResponse=await handleMachineGovernanceV20','const governanceResponse=await handleGovernanceV19','const securityResponse=await handleSecurityV15','const releaseResponse=await handleReleaseV11'].map(x=>production.indexOf(x));
const checks=[
 ['active release bundles',bundles.every(x=>index.includes(x))],
 ['all business modules',hasAll(core,['confirmation','planning','production','downtime','quality','maintenance','development','checklist','logbook','process','energy','master','project','batch'])],
 ['published field display only',field.includes("layout.status==='published'")||field.includes("layout.status!=='published'")],
 ['exact field display machine scope',r10.includes('filter(m=>normalize(m.code)===code)')],
 ['source registry and reconciliation',hasAll(r10,['Pusat Data & Dokumen','Register sumber','Kualitas Data','Prioritas rekonsiliasi'])],
 ['release readiness blueprint controls',hasAll(r10,['RELEASE_READINESS.infrastructure','RELEASE_READINESS.data_owners','RELEASE_READINESS.terminology','barcodePlanScan'])],
 ['approval workflow UI and API',hasAll(r11,["view==='approvals'",'/approvals/decide'])&&hasAll(back,['FINAL_VERIFY','ROOT_CAUSE_VERIFY','QC_VERIFY',"'/api/approvals'"])],
 ['role dashboard and KPI semantics',hasAll(back,["'/api/role-dashboard'",'MTTR maintenance live','MTBF live estimate','Reversal candidate'])&&r12.includes('/role-dashboard?department=')],
 ['released planning gate',hasAll(back,["payload.status!=='Released'","json_extract(payload,'$.status')='Released'"])&&r13.includes('Released / Siap Produksi')],
 ['workflow closure gates',hasAll(back,['Root cause / tindakan wajib diisi',"c.status!=='ACKNOWLEDGED'",'Alasan wajib diisi untuk penolakan'])],
 ['worker guard order',order.every(x=>x>=0)&&order.every((x,i)=>i===0||x>order[i-1])],
 ['permission before release workflow',production.indexOf('const securityResponse=await handleSecurityV15')<production.indexOf('const releaseResponse=await handleReleaseV11')&&security.includes('Tidak memiliki izin verifikasi')],
 ['UPDT auto escalation',hasAll(realtime,["class='UPDT'","'+10 minutes'"])],
 ['audit sensitive redaction',r14.includes('(password|hash|salt|token|secret|credential)')],
 ['five data-governance baselines',hasAll(dgCore,['kpi_definitions','machine_aliases','shift_calendar','source_authority','join_grain'])],
 ['data-governance controlled UI',hasAll(dgView,['Definisi Data & KPI','Belum disahkan','Perlu keputusan owner'])&&hasAll(dgEdit,['id="dgNative"',"api('/settings','PUT'",'name="approved"'])],
 ['backend governance completeness',hasAll(governance19,['Baseline KPI belum lengkap','Canonical machine tidak boleh kosong','Kalender shift belum lengkap','Sumber authoritative belum ditetapkan','Join grain wajib'])],
 ['governance superadmin only',hasAll(governance19,["u.role!=='superadmin'",'hanya dapat disahkan oleh Superadmin'])],
 ['authoritative source IDs exist in D1',hasAll(governance19,['Source Authority ${domain}: source ID tidak ditemukan pada D1','SELECT id FROM sources WHERE id=?'])],
 ['machine alias runtime approval',hasAll(machine20,['DATA_GOVERNANCE.machine_aliases','planCode=canonical(cfg,pp.machine)','SHOPFLOOR_START_CANONICAL'])],
 ['edge preserves identity and trigger trace',hasAll(machine20,['source_machine_code',"ingestMachineEvents(env,applied.events,'machine-edge-governed')",'next.trigger_scope=scope','trigger_rules_matched'])],
 ['frontend alias adapter approved only',hasAll(machine20ui,['DG16.approved(c)',"startsWith('/shopfloor/plans')",'p.source_machine=original'])],
 ['seven UAT gates',hasAll(uatCore,['UAT_RELEASE.roles','UAT_RELEASE.devices','UAT_RELEASE.data','UAT_RELEASE.display','UAT_RELEASE.recovery','UAT_RELEASE.integrations','UAT_RELEASE.signoff'])],
 ['UAT evidence and blockers',hasAll(uatView,['Evidence','Blocker','dgDone'])&&hasAll(uatEdit,['id="uatNative"',"status:'not_started'","evidence:''","blocker:''"])],
 ['backend UAT and signoff integrity',hasAll(governance19,['PIC wajib diisi','Evidence atau alasan wajib diisi','Blocker wajib dijelaskan','Tanggal go-live wajib diisi','Final sign-off belum lengkap'])],
 ['release status links governance/UAT',hasAll(release18,['KPI lintas sumber belum final',"navigate('data-governance')","navigate('uat-release')",'Authoritative'])],
 ['support and recovery active',index.includes('support-recovery-v21.js')&&support21.length>0&&supportBackend21.length>0&&production.includes('handleSupportV21')],
 ['five operational-control baselines',hasAll(oc31core,['cycle_targets','loss_time_classification','machine_triggers','field_ownership','delivery_plan'])],
 ['operational-control business view',hasAll(oc31view,['Cycle Target & Ideal Speed','Klasifikasi Loss-Time','Machine Trigger Rules','Field Ownership & Source of Truth','Delivery Plan & Open Action','Machine scope'])],
 ['loss-time ambiguity preserved',hasAll(oc31edit,['Cleaning','No Operator','Start Up','Trial','No Material','No Tools','Belum diputuskan'])],
 ['no fabricated cycle defaults',hasAll(oc31edit,['target_speed_per_hour','cycle_seconds'])&&!oc31edit.includes('target_speed_per_hour:')&&!oc31edit.includes('cycle_seconds:')],
 ['machine trigger canonical scope editor',hasAll(oc31edit,['triggerMachineOptions','name="machine_scope"','Machine scope wajib dipilih'])],
 ['operational settings reserved',settings27.includes("['OPERATIONAL_CONTROL.','Standar Operasional','operational-control']")],
 ['operational backend approval integrity',hasAll(governance19,['validateOperational','Minimal satu Cycle Target wajib ditetapkan','evidence closure wajib diisi','canonicalMachines','machine scope harus * atau canonical machine yang sudah disahkan'])],
 ['loss-time enforced server side',hasAll(machine20,['OPERATIONAL_CONTROL.loss_time_classification','Reason code belum terdaftar pada baseline Loss-Time','Owner Department harus'])],
 ['cycle target fails safe on ambiguity',hasAll(oc31runtime,['cycleDecision','ambiguous_material','material_context_required','Belum dapat dipilih otomatis'])],
 ['governed downtime requires approved reason',hasAll(oc31runtime,['select.required=true','readOnly=true','Belum ada reason',"dept.value='PROD'"])],
 ['data context preserves semantic boundaries',hasAll(oc31runtime,['Multi-unit terdeteksi','reversal candidate','Periode mengikuti tanggal transaksi','Source authority belum disahkan',"process:'quality'",'Process parameter berada pada domain Quality','timestamp operasional hanya fallback'])],
 ['stale department state guarded',hasAll(resilience33,['!sheets.some(s=>s.id===activeSheet)','Belum ada sheet sumber','retryDept'])],
 ['common image previews supported',hasAll(resilience33,["['jpg','jpeg','webp','gif']","kind==='svg'?'png'"])],
 ['dashboard derives period from source cells',hasAll(dashboard34,['excelEpoch','toDate','periode berasal dari cell tanggal sumber','Trend OEE ${esc(lastPeriod.label)}'])],
 ['D1 only architecture',wrangler.includes('[[d1_databases]]')&&!wrangler.includes('[[r2_buckets]]')],
 ['no prototype language in active release UI',!/\b(prototype|mockup|dummy|lorem ipsum|data demo|contoh data)\b/i.test(active)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Final release validation OK — ${checks.length} blueprint, security, runtime, and presentation guards checked.`);
