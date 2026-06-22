# ARBAL Audit Remediation Plan

## Tujuan

Dokumen ini merangkum rencana perbaikan untuk temuan audit kritis pada project ARBAL. Fokus utamanya adalah:

1. Menutup jalur penyalahgunaan yang dapat merusak integritas sistem atau membocorkan data sensitif.
2. Menyelaraskan perilaku aplikasi dengan klaim UI dan dokumentasi.
3. Menurunkan risiko operasional sebelum menambah fitur baru.

## Prinsip Eksekusi

- Kerjakan dari permukaan serangan tertinggi lebih dulu.
- Utamakan source-of-truth di backend, bukan pembatasan UI.
- Hindari perubahan besar sekaligus pada area yang sedang aktif berubah di worktree.
- Setiap fase harus punya bukti verifikasi teknis, bukan hanya asumsi.

## Ringkasan Prioritas

| Priority | Area | Risiko Utama | Target Hasil |
| --- | --- | --- | --- |
| P0 | Backup/restore command safety | RCE, path traversal, destructive file access | Semua operasi backup tervalidasi path-nya dan tidak membangun shell command raw dari input |
| P0 | Audit log integrity | Pemalsuan jejak audit | Hanya sistem/backend trusted path yang bisa membuat log, actor tidak bisa dipalsukan dari client |
| P0 | RBAC + data minimization | Akses PII berlebihan | Role baca terbatas hanya menerima data yang memang dibutuhkan |
| P1 | Document upload lifecycle | Orphan file, disk abuse | File hanya committed jika DB sukses, cleanup failure path tersedia |
| P1 | Sensitive artifact hygiene | Upload sensitif ikut ter-track | Semua folder runtime sensitif di-ignore dengan benar |
| P1 | Fake integration claims | Operator salah mengira sync/backup eksternal sudah nyata | UI hanya menampilkan fitur nyata atau diberi status eksplisit "simulasi" |
| P2 | Dependency risk | Known vulnerable packages | Paket berisiko utama dipatch/di-upgrade atau dimitigasi eksplisit |
| P2 | Documentation drift | Bootstrap/deploy salah | README sesuai arsitektur aktual repo |

## Fase 0 - Freeze Dan Guardrail

### Tujuan

Mencegah perbaikan keamanan bercampur dengan perubahan fitur lain yang sedang berjalan.

### Langkah

- Petakan file yang sedang aktif diubah user, terutama `backend/src`, `src`, `prisma/schema.prisma`, dan `ocr-service`.
- Hindari refactor non-esensial saat menutup P0.
- Pisahkan pekerjaan remediation per area agar mudah direview dan di-rollback.

### Verifikasi

- Tidak ada revert atas perubahan user yang tidak terkait.
- Daftar file yang disentuh remediation tetap sempit dan terkontrol.

## Fase 1 - Tutup Jalur Eksekusi Berbahaya Pada Backup/Restore

### Masalah

Implementasi backup/restore saat ini masih menyusun command shell dari input dan path yang belum dibatasi secara ketat.

### Langkah Implementasi

1. Validasi `fileName` backup dengan allowlist ketat.
   - Hanya izinkan format nama backup yang memang dihasilkan sistem.
   - Tolak karakter shell metacharacters, separator path, dan traversal sequence.
2. Gunakan `resolve()` dan boundary check.
   - Pastikan target akhir selalu berada di dalam direktori backup yang ditentukan.
   - Terapkan hal yang sama untuk delete, restore extract dir, dan file selection.
3. Kurangi ketergantungan pada raw shell string.
   - Jika tetap perlu memanggil `pg_dump`/`psql`, gunakan argumen yang tervalidasi ketat.
   - Hindari interpolasi langsung dari `DATABASE_URL` atau `fileName` ke command string tanpa sanitasi.
4. Tambahkan pre-flight checks.
   - Verifikasi file backup ada, berekstensi benar, dan berasal dari lokasi yang diizinkan.
   - Verifikasi executable dependency tersedia sebelum operasi dimulai.
5. Tambahkan audit event terstruktur untuk create/restore/delete backup.
   - Simpan actor, file target, outcome, dan error ringkas.

### Verifikasi

