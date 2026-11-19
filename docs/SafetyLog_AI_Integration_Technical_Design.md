# Technical Design --- Integrasi AI pada SafetyLog melalui NexusRouter

**Status:** Draft rancangan teknis\
**Tujuan:** Menjadi acuan implementasi integrasi AI secara bertahap pada
SafetyLog\
**Cakupan fitur:** AI-01, AI-02, AI-04, dan AI-06\
**Catatan:** Dokumen ini disusun berdasarkan hasil eksplorasi repository
SafetyLog dan NexusRouter yang diberikan. Detail implementasi tetap
perlu diverifikasi kembali langsung pada source code sebelum coding
dimulai.

------------------------------------------------------------------------

## 1. Latar Belakang dan Tujuan

SafetyLog merupakan aplikasi pencatatan dan pengelolaan kasus
keselamatan. Integrasi AI direncanakan untuk membantu pengguna memahami
laporan, menemukan kasus terdahulu yang relevan, menyusun draf tindakan,
dan membaca ringkasan kondisi keselamatan organisasi.

AI berperan sebagai **asisten rekomendasi**, bukan pengambil keputusan.
Seluruh keputusan resmi, perubahan status kasus, penetapan tingkat
risiko, dan persetujuan tindakan tetap mengikuti workflow serta
otorisasi SafetyLog.

### 1.1 Fitur dalam cakupan

  -----------------------------------------------------------------------
  ID                      Fitur                   Tujuan
  ----------------------- ----------------------- -----------------------
  AI-01                   Saran Triase            Memberikan rekomendasi
                                                  kategori, severity, dan
                                                  likelihood berdasarkan
                                                  laporan kasus

  AI-02                   Kasus Mirip & Deteksi   Menemukan kasus
                          Duplikat                historis yang relevan
                                                  dan membantu menilai
                                                  kemungkinan duplikasi

  AI-04                   Draf Saran Tindakan     Membantu menyusun draf
                                                  tindakan sementara,
                                                  korektif, dan preventif

  AI-06                   Ringkasan Dashboard     Mengubah statistik
                                                  dashboard menjadi
                                                  ringkasan naratif yang
                                                  mudah dipahami
  -----------------------------------------------------------------------

AI-03 (Draf Analisis Penyebab) dan AI-05 (Draf Ringkasan Pembelajaran)
berada di luar cakupan tahap ini dan dapat dipertimbangkan pada
pengembangan berikutnya.

------------------------------------------------------------------------

## 2. Dasar Arsitektur

### 2.1 Gambaran arsitektur

``` text
SafetyLog Frontend
       |
       v
SafetyLog API (Laravel)
       |
       v
Controller / Authorization / Validation
       |
       v
AI Service
       |
       | HTTPS + dedicated virtual key
       v
NexusRouter
POST /v1/chat/completions
       |
       v
Model AI / Provider
       |
       v
NexusRouter response
       |
       v
Parse + validate + normalize
       |
       v
SafetyLog API response
       |
       v
SafetyLog Frontend
```

### 2.2 Prinsip desain

1.  **Backend-to-backend:** Frontend tidak berkomunikasi langsung dengan
    NexusRouter.
2.  **AI bukan sumber kebenaran:** Data kasus, kategori, risk
    configuration, status, dan hak akses tetap ditentukan SafetyLog.
3.  **Multi-tenant isolation:** Seluruh data yang dipakai untuk konteks
    AI harus dibatasi berdasarkan `organization_id`.
4.  **Human review:** Rekomendasi AI harus ditinjau pengguna berwenang
    sebelum diterapkan.
5.  **Fail safely:** Jika NexusRouter gagal atau respons AI tidak valid,
    workflow utama SafetyLog tetap dapat digunakan.
6.  **Minimize data:** Kirim hanya informasi yang dibutuhkan oleh fitur
    terkait.
7.  **No direct database access:** AI tidak diberi akses langsung ke
    database SafetyLog.

### 2.3 Komponen SafetyLog yang teridentifikasi

