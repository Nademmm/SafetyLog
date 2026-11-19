import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lock } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useReferenceData } from '@/lib/reference'
import { AuthorizedImage } from '@/components/safety/AuthorizedImage'
import { CompleteActionModal } from '@/components/safety/CompleteActionModal'
import { CaseStatusPill, OverduePill, RiskPill } from '@/components/safety/StatusPill'
import type { ActionType, CaseAction, SafetyCase } from '@/types/safetylog'

const PIPELINE_STEPS: Array<{ key: string; label: string }> = [
  { key: 'new', label: 'Baru' },
  { key: 'assessed', label: 'Dinilai' },
  { key: 'analyzed', label: 'Dianalisis' },
  { key: 'in_progress', label: 'Tindakan berjalan' },
  { key: 'pending_verification', label: 'Menunggu verifikasi' },
  { key: 'closed', label: 'Selesai' },
]

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()

  const caseQuery = useQuery({
    queryKey: ['case', id],
    queryFn: () => apiFetch<{ data: SafetyCase }>(`/cases/${id}`),
    enabled: Boolean(id),
  })

  const similarQuery = useQuery({
    queryKey: ['case-similar', id],
    queryFn: () =>
      apiFetch<{
        data: Array<{
          id: number
          case_number: string
          description: string
          status_label: string
          machine?: { code: string; name: string } | null
          similarity_score?: number
        }>
      }>(`/cases/${id}/similar`),
    enabled: Boolean(id),
  })

  const caseData = caseQuery.data?.data
  const available = caseData?.available_actions

  const assignableQuery = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () =>
      apiFetch<{ data: Array<{ id: number; name: string; role_label: string }> }>('/users/assignable'),
    enabled: Boolean(available?.can_triage || available?.can_manage_actions),
  })

  const refreshCase = () => {
    void queryClient.invalidateQueries({ queryKey: ['case', id] })
    void queryClient.invalidateQueries({ queryKey: ['cases'] })
    void queryClient.invalidateQueries({ queryKey: ['my-cases'] })
    void queryClient.invalidateQueries({ queryKey: ['my-actions'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  // Triage state (B-12)
  const [triageMode, setTriageMode] = React.useState<'assess' | 'reject' | 'duplicate'>('assess')
  const [severity, setSeverity] = React.useState<number>(3)
  const [likelihood, setLikelihood] = React.useState<number>(3)
  const [triagePicId, setTriagePicId] = React.useState<string>('')
  const [triageCategoryId, setTriageCategoryId] = React.useState<string>('')
  const [triageReason, setTriageReason] = React.useState('')
  const [duplicateOfId, setDuplicateOfId] = React.useState('')
  const [triageBusy, setTriageBusy] = React.useState(false)
  const [triageErr, setTriageErr] = React.useState<string | null>(null)

  // Add Action state (B-14)
  const [actionType, setActionType] = React.useState<ActionType>('corrective')
  const [actionTitle, setActionTitle] = React.useState('')
  const [actionPicId, setActionPicId] = React.useState('')
  const [actionDueAt, setActionDueAt] = React.useState('')
  const [actionBusy, setActionBusy] = React.useState(false)
  const [actionErr, setActionErr] = React.useState<string | null>(null)

  // Complete Action modal state (B-15 + 5 Why & 6M by PIC)
  const [completingAction, setCompletingAction] = React.useState<CaseAction | null>(null)

  // Verify / Reopen state (B-16, B-17)
  const [learningSummary, setLearningSummary] = React.useState('')
  const [verifyRejectReason, setVerifyRejectReason] = React.useState('')
  const [verifyBusy, setVerifyBusy] = React.useState(false)
  const [verifyErr, setVerifyErr] = React.useState<string | null>(null)
  const [reopenReason, setReopenReason] = React.useState('')
  const [reopenBusy, setReopenBusy] = React.useState(false)
  const [reopenErr, setReopenErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!caseData) return
    if (caseData.risk_assessment.severity) setSeverity(caseData.risk_assessment.severity)
    if (caseData.risk_assessment.likelihood) setLikelihood(caseData.risk_assessment.likelihood)
    if (caseData.risk_assessment.assigned_pic?.id) {
      setTriagePicId(String(caseData.risk_assessment.assigned_pic.id))
      setActionPicId(String(caseData.risk_assessment.assigned_pic.id))
    }
    if (caseData.category?.id) setTriageCategoryId(String(caseData.category.id))
  }, [caseData])

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseData) return
    setTriageErr(null)
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
      refreshCase()
    } catch (err) {
      setTriageErr(err instanceof ApiError ? err.message : 'Gagal menyimpan triase.')
    } finally {
      setTriageBusy(false)
    }
  }

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseData) return
    setActionErr(null)
    if (!actionTitle.trim() || !actionPicId) {
      setActionErr('Judul tindakan dan PIC wajib diisi.')
      return
    }
    setActionBusy(true)
    try {
      await apiFetch(`/cases/${caseData.id}/actions`, {
        method: 'POST',
        json: {
          action_type: actionType,
          title: actionTitle.trim(),
          pic_user_id: Number(actionPicId),
          due_at: actionDueAt || null,
        },
      })
      setActionTitle('')
      setActionDueAt('')
      refreshCase()
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Gagal menambah tindakan.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleVerify = async (decision: 'approve' | 'reject') => {
    if (!caseData) return
    setVerifyErr(null)
    if (decision === 'approve' && !learningSummary.trim()) {
      setVerifyErr('Ringkasan pembelajaran wajib diisi untuk menutup kasus.')
      return
    }
    if (decision === 'reject' && !verifyRejectReason.trim()) {
      setVerifyErr('Alasan penolakan verifikasi wajib diisi.')
      return
    }
    setVerifyBusy(true)
    try {
      await apiFetch(`/cases/${caseData.id}/verify`, {
        method: 'POST',
        json:
          decision === 'approve'
            ? { decision: 'approve', learning_summary: learningSummary.trim() }
            : { decision: 'reject', rejection_reason: verifyRejectReason.trim() },
      })
      refreshCase()
    } catch (err) {
      setVerifyErr(err instanceof ApiError ? err.message : 'Verifikasi gagal.')
    } finally {
      setVerifyBusy(false)
    }
  }

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseData) return
    setReopenErr(null)
    if (!reopenReason.trim()) {
      setReopenErr('Alasan membuka ulang kasus wajib diisi.')
      return
    }
    setReopenBusy(true)
    try {
      await apiFetch(`/cases/${caseData.id}/reopen`, {
        method: 'POST',
        json: { reason: reopenReason.trim() },
      })
      setReopenReason('')
      refreshCase()
    } catch (err) {
      setReopenErr(err instanceof ApiError ? err.message : 'Gagal membuka ulang kasus.')
    } finally {
      setReopenBusy(false)
    }
  }

  if (caseQuery.isLoading) {
    return <div className="p-6 text-[14px] text-[var(--faint)]">Memuat detail kasus...</div>
  }

  if (caseQuery.isError || !caseData) {
    return (
      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-6 space-y-3">
        <div className="text-[16px] font-semibold text-[var(--safety-danger-foreground)]">Kasus tidak ditemukan</div>
        <Link to="/cases" className="text-[14px] text-[var(--text)] underline">
          Kembali ke daftar kasus
        </Link>
      </div>
    )
  }

  const activeStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === caseData.status)
  const assignableUsers = assignableQuery.data?.data ?? []
  const similarCases = similarQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="space-y-3">
        <Link
          to={-1 as unknown as string}
          onClick={(e) => {
            e.preventDefault()
            window.history.back()
          }}
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali</span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[14px] font-semibold text-[var(--accent)] tabular-nums">
                {caseData.case_number}
              </span>
              <CaseStatusPill status={caseData.status} label={caseData.status_label} />
              <RiskPill
                level={caseData.risk_assessment.risk_level}
                score={caseData.risk_assessment.risk_score}
                label={caseData.risk_assessment.risk_level_label}
              />
              {caseData.is_locked && (
                <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[12px] text-[var(--muted)]">
                  <Lock className="h-3 w-3" /> Terkunci
                </span>
              )}
            </div>
            <h1 className="mt-2 text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--text)]">
              {caseData.machine ? `${caseData.machine.code} — ${caseData.machine.name}` : 'Detail Kasus'}
            </h1>
            <div className="mt-1 text-[13px] text-[var(--faint)]">
              {caseData.area?.name || 'Area'} · Jenis: {caseData.case_type?.name} · Dilaporkan oleh{' '}
              {caseData.reporter?.name} pada {formatDateTime(caseData.reported_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Element: Closed-Loop Case Pipeline Strip */}
      {caseData.status !== 'rejected' && caseData.status !== 'duplicate' && (
        <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {PIPELINE_STEPS.map((step, idx) => {
              const reached = activeStepIndex >= idx
              const current = activeStepIndex === idx
              return (
                <div key={step.key} className="space-y-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      current ? 'bg-[var(--accent)]' : reached ? 'bg-[var(--text)]' : 'bg-[var(--control)]'
                    }`}
                  />
                  <div
                    className={`text-[12px] ${
                      current
                        ? 'font-semibold text-[var(--text)]'
                        : reached
                          ? 'text-[var(--muted)]'
                          : 'text-[var(--faint)]'
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Left 2 Columns: Incident, Triage, Root Cause, Actions, Verification */}
        <div className="space-y-6 lg:col-span-2">
          {/* Incident Details & Photos */}
          <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Laporan Kejadian</h2>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">{caseData.description}</p>
            <div className="flex flex-wrap gap-2 text-[12px]">
              <span
                className={`rounded-[4px] border px-2.5 py-1 ${
                  caseData.is_machine_stopped
                    ? 'border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)]'
                    : 'border-[var(--control)] bg-[var(--ground)] text-[var(--muted)]'
                }`}
              >
                Mesin berhenti: {caseData.is_machine_stopped ? 'Ya' : 'Tidak'}
              </span>
              <span
                className={`rounded-[4px] border px-2.5 py-1 ${
                  caseData.has_affected_people
                    ? 'border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)]'
                    : 'border-[var(--control)] bg-[var(--ground)] text-[var(--muted)]'
                }`}
              >
                Orang terdampak: {caseData.has_affected_people ? 'Ya' : 'Tidak'}
              </span>
              {caseData.risk_assessment.assigned_pic && (
                <span className="rounded-[4px] border border-[var(--control)] bg-[var(--ground)] px-2.5 py-1 text-[var(--muted)]">
                  PIC Kasus: {caseData.risk_assessment.assigned_pic.name}
                </span>
              )}
            </div>

            {(caseData.attachments?.length ?? 0) > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {caseData.attachments!.map((att) => (
                  <AuthorizedImage
                    key={att.id}
                    attachmentId={att.id}
                    alt={att.file_name}
                    className="h-32 w-full rounded-[6px] object-cover border border-[var(--control)]"
                  />
                ))}
              </div>
            )}
          </section>

          {/* Triage Panel (B-12, U3) */}
          {available?.can_triage && (
            <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Penilaian Risiko &amp; Triase</h2>
                <div className="flex gap-1.5">
                  {(['assess', 'reject', 'duplicate'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTriageMode(m)}
                      className={`h-8 rounded-[4px] px-3 text-[12px] font-medium ${
                        triageMode === m
                          ? 'bg-[var(--primary)] text-[var(--primary-ink)]'
                          : 'bg-[var(--raised)] text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {m === 'assess' ? 'Nilai Risiko' : m === 'reject' ? 'Tolak' : 'Duplikat'}
                    </button>
                  ))}
                </div>
              </div>

              {triageErr && (
                <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
                  {triageErr}
                </div>
              )}

              <form onSubmit={handleTriageSubmit} className="space-y-4">
                {triageMode === 'assess' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="block text-[13px] font-medium text-[var(--muted)]">
                          Keparahan (Severity 1–5)
                        </span>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setSeverity(n)}
                              className={`h-11 rounded-[6px] border font-mono text-[14px] font-semibold tabular-nums ${
                                severity === n
                                  ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                                  : 'border-[var(--control)] bg-[var(--ground)] text-[var(--text)]'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="block text-[13px] font-medium text-[var(--muted)]">
                          Kemungkinan (Likelihood 1–5)
                        </span>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setLikelihood(n)}
                              className={`h-11 rounded-[6px] border font-mono text-[14px] font-semibold tabular-nums ${
                                likelihood === n
                                  ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                                  : 'border-[var(--control)] bg-[var(--ground)] text-[var(--text)]'
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
                        <label className="block text-[13px] font-medium text-[var(--muted)]">
                          Tunjuk PIC Kasus
                        </label>
                        <select
                          value={triagePicId}
                          onChange={(e) => setTriagePicId(e.target.value)}
                          className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                        >
                          <option value="">Pilih PIC...</option>
                          {assignableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role_label})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-[var(--muted)]">
                          Kategori Masalah
                        </label>
                        <select
                          value={triageCategoryId}
                          onChange={(e) => setTriageCategoryId(e.target.value)}
                          className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                        >
                          <option value="">Pilih kategori...</option>
                          {(refQuery.data?.categories ?? []).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {triageMode === 'duplicate' && (
                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-[var(--muted)]">
                          ID Kasus Asli
                        </label>
                        <input
                          type="number"
                          value={duplicateOfId}
                          onChange={(e) => setDuplicateOfId(e.target.value)}
                          placeholder="Masukkan ID kasus asli..."
                          required
                          className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[15px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-medium text-[var(--muted)]">
                        Alasan ({triageMode === 'reject' ? 'Penolakan' : 'Duplikat'})
                      </label>
                      <textarea
                        rows={2}
                        value={triageReason}
                        onChange={(e) => setTriageReason(e.target.value)}
                        required
                        className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] p-3 text-[15px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={triageBusy}
                  className="h-11 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {triageBusy ? 'Menyimpan...' : 'Simpan Triase'}
                </button>
              </form>
            </section>
          )}

          {/* Root Cause 5 Why & 6M (Read-only summary filled by assigned PIC during action completion) */}
          {caseData.root_cause.root_cause_category && (
            <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">
                  Analisis Akar Penyebab (5 Why &amp; 6M)
                </h2>
                {caseData.root_cause.analyzed_by?.name && (
                  <span className="text-[12px] text-[var(--faint)]">
                    Diisi oleh PIC: {caseData.root_cause.analyzed_by.name}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-[14px]">
                <div className="text-[var(--muted)]">
                  Kategori 6M:{' '}
                  <strong className="text-[var(--text)]">
                    {caseData.root_cause.root_cause_category}
                  </strong>
                </div>
                {(caseData.root_cause.five_whys ?? []).map((w, i) => (
                  <div key={i} className="text-[var(--muted)]">
                    <span className="font-mono text-[12px] text-[var(--faint)] mr-1.5 tabular-nums">
                      {i + 1}.
                    </span>
                    {w}
                  </div>
                ))}
                {caseData.root_cause.root_cause_summary && (
                  <div className="rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 py-2 text-[13px] text-[var(--text)]">
                    <span className="text-[var(--faint)]">Ringkasan: </span>
                    {caseData.root_cause.root_cause_summary}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* CAPA Actions (B-14, B-15) */}
          <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[var(--text)]">
                Tindakan Korektif &amp; Preventif (CAPA)
              </h2>
              <span className="text-[12px] text-[var(--faint)] tabular-nums">
                {caseData.actions?.length ?? 0} tindakan
              </span>
            </div>

            {(caseData.actions?.length ?? 0) === 0 ? (
              <div className="rounded-[6px] border border-dashed border-[var(--control)] p-4 text-[13px] text-[var(--faint)]">
                Belum ada tindakan CAPA. {caseData.status === 'new' ? 'Lakukan triase terlebih dahulu.' : ''}
              </div>
            ) : (
              <div className="divide-y divide-[var(--rule)]">
                {caseData.actions!.map((act) => (
                  <div key={act.id} className="py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                          {act.action_type_label}
                        </span>
                        <span className="text-[14px] font-medium text-[var(--text)]">{act.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {act.is_overdue && act.status !== 'completed' && (
                          <OverduePill label={act.overdue_label} />
                        )}
                        <span
                          className={`rounded-[4px] px-2 py-0.5 text-[12px] ${
                            act.status === 'completed'
                              ? 'bg-[var(--safety-safe-bg)] text-[var(--safety-safe-foreground)]'
                              : 'bg-[var(--raised)] text-[var(--muted)]'
                          }`}
                        >
                          {act.status_label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--faint)]">
                      <span>
                        PIC: <strong className="text-[var(--muted)]">{act.pic?.name || '—'}</strong> · Tenggat:{' '}
                        {formatDateTime(act.due_at)}
                      </span>
                      {act.can_complete && (
                        <button
                          type="button"
                          onClick={() => setCompletingAction(act)}
                          className="h-9 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
                        >
                          Selesaikan Tindakan
                        </button>
                      )}
                    </div>

                    {act.completion_note && (
                      <div className="rounded-[4px] bg-[var(--ground)] p-3 text-[13px] text-[var(--muted)]">
                        Hasil: {act.completion_note}
                      </div>
                    )}

                    {(act.attachments?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {act.attachments!.map((att) => (
                          <AuthorizedImage
                            key={att.id}
                            attachmentId={att.id}
                            alt={att.file_name}
                            className="h-20 w-24 rounded-[4px] object-cover border border-[var(--control)]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Action Form */}
            {available?.can_manage_actions && (
              <form onSubmit={handleAddAction} className="border-t border-[var(--rule)] pt-4 space-y-3">
                <div className="text-[14px] font-medium text-[var(--text)]">Tambah Tindakan Baru</div>
                {actionErr && (
                  <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
                    {actionErr}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as ActionType)}
                    className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                  >
                    <option value="temporary">Sementara</option>
                    <option value="corrective">Korektif</option>
                    <option value="preventive">Preventif</option>
                  </select>

                  <select
                    value={actionPicId}
                    onChange={(e) => setActionPicId(e.target.value)}
                    required
                    className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                  >
                    <option value="">Pilih PIC...</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="datetime-local"
                    value={actionDueAt}
                    onChange={(e) => setActionDueAt(e.target.value)}
                    aria-label="Tenggat opsional"
                    className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[13px] text-[var(--text)]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={actionTitle}
                    onChange={(e) => setActionTitle(e.target.value)}
                    placeholder="Judul tindakan perbaikan atau pencegahan..."
                    required
                    className="h-11 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)]"
                  />
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="h-11 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    {actionBusy ? 'Menambah...' : 'Tambah Tindakan'}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Verification Panel (B-16, U4, U5) */}
          {caseData.status === 'pending_verification' && (
            <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
              <h2 className="text-[16px] font-semibold text-[var(--text)]">Verifikasi &amp; Tutup Kasus</h2>

              {available?.is_verifier_blocked_as_pic && (
                <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]">
                  Anda terdaftar sebagai PIC pada kasus/tindakan ini. Sesuai aturan produk, Verifikator tidak boleh sama dengan PIC.
                </div>
              )}

              {verifyErr && (
                <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]">
                  {verifyErr}
                </div>
              )}

              {available?.can_verify && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-[var(--muted)]">
                      Ringkasan Pembelajaran (Wajib untuk Setujui &amp; Tutup)
                    </label>
                    <textarea
                      rows={2}
                      value={learningSummary}
                      onChange={(e) => setLearningSummary(e.target.value)}
                      placeholder="Apa pelajaran utama agar masalah tidak terulang..."
                      className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] p-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={verifyBusy}
                    onClick={() => handleVerify('approve')}
                    className="h-11 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    Setujui &amp; Tutup Kasus
                  </button>

                  <div className="border-t border-[var(--rule)] pt-4 space-y-2">
                    <label className="block text-[13px] font-medium text-[var(--muted)]">
                      Atau Tolak Verifikasi (Alasan Wajib)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={verifyRejectReason}
                        onChange={(e) => setVerifyRejectReason(e.target.value)}
                        placeholder="Alasan dikembalikan ke Tindakan berjalan..."
                        className="h-11 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                      />
                      <button
                        type="button"
                        disabled={verifyBusy}
                        onClick={() => handleVerify('reject')}
                        className="h-11 rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-4 text-[13px] font-medium text-[var(--safety-danger-foreground)]"
                      >
                        Tolak Verifikasi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Closed & Reopen Panel (B-17, U10) */}
          {caseData.status === 'closed' && (
            <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-[var(--safety-safe-foreground)]">
                <Lock className="h-4 w-4" />
                <h2 className="text-[16px] font-semibold">Kasus Selesai &amp; Terkunci</h2>
              </div>
              {caseData.verification.learning_summary && (
                <p className="text-[14px] text-[var(--text)]">
                  <strong>Pembelajaran:</strong> {caseData.verification.learning_summary}
                </p>
              )}
              <div className="text-[12px] text-[var(--faint)]">
                Diverifikasi oleh {caseData.verification.verified_by?.name || '—'} pada{' '}
                {formatDateTime(caseData.verification.verified_at)}
              </div>

              {available?.can_reopen && (
                <form onSubmit={handleReopen} className="border-t border-[var(--rule)] pt-4 space-y-2">
                  <div className="text-[13px] font-medium text-[var(--text)]">Buka Ulang Kasus</div>
                  {reopenErr && (
                    <div className="text-[12px] text-[var(--safety-danger-foreground)]">{reopenErr}</div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Alasan membuka ulang kasus..."
                      required
                      className="h-11 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                    />
                    <button
                      type="submit"
                      disabled={reopenBusy}
                      className="h-11 rounded-[6px] border border-[var(--control)] px-4 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)]"
                    >
                      Buka Ulang
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Similar Cases (non-AI) & Append-Only Audit Log */}
        <div className="space-y-6">
          <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--text)]">Kasus Mirip</h2>
              <p className="text-[12px] text-[var(--faint)]">
                Berdasarkan kemiripan teks deskripsi (non-AI).
              </p>
            </div>
            <div className="divide-y divide-[var(--rule)]">
              {similarCases.length === 0 ? (
                <div className="py-2 text-[13px] text-[var(--faint)]">
                  Tidak ada kasus mirip ditemukan.
                </div>
              ) : (
                similarCases.map((sc) => (
                  <Link
                    key={sc.id}
                    to={`/cases/${sc.id}`}
                    className="block py-2.5 hover:bg-[var(--hover-row)]"
                  >
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-mono text-[var(--accent)] tabular-nums">
                        {sc.case_number}
                      </span>
                      <span className="text-[var(--faint)]">{sc.status_label}</span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-[var(--text)] line-clamp-2">
                      {sc.description}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Riwayat Perubahan (Audit Log)</h2>
            <div className="divide-y divide-[var(--rule)]">
              {(caseData.status_histories ?? []).length === 0 ? (
                <div className="py-2 text-[13px] text-[var(--faint)]">Belum ada riwayat perubahan.</div>
              ) : (
                caseData.status_histories!.map((h) => (
                  <div key={h.id} className="py-2.5 space-y-0.5">
                    <div className="text-[13px] font-medium text-[var(--text)]">
                      {h.from_status_label ? `${h.from_status_label} → ` : ''}
                      {h.to_status_label}
                    </div>
                    <div className="text-[12px] text-[var(--faint)]">
                      {h.changed_by?.name || 'Sistem'} · {formatDateTime(h.created_at)}
                    </div>
                    {h.reason && <div className="text-[12px] text-[var(--muted)]">{h.reason}</div>}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Complete Action + 5 Why & 6M Modal (for assigned PIC) */}
      {completingAction && (
        <CompleteActionModal
          action={completingAction}
          caseId={caseData.id}
          caseNumber={caseData.case_number}
          existingRootCause={caseData.root_cause}
          onClose={() => setCompletingAction(null)}
          onCompleted={refreshCase}
        />
      )}
    </div>
  )
}