- Uji input traversal seperti `../foo.zip`, path absolut, dan nama dengan quote/semicolon harus gagal.
- Uji delete/restore hanya bisa mengakses file di folder backup.
- Uji create/restore/delete backup normal tetap sukses.

## Fase 2 - Kunci Integritas Audit Log

### Masalah

Endpoint log masih memungkinkan client menulis log dengan actor yang dipilih sendiri.

### Langkah Implementasi

1. Ubah model akses pembuatan log.
   - Endpoint publik untuk create log sebaiknya dihapus atau dibatasi keras.
   - Bila endpoint tetap diperlukan, actor harus selalu berasal dari `req.user`, bukan body.
2. Hapus `actorUserId` dari DTO client-facing.
3. Bedakan dua jalur logging.
   - Internal service logging untuk event sistem.
   - User action logging untuk request yang sudah terautentikasi.
4. Batasi permission create log.
   - `logs.view` tidak otomatis berarti `logs.create`.
   - Bila memang perlu, buat permission terpisah.
5. Pastikan event sensitif selalu dihasilkan dari backend action source.
   - Login, logout, reset password, user management, student mutation, document mutation, backup.

### Verifikasi

- User biasa dengan akses log tidak dapat memalsukan actor lain.
- Semua event utama backend tetap tercatat setelah endpoint diperketat.

## Fase 3 - Perketat RBAC Dan Minimasi Data Siswa

### Masalah

Role baca dasar masih menerima terlalu banyak data sensitif, termasuk informasi orang tua dan penanda dokumen.

### Langkah Implementasi

1. Definisikan ulang access matrix backend sebagai source-of-truth.
   - Tentukan secara eksplisit data apa yang boleh dilihat `GURU`, `STAFF_TU`, `KEPALA_SEKOLAH`, `SUPER_ADMIN`.
2. Pisahkan permission antara:
   - `student.read.basic`
   - `student.read.sensitive`
   - `document.read`
   - `guardian.read.sensitive`
3. Kurangi payload endpoint `students`.
   - Untuk role terbatas, jangan sertakan `Guardian`, NIK orang tua, atau metadata dokumen detail.
   - Gunakan DTO response per role atau serializer conditional.
4. Perketat search.
   - Hilangkan pencarian berdasarkan `ktpAyah`/`ktpIbu` untuk role yang tidak berhak.
5. Pastikan UI tidak mengandalkan data sensitif yang seharusnya tidak diterima.
   - Sesuaikan mapper frontend bila response backend dipersempit.

### Verifikasi

- `GURU` tidak lagi bisa melihat PII orang tua bila memang tidak berhak.
- Search role terbatas tidak mengembalikan field sensitif.
- `STAFF_TU` dan `SUPER_ADMIN` tetap bisa menjalankan workflow administratif penuh.

## Fase 4 - Benahi Siklus Upload Dokumen

### Masalah

File fisik ditulis sebelum transaksi database selesai, sehingga kegagalan DB meninggalkan file yatim.

### Langkah Implementasi

1. Balik urutan commit.
   - Pilih pendekatan temp-file lalu finalize setelah DB sukses, atau cleanup file pada setiap failure path.
2. Tambahkan cleanup eksplisit pada exception path setelah write.
3. Pertimbangkan penyimpanan staged.
   - Simpan ke folder sementara lalu rename/move saat record berhasil dibuat.
4. Tambahkan job atau utilitas orphan cleanup.
   - Cocokkan isi folder upload dengan record database.
5. Tambahkan test failure-path untuk upload.

### Verifikasi

- Simulasi FK failure tidak meninggalkan file di storage.
- Upload normal tetap sukses dan file bisa diakses sesudah commit.

## Fase 5 - Rapikan Artefak Sensitif Dan Runtime Storage

### Masalah

Folder runtime sensitif belum di-ignore sesuai lokasi aktual storage.

### Langkah Implementasi

1. Sinkronkan `.gitignore` dengan path runtime nyata.
   - Tambahkan ignore untuk root `uploads/`, `backups/`, temp restore dir, dan artefak runtime lain yang relevan.
2. Pastikan lokasi default storage konsisten.
   - Putuskan satu lokasi resmi untuk uploads dan backup.
3. Tambahkan placeholder file jika perlu untuk menjaga struktur folder kosong.
4. Audit file yang sudah ter-track agar tidak ada PII runtime ikut versioned.

