import * as React from 'react'
import {
  QrCode,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  RefreshCw,
  Send,
  MapPin,
  Cpu,
  Info,
  Camera,
  FileText,
  UserCheck,
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
import { CaseStatusBadge, RiskBadge, type CaseStatus, type RiskLevel } from '@/components/ui/risk-badge'
import {
  type AuthSession,
  type MachineRecord,
  type QrLookupResult,
  type PendingQrRedirect,
  DEMO_USERS,
  DEFAULT_CASE_TYPES,
  loginWithApiOrDemo,
  lookupReportFormMachine,
  submitCaseReport,
  getUserPermissions,
  buildQrReportPath,
} from '@/lib/qr-flow'

export interface QrLoginRedirectViewProps {
  pendingRedirect: PendingQrRedirect | null
  onLoginSuccess: (session: AuthSession) => void
}

export function QrLoginRedirectView({
  pendingRedirect,
  onLoginSuccess,
}: QrLoginRedirectViewProps) {
  const [email, setEmail] = React.useState('pelapor@safetylog.test')
  const [password, setPassword] = React.useState('password123')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await loginWithApiOrDemo(email, password)
      onLoginSuccess(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
    setLoading(true)
    try {
      const session = await loginWithApiOrDemo(demoEmail, demoPassword)
      onLoginSuccess(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Saved QR Scan Destination Banner */}
      {pendingRedirect && (
        <div
          className="rounded-card border border-safety-info-border bg-safety-info-bg p-4 text-safety-info-foreground space-y-1.5"
          role="status"
        >
          <div className="flex items-center gap-2 font-semibold text-body">
            <QrCode className="h-5 w-5 shrink-0 text-safety-info stroke-[2px]" />
            <span>Tujuan Scan QR Mesin Tersimpan</span>
          </div>
          <p className="text-caption leading-relaxed">
            Anda baru saja memindai QR mesin. Silakan masuk terlebih dahulu, lalu Anda akan{' '}
            <span className="font-semibold underline">otomatis diarahkan kembali</span> ke Form Lapor dengan mesin otomatis terpilih.
          </p>
          <div className="rounded-sm border border-safety-info-border bg-carbon/80 px-2.5 py-1.5 font-mono text-caption text-off-white tabular-nums break-all">
            Redirect: {pendingRedirect.redirectPath}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-industrial-orange border-industrial-orange/40">
              Autentikasi B-05 · Redirect B-07
            </Badge>
            <Lock className="h-4 w-4 text-steel-muted stroke-[2px]" />
          </div>
          <CardTitle className="text-h2 font-bold text-off-white">
            Masuk ke SafetyLog
          </CardTitle>
          <CardDescription>
            Sesi login Anda akan disimpan agar tidak perlu masuk ulang setiap kali melapor via QR.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div
              className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground flex items-start gap-2"
              role="alert"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-safety-danger stroke-[2px] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-label text-off-white block">
                Alamat Email Kerja
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pelapor@safetylog.test"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-label text-off-white block">
                Kata Sandi
              </label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full gap-2"
              disabled={loading}
            >
              <UserCheck className="h-4 w-4 stroke-[2px]" />
              {loading
                ? 'Memverifikasi Sesi...'
                : pendingRedirect
                  ? 'Masuk & Lanjut ke Form Lapor QR'
                  : 'Masuk'}
            </Button>
          </form>

          {/* 1-Tap Quick Demo Account Selector (4 Roles) */}
          <div className="border-t border-charcoal-border pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold uppercase tracking-wider text-steel-muted">
                Masuk Cepat Akun Demo (1 Sentuh)
              </span>
              <span className="font-mono text-caption text-steel-muted">
                password123
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => (
                <Button
                  key={u.email}
                  type="button"
                  variant="secondary"
                  onClick={() => handleQuickDemoLogin(u.email, u.password)}
                  disabled={loading}
                  className="justify-start text-left h-auto py-2.5 px-3"
                >
                  <div className="truncate">
                    <div className="text-label font-bold text-off-white truncate">
                      {u.role_label}
                    </div>
                    <div className="font-mono text-[11px] text-steel-muted truncate">
                      {u.email}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-input border border-charcoal-border bg-carbon px-3 py-2 text-caption text-steel-muted">
            Setelah masuk, menu akan menyesuaikan hak akses peran Anda (Pelapor, Supervisor, K3 / Verifikator, atau Manajer / Admin).
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export interface QrCaseReportFormViewProps {
  qrToken: string | null
  selectedMachineId: number | null
  session: AuthSession
  machines: MachineRecord[]
  onSelectMachine: (machine: MachineRecord) => void
  onBackToQrPrint?: () => void
  onViewMyCases?: () => void
}

const CURRENT_REPORT_YEAR = new Date().getFullYear()

export function QrCaseReportFormView({
  qrToken,
  selectedMachineId,
  session,
  machines,
  onSelectMachine,
  onBackToQrPrint,
  onViewMyCases,
}: QrCaseReportFormViewProps) {
  const [lookupResult, setLookupResult] = React.useState<QrLookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = React.useState<boolean>(false)
  const [lookupError, setLookupError] = React.useState<string | null>(null)
  const [showManualPicker, setShowManualPicker] = React.useState<boolean>(false)

  const [selectedCaseTypeId, setSelectedCaseTypeId] = React.useState<number>(1)
  const [description, setDescription] = React.useState<string>('')
  const [isMachineStopped, setIsMachineStopped] = React.useState<boolean>(false)
  const [hasAffectedPeople, setHasAffectedPeople] = React.useState<boolean>(false)
  const [photos, setPhotos] = React.useState<File[]>([])
  const formStartedAtRef = React.useRef<number>(0)

  const [submitting, setSubmitting] = React.useState<boolean>(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submittedCase, setSubmittedCase] = React.useState<{
    caseNumber: string
    machineCode: string
    machineName: string
    caseTypeName: string
    emergencyReminder: string | null
  } | null>(null)

  const canPrintQr = getUserPermissions(session.user).print_machine_qr
  const isFromQrScan = Boolean(qrToken)

  React.useEffect(() => {
    let active = true
    const cleanQr = qrToken?.trim() || null
    const fallbackMachineId = selectedMachineId ?? machines[0]?.id ?? null

    Promise.resolve()
      .then(() => {
        if (!active) return null
        if (!cleanQr && !fallbackMachineId) {
          throw new Error('Pilih mesin atau scan kode QR mesin terlebih dahulu.')
        }
        setLookupLoading(true)
        setLookupError(null)
        setSubmittedCase(null)
        formStartedAtRef.current = Date.now()
        return lookupReportFormMachine(
          { qrToken: cleanQr, machineId: fallbackMachineId },
          session,
          machines
        )
      })
      .then((res) => {
        if (!active || !res) return
        setLookupResult(res)
        if (res.case_types.length > 0) {
          setSelectedCaseTypeId(res.case_types[0].id)
        }
      })
      .catch((err) => {
        if (!active) return
        setLookupResult(null)
        setLookupError(
          err instanceof Error ? err.message : 'Kode QR mesin tidak ditemukan.'
        )
      })
      .finally(() => {
        if (active) setLookupLoading(false)
      })

    return () => {
      active = false
    }
  }, [qrToken, selectedMachineId, session, machines])

  const caseTypes = lookupResult?.case_types ?? DEFAULT_CASE_TYPES
  const activeCaseType =
    caseTypes.find((ct) => ct.id === selectedCaseTypeId) ?? caseTypes[0]
  const showEmergencyReminder =
    Boolean(activeCaseType?.is_incident) && hasAffectedPeople

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lookupResult?.machine) return

    const trimmedDesc = description.trim()
    if (trimmedDesc.length < 5) {
      setSubmitError('Mohon isi deskripsi kondisi atau masalah minimal 5 karakter.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    const machine = lookupResult.machine
    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - formStartedAtRef.current) / 1000)
    )

    try {
      const result = await submitCaseReport(session, {
        machine,
        caseTypeId: selectedCaseTypeId,
        caseTypeName: activeCaseType?.name ?? 'Laporan',
        description: trimmedDesc,
        isMachineStopped,
        hasAffectedPeople,
        qrToken: qrToken?.trim() || null,
        photos,
        reportDurationSeconds: elapsedSeconds,
        showEmergencyFallback: showEmergencyReminder,
      })
      setSubmittedCase(result)
      setDescription('')
      setPhotos([])
      formStartedAtRef.current = Date.now()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal mengirim laporan ke server.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {canPrintQr && onBackToQrPrint && (
            <Button
              type="button"
              variant="outline"
              onClick={onBackToQrPrint}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2px]" />
              Halaman Cetak QR
            </Button>
          )}
          {onViewMyCases && (
            <Button
              type="button"
              variant="outline"
              onClick={onViewMyCases}
              className="gap-2"
            >
              <FileText className="h-4 w-4 stroke-[2px]" />
              Laporan Saya
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="safe">
            Login Aktif: {session.user.name} ({session.user.role_label})
          </Badge>
        </div>
      </div>

      {/* Loading State */}
      {lookupLoading && (
        <Card className="p-6 text-center space-y-2">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-industrial-orange stroke-[2px]" />
          <div className="text-body font-medium text-off-white">
            Memuat detail mesin...
          </div>
          {qrToken && (
            <div className="font-mono text-caption text-steel-muted tabular-nums">
              GET /api/machines/qr/{qrToken}
            </div>
          )}
        </Card>
      )}

      {/* Error State (Invalid QR / Numeric ID / Archived / Cross-Tenant) */}
      {lookupError && !lookupLoading && (
        <Card className="border-safety-danger-border bg-graphite p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-safety-danger stroke-[2px] mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-h4 font-bold text-safety-danger-foreground">
                Gagal Memuat Mesin dari Kode QR
              </h3>
              <p className="text-body text-steel-muted">{lookupError}</p>
              {qrToken && (
                <div className="font-mono text-caption text-steel-muted tabular-nums pt-1">
                  Parameter diterima: qr={qrToken}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 border-t border-charcoal-border pt-3">
            <div className="text-label text-off-white">
              Pilih mesin aktif secara manual:
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {machines.slice(0, 6).map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant="secondary"
                  onClick={() => onSelectMachine(m)}
                  className="justify-start font-mono text-xs"
                >
                  {m.code} - {m.name}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Form Lapor with Auto-Selected or Manual Machine */}
      {lookupResult && !lookupLoading && (
        <>
          {/* Selected Machine Banner */}
          <Card
            className="border-industrial-orange/60 bg-graphite"
            data-testid="selected-qr-machine-card"
          >
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="safe" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 stroke-[2px]" />
                    {isFromQrScan ? 'Terpilih Otomatis via Scan QR' : 'Mesin Siap Dilaporkan'}
                  </Badge>
                  {isFromQrScan && lookupResult.machine.qr_token && (
                    <span className="font-mono text-caption text-steel-muted tabular-nums">
                      {buildQrReportPath(lookupResult.machine.qr_token)}
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualPicker(!showManualPicker)}
                  className="text-xs"
                >
                  {showManualPicker ? 'Tutup Pilihan' : 'Ganti Mesin'}
                </Button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-sm border border-charcoal-border bg-carbon px-2 py-0.5 font-mono text-label font-bold text-industrial-orange tabular-nums">
                    {lookupResult.machine.code}
                  </span>
                  <span className="text-h3 font-bold text-off-white">
                    {lookupResult.machine.name}
                  </span>
                </div>
                {lookupResult.machine.description && (
                  <p className="text-body text-steel-muted">
                    {lookupResult.machine.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                <div className="flex items-center gap-2 rounded-sm border border-charcoal-border bg-carbon px-3 py-2 text-caption">
                  <MapPin className="h-4 w-4 shrink-0 text-industrial-orange stroke-[2px]" />
                  <div>
                    <span className="text-steel-muted block">Area Produksi</span>
                    <span className="font-semibold text-off-white">
                      {lookupResult.machine.area.name} ({lookupResult.machine.area.code})
                    </span>
                    {lookupResult.machine.area.pic_user && (
                      <span className="text-[11px] text-steel-muted block">
                        PIC Area: {lookupResult.machine.area.pic_user.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-sm border border-charcoal-border bg-carbon px-3 py-2 text-caption">
                  <Cpu className="h-4 w-4 shrink-0 text-industrial-orange stroke-[2px]" />
                  <div>
                    <span className="text-steel-muted block">Lokasi Pabrik</span>
                    <span className="font-semibold text-off-white">
                      {lookupResult.machine.site.name} ({lookupResult.machine.site.code})
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Manual Machine Switcher */}
              {showManualPicker && (
                <div className="border-t border-charcoal-border pt-3 space-y-2">
                  <label className="text-label text-off-white block">
                    Pilih Mesin Lain:
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {machines.map((m) => (
                      <Button
                        key={m.id}
                        type="button"
                        variant={
                          m.id === lookupResult.machine.id
                            ? 'industrial'
                            : 'secondary'
                        }
                        onClick={() => {
                          onSelectMachine(m)
                          setShowManualPicker(false)
                        }}
                        className="justify-between text-left"
                      >
                        <span className="truncate">{m.name}</span>
                        <span className="font-mono text-xs tabular-nums ml-2">
                          {m.code}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Cases Warning (B-10 integration with QR Lookup) */}
          {lookupResult.open_cases_warning.has_open_cases && (
            <div
              className="rounded-card border border-safety-warning-border bg-safety-warning-bg p-4 text-safety-warning-foreground space-y-2"
              role="region"
              aria-label="Peringatan kasus terbuka"
            >
              <div className="flex items-center gap-2 font-semibold text-body">
                <AlertTriangle className="h-5 w-5 shrink-0 text-safety-warning stroke-[2px]" />
                <span>
                  Perhatian: Ada {lookupResult.open_cases_warning.count} Kasus Belum Selesai ({lookupResult.open_cases_warning.window_days} Hari Terakhir)
                </span>
              </div>
              <p className="text-caption">
                Periksa apakah masalah yang ingin Anda laporkan sudah tercatat di bawah ini. Anda tetap boleh melanjutkan pengiriman laporan baru.
              </p>
              <div className="space-y-2 pt-1">
                {lookupResult.open_cases_warning.cases.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-sm border border-charcoal-border bg-carbon/90 p-2.5 text-off-white space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-caption font-bold text-industrial-orange tabular-nums">
                        {c.case_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {c.risk_label && (
                          <RiskBadge
                            level={c.risk_label as RiskLevel}
                            score={c.risk_score ?? undefined}
                          />
                        )}
                        <CaseStatusBadge status={(c.status_label || 'Baru') as CaseStatus} />
                      </div>
                    </div>
                    <p className="text-caption text-steel-muted">
                      {c.description_excerpt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case Submitted Confirmation */}
          {submittedCase && (
            <Card className="border-safety-safe-border bg-graphite p-5 space-y-3">
              <div className="flex items-center gap-2 text-safety-safe-foreground font-bold text-h4">
                <CheckCircle2 className="h-6 w-6 text-safety-safe stroke-[2px]" />
                <span>Laporan Berhasil Dikirim</span>
              </div>
              <div className="rounded-sm border border-charcoal-border bg-carbon p-3 space-y-1">
                <div className="text-caption text-steel-muted">Nomor Kasus Otomatis:</div>
                <div className="font-mono text-h3 font-bold text-off-white tabular-nums">
                  {submittedCase.caseNumber}
                </div>
                <div className="text-caption text-industrial-orange">
                  {submittedCase.machineCode} - {submittedCase.machineName} ({submittedCase.caseTypeName})
                </div>
              </div>
              {submittedCase.emergencyReminder && (
                <div className="rounded-sm border border-safety-danger-border bg-safety-danger-bg p-3 text-caption text-safety-danger-foreground font-medium">
                  {submittedCase.emergencyReminder}
                </div>
              )}
              {onViewMyCases && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onViewMyCases}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4 stroke-[2px]" />
                    Lihat di Laporan Saya
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Fast 3-Field Report Form (B-08 Target <= 60 seconds) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="info">Form Lapor Cepat (B-08)</Badge>
                <span className="font-mono text-caption text-steel-muted tabular-nums">
                  Target &le; 60 detik
                </span>
              </div>
              <CardTitle className="text-h3 font-bold text-off-white">
                Laporkan Kondisi Mesin / K3
              </CardTitle>
              <CardDescription>
                Cukup isi 3 hal wajib: mesin, jenis kasus, dan deskripsi singkat.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmitReport} className="space-y-4">
                {submitError && (
                  <div
                    role="alert"
                    className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground"
                  >
                    {submitError}
                  </div>
                )}

                {/* Field 1: Mesin */}
                <div className="space-y-1.5">
                  <label className="text-label text-off-white block">
                    1. Mesin Terpilih *
                  </label>
                  <Input
                    readOnly
                    value={`${lookupResult.machine.code} - ${lookupResult.machine.name} (${lookupResult.machine.area.name})`}
                    className="font-mono tabular-nums bg-carbon text-off-white"
                    aria-label="Mesin terpilih"
                  />
                </div>

                {/* Field 2: Jenis Kasus (44px touch buttons) */}
                <div className="space-y-2">
                  <label className="text-label text-off-white block">
                    2. Jenis Kasus *
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {caseTypes.map((ct) => {
                      const active = ct.id === selectedCaseTypeId
                      return (
                        <Button
                          key={ct.id}
                          type="button"
                          variant={active ? 'industrial' : 'secondary'}
                          onClick={() => setSelectedCaseTypeId(ct.id)}
                          className="justify-start text-left"
                        >
                          <span className="truncate">{ct.name}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Quick Questions: Mesin berhenti? Ada orang terdampak? */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-input border border-charcoal-border bg-carbon p-3 space-y-2">
                    <span className="text-label text-off-white block">
                      Apakah mesin berhenti?
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={isMachineStopped ? 'destructive' : 'outline'}
                        onClick={() => setIsMachineStopped(true)}
                      >
                        Ya, Berhenti
                      </Button>
                      <Button
                        type="button"
                        variant={!isMachineStopped ? 'secondary' : 'outline'}
                        onClick={() => setIsMachineStopped(false)}
                      >
                        Tidak
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-input border border-charcoal-border bg-carbon p-3 space-y-2">
                    <span className="text-label text-off-white block">
                      Ada orang terdampak?
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={hasAffectedPeople ? 'destructive' : 'outline'}
                        onClick={() => setHasAffectedPeople(true)}
                      >
                        Ada
                      </Button>
                      <Button
                        type="button"
                        variant={!hasAffectedPeople ? 'secondary' : 'outline'}
                        onClick={() => setHasAffectedPeople(false)}
                      >
                        Tidak Ada
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Product Rule #8: Emergency Procedure Reminder for Incident + Affected People */}
                {showEmergencyReminder && (
                  <div
                    className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3.5 text-safety-danger-foreground space-y-1"
                    role="alert"
                  >
                    <div className="flex items-center gap-2 font-bold text-body">
                      <ShieldAlert className="h-5 w-5 shrink-0 text-safety-danger stroke-[2px]" />
                      <span>Pengingat Prosedur Darurat K3</span>
                    </div>
                    <p className="text-caption leading-relaxed">
                      Utamakan keselamatan jiwa dan ikuti prosedur darurat perusahaan (P3K / evakuasi) terlebih dahulu. SafetyLog bukan pengganti pelaporan darurat resmi.
                    </p>
                  </div>
                )}

                {/* Field 3: Deskripsi Masalah */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="report-description"
                    className="text-label text-off-white block"
                  >
                    3. Deskripsi Kondisi / Masalah *
                  </label>
                  <textarea
                    id="report-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: Pelindung samping konveyor bergetar dan terdengar bunyi gesekan pada bearing kanan..."
                    required
                    className="flex w-full rounded-input border border-charcoal-border bg-[#151A20] px-3.5 py-2.5 text-body text-off-white placeholder:text-[#6F7782] focus-visible:outline-none focus-visible:border-industrial-orange focus-visible:ring-1 focus-visible:ring-industrial-orange"
                  />
                </div>

                {/* Optional Proof Photos */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="report-photos"
                    className="text-label text-off-white flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                    <span>Foto Kondisi / Bukti (Opsional, maks. 5 file)</span>
                  </label>
                  <input
                    id="report-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setPhotos(Array.from(e.target.files ?? []).slice(0, 5))
                    }
                    className="block w-full rounded-input border border-charcoal-border bg-carbon px-3 py-2.5 text-caption text-steel-muted file:mr-3 file:rounded-sm file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-label file:text-off-white"
                  />
                  {photos.length > 0 && (
                    <div className="text-caption text-industrial-orange">
                      {photos.length} foto siap diunggah:{' '}
                      {photos.map((p) => p.name).join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-sm border border-charcoal-border bg-carbon p-2.5 text-caption text-steel-muted">
                  <Info className="h-4 w-4 shrink-0 text-industrial-orange stroke-[2px]" />
                  <span>
                    Laporan otomatis mendapatkan nomor unik format{' '}
                    <code className="font-mono text-off-white tabular-nums">
                      SL-{lookupResult.machine.site.code}-{CURRENT_REPORT_YEAR}-XXXX
                    </code>
                    .
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={submitting}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4 stroke-[2px]" />
                  {submitting ? 'Mengirim Laporan...' : 'Kirim Laporan Sekarang'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
