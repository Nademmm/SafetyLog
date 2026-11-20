import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Camera, CheckCircle2, QrCode, X } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { compressImageFile } from '@/lib/image-compress'
import { useReferenceData } from '@/lib/reference'
import { QrScannerStage } from '@/components/safety/QrScannerStage'
import type { Machine, SafetyCase } from '@/types/safetylog'

interface OpenCaseSummary {
  id: number
  case_number: string
  status: string
  status_label: string
  description: string
  reported_at: string
}

const QUICK_SYMPTOMS = [
  'Suara / getaran abnormal',
  'Motor panas / bau terbakar',
  'Belt / rantai kendor',
  'Kebocoran oli / cairan',
  'Pelindung / sensor lepas',
  'Lantai sekitar licin',
]

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
        open_cases_warning?: { has_open_cases: boolean; count: number; cases: OpenCaseSummary[] }
      }>(`/machines/qr/${encodeURIComponent(qrToken!)}`),
    enabled: Boolean(qrToken),
    retry: false,
  })

  const machine = qrQuery.data?.machine ?? qrQuery.data?.data ?? null
  const [caseTypeId, setCaseTypeId] = React.useState<string>('')
  const [description, setDescription] = React.useState('')
  const [isMachineStopped, setIsMachineStopped] = React.useState(false)
  const [hasAffectedPeople, setHasAffectedPeople] = React.useState(false)
  const [photos, setPhotos] = React.useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = React.useState<string[]>([])
  const [photoError, setPhotoError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [createdResult, setCreatedResult] = React.useState<{
    caseData: SafetyCase
    emergencyReminder: string | null
  } | null>(null)

  const caseTypes = refQuery.data?.case_types ?? qrQuery.data?.case_types ?? []

  React.useEffect(() => {
    if (!caseTypeId && caseTypes.length > 0) {
      setCaseTypeId(String(caseTypes[0].id))
    }
  }, [caseTypes, caseTypeId])

  React.useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPhotoPreviews(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [photos])

  const selectedCaseType = caseTypes.find((ct) => String(ct.id) === caseTypeId)
  const showEmergencyReminder = Boolean(selectedCaseType?.is_incident && hasAffectedPeople)
  const openCases = qrQuery.data?.open_cases_warning?.cases ?? []

  const handleQrDetected = React.useCallback(
    (token: string) => {
      setSearchParams({ qr: token }, { replace: true })
    },
    [setSearchParams],
  )

  const handleRescan = () => {
    setSearchParams({}, { replace: true })
    setSubmitError(null)
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

    try {
      const compressed = await Promise.all(files.slice(0, 5 - photos.length).map(compressImageFile))
      setPhotos((prev) => [...prev, ...compressed].slice(0, 5))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal memproses foto.')
    }
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!machine || !caseTypeId || !description.trim()) {
      setSubmitError('Harap pilih jenis temuan dan isi deskripsi singkat.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('machine_id', String(machine.id))
      formData.append('case_type_id', caseTypeId)
      formData.append('description', description.trim())
      formData.append('is_machine_stopped', isMachineStopped ? '1' : '0')
      formData.append('has_affected_people', hasAffectedPeople ? '1' : '0')
      photos.forEach((file) => formData.append('photos[]', file))

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

          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--raised)] p-4 space-y-1">
            <div className="text-[12px] text-[var(--faint)]">Nomor Kasus Resmi</div>
            <div className="font-mono text-[22px] font-semibold text-[var(--text)] tabular-nums">
              {createdResult.caseData.case_number}
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
                setPhotos([])
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

  // Stage 1: Direct Live Camera QR Scanner (with Flip Camera + Upload QR fallback)
  if (!qrToken || qrQuery.isError || !machine) {
    const scanError = qrQuery.isError
      ? qrQuery.error instanceof ApiError
        ? qrQuery.error.message
        : 'Kode QR tidak dikenali atau mesin sudah diarsipkan. Pindai ulang atau unggah gambar QR yang benar.'
      : null

    return (
      <QrScannerStage
        onDetected={handleQrDetected}
        isResolving={Boolean(qrToken) && qrQuery.isLoading}
        errorMessage={scanError}
      />
    )
  }

  // Stage 2: Ultra-Practical Single-Card Report Form (Machine already resolved via QR, Step 1 removed)
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
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)]"
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>Pindai Ulang</span>
        </button>
      </div>

      {/* B-10 Open Cases Warning */}
      {openCases.length > 0 && (
        <div
          role="status"
          className="rounded-[8px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-3.5 space-y-2"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--safety-warning-foreground)] mt-0.5" />
            <div className="text-[13px] font-medium text-[var(--safety-warning-foreground)]">
              Ada {openCases.length} kasus terbuka pada mesin ini (7 hari terakhir). Tetap bisa lanjut melapor.
            </div>
          </div>
          <div className="space-y-1">
            {openCases.slice(0, 2).map((oc) => (
              <Link
                key={oc.id}
                to={`/cases/${oc.id}`}
                className="flex items-center justify-between gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] text-[var(--text)] hover:bg-[var(--raised)]"
              >
                <span className="truncate">
                  <strong className="font-mono text-[var(--accent)]">{oc.case_number}</strong> ·{' '}
                  {oc.description}
                </span>
                <span className="shrink-0 text-[var(--faint)]">{oc.status_label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rule #8 Emergency Reminder */}
      {showEmergencyReminder && (
        <div
          role="alert"
          className="rounded-[8px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]"
        >
          <strong>Prosedur Darurat:</strong> Segera ikuti prosedur tanggap darurat perusahaan dan hubungi petugas P3K/K3 terlebih dahulu.
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

        {/* 1. Jenis Temuan (Compact 1-Tap Pills) */}
        <div className="space-y-2">
          <span className="block text-[14px] font-medium text-[var(--text)]">Jenis Temuan</span>
          <div className="flex flex-wrap gap-2">
            {caseTypes.map((ct) => {
              const selected = String(ct.id) === caseTypeId
              return (
                <button
                  key={ct.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCaseTypeId(String(ct.id))}
                  className={`inline-flex min-h-[42px] items-center gap-2 rounded-[6px] border px-3.5 text-[14px] transition-colors ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--raised)] font-semibold text-[var(--text)]'
                      : 'border-[var(--control)] bg-[var(--ground)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      selected ? 'bg-[var(--accent)]' : 'bg-[var(--control)]'
                    }`}
                  />
                  <span>{ct.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Dua Pertanyaan Cepat (Compact Segmented Switch Rows) */}
        <div className="divide-y divide-[var(--rule)] rounded-[6px] border border-[var(--border)] bg-[var(--ground)]">
          <div className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[14px] font-medium text-[var(--text)]">
              Mesin berhenti beroperasi?
            </span>
            <div
              role="group"
              aria-label="Mesin berhenti beroperasi"
              className="grid grid-cols-2 gap-1.5 sm:w-[230px]"
            >
              <button
                type="button"
                aria-pressed={!isMachineStopped}
                onClick={() => setIsMachineStopped(false)}
                className={`h-10 rounded-[6px] border text-[13px] font-semibold transition-colors ${
                  !isMachineStopped
                    ? 'border-[var(--text)] bg-[var(--surface)] text-[var(--text)]'
                    : 'border-[var(--control)] bg-transparent text-[var(--muted)]'
                }`}
              >
                Tidak
              </button>
              <button
                type="button"
                aria-pressed={isMachineStopped}
                onClick={() => setIsMachineStopped(true)}
                className={`h-10 rounded-[6px] border text-[13px] font-semibold transition-colors ${
                  isMachineStopped
                    ? 'border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)]'
                    : 'border-[var(--control)] bg-transparent text-[var(--muted)]'
                }`}
              >
                Ya, Berhenti
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[14px] font-medium text-[var(--text)]">
              Ada pekerja terdampak?
            </span>
            <div
              role="group"
              aria-label="Ada pekerja terdampak"
              className="grid grid-cols-2 gap-1.5 sm:w-[230px]"
            >
              <button
                type="button"
                aria-pressed={!hasAffectedPeople}
                onClick={() => setHasAffectedPeople(false)}
                className={`h-10 rounded-[6px] border text-[13px] font-semibold transition-colors ${
                  !hasAffectedPeople
                    ? 'border-[var(--text)] bg-[var(--surface)] text-[var(--text)]'
                    : 'border-[var(--control)] bg-transparent text-[var(--muted)]'
                }`}
              >
                Tidak
              </button>
              <button
                type="button"
                aria-pressed={hasAffectedPeople}
                onClick={() => setHasAffectedPeople(true)}
                className={`h-10 rounded-[6px] border text-[13px] font-semibold transition-colors ${
                  hasAffectedPeople
                    ? 'border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)]'
                    : 'border-[var(--control)] bg-transparent text-[var(--muted)]'
                }`}
              >
                Ya, Ada
              </button>
            </div>
          </div>
        </div>

        {/* 3. Deskripsi Kejadian + Quick Chips */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-[14px] font-medium text-[var(--text)]">
            Apa yang terjadi?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SYMPTOMS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => appendSymptom(sym)}
                className="inline-flex h-8 items-center rounded-[4px] border border-[var(--control)] bg-[var(--raised)] px-2.5 text-[12px] text-[var(--text)] hover:border-[var(--accent)]"
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
            className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] p-3 text-[16px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        {/* 4. Foto Bukti + Tombol Kirim dalam 1 Baris Aksi */}
        <div className="space-y-3 pt-1">
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoPreviews.map((url, idx) => (
                <div
                  key={url}
                  className="relative h-14 w-16 overflow-hidden rounded-[6px] border border-[var(--control)] bg-[var(--raised)]"
                >
                  <img
                    src={url}
                    alt={photos[idx]?.name || 'Preview foto'}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Hapus foto"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoError && (
            <p className="text-[12px] text-[var(--safety-danger-foreground)]">{photoError}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {photos.length < 5 && (
              <label className="inline-flex h-12 min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-4 text-[15px] font-medium text-[var(--text)] hover:border-[var(--accent)] sm:h-11 sm:min-h-[44px] sm:w-auto sm:text-[14px]">
                <Camera className="h-4 w-4 text-[var(--accent)]" />
                <span>Foto ({photos.length}/5)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
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
    </div>
  )
}
