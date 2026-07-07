# Panduan Pemulihan Data ARBAL (Restore Procedure)

Dokumen ini menjelaskan prosedur manual untuk memulihkan database dan berkas digital kesiswaan ARBAL dari berkas cadangan (*backup* `.zip`). Restore sengaja dinonaktifkan dari antarmuka web (UI) dan endpoint HTTP secara default demi alasan keamanan dan pencegahan kehilangan data yang tidak disengaja.

---

## 1. Persiapan Pemulihan

Sebelum memulai pemulihan data, pastikan Anda memiliki:
1. Berkas backup ZIP, misalnya `arbal-backup-manual-2026-06-22T12-30-00-000Z.zip`.
2. Akses CLI ke server target.
3. Kredensial basis data PostgreSQL yang valid.
4. Utilitas `unzip` (Linux) atau PowerShell (Windows), serta utilitas klien `psql` PostgreSQL.
5. Variabel lingkungan `ARBAL_ROOT` diisi dengan path instalasi ARBAL (contoh: `C:\path\to\ARBAL` atau `/var/www/arbal`).

---

## 2. Langkah-Langkah Pemulihan

### Langkah 2.1: Ekstraksi Berkas Backup

Ekstrak berkas cadangan `.zip` ke direktori sementara.

**Pada Linux:**
```bash
unzip arbal-backup-manual-2026-06-22T12-30-00-000Z.zip -d /tmp/arbal-restore/
```

**Pada Windows (PowerShell):**
```powershell
Expand-Archive -Path .\arbal-backup-manual-2026-06-22T12-30-00-000Z.zip -DestinationPath C:\Windows\Temp\arbal-restore -Force
```

Setelah diekstrak, direktori tersebut akan berisi:
* `database.sql`: SQL dump dari basis data PostgreSQL.
* `uploads/`: Direktori berisi berkas digital siswa (KK, Akta, Ijazah, dll).
* `metadata.json`: Metadata informasi backup.
* `manifest.json`: Daftar checksum integritas untuk isi backup.
* `README.txt`: Panduan informasi dasar.

---

### Langkah 2.2: Pemulihan Database (PostgreSQL)

Peringatan: Proses ini akan mengosongkan dan menimpa database ARBAL aktif Anda saat ini.

Gunakan utilitas `psql` untuk menjalankan perintah SQL pemulihan data pada database target Anda. Sesuaikan URL koneksi database berdasarkan environment variable `DATABASE_URL` Anda.

```bash
# Ganti dengan connection string database aktif Anda atau gunakan env DATABASE_URL
psql -v ON_ERROR_STOP=1 -1 -d "$DATABASE_URL" -f /tmp/arbal-restore/database.sql
```

*Catatan: Gunakan mode fail-fast dan single transaction seperti contoh di atas agar proses restore dibatalkan penuh jika ada satu error SQL. Jalur fallback restore programatik tidak lagi direkomendasikan untuk operasi produksi.*

---

### Langkah 2.3: Pemulihan File Digital Siswa (Uploads)

Salin seluruh folder `uploads/` hasil ekstraksi ke direktori target server aplikasi ARBAL (biasanya di direktori root aplikasi ARBAL). Untuk operasi produksi, sangat disarankan membuat salinan snapshot dari `uploads` aktif lebih dulu agar rollback file dapat dilakukan jika copy gagal.

**Pada Linux:**
```bash
# Asumsikan direktori backend ARBAL berada di /var/www/arbal/backend
cp -r /var/www/arbal/backend/uploads /var/www/arbal/backend/uploads.rollback
rm -rf /var/www/arbal/backend/uploads
cp -r /tmp/arbal-restore/uploads /var/www/arbal/backend/uploads
chown -R node:node /var/www/arbal/backend/uploads
```

**Pada Windows (PowerShell):**
```powershell
# Buat snapshot dulu, lalu ganti folder aktif
Copy-Item -Path "$ARBAL_ROOT\backend\uploads" -Destination "$ARBAL_ROOT\backend\uploads.rollback" -Recurse -ErrorAction SilentlyContinue
Remove-Item -Path "$ARBAL_ROOT\backend\uploads" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "C:\Windows\Temp\arbal-restore\uploads" -Destination "$ARBAL_ROOT\backend\uploads" -Recurse
```

---

## 3. Verifikasi Pasca Pemulihan

Setelah proses pemulihan selesai:
1. Mulai ulang aplikasi backend ARBAL (`npm run dev` atau melalui PM2/systemd).
2. Verifikasi status kesehatan sistem melalui endpoint `/api/v1/health` dengan menggunakan akun `SUPER_ADMIN` untuk melihat log diagnosis internal lengkap.
3. Lakukan pengujian login menggunakan akun yang ada dalam basis data pemulihan.
4. Periksa direktori kesiswaan pada UI untuk memastikan berkas lampiran siswa dapat dibuka/dipreview kembali dengan sukses.
