import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const v23=read('frontend/release-polish-v23.js');
const css=read('frontend/release-polish-v23.css');
const dash=read('frontend/role-dashboard-v12.js');
const support=read('frontend/support-recovery-v21.js');
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
 ['responsive v23 styling present',css.includes('@media(max-width:680px)')&&css.includes('.rp23-field')]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Release polish v23 validation OK — ${checks.length} UX/data-safety guards checked.`);
