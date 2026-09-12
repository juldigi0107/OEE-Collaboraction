# OEE Collaboraction

Frontend OEE Collaboraction berjalan di GitHub Pages. Backend production dirancang untuk Cloudflare Workers + Cloudflare D1 **tanpa R2**.

## Arsitektur

- Frontend: GitHub Pages (`frontend/`)
- API: Cloudflare Worker (`backend/worker.mjs`)
- Database, historical archive, dan original source files: Cloudflare D1
- Data bisnis privat tidak disimpan di repository publik ini.

Historical spreadsheet rows disimpan sebagai JSON chunks pada tabel `record_chunks`; perubahan CRUD menggunakan tabel overlay `records`. File PDF/XLSX/PPTX/JPEG/PNG disimpan sebagai BLOB chunks pada `source_file_chunks` dan direkonstruksi oleh endpoint `/api/files/:sourceId`.

## D1 Free-plan seed

Paket deployment privat berisi `data/source.sqlite` dan `data/originals/`. Jalankan:

```bash
python scripts/build-d1-free.py
node scripts/deploy-d1-free.mjs --new-empty-database
```

Builder memecah data menjadi statement yang aman untuk batas statement D1 dan menekan jumlah initial row writes dengan packing raw source rows menjadi chunks. Jangan commit folder `data/`, hasil seed, token, atau secret ke repository ini.

## Konfigurasi Cloudflare

1. Buat D1 database bernama `oee-collaboraction`.
2. Masukkan Database ID ke `backend/wrangler.toml` menggantikan `REPLACE_WITH_D1_DATABASE_ID`.
3. Set secret `BOOTSTRAP_TOKEN` pada Worker.
4. Deploy Worker dengan Wrangler atau Cloudflare dashboard/build integration.
5. Setelah URL Worker tersedia, set `frontend/config.js` ke URL tersebut dan deploy GitHub Pages kembali.

`ALLOWED_ORIGIN` production saat ini adalah `https://juldigi0107.github.io`.

## Verifikasi lokal D1-only

Build D1-only telah diuji dengan 23 API checks dan rekonstruksi file sumber terbesar; file hasil rekonstruksi memiliki SHA-256 yang sama dengan original.
