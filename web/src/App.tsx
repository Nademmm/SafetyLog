import * as React from 'react'
import {
  ShieldAlert,
  Flame,
  Search,
  Plus,
  Smartphone,
  Layers,
  Palette,
  Type,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RiskBadge, CaseStatusBadge } from '@/components/ui/risk-badge'

export default function App() {
  const [mobileSimulator, setMobileSimulator] = React.useState(false)

  return (
    <div className="min-h-screen bg-carbon text-off-white selection:bg-industrial-orange/30 selection:text-white">
      {/* Top Industrial Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-charcoal-border bg-carbon/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-industrial-orange text-white shadow-subtle">
              <ShieldAlert className="h-5 w-5 stroke-[2.2px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-h4 font-bold tracking-tight text-white">SAFETYLOG</span>
                <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-industrial-orange border border-charcoal-border">
                  B-04
                </span>
              </div>
              <p className="text-[11px] text-steel-muted">Industrial Dark Design Tokens System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={mobileSimulator ? 'industrial' : 'outline'}
              size="sm"
              onClick={() => setMobileSimulator(!mobileSimulator)}
              className="gap-1.5"
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Simulasi HP</span> 360px
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-12">
        {/* Intro Hero Card */}
        <section className="rounded-card border border-charcoal-border bg-graphite p-6 shadow-subtle">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-industrial-orange border-industrial-orange/40">
                  Sprint 1 · Fondasi UI
                </Badge>
                <span className="text-label text-steel-muted">PIC: Sandy (UI/UX)</span>
              </div>
              <h1 className="text-h1 font-bold text-off-white">
                SafetyLog Design Tokens &amp; Primitives
              </h1>
              <p className="text-body text-steel-muted max-w-3xl">
                Sistem token terpusat dengan filosofi <span className="text-off-white font-medium">Industrial Dark</span>. 
                Mematuhi standar keselamatan K3 internasional (ISO 7010 / ISO 3864 &amp; ANSI Z535), 
                skala modular 4px, font Inter, dan target sentuh minimal 44px ramah operasional pabrik.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                React 19 + Vite 8
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                Tailwind CSS
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                shadcn/ui Tokens
              </Badge>
            </div>
          </div>
        </section>

        {/* 360px Mobile Simulation Mode */}
        {mobileSimulator && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-industrial-orange" />
                <h2 className="text-h3 font-semibold text-off-white">Pratinjau Layar HP (Lebar 360 px)</h2>
              </div>
              <span className="text-caption text-steel-muted">Target audit: Nyaman dioperasikan satu tangan</span>
            </div>

            <div className="flex justify-center p-4 bg-[#0B0D0F] rounded-card border border-charcoal-border">
              {/* 360px Viewport Mock */}
              <div className="w-[360px] rounded-2xl border-2 border-charcoal-border bg-carbon p-4 shadow-elevated space-y-4">
                <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-industrial-orange" />
                    <span className="font-bold text-sm text-off-white">SafetyLog Mobile</span>
                  </div>
                  <span className="font-mono text-[11px] text-steel-muted tabular-nums">12:30 WIB</span>
                </div>

                {/* Machine Sample Banner */}
                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-steel-muted">Mesin Terpilih</span>
                    <Badge variant="secondary" className="text-[10px] py-0">QR Aktif</Badge>
                  </div>
                  <div className="text-body font-semibold text-off-white">MC-01 — Konveyor Utama Packaging</div>
                  <div className="font-mono text-caption text-industrial-orange">Lini 1 Packaging · Area A</div>
                </div>

                {/* Sample Case Card */}
                <Card className="p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-caption text-steel-muted tabular-nums">SL-SBY-2026-0001</span>
                    <RiskBadge level="Tinggi" score={16} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-body font-semibold text-off-white">Motor Overheat &amp; Bearing Aus</div>
                    <p className="text-caption text-steel-muted line-clamp-2">
                      Suhu motor penggerak melebihi batas 85°C dan terdengar desing abnormal pada bantalan.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <CaseStatusBadge status="Tindakan berjalan" />
                    <span className="font-mono text-caption text-steel-muted tabular-nums">PIC: Nadim</span>
                  </div>
                </Card>

                {/* Touch Ergonomics Test Form */}
                <div className="space-y-2.5">
                  <label className="text-label text-off-white block">Input Cepat Operator (44px min)</label>
                  <Input placeholder="Ketik catatan kondisi..." />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full">Batal</Button>
                    <Button variant="default" className="w-full">Kirim Laporan</Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 1. Foundation Colors & Surfaces */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-industrial-orange" />
            <h2 className="text-h2 font-semibold text-off-white">1. Foundation Color Tokens</h2>
          </div>
          <p className="text-body text-steel-muted">
            Permukaan dark charcoal industrial memberikan hierarki visual yang kuat tanpa silau di lingkungan pabrik.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {/* Carbon */}
            <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
              <div className="h-12 w-full rounded-sm border border-charcoal-border bg-carbon" />
              <div>
                <div className="text-label font-bold text-off-white">Carbon</div>
                <div className="font-mono text-caption text-steel-muted">#111418</div>
                <div className="text-[10px] text-steel-muted/80">Background Utama</div>
              </div>
            </div>

            {/* Graphite */}
            <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
              <div className="h-12 w-full rounded-sm border border-charcoal-border bg-graphite" />
              <div>
                <div className="text-label font-bold text-off-white">Graphite</div>
                <div className="font-mono text-caption text-steel-muted">#1C2229</div>
                <div className="text-[10px] text-steel-muted/80">Surface / Kartu</div>
              </div>
            </div>

            {/* Elevated */}
            <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
              <div className="h-12 w-full rounded-sm border border-charcoal-border bg-elevated" />
              <div>
                <div className="text-label font-bold text-off-white">Elevated</div>
                <div className="font-mono text-caption text-steel-muted">#252D36</div>
                <div className="text-[10px] text-steel-muted/80">Modal / Popover</div>
              </div>
            </div>

            {/* Charcoal Border */}
            <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
              <div className="h-12 w-full rounded-sm border border-charcoal-border bg-[#343D47]" />
              <div>
                <div className="text-label font-bold text-off-white">Border</div>
                <div className="font-mono text-caption text-steel-muted">#343D47</div>
                <div className="text-[10px] text-steel-muted/80">Pemisah &amp; Garis</div>
              </div>
            </div>

            {/* Off-White Text */}
            <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
              <div className="h-12 w-full rounded-sm border border-charcoal-border bg-off-white" />
              <div>
                <div className="text-label font-bold text-off-white">Off-White</div>
                <div className="font-mono text-caption text-steel-muted">#F4F5F6</div>
                <div className="text-[10px] text-steel-muted/80">Teks Utama / Primer</div>
              </div>
            </div>

            {/* Steel Muted */}
            <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
              <div className="h-12 w-full rounded-sm border border-charcoal-border bg-[#A3AAB3]" />
              <div>
                <div className="text-label font-bold text-off-white">Muted Steel</div>
                <div className="font-mono text-caption text-steel-muted">#A3AAB3</div>
                <div className="text-[10px] text-steel-muted/80">Teks Sekunder / Ikon</div>
              </div>
            </div>

            {/* Industrial Orange */}
            <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
              <div className="h-12 w-full rounded-sm border border-charcoal-border bg-industrial-orange" />
              <div>
                <div className="text-label font-bold text-off-white">Industrial</div>
                <div className="font-mono text-caption text-steel-muted">#F97316</div>
                <div className="text-[10px] text-steel-muted/80">Aksen Utama K3</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. K3 Semantic Colors (ISO 7010 & ANSI Z535) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-industrial-orange" />
            <h2 className="text-h2 font-semibold text-off-white">2. K3 Semantic Safety Tokens</h2>
          </div>
          <p className="text-body text-steel-muted">
            Mematuhi standar warna keselamatan industri. Warna tidak pernah dipakai berdiri sendiri tanpa teks pendamping yang jelas.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Danger / Red */}
            <div className="rounded-card border border-safety-danger-border bg-graphite p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption font-mono uppercase text-safety-danger">ISO 7010 / ANSI</span>
                <span className="h-3 w-3 rounded-full bg-safety-danger animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="text-h4 font-bold text-safety-danger">DANGER / MERAH</div>
                <div className="font-mono text-caption text-steel-muted">#EF4444</div>
              </div>
              <p className="text-caption text-steel-muted">
                Kondisi darurat, stop mesin, risiko tinggi (skor 15–25), tindakan terlambat.
              </p>
              <div className="pt-1">
                <RiskBadge level="Tinggi" score={20} />
              </div>
            </div>

            {/* Warning / Orange */}
            <div className="rounded-card border border-safety-warning-border bg-graphite p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption font-mono uppercase text-safety-warning">ISO 7010 / ANSI</span>
                <span className="h-3 w-3 rounded-full bg-safety-warning" />
              </div>
              <div className="space-y-1">
                <div className="text-h4 font-bold text-safety-warning">WARNING / ORANYE</div>
                <div className="font-mono text-caption text-steel-muted">#F97316</div>
              </div>
              <p className="text-caption text-steel-muted">
                Peringatan bahaya, kondisi tidak aman, risiko sedang (skor 7–14).
              </p>
              <div className="pt-1">
                <RiskBadge level="Sedang" score={12} />
              </div>
            </div>

            {/* Caution / Yellow */}
            <div className="rounded-card border border-safety-caution-border bg-graphite p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption font-mono uppercase text-safety-caution">ISO 7010 / ANSI</span>
                <span className="h-3 w-3 rounded-full bg-safety-caution" />
              </div>
              <div className="space-y-1">
                <div className="text-h4 font-bold text-safety-caution">CAUTION / KUNING</div>
                <div className="font-mono text-caption text-steel-muted">#FACC15</div>
              </div>
              <p className="text-caption text-steel-muted">
                Perhatian, potensi bahaya kecil, risiko rendah (skor 1–6), abnormalitas ringan.
              </p>
              <div className="pt-1">
                <RiskBadge level="Rendah" score={4} />
              </div>
            </div>

            {/* Info / Blue */}
            <div className="rounded-card border border-safety-info-border bg-graphite p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption font-mono uppercase text-safety-info">ISO 7010 MANDATORY</span>
                <span className="h-3 w-3 rounded-full bg-safety-info" />
              </div>
              <div className="space-y-1">
                <div className="text-h4 font-bold text-safety-info">INFO / BIRU</div>
                <div className="font-mono text-caption text-steel-muted">#3B82F6</div>
              </div>
              <p className="text-caption text-steel-muted">
                Tindakan wajib (APD/prosedur), laporan baru masuk, status dianalisis.
              </p>
              <div className="pt-1">
                <CaseStatusBadge status="Baru" />
              </div>
            </div>

            {/* Safe / Green */}
            <div className="rounded-card border border-safety-safe-border bg-graphite p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption font-mono uppercase text-safety-safe">ISO 7010 SAFE</span>
                <span className="h-3 w-3 rounded-full bg-safety-safe" />
              </div>
              <div className="space-y-1">
                <div className="text-h4 font-bold text-safety-safe">SAFE / HIJAU</div>
                <div className="font-mono text-caption text-steel-muted">#22C55E</div>
              </div>
              <p className="text-caption text-steel-muted">
                Kondisi aman, P3K, kasus telah diverifikasi &amp; selesai (terkunci).
              </p>
              <div className="pt-1">
                <CaseStatusBadge status="Selesai" />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Typography Hierarchy */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-industrial-orange" />
            <h2 className="text-h2 font-semibold text-off-white">3. Typography Hierarchy (Inter)</h2>
          </div>

          <div className="rounded-card border border-charcoal-border bg-graphite p-6 space-y-6">
            <div className="border-b border-charcoal-border pb-4">
              <span className="text-caption font-mono text-steel-muted">Display · 40px Bold (line-height 1.1)</span>
              <div className="text-display font-bold text-off-white">SafetyLog 2026</div>
            </div>

            <div className="border-b border-charcoal-border pb-4">
              <span className="text-caption font-mono text-steel-muted">H1 · 32px Bold (line-height 1.2)</span>
              <div className="text-h1 font-bold text-off-white">Manajemen K3 Pabrik</div>
            </div>

            <div className="border-b border-charcoal-border pb-4">
              <span className="text-caption font-mono text-steel-muted">H2 · 24px Semibold (line-height 1.25)</span>
              <div className="text-h2 font-semibold text-off-white">Penilaian Matriks Risiko 5×5</div>
            </div>

            <div className="border-b border-charcoal-border pb-4">
              <span className="text-caption font-mono text-steel-muted">H3 · 20px Semibold (line-height 1.3)</span>
              <div className="text-h3 font-semibold text-off-white">Daftar Tindakan Korektif &amp; Preventif (CAPA)</div>
            </div>

            <div className="border-b border-charcoal-border pb-4">
              <span className="text-caption font-mono text-steel-muted">H4 · 16px Semibold (line-height 1.4)</span>
              <div className="text-h4 font-semibold text-off-white">MC-03 Stasiun Pengisian Botol Otomatis</div>
            </div>

            <div className="border-b border-charcoal-border pb-4">
              <span className="text-caption font-mono text-steel-muted">Body Large · 16px Regular (line-height 1.5)</span>
              <p className="text-body-lg text-steel-muted">
                Setiap laporan yang masuk wajib melalui tahapan verifikasi independen oleh pihak K3 berwenang sebelum dinyatakan selesai.
              </p>
            </div>

            <div className="border-b border-charcoal-border pb-4">
              <span className="text-caption font-mono text-steel-muted">Body · 14px Regular (line-height 1.5)</span>
              <p className="text-body text-steel-muted">
                Kasus berstatus Sedang dan Tinggi tidak dapat ditutup apabila belum memiliki minimal satu tindakan preventif yang tervalidasi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <span className="text-caption font-mono text-steel-muted">Label · 12px Medium</span>
                <div className="text-label text-off-white">NOMOR KASUS LAPORAN</div>
              </div>
              <div>
                <span className="text-caption font-mono text-steel-muted">Caption · 11px Regular</span>
                <div className="text-caption text-steel-muted">Pembaruan terakhir: 2 menit lalu</div>
              </div>
              <div>
                <span className="text-caption font-mono text-steel-muted">Button · 14px Semibold</span>
                <div className="text-button text-industrial-orange">Simpan Tindakan Perbaikan</div>
              </div>
            </div>

            {/* Tabular Numerals Specimen */}
            <div className="rounded-input border border-charcoal-border bg-carbon p-4 space-y-2">
              <span className="text-caption font-mono text-industrial-orange">Tabular Numerals (tnum) untuk Metrik &amp; Case ID:</span>
              <div className="flex flex-wrap items-center gap-6 font-mono text-sm tabular-nums text-off-white">
                <div>Case ID: <span className="text-white font-bold">SL-SBY-2026-0001</span></div>
                <div>Case ID: <span className="text-white font-bold">SL-SBY-2026-0012</span></div>
                <div>SLA Respon: <span className="text-safety-warning font-bold">03:59:42</span></div>
                <div>Estimasi Rugi: <span className="text-steel-muted font-bold">Rp 12.500.000 (perkiraan)</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. UI Components & Building Blocks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-industrial-orange" />
            <h2 className="text-h2 font-semibold text-off-white">4. Reusable UI Primitives</h2>
          </div>
          <p className="text-body text-steel-muted">
            Komponen siap pakai ulang untuk implementasi form lapor (B-08), triase (B-11/12), dan dashboard (B-21).
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Buttons Showcase */}
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle className="text-h4">Tombol (Button Primitives)</CardTitle>
                <CardDescription>
                  Aksi primer menggunakan kontras netral tinggi. Warna oranye dibatasi untuk aksen khusus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Primary Action</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="industrial" className="gap-2">
                    <Plus className="h-4 w-4" /> Tambah Kasus Baru
                  </Button>
                  <Button variant="destructive" className="gap-2">
                    <Flame className="h-4 w-4" /> Stop Darurat
                  </Button>
                  <Button variant="danger-subtle">Hapus Tindakan</Button>
                  <Button variant="safe-subtle">Verifikasi Kasus</Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button size="sm">Small (36px)</Button>
                  <Button size="default">Default Touch (44px)</Button>
                  <Button size="lg">Large (48px)</Button>
                  <Button size="icon" aria-label="Search">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button disabled>Disabled (40% Opacity)</Button>
                </div>
              </CardContent>
            </Card>

            {/* Input & Form Primitives */}
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle className="text-h4">Input &amp; Form Fields</CardTitle>
                <CardDescription>
                  Tinggi 44px ramah sarung tangan operator pabrik dengan ring fokus oranye industrial.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-label text-off-white">Nama Pelapor</label>
                  <Input placeholder="Contoh: Budi Santoso (Operator Shift 1)" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-label text-off-white">Kode Mesin (Scan QR / Manual)</label>
                  <Input defaultValue="MC-PACK-01" className="font-mono tabular-nums" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-label text-steel-muted">Kolom Terkunci / Nonaktif</label>
                  <Input disabled value="ID Kasus Terkunci: SL-SBY-2026-0001" />
                </div>
              </CardContent>
            </Card>

            {/* Workflow & Risk Badges */}
            <Card className="space-y-4 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-h4">Badge Risiko K3 &amp; Status Kasus SafetyLog</CardTitle>
                <CardDescription>
                  Memenuhi alur lengkap: Capture → Resolve → Learn → Prevent. Setiap status memiliki ikon outline 2px dan teks bahasa Indonesia yang jelas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <span className="text-label text-steel-muted block">Tingkat Risiko (K3 Matrix 5×5):</span>
                  <div className="flex flex-wrap gap-3">
                    <RiskBadge level="Tinggi" score={25} />
                    <RiskBadge level="Tinggi" score={16} />
                    <RiskBadge level="Sedang" score={12} />
                    <RiskBadge level="Sedang" score={8} />
                    <RiskBadge level="Rendah" score={4} />
                    <RiskBadge level="Rendah" score={2} />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-label text-steel-muted block">Status Alur Kasus SafetyLog:</span>
                  <div className="flex flex-wrap gap-2.5">
                    <CaseStatusBadge status="Baru" />
                    <CaseStatusBadge status="Dinilai" />
                    <CaseStatusBadge status="Dianalisis" />
                    <CaseStatusBadge status="Tindakan berjalan" />
                    <CaseStatusBadge status="Menunggu verifikasi" />
                    <CaseStatusBadge status="Selesai" />
                    <CaseStatusBadge status="Terlambat" />
                    <CaseStatusBadge status="Ditolak" />
                    <CaseStatusBadge status="Duplikat" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 5. Token System Rules Summary Footer */}
        <footer className="rounded-card border border-charcoal-border bg-graphite p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
            <span className="text-h4 font-bold text-off-white">Kepatuhan Aturan Sprint &amp; Arsitektur</span>
            <span className="text-caption text-industrial-orange font-mono">B-04 Selesai</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-caption text-steel-muted">
            <div className="space-y-1">
              <div className="text-off-white font-medium">Bahan Bangunan Siap Pakai:</div>
              <p>Warna, font Inter, tombol 44px, badge risiko 5×5, kartu, dan input dapat langsung diimpor oleh tim frontend.</p>
            </div>
            <div className="space-y-1">
              <div className="text-off-white font-medium">Responsif 360 px:</div>
              <p>Seluruh komponen telah divalidasi dan diuji pada lebar 360 px tanpa horizontal scrolling.</p>
            </div>
            <div className="space-y-1">
              <div className="text-off-white font-medium">Dokumentasi Terpusat:</div>
              <p>Panduan lengkap terdokumentasi di <code className="text-industrial-orange">docs/design-system.md</code>.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
