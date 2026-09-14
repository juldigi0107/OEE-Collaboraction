# OEE Collaboraction — Go-Live Checklist

Checklist ini membedakan **software verification**, **data governance**, dan **operational readiness**. Jangan menandai item lulus tanpa evidence.

## A. Software verification

- [x] Production Worker dapat diakses.
- [x] Build production `6.2.0` terverifikasi.
- [x] D1 readiness `ready` dan schema lengkap.
- [x] Frontend active assets termuat dari Worker production.
- [x] Login/session regression gate lulus.
- [x] Backend authorization regression gate lulus.
- [x] Protected endpoint menolak request tanpa session.
- [x] Navigation regression gate mencakup route utama dan release-control.
- [x] Field display hanya menerima layout `published` yang memiliki assignment mesin.
- [x] Exact machine scope aktif; display tidak meminjam data mesin lain.
- [x] Source archive empty-state aman.
- [x] JPG/JPEG/PNG/WEBP/GIF source preview didukung.
- [x] Source-row editor menggunakan form native, bukan raw JSON.
- [x] Support & Recovery dan Release Manifest tersedia untuk Superadmin.

## B. Data Governance — wajib keputusan owner

- [ ] Definisi Quality/OEE resmi disahkan.
- [ ] Satuan FG resmi disahkan.
- [ ] Basis ideal speed disahkan.
- [ ] Definisi MTBF disahkan.
- [ ] Definisi MTTR disahkan.
- [ ] Definisi utilization disahkan.
- [ ] Alias dan canonical machine lengkap lalu disahkan.
- [ ] Model 3 shift / 4 group dan cut-off tanggal kerja disahkan.
- [ ] Source authoritative Production ditetapkan.
- [ ] Source authoritative QC ditetapkan.
- [ ] Source authoritative Maintenance ditetapkan.
- [ ] Source authoritative PPIC ditetapkan.
- [ ] Source authoritative PDS ditetapkan.
- [ ] Source authoritative Master/Project ditetapkan.
- [ ] Join grain disahkan.
- [ ] Natural/transaction key disahkan.
- [ ] Aturan deduplikasi disahkan; PRO tidak digunakan sebagai satu-satunya key.

## C. Role & permission UAT

- [ ] Superadmin: seluruh menu yang semestinya tersedia dapat dibuka.
- [ ] Superadmin: user/permission/config/integration/import/audit dapat digunakan sesuai hak.
- [ ] Admin Production: CRUD hanya sesuai permission Production.
- [ ] Admin QC: CRUD hanya sesuai permission QC.
- [ ] Admin Maintenance: CRUD hanya sesuai permission Maintenance.
- [ ] Admin PPIC: CRUD hanya sesuai permission PPIC.
- [ ] Admin PDS: CRUD hanya sesuai permission PDS.
- [ ] Viewer: seluruh mutation ditolak backend.
- [ ] Admin Department tidak dapat menulis ke department lain dengan direct API request.
- [ ] User yang diubah password/permission-nya menerima invalidasi session sesuai rule.

## D. Production workflow UAT

- [ ] PPIC membuat planning.
- [ ] Planning belum `Released` tidak dapat Start Production.
- [ ] PPIC mengubah planning valid menjadi `Released / Siap Produksi`.
- [ ] Operator memilih planning Released yang sesuai mesin/PRO.
- [ ] Checklist material, QC, safety, dan tools wajib lengkap.
- [ ] Start Production berhasil pada machine code/canonical yang sesuai.
- [ ] Machine lain tidak terpengaruh.
- [ ] PDT dapat dibuka dan ditutup.
- [ ] UPDT dapat dibuka dan ditutup.
- [ ] COJ dapat dibuka dan ditutup.
- [ ] Downtime tidak dapat ditutup tanpa root cause/tindakan.
- [ ] UPDT melewati threshold escalation menghasilkan maintenance call sesuai rule.
- [ ] Manual Call Maintenance berhasil.
- [ ] Maintenance acknowledge berhasil.
- [ ] Maintenance Close ditolak sebelum acknowledge.
- [ ] Maintenance Close memerlukan tindakan penyelesaian.
- [ ] Quality sampling menolak quantity yang tidak konsisten.
- [ ] Finish PRO ditolak selama downtime masih terbuka.
- [ ] Finish PRO menyimpan actual/good/reject yang valid.
- [ ] Finish PRO membuat Final Verification pending.
- [ ] End Downtime membuat Root Cause Verification pending.
- [ ] Quality Event membuat QC Verification pending.
- [ ] Reject approval memerlukan alasan.

