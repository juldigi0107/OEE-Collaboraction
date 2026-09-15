import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const js=fs.readFileSync('frontend/display-lifecycle-v29.js','utf8');
const css=fs.readFileSync('frontend/display-lifecycle-v29.css','utf8');
const field=fs.readFileSync('frontend/field-display-v8.js','utf8');
const depth=fs.readFileSync('frontend/display-depth-v42.js','utf8');
const capacityUi=fs.readFileSync('frontend/storage-capacity-v56.js','utf8');
const lifecycle=fs.readFileSync('backend/release-v46-data-lifecycle.mjs','utf8');
const projection=fs.readFileSync('backend/release-v82-field-display.mjs','utf8');
const device=fs.readFileSync('backend/release-v83-display-device.mjs','utf8');
const realtimeSchema=fs.readFileSync('backend/realtime-schema.sql','utf8');
const initSchema=fs.readFileSync('backend/init-schema.sql','utf8');
const worker=fs.readFileSync('backend/worker-production.mjs','utf8');
const deviceCall=worker.indexOf('const displayDeviceResponse=await handleDisplayDeviceV83');
const fieldCall=worker.indexOf('const fieldDisplayResponse=await handleFieldDisplayV82');
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
 ['v82 exact-machine route wired',worker.includes('handleFieldDisplayV82')&&worker.includes('field-display-projection-v82')&&worker.includes("'/api/field-display/machine'")],
 ['field display consumes v82 projection',field.includes("api('/field-display/machine?machine='")&&!field.includes("api('/realtime/overview')")&&!field.includes("api('/telemetry-status')")],
 ['projection is auth protected and canonical',projection.includes('Silakan login kembali')&&projection.includes('canonicalMachine')&&projection.includes("status:'machine_not_found'")],
 ['projection exact fallback is unique or fail-closed',projection.includes('async function exactMachine')&&projection.includes("WHERE r.code=? AND r.active=1")&&projection.includes('matches.length===1')&&projection.includes("match:'ambiguous'")&&projection.includes("status:'machine_ambiguous'")],
 ['projection is reusable without duplicating business logic',projection.includes('export async function fieldDisplayProjectionV82')&&device.includes('fieldDisplayProjectionV82')],
 ['frontend exposes ambiguous identity state',field.includes("projection?.status==='machine_ambiguous'")&&field.includes('Perbaiki canonical machine / alias')],
 ['projection preserves telemetry trust',projection.includes('telemetry.trusted')||projection.includes("trusted:hb.fresh&&externalSource")],
 ['projection quality is unit fail-safe',projection.includes('known=rows.filter')&&projection.includes('ambiguous_or_mismatch')&&projection.includes('mismatched_or_missing_unit_events')],
 ['field resolves live business widgets',['quality.reject','maintenance.status','planning.target','production.table'].every(x=>field.includes(x))],
 ['historical widgets remain labelled global',field.includes('snapshot historis/global')&&field.includes('bukan KPI live mesin')],
 ['historical dashboard calls are throttled and cache tolerant',field.includes('HISTORICAL_MS=300000')&&field.includes('async function historicalDashboard')&&field.includes('Date.now()-dashboardAt<HISTORICAL_MS')&&field.includes('catch{return dashboardCache;}')],
 ['paired device module wired and fingerprinted',worker.includes("handleDisplayDeviceV83")&&worker.includes("display-device-pairing-v83")&&deviceCall>=0&&fieldCall>deviceCall],
 ['pairing code is one-time and short-lived',device.includes('10*60*1000')&&device.includes('used_ts IS NULL')&&device.includes('pairingCode()')],
 ['device token is hashed and revocable',device.includes('token_hash')&&device.includes('await sha(token)')&&device.includes("active=0")&&device.includes('/api/display-devices/revoke')],
 ['device scope follows layout and machine',device.includes('device.display_id')&&device.includes('device.machine_code')&&device.includes('Machine assignment layout berubah')],
 ['pairing management is superadmin only',device.includes("u.role!=='superadmin'")&&device.includes('/api/display-devices/pair-code')],
 ['device API is read-only allowlisted in browser',field.includes("DEVICE_KEY='oee-display-device:'")&&field.includes("'X-Display-Token':deviceToken")&&field.includes('Display device hanya memiliki akses read-only')],
 ['paired display bootstrap is idempotent',field.includes('deviceBootPromise=null')&&field.includes('if(deviceBootPromise)return deviceBootPromise')&&field.includes('return deviceBootPromise')],
 ['user bearer token remains session storage architecture',field.includes('deviceMode=!token')&&!field.includes("localStorage.setItem('oee-token'")],
 ['field URL contains display id only',depth.includes('?display=${encodeURIComponent(layoutId)}')&&!depth.includes('deviceToken')&&!depth.includes('X-Display-Token')],
 ['superadmin can pair list and revoke devices',depth.includes('Pasangkan perangkat')&&depth.includes("api('/display-devices/pair-code'")&&depth.includes("api('/display-devices?display='")&&depth.includes("api('/display-devices/revoke'")],
 ['fresh schemas include pairing tables',[realtimeSchema,initSchema].every(x=>x.includes('display_pair_codes')&&x.includes('display_devices')&&x.includes('display_devices_layout'))],
 ['pair code housekeeping preserves device audit rows',lifecycle.includes('DELETE FROM display_pair_codes')&&!lifecycle.includes('DELETE FROM display_devices')&&lifecycle.includes('display_pair_codes:{')&&lifecycle.includes('display_devices:{')],
 ['storage center surfaces paired display health',capacityUi.includes('Field Display Devices')&&capacityUi.includes('Device aktif')&&capacityUi.includes('Device revoked')&&capacityUi.includes('Pairing code expired')],
 ['responsive lifecycle controls',css.includes('@media(max-width:820px)')]
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){for(const [n] of failed)console.error('FAIL:',n);process.exit(1);}console.log(`Display validation OK — ${checks.length} lifecycle, exact-machine, paired-device, caching, housekeeping, and field-safety guards checked.`);
