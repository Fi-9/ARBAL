# RESTORE HARDENING PLAN

## Tujuan

Meningkatkan mekanisme backup/restore ARBAL agar aman, konsisten, dapat diaudit, dan layak dipakai untuk pemulihan data produksi dengan risiko minimal terhadap kehilangan data, korupsi data, dan kesalahan operator.

## Ringkasan Masalah Saat Ini

1. Restore ZIP masih diekstrak langsung tanpa validasi entry-level yang aman terhadap `zip-slip`.
2. Fallback restore programatik belum atomic karena proses `TRUNCATE` berjalan di luar transaction penuh.
3. Restore `psql` belum dikonfigurasi fail-fast dan belum dipaksa single-transaction.
4. Verifikasi backup masih dangkal, hanya memeriksa keberadaan file inti dalam ZIP.
5. UI, endpoint backend, dan dokumentasi masih tidak konsisten soal siapa yang boleh menjalankan restore.
6. Backup upload langsung ditulis ke direktori resmi sebelum lolos validasi mendalam.
7. Dokumentasi restore masih memuat contoh connection string yang tidak layak disimpan di repo.
8. Test restore belum mencakup skenario integritas dan kegagalan pemulihan nyata.

## Prinsip Desain

1. Restore adalah operasi destruktif berisiko tinggi, jadi harus `secure by default`.
2. Backup dianggap valid hanya jika dapat diverifikasi dan dipulihkan dengan aman.
3. Restore produksi harus seminimal mungkin bergantung pada input manual dan perilaku non-deterministik.
4. Semua operasi restore harus memiliki audit trail yang jelas.
5. Jika atomic restore tidak dapat dijamin, restore tidak boleh diekspos sebagai fitur self-service biasa.

## Fase Implementasi

## Fase 1 - Containment Cepat

Tujuan: menutup jalur restore yang paling berisiko sebelum refactor lebih dalam.

1. Nonaktifkan endpoint restore dari UI produksi.
2. Sembunyikan atau hapus tombol `restore` dan `upload-restore` dari frontend sampai flow aman.
3. Pertahankan akses restore hanya untuk mode administratif terbatas atau CLI internal.
4. Tambahkan warning eksplisit di backend log saat endpoint restore masih dipanggil.
5. Revisi dokumentasi agar konsisten: restore bukan fitur operasional harian.

Acceptance criteria:

1. UI produksi tidak lagi menawarkan restore aktif ke pengguna biasa.
2. Dokumentasi dan perilaku backend tidak saling bertentangan.

## Fase 2 - Hardening ZIP Intake dan Staging

Tujuan: memastikan file backup yang masuk tidak bisa menulis file di luar area aman.

1. Ganti ekstraksi langsung `Expand-Archive`/`unzip` dengan alur inspeksi entry ZIP terlebih dahulu.
2. Validasi setiap entry ZIP:
   - tidak boleh absolute path,
   - tidak boleh mengandung `..`,
   - hanya boleh berisi path yang diizinkan seperti `database.sql`, `metadata.json`, `README.txt`, `uploads/...`.
3. Simpan file upload ke direktori staging sementara, bukan langsung ke `BACKUPS_DIR` resmi.
4. Batasi ukuran total ekstraksi untuk mencegah zip bomb sederhana.
5. Hanya promotekan backup ke direktori resmi jika validasi lolos.
6. Hapus staging artifact secara andal pada sukses maupun gagal.

Acceptance criteria:

1. ZIP berbahaya dengan path traversal ditolak sebelum ekstraksi.
2. ZIP invalid tidak pernah menjadi backup resmi di server.
3. Temporary restore directory selalu dibersihkan.

## Fase 3 - Database Restore Atomicity

Tujuan: menjamin restore database tidak meninggalkan state setengah jadi.

1. Ubah restore SQL via `psql` menjadi fail-fast:
   - gunakan `-v ON_ERROR_STOP=1`,
   - gunakan single transaction jika dump mendukung.
2. Evaluasi format backup database:
   - opsi A: tetap plain SQL tetapi disiplin dengan transaction-safe restore,
   - opsi B: migrasi ke custom format dan gunakan `pg_restore` untuk kontrol lebih baik.
3. Hapus atau redesign fallback restore programatik yang saat ini tidak atomic.
4. Jika fallback dipertahankan, seluruh proses truncate + import harus berada dalam satu boundary rollback yang benar.
5. Tambahkan pre-restore guard:
   - cek koneksi DB,
   - cek versi schema/metadata backup,
   - cek ketersediaan ruang disk minimum.

Acceptance criteria:

1. Restore gagal tidak meninggalkan database kosong atau setengah pulih.
2. Restore sukses menghasilkan state database yang konsisten.

## Fase 4 - Uploads Restore Safety

Tujuan: mencegah kehilangan file uploads saat restore file gagal.

1. Jangan hapus `uploads` aktif secara langsung sebelum backup lokal sementara dibuat.
2. Terapkan strategi swap:
   - salin current uploads ke temp rollback dir,
   - restore uploads baru ke target baru,
   - baru lakukan replace atomik/seaman mungkin.
