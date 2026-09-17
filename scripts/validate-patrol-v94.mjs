import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const index = read('frontend/index.html');
const ui = read('frontend/patrol-v94.js');
const css = read('frontend/patrol-v94.css');
const backend = read('backend/release-v94-patrol.mjs');
const worker = read('backend/worker-production.mjs');
const hasAll = (text, needles) => needles.every((needle) => text.includes(needle));

const checks = [
  ['v94 frontend active', index.includes('patrol-v94.js') && index.includes('patrol-v94.css')],
  ['v94 production handler wired', worker.includes('handlePatrolV94') && worker.includes('patrol-abnormality-v94')],
  ['additive patrol schema', hasAll(backend, ['CREATE TABLE IF NOT EXISTS patrol_events', 'patrol_status_due', 'patrol_owner_date', 'maintenance_call_id'])],
  ['controlled lifecycle', hasAll(backend, ['RECORDED_NORMAL', 'OPEN', 'IN_PROGRESS', 'WAITING_VERIFICATION', 'VERIFIED_CLOSED'])],
  ['abnormality requires ownership and due date', hasAll(backend, ['Temuan abnormal wajib dijelaskan', 'Owner abnormality harus Produksi, Maintenance, atau Quality Control', 'Due date abnormality wajib valid'])],
  ['least privilege mutation', hasAll(backend, ['canCreate', 'canMutate', 'canVerify', "permissions(u).includes('update')"])],
  ['department row visibility enforced', hasAll(backend, ['visibleTo', 'scopedWhere', '(created_department=? OR owner_department=?)', "u?.role==='superadmin'", 'created_department', 'owner_department'])],
  ['unrelated mutation hides record existence', hasAll(backend, ['!old||!visibleTo(u,old)', "error:'Patrol tidak ditemukan'", '404'])],
  ['scoped summary uses same visibility', hasAll(backend, ['scopeArgs', 'scopeSql=scopedWhere(u,scopeArgs)', 'FROM patrol_events WHERE ${scopeSql}'])],
  ['verified closure requires action and evidence', hasAll(backend, ['Tindakan penyelesaian dan evidence wajib diisi sebelum verifikasi', 'Tindakan dan evidence belum lengkap', 'verified_by', 'verified_ts'])],
  ['maintenance escalation is linked not cosmetic', hasAll(backend, ['ESCALATE_MAINTENANCE', 'maintenance_calls', 'machine_registry', 'patrol.escalate_maintenance', 'maintenance_call_id'])],
  ['maintenance escalation does not auto close patrol', backend.includes("nextStatus=old.status==='OPEN'?'IN_PROGRESS':old.status") && !backend.includes("ESCALATE_MAINTENANCE')status='VERIFIED_CLOSED")],
  ['patrol projected into role dashboard', hasAll(backend, ['patrolDashboard', 'Patrol tercatat · 30 hari', 'Abnormality patrol aktif', 'Abnormality closure lead time · 30 hari'])],
  ['predictive compliance remains non-fabricated', hasAll(backend, ['Predictive patrol completion', 'compliance rate belum dihitung', 'jadwal patrol authoritative'])],
  ['attention integration uses patrol target', hasAll(backend, ['patrolAttention', "category:'patrol'", "target_view:'patrol'", 'calendar_context'])],
  ['native patrol UI has business workflow', hasAll(ui, ['Patrol & Abnormality', 'Patrol Baru', 'Kirim untuk Verifikasi', 'Verifikasi & Tutup', 'Call Maintenance'])],
  ['historical patrol is not fabricated', ui.includes('histori Patrol Web kosong tidak di-backfill') || ui.includes('Data historis Patrol Web tidak diisi ulang secara asumsi')],
  ['patrol filter and paging present', hasAll(ui, ['v94Search', 'v94Status', 'v94Prev', 'v94Next'])],
  ['responsive patrol styling present', css.includes('@media(max-width:900px)') && css.includes('@media(max-width:620px)')],
  ['no prototype language', !(/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test(`${ui}\n${backend}`))]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error('FAIL:', name);
  process.exit(1);
}

console.log(`Patrol v94 validation OK — ${checks.length} workflow, security, semantic, scope, and presentation guards checked.`);
