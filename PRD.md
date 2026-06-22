# 📄 Product Requirement Document (PRD)
## ARBAL — Arsip Mustaqbal (PKBM Teknologi Mustaqbal)
**Versi:** 1.0.0  
**Status:** Approved  
**Penulis:** AI Studio Build & Tim Pengembang PKBM Teknologi Mustaqbal  
**Target Platform:** Self-Hosted (Coolify VPS, PostgreSQL + TimescaleDB, Grafana, Google API Integrations)

---

## 👁️ 1. Visi & Tujuan Produk (Product Vision)

### 1.1 Latar Belakang
Pendidikan Kesetaraan dan Non-Formal seperti PKBM (Pusat Kegiatan Belajar Masyarakat) menghadapi tantangan administratif yang tinggi karena mobilitas murid yang fleksibel dan beragamnya latar belakang kependudukan. Dokumen persyaratan (seperti Kartu Keluarga, Akta Kelahiran, Ijazah SMP, dan KTP Orang Tua) seringkali diunggah dalam format fisik tak terorganisir, lambat diverifikasi, serta rentan hilang.

### 1.2 Visi Platform
**ARBAL (Arsip Mustaqbal)** dirancang sebagai platform arsip digital pintar kesiswaan terpusat yang memadukan keandalan penyimpanan awan instan (*Google Cloud/Drive/Sheets*) dengan kecepatan database relasional dan *time-series* lokal. ARBAL mendemokrasikan teknologi pintar kependidikan agar pengelola sekolah dapat mengelola, memindai, mencari, dan memantau dokumen kesiswaan secara instan tanpa biaya lisensi perangkat lunak yang membebangkan.

### 1.3 Tujuan Utama (Core Objectives)
1. **Kecepatan Entri Data**: Meminimalkan entri formulir manual dengan memanfaatkan fitur **Auto-Fill berbasis Multi-Engine OCR (Optical Character Recognition)**.
2. **Kemandirian Infrastruktur**: Memungkinkan deployment sasis mandiri (*Self-Hosted*) menggunakan VPS pribadi di atas orkestrasi **Coolify** guna menjamin kedaulatan data siswa.
3. **Penyimpanan Hibrida Pintar**: Menyimpan metadata terenkripsi di PostgreSQL lokal, sementara berkas fisik diunggah ke Google Drive dan disinkronkan secara real-time ke Google Sheets kementerian.
4. **Audit Log & Pemantauan Kuat**: Melacak setiap tindakan administratif dengan database time-series **TimescaleDB** dan memvisualisasikan keamanan data via **Grafana**.

---

## 🏛️ 2. Arsitektur Komponen & Aliran Data (Architecture)

Sistem ARBAL dibangun di atas arsitektur full-stack modern yang sangat hemat sumber daya:

```
                  +----------------------------------------------+
                  |               USER INTERFACE                 |
                  |   Single-Page Application (React + Vite)     |
                  +----------------------------------------------+
                                         |
                       (API HTTPS / Enkripsi Data Transit)
                                         v
                  +----------------------------------------------+
                  |               BACKEND SERVICE                |
                  |         Express.js App Router (ESM/CJS)      |
                  +----------------------------------------------+
                    /                  |                       \
                   /                   |                        \
 (Local Query)    /     (Google Workspace SDK)            (Local / Cloud OCR)
                 v                     v                          v
+-----------------------+   +----------------------+   +-----------------------+
|     POSTGRESQL DB     |   | GOOGLE CLOUD ENGINE  |   |      OCR ENGINE       |
|  - Extension:         |   |  - Google Drive      |   |  - Local:             |
|    TimescaleDB        |   |    (File Storage)    |   |    Tesseract.js       |
|  - Relational &       |   |  - Google Sheets     |   |  - Cloud:             |
|    Hypertables        |   |    (Instant Sync)    |   |    Gemini API         |
+-----------------------+   +----------------------+   +-----------------------+
```

---

## 🧠 3. Konsep & Alur Kerja OCR (Optical Character Recognition)

Salah satu fitur unik dari ARBAL adalah kemampuan pemindaian otomatis formulir administratif kesiswaan. Guna menghindari dependensi total pada API Cloud berbayar, ARBAL menerapkan **Kombinasi Multi-Engine OCR**:

