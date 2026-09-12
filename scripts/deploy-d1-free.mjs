// Deploy only to a NEW, empty D1 database. No R2 is used.
import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
if(!process.argv.includes('--new-empty-database')) throw Error('Explicit --new-empty-database required. Existing database is not safe to seed.');
const root=resolve(import.meta.dirname,'..');
const run=args=>{const r=spawnSync('npx',['wrangler',...args],{cwd:root+'/backend',stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)throw Error('Deployment stopped; inspect the failed command before retrying.');};
run(['d1','execute','oee-collaboraction','--remote','--file',root+'/backend/schema.sql']);
for(const f of (await readdir(root+'/data/d1-free/sql')).filter(x=>x.endsWith('.sql')).sort()) run(['d1','execute','oee-collaboraction','--remote','--file',root+'/data/d1-free/sql/'+f]);
console.log('D1-only seed uploaded. Verify /api/health, source counts, archive pages, module counts and original-file downloads.');
