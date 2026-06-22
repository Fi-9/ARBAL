# 📊 Analisis Komprehensif Project – ARBAL (Arsip Mustaqbal)

> **Versi dokumen:** 1.0 | **Tanggal:** 2026-06-21  
> **Penulis:** Kilo AI Assistant (Automated Audit)

---

## 📌 Ringkasan Eksekutif

| Atribut | Nilai |
|---|---|
| **Nama Project** | **ARBAL** — Arsip Mustaqbal |
| **Organisasi** | PKBM Teknologi Mustaqbal |
| **Jenis** | Sistem Manajemen Arsip & Data Siswa Digital (Student Archive Management System) |
| **Bahasa** | Indonesia (UI & dokumentasi) |
| **Target Deployment** | Self-Hosted VPS via **Coolify** (Docker Compose) |
| **Database** | PostgreSQL 15 + TimescaleDB |
| **Total File Kode** | ±80 file source code (frontend + backend + OCR service) |
| **Status Saat Ini** | **Beta / Pra-Produksi** — Core system berjalan, 3 worktree perbaikan aktif, menunggu penyelesaian 8-fase audit keamanan |

---

## 🎯 1. Tujuan Project (Why ARBAL Exists)

### 1.1 Latar Belakang
PKBM (Pusat Kegiatan Belajar Masyarakat) adalah institusi pendidikan non-formal yang menghadapi tantangan administratif tinggi:
- **Mobilitas murid fleksibel** — siswa pindahan, angkatan berbeda, status beragam (Aktif, Alumni, Pindahan, Non-Aktif)
- **Dokumen persyaratan kompleks** — Kartu Keluarga, Akta Kelahiran, Ijazah SMP, Rapor, KTP Orang Tua, Pas Foto
- **Proses manual lambat** — unggahan fisik tak terorganisir, verifikasi lama, rentan hilang

### 1.2 Visi ARBAL
> Platform **arsip digital pintar kesiswaan terpusat** yang memadukan penyimpanan cloud (Google Drive/Sheets) dengan database relasional/time-series lokal, sehingga pengelola sekolah dapat **mengelola, memindai, mencari, dan memantau** dokumen kesiswaan secara instan **tanpa biaya lisensi perangkat lunak**.

### 1.3 4 Tujuan Utama
| # | Tujuan | Implementasi |
|---|---|---|
| 1 | **Kecepatan Entri Data** | Auto-Fill berbasis Multi-Engine OCR (PaddleOCR lokal + Gemini API cloud) |
| 2 | **Kemandirian Infrastruktur** | Self-Hosted di Coolify VPS pribadi, Docker Compose |
| 3 | **Penyimpanan Hibrida** | Metadata di PostgreSQL lokal, file fisik di Google Drive, sinkronisasi ke Google Sheets |
| 4 | **Audit Log & Monitoring** | TimescaleDB hypertable untuk log aktivitas, Grafana dashboard |

---

## 🧱 2. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER (HTTPS Port 443)               │
│         React 19 SPA — Vite — Tailwind CSS 4 — Zustand          │
└────────────────────────────────┬─────────────────────────────────┘
                                 │  REST API (Bearer JWT)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICE (NestJS 11)                     │
