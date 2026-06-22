# Panduan Pemulihan Data ARBAL (Restore Procedure)

Dokumen ini menjelaskan prosedur manual untuk memulihkan database dan berkas digital kesiswaan ARBAL dari berkas cadangan (*backup* `.zip`). Prosedur ini sengaja dinonaktifkan dari antarmuka web (UI) demi alasan keamanan pencegahan data hilang yang tidak disengaja.

---

## 1. Persiapan Pemulihan

Sebelum memulai pemulihan data, pastikan Anda memiliki:
1. Berkas backup ZIP, misalnya `arbal-backup-manual-2026-06-22T12-30-00-000Z.zip`.
2. Akses CLI ke server target.
3. Kredensial basis data PostgreSQL yang valid.
4. Utilitas `unzip` (Linux) atau PowerShell (Windows), serta utilitas klien `psql` PostgreSQL.

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
* `README.txt`: Panduan informasi dasar.

---

### Langkah 2.2: Pemulihan Database (PostgreSQL)

Peringatan: Proses ini akan mengosongkan dan menimpa database ARBAL aktif Anda saat ini.

Gunakan utilitas `psql` untuk menjalankan perintah SQL pemulihan data pada database target Anda. Sesuaikan URL koneksi database berdasarkan environment variable `DATABASE_URL` Anda.

```bash
# Ganti URL PostgreSQL dengan URL database aktif Anda
psql -d "postgresql://adminmustaqbal:mustaqbaldb155@192.168.100.55:5432/arbal_db" -f /tmp/arbal-restore/database.sql
```

*Catatan: File `database.sql` yang digenerate oleh ARBAL secara otomatis menonaktifkan trigger integritas (`session_replication_role = 'replica'`) selama proses import untuk menghindari kegagalan foreign key, dan mengaktifkannya kembali setelah proses selesai.*

---

### Langkah 2.3: Pemulihan File Digital Siswa (Uploads)

Salin seluruh folder `uploads/` hasil ekstraksi ke direktori target server aplikasi ARBAL (biasanya di direktori root aplikasi ARBAL).

**Pada Linux:**
```bash
# Asumsikan direktori backend ARBAL berada di /var/www/arbal/backend
rm -rf /var/www/arbal/backend/uploads
cp -r /tmp/arbal-restore/uploads /var/www/arbal/backend/uploads
chown -R node:node /var/www/arbal/backend/uploads
```

**Pada Windows (PowerShell):**
```powershell
# Hapus folder lama jika ada, lalu salin folder baru
Remove-Item -Path "C:\Users\renre\Downloads\ARBAL\backend\uploads" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "C:\Windows\Temp\arbal-restore\uploads" -Destination "C:\Users\renre\Downloads\ARBAL\backend\uploads" -Recurse
```

---

## 3. Verifikasi Pasca Pemulihan

Setelah proses pemulihan selesai:
1. Mulai ulang aplikasi backend ARBAL (`npm run dev` atau melalui PM2/systemd).
2. Verifikasi status kesehatan sistem melalui endpoint `/api/v1/health` dengan menggunakan akun `SUPER_ADMIN` untuk melihat log diagnosis internal lengkap.
3. Lakukan pengujian login menggunakan akun yang ada dalam basis data pemulihan.
4. Periksa direktori kesiswaan pada UI untuk memastikan berkas lampiran siswa dapat dibuka/dipreview kembali dengan sukses.
