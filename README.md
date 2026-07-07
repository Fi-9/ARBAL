# ARBAL — Sistem Manajemen Kearsipan Siswa (PKBM)

ARBAL adalah aplikasi manajemen data dan kearsipan dokumen siswa tingkat sekolah/PKBM dengan arsitektur modern berkelas produksi. Sistem ini terintegrasi dengan teknologi OCR (Optical Character Recognition) untuk mengekstraksi data Kartu Keluarga (KK) dan KTP secara otomatis.

---

## 🏗️ Arsitektur Sistem

ARBAL dirancang dengan pola modular dan terpisah untuk menjamin skalabilitas, keamanan data pribadi (PII), serta performa yang optimal.

```
       [ Browser / Client ]
                │ (React 19 / TypeScript)
                ▼
        [ NestJS API Gateway ]
         │      │          │
         │      │          ▼
         │      │   [ PostgreSQL DB (Prisma) ]
         │      ▼
         │   [ Local File Storage ] (Abstraksi StorageProvider)
         ▼
[ Python OCR Microservice ] (PaddleOCR & Gemini)
```

1. **Frontend (Vite / React 19)**:
   * Menggunakan TypeScript, Tailwind CSS v4, Zustand (state management), dan React Query untuk caching.
   * Dilengkapi fitur multi-step form registrasi, visualisasi kelengkapan berkas, manajemen sampah dengan pembersihan otomatis 30 hari, serta pembatasan hak akses berbasis peran (RBAC) secara penuh di antarmuka.

2. **Backend (NestJS)**:
   * Menggunakan NestJS, TypeScript, dan Prisma ORM dengan database PostgreSQL.
   * Mengimplementasikan autentikasi JWT ganda (Access & Refresh Token) dengan RBAC ketat (peran `SUPER_ADMIN` dan `GURU`). Izin akses peran `GURU` dibatasi hanya untuk membaca dan mengunduh berkas (*read-only* + *download*).
   * Dilengkapi scheduler otomatis (cron jobs) untuk backup berkas/database harian, sinkronisasi Google Sheets/Drive secara aman, dan penghapusan otomatis sampah siswa berusia lebih dari 30 hari.

3. **OCR Microservice (Python / FastAPI)**:
   * Menggunakan FastAPI untuk memproses dokumen gambar (JPG, PNG) atau PDF secara independen dari beban kerja CRUD backend utama.
   * Ekstraksi teks menggunakan **PaddleOCR** secara lokal (offline fallback) atau **Google Gemini AI API** (online parser) jika kunci API tersedia.

---

## 🛠️ Langkah Menjalankan Aplikasi Secara Lokal

### Prasyarat
* Node.js v18 atau v20+
* PostgreSQL v14+
* Python v3.9+ (dengan `pip` dan `virtualenv`)
* Google Chrome atau browser modern lainnya

---

### Langkah 1: Konfigurasi Database & Environment Root

1. Buat database PostgreSQL baru di server lokal Anda (misalnya dengan nama `arbal_db`).
2. Salin berkas `.env.example` di root project menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
3. Sesuaikan isi berkas `.env` dengan konfigurasi lokal Anda:
   * `DATABASE_URL`: URL koneksi PostgreSQL Anda.
   * `JWT_SECRET` & `JWT_REFRESH_SECRET`: Kunci enkripsi JWT (buat token acak menggunakan node command di petunjuk berkas).
   * `OCR_SERVICE_URL`: Biasanya `http://localhost:8000`.
   * `OCR_INTERNAL_TOKEN`: Kunci otorisasi internal antara backend dan OCR.
   * *(Opsional)* `GEMINI_API_KEY`: Kunci API Google AI jika ingin menggunakan parser AI untuk ekstraksi dokumen.

---

### Langkah 2: Migrasi Skema Database

