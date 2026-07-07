# SOP Restore ARBAL

## Tujuan

Dokumen ini menjadi prosedur operasional standar untuk pemulihan data ARBAL dari backup ZIP secara terkendali, aman, dan dapat diaudit.

## Kapan Restore Boleh Dilakukan

Restore hanya boleh dilakukan jika salah satu kondisi berikut terpenuhi:

1. Terjadi korupsi data produksi yang sudah diverifikasi.
2. Terjadi kehilangan data akibat kesalahan operasional, deploy, atau infrastruktur.
3. Diperlukan rollback terkontrol ke snapshot backup tertentu setelah insiden.
4. Dilakukan drill pemulihan resmi di environment non-produksi.

Restore tidak boleh dilakukan untuk:

1. Percobaan biasa tanpa tiket insiden atau alasan yang terdokumentasi.
2. Menimpa environment aktif tanpa backup tambahan.
3. Menjalankan eksperimen data langsung di produksi.

## Peran dan Otorisasi

1. Operator restore harus memiliki izin `restore.manage`.
2. Restore produksi harus disetujui minimal oleh:
   - penanggung jawab aplikasi, dan
   - penanggung jawab operasional/infrastruktur.
3. Alasan restore wajib dicatat secara eksplisit pada tiket insiden atau change record.

## Checklist Pra-Restore

1. Catat nomor tiket insiden / change request.
2. Catat alasan restore secara singkat dan spesifik.
3. Verifikasi backup target:
   - nama file benar,
   - checksum/manifest lolos,
   - metadata backup sesuai,
   - backup berasal dari sumber terpercaya.
4. Buat backup tambahan terbaru sebelum restore.
5. Verifikasi ruang disk cukup untuk:
   - ekstraksi backup,
   - rollback snapshot `uploads`,
   - operasi PostgreSQL sementara.
6. Konfirmasi environment target:
   - `DATABASE_URL` benar,
   - `ALLOW_BACKUP_RESTORE` hanya diaktifkan bila memang diperlukan,
   - aplikasi masuk maintenance window jika restore dilakukan di produksi.
7. Beri notifikasi ke stakeholder yang terdampak.

## Prosedur Restore Produksi

1. Aktifkan maintenance window.
2. Simpan backup tambahan paling baru.
3. Jalankan verifikasi backup target.
4. Jalankan restore database menggunakan `psql` fail-fast dan single transaction.
5. Jalankan restore `uploads` dengan snapshot rollback.
6. Pastikan audit log restore tercatat lengkap.
7. Nonaktifkan kembali akses restore HTTP jika sempat diaktifkan sementara.

## Checklist Pasca-Restore

1. Login aplikasi berhasil.
2. Halaman dashboard dapat dimuat.
3. Data siswa inti dapat dibuka.
4. Dokumen sampel dapat diunduh.
5. Record count minimum sesuai ekspektasi.
6. `uploads` tersedia dan ukuran total masuk akal.
7. Tidak ada error restore tertinggal di log aplikasi.
8. Audit log berisi:
   - aktor,
   - waktu,
   - file backup,
   - alasan restore,
   - hasil operasi.

## Rollback Jika Restore Gagal

1. Jika restore database gagal atomik, hentikan proses dan investigasi.
2. Jika restore `uploads` gagal, sistem harus mengembalikan snapshot rollback lama.
3. Jika rollback otomatis gagal, jangan lanjutkan operasi user-facing.
4. Eskalasi segera ke owner aplikasi dan owner infrastruktur.

## Verifikasi Non-Produksi / Drill

1. Pilih backup yang representatif.
2. Restore ke environment staging.
3. Jalankan smoke test pasca-restore.
4. Catat hasil drill:
   - durasi restore,
   - error yang muncul,
   - langkah manual tambahan,
   - keputusan perbaikan.

## Evidence Minimal yang Harus Disimpan

1. Nama backup yang dipakai.
2. Timestamp operasi.
3. Operator yang menjalankan restore.
4. Alasan restore.
5. Hasil verifikasi backup.
6. Hasil smoke test pasca-restore.
7. Status sukses/gagal.

## Catatan Operasional

1. Endpoint restore HTTP harus tetap `disabled by default`.
2. Restore dari panel UI reguler tidak boleh diaktifkan untuk pengguna umum.
3. Jika restore HTTP dibuka sementara untuk maintenance, tutup kembali segera setelah operasi selesai.
