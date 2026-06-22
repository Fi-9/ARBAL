# Plan: Fix TypeScript Errors, Cleanup Mocks, & Audit Log Export

## Konteks

Setelah refactor besar (document operations → real API + audit log UI), tersisa **15 TypeScript errors** dan beberapa fitur placeholder. Plan ini menyelesaikan semua error dan mengimplementasikan fitur yang masih mock/placeholder.

---

## Fase 1: Fix Critical TypeScript Errors (15 errors → 0)

### 1.1 Export `mapBackendStudent` dari `student.service.ts`

**File:** `src/services/student.service.ts:69`
**Error:** `TrashView.tsx` imports `mapBackendStudent` tapi function tidak di-export.
**Fix:** Tambah `export` keyword di depan function declaration.

```typescript
export function mapBackendStudent(raw: any): Student {
```

### 1.2 Fix `App.tsx:130` — reduce type inference

**File:** `src/App.tsx:130`
**Error:** `Operator '+' cannot be applied to types 'Student' and 'number'`
**Root cause:** `students.reduce((sum, s) => sum + s.documents.length, 0)` — TypeScript infers accumulator as `Student` karena array element type.
**Fix:** Explicit type annotation pada accumulator:

```typescript
const totalFiles = students.reduce((sum: number, s) => sum + s.documents.length, 0);
```

### 1.3 Fix mock data — "Ijazah" → "Ijazah Terakhir"

**Files:**
- `src/api/students.mock.ts` (5 occurrences)
- `src/mockData.ts` (5 occurrences)

**Error:** `Type '"Ijazah"' is not assignable to type 'DocumentType'`
**Fix:** Replace `"Ijazah"` with `"Ijazah Terakhir"` (yang ada di `DocumentType` union).

### 1.4 Fix backend Multer type (optional — cosmetic)

**Files:**
- `backend/src/modules/documents/documents.controller.ts:52`
- `backend/src/modules/documents/documents.service.ts:42`

**Error:** `Namespace 'global.Express' has no exported member 'Multer'`
**Fix:** Install `@types/multer` sebagai devDependency di backend:

```bash
cd backend && npm install -D @types/multer
```

---

## Fase 2: Cleanup Mock Remnants

### 2.1 Remove "Mock Upload" comment

**File:** `src/components/StudentDirectoryView.tsx:221`
**Fix:** Rename comment dari "Mock Upload Document Form Action" → "Document file selection handler"

### 2.2 Remove "Drag and drop mock" comment

**File:** `src/components/StudentDirectoryView.tsx:162`
**Fix:** Rename → "Drag and drop state" (drag-drop masih UI-only, tapi bukan mock)

### 2.3 Fix Swagger enum di controller

**File:** `backend/src/modules/documents/documents.controller.ts:47`
**Current:** `enum: ['IJAZAH', 'KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'PAS_FOTO', 'RAPOR', 'KTP_AYAH', 'KTP_IBU']`
**Fix:** Update ke match Prisma enum:
```typescript
enum: ['KK', 'AKTA', 'IJAZAH_TERAKHIR', 'RAPORT', 'PAS_FOTO', 'KTP_AYAH', 'KTP_IBU', 'SURAT_PINDAH', 'SERTIFIKAT', 'PRAKERIN', 'PENDUKUNG']
```

---

## Fase 3: Implement Real CSV Export untuk Audit Log

### 3.1 Tambah export function di `ActivityLogView.tsx`

**Current:** Button "Ekspor PDF/CSV" hanya `alert()`.
**Target:** Generate CSV dari `filteredLogs` dan trigger browser download.

**Implementasi:**
```typescript
const handleExportCSV = () => {
  const headers = ['Waktu', 'Kategori', 'Aksi', 'Rincian', 'Pelaku', 'Peran'];
  const rows = filteredLogs.map(log => [
    log.timestamp,
    log.category,
    log.action,
    log.details.replace(/\.?\s*Changes:\s*\{.*\}$/s, '').trim(),
    log.actorName,
    log.actorRole,
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### 3.2 Update button onClick

Replace `alert(...)` dengan `handleExportCSV()`.

---

## Fase 4: Audit Log Pagination (Optional Enhancement)

### 4.1 Backend sudah support pagination

Backend `GET /logs?page=1&limit=50` sudah return `{ data, total, page, limit }`.

### 4.2 Frontend enhancement

- Tambah state `page` dan `totalPages`
- Tambah "Load More" button atau infinite scroll
- Update `activityService.getLogs()` untuk accept `page` parameter

**Scope:** Ini optional — hanya perlu jika log > 100 entries. Bisa di-skip untuk sekarang.

---

## Fase 5: SecurityAndAccessView Cleanup (Low Priority)

**File:** `src/components/SecurityAndAccessView.tsx`

Masih pakai mock staff list (`MockStaff[]`) dan `APP_ROLES` dari `mockData.ts`. Ini bisa di-refactor ke real API tapi scope-nya besar dan bukan blocking.

**Recommendation:** Skip untuk sekarang, jadikan backlog item terpisah.

---

## Estimasi Waktu

| Fase | Waktu |
|------|-------|
| 1. Fix TS errors | 15 min |
| 2. Cleanup mocks | 10 min |
| 3. CSV export | 20 min |
| 4. Pagination (optional) | 30 min |
| 5. SecurityView (skip) | — |
| **Total (Fase 1-3)** | **~45 min** |

---

## Acceptance Criteria

| Test | Expected |
|------|----------|
| `npx tsc --noEmit` (root) | 0 errors (atau hanya Multer jika skip 1.4) |
| `npx tsc --noEmit` (backend) | 0 errors |
| `npx vite build` | ✅ Success |
| Buka TrashView | Tidak crash, data muncul |
| Klik "Ekspor PDF/CSV" di Log Aktivitas | Browser download file `.csv` |
| Buka CSV di Excel | Kolom benar, encoding UTF-8 BOM, karakter Indonesia tampil |
| Upload dokumen via StudentDirectoryView | Request `POST /documents/upload` dengan type yang valid |

---

## Prioritas Eksekusi

1. **Fase 1** — WAJIB (blocking: TrashView broken, TS errors)
2. **Fase 2** — WAJIB (code hygiene)
3. **Fase 3** — WAJIB (user-facing feature placeholder)
4. **Fase 4** — OPTIONAL (nice-to-have)
5. **Fase 5** — SKIP (backlog)
