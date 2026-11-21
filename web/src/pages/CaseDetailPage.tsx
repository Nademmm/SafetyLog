import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Edit3,
  Lock,
  RotateCcw,
  UserCheck,
  X,
} from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { roleHomePath, useAuth } from '@/lib/auth-helpers'
import { formatDateTime } from '@/lib/format'
import { useReferenceData } from '@/lib/reference'
import { AuthorizedImage } from '@/components/safety/AuthorizedImage'
import { CasePipelineTracker } from '@/components/safety/CasePipelineTracker'
import { CompleteActionModal } from '@/components/safety/CompleteActionModal'
import { CaseStatusPill, OverduePill, RiskPill } from '@/components/safety/StatusPill'
import { Select } from '@/components/ui/FormField'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type {
  ActionType,
  AiActionSuggestions,
  AiEnvelope,
  AiSimilarAnalysis,
  AiTriageSuggestion,
  CaseAction,
  SafetyCase,
  SimilarCaseItem,
} from '@/types/safetylog'

const AI_DUPLICATE_LABELS: Record<
  AiSimilarAnalysis['matches'][number]['duplicate_assessment'],
  string
> = {
  possible_duplicate: 'Kemungkinan duplikat',
  needs_review: 'Perlu ditinjau',
  not_duplicate: 'Bukan duplikat',
}