### 3.1 Pembagian Logika OCR
*   **Dokumen Kompleks (Ijazah, Akta, Rapor)**: Menggunakan kecerdasan buatan dari model kementerian (Gemini API / Gemini-3.1-pro-preview dengan ThinkingLevel.HIGH) untuk mengekstrak data multi-bahasa terstruktur dan tabel nilai rapor.
*   **Dokumen Terstandar Lokal (KTP Ayah & KTP Ibu)**: Menghindari biaya API awan dengan menjalankan **Library Open-Source Lokal (Tesseract.js / EasyOCR)** langsung di server mandiri atau sisi klien untuk mendeteksi NIK, Nama Wali, dan Alasan Alamat secara instan.

### 3.2 Alur Pemrosesan Berkas (OCR Pipeline)

```
[Unggah Gambar KTP / Berkas]
            |
            v
[Prapemrosesan Gambar] (Grayscale, Thresholding Kontras Tinggi via Canvas API)
            |
            v
[OCR Engine Router]
   |---> Jika KTP Orang Tua ---> [Tesseract.js Lokal] ---> Parsing regex NIK & Nama
   |---> Jika Dokumen Akademik -> [Gemini API Gateway] --> Structured Query JSON Output
            |
            v
[Auto-Fill Form State Dispatcher] (Komponen React mengaburkan kolom input yang terisi)
            |
            v
[Manual Review / Reviewer Approval] ---> [Database Save]
```

---

## 📋 4. Spesifikasi Fungsional Fitur (Functional Requirements)

### 4.1 Registrasi & Formulir Siswa Terbimbing (`StudentFormView`)
*   **Tab 1: Identitas Siswa**: Mengelola data nama, NISN, kelas, jurusan, telepon, tanggal lahir, dan alamat.
*   **Tab 2: Orang Tua / Wali**: Mengelola informasi Nama Ayah, Pekerjaan Ayah, KTP Ayah, Nama Ibu, Pekerjaan Ibu, KTP Ibu, dan Telepon Wali.
*   **Tab 3: Unggah Berkas & Integrasi Kearsipan**:
    *   Mendukung pengunggahan berkas: *Kartu Keluarga, Akta Kelahiran, Nilai Rapor, Ijazah SMP, KTP Ayah Kandung, dan KTP Ibu Kandung*.
    *   Tombol pemindaian pintar terintegrasi di modal pembantu (`btn-open-scanner`).
    *   Ektraksi berkas KTP Ayah dan KTP Ibu secara khusus akan mengekstrak NIK, nama lengkap, dan nomor kontak langsung ke form Orang Tua.

### 4.2 Direktori Pintar & Status Kelayakan (`StudentDirectoryView`)
*   **Penilai Kelengkapan Berkas**: Secara otomatis memberikan label "Lengkap" jika 5+ dokumen inti (KK, Akta, Rapor, Ijazah, KTP Orang Tua) telah diunggah dan terverifikasi.
*   **Filter Fleksibel**: Menyaring murid berdasarkan kelas, jurusan, dan status verifikasi administrasi kesiswaan.

### 4.3 Log Audit Keamanan Waktu-Nyata (`ActivityLogView`)
*   Mencatat aktivitas mutasi data secara terperinci (Waktu kejadian, Nama Agen, Hak Akses, Jenis Tindakan, Modul, Keterangan).
*   Dipasang langsung dengan hypertable PostgreSQL untuk ketahanan performa pencarian tinggi.

---

## 💾 5. Skema & Model Database (PostgreSQL + TimescaleDB)

Relasi data siswa, arsip dokumen, dan log audit diatur melalui skema tangguh berikut:

```sql
-- Aktivasi Ekstensi TimescaleDB untuk Data Time-Series
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 1. Tabel Master Siswa (Relational)
CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    nisn VARCHAR(10) UNIQUE NOT NULL,
    kelas VARCHAR(30) NOT NULL,
    jurusan VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telepon VARCHAR(20),
    alamat TEXT NOT NULL,
    tanggal_lahir DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Aktif',
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Struktur Data Orang Tua (Kompabilitas Integrasi KTP OCR)
    nama_ayah VARCHAR(150),
    pekerjaan_ayah VARCHAR(100),
    ktp_ayah VARCHAR(16),
    telepon_ayah VARCHAR(20),
    nama_ibu VARCHAR(150),
    pekerjaan_ibu VARCHAR(100),
    ktp_ibu VARCHAR(16),
    telepon_ibu VARCHAR(20),
    alamat_orang_tua TEXT
);

-- 2. Tabel Dokumen Fisik Terenkripsi (Relational)
CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'Ijazah', 'Kartu Keluarga', 'Akta Kelahiran', 'Rapor', 'KTP Ayah', 'KTP Ibu'
    name VARCHAR(255) NOT NULL,
    drive_file_id VARCHAR(100), -- ID Unik Google Drive
    status VARCHAR(30) DEFAULT 'Verifikasi',
    size VARCHAR(20),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Riwayat Audit Sistem (TimescaleDB Hypertable)
CREATE TABLE activity_logs (
    id SERIAL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Siswa', 'Dokumen', 'Google API', 'Autentikasi'
    details TEXT
);

-- Konversi tabel activity_logs menjadi Hypertable berdasarkan timestamp
SELECT create_hypertable('activity_logs', 'timestamp');
```