### Verifikasi

- File upload/backup baru tidak muncul di `git status`.
- Struktur runtime tetap jalan pada mesin baru.

## Fase 6 - Selaraskan UI Dengan Fitur Integrasi Nyata

### Masalah

Frontend masih menampilkan keberhasilan sinkronisasi Google Drive/Sheets padahal implementasinya simulasi.

### Opsi Keputusan

#### Opsi A - Nonaktifkan sementara

- Sembunyikan trigger sync/backup eksternal dari UI produksi.
- Tampilkan badge "belum tersedia" atau "segera hadir".

#### Opsi B - Pertahankan tapi jujur

- Biarkan UI tampil, tetapi semua label/status harus eksplisit menyebut simulasi/dev mode.
- Jangan kirim notifikasi sukses seolah operasi nyata terjadi.

#### Opsi C - Implementasikan backend nyata

- Tambahkan endpoint backend untuk sync sheets/drive.
- Pastikan status UI berdasarkan hasil backend, bukan timer lokal.

### Rekomendasi

Mulai dari Opsi A atau B dulu untuk menghilangkan misleading behavior, lalu naik ke Opsi C bila prioritas bisnis memang butuh integrasi nyata.

### Verifikasi

- Operator tidak lagi menerima pesan sukses palsu.
- Dokumentasi dan UI menyebut status integrasi secara akurat.

## Fase 7 - Kurangi Risiko Dependency

### Masalah

Ada dependency dengan advisory aktif, terutama di backend upload stack.

### Langkah Implementasi

1. Prioritaskan package yang menyentuh request boundary:
   - `multer`
   - package Nest yang terpengaruh advisory aktif
   - package Prisma yang punya advisory aktif
2. Review changelog sebelum upgrade mayor.
3. Jika upgrade tidak aman dalam satu langkah, tambahkan mitigasi kompensasi:
   - pembatasan rate
   - pembatasan ukuran request
   - field count/field depth hardening
4. Catat dependency yang belum bisa di-upgrade beserta alasan dan compensating control-nya.

### Verifikasi

- `npm audit --json` turun signifikan pada dependency yang terekspos ke runtime produksi.
- Upload endpoint dan auth flow tetap lolos smoke test sesudah upgrade.

## Fase 8 - Perbarui Dokumentasi Operasional

### Masalah

README root masih tidak sesuai dengan arsitektur aktual proyek.

### Langkah Implementasi

1. Ganti README stub dengan dokumentasi repo nyata.
2. Jelaskan arsitektur:
   - frontend Vite/React
   - backend NestJS
   - PostgreSQL/Prisma
   - OCR microservice Python
3. Tambahkan langkah bootstrap lokal yang benar.
4. Tambahkan environment variables yang wajib vs opsional.
5. Tambahkan catatan keamanan dasar:
   - secret management
   - storage path
   - backup/restore caution

### Verifikasi

- Developer baru bisa bootstrap repo tanpa membaca file lain.
- README tidak lagi mengarahkan ke AI Studio/Gemini flow yang tidak relevan.

## Urutan Implementasi Yang Direkomendasikan

1. Fase 1 - Backup/restore hardening
2. Fase 2 - Audit log integrity
3. Fase 3 - RBAC dan minimasi data
4. Fase 4 - Upload lifecycle
5. Fase 5 - Runtime artifact hygiene
6. Fase 6 - UI sync/backup claim alignment
7. Fase 7 - Dependency remediation
8. Fase 8 - Documentation rewrite

## Checklist Verifikasi Global

- `npm run lint`
- `backend`: `npm test`
- Smoke test auth login, refresh, logout
- Smoke test list student per role
- Smoke test upload document success/failure path
- Smoke test backup create/list/delete/restore with invalid input cases
- Review `git status` untuk memastikan tidak ada artefak sensitif baru yang ikut ter-track

## Catatan Penting

- P0 sebaiknya dikerjakan sebelum fitur baru lain dilanjutkan.
- Jika integrasi Google Drive/Sheets belum benar-benar siap, lebih aman menurunkan klaim UI sekarang daripada mempertahankan perilaku palsu.
- Setelah Fase 1-3 selesai, audit ulang singkat perlu dilakukan untuk memastikan tidak ada celah baru dari perubahan remediation.
