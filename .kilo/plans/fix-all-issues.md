# Plan: Perbaikan ARBAL — Prioritas Operasional PKBM

## Filosofi

ARBAL adalah **alat kerja Staff TU sekolah**, bukan SaaS. Prioritas utama:
1. Data siswa bisa disimpan dan diakses
2. Dokumen aman dan bisa dikelola
3. Backup berjalan dan bisa di-restore
4. Role & permission berfungsi benar
5. Audit trail jelas

Engineering excellence (Docker, CI/CD, queue) adalah bonus — bukan blocking.

---

## Fase 1: Operasional Inti (WAJIB)

**Target: Sistem benar-benar bisa dipakai TU untuk input dan kelola data siswa.**

---

### 1.1 Fix Data Siswa Tidak Tersimpan

**Prioritas:** KRITIS — tanpa ini ARBAL tidak bisa dipakai sama sekali.

**Diagnosa:**
```
[ ] Test POST /api/v1/students → cek response 200/201 atau error
[ ] Cek payload yang dikirim frontend (StudentFormView.tsx)
[ ] Cek CreateStudentDto backend — field mana yang required
[ ] Cek academicYearId — wajib di schema tapi mungkin tidak dikirim frontend
[ ] Cek Guardian nested create — apakah transaction gagal silent
[ ] Cek unique constraint NIS/NISN/PPDB — apakah conflict menyebabkan 500
[ ] Cek Prisma error log — enable query logging sementara
[ ] Cek soft-delete filter di findAll() — data tersimpan tapi tidak muncul?
```

**Fix yang diperlukan:**
```
[ ] Tambahkan where: { deletedAt: null } di findAll()
[ ] Fix route ordering: pindahkan static routes di atas :id
[ ] Pastikan academicYearId terisi (default ke tahun aktif jika kosong)
[ ] Tambahkan proper error response (bukan generic 500)
[ ] Fix deleteStudent undefined di App.tsx (runtime crash)
```

**Acceptance:** Staff TU bisa input siswa baru → data muncul di daftar → bisa edit → bisa hapus.

---

### 1.2 Upload Dokumen End-to-End

**Target:** Semua tipe dokumen bisa diupload, tersimpan, dan diakses kembali.

**Test flow:**
```
Upload file
  ↓
Record tersimpan di DB (Document model)
  ↓
File tersimpan di storage (uploads/)
  ↓
Preview bisa ditampilkan
  ↓
Download berfungsi
  ↓
Versioning: upload ulang = versi baru, versi lama tetap ada
```

**Test semua tipe dokumen:**
```
[ ] KK (Kartu Keluarga)
[ ] Akta Kelahiran
[ ] Rapor
[ ] Ijazah Terakhir
[ ] KTP Ayah
[ ] KTP Ibu
[ ] Sertifikat
[ ] Dokumen Pendukung lainnya
```

**Fix yang diperlukan:**
```
[ ] Pastikan uploads/ directory ada dan writable
[ ] Fix Document query — filter deletedAt: null
[ ] Pastikan file path konsisten (jangan relative ke dist/)
[ ] Validasi file type dan size di backend (bukan hanya frontend)
[ ] Test concurrent upload (multiple files sekaligus)
```

**Acceptance:** Upload KK → muncul di daftar dokumen siswa → bisa preview → bisa download → upload ulang = versi 2.

---

### 1.3 User Management API

**Target:** Super Admin bisa kelola akun pengguna sistem.

**Endpoint yang harus ada:**
```
[ ] POST   /api/v1/users          — Buat akun baru
[ ] GET    /api/v1/users          — List semua user
[ ] GET    /api/v1/users/:id      — Detail user
[ ] PATCH  /api/v1/users/:id      — Edit user (nama, email, role)
[ ] DELETE /api/v1/users/:id      — Soft-delete / disable akun
[ ] POST   /api/v1/users/:id/reset-password — Reset password
```

**Cek status saat ini:**
```
[ ] Apakah UsersModule sudah ada di backend?
[ ] Apakah ada UsersController & UsersService?
[ ] Apakah frontend punya UI untuk manage users?
[ ] Jika belum ada, buat dari scratch
```

