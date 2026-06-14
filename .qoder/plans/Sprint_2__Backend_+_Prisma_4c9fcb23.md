# Sprint 2: Backend + Prisma Integration

## Existing Database Schema (already live at 192.168.100.55)

```
User          id, name, email, passwordHash, isActive, roleId, createdAt, updatedAt
Role          id, name (USER-DEFINED enum)
Student       id, nisn, nama, kelas, jurusan, email, telepon, alamat, tanggalLahir,
              status (enum), catatan, createdAt, updatedAt
Guardian      id, studentId, namaAyah, ktpAyah, namaIbu, ktpIbu, telepon*, alamat*
Document      id, studentId, uploadedById, type (enum), originalName, storedName,
              mimeType, sizeBytes, status (enum), storagePath, uploadedAt
ActivityLog   id, actorUserId, action, category (enum), entityType, entityId,
              details, createdAt (hypertable candidate)
```

---

## Task 1 — Install Prisma and introspect schema

```bash
npm install prisma @prisma/client --save
npx prisma init --datasource-provider postgresql
# then:
npx prisma db pull   # generates schema.prisma from live DB
npx prisma generate  # generates typed PrismaClient
```

`prisma/schema.prisma` will be auto-generated from the live tables.  
Add `DATABASE_URL` to `.env` — already present.

---

## Task 2 — Create NestJS backend in `backend/`

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── students/
│   │   │   ├── students.module.ts
│   │   │   ├── students.controller.ts
│   │   │   └── students.service.ts
│   │   ├── documents/
│   │   │   └── documents.module.ts
│   │   └── activity/
│   │       └── activity.module.ts
│   └── common/
│       ├── guards/
│       │   ├── jwt.guard.ts
│       │   └── permissions.guard.ts
│       └── decorators/
│           └── permissions.decorator.ts
├── package.json
└── tsconfig.json
```

Stack: `@nestjs/core`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`

---

## Task 3 — Implement core API endpoints

### Auth (`/api/v1/auth`)
```
POST /auth/login        → validate credentials → return accessToken + set httpOnly refresh cookie
POST /auth/refresh      → validate refresh cookie → return new accessToken
POST /auth/logout       → clear refresh cookie
```

JWT: access token 15min (in-memory), refresh token 7 days (httpOnly cookie).

### Students (`/api/v1/students`)
```
GET    /students         → list all (role: any)
GET    /students/:id     → single student + guardian + documents
POST   /students         → create (role: Super Admin, Staff TU)
PUT    /students/:id     → update (role: Super Admin, Staff TU)
DELETE /students/:id     → soft delete via updatedAt flag (role: Super Admin only)
```

### Activity Logs (`/api/v1/logs`)
```
GET  /logs              → paginated list (role: Super Admin, Staff TU)
POST /logs              → append entry (internal — called by other services)
```

---

## Task 4 — Wire frontend services to real API

Replace mock adapter bodies in these 3 files only. No component changes needed.

**`src/services/student.service.ts`**
```ts
// Before (mock):
getAll: async () => [..._students]

// After (real):
getAll: async () => {
  const { data } = await api.get<Student[]>('/students');
  return data;
}
```

**`src/services/activity.service.ts`** — same pattern for logs + notifications.

**`src/services/drive.service.ts`** — same pattern for sync/backup endpoints.

---

## Task 5 — Configure CORS + proxy

Add Vite proxy in `vite.config.ts` so frontend calls `/api/v1/...` and Vite forwards to NestJS:
```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001', changeOrigin: true }
  }
}
```

NestJS runs on port 3001, Vite dev server on 3000.

---

## Task 6 — Verify end-to-end

- `npm run lint` — zero TypeScript errors
- Manual test: login → fetch students from DB → create student → verify in DB
- Check `ActivityLog` table gets rows written on each mutation