---

## 🚀 6. Panduan Deployment (Self-Hosted via Coolify)

Para developer dapat merilis aplikasi ini ke server produksi menggunakan **Coolify** (alternatif heroku mandiri yang tangguh).

### 6.1 Komposisi Docker Compose (`docker-compose.yml`)
Konfigurasikan stack multi-service di bawah ini pada dashboard admin Coolify Anda:

```yaml
version: '3.8'

services:
  # 1. ARBAL Full-Stack App Component (Node.js 20)
  app:
    image: node:20-alpine
    container_name: arbal-core-app
    command: sh -c "npm install && npm run build && npm run start"
    working_dir: /app
    volumes:
      - .:/app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://arbal_admin:<CHANGE_ME>@db:5432/arbal_db
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GOOGLE_APPLICATION_CREDENTIALS=/app/google-key.json
    depends_on:
      db:
        condition: service_healthy
    restart: always

  # 2. Database Server (PostgreSQL + TimescaleDB)
  db:
    image: timescale/timescaledb:latest-pg15
    container_name: arbal-timescale-db
    environment:
      - POSTGRES_USER=arbal_admin
      - POSTGRES_PASSWORD=<CHANGE_ME>
      - POSTGRES_DB=arbal_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arbal_admin -d arbal_db"]
      interval: 8s
      timeout: 4s
      retries: 5
    restart: always

  # 3. pgAdmin 4 (Administrasi Database visual)
  pgadmin:
    image: dpage/pgadmin4
    container_name: arbal-pgadmin4
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin.siakad@sekolah.sch.id
      - PGADMIN_DEFAULT_PASSWORD=<CHANGE_ME>
    ports:
      - "80:80"
    depends_on:
      - db
    restart: always

  # 4. Grafana Enterprise (Monitoring Mutasi Data & Keamanan)
  grafana:
    image: grafana/grafana-oss:latest
    container_name: arbal-grafana-monitor
    volumes:
      - grafanadata:/var/lib/grafana
    ports:
      - "3001:3000"
    depends_on:
      - db
    restart: always

volumes:
  pgdata:
  grafanadata:
```

### 6.2 Monitoring Grafana Dashboard (Metrik Pendidikan)
Hubungkan Grafana ke database `arbal_db` lokal Anda menggunakan driver PostgreSQL internal, kemudian buat visualisasi metrik utama:
*   **Total Dokumen Terarsip Perhari (Timescale Query)**:
    ```sql
    SELECT 
      time_bucket('1 day', uploaded_at) AS time,
      count(id) as "Total Unggahan"
    FROM documents
    WHERE $__timeFilter(uploaded_at)
    GROUP BY time ORDER BY time;
    ```
*   **Kecenderungan Log Audit Keamanan**: Menampilkan upaya akses tidak sah atau penghapusan arsip yang mencurigakan secara grafis.

---

## 📈 7. Rencana Rilis & Kriteria Keberhasilan (Success Metrics)

1.  **Akurasi OCR**: Ekstraksi KTP lokal berbasis Tesseract.js wajib memiliki tingkat akurasi parsing NIK dan Nama Wali minimal mencapai **92%** pada kondisi cahaya gambar yang wajar.
2.  **Kecepatan Respon UI**: Pemuatan statistik siswa pada dashboard utama harus di bawah **200 mili-detik** berkat optimasi state React dan persistensi instan.
3.  **Kedaulatan Kontainer**: Aplikasi berhasil dijalankan dalam 100% modus isolasi Docker di Coolify tanpa kebocoran memori pada thread OCR backend.
4.  **Enkripsi**: Semua ID file dokumen sensitif dari Google Drive tersimpan dengan aman pada database PostgreSQL di jaringan internal server.
