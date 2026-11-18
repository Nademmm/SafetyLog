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
  QrCode,
  FileText,
  LogIn,
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
import { RiskBadge, CaseStatusBadge } from '@/components/ui/risk-badge'
import { MachineQrPrintView } from '@/components/qr/MachineQrPrintView'
import {
  QrLoginRedirectView,
  QrCaseReportFormView,
} from '@/components/qr/QrScanReportFlow'
import {
  type AuthSession,
  type MachineRecord,
  type PendingQrRedirect,
  SEEDED_MACHINES,
  getStoredAuthSession,
  clearAuthSession,
  getPendingQrRedirect,
  savePendingQrRedirect,
  clearPendingQrRedirect,
  extractQrTokenFromRedirectParam,
  fetchMachinesList,
  buildQrReportPath,
} from '@/lib/qr-flow'

type AppTab = 'qr-print' | 'report' | 'login' | 'tokens'

function resolveInitialRouteState(initialSession: AuthSession | null): {
  tab: AppTab
  qrToken: string | null
  pendingRedirect: PendingQrRedirect | null
} {
  if (typeof window === 'undefined') {
    return {
      tab: 'qr-print',
      qrToken: SEEDED_MACHINES[0].qr_token,
      pendingRedirect: null,
    }
  }

  const url = new URL(window.location.href)
  const qrParam = url.searchParams.get('qr')?.trim() || null
  const redirectParam = url.searchParams.get('redirect')
  const storedPending = getPendingQrRedirect()

  // Jika pengguna membuka URL scan QR (mis. /report?qr={qr_token} atau /?qr={qr_token})
  if (qrParam) {
    if (initialSession) {
      return {
        tab: 'report',
        qrToken: qrParam,
        pendingRedirect: null,
      }
    }
    const saved = savePendingQrRedirect(qrParam)
    const loginUrl = `/login?redirect=${encodeURIComponent(saved.redirectPath)}`
    window.history.replaceState({}, '', loginUrl)
    return {
      tab: 'login',
      qrToken: qrParam,
      pendingRedirect: saved,
    }
  }

  // Jika berada di halaman /login dengan parameter redirect
  if (url.pathname === '/login') {
    const redirectQr = extractQrTokenFromRedirectParam(redirectParam)
    const pending =
      redirectQr ? savePendingQrRedirect(redirectQr, redirectParam ?? undefined) : storedPending

    if (initialSession && pending) {
      clearPendingQrRedirect()
      window.history.replaceState({}, '', pending.redirectPath)
      return {
        tab: 'report',
        qrToken: pending.qrToken,
        pendingRedirect: null,
      }
    }

    return {
      tab: 'login',
      qrToken: pending?.qrToken ?? SEEDED_MACHINES[0].qr_token,
      pendingRedirect: pending,
    }
  }

  if (url.pathname === '/report') {
    if (!initialSession) {
      const defaultQr = SEEDED_MACHINES[0].qr_token
      const saved = savePendingQrRedirect(defaultQr)
      window.history.replaceState(
        {},
        '',
        `/login?redirect=${encodeURIComponent(saved.redirectPath)}`
      )
      return {
        tab: 'login',
        qrToken: defaultQr,
        pendingRedirect: saved,
      }
    }
    return {
      tab: 'report',
      qrToken: SEEDED_MACHINES[0].qr_token,
      pendingRedirect: null,
    }
  }

  if (url.pathname === '/design-tokens') {
    return {
      tab: 'tokens',
      qrToken: SEEDED_MACHINES[0].qr_token,
      pendingRedirect: storedPending,
    }
  }

  return {
    tab: 'qr-print',
    qrToken: SEEDED_MACHINES[0].qr_token,
    pendingRedirect: storedPending,
  }
}