Berdasarkan eksplorasi repository yang diberikan:

  -------------------------------------------------------------------------
  Komponen                  Tanggung jawab saat ini Peran dalam integrasi
                                                    AI
  ------------------------- ----------------------- -----------------------
  `SafetyCaseController`    Endpoint utama          Menjadi titik akses
                            pengelolaan kasus       fitur terkait kasus
                                                    atau mendelegasikan ke
                                                    `AiController`

  `DashboardController`     Endpoint dashboard      Menyediakan data
                                                    dashboard untuk AI-06

  `CaseSearchService`       Pencarian kemiripan     Menjadi tahap retrieval
                            teks berbasis           untuk AI-02
                            PostgreSQL `pg_trgm`    

  `RiskAssessmentService`   Perhitungan risiko dari Memvalidasi rekomendasi
                            konfigurasi             triase AI

  `CaseWorkflowService`     Workflow kasus, triase, Menjaga aturan bisnis
                            tindakan, verifikasi    ketika rekomendasi
                                                    diterapkan

  `DashboardService`        Menghitung metrik       Menyiapkan agregat
                            dashboard               untuk AI-06

  `SafetyCasePolicy` / role Otorisasi dan           Mengontrol siapa yang
  gates                     pembatasan akses        dapat menggunakan
                                                    setiap fitur
  -------------------------------------------------------------------------

Nama file, method, dan perilaku aktual komponen di atas harus diperiksa
kembali sebelum implementasi.

------------------------------------------------------------------------

## 3. Integrasi dengan NexusRouter

### 3.1 Endpoint

Gunakan endpoint OpenAI-compatible:

``` http
POST {NEXUSROUTER_BASE_URL}/v1/chat/completions
Authorization: Bearer {NEXUSROUTER_VIRTUAL_KEY}
Content-Type: application/json
```

Contoh body:

``` json
{
  "model": "MODEL_ID_YANG_SUDAH_DIVERIFIKASI",
  "stream": false,
  "temperature": 0.2,
  "messages": [
    {
      "role": "system",
      "content": "Instruksi sistem untuk fitur terkait."
    },
    {
      "role": "user",
      "content": "Konteks dan permintaan fitur."
    }
  ]
}
```

`MODEL_ID_YANG_SUDAH_DIVERIFIKASI` adalah placeholder. Model harus
dipilih berdasarkan katalog `/v1/models` atau konfigurasi NexusRouter
yang benar-benar tersedia. Jangan menganggap nama model contoh sebagai
model aktif.

### 3.2 Autentikasi

-   Gunakan dedicated virtual key khusus SafetyLog.
-   Simpan key hanya pada environment backend.
-   Jangan menggunakan `MASTER_GATEWAY_KEY`.
-   Jangan menggunakan internal-client header atau mekanisme bypass
    validasi.
-   Jangan pernah mengirim key ke frontend, response API, log, atau
    repository.

### 3.3 Konfigurasi Laravel yang disarankan

Tambahkan konfigurasi pada `config/services.php`:

``` php
'nexusrouter' => [
    'base_url' => env('NEXUSROUTER_BASE_URL'),
    'virtual_key' => env('NEXUSROUTER_VIRTUAL_KEY'),
    'model' => env('NEXUSROUTER_MODEL'),
    'timeout' => env('NEXUSROUTER_TIMEOUT', 30),
],
```

Tambahkan nilai berikut pada environment backend:

``` dotenv
NEXUSROUTER_BASE_URL=
NEXUSROUTER_VIRTUAL_KEY=
NEXUSROUTER_MODEL=
NEXUSROUTER_TIMEOUT=30
```

Nilai rahasia tidak boleh ditulis ke file contoh yang berisi credential
aktif. Untuk dokumentasi, gunakan nilai kosong atau placeholder.

### 3.4 Perilaku request

Rekomendasi awal:

-   Gunakan Laravel HTTP Client.
-   Gunakan `stream: false`.
-   Tetapkan timeout yang wajar dan dapat dikonfigurasi.
-   Periksa status HTTP sebelum membaca isi respons.
-   Tangani timeout, koneksi gagal, respons non-2xx, JSON tidak valid,
    dan konten AI kosong.
