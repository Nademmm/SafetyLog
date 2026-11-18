# SafetyLog Design System & Token Foundation (B-04)

> **Versi**: 1.0  
> **Backlog**: B-04 — Wireframe dan design tokens  
> **PIC**: Sandy (Developer + UI/UX)  
> **Status**: Siap Digunakan (Foundation Ready)  
> **Alur Produk**: Capture → Resolve → Learn → Prevent  

---

## 1. Filosofi & Arah Visual: Industrial Dark

SafetyLog dirancang untuk lingkungan pabrik manufaktur modern (lantai produksi, operator mesin, supervisor lini, dan auditor K3/HSE). Desain menganut prinsip **Minimalist Industrial Dark** yang terinspirasi oleh perangkat industri presisi tinggi:

- **Permukaan Dark Charcoal**: Mengurangi silau di lantai pabrik dan hemat daya pada perangkat mobile AMOLED.
- **Kontras Tinggi & Tipografi Bersih**: Keterbacaan instan dari jarak kerja normal menggunakan font **Inter**.
- **Aksen Terkendali (Restrained Industrial Orange)**: Aksen oranye `#F97316` hanya digunakan untuk penanda visual penting atau aksi khusus K3, bukan dekorasi bebas.
- **Bukan Sekadar Estetika, Utamakan Fungsi**: Tanpa efek glassmorphism berlebihan, tanpa gradien dekoratif mencolok, dan bebas elemen visual yang membingungkan operator.
- **Ergonomi Sentuh Operator**: Semua target interaksi sentuh minimal **44×44 px** agar nyaman dioperasikan satu tangan di layar HP selebar **360 px** atau saat operator mengenakan sarung tangan kerja.

---

## 2. Struktur Arsitektur Token

Token disusun dalam 3 lapisan modular:

```
┌────────────────────────────────────────────────────────┐
│ 1. PRIMITIVE LAYER (Nilai heksadesimal mentah)         │
│    Carbon (#111418), Graphite (#1C2229), Orange (#F97316)│
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 2. SEMANTIC LAYER (Peran fungsional & standar K3)      │
│    --surface-base, --text-primary, --safety-danger, dll│
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 3. COMPONENT PRIMITIVES (shadcn/ui & Tailwind)         │
│    <Button>, <Input>, <Card>, <Badge>, <RiskBadge>     │
└────────────────────────────────────────────────────────┘
```

Sumber kebenaran tunggal (*single source of truth*) didefinisikan di:
- `web/src/styles/tokens.css` — Variabel CSS murni & variabel semantik shadcn/ui.
- `web/tailwind.config.ts` — Pemetaan utilitas Tailwind CSS ke token semantik.

---

## 3. Token Warna (Color Tokens)

### A. Pondasi Industrial Dark (Foundation Surfaces)

| Token Name | Nilai Hex | Variabel CSS | Peruntukan |
| :--- | :--- | :--- | :--- |
| **Carbon** | `#111418` | `--surface-base` | Background utama seluruh halaman aplikasi. |
| **Graphite** | `#1C2229` | `--surface-default` | Permukaan kartu (*card*), container panel, dan form. |
| **Elevated** | `#252D36` | `--surface-elevated` | Modal dialog, popover, dropdown, dan kartu bertingkat. |
| **Charcoal Border** | `#343D47` | `--border-subtle` | Garis batas (*stroke*), pemisah section, dan border input. |
| **Off-White** | `#F4F5F6` | `--text-primary` | Teks utama dengan kontras tinggi (rasio kontras > 12:1). |
| **Muted Steel** | `#A3AAB3` | `--text-secondary` | Teks sekunder, label pembantu, dan ikon pasif. |
| **Pure White** | `#FFFFFF` | `--primitive-pure-white` | Teks tombol primer / kontras maksimal. |

> **Aturan Tombol Primer**:
> Tombol aksi primer menggunakan permukaan **kontras netral tinggi** (`#F4F5F6` dengan teks gelap `#111418`). **Dilarang keras** menggunakan warna peringatan/bahaya untuk tombol biasa (misal tombol *Simpan* atau *Lanjut* tidak boleh berwarna merah/kuning).

### B. Warna Semantik K3 (K3 Safety Semantics)

Mengikuti standar warna keselamatan industri internasional **ISO 7010 / ISO 3864** dan **ANSI Z535**.

