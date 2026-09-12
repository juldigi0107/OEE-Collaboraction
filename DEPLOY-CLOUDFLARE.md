# Deployment Backend OEE ke Cloudflare

Frontend production: https://juldigi0107.github.io/OEE-Collaboraction/

## Resource Cloudflare

Buat resource berikut pada akun Cloudflare yang akan dipakai produksi:

1. D1 database: `oee-collaboraction`
2. R2 bucket privat: `oee-collaboraction-documents`
3. Worker: `oee-collaboraction-api`

Setelah D1 dibuat, salin Database ID lalu ganti `REPLACE_WITH_D1_DATABASE_ID` pada `backend/wrangler.toml`.

`ALLOWED_ORIGIN` sudah dibatasi ke origin GitHub Pages: `https://juldigi0107.github.io`.

## Deploy source Worker

Cloudflare Workers Builds dapat dihubungkan ke repository ini. Gunakan:

- Repository: `juldigi0107/OEE-Collaboraction`
- Production branch: `main`
- Root directory: `backend`
- Build command: kosong
- Deploy command: `npx wrangler deploy`

Jangan memasukkan data bisnis, database seed, token, atau `.dev.vars` ke repository publik.

## Data produksi

Data aktual tidak disimpan di GitHub. Paket deployment privat memiliki SQL seed D1 dan original source files untuk R2.

Untuk D1, gunakan Wrangler terhadap database baru/empty:

`npx wrangler d1 execute oee-collaboraction --remote --file=<file.sql>`

Untuk original documents, upload ke R2 dengan struktur object key `<source-id>/<filename>` sesuai manifest privat.

## Bootstrap superadmin

Set runtime secret `BOOTSTRAP_TOKEN` pada Worker. Gunakan nilai acak panjang. Setelah superadmin pertama berhasil dibuat melalui UI aplikasi, hapus secret tersebut.

Tidak ada username/password produksi bawaan.

## Setelah Worker live

Ubah `frontend/config.js` menjadi:

`window.OEE_CONFIG = { apiBase: "https://<worker-url>" };`

Lalu GitHub Pages akan otomatis redeploy frontend pada commit berikutnya.
