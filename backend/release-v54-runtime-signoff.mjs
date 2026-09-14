import {workflowHealthV51} from './release-v51-workflow-reconciliation.mjs';
import {mirrorHealthV52} from './release-v52-mirror-reconciliation.mjs';
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))));
const one=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const clean=v=>String(v??'').trim();
const allowedOrigin=(req,env)=>{const origin=req.headers.get('Origin')||'';const allow=String(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);return origin&&allow.includes(origin)?origin:'';};
const out=(req,env,value,status=200)=>{const origin=allowedOrigin(req,env);return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});};
async function auth(req,env){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;return one(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',await sha(token),Date.now());}
export async function handleRuntimeSignoffV54(req,env){
 const url=new URL(req.url);if(req.method!=='PUT'||url.pathname!=='/api/settings')return null;
 let body;try{body=await req.clone().json();}catch{return null;}
 if(clean(body?.key)!=='UAT_RELEASE.signoff')return null;
 const value=typeof body.value==='string'?(()=>{try{return JSON.parse(body.value)}catch{return {}}})():body.value||{};if(clean(value.status)!=='passed')return null;
 const u=await auth(req,env);if(!u||u.role!=='superadmin')return null;
 try{
  const [workflow,mirror]=await Promise.all([workflowHealthV51(env),mirrorHealthV52(env)]);
  const blockers=[];
  if(workflow?.ready!==true)blockers.push(`Workflow: ${Number(workflow?.lineage_mismatches||0)} mismatch, ${Number(workflow?.orphaned_plan_links||0)} orphan plan link`);
  if(mirror?.ready!==true)blockers.push(`Mirror: ${Number(mirror?.missing_mirrors||0)} missing, ${Number(mirror?.stale_mirrors||0)} stale`);
  if(blockers.length)return out(req,env,{error:'Final UAT belum dapat dinyatakan Lulus karena runtime consistency belum hijau',blockers,workflow_health:workflow,mirror_health:mirror},409);
  return null;
 }catch(error){return out(req,env,{error:'Final UAT tidak dapat disahkan karena runtime consistency tidak dapat diverifikasi',detail:clean(error?.message||error)},503);}
}
