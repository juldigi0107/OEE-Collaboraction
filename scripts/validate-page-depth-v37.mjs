import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const safety=read('frontend/operational-safety-v35.js');
const page=read('frontend/page-depth-v36.js');
const admin=read('frontend/admin-depth-v37.js');
const form=read('frontend/transaction-form-v38.js');
const backend=read('backend/release-v35-operational-safety.mjs');
const governance=read('backend/release-v19-governance.mjs');
const lifecycle=read('backend/release-v46-data-lifecycle.mjs');
const runtime=read('frontend/operational-control-runtime-v31.js');
const worker=read('backend/worker-production.mjs');
const checks=[
 ['v35-v38 JS active',['operational-safety-v35.js','page-depth-v36.js','admin-depth-v37.js','transaction-form-v38.js'].every(x=>index.includes(x))],
 ['v35-v38 CSS active',['operational-safety-v35.css','page-depth-v36.css','admin-depth-v37.css','transaction-form-v38.css'].every(x=>index.includes(x))],
 ['backend safety wired',worker.includes('handleOperationalSafetyV35')&&worker.includes('operational-safety-v35')],
 ['canonical trigger scope authority remains v19',governance.includes('machine_scope harus * atau canonical machine yang sudah disahkan')&&governance.includes('canonicalMachines')],
 ['v35 adds duplicate trigger safety only',backend.includes('rule duplikat pada scope/kondisi yang sama')&&!backend.includes('canonical machine yang disahkan')],
 ['v35 delegates cycle authority to v31',safety.includes('OC31Runtime?.cycleDecision')&&safety.includes('duplicateTriggerRows')],
 ['v31 cycle selection remains fail-safe',runtime.includes('ambiguous_material')&&runtime.includes('material_context_required')&&runtime.includes('Belum dapat dipilih otomatis')],
 ['dashboard detail',page.includes('Aksi cepat')&&page.includes('Ruang kerja')],
 ['department detail',page.includes('Register operasional')&&page.includes('Sheet / sumber')&&page.includes('Kewenangan')],
 ['transaction register detail',page.includes('v36-register-guide')&&page.includes('moduleHelp')&&page.includes('owner')],
 ['document quick filters',page.includes('Filter cepat')&&page.includes('v36-source-filters')],
 ['quality closure path',page.includes('Jalur penutupan isu')&&page.includes('Definisi Data & KPI')&&page.includes('UAT & Evidence')],
 ['HMI decision context',page.includes('Machine health')&&page.includes('Monitoring saja')],
 ['live machine summary',page.includes('Mesin terdaftar')&&page.includes('Offline / idle')],
 ['approval and audit filters',page.includes('v36ApprovalSearch')&&page.includes('v36AuditSearch')],
 ['integration health summary',page.includes('Koneksi terdaftar')&&page.includes('Belum live')],
 ['settings release summary',admin.includes('Parameter terlihat')&&admin.includes('Baseline governance')&&admin.includes('Gate UAT')],
 ['display lifecycle inventory',admin.includes('Lifecycle Display Mesin')&&admin.includes('Tanpa mesin')],
 ['import preflight snapshot',admin.includes('Snapshot sebelum impor')&&admin.includes('D1-only')&&admin.includes('existing tidak dihapus/ditimpa')],
 ['approval aging',admin.includes('Pending tertua')&&admin.includes('production_run')&&admin.includes('downtime')&&admin.includes('quality')],
 ['storage lifecycle UI',admin.includes('Storage Health & Data Lifecycle')&&admin.includes('Ephemeral housekeeping aktif')&&admin.includes('tidak ada purge otomatis')],
 ['storage lifecycle endpoint wired',worker.includes('handleDataLifecycleV46')&&worker.includes('data-lifecycle-v46')&&lifecycle.includes("'/api/storage-health'")],
 ['ephemeral housekeeping only',lifecycle.includes('DELETE FROM sessions WHERE expires<=?')&&lifecycle.includes('DELETE FROM login_attempts WHERE until_ts<?')&&!lifecycle.includes('DELETE FROM machine_minute_snapshot')&&!lifecycle.includes('DELETE FROM audit')],
 ['business retention is monitor only',lifecycle.includes("operational:'monitor_only'")&&lifecycle.includes("business_history:'no_automatic_delete'")&&lifecycle.includes("retention:'preserve'")],
 ['scheduled lifecycle cleanup active',worker.includes('runLifecycleHousekeepingV46')&&worker.includes('ctx.waitUntil(runLifecycleHousekeepingV46(env))')],
 ['transaction required rules mirror backend',form.includes("production:['title','date','machine','total','good','planned','runtime','speed']")&&form.includes("batch:['title','date','machine','pro','input_batch','output_batch','qty','good','reject','nc','unit']")],
 ['PPIC signed values preserved',form.includes('Signed value')&&form.includes('reversal')],
 ['production OEE preview is explicitly non-authoritative',form.includes('Preview kalkulasi')&&form.includes('backend')],
 ['checklist uses controlled yes/no',form.includes('Ya / Siap')&&form.includes('Tidak / Belum')],
 ['no prototype language',!(/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([safety,page,admin,form,lifecycle].join('\n')))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Page depth and lifecycle validation OK — ${checks.length} operational, admin, transaction, and storage guards checked.`);
