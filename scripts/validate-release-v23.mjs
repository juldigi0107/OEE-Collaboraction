import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const v23=read('frontend/release-polish-v23.js');
const css=read('frontend/release-polish-v23.css');
const dash=read('frontend/role-dashboard-v12.js');
const support=read('frontend/support-recovery-v21.js');
const field=read('frontend/field-display-v8.js');
const hmi81=read('frontend/hmi-oee-v81.js');
const back81=read('backend/release-v81-hmi-oee.mjs');
const live49=read('backend/release-v49-live-register.mjs');
const quality44=read('backend/release-v44-quality-unit.mjs');
const worker=read('backend/worker-production.mjs');
const init=read('backend/init-schema.sql');
const realtime=read('backend/realtime-schema.sql');
const checks=[
 ['v23 JavaScript active',index.includes('release-polish-v23.js')],
 ['v23 CSS active',index.includes('release-polish-v23.css')],
 ['empty source archive guarded',v23.includes("departmentMode==='archive'&&!sheets.length")&&v23.includes('Belum ada sheet sumber')],
 ['jpg and webp preview supported',v23.includes("'jpg'")&&v23.includes("'webp'")&&v23.includes('rp23-primary-image')],
 ['native source row editor active',v23.includes('id="rp23RowForm"')&&v23.includes('rp23AddField')&&v23.includes("api('/records','POST'")],
 ['source row editor does not expose JSON',!/JSON nilai|Kolom tambahan \(JSON/i.test(v23)],
 ['source row editor keeps Excel column schema',v23.includes("/^[A-Z]{1,3}$/")&&!v23.includes('__CHANGE_NOTE')],
 ['source row write remains permission guarded',v23.includes("can(dept,'create')")],
 ['archive delete uses application dialog',v23.includes('archiveRowDialog')&&v23.includes('rp23DeleteConfirm')],
 ['dashboard distinguishes historical and live data',dash.includes('Konteks data historis')&&dash.includes('D1 dan event live')&&dash.includes('Tanggal transaksi/tanggal kerja')],
 ['dashboard does not hardcode reporting month',!dash.includes('snapshot workbook Agustus 2026')],
 ['support page uses business-facing labels',support.includes('Dukungan & Pemulihan')&&support.includes('Belum diuji')&&support.includes('Terhubung')&&!support.includes('<span>Support & Recovery</span>')],
 ['responsive v23 styling present',css.includes('@media(max-width:680px)')&&css.includes('.rp23-field')],
 ['field display has no first-machine fallback',field.includes("find(m=>normalize(m.code)===code)||null")&&!field.includes("||(rt?.machines||[])[0]")],
 ['field display uses telemetry authority',field.includes("api('/telemetry-status')")&&field.includes('telemetry_trusted===true')&&field.includes('counter_start_trusted===true')],
 ['field display withholds untrusted counter output',field.includes('Counter ditahan · telemetry/start counter belum authoritative')&&field.includes('Aktual dari counter authoritative')],
 ['field display labels dashboard KPI as historical global',field.includes('Snapshot dashboard historis/global · bukan KPI live mesin')],
 ['HMI OEE v81 frontend active after v80',index.includes('hmi-oee-v81.js')&&index.indexOf('hmi-oee-v81.js')>index.indexOf('oee-governance-v80.js')],
 ['HMI Finish follows governed NC rule',hmi81.includes('NC wajib diisi sesuai Quality rule authoritative')&&hmi81.includes("gov.rule==='good_nc_total'")&&hmi81.includes("api('/shopfloor/finish','POST'")],
 ['backend HMI Finish stores governance snapshot',back81.includes('nc_qty=?')&&back81.includes('quality_rule=?')&&back81.includes('governance_approved=?')&&back81.includes('governance_updated_at=?')],
 ['backend rejects missing NC under authoritative rule',back81.includes("gov.approved&&gov.rule==='good_nc_total'&&!ncProvided")&&back81.includes('Good + NC + Reject tidak boleh melebihi Actual Qty')],
 ['v81 handler wired before runtime invariant fallback',worker.includes('handleHmiOeeV81')&&worker.indexOf('const hmiOeeResponse=await handleHmiOeeV81')<worker.indexOf('const invariantResponse=await handleRuntimeInvariantsV55')],
 ['v81 follow-ups preserve approval lineage and live mirror',worker.includes("settleCritical('hmi-oee-lineage'")&&worker.includes('afterReleaseV11')&&worker.includes('afterLiveRegisterV49')],
 ['production live mirror preserves NC and rule snapshot',live49.includes('nc,')&&live49.includes('hmi_quality_snapshot:true')&&live49.includes('quality_rule_label')],
 ['approval API exposes NC and governed rule',quality44.includes('nc_qty,quality_rule,governance_approved,governance_updated_at')&&quality44.includes('quality_rule_label')&&quality44.includes('classification_complete')],
 ['Good Total approval does not require NC to exist',quality44.includes("rule!=='good_nc_total'||nc!==null")&&quality44.includes('ncForBalance=nc??0')],
 ['production NC schema additive in Worker',worker.includes("addColumnIfMissing(env,'production_runs','nc_qty'")&&worker.includes("addColumnIfMissing(env,'production_runs','quality_rule'")&&worker.includes("addColumnIfMissing(env,'production_runs','governance_approved'")],
 ['fresh schemas include HMI OEE governance fields',[init,realtime].every(s=>s.includes('nc_qty REAL')&&s.includes('quality_rule TEXT')&&s.includes('governance_approved INTEGER NOT NULL DEFAULT 0')&&s.includes('governance_updated_at TEXT'))],
 ['v81 fingerprint exposed',worker.includes('hmi-oee-parity-v81')],
 ['v81 contains no prototype language',!/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test([hmi81,back81,field].join('\n'))]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Release polish, exact-machine display, and HMI OEE parity validation OK — ${checks.length} UX, telemetry, NC, governance-snapshot, approval, mirror, and schema guards checked.`);
