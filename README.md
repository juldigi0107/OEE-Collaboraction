# OEE Collaboraction

Platform OEE dan operational collaboration untuk **BMJ Packaging Offset**, dengan frontend yang dapat dipublikasikan melalui GitHub Pages dan frontend/API production yang dilayani Cloudflare Worker. Backend menggunakan **Cloudflare Workers + D1 tanpa R2**.

## Production endpoints

- Production application: `https://oee-collaboraction.offsetbmj.workers.dev`
- GitHub Pages frontend: `https://juldigi0107.github.io/OEE-Collaboraction/`
- Production API entrypoint: `backend/worker-production.mjs`
- Database binding: Cloudflare D1 `DB` → `oee-collaboraction`
- Build version: `6.2.0`

Endpoint `/api/version` mengembalikan `release_fingerprint` agar deployment dapat diverifikasi berdasarkan capability aktif, bukan hanya nomor versi. Fingerprint saat ini mencakup Data Governance, UAT/Go-Live, Machine Governance, Support/Recovery, Access Governance, Display Lifecycle, Staged Import, Operational Control, Release Resilience, dan Period-aware Dashboard.

## Arsitektur data

- Historical spreadsheet rows: D1 `record_chunks` dengan overlay CRUD `records`.
- Transaksi operasional: D1 `entries` dan tabel realtime/Shopfloor terkait.
- Dokumen/aset sumber: D1 `source_files` / `source_file_chunks`.
- Katalog aset: D1 `asset_catalog`.
- Audit trail, approval, machine state, production run, downtime, maintenance, quality event, integration metadata, dan settings berada di D1.
- **Tidak memakai R2.**
- Token, password, Worker Secret, credential enterprise, dan database privat tidak disimpan di repository publik.

Schema tambahan dibuat secara additive menggunakan `CREATE TABLE/INDEX IF NOT EXISTS`. Tidak ada release migration yang sengaja menghapus data existing.

## Hak akses

- **Superadmin** — seluruh department, akun/izin, governance, konfigurasi, CRUD, import, integration, audit, release control, dan display management.
- **Admin Department** — CRUD/config hanya pada department sendiri dan hanya untuk permission yang diberikan Superadmin.
- **Viewer** — view-only.

Backend adalah authority. Menyembunyikan tombol di frontend bukan mekanisme keamanan utama.

## Governance dan workflow operasional

Release saat ini memiliki control chain:

`Data Governance → Operational Baseline → UAT & Go-Live → Delivery Plan / Operational Sign-off`

Operational baseline mencakup Cycle Target, klasifikasi PDT/UPDT/COJ, Machine Trigger, Field Ownership/Source of Truth, serta Delivery/Open Action. Baseline tidak menjadi authoritative hanya karena form terisi; approval dan dependency diverifikasi kembali oleh backend.

Shopfloor flow menggunakan planning berstatus **Released / Siap Produksi**, pre-start checklist, Start PRO, Quality/Downtime/Maintenance event, Finish PRO, dan Approval/Verifikasi. Downtime yang berada pada baseline Loss-Time harus menggunakan reason code/class/owner yang disahkan.

## Prinsip penyajian data

- Periode laporan mengikuti cell tanggal/tanggal kerja transaksi, **bukan nama file**.
- PPIC signed negative dipertahankan sebagai reversal candidate.
- Unit QC/Reject tidak dijumlahkan lintas unit secara asumtif.
- Error/formula sumber tidak otomatis diubah menjadi nol.
- KPI lintas sumber tidak disebut authoritative sebelum Data Governance disahkan.
- Cycle Target tidak ditampilkan di HMI bila matching mesin/material/proses ambigu.
- Source Authority yang disahkan harus menunjuk source ID yang benar-benar ada di D1.

## Release verification

GitHub Actions memeriksa source dan production, termasuk:

- frontend JavaScript dan active asset integrity;
- role UX, navigation, login/session, dan backend authorization;
- blueprint/release guards;
- Data Governance, Operational Control, UAT, display lifecycle, import staging, dan semantic archive;
- Worker module syntax;
- production health, version/fingerprint, dan D1 readiness;
- production frontend/asset smoke checks;
- published field-display guard dan exact machine scope;
- protected endpoints yang harus tetap `401` tanpa session.

Workflow deployment Worker juga memverifikasi production version/fingerprint dan readiness setelah Wrangler selesai deploy.

## Software readiness vs operational go-live

**Software release dapat diverifikasi otomatis. Operational go-live tidak boleh dipalsukan.** PLC/Edge, ODIN, SAP, barcode scanner fisik, PC/LAN/power/UPS, TV/mini-PC, heartbeat mesin, dan perangkat lapangan lain hanya boleh dinyatakan siap setelah endpoint/perangkat aktual diuji dan evidence dimasukkan ke UAT/Release Readiness.

Status hardware/integration yang belum mempunyai evidence harus tetap `Belum diverifikasi`, `Nonaktif`, atau `Menunggu verifikasi`.

## Deployment dan recovery

- `wrangler.toml` menunjuk `backend/worker-production.mjs`.
- Production deployment dilakukan melalui GitHub Actions menggunakan repository secret `CLOUDFLARE_API_TOKEN`.
- GitHub Pages dideploy dari `frontend/`.
- Release Manifest dapat diunduh dari halaman **Dukungan & Pemulihan** oleh Superadmin.
- Release Manifest **bukan full backup D1**. Full export/restore D1 harus dilakukan melalui prosedur Cloudflare yang disetujui sebelum rollback atau perubahan berisiko.

Lihat `DEPLOY-CLOUDFLARE.md` dan dokumentasi runbook repository untuk langkah deployment/rollback yang lebih rinci.

## Source blueprint

Blueprint privat hasil audit berasal dari `OEE DASHBOARD(1).zip`. Raw source dan provenance dipertahankan agar data dapat ditelusuri. Repository publik tidak menyimpan dump database privat maupun credential sumber enterprise.
