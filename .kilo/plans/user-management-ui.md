# Plan: User Management UI — Manajemen Akses Super Admin

## Konteks

Backend sudah **100% siap**:
- `GET /users` — list semua akun
- `POST /users` — buat akun baru
- `PATCH /users/:id` — edit nama, email, role, status aktif
- `POST /users/:id/reset-password` — reset password
- `DELETE /users/:id` — soft-delete akun

Semua endpoint dijaga `@Permissions('user.manage')` → hanya SUPER_ADMIN.

Frontend `SecurityAndAccessView.tsx` saat ini hanya menampilkan daftar akun read-only. Plan ini upgrade menjadi full management panel, **hanya aktif saat user adalah SUPER_ADMIN**.

---

## Desain UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Manajemen Hak Akses & Kebijakan                                │
├─────────────────────────────────────────────────────────────────┤
│  [Hero: info sesi aktif + role badge]                           │
├────────────────────────────┬────────────────────────────────────┤
│  Matriks Izin RBAC         │  Manajemen Akun (SUPER_ADMIN only) │
│  (read-only, semua role)   │                                    │
│                            │  [+ Tambah Akun Baru]              │
│                            │  ┌──────────────────────────────┐  │
│                            │  │ Ahmad Fauzi          STAFF_TU│  │
│                            │  │ ahmad@sekolah.id    [Edit][⋮]│  │
│                            │  └──────────────────────────────┘  │
│                            │  ┌──────────────────────────────┐  │
│                            │  │ Rina Herawati         GURU   │  │
│                            │  │ rina@sekolah.id     [Edit][⋮]│  │
│                            │  └──────────────────────────────┘  │
└────────────────────────────┴────────────────────────────────────┘
```

---

## Komponen Modal yang Dibutuhkan

### Modal A: Tambah Akun Baru
```
Field:
  Nama Lengkap*    [input text]
  Email*           [input email]
  Password*        [input password + show/hide toggle]
  Konfirmasi PW*   [input password]
  Role*            [select: SUPER_ADMIN | STAFF_TU | GURU | KEPALA_SEKOLAH]

Button: [Batal] [Simpan Akun]
```

### Modal B: Edit Akun
```
Field:
  Nama Lengkap     [input text, prefill]
  Email            [input email, prefill]
  Role             [select, prefill]
  Status           [toggle: Aktif / Nonaktif]

Button: [Batal] [Simpan Perubahan]
```

### Modal C: Ganti Password
```
Field:
  Password Baru*           [input password + show/hide]
  Konfirmasi Password*     [input password]

Note: Session aktif user ini akan diakhiri (forced re-login).

Button: [Batal] [Reset Password]
```

### Confirm Dialog: Hapus / Nonaktifkan Akun
```
⚠ Hapus akun "Nama User"?
Akun akan dinonaktifkan dan tidak bisa login.
Data terkait tetap tersimpan.

Button: [Batal] [Ya, Hapus]
```

---

## Fase Implementasi

### Fase 1: State & Hook Preparation

**File:** `src/hooks/useUsers.ts`

Sudah ada hooks berikut (tidak perlu tambah):
- `useUsers(enabled)` — fetch all users
- `useCreateUser()` — POST /users
- `useUpdateUser()` — PATCH /users/:id
- `useResetPassword()` — POST /users/:id/reset-password

Perlu tambah:
```typescript
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
```

Perlu tambah ke `src/services/user.service.ts`:
```typescript
remove: async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
},
```

---

### Fase 2: Komponen Modal

Buat file baru: `src/components/UserManagementPanel.tsx`

Komponen ini berisi semua modal dan logika management, di-import oleh `SecurityAndAccessView.tsx`.

**Struktur komponen:**
```
UserManagementPanel
  ├── UserListSection       — daftar akun + tombol aksi
  ├── CreateUserModal       — modal tambah akun baru
  ├── EditUserModal         — modal edit nama/email/role/status
  ├── ResetPasswordModal    — modal ganti password
  └── DeleteUserConfirm     — inline confirm (bukan modal terpisah)
