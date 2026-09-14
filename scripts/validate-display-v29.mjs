import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const js=fs.readFileSync('frontend/display-lifecycle-v29.js','utf8');
const css=fs.readFileSync('frontend/display-lifecycle-v29.css','utf8');
const field=fs.readFileSync('frontend/field-display-v8.js','utf8');
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
 ['responsive lifecycle controls',css.includes('@media(max-width:820px)')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [n] of failed)console.error('FAIL:',n);process.exit(1);}console.log(`Display v29 validation OK — ${checks.length} layout lifecycle and field-safety guards checked.`);
