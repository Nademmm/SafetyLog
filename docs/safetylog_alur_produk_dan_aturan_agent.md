# SAFETYLOG — Spesifikasi Alur Produk & Aturan Wajib AI Agent

**Disusun oleh:** Afgan (Product Owner)  
**Target Pembaca:** Seluruh AI Coding Agent & Tim Developer SafetyLog (Backend, Frontend, DevOps)  
**Status:** *Single Source of Truth* untuk Alur Bisnis, Hak Akses, dan Penjaga Celah Sistem  

---

## 0. Instruksi Wajib untuk AI Agent (`AGENT DIRECTIVE`)

Setiap AI Agent yang bekerja pada repositori **SafetyLog** wajib membaca dokumen ini sebelum merancang skema database, membuat endpoint API, menulis logika bisnis, atau membangun antarmuka (UI).

1. **Patuhi Alur Status & Hak Akses:** Jangan memotong alur status, jangan melewati validasi peran (*Role-Based Access Control*), dan jangan mengizinkan perubahan status tanpa aturan penjaga (*guardrails*).
2. **Tutup Semua Celah Keamanan & Bisnis:** Terapkan seluruh aturan di **Bagian 4 (Penyempurnaan Celah)** pada level **Backend API** (bukan hanya disembunyikan di Frontend) dan lengkapi dengan *automated feature test*.
3. **Konfigurasi Dinamis:** Nilai ambang skor risiko, target tenggat waktu, jenis kasus, dan kategori kasus harus diambil dari tabel konfigurasi/master database, bukan ditulis mati (*hardcoded*).

---

## 1. Empat Stakeholder (Peran) & Tanggung Jawabnya

Sistem SafetyLog beroperasi dalam hierarki **Organisasi (Perusahaan) → Site/Kawasan → Area → Mesin** dengan 4 peran pengguna:

| Peran | Fokus Utama | Apa yang Bisa Dilakukan | Batasan Keras |
| :--- | :--- | :--- | :--- |
| **1. Pelapor (Operator)** | Mencatat masalah dengan cepat di lapangan | - Scan QR mesin dan mengirim laporan (< 60 detik)<br>- Melihat daftar dan status laporan yang **ia buat sendiri** | - **Tidak bisa** melihat laporan orang lain, antrean triase, pencarian global, atau dashboard<br>- Hanya bisa menyelesaikan tindakan **jika ia ditunjuk sebagai PIC** |
| **2. Supervisor** | Triase laporan, cek area/PIC, dan menugaskan perbaikan | - Menerima notifikasi laporan baru<br>- Melihat semua kasus & pencarian di organisasinya<br>- Menilai risiko (5×5), menolak/menandai duplikat<br>- Mengecek area mesin & menugaskan PIC (operator/teknisi) lewat pembuatan Tindakan | - **Tidak bisa** memverifikasi atau menutup kasus menjadi `Selesai` |
| **3. K3 / Verifikator** | Memastikan perbaikan aman, sesuai standar, dan mencegah terulang | - Menerima notifikasi saat kasus `Menunggu verifikasi`<br>- Memeriksa hasil kerja PIC terhadap standar K3<br>- Menyetujui (`Selesai`) atau Menolak verifikasi (kembali ke `Tindakan berjalan`)<br>- Membuka ulang kasus `Selesai` jika masalah muncul lagi | - **Dilarang memverifikasi kasus jika ia sendiri menjadi PIC** pada salah satu tindakan di kasus tersebut |
| **4. Admin / Manajer Aplikasi** | Mengelola master data & memantau keseluruhan | - Mengelola Kawasan (Site), Area, Mesin (+ QR Token), dan User/Role<br>- Mengatur penanggung jawab (PIC default) per Area & konfigurasi matriks risiko<br>- Memantau Dashboard & semua kasus | - Tetap tunduk pada aturan **Verifikator ≠ PIC** apabila ikut memverifikasi kasus |

---

## 2. Alur Kerja End-to-End (Dari Laporan hingga Kasus Selesai)

