# Kontrak API SafetyLog (Panduan Integrasi Backend & Frontend)

Base URL lokal: `http://localhost:8000/api`
Header wajib untuk endpoint terproteksi:
- `Accept: application/json`
- `Authorization: Bearer <token>`

---

## 1. Akun Demo Seeder

Password seluruh akun demo lokal: `password123`

| Email | Peran (`role`) | Label Indonesia | Hak Akses Utama |
| --- | --- | --- | --- |
| `pelapor@safetylog.test` | `reporter` | Pelapor | Lapor kasus (`POST /api/cases`), lihat kasus sendiri / kasus yang ditugaskan kepadanya, selesaikan tindakan & isi 5 Why/6M bila jadi PIC |
| `supervisor@safetylog.test` | `supervisor` | Supervisor | Lihat & cari semua kasus, triase risiko/PIC, tambah & ubah tindakan, selesaikan tindakan & isi 5 Why/6M bila jadi PIC |
| `k3@safetylog.test` | `hse` | K3/Verifikator | Lihat semua kasus, tambah tindakan, verifikasi & tutup kasus (Verifikator ≠ PIC), buka ulang kasus/tindakan, dashboard & audit log |
| `admin@safetylog.test` | `admin` | Manajer/Admin | Seluruh alur operasional (kecuali membuat laporan baru sebagai pelapor) + kelola site/area/mesin/user/konfigurasi |

Catatan demo seeder:
- `php artisan migrate:fresh --seed` mengisi data dasar (`B-03`: 1 organisasi, 1 site, 3 mesin, 4 user).
- `php artisan safetylog:reset-demo --force` (atau `--seeder=DemoSeeder`) mengisi data demo lengkap (`B-23`: 10 mesin, 30 kasus di semua status/risiko, termasuk 4 kasus berulang di `MCH-CONV-01`).

---

## 2. Daftar Endpoint (51 Route)

### Health & Autentikasi (`B-05`)
- `GET /api/health` — Cek status service.
- `POST /api/auth/login` — Body: `{ email, password, device_name? }`. Rate limit 5 gagal/menit per email+IP dan 20/menit per IP (`429`).
- `POST /api/auth/logout` — Hapus token sesi saat ini.
- `POST /api/auth/logout-all` — Hapus seluruh token aktif pengguna di semua perangkat.
- `GET /api/auth/me` — Data user, `organization`, `site`, dan `permissions`.
- `POST /api/auth/change-password` — Body: `{ current_password, password, password_confirmation }`.

### Data Referensi & Mesin (`B-06`, `B-08`, `B-10`, `B-20`)
- `GET /api/reference-data` — Master dinamis organisasi (`case_types`, `categories`, `risk_configs`, `configurations`, enum labels).
- `GET /api/users/assignable` — Daftar user aktif di organisasi untuk dropdown PIC (`Supervisor`, `K3`, `Admin`).
- `GET /api/machines` — Daftar mesin aktif (`?site_id=`, `?area_id=`, `?q=`, `?include_archived=1`).
- `GET /api/machines/qr/{qrToken}` — Lookup mesin via QR + `case_types` + `open_cases_warning`.
- `GET /api/machines/{machine}/open-cases` — Peringatan kasus terbuka dalam 7 hari terakhir (`B-10`).
- `GET /api/machines/{machine}/cases` — Riwayat kasus mesin + penanda `is_recurring` (`"Berulang"` bila >= 3 kasus dalam 90 hari, `C-01`) (`Supervisor`, `K3`, `Admin`).

### Kasus: Capture, Search, Triage, 5 Why/6M, Actions, Verify, Reopen (`B-08`–`B-22`)
- `POST /api/cases` (Khusus `Pelapor`) — Buat laporan (`machine_id`, `case_type_id`, `description`, opsional `is_machine_stopped`, `has_affected_people`, `photos[]`/`photo`). Mengembalikan `data`, `emergency_reminder`, dan `open_cases_warning`.
- `GET /api/my-cases` — Kasus milik pelapor (mendukung pencarian & filter).
- `GET /api/cases` — Pencarian & antrean seluruh kasus (`Supervisor`, `K3`, `Admin`; `Pelapor` ditolak `403`). Pencarian `q` toleran salah ketik (contoh: `"konvayor"` menemukan `"konveyor"`). Filter: `status`, `risk_level`, `machine_id`, `site_id`, `area_id`, `case_type_id`, `category_id`, `is_machine_stopped`, `has_affected_people`, `date_from`, `date_to`, `per_page`.
- `GET /api/cases/{case}` — Detail lengkap satu layar (foto, risiko, 5 Why/6M, tindakan, riwayat status, `available_actions`).
- `GET /api/cases/{case}/summary` — Ringkasan non-sensitif untuk tautan peringatan `B-10`.
- `GET /api/cases/{case}/similar` (`Supervisor`, `K3`, `Admin`) — Maksimal 5 kasus mirip berbasis kemiripan teks (`B-20`, non-AI).
- `GET /api/cases/{case}/histories` — Riwayat perubahan status kasus (`B-22`).
- `POST /api/cases/{case}/attachments` — Unggah foto tambahan ke kasus aktif (JPG/PNG/WebP maks 5 MB, maks 5 file).
- `POST /api/cases/{case}/triage` (`Supervisor`, `Admin`) — `assess` (hitung skor dari `risk_configs` + saran tenggat SLA), `reject`, atau `duplicate`.
- `POST /api/cases/{case}/root-cause` (Khusus `PIC` yang ditugaskan pada kasus/tindakan) — Simpan `root_cause_category` (6M terkonfigurasi), `five_whys` (1..5 baris), dan `root_cause_summary` (`B-13`).
- `POST /api/cases/{case}/actions` (`Supervisor`, `K3`, `Admin`) — Tambah tindakan `temporary` / `corrective` / `preventive` (`B-14`).
- `POST /api/cases/{case}/verify` (`K3`, `Admin`) — `approve` (wajib `learning_summary`, tolak jika verifikator == PIC atau Sedang/Tinggi tanpa Preventif selesai) atau `reject` (wajib `rejection_reason`, opsional `reopen_action_ids[]`) (`B-16`).
- `POST /api/cases/{case}/reopen` (`K3`, `Admin`) — Buka ulang kasus `Selesai` dengan `reason` wajib dan opsional `reopen_action_ids[]` (`B-17`).

