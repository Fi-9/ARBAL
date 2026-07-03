# 📋 Panduan Implementasi & Hubungan Arsitektur Mandiri (Self-Hosted)
## ARBAL — Arsip Mustaqbal (PKBM Teknologi Mustaqbal)

> Catatan pembaruan: dokumen ini berisi rencana lama yang masih menyebut Coolify proxy bawaan, Express monolith, TimescaleDB, pgAdmin, dan Grafana. Untuk kondisi repo saat ini, jalur deploy yang direkomendasikan adalah frontend React statis + backend NestJS + PostgreSQL biasa, dengan domain `arsip.insanmustaqbal.or.id` dipublikasikan melalui **Zoraxy** sebagai reverse proxy.

Dokumen ini menjelaskan strategi teknis untuk melakukan migrasi, deployment, dan pemantauan sistem kearsipan **ARBAL** pada server mandiri (*local/cloud VPS*) menggunakan **Coolify**, **PostgreSQL dengan Ekstensi TimescaleDB**, **pgAdmin**, serta visualisasi metriks di **Grafana**.

---

## 🏛️ 1. Arsitektur Komponen Sistem

Arsitektur aplikasi akan berjalan di atas kluster kontainer Docker dengan koordinasi dari agen Coolify. Berikut adalah visual Alur Kerjanya:

```
+--------------------------------------------------------------------------+
|                            USER BROWSER / CLIENT                         |
|      (Mengakses Antarmuka ARBAL, Input Data Siswa, Lihat Audit Log)       |
+--------------------------------------------------------------------------+
                                     | (HTTPS - Port 443 via Coolify Proxy)
                                     v
+-------------------------------+         +--------------------------------+
|        ARBAL BACKEND          |=======> |      GOOGLE WORKSPACE API      |
| Express.js Server proxy API   |         | - Google Drive (Upload Berkas) |
| Enkripsi AES data kependudukan|         | - Google Sheets (Auto Sync)    |
+-------------------------------+         +--------------------------------+
               ||                                         
               || (Internal Network Port 5432)
               v
+--------------------------------------------------------------------------+
|                      POSTGRESQL DB + TIMESCALEDB                         |
| - Tabel 'students' & 'documents' (Relational)                            |
| - Tabel 'activity_logs' dipasang sebagai "Hypertable" (Data Time-Series) |
+--------------------------------------------------------------------------+
          ^                                          ^
          | (Admin queries / Port 80)                | (Metrics query / Port 3000)
+-------------------+                      +-------------------+
|     pgAdmin 4     |                      |      Grafana      |
| Dashboard Kelola  |                      | Dashboard Monitor |
+-------------------+                      +-------------------+
```

---

## 💾 2. Skema & Model Database (PostgreSQL + TimescaleDB)

TimescaleDB sangat cocok untuk ARBAL karena pengarsipan sekolah memproduksi **data log audit aktivitas** yang terikat erat dengan stempel waktu (*time-series*). Keuntungan menggunakan TimescaleDB:
1. Skalabilitas ultra-cepat untuk jutaan log audit.
2. Kompresi data log audit hingga 90%.
3. Query agregasi waktu yang intuitif.

### A. Tabel `students` (Relational)
```sql
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
    
    -- Informasi Wali Murid (Orang Tua)
    nama_ayah VARCHAR(150),
    pekerjaan_ayah VARCHAR(100),
    ktp_ayah VARCHAR(16),
    telepon_ayah VARCHAR(20),
    nama_ibu VARCHAR(150),
    pekerjaan_ibu VARCHAR(100),
    ktp_ibu VARCHAR(16),
    telepon_ibu VARCHAR(20),
    telepon_orang_tua VARCHAR(20),
    alamat_orang_tua TEXT
);
```

### B. Tabel `documents` (Relational)
```sql
CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'Ijazah', 'Kartu Keluarga', 'Akta Kelahiran', 'Rapor'
    name VARCHAR(255) NOT NULL,
    drive_file_id VARCHAR(100), -- Menyimpan ID file unik dari SDK Google Drive
    status VARCHAR(30) DEFAULT 'Verifikasi',
    size VARCHAR(20),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### C. Tabel `activity_logs` (Time-Series Hypertable)
```sql
CREATE TABLE activity_logs (
    id SERIAL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Siswa', 'Dokumen', 'Hak Akses', 'Google Drive', 'Google Sheets'
    details TEXT
);