Berikut adalah skenario alur standar ketika terjadi masalah mesin atau kondisi tidak aman di sebuah perusahaan (misalnya **Kawasan/Site A**):

```text
[1. CAPTURE: Pelapor Scan QR & Lapor]
       │  (Status otomatis: Baru)
       ▼
[2. NOTIFIKASI & DASHBOARD: Masuk ke Supervisor & Admin]
       │
       ▼
[3. TRIASE: Supervisor Cek Detail Mesin, Pelapor, Area & PIC Area]
       │  ├─► Jika tidak valid / ganda ──► [Ditolak / Duplikat] (Alasan wajib)
       │  └─► Jika valid: Nilai Risiko (1-25) ──► (Status: Dinilai / Dianalisis)
       ▼
[4. PENUGASAN: Supervisor Tugaskan Operator/PIC Area untuk Perbaikan]
       │  (Buat Tindakan: Sementara / Korektif / Preventif + Tenggat)
       │  (Status otomatis: Tindakan berjalan)
       ▼
[5. EKSEKUSI: PIC Kerjakan Perbaikan & Kirim Catatan Hasil + Foto Bukti]
       │  (Jika semua tindakan selesai ──► Status otomatis: Menunggu verifikasi)
       ▼
[6. VERIFIKASI K3: Petugas K3 Cek Kesesuaian Standar]
       │  ├─► Belum sesuai standar ──► Tolak (Alasan wajib) ──► Kembali ke [4/5. Tindakan berjalan]
       │  └─► Sesuai standar (Cek: Verifikator ≠ PIC & Ada Preventif jika Sedang/Tinggi)
       │         ──► Isi Ringkasan Pembelajaran ──► Approve ──► [Selesai & Terkunci]
       ▼
[7. LEARN: Tersimpan di Riwayat Mesin, Pencarian & Dashboard]
       │  (Jika masalah muncul lagi ──► K3/Admin bisa Buka Ulang dengan alasan)
```

### Rincian Tiap Langkah

#### Langkah 1 — Pelapor Scan QR & Kirim Laporan (`Baru`)
- Operator/pelapor di Kawasan A menemukan mesin bermasalah, lalu memindai kode QR yang tertempel di mesin tersebut menggunakan HP.
- Jika belum login, sistem mengarahkan ke halaman Login dan otomatis kembali ke Form Lapor dengan **Mesin sudah terpilih**.
- Pelapor mengisi maksimal 3 kolom wajib (**Mesin**, **Jenis Kasus**, **Deskripsi kerusakan/masalah**), ditambah 2 pertanyaan cepat (*Apakah mesin berhenti?* dan *Apakah ada orang terdampak?*) serta foto bukti (opsional, dikompres di HP).
- Sistem menerbitkan nomor kasus otomatis berformat `SL-{KODE_SITE}-{TAHUN}-{URUTAN_4_DIGIT}` dan menyetel status kasus menjadi **`Baru`**.

#### Langkah 2 — Notifikasi Masuk ke Supervisor, Admin & Pihak Terkait
- Begitu laporan terkirim, sistem langsung mengirim **notifikasi dalam aplikasi** ke seluruh **Supervisor** di organisasi/kawasan tersebut.
- Laporan baru juga langsung tampil di **antrean triase Supervisor** dan terhitung di **Dashboard** (yang dipantau Supervisor & Admin).

#### Langkah 3 — Supervisor Mengecek Detail, Area, & PIC Area (`Dinilai`)
- Supervisor membuka detail laporan dan memeriksa:
  1. **Mesin & bagian yang rusak** (termasuk foto & kategori masalah).
  2. **Siapa yang melapor** dan kapan dilaporkan.
  3. **Di Kawasan & Area mana** mesin tersebut berada.
  4. **Siapa PIC / penanggung jawab area tersebut** (data master Area menyimpan informasi penanggung jawab area sehingga Supervisor langsung tahu siapa yang berwenang di lokasi itu).