### Tindakan & Lampiran (`B-09`, `B-14`, `B-15`)
- `GET /api/my-actions` — Daftar tindakan milik user login, urut tenggat terdekat (`is_overdue`, `overdue_label: "Terlambat"`).
- `PATCH /api/actions/{action}` (`Supervisor`, `K3`, `Admin`) — Edit tindakan yang masih terbuka (`title`, `description`, `action_type`, `pic_user_id`, `due_at`).
- `POST /api/actions/{action}/complete` (Khusus `pic_user_id`) — Selesaikan tindakan dengan `completion_note` wajib + `photos[]` opsional.
- `POST /api/actions/{action}/reopen` (`K3`, `Admin`) — Buka ulang tindakan sebelum kasus ditutup (`reason` wajib).
- `POST /api/actions/{action}/attachments` — Unggah foto bukti tambahan ke tindakan aktif.
- `GET /api/attachments/{attachment}` — Unduh/tampilkan lampiran secara aman terotorisasi.
- `DELETE /api/attachments/{attachment}` — Hapus lampiran (hanya pengunggah atau Admin, selama kasus belum terkunci).

### Dashboard, Audit Log, Notifikasi (`B-18`, `B-21`, `B-22`)
- `GET /api/dashboard` (`Supervisor`, `K3`, `Admin`) — Ringkasan kasus terbuka, tindakan terlambat, selesai bulan ini, per mesin (dengan status `Berulang`), per kategori, sebaran risiko/status, dan daftar tindakan terlambat (`?site_id=`).
- `GET /api/audit-logs` (`Supervisor`, `K3`, `Admin`) — Daftar audit log append-only lintas kasus dalam organisasi (`?safety_case_id=`, `?changed_by=`, `?action_name=`, `?date_from=`, `?date_to=`).
- `GET /api/notifications` — Notifikasi dalam aplikasi (`unread_count`, `action_alerts`, `?unread_only=1`).
- `POST /api/notifications/{notification}/read` — Tandai satu notifikasi sudah dibaca.
- `POST /api/notifications/read-all` — Tandai semua notifikasi sudah dibaca.

### Master Data & Konfigurasi Admin (`role:admin`, `B-06`)
- `GET /api/sites`, `POST /api/sites`, `PATCH /api/sites/{site}`, `POST /api/sites/{site}/archive`
- `GET /api/areas`, `POST /api/areas`, `PATCH /api/areas/{area}`, `POST /api/areas/{area}/archive`
- `POST /api/machines`, `PATCH /api/machines/{machine}`, `POST /api/machines/{machine}/archive`, `POST /api/machines/{machine}/regenerate-qr`
- `GET /api/users`, `POST /api/users`, `PATCH /api/users/{user}`
- `PATCH /api/risk-configs/{riskConfig}`, `PUT /api/configurations/{key}`

---

## 3. Kode Error Bisnis (`422` / `403`)

| `error_code` | Arti |
| --- | --- |
| `VERIFIER_CANNOT_BE_PIC` | Verifikator sama dengan PIC kasus atau tindakan |
| `PREVENTIVE_ACTION_REQUIRED` | Kasus risiko Sedang/Tinggi belum punya tindakan Preventif selesai |
| `CASE_LOCKED` | Kasus sudah berstatus Selesai/Ditolak/Duplikat dan terkunci |
| `INVALID_CASE_STATUS` | Status kasus saat ini tidak mengizinkan aksi tersebut |
| `TRIAGE_REQUIRED` | Analisis penyebab atau tindakan tidak dapat dilakukan sebelum kasus dinilai (triase) |
| `INVALID_PIC_USER` | PIC bukan pengguna aktif di organisasi yang sama |
| `INVALID_ROOT_CAUSE_CATEGORY` | Kategori 6M tidak terdaftar pada konfigurasi organisasi |
| `CANNOT_DEMOTE_SELF` / `CANNOT_DEACTIVATE_SELF` | Admin tidak boleh menurunkan peran atau menonaktifkan akunnya sendiri |
