# Plan: Perbaikan Hasil Audit ARBAL

Berdasarkan hasil audit lengkap project ARBAL, berikut rencana implementasi perbaikan yang diprioritaskan berdasarkan severity.

---

## Sprint 1 — Keamanan Kritis (Prioritas Tertinggi)

### 1.1 File Upload: Magic Byte Validation
**File:** `backend/src/modules/documents/documents.service.ts`
- Install package `file-type` untuk validasi magic bytes
- Tambah validasi setelah MIME check: baca header bytes file dan cocokkan dengan signature PNG/JPEG/PDF
- Reject file jika magic bytes tidak match allowlist
- Tambah validasi file extension independen dari client

### 1.2 Permission Guards pada Semua Endpoint
**Files:**
- `backend/src/modules/students/students.controller.ts`
- `backend/src/modules/documents/documents.controller.ts`

Langkah:
- Tambah `@Permissions('student.read')` pada `search`, `findAll`, `findOne`, `findAcademicYears`
- Tambah `@Permissions('document.upload')` pada `upload`
- Tambah `@Permissions('student.read')` pada `findByStudent` dan `findOne` di documents
- Verify bahwa `PermissionsGuard` sudah ter-apply secara global

### 1.3 Perbaiki Soft-Delete Middleware
**File:** `backend/src/prisma/prisma.service.ts`

Tambah interception untuk:
- `findUnique` / `findUniqueOrThrow` — inject `deletedAt: null`
- `count` — inject `deletedAt: null`
- `aggregate` / `groupBy` — inject `deletedAt: null`
- `update` / `updateMany` — inject `deletedAt: null` agar tidak bisa update record deleted
- `delete` / `deleteMany` — convert ke `update({ deletedAt: new Date() })` (soft-delete conversion)

### 1.4 Docker OCR: Non-Root User
**File:** `ocr-service/Dockerfile`
- Tambah `RUN useradd -r -s /bin/false appuser`
- Tambah `USER appuser` sebelum `CMD`
- Pastikan direktori kerja accessible oleh user baru

### 1.5 OCR: Streaming Size Limit
**File:** `ocr-service/app.py`
- Ganti pattern baca file: gunakan chunked read dengan limit
- Reject sebelum seluruh file masuk memory
- Atau: tambah nginx/uvicorn config `--limit-request-body` sebagai upstream limit

### 1.6 Ganti `window.__arbalFlushUploads`
**Files:**
- `src/components/StudentFormView.tsx`
- `src/App.tsx`

Opsi implementasi:
- Gunakan `useImperativeHandle` + `forwardRef` pada `StudentFormView`
- Atau: gunakan React ref callback yang di-pass sebagai prop
- Hapus assignment ke `window` object

### 1.7 Pisah JWT Secret
**Files:**
- `.env.example` — tambah `JWT_REFRESH_SECRET`
- `backend/src/modules/auth/auth.service.ts` — gunakan secret berbeda untuk sign refresh token
- `backend/src/modules/auth/auth.controller.ts` — gunakan secret berbeda untuk verify refresh token

### 1.8 JWT Strategy: Fetch Role dari DB
**File:** `backend/src/common/guards/jwt.strategy.ts`
- Ubah `validate()`: gunakan `user.role.name` dari database (sudah di-fetch) bukan `payload.role`
- Update `findUnique` include untuk memastikan `role` relation ter-load

---

## Sprint 2 — Stabilitas & Data Integrity

### 2.1 Tambah Database Indexes
**File:** `prisma/schema.prisma`

Tambah index berikut:
```prisma
@@index([previousId])        // Document
@@index([type])              // Document
@@index([ocrStatus])         // Document
@@index([studentId, type, isLatest]) // Document (composite)
@@index([expiresAt])         // RefreshToken
@@index([angkatan])          // Student
@@index([nama])              // Student (untuk search)
```

Setelah edit schema, jalankan `npx prisma migrate dev` untuk generate migration.

### 2.2 Fix Token Refresh Queue
**File:** `src/lib/api.ts`
- Pada catch block di refresh logic, drain `_refreshQueue` dengan rejection
- Pattern: `_refreshQueue.forEach(cb => cb.reject(error)); _refreshQueue = [];`

### 2.3 Fix `replaceAll` Mutation
**File:** `src/services/student.service.ts`
- Hapus dummy `replaceAll` yang return copy tanpa API call
- Ganti dengan individual API calls (PATCH per student) atau batch endpoint
- Atau: refactor callers di `App.tsx` untuk gunakan individual mutation (verify, delete document)

### 2.4 Account Lockout
**Files:**
- `prisma/schema.prisma` — tambah field `failedLoginAttempts` dan `lockedUntil` pada `User`
- `backend/src/modules/auth/auth.service.ts`:
  - Increment counter pada failed login
  - Lock account setelah 10 attempts (set `lockedUntil` = now + 15 min)
  - Check lockout sebelum verify password
  - Reset counter pada successful login

### 2.5 Auth pada OCR Service
**Files:**
- `ocr-service/app.py` — tambah middleware yang check header `X-Internal-Token`
- `.env.example` — tambah `OCR_INTERNAL_TOKEN`
- `backend/src/modules/documents/ocr.service.ts` — kirim token di request header

