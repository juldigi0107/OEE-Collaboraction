import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const js=fs.readFileSync('frontend/settings-polish-v27.js','utf8');
const css=fs.readFileSync('frontend/settings-polish-v27.css','utf8');
const role=fs.readFileSync('frontend/role-ux-v7.js','utf8');
const checks=[
 ['settings v27 script active',index.includes('settings-polish-v27.js')],
 ['settings v27 style active',index.includes('settings-polish-v27.css')],
 ['typed editor modes',js.includes("value=\"text\"")&&js.includes("value=\"number\"")&&js.includes("value=\"boolean\"")&&js.includes("value=\"json\"")],
 ['admin department locked',js.includes('type="hidden" name="department"')&&js.includes('Scope konfigurasi dikunci ke department')],
 ['reserved configuration redirected',js.includes('DATA_GOVERNANCE.')&&js.includes('UAT_RELEASE.')&&js.includes('RELEASE_READINESS.')&&js.includes('DISPLAY_LAYOUT.')],
 ['generic settings still use backend api',js.includes("api('/settings','PUT'")&&js.includes("catalog=await api('/catalog')")],
 ['json advanced only for superadmin',js.includes("isSuper?'<option value=\"json\">JSON lanjutan</option>':''")],
 ['business-facing shortcuts',js.includes('Definisi Data & KPI')&&js.includes('UAT & Go-Live')&&js.includes('Tata Kelola & Readiness')],
 ['role scope guard remains active',role.includes('scopeConfigDepartment')&&role.includes("user?.role!=='admin'")],
 ['mobile settings polish',css.includes('@media(max-width:720px)')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [n] of failed)console.error('FAIL:',n);process.exit(1);}console.log(`Settings v27 validation OK — ${checks.length} typed-editor and role-scope guards checked.`);