**Business rules:**
```
[ ] Hanya Super Admin yang bisa CRUD user
[ ] Password di-hash dengan bcrypt
[ ] Tidak bisa delete diri sendiri
[ ] Tidak bisa downgrade role diri sendiri
[ ] Reset password generate temporary password (atau force change on login)
```

**Acceptance:** Super Admin login → buka menu User Management → buat akun Staff TU → Staff TU bisa login.

---

### 1.4 Role & Permission QA

**Target:** Setiap role hanya bisa akses sesuai matrix.

**Permission Matrix:**

| Aksi | Super Admin | Staff TU | Guru | Kepala Sekolah |
|------|:-----------:|:--------:|:----:|:--------------:|
| CRUD Siswa | v | v | - | - |
| Upload Dokumen | v | v | - | - |
| Lihat Siswa | v | v | v | v |
| Lihat Dokumen | v | v | v | v |
| Download Dokumen | v | v | - | v |
| CRUD User | v | - | - | - |
| Dashboard | v | v | - | v |
| Export Data | v | v | - | v |
| Audit Log | v | - | - | v |
| Backup/Restore | v | - | - | - |
| Trash (Restore/Delete) | v | v | - | - |

**Test checklist:**
```
[ ] Login sebagai setiap role
[ ] Coba akses endpoint yang tidak diizinkan → harus 403
[ ] Cek frontend menyembunyikan menu yang tidak diizinkan
[ ] Cek PermissionsGuard berfungsi di semua controller
[ ] Cek edge case: token expired → redirect login (bukan blank page)
```

**Fix yang diperlukan:**
```
[ ] Tambahkan @Permissions() pada endpoint yang belum ada guard
[ ] Activity Log POST — hapus atau restrict ke internal only
[ ] Frontend: conditional render menu berdasarkan role
```

**Acceptance:** Guru login → hanya bisa lihat data → tidak bisa edit/hapus → menu CRUD tidak muncul.

---

## Fase 2: Keamanan & Backup

**Target: Data aman, bisa di-backup, bisa di-restore.**

---

### 2.5 Backup + Restore

**Prinsip:** Backup tanpa restore = belum backup.

**Implementasi:**
```
[ ] Cek BackupModule yang sudah ada — apakah fungsional?
[ ] Test backup ke Google Drive (jika configured)
[ ] Implementasi local backup sebagai fallback:
    - pg_dump database
    - Copy uploads/ directory
    - Bundle ke single archive (.tar.gz)
[ ] Implementasi restore:
    - Upload archive
    - Restore database dari dump
    - Restore files
    - Verify data integrity
```

**Test full cycle:**
```
[ ] Buat data dummy (5 siswa + dokumen)
[ ] Jalankan backup
[ ] Hapus semua data
[ ] Jalankan restore
[ ] Verifikasi: semua 5 siswa + dokumen kembali
```

**Schedule:**
```
[ ] Auto backup harian (jam 00:00)
[ ] Retain 7 hari terakhir
[ ] Notifikasi jika backup gagal
```

**Acceptance:** Backup → hapus data → restore → data kembali utuh.

---

### 2.6 Security Hardening

**Yang benar-benar penting untuk sekolah:**

```
[ ] Private document access — dokumen hanya bisa diakses user yang authorized
    - Endpoint download harus cek permission
    - Jangan serve static files langsung dari uploads/
    - Gunakan signed URL atau stream melalui backend

[ ] Secure cookie untuk refresh token
    - httpOnly: true
    - secure: true (production)
    - sameSite: 'strict'
    - path: '/api/v1/auth/refresh'

[ ] Refresh token rotation
    - Verify family-based rotation sudah berfungsi
    - Test: reuse old refresh token → invalidate seluruh family

[ ] Remove secrets dari codebase
    - Pastikan .env tidak ter-commit
    - Ganti JWT_SECRET ke strong random (min 64 chars)
    - Rotate database password

[ ] Rate limiting pada login
    - Max 5 attempts per IP per menit
    - Lockout 15 menit setelah 10 failed attempts

[ ] Validasi file upload
    - Whitelist extension: .jpg, .jpeg, .png, .pdf
    - Max size: 10MB
    - Validate magic bytes (bukan hanya content-type header)
```

