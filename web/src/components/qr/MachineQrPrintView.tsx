import * as React from 'react'
import {
  Printer,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Search,
  MapPin,
  Cpu,
  Layers,
  ExternalLink,
  ShieldAlert,
  LogOut,
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
import { QrCodeSvg } from '@/components/qr/QrCodeSvg'
import {
  type MachineRecord,
  type AuthSession,
  buildQrReportUrl,
  buildQrReportPath,
} from '@/lib/qr-flow'

export interface MachineQrPrintViewProps {
  machines: MachineRecord[]
  selectedMachine: MachineRecord
  onSelectMachine: (machine: MachineRecord) => void
  onSimulateScan: (qrToken: string, forceUnauthenticated?: boolean) => void
  session: AuthSession | null
  dataSource: 'api' | 'demo'
}

interface QrStickerCardProps {
  machine: MachineRecord
  compact?: boolean
}

function QrStickerCard({ machine, compact = false }: QrStickerCardProps) {
  const token = machine.qr_token ?? ''
  const reportUrl = buildQrReportUrl(token)
  const reportPath = buildQrReportPath(token)

  return (
    <div
      className="qr-sticker-card rounded-card border-2 border-charcoal-border bg-graphite p-5 text-off-white shadow-elevated print:border-2 print:border-black print:bg-white print:text-black print:shadow-none"
      data-testid={`qr-sticker-${machine.code}`}
    >
      {/* Top Industrial K3 Header */}
      <div className="flex items-center justify-between border-b border-charcoal-border pb-3 print:border-black">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-industrial-orange text-white print:border print:border-black print:bg-black print:text-white">
            <ShieldAlert className="h-4 w-4 stroke-[2px]" />
          </div>
          <div>
            <div className="text-label font-bold tracking-wider uppercase text-off-white print:text-black">
              SAFETYLOG · K3 &amp; MESIN
            </div>
            <div className="text-caption text-steel-muted print:text-black">
              Stiker Lapor Cepat Lantai Produksi
            </div>
          </div>
        </div>
        <Badge
          variant="warning"
          className="font-mono text-caption tabular-nums print:border-black print:bg-white print:text-black"
        >
          SCAN HP
        </Badge>
      </div>

      {/* Machine Identity:Kode Mesin, Nama Mesin, Area */}
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-caption uppercase tracking-wider text-steel-muted print:text-black">
            Kode Mesin
          </span>
          <span className="rounded-sm border border-charcoal-border bg-carbon px-2.5 py-0.5 font-mono text-body font-bold text-industrial-orange tabular-nums print:border-black print:bg-white print:text-black">
            {machine.code}
          </span>
        </div>

        <div>
          <span className="text-caption uppercase tracking-wider text-steel-muted block print:text-black">
            Nama Mesin
          </span>
          <h3 className="text-h3 font-bold text-off-white leading-snug print:text-black">
            {machine.name}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
          <div className="rounded-sm border border-charcoal-border bg-carbon/70 px-3 py-2 print:border-black print:bg-white">
            <div className="flex items-center gap-1.5 text-caption text-steel-muted print:text-black">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-industrial-orange stroke-[2px] print:text-black" />
              <span>Area Produksi</span>
            </div>
            <div className="mt-0.5 text-body font-semibold text-off-white print:text-black">
              {machine.area.name}{' '}
              <span className="font-mono text-caption text-steel-muted tabular-nums print:text-black">
                ({machine.area.code})
              </span>
            </div>
          </div>

          <div className="rounded-sm border border-charcoal-border bg-carbon/70 px-3 py-2 print:border-black print:bg-white">
            <div className="flex items-center gap-1.5 text-caption text-steel-muted print:text-black">
              <Cpu className="h-3.5 w-3.5 shrink-0 text-industrial-orange stroke-[2px] print:text-black" />
              <span>Lokasi Pabrik</span>
            </div>
            <div className="mt-0.5 text-body font-semibold text-off-white print:text-black">
              {machine.site.name}{' '}
              <span className="font-mono text-caption text-steel-muted tabular-nums print:text-black">
                ({machine.site.code})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Centered High-Contrast QR Code SVG */}
      <div className="my-5 flex flex-col items-center justify-center rounded-input border border-charcoal-border bg-carbon p-4 print:border-black print:bg-white">
        <div className="rounded-md border-4 border-white bg-white p-2 shadow-subtle print:border-black print:shadow-none">
          <QrCodeSvg
            value={reportUrl}
            size={compact ? 164 : 204}
            label={`QR Code Lapor Mesin ${machine.code} - ${machine.name}`}
          />
        </div>
        <div className="mt-3 text-center space-y-0.5">
          <div className="text-label font-semibold text-off-white print:text-black">
            Arahkan Kamera HP untuk Melapor (&lt; 60 Detik)
          </div>
          <div className="font-mono text-caption text-steel-muted break-all tabular-nums print:text-black">
            {reportPath}
          </div>
        </div>
      </div>

      {/* 3-Step Operator Instruction Footer */}
      <div className="rounded-sm border border-safety-info-border bg-safety-info-bg p-3 text-caption text-safety-info-foreground print:border-black print:bg-white print:text-black">
        <div className="font-semibold mb-1">Cara Lapor Cepat via HP:</div>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Scan kode QR di atas dengan kamera HP Anda.</li>
          <li>Mesin ini otomatis terpilih di Form Lapor.</li>
          <li>Pilih jenis kasus, isi deskripsi singkat, lalu kirim.</li>
        </ol>
      </div>
    </div>
  )
}