-   Batasi panjang konteks dan output.
-   Jangan melakukan retry tanpa batas. Jika retry diterapkan, batasi
    jumlah percobaan dan pertimbangkan biaya serta rate limit.
-   Catat latency, model aktual jika tersedia, status, dan
    correlation/request ID jika tersedia; jangan mencatat credential
    atau isi laporan sensitif secara default.

### 3.5 Bentuk respons dan structured output

NexusRouter mengembalikan envelope respons yang kompatibel dengan format
chat completion. Konten AI berada di:

``` text
choices[0].message.content
```

Konten tersebut merupakan teks model, bukan objek JSON yang otomatis
dijamin valid.

Berdasarkan eksplorasi yang diberikan, endpoint belum mendukung
`response_format` atau JSON Schema. Karena itu:

1.  Minta model mengembalikan JSON sesuai kontrak fitur.
2.  Ambil teks dari `choices[0].message.content`.
3.  Parse JSON di backend.
4.  Validasi tipe, field wajib, panjang teks, dan nilai terhadap master
    data SafetyLog.
5.  Tolak atau tandai respons yang tidak sesuai.
6.  Jangan menerapkan perubahan bisnis dari output yang belum lolos
    validasi.

Dukungan `tools`/`tool_choice` tidak diperlukan untuk tahap integrasi
awal.

------------------------------------------------------------------------

## 4. Rancangan Service

### 4.1 Struktur yang disarankan

Struktur awal yang dapat dipertimbangkan:

``` text
app/
├── Services/
│   ├── Ai/
│   │   ├── NexusRouterClient.php
│   │   ├── AiService.php
│   │   ├── AiResponseParser.php
│   │   └── Prompts/
│   │       ├── TriagePrompt.php
│   │       ├── SimilarCasesPrompt.php
│   │       ├── ActionSuggestionPrompt.php
│   │       └── DashboardSummaryPrompt.php
│   └── ...
└── Http/
    └── Controllers/
        └── Api/
            └── AiController.php
```

Ini merupakan rekomendasi struktur, bukan struktur yang sudah ada di
repository.

### 4.2 Tanggung jawab komponen

  -----------------------------------------------------------------------
  Komponen                            Tanggung jawab
  ----------------------------------- -----------------------------------
  `NexusRouterClient`                 Mengirim HTTP request ke
                                      NexusRouter dan menangani error
                                      transport

  `AiService`                         Menyediakan method tingkat fitur
                                      dan mengatur alur pemanggilan AI

  `AiResponseParser`                  Parsing dan validasi bentuk output
                                      AI

  Prompt classes                      Menyusun instruksi khusus tiap
                                      fitur

  `AiController`                      Memvalidasi request, memeriksa
                                      akses, memanggil service, dan
                                      membentuk response API
  -----------------------------------------------------------------------

Service sebaiknya tidak mengambil pengguna aktif melalui `auth()` di
constructor. Identitas pengguna dan konteks organisasi sebaiknya
diteruskan secara eksplisit dari controller atau layer aplikasi yang
berwenang.

------------------------------------------------------------------------

## 5. Rancangan Fitur

## 5.1 AI-01 --- Saran Triase

### Tujuan

Memberikan rekomendasi awal atas laporan kasus baru agar supervisor
memiliki bahan pertimbangan sebelum melakukan triase resmi.

### Alur

1.  Pengguna mengakses kasus yang boleh dilihatnya.
2.  Backend memeriksa policy dan organisasi kasus.
3.  Backend mengambil data kasus yang diperlukan.
4.  Backend mengambil pilihan kategori dan konfigurasi risiko yang
    relevan.
5.  Backend mengirim konteks minimal ke AI.
6.  AI mengembalikan rekomendasi dalam format terstruktur.
7.  Backend memvalidasi kategori dan nilai yang dihasilkan.
8.  Frontend menampilkan rekomendasi sebagai saran.
9.  Supervisor tetap melakukan triase resmi melalui workflow SafetyLog
    yang sudah ada.

### Input yang dapat dipertimbangkan

