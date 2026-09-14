# OEE Collaboraction — Production Runbook

Dokumen ini adalah panduan operasional untuk deployment, verifikasi, rollback, dan go-live OEE Collaboraction. Jangan menaruh token, password, API key, atau credential enterprise di dokumen/repository.

## 1. Production topology

- Application/API: `https://oee-collaboraction.offsetbmj.workers.dev`
- GitHub Pages: `https://juldigi0107.github.io/OEE-Collaboraction/`
- Worker entrypoint: `backend/worker-production.mjs`
- D1 binding: `DB`
- Storage model: D1-only, tanpa R2
- Build version: `6.2.0`

`/api/version` harus mengembalikan build version, `storage:"D1-only"`, `r2:false`, dan release capability fingerprint.

## 2. Pre-deployment gate

Sebelum deploy production:

1. Pastikan source berada di branch `main` atau PR yang akan masuk `main`.
2. Pastikan tidak ada secret/credential di commit.
3. Pastikan validator source lulus:
   - frontend JavaScript;
   - asset integrity;
   - navigation dan role UX;
   - login/session dan authorization;
   - release blueprint/final guard;
   - Worker module syntax.
4. Jangan mengubah/menghapus D1 table existing sebagai bagian dari frontend change.
5. Untuk perubahan governance, pastikan backward compatibility tetap berlaku ketika baseline belum disahkan.
6. Untuk perubahan Machine/Edge, jangan menyatakan koneksi live tanpa endpoint/heartbeat aktual.

## 3. Deployment Worker

Production deployment dijalankan oleh GitHub Actions `Deploy Cloudflare Worker` menggunakan repository secret `CLOUDFLARE_API_TOKEN`.

Workflow wajib:

1. checkout repository;
2. menjalankan Wrangler deploy;
3. memeriksa `/api/version`;
4. memeriksa release fingerprint;
5. memeriksa `/api/readiness`.

Jangan melakukan deploy dari perangkat lokal dengan token yang disimpan di source code.

## 4. Post-deployment verification

Deployment belum dianggap selesai hanya karena Wrangler sukses. Verifikasi minimal:

- `/api/health` → HTTP 200;
- `/api/version` → version + fingerprint sesuai release;
- `/api/readiness` → `ready:true`, `schema:"ready"`;
- HTML production memuat bundle aktif release;
- logo/hero BMJ tersedia;
- field display hanya menerima layout `published`;
- endpoint terlindungi tanpa session tetap HTTP 401;
- frontend tidak blank ketika department tidak memiliki source sheet;
- dashboard mengambil periode dari source date, bukan nama file;
- HMI tidak memilih Cycle Target bila matching ambigu;
- approved Loss-Time baseline memaksa reason/class/owner yang disahkan.

## 5. Change safety

Hindari deployment/rollback pada saat:

- production run kritis aktif;
- downtime sedang terbuka dan belum mempunyai root cause;
- maintenance call masih dalam penanganan;
- approval penting masih PENDING;
- data import sedang dijalankan;
- owner proses belum diberi tahu untuk perubahan yang memengaruhi baseline.

Gunakan halaman **Dukungan & Pemulihan** untuk melihat open operational items sebelum change.

## 6. D1 backup dan restore

Release Manifest aplikasi **bukan full database backup**.

Sebelum perubahan berisiko:

1. hentikan mutation yang dapat ditunda;
2. catat build/version/fingerprint;
3. ekspor D1 menggunakan prosedur Cloudflare yang disetujui;
4. simpan evidence export di lokasi aman di luar repository publik;
5. catat jumlah row/table penting untuk rekonsiliasi.

Untuk restore:

1. restore ke target aman sesuai prosedur Cloudflare;
2. verifikasi schema/readiness;
3. cocokkan row counts dan sample transaksi;
4. lakukan functional smoke test;
5. baru buka kembali mutation untuk user.

Jangan menimpa production D1 secara buta hanya karena aplikasi frontend bermasalah.