**Acceptance:** Dokumen siswa tidak bisa diakses tanpa login → brute force login di-block → refresh token aman.

---

### 2.7 Audit Log UI

**Backend sudah ada. Frontend perlu menampilkan:**

```
[ ] Tabel audit log dengan kolom:
    - Siapa (nama user + role)
    - Kapan (timestamp, format Indonesia)
    - Aksi (create/update/delete)
    - Target (siswa/dokumen/user yang diubah)
    - Detail perubahan (before → after) — expandable row

[ ] Filter:
    - Rentang tanggal (default: 1 bulan terakhir)
    - Tipe aksi
    - User

[ ] Pagination (20 per halaman)

[ ] Hanya Super Admin dan Kepala Sekolah yang bisa akses
```

**Acceptance:** Kepala Sekolah bisa lihat siapa yang edit data siswa X kemarin.

---

## Fase 3: Fitur Operasional Sekolah

**Target: Fitur yang mendukung workflow harian dan akreditasi.**

---

### 3.8 Dashboard Real API

**Pastikan bukan mock data.**

**Metrik yang harus real:**
```
[ ] Total siswa aktif
[ ] Total alumni
[ ] Distribusi per jurusan (pie/bar chart)
[ ] Distribusi per angkatan/kelas
[ ] Kelengkapan berkas (% siswa dengan dokumen lengkap)
[ ] Siswa baru bulan ini
[ ] Dokumen pending verifikasi
```

**Cek:**
```
[ ] GET /api/v1/dashboard/stats — return real data dari DB
[ ] Frontend DashboardView.tsx — consume real API (bukan mockData.ts)
[ ] Chart library (Recharts) render data yang benar
```

**Acceptance:** Dashboard menampilkan angka yang sesuai dengan data di database.

---

### 3.9 Global Search + Pagination

**User harus bisa cari siswa dengan cepat.**

**Search fields:**
```
[ ] Nama lengkap (partial match, case-insensitive)
[ ] NIS
[ ] NISN
[ ] No. PPDB
[ ] NIK
[ ] Nama orang tua/wali
```

**Implementasi:**
```
[ ] Backend: GET /api/v1/students?search=keyword&page=1&limit=20
[ ] Prisma: OR query dengan contains/insensitive
[ ] Frontend: search input dengan debounce 300ms
[ ] Pagination controls (prev/next + page numbers)
[ ] Show total results count
```

**Acceptance:** Ketik "Ahmad" → muncul semua siswa bernama Ahmad → pagination berfungsi.

---

### 3.10 Export Data

**Penting untuk akreditasi dan laporan.**

**Format:**
```
[ ] Excel (.xlsx) — untuk olah data
[ ] CSV — untuk import ke sistem lain
[ ] PDF — untuk cetak dan arsip fisik
```

**Data yang bisa di-export:**
```
[ ] Daftar siswa (dengan filter: kelas, jurusan, angkatan, status)
[ ] Rekap kelengkapan berkas
[ ] Laporan per siswa (biodata + daftar dokumen)
```

**Implementasi:**
```
[ ] Backend: GET /api/v1/students/export?format=xlsx&filter=...
[ ] ExcelJS sudah ter-install — gunakan untuk .xlsx
[ ] Tambahkan library PDF (pdfkit atau puppeteer)
[ ] CSV: simple stream response
[ ] Frontend: tombol "Export" di StudentDirectoryView
```

**Acceptance:** Klik Export Excel → download file → buka di Excel → data benar dan rapi.

---

### 3.11 Trash Bin UI

**Backend sudah ada (soft-delete). Frontend perlu UI.**

```
[ ] Halaman "Sampah" / "Trash" accessible dari sidebar
[ ] List siswa/dokumen yang sudah dihapus
[ ] Tombol "Restore" — kembalikan ke active
[ ] Tombol "Hapus Permanen" — dengan konfirmasi ganda
[ ] Auto-purge setelah 30 hari (optional, via cron)
[ ] Hanya Super Admin dan Staff TU yang bisa akses
```

