import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Calendar, CheckCircle2, Edit3, RotateCcw, User, X } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '@/domain/case-rules'
import { AiAssistButton } from '@/components/safety/AiAssistButton'
import { AuthorizedImage } from '@/components/safety/AuthorizedImage'
import { CompleteActionModal } from '@/components/safety/CompleteActionModal'
import { OverduePill } from '@/components/safety/StatusPill'
import { Select } from '@/components/ui/FormField'
import { ModalDialog } from '@/components/ui/ModalDialog'
import type {
  ActionType,
  AiActionSuggestions,
  AiEnvelope,
  CaseAction,
  SafetyCase,
} from '@/types/safetylog'

const AI_PRIORITY_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: 'Prioritas tinggi',
  medium: 'Prioritas sedang',
  low: 'Prioritas rendah',
}

const ACTION_TYPE_HINTS: Record<string, string> = {
  temporary: 'Penanganan cepat sementara',
  corrective: 'Perbaikan akar masalah',
  preventive: 'Cegah masalah berulang',
}

interface AssignableUser {
  id: number
  name: string
  role: string
  role_label: string
}

interface CaseCapaSectionProps {
  caseData: SafetyCase
  canManageActions: boolean
  isVerifierRole: boolean
  assignableUsers: AssignableUser[]
  defaultPicId: string
  actionTypeOptions: Array<{ value: string; label: string }>
  onChanged: () => void
}