### 2.6 Konfigurasi Connection Pool
**File:** `backend/src/prisma/prisma.service.ts`
- Tambah config: `max: 20`, `connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 30000`, `statement_timeout: 30000`

### 2.7 DTO Validation Hardening
**Files:**
- `backend/src/modules/students/dto/student.dto.ts`:
  - Tambah `@MaxLength(255)` pada semua string fields
  - Tambah `@IsIn([...])` pada `status`
- `backend/src/modules/users/dto/user.dto.ts`:
  - Tambah `@IsIn(['SUPER_ADMIN', 'STAFF_TU', 'GURU', 'KEPALA_SEKOLAH'])` pada `roleName`
- `backend/src/modules/auth/dto/auth.dto.ts`:
  - Ubah `@MinLength(4)` → `@MinLength(8)` pada login DTO

### 2.8 Rate Limit pada Refresh Endpoint
**File:** `backend/src/modules/auth/auth.controller.ts`
- Tambah `@Throttle({ default: { limit: 10, ttl: 60_000 } })` pada `refresh()`

---

## Sprint 3 — UX, Performance & Accessibility

### 3.1 Accessibility Fixes
**Files:**
- `src/components/StudentDirectoryView.tsx`:
  - Tambah `aria-label` pada icon buttons (Eye, Edit, Delete)
  - Tambah `role="dialog"`, `aria-modal="true"` pada detail modal
  - Implement focus trap (gunakan library `focus-trap-react` atau custom hook)
  - Tambah Escape key handler
  - Tambah `role="progressbar"` + `aria-valuenow` pada completeness bar

- `src/components/StudentFormView.tsx`:
  - Tambah `role="tablist"`, `role="tab"`, `role="tabpanel"` pada tab navigation
  - Tambah `aria-selected` dan `aria-controls` pada tabs
  - Tambah `htmlFor` pada semua `<label>` elements

### 3.2 Performance Optimization
**Files:**
- `src/App.tsx`:
  - Wrap handler functions dengan `useCallback`
  - Gunakan `useMemo` untuk `editingStudent` derivation
  - Stabilize empty array reference dengan `useMemo(() => [], [])`

- `src/components/StudentDirectoryView.tsx`:
  - Wrap `filteredStudents` dengan `useMemo`
  - Pertimbangkan `@tanstack/react-virtual` untuk list virtualization

### 3.3 Refactoring
**Files:**
- `src/components/StudentFormView.tsx`:
  - Extract `DocumentUploadSlot` component (reusable per document type)
  - Extract `AcademicYearModal` component
  - Extract `useStudentFormSubmit` hook

- `src/App.tsx`:
  - Extract handler logic ke `useStudentActions` hook
  - Kurangi dari 372 baris menjadi ~150 baris

### 3.4 Type Safety
**Files:**
- `src/stores/studentForm.store.ts`:
  - Ubah `setField: (key: string, value: any)` → generic typed version
- `src/stores/ui.store.ts`:
  - Ubah `currentView: string` → union type
- `src/services/student.service.ts`:
  - Define response DTOs, hapus `any` typing

### 3.5 Error Handling
**Files:**
- `src/main.tsx`: Tambah per-view error boundaries
- `src/components/StudentFormView.tsx`: Ganti `alert()`/`confirm()` dengan custom modal
- `src/services/auth.service.ts`: Tambah error differentiation pada refresh (network vs auth error)
- `backend/src/modules/documents/ocr.service.ts`: Log full error, return generic message ke client

### 3.6 OCR Service Hardening
**Files:**
- `ocr-service/app.py`:
  - Set `PIL.Image.MAX_IMAGE_PIXELS = 25_000_000`
  - Tambah rate limiting (gunakan `slowapi`)
  - Hapus `raw_text` dari response (atau flag debug-only)
  - Validasi magic bytes sebelum process

- `ocr-service/Dockerfile`:
  - Tambah `HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8000/health || exit 1`

- `ocr-service/ktp_parser.py` & `kk_parser.py`:
  - Tambah input length cap (max 10000 chars) sebelum regex parsing
  - Review regex patterns untuk ReDoS risk

---

## Urutan Eksekusi

```
Sprint 1 (1-2 minggu) → Sprint 2 (2-3 minggu) → Sprint 3 (3-4 minggu)
```

Sprint 1 harus selesai sebelum deploy ke production. Sprint 2 dan 3 bisa dilakukan secara incremental setelah production live dengan monitoring.

---

## Dependencies / Package Baru

| Package | Sprint | Tujuan |
|---------|--------|--------|
| `file-type` | 1 | Magic byte validation |
| `focus-trap-react` | 3 | Accessible modal focus trap |
| `@tanstack/react-virtual` | 3 | List virtualization |
| `slowapi` (Python) | 3 | OCR rate limiting |

---

## Catatan

- Setiap perubahan schema Prisma di Sprint 2 memerlukan migration (`npx prisma migrate dev`)
- Perubahan JWT secret (Sprint 1.7) akan invalidate semua existing tokens — koordinasi dengan downtime
- Account lockout (Sprint 2.4) perlu testing manual untuk edge cases (concurrent requests, race conditions)
- Semua perubahan harus di-test dengan menjalankan `npm run build` (frontend) dan `npm run build` di backend untuk verify tidak ada TypeScript errors
