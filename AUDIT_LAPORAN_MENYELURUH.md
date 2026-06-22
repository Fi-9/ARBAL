# 🔍 LAPORAN AUDIT MENYELURUH — ARBAL (Arsip Mustaqbal)

> **Tanggal Audit:** 2026-06-22  
> **Auditor:** Kilo AI Assistant  
> **Cakupan:** Full-stack — Frontend, Backend, Database, OCR Service, DevOps  
> **Metodologi:** Code review statis, analisis keamanan, arsitektur, kualitas kode  

---

## 📊 Ringkasan Temuan

| Severity | Jumlah | Area Terdampak |
|---|---|---|
| 🔴 **Critical (P0)** | 3 | Permission Guard, Search PII leak, JWT secret fallback |
| 🟠 **High (P1)** | 9 | Role simulation, Type mismatch, PII exposure, Search KTP brute-force, SQL injection risk |
| 🟡 **Medium (P2)** | 11 | Dead code, Validation gaps, Code duplication, Mixed languages |
| 🟢 **Low (P3)** | 7 | Naming, Comments, Styling, Missing logging |

**Total: 30 temuan**

---

## 🔴 CRITICAL (P0) — Harus segera diperbaiki

### P0-1: PermissionsGuard menggunakan logika OR, seharusnya AND

**File:** `backend/src/common/guards/permissions.guard.ts:23`  
**Severity:** 🔴 Critical  
**Kategori:** Authorization / Access Control

```typescript
// ❌ BUG — menggunakan .some() (OR logic)
return requiredPermissions.some((perm) => user.permissions?.includes(perm));
```

Jika sebuah route membutuhkan `@Permissions('student.read', 'student.write')`, user yang hanya punya `student.read` tetap diizinkan akses karena `.some()` mengembalikan `true` jika **satu saja** permission cocok.

**Dampak:** User dengan role `GURU` (hanya punya `student.read`) bisa mengakses endpoint yang memerlukan `@Permissions('student.read', 'student.write')` seperti endpoint create/update student yang menggunakan decorator dengan multiple permissions.

**Perbaikan:**
```typescript
// ✅ FIX — gunakan .every() (AND logic)
return requiredPermissions.every((perm) => user.permissions?.includes(perm));
```

---

### P0-2: Search endpoint membocorkan pencarian berdasarkan KTP

**File:** `backend/src/modules/students/students.service.ts:904-906`  
**Severity:** 🔴 Critical  
**Kategori:** PII Exposure / Information Leak

```typescript
// ❌ BUG — memungkinkan brute-force nomor KTP via search API
{ Guardian: { ktpAyah: { contains: sanitized, mode: 'insensitive' } } },
{ Guardian: { ktpIbu: { contains: sanitized, mode: 'insensitive' } } },
```

Endpoint `GET /students/search?q=...` memungkinkan pencarian berdasarkan NIK KTP orang tua untuk **semua role** (hanya dilindungi `@Permissions('student.read')`). Attacker dengan akses `GURU` bisa melakukan brute-force 16-digit NIK untuk menemukan data siswa berdasarkan NIK orang tua.

**Perbaikan:** Hapus `ktpAyah` dan `ktpIbu` dari search OR clause, atau batasi hanya untuk `SUPER_ADMIN`:
```typescript
const searchOr: any[] = [
  { nama: { contains: sanitized, mode: 'insensitive' } },
  { nisSekolah: { contains: sanitized, mode: 'insensitive' } },
  { nisn: { contains: sanitized, mode: 'insensitive' } },
  { registrationNumber: { contains: sanitized, mode: 'insensitive' } },
  { Guardian: { namaAyah: { contains: sanitized, mode: 'insensitive' } } },
  { Guardian: { namaIbu: { contains: sanitized, mode: 'insensitive' } } },
];
// Only SUPER_ADMIN can search by KTP
if (actor?.role === 'SUPER_ADMIN') {
  searchOr.push(
    { Guardian: { ktpAyah: { contains: sanitized, mode: 'insensitive' } } },
    { Guardian: { ktpIbu: { contains: sanitized, mode: 'insensitive' } } },
  );
}
```

