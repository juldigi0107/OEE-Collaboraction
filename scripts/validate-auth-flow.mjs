import fs from 'node:fs';

const workspace=fs.readFileSync('frontend/workspace.js','utf8');
const core=fs.readFileSync('frontend/app-core.js','utf8');
const worker=fs.readFileSync('backend/worker.mjs','utf8');
const errors=[];
const need=(ok,msg)=>{if(!ok)errors.push(msg);};

need(workspace.includes('e.preventDefault()'),'Login form belum mencegah submit browser default.');
need(workspace.includes("api('/login','POST'"),'Login frontend tidak memakai POST API.');
need(workspace.includes('type="password"'),'Password input bukan type=password.');
need(workspace.includes('autocomplete="username"'),'Username autocomplete semantic hilang.');
need(workspace.includes('autocomplete="current-password"'),'Password autocomplete semantic hilang.');
need(workspace.includes("sessionStorage.setItem('oee-token'"),'Session token tidak disimpan di sessionStorage.');
need(workspace.includes("sessionStorage.removeItem('oee-token'"),'Logout tidak membersihkan sessionStorage.');
need(!workspace.includes("localStorage.setItem('oee-token'"),'Session token tidak boleh disimpan permanen di localStorage.');
need(!workspace.includes('location.search')&&!workspace.includes('URLSearchParams'),'Login frontend tidak boleh menaruh credential/token pada query URL.');
need(workspace.includes("api('/logout','POST'"),'Logout frontend tidak memakai POST API.');
need(core.includes("sessionStorage.getItem('oee-token')"),'Startup tidak memulihkan token dari sessionStorage.');

need(worker.includes("path==='/api/login'&&method==='POST'"),'Backend login POST hilang.');
need(worker.includes("path==='/api/logout'&&method==='POST'"),'Backend logout POST hilang.');
need(worker.includes("await hash(token)"),'Session token backend tidak di-hash sebelum lookup/penyimpanan.');
need(worker.includes('login_attempts'),'Rate-limit/brute-force login guard hilang.');
need(worker.includes('must_change_password'),'First-login password change flag hilang.');
need(worker.includes("path==='/api/password'&&method==='PUT'"),'Endpoint ganti password hilang.');
need(worker.includes('DELETE FROM sessions WHERE user_id=?'),'Perubahan password/user tidak menginvalidasi sesi lama.');

if(errors.length){
  console.error('Auth flow validation FAILED');
  for(const e of errors)console.error('- '+e);
  process.exit(1);
}
console.log('Auth flow validation OK — POST login/logout, session-only token, hashed sessions, rate limit, dan password rotation guards checked.');