- Supervisor melakukan **Triase**:
  - Jika laporan palsu/salah atau ganda: Supervisor bisa memilih **`Ditolak`** atau **`Duplikat`** (wajib mengisi alasan atau memilih kasus aslinya).
  - Jika valid: Supervisor mengisi **Skor Risiko** (`Keparahan 1–5 × Kemungkinan Terulang 1–5`), sehingga level risiko terhitung otomatis (`1–6 Rendah`, `7–14 Sedang`, `15–25 Tinggi`). Status berpindah menjadi **`Dinilai`** (dan opsional **`Dianalisis`** jika analisis 5-Why diisi).

#### Langkah 4 — Penugasan Perbaikan ke Operator/Teknisi Area (`Tindakan berjalan`)
- Supervisor membuat satu atau lebih **Tindakan** (*Sementara*, *Korektif*, atau *Preventif*), menentukan **PIC pelaksana** (operator/teknisi di area tersebut), serta menentukan **Tenggat Waktu** (saran default diambil dari level risiko).
- Segera setelah tindakan pertama dibuat, status kasus otomatis berubah menjadi **`Tindakan berjalan`**.
- Sistem mengirim **notifikasi ke PIC** bahwa ia ditugaskan memperbaiki masalah tersebut.

#### Langkah 5 — PIC Mengerjakan Perbaikan (`Menunggu verifikasi`)
- PIC membuka halaman **"Tindakan Saya"** (tindakan dengan tenggat terdekat muncul paling atas; jika melewati tenggat muncul label merah **"Terlambat"**).
- Setelah perbaikan selesai, PIC menandai tindakan selesai dengan mengisi **catatan hasil perbaikan (wajib)** dan **foto bukti sesudah diperbaiki (opsional)**.
- Begitu **seluruh tindakan** pada kasus tersebut berstatus selesai, status kasus otomatis berubah menjadi **`Menunggu verifikasi`** dan sistem mengirim **notifikasi ke K3 / Verifikator**.

#### Langkah 6 — Verifikasi Standar oleh K3 (`Selesai` atau Kembali ke `Tindakan berjalan`)
- Petugas K3 / Verifikator memeriksa fisik mesin/hasil kerja di lapangan dan membandingkannya dengan standar K3.
- **Jika belum sesuai standar:** K3 menekan **Tolak** dengan **alasan wajib**. Status kasus otomatis kembali ke **`Tindakan berjalan`** agar PIC memperbaiki ulang, dan notifikasi dikirim kembali ke PIC/Supervisor.
- **Jika sudah sesuai standar:** K3 wajib mengisi **Ringkasan Pembelajaran** (*lesson learned*) lalu menekan **Setujui / Tutup Kasus**. Status berubah menjadi **`Selesai`** dan seluruh data kasus **terkunci (read-only)**.

---

## 3. Matriks Transisi Status Kasus

AI Agent wajib memastikan endpoint perubahan status hanya mengizinkan transisi berikut:

| Status Awal | Status Tujuan | Pemicu / Aktor | Syarat Wajib |
| :--- | :--- | :--- | :--- |
| *(Baru dibuat)* | `Baru` | Pelapor | Mesin, jenis kasus, deskripsi terisi |
| `Baru` | `Dinilai` | Supervisor / Admin | Skor keparahan & kemungkinan terisi |
| `Baru` | `Ditolak` / `Duplikat` | Supervisor / Admin | Alasan penolakan / ID kasus asli wajib |
| `Dinilai` | `Dianalisis` | Supervisor / K3 | Form 5-Why / kategori akar penyebab *(opsional dilewati)* |
| `Dinilai` / `Dianalisis` | `Tindakan berjalan` | Otomatis | Minimal 1 tindakan dibuat & PIC ditunjuk |
| `Tindakan berjalan` | `Menunggu verifikasi` | Otomatis | **Semua** tindakan pada kasus sudah berstatus selesai |
| `Menunggu verifikasi` | `Tindakan berjalan` | K3 / Verifikator (Tolak) | Alasan penolakan wajib diisi |
| `Menunggu verifikasi` | `Selesai` | K3 / Verifikator (Setujui) | Verifikator ≠ PIC; Risiko Sedang/Tinggi punya ≥ 1 Preventif; Ringkasan pembelajaran terisi |
| `Selesai` | `Dibuka ulang` → `Tindakan berjalan` | K3 / Admin | Alasan buka ulang wajib diisi |

