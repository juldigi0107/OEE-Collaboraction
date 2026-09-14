import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const js=fs.readFileSync('frontend/access-governance-v28.js','utf8');
const css=fs.readFileSync('frontend/access-governance-v28.css','utf8');
const governance=fs.readFileSync('frontend/governance-v14.js','utf8');
const checks=[
 ['access v28 script active',index.includes('access-governance-v28.js')],
 ['access v28 style active',index.includes('access-governance-v28.css')],
 ['roles business-facing',js.includes("superadmin:'Superadmin'")&&js.includes("admin:'Admin Department'")&&js.includes("user:'Viewer'"))],
 ['permissions business-facing',js.includes("create:'Tambah data'")&&js.includes("update:'Ubah data'")&&js.includes("delete:'Hapus data'")&&js.includes("config:'Konfigurasi'"))],
 ['viewer remains view only',js.includes("if(u.role==='user')return ['View only']"))],
 ['superadmin route guard',js.includes("user?.role!=='superadmin'")&&js.includes("navigate('dashboard')"))],
 ['filters supported',js.includes('ag28Search')&&js.includes('ag28Role')&&js.includes('ag28Status'))],
 ['account edit reuses secured form',js.includes('userForm(data[')&&governance.includes('userForm=function'))],
 ['inactive state explicit',js.includes("u.active?'Aktif':'Nonaktif'"))],
 ['responsive access table',css.includes('@media(max-width:860px)')&&css.includes('@media(max-width:560px)'))]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [n] of failed)console.error('FAIL:',n);process.exit(1);}console.log(`Access v28 validation OK — ${checks.length} account and permission presentation guards checked.`);
