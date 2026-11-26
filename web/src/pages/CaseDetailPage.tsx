import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import { roleHomePath, useAuth } from '@/lib/auth-helpers'
import { useLanguage } from '@/lib/i18n-helpers'
import { useReferenceData } from '@/lib/reference'
import { caseKeys, userKeys } from '@/data/query-keys'
import { invalidateCaseMutation } from '@/data/invalidation'
import { CasePipelineTracker } from '@/components/safety/CasePipelineTracker'
import { SectionLoading } from '@/components/ui/waveform-loader'
import {
  CaseHeaderSection,
  CaseIncidentDetailsSection,
  CaseRootCauseSection,
} from '@/features/cases/CaseIncidentSection'
import { CaseTriagePanel } from '@/features/cases/CaseTriagePanel'
import { CaseCapaSection } from '@/features/cases/CaseCapaSection'
import { CaseReopenPanel, CaseVerificationPanel } from '@/features/cases/CaseVerificationPanel'
import { CaseSimilarSidebar } from '@/features/cases/CaseSimilarSidebar'
import type { SafetyCase } from '@/types/safetylog'

const ACTION_TYPES_EN: Record<string, string> = {
  temporary: 'Temporary',
  corrective: 'Corrective',
  preventive: 'Preventive',
}

const FALLBACK_ACTION_TYPES = [
  { value: 'temporary', label: 'Sementara' },
  { value: 'corrective', label: 'Korektif' },
  { value: 'preventive', label: 'Preventif' },
]

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang, pick } = useLanguage()
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()

  const caseQuery = useQuery({
    queryKey: caseKeys.detail(id ?? ''),
    queryFn: () => apiFetch<{ data: SafetyCase }>(`/cases/${id}`),
    enabled: Boolean(id),
  })

  const caseData = caseQuery.data?.data
  const available = caseData?.available_actions
  const isVerifierRole = user?.role === 'hse' || user?.role === 'admin'

  const assignableQuery = useQuery({
    queryKey: userKeys.list({ scope: 'assignable' }),
    queryFn: () =>
      apiFetch<{ data: Array<{ id: number; name: string; role: string; role_label: string }> }>(
        '/users/assignable',
      ),
    enabled: Boolean(available?.can_triage || available?.can_manage_actions),
  })

  const refreshCase = React.useCallback(() => {
    void invalidateCaseMutation(queryClient, id)
  }, [queryClient, id])

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
    return <SectionLoading label={pick('Memuat detail kasus...', 'Loading case details...')} className="py-16" />
  }

  if (caseQuery.isError || !caseData) {
    const errText =
      caseQuery.error instanceof ApiError
        ? caseQuery.error.message
        : pick('Kasus tidak ditemukan atau Anda tidak memiliki akses.', 'Case not found or you do not have access.')
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
          {pick('Kembali', 'Back')}
        </button>
      </div>
    )
  }

  const defaultPicId = caseData.risk_assessment.assigned_pic?.id
    ? String(caseData.risk_assessment.assigned_pic.id)
    : caseData.area?.pic_user?.id
      ? String(caseData.area.pic_user.id)
      : ''

  const riskConfigs = refQuery.data?.risk_configs ?? []
  const currentRiskConfig = caseData.risk_assessment.risk_level
    ? (riskConfigs.find((rc) => rc.level === caseData.risk_assessment.risk_level) ?? null)
    : null

  const canManageActions = Boolean(available?.can_manage_actions) && user?.role === 'supervisor'
  const assignableUsers = assignableQuery.data?.data ?? []
  const rawActionTypeOptions = refQuery.data?.action_types ?? FALLBACK_ACTION_TYPES
  const actionTypeOptions =
    lang === 'en'
      ? rawActionTypeOptions.map((opt) => ({
          ...opt,
          label: ACTION_TYPES_EN[opt.value] ?? opt.label,
        }))
      : rawActionTypeOptions
  const requiresPreventive = Boolean(currentRiskConfig?.requires_preventive_action)

  return (
    <div className="space-y-6">
      <CaseHeaderSection caseData={caseData} onBack={handleBack} />

      <CasePipelineTracker caseData={caseData} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        <div className="space-y-6 lg:col-span-2">
          <CaseIncidentDetailsSection caseData={caseData} />

          {available?.can_triage && (
            <CaseTriagePanel
              caseData={caseData}
              assignableUsers={assignableUsers}
              categories={refQuery.data?.categories ?? []}
              defaultPicId={defaultPicId}
              onTriaged={refreshCase}
            />
          )}

          <CaseRootCauseSection caseData={caseData} />

          <CaseCapaSection
            caseData={caseData}
            canManageActions={canManageActions}
            isVerifierRole={isVerifierRole}
            assignableUsers={assignableUsers}
            defaultPicId={defaultPicId}
            actionTypeOptions={actionTypeOptions}
            onChanged={refreshCase}
          />

          {caseData.status === 'pending_verification' && isVerifierRole && (
            <CaseVerificationPanel
              caseData={caseData}
              requiresPreventive={requiresPreventive}
              onVerified={refreshCase}
            />
          )}

          {caseData.status === 'closed' && (
            <CaseReopenPanel caseData={caseData} onReopened={refreshCase} />
          )}
        </div>

        <CaseSimilarSidebar caseData={caseData} showSimilar={user?.role !== 'reporter'} />
      </div>
    </div>
  )
}
