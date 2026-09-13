# Deployment Backend OEE ke Cloudflare — D1 Only

Frontend production: https://juldigi0107.github.io/OEE-Collaboraction/

Backend production: `oee-collaboraction` pada Cloudflare Workers.

## Arsitektur produksi

- Frontend: GitHub Pages dari folder `frontend/`.
- Backend: Cloudflare Worker `backend/worker-v6.mjs` melalui `wrangler.toml` di root repository.
- Database: Cloudflare D1 `oee-collaboraction`.
- Dokumen, XLSX/PDF/PPTX, gambar, serta historical archive: disimpan di **D1 sebagai chunk BLOB/JSON**.
- **Tidak menggunakan R2**.
- Data bisnis privat, database seed, token, dan secret tidak boleh disimpan di repository publik.

`wrangler.toml` saat ini memakai D1 database ID `85624616-87c2-45d4-a4cf-49c0544e163a` dan Worker `oee-collaboraction`.

## Deployment melalui Cloudflare Dashboard

Hubungkan Workers Builds ke repository:

- Repository: `juldigi0107/OEE-Collaboraction`
- Production branch: `main`
- Root directory: **repository root**
- Build command: kosong
- Deploy command: `npx wrangler deploy`

Jangan mengatur Root Directory ke `backend`, karena konfigurasi production berada pada `wrangler.toml` di root repository.

## Urutan aman sebelum deploy

1. Backup/ekspor D1 production lebih dahulu.
2. Terapkan perubahan schema secara **additive**. Migration `backend/migrations/0001_asset_catalog.sql` hanya menambah `asset_catalog` dan index; tidak menghapus tabel/data lama.
3. Pastikan binding D1 pada Worker bernama `DB` dan menunjuk database `oee-collaboraction`.
4. Pastikan `ALLOWED_ORIGIN` mencakup `https://juldigi0107.github.io` dan domain Worker production.
5. Deploy Worker dari branch `main` melalui Workers Builds.
6. Buka `/api/health`; respons yang benar harus menunjukkan service OEE dan storage D1-only.
7. Setelah backend sehat, workflow GitHub Pages akan menerbitkan folder `frontend/` dari `main`.

## Data aktual dan impor

Source code publik tidak membawa data aktual. Paket privat hasil audit berisi database/arsip dan paket impor yang dapat dimasukkan melalui superadmin.

Impor dilakukan ke D1 dengan ID sumber yang stabil dan `INSERT OR IGNORE`, sehingga pengulangan batch yang sama tidak mengganti record yang sudah ada. Namun sebelum mengimpor ke D1 yang sudah memiliki data lama, cocokkan `sources.sha256` agar sumber yang sama tidak tercatat dengan ID berbeda.

File besar direkonstruksi dari tabel `source_file_chunks`; aplikasi tidak memerlukan R2.

## Bootstrap akun

Tidak ada username/password produksi bawaan. Untuk instalasi baru, set Worker Secret `BOOTSTRAP_TOKEN` dengan nilai acak kuat, lakukan bootstrap superadmin satu kali, wajibkan penggantian password awal, lalu hapus secret bootstrap.

Untuk database existing, pertahankan akun yang sudah ada dan jangan menjalankan seed akun tetap.

## Setelah deployment

Frontend `frontend/config.js` sudah menunjuk `https://oee-collaboraction.offsetbmj.workers.dev` saat berjalan di GitHub Pages. Lakukan login dan validasi minimal:

- superadmin dapat seluruh konfigurasi dan CRUD;
- admin hanya dapat CRUD/config department sendiri sesuai permission;
- user hanya view;
- seluruh 21 file sumber dan 121 sheet tetap dapat ditelusuri setelah data privat diimpor;
- HMI tidak dianggap terhubung ke mesin nyata sebelum heartbeat aktual diterima.
