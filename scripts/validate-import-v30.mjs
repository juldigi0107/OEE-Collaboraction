import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const js=fs.readFileSync('frontend/import-center-v30.js','utf8');
const css=fs.readFileSync('frontend/import-center-v30.css','utf8');
const backend=fs.readFileSync('backend/worker-v6.mjs','utf8');
const checks=[
 ['import v30 script active',index.includes('import-center-v30.js')],
 ['import v30 style active',index.includes('import-center-v30.css')],
 ['superadmin only ui',js.includes("user?.role!=='superadmin'")&&js.includes('Khusus Superadmin')],
 ['local validation precedes import',js.indexOf('stageFiles(files)')>=0&&js.indexOf("api('/import-data','POST'")>js.indexOf('stageFiles(files)')],
 ['backend whitelist mirrored',Object.keys({sources:1,sheets:1,documents:1,record_chunks:1,entries:1,source_files:1,source_file_chunks:1,asset_catalog:1}).every(k=>js.includes(k+':'))],
 ['20 row batch guard',js.includes('rows.length>20')],
 ['450 KB guard',js.includes('size>450000')],
 ['base64 chunk preflight',js.includes('validB64')&&js.includes('bukan payload base64 yang valid')],
 ['explicit confirmation before run',js.includes('ic30Confirm')&&js.includes('Saya sudah memeriksa ringkasan paket')],
 ['idempotent result presentation',js.includes('Sudah ada / dilewati')&&js.includes('data existing tidak dihapus atau ditimpa')],
 ['backend still insert-or-ignore',backend.includes('INSERT OR IGNORE INTO ${b.table}')],
 ['backend superadmin guard',backend.includes("user.role!=='superadmin'")&&backend.includes("p==='/api/import-data'")],
 ['responsive import center',css.includes('@media(max-width:900px)')&&css.includes('@media(max-width:560px)')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [n] of failed)console.error('FAIL:',n);process.exit(1);}console.log(`Import v30 validation OK — ${checks.length} staging, validation, and idempotency guards checked.`);
