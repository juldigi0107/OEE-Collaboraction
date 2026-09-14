import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const safety=read('frontend/operational-safety-v35.js');
const page=read('frontend/page-depth-v36.js');
const admin=read('frontend/admin-depth-v37.js');
const form=read('frontend/transaction-form-v38.js');
const hmi=read('frontend/hmi-dialogs-v40.js');
const hmi60=read('frontend/hmi-operation-safety-v60.js');
const governanceEdit=read('frontend/data-governance-edit-v16.js');
const moduleTable=read('frontend/module-table-v25.js');
const backend=read('backend/release-v35-operational-safety.mjs');
const governance=read('backend/release-v19-governance.mjs');
const lifecycle=read('backend/release-v46-data-lifecycle.mjs');
const liveRegister=read('backend/release-v49-live-register.mjs');
const process59=read('backend/release-v59-process-capability.mjs');
const telemetry61=read('backend/release-v61-telemetry-freshness.mjs');
const calendar62=read('backend/release-v62-work-calendar.mjs');
const runtime=read('frontend/operational-control-runtime-v31.js');
const worker=read('backend/worker-production.mjs');
const checks=[
 ['v35-v60 JS active',['operational-safety-v35.js','page-depth-v36.js','admin-depth-v37.js','transaction-form-v38.js','hmi-dialogs-v40.js','hmi-operation-safety-v60.js'].every(x=>index.includes(x))],
 ['v35-v40 CSS active',['operational-safety-v35.css','page-depth-v36.css','admin-depth-v37.css','transaction-form-v38.css','hmi-dialogs-v40.css'].every(x=>index.includes(x))],
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
 ['transaction required rules mirror backend',form.includes("production:['title','date','machine','total','good','planned','runtime','speed']")&&form.includes("process:['title','date','machine','parameter','value','unit']")&&form.includes("batch:['title','date','machine','pro','input_batch','output_batch','qty','good','reject','nc','unit']")],
 ['PPIC signed values preserved',form.includes('Signed value')&&form.includes('reversal')],
 ['production OEE preview is explicitly non-authoritative',form.includes('Preview kalkulasi')&&form.includes('backend')],
 ['checklist uses controlled yes/no',form.includes('Ya / Siap')&&form.includes('Tidak / Belum')],
 ['process subgroup captured explicitly',form.includes('Subgroup ID')&&form.includes('rational subgroup')&&form.includes("input.name='subgroup'")],
 ['Ppk and Cpk semantics remain distinct',form.includes('Pp/Ppk & Cp/Cpk')&&form.includes('sampleSd')&&form.includes('pooled')&&form.includes('Cpk belum tersedia')&&form.includes('groups.length>=2&&groups.every(g=>g.length>=2)')],
 ['process register exposes subgroup trace',moduleTable.includes('Subgroup ${p.subgroup}')&&moduleTable.includes('tidak otomatis dianggap rational subgroup untuk Cpk')],
 ['process backend guard wired',worker.includes('handleProcessCapabilityV59')&&worker.includes('process-capability-v59')],
 ['process backend validates specifications',process59.includes('LSL dan USL harus diisi berpasangan')&&process59.includes('LSL harus lebih kecil dari USL')&&process59.includes('Subgroup ID terlalu panjang')],
 ['process backend requires business context on create',process59.includes('Process measurement baru wajib memiliki mesin dan tanggal')&&process59.includes('Parameter Process wajib diisi')&&process59.includes('Satuan Process wajib diisi')],
 ['barcode scan uses exact plan ID or PRO',hmi.includes('exactScan')&&hmi.includes('idMatches')&&hmi.includes('proMatches')&&hmi.includes('Plan ID atau PRO Released')],
 ['barcode scan never uses material fuzzy match',!hmi.includes('dataset.material')&&hmi.includes('Material tidak dipakai sebagai barcode key')],
 ['ambiguous barcode fails closed',hmi.includes('PRO cocok ke lebih dari satu Planning Released')&&hmi.includes("select.value=''")&&hmi.includes('Tidak ada Planning Released dengan Plan ID / PRO exact')],
 ['HMI stale machine selection fails closed',hmi60.includes("SENTINEL='__RESELECT_REQUIRED__'")&&hmi60.includes('tidak lagi tersedia pada overview')&&hmi60.includes('Pilih mesin secara eksplisit')],
 ['HMI stale machine locks mutation controls',hmi60.includes('#startRun input')&&hmi60.includes('.hmi-actions button')&&hmi60.includes("data-operation-locked','machine-reselect")],
 ['HMI explicit machine selection remains possible',hmi60.includes("document.querySelectorAll('[data-machine]')")&&hmi60.includes('machineExists')],
 ['stale telemetry is never displayed as numeric counter/speed',hmi60.includes("counter.textContent='—'")&&hmi60.includes("speed.textContent='—'")&&hmi60.includes('Telemetry tidak authoritative')],
 ['Finish UI requires manual actual when counter lineage untrusted',hmi60.includes("actual.required=true")&&hmi60.includes('Actual Qty manual wajib diisi')&&hmi60.includes('auto_counter_finish_ready')],
 ['telemetry status endpoint authenticated',telemetry61.includes("path==='/api/telemetry-status'")&&telemetry61.includes('Silakan login kembali')&&telemetry61.includes('heartbeat_age_seconds')],
 ['pre-start telemetry trust captured',telemetry61.includes('captureTelemetryStartV61')&&telemetry61.includes('counter_start_trusted')&&worker.includes('afterTelemetryStartV61')],
 ['automatic Finish requires trusted start and end counter',telemetry61.includes('startTrusted&&endTrusted')&&telemetry61.includes('Actual Qty wajib diisi manual')&&telemetry61.includes('lineage-nya tidak authoritative')],
 ['counter trust column additive',worker.includes("counter_start_trusted','ALTER TABLE production_runs ADD COLUMN counter_start_trusted INTEGER NOT NULL DEFAULT 0")],
 ['telemetry capability fingerprinted',worker.includes('telemetry-freshness-v61')&&worker.includes('hmi-operation-safety-v60')],
 ['work calendar endpoint and fingerprint wired',worker.includes('handleWorkCalendarV62')&&worker.includes('work-calendar-v62')&&calendar62.includes("'/api/work-calendar/context'")],
 ['calendar timezone is explicit and never defaulted',governanceEdit.includes('Zona waktu operasional')&&governanceEdit.includes("timezone:f.get('timezone').trim()")&&calendar62.includes('IANA timezone')],
 ['shift windows reject overlap and runtime mismatch',calendar62.includes('Window Shift 1–3 saling overlap')&&calendar62.includes('di luar window shift')&&calendar62.includes('Planning Released berada pada Shift')],
 ['work date column is additive and audited',worker.includes("work_date','ALTER TABLE production_runs ADD COLUMN work_date TEXT")&&calendar62.includes('WORK_CALENDAR_APPLIED')],
 ['HMI presents governed work calendar',hmi60.includes('Tanggal kerja')&&hmi60.includes('Shift aktif')&&hmi60.includes('workday_cutoff')&&hmi60.includes('loadWorkCalendar')],
 ['live registers preserve governed work date',liveRegister.includes("date=clean(r.work_date)||safeDate")&&liveRegister.includes('work_date:clean(r.work_date)')&&liveRegister.includes('r.work_date,r.shift,r.group_name')],
 ['group rotation is not fabricated',governanceEdit.includes('Group rotation tetap mengikuti planning')&&!calendar62.includes('group=A')&&!calendar62.includes('group_model||')],
 ['no prototype language',!(/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([safety,page,admin,form,hmi,hmi60,governanceEdit,moduleTable,lifecycle,liveRegister,process59,telemetry61,calendar62].join('\n')))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Page depth and lifecycle validation OK — ${checks.length} operational, admin, transaction, process-capability, barcode, telemetry, HMI fail-closed, work-calendar, work-date lineage, and storage guards checked.`);