Jalankan perintah berikut di root directory untuk menerapkan skema database dan membuat tabel awal:
```bash
npx prisma migrate dev
```
*(Opsional)* Anda dapat menjalankan seed data awal dengan script yang tersedia di folder `scripts/` (misal: `node scripts/seed-sprint2.mjs` untuk membuat akun administrator awal).

---

### Langkah 3: Menjalankan Backend (NestJS)

1. Masuk ke direktori `backend/`:
   ```bash
   cd backend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server dalam mode pengembangan:
   ```bash
   npm run dev
   ```
   Server backend akan aktif di `http://localhost:3001`.

---

### Langkah 4: Menjalankan Frontend (Vite / React)

1. Buka terminal baru di root directory project.
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan Vite:
   ```bash
   npm run dev
   ```
   Aplikasi frontend dapat diakses melalui browser di `http://localhost:3000`.

---

### Langkah 5: Menjalankan OCR Microservice (Python)

1. Masuk ke direktori `ocr-service/`:
   ```bash
   cd ocr-service
   ```
2. Buat dan aktifkan virtual environment Python:
   * **Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   * **macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Instal pustaka yang dibutuhkan:
   ```bash
   pip install -r requirements.txt
   ```
4. Salin berkas `.env.example` menjadi `.env` dan sesuaikan port/CORS jika diperlukan.
5. Jalankan server OCR:
   ```bash
   python app.py
   ```
   Layanan OCR akan berjalan di `http://localhost:8000`.

---

## 🔑 Variabel Lingkungan (Environment Variables)

### Root / Backend `.env`

| Variabel | Deskripsi | Wajib / Opsional |
| --- | --- | --- |
| `DATABASE_URL` | URL PostgreSQL koneksi. | **Wajib** |
| `JWT_SECRET` | Kunci tanda tangan JWT Access Token. | **Wajib** |
| `JWT_REFRESH_SECRET` | Kunci tanda tangan JWT Refresh Token. | **Wajib** |
| `PORT` | Port backend utama (Default: 3001). | Opsional |
| `NODE_ENV` | Mode server (`development`/`production`). | Opsional |
| `OCR_SERVICE_URL` | URL endpoint layanan Python OCR. | **Wajib** (jika menggunakan OCR) |
| `OCR_INTERNAL_TOKEN` | Token keamanan internal backend-to-OCR. | **Wajib** (jika menggunakan OCR) |
| `GEMINI_API_KEY` | Google AI API Key untuk parser OCR berbasis Gemini. | Opsional |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON kredensial Google Service Account untuk sync sheets/drive. | Opsional |
| `GOOGLE_DRIVE_FOLDER_ID` | Folder ID tujuan backup zip di Google Drive. | Opsional |

---

## 🔒 Catatan Keamanan & Operasional Kerja

### 1. Manajemen Kredensial Sensitif
* **Jangan Pernah Mengirimkan Berkas `.env` Ke Git**: Berkas `.env` telah dikonfigurasi di `.gitignore` untuk mencegah kebocoran credentials.
* **Perbarui Default Password**: Akun administratif default yang dibuat melalui script seeding harus segera diganti password-nya pada login pertama.

### 2. Jalur Penyimpanan Berkas (Storage Path)
* Berkas dokumen siswa yang diunggah disimpan di folder `/uploads` pada root direktori project (jika menggunakan `LocalStorageProvider`).
* Folder `/uploads` dan `/backups` otomatis diabaikan oleh Git via `.gitignore` untuk menjaga kerahasiaan berkas nyata di server pengembangan.
* Arsitektur backend menggunakan abstraksi `StorageProvider` interface, sehingga dapat dengan mudah dimigrasikan ke MinIO atau AWS S3 dengan mengganti provider di `documents.module.ts`.

