# OCR Pipeline Migration: Phases 1-3 (Revised)

## Current State
- Frontend file picker works (real `<input type="file">` via `useRef`)
- OCR modal still contains hardcoded simulation (`triggerAiScan` fills dummy names/NIK/addresses)
- Backend documents module exists as scaffold (GET/PATCH only, no upload)
- Prisma `Document` model ready with `originalName`, `storedName`, `storagePath`, `mimeType`, `sizeBytes`
- No Python service exists yet

## Implementation Priority
```
1. Disable simulator total (P0) -- Phase 1
2. Upload endpoint + local storage (P0) -- Phase 2
3. FastAPI + PaddleOCR + preprocessing + KTP parser (P0) -- Phase 3
4. OCR proxy NestJS (P0) -- Phase 3
5. Human review UI (defer to next sprint)
6. Queue system (defer)
7. Google Drive integration (defer)
```

---

## Task 1 -- Disable OCR Simulator (Phase 1)

**File: `src/components/StudentFormView.tsx`**

Remove the entire simulation engine. The "Isi Otomatis via AI Scanner" button will show a notification instead of opening the modal.

Specific changes:
- Delete the `triggerAiScan` function (~150 lines) -- all hardcoded names (Zahra Kirana, Ade Bagus, Kevin Austin, Irvan Kusuma, Siti Halimah, etc.)
- Delete the OCR modal JSX (the `{showAiScanner && ...}` block, ~50 lines)
- Delete state: `showAiScanner`, `isScanning`, `scanProgressLogs`, `scannedDocType`, `flashFields`
- Delete `ocrScanOptions` derived variable
- Replace the "Isi Otomatis via AI Scanner" button `onClick` to call `onAddNotification('OCR Dalam Pengembangan', 'Fitur OCR AI akan segera hadir. Saat ini Anda dapat mengunggah dokumen secara manual.', 'info')`
- Clean unused imports: `BrainCircuit`, `FileSearch2`, `Sparkles`

**Result:** Upload works, no fake OCR, button shows honest "coming soon" toast.

---

## Task 2 -- Backend Upload Endpoint (Phase 2)

### 2a. Install dependencies

```bash
cd backend
npm install @nestjs/platform-express multer uuid
npm install -D @types/multer @types/uuid
```

### 2b. Create uploads directory

`backend/uploads/` with `.gitkeep` (files ignored in `.gitignore`)

### 2c. Add upload endpoint

**File: `backend/src/modules/documents/documents.controller.ts`**

Add:
```
POST /api/v1/documents/upload
```
- `@UseInterceptors(FileInterceptor('file'))` from `@nestjs/platform-express`
- Accepts: `file` (multipart), `studentId`, `type` (DocumentType enum)
- Saves file to `uploads/` with UUID-based name
- Creates `Document` record in DB via Prisma
- Returns document metadata `{ id, originalName, storedName, sizeBytes, mimeType, storagePath, status }`

**File: `backend/src/modules/documents/dto/document.dto.ts`**

Add `UploadDocumentDto`:
```ts
@IsString() studentId: string;
@IsEnum(DocumentType) type: DocumentType;
```

### 2d. Add file serve endpoint

**File: `backend/src/modules/documents/documents.controller.ts`**

Add:
```
GET /api/v1/documents/:id/file
```
- Streams the file from `uploads/` directory
- Sets correct `Content-Type` header from DB mimeType

### 2e. Serve static uploads

**File: `backend/src/main.ts`**

Add `app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))` for development file access.

### 2f. Update .gitignore

Add `backend/uploads/*` (except `.gitkeep`) to prevent committed uploads.

---

## Task 3 -- Frontend Upload Integration (Phase 2 continued)

**File: `src/services/document.service.ts`** (new)

Add upload API call:
```ts
export async function uploadDocument(file: File, studentId: string, type: DocumentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('studentId', studentId);
  formData.append('type', type);
  return api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}
```

**File: `src/components/StudentFormView.tsx`**

Update `handleFileChange`:
- After setting local `docsUploaded` state, also call `uploadDocument(file, studentId, docType)` to persist to backend
- Show upload progress or success notification
- Store returned `documentId` for later OCR reference

Note: For new student creation (no studentId yet), files stay in local state and upload happens after `handleSubmit` creates the student. Add a "pending uploads" queue pattern.

---

## Task 4 -- Python OCR Microservice (Phase 3)