## 7. Rollback software

Jika release frontend/backend menyebabkan regression tetapi D1 tetap sehat:

1. identifikasi commit release terakhir yang diketahui sehat;
2. pastikan rollback tidak mengasumsikan schema yang telah dihapus—release ini memakai additive schema sehingga penghapusan table tidak diperlukan;
3. rollback source melalui proses Git yang dapat diaudit;
4. deploy ulang Worker;
5. verifikasi `/api/version`, fingerprint, readiness, auth, dan smoke checks;
6. catat incident serta keputusan rollback di audit/change record.

Jika masalah melibatkan data, jangan lakukan rollback database tanpa export/evidence dan persetujuan owner proses.

## 8. Operational go-live gate

Software production-ready tidak otomatis berarti lapangan siap.

Operational go-live harus mengikuti dependency chain:

`Data Governance → Operational Baseline → UAT & Go-Live → Delivery Plan / Sign-off`

Evidence minimal mencakup sesuai scope yang tersedia:

- role/permission UAT;
- browser/device UAT;
- data reconciliation;
- field display test;
- backup/recovery test;
- machine/PLC/Edge test bila digunakan;
- barcode scanner test bila digunakan;
- integration test ODIN/SAP/Qlik bila endpoint tersedia;
- PC/LAN/power/UPS/TV/mini-PC readiness bila bagian dari deployment lapangan;
- sign-off owner Production, Quality, Maintenance, PPIC, software owner, dan management sesuai UAT configuration.

Hardware/endpoint yang belum tersedia harus tetap ditandai belum diverifikasi, bukan dianggap lulus.

## 9. Data interpretation rules

- Reporting period mengikuti transaction/work date; timestamp menjadi fallback bila field tanggal bisnis tidak tersedia.
- Nama file tidak boleh digunakan sebagai periode authoritative.
- PPIC signed negative dipertahankan sebagai reversal candidate.
- PRO tidak digunakan sebagai natural key tunggal.
- QC/Reject multi-unit tidak dijumlahkan lintas unit tanpa mapping yang disahkan.
- Source error/formula kosong tidak diubah menjadi nol secara asumtif.
- Process parameter berada pada domain Quality.
- Source Authority hanya valid bila source ID masih ada di D1.
- Cycle Target hanya ditampilkan jika matching machine/material/process unik.

## 10. Repository protection recommendation

Branch `main` sebaiknya memakai GitHub Ruleset/branch protection dengan minimum:

- require pull request before merge untuk perubahan terencana;
- require status check `Validate OEE Collaboraction`;
- block force push;
- block branch deletion;
- require branch up to date sebelum merge bila tim menggunakan PR;
- batasi bypass hanya ke owner/administrator yang memang diperlukan untuk incident recovery.

Jika repository dikelola oleh satu orang dan direct push masih diperlukan, minimum tetap aktifkan required status checks + block force push/deletion.

## 11. Incident triage order

1. Periksa `/api/health`.
2. Periksa `/api/version` + fingerprint.
3. Periksa `/api/readiness`.
4. Periksa GitHub Actions deploy dan validation.
5. Periksa apakah masalah hanya frontend asset/cache atau backend/D1.
6. Periksa open production run/downtime/maintenance/approval.
7. Periksa Source Authority/Data Governance jika masalah adalah angka/interpretasi, bukan availability.
8. Periksa integration status jika masalah berasal dari sistem eksternal.
9. Jangan menyimpulkan kehilangan data hanya dari tampilan frontend sebelum memeriksa D1/source provenance.

## 12. Secrets

Secret yang diperlukan CI/CD disimpan di GitHub/Cloudflare secret store. Jangan:

- menulis token ke README;
- menaruh token di `config.js`;
- commit `.env` berisi credential;
- mengirim token/password melalui issue, PR comment, screenshot, atau chat.

Rotasi secret bila pernah terekspos dan invalidasi credential lama sebelum melanjutkan deployment.