### 3. Keamanan Restorasi Backup
* **PENTING**: Melakukan pemulihan data (*restore*) dari berkas cadangan ZIP akan **MENGGANTI secara permanen** database PostgreSQL aktif dan menghapus direktori berkas `/uploads` saat ini dengan data yang ada di dalam ZIP.
* Pastikan untuk melakukan backup manual tambahan sebelum melakukan restore data di lingkungan produksi.
* Endpoint HTTP restore dinonaktifkan secara default melalui `ALLOW_BACKUP_RESTORE=false`. Prosedur restore sebaiknya dijalankan lewat CLI/SOP administratif selama maintenance window yang terkontrol.
* Sebelum arsip ZIP diizinkan diproses restore, backend kini memverifikasi struktur entry, menolak path traversal, dan membatasi total ukuran ekstraksi.
* Restore database kini mengandalkan `psql` dengan mode fail-fast (`ON_ERROR_STOP`) dan single transaction. Fallback restore programatik dinonaktifkan untuk mencegah state database setengah pulih.
* Restore `uploads` kini memakai snapshot rollback sementara: backend menyiapkan kandidat restore dan snapshot `uploads` aktif terlebih dahulu, lalu mengembalikan snapshot lama jika copy akhir gagal.
* Backup baru kini membawa `manifest.json` berisi checksum SHA-256 untuk `database.sql`, `metadata.json`, `README.txt`, dan berkas `uploads/*` sehingga verifikasi backup dapat mendeteksi korupsi atau mismatch isi sebelum restore dipakai.
* SOP operasional restore ada di [docs/RESTORE_SOP.md](/C:/Users/renre/Downloads/ARBAL/docs/RESTORE_SOP.md:1).
* Smoke test guard restore tersedia lewat `npm run test:restore-guards` dari root project.

### 4. Batasan Akses Guru
* Hak akses `GURU` dibatasi ketat pada backend gateway (`jwt.strategy.ts`) dan frontend UI. Setiap panggilan API mutasi (unggah, hapus, tambah, atau konfigurasi) oleh token pengguna dengan peran Guru akan ditolak dengan respons HTTP `403 Forbidden`.

---

## 🚀 Deploy Produksi Saat Ini

Rekomendasi deploy ARBAL saat ini:

1. `frontend` React dibangun menjadi static site dan dilayani container Nginx internal.
2. `backend` NestJS berjalan di port internal `3001`.
3. `db` PostgreSQL berjalan di jaringan internal Docker.
4. Domain publik yang dipakai adalah `https://arsip.insanmustaqbal.or.id`.
5. Reverse proxy publik dikelola oleh **Zoraxy**, bukan langsung oleh proxy bawaan Coolify.

### Pola Reverse Proxy yang Disarankan

Browser sebaiknya hanya mengenal **satu origin publik**:

* `https://arsip.insanmustaqbal.or.id` → diarahkan oleh Zoraxy ke service `frontend`
* request `/api/*` dari origin yang sama → diteruskan oleh Nginx frontend ke service `backend:3001`

Dengan pola ini:

* `VITE_API_BASE_URL` cukup tetap `/api/v1`
* cookie `refreshToken` tetap bekerja dengan `withCredentials: true`
* CORS menjadi lebih sederhana karena frontend dan API terlihat sebagai satu origin dari sisi browser

### Nilai Environment Produksi yang Penting

Set minimal nilai berikut saat deploy:

```env
APP_URL=https://arsip.insanmustaqbal.or.id
CORS_ORIGINS=https://arsip.insanmustaqbal.or.id
NODE_ENV=production
PORT=3001
JWT_SECRET=<secret-random-panjang>
JWT_REFRESH_SECRET=<secret-random-panjang-berbeda>
DATABASE_URL=postgresql://<user>:<password>@db:5432/<db_name>
```

### Catatan Zoraxy

Di Zoraxy, arahkan virtual host/domain `arsip.insanmustaqbal.or.id` ke service frontend yang membuka HTTP internal di port `3000` pada host Docker. Tidak perlu mengekspos PostgreSQL ke publik, dan backend juga sebaiknya tetap hanya dapat diakses dari jaringan internal stack.