```

**State yang dikelola:**
```typescript
type ModalMode = 'create' | 'edit' | 'reset-password' | null;
const [modalMode, setModalMode] = useState<ModalMode>(null);
const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
```

---

### Fase 3: Form Validation

**Aturan validasi frontend (mirror DTO backend):**

| Field | Rule |
|-------|------|
| `name` | required, maxLength 255 |
| `email` | required, valid email format, maxLength 255 |
| `password` | required (create), minLength 8, maxLength 128 |
| `confirmPassword` | harus match password |
| `roleName` | required, must be one of: `SUPER_ADMIN`, `STAFF_TU`, `GURU`, `KEPALA_SEKOLAH` |

Gunakan `useState` + inline validation, tanpa library form tambahan (konsisten dengan codebase).

**Password strength indicator:**
- Merah: < 8 karakter
- Kuning: 8-11 karakter
- Hijau: 12+ karakter

---

### Fase 4: Integrasi ke SecurityAndAccessView

**File:** `src/components/SecurityAndAccessView.tsx`

Perubahan:
1. Import `UserManagementPanel` dari file baru
2. Ganti section "Akun backend" (sisi kanan panel) dengan `UserManagementPanel`
3. Section kiri (matriks RBAC) tidak berubah

```tsx
{canManageUsers ? (
  <UserManagementPanel />
) : (
  <div className="...">Hanya Super Admin yang bisa akses panel ini.</div>
)}
```

---

## Detail Implementasi per Fitur

### A. Tambah Akun Baru

**Trigger:** Tombol "+ Tambah Akun" di header panel kanan

**Flow:**
1. Klik tombol → buka `CreateUserModal`
2. Isi form → validasi real-time
3. Submit → `useCreateUser().mutate(payload)`
4. Loading state pada tombol Simpan
5. Success → tutup modal + toast notification (via `onAddNotification`)
6. Error (409 email duplicate) → tampilkan pesan di bawah field email
7. Error lain → tampilkan error banner di modal

**Role options di select:**
```
📝 Staff TU       (STAFF_TU)
👨‍🏫 Guru/Wali Kelas (GURU)
🏫 Kepala Sekolah  (KEPALA_SEKOLAH)
🛡 Super Admin     (SUPER_ADMIN)
```

---

### B. Edit Akun

**Trigger:** Tombol "Edit" pada kartu akun

**Flow:**
1. Klik Edit → buka `EditUserModal` dengan data prefill
2. Bisa edit: nama, email, role, status aktif
3. Submit → `useUpdateUser().mutate({ id, ...changes })`
4. Backend akan reject jika:
   - Ubah role diri sendiri → tampilkan pesan error spesifik
   - Nonaktifkan diri sendiri → tampilkan pesan error spesifik
   - Email sudah dipakai → tampilkan di field email
5. Success → tutup modal + refresh list

**Self-edit protection:**
Jika `selectedUser.id === user.id` (akun login aktif):
- Field `role` dan `isActive` di-disable dengan tooltip penjelasan
- Hanya nama dan email yang bisa diubah

---

### C. Ganti Password (Reset)

**Trigger:** Dari dropdown menu aksi "⋮" tiap akun → "Ganti Password"

**Flow:**
1. Buka `ResetPasswordModal`
2. Input password baru + konfirmasi
3. Submit → `useResetPassword().mutate({ id, newPassword })`
4. Backend otomatis revoke semua refresh token user tersebut
5. Success → notifikasi "Password berhasil direset. User akan diminta login ulang."

---

### D. Nonaktifkan / Hapus Akun

**Trigger:** Dari dropdown menu aksi "⋮" → "Hapus Akun"

**Flow:**
1. Tampilkan inline confirm di kartu akun (replace tombol aksi)
2. Confirm → `useDeleteUser().mutate(id)`
3. Backend soft-delete + revoke token
4. Success → list refresh + notifikasi

**Guard:** Tombol hapus tidak muncul untuk akun sendiri (`id === user.id`).

---

## UX Detail

### Kartu Akun — Layout
```
┌──────────────────────────────────────────────────┐
│  [Avatar inisial]  Nama Lengkap          [badge] │
│                    email@domain.com              │
│  ─────────────────────────────────────────────  │
│  Role: Staff TU    Dibuat: 15 Jun 2026   [Edit] [⋮] │
└──────────────────────────────────────────────────┘
```

Avatar: inisial 2 huruf dengan background color berdasarkan role:
- SUPER_ADMIN → bg-rose-600
- STAFF_TU → bg-blue-600
- GURU → bg-amber-600
- KEPALA_SEKOLAH → bg-emerald-600

### Dropdown Menu "⋮" per akun:
```
├── ✏️  Edit Profil
├── 🔑  Ganti Password
├── ─────────────────
└── 🗑️  Hapus Akun     (merah, hidden jika diri sendiri)
```

### Empty state:
```
👤
Belum ada akun lain
Klik "+ Tambah Akun" untuk membuat akun baru.
```

---

## Error Handling

| Error | Tampilan |
|-------|----------|
| 409 Email duplikat | Pesan merah di bawah field email |
| 400 Role tidak valid | Pesan di field role |
| 400 Cannot change own role | Banner kuning di modal |
| 400 Cannot deactivate yourself | Banner kuning di modal |
| 401/403 | Redirect ke login / banner "Sesi habis" |
| 500 | Banner merah "Terjadi kesalahan server" |

---

## Files yang Diubah

| File | Perubahan |
|------|-----------|
| `src/hooks/useUsers.ts` | Tambah `useDeleteUser()` |
| `src/services/user.service.ts` | Tambah `remove()` method |
| `src/components/UserManagementPanel.tsx` | **BARU** — komponen utama |
| `src/components/SecurityAndAccessView.tsx` | Import + render `UserManagementPanel` |

Backend **tidak perlu perubahan** — semua endpoint sudah ada.

---

## Acceptance Criteria

| Test | Expected |
|------|----------|
| Login sebagai non-Super Admin → buka Manajemen Akses | Panel kanan hanya tampilkan notice "hanya Super Admin" |
| Login sebagai Super Admin → buka Manajemen Akses | Daftar akun muncul dari API |
| Klik "+ Tambah Akun" → isi form → submit | Akun baru muncul di list, POST /users terpanggil |
| Isi password < 8 karakter → submit | Validasi inline, form tidak submit |
| Password tidak match | "Password tidak cocok", form tidak submit |
| Buat akun dengan email yang sudah ada | Error "Email sudah digunakan" di field email |
| Edit nama akun lain → simpan | PATCH /users/:id dipanggil, nama terupdate |
| Edit role diri sendiri | Field role disabled, tidak bisa diubah |
| Klik Ganti Password → isi → submit | POST /users/:id/reset-password dipanggil |
| Reset password user lain | Notifikasi sukses, user tsb forced re-login |
| Hapus akun | Akun hilang dari list, DELETE /users/:id dipanggil |
| Tombol hapus pada akun sendiri | Tidak muncul / disabled |
| Semua aksi tercatat | Log muncul di ActivityLogView |

---

## Estimasi Waktu

| Fase | Waktu |
|------|-------|
| 1. Hook + service `remove` | 5 menit |
| 2. `UserManagementPanel` — layout + daftar akun | 30 menit |
| 3. Modal Tambah Akun + validasi | 30 menit |
| 4. Modal Edit + self-protection | 20 menit |
| 5. Modal Ganti Password | 15 menit |
| 6. Dropdown menu + hapus confirm | 15 menit |
| 7. Integrasi ke `SecurityAndAccessView` | 10 menit |
| **Total** | **~2 jam** |

---

## Catatan

- Tidak perlu library form tambahan (cukup useState + validasi manual)
- Tidak perlu perubahan backend sama sekali
- Komponen modal pakai pattern `fixed inset-0 z-50` konsisten dengan modal preview dokumen
- `onAddNotification` di-pass dari `SecurityAndAccessView` ke panel untuk feedback sukses/gagal
- Semua aksi audit log sudah otomatis dicatat oleh backend (tidak perlu `onAddLog` manual dari frontend)
