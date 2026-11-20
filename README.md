# SafetyLog

Platform closed-loop untuk keselamatan kerja (K3) dan keandalan mesin di industri manufaktur (**Capture → Resolve → Learn → Prevent**).

## Tech Stack

- **Frontend (`web/`)**: React 19 (Vite 8) + Tailwind CSS + TanStack Query + React Hook Form + Zod (PWA, mobile-first, Mode Malam & Siang)
- **Backend (`api/`)**: Laravel 12 (REST API) + Laravel Sanctum (Bearer Token dengan kedaluwarsa terkonfigurasi)
- **Database**: PostgreSQL (full-text search + `pg_trgm` untuk pencarian toleran typo), SQLite untuk pengembangan lokal
- **File Foto**: Penyimpanan privat Laravel (`attachments` via endpoint berotorisasi)
- **Notifikasi**: Notifikasi dalam aplikasi + pengingat tindakan terlambat
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml` — PHPUnit SQLite & PostgreSQL, Laravel Pint, oxlint, Vite build)

## Struktur Repositori

- `api/` — Backend REST API (Laravel + Sanctum)
- `web/` — Aplikasi web resmi React PWA (mobile-first, min. 360px, target sentuh 44px)
- `docs/` — Kontrak API (`docs/api-contract.md`, `docs/openapi.yaml`) dan rincian tugas (`docs/backend-tasks.md`)
- `AGENTS.md` — Aturan kerja tim, Git, dan 9 aturan produk SafetyLog

## Cara Menjalankan Lokal

### 1. Backend (`api/`)

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Pengujian & linter backend:

```bash
php artisan test
./vendor/bin/pint --test
```

### 2. Frontend (`web/`)

```bash
cd web
npm install
npm run dev
```

Untuk uji coba pemindaian kamera live langsung dari HP melalui jaringan lokal (HTTPS):

```bash
npm run dev:https
```

Lint & build produksi frontend:

```bash
npm run lint
npm run build
```

## Pembagian Peran (RBAC)

- **Pelapor (`reporter`)**: Pindai QR & kirim laporan (`/report`), lihat laporan sendiri (`/my-cases`), serta selesaikan tindakan & isi 5 Why/6M bila ditunjuk sebagai PIC (`/my-actions`).
- **Supervisor (`supervisor`)**: Antrean & pencarian kasus (`/cases`), triase risiko 5×5 & penunjukan PIC, tambah/edit tindakan CAPA, dashboard & audit log, serta `/my-actions`.
- **K3 / Verifikator (`hse`)**: Verifikasi independen (Verifikator ≠ PIC), wajib tindakan Preventif selesai untuk risiko Sedang/Tinggi, buka ulang kasus/tindakan, dashboard, audit log, serta `/my-actions`.
- **Manajer / Admin (`admin`)**: Seluruh visibilitas operasional + pengelolaan Site, Area & PIC Area, Mesin & Cetak QR (`/admin/machines`), Pengguna & Peran (`/admin/users`), serta Konfigurasi Matriks Risiko, SLA & Aturan Umum (`/admin/config`).

## Akun Demo Seeder (Hanya Lingkungan Lokal / Non-Produksi)

Kata sandi demo seeder: `password123`

- Pelapor: `pelapor@safetylog.test`
- Supervisor: `supervisor@safetylog.test`
- K3/Verifikator: `k3@safetylog.test`
- Manajer/Admin: `admin@safetylog.test`