-   Deskripsi kasus.
-   Jenis kasus.
-   Kategori yang tersedia dalam organisasi.
-   Informasi lokasi/area yang relevan jika diperlukan.
-   Pilihan severity dan likelihood yang valid menurut sistem.

Jangan mengirim identitas pribadi pelapor jika tidak dibutuhkan.

### Kontrak output yang disarankan

``` json
{
  "category_code": "CATEGORY_CODE",
  "severity": "medium",
  "likelihood": "possible",
  "reasoning": [
    "Alasan singkat yang merujuk pada informasi laporan."
  ],
  "uncertainties": [
    "Informasi yang belum tersedia dan dapat memengaruhi penilaian."
  ]
}
```

Nilai enum di atas hanya contoh bentuk. Nilai final harus mengikuti
enum, master data, dan aturan yang benar-benar digunakan SafetyLog.

### Validasi dan batasan

-   `category_code` harus cocok dengan kategori aktif milik organisasi
    kasus.
-   `severity` dan `likelihood` harus termasuk nilai yang diterima
    aplikasi.
-   Risk score dan risk level resmi tetap dihitung oleh
    `RiskAssessmentService`.
-   AI tidak boleh mengubah status kasus atau mengisi keputusan triase
    resmi secara otomatis.
-   Jangan menganggap confidence dari model sebagai probabilitas
    terkalibrasi.

------------------------------------------------------------------------

## 5.2 AI-02 --- Kasus Mirip dan Deteksi Duplikat

### Tujuan

Membantu pengguna menemukan kasus historis yang memiliki kemiripan
dengan laporan yang sedang dibuka.

### Strategi

Gunakan retrieval dua tahap:

1.  **Retrieval oleh SafetyLog:** `CaseSearchService` mencari kandidat
    kasus dari database dengan batas organisasi.
2.  **Analisis oleh AI (opsional):** AI membandingkan deskripsi laporan
    saat ini dengan kandidat yang sudah ditemukan backend dan
    menjelaskan kemiripan serta perbedaannya.

AI tidak melakukan query database sendiri dan tidak boleh menerima
daftar kasus dari organisasi lain.

### Alur

1.  Backend memeriksa akses terhadap kasus saat ini.
2.  Backend menjalankan pencarian kandidat menggunakan
    `CaseSearchService`.
3.  Backend memastikan setiap kandidat berada dalam organisasi yang
    sama.
4.  Backend membatasi jumlah dan field kandidat yang dikirim.
5.  AI menganalisis kandidat yang tersedia.
6.  Backend memvalidasi ID kandidat yang dikembalikan agar hanya merujuk
    pada daftar kandidat yang dikirim.
7.  Frontend menampilkan daftar kasus mirip dan indikator kemungkinan
    duplikasi.

### Kontrak output yang disarankan

``` json
{
  "matches": [
    {
      "case_id": 123,
      "similarity_reason": "Kesamaan jenis kejadian dan kondisi lokasi.",
      "differences": [
        "Dampak yang dilaporkan berbeda."
      ],
      "duplicate_assessment": "possible_duplicate"
    }
  ],
  "summary": "Terdapat satu kandidat yang perlu ditinjau lebih lanjut."
}
```

`case_id` harus berasal dari kandidat yang diberikan backend. Backend
wajib memeriksa ulang sebelum mengembalikan hasil.

### Catatan

-   Jangan mengklaim menggunakan embedding jika belum ada embedding
    model atau endpoint yang diverifikasi.
-   Jangan menghapus atau menggabungkan laporan secara otomatis.
-   Pertahankan endpoint pencarian serupa yang sudah ada jika sesuai;
    integrasi AI dapat menjadi lapisan tambahan.
-   Perlu diverifikasi apakah endpoint `similar` saat ini dapat
    digunakan kembali tanpa mengubah kontrak API yang sudah dipakai
    frontend.

------------------------------------------------------------------------

## 5.3 AI-04 --- Draf Saran Tindakan

### Tujuan

Membantu supervisor atau pengguna berwenang menyusun draf tindakan
berdasarkan informasi kasus.

### Jenis tindakan

-   **Sementara:** langkah pengendalian awal untuk mengurangi risiko
    saat ini.
