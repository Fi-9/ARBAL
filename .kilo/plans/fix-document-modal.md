# Plan: Fix Document Preview, Verifikasi, Download, & Delete + Responsive UI

## Tujuan
Mengganti **simulasi/mock** untuk dokumen dengan **real API call** ke backend, plus membuat modal preview responsif di mobile.

## Bug yang Ditemukan (Diagnosa)

### Bug 1: Upload Dokumen via Direktori = Mock Total
**Lokasi:** `src/components/StudentDirectoryView.tsx:248-303` (`handleUploadSubmit`)

**Masalah:**
- Memakai `setTimeout(1200ms)` simulasi
- ID dokumen palsu: `D_${activeStudent.id}_${Date.now()}`
- File **TIDAK pernah** di-POST ke `/api/v1/documents/upload`
- State hanya update lokal via `onUpdateStudents`

**Akibat:**
- File user tidak tersimpan di server
- ID `D_xxx_yyy` mengandung underscore → trigger logika "mock detection" di filter preview & download
- Setiap aksi setelah upload (verify/download/delete) → fallback ke simulasi

### Bug 2: Verifikasi Dokumen = Mock
**Lokasi:** `StudentDirectoryView.tsx:306-344` (`handleVerifyDocument`)

**Masalah:**
- Hanya update `s.documents.map(...)` di state lokal
- Tidak ada `PATCH /api/v1/documents/:id/status`

**Akibat:**
- Status DB tidak berubah
- Setelah refresh halaman, status reset ke "Verifikasi"
- Audit log frontend tidak match dengan backend

### Bug 3: Delete Dokumen = Mock
**Lokasi:** `StudentDirectoryView.tsx:347-378` (`handleDeleteDocument`)

**Masalah:**
- Hanya `s.documents.filter(d => d.id !== docId)` di state lokal
- Tidak ada `DELETE /api/v1/documents/:id`

### Bug 4: Download Punya Mock Fallback Terlalu Agresif
**Lokasi:** `StudentDirectoryView.tsx:382-420` (`handleDownloadFile`)

**Masalah:**
- Kondisi `docId.includes('_')` salah — UUID tidak punya underscore tapi mock ID punya
- Kalau document real (UUID), kondisi false → fetch real (OK)
- Tapi kalau ada ID legacy / fake → simulasi muncul → user tidak tahu

### Bug 5: Preview Modal Tidak Responsif
**Lokasi:** `StudentDirectoryView.tsx:1020-1110` (modal preview)

**Masalah:**
- Layout: sidebar fixed `w-72` (288px) + main `flex-1`
- Mobile/tablet: total > viewport → horizontal scroll atau elemen menumpuk
- Document A4 aspect ratio `aspect-[1/1.41]` di `max-w-2xl` → tidak fit small screen
- Footer button bar `flex items-center justify-between` → 4 tombol horizontal pada mobile

### Bug 6: Verify Button Tidak Muncul / Tidak Tertekan
**Lokasi:** `StudentDirectoryView.tsx:1132` (kondisi render verify button)

```tsx
{canVerify && previewDoc.status === 'Verifikasi' && (...)}
```

**Masalah:**
- `previewDoc.status` mungkin sudah `'Terarsip'` karena status update dari Bug 2 (mock approve di state lokal sebelumnya)
- Setelah refresh, status balik ke `'Verifikasi'` (karena DB tidak diupdate), tapi current session masih punya state lama

---

## Solusi Bertahap

### Step 1: Tambah API Method di document.service.ts

**File:** `src/services/document.service.ts`

Tambahkan setelah `getDocumentFileUrl`:

```typescript
/** Frontend status label → backend enum */
const STATUS_TO_BACKEND: Record<string, 'TERARSIP' | 'VERIFIKASI' | 'DITOLAK'> = {
  Terarsip: 'TERARSIP',
  Verifikasi: 'VERIFIKASI',
  Ditolak: 'DITOLAK',
};

/**
 * Update document verification status (Approve / Reject).
 */
export async function verifyDocument(
  documentId: string,
  action: 'approve' | 'reject',
): Promise<UploadedDocument> {
  const status = action === 'approve' ? 'TERARSIP' : 'DITOLAK';
  const { data } = await api.patch<UploadedDocument>(`/documents/${documentId}/status`, { status });
  return data;
}

/** Soft-delete a document (move to trash). */
export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`);
}

/** Permanent delete — also removes physical file. */
export async function permanentDeleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}/permanent`);
}

/** Download a document as Blob (for Save As). */
export async function downloadDocumentBlob(documentId: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/documents/${documentId}/file`, {
    responseType: 'blob',
  });
  return data;
}

