import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ImagePlus,
  ListFilter,
  QrCode,
  X,
} from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { compressImageFile } from '@/lib/image-compress'
import { useReferenceData } from '@/lib/reference'
import { QrScannerStage } from '@/components/safety/QrScannerStage'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import type {
  AiEnvelope,
  AiTriageSuggestion,
  Machine,
  SafetyCase,
  SafetyCaseSummary,
} from '@/types/safetylog'

const QUICK_SYMPTOMS = [
  'Suara / getaran abnormal',
  'Motor panas / bau terbakar',
  'Belt / rantai kendor',
  'Kebocoran oli / cairan',
  'Pelindung / sensor lepas',
  'Lantai sekitar licin',
]

interface PhotoEntry {
  file: File
  url: string
}

export function ReportCasePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qrToken = searchParams.get('qr')
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()

  const qrQuery = useQuery({
    queryKey: ['machine-qr', qrToken],
    queryFn: () =>
      apiFetch<{
        machine?: Machine
        data?: Machine
        case_types?: Array<{ id: number; code: string; name: string; is_incident: boolean }>
        open_cases_warning?: { has_open_cases: boolean; count: number; cases: SafetyCaseSummary[] }
      }>(`/machines/qr/${encodeURIComponent(qrToken!)}`),
    enabled: Boolean(qrToken),
    retry: false,
  })

  const [showManualPicker, setShowManualPicker] = React.useState(false)
  const [manualSearch, setManualSearch] = React.useState('')

  const machinesQuery = useQuery({
    queryKey: ['machines', 'manual-report-picker'],
    queryFn: () => apiFetch<{ data: Machine[] }>('/machines'),
    enabled: showManualPicker,
  })

  const machine = qrQuery.data?.machine ?? qrQuery.data?.data ?? null
  const [caseTypeId, setCaseTypeId] = React.useState<string>('')
  const [description, setDescription] = React.useState('')
  const [isMachineStopped, setIsMachineStopped] = React.useState(false)
  const [hasAffectedPeople, setHasAffectedPeople] = React.useState(false)
  const [photoEntries, setPhotoEntries] = React.useState<PhotoEntry[]>([])
  const [photoError, setPhotoError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [showAllOpenCases, setShowAllOpenCases] = React.useState(false)
  const [summaryCaseId, setSummaryCaseId] = React.useState<number | null>(null)
  const [createdResult, setCreatedResult] = React.useState<{
    caseData: SafetyCase
    emergencyReminder: string | null
  } | null>(null)
  const [aiTriageState, setAiTriageState] = React.useState<{
    key: string
    data: AiTriageSuggestion | null
    error: string | null
  }>({ key: '', data: null, error: null })
  const [copiedCaseNumber, setCopiedCaseNumber] = React.useState(false)
  const copyTimerRef = React.useRef<number | null>(null)
  const photoEntriesRef = React.useRef<PhotoEntry[]>([])

  React.useEffect(() => {
    photoEntriesRef.current = photoEntries
  }, [photoEntries])

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
      photoEntriesRef.current.forEach((entry) => URL.revokeObjectURL(entry.url))
    }
  }, [])

  const summaryQuery = useQuery({
    queryKey: ['case-summary', summaryCaseId],
    queryFn: () => apiFetch<{ data: SafetyCaseSummary }>(`/cases/${summaryCaseId}/summary`),
    enabled: Boolean(summaryCaseId),
  })

  const handleCopyCaseNumber = async (caseNumber: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(caseNumber)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = caseNumber
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedCaseNumber(true)
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedCaseNumber(false), 2000)
    } catch {
      setCopiedCaseNumber(false)
    }
  }

  const caseTypes = React.useMemo(
    () => refQuery.data?.case_types ?? qrQuery.data?.case_types ?? [],
    [refQuery.data?.case_types, qrQuery.data?.case_types],
  )

  const effectiveCaseTypeId = caseTypeId || (caseTypes.length > 0 ? String(caseTypes[0].id) : '')
  const selectedCaseType = caseTypes.find((ct) => String(ct.id) === effectiveCaseTypeId)
  const showEmergencyReminder = Boolean(selectedCaseType?.is_incident && hasAffectedPeople)
  const openCases = qrQuery.data?.open_cases_warning?.cases ?? []
  const currentTriageKey = `${machine?.id ?? ''}:${effectiveCaseTypeId}:${description.trim()}`
  const aiTriage = aiTriageState.key === currentTriageKey ? aiTriageState.data : null
  const aiTriageError = aiTriageState.key === currentTriageKey ? aiTriageState.error : null

  const triageSuggestion = useMutation({
    mutationFn: () =>
      apiFetch<AiEnvelope<AiTriageSuggestion>>('/ai/triage-suggestion', {
        method: 'POST',
        json: {
          description: description.trim(),
          case_type_id: effectiveCaseTypeId ? Number(effectiveCaseTypeId) : null,
          machine_id: machine?.id ?? null,
          is_machine_stopped: isMachineStopped,
          has_affected_people: hasAffectedPeople,
        },
      }),
    onSuccess: (response) => {
      setAiTriageState({ key: currentTriageKey, data: response.data, error: null })
    },
    onError: (error) => {
      setAiTriageState({
        key: currentTriageKey,
        data: null,
        error: error instanceof ApiError ? error.message : 'Gagal meminta saran triase AI.',
      })
    },
  })

  const handleQrDetected = React.useCallback(
    (token: string) => {
      setShowManualPicker(false)
      setSearchParams({ qr: token }, { replace: true })
    },
    [setSearchParams],
  )

  const handleRescan = () => {
    setSearchParams({}, { replace: true })
    setSubmitError(null)
    setShowAllOpenCases(false)
  }

  const appendSymptom = (symptom: string) => {
    setDescription((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return `${symptom}.`
      if (trimmed.toLowerCase().includes(symptom.toLowerCase())) return prev
      return `${trimmed} ${symptom}.`
    })
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null)
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const remaining = Math.max(0, 5 - photoEntries.length)
    if (remaining === 0) {
      e.target.value = ''
      return
    }

    try {
      const compressed = await Promise.all(files.slice(0, remaining).map(compressImageFile))
      const nextEntries = compressed.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }))
      setPhotoEntries((prev) => [...prev, ...nextEntries].slice(0, 5))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal memproses foto.')
    }
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotoEntries((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const clearPhotos = () => {
    photoEntries.forEach((entry) => URL.revokeObjectURL(entry.url))
    setPhotoEntries([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!machine || !effectiveCaseTypeId || !description.trim()) {
      setSubmitError('Harap pilih jenis temuan dan isi deskripsi singkat.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('machine_id', String(machine.id))
      formData.append('case_type_id', effectiveCaseTypeId)
      formData.append('description', description.trim())
      formData.append('is_machine_stopped', isMachineStopped ? '1' : '0')
      formData.append('has_affected_people', hasAffectedPeople ? '1' : '0')
      photoEntries.forEach((entry) => formData.append('photos[]', entry.file))

      const res = await apiFetch<{
        data: SafetyCase
        emergency_reminder: string | null
      }>('/cases', {
        method: 'POST',
        body: formData,
      })

      setCreatedResult({
        caseData: res.data,
        emergencyReminder: res.emergency_reminder,
      })
      void queryClient.invalidateQueries({ queryKey: ['my-cases'] })
      void queryClient.invalidateQueries({ queryKey: ['cases'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message)
      } else {
        setSubmitError('Gagal mengirim laporan. Periksa koneksi Anda.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Stage 3: Report Submitted Success
  if (createdResult) {
    return (
      <div className="mx-auto max-w-[540px] space-y-5">
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-[var(--safety-safe-foreground)] shrink-0" />
            <div>
              <h1 className="text-[20px] font-semibold text-[var(--text)]">
                Laporan Berhasil Dikirim
              </h1>
              <p className="text-[13px] text-[var(--muted)]">
                Supervisor segera menerima notifikasi untuk penilaian risiko.
              </p>
            </div>
          </div>

          {createdResult.emergencyReminder && (
            <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-4 text-[14px] text-[var(--safety-danger-foreground)]">
              {createdResult.emergencyReminder}
            </div>
          )}

          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--raised)] p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-[12px] text-[var(--faint)]">Nomor Kasus Resmi</div>
                <div className="font-mono text-[20px] sm:text-[22px] font-semibold text-[var(--text)] tabular-nums break-all">
                  {createdResult.caseData.case_number}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyCaseNumber(createdResult.caseData.case_number)}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--ground)] transition-colors"
                aria-label="Salin nomor kasus"
              >
                {copiedCaseNumber ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--safety-safe-foreground)]" />
                    <span className="text-[var(--safety-safe-foreground)]">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-[var(--muted)]" />
                    <span>Salin Nomor</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[13px] text-[var(--muted)]">
              {createdResult.caseData.machine?.code} — {createdResult.caseData.machine?.name}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={`/cases/${createdResult.caseData.id}`}
              className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[15px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] sm:h-11 sm:min-h-[44px] sm:flex-1 sm:text-[14px]"
            >
              Lihat Detail Kasus
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedResult(null)
                setDescription('')
                clearPhotos()
                setIsMachineStopped(false)
                setHasAffectedPeople(false)
                setSearchParams({}, { replace: true })
              }}
              className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-4 text-[15px] font-medium text-[var(--text)] hover:bg-[var(--raised)] sm:h-11 sm:min-h-[44px] sm:flex-1 sm:text-[14px]"
            >
              Pindai Mesin Lain
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Stage 1: Direct Live Camera QR Scanner + Manual Machine Fallback
  if (!qrToken || qrQuery.isError || !machine) {
    const scanError = qrQuery.isError
      ? qrQuery.error instanceof ApiError
        ? qrQuery.error.message
        : 'Kode QR tidak dikenali atau mesin sudah diarsipkan. Pindai ulang atau pilih mesin secara manual.'
      : null

    const filteredMachines = (machinesQuery.data?.data ?? []).filter((m) => {
      const needle = manualSearch.trim().toLowerCase()
      if (!needle) return true
      return (
        m.code.toLowerCase().includes(needle) ||
        m.name.toLowerCase().includes(needle) ||
        (m.area?.name.toLowerCase().includes(needle) ?? false)
      )
    })

    return (
      <div className="space-y-4">
        <QrScannerStage
          onDetected={handleQrDetected}
          isResolving={Boolean(qrToken) && qrQuery.isLoading}
          errorMessage={scanError}
        />

        <div className="mx-auto max-w-[540px] space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] text-[var(--muted)]">
              Stiker QR rusak atau tidak terbaca?
            </span>
            <button
              type="button"
              onClick={() => setShowManualPicker((v) => !v)}
              className="inline-flex h-11 items-center gap-1.5 rounded-[6px] px-2 text-[13px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>{showManualPicker ? 'Tutup Daftar' : 'Pilih Mesin Manual'}</span>
            </button>
          </div>

          {showManualPicker && (
            <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2.5">
              <input
                type="search"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Cari kode, nama mesin, atau area..."
                className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
              />
              <div className="max-h-64 overflow-y-auto divide-y divide-[var(--rule)] rounded-[6px] border border-[var(--border)] bg-[var(--ground)]">
                {machinesQuery.isLoading ? (
                  <div className="p-4 text-[13px] text-[var(--faint)]">Memuat daftar mesin...</div>
                ) : filteredMachines.length === 0 ? (
                  <div className="p-4 text-[13px] text-[var(--faint)]">
                    Tidak ada mesin aktif yang cocok.
                  </div>
                ) : (
                  filteredMachines.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleQrDetected(m.qr_token)}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[var(--raised)] cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] font-semibold text-[var(--accent)]">
                            {m.code}
                          </span>
                          {m.area && (
                            <span className="truncate text-[12px] text-[var(--faint)]">
                              · {m.area.name}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[14px] font-medium text-[var(--text)]">
                          {m.name}
                        </div>
                      </div>
                      <span className="shrink-0 text-[12px] font-medium text-[var(--muted)]">
                        Pilih →
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Stage 2: Ultra-Practical Single-Card Report Form
  const visibleOpenCases = showAllOpenCases ? openCases : openCases.slice(0, 2)

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      {/* Compact Resolved Machine Header Strip */}
      <div className="flex flex-col gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <QrCode className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] font-semibold text-[var(--accent)]">
                {machine.code}
              </span>
              {machine.area && (
                <span className="truncate text-[12px] text-[var(--faint)]">
                  · {machine.area.name}
                </span>
              )}
            </div>
            <h1 className="truncate text-[18px] font-semibold text-[var(--text)]">
              {machine.name}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRescan}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)]"
        >
          <QrCode className="h-4 w-4" />
          <span>Pindai Ulang</span>
        </button>
      </div>

      {/* B-10 Open Cases Warning */}
      {openCases.length > 0 && (
        <div
          role="status"
          className="rounded-[8px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-3.5 space-y-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--safety-warning-foreground)] mt-0.5" />
            <div className="text-[13px] font-medium text-[var(--safety-warning-foreground)]">
              Ada {openCases.length} kasus terbuka pada mesin ini. Tetap bisa lanjut melapor bila
              temuan berbeda.
            </div>
          </div>
          <div className="space-y-1.5">
            {visibleOpenCases.map((oc) => (
              <button
                key={oc.id}
                type="button"
                onClick={() => setSummaryCaseId(oc.id)}
                className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[12px] text-[var(--text)] hover:bg-[var(--raised)]"
              >
                <span className="truncate">
                  <strong className="font-mono text-[var(--accent)]">{oc.case_number}</strong> ·{' '}
                  {oc.short_description}
                </span>
                <span className="shrink-0 text-[var(--faint)]">{oc.status_label}</span>
              </button>
            ))}
          </div>
          {openCases.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAllOpenCases((v) => !v)}
              className="text-[12px] font-medium text-[var(--safety-warning-foreground)] hover:underline"
            >
              {showAllOpenCases
                ? 'Sembunyikan sebagian'
                : `Lihat semua (${openCases.length} kasus terbuka)`}
            </button>
          )}
        </div>
      )}

      {/* Rule #8 Emergency Reminder */}
      {showEmergencyReminder && (
        <div
          role="alert"
          className="rounded-[8px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]"
        >
          <strong>Prosedur Darurat:</strong>{' '}
          {String(
            refQuery.data?.configurations?.emergency_reminder_text ||
              'Segera ikuti prosedur tanggap darurat perusahaan dan hubungi petugas P3K/K3 terlebih dahulu.',
          )}
        </div>
      )}

      {/* Single Ultra-Practical Form Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-5"
      >
        {submitError && (
          <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--safety-danger-foreground)]">
            {submitError}
          </div>
        )}

        {/* 1. Jenis Temuan (Vertikal ke bawah, konsisten) */}
        <div className="space-y-2">
          <span className="block text-[13px] font-semibold text-[var(--text)]">Jenis Temuan</span>
          <div className="flex flex-col gap-2">
            {caseTypes.map((ct) => {
              const selected = String(ct.id) === effectiveCaseTypeId
              return (
                <button
                  key={ct.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCaseTypeId(String(ct.id))}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[6px] border px-3.5 text-left text-[14px] transition-colors cursor-pointer ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                      : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                  }`}
                >
                  <span>{ct.name}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 stroke-[2.2px]" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Dua Pertanyaan Cepat (Tombol konsisten) */}
        <div className="divide-y divide-[var(--rule)] rounded-[8px] border border-[var(--border)] bg-[var(--ground)]">
          <div className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[14px] font-semibold text-[var(--text)]">
              Mesin berhenti beroperasi?
            </span>
            <div
              role="group"
              aria-label="Mesin berhenti beroperasi"
              className="grid grid-cols-2 gap-2 sm:w-[240px]"
            >
              <button
                type="button"
                aria-pressed={!isMachineStopped}
                onClick={() => setIsMachineStopped(false)}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                  !isMachineStopped
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                    : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                }`}
              >
                {!isMachineStopped && <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.2px]" />}
                <span>Tidak</span>
              </button>
              <button
                type="button"
                aria-pressed={isMachineStopped}
                onClick={() => setIsMachineStopped(true)}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                  isMachineStopped
                    ? 'border-[var(--safety-danger)] bg-[var(--safety-danger-bg)] font-semibold text-[var(--safety-danger-foreground)]'
                    : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                }`}
              >
                {isMachineStopped && <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.2px]" />}
                <span>Ya, Berhenti</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[14px] font-semibold text-[var(--text)]">
              Ada pekerja terdampak?
            </span>
            <div
              role="group"
              aria-label="Ada pekerja terdampak"
              className="grid grid-cols-2 gap-2 sm:w-[240px]"
            >
              <button
                type="button"
                aria-pressed={!hasAffectedPeople}
                onClick={() => setHasAffectedPeople(false)}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                  !hasAffectedPeople
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                    : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                }`}
              >
                {!hasAffectedPeople && <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.2px]" />}
                <span>Tidak</span>
              </button>
              <button
                type="button"
                aria-pressed={hasAffectedPeople}
                onClick={() => setHasAffectedPeople(true)}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                  hasAffectedPeople
                    ? 'border-[var(--safety-danger)] bg-[var(--safety-danger-bg)] font-semibold text-[var(--safety-danger-foreground)]'
                    : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                }`}
              >
                {hasAffectedPeople && <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.2px]" />}
                <span>Ya, Ada</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Deskripsi Kejadian + Quick Chips */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-[13px] font-semibold text-[var(--text)]">
            Apa yang terjadi?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SYMPTOMS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => appendSymptom(sym)}
                className="inline-flex min-h-[36px] items-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                + {sym}
              </button>
            ))}
          </div>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ketuk chip di atas atau ketik kondisi singkat..."
            required
            className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
          />

          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--ground)] p-3.5 space-y-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">
                  Bantuan triase awal (opsional)
                </div>
                <div className="text-[12px] text-[var(--faint)]">
                  Saran untuk dipertimbangkan supervisor. Tidak mengubah laporan yang dikirim.
                </div>
              </div>
              <button
                type="button"
                onClick={() => triageSuggestion.mutate()}
                disabled={triageSuggestion.isPending || description.trim().length < 5}
                className="h-11 shrink-0 rounded-[6px] border border-[var(--accent)] bg-[var(--surface)] px-3.5 text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--raised)] disabled:opacity-50 cursor-pointer transition-colors"
              >
                {triageSuggestion.isPending ? 'Meminta saran...' : 'Minta Saran AI'}
              </button>
            </div>

            {aiTriageError && (
              <div
                role="alert"
                className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[12px] text-[var(--safety-danger-foreground)]"
              >
                {aiTriageError}
              </div>
            )}

            {aiTriage && (
              <div
                role="status"
                className="space-y-2 rounded-[6px] border border-[var(--rule)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  <span className="text-[var(--muted)]">
                    Kategori: <strong className="text-[var(--text)]">{aiTriage.category_name}</strong>
                  </span>
                  <span className="text-[var(--muted)]">
                    Keparahan <strong className="text-[var(--text)]">{aiTriage.severity}</strong> · Kemungkinan{' '}
                    <strong className="text-[var(--text)]">{aiTriage.likelihood}</strong> (skala 1-{aiTriage.scale_max})
                  </span>
                </div>
                {aiTriage.reasoning.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-[var(--muted)]">
                    {aiTriage.reasoning.map((reason, idx) => (
                      <li key={`${reason}-${idx}`}>{reason}</li>
                    ))}
                  </ul>
                )}
                {aiTriage.additional_information.length > 0 && (
                  <div className="text-[12px] text-[var(--muted)]">
                    <span className="font-medium">Informasi yang belum ada:</span>{' '}
                    {aiTriage.additional_information.join(' · ')}
                  </div>
                )}
                <div className="text-[11px] text-[var(--faint)]">
                  Rekomendasi AI harus ditinjau, penilaian resmi dilakukan melalui triase.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Foto Bukti (Kamera & Galeri terpisah) + Kirim */}
        <div className="space-y-3 pt-1">
          {photoEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoEntries.map((entry, idx) => (
                <div
                  key={entry.url}
                  className="relative h-16 w-16 overflow-hidden rounded-[6px] border border-[var(--control)] bg-[var(--raised)]"
                >
                  <img
                    src={entry.url}
                    alt={entry.file.name || 'Preview foto'}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Hapus foto"
                    onClick={() => removePhoto(idx)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoError && (
            <p className="text-[12px] text-[var(--safety-danger-foreground)]">{photoError}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {photoEntries.length < 5 && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <label className="inline-flex h-12 min-h-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3.5 text-[14px] font-medium text-[var(--text)] hover:border-[var(--accent)] sm:h-11 sm:min-h-[44px]">
                  <Camera className="h-4 w-4 text-[var(--accent)]" />
                  <span>Kamera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <label className="inline-flex h-12 min-h-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3.5 text-[14px] font-medium text-[var(--text)] hover:border-[var(--accent)] sm:h-11 sm:min-h-[44px]">
                  <ImagePlus className="h-4 w-4 text-[var(--muted)]" />
                  <span>Galeri ({photoEntries.length}/5)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-[6px] bg-[var(--primary)] px-6 text-[15px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50 sm:h-11 sm:min-h-[44px] sm:flex-1 sm:text-[14px]"
            >
              {submitting ? 'Mengirim Laporan...' : 'Kirim Laporan'}
            </button>
          </div>
        </div>
      </form>

      {/* Read-Only Summary Modal for Open Cases (safe for Reporter RBAC via /summary) */}
      {summaryCaseId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSummaryCaseId(null)}
        >
          <div
            className="w-full max-w-md rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[12px] text-[var(--faint)]">Ringkasan Kasus Terbuka</div>
                <div className="font-mono text-[16px] font-semibold text-[var(--accent)]">
                  {summaryQuery.data?.data.case_number || '...'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSummaryCaseId(null)}
                aria-label="Tutup ringkasan"
                className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--control)] text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {summaryQuery.isLoading ? (
              <div className="text-[13px] text-[var(--faint)]">Memuat ringkasan kasus...</div>
            ) : summaryQuery.isError ? (
              <div className="text-[13px] text-[var(--safety-danger-foreground)]">
                Ringkasan kasus tidak dapat dimuat.
              </div>
            ) : summaryQuery.data?.data ? (
              <div className="space-y-3 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <CaseStatusPill
                    status={summaryQuery.data.data.status}
                    label={summaryQuery.data.data.status_label}
                  />
                  <RiskPill
                    level={summaryQuery.data.data.risk_level}
                    score={summaryQuery.data.data.risk_score}
                    label={summaryQuery.data.data.risk_level_label}
                  />
                </div>
                <p className="text-[14px] text-[var(--text)] leading-relaxed">
                  {summaryQuery.data.data.short_description}
                </p>
                <div className="text-[12px] text-[var(--faint)]">
                  Dilaporkan: {formatDateTime(summaryQuery.data.data.reported_at)}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setSummaryCaseId(null)}
              className="h-11 w-full rounded-[6px] bg-[var(--primary)] text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