-   **Korektif:** tindakan untuk menangani penyebab atau kondisi yang
    ditemukan.
-   **Preventif:** tindakan untuk mengurangi kemungkinan kejadian serupa
    terulang.

### Input yang dapat dipertimbangkan

-   Deskripsi kasus.
-   Jenis dan kategori kasus.
-   Severity, likelihood, dan risk level yang sudah ditetapkan.
-   Root cause atau hasil analisis yang sudah tersedia, jika ada.
-   Informasi lokasi/area relevan.

### Kontrak output yang disarankan

``` json
{
  "suggestions": [
    {
      "action_type": "temporary",
      "title": "Judul tindakan",
      "description": "Uraian tindakan yang disarankan.",
      "rationale": "Alasan singkat berdasarkan informasi kasus.",
      "priority": "high"
    },
    {
      "action_type": "corrective",
      "title": "Judul tindakan",
      "description": "Uraian tindakan yang disarankan.",
      "rationale": "Alasan singkat berdasarkan informasi kasus.",
      "priority": "medium"
    },
    {
      "action_type": "preventive",
      "title": "Judul tindakan",
      "description": "Uraian tindakan yang disarankan.",
      "rationale": "Alasan singkat berdasarkan informasi kasus.",
      "priority": "medium"
    }
  ],
  "limitations": [
    "Detail teknis perlu dikonfirmasi oleh personel yang kompeten."
  ]
}
```

Nilai `action_type` dan `priority` harus disesuaikan dengan enum atau
aturan aktual SafetyLog.

### Validasi dan batasan

-   Hasil AI hanya berupa draf.
-   Pengguna harus meninjau dan mengedit sebelum menyimpan tindakan.
-   Pembuatan tindakan resmi harus tetap melalui endpoint dan workflow
    tindakan yang ada.
-   Aturan kasus risiko Sedang/Tinggi yang memerlukan minimal satu
    tindakan Preventif selesai sebelum penutupan tetap berlaku.
-   Aturan verifier tidak boleh sama dengan PIC tetap berlaku.
-   AI tidak boleh melewati aturan penguncian kasus atau otorisasi.

------------------------------------------------------------------------

## 5.4 AI-06 --- Ringkasan Dashboard

### Tujuan

Mengubah statistik dashboard menjadi ringkasan naratif yang membantu
supervisor/HSE memahami kondisi dan tren kasus.

### Sumber data

`DashboardService` menghitung statistik di backend. AI hanya menerima
agregat yang sudah disiapkan, bukan akses langsung ke database.

Contoh data agregat yang dapat dipertimbangkan:

-   Jumlah kasus pada periode yang dipilih.
-   Distribusi berdasarkan risk level.
-   Distribusi berdasarkan status.
-   Tren jumlah kasus dari periode ke periode.
-   Kategori kasus yang paling sering muncul.
-   Jumlah kasus yang melewati tenggat, jika metrik tersedia.

Metrik final harus mengikuti data yang benar-benar disediakan dashboard.

### Kontrak output yang disarankan

``` json
{
  "headline": "Ringkasan kondisi keselamatan pada periode terpilih.",
  "key_findings": [
    "Temuan yang dapat diturunkan langsung dari statistik."
  ],
  "trend_observations": [
    "Perubahan tren dibandingkan periode pembanding."
  ],
  "suggested_follow_ups": [
    "Hal yang dapat ditinjau lebih lanjut oleh supervisor."
  ],
  "data_limitations": [
    "Keterbatasan data atau periode pembanding."
  ]
}
```

### Validasi dan batasan

-   Statistik harus dihitung backend dan dibatasi berdasarkan
    organisasi.
-   Sertakan rentang tanggal dan definisi metrik dalam konteks AI.
-   AI tidak boleh mengarang angka.
-   AI tidak boleh menyimpulkan sebab-akibat hanya dari korelasi atau
    perubahan jumlah kasus.
-   Jika data tidak cukup, AI harus menyatakan keterbatasannya.
-   Ringkasan harus menampilkan periode data yang digunakan.

------------------------------------------------------------------------

## 6. Rancangan API