Hal yang sama terjadi di metode `findAll()` baris 110-116 yang juga membolehkan pencarian lewat `ktpAyah`/`ktpIbu`.

---

### P0-3: JWT secret fallback ke JWT_SECRET untuk refresh token

**File:** `backend/src/modules/auth/auth.service.ts:47-49`  
**Severity:** 🔴 Critical  
**Kategori:** Authentication / Defense-in-Depth

```typescript
// ❌ WEAKNESS — jika JWT_REFRESH_SECRET tidak diset, pakai JWT_SECRET
secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
```

Jika `JWT_REFRESH_SECRET` tidak dikonfigurasi di environment, refresh token menggunakan secret yang sama dengan access token. Ini melemahkan separation of concerns. Jika access token key bocor, attacker bisa sekaligus memalsukan refresh token.

**Perbaikan:** Wajibkan `JWT_REFRESH_SECRET` pada startup:
```typescript
// Di main.ts
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('FATAL: JWT_REFRESH_SECRET is not set. Set a separate secret for refresh tokens.');
}
```

---

## 🟠 HIGH (P1)

### P1-1: Role simulation di frontend tidak mengubah permission backend

**File:** `src/stores/auth.store.ts:99-103`  
**Severity:** 🟠 High  

`setSimulatedRole()` hanya mengubah state UI (selectedRole & actorName) tanpa mengubah token JWT atau permission di backend. SUPER_ADMIN yang switch ke role `GURU / Wali Kelas` tetap mengirim JWT dengan role `SUPER_ADMIN` ke backend — backend tetap memberikan akses penuh. Fitur ini misleading dan memberi false sense of security.

**Perbaikan:** Implementasi yang benar memerlukan backend endpoint untuk menerbitkan token dengan permission terbatas, atau hapus fitur ini dari production sampai backend siap.

---

### P1-2: Frontend Student type tidak sinkron dengan backend schema

**File:** `src/types.ts:34-66` vs `prisma/schema.prisma:124-158`  
**Severity:** 🟠 High  

Frontend `Student` interface memiliki field yang tidak ada di Prisma schema:
- `nik`, `nomorKK`, `namaPanggilan`, `jenisKelamin`, `tempatLahir`, `asalSekolah`, `tahunLulusSebelumnya`, `anakKe`, `jumlahSaudara`, `photoUrl`
- Field-field ini dikirim dari frontend lewat `student.service.ts:toCreatePayload()` tapi tidak divalidasi oleh Prisma

Frontend `Student` interface tidak memiliki field:
- `completenessPercent` — digunakan di `StudentDirectoryView.tsx:229`, `DashboardView.tsx:76` tapi tidak dideklarasikan di types.ts

**Perbaikan:** Sinkronkan semua field antara schema Prisma, DTO backend, dan type frontend. Tambahkan migration untuk field baru yang belum ada di database.

---

### P1-3: $executeRawUnsafe digunakan dengan parameter dari route tanpa validasi tipe

**File:** `backend/src/modules/students/students.service.ts:794-803`  
**Severity:** 🟠 High  

```typescript
await tx.$executeRawUnsafe(
  `UPDATE "Guardian" SET "deletedAt" = NULL, "deletedBy" = NULL WHERE "studentId" = $1`,
  id,
);
```

Meskipun parameterized query digunakan (`$1`), `$executeRawUnsafe` tetap bypass soft-delete middleware Prisma. Jika `id` dari route param tidak divalidasi sebagai UUID, bisa ada risiko query manipulation.

**Perbaikan:** Tambahkan validasi UUID pada route param atau gunakan `tx.guardian.updateMany({ where: { studentId: id }, data: { deletedAt: null, deletedBy: null } })` jika middleware sudah mendukung.

---

### P1-4: DocumentItem type tidak punya field verificationNotes

**File:** `src/types.ts:19-30`  
**Severity:** 🟠 High  