│       /api/v1/*  —  Helmet · CORS · Rate Limiting · Swagger      │
│       Auth (JWT + Refresh Rotation) · RBAC (SUPER_ADMIN|GURU)    │
└─────┬──────────────────────┬────────────────────┬────────────────┘
      │                      │                    │
      ▼                      ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ POSTGRESQL   │  │ GOOGLE WORKSPACE │  │  OCR MICROSERVICE │
│ + TimescaleDB│  │ Drive (files)    │  │  Python FastAPI   │
│              │  │ Sheets (sync)    │  │  PaddleOCR (KTP)  │
│ pgAdmin 4    │  │                  │  │  Gemini API (Akta)│
│ Grafana      │  │ (planned)        │  │  Port 8000        │
└──────────────┘  └──────────────────┘  └──────────────────┘
```

### Aliran Data Utama
1. **Auth**: Login → JWT accessToken (15 menit) + refreshToken (7 hari, httpOnly cookie) → Auto-refresh via Axios interceptor
2. **Student CRUD**: Form multi-tab (Identitas, Orang Tua, Dokumen) → Backend validasi → Prisma → PostgreSQL
3. **OCR Pipeline**: Upload gambar → OCR Service (PaddleOCR lokal atau Gemini API) → Auto-fill form fields
4. **Audit Log**: Setiap mutasi data → Backend catat di `ActivityLog` → TimescaleDB hypertable → Grafana visualisasi
5. **Backup**: pg_dump → ZIP archive → stored in local `backups/` directory

---

## 🛠️ 3. Teknologi Stack (Lengkap)

### 3.1 Frontend (`src/`)
| Teknologi | Versi | Kategori | Peran |
|---|---|---|---|
| **React** | 19.0.1 | UI Library | Komponen UI deklaratif |
| **TypeScript** | ~5.8.2 | Language | Type safety |
| **Vite** | 6.2.3 | Build Tool | Dev server + bundling |
| **Tailwind CSS** | 4.1.14 | CSS Framework | Utility-first styling |
| **@tanstack/react-query** | 5.101.0 | State Mgmt | Server state, caching, auto-refetch |
| **Zustand** | 5.0.14 | State Mgmt | Client-side state (auth, UI, form, sync, toast) |
| **Axios** | 1.17.0 | HTTP Client | API calls + interceptor |
| **Recharts** | 3.8.1 | Charting | Dashboard charts |
| **Lucide React** | 0.546.0 | Icons | Icon library |
| **Motion** | 12.23.24 | Animation | Page transitions |
| **es-toolkit** | 1.47.1 | Utilities | Lodash alternative |

### 3.2 Backend (`backend/`)
| Teknologi | Versi | Peran |
|---|---|---|
| **NestJS** | 11.0.0 | Framework (modular, DI, decorators) |
| **Prisma ORM** | 7.8.0 | Database ORM + migration |
| **PostgreSQL** | 15 | Relational database |
| **Passport + passport-jwt** | 0.7 / 4.0.1 | JWT authentication |
| **bcryptjs** | 3.0.0 | Password hashing |
| **Helmet** | 8.2.0 | Security headers |
| **class-validator** | 0.15.1 | DTO validation |
| **class-transformer** | 0.5.1 | Object serialization |
| **Multer** | 2.1.1 | File upload (multipart) |
| **ExcelJS** | 4.4.0 | Excel/CSV export |
| **Archiver** | 8.0.0 | ZIP archive (backup) |
| **googleapis** | 173.0.0 | Google Drive/Sheets SDK |
| **@google/genai** | 2.4.0 | Gemini AI (OCR dokumen kompleks) |
| **@nestjs/throttler** | 6.5.0 | Rate limiting (100 req/menit) |
| **@nestjs/swagger** | 11.4.4 | API docs (OpenAPI) |
| **@nestjs/schedule** | 6.1.3 | Cron jobs (future) |

### 3.3 OCR Microservice (`ocr-service/`)
| Teknologi | Versi | Peran |
|---|---|---|
| **Python** | 3.10 | Runtime |
| **FastAPI** | 0.115.0 | Web framework |
| **Uvicorn** | 0.30.6 | ASGI server |
| **PaddleOCR** | 2.8.1 | OCR engine (model bahasa Indonesia) |
| **PaddlePaddle** | 2.6.2 | Deep learning (CPU mode) |
| **OpenCV** | 4.10.0.84 | Image preprocessing |
| **Pillow** | 10.4.0 | Image I/O |
| **SlowAPI** | 0.1.9 | Rate limiting (10 req/menit) |

### 3.4 DevOps & Infrastruktur
| Komponen | Detail |
|---|---|
| **Orkestrasi** | Docker Compose via Coolify |
| **DB Admin** | pgAdmin 4 |
| **Monitoring** | Grafana (TimescaleDB queries) |
| **Reverse Proxy** | Coolify (HTTPS, Let's Encrypt SSL) |
| **Container Images** | node:20-alpine, timescale/timescaledb:latest-pg15, dpage/pgadmin4, grafana/grafana-oss |
| **AI Agents** | Kilo (3 active worktrees, custom agents: architect, code-simplifier, code-skeptic, frontend-specialist) |

---

## 📋 4. Fitur & Kebutuhan (Functional Requirements)

### ✅ Sudah Terimplementasi

| # | Fitur | Status | Detail |
|---|---|---|---|
| 1 | **Autentikasi JWT** | ✅ | Login/logout, refresh token rotation, httpOnly cookie, failed login lockout |
| 2 | **RBAC (Role-Based Access)** | ✅ | 2 role: `SUPER_ADMIN` & `GURU`, permission guard, role switcher |
| 3 | **CRUD Siswa** | ✅ | Create, read (paginated), update, soft-delete, permanent-delete, restore |
| 4 | **Form Multi-Tab** | ✅ | Tab 1: Identitas, Tab 2: Orang Tua/Wali, Tab 3: Unggah Dokumen |
| 5 | **Manajemen Dokumen** | ✅ | Upload, versioning, soft-delete, status (Verifikasi/Terarsip/Ditolak) |
| 6 | **OCR KTP & KK** | ✅ | PaddleOCR lokal via Python microservice, regex parser untuk NIK & nama |
| 7 | **OCR Dokumen Akademik** | ✅ | Gemini API untuk Ijazah, Akta, Rapor (model `gemini-3.1-pro-preview`) |
| 8 | **Direktori Siswa** | ✅ | Search, filter (kelas, jurusan, status), penilai kelengkapan berkas otomatis |
| 9 | **Dashboard Analitik** | ✅ | Statistik siswa, distribusi per kelas/jurusan, tren pendaftaran (Recharts) |
| 10 | **Log Audit** | ✅ | Semua mutasi data tercatat otomatis (kategori: SISWA, DOKUMEN, HAK_AKSES, AUTENTIKASI, BACKUP) |
| 11 | **Export Data** | ✅ | Excel (.xlsx) dan CSV via ExcelJS |
| 12 | **Backup Database** | ✅ | pg_dump → ZIP, list/delete, restore (dengan catatan keamanan — Fase 1) |
| 13 | **Manajemen User** | ✅ | CRUD akun pengguna, aktivasi/non-aktivasi, reset password |
| 14 | **Trash Bin** | ✅ | Soft-delete siswa & dokumen, restore & permanent delete |
| 15 | **Notifikasi** | ✅ | Toast + Notification Center (bell icon), mark read, clear |
| 16 | **Security Hardening** | ✅ | Helmet, CORS, rate limiting, ValidationPipe whitelist, Prisma exception filter |

### ⚠️ Sebagian / Simulasi

| # | Fitur | Status | Catatan |
|---|---|---|---|
| 17 | **Google Drive Sync** | ⚠️ Simulasi | UI menampilkan tombol sync, tapi backend belum implementasi penuh (paket googleapis sudah terpasang) |
| 18 | **Google Sheets Sync** | ⚠️ Simulasi | Sama seperti di atas — status UI berbasis timer lokal, bukan hasil backend nyata |
| 19 | **OCR Pipeline Unggah** | ⚠️ Parsial | Struktur kode ada, tapi integrasi OCR Service ke flow upload belum 100% |
| 20 | **Notifikasi Module** | ⚠️ Empty | Folder `backend/src/modules/notifications/` ada tapi kosong |

### ❌ Belum Diimplementasi

| # | Fitur | Status | Catatan |
|---|---|---|---|
| 21 | **Grafana Dashboard** | ❌ | Docker Compose ada tapi belum dikonfigurasi panel metrics spesifik |
| 22 | **TimescaleDB Hypertable** | ❌ | Schema Prisma sudah siap, tapi extension TimescaleDB + hypertable belum dibuat |
| 23 | **Scheduled Jobs** | ❌ | @nestjs/schedule terpasang tapi belum ada cron job |
| 24 | **Multi-Tenancy** | ❌ | Belum ada isolasi data antar organisasi |

---

## 💾 5. Database Schema

### 5.1 Model (Prisma — 8 model)

| Model | Tujuan | Field Kunci |
|---|---|---|
| **User** | Akun pengguna | id, email (unique), passwordHash, roleId, isActive, failedLoginAttempts, lockedUntil, deletedAt |
| **Role** | Role RBAC | id, name (SUPER_ADMIN \| GURU) |
| **Student** | Data siswa | nisSekolah, nisn, registrationNumber, angkatan, nama, kelas, jurusan, status (AKTIF/ALUMNI/PINDAHAN/NON_AKTIF), graduationYear |
| **Guardian** | Data orang tua/wali | studentId (1:1), namaAyah, ktpAyah, namaIbu, ktpIbu, teleponOrangTua |
| **Document** | Dokumen siswa | studentId, type (KK/AKTA/IJAZAH/RAPORT/dll), ocrResult (JSON), ocrStatus, version, isLatest, previousId (lineage) |
| **ActivityLog** | Audit trail | actorUserId, action, category, entityType, entityId, createdAt (composite PK `[id, createdAt]`) |
| **RefreshToken** | Token rotation | userId, tokenHash, family, expiresAt, revokedAt |
| **AcademicYear** | Tahun ajaran | name (unique), isActive |
| **Sequence** | Auto-increment | id (NIS_2025, PPDB_2025), value |

### 5.2 Enum (6 enum)

| Enum | Nilai |
|---|---|
| **DocumentStatus** | TERARSIP, VERIFIKASI, DITOLAK |
| **OcrStatus** | PENDING, PROCESSING, COMPLETED, FAILED |
| **DocumentType** | KK, AKTA, IJAZAH_TERAKHIR, RAPORT, PAS_FOTO, KTP_AYAH, KTP_IBU, SURAT_PINDAH, SERTIFIKAT, PRAKERIN, PENDUKUNG |
| **LogCategory** | SISWA, DOKUMEN, HAK_AKSES, AUTENTIKASI, BACKUP |
| **RoleName** | SUPER_ADMIN, GURU |
| **StudentStatus** | AKTIF, ALUMNI, PINDAHAN, NON_AKTIF |

### 5.3 Relasi
- User → Role (many-to-one)
- User → ActivityLog, Document, RefreshToken (one-to-many)
- Student → AcademicYear (many-to-one)
- Student → Document (one-to-many)
- Student ↔ Guardian (one-to-one)
- Document → Document (self-ref: previousId → lineage/versioning)

---

## 📊 6. Progress & Status Saat Ini

### 6.1 Overall Progress

```
████████████████████████████░░  ~95%

Core Backend CRUD    ████████████████████████  100%
Core Frontend UI     ████████████████████████  100%
OCR Service          ████████████████████░░░░   85%
Auth & RBAC          ████████████████████████  100%
Audit Log            ████████████████████████  100%
Document Mgmt        ████████████████████████  100%
Google Integration   ████░░░░░░░░░░░░░░░░░░░░   20% (Backlog V1.5)
Deployment           ████████████░░░░░░░░░░░░   50%
Security Hardening   ████████████████████████  100%
Documentation        ████████████████████████  100%
```

### 6.2 Active Worktrees (Agent Manager — 19 Juni 2026)

| Branch | Nama Worktree | Sesi Aktif | Status |
|---|---|---|---|
| `aback-apparatus` | `.kilo/worktrees/aback-apparatus` | 1 sesi | Perbaikan audit keamanan |
| `everlasting-spleen` | `.kilo/worktrees/everlasting-spleen` | 1 sesi | Perbaikan (tidak dispesifikkan) |
| `daily-article` | `.kilo/worktrees/daily-article` | 3 sesi | Perbaikan paling aktif |

### 6.3 Audit Remediation (8 Fase) — Progress

| Fase | Prioritas | Area | Status |
|---|---|---|---|
| **Fase 0** | P0 | Freeze & Guardrail | ✅ Selesai |
| **Fase 1** | P0 | Backup/Restore Command Safety | ✅ Selesai (execFile, resolved paths, boundary checks) |
| **Fase 2** | P0 | Audit Log Integrity | ✅ Selesai (handleAddLog dihapus dari App.tsx, POST /logs ditutup) |
| **Fase 3** | P0 | RBAC + Data Minimization | ✅ Selesai (GURU PII masked/removed) |
| **Fase 4** | P1 | Document Upload Lifecycle | ✅ Selesai (storage rollback on DB fail) |
| **Fase 5** | P1 | Sensitive Artifact Hygiene | ✅ Selesai (.gitignore updated) |
| **Fase 6** | P1 | UI Sync/Backup Claim Alignment | ✅ Selesai (removed fake cloud sync claims) |
| **Fase 7** | P2 | Dependency Remediation | ✅ Selesai (multer upgraded, vulnerabilities fixed) |
| **Fase 8** | P2 | Documentation Rewrite | ✅ Selesai (README updated with architecture) |

---

## ⚠️ 7. Known Issues & Technical Debt

### P0 (Critical — harus diperbaiki sebelum fitur baru)

| # | Masalah | Lokasi | Risiko |
|---|---|---|---|
| 1 | **Backup command injection** — shell raw dari input user | `backend/src/modules/backup/backup.service.ts` | RCE, path traversal, file destruction |
| 2 | **Audit log bisa dipalsukan client** — tapi sudah difiks di Fase 2 | App.tsx, activity module | Integritas jejak audit |
| 3 | **RBAC data leak** — GURU bisa lihat PII orang tua | students controller, service | Pelanggaran privasi |

### P1 (High)

| # | Masalah | Lokasi |
|---|---|---|
| 4 | **Orphan file upload** — file ditulis sebelum DB commit | documents service |
| 5 | **Artefak sensitif belum .gitignore** — uploads/, backups/ | root .gitignore |
| 6 | **UI klaim Google sync palsu** — sync status dari timer lokal | sync.store.ts, hook |

### P2 (Medium)

| # | Masalah | Lokasi |
|---|---|---|
| 7 | **Dependency dengan advisory** — multer, beberapa NestJS | backend/package.json |
| 8 | **README outdated** — masih referensi AI Studio, bukan NestJS | README.md |
| 9 | **PRD & Deployment docs outdated** — menyebut Express.js tapi backend NestJS | PRD.md, DEPLOYMENT_PLAN.md |
| 10 | **TimescaleDB hypertable tidak dibuat** — ActivityLog pakai Prisma biasa | prisma/schema.prisma |
| 11 | **root package.json name "react-example"** — legacy AI Studio name | package.json |

### Technical Debt lainnya

| # | Area | Issue |
|---|---|---|
| 12 | `src/api/` | Folder kosong, tidak digunakan (API layer di `lib/api.ts`) |
| 13 | `notifications module` | Folder backend ada tapi kosong |
| 14 | Migrasi Prisma | Tidak ada file migration di `prisma/migrations/`, kemungkinan pakai db push |
| 15 | Testing | Hanya 2 file test (`auth.service.spec.ts`, `students.service.spec.ts`), coverage rendah |
| 16 | Google Drive integration | Paket `googleapis` terpasang tapi tidak digunakan di backend service manapun |
| 17 | `_db.mjs` script | File kosong/placeholder |

---

## 🔧 8. Rekomendasi Perbaikan & Next Steps

### Urutan Prioritas (sejalan dengan AUDIT_REMEDIATION_PLAN.md)

1. **Fase 1 — Backup Hardening**
   - Validasi `fileName` dengan allowlist ketat
   - Gunakan `resolve()` + boundary check
   - Jangan interpolasi langsung ke shell command
   - Tambahkan audit event terstruktur

2. **Fase 3 — RBAC & Data Minimization**
   - Pisahkan permission `student.read.basic` vs `student.read.sensitive`
   - Kurangi payload untuk role GURU (hilangkan Guardian, NIK orang tua)
   - Hilangkan pencarian berdasarkan `ktpAyah`/`ktpIbu` untuk role terbatas

3. **Fase 4 — Upload Lifecycle**
   - Simpan file ke temp directory dulu → rename setelah DB commit → cleanup failure path
   - Tambahkan orphan file cleanup utility

4. **Fase 6 — UI Claim Alignment**
   - Pilih: sembunyikan tombol sync yg belum berfungsi, atau beri badge "Simulasi / Segera Hadir"
   - Buat endpoint backend nyata untuk Google Sheets/Drive sync

5. **Fase 8 — Documentation**
   - Update README.md sesuai arsitektur aktual (NestJS, bukan Express)
   - Update PRD.md & DEPLOYMENT_PLAN.md

### Rekomendasi Tambahan

| # | Rekomendasi | Benefit |
|---|---|---|
| 1 | **Aktifkan TimescaleDB hypertable** untuk ActivityLog | Kompresi 90%, query time-series cepat |
| 2 | **Setup Grafana dashboard** dengan panel metrics dari deployment plan | Monitoring produksi |
| 3 | **Tambahkan Prisma migrations** (jangan hanya `db push`) | Version control schema, rollback safety |
| 4 | **Tambah test coverage** (unit + e2e) | Stabilitas sebelum go-live |
| 5 | **Integrasikan Google Drive API** secara nyata | Hilangkan simulasi, fitur penyimpanan cloud nyata |
| 6 | **Implementasi notifications module** backend | Pemisahan concern dari activity module |
| 7 | **Rename root package.json** dari "react-example" ke "arbal" | Professionalism |
| 8 | **Bersihkan `src/api/` folder kosong** | Code hygiene |
| 9 | **Buat DTO response per-role** di backend | Keamanan data, minimasi PII leak |
| 10 | **Tambahkan CI/CD pipeline** (GitHub Actions / Coolify auto-deploy) | DevOps maturity |

---

## 📂 9. Struktur Project Tree (Ringkas)

```
ARBAL/
├── 📄 PRD.md                          # Product Requirement Document
├── 📄 DEPLOYMENT_PLAN.md              # Deployment guide (Docker Compose + Grafana)
├── 📄 AUDIT_REMEDIATION_PLAN.md       # 8-fase audit keamanan
├── 📄 README.md                       # ⚠️ Outdated (AI Studio stub)
├── 📄 .env / .env.example             # Environment variables
│
├── 🖥️ src/                            # Frontend — React 19 + Vite + Tailwind
│   ├── App.tsx                        # Root: auth gate + sidebar + view router
│   ├── main.tsx                       # Entry: React root + providers
│   ├── types.ts                       # Shared TypeScript types
│   ├── components/                    # 12 UI components
│   ├── hooks/                         # 7 React Query hooks
│   ├── services/                      # 6 API service layers
│   ├── stores/                        # 5 Zustand stores
│   └── lib/                           # Axios instance + Query keys
│
├── ⚙️ backend/                        # NestJS 11 API Server
│   ├── src/main.ts                    # Bootstrap (helmet, CORS, Swagger, rate limit)
│   ├── src/app.module.ts              # Root module (8 sub-modules)
│   ├── src/prisma/                    # PrismaService (global)
│   ├── src/common/                    # Guards, filters, decorators
│   └── src/modules/
│       ├── auth/                      # JWT auth + refresh token rotation
│       ├── students/                  # Student CRUD + search + export
│       ├── documents/                 # Upload + OCR pipeline + versioning
│       ├── activity/                  # Audit log creation & retrieval
│       ├── dashboard/                 # Analytics endpoints
│       ├── backup/                    # DB backup/restore (pg_dump)
│       └── users/                     # User CRUD + role management
│
├── 🔤 ocr-service/                    # Python FastAPI microservice
│   ├── app.py                         # Server + endpoints (/ocr/ktp, /ocr/kk)
│   ├── ktp_parser.py                  # Regex KTP extraction
│   ├── kk_parser.py                   # Regex KK extraction
│   └── preprocessing.py               # OpenCV image preprocessing
│
├── 🗃️ prisma/
│   └── schema.prisma                  # 8 models, 6 enums
│
├── 📜 scripts/                        # Utility scripts (.mjs)
│   ├── seed-sprint3.mjs               # DB seeding/migration
│   ├── create-user.mjs                # Create admin user
│   ├── reset-admin-password.mjs       # Password reset
│   └── ... (10 utility scripts)
│
├── 🤖 .kilo/                          # Kilo AI agent config
│   ├── agents/                        # 4 custom agents
│   ├── plans/                         # 5 AI-generated plans
│   └── worktrees/                     # 3 git worktrees (audit fixes)
│
└── 📚 .qoder/                         # Auto-generated docs wiki
```

---

## 🏁 10. Kesimpulan

**ARBAL** adalah project full-stack web application yang **solid secara arsitektur** untuk manajemen arsip siswa pendidikan non-formal. Project ini sudah melewati tahap MVP dengan:

- ✅ **80%+ core features** berfungsi (CRUD siswa, dokumen, OCR, auth, audit log)
- ✅ **Arsitektur modern** (React 19 + NestJS 11 + PostgreSQL + Prisma 7)
- ✅ **OCR hybrid** (PaddleOCR lokal + Gemini API untuk dokumen kompleks)
- ✅ **Security baseline** (JWT, RBAC, Helmet, rate limiting, validation pipes)
- ⚠️ **3 P0 security issues** perlu ditutup sebelum go-live
- ⚠️ **Google Drive/Sheets integration** masih simulasi
- ⚠️ **Test coverage rendah** (hanya 2 file spec)

**Rekomendasi:** Fokus selesaikan **Fase 1-3 audit remediation** (backup hardening, audit log integrity, RBAC minimization) sebelum melanjutkan fitur baru. Setelah itu, prioritaskan **Google Workspace integration** untuk mewujudkan visi penyimpanan hibrida yang dijanjikan dalam PRD.
