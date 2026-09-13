import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('frontend');
const indexPath=path.join(root,'index.html');
const errors=[];
const checked=new Set();

function requireFile(rel,source){
  const clean=String(rel).split('#')[0].split('?')[0].replace(/^\.\//,'');
  if(!clean||/^(?:https?:|data:|mailto:|tel:)/i.test(clean))return;
  const full=path.resolve(root,clean);
  if(!full.startsWith(root+path.sep)&&full!==root){errors.push(`Path keluar frontend: ${rel} (${source})`);return;}
  const key=path.relative(root,full);
  if(checked.has(key))return;
  checked.add(key);
  if(!fs.existsSync(full)||!fs.statSync(full).isFile())errors.push(`File tidak ditemukan: ${key} (dirujuk dari ${source})`);
}

if(!fs.existsSync(indexPath))errors.push('frontend/index.html tidak ditemukan');
else{
  const html=fs.readFileSync(indexPath,'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))requireFile(m[1],'index.html');
  for(const required of ['workspace.css','visual-v4.css','display-editor-v5.css','runtime-polish-v6.css','app-core.js','visual-v4.js','display-editor-v5.js','runtime-polish-v6.js']){
    if(!html.includes(required))errors.push(`index.html belum memuat ${required}`);
  }
}

for(const name of fs.readdirSync(root)){
  if(!/\.(?:css|js)$/i.test(name))continue;
  const content=fs.readFileSync(path.join(root,name),'utf8');
  for(const m of content.matchAll(/assets\/[A-Za-z0-9._/-]+/g))requireFile(m[0],name);
}

if(errors.length){
  console.error('\nFrontend asset validation FAILED');
  for(const e of errors)console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Frontend asset validation OK — ${checked.size} local files/references checked.`);
