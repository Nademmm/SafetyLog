# SafetyLog

Platform closed-loop untuk keselamatan kerja (K3) dan keandalan mesin di industri manufaktur (**Capture → Resolve → Learn → Prevent**).

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS + shadcn/ui + TanStack Query + React Hook Form + Zod (PWA, mobile-first)
- **Backend**: Laravel (REST API) + Laravel Sanctum (login/sesi)
- **Database**: PostgreSQL (full-text search + pg_trgm for text similarity), SQLite untuk lokal
- **File Foto**: Penyimpanan lokal Laravel (nanti bisa diganti ke S3-compatible)
- **Antrean/Notifikasi**: Queue driver database, notifikasi dalam aplikasi
- **CI/CD**: GitHub Actions (tes otomatis + deploy ke staging)
- **Server**: Docker Compose di 1 VPS (Asia), Caddy untuk HTTPS otomatis
- **Kolaborasi**: GitHub (PR wajib), board (GitHub Projects), kontrak API OpenAPI

## Struktur Repositori

- `api/` - Backend REST API (Laravel + Sanctun)
- `resources/views/` - Tampilan Blade MVP yang dilayani backend Laravel
- `docs/` - Rincian tugas backend (`docs/backend-tasks.md`), kontrak API (`docs/api-contract.md`, `docs/openapi.yaml`)
- `AGENTS.md` - Aturan kerja tim dan coding agent

## Cara Menjalankan Backend Lokal (8 Langkah)

1. Masuk ke folder backend:
   ```bash
   cd api
   ```
2. Install dependensi PHP:
   ```bash
   composer install
   ```
3. Salin konfigurasi lingkungan:
   ```bash
   cp .env.example .env
   ```
4. Buat application key:
   ```bash
   php artisan key:generate
   ```
5. Siapkan file database SQLite lokal (atau konfigurasi PostgreSQL di `.env`):
   ```bash
   touch database/database.sqlite
   ```
6. Jalankan migrasi dan seeder awal (`B-03`):
   ```bash
   php artisan migrate:fresh --seed
   ```
7. Jalankan server API lokal:
   ```bash
   php artisan serve
   ```
8. Jalankan seluruh automated test dan linter:
   ```bash
   php artisan test
   ./vendor/bin/pint --test
   ```

## Akun Demo Seeder

Password semua akun: `password123`

- Pelapor: `pelapor@safetylog.test`
- Supervisor: `supervisor@safetylog.test`
- K3/Verifikator: `k3@safetylog.test`
- Manajer/Admin: `admin@safetylog.test`

---

## Status Pengembangan MVP SAFETYLog

**Sudah Dikerjain (Must - commit utama):**
- B-01: Setup repo, CI, aturan kerja
- B-02: Server staging dan auto-deploy
- B-03: Skema database, migrasi, seeder
- B-04: Wireframe dan design tokens
- B-05: Login dan 4 peran
- B-06: Kelola area dan mesin
- B-07: QR per mesin
- B-09: Upload foto
- B-22: Riwayat perubahan (audit log)
- B-23: Data demo (seed) realistis

**Belum Dikerjain (Should/Could - akan datang):**
- B-08: Form lapor (full production)
- B-10: Peringatan kasus terbuka
- B-11: Antrean triase dan detail kasus
- B-12: Penilaian risiko, PIC, tolak/duplikat
- B-13: Analisis penyebab (5 Why & 6M)
- B-14: Tindakan korektif/preventif
- B-15: Menyelesaikan tindakan
- B-16: Verifikasi dan tutup kasus
- B-17: Buka ulang kasus
- B-18: Notifikasi dalam aplikasi
- B-19: Pencarian kasus
- B-20: Riwayat mesin dan kasus mirip
- B-21: Dashboard dasar
- B-24: UAT, bug bash, skrip demo
- B-25: PWA (bisa dipasang di layar utama)

**Stretch/Could (jika waktu sisa):**
- C-01: Label "Berulang"
- C-02: Perkiraan kerugian sederhana
- C-03: Impor mesin dari CSV
- C-04: Notifikasi email

**Bukan untuk Sprint Minggu Ini (ditunda):**
- WhatsApp integration
- Mode offline (draf)
- AI dan sensor/IoT
- Ekspor Excel/PDF
- Eskalasi otomatis
- Aplikasi native Android/iOS
- Banyak pabrik sekaligus, SSO, integrasi ERP