Endpoint berikut merupakan usulan awal. Prefix, penamaan, dan format
response harus diselaraskan dengan konvensi aktual `routes/api.php`.

  -----------------------------------------------------------------------------------------------
  Fitur             Method            Usulan endpoint                      Akses awal yang
                                                                           disarankan
  ----------------- ----------------- ------------------------------------ ----------------------
  AI-01             POST              `/ai/triage-suggestion`              Supervisor/Admin;
                                                                           pertimbangkan HSE
                                                                           sesuai policy

  AI-02             POST              `/cases/{case}/similar-analysis`     Anggota organisasi
                                                                           yang berhak melihat
                                                                           kasus

  AI-04             POST              `/cases/{case}/action-suggestions`   Supervisor/HSE/Admin

  AI-06             POST              `/ai/dashboard-summary`              Supervisor/HSE/Admin
  -----------------------------------------------------------------------------------------------

### 6.1 Contoh request dan response AI-01

Request:

``` json
{
  "case_id": 123
}
```

Response:

``` json
{
  "data": {
    "category_code": "CATEGORY_CODE",
    "severity": "medium",
    "likelihood": "possible",
    "reasoning": ["Alasan rekomendasi."],
    "uncertainties": []
  },
  "meta": {
    "generated_by": "ai",
    "requires_review": true
  }
}
```

### 6.2 Contoh request dan response AI-02

Request:

``` json
{
  "limit": 5
}
```

Response:

``` json
{
  "data": {
    "matches": [],
    "summary": "Tidak ditemukan kandidat yang cukup relevan."
  },
  "meta": {
    "requires_review": true
  }
}
```

### 6.3 Contoh request dan response AI-04

Request:

``` json
{
  "context": "optional additional context"
}
```

Response:

``` json
{
  "data": {
    "suggestions": []
  },
  "meta": {
    "generated_by": "ai",
    "requires_review": true
  }
}
```

### 6.4 Contoh request dan response AI-06

Request:

``` json
{
  "from": "2026-01-01",
  "to": "2026-01-31"
}
```

Response:

``` json
{
  "data": {
    "headline": "Ringkasan periode.",
    "key_findings": [],
    "trend_observations": [],
    "suggested_follow_ups": [],
    "data_limitations": []
  },
  "meta": {
    "period": {
      "from": "2026-01-01",
      "to": "2026-01-31"
    }
  }
}
```

Request dan response di atas adalah contoh kontrak, bukan kontrak API
yang sudah diterapkan. Khusus AI-06, format tanggal harus diselaraskan
dengan filter periode dashboard yang sebenarnya.

------------------------------------------------------------------------

## 7. Keamanan, Privasi, dan Integritas Data

### 7.1 Multi-tenant isolation

-   Ambil `organization_id` dari pengguna terautentikasi, bukan dari
    input bebas frontend.
-   Pastikan kasus yang diminta memang berada dalam organisasi pengguna.
-   Semua query kandidat AI-02 harus memakai scope organisasi.
-   Statistik AI-06 harus dihitung dalam scope organisasi.
-   Jangan mempercayai ID kasus dari output AI tanpa validasi ulang.

### 7.2 Authorization

Gunakan Policy, Gate, dan middleware yang sudah ada. Penambahan endpoint
AI tidak boleh memperluas hak akses pengguna secara tidak sengaja.

### 7.3 Prompt injection

Deskripsi laporan dan teks pengguna merupakan data tidak tepercaya,
bukan instruksi sistem.

Mitigasi: - Pisahkan instruksi sistem dari konten laporan. -
Instruksikan model untuk memperlakukan konten laporan sebagai data. -
Jangan menyediakan tool yang dapat mengubah database atau menjalankan
operasi. - Validasi semua output AI di backend. - Batasi panjang input
dan output.

### 7.4 Data minimization

Sebelum mengirim data ke NexusRouter: - Hilangkan nama, email, nomor
telepon, dan pengenal personal lain jika tidak dibutuhkan. - Kirim hanya
field yang relevan untuk fitur. - Hindari mengirim lampiran mentah
kecuali ada kebutuhan dan mekanisme khusus yang sudah disetujui. -
Tinjau kebijakan privasi, retensi, dan pemrosesan data dari layanan AI
sebelum produksi.

### 7.5 Logging dan audit

Metadata yang dapat dicatat: - Fitur AI yang dipanggil. - User ID dan
organization ID sesuai kebijakan audit aplikasi. - Case ID jika
relevan. - Waktu dan durasi request. - Status berhasil/gagal. -
Model/provider aktual jika disediakan NexusRouter. - Kode error yang
aman. - Versi prompt atau konfigurasi.

Jangan mencatat: - Virtual key atau master key. - Header
Authorization. - Data laporan lengkap secara default. - Informasi
pribadi yang tidak diperlukan.

### 7.6 Kegagalan layanan

Jika NexusRouter tidak tersedia: - Kembalikan error API yang konsisten
dan aman. - Tampilkan bahwa bantuan AI sementara tidak tersedia. -
Jangan menghalangi pengguna melanjutkan workflow manual. - Jangan
mengubah data kasus menjadi status gagal atau status bisnis lain hanya
karena request AI gagal.

------------------------------------------------------------------------

## 8. Testing dan Kriteria Penerimaan

### 8.1 NexusRouter client

-   Berhasil mengirim request dengan virtual key yang valid.
-   Credential salah menghasilkan penanganan 401 yang aman.
-   Timeout ditangani.
-   Respons non-2xx ditangani.
-   Respons dengan konten kosong atau tidak valid ditolak.
-   Credential tidak muncul di log atau response.
-   Model yang digunakan benar-benar tersedia pada instance NexusRouter
    target.

### 8.2 AI-01

-   Rekomendasi hanya menggunakan kategori valid.
-   Severity dan likelihood sesuai nilai yang diterima SafetyLog.
-   Risk score resmi tetap dihitung oleh backend.
-   AI tidak mengubah triase resmi.
-   Pengguna tanpa izin tidak dapat memanggil fitur.

### 8.3 AI-02

-   Hasil pencarian tidak pernah melintasi organisasi.
-   AI hanya dapat memilih ID dari kandidat yang diberikan.
-   Kasus yang tidak relevan tidak dipaksakan menjadi duplikat.
-   Tidak ada penggabungan atau penghapusan otomatis.

### 8.4 AI-04

-   Output memiliki tipe tindakan yang valid.
-   Draf dapat ditinjau dan diedit.
-   Penyimpanan tindakan tetap melalui workflow yang ada.
-   Aturan preventive action dan verifier/PIC tidak terlewati.

### 8.5 AI-06

-   Statistik dihitung backend.
-   Ringkasan sesuai periode yang dipilih.
-   Data organisasi lain tidak ikut dihitung.
-   AI tidak mengarang angka atau menyatakan sebab-akibat tanpa bukti.

### 8.6 Pengujian lintas fitur

-   Uji pengguna dari organisasi berbeda.
-   Uji role yang tidak berwenang.
-   Uji prompt injection dalam deskripsi laporan.
-   Uji respons AI dengan JSON rusak, field hilang, tipe salah, dan ID
    palsu.
-   Uji kegagalan NexusRouter tanpa mengganggu workflow manual.

------------------------------------------------------------------------

## 9. Rencana Implementasi Bertahap

  -----------------------------------------------------------------------
  Tahap                   Pekerjaan               Hasil yang diharapkan
  ----------------------- ----------------------- -----------------------
  0                       Verifikasi source code  Detail route, model,
                          dan kontrak NexusRouter enum, policy, dan
                                                  response terkonfirmasi

  1                       Konfigurasi NexusRouter SafetyLog dapat
                          dan client dasar        melakukan request
                                                  terautentikasi

  2                       Parser dan validator    Output model dapat
                          output AI               ditolak jika tidak
                                                  sesuai kontrak

  3                       Implementasi AI-01      Rekomendasi triase
                                                  tampil sebagai saran

  4                       Implementasi AI-02      Kandidat dari pencarian
                                                  database dianalisis AI

  5                       Implementasi AI-04      Draf tindakan dapat
                                                  ditinjau pengguna

  6                       Implementasi AI-06      Ringkasan naratif
                                                  dashboard berbasis
                                                  agregat

  7                       Pengujian, audit, dan   Integrasi siap
                          hardening               dievaluasi untuk
                                                  deployment
  -----------------------------------------------------------------------

### File yang kemungkinan terlibat

Daftar berikut bersifat perkiraan berdasarkan struktur repository yang
dilaporkan:

  ---------------------------------------------------------------------------------
  File/lokasi                                   Perubahan yang direncanakan
  --------------------------------------------- -----------------------------------
  `config/services.php`                         Menambahkan konfigurasi NexusRouter

  `.env` / environment deployment               Menyimpan base URL, virtual key,
                                                model, dan timeout

  `app/Services/Ai/`                            Client, service, parser, dan prompt

  `app/Http/Controllers/Api/AiController.php`   Endpoint fitur AI jika dipilih
                                                memakai controller khusus

  `app/Http/Requests/Ai/`                       Validasi request jika diperlukan

  `routes/api.php`                              Mendaftarkan endpoint AI

  `DashboardService`                            Menyiapkan agregat dashboard jika
                                                metrik yang dibutuhkan belum
                                                tersedia

  `CaseSearchService`                           Integrasi retrieval AI-02 jika
                                                diperlukan; pertahankan pencarian
                                                yang sudah berjalan

  Test files terkait                            Unit, feature, authorization,
                                                tenant isolation, dan failure tests
  ---------------------------------------------------------------------------------

Hindari mengubah `CaseWorkflowService` atau endpoint yang sudah ada
kecuali memang diperlukan dan dampaknya sudah dianalisis.

------------------------------------------------------------------------

## 10. Hal yang Wajib Diverifikasi Sebelum Coding

Berikut hal-hal yang belum boleh dianggap pasti hanya dari ringkasan
eksplorasi:

1.  Versi Laravel dan PHP yang tepat.
2.  Nama method dan signature aktual pada controller/service.
3.  Enum atau nilai valid untuk severity, likelihood, risk level, action
    type, dan priority.
4.  Bentuk response API standar SafetyLog.
5.  Apakah endpoint `/cases/{case}/similar` sudah digunakan frontend dan
    bagaimana kontraknya.
6.  Field apa saja yang tersedia pada statistik `DashboardService`.
7.  Apakah seluruh query terkait kasus benar-benar memakai scope
    organisasi.
8.  Model ID yang tersedia di endpoint `/v1/models` NexusRouter target.
9.  Perilaku aktual auto-routing, fallback, timeout, dan metadata
    respons NexusRouter.
10. Kebijakan privasi dan retensi data yang berlaku untuk pengiriman
    data ke NexusRouter.

Setiap poin harus diverifikasi melalui source code, konfigurasi
deployment, atau pengujian langsung yang aman. Jangan mengisi nilai yang
belum diketahui dengan asumsi.

------------------------------------------------------------------------

## 11. Keputusan Desain yang Direkomendasikan

1.  Gunakan `POST /v1/chat/completions` NexusRouter dari backend
    Laravel.
2.  Gunakan dedicated virtual key khusus SafetyLog.
3.  Mulai dengan `stream: false`.
4.  Buat client NexusRouter terpisah dari logika fitur AI.
5.  Terapkan parsing dan validasi output di backend.
6.  Pertahankan seluruh aturan workflow, role, dan multi-tenant
    SafetyLog.
7.  Untuk AI-02, gunakan `CaseSearchService` sebagai retrieval awal; AI
    menjadi lapisan analisis tambahan.
8.  Untuk AI-06, kirim agregat dashboard, bukan data mentah seluruh
    kasus.
9.  Implementasikan bertahap: koneksi → AI-01 → AI-02 → AI-04 → AI-06.
10. Jadikan semua output AI sebagai rekomendasi atau draf yang dapat
    ditinjau manusia.

**Prinsip akhir:** NexusRouter menyediakan kemampuan generatif AI,
sedangkan SafetyLog tetap menjadi sumber kebenaran untuk data,
otorisasi, perhitungan risiko, dan keputusan workflow.
