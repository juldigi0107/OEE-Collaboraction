# Deployment Backend OEE ke Cloudflare — D1 Only

Frontend production: `https://juldigi0107.github.io/OEE-Collaboraction/`

Backend production: `https://oee-collaboraction.offsetbmj.workers.dev`

## Arsitektur production

- Frontend: GitHub Pages dari folder `frontend/`.
- Backend entrypoint: `backend/worker-production.mjs` melalui `wrangler.toml` di root repository.
- Core API: `backend/worker-v6.mjs` beserta realtime/edge modules.
- Database: Cloudflare D1 `oee-collaboraction`.
- Dokumen, XLSX/PDF/PPTX, gambar dan historical archive: D1 chunk BLOB/JSON.
- **Tidak menggunakan R2.**
- Data bisnis privat, database hasil audit, token dan secret tidak boleh disimpan di repository publik.

`wrangler.toml` memakai binding `DB`, database `oee-collaboraction`, dan database ID production yang sudah dikonfigurasi pada repository.

## Workers Builds

Gunakan:

- Repository: `juldigi0107/OEE-Collaboraction`
- Production branch: `main`
- Root directory: **repository root**
- Build command: kosong
- Deploy command: `npx wrangler deploy`

Jangan mengatur Root Directory ke `backend`, karena `wrangler.toml`, static assets binding, D1 binding dan production entrypoint berada dari root repository.

## Schema D1 yang aman

Production wrapper melakukan guard additive sebelum endpoint aset/impor digunakan:

- `CREATE TABLE IF NOT EXISTS asset_catalog(...)`
- `CREATE INDEX IF NOT EXISTS asset_parent ...`

Migration yang sama tersedia di `backend/migrations/0001_asset_catalog.sql`. Guard ini tidak melakukan `DROP`, tidak menghapus row, dan tidak mengganti akun existing.

Untuk perubahan schema berikutnya, tetap lakukan backup/ekspor D1 sebelum migration. Jangan pernah mengganti database production menggunakan file SQLite lokal secara langsung.

## Data aktual dan impor

Source code publik tidak membawa data aktual. Paket privat hasil audit berisi source database/arsip dan JSONL import batches.

Impor melalui akun superadmin menggunakan ID stabil dan `INSERT OR IGNORE`. Sebelum mengimpor ke D1 yang sudah berisi data lama, cocokkan `sources.sha256` agar sumber yang sama tidak tercatat dua kali dengan ID berbeda.

File besar direkonstruksi dari `source_file_chunks`; aplikasi tidak memerlukan R2.

Target hasil audit setelah seluruh paket privat diimpor:

- 21 source files;
- 121 worksheets;
- 100.125 historical source rows/data-formula rows;
- dokumen/slide/aset sumber tetap dapat ditelusuri;
- transaksi hasil pemetaan mempertahankan `source_file`, `source_sheet`, dan `source_record`.

## Bootstrap dan akun

Tidak ada username/password production bawaan. Untuk instalasi baru, set Worker Secret `BOOTSTRAP_TOKEN` dengan nilai acak kuat, bootstrap superadmin satu kali, wajibkan penggantian password awal, lalu hapus secret tersebut.

Untuk database existing, pertahankan akun existing; jangan menjalankan seed akun tetap.

## Checklist setelah deploy

1. Pastikan `/api/health` merespons service OEE dengan storage D1-only.
2. Login dengan akun existing.
3. Superadmin harus dapat akun/izin/config/import/audit seluruh department.
4. Admin harus ditolak ketika mencoba mengubah department lain atau permission yang tidak diberikan.
5. User harus gagal melakukan POST/PUT/DELETE.
6. Pastikan dashboard tidak mengganti error/kosong sumber menjadi nol.
7. Pastikan HMI hanya menampilkan mesin realtime sebagai connected setelah heartbeat aktual diterima.
8. Setelah import sumber, cocokkan jumlah source/sheet dan sample SHA-256 dengan paket privat.

## Status validasi repository

Build v6 telah melalui GitHub Actions untuk syntax frontend, syntax Worker, dan production Worker smoke check dengan hasil sukses. GitHub Pages production deployment juga sukses. Status build/deploy Cloudflare versi tertentu tetap harus dilihat dari Workers Builds/Deployment history pada akun Cloudflare karena GitHub tidak menyediakan log Cloudflare tersebut.