export default function App() {
  const [session, setSession] = React.useState<AuthSession | null>(() =>
    getStoredAuthSession()
  )
  const initialRoute = React.useMemo(
    () => resolveInitialRouteState(session),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [activeTab, setActiveTab] = React.useState<AppTab>(initialRoute.tab)
  const [activeQrToken, setActiveQrToken] = React.useState<string | null>(
    initialRoute.qrToken
  )
  const [pendingRedirect, setPendingRedirect] =
    React.useState<PendingQrRedirect | null>(initialRoute.pendingRedirect)

  const [machines, setMachines] = React.useState<MachineRecord[]>(SEEDED_MACHINES)
  const [dataSource, setDataSource] = React.useState<'api' | 'demo'>('demo')
  const [selectedPrintMachine, setSelectedPrintMachine] =
    React.useState<MachineRecord>(SEEDED_MACHINES[0])
  const [mobileSimulator, setMobileSimulator] = React.useState(false)

  // Sinkronisasi daftar mesin dari API jika session aktif
  React.useEffect(() => {
    let mounted = true
    fetchMachinesList(session).then(({ machines: list, source }) => {
      if (!mounted) return
      setMachines(list)
      setDataSource(source)
      setSelectedPrintMachine((prev) =>
        list.find((m) => m.qr_token === prev.qr_token) ?? list[0]
      )
    })
    return () => {
      mounted = false
    }
  }, [session])

  // Tangani navigasi browser back/forward (popstate)
  React.useEffect(() => {
    const onPopState = () => {
      const currentSession = getStoredAuthSession()
      setSession(currentSession)
      const next = resolveInitialRouteState(currentSession)
      setActiveTab(next.tab)
      setActiveQrToken(next.qrToken)
      setPendingRedirect(next.pendingRedirect)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  /**
   * Alur inti B-07 saat QR Mesin di-scan di HP:
   * - Jika sudah login: langsung buka Form Lapor (B-08) dengan mesin otomatis terpilih sesuai qr_token.
   * - Jika belum login: simpan tujuan URL/token QR dan arahkan ke Login (B-05).
   */
  const handleScanQrToken = (qrToken: string, forceUnauthenticated = false) => {
    const cleanToken = qrToken.trim()
    const targetReportPath = buildQrReportPath(cleanToken)

    if (forceUnauthenticated) {
      clearAuthSession()
      setSession(null)
    }

    const currentSession = forceUnauthenticated ? null : session

    if (currentSession) {
      clearPendingQrRedirect()
      setPendingRedirect(null)
      setActiveQrToken(cleanToken)
      setActiveTab('report')
      window.history.pushState({}, '', targetReportPath)
      return
    }

    const saved = savePendingQrRedirect(cleanToken, targetReportPath)
    setPendingRedirect(saved)
    setActiveQrToken(cleanToken)
    setActiveTab('login')
    window.history.pushState(
      {},
      '',
      `/login?redirect=${encodeURIComponent(saved.redirectPath)}`
    )
  }

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession)
    const redirectTarget = pendingRedirect ?? getPendingQrRedirect()

    if (redirectTarget?.qrToken) {
      clearPendingQrRedirect()
      setPendingRedirect(null)
      setActiveQrToken(redirectTarget.qrToken)
      setActiveTab('report')
      window.history.replaceState({}, '', redirectTarget.redirectPath)
      return
    }

    setActiveTab('qr-print')
    window.history.replaceState({}, '', '/machines/qr')
  }

  const handleLogout = () => {
    clearAuthSession()
    setSession(null)
    setActiveTab('login')
    window.history.pushState({}, '', '/login')
  }

  const navigateToTab = (tab: AppTab) => {
    if (tab === 'report') {
      const tokenToUse = activeQrToken ?? selectedPrintMachine.qr_token
      handleScanQrToken(tokenToUse, false)
      return
    }
    setActiveTab(tab)
    if (tab === 'qr-print') {
      window.history.pushState({}, '', '/machines/qr')
    } else if (tab === 'login') {
      window.history.pushState({}, '', '/login')
    } else if (tab === 'tokens') {
      window.history.pushState({}, '', '/design-tokens')
    }
  }

  return (
    <div className="min-h-screen bg-carbon text-off-white selection:bg-industrial-orange/30 selection:text-white print:bg-white print:text-black">
      {/* Top Industrial Navigation Bar (Hidden when printing QR stickers) */}
      <header className="sticky top-0 z-50 border-b border-charcoal-border bg-carbon/95 backdrop-blur-sm print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-industrial-orange text-white shadow-subtle">
              <ShieldAlert className="h-5 w-5 stroke-[2px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-h4 font-bold tracking-tight text-white">
                  SAFETYLOG
                </span>
                <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-industrial-orange border border-charcoal-border">
                  B-07 · QR Mesin
                </span>
              </div>
              <p className="text-[11px] text-steel-muted">
                Capture → Resolve → Learn → Prevent
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav
            aria-label="Navigasi utama SafetyLog"
            className="flex flex-wrap items-center gap-2"
          >
            <Button
              variant={activeTab === 'qr-print' ? 'industrial' : 'outline'}
              size="sm"
              onClick={() => navigateToTab('qr-print')}
              className="gap-1.5 min-h-touch"
            >
              <QrCode className="h-4 w-4 stroke-[2px]" />
              <span>Cetak QR Mesin</span>
            </Button>

            <Button
              variant={activeTab === 'report' ? 'industrial' : 'outline'}
              size="sm"
              onClick={() => navigateToTab('report')}
              className="gap-1.5 min-h-touch"
            >
              <FileText className="h-4 w-4 stroke-[2px]" />
              <span>Form Lapor QR</span>
            </Button>

            <Button
              variant={activeTab === 'tokens' ? 'industrial' : 'outline'}
              size="sm"
              onClick={() => navigateToTab('tokens')}
              className="gap-1.5 min-h-touch"
            >
              <Palette className="h-4 w-4 stroke-[2px]" />
              <span className="hidden md:inline">Design System</span>
            </Button>

            <Button
              variant={mobileSimulator ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setMobileSimulator(!mobileSimulator)}
              className="gap-1.5 min-h-touch"
            >
              <Smartphone className="h-4 w-4 stroke-[2px]" />
              <span className="hidden sm:inline">360px</span>
            </Button>

            {session ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 min-h-touch"
                title={`Keluar (${session.user.email})`}
              >
                <LogOut className="h-4 w-4 stroke-[2px]" />
                <span className="hidden sm:inline">
                  Keluar ({session.user.role_label})
                </span>
              </Button>
            ) : (
              <Button
                variant={activeTab === 'login' ? 'industrial' : 'default'}
                size="sm"
                onClick={() => navigateToTab('login')}
                className="gap-1.5 min-h-touch"
              >
                <LogIn className="h-4 w-4 stroke-[2px]" />
                <span>Masuk</span>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Container (Supports 360px Mobile Viewport Simulation) */}
      <main
        className={
          mobileSimulator
            ? 'mx-auto w-[360px] max-w-full px-3 py-6 space-y-8 border-x-2 border-charcoal-border bg-carbon min-h-screen print:w-full print:border-0 print:p-0'
            : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10 print:max-w-none print:p-0'
        }
      >
        {/* TAB 1: B-07 Halaman Cetak QR per Mesin */}
        {activeTab === 'qr-print' && (
          <MachineQrPrintView
            machines={machines}
            selectedMachine={selectedPrintMachine}
            onSelectMachine={(m) => {
              setSelectedPrintMachine(m)
              setActiveQrToken(m.qr_token)
            }}
            onSimulateScan={(token, forceUnauth) =>
              handleScanQrToken(token, forceUnauth)
            }
            session={session}
            dataSource={dataSource}
          />
        )}

        {/* TAB 2: B-05 Login dengan penyimpanan tujuan Scan QR (B-07) */}
        {activeTab === 'login' && (
          <QrLoginRedirectView
            pendingRedirect={pendingRedirect}
            onLoginSuccess={handleLoginSuccess}
            onBackToQrPrint={() => navigateToTab('qr-print')}
          />
        )}

        {/* TAB 3: B-08 Form Lapor dengan Mesin Otomatis Terpilih dari QR (B-07) */}
        {activeTab === 'report' &&
          (session ? (
            <QrCaseReportFormView
              qrToken={activeQrToken ?? selectedPrintMachine.qr_token}
              session={session}
              machines={machines}
              onSelectQrToken={(nextToken) => handleScanQrToken(nextToken, false)}
              onBackToQrPrint={() => navigateToTab('qr-print')}
            />
          ) : (
            <QrLoginRedirectView
              pendingRedirect={pendingRedirect}
              onLoginSuccess={handleLoginSuccess}
              onBackToQrPrint={() => navigateToTab('qr-print')}
            />
          ))}

        {/* TAB 4: B-04 Design Tokens Showcase (Dipertahankan utuh) */}
        {activeTab === 'tokens' && (
          <div className="space-y-12">
            {/* Intro Hero Card */}
            <section className="rounded-card border border-charcoal-border bg-graphite p-6 shadow-subtle">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-industrial-orange border-industrial-orange/40"
                    >
                      Sprint 1 · Fondasi UI (B-04)
                    </Badge>
                    <span className="text-label text-steel-muted">
                      PIC: Sandy (UI/UX)
                    </span>
                  </div>
                  <h1 className="text-h1 font-bold text-off-white">
                    SafetyLog Design Tokens &amp; Primitives
                  </h1>
                  <p className="text-body text-steel-muted max-w-3xl">
                    Sistem token terpusat dengan filosofi{' '}
                    <span className="text-off-white font-medium">
                      Industrial Dark
                    </span>
                    . Mematuhi standar keselamatan K3 internasional (ISO 7010 /
                    ISO 3864 &amp; ANSI Z535), skala modular 4px, font Inter,
                    dan target sentuh minimal 44px ramah operasional pabrik.
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

            {/* 1. Foundation Colors & Surfaces */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-industrial-orange stroke-[2px]" />
                <h2 className="text-h2 font-semibold text-off-white">
                  1. Foundation Color Tokens
                </h2>
              </div>
              <p className="text-body text-steel-muted">
                Permukaan dark charcoal industrial memberikan hierarki visual
                yang kuat tanpa silau di lingkungan pabrik.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
                  <div className="h-12 w-full rounded-sm border border-charcoal-border bg-carbon" />
                  <div>
                    <div className="text-label font-bold text-off-white">
                      Carbon
                    </div>
                    <div className="font-mono text-caption text-steel-muted">
                      #111418
                    </div>
                    <div className="text-[10px] text-steel-muted/80">
                      Background Utama
                    </div>
                  </div>
                </div>

                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
                  <div className="h-12 w-full rounded-sm border border-charcoal-border bg-graphite" />
                  <div>
                    <div className="text-label font-bold text-off-white">
                      Graphite
                    </div>
                    <div className="font-mono text-caption text-steel-muted">
                      #1C2229
                    </div>
                    <div className="text-[10px] text-steel-muted/80">
                      Surface / Kartu
                    </div>
                  </div>
                </div>

                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
                  <div className="h-12 w-full rounded-sm border border-charcoal-border bg-elevated" />
                  <div>
                    <div className="text-label font-bold text-off-white">
                      Elevated
                    </div>
                    <div className="font-mono text-caption text-steel-muted">
                      #252D36
                    </div>
                    <div className="text-[10px] text-steel-muted/80">
                      Modal / Popover
                    </div>
                  </div>
                </div>

                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
                  <div className="h-12 w-full rounded-sm border border-charcoal-border bg-[#343D47]" />
                  <div>
                    <div className="text-label font-bold text-off-white">
                      Border
                    </div>
                    <div className="font-mono text-caption text-steel-muted">
                      #343D47
                    </div>
                    <div className="text-[10px] text-steel-muted/80">
                      Pemisah &amp; Garis
                    </div>
                  </div>
                </div>

                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
                  <div className="h-12 w-full rounded-sm border border-charcoal-border bg-off-white" />
                  <div>
                    <div className="text-label font-bold text-off-white">
                      Off-White
                    </div>
                    <div className="font-mono text-caption text-steel-muted">
                      #F4F5F6
                    </div>
                    <div className="text-[10px] text-steel-muted/80">
                      Teks Utama / Primer
                    </div>
                  </div>
                </div>

                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
                  <div className="h-12 w-full rounded-sm border border-charcoal-border bg-[#A3AAB3]" />
                  <div>
                    <div className="text-label font-bold text-off-white">
                      Muted Steel
                    </div>
                    <div className="font-mono text-caption text-steel-muted">
                      #A3AAB3
                    </div>
                    <div className="text-[10px] text-steel-muted/80">
                      Teks Sekunder / Ikon
                    </div>
                  </div>
                </div>

                <div className="rounded-input border border-charcoal-border bg-graphite p-3 space-y-2">
                  <div className="h-12 w-full rounded-sm border border-charcoal-border bg-industrial-orange" />
                  <div>
                    <div className="text-label font-bold text-off-white">
                      Industrial
                    </div>
                    <div className="font-mono text-caption text-steel-muted">
                      #F97316
                    </div>
                    <div className="text-[10px] text-steel-muted/80">
                      Aksen Utama K3
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. K3 Semantic Colors */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-industrial-orange stroke-[2px]" />
                <h2 className="text-h2 font-semibold text-off-white">
                  2. K3 Semantic Safety Tokens
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-card border border-safety-danger-border bg-graphite p-4 space-y-3">
                  <div className="text-h4 font-bold text-safety-danger">
                    DANGER / MERAH
                  </div>
                  <RiskBadge level="Tinggi" score={20} />
                </div>
                <div className="rounded-card border border-safety-warning-border bg-graphite p-4 space-y-3">
                  <div className="text-h4 font-bold text-safety-warning">
                    WARNING / ORANYE
                  </div>
                  <RiskBadge level="Sedang" score={12} />
                </div>
                <div className="rounded-card border border-safety-caution-border bg-graphite p-4 space-y-3">
                  <div className="text-h4 font-bold text-safety-caution">
                    CAUTION / KUNING
                  </div>
                  <RiskBadge level="Rendah" score={4} />
                </div>
                <div className="rounded-card border border-safety-info-border bg-graphite p-4 space-y-3">
                  <div className="text-h4 font-bold text-safety-info">
                    INFO / BIRU
                  </div>
                  <CaseStatusBadge status="Baru" />
                </div>
                <div className="rounded-card border border-safety-safe-border bg-graphite p-4 space-y-3">
                  <div className="text-h4 font-bold text-safety-safe">
                    SAFE / HIJAU
                  </div>
                  <CaseStatusBadge status="Selesai" />
                </div>
              </div>
            </section>

            {/* 3. Typography & 4. Components */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-industrial-orange stroke-[2px]" />
                <h2 className="text-h2 font-semibold text-off-white">
                  3. Typography &amp; Reusable Primitives
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="space-y-4">
                  <CardHeader>
                    <CardTitle className="text-h4">
                      Tombol (Button Primitives)
                    </CardTitle>
                    <CardDescription>
                      Target sentuh minimal 44px ramah sarung tangan operator.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Button variant="default">Primary Action</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="industrial" className="gap-2">
                        <Plus className="h-4 w-4 stroke-[2px]" /> Tambah Kasus
                      </Button>
                      <Button size="icon" aria-label="Search">
                        <Search className="h-4 w-4 stroke-[2px]" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="space-y-4">
                  <CardHeader>
                    <CardTitle className="text-h4 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                      Input &amp; Status Badges
                    </CardTitle>
                    <CardDescription>
                      Mendukung seluruh status alur kasus SafetyLog.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input defaultValue="MCH-CONV-01" className="font-mono tabular-nums" />
                    <div className="flex flex-wrap gap-2">
                      <CaseStatusBadge status="Baru" />
                      <CaseStatusBadge status="Dinilai" />
                      <CaseStatusBadge status="Tindakan berjalan" />
                      <CaseStatusBadge status="Menunggu verifikasi" />
                      <CaseStatusBadge status="Selesai" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
