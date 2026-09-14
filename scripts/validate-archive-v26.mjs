import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const js=fs.readFileSync('frontend/archive-semantic-v26.js','utf8');
const css=fs.readFileSync('frontend/archive-semantic-v26.css','utf8');
const appData=fs.readFileSync('frontend/app-data.js','utf8');
const checks=[
 ['archive v26 script active',index.includes('archive-semantic-v26.js')],
 ['archive v26 style active',index.includes('archive-semantic-v26.css')],
 ['coordinates preserved',js.includes('v26-col-coordinate')&&js.includes('koordinat Excel tetap ditampilkan')],
 ['header inference is conservative',js.includes('ratio<0.6')&&js.includes('unique/labels.length<0.8')&&js.includes('row_num||999)<=15')],
 ['no stored payload mutation',!js.includes("api('/records'")&&!js.includes('payload[')],
 ['source and owner context shown',js.includes('v26-archive-meta')&&js.includes('source?.name')&&js.includes('departments[dept]')],
 ['safe fallback when header uncertain',js.includes('Header bisnis belum dapat disimpulkan secara aman')],
 ['source archive still keeps Excel coordinates',appData.includes('Kolom A, B, C mengikuti koordinat Excel')],
 ['source header row styling present',css.includes('v26-source-header-row')],
 ['mobile archive context present',css.includes('@media(max-width:720px)')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [n] of failed)console.error('FAIL:',n);process.exit(1);}console.log(`Archive v26 validation OK — ${checks.length} presentation and traceability guards checked.`);
