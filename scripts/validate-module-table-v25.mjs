import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const js=read('frontend/module-table-v25.js');
const css=read('frontend/module-table-v25.css');
const hmi=read('frontend/hmi-dialogs-v40.js');
const quality44=read('backend/release-v44-quality-unit.mjs');
const worker=read('backend/worker-production.mjs');
const init=read('backend/init-schema.sql');
const realtimeSchema=read('backend/realtime-schema.sql');
const modules=['production','downtime','quality','maintenance','confirmation','planning','development','batch','checklist','logbook','process','energy','master','project'];
const checks=[
 ['v25 JS active',index.includes('module-table-v25.js')],
 ['v25 CSS active',index.includes('module-table-v25.css')],
 ['all business modules covered',modules.every(m=>js.includes(`${m}:`))],
 ['source traceability presented',js.includes("p.source_sheet")&&js.includes("p.source_record")&&js.includes('D1 operasional')],
 ['unit preservation communicated',js.includes('Satuan dan sumber dipertahankan')&&js.includes('tidak menggabungkan unit berbeda')],
 ['production fields are source values',js.includes("col('Total output'")&&js.includes("col('Good output'")&&!js.includes('p.total-p.good')],
 ['quality keeps unit explicit',js.includes("col('Satuan',p=>txt(p.unit))")&&js.includes("col('Reject'")&&js.includes("col('Diperiksa'")],
 ['PPIC signed fields remain visible',js.includes("col('Yield'")&&js.includes("col('Scrap'")&&js.includes("col('Jam'")],
 ['maintenance business fields visible',js.includes("col('Notifikasi'")&&js.includes("col('Tindakan korektif'")],
 ['batch Good NC Reject visible',js.includes('Good / NC / Reject')],
 ['status labels business-facing',js.includes('Menunggu verifikasi')&&js.includes('Siap Produksi')&&js.includes('Diterima Maintenance')],
 ['detail action preserved',js.includes('data-v25-entry')&&js.includes('entryForm(rows[')],
 ['responsive table treatment present',css.includes('@media(max-width:820px)')&&css.includes('.v25-num')],
 ['live quality requires explicit unit',hmi.includes('name="unit" required')&&hmi.includes('dashboard tidak menjumlahkan unit berbeda')],
 ['quality dashboard groups by unit',quality44.includes("GROUP BY COALESCE(NULLIF(lower(trim(unit)),''),'__missing__')")&&quality44.includes('Kuantitas ditampilkan per unit')],
 ['legacy quality rows remain unrelabelled',quality44.includes('Event lama tanpa satuan')&&quality44.includes('Dikeluarkan dari agregasi qty per unit')],
 ['quality v44 wired before legacy release handler',worker.includes('handleQualityUnitV44')&&worker.indexOf('const qualityUnitResponse=await handleQualityUnitV44')<worker.indexOf('const releaseResponse=await handleReleaseV11')],
 ['quality schema preserves unit',init.includes('created_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,unit TEXT')&&realtimeSchema.includes('created_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,unit TEXT')],
 ['fresh schema has no seeded superadmin',!init.includes("'seed-superadmin'")&&!init.includes("INSERT OR IGNORE INTO users")]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Module table and quality-unit validation OK — ${checks.length} presentation/data-integrity guards checked.`);