/** Normalize any status format → frontend label */
export function normalizeStatus(raw: string): 'Terarsip' | 'Verifikasi' | 'Ditolak' {
  const upper = raw.toUpperCase();
  if (upper === 'TERARSIP') return 'Terarsip';
  if (upper === 'DITOLAK') return 'Ditolak';
  return 'Verifikasi';
}

export const documentService = {
  upload: uploadDocument,
  verify: verifyDocument,
  remove: deleteDocument,
  permanentDelete: permanentDeleteDocument,
  download: downloadDocumentBlob,
  getFileUrl: getDocumentFileUrl,
  STATUS_TO_BACKEND,
};
```

### Step 2: Tambah Backend DELETE Endpoint

**File:** `backend/src/modules/documents/documents.controller.ts`

Cek apakah `@Delete(':id')` (soft-delete) sudah ada. Jika belum:

```typescript
@Delete(':id')
@Permissions('document.delete')
@ApiOperation({ summary: 'Soft-delete a document' })
async softDelete(@Param('id') id: string, @Req() req: AuthedRequest) {
  return this.documentsService.softDelete(id, req.user.id);
}
```

**File:** `backend/src/modules/documents/documents.service.ts`

Tambah method `softDelete`:

```typescript
async softDelete(id: string, actorId: string) {
  const doc = await this.prisma.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) throw new NotFoundException('Document not found');

  await this.prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actorId },
    });
    await tx.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: actorId,
        action: 'DELETE_DOCUMENT',
        category: 'DOKUMEN',
        entityType: 'Document',
        entityId: id,
        details: `Soft-deleted document "${doc.originalName}"`,
      },
    });
  });

  return { message: `Document "${doc.originalName}" moved to trash` };
}
```

### Step 3: Refactor Upload Handler — Real API

**File:** `src/components/StudentDirectoryView.tsx`

**Ganti** `handleUploadSubmit` (line 248-303) menjadi:

```tsx
const handleUploadSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!activeStudent) return;
  if (!fileInputRef.current?.files?.[0]) {
    alert('Pilih berkas digital terlebih dahulu.');
    return;
  }

  const file = fileInputRef.current.files[0];

  // Validation
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    alert(`File terlalu besar. Maksimal 10MB. File anda: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    alert(`Tipe file tidak didukung: ${file.type}. Hanya JPG, PNG, PDF.`);
    return;
  }

  setIsUploadingIdx(true);

  try {
    const uploaded = await documentService.upload(file, activeStudent.id, uploadDocType);

    // Optimistic update: tambah document ke active student state
    const newDoc: DocumentItem = {
      id: uploaded.id,
      type: uploadDocType,
      name: uploaded.originalName,
      url: getDocumentFileUrl(uploaded.id),
      uploadedAt: uploaded.uploadedAt,
      status: normalizeStatus(uploaded.status),
      size: `${(uploaded.sizeBytes / 1024 / 1024).toFixed(2)} MB`,
    };

    const isAlreadyHave = activeStudent.documents.some(d => d.type === uploadDocType);
    let updatedDocs = [...activeStudent.documents];
    if (isAlreadyHave) {
      updatedDocs = updatedDocs.map(d => d.type === uploadDocType ? newDoc : d);
    } else {
      updatedDocs.push(newDoc);
    }

    const updatedStudents = students.map(s =>
      s.id === activeStudent.id ? { ...s, documents: updatedDocs } : s
    );
    onUpdateStudents(updatedStudents);

    // Reset form
    setSelectedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    onAddNotification(
      'Dokumen Tersimpan',
      `Dokumen ${uploadDocType} atas nama ${activeStudent.nama} berhasil diunggah ke server.`,
      'success'
    );
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Tidak diketahui';
    onAddNotification(
      'Upload Gagal',
      `Dokumen tidak dapat diunggah: ${msg}`,
      'warning'
    );
  } finally {
    setIsUploadingIdx(false);
  }
};
```

### Step 4: Refactor Verify Handler — Real API

**Ganti** `handleVerifyDocument` (line 306-344):

```tsx
const handleVerifyDocument = async (studentId: string, docId: string, action: 'approve' | 'reject') => {
  if (!canVerify) {
    alert('Anda tidak memiliki izin memverifikasi dokumen.');
    return;
  }

  try {
    const updated = await documentService.verify(docId, action);
    const newStatus = normalizeStatus(updated.status);

    const updatedStudents = students.map(s => {
      if (s.id !== studentId) return s;
      return {
        ...s,
        documents: s.documents.map(d =>
          d.id === docId ? { ...d, status: newStatus } : d
        ),
      };
    });
    onUpdateStudents(updatedStudents);

    // Update preview modal if open
    if (previewDoc?.id === docId) {
      setPreviewDoc({ ...previewDoc, status: newStatus });
    }

    const studentName = students.find(s => s.id === studentId)?.nama || '';
    const docType = students.find(s => s.id === studentId)?.documents.find(d => d.id === docId)?.type || '';

    onAddNotification(
      'Verifikasi Selesai',
      `Dokumen ${docType} dari ${studentName} ${action === 'approve' ? 'berhasil diverifikasi.' : 'ditolak.'}`,
      action === 'approve' ? 'success' : 'warning'
    );
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message;
    onAddNotification('Verifikasi Gagal', `Tidak dapat memperbarui status: ${msg}`, 'warning');
  }
};
```

### Step 5: Refactor Delete Handler — Real API

**Ganti** `handleDeleteDocument` (line 347-378):

```tsx
const handleDeleteDocument = async (studentId: string, docId: string, docName: string) => {
  if (!canDelete && selectedRole !== 'Staff TU') {
    alert('Anda tidak diizinkan menghapus dokumen arsip.');
    return;
  }
  if (!confirm(`Hapus arsip berkas "${docName}" ke sampah?\n\nDokumen masih dapat dipulihkan dari menu Sampah.`)) {
    return;
  }

  try {
    await documentService.remove(docId);

    const updatedStudents = students.map(s => {
      if (s.id !== studentId) return s;
      return {
        ...s,
        documents: s.documents.filter(d => d.id !== docId),
      };
    });
    onUpdateStudents(updatedStudents);

    onAddNotification(
      'Dokumen Dihapus',
      `Dokumen "${docName}" dipindahkan ke sampah.`,
      'info'
    );
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message;
    onAddNotification('Hapus Gagal', `Tidak dapat menghapus dokumen: ${msg}`, 'warning');
  }
};
```

### Step 6: Refactor Download Handler — Hapus Mock Fallback

**Ganti** `handleDownloadFile` (line 382-420):

```tsx
const handleDownloadFile = async (docId: string, fileName: string) => {
  try {
    const blob = await documentService.download(docId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    onAddNotification(
      'Unduh Berhasil',
      `Berkas "${fileName}" telah diunduh.`,
      'info'
    );
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404) {
      onAddNotification('File Tidak Ditemukan', `Berkas "${fileName}" tidak tersedia di server.`, 'warning');
    } else if (status === 403) {
      onAddNotification('Akses Ditolak', 'Anda tidak memiliki izin mengunduh berkas ini.', 'warning');
    } else {
      onAddNotification('Unduh Gagal', `Tidak dapat mengunduh berkas: ${err?.message || 'unknown'}`, 'warning');
    }
  }
};
```

### Step 7: Filter `previewObjectUrl` Logic

**Ganti** useEffect (line 109-151) jadi lebih ketat:

```tsx
React.useEffect(() => {
  if (!previewDoc) {
    setPreviewObjectUrl(null);
    return;
  }

  // Only fetch if ID looks like a UUID (real backend ID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previewDoc.id);
  if (!isUuid) {
    setPreviewObjectUrl(null);
    return;
  }

  let isMounted = true;
  setPreviewLoading(true);

  const ctrl = new AbortController();
  documentService.download(previewDoc.id)
    .then(blob => {
      if (isMounted) {
        const url = window.URL.createObjectURL(blob);
        setPreviewObjectUrl(url);
      }
    })
    .catch(err => {
      console.error('[preview] fetch failed:', err);
      if (isMounted) setPreviewObjectUrl(null);
    })
    .finally(() => {
      if (isMounted) setPreviewLoading(false);
    });

  return () => {
    isMounted = false;
    ctrl.abort();
    if (previewObjectUrl) window.URL.revokeObjectURL(previewObjectUrl);
  };
}, [previewDoc?.id]);
```

### Step 8: Modal Preview Responsif

**Lokasi:** `StudentDirectoryView.tsx:980-1158` (preview modal layout)

**Perubahan utama:**

1. **Container modal** — `flex flex-col md:flex-row` dengan `max-h-screen`
2. **Sidebar** — `w-full md:w-72` + `flex-shrink-0` + scroll vertikal
3. **Viewport** — `flex-1 min-h-[400px] md:min-h-0`
4. **Footer** — wrap pada mobile: `flex flex-col sm:flex-row gap-2`
5. **Document A4 simulator** — kalau muncul, pakai `max-w-full` (bukan `max-w-2xl`) di mobile

**Pseudocode struktur baru:**

```tsx
<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
  <div className="bg-slate-900 rounded-xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden">

    {/* HEADER (full width) */}
    <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2">
      <h3 className="text-xs sm:text-sm font-bold text-white truncate flex-1">{previewDoc.name}</h3>
      <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white">
        <X size={20} />
      </button>
    </div>

    {/* BODY: stacks vertical on mobile, horizontal on md+ */}
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

      {/* SIDEBAR — full width mobile, fixed 280px desktop */}
      <div className="w-full md:w-72 flex-shrink-0 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-4 max-h-[40vh] md:max-h-none">
        {/* metadata, version selector */}
      </div>

      {/* VIEWPORT — flex-1, scrollable */}
      <div className="flex-1 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto min-h-[300px]">
        {previewLoading ? <Spinner /> :
         previewObjectUrl ? <iframe src={previewObjectUrl} className="w-full h-full rounded border border-slate-800 bg-white" /> :
         <SimulatedFallback />}
      </div>
    </div>

    {/* FOOTER — wrap pada mobile */}
    <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <button onClick={...} className="w-full sm:w-auto">Tutup</button>
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <button onClick={download} className="flex-1 sm:flex-initial">Unduh</button>
        {canVerify && previewDoc.status === 'Verifikasi' && (
          <>
            <button onClick={approve} className="flex-1 sm:flex-initial">Setujui</button>
            <button onClick={reject} className="flex-1 sm:flex-initial">Tolak</button>
          </>
        )}
      </div>
    </div>
  </div>
</div>
```

### Step 9: Tambah `useRef` untuk File Input (Step 3 dependency)

Tambah di awal komponen:

```tsx
const fileInputRef = React.useRef<HTMLInputElement>(null);
```

Dan pasang ref di `<input type="file">` saat ini.

### Step 10: Import yang Dibutuhkan

Di header `StudentDirectoryView.tsx`:

```tsx
import {
  documentService,
  getDocumentFileUrl,
  normalizeStatus,
} from '../services/document.service';
```

Hapus import `useAuthStore` jika tidak dipakai untuk fetch lain (sekarang dipakai service).

---

## Acceptance Criteria

| Test | Expected |
|------|----------|
| Upload file PDF 5MB ke siswa | File tersimpan di `backend/uploads/`, record DB created, ID UUID |
| Refresh halaman setelah upload | Dokumen masih muncul di daftar (persistent) |
| Klik preview pada document UUID | Iframe menampilkan PDF asli, bukan simulasi |
| Klik "Setujui Berkas" | DB status berubah ke `TERARSIP`, badge update |
| Refresh setelah verify | Status tetap `Terarsip` |
| Klik "Hapus" pada document | Document hilang dari list, masuk Trash menu |
| Klik "Unduh" | Browser download file dengan nama original |
| Buka modal preview di mobile (375px) | Layout vertikal, sidebar di atas, viewport di bawah, footer wrap |
| Upload file 15MB | Reject di client side dengan pesan jelas |
| Upload .docx | Reject "tipe tidak didukung" |
| Tombol Verifikasi muncul | Saat status === 'Verifikasi' DAN role allowed |
| Klik tombol Verifikasi | Trigger PATCH request, status berubah |

---

## Verifikasi Real-vs-Mock Setelah Fix

Setelah implement, test:

1. **Buka DevTools Network tab**
2. **Klik upload** → harus ada `POST /api/v1/documents/upload`
3. **Klik verify** → harus ada `PATCH /api/v1/documents/:id/status`
4. **Klik delete** → harus ada `DELETE /api/v1/documents/:id`
5. **Klik download** → harus ada `GET /api/v1/documents/:id/file` dengan response Blob

Jika tidak ada request, ada bug. Jika ada request tapi error 4xx/5xx, baca response body untuk diagnosa.

---

## Estimasi Waktu

| Step | Time |
|------|------|
| 1. Service methods | 15 min |
| 2. Backend soft-delete endpoint | 20 min |
| 3-6. Refactor handlers | 60 min |
| 7. Preview useEffect | 15 min |
| 8. Responsive modal | 45 min |
| 9-10. Cleanup imports | 10 min |
| Testing manual | 30 min |
| **Total** | **~3 jam** |

---

## Risk

- **HMR cache** — setelah edit, harus full reload browser (Ctrl+Shift+R)
- **Existing mock documents** — siswa yang sudah punya `D_xxx_yyy` ID tidak akan bisa preview/verify/delete via real API. Solusi: tampilkan badge "Local" + button "Re-upload" untuk migrate.
- **Optimistic UI rollback** — jika API call gagal, state harus revert. Sudah dihandle via try/catch + notification.
- **CORS / auth** — pastikan token valid sebelum action. Refresh token interceptor sudah handle (Fase sebelumnya).
