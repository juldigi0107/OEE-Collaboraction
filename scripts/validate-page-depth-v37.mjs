import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const safety=read('frontend/operational-safety-v35.js');
const page=read('frontend/page-depth-v36.js');
const admin=read('frontend/admin-depth-v37.js');
const backend=read('backend/release-v35-operational-safety.mjs');
const worker=read('backend/worker-production.mjs');
const checks=[
 ['v35-v37 JS active',['operational-safety-v35.js','page-depth-v36.js','admin-depth-v37.js'].every(x=>index.includes(x))],
 ['v35-v37 CSS active',['operational-safety-v35.css','page-depth-v36.css','admin-depth-v37.css'].every(x=>index.includes(x))],
 ['backend safety wired',worker.includes("handleOperationalSafetyV35")&&worker.includes("operational-safety-v35")],
 ['trigger scope canonical enforcement',backend.includes('machine_scope')&&backend.includes('canonical machine yang disahkan')&&backend.includes("scope!=='*'")],
 ['scoped trigger editor',safety.includes('Machine scope')&&safety.includes('canonicalMachines')&&safety.includes("machine_scope")],
 ['safe cycle selection',safety.includes('selectCycle')&&safety.includes('Standard belum dapat dipilih otomatis')&&safety.includes("reason:'ambiguous'")],
 ['cycle standard has no fabricated numbers',!/(target_speed_per_hour|cycle_seconds)\s*[:=]\s*[1-9][0-9.]*/.test(safety)],
 ['dashboard detail',page.includes('Aksi cepat')&&page.includes('Ruang kerja')],
 ['department detail',page.includes('Register operasional')&&page.includes('Sheet / sumber')&&page.includes('Kewenangan')],
 ['transaction register detail',page.includes('v36-register-guide')&&page.includes('moduleHelp')&&page.includes('owner')],
 ['document quick filters',page.includes('Filter cepat')&&page.includes('v36-source-filters')],
 ['quality closure path',page.includes('Jalur penutupan isu')&&page.includes('Definisi Data & KPI')&&page.includes('UAT & Evidence')],
 ['HMI decision context',page.includes('Machine health')&&page.includes('Monitoring saja')],
 ['live machine summary',page.includes('Mesin terdaftar')&&page.includes('Offline / idle')],
 ['approval filter',page.includes('v36ApprovalSearch')&&page.includes('root cause')],
 ['audit filter',page.includes('v36AuditSearch')&&page.includes('aktivitas')],
 ['integration health summary',page.includes('Koneksi terdaftar')&&page.includes('Belum live')],
 ['settings release summary',admin.includes('Parameter terlihat')&&admin.includes('Baseline governance')&&admin.includes('Gate UAT')],
 ['display lifecycle inventory',admin.includes('Lifecycle Display Mesin')&&admin.includes('Tanpa mesin')],
 ['import preflight snapshot',admin.includes('Snapshot sebelum impor')&&admin.includes('D1-only')&&admin.includes('existing tidak dihapus/ditimpa')],
 ['approval aging',admin.includes('Pending tertua')&&admin.includes('production_run')&&admin.includes('downtime')&&admin.includes('quality')],
 ['no prototype language',!(/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([safety,page,admin].join('\n')))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Page depth validation OK — ${checks.length} operational safety and page guards checked.`);
