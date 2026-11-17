# AGENTS.md — SafetyLog

Panduan kerja untuk seluruh developer dan AI coding agent pada proyek **SafetyLog** (Closed-Loop Platform untuk Keselamatan Kerja dan Keandalan Mesin di Industri Manufaktur).

## 1. Gambaran Produk

SafetyLog menghubungkan alur **Capture → Resolve → Learn → Prevent** agar laporan kondisi tidak aman (K3) dan gangguan mesin ditangani sampai tuntas, diverifikasi oleh pihak independen, dan tersimpan sebagai basis pengetahuan untuk mencegah masalah berulang.

## 2. Sembilan Aturan Produk (Wajib Dipatuhi)

1. **Bukan sekadar aplikasi lapor**: Nilai utama ada pada tindak lanjut sampai tuntas (CAPA) dan pencegahan masalah berulang.
2. **MVP tanpa AI dan IoT**: Fitur "kasus mirip" menggunakan kemiripan teks (PostgreSQL `pg_trgm`), bukan AI. Jangan menyebutnya AI di demo.
3. **Verifikator tidak boleh sama dengan PIC**: Kasus tidak bisa ditutup oleh orang yang mengerjakan tindakannya (berlaku untuk semua peran, termasuk Admin).
4. **Kasus Sedang/Tinggi wajib tindakan Preventif**: Kasus dengan level risiko Sedang atau Tinggi tidak bisa ditutup sebelum memiliki minimal 1 tindakan berjenis Preventif yang selesai.
5. **Angka kerugian berlabel "perkiraan"**: Setiap estimasi biaya atau kerugian wajib mencantumkan label "perkiraan".
6. **Pemisahan data antar organisasi (multi-tenant)**: Setiap tabel utama wajib memiliki `organization_id`, dan seluruh query serta endpoint wajib membatasi akses berdasarkan `organization_id` pengguna yang login.
7. **Kasus Selesai terkunci & Audit Log append-only**: Kasus berstatus Selesai tidak dapat diubah lagi (kecuali melalui alur resmi buka ulang kasus), dan riwayat perubahan (`case_status_histories`) hanya boleh ditambah, tidak boleh diubah atau dihapus melalui aplikasi.
8. **Bukan pengganti prosedur darurat resmi**: Untuk laporan berjenis Insiden dengan orang terdampak, tampilkan pengingat untuk mengikuti prosedur darurat perusahaan terlebih dahulu.
9. **Kejujuran produk**: Versi MVP (v0.1) menggunakan data demo; jangan mengklaim fitur yang belum ada atau data yang belum tervalidasi.

## 3. Tech Stack & Struktur Folder

- `/api` — Backend REST API menggunakan **Laravel** + **Laravel Sanctum** (PostgreSQL di staging dengan full-text search & `pg_trgm`; SQLite didukung untuk pengembangan & test lokal).
- `/web` — Frontend PWA menggunakan React (Vite), Tailwind CSS + shadcn/ui, TanStack Query, React Hook Form + Zod.
- `/docs` — Dokumen panduan, kontrak API (`openapi.yaml`, `api-contract.md`), dan catatan keputusan.
- `AGENTS.md` — Konteks kerja tim & aturan agent (file ini).

## 4. Menjalankan & Menguji Backend (`/api`)

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

Menjalankan tes otomatis & linter:

```bash
cd api
php artisan test
./vendor/bin/pint --test
```

## 5. Konvensi Penamaan, Branch, & Commit

- **Penamaan kode**: Nama tabel, kolom, variabel, class, route, dan fungsi menggunakan **bahasa Inggris**.
- **Bahasa pengguna**: Pesan validasi, label status, notifikasi, dan teks yang dilihat pengguna menggunakan **bahasa Indonesia** yang sederhana dan jelas.
- **Konfigurasi berbasis data**: Kategori kasus, jenis kasus, ambang skor risiko, target waktu (SLA), dan label status disimpan di tabel konfigurasi/master (`case_types`, `categories`, `risk_configs`, `configurations`), **tidak ditulis mati (hardcoded)** di kode.
- **Branch & PR**:
  - Satu item backlog = satu cabang = satu PR (`feature/B-XX-deskripsi-singkat`, contoh: `feature/B-08-form-lapor`).
  - Judul PR dan pesan commit diawali ID item (contoh: `B-12: Implementasi penilaian risiko dan triase`).
  - Dilarang push langsung ke `main`. Semua perubahan masuk lewat PR minimal 1 reviewer dengan CI hijau.

## 6. Daftar "Jangan"

- **Jangan** push langsung ke cabang `main`.
- **Jangan** menyimpan password, API token, file `.env`, file database lokal (`*.sqlite`), atau catatan mentah wawancara ke dalam repo.
- **Jangan** mengubah skema database secara manual tanpa membuat file migrasi Laravel.
- **Jangan** menulis aturan bisnis (skor risiko, verifikator != PIC, wajib preventif, pembatasan peran/organisasi) tanpa feature test otomatis.
- **Jangan** men-hardcode ambang skor risiko atau target waktu di controller/service; selalu baca dari `risk_configs` / `configurations`.
- **Jangan** menggabungkan fitur di luar cakupan item backlog yang sedang dikerjakan tanpa persetujuan Product Owner (Afgan).