## E. Data reconciliation UAT

- [ ] Printing Quality convention dibandingkan dengan owner dan ditetapkan pada Data Governance.
- [ ] PPIC signed negative/reversal direkonsiliasi dengan confirmation + counter.
- [ ] MTC Ori vs Verifikasi dibandingkan dan source authority diputuskan.
- [ ] Timestamp Maintenance lintas periode tidak otomatis dianggap MTTR tanpa definisi owner.
- [ ] QC unit pcs/kg/sheet tetap dipisahkan atau memiliki conversion rule resmi.
- [ ] PDS outlier/agregat yang tidak wajar ditinjau owner.
- [ ] Periodisasi diuji dari nilai tanggal data, bukan nama file.
- [ ] Raw/pivot/summary tidak mengalami double count.
- [ ] Sample transaksi baru dibandingkan dengan sumber bisnis yang sah.

## F. Browser, device & field display

- [ ] Desktop browser target diuji.
- [ ] Tablet target diuji bila digunakan.
- [ ] Mobile target diuji bila digunakan.
- [ ] Resolusi display 1920×1080 diuji bila digunakan.
- [ ] Resolusi 1366×768 diuji bila digunakan.
- [ ] Portrait 1080×1920 diuji bila digunakan.
- [ ] Published display menampilkan assignment mesin yang benar.
- [ ] Draft display tidak dapat digunakan di lapangan.
- [ ] Mesin tanpa heartbeat menunjukkan Offline/`—`, bukan data mesin lain.
- [ ] Auto-refresh tidak menimbulkan visual jump/overflow yang mengganggu operator.

## G. Infrastructure & hardware

- [ ] PC/operator terminal tersedia dan disetujui.
- [ ] Mini-PC/TV display tersedia bila diperlukan.
- [ ] Power supply area siap.
- [ ] UPS tersedia bila diwajibkan proses.
- [ ] LAN/Wi-Fi/VLAN telah diuji dari lokasi mesin.
- [ ] DNS/HTTPS menuju Worker production dapat diakses dari network produksi.
- [ ] Barcode scanner fisik dikenali sebagai input keyboard bila digunakan.
- [ ] Barcode aktual cocok dengan format planning/PRO yang disepakati.
- [ ] PLC/machine endpoint tersedia dan telah diuji bila integrasi realtime akan diaktifkan.

## H. External integration

- [ ] ODIN endpoint telah diterima dari owner sistem.
- [ ] ODIN credential tersimpan sebagai Cloudflare Worker Secret, bukan di frontend/D1.
- [ ] SAP/OData endpoint telah diterima.
- [ ] SAP credential tersimpan sebagai Worker Secret.
- [ ] Qlik feed key/consumer telah disepakati bila digunakan.
- [ ] Mapping field integration disahkan.
- [ ] Test connection berhasil.
- [ ] Sync test berhasil tanpa duplicate/corrupt transaction.
- [ ] Error integration tampil sebagai status nyata dan tidak diganti data demo.

## I. Backup, rollback & recovery

- [ ] Release Manifest diunduh sebelum go-live/change besar.
- [ ] Prosedur export/backup D1 Cloudflare yang disetujui telah dilakukan.
- [ ] Lokasi backup dan retention disepakati owner.
- [ ] Restore procedure diuji di environment aman bila diwajibkan.
- [ ] Rollback source revision telah ditentukan.
- [ ] Change window menghindari active run/downtime kritis atau memiliki approval khusus.
- [ ] Recovery contact/PIC tersedia.

## J. Final sign-off

- [ ] Tidak ada blocker UAT terbuka yang tidak diterima secara formal.
- [ ] Evidence tujuh gate UAT tersimpan.
- [ ] Data Governance baseline wajib telah disahkan.
- [ ] Dependency yang tidak digunakan ditandai `Tidak diperlukan`, bukan dianggap lulus tanpa alasan.
- [ ] Production owner menyetujui.
- [ ] QC owner menyetujui.
- [ ] Maintenance owner menyetujui.
- [ ] PPIC owner menyetujui.
- [ ] IT/infrastructure owner menyetujui bila diperlukan.
- [ ] Tanggal go-live disepakati.
- [ ] Final sign-off direkam melalui UAT & Go-Live Center.

**Catatan:** checklist markdown ini adalah release reference. Status operasional aktual harus direkam pada halaman **Definisi Data & KPI**, **UAT & Go-Live**, **Tata Kelola & Readiness**, dan **Dukungan & Pemulihan** di aplikasi agar evidence tetap terkait dengan release state yang aktif.