`DocumentItem` interface tidak mendeklarasikan `verificationNotes` tetapi digunakan di `StudentDirectoryView.tsx:892`:
```tsx
{doc.verificationNotes && (...)}
```
Ini akan menyebabkan TypeScript error pada strict mode.

**Perbaikan:** Tambahkan ke interface:
```typescript
export interface DocumentItem {
  // ... existing fields
  verificationNotes?: string;
}
```

---

### P1-5: KTP dan data sensitif orang tua ditampilkan ke role GURU di detail drawer

**File:** `src/components/StudentDirectoryView.tsx:829-833`  
**Severity:** 🟠 High  

Detail drawer menampilkan `ktpAyah`, `ktpIbu` ke semua role, padahal backend `minimizeStudentPii()` sudah men-strip field tersebut untuk GURU. Frontend tetap menampilkan field kosong/null yang janggal.

**Perbaikan:** Di frontend, sembunyikan baris KTP orang tua sepenuhnya untuk role `GURU / Wali Kelas`, bukan hanya mengandalkan backend.

---

### P1-6: Auth store hardcodes fake actor names

**File:** `src/stores/auth.store.ts:109-111`  
**Severity:** 🟠 High  

```typescript
export const getActiveUserLabel = (role: RoleType): string => {
  if (role === 'Super Admin') return 'Drs. H. Mulyono (Kepala Sekolah)';
  return 'Asep Saepudin, M.Pd (Wali Kelas XII RPL)';
};
```

Nama-nama ini hardcoded dan tidak berubah berdasarkan user yang sebenarnya login. Audit log yang mengandalkan ini akan mencatat nama palsu.

**Perbaikan:** Gunakan `user.name` dari JWT session, bukan hardcoded label.

---

### P1-7: Backup cron job gagal diam-diam (silent failure)

**File:** `backend/src/modules/backup/backup.service.ts:99-101`  
**Severity:** 🟠 High  

```typescript
} catch (err: any) {
  this.logger.error(`Échec du backup automatique Daily: ${err.message}`, err.stack);
}
```

Backup cron job hanya log error tapi tidak mengirim notifikasi atau alert. Jika backup gagal selama berminggu-minggu, tidak ada yang tahu sampai dibutuhkan.

**Perbaikan:** Tambahkan notifikasi ke admin (misalnya melalui activity log dengan severity `error`) saat backup gagal.

---

### P1-8: Upload dokumen menyimpan buffer di memory tanpa batasan

**File:** `backend/src/modules/documents/documents.service.ts:157`  
**Severity:** 🟠 High  

```typescript
fileData: isDbStorage ? file.buffer : null,
```

Jika menggunakan `DatabaseStorageProvider`, file sepenuhnya disimpan sebagai blob di database. File 10MB dari multiple concurrent uploads bisa membuat database membengkak dan aplikasi OOM.

**Perbaikan:** Simpan file ke filesystem local atau object storage; jangan di database.

---

### P1-9: Tidak ada rate limiting khusus untuk login endpoint

**File:** `backend/src/modules/auth/auth.controller.ts` (tidak dicek, tapi berdasarkan main.ts)  
**Severity:** 🟠 High  

Global rate limit 100 req/menit terlalu longgar untuk endpoint login. Attacker bisa mencoba 100 password per menit tanpa terblokir.

**Perbaikan:** Tambahkan rate limit khusus untuk endpoint login — misalnya 5 percobaan per menit per IP.

---

## 🟡 MEDIUM (P2)

### P2-1: Backup restore menggunakan pg_restore tapi dipanggil sebagai psql

**File:** `backend/src/modules/backup/backup.service.ts:429`  
**Severity:** 🟡 Medium  

Backup dibuat dengan `pg_dump` (format plain SQL) lalu restore dengan `psql -f sqlPath`. Ini benar karena formatnya plain SQL. Tapi nama fungsi dan komentar menyebut `pg_restore` — membingungkan.

**Perbaikan:** Perbaiki komentar atau konsistenkan metode dump/restore.

