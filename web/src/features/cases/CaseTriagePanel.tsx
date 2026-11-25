import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { caseKeys } from '@/data/query-keys'
import { getDuplicateCandidates } from '@/domain/case-rules'
import { AiAssistButton } from '@/components/safety/AiAssistButton'
import { Select } from '@/components/ui/FormField'
import type {
  AiEnvelope,
  AiTriageSuggestion,
  SafetyCase,
} from '@/types/safetylog'

interface AssignableUser {
  id: number
  name: string
  role: string
  role_label: string
}

interface CaseTriagePanelProps {
  caseData: SafetyCase
  assignableUsers: AssignableUser[]
  categories: Array<{ id: number; name: string }>
  defaultPicId: string
  onTriaged: () => void
}

export function CaseTriagePanel({
  caseData,
  assignableUsers,
  categories,
  defaultPicId,
  onTriaged,
}: CaseTriagePanelProps) {
  const [triageMode, setTriageMode] = React.useState<'assess' | 'reject' | 'duplicate'>('assess')
  const [duplicateSearch, setDuplicateSearch] = React.useState('')
  const [severityOverride, setSeverityOverride] = React.useState<number | null>(null)
  const [likelihoodOverride, setLikelihoodOverride] = React.useState<number | null>(null)
  const [triagePicIdOverride, setTriagePicIdOverride] = React.useState<string | null>(null)
  const [triageCategoryIdOverride, setTriageCategoryIdOverride] = React.useState<string | null>(
    null,
  )
  const [triageReason, setTriageReason] = React.useState('')
  const [duplicateOfId, setDuplicateOfId] = React.useState('')
  const [triageBusy, setTriageBusy] = React.useState(false)
  const [triageErr, setTriageErr] = React.useState<string | null>(null)
  const [triageSuccess, setTriageSuccess] = React.useState<{
    title: string
    description: string
  } | null>(null)

  const [aiTriageState, setAiTriageState] = React.useState<{
    caseId: number | undefined
    data: AiTriageSuggestion | null
    error: string | null
  }>({ caseId: undefined, data: null, error: null })

  const aiTriage = aiTriageState.caseId === caseData.id ? aiTriageState.data : null
  const aiTriageError = aiTriageState.caseId === caseData.id ? aiTriageState.error : null

  const duplicateCandidatesQuery = useQuery({
    queryKey: caseKeys.list({ scope: 'duplicate-picker', q: duplicateSearch }),
    queryFn: () => {
      const p = new URLSearchParams({ per_page: '30' })
      if (duplicateSearch.trim()) p.set('q', duplicateSearch.trim())
      return apiFetch<{ data: SafetyCase[] }>(`/cases?${p.toString()}`)
    },
    enabled: triageMode === 'duplicate',
  })

  const triageSuggestion = useMutation({
    mutationFn: () =>
      apiFetch<AiEnvelope<AiTriageSuggestion>>('/ai/triage-suggestion', {
        method: 'POST',
        json: { case_id: caseData.id },
      }),
    onSuccess: (response) => {
      setAiTriageState({ caseId: caseData.id, data: response.data, error: null })
    },
    onError: (error) => {
      setAiTriageState({
        caseId: caseData.id,
        data: null,
        error: error instanceof ApiError ? error.message : 'Gagal meminta saran triase AI.',
      })
    },
  })

  const severity = severityOverride ?? caseData.risk_assessment.severity ?? 3
  const likelihood = likelihoodOverride ?? caseData.risk_assessment.likelihood ?? 3
  const triagePicId = triagePicIdOverride ?? defaultPicId
  const triageCategoryId =
    triageCategoryIdOverride ?? (caseData.category?.id ? String(caseData.category.id) : '')

  const duplicateCandidates = getDuplicateCandidates(
    duplicateCandidatesQuery.data?.data ?? [],
    caseData.id,
  ).filter((c) => c.status !== 'rejected')

  const applyAiTriage = () => {
    if (!aiTriage) return
    setSeverityOverride(Math.min(aiTriage.scale_max, Math.max(1, aiTriage.severity)))
    setLikelihoodOverride(Math.min(aiTriage.scale_max, Math.max(1, aiTriage.likelihood)))
    if (categories.some((cat) => cat.id === aiTriage.category_id)) {
      setTriageCategoryIdOverride(String(aiTriage.category_id))
    }
  }

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTriageErr(null)
    if (triageMode === 'duplicate' && !duplicateOfId) {
      setTriageErr('Pilih kasus asli terlebih dahulu.')
      return
    }
    setTriageBusy(true)
    try {
      const payload =
        triageMode === 'assess'
          ? {
              decision: 'assess',
              severity,
              likelihood,
              assigned_pic_id: triagePicId ? Number(triagePicId) : null,
              category_id: triageCategoryId ? Number(triageCategoryId) : null,
            }
          : triageMode === 'reject'
            ? {
                decision: 'reject',
                rejection_reason: triageReason.trim(),
              }
            : {
                decision: 'duplicate',
                duplicate_of_case_id: Number(duplicateOfId),
                rejection_reason: triageReason.trim(),
              }

      await apiFetch(`/cases/${caseData.id}/triage`, { method: 'POST', json: payload })
      setTriageSuccess(
        triageMode === 'assess'
          ? {
              title: 'Penilaian Risiko Berhasil',
              description:
                'Risiko kasus telah sukses dinilai dan tersimpan. Kasus siap dilanjutkan ke tahap analisis.',
            }
          : triageMode === 'reject'
            ? {
                title: 'Laporan Ditolak',
                description: 'Laporan kasus berhasil ditolak dan status telah diperbarui.',
              }
            : {
                title: 'Ditandai sebagai Duplikat',
                description: 'Kasus berhasil ditandai sebagai duplikat dari kasus yang dipilih.',
              },
      )
      onTriaged()
    } catch (err) {
      setTriageErr(err instanceof ApiError ? err.message : 'Gagal menyimpan triase.')
    } finally {
      setTriageBusy(false)
    }
  }

  return (
    <>
      <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-semibold text-[var(--text)]">
            Penilaian Risiko &amp; Triase
          </h2>
          <div className="grid grid-cols-3 gap-1.5 sm:flex">
            {(['assess', 'reject', 'duplicate'] as const).map((m) => {
              const active = triageMode === m
              const isDanger = m === 'reject'
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTriageMode(m)}
                  className={`h-11 sm:h-9 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                    active
                      ? isDanger
                        ? 'border-[var(--safety-danger)] bg-[var(--safety-danger-bg)] font-semibold text-[var(--safety-danger-foreground)]'
                        : 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                      : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                  }`}
                >
                  {m === 'assess' ? 'Nilai Risiko' : m === 'reject' ? 'Tolak' : 'Duplikat'}
                </button>
              )
            })}
          </div>
        </div>

        {triageErr && (
          <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
            {triageErr}
          </div>
        )}

        {triageMode === 'assess' && (
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--ground)] p-3.5 space-y-2.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Saran triase AI</div>
                <div className="text-[12px] text-[var(--faint)]">
                  Rekomendasi awal, tetap tinjau dan simpan melalui triase resmi.
                </div>
              </div>
              <AiAssistButton
                onClick={() => triageSuggestion.mutate()}
                loading={triageSuggestion.isPending}
                label="Minta Saran AI"
                loadingLabel="Meminta saran..."
              />
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[13px] text-[var(--muted)]">
                    Kategori <strong className="text-[var(--text)]">{aiTriage.category_name}</strong>
                    {' · '}Keparahan <strong className="text-[var(--text)]">{aiTriage.severity}</strong>
                    {' · '}Kemungkinan <strong className="text-[var(--text)]">{aiTriage.likelihood}</strong>
                    {' '}(skala 1-{aiTriage.scale_max})
                  </div>
                  <button
                    type="button"
                    onClick={applyAiTriage}
                    className="h-11 shrink-0 rounded-[6px] border border-[var(--control)] bg-[var(--raised)] px-3.5 text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--border)] cursor-pointer transition-colors"
                  >
                    Gunakan saran
                  </button>
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
                    Informasi yang belum ada: {aiTriage.additional_information.join(' · ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleTriageSubmit} className="space-y-4">
          {triageMode === 'assess' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <span className="block text-[13px] font-semibold text-[var(--text)]">
                    Keparahan (1–5)
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSeverityOverride(n)}
                        className={`h-11 rounded-[6px] border font-mono text-[14px] tabular-nums transition-colors cursor-pointer ${
                          severity === n
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[13px] font-semibold text-[var(--text)]">
                    Kemungkinan (1–5)
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setLikelihoodOverride(n)}
                        className={`h-11 rounded-[6px] border font-mono text-[14px] tabular-nums transition-colors cursor-pointer ${
                          likelihood === n
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-[var(--text)]">
                    Tunjuk PIC Kasus
                  </label>
                  <Select value={triagePicId} onChange={(e) => setTriagePicIdOverride(e.target.value)}>
                    <option value="">Pilih PIC...</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role_label})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-[var(--text)]">
                    Kategori Masalah
                  </label>
                  <Select
                    value={triageCategoryId}
                    onChange={(e) => setTriageCategoryIdOverride(e.target.value)}
                  >
                    <option value="">Pilih kategori...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              {triageMode === 'duplicate' && (
                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-[var(--text)]">
                    Pilih Kasus Asli (Rujukan Duplikat)
                  </label>
                  <input
                    type="search"
                    value={duplicateSearch}
                    onChange={(e) => setDuplicateSearch(e.target.value)}
                    placeholder="Cari nomor kasus atau mesin..."
                    className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                  <Select
                    value={duplicateOfId}
                    onChange={(e) => setDuplicateOfId(e.target.value)}
                    required
                  >
                    <option value="">Pilih kasus asli...</option>
                    {duplicateCandidates.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.case_number} — {cand.machine?.code || 'Mesin'} ({cand.status_label})
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  Alasan ({triageMode === 'reject' ? 'Penolakan' : 'Duplikat'})
                </label>
                <textarea
                  rows={2}
                  value={triageReason}
                  onChange={(e) => setTriageReason(e.target.value)}
                  required
                  className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={triageBusy}
            className="h-11 w-full sm:w-auto rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50 cursor-pointer"
          >
            {triageBusy ? 'Menyimpan...' : 'Simpan Triase'}
          </button>
        </form>
      </section>

      {triageSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="triage-success-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setTriageSuccess(null)}
        >
          <div
            className="w-full max-w-sm rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--safety-safe-border)] bg-[var(--safety-safe-bg)] text-[var(--safety-safe-foreground)]">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h3 id="triage-success-title" className="text-[17px] font-bold text-[var(--text)]">
                {triageSuccess.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
                {triageSuccess.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTriageSuccess(null)}
              className="h-11 w-full rounded-[8px] bg-[var(--primary)] text-[14px] font-semibold text-[var(--primary-ink)] hover:opacity-90 cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  )
}
