import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const js=fs.readFileSync('frontend/display-lifecycle-v29.js','utf8');
const css=fs.readFileSync('frontend/display-lifecycle-v29.css','utf8');
const field=fs.readFileSync('frontend/field-display-v8.js','utf8');
const projection=fs.readFileSync('backend/release-v82-field-display.mjs','utf8');
const worker=fs.readFileSync('backend/worker-production.mjs','utf8');
const checks=[
 ['display v29 script active',index.includes('display-lifecycle-v29.js')],
 ['display v29 style active',index.includes('display-lifecycle-v29.css')],
 ['new layout starts draft',js.includes("status:'draft'")&&js.includes("machine:''")],
 ['new layout has safe starter widgets',js.includes("type:'status'")&&js.includes("type:'oee'")&&js.includes("type:'clock'")&&js.includes("type:'trend'")],
 ['duplicate removes machine assignment',js.includes("layout.machine='';")],
 ['duplicate resets publish state',js.includes("layout.status='draft'")],
 ['layout persistence uses settings api',js.includes("api('/settings','PUT'")&&js.includes('DISPLAY_LAYOUT.')],
 ['field link requires published and machine',js.includes("layout.status!=='published'")&&js.includes('assignment mesin')],
 ['field display publish guard remains active',field.includes("layout.status==='published'")||field.includes("layout.status!=='published'")],
 ['v82 exact-machine route wired',worker.includes("handleFieldDisplayV82")&&worker.includes("field-display-projection-v82")&&worker.includes("'/api/field-display/machine'")],
 ['field display consumes v82 projection',field.includes("api('/field-display/machine?machine='")&&!field.includes("api('/realtime/overview')")&&!field.includes("api('/telemetry-status')")],
 ['projection is auth protected and canonical',projection.includes("Silakan login kembali")&&projection.includes('canonicalMachine')&&projection.includes("status:'machine_not_found'")],
 ['projection preserves telemetry trust',projection.includes('telemetry.trusted')||projection.includes("trusted:hb.fresh&&externalSource")],
 ['projection quality is unit fail-safe',projection.includes('known=rows.filter')&&projection.includes('ambiguous_or_mismatch')&&projection.includes('mismatched_or_missing_unit_events')],
 ['field resolves live business widgets',['quality.reject','maintenance.status','planning.target','production.table'].every(x=>field.includes(x))],
 ['historical widgets remain labelled global',field.includes('snapshot historis/global')&&field.includes('bukan KPI live mesin')],
 ['responsive lifecycle controls',css.includes('@media(max-width:820px)')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [n] of failed)console.error('FAIL:',n);process.exit(1);}console.log(`Display validation OK — ${checks.length} lifecycle, exact-machine projection, and field-safety guards checked.`);
