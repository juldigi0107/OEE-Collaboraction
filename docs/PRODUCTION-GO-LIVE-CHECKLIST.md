# OEE Collaboraction — Production Go-Live Checklist

Dokumen ini memisahkan **software release readiness** dari **operational go-live readiness**. Checklist ini tidak menggantikan UAT/evidence di aplikasi dan tidak boleh digunakan untuk mengubah status perangkat/integrasi menjadi hijau tanpa verifikasi nyata.

## 1. Software release gate

- [ ] `Validate OEE Collaboraction` lulus pada commit yang akan dirilis.
- [ ] `Validate Release Hardening v89` lulus pada commit yang akan dirilis.
- [ ] Cloudflare Worker deploy lulus dan `/api/version` menunjukkan build release yang diharapkan.
- [ ] `/api/readiness` mengembalikan `ready: true` dan schema siap.
- [ ] Production protected-endpoint smoke check lulus.
- [ ] Production frontend smoke check lulus untuk asset aktif BMJ.
- [ ] Workflow Health, Source Mirror, Shopfloor Invariants, Work Calendar, D1 Capacity, dan Telemetry tidak memiliki blocker aktif.

## 2. GitHub release governance — external control

Repository production sebaiknya tidak mengandalkan direct push tanpa required checks.

- [ ] Aktifkan Branch Protection / Ruleset untuk `main`.
- [ ] Require pull request sebelum merge untuk perubahan production bila workflow organisasi mengizinkan.
- [ ] Require status check `Validate OEE Collaboraction`.
- [ ] Require status check `Validate Release Hardening v89`.
- [ ] Batasi force-push dan branch deletion pada `main`.
- [ ] Pastikan deployment production hanya dilakukan dari revision yang status check-nya lulus.
- [ ] Review akses collaborator dan hak write/admin secara berkala.

> Catatan: pengaturan Branch Protection/Ruleset adalah kontrol GitHub repository dan tidak dapat dinyatakan selesai hanya dari source code aplikasi.

## 3. Cloudflare production governance

- [ ] GitHub secret `CLOUDFLARE_API_TOKEN` tersedia dan tidak pernah disimpan di source/frontend.
- [ ] Token dibatasi pada account/resource dan permission minimum yang diperlukan untuk Worker/D1 deployment.
- [ ] D1 binding mengarah ke database production yang benar.
- [ ] Arsitektur tetap D1-only sesuai deployment saat ini; R2 tidak diasumsikan tersedia.
- [ ] Backup/restore procedure D1 telah diuji dengan evidence; release manifest bukan database backup.
- [ ] Rollback procedure diuji sebelum final sign-off.

## 4. Data Governance

Semua baseline berikut harus disahkan melalui aplikasi, bukan dengan mengedit database langsung:

- [ ] Definisi KPI & satuan resmi.
- [ ] Canonical machine & aliases.
- [ ] Kalender shift / work-date authority.
- [ ] Source authority per domain.
- [ ] Join grain / transaction key / deduplication rule.

Khusus OEE, pastikan definisi Quality Printing (`Good / Total` atau `(Good + NC) / Total`) dan FG Unit sudah disahkan sebelum angka disebut authoritative.

## 5. Operational Control

- [ ] Cycle Target / ideal speed per canonical machine dan material/process scope disahkan.
- [ ] Klasifikasi PDT / UPDT / COJ disahkan per reason code.
- [ ] Machine Trigger memakai tag/path aktual dan machine scope yang benar.
- [ ] Field Ownership mempunyai owner, approver, source of truth, dan refresh SLA.
- [ ] Delivery Plan mempunyai release owner, target go-live, due date, evidence closure, dan tidak menyisakan open action saat dikunci.

Jangan mengisi target speed, cycle time, PLC tag, owner, atau due date dengan nilai asumsi hanya untuk membuat gate hijau.

## 6. Perangkat dan infrastruktur lapangan

Verifikasi di lokasi dengan evidence aktual:

- [ ] PC/HMI operator tersedia dan browser yang dipakai lulus UAT.
- [ ] LAN/Wi-Fi operasional stabil pada lokasi mesin.
- [ ] Power/UPS sesuai kebutuhan instalasi.
- [ ] Barcode scanner diuji pada workflow Planning/PRO yang nyata.
- [ ] TV/monitor/mini-PC field display diuji pada resolusi sebenarnya.
- [ ] Layout display yang digunakan berstatus `Published` dan ter-assign ke machine yang benar.
- [ ] Heartbeat mesin berasal dari source external yang tervalidasi untuk PRO aktif.

## 7. Integrasi eksternal

Untuk setiap integrasi MACHINE/PLC, ODIN, SAP, Qlik atau sistem lain:

- [ ] Endpoint/base URL telah diverifikasi oleh owner sistem.
- [ ] Credential disimpan pada Worker Secrets, bukan frontend/settings biasa.
- [ ] Mapping field diuji dengan payload aktual.
- [ ] Machine identity dipetakan ke canonical machine.
- [ ] Error/retry behaviour diuji.
- [ ] Timestamp/timezone dan work-date semantics diverifikasi.
- [ ] Last sync/status pada aplikasi sesuai kondisi nyata.

Status `Nonaktif`, `Menunggu verifikasi`, atau `Error` tidak boleh diubah menjadi `Terhubung` hanya untuk menyelesaikan UAT.

## 8. UAT & operational sign-off

Gate berikut harus `passed` atau `not_applicable` dengan PIC dan evidence/alasan:

- [ ] Role & hak akses.
- [ ] Browser & perangkat.
- [ ] Rekonsiliasi data.
- [ ] Display mesin.
- [ ] Backup, restore & rollback.
- [ ] Integrasi & hardware.
- [ ] Final go-live sign-off.

Backend juga memverifikasi runtime consistency ketika Final Sign-off disimpan. Jika workflow/mirror/invariants/calendar/storage/telemetry tidak memenuhi syarat, sign-off harus tetap ditolak.

## 9. Cutover

Sebelum cutover:

- [ ] Tidak ada downtime/maintenance/approval kritis yang belum dikomunikasikan.
- [ ] Snapshot/backup yang disetujui tersedia.
- [ ] Release owner dan owner department mengetahui window deployment.
- [ ] Rollback decision owner jelas.
- [ ] Production URL yang dipakai adalah URL Worker resmi.

Sesudah cutover:

- [ ] Login Superadmin, Admin Department, dan Viewer diverifikasi.
- [ ] Dashboard, Workspace, Data Sumber, Monitoring Realtime, HMI, Approval, Konfigurasi, dan field display diuji.
- [ ] Session expiry/offline recovery diuji.
- [ ] KPI authority badge dan source-period label benar.
- [ ] Support & Recovery manifest dapat dibuat tanpa membocorkan credential.
- [ ] Audit Log merekam aktivitas perubahan penting.

## 10. Release decision

Gunakan tiga status berbeda:

- **Software Ready** — code, CI, Worker, D1 dan security/runtime smoke checks lulus.
- **Operational Ready** — Data Governance, Operational Control, UAT, runtime health dan Delivery Plan lulus di aplikasi.
- **Go-Live Approved** — seluruh external control, perangkat, integrasi, evidence lapangan, change approval dan owner sign-off telah selesai.

Jangan menyamakan salah satu status di atas dengan status lainnya.
