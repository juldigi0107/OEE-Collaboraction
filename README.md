# OEE Collaboraction

Platform OEE BMJ Packaging Offset dengan frontend GitHub Pages dan backend Cloudflare Workers + Cloudflare D1 **tanpa R2**.

## Production architecture

- Frontend: `frontend/` → GitHub Pages.
- API production entrypoint: `backend/worker-production.mjs`.
- Core API: `backend/worker-v6.mjs` + existing realtime/edge modules.
- Database: Cloudflare D1 `oee-collaboraction`.
- Historical spreadsheet rows: D1 `record_chunks` + overlay CRUD `records`.
- Dokumen/aset sumber: D1 `source_files` / `source_file_chunks`.
- Katalog aset: D1 `asset_catalog`.
- **Tidak memakai R2.**
- Data bisnis privat, database hasil audit, token, dan secret tidak disimpan di repository publik.

Production wrapper memastikan schema katalog aset secara additive menggunakan `CREATE TABLE/INDEX IF NOT EXISTS` ketika fitur aset atau impor pertama kali dipakai. Migration terpisah `backend/migrations/0001_asset_catalog.sql` tetap tersedia untuk deployment terkelola. Tidak ada migration v6 yang menghapus tabel atau data existing.

## Hak akses

- `superadmin`: seluruh fitur, seluruh department, akun, izin, konfigurasi, CRUD, impor, integrasi dan audit.
- `admin`: CRUD/config hanya pada department sendiri dan hanya untuk permission yang diberikan superadmin.
- `user`: read-only.

Validasi dilakukan kembali di backend pada setiap operasi; UI bukan satu-satunya lapisan pembatasan.

## Cakupan sumber hasil audit

Paket privat hasil analisis `OEE DASHBOARD(1).zip` mencakup 21 file dan 121 sheet dengan 100.125 baris berisi data/formula. Raw source dipertahankan agar transaksi dapat ditelusuri kembali. Error/formula sumber tidak diganti nol. Versi MTC Ori/Verifikasi, PPIC signed reversal, perbedaan unit, dan periode campuran diperlakukan sebagai provenance, bukan digabung secara asumtif.

## Validasi build

- 291 pemeriksaan API lokal: lulus.
- 10 pemeriksaan alur Shopfloor HMI: lulus.
- Rekonstruksi 21 file sumber: SHA-256 identik dengan original.
- GitHub Actions frontend JavaScript: lulus.
- GitHub Actions Worker modules: lulus.
- Production Worker smoke check: lulus.
- GitHub Pages production deployment: lulus.

Pengujian perangkat PLC/ODIN/SAP/Qlik dan heartbeat mesin nyata tetap memerlukan endpoint/credential/perangkat lapangan.

## Deployment

`wrangler.toml` berada di root repository dan menunjuk `backend/worker-production.mjs`. Cloudflare Workers Builds harus menggunakan repository root dan branch `main`. Detail aman tersedia di `DEPLOY-CLOUDFLARE.md`.

Frontend production: `https://juldigi0107.github.io/OEE-Collaboraction/`

Backend production: `https://oee-collaboraction.offsetbmj.workers.dev`

## Data aktual

Data aktual tidak dimasukkan ke repository publik. Paket privat menyediakan database hasil audit dan JSONL import batches. Impor dilakukan melalui akun superadmin dengan ID stabil dan `INSERT OR IGNORE`; sebelum mengimpor ke D1 existing, cocokkan SHA-256 sumber untuk mencegah duplikasi provenance.
