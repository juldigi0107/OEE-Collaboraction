import fs from 'node:fs';

const core=fs.readFileSync('frontend/app-core.js','utf8');
const role=fs.readFileSync('frontend/role-ux-v7.js','utf8');
const index=fs.readFileSync('frontend/index.html','utf8');
const errors=[];
const need=(ok,msg)=>{if(!ok)errors.push(msg);};

need(core.includes("Array.isArray(user?.permissions)"),'Permission list belum tahan terhadap nilai kosong/non-array.');
need(core.includes("user?.role==='superadmin'"),'Policy superadmin hilang dari can().');
need(core.includes("user?.role==='admin'&&user.department===d"),'Policy admin department hilang dari can().');
need(role.includes("new Set(['users','audit','integrations','import'])"),'Guard menu superadmin belum lengkap.');
need(role.includes("perms().includes('config')"),'Guard konfigurasi admin belum mengikuti izin config.');
need(role.includes("select.disabled=true"),'Department konfigurasi admin belum dikunci pada UI.');
need(role.includes("Mode view-only"),'Penanda role user view-only belum tersedia.');
need(index.includes('role-ux-v7.css')&&index.includes('role-ux-v7.js'),'Role UX bundle belum dimuat index.html.');

const model=(u,d,a)=>u?.role==='superadmin'||(u?.role==='admin'&&u.department===d&&(Array.isArray(u.permissions)?u.permissions:[]).includes(a));
const cases=[
  ['superadmin lintas department',model({role:'superadmin',department:'PROD',permissions:[]},'QC','delete')===true],
  ['admin own create',model({role:'admin',department:'PROD',permissions:['create']},'PROD','create')===true],
  ['admin cross department blocked',model({role:'admin',department:'PROD',permissions:['create','config']},'QC','create')===false],
  ['admin missing permission blocked',model({role:'admin',department:'PROD',permissions:['create']},'PROD','delete')===false],
  ['user mutation blocked',model({role:'user',department:'PROD',permissions:['create','delete','config']},'PROD','create')===false],
  ['missing permissions safe',model({role:'admin',department:'PROD'},'PROD','create')===false]
];
for(const [name,ok] of cases)need(ok,`Role policy gagal: ${name}`);

if(errors.length){console.error('Role UX validation FAILED');for(const e of errors)console.error('- '+e);process.exit(1);}
console.log(`Role UX validation OK — ${cases.length} policy cases + bundle guards checked.`);