export function CaseCapaSection({
  caseData,
  canManageActions,
  isVerifierRole,
  assignableUsers,
  defaultPicId,
  actionTypeOptions,
  onChanged,
}: CaseCapaSectionProps) {
  const [actionType, setActionType] = React.useState<ActionType>('corrective')
  const [actionTitle, setActionTitle] = React.useState('')
  const [actionDescription, setActionDescription] = React.useState('')
  const [actionPicIdOverride, setActionPicIdOverride] = React.useState<string | null>(null)
  const [actionDueAt, setActionDueAt] = React.useState('')
  const [actionDueFocused, setActionDueFocused] = React.useState(false)
  const [actionBusy, setActionBusy] = React.useState(false)
  const [actionErr, setActionErr] = React.useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null)

  const [editingAction, setEditingAction] = React.useState<CaseAction | null>(null)
  const [editActionType, setEditActionType] = React.useState<ActionType>('corrective')
  const [editActionTitle, setEditActionTitle] = React.useState('')
  const [editActionDesc, setEditActionDesc] = React.useState('')
  const [editActionPicId, setEditActionPicId] = React.useState('')
  const [editActionDueAt, setEditActionDueAt] = React.useState('')
  const [editActionBusy, setEditActionBusy] = React.useState(false)
  const [editActionErr, setEditActionErr] = React.useState<string | null>(null)

  const [reopeningActionId, setReopeningActionId] = React.useState<number | null>(null)
  const [reopenActionReason, setReopenActionReason] = React.useState('')
  const [reopenActionBusy, setReopenActionBusy] = React.useState(false)
  const [reopenActionErr, setReopenActionErr] = React.useState<string | null>(null)

  const [completingAction, setCompletingAction] = React.useState<CaseAction | null>(null)

  const [aiActionsState, setAiActionsState] = React.useState<{
    caseId: number | undefined
    data: AiActionSuggestions | null
    error: string | null
  }>({ caseId: undefined, data: null, error: null })

  const aiActions = aiActionsState.caseId === caseData.id ? aiActionsState.data : null
  const aiActionsError = aiActionsState.caseId === caseData.id ? aiActionsState.error : null

  const actionSuggestions = useMutation({
    mutationFn: () =>
      apiFetch<AiEnvelope<AiActionSuggestions>>(`/cases/${caseData.id}/action-suggestions`, {
        method: 'POST',
      }),
    onSuccess: (response) => {
      setAiActionsState({ caseId: caseData.id, data: response.data, error: null })
    },
    onError: (error) => {
      setAiActionsState({
        caseId: caseData.id,
        data: null,
        error: error instanceof ApiError ? error.message : 'Gagal meminta saran tindakan AI.',
      })
    },
  })

  React.useEffect(() => {
    if (!actionSuccess) return
    const timer = window.setTimeout(() => setActionSuccess(null), 5000)
    return () => window.clearTimeout(timer)
  }, [actionSuccess])

  const actionPicId = actionPicIdOverride ?? defaultPicId
  const actionPicCandidates = assignableUsers.filter((u) => u.role === 'reporter')
  const editActionPicCandidates = assignableUsers.filter(
    (u) => u.role === 'reporter' || String(u.id) === String(editActionPicId),
  )

  const applyAiAction = (suggestion: AiActionSuggestions['suggestions'][number]) => {
    setActionType(suggestion.action_type)
    setActionTitle(suggestion.title)
    setActionDescription(suggestion.description)
  }

  const startEditAction = (act: CaseAction) => {
    setEditingAction(act)
    setEditActionType(act.action_type)
    setEditActionTitle(act.title)
    setEditActionDesc(act.description || '')
    setEditActionPicId(act.pic ? String(act.pic.id) : '')
    setEditActionDueAt(toLocalDateTimeInput(act.due_at))
    setEditActionErr(null)
  }

  const handleSaveEditAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAction) return
    setEditActionErr(null)
    if (!editActionTitle.trim() || !editActionPicId) {
      setEditActionErr('Judul tindakan dan PIC wajib diisi.')
      return
    }
    setEditActionBusy(true)
    try {
      await apiFetch(`/actions/${editingAction.id}`, {
        method: 'PATCH',
        json: {
          action_type: editActionType,
          title: editActionTitle.trim(),
          description: editActionDesc.trim() || null,
          pic_user_id: Number(editActionPicId),
          ...(editActionDueAt ? { due_at: fromLocalDateTimeInput(editActionDueAt) } : {}),
        },
      })
      setEditingAction(null)
      onChanged()
    } catch (err) {
      setEditActionErr(err instanceof ApiError ? err.message : 'Gagal memperbarui tindakan.')
    } finally {
      setEditActionBusy(false)
    }
  }

  const handleReopenSingleAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reopeningActionId) return
    setReopenActionErr(null)
    if (!reopenActionReason.trim()) {
      setReopenActionErr('Alasan membuka ulang tindakan wajib diisi.')
      return
    }
    setReopenActionBusy(true)
    try {
      await apiFetch(`/actions/${reopeningActionId}/reopen`, {
        method: 'POST',
        json: { reason: reopenActionReason.trim() },
      })
      setReopeningActionId(null)
      setReopenActionReason('')
      onChanged()
    } catch (err) {
      setReopenActionErr(
        err instanceof ApiError ? err.message : 'Gagal membuka ulang tindakan.',
      )
    } finally {
      setReopenActionBusy(false)
    }
  }

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionErr(null)
    setActionSuccess(null)
    if (!actionTitle.trim() || !actionPicId) {
      setActionErr('Judul tindakan dan PIC wajib diisi.')
      return
    }
    const addedTitle = actionTitle.trim()
    const assignedPicName =
      assignableUsers.find((u) => String(u.id) === String(actionPicId))?.name || 'PIC'
    setActionBusy(true)
    try {
      await apiFetch(`/cases/${caseData.id}/actions`, {
        method: 'POST',
        json: {
          action_type: actionType,
          title: addedTitle,
          description: actionDescription.trim() || null,
          pic_user_id: Number(actionPicId),
          due_at: actionDueAt ? fromLocalDateTimeInput(actionDueAt) : null,
        },
      })
      setActionTitle('')
      setActionDescription('')
      setActionDueAt('')
      setActionSuccess(`Tindakan "${addedTitle}" berhasil ditambahkan untuk ${assignedPicName}.`)
      onChanged()
    } catch (err) {
      setActionErr(err instanceof ApiError ? err.message : 'Gagal menambah tindakan.')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <>
      <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="text-[16px] font-semibold text-[var(--text)] min-w-0">
            Tindakan Korektif &amp; Preventif (CAPA)
          </h2>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--ground)] px-3 py-1 font-mono text-[12.5px] font-semibold text-[var(--text)] tabular-nums">
            {caseData.actions?.length ?? 0} tindakan
          </span>
        </div>

        {(caseData.actions?.length ?? 0) === 0 ? (
          <div className="rounded-[6px] border border-dashed border-[var(--control)] p-4 text-[13px] text-[var(--faint)]">
            Belum ada tindakan CAPA.{' '}
            {caseData.status === 'new' ? 'Lakukan triase terlebih dahulu.' : ''}
          </div>
        ) : (
          <div className="space-y-3">
            {caseData.actions!.map((act) => {
              const isOverdueOpen = act.is_overdue && act.status !== 'completed'
              const hasFooterButtons =
                (canManageActions && act.status !== 'completed') ||
                (isVerifierRole && !caseData.is_locked && act.status === 'completed') ||
                act.can_complete

              return (
                <article
                  key={act.id}
                  className={`rounded-[8px] border p-3.5 sm:p-4 space-y-3 ${
                    isOverdueOpen
                      ? 'border-[var(--safety-danger-border)] bg-[var(--ground)]'
                      : 'border-[var(--rule)] bg-[var(--ground)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-[5px] border px-2.5 py-0.5 text-[12px] font-semibold ${
                        act.action_type === 'preventive'
                          ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                          : act.action_type === 'temporary'
                            ? 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)]'
                            : 'border-[var(--control)] bg-[var(--surface)] text-[var(--text)]'
                      }`}
                    >
                      {act.action_type_label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isOverdueOpen && <OverduePill label={act.overdue_label} />}
                      <span
                        className={`inline-flex items-center rounded-[5px] border px-2.5 py-0.5 text-[12px] font-semibold ${
                          act.status === 'completed'
                            ? 'border-[var(--safety-safe-border)] bg-[var(--safety-safe-bg)] text-[var(--safety-safe-foreground)]'
                            : 'border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] text-[var(--safety-warning-foreground)]'
                        }`}
                      >
                        {act.status_label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-[15px] font-semibold leading-snug text-[var(--text)]">
                      {act.title}
                    </h3>
                    {act.description && (
                      <p className="text-[13px] leading-relaxed text-[var(--muted)]">
                        {act.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden="true" />
                      <span>
                        PIC:{' '}
                        <strong className="font-medium text-[var(--text)]">
                          {act.pic?.name || '—'}
                        </strong>
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden="true" />
                      <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                        Tenggat: {formatDateTime(act.due_at)}
                      </span>
                    </span>
                  </div>

                  {act.completion_note && (
                    <div className="rounded-[6px] border border-[var(--safety-safe-border)] bg-[var(--surface)] px-3 py-2.5 space-y-0.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--safety-safe-foreground)]">
                        Hasil Penyelesaian
                      </div>
                      <p className="text-[13px] leading-relaxed text-[var(--text)]">
                        {act.completion_note}
                      </p>
                    </div>
                  )}

                  {(act.attachments?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {act.attachments!.map((att) => (
                        <AuthorizedImage
                          key={att.id}
                          attachmentId={att.id}
                          alt={att.file_name}
                          className="h-20 w-24 rounded-[6px] object-cover border border-[var(--control)]"
                        />
                      ))}
                    </div>
                  )}

                  {hasFooterButtons && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--rule)] pt-3">
                      {canManageActions && act.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => startEditAction(act)}
                          className="inline-flex h-11 items-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-[var(--muted)]" />
                          Edit
                        </button>
                      )}
                      {isVerifierRole && !caseData.is_locked && act.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            setReopeningActionId(act.id)
                            setReopenActionReason('')
                            setReopenActionErr(null)
                          }}
                          className="inline-flex h-11 items-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-[var(--muted)]" />
                          Buka Ulang
                        </button>
                      )}
                      {act.can_complete && (
                        <button
                          type="button"
                          onClick={() => setCompletingAction(act)}
                          className="h-11 flex-1 sm:flex-none rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] cursor-pointer transition-colors"
                        >
                          Selesaikan Tindakan
                        </button>
                      )}
                    </div>
                  )}

                  {reopeningActionId === act.id && (
                    <form
                      onSubmit={handleReopenSingleAction}
                      className="mt-2 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] p-3 space-y-2"
                    >
                      <div className="text-[12px] font-medium text-[var(--text)]">
                        Buka ulang tindakan ini agar PIC memperbaiki hasil
                      </div>
                      {reopenActionErr && (
                        <div className="text-[12px] text-[var(--safety-danger-foreground)]">
                          {reopenActionErr}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={reopenActionReason}
                          onChange={(e) => setReopenActionReason(e.target.value)}
                          placeholder="Alasan membuka ulang tindakan..."
                          required
                          className="h-11 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={reopenActionBusy}
                            className="h-11 rounded-[6px] bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-ink)] disabled:opacity-50 cursor-pointer"
                          >
                            Konfirmasi
                          </button>
                          <button
                            type="button"
                            onClick={() => setReopeningActionId(null)}
                            className="h-11 rounded-[6px] border border-[var(--control)] px-3.5 text-[13px] text-[var(--muted)] cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {canManageActions && (
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Tambah Tindakan Baru</h2>
            <span className="text-[12px] text-[var(--faint)]">
              Pilih jenis, PIC pelaksana, dan tenggat
            </span>
          </div>
          <form onSubmit={handleAddAction} className="space-y-3.5">
            {actionErr && (
              <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
                {actionErr}
              </div>
            )}
            {actionSuccess && (
              <div
                role="status"
                className="flex items-start justify-between gap-2.5 rounded-[6px] border border-[var(--safety-safe-border)] bg-[var(--safety-safe-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--safety-safe-foreground)]"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionSuccess(null)}
                  aria-label="Tutup notifikasi"
                  className="shrink-0 rounded-[4px] p-0.5 opacity-75 hover:opacity-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="rounded-[6px] border border-[var(--border)] bg-[var(--ground)] p-3.5 space-y-2.5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">
                    Draf tindakan dari AI
                  </div>
                  <div className="text-[12px] text-[var(--faint)]">
                    Pilih draf lalu sesuaikan judul dan instruksi sebelum disimpan.
                  </div>
                </div>
                <AiAssistButton
                  onClick={() => actionSuggestions.mutate()}
                  loading={actionSuggestions.isPending}
                  label="Sarankan Tindakan"
                  loadingLabel="Meminta saran..."
                />
              </div>

              {aiActionsError && (
                <div
                  role="alert"
                  className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[12px] text-[var(--safety-danger-foreground)]"
                >
                  {aiActionsError}
                </div>
              )}

              {aiActions?.suggestions.map((suggestion, idx) => (
                <div
                  key={`${suggestion.title}-${idx}`}
                  role="status"
                  className="space-y-1.5 rounded-[6px] border border-[var(--rule)] bg-[var(--surface)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">
                        {suggestion.action_type_label}
                      </span>
                      <span className="text-[11px] text-[var(--faint)]">
                        {AI_PRIORITY_LABELS[suggestion.priority]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyAiAction(suggestion)}
                      className="h-11 rounded-[6px] border border-[var(--accent)] bg-[var(--surface)] px-3.5 text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--raised)] cursor-pointer transition-colors"
                    >
                      Gunakan draf
                    </button>
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">
                    {suggestion.title}
                  </div>
                  <div className="text-[12px] text-[var(--muted)]">{suggestion.description}</div>
                  <div className="text-[12px] text-[var(--faint)]">
                    Alasan: {suggestion.rationale}
                  </div>
                  {suggestion.suggested_pic_role && (
                    <div className="text-[11px] text-[var(--faint)]">
                      Peran PIC yang disarankan: {suggestion.suggested_pic_role}
                    </div>
                  )}
                </div>
              ))}
              {aiActions?.limitations.length ? (
                <div className="text-[11px] text-[var(--faint)]">
                  Keterbatasan: {aiActions.limitations.join(' · ')}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  Jenis Tindakan <span className="text-[var(--safety-danger)]">*</span>
                </label>
                <Select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ActionType)}
                >
                  {actionTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                      {ACTION_TYPE_HINTS[opt.value] ? ` — ${ACTION_TYPE_HINTS[opt.value]}` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  PIC Pelaksana <span className="text-[var(--safety-danger)]">*</span>
                </label>
                <Select
                  value={actionPicId}
                  onChange={(e) => setActionPicIdOverride(e.target.value)}
                  required
                >
                  <option value="">Pilih PIC pelaksana...</option>
                  {actionPicCandidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.role_label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  Tenggat Waktu <span className="font-normal text-[var(--faint)]">(Opsional)</span>
                </label>
                <div className="relative">
                  <Calendar
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                  />
                  {!actionDueAt && !actionDueFocused && (
                    <span className="pointer-events-none absolute left-9 right-8 top-1/2 -translate-y-1/2 truncate text-[14px] text-[var(--faint)]">
                      Pilih tanggal &amp; jam...
                    </span>
                  )}
                  <input
                    type="datetime-local"
                    value={actionDueAt}
                    onChange={(e) => setActionDueAt(e.target.value)}
                    onFocus={() => setActionDueFocused(true)}
                    onBlur={() => setActionDueFocused(false)}
                    aria-label="Tenggat waktu opsional"
                    className={`h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] pl-9 pr-3 text-[14px] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15 cursor-pointer ${
                      !actionDueAt && !actionDueFocused ? 'text-transparent' : 'text-[var(--text)]'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[var(--text)]">
                Judul Tindakan <span className="text-[var(--safety-danger)]">*</span>
              </label>
              <input
                type="text"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="Contoh: Pasang pelindung belt & periksa sensor..."
                required
                className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[var(--text)]">
                Instruksi Detail{' '}
                <span className="font-normal text-[var(--faint)]">(Opsional)</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  placeholder="Catatan langkah kerja atau alat yang dibutuhkan..."
                  className="h-11 w-full sm:flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="h-11 w-full sm:w-auto shrink-0 rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50 cursor-pointer"
                >
                  {actionBusy ? 'Menambah...' : 'Tambah Tindakan'}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <ModalDialog
        open={Boolean(editingAction)}
        onClose={() => setEditingAction(null)}
        title="Edit Tindakan CAPA"
        closeDisabled={editActionBusy}
      >
        <form onSubmit={handleSaveEditAction} className="space-y-4">
          {editActionErr && (
            <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
              {editActionErr}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[var(--text)]">
                Jenis Tindakan
              </label>
              <Select
                value={editActionType}
                onChange={(e) => setEditActionType(e.target.value as ActionType)}
              >
                {actionTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[var(--text)]">
                PIC Tindakan
              </label>
              <Select
                value={editActionPicId}
                onChange={(e) => setEditActionPicId(e.target.value)}
                required
              >
                <option value="">Pilih PIC...</option>
                {editActionPicCandidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role_label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-[var(--text)]">
              Judul Tindakan
            </label>
            <input
              type="text"
              value={editActionTitle}
              onChange={(e) => setEditActionTitle(e.target.value)}
              required
              className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-[var(--text)]">
              Instruksi / Deskripsi
            </label>
            <textarea
              rows={2}
              value={editActionDesc}
              onChange={(e) => setEditActionDesc(e.target.value)}
              className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-[var(--text)]">
              Tenggat Waktu
            </label>
            <input
              type="datetime-local"
              value={editActionDueAt}
              onChange={(e) => setEditActionDueAt(e.target.value)}
              className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingAction(null)}
              className="h-11 flex-1 rounded-[6px] border border-[var(--control)] text-[14px] text-[var(--text)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={editActionBusy}
              className="h-11 flex-1 rounded-[6px] bg-[var(--primary)] text-[14px] font-semibold text-[var(--primary-ink)] disabled:opacity-50"
            >
              {editActionBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {completingAction && (
        <CompleteActionModal
          action={completingAction}
          caseId={caseData.id}
          caseNumber={caseData.case_number}
          existingRootCause={caseData.root_cause}
          onClose={() => setCompletingAction(null)}
          onCompleted={onChanged}
        />
      )}
    </>
  )
}
