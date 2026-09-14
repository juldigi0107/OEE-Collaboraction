# OEE Collaboraction — Release Governance & Go-Live Runbook

## Tujuan
Dokumen ini menjadi kontrol rilis untuk memastikan software yang lolos CI tidak otomatis dianggap siap operasional lapangan. Status aplikasi dibagi menjadi software verification, data governance, operational UAT, infrastructure/integration readiness, dan final sign-off.

## 1. Software verification
Sebelum UAT dimulai, seluruh gate berikut harus hijau: frontend JavaScript syntax, asset integrity, navigation coverage, login/session flow, role UX, backend authorization, Worker module syntax, production health, D1 readiness, production frontend smoke, field-display publish guard, release workflow smoke, dan protected endpoint check.

## 2. Data Governance — wajib sebelum KPI resmi
Lima baseline disimpan sebagai settings D1 dan tidak boleh dianggap disahkan hanya karena template tersedia:

1. `DATA_GOVERNANCE.kpi_definitions` — definisi Quality Printing/NC, unit FG, ideal speed basis, MTBF, MTTR, utilization.
2. `DATA_GOVERNANCE.machine_aliases` — canonical machine code dan alias lintas planning/HMI/edge/report.
3. `DATA_GOVERNANCE.shift_calendar` — model group, jam Shift 1/2/3, workday cutoff, aturan tanggal kerja.
4. `DATA_GOVERNANCE.source_authority` — authoritative source per domain Production, QC, Maintenance, PPIC, PDS, dan Master/Project.
5. `DATA_GOVERNANCE.join_grain` — field grain lintas domain, transaction key, dan aturan deduplikasi.

Semua baseline berstatus `approved=false` sampai pemilik proses menyetujui. Aplikasi tidak boleh menebak keputusan bisnis yang belum disahkan.

## 3. Rekonsiliasi sumber sebelum sign-off data
Minimum rekonsiliasi mencakup: perlakuan NC pada Quality Printing; 363 pengulangan Reject ID; 99 signed-negative PPIC yang harus dinilai sebagai reversal/correction; pemilihan versi MTC Ori vs Verifikasi; formula sumber yang nyata error; periode/template lama yang tidak boleh masuk KPI aktif; dan validasi satuan agar sheet/pcs/kg/menit/rupiah tidak dijumlahkan lintas grain.

Raw source, pivot, summary, `records`, dan transaksi operasional `entries` tetap memiliki grain berbeda. Rekonsiliasi tidak boleh dilakukan dengan menghapus record berdasarkan PRO atau ID tunggal saja.

## 4. UAT role & authorization
Uji minimal dilakukan dengan akun nyata untuk Superadmin, Admin PROD, Admin QC, Admin MTC, Admin PPIC, Admin PDS, Admin PROJECT, dan Viewer. Untuk tiap role verifikasi login/logout, visibility menu, create/update/delete/config sesuai grant, larangan mutasi lintas department, read-only Viewer, first-password-change, session invalidation setelah perubahan password/akun, dan protected API tanpa token.

Evidence UAT harus menyebut tanggal, tester, akun/role, skenario, hasil, dan referensi screenshot/log bila tersedia. Password/token/secret tidak boleh dimasukkan ke evidence.

## 5. UAT browser & device
Minimum coverage: Chrome desktop, Edge desktop, iOS Safari, Android Chrome, dan kiosk/TV target. Verifikasi login/splash, dashboard, table panjang, search/filter, dialog, CRUD, HMI, Approval & Verifikasi, display mesin, responsive layout, orientation, scroll-to-top, error/empty/loading state, serta tidak adanya error console yang memutus flow utama.

## 6. Shopfloor/HMI UAT
Skenario minimum: PPIC membuat planning; planning diubah menjadi `Released`; Production hanya dapat Start dari planning Released; checklist pre-start wajib; Start PRO; quality event; PDT/UPDT/COJ; UPDT escalation; call/ack/close Maintenance; root cause wajib sebelum downtime close; Finish PRO ditolak jika downtime masih terbuka; Finish PRO membuat verification request; approver approve/reject; reject wajib alasan; dan display mesin tidak boleh mengambil stream mesin lain.

## 7. Field display
Setiap display harus memiliki layout published, machine assignment exact, resolusi target, koneksi/heartbeat yang diverifikasi, offline state yang aman, dan URL/display ID terdokumentasi. Draft tidak boleh ditampilkan sebagai production screen.

## 8. Infrastructure & hardware readiness
Item yang harus diverifikasi di lapangan: PC/client, LAN, power/UPS, TV/mini-PC, barcode scanner, panel HMI, installation window, PIC lapangan, jalur browser/kiosk, serta kebijakan auto-start/reload setelah listrik atau network interruption.

Status `Belum diverifikasi` lebih benar daripada menandai `Siap` tanpa evidence.

## 9. Integrasi
Machine Edge/PLC, ODIN, SAP, Qlik, barcode hardware atau sistem lain hanya boleh berstatus live setelah endpoint, credential melalui Worker Secret, mapping, test connection/sync, dan evidence transaksi berhasil tersedia. Credential tidak disimpan di frontend atau settings D1.

Jika integrasi belum tersedia, UI harus menunjukkan nonaktif/menunggu verifikasi dan tidak membuat data realtime fiktif.

## 10. Backup, restore, rollback
Sebelum final go-live lakukan backup/export D1 sesuai prosedur operasional yang disetujui, rehearsal restore pada lingkungan aman, catat commit release/rollback GitHub, verifikasi audit retention, dan dokumentasikan siapa yang berwenang menjalankan rollback. Restore test tidak boleh menimpa database production tanpa change approval.

## 11. Release decision
Software dapat diberi status `Production Ready` bila CI, deployment, security, dan production smoke hijau. Status `Operational Go-Live Approved` hanya diberikan bila Data Governance, UAT role/device/shopfloor/display, reconciliation, recovery, infrastructure/integration readiness yang applicable, dan final owner sign-off telah lulus.

Dependency eksternal yang belum disediakan tidak dianggap defect software, tetapi tetap menjadi blocker operational sign-off bila requirement tersebut applicable.

## 12. Final sign-off record
Catat minimal Software Owner, Production Owner, Quality Owner, Maintenance Owner, PPIC Owner, Digitalization/IT Owner, Management Approver, target/actual go-live date, open blocker, keputusan Go/No-Go, commit release, Worker endpoint, frontend endpoint, database binding, serta rollback reference.

Tidak boleh mengubah status `Belum diuji` menjadi `Lulus` tanpa pengujian/evidence aktual.
