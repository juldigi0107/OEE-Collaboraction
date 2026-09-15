import fs from 'node:fs';
import path from 'node:path';
import './validate-client-resilience-v86.mjs';

const root=path.resolve('frontend');
const indexPath=path.join(root,'index.html');
const errors=[];
const checked=new Set();
const entryFiles=new Set();

function cleanRel(rel){return String(rel).split('#')[0].split('?')[0].replace(/^\.\//,'');}
function requireFile(rel,source){
  const clean=cleanRel(rel);
  if(!clean||/^(?:https?:|data:|mailto:|tel:)/i.test(clean))return;
  const full=path.resolve(root,clean);
  if(!full.startsWith(root+path.sep)&&full!==root){errors.push(`Path keluar frontend: ${rel} (${source})`);return;}
  const key=path.relative(root,full);
  if(checked.has(key))return;
  checked.add(key);
  if(!fs.existsSync(full)||!fs.statSync(full).isFile())errors.push(`File tidak ditemukan: ${key} (dirujuk dari ${source})`);
}
function validateRaster(rel,{minBytes=4096}={}){
  const clean=cleanRel(rel),full=path.resolve(root,clean);
  if(!fs.existsSync(full)||!fs.statSync(full).isFile()){errors.push(`Aset visual release tidak ditemukan: ${clean}`);return;}
  const b=fs.readFileSync(full),ext=path.extname(clean).toLowerCase();
  if(b.length<minBytes)errors.push(`Aset visual terlalu kecil/terpotong: ${clean} (${b.length} bytes)`);
  let valid=true;
  if(ext==='.jpg'||ext==='.jpeg')valid=b.length>=4&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff&&b.at(-2)===0xff&&b.at(-1)===0xd9;
  else if(ext==='.webp')valid=b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'&&b.readUInt32LE(4)+8===b.length;
  else if(ext==='.png')valid=b.length>=8&&b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if(!valid)errors.push(`Signature/struktur aset visual tidak valid: ${clean}`);
}

let html='';
if(!fs.existsSync(indexPath))errors.push('frontend/index.html tidak ditemukan');
else{
  html=fs.readFileSync(indexPath,'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    const rel=cleanRel(m[1]);
    requireFile(rel,'index.html');
    if(/\.(?:css|js)$/i.test(rel))entryFiles.add(rel);
  }
  for(const required of ['workspace.css','visual-v4.css','display-editor-v5.css','runtime-polish-v6.css','role-ux-v7.css','field-display-v8.css','experience-v64.css','reference-release-v85.css','app-core.js','visual-v4.js','display-editor-v5.js','runtime-polish-v6.js','role-ux-v7.js','field-display-v8.js','experience-v64.js','reference-release-v85.js']){
    if(!html.includes(required))errors.push(`index.html belum memuat ${required}`);
  }
}

/* Hanya scan bundle yang benar-benar dimuat index.html. File legacy yang tidak aktif
   tidak boleh memblokir produksi, tetapi akan kembali diperiksa otomatis jika kelak dimuat. */
for(const rel of entryFiles){
  const full=path.join(root,rel);
  if(!fs.existsSync(full))continue;
  const content=fs.readFileSync(full,'utf8');
  for(const m of content.matchAll(/assets\/[A-Za-z0-9._/-]+/g))requireFile(m[0],rel);
}

/* Raster utama harus benar-benar image yang dapat didekode, bukan file teks/truncated
   yang kebetulan memakai ekstensi .jpg/.webp. */
for(const rel of [
  'assets/hero-bmj-photo.jpg',
  'assets/department-production.webp',
  'assets/department-quality.webp',
  'assets/department-maintenance.webp',
  'assets/department-planning.webp',
  'assets/department-development.webp'
])validateRaster(rel);

/* Experience v64 is a release requirement, not an optional skin. */
const experiencePath=path.join(root,'experience-v64.js'),experienceCssPath=path.join(root,'experience-v64.css');
if(!fs.existsSync(experiencePath))errors.push('experience-v64.js tidak ditemukan');
else{
  const experience=fs.readFileSync(experiencePath,'utf8');
  const guards=[
    ['operational briefing','Kinerja yang jelas.'],
    ['department hub','Department Hub'],
    ['compact sidebar route',"dataset.view='departments'"],
    ['role-aware context','role-dashboard?department='],
    ['data integrity disclosure','Data integrity & source attention'],
    ['source-preserving zero policy','nilai kosong/error tidak dipaksa menjadi nol']
  ];
  for(const [name,marker] of guards)if(!experience.includes(marker))errors.push(`Experience v64 guard hilang: ${name}`);
}
if(!fs.existsSync(experienceCssPath))errors.push('experience-v64.css tidak ditemukan');
else{
  const experienceCss=fs.readFileSync(experienceCssPath,'utf8');
  for(const marker of ['.briefing-hero','.process-strip','.department-hub-v64','.sidebar-backdrop','prefers-reduced-motion'])if(!experienceCss.includes(marker))errors.push(`Experience v64 style guard hilang: ${marker}`);
}

/* v85 adalah presentation authority yang harus selalu aktif pada public release. */
const referenceJs=path.join(root,'reference-release-v85.js'),referenceCss=path.join(root,'reference-release-v85.css');
if(!fs.existsSync(referenceJs))errors.push('reference-release-v85.js tidak ditemukan');
else{
  const reference=fs.readFileSync(referenceJs,'utf8');
  const guards=[
    ['dashboard acuan','Dashboard Utama'],
    ['workspace acuan','Workspace Department'],
    ['visual Development khusus','department-development.webp'],
    ['empty state monitoring jujur','Belum ada mesin terhubung'],
    ['username-only remember me','oee-remembered-username'],
    ['mobile navigation accessibility',"setAttribute('aria-label','Tutup menu')"]
  ];
  for(const [name,marker] of guards)if(!reference.includes(marker))errors.push(`Reference release v85 guard hilang: ${name}`);
}
if(!fs.existsSync(referenceCss))errors.push('reference-release-v85.css tidak ditemukan');
else{
  const reference=fs.readFileSync(referenceCss,'utf8');
  for(const marker of ['.ref-hero','.ref-kpis','.ref-depts','.ref-machine-empty','@media(max-width:820px)'])if(!reference.includes(marker))errors.push(`Reference release v85 style guard hilang: ${marker}`);
}

/* v32 interpretation semantics live inside the already-active operational runtime. */
const runtimePath=path.join(root,'operational-control-runtime-v31.js');
if(!fs.existsSync(runtimePath))errors.push('operational-control-runtime-v31.js tidak ditemukan');
else{
  const runtime=fs.readFileSync(runtimePath,'utf8');
  const guards=[
    ['source authority context','Source authority belum disahkan'],
    ['PPIC reversal context','reversal candidate'],
    ['QC multi-unit context','Multi-unit terdeteksi'],
    ['period policy','Periode mengikuti tanggal transaksi']
  ];
  for(const [name,marker] of guards)if(!runtime.includes(marker))errors.push(`Data Context v32 guard hilang: ${name}`);
}

/* Public release flows must use application dialogs, not browser-native prompt/confirm. */
const release11Path=path.join(root,'release-v11.js'),release23Path=path.join(root,'release-polish-v23.js');
if(!fs.existsSync(release11Path))errors.push('release-v11.js tidak ditemukan');
else{
  const release11=fs.readFileSync(release11Path,'utf8');
  if(!release11.includes('closeDowntimeDialog')||!release11.includes('closeDowntimeForm'))errors.push('End Downtime belum memakai dialog aplikasi release');
}
if(!fs.existsSync(release23Path))errors.push('release-polish-v23.js tidak ditemukan');
else{
  const release23=fs.readFileSync(release23Path,'utf8');
  if(!release23.includes('archiveRowDialog')||!release23.includes('rp23DeleteConfirm'))errors.push('Archive delete belum memakai dialog aplikasi release');
}

if(errors.length){
  console.error('\nFrontend asset validation FAILED');
  for(const e of errors)console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Frontend asset validation OK — ${checked.size} active files/references checked + raster signatures + release UX/data guards.`);
