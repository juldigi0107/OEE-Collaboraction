import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const js=read('frontend/module-table-v25.js');
const css=read('frontend/module-table-v25.css');
const form38=read('frontend/transaction-form-v38.js');
const hmi=read('frontend/hmi-dialogs-v40.js');
const admin37=read('frontend/admin-depth-v37.js');
const source41=read('frontend/source-depth-v41.js');
const planning39=read('backend/release-v39-planning-safety.mjs');
const machine20=read('backend/release-v20-machine-governance.mjs');
const quality44=read('backend/release-v44-quality-unit.mjs');
const kpi45=read('backend/release-v45-kpi-semantics.mjs');
const support21=read('backend/release-v21-support.mjs');
const worker=read('backend/worker-production.mjs');
const init=read('backend/init-schema.sql');
const realtimeSchema=read('backend/realtime-schema.sql');
const builder=read('scripts/build-d1-free.py');
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
 ['approval reviewers receive quality unit',quality44.includes("path==='/api/approvals'")&&quality44.includes('unit_status')&&quality44.includes("entity_type==='quality'")],
 ['approval UI surfaces inspection unit',admin37.includes('Satuan inspeksi:')&&admin37.includes('legacy / belum tersedia')],
 ['quality v44 wired before legacy release handler',worker.includes('handleQualityUnitV44')&&worker.indexOf('const qualityUnitResponse=await handleQualityUnitV44')<worker.indexOf('const releaseResponse=await handleReleaseV11')],
 ['quality schema preserves unit',init.includes('created_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,unit TEXT')&&realtimeSchema.includes('created_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,unit TEXT')],
 ['planning form captures target unit',form38.includes('function planningUnit')&&form38.includes("input.name='unit'")&&form38.includes('Wajib saat Released')],
 ['released planning requires authoritative unit',planning39.includes('approvedFgUnit')&&planning39.includes('Satuan target atau FG Unit authoritative')&&planning39.includes("unit_source='DATA_GOVERNANCE.fg_unit'")],
 ['start PRO persists governed unit',machine20.includes('kpiConfig')&&machine20.includes('Satuan output belum ditetapkan')&&machine20.includes('source,unit) VALUES')],
 ['start PRO uses one governed path',machine20.includes("return canonicalStart(req,env,cfg,kpi)")],
 ['HMI displays run unit and legacy warning',hmi.includes('productionUnitContext')&&hmi.includes('PRO legacy ini belum memiliki satuan output')&&hmi.includes('Satuan target:')],
 ['production unit additive migration is race safe',worker.includes("addColumnIfMissing(env,'production_runs','unit'")&&worker.includes("'/api/shopfloor/start'")],
 ['fresh production schemas preserve unit',init.includes("version INTEGER NOT NULL DEFAULT 1,unit TEXT")&&realtimeSchema.includes("version INTEGER NOT NULL DEFAULT 1,unit TEXT")],
 ['fresh schema has no seeded superadmin',!init.includes("'seed-superadmin'")&&!init.includes("INSERT OR IGNORE INTO users")],
 ['release manifest exposes quality coverage',support21.includes('qualityCoverage')&&support21.includes('aggregation_policy')&&support21.includes('data_coverage')],
 ['release manifest exposes embedded media coverage',support21.includes('mediaCoverage')&&support21.includes('embedded_assets')&&support21.includes("status:total>0?'catalogued':'not_backfilled'")],
 ['support UI surfaces data coverage',admin37.includes('Coverage integritas data')&&admin37.includes('QC legacy tanpa satuan')&&admin37.includes('Embedded child asset')],
 ['D1 builder extracts embedded OOXML media',builder.includes("'/media/' in n")&&builder.includes("asset_catalog")&&builder.includes('embedded_assets')],
 ['source detail uses authenticated asset catalog',source41.includes("api('/assets?source='")&&source41.includes("'/api/media/'")&&source41.includes('assets.slice(0,12)')],
 ['source media preserves original authority',source41.includes('Workbook atau presentation asli tetap menjadi source authority')],
 ['non-QC dashboard delegates to KPI semantics',quality44.includes("handleKpiSemanticsV45")&&quality44.includes('if(qc)return qc')],
 ['maintenance live formula not overclaimed',kpi45.includes('Durasi perbaikan rata-rata · live')&&kpi45.includes('Run hours per UPDT · live')&&kpi45.includes('tidak diklaim sebagai MTTR resmi')],
 ['maintenance governance definitions surfaced',kpi45.includes('Baseline MTTR resmi:')&&kpi45.includes('Baseline MTBF resmi:')],
 ['PDS currency not hardcoded authoritative',kpi45.includes('Satuan mata uang mengikuti sumber')&&kpi45.includes("'Nilai biaya tercatat',''")],
 ['project average is explicitly unweighted',kpi45.includes('bukan weighted portfolio progress')],
 ['register horizon is explicit',kpi45.includes('Cakupan seluruh register D1 terpetakan')&&kpi45.includes('Seluruh register hasil produksi terpetakan')]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Module, quality-unit, production-unit, KPI-semantics, approval, and media validation OK — ${checks.length} presentation/data-integrity guards checked.`);