---

## 4. Penyempurnaan Celah Sistem (Wajib Diterapkan AI Agent)

Untuk menutup celah operasional, keamanan, dan integritas data dari alur di atas, aturan berikut **wajib ditegakkan di Backend API**:

1. **Celah "Pelapor/PIC Memverifikasi Pekerjaannya Sendiri" (*Segregation of Duties*):**
   - **Aturan:** User yang tercatat sebagai PIC di salah satu tindakan pada kasus X **dilarang keras** menjadi verifikator yang menutup kasus X (berlaku untuk semua role, termasuk Admin). Sistem wajib mengembalikan HTTP `403/422` dengan pesan Bahasa Indonesia yang jelas.
2. **Celah "Masalah Berulang Tanpa Pencegahan":**
   - **Aturan:** Kasus dengan level risiko **Sedang** (`7–14`) atau **Tinggi** (`15–25`) **tidak boleh** ditutup ke `Selesai` jika belum memiliki minimal **1 tindakan bertipe `Preventif`** yang sudah selesai.
3. **Celah "Laporan Ganda di Mesin yang Sama":**
   - **Aturan:** Saat pelapor memilih mesin yang masih memiliki kasus aktif (belum `Selesai`/`Ditolak`) dalam 7 hari terakhir, tampilkan peringatan beserta tautan ke kasus tersebut agar tidak menumpuk laporan kembar (pelapor tetap boleh melanjutkan jika memang kejadian baru).
4. **Celah "Insiden Darurat Dianggap Selesai Hanya Lewat Aplikasi":**
   - **Aturan:** Jika jenis kasus adalah **Insiden** dan ada **orang terdampak**, form wajib menampilkan pengingat tegas bahwa SafetyLog bukan pengganti prosedur tanggap darurat resmi perusahaan.
5. **Celah "Kebocoran Data Antar Kawasan/Perusahaan" (*Multi-Tenant Isolation*):**
   - **Aturan:** Setiap tabel utama wajib memiliki `organization_id` (dan relasi ke `site_id` / `area_id`). Setiap query API dan QR token lookup wajib memfilter berdasarkan `organization_id` milik user yang login. User organisasi B dilarang keras mengakses data atau URL kasus milik organisasi A.
6. **Celah "Manipulasi Data Setelah Kasus Ditutup":**
   - **Aturan:** Kasus berstatus `Selesai` berstatus **terkunci (*read-only*)**. Perubahan hanya bisa dilakukan lewat mekanisme resmi **Buka Ulang Kasus** oleh K3/Admin dengan alasan wajib.
7. **Celah "Jejak Audit Hilang":**
   - **Aturan:** Setiap perubahan status, penunjukan PIC, penolakan, persetujuan, dan pembukaan ulang wajib dicatat ke tabel `audit_logs` (*append-only*: tidak ada endpoint update/delete untuk log).
8. **Celah "Tidak Ada Penanggung Jawab Area Saat Triase":**
   - **Aturan:** Data master `Area` sebaiknya memiliki kolom opsional `pic_user_id` (atau daftar supervisor/teknisi area) agar saat Supervisor mengecek kasus di Area X, sistem langsung menampilkan **siapa PIC Area X** untuk mempercepat penugasan.
9. **Celah "Tindakan Terlupa / Terlambat":**
   - **Aturan:** Setiap tindakan yang belum selesai dan melewati `due_date` otomatis ditandai sebagai **Terlambat** (badge merah) di halaman *Tindakan Saya* dan *Dashboard*.