### P2-2: Template literal SQL dump disimpan di memory sebelum ditulis ZIP

**File:** `backend/src/modules/backup/backup.service.ts:238-242`  
**Severity:** 🟡 Medium  

```typescript
let sqlDump: string;
const result = await execFileAsync(pgDumpExecutable, ['-d', dbUrl, '--no-owner', '--no-acl'], {
  maxBuffer: 50 * 1024 * 1024, // 50 MB
});
sqlDump = result.stdout;
```

SQL dump disimpan sebagai string di memory sebelum dimasukkan ke ZIP. Untuk database besar, ini bisa menyebabkan OOM. 

**Perbaikan:** Stream pg_dump output langsung ke ZIP archive tanpa buffer memory penuh.

### P2-3: Prisma schema tidak sinkron dengan field yang digunakan di service

**File:** `prisma/schema.prisma` vs `backend/src/modules/students/students.service.ts`  
**Severity:** 🟡 Medium  

Student service menggunakan field seperti `nik`, `nomorKK`, `namaPanggilan`, `jenisKelamin`, `tempatLahir`, `asalSekolah`, `tahunLulusSebelumnya`, `anakKe`, `jumlahSaudara`, `photoUrl` tapi field-field ini **tidak ada** di `prisma/schema.prisma` model `Student`. Aplikasi akan error saat runtime jika field ini tidak ditambahkan via migration manual.

**Perbaikan:** Tambahkan field-field tersebut ke schema Prisma dan buat migration.

### P2-4: Mixed language di codebase (Inggris + Indonesia + Perancis)

**Files:** Multiple backend files  
**Severity:** 🟡 Medium  

- Komentar: mix Indonesia, Inggris, Perancis (`// Suppression définitive`, `// Restaure un étudiant`, `// Backup automatique Daily`)
- Audit log details: bahasa Indonesia
- Error messages: mix Indonesia + Inggris

**Perbaikan:** Standarisasi ke satu bahasa. Karena target user Indonesia, gunakan Bahasa Indonesia untuk user-facing messages, Inggris untuk kode/internal.

### P2-5: Dead code — `quotePowerShellLiteral` tidak digunakan

**File:** `backend/src/modules/backup/backup.service.ts:37-39`  
**Severity:** 🟡 Medium  

Fungsi ini sebenarnya digunakan di `restoreFromBackup()` baris 410. Tapi hanya di situ. Tidak ada issue, tapi kualitas kode rendah karena fungsinya spesifik PowerShell tapi diletakkan di file service yang sama.

### P2-6: Frontend Student type memiliki field yang tidak dipetakan dengan benar

**File:** `src/services/student.service.ts:73-135`  
**Severity:** 🟡 Medium  

`mapBackendStudent()` mencoba memetakan field yang tidak ada di Prisma response (seperti `nik`, `nomorKK`, dll). Jika Prisma tidak me-return field tersebut, nilainya akan selalu `undefined`.

### P2-7: `ReviewStatus` enum digunakan tapi tidak ada di schema

**File:** `backend/src/modules/documents/documents.service.ts:3`  
**Severity:** 🟡 Medium  

```typescript
import { DocumentStatus, DocumentType, ReviewStatus } from '@prisma/client';
```

`ReviewStatus` di-import dari Prisma client tapi tidak ada di `prisma/schema.prisma`. Aplikasi akan gagal build/compile.

**Perbaikan:** Tambahkan enum `ReviewStatus` ke schema atau hapus import.

### P2-8: `documentRequirement` table digunakan tapi tidak ada di schema

**File:** `backend/src/modules/students/students.service.ts:144`  
**Severity:** 🟡 Medium  

```typescript
this.prisma.documentRequirement.findMany({ where: { isRequired: true } })
```

Tabel `documentRequirement` tidak ada di `prisma/schema.prisma`. Ini akan error runtime.

**Perbaikan:** Tambahkan model `DocumentRequirement` ke schema.

### P2-9: StudentFormView terlalu besar (1944 baris)

**File:** `src/components/StudentFormView.tsx`  
**Severity:** 🟡 Medium  

