# OEE Collaboraction 6.2.0 — Production Release Record

Tanggal rilis: 14 September 2026  
Target production: `https://oee-collaboraction.offsetbmj.workers.dev`  
Storage: Cloudflare D1 only  
R2: tidak digunakan

## Status release

Release 6.2.0 adalah baseline software production untuk OEE Collaboraction Packaging Offset. Status **software release** dipisahkan dari **operational go-live**. Software dapat terverifikasi hijau sementara perangkat lapangan, endpoint pihak lain, atau sign-off proses masih menunggu evidence.

### Software gate terverifikasi

- Cloudflare Worker berhasil deploy dan `/api/version` mengembalikan `6.2.0`.
- D1 readiness berhasil dan schema tidak melaporkan missing table.
- Login/session memakai POST, session browser menggunakan `sessionStorage`, session backend disimpan dalam bentuk hash, rate-limit login dan forced password rotation aktif.
- Authorization backend tetap menjadi sumber keputusan untuk Superadmin, Admin Department, dan Viewer.
- Protected endpoint menolak request tanpa session.
- Frontend active bundles, BMJ assets, navigasi, field display publish guard, exact machine scope, Data Governance, UAT/Go-Live, Machine Governance, Support/Recovery, dan Release Polish v23 melewati regression gate.
- Draft display tidak dapat ditayangkan sebagai field display.
- Start Production memerlukan planning `Released` dan pre-start checklist.
- Downtime closure memerlukan root cause/tindakan.
- Maintenance closure memerlukan acknowledge dan catatan penyelesaian.
- Finish PRO, End Downtime, dan Quality Event masuk ke workflow Approval & Verifikasi.
- Audit UI menyamarkan password/hash/salt/token/secret/credential.
- Release Manifest tersedia hanya untuk Superadmin dan tidak mengekspor credential.

## Data & business controls

Aplikasi tidak mengubah fakta sumber agar tampak bersih. Error workbook, perbedaan definisi KPI, signed PPIC reversal, versi Maintenance, mixed period, dan anomali PDS tetap ditelusuri melalui Kualitas Data dan Data Governance.

Baseline Data Governance yang harus disahkan oleh owner proses:

1. Definisi KPI dan satuan resmi.
2. Alias dan canonical machine.
3. Kalender shift dan tanggal kerja.
4. Sumber authoritative per domain.
5. Join grain, transaction key, dan deduplication rule.

Hanya mapping machine yang telah disahkan yang boleh mempengaruhi canonical runtime. Nilai mesin asli tetap dipertahankan dalam audit trace.

## Operational controls

UAT & Go-Live memiliki tujuh gate terpisah:

1. Role & permission.
2. Browser & device.
3. Rekonsiliasi data.
4. Display mesin.
5. Backup & recovery.
6. Integrasi & hardware.
7. Final sign-off.

Gate tidak boleh ditandai lulus hanya karena software sudah deploy. PIC dan evidence harus diisi sesuai proses BMJ.

## Dependency yang belum boleh diasumsikan live

Status berikut harus mengikuti evidence lapangan, bukan asumsi aplikasi:

- PLC / machine endpoint aktual.
- ODIN endpoint dan credential.
- SAP/OData endpoint dan credential.
- Qlik integration key / consumer.
- Barcode scanner fisik.
- PC operator / mini-PC display.
- LAN/Wi-Fi/VLAN yang digunakan di area mesin.
- Power/UPS untuk perangkat lapangan.
- TV/monitor dan mounting display.
- Browser/device compatibility di perangkat produksi aktual.

Jika endpoint/perangkat belum tersedia, UI harus tetap menggunakan status seperti **Belum diverifikasi**, **Menunggu verifikasi**, **Offline**, atau `—`; tidak boleh menampilkan data fiktif.

## Change & recovery rule

Sebelum deployment/rollback terencana:

- periksa pending approval, open downtime, active maintenance call, dan production run aktif;
- unduh Release Manifest dari menu Dukungan & Pemulihan;
- gunakan prosedur Cloudflare yang disetujui untuk export/backup D1; Release Manifest **bukan** database backup;
- komunikasikan change window dengan owner proses;
- setelah perubahan, verifikasi health, version, readiness, login, role, HMI, dan satu transaksi non-destruktif sesuai UAT.

## Source of truth

Data bisnis berasal dari arsip sumber dan transaksi D1. File asli dipertahankan untuk traceability. Periode mengikuti isi/tanggal data dan metadata sumber, bukan sekadar nama file. Unit yang berbeda tidak boleh digabung tanpa aturan konversi resmi.