Create new directory: `ocr-service/`

### Structure:
```
ocr-service/
  app.py              # FastAPI endpoints
  preprocessing.py    # OpenCV image preprocessing pipeline
  ktp_parser.py       # Regex-based KTP field extraction
  kk_parser.py        # Regex-based KK field extraction
  requirements.txt    # fastapi, uvicorn, paddleocr, paddlepaddle, opencv-python, pillow
  Dockerfile          # Python 3.10-slim + deps
  .env.example        # Config template
```

### Endpoints:
```
POST /ocr/ktp    -- Preprocess + OCR + parse KTP fields
POST /ocr/kk     -- Preprocess + OCR + parse KK fields
GET  /health     -- Health check (model loaded status)
```

### Implementation:

**app.py** -- FastAPI with `UploadFile` parameter, CORS enabled for NestJS origin

**preprocessing.py** -- Image preprocessing pipeline (critical for Indonesian phone photos):
```python
def preprocess_image(image_path: str) -> np.ndarray:
    img = cv2.imread(image_path)
    img = resize(img, width=1200)        # normalize size
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(...)   # binarize
    deskewed = deskew(thresh)             # fix rotation
    return deskewed
```
Without preprocessing ~60-70% accuracy, with preprocessing ~85-95%.

**ktp_parser.py** -- Regex-based field extraction from raw OCR text:
```python
def parse_ktp(raw_text: str) -> dict:
    nik = re.search(r'\b\d{16}\b', raw_text)
    nama = re.search(r'Nama\s*:\s*(.+)', raw_text, re.I)
    alamat = re.search(r'Alamat\s*:\s*(.+)', raw_text, re.I)
    pekerjaan = re.search(r'Pekerjaan\s*:\s*(.+)', raw_text, re.I)
    # ... gol_darah, agama, status_perkawinan, etc.
    return { field: value or None, confidence: score }
```
OCR only produces raw text -- the parser extracts structured fields.

**Response format:**
```json
{
  "nama": "Budi Santoso",
  "nik": "3273xxxxxxxxxxxx",
  "alamat": "Jl. Merdeka No. 10, Bandung",
  "pekerjaan": "Karyawan Swasta",
  "confidence": 0.92,
  "raw_text": "..."
}
```
- Error handling: return `{ "error": "..." }` with 422 for unreadable images

### 4b. NestJS OCR Proxy

**File: `backend/src/modules/documents/ocr.service.ts`** (new)

Add service that calls Python microservice:
```ts
async extractKtp(documentId: string): Promise<OcrResult> {
  const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
  const filePath = doc.storagePath;
  // POST file to http://localhost:8000/ocr/ktp
  // Return parsed result
}
```

**File: `backend/src/modules/documents/documents.controller.ts`**

Add:
```
POST /api/v1/documents/:id/ocr
```
- Calls `ocr.service.ts` to proxy to Python
- Returns extracted fields
- Does NOT modify any form data -- frontend decides what to auto-fill

### 4c. OCR Result Storage (Prisma)

Add to `prisma/schema.prisma`:
```prisma
model Document {
  // ... existing fields
  ocrResult   Json?      // raw OCR output
  ocrStatus   OcrStatus  @default(PENDING)
  ocrRunAt    DateTime?
}

enum OcrStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```
This allows OCR results to persist and be reviewed later without re-running.

---

## Task 5 -- Verify End-to-End

- `npx nest build` -- zero errors
- Start backend: `npm run dev`
- Start Python: `cd ocr-service && uvicorn app:app --reload`
- Frontend: upload a KTP image -> file saved to `backend/uploads/` -> DB record created
- Call `POST /api/v1/documents/:id/ocr` -> PaddleOCR reads image -> KTP parser extracts fields -> result stored in `Document.ocrResult`
- Frontend shows extracted data for **human review** (no auto-fill -- user confirms/edits before applying)

---

## Technology Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | File picker, display OCR results for review |
| API | NestJS + Multer | File upload, DB, OCR proxy |
| DB | PostgreSQL + Prisma | Document metadata + OCR results |
| Storage | Local filesystem | `backend/uploads/` |
| OCR | Python + FastAPI + PaddleOCR | KTP/KK text extraction |
| Preprocessing | OpenCV + Pillow | Resize, grayscale, threshold, deskew |
| Parser | Python regex | NIK (16-digit), nama, alamat, pekerjaan |