| Makna K3 | Warna Inti | Dark Background | Border | Teks Foreground | Status & Skor SafetyLog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DANGER (Bahaya)** | `#EF4444` | `rgba(239, 68, 68, 0.15)` | `rgba(239, 68, 68, 0.35)` | `#FCA5A5` | Risiko **Tinggi** (skor 15–25), Stop Darurat, Label **Terlambat**. |
| **WARNING (Peringatan)** | `#F97316` | `rgba(249, 115, 22, 0.15)` | `rgba(249, 115, 22, 0.35)` | `#FDBA74` | Risiko **Sedang** (skor 7–14), Kondisi Tidak Aman, Peringatan terbuka. |
| **CAUTION (Perhatian)** | `#FACC15` | `rgba(250, 204, 21, 0.15)` | `rgba(250, 204, 21, 0.35)` | `#FDE047` | Risiko **Rendah** (skor 1–6), Menunggu verifikasi, Kerusakan minor. |
| **INFO / MANDATORY** | `#3B82F6` | `rgba(59, 130, 246, 0.15)` | `rgba(59, 130, 246, 0.35)` | `#93C5FD` | Kasus **Baru**, Prosedur wajib / APD, Status Dianalisis. |
| **SAFE CONDITION** | `#22C55E` | `rgba(34, 197, 94, 0.15)` | `rgba(34, 197, 94, 0.35)` | `#86EFAC` | Kasus **Selesai** (terverifikasi & terkunci), Kondisi aman. |

> **Aturan Wajib Standar K3**:
> 1. Warna keselamatan **tidak boleh digunakan secara acak** sebagai elemen pemanis/dekorasi.
> 2. Setiap status wajib memiliki **teks label yang jelas** (misal: "Tinggi", "Sedang", "Selesai", "Terlambat"), tidak boleh hanya mengandalkan warna saja, demi aksesibilitas dan pekerja dengan defisiensi penglihatan warna (*color blindness*).

---

## 4. Sistem Tipografi (Typography System)

Font standar yang digunakan adalah **Inter** dengan angka tabular (*tabular numerals*) untuk data metrik.

| Tingkatan | Ukuran / Line-Height | Weight | Letter-Spacing | Kegunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 40px / 1.1 | Bold (700) | `-0.02em` | Angka metrik utama dashboard, landing hero. |
| **H1** | 32px / 1.2 | Bold (700) | `-0.02em` | Judul halaman utama (Lapor Kasus, Dashboard). |
| **H2** | 24px / 1.25 | Semibold (600) | `-0.01em` | Judul bagian / modul utama. |
| **H3** | 20px / 1.3 | Semibold (600) | `-0.01em` | Judul kartu triase, detail kasus, form section. |
| **H4** | 16px / 1.4 | Semibold (600) | `0` | Sub-judul panel, nama mesin. |
| **Body Large** | 16px / 1.5 | Regular (400) | `0` | Deskripsi pengantar, teks instruksi lapor. |
| **Body** | 14px / 1.5 | Regular (400) | `0` | Teks paragraf umum, tabel data, isi deskripsi kasus. |
| **Label** | 12px / 1.4 | Medium (500) | `+0.02em` | Label input form, badge, status tracker. |
| **Caption** | 11px / 1.3 | Regular (400) | `0` | Timestamp riwayat, keterangan foto bukti. |
| **Button** | 14px / 1.4 | Semibold (600) | `0` | Teks tombol aksi. |

### Tabular Numerals (Angka Monospace)
Untuk nomor kasus (`SL-SBY-2026-0001`), hitungan mundur SLA, dan nilai biaya estimasi kerugian, gunakan kelas `.tabular-nums` atau `.tnum` agar digit angka memiliki lebar identik dan tidak bergeser saat nilai berubah.

---

## 5. Spacing, Radius, & Ergonomi Layar 360 px

### A. Skala Spacing (Kelipatan 4px)

| Token Spacing | Ukuran Pixel | Contoh Penggunaan |
| :--- | :--- | :--- |
| `space-1` | 4px | Jarak antar ikon dan teks badge. |
| `space-2` | 8px | Gap elemen form, margin vertikal input. |
| `space-3` | 12px | Padding dalam kartu mobile, gap tombol. |
| `space-4` | 16px | Padding standar kartu (*p-4*), margin container. |
| `space-5` | 20px | Gap antar section pada layar mobile. |
| `space-6` | 24px | Padding kartu desktop (*p-6*), header section. |
| `space-8` | 32px | Jarak vertikal antar section utama. |
| `space-10` | 40px | Batas maksimum margin section. |
| `space-12` | 48px | Header banner utama. |
| `space-16` | 64px | Padding vertikal halaman kosong (*empty state*). |

### B. Radius Skala (Border Radius)

- **Small (`6px` / `rounded-sm`)**: Badge risiko, tag kategori, label mesin.
- **Input/Button (`8px` / `rounded-md` / `rounded-button`)**: Tombol, input teks, dropdown selector.
- **Card (`12px` / `rounded-lg` / `rounded-card`)**: Kartu kasus, container form lapor, container triase.
- **Large (`16px` / `rounded-xl`)**: Modal dialog, modal upload kamera, bottom sheet mobile.

### C. Aturan Target Sentuh Mobile (360 px Viewport)

- Seluruh tombol interaktif memiliki tinggi minimal **44px** (`min-h-touch` / `h-11`).
- Jarak antar tombol minimal **8px** untuk mencegah salah pencet di layar sentuh HP.
- Tata letak diuji pada batas minimum **360 px** tanpa horizontal scrolling.

---

## 6. Standar Ikonografi (Iconography)

- **Keluarga Ikon**: Hanya menggunakan **Lucide React**. Dilarang mencampur font ikon lain (FontAwesome, Material Icons, dll).
- **Ketebalan Garis (Stroke Width)**: Konsisten **2px** (`stroke-[2px]`).
- **Ukuran Baku**:
  - `16px` (`h-4 w-4`): Ikon pada badge, tombol ukuran *sm*, teks inline.
  - `20px` (`h-5 w-5`): Ikon pada tombol ukuran default, judul section.
  - `24px` (`h-6 w-6`): Ikon navigasi menu, header kartu.
  - `32px` (`h-8 w-8`): Ikon status ilustrasi, avatar mesin, QR scanner hero.

---

## 7. Panduan Komponen Primitives & Contoh Pemakaian

### A. Tombol (`<Button />`)

```tsx
import { Button } from '@/components/ui/button'

// 1. Aksi primer (High contrast neutral)
<Button variant="default">Kirim Laporan</Button>

// 2. Aksi sekunder
<Button variant="secondary">Simpan Draf</Button>

// 3. Aksi outline
<Button variant="outline">Kembali</Button>

// 4. Aksi darurat / bahaya
<Button variant="destructive">Hentikan Lini Produksi</Button>

// 5. Aksi aksen K3 khusus
<Button variant="industrial">Scan QR Mesin</Button>
```

### B. Input Teks (`<Input />`)

```tsx
import { Input } from '@/components/ui/input'

<div className="space-y-1.5">
  <label className="text-label text-off-white">Kode Mesin</label>
  <Input placeholder="Scan QR atau ketik kode mesin..." />
</div>
```

### C. Kartu Kasus (`<Card />`)

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>MC-01 — Konveyor Packaging</CardTitle>
    <CardDescription>Lini 1 Packaging · Area A</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-body text-steel-muted">Deskripsi abnormalitas mesin...</p>
  </CardContent>
</Card>
```

### D. Badge Tingkat Risiko K3 (`<RiskBadge />`)

Perhitungan skor risiko 5×5 (`skor = keparahan × kemungkinan`):
- **Tinggi (15–25)**: `#EF4444` (Wajib tindakan preventif sebelum tutup kasus).
- **Sedang (7–14)**: `#F97316` (Wajib tindakan preventif sebelum tutup kasus).
- **Rendah (1–6)**: `#FACC15`.

```tsx
import { RiskBadge } from '@/components/ui/risk-badge'

<RiskBadge level="Tinggi" score={16} />
<RiskBadge level="Sedang" score={12} />
<RiskBadge level="Rendah" score={4} />
```

### E. Status Alur Kasus (`<CaseStatusBadge />`)

Mendukung 9 status alur produk SafetyLog:
- `Baru` (Laporan baru masuk via scan QR)
- `Dinilai` (Risiko sudah dinilai oleh Supervisor)
- `Dianalisis` (Akar masalah 5 Why/6M selesai)
- `Tindakan berjalan` (Tindakan perbaikan sedang dikerjakan PIC)
- `Menunggu verifikasi` (Semua tindakan selesai, menunggu K3)
- `Selesai` (Telah diverifikasi pihak independen & terkunci)
- `Terlambat` (Tindakan melewati tenggat SLA)
- `Ditolak` / `Duplikat` (Laporan tidak valid dengan alasan)

```tsx
import { CaseStatusBadge } from '@/components/ui/risk-badge'

<CaseStatusBadge status="Baru" />
<CaseStatusBadge status="Tindakan berjalan" />
<CaseStatusBadge status="Selesai" />
<CaseStatusBadge status="Terlambat" />
```

---

## 8. Verifikasi & Checklist Sprint B-04

- [x] Sumber kebenaran variabel CSS terpusat (`web/src/styles/tokens.css`).
- [x] Pemetaan utilitas Tailwind CSS terintegrasi (`web/tailwind.config.ts`).
- [x] Dukungan tema Industrial Dark konsisten dengan opsi ekstensi Light Theme di masa depan.
- [x] Font Inter dengan hierarki Display hingga Caption dan tabular numerals.
- [x] Warna K3 sesuai standar ISO 7010 / ANSI Z535 disertai label teks wajib.
- [x] Komponen siap pakai ulang: Button, Input, Card, Badge, RiskBadge, CaseStatusBadge.
- [x] Area sentuh minimal 44px ramah sarung tangan operator.
- [x] Kompatibel penuh dan nyaman pada lebar layar mobile minimal 360 px.
- [x] Seluruh aturan produk (Capture → Resolve → Learn → Prevent) terjaga tanpa modifikasi backend.