export function MachineQrPrintView({
  machines,
  selectedMachine,
  onSelectMachine,
  onSimulateScan,
  session,
  dataSource,
}: MachineQrPrintViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedAreaCode, setSelectedAreaCode] = React.useState<string>('ALL')
  const [printMode, setPrintMode] = React.useState<'single' | 'sheet'>('single')
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null)

  const areas = React.useMemo(() => {
    const map = new Map<string, { code: string; name: string }>()
    for (const m of machines) {
      if (m.area?.code && !map.has(m.area.code)) {
        map.set(m.area.code, { code: m.area.code, name: m.area.name })
      }
    }
    return Array.from(map.values())
  }, [machines])

  const filteredMachines = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return machines.filter((m) => {
      if (!m.is_active) return false
      if (selectedAreaCode !== 'ALL' && m.area.code !== selectedAreaCode) {
        return false
      }
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.area.name.toLowerCase().includes(q) ||
        (m.qr_token ?? '').toLowerCase().includes(q)
      )
    })
  }, [machines, searchQuery, selectedAreaCode])

  const handleCopyUrl = async (qrToken: string) => {
    const fullUrl = buildQrReportUrl(qrToken)
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedToken(qrToken)
      window.setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      setCopiedToken(qrToken)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Screen-only Header & Controls */}
      <Card className="print:hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">Backlog B-07 · Must</Badge>
                <Badge variant="secondary" className="font-mono text-caption tabular-nums">
                  {dataSource === 'api' ? 'Sumber: API Backend' : 'Sumber: Data Seeder Lokal'}
                </Badge>
              </div>
              <CardTitle className="text-h2 font-bold text-off-white">
                QR per Mesin &amp; Halaman Cetak Stiker
              </CardTitle>
              <CardDescription>
                Setiap mesin memiliki token QR acak unik (bukan nomor urut). Cetak stiker QR untuk ditempel di mesin atau uji langsung alur scan QR dari HP.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={printMode === 'single' ? 'secondary' : 'outline'}
                onClick={() => setPrintMode('single')}
                className="gap-2"
              >
                <QrCode className="h-4 w-4 stroke-[2px]" />
                1 Mesin
              </Button>
              <Button
                variant={printMode === 'sheet' ? 'secondary' : 'outline'}
                onClick={() => setPrintMode('sheet')}
                className="gap-2"
              >
                <Layers className="h-4 w-4 stroke-[2px]" />
                Lembar Semua ({filteredMachines.length})
              </Button>
              <Button variant="default" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4 stroke-[2px]" />
                Cetak Stiker QR
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search & Area Filter */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 relative">
              <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-steel-muted stroke-[2px]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama mesin, kode (mis. MCH-CONV-01), atau area..."
                className="pl-10"
                aria-label="Cari mesin"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedAreaCode === 'ALL' ? 'secondary' : 'outline'}
                size="default"
                onClick={() => setSelectedAreaCode('ALL')}
                className="flex-1"
              >
                Semua Area
              </Button>
              {areas.map((area) => (
                <Button
                  key={area.code}
                  variant={selectedAreaCode === area.code ? 'secondary' : 'outline'}
                  size="default"
                  onClick={() => setSelectedAreaCode(area.code)}
                  className="font-mono text-xs"
                >
                  {area.code}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Layout: Selector List + Sticker Preview */}
      {printMode === 'single' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Machine Selector List (hidden when printing) */}
          <div className="space-y-3 lg:col-span-5 print:hidden">
            <div className="flex items-center justify-between px-1">
              <span className="text-label font-semibold uppercase tracking-wider text-steel-muted">
                Pilih Mesin ({filteredMachines.length} Aktif)
              </span>
              <span className="font-mono text-caption text-steel-muted tabular-nums">
                Token QR Acak
              </span>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredMachines.map((machine) => {
                const isSelected = machine.id === selectedMachine.id
                return (
                  <button
                    key={machine.id}
                    type="button"
                    onClick={() => onSelectMachine(machine)}
                    className={`w-full text-left rounded-card border p-3.5 transition-colors min-h-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-orange ${
                      isSelected
                        ? 'border-industrial-orange bg-elevated shadow-subtle'
                        : 'border-charcoal-border bg-graphite hover:bg-elevated/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-label font-bold text-industrial-orange tabular-nums">
                        {machine.code}
                      </span>
                      <Badge variant={isSelected ? 'warning' : 'outline'} className="text-[11px]">
                        {machine.area.name}
                      </Badge>
                    </div>
                    <div className="mt-1 text-h4 font-semibold text-off-white">
                      {machine.name}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-caption text-steel-muted">
                      <span className="font-mono truncate tabular-nums">
                        qr={machine.qr_token}
                      </span>
                      <span className="shrink-0 text-off-white font-medium">
                        {isSelected ? 'Sedang Dipilih' : 'Pilih →'}
                      </span>
                    </div>
                  </button>
                )
              })}

              {filteredMachines.length === 0 && (
                <Card className="p-6 text-center text-body text-steel-muted">
                  Tidak ada mesin yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                </Card>
              )}
            </div>
          </div>

          {/* Right Column: Printable QR Sticker + Mobile Scan Simulator Controls */}
          <div className="space-y-4 lg:col-span-7 print:col-span-12">
            <div className="mx-auto max-w-md print:max-w-none">
              <QrStickerCard machine={selectedMachine} />
            </div>

            {/* Interactive Test & Print Actions (Hidden on paper print) */}
            <Card className="mx-auto max-w-md print:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-h4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-industrial-orange stroke-[2px]" />
                  Uji Alur Scan QR di HP (B-07 → B-05 / B-08)
                </CardTitle>
                <CardDescription>
                  Uji kedua skenario wajib B-07 untuk mesin{' '}
                  <span className="font-mono font-semibold text-off-white">
                    {selectedMachine.code}
                  </span>
                  :
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Scenario 1: Scan with current auth status (or already logged in) */}
                <Button
                  variant="industrial"
                  className="w-full gap-2 justify-center"
                  onClick={() => onSimulateScan(selectedMachine.qr_token ?? '', false)}
                >
                  <QrCode className="h-4 w-4 stroke-[2px]" />
                  {session
                    ? `Simulasi Scan QR (Sudah Login: ${session.user.role_label})`
                    : 'Simulasi Scan QR Sekarang'}
                </Button>

                {/* Scenario 2: Explicitly test unauthenticated scan -> Login -> Auto-redirect to Form Lapor */}
                <Button
                  variant="secondary"
                  className="w-full gap-2 justify-center"
                  onClick={() => onSimulateScan(selectedMachine.qr_token ?? '', true)}
                >
                  <LogOut className="h-4 w-4 stroke-[2px]" />
                  Uji Scan Saat Belum Login (Redirect Login → Form Lapor)
                </Button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyUrl(selectedMachine.qr_token ?? '')}
                    className="gap-1.5"
                  >
                    {copiedToken === (selectedMachine.qr_token ?? '') ? (
                      <>
                        <Check className="h-4 w-4 text-safety-safe stroke-[2px]" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 stroke-[2px]" />
                        Salin URL QR
                      </>
                    )}
                  </Button>

                  <Button variant="default" onClick={handlePrint} className="gap-1.5">
                    <Printer className="h-4 w-4 stroke-[2px]" />
                    Cetak Stiker
                  </Button>
                </div>

                <div className="rounded-sm border border-charcoal-border bg-carbon p-2.5 text-caption text-steel-muted space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-off-white">URL Target QR Code:</span>
                    <ExternalLink className="h-3.5 w-3.5 text-industrial-orange stroke-[2px]" />
                  </div>
                  <div className="font-mono text-[11px] text-industrial-orange break-all tabular-nums">
                    {buildQrReportUrl(selectedMachine.qr_token ?? '')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Sheet Mode: Print All Filtered Machines */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 print:grid-cols-2 print:gap-4">
          {filteredMachines.map((machine) => (
            <div key={machine.id} className="break-inside-avoid">
              <QrStickerCard machine={machine} compact />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