**Fix backend:**
```
[ ] Fix route ordering: GET /students/trash harus di atas GET /students/:id
[ ] Endpoint restore: PATCH /students/:id/restore
[ ] Endpoint permanent delete: DELETE /students/:id/permanent
```

**Acceptance:** Hapus siswa → muncul di Trash → klik Restore → siswa kembali ke daftar aktif.

---

## Fase 4: Engineering Improvements (SETELAH Fase 1-3 Selesai)

**Ini penting tapi TIDAK blocking operasional.**

### 4.1 Code Quality
```
[ ] Ganti window.__arbalFlushUploads dengan React Context
[ ] Fix useEffect dependency arrays
[ ] Refactor StudentFormView (30+ useState → react-hook-form)
[ ] Ganti Math.random() dengan crypto.randomUUID()
[ ] Fix file deletion order (setelah transaction commit)
[ ] Type safety: ganti `any` dengan proper types
```

### 4.2 Database Optimization
```
[ ] Tambahkan missing indexes (academicYearId, uploadedById, dll)
[ ] Enum validation pada DTO (StudentStatus)
[ ] Jangan izinkan client set ID
```

### 4.3 DevOps
```
[ ] Dockerfile untuk backend
[ ] docker-compose.yml (postgres + backend + frontend + ocr)
[ ] Health check endpoint
[ ] Structured logging (Pino)
[ ] Environment validation (ConfigModule + Joi)
```

### 4.4 Advanced
```
[ ] CI/CD pipeline (GitHub Actions)
[ ] Message queue untuk OCR (BullMQ)
[ ] Redis caching
[ ] API Gateway
```

---

## Timeline Eksekusi

```
Minggu 1: Fase 1 — Operasional Inti
  ├── Day 1-2: 1.1 Fix data siswa (diagnosa + fix)
  ├── Day 3:   1.2 Upload dokumen end-to-end
  ├── Day 4:   1.3 User Management API
  └── Day 5:   1.4 Role & Permission QA

Minggu 2: Fase 2 — Keamanan & Backup
  ├── Day 1-2: 2.5 Backup + Restore
  ├── Day 3-4: 2.6 Security hardening
  └── Day 5:   2.7 Audit Log UI

Minggu 3: Fase 3 — Fitur Operasional
  ├── Day 1:   3.8 Dashboard real API
  ├── Day 2-3: 3.9 Global Search + Pagination
  ├── Day 4:   3.10 Export (Excel, CSV, PDF)
  └── Day 5:   3.11 Trash Bin UI

Minggu 4+: Fase 4 — Engineering (ongoing, non-blocking)
```

---

## Definition of Done (Per Fase)

### Fase 1 Done = Sistem Bisa Dipakai
- [ ] Staff TU bisa login
- [ ] Input siswa baru → data tersimpan → muncul di daftar
- [ ] Upload dokumen → tersimpan → bisa diakses
- [ ] Super Admin bisa buat akun baru
- [ ] Setiap role hanya bisa akses sesuai permission

### Fase 2 Done = Data Aman
- [ ] Backup berjalan → bisa di-restore
- [ ] Dokumen tidak bisa diakses tanpa auth
- [ ] Login brute force di-block
- [ ] Audit log bisa dilihat oleh Kepala Sekolah

### Fase 3 Done = Workflow Lengkap
- [ ] Dashboard menampilkan data real
- [ ] Bisa search siswa dari berbagai field
- [ ] Bisa export untuk akreditasi
- [ ] Trash bin berfungsi (restore + permanent delete)

---

## Catatan untuk Tim

1. **Jangan deploy ke production sebelum Fase 1 selesai**
2. **Test dengan data real** (bukan hanya seed data) — minta sample dari TU
3. **Libatkan Staff TU dalam UAT** setelah setiap fase selesai
4. **Backup database** sebelum setiap migration
5. **Dokumentasikan** setiap perubahan API (breaking changes)