const AI_PRIORITY_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: 'Prioritas tinggi',
  medium: 'Prioritas sedang',
  low: 'Prioritas rendah',
}

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()

  const caseQuery = useQuery({
    queryKey: ['case', id],
    queryFn: () => apiFetch<{ data: SafetyCase }>(`/cases/${id}`),
    enabled: Boolean(id),
  })

  const caseData = caseQuery.data?.data
  const available = caseData?.available_actions
  const isVerifierRole = user?.role === 'hse' || user?.role === 'admin'

  const similarQuery = useQuery({
    queryKey: ['case-similar', id],
    queryFn: () => apiFetch<{ data: SimilarCaseItem[] }>(`/cases/${id}/similar`),
    enabled: Boolean(id && caseData && user?.role !== 'reporter'),
  })

  const assignableQuery = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () =>
      apiFetch<{ data: Array<{ id: number; name: string; role_label: string }> }>(
        '/users/assignable',
      ),
    enabled: Boolean(available?.can_triage || available?.can_manage_actions),
  })

  const [triageMode, setTriageMode] = React.useState<'assess' | 'reject' | 'duplicate'>('assess')
  const [duplicateSearch, setDuplicateSearch] = React.useState('')

  const duplicateCandidatesQuery = useQuery({
    queryKey: ['cases', 'duplicate-picker', duplicateSearch],
    queryFn: () => {
      const p = new URLSearchParams({ per_page: '30' })
      if (duplicateSearch.trim()) p.set('q', duplicateSearch.trim())
      return apiFetch<{ data: SafetyCase[] }>(`/cases?${p.toString()}`)
    },
    enabled: Boolean(available?.can_triage && triageMode === 'duplicate'),
  })

  const refreshCase = () => {
    void queryClient.invalidateQueries({ queryKey: ['case', id] })
    void queryClient.invalidateQueries({ queryKey: ['cases'] })
    void queryClient.invalidateQueries({ queryKey: ['my-cases'] })
    void queryClient.invalidateQueries({ queryKey: ['my-actions'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const [aiTriageState, setAiTriageState] = React.useState<{
    caseId: string | undefined
    data: AiTriageSuggestion | null
    error: string | null
  }>({ caseId: undefined, data: null, error: null })
  const [aiSimilarState, setAiSimilarState] = React.useState<{
    caseId: string | undefined
    data: AiSimilarAnalysis | null
    error: string | null
  }>({ caseId: undefined, data: null, error: null })
  const [aiActionsState, setAiActionsState] = React.useState<{
    caseId: string | undefined
    data: AiActionSuggestions | null
    error: string | null
  }>({ caseId: undefined, data: null, error: null })

  const aiTriage = aiTriageState.caseId === id ? aiTriageState.data : null
  const aiTriageError = aiTriageState.caseId === id ? aiTriageState.error : null
  const aiSimilar = aiSimilarState.caseId === id ? aiSimilarState.data : null
  const aiSimilarError = aiSimilarState.caseId === id ? aiSimilarState.error : null
  const aiActions = aiActionsState.caseId === id ? aiActionsState.data : null
  const aiActionsError = aiActionsState.caseId === id ? aiActionsState.error : null

  const triageSuggestion = useMutation({
    mutationFn: () =>
      apiFetch<AiEnvelope<AiTriageSuggestion>>('/ai/triage-suggestion', {
        method: 'POST',
        json: { case_id: Number(id) },
      }),
    onSuccess: (response) => {
      setAiTriageState({ caseId: id, data: response.data, error: null })
    },
    onError: (error) => {
      setAiTriageState({
        caseId: id,
        data: null,
        error: error instanceof ApiError ? error.message : 'Gagal meminta saran triase AI.',
      })
    },
  })

  const similarAnalysis = useMutation({
    mutationFn: () =>
      apiFetch<AiEnvelope<AiSimilarAnalysis>>(`/cases/${id}/similar-analysis`, {
        method: 'POST',
        json: { limit: 5 },
      }),
    onSuccess: (response) => {
      setAiSimilarState({ caseId: id, data: response.data, error: null })
    },
    onError: (error) => {
      setAiSimilarState({
        caseId: id,
        data: null,
        error: error instanceof ApiError ? error.message : 'Gagal menganalisis kasus mirip.',
      })
    },
  })

  const actionSuggestions = useMutation({
    mutationFn: () =>
      apiFetch<AiEnvelope<AiActionSuggestions>>(`/cases/${id}/action-suggestions`, {
        method: 'POST',
      }),
    onSuccess: (response) => {
      setAiActionsState({ caseId: id, data: response.data, error: null })
    },
    onError: (error) => {
      setAiActionsState({
        caseId: id,
        data: null,
        error: error instanceof ApiError ? error.message : 'Gagal meminta saran tindakan AI.',
      })
    },
  })

  // Triage state (B-12) — derived defaults from caseData, overridden on user edit
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

  // Add Action state (B-14)
  const [actionType, setActionType] = React.useState<ActionType>('corrective')
  const [actionTitle, setActionTitle] = React.useState('')
  const [actionDescription, setActionDescription] = React.useState('')
  const [actionPicIdOverride, setActionPicIdOverride] = React.useState<string | null>(null)
  const [actionDueAt, setActionDueAt] = React.useState('')
  const [actionDueFocused, setActionDueFocused] = React.useState(false)
  const [actionBusy, setActionBusy] = React.useState(false)
  const [actionErr, setActionErr] = React.useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!actionSuccess) return
    const timer = window.setTimeout(() => setActionSuccess(null), 5000)
    return () => window.clearTimeout(timer)
  }, [actionSuccess])

  // Edit Action state
  const [editingAction, setEditingAction] = React.useState<CaseAction | null>(null)
  const [editActionType, setEditActionType] = React.useState<ActionType>('corrective')
  const [editActionTitle, setEditActionTitle] = React.useState('')
  const [editActionDesc, setEditActionDesc] = React.useState('')
  const [editActionPicId, setEditActionPicId] = React.useState('')
  const [editActionDueAt, setEditActionDueAt] = React.useState('')
  const [editActionBusy, setEditActionBusy] = React.useState(false)
  const [editActionErr, setEditActionErr] = React.useState<string | null>(null)

  // Reopen single completed action state
  const [reopeningActionId, setReopeningActionId] = React.useState<number | null>(null)
  const [reopenActionReason, setReopenActionReason] = React.useState('')
  const [reopenActionBusy, setReopenActionBusy] = React.useState(false)
  const [reopenActionErr, setReopenActionErr] = React.useState<string | null>(null)

  // Complete Action modal state (B-15 + 5 Why & 6M by PIC)
  const [completingAction, setCompletingAction] = React.useState<CaseAction | null>(null)

  // Verify / Reopen state (B-16, B-17)
  const [verifyMode, setVerifyMode] = React.useState<'approve' | 'reject'>('approve')
  const [learningSummary, setLearningSummary] = React.useState('')
  const [verifyRejectReason, setVerifyRejectReason] = React.useState('')
  const [rejectReopenActionIdsOverride, setRejectReopenActionIdsOverride] = React.useState<
    number[] | null
  >(null)
  const [verifyBusy, setVerifyBusy] = React.useState(false)
  const [verifyErr, setVerifyErr] = React.useState<string | null>(null)
  const [reopenReason, setReopenReason] = React.useState('')
  const [caseReopenActionIdsOverride, setCaseReopenActionIdsOverride] = React.useState<
    number[] | null
  >(null)
  const [reopenBusy, setReopenBusy] = React.useState(false)
  const [reopenErr, setReopenErr] = React.useState<string | null>(null)

  const defaultPicId = caseData?.risk_assessment.assigned_pic?.id
    ? String(caseData.risk_assessment.assigned_pic.id)
    : caseData?.area?.pic_user?.id
      ? String(caseData.area.pic_user.id)
      : ''

  const severity = severityOverride ?? caseData?.risk_assessment.severity ?? 3
  const likelihood = likelihoodOverride ?? caseData?.risk_assessment.likelihood ?? 3
  const triagePicId = triagePicIdOverride ?? defaultPicId
  const triageCategoryId =
    triageCategoryIdOverride ?? (caseData?.category?.id ? String(caseData.category.id) : '')
  const actionPicId = actionPicIdOverride ?? defaultPicId

  const defaultCompletedActionIds = React.useMemo(
    () => (caseData?.actions ?? []).filter((a) => a.status === 'completed').map((a) => a.id),
    [caseData],
  )
  const rejectReopenActionIds = rejectReopenActionIdsOverride ?? defaultCompletedActionIds
  const caseReopenActionIds = caseReopenActionIdsOverride ?? defaultCompletedActionIds

  const setSeverity = setSeverityOverride
  const setLikelihood = setLikelihoodOverride
  const setTriagePicId = setTriagePicIdOverride
  const setTriageCategoryId = setTriageCategoryIdOverride
  const setActionPicId = setActionPicIdOverride
  const setRejectReopenActionIds = (updater: (prev: number[]) => number[]) =>
    setRejectReopenActionIdsOverride((prev) => updater(prev ?? defaultCompletedActionIds))
  const setCaseReopenActionIds = (updater: (prev: number[]) => number[]) =>
    setCaseReopenActionIdsOverride((prev) => updater(prev ?? defaultCompletedActionIds))

  const riskConfigs = React.useMemo(
    () => refQuery.data?.risk_configs ?? [],
    [refQuery.data?.risk_configs],
  )

  const currentRiskLevel = caseData?.risk_assessment.risk_level ?? null
  const currentRiskConfig = React.useMemo(() => {
    if (!currentRiskLevel) return null
    return riskConfigs.find((rc) => rc.level === currentRiskLevel) ?? null
  }, [currentRiskLevel, riskConfigs])

  const applyAiTriage = () => {
    if (!aiTriage) return
    setSeverity(Math.min(aiTriage.scale_max, Math.max(1, aiTriage.severity)))
    setLikelihood(Math.min(aiTriage.scale_max, Math.max(1, aiTriage.likelihood)))
    if (refQuery.data?.categories.some((cat) => cat.id === aiTriage.category_id)) {
      setTriageCategoryId(String(aiTriage.category_id))
    }
  }

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
          ...(editActionDueAt ? { due_at: localInputToIso(editActionDueAt) } : {}),
        },
      })
      setEditingAction(null)
      refreshCase()
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
      refreshCase()
    } catch (err) {
      setReopenActionErr(
        err instanceof ApiError ? err.message : 'Gagal membuka ulang tindakan.',
      )
    } finally {
      setReopenActionBusy(false)
    }
  }

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseData) return
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
          due_at: localInputToIso(actionDueAt),
        },
      })
      setActionTitle('')
      setActionDescription('')
      setActionDueAt('')
      setActionSuccess(`Tindakan "${addedTitle}" berhasil ditambahkan untuk ${assignedPicName}.`)
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
            : {
                decision: 'reject',
                rejection_reason: verifyRejectReason.trim(),
                reopen_action_ids: rejectReopenActionIds,
              },
      })
      setVerifyRejectReason('')
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
        json: {
          reason: reopenReason.trim(),
          reopen_action_ids: caseReopenActionIds,
        },
      })
      setReopenReason('')
      refreshCase()
    } catch (err) {
      setReopenErr(err instanceof ApiError ? err.message : 'Gagal membuka ulang kasus.')
    } finally {
      setReopenBusy(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else if (user) {
      navigate(roleHomePath(user.role))
    } else {
      navigate('/')
    }
  }

  if (caseQuery.isLoading) {
    return <SectionLoading label="Memuat detail kasus..." className="py-16" />
  }

  if (caseQuery.isError || !caseData) {
    const errText =
      caseQuery.error instanceof ApiError
        ? caseQuery.error.message
        : 'Kasus tidak ditemukan atau Anda tidak memiliki akses.'
    return (
      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-6 space-y-3">
        <div className="text-[16px] font-semibold text-[var(--safety-danger-foreground)]">
          {errText}
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-11 items-center rounded-[6px] border border-[var(--control)] px-4 text-[14px] text-[var(--text)] hover:bg-[var(--raised)]"
        >
          Kembali
        </button>
      </div>
    )
  }

  const canManageActions = Boolean(available?.can_manage_actions) && user?.role !== 'hse'
  const assignableUsers = assignableQuery.data?.data ?? []
  const similarCases = similarQuery.data?.data ?? []
  const completedActions = (caseData.actions ?? []).filter((a) => a.status === 'completed')
  const actionTypeOptions = refQuery.data?.action_types ?? [
    { value: 'temporary', label: 'Sementara' },
    { value: 'corrective', label: 'Korektif' },
    { value: 'preventive', label: 'Preventif' },
  ]
  const actionTypeHints: Record<string, string> = {
    temporary: 'Penanganan cepat sementara',
    corrective: 'Perbaikan akar masalah',
    preventive: 'Cegah masalah berulang',
  }
  const requiresPreventive = Boolean(currentRiskConfig?.requires_preventive_action)
  const hasCompletedPreventive = completedActions.some((a) => a.action_type === 'preventive')
  const duplicateCandidates = (duplicateCandidatesQuery.data?.data ?? []).filter(
    (c) => c.id !== caseData.id && c.status !== 'rejected' && c.status !== 'duplicate',
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-11 items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali</span>
        </button>

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
              {caseData.machine
                ? `${caseData.machine.code} — ${caseData.machine.name}`
                : 'Detail Kasus'}
            </h1>
            <div className="mt-1 text-[13px] text-[var(--faint)]">
              {caseData.area?.name || 'Area'}
              {caseData.area?.pic_user ? ` (PIC Area: ${caseData.area.pic_user.name})` : ''} ·
              Jenis: {caseData.case_type?.name} · Dilaporkan oleh {caseData.reporter?.name} pada{' '}
              {formatDateTime(caseData.reported_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Status Context Banners: Rejected / Duplicate / Reopened */}
      {caseData.status === 'rejected' && (
        <div className="rounded-[8px] border border-[var(--control)] bg-[var(--raised)] p-4 space-y-1">
          <div className="text-[13px] font-semibold text-[var(--text)]">Kasus Ditolak</div>
          <p className="text-[13px] text-[var(--muted)]">
            Alasan: {caseData.risk_assessment.rejection_reason || 'Tidak ada catatan alasan.'}
          </p>
        </div>
      )}

      {caseData.status === 'duplicate' && (
        <div className="rounded-[8px] border border-[var(--control)] bg-[var(--raised)] p-4 space-y-1.5">
          <div className="text-[13px] font-semibold text-[var(--text)]">
            Kasus Ditandai sebagai Duplikat
          </div>
          {caseData.risk_assessment.duplicate_of && (
            <div className="text-[13px] text-[var(--muted)]">
              Kasus rujukan:{' '}
              <Link
                to={`/cases/${caseData.risk_assessment.duplicate_of.id}`}
                className="font-mono font-semibold text-[var(--accent)] hover:underline"
              >
                {caseData.risk_assessment.duplicate_of.case_number}
              </Link>{' '}
              ({caseData.risk_assessment.duplicate_of.status_label})
            </div>
          )}
          {caseData.risk_assessment.rejection_reason && (
            <p className="text-[13px] text-[var(--muted)]">
              Catatan: {caseData.risk_assessment.rejection_reason}
            </p>
          )}
        </div>
      )}

      {caseData.verification.reopen_reason && caseData.status !== 'closed' && (
        <div className="rounded-[8px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-4 space-y-1 text-[13px] text-[var(--safety-warning-foreground)]">
          <div className="font-semibold">Kasus Ini Pernah Dibuka Ulang</div>
          <p>
            Alasan: {caseData.verification.reopen_reason}
            {caseData.verification.reopened_by
              ? ` · Oleh ${caseData.verification.reopened_by.name} (${formatDateTime(caseData.verification.reopened_at)})`
              : ''}
          </p>
        </div>
      )}

      {/* Industrial Closed-Loop Case Pipeline Visualization */}
      <CasePipelineTracker caseData={caseData} />

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Left 2 Columns */}
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
              {caseData.area?.pic_user && (
                <span className="rounded-[4px] border border-[var(--control)] bg-[var(--ground)] px-2.5 py-1 text-[var(--muted)]">
                  PIC Area: {caseData.area.pic_user.name}
                </span>
              )}
              {caseData.risk_assessment.assigned_pic && (
                <span className="rounded-[4px] border border-[var(--control)] bg-[var(--ground)] px-2.5 py-1 text-[var(--muted)]">
                  PIC Kasus: {caseData.risk_assessment.assigned_pic.name}
                </span>
              )}
            </div>

            {(caseData.attachments?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[12px] text-[var(--faint)]">
                  Foto Lampiran ({caseData.attachments!.length}) · Ketuk foto untuk membuka ukuran
                  penuh
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {caseData.attachments!.map((att) => (
                    <AuthorizedImage
                      key={att.id}
                      attachmentId={att.id}
                      alt={att.file_name}
                      className="h-32 w-full rounded-[6px] object-cover border border-[var(--control)]"
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Triage Panel (B-12) */}
          {available?.can_triage && (
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
                      <div className="text-[13px] font-semibold text-[var(--text)]">
                        Saran triase AI
                      </div>
                      <div className="text-[12px] text-[var(--faint)]">
                        Rekomendasi awal, tetap tinjau dan simpan melalui triase resmi.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triageSuggestion.mutate()}
                      disabled={triageSuggestion.isPending}
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
                              onClick={() => setSeverity(n)}
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
                              onClick={() => setLikelihood(n)}
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
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[13px] font-semibold text-[var(--text)]">
                            Tunjuk PIC Kasus
                          </label>
                          {caseData.area?.pic_user && (
                            <button
                              type="button"
                              onClick={() => setTriagePicId(String(caseData.area!.pic_user!.id))}
                              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Gunakan PIC Area
                            </button>
                          )}
                        </div>
                        <Select
                          value={triagePicId}
                          onChange={(e) => setTriagePicId(e.target.value)}
                        >
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
                          onChange={(e) => setTriageCategoryId(e.target.value)}
                        >
                          <option value="">Pilih kategori...</option>
                          {(refQuery.data?.categories ?? []).map((cat) => (
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
                              {cand.case_number} — {cand.machine?.code || 'Mesin'} (
                              {cand.status_label})
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
          )}

          {/* Root Cause 5 Why & 6M */}
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

          {/* CAPA Actions List (B-14, B-15) */}
          <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-[var(--text)]">
                Tindakan Korektif &amp; Preventif (CAPA)
              </h2>
              <span className="rounded-[6px] border border-[var(--border)] bg-[var(--ground)] px-3 py-1 font-mono text-[13px] font-semibold text-[var(--text)] tabular-nums">
                {caseData.actions?.length ?? 0} tindakan
              </span>
            </div>

            {(caseData.actions?.length ?? 0) === 0 ? (
              <div className="rounded-[6px] border border-dashed border-[var(--control)] p-4 text-[13px] text-[var(--faint)]">
                Belum ada tindakan CAPA.{' '}
                {caseData.status === 'new' ? 'Lakukan triase terlebih dahulu.' : ''}
              </div>
            ) : (
              <div className="divide-y divide-[var(--rule)]">
                {caseData.actions!.map((act) => (
                  <div key={act.id} className="py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[12px] font-medium text-[var(--muted)]">
                          {act.action_type_label}
                        </span>
                        <span className="text-[14px] font-medium text-[var(--text)]">
                          {act.title}
                        </span>
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

                    {act.description && (
                      <p className="text-[13px] text-[var(--muted)]">{act.description}</p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--faint)]">
                      <span>
                        PIC: <strong className="text-[var(--muted)]">{act.pic?.name || '—'}</strong>{' '}
                        · Tenggat: {formatDateTime(act.due_at)}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {canManageActions && act.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => startEditAction(act)}
                            className="inline-flex h-11 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
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
                            className="inline-flex h-11 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Buka Ulang
                          </button>
                        )}
                        {act.can_complete && (
                          <button
                            type="button"
                            onClick={() => setCompletingAction(act)}
                            className="h-11 flex-1 sm:flex-none rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] cursor-pointer"
                          >
                            Selesaikan Tindakan
                          </button>
                        )}
                      </div>
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

                    {/* Inline Reopen Single Action Prompt */}
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
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Add Action Form (Box Terpisah) */}
          {canManageActions && (
            <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">
                  Tambah Tindakan Baru
                </h2>
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
                    <button
                      type="button"
                      onClick={() => actionSuggestions.mutate()}
                      disabled={actionSuggestions.isPending}
                      className="h-11 shrink-0 rounded-[6px] border border-[var(--accent)] bg-[var(--surface)] px-3.5 text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--raised)] disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {actionSuggestions.isPending ? 'Meminta saran...' : 'Sarankan Tindakan'}
                    </button>
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
                          {actionTypeHints[opt.value] ? ` — ${actionTypeHints[opt.value]}` : ''}
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
                      onChange={(e) => setActionPicId(e.target.value)}
                      required
                    >
                      <option value="">Pilih PIC pelaksana...</option>
                      {assignableUsers.map((u) => (
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
                          !actionDueAt && !actionDueFocused
                            ? 'text-transparent'
                            : 'text-[var(--text)]'
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
                    Instruksi Detail <span className="font-normal text-[var(--faint)]">(Opsional)</span>
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

          {/* Verification Panel (hanya ditampilkan untuk peran Verifikator: K3 & Admin) */}
          {caseData.status === 'pending_verification' && isVerifierRole && (
            <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
              <h2 className="text-[16px] font-semibold text-[var(--text)]">
                Verifikasi &amp; Tutup Kasus
              </h2>

              {available?.is_verifier_blocked_as_pic && (
                <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]">
                  Anda terdaftar sebagai PIC pada kasus/tindakan ini. Sesuai aturan produk,
                  Verifikator tidak boleh sama dengan PIC.
                </div>
              )}

              {requiresPreventive && !hasCompletedPreventive && (
                <div className="flex items-start gap-2.5 rounded-[6px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-3.5 text-[13px] text-[var(--safety-warning-foreground)]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Kasus berisiko <strong>{caseData.risk_assessment.risk_level_label}</strong>{' '}
                    wajib memiliki minimal 1 tindakan <strong>Preventif</strong> yang sudah selesai
                    sebelum dapat disetujui dan ditutup.
                  </span>
                </div>
              )}

              {verifyErr && (
                <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]">
                  {verifyErr}
                </div>
              )}

              {available?.can_verify && (
                <div className="space-y-4">
                  {/* Pilihan keputusan: hanya satu form tampil pada satu waktu */}
                  <div role="radiogroup" aria-label="Keputusan verifikasi" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={verifyMode === 'approve'}
                      onClick={() => {
                        setVerifyMode('approve')
                        setVerifyErr(null)
                      }}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border px-3.5 text-[14px] font-semibold transition-colors cursor-pointer ${
                        verifyMode === 'approve'
                          ? 'border-[var(--safety-safe)] bg-[var(--safety-safe-bg)] text-[var(--safety-safe-foreground)]'
                          : 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Setujui &amp; Tutup</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={verifyMode === 'reject'}
                      onClick={() => {
                        setVerifyMode('reject')
                        setVerifyErr(null)
                      }}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border px-3.5 text-[14px] font-semibold transition-colors cursor-pointer ${
                        verifyMode === 'reject'
                          ? 'border-[var(--safety-danger)] bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)]'
                          : 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                      }`}
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" />
                      <span>Tolak &amp; Kembalikan</span>
                    </button>
                  </div>

                  {verifyMode === 'approve' ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-semibold text-[var(--text)]">
                          Ringkasan Pembelajaran <span className="text-[var(--safety-danger)]">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={learningSummary}
                          onChange={(e) => setLearningSummary(e.target.value)}
                          placeholder="Apa pelajaran utama agar masalah ini tidak terulang?"
                          className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={verifyBusy || (requiresPreventive && !hasCompletedPreventive)}
                        onClick={() => void handleVerify('approve')}
                        className="h-11 w-full sm:w-auto rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50 cursor-pointer"
                      >
                        {verifyBusy ? 'Memproses...' : 'Setujui & Tutup Kasus'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedActions.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[13px] font-semibold text-[var(--text)]">
                            Tindakan yang dibuka ulang
                          </div>
                          <div className="divide-y divide-[var(--rule)] rounded-[6px] border border-[var(--control)]">
                            {completedActions.map((act) => {
                              const checked = rejectReopenActionIds.includes(act.id)
                              return (
                                <label
                                  key={act.id}
                                  className="flex min-h-[48px] cursor-pointer items-center gap-3 px-3.5 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-row)]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setRejectReopenActionIds((prev) =>
                                        checked
                                          ? prev.filter((x) => x !== act.id)
                                          : [...prev, act.id],
                                      )
                                    }
                                    className="h-5 w-5 shrink-0 rounded-[4px] accent-[var(--accent)] cursor-pointer"
                                  />
                                  <span className="min-w-0">
                                    <span className="font-semibold">{act.action_type_label}</span>
                                    <span className="text-[var(--muted)]"> · {act.title}</span>
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-semibold text-[var(--text)]">
                          Alasan Penolakan <span className="text-[var(--safety-danger)]">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={verifyRejectReason}
                          onChange={(e) => setVerifyRejectReason(e.target.value)}
                          placeholder="Jelaskan bagian mana yang perlu diperbaiki PIC..."
                          className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={verifyBusy}
                        onClick={() => void handleVerify('reject')}
                        className="h-11 w-full sm:w-auto rounded-[6px] bg-[var(--safety-danger)] px-5 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        {verifyBusy ? 'Memproses...' : 'Tolak & Kembalikan ke PIC'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Closed & Reopen Panel (B-17) */}
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
                <form
                  onSubmit={handleReopen}
                  className="border-t border-[var(--rule)] pt-4 space-y-3"
                >
                  <div className="text-[13px] font-semibold text-[var(--text)]">Buka Ulang Kasus</div>
                  {reopenErr && (
                    <div className="text-[12px] text-[var(--safety-danger-foreground)]">
                      {reopenErr}
                    </div>
                  )}
                  {completedActions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[13px] font-medium text-[var(--muted)]">
                        Pilih tindakan yang perlu dibuka ulang:
                      </div>
                      <div className="divide-y divide-[var(--rule)] rounded-[6px] border border-[var(--control)]">
                        {completedActions.map((act) => {
                          const checked = caseReopenActionIds.includes(act.id)
                          return (
                            <label
                              key={act.id}
                              className="flex min-h-[48px] cursor-pointer items-center gap-3 px-3.5 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-row)]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setCaseReopenActionIds((prev) =>
                                    checked
                                      ? prev.filter((x) => x !== act.id)
                                      : [...prev, act.id],
                                  )
                                }
                                className="h-5 w-5 shrink-0 rounded-[4px] accent-[var(--accent)] cursor-pointer"
                              />
                              <span className="min-w-0">
                                <span className="font-semibold">{act.action_type_label}</span>
                                <span className="text-[var(--muted)]"> · {act.title}</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Alasan membuka ulang kasus..."
                      required
                      className="h-11 w-full sm:flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                    />
                    <button
                      type="submit"
                      disabled={reopenBusy}
                      className="h-11 w-full sm:w-auto rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
                    >
                      Buka Ulang
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Similar Cases (hidden for Reporters) & Append-Only Audit Log */}
        <div className="space-y-6">
          {user?.role !== 'reporter' && (
            <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">Kasus Mirip</h2>
                  <p className="text-[12px] text-[var(--faint)]">
                    Berdasarkan kemiripan teks deskripsi &amp; mesin (non-AI).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => similarAnalysis.mutate()}
                  disabled={similarAnalysis.isPending}
                  className="h-11 shrink-0 rounded-[6px] border border-[var(--accent)] bg-[var(--surface)] px-3.5 text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--raised)] disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {similarAnalysis.isPending ? 'Menganalisis...' : 'Analisis AI'}
                </button>
              </div>
              <div className="divide-y divide-[var(--rule)]">
                {similarQuery.isLoading ? (
                  <div className="py-2 text-[13px] text-[var(--faint)]">Mencari kasus mirip...</div>
                ) : similarCases.length === 0 ? (
                  <div className="py-2 text-[13px] text-[var(--faint)]">
                    Tidak ada kasus mirip ditemukan.
                  </div>
                ) : (
                  similarCases.map((sc) => (
                    <Link
                      key={sc.id}
                      to={`/cases/${sc.id}`}
                      className="block py-2.5 hover:bg-[var(--hover-row)] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-mono text-[var(--accent)] tabular-nums">
                          {sc.case_number}
                          {sc.machine?.code ? ` · ${sc.machine.code}` : ''}
                        </span>
                        <span className="font-mono text-[12px] rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[var(--text)] tabular-nums">
                          {sc.similarity_percent}% cocok
                        </span>
                      </div>
                      <div className="text-[13px] text-[var(--text)] line-clamp-2">
                        {sc.description}
                      </div>
                      {sc.matching_reasons?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sc.matching_reasons.map((r) => (
                            <span
                              key={r}
                              className="rounded-[4px] bg-[var(--ground)] px-2 py-0.5 text-[12px] text-[var(--muted)]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>

              {aiSimilarError && (
                <div
                  role="alert"
                  className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[12px] text-[var(--safety-danger-foreground)]"
                >
                  {aiSimilarError}
                </div>
              )}

              {aiSimilar && (
                <div role="status" className="space-y-3 border-t border-[var(--rule)] pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-[var(--text)]">Analisis AI</div>
                    <div className="text-[11px] text-[var(--faint)]">Perlu ditinjau</div>
                  </div>

                  {aiSimilar.possible_duplicate && (
                    <div className="rounded-[6px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] px-3 py-2 text-[12px] text-[var(--safety-warning-foreground)]">
                      AI menemukan kemungkinan duplikat. Periksa sebelum melanjutkan.
                    </div>
                  )}

                  <p className="text-[12px] text-[var(--muted)]">{aiSimilar.summary}</p>

                  {aiSimilar.matches.length === 0 ? (
                    <div className="rounded-[6px] bg-[var(--ground)] px-3 py-2 text-[12px] text-[var(--faint)]">
                      Tidak ada kandidat kasus historis yang relevan untuk dianalisis.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiSimilar.matches.map((match) => (
                        <div
                          key={`ai-${match.id}`}
                          className="space-y-1.5 rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link
                              to={`/cases/${match.id}`}
                              className="font-mono text-[12px] font-semibold text-[var(--accent)] hover:underline"
                            >
                              {match.case_number}
                            </Link>
                            <span className="text-[11px] font-medium text-[var(--text)] tabular-nums">
                              {match.similarity_percent}% mirip
                            </span>
                          </div>
                          <div className="text-[12px] text-[var(--muted)]">
                            {match.similarity_reason}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[11px] text-[var(--text)]">
                              {AI_DUPLICATE_LABELS[match.duplicate_assessment]}
                            </span>
                            {match.database_reasons.length > 0 && (
                              <span className="text-[11px] text-[var(--faint)]">
                                Dasar database: {match.database_reasons.join(', ')}
                              </span>
                            )}
                          </div>
                          {match.differences.length > 0 && (
                            <div className="text-[11px] text-[var(--faint)]">
                              Perbedaan: {match.differences.join(' · ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">
              Riwayat Perubahan (Audit Log)
            </h2>
            <div className="divide-y divide-[var(--rule)]">
              {(caseData.status_histories ?? []).length === 0 ? (
                <div className="py-2 text-[13px] text-[var(--faint)]">
                  Belum ada riwayat perubahan.
                </div>
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

      {/* Edit Action Modal */}
      {editingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!editActionBusy) setEditingAction(null)
          }}
        >
          <form
            onSubmit={handleSaveEditAction}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[var(--text)]">Edit Tindakan CAPA</h2>
              <button
                type="button"
                onClick={() => setEditingAction(null)}
                aria-label="Tutup"
                className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[var(--control)] text-[var(--muted)] hover:bg-[var(--raised)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editActionErr && (
              <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
                {editActionErr}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">Jenis Tindakan</label>
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
                <label className="block text-[13px] font-semibold text-[var(--text)]">PIC Tindakan</label>
                <Select
                  value={editActionPicId}
                  onChange={(e) => setEditActionPicId(e.target.value)}
                  required
                >
                  <option value="">Pilih PIC...</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[var(--text)]">Judul Tindakan</label>
              <input
                type="text"
                value={editActionTitle}
                onChange={(e) => setEditActionTitle(e.target.value)}
                required
                className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[var(--text)]">Instruksi / Deskripsi</label>
              <textarea
                rows={2}
                value={editActionDesc}
                onChange={(e) => setEditActionDesc(e.target.value)}
                className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[var(--text)]">Tenggat Waktu</label>
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
        </div>
      )}

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