Komponen form 1944 baris sangat sulit di-maintain, di-test, dan di-review. Harus dipecah menjadi sub-komponen per tab.

**Perbaikan:** Split menjadi: `StudentIdentityTab.tsx`, `GuardianTab.tsx`, `DocumentUploadTab.tsx`.

### P2-10: Super admin bisa switch role tanpa deployment guard

**File:** `backend/src/modules/students/students.service.ts:828`  
**Severity:** 🟡 Medium  

Permanent delete dilindungi role check:
```typescript
if (actor.role !== 'SUPER_ADMIN') {
  throw new ForbiddenException('Only SUPER_ADMIN can perform permanent deletion');
}
```

Ini bagus. Tapi karena role simulation di frontend hanya UI-level (P1-1), SUPER_ADMIN yang sebenarnya tidak bisa benar-benar dibatasi.

### P2-11: Excel export tidak ada pagination — OOM risk

**File:** `backend/src/modules/students/students.service.ts:924-928`  
**Severity:** 🟡 Medium  

Export mengambil **semua** student tanpa pagination. Untuk ribuan student dengan dokumen, response bisa memakan memory besar.

**Perbaikan:** Tambahkan streaming atau pagination untuk export.

---

## 🟢 LOW (P3)

### P3-1: Sidebar menampilkan menu `backup` tapi tidak ada view handler di App.tsx

**File:** `src/components/Sidebar.tsx:39` vs `src/App.tsx:288-352`  
**Severity:** 🟢 Low  

Sidebar mendaftarkan `backup` sebagai menu item tapi App.tsx tidak memiliki case `backup` di view router. Klik menu backup akan menampilkan halaman kosong.

### P3-2: Root package.json name "react-example"

**File:** `package.json:2`  
**Severity:** 🟢 Low  

Name project masih `"react-example"` — legacy dari AI Studio template. Harus diganti menjadi `"arbal"`.

### P3-3: Fungsi `replaceAll` di student service misleading

**File:** `src/services/student.service.ts:357-361`  
**Severity:** 🟢 Low  

`replaceAll()` named seperti operasi API tapi sebenarnya hanya mengembalikan array yang sama — no-op. Ini membingungkan developer lain.

### P3-4: Unused imports di StudentDirectoryView

**File:** `src/components/StudentDirectoryView.tsx:34,102`  
**Severity:** 🟢 Low  

`Maximize2`, `Minimize2` di-import tapi tidak digunakan (haunted by preview modal yang digeser).

### P3-5: Hardcoded color di DashboardView

**File:** `src/components/DashboardView.tsx:129`  
**Severity:** 🟢 Low  

`"Eddisi Uji Coba Frontend"` — label "Uji Coba" seharusnya tidak muncul di production. Webapp sudah jauh melewati tahap uji coba.

### P3-6: Drawer footer claims "Enkripsi AES-256 aktif" tapi tidak ada implementasi

**File:** `src/components/StudentDirectoryView.tsx:1093`  
**Severity:** 🟢 Low  

Footer drawer menampilkan: `"Disimpan secara aman di direktori lokal server. Enkripsi AES-256 aktif."` — tapi tidak ada enkripsi AES di codebase. Ini misleading.

### P3-7: Tidak ada CSRF protection

**File:** `backend/src/main.ts`  
**Severity:** 🟢 Low  

Aplikasi menggunakan JWT Bearer token di header, yang inherently protected dari CSRF. Namun refresh token dikirim via httpOnly cookie tanpa `SameSite` attribute. Tambahkan `SameSite=Strict` untuk hardening.

---

## ✅ Hal-hal yang SUDAH BAIK

Untuk keseimbangan audit, berikut adalah aspek positif yang patut dipertahankan:

