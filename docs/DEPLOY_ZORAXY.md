# Deploy ARBAL via Zoraxy

Dokumen ini adalah checklist singkat untuk jalur deploy ARBAL yang sekarang dipakai:

- domain publik: `arsip.insanmustaqbal.or.id`
- reverse proxy publik: `Zoraxy`
- aplikasi: `frontend` React statis + `backend` NestJS + `db` PostgreSQL
- OCR: opsional, bisa dinyalakan lewat profile Compose `ocr`

## 1. Siapkan Environment

1. Salin `.env.production.example` menjadi `.env`.
2. Isi semua secret produksi:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `OCR_INTERNAL_TOKEN` jika OCR dipakai
3. Pastikan `APP_URL` dan `CORS_ORIGINS` tetap memakai `https://arsip.insanmustaqbal.or.id`.

## 2. Jalankan Stack

Tanpa OCR:

```bash
docker compose up -d --build
```

Dengan OCR:

```bash
docker compose --profile ocr up -d --build
```

## 3. Target Internal yang Dipublikasikan Zoraxy

Zoraxy cukup mempublikasikan service `frontend`:

- host tujuan: server Docker ARBAL
- port tujuan: `${FRONTEND_PORT}` atau default `3000`
- scheme upstream: `http`

Jangan publikasikan `db` ke internet. `backend` juga sebaiknya tetap internal karena request API publik sudah dilewatkan dari frontend Nginx melalui `/api/`.

## 4. Jalur Request yang Diharapkan

1. Browser membuka `https://arsip.insanmustaqbal.or.id`
2. Zoraxy meneruskan request ke `frontend`
3. `frontend` Nginx melayani file React
4. Request `/api/*` diteruskan dari Nginx ke `backend:3001`
5. `backend` berbicara ke `db` dan, bila aktif, ke `ocr:8000`

## 5. Health Check Setelah Deploy

Periksa endpoint berikut:

- `https://arsip.insanmustaqbal.or.id/`
- `https://arsip.insanmustaqbal.or.id/api/v1/health`

Jika OCR diaktifkan, dari jaringan internal container cek:

```bash
docker compose exec ocr curl -f http://localhost:8000/health
```

## 6. Catatan Penting

- `VITE_API_BASE_URL` sudah diset ke `/api/v1`, jadi browser tetap melihat satu origin publik.
- Refresh token memakai cookie `httpOnly`, sehingga skema satu domain ini paling cocok dengan implementasi auth sekarang.
- Jalankan backend dalam `NODE_ENV=production` agar cookie refresh bertanda `Secure`.
