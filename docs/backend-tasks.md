# Rincian Tugas Backend SafetyLog (Tech Stack: Laravel + Sanctum + PostgreSQL)

Dokumen ini merangkum pembagian pekerjaan sisi **backend (`/api`)** berdasarkan `SafetyLog_Panduan_Sprint_MVP.docx` dan proposal `bpc.pdf`.

---

## 1. Gambaran Besar Sistem (dari BPC & Panduan Sprint)

SafetyLog adalah platform SaaS B2B berbasis web (PWA) dengan alur tertutup (**Closed-Loop**):
**Capture → Resolve → Learn → Prevent**.

- **Target awal**: Pabrik makanan, minuman, dan pengemasan skala menengah di Jawa Timur (kebutuhan audit SMK3 PP No. 50/2012 & pengurangan downtime berulang).
- **Prinsip arsitektur**:
  - Multi-tenant ketat berbasis `organization_id` (UU PDP / UU No. 27/2022).
  - Data-driven configuration: jenis kasus, kategori, ambang skor risiko, target waktu (SLA), dan label status disimpan di tabel database (`case_types`, `categories`, `risk_configs`, `configurations`), bukan hardcoded.
  - Append-only audit log (`case_status_histories`) dan penguncian kasus Selesai (`is_locked`).
  - MVP seminggu tanpa AI/IoT, tanpa WhatsApp API, tanpa ekspor PDF/Excel, tanpa SSO/multi-site kompleks.

---

## 2. Daftar Tugas Backend per PIC

### A. Tugas Inti **Nadim** (Developer — Backend Inti)

| ID | Prioritas | Item | Ruang Lingkup Server (Laravel) |
| --- | --- | --- | --- |
| **B-03** | Must (5j) *(bareng Reva)* | Skema database, migrasi, seeder | Seluruh tabel inti (`organizations`, `sites`, `areas`, `machines`, `users`, `case_types`, `categories`, `risk_configs`, `configurations`, `case_sequences`, `safety_cases`, `case_actions`, `attachments`, `case_status_histories`, `app_notifications`), index PostgreSQL `pg_trgm`, dan seeder dasar (1 org, 1 site, 3 mesin, 4 user lintas peran). |
| **B-05** | Must (5j) | Login dan 4 peran | Autentikasi Sanctum (`/auth/login`, `/auth/logout`, `/auth/me`), rate limit login (maksimal percobaan gagal), RBAC 4 peran (`reporter`, `supervisor`, `hse`, `admin`), penolakan HTTP `403` pada endpoint di luar hak akses peran & organisasi. |
| **B-08** | Must (8j) *(server)* | Form lapor via QR / mesin | `POST /api/cases` dengan 3 isian wajib (`machine_id`, `case_type_id`, `description`), 2 pertanyaan cepat (`is_machine_stopped`, `has_affected_people`), upload foto opsional, penomoran otomatis `SL-{SITE_CODE}-{TAHUN}-{0001}` yang aman dari race condition, serta `emergency_reminder` bila `Insiden` + ada orang terdampak. |
| **B-10** | Should (2j) | Peringatan kasus terbuka | `GET /api/machines/{machine}/open-cases` dan info pada `GET /api/machines/qr/{qrToken}` untuk mendeteksi kasus belum selesai pada mesin yang sama dalam 7 hari terakhir (konfigurabel). Tetap mengizinkan pelapor mengirim laporan baru. |
| **B-11** | Must (6j) *(server)* | Antrean triase & detail kasus | `GET /api/cases` (terbatas Supervisor/K3/Admin; filter `status`, `machine_id`, `case_type_id`, `category_id`, `risk_level`, tanggal, pencarian dasar; terbaru di atas), `GET /api/my-cases` (untuk semua peran melihat laporannya sendiri), dan `GET /api/cases/{case}` (detail lengkap satu layar: kejadian, foto, risiko, 5 Why/6M, tindakan, riwayat, serta permission flags). |
| **B-12** | Must (5j) *(server)* | Penilaian risiko, PIC, tolak/duplikat | `POST /api/cases/{case}/triage` khusus Supervisor & Admin. Hitung `risk_score = severity × likelihood`, baca level & saran SLA dari tabel `risk_configs` (bukan hardcoded), tunjuk PIC, atau tolak (alasan wajib) / tandai duplikat (`duplicate_of_case_id` & alasan wajib). Status `Baru → Dinilai` / `Ditolak` / `Duplikat`. |
| **B-14** | Must (6j) *(server)* | Tindakan korektif/preventif & Tindakan Saya | `POST /api/cases/{case}/actions` khusus Supervisor, K3, & Admin (`Sementara` / `Korektif` / `Preventif`, judul, PIC dalam org sama, tenggat otomatis dari `risk_configs` atau manual). Status kasus otomatis menjadi `Tindakan berjalan`. `GET /api/my-actions` mengurutkan tenggat terdekat di atas dan menandai `is_overdue` ("Terlambat"). |
| **B-15** | Must (3j) *(server)* | Menyelesaikan tindakan | `POST /api/actions/{action}/complete` khusus PIC tindakan terkait (`pic_user_id === user.id`, berlaku untuk semua peran termasuk Admin). Catatan hasil wajib + foto bukti opsional. Jika semua tindakan kasus sudah selesai, status kasus otomatis berpindah ke `Menunggu verifikasi`. |
| **B-16** | Must (5j) *(server)* | Verifikasi dan tutup kasus | `POST /api/cases/{case}/verify` khusus K3/Verifikator & Admin. Menolak jika verifikator adalah PIC tindakan/kasus; menolak penutupan kasus `Sedang`/`Tinggi` tanpa minimal 1 tindakan `Preventif` selesai; mewajibkan `learning_summary`. Jika disetujui: status `Selesai` & kasus terkunci (`is_locked = true`). Jika ditolak: alasan wajib & kembali ke `Tindakan berjalan`. |

---

### B. Tugas Backend Rekan Tim Lain (untuk Koordinasi & Integrasi)

| PIC | ID | Item | Keterkaitan dengan Backend Nadim |
| --- | --- | --- | --- |
| **Reva** | B-03, B-06, B-19, B-20, B-21, B-23, (C-01) | Skema DB (bareng Nadim), CRUD Area & Mesin, Pencarian `pg_trgm` salah ketik, Riwayat Mesin & Kasus Mirip, Data Dashboard, Seed lengkap (±30 kasus / 10 mesin) | Memakai tabel & model yang sudah disiapkan pada B-03 (`machines`, `areas`, `safety_cases`, `case_actions`). |
| **Afgan** | B-13, B-17, B-22, (C-02) | Analisis penyebab (5 Why + 6M), Buka ulang kasus Selesai, Audit log UI/endpoint, Perkiraan kerugian sederhana | Kolom `five_whys`, `root_cause_category`, `reopened_*`, dan tabel append-only `case_status_histories` sudah disiapkan di B-03 serta otomatis tercatat pada seluruh transisi status Nadim. |
| **Panji** | B-01, B-07, B-09, B-18, B-25 | Setup CI/CD, halaman cetak QR, kompresi & upload foto, notifikasi in-app (`app_notifications`) & hardening keamanan | Endpoint `GET /api/machines/qr/{qrToken}` dan validasi lampiran foto (`JPG`/`PNG`/`WebP` maks 5MB) sudah disiapkan agar upload/QR langsung terhubung. |