3. Jika restore uploads gagal, rollback ke uploads sebelumnya.
4. Catat jumlah file dan ukuran total sebelum/sesudah restore sebagai sanity check.

Acceptance criteria:

1. Gagal restore uploads tidak menghilangkan uploads lama secara permanen.
2. Ada jalur rollback file yang eksplisit.

## Fase 5 - Integrity Verification

Tujuan: memastikan backup yang tersimpan benar-benar layak dipulihkan.

1. Tambahkan manifest backup:
   - checksum `database.sql`,
   - checksum folder/file penting uploads,
   - versi schema,
   - timestamp,
   - generator version.
2. Simpan metadata integritas di `metadata.json`.
3. Saat verify cron, jangan hanya cek nama file:
   - validasi struktur ZIP,
   - validasi checksum,
   - validasi metadata minimum.
4. Tambahkan periodic restore drill ke environment non-produksi jika memungkinkan.

Acceptance criteria:

1. Backup korup dapat dideteksi tanpa harus restore ke produksi.
2. Backup verification menjadi lebih dari sekadar existence check.

## Fase 6 - Access Control dan Operational Guardrails

Tujuan: membatasi restore hanya ke aktor dan alur yang tepat.

1. Pertimbangkan menghapus endpoint restore publik dari panel aplikasi utama.
2. Jika endpoint tetap ada, tambahkan guard tambahan:
   - step-up authentication,
   - confirmation token sekali pakai,
   - alasan restore wajib diisi,
   - optional dual approval untuk produksi.
3. Tambahkan audit log terstruktur:
   - siapa,
   - kapan,
   - backup mana,
   - tipe restore,
   - alasan,
   - hasil sukses/gagal.
4. Pisahkan izin `backup.manage` dan `restore.manage` agar restore tidak otomatis ikut terbuka ke semua pemilik backup.

Acceptance criteria:

1. Restore tidak lagi menjadi operasi satu-klik biasa.
2. Jejak audit restore cukup untuk investigasi insiden.

## Fase 7 - Dokumentasi dan SOP

Tujuan: membuat prosedur restore operasional jelas dan aman.

1. Bersihkan semua contoh credential/IP sensitif dari `docs/RESTORE.md`.
2. Ubah contoh menjadi placeholder environment-based.
3. Tambahkan SOP restore resmi:
   - kapan restore boleh dilakukan,
   - siapa yang menyetujui,
   - checklist pra-restore,
   - checklist pasca-restore,
   - langkah rollback,
   - verifikasi aplikasi pasca restore.
4. Tambahkan catatan tegas bahwa restore produksi harus diuji dahulu di staging jika backup berasal dari sumber yang tidak rutin.

Acceptance criteria:

1. Tidak ada credential sensitif di dokumen repo.
2. SOP restore bisa dipakai operator tanpa improvisasi berbahaya.

## Fase 8 - Testing dan Validasi

Tujuan: membuktikan flow restore aman secara teknis, bukan sekadar compile.

1. Tambahkan unit/integration test untuk:
   - reject path traversal ZIP,
   - reject invalid structure ZIP,
   - reject oversized extraction,
   - restore gagal pada SQL invalid,
   - rollback saat restore gagal,
   - restore uploads berhasil,
   - cleanup temp dir saat exception.
2. Tambahkan smoke test end-to-end:
   - buat backup,
   - ubah data,
   - restore,
   - verifikasi data kembali.
3. Tambahkan test khusus mismatch schema version.
4. Tambahkan test untuk audit log restore.

Acceptance criteria:

1. Jalur restore memiliki coverage nyata untuk sukses dan gagal.
2. Passing test menjadi sinyal yang lebih bisa dipercaya.

## Prioritas Eksekusi

### P0

1. Matikan restore aktif dari UI produksi.
2. Amankan ekstraksi ZIP dari path traversal.
3. Perbaiki restore DB agar atomic/fail-fast.

### P1

1. Tambahkan staging area upload backup.
2. Tambahkan checksum dan metadata verification.
3. Tambahkan rollback aman untuk uploads.
4. Pisahkan permission `restore.manage`.

### P2

1. Perkuat SOP operasional.
2. Tambahkan restore drill non-produksi.
3. Evaluasi migrasi dari plain SQL ke format backup yang lebih kuat.

## Deliverables

1. Kode hardening backup/restore di backend.
2. UI yang tidak lagi menyesatkan soal restore.
3. Dokumentasi restore yang aman dan konsisten.
4. Test suite restore yang mencakup skenario sukses dan gagal.
5. Audit logging restore yang lebih lengkap.

## Rekomendasi Eksekusi Praktis

Urutan implementasi yang paling aman:

1. Fase 1
2. Fase 2
3. Fase 3
4. Fase 4
5. Fase 5
6. Fase 7
7. Fase 8
8. Fase 6 diselesaikan paralel saat keputusan operasional/otorisasi sudah disepakati

## Catatan

Selama atomic restore penuh belum benar-benar terjamin, fitur restore sebaiknya diperlakukan sebagai prosedur administratif terbatas, bukan fitur aplikasi reguler.