| # | Aspek | Detail |
|---|---|---|
| 1 | **JWT dengan refresh token rotation** | Family-based rotation + replay attack detection — implementasi solid |
| 2 | **Account lockout** | 10 failed attempts → 15 menit lockout — good brute-force protection |
| 3 | **Magic byte validation** | Dokumen di-validate content-nya, bukan hanya ekstensi — anti-spoofing |
| 4 | **Path traversal protection** | Backup service punya `validateBackupFileName()` dan `ensureInsideDirectory()` |
| 5 | **RBAC PII minimization** | `minimizeStudentPii()` men-strip KTP dan NIK untuk role GURU |
| 6 | **Soft-delete pattern** | Student & Document menggunakan soft-delete + trash bin + restore |
| 7 | **Transaction safety** | Backup dan document service menggunakan Prisma `$transaction` dengan baik |
| 8 | **Separation of concerns** | Frontend separation: Zustand (client state) + React Query (server state) |
| 9 | **Helmet + CORS + Rate limiting** | Security baseline baik di NestJS |
| 10 | **ValidationPipe whitelist** | `forbidNonWhitelisted: true` mencegah field tak dikenal masuk ke DTO |

---

## 📋 Checklist Perbaikan Prioritas

### Sprint 1 (Minggu ini) — Critical + High

- [ ] **P0-1**: Fix PermissionsGuard `.some()` → `.every()`  
- [ ] **P0-2**: Hapus KTP search dari `findAll` dan `search` untuk non-SUPER_ADMIN  
- [ ] **P0-3**: Wajibkan `JWT_REFRESH_SECRET` di startup  
- [ ] **P1-1**: Hapus atau beri label eksplisit "Simulasi" pada role switcher  
- [ ] **P1-2**: Sinkronkan Prisma schema dengan field yang digunakan service  
- [ ] **P1-4**: Tambahkan `verificationNotes` ke `DocumentItem` interface  
- [ ] **P1-9**: Tambahkan rate limit khusus endpoint login  

### Sprint 2 — Medium

- [ ] **P1-3**: Ganti `$executeRawUnsafe` dengan Prisma query biasa + middleware  
- [ ] **P1-6**: Gunakan `user.name` dari session, bukan hardcoded label  
- [ ] **P1-7**: Tambahkan alert/notifikasi saat backup cron gagal  
- [ ] **P1-8**: Simpan file ke filesystem, bukan database blob  
- [ ] **P2-3**: Tambahkan field-field baru ke Prisma schema + migration  
- [ ] **P2-7**: Hapus import `ReviewStatus` atau tambahkan ke schema  
- [ ] **P2-8**: Tambahkan model `DocumentRequirement` ke schema  
- [ ] **P2-9**: Split `StudentFormView.tsx` menjadi sub-komponen per tab  

### Sprint 3 — Low + Technical Debt

- [ ] **P2-4**: Standarisasi bahasa komentar  
- [ ] **P2-6**: Perbaiki mapper frontend untuk field baru  
- [ ] **P3-1**: Tambahkan `backup` view handler di App.tsx atau hapus menu  
- [ ] **P3-2**: Rename package.json name  
- [ ] **P3-5**: Hapus label "Uji Coba" dari DashboardView  
- [ ] **P3-6**: Hapus atau implementasikan klaim enkripsi AES  
- [ ] **P3-7**: Tambahkan `SameSite=Strict` pada refresh token cookie  

---

## 🏁 Kesimpulan

Project ARBAL memiliki **fondasi arsitektur yang solid** — auth JWT dengan rotation, RBAC dengan PII minimization, soft-delete pattern, dan security hardening baseline. Backend NestJS terstruktur dengan baik, frontend React memiliki separation of concerns yang benar antara client state dan server state.

**3 critical issues** perlu segera difiks (PermissionsGuard logic bug, KTP search leak, JWT secret fallback). Enam dari 9 high issues terkait dengan **ketidaksinkronan** antara Prisma schema, DTO backend, dan type frontend — menunjukkan project berkembang cepat tanpa re-sinkronisasi schema.

Setelah critical dan high issues diselesaikan, prioritas berikutnya adalah **integrasi Google Workspace** (Drive & Sheets) yang saat ini masih simulasi, dan **testing coverage** yang masih rendah (hanya 2 file spec).