-- Konversi tabel activity_logs menjadi TimescaleDB Hypertable berdasarkan kolom timestamp
SELECT create_hypertable('activity_logs', 'timestamp');
```

---

## 🛠️ 3. Konfigurasi Hubungan Eksternal (API Integration)

Karena ARBAL dirancang tanpa menyimpan file dokumen PDF secara langsung di server lokal ganjil Anda, backend harus berperan sebagai jembatan ke Google Cloud:

### A. Google Sheets API (Database Cadangan)
1. Aktifkan **Google Sheets API** di Google Cloud Console.
2. Buat **Service Account** dan unduh file kunci JSON kredensialnya.
3. Berikan hak akses `Editor` pada Google Spreadsheet sekolah ke alamat email service account Anda (`xxxx@project.iam.gserviceaccount.com`).
4. Pasang library `@googleapis/sheets` di aplikasi Express.js Anda untuk mengirim data siswa baru ke sprei terpusat kementerian.

### B. Google Drive API (Pemberkasan Enkripsi)
1. Aktifkan **Google Drive API** di Cloud Console yang sama.
2. Buat folder induk "ARSIP DIGITAL PKBM" di Google Drive Kesiswaan Utama.
3. Berikan hak akses `Writer` ke Service Account tadi pada folder tersebut.
4. Di file backend (Express.js), simpan ID folder induk tersebut sebagai variabel lingkungan (`GOOGLE_DRIVE_FOLDER_ID`).
5. Saat pengguna mengunggah berkas (KK, Akta, Rapor, Ijazah), backend ARBAL akan menerima file stream, mengunggah ke Drive via SDK Google Drive API, lalu menyimpan ID file yang dikirim balik Google Drive ke database PostgreSQL lokal server Anda.

---

## 🚀 4. Langkah Deployment di Coolify

**Coolify** sangat luar biasa karena ia melakukan auto-deploy dari repositori Git, mengelola sertifikat SSL Let's Encrypt secara otomatis, dan memberikan kenyamanan kontrol seperti Heroku di atas VPS mandiri Anda.

### Langkah Setup Stack Multi-Service:

1. Masuk ke panel Coolify Anda.
2. Buat **Project** baru bernama `PKBM-Mustaqbal`.
3. Tambahkan **Service** baru menggunakan opsi `Docker Compose`.
4. Salin template file kompilasi `docker-compose.yml` di bawah ini ke konfigurasi Coolify:

```yaml
version: '3.8'

services:
  # 1. Aplikasi ARBAL (React Frontend + Express Backend)
  app:
    image: node:20-alpine
    container_name: arbal-app
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

  # 2. Database PostgreSQL + TimescaleDB
  db:
    image: timescale/timescaledb:latest-pg15
    container_name: arbal-database
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
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

  # 3. pgAdmin 4 (Administrasi DBMS)
  pgadmin:
    image: dpage/pgadmin4
    container_name: arbal-pgadmin
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin.siakad@sekolah.sch.id
      - PGADMIN_DEFAULT_PASSWORD=<CHANGE_ME>
    ports:
      - "80:80"
    depends_on:
      - db
    restart: always

  # 4. Grafana (Pemantauan dan Dashboard Aktivitas)
  grafana:
    image: grafana/grafana-oss:latest
    container_name: arbal-monitoring
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

---

## 📈 5. Monitoring & Dashboard di Grafana

Setelah stack berhasil dijalankan di Coolify, integrasikan database PostgreSQL ke Grafana sebagai sumber data utama (*Data Source*):

### Cara Menghubungkan Grafana & Database:
1. Buka antarmuka Grafana di port `3001` (atau nama domain reverse proxy dari Coolify).
2. Masuk ke **Connections** -> **Data Sources** -> Klik **Add data source**.
3. Pilih **PostgreSQL**.
4. Masukkan kredensial koneksi:
   * **Host:** `db:5432` *(karena berjalan di satu jaringan Docker internal)*
   * **Database:** `arbal_db`
   * **User:** `arbal_admin`
   * **Password:** `<CHANGE_ME>`
   * **SSL Mode:** `disable` (internal docker network tidak memerlukan enkripsi SSL tambahan)
5. Klik **Save & Test**.

### Rekomendasi Panel Dashboard Grafana Pendidikan:
1. **Peningkatan Unggahan Berkas (Daily Document Upload Rate)**: Query SQL berbasis TimescaleDB menggunakan fungsi parameter rentang waktu bawaan Grafana:
   ```sql
   SELECT 
     time_bucket('1 day', uploaded_at) AS time,
     count(id) as "Jumlah Dokumen"
   FROM documents
   WHERE $__timeFilter(uploaded_at)
   GROUP BY time
   ORDER BY time;
   ```
2. **Statistik Registrasi Murid Baru per Kelas**: Memantau gelombang penerimaan pendaftaran per jurusan kesiswaan secara real-time.
3. **Analisis Audit Keamanan Absen (Log Audit Category Distribution)**: Pie chart visual yang menampilkan rasio aktivitas (misal: seberapa sering staf mengubah hak akses, melakukan sinkronisasi eksternal, atau menghapus berkas arsip).

---

Dengan rencana ini, sistem **ARBAL** sekolah anda akan mandiri secara total, memiliki performa pencatatan log audit berskala korporat, mudah dipelihara dari Coolify, serta terpantau dengan standar kematangan industri teknologi terpuji!
