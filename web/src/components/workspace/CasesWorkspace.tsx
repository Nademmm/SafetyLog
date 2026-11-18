import * as React from 'react'
import {
  FolderKanban,
  Search,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  RotateCcw,
  History,
  UserCheck,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CaseStatusBadge,
  RiskBadge,
  type CaseStatus,
  type RiskLevel,
} from '@/components/ui/risk-badge'
import { type AuthSession, getUserPermissions } from '@/lib/qr-flow'
import {
  type ReferenceDataPayload,
  type SafetyCaseItem,
  type SimilarCaseItem,
  type SimpleUserRef,
  createCaseAction,
  fetchAllCases,
  fetchAssignableUsers,
  fetchCaseDetail,
  fetchMyCases,
  fetchReferenceData,
  fetchSimilarCases,
  reopenCase,
  submitCaseTriage,
  submitRootCause,
  verifyCase,
} from '@/lib/role-api'

export interface CasesWorkspaceProps {
  mode: 'my-cases' | 'all-cases'
  session: AuthSession
}

export function CasesWorkspace({ mode, session }: CasesWorkspaceProps) {
  const perms = getUserPermissions(session.user)
  const isAllCasesMode = mode === 'all-cases' && perms.view_all_cases

  const [cases, setCases] = React.useState<SafetyCaseItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionMsg, setActionMsg] = React.useState<string | null>(null)

  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')
  const [riskFilter, setRiskFilter] = React.useState<string>('')

  const [selectedCase, setSelectedCase] = React.useState<SafetyCaseItem | null>(null)
  const [detailLoading, setDetailLoading] = React.useState<boolean>(false)
  const [similarCases, setSimilarCases] = React.useState<SimilarCaseItem[]>([])
  const [assignableUsers, setAssignableUsers] = React.useState<SimpleUserRef[]>([])
  const [referenceData, setReferenceData] = React.useState<ReferenceDataPayload | null>(null)

  // Triage form state (Supervisor & Admin)
  const [triageDecision, setTriageDecision] = React.useState<'assess' | 'reject'>('assess')
  const [severity, setSeverity] = React.useState<number>(3)
  const [likelihood, setLikelihood] = React.useState<number>(3)
  const [categoryId, setCategoryId] = React.useState<string>('')
  const [assignedPicId, setAssignedPicId] = React.useState<string>('')
  const [rejectionReason, setRejectionReason] = React.useState<string>('')

  // 5-Why / Root Cause state
  const [rootCauseCategory, setRootCauseCategory] = React.useState<string>('mesin')
  const [why1, setWhy1] = React.useState<string>('')
  const [why2, setWhy2] = React.useState<string>('')
  const [why3, setWhy3] = React.useState<string>('')
  const [rootCauseSummary, setRootCauseSummary] = React.useState<string>('')

  // Add Action state
  const [newActionType, setNewActionType] = React.useState<'corrective' | 'preventive'>('corrective')
  const [newActionTitle, setNewActionTitle] = React.useState<string>('')
  const [newActionDesc, setNewActionDesc] = React.useState<string>('')
  const [newActionPicId, setNewActionPicId] = React.useState<string>('')
  const [newActionDueAt, setNewActionDueAt] = React.useState<string>('')

  // Verify / Reopen state (K3 / Verifikator & Admin)
  const [verifyDecision, setVerifyDecision] = React.useState<'approve' | 'reject'>('approve')
  const [learningSummary, setLearningSummary] = React.useState<string>('')
  const [verifyRejectReason, setVerifyRejectReason] = React.useState<string>('')
  const [reopenReason, setReopenReason] = React.useState<string>('')

  const [submitting, setSubmitting] = React.useState<boolean>(false)

  const loadList = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = isAllCasesMode
        ? await fetchAllCases(session, {
            q: searchQuery,
            status: statusFilter || undefined,
            risk_level: riskFilter || undefined,
          })
        : await fetchMyCases(session, {
            q: searchQuery,
            status: statusFilter || undefined,
          })
      setCases(res?.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar kasus.')
    } finally {
      setLoading(false)
    }
  }, [isAllCasesMode, session, searchQuery, statusFilter, riskFilter])

  React.useEffect(() => {
    void loadList()
  }, [loadList])

  const openDetail = React.useCallback(
    async (caseId: number) => {
      setDetailLoading(true)
      setError(null)
      setActionMsg(null)
      try {
        const detail = await fetchCaseDetail(session, caseId)
        setSelectedCase(detail)
        setRootCauseSummary(detail.root_cause?.root_cause_summary ?? '')
        setRootCauseCategory(detail.root_cause?.root_cause_category ?? 'mesin')
        setWhy1(detail.root_cause?.five_whys?.[0] ?? '')
        setWhy2(detail.root_cause?.five_whys?.[1] ?? '')
        setWhy3(detail.root_cause?.five_whys?.[2] ?? '')
        const defaultPicId = detail.risk_assessment?.assigned_pic?.id ?? detail.area?.pic_user?.id
        setAssignedPicId(defaultPicId ? String(defaultPicId) : '')
        setNewActionPicId(defaultPicId ? String(defaultPicId) : '')

        if (perms.view_all_cases) {
          const [sim, users, ref] = await Promise.all([
            fetchSimilarCases(session, caseId).catch(() => []),
            fetchAssignableUsers(session).catch(() => []),
            fetchReferenceData(session).catch(() => null),
          ])
          setSimilarCases(sim)
          setAssignableUsers(users)
          setReferenceData(ref)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat detail kasus.')
      } finally {
        setDetailLoading(false)
      }
    },
    [perms.view_all_cases, session]
  )

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase) return
    setSubmitting(true)
    setError(null)
    setActionMsg(null)
    try {
      const res = await submitCaseTriage(session, selectedCase.id, {
        decision: triageDecision,
        severity: triageDecision === 'assess' ? severity : undefined,
        likelihood: triageDecision === 'assess' ? likelihood : undefined,
        category_id: categoryId ? Number(categoryId) : null,
        assigned_pic_id: assignedPicId ? Number(assignedPicId) : null,
        rejection_reason: triageDecision === 'reject' ? rejectionReason : undefined,
      })
      setActionMsg(res.message || 'Triase kasus tersimpan.')
      await openDetail(selectedCase.id)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan triase.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRootCauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase) return
    const whys = [why1, why2, why3].map((w) => w.trim()).filter(Boolean)
    if (whys.length === 0 || rootCauseSummary.trim().length < 5) {
      setError('Isi minimal 1 analisis Mengapa dan ringkasan akar masalah.')
      return
    }
    setSubmitting(true)
    setError(null)
    setActionMsg(null)
    try {
      const res = await submitRootCause(session, selectedCase.id, {
        root_cause_category: rootCauseCategory,
        five_whys: whys,
        root_cause_summary: rootCauseSummary.trim(),
      })
      setActionMsg(res.message || 'Akar masalah tersimpan.')
      await openDetail(selectedCase.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan akar masalah.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase || !newActionPicId) {
      setError('Pilih PIC untuk tindakan ini.')
      return
    }
    setSubmitting(true)
    setError(null)
    setActionMsg(null)
    try {
      const res = await createCaseAction(session, selectedCase.id, {
        action_type: newActionType,
        title: newActionTitle.trim(),
        description: newActionDesc.trim() || undefined,
        pic_user_id: Number(newActionPicId),
        due_at: newActionDueAt || undefined,
      })
      setActionMsg(res.message || 'Tindakan baru ditambahkan.')
      setNewActionTitle('')
      setNewActionDesc('')
      await openDetail(selectedCase.id)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan tindakan.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase) return
    setSubmitting(true)
    setError(null)
    setActionMsg(null)
    try {
      const res = await verifyCase(session, selectedCase.id, {
        decision: verifyDecision,
        learning_summary: verifyDecision === 'approve' ? learningSummary.trim() : undefined,
        rejection_reason: verifyDecision === 'reject' ? verifyRejectReason.trim() : undefined,
      })
      setActionMsg(res.message || 'Keputusan verifikasi tersimpan.')
      setLearningSummary('')
      setVerifyRejectReason('')
      await openDetail(selectedCase.id)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memverifikasi kasus.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase) return
    setSubmitting(true)
    setError(null)
    setActionMsg(null)
    try {
      const res = await reopenCase(session, selectedCase.id, reopenReason.trim())
      setActionMsg(res.message || 'Kasus dibuka kembali.')
      setReopenReason('')
      await openDetail(selectedCase.id)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka ulang kasus.')
    } finally {
      setSubmitting(false)
    }
  }

  if (selectedCase) {
    const isLocked =
      selectedCase.is_locked ||
      selectedCase.status === 'closed' ||
      selectedCase.status === 'rejected' ||
      selectedCase.status === 'duplicate'
    const isUserActionPic = (selectedCase.actions ?? []).some(
      (a) => a.pic?.id === session.user.id
    )
    const isCasePic =
      selectedCase.available_actions?.is_verifier_blocked_as_pic ??
      (selectedCase.risk_assessment?.assigned_pic?.id === session.user.id || isUserActionPic)
    const riskLevel = selectedCase.risk_assessment?.risk_level ?? null
    const riskLabel = selectedCase.risk_assessment?.risk_level_label ?? null
    const riskScore = selectedCase.risk_assessment?.risk_score ?? null
    const needsPreventive = riskLevel === 'medium' || riskLevel === 'high'
    const hasCompletedPreventive = (selectedCase.actions ?? []).some(
      (a) => a.action_type === 'preventive' && a.status === 'completed'
    )
    const canTriageNow =
      selectedCase.available_actions?.can_triage ??
      (perms.triage_case &&
        !isLocked &&
        (selectedCase.status === 'new' || selectedCase.status === 'assessed'))
    const canManageActionsNow =
      selectedCase.available_actions?.can_manage_actions ??
      (perms.manage_actions && !isLocked && selectedCase.status !== 'new')
    const canVerifyNow =
      selectedCase.available_actions?.can_verify ??
      (perms.verify_case && selectedCase.status === 'pending_verification' && !isCasePic)
    const canReopenNow =
      selectedCase.available_actions?.can_reopen ??
      (perms.reopen_case && selectedCase.status === 'closed')

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedCase(null)
              setActionMsg(null)
              setError(null)
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2px]" />
            Kembali ke Daftar Kasus
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={(selectedCase.status_label || 'Baru') as CaseStatus} />
            {riskLabel && (
              <RiskBadge
                level={riskLabel as RiskLevel}
                score={riskScore ?? undefined}
              />
            )}
            {isLocked && <Badge variant="secondary">Terkunci (Selesai / Ditolak)</Badge>}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground">
            {error}
          </div>
        )}

        {actionMsg && (
          <div role="status" className="rounded-input border border-safety-safe-border bg-safety-safe-bg p-3 text-body text-safety-safe-foreground">
            {actionMsg}
          </div>
        )}

        {detailLoading ? (
          <Card className="p-6 text-center text-steel-muted">Memuat detail kasus...</Card>
        ) : (
          <>
            <Card className="bg-graphite">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-h3 font-bold text-industrial-orange">
                    {selectedCase.case_number}
                  </span>
                  <span className="font-mono text-caption text-steel-muted">
                    Dilaporkan: {selectedCase.reported_at ?? '-'}
                  </span>
                </div>
                <CardTitle className="text-h3 text-off-white">
                  {selectedCase.machine?.code} - {selectedCase.machine?.name}
                </CardTitle>
                <CardDescription>
                  {selectedCase.case_type?.name} | Area: {selectedCase.area?.name ?? '-'} | Pelapor:{' '}
                  {selectedCase.reporter?.name ?? '-'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-body text-off-white whitespace-pre-line">
                  {selectedCase.description}
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-caption">
                  <div className="rounded-sm border border-charcoal-border bg-carbon p-2.5">
                    <div className="text-steel-muted">Mesin Berhenti?</div>
                    <div className="font-semibold text-off-white">
                      {selectedCase.is_machine_stopped ? 'Ya, Berhenti' : 'Tidak'}
                    </div>
                  </div>
                  <div className="rounded-sm border border-charcoal-border bg-carbon p-2.5">
                    <div className="text-steel-muted">Ada Orang Terdampak?</div>
                    <div className="font-semibold text-off-white">
                      {selectedCase.has_affected_people ? 'Ada' : 'Tidak Ada'}
                    </div>
                  </div>
                  <div className="rounded-sm border border-charcoal-border bg-carbon p-2.5">
                    <div className="text-steel-muted flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-industrial-orange stroke-[2px]" />
                      PIC Area / Kasus
                    </div>
                    <div className="font-semibold text-off-white">
                      {selectedCase.risk_assessment?.assigned_pic?.name ??
                        selectedCase.area?.pic_user?.name ??
                        'Belum ditugaskan'}
                    </div>
                  </div>
                </div>

                {selectedCase.verification?.learning_summary && (
                  <div className="rounded-sm border border-safety-safe-border bg-safety-safe-bg/30 p-3 text-caption text-off-white">
                    <div className="font-semibold text-safety-safe-foreground">
                      Ringkasan Pembelajaran:
                    </div>
                    <p className="mt-1 text-steel-muted">
                      {selectedCase.verification.learning_summary}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Similar Cases (PostgreSQL pg_trgm, no AI) */}
            {perms.view_all_cases && similarCases.length > 0 && (
              <Card className="bg-graphite">
                <CardHeader className="pb-2">
                  <CardTitle className="text-h4">Kasus Mirip Terdahulu (Kemiripan Teks)</CardTitle>
                  <CardDescription>
                    Referensi penanganan dari kasus sebelumnya pada mesin atau masalah serupa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {similarCases.map((sim) => (
                    <div
                      key={sim.id}
                      className="rounded-sm border border-charcoal-border bg-carbon p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-caption font-bold text-industrial-orange">
                          {sim.case_number}
                        </span>
                        <Badge variant="outline">{sim.status_label}</Badge>
                      </div>
                      <p className="text-caption text-off-white">
                        {sim.short_description ?? sim.description_excerpt ?? sim.description ?? ''}
                      </p>
                      {sim.learning_summary && (
                        <p className="text-caption text-safety-safe-foreground">
                          Pembelajaran: {sim.learning_summary}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Triage Panel (Supervisor & Admin ONLY on new/assessed cases) */}
            {canTriageNow && (
              <Card className="border-industrial-orange/50 bg-graphite">
                <CardHeader>
                  <CardTitle className="text-h4 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                    Triase &amp; Penilaian Risiko (Supervisor / Admin)
                  </CardTitle>
                  <CardDescription>
                    K3 / Verifikator dan Pelapor tidak dapat mengakses panel triase ini.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTriageSubmit} className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={triageDecision === 'assess' ? 'industrial' : 'outline'}
                        onClick={() => setTriageDecision('assess')}
                      >
                        Nilai Risiko &amp; Tugaskan PIC
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={triageDecision === 'reject' ? 'destructive' : 'outline'}
                        onClick={() => setTriageDecision('reject')}
                      >
                        Tolak Laporan
                      </Button>
                    </div>

                    {triageDecision === 'assess' ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-label text-off-white block mb-1">
                            Keparahan (Severity 1-5)
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={severity}
                            onChange={(e) => setSeverity(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-label text-off-white block mb-1">
                            Kemungkinan (Likelihood 1-5)
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={likelihood}
                            onChange={(e) => setLikelihood(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-label text-off-white block mb-1">
                            Kategori Masalah
                          </label>
                          <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="h-11 w-full rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                          >
                            <option value="">-- Pilih Kategori --</option>
                            {(referenceData?.categories ?? []).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-label text-off-white block mb-1">
                            PIC Penanganan (Default PIC Area)
                          </label>
                          <select
                            value={assignedPicId}
                            onChange={(e) => setAssignedPicId(e.target.value)}
                            className="h-11 w-full rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                          >
                            <option value="">-- Pilih PIC --</option>
                            {assignableUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role_label ?? u.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-label text-off-white block mb-1">
                          Alasan Penolakan *
                        </label>
                        <Input
                          required
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Contoh: Laporan bukan kondisi K3/mesin atau duplikat tanpa temuan baru."
                        />
                      </div>
                    )}

                    <Button type="submit" disabled={submitting} variant="industrial">
                      {submitting ? 'Menyimpan...' : 'Simpan Keputusan Triase'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Actions & 5-Why Panel */}
            <Card className="bg-graphite">
              <CardHeader>
                <CardTitle className="text-h4 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                  Daftar Tindakan CAPA ({(selectedCase.actions ?? []).length})
                </CardTitle>
                {needsPreventive && (
                  <CardDescription>
                    Kasus risiko Sedang/Tinggi wajib memiliki minimal 1 tindakan Preventif yang selesai sebelum ditutup.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {(selectedCase.actions ?? []).length === 0 ? (
                  <p className="text-caption text-steel-muted">Belum ada tindakan dicatat.</p>
                ) : (
                  (selectedCase.actions ?? []).map((act) => (
                    <div
                      key={act.id}
                      className="rounded-sm border border-charcoal-border bg-carbon p-3 space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={act.action_type === 'preventive' ? 'info' : 'secondary'}>
                            {act.action_type_label}
                          </Badge>
                          <Badge variant={act.status === 'completed' ? 'safe' : 'warning'}>
                            {act.status_label}
                          </Badge>
                          {act.is_overdue && act.status === 'open' && (
                            <Badge variant="danger">Terlambat</Badge>
                          )}
                        </div>
                        {act.due_at && (
                          <span className="font-mono text-[11px] text-steel-muted">
                            Tenggat: {act.due_at}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-off-white">{act.title}</div>
                      <div className="text-caption text-steel-muted">
                        PIC: {act.pic?.name ?? '-'}
                      </div>
                      {act.completion_note && (
                        <div className="text-caption text-safety-safe-foreground">
                          Hasil: {act.completion_note}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {canManageActionsNow && (
                  <div className="border-t border-charcoal-border pt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <form onSubmit={handleCreateActionSubmit} className="space-y-3">
                      <h4 className="text-label font-bold text-off-white">Tambah Tindakan Baru</h4>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={newActionType === 'corrective' ? 'industrial' : 'outline'}
                          onClick={() => setNewActionType('corrective')}
                        >
                          Korektif
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={newActionType === 'preventive' ? 'industrial' : 'outline'}
                          onClick={() => setNewActionType('preventive')}
                        >
                          Preventif
                        </Button>
                      </div>
                      <Input
                        required
                        value={newActionTitle}
                        onChange={(e) => setNewActionTitle(e.target.value)}
                        placeholder="Judul tindakan perbaikan / pencegahan..."
                      />
                      <select
                        required
                        value={newActionPicId}
                        onChange={(e) => setNewActionPicId(e.target.value)}
                        className="h-11 w-full rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                      >
                        <option value="">-- Pilih PIC Tindakan --</option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role_label ?? u.role})
                          </option>
                        ))}
                      </select>
                      <Input
                        type="date"
                        value={newActionDueAt}
                        onChange={(e) => setNewActionDueAt(e.target.value)}
                      />
                      <Button type="submit" disabled={submitting} size="sm" variant="industrial">
                        Tambah Tindakan
                      </Button>
                    </form>

                    <form onSubmit={handleRootCauseSubmit} className="space-y-2.5">
                      <h4 className="text-label font-bold text-off-white">Analisis Akar Masalah (5-Why)</h4>
                      <select
                        value={rootCauseCategory}
                        onChange={(e) => setRootCauseCategory(e.target.value)}
                        className="h-11 w-full rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                      >
                        <option value="manusia">Manusia</option>
                        <option value="mesin">Mesin</option>
                        <option value="metode">Metode / SOP</option>
                        <option value="material">Material</option>
                        <option value="lingkungan">Lingkungan</option>
                      </select>
                      <Input
                        value={why1}
                        onChange={(e) => setWhy1(e.target.value)}
                        placeholder="Mengapa 1..."
                      />
                      <Input
                        value={why2}
                        onChange={(e) => setWhy2(e.target.value)}
                        placeholder="Mengapa 2 (opsional)..."
                      />
                      <Input
                        value={why3}
                        onChange={(e) => setWhy3(e.target.value)}
                        placeholder="Mengapa 3 (opsional)..."
                      />
                      <Input
                        value={rootCauseSummary}
                        onChange={(e) => setRootCauseSummary(e.target.value)}
                        placeholder="Ringkasan akar masalah..."
                      />
                      <Button type="submit" disabled={submitting} size="sm" variant="secondary">
                        Simpan 5-Why
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification Lock Notice when Verifier == PIC */}
            {perms.verify_case && selectedCase.status === 'pending_verification' && isCasePic && (
              <div
                role="alert"
                className="rounded-card border border-safety-warning-border bg-safety-warning-bg p-4 text-safety-warning-foreground space-y-1"
              >
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-safety-warning stroke-[2px]" />
                  Verifikasi Diblokir (Aturan Verifikator != PIC)
                </div>
                <p className="text-caption">
                  Anda terdaftar sebagai PIC pada kasus atau tindakan ini. Sesuai aturan SafetyLog, kasus wajib diverifikasi oleh K3 / Admin lain yang independen.
                </p>
              </div>
            )}

            {/* Verification Panel (K3 / Verifikator & Admin ONLY, independent verifier) */}
            {canVerifyNow && (
              <Card className="border-safety-safe-border bg-graphite">
                <CardHeader>
                  <CardTitle className="text-h4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-safety-safe stroke-[2px]" />
                    Verifikasi Independen &amp; Penutupan Kasus
                  </CardTitle>
                  {needsPreventive && !hasCompletedPreventive && (
                    <CardDescription className="text-safety-warning-foreground">
                      Peringatan: Kasus Sedang/Tinggi ini belum memiliki tindakan Preventif yang selesai, sehingga persetujuan tutup akan ditolak sistem.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVerifySubmit} className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={verifyDecision === 'approve' ? 'industrial' : 'outline'}
                        onClick={() => setVerifyDecision('approve')}
                      >
                        Setujui &amp; Tutup Kasus
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={verifyDecision === 'reject' ? 'destructive' : 'outline'}
                        onClick={() => setVerifyDecision('reject')}
                      >
                        Kembalikan ke PIC
                      </Button>
                    </div>
                    {verifyDecision === 'approve' ? (
                      <textarea
                        rows={2}
                        required
                        value={learningSummary}
                        onChange={(e) => setLearningSummary(e.target.value)}
                        placeholder="Ringkasan pembelajaran & pencegahan untuk basis pengetahuan..."
                        className="flex w-full rounded-input border border-charcoal-border bg-[#151A20] px-3 py-2 text-body text-off-white"
                      />
                    ) : (
                      <Input
                        required
                        value={verifyRejectReason}
                        onChange={(e) => setVerifyRejectReason(e.target.value)}
                        placeholder="Alasan dikembalikan ke PIC untuk perbaikan ulang..."
                      />
                    )}
                    <Button type="submit" disabled={submitting} variant="default">
                      {submitting ? 'Memproses...' : 'Kirim Keputusan Verifikasi'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Reopen Panel (K3 / Verifikator & Admin ONLY on closed cases) */}
            {canReopenNow && (
              <Card className="bg-graphite">
                <CardHeader>
                  <CardTitle className="text-h4 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                    Buka Ulang Kasus (Resmi &amp; Tercatat di Audit Log)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReopenSubmit} className="flex flex-wrap gap-2">
                    <Input
                      required
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Alasan membuka ulang kasus ini..."
                      className="flex-1 min-w-[220px]"
                    />
                    <Button type="submit" disabled={submitting} variant="outline">
                      Buka Ulang Kasus
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Case Status History */}
            {(selectedCase.status_histories ?? []).length > 0 && (
              <Card className="bg-graphite">
                <CardHeader className="pb-2">
                  <CardTitle className="text-h4 flex items-center gap-2">
                    <History className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                    Riwayat Status Kasus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(selectedCase.status_histories ?? []).map((h) => (
                    <div
                      key={h.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-charcoal-border bg-carbon px-3 py-2 text-caption"
                    >
                      <div>
                        <span className="font-semibold text-off-white">
                          {h.from_status_label ?? 'Laporan Masuk'} -&gt; {h.to_status_label}
                        </span>
                        {h.reason && <span className="text-steel-muted ml-2">({h.reason})</span>}
                        <div className="text-[11px] text-steel-muted">
                          Aktor: {h.changed_by?.name ?? '-'}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-steel-muted">
                        {h.created_at ?? '-'}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold text-off-white flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-industrial-orange stroke-[2px]" />
            {isAllCasesMode ? 'Semua Kasus & Alur Closed-Loop' : 'Laporan Saya'}
          </h1>
          <p className="text-caption text-steel-muted">
            {isAllCasesMode
              ? 'Daftar seluruh kasus di organisasi Anda untuk triase, pemantauan tindakan, dan verifikasi.'
              : 'Daftar laporan yang pernah Anda kirim beserta perkembangan status terkininya.'}
          </p>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={loadList} className="gap-1.5">
          <RefreshCw className="h-4 w-4 stroke-[2px]" />
          Muat Ulang
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-graphite">
        <CardContent className="p-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="h-4 w-4 text-steel-muted absolute left-3 top-3.5 stroke-[2px]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor kasus atau deskripsi..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
          >
            <option value="">Semua Status</option>
            <option value="new">Baru</option>
            <option value="assessed">Dinilai</option>
            <option value="in_progress">Tindakan Berjalan</option>
            <option value="pending_verification">Menunggu Verifikasi</option>
            <option value="closed">Selesai</option>
            <option value="rejected">Ditolak</option>
          </select>
          {isAllCasesMode && (
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="h-11 rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
            >
              <option value="">Semua Level Risiko</option>
              <option value="high">Tinggi</option>
              <option value="medium">Sedang</option>
              <option value="low">Rendah</option>
            </select>
          )}
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground">
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-center text-steel-muted">Memuat daftar kasus...</Card>
      ) : cases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">Belum Ada Kasus</CardTitle>
            <CardDescription>
              Tidak ada kasus yang cocok dengan filter pencarian saat ini.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {cases.map((item) => {
            const itemRiskLabel = item.risk_assessment?.risk_level_label
            const itemRiskScore = item.risk_assessment?.risk_score
            return (
              <Card key={item.id} className="bg-graphite hover:border-industrial-orange/50 transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-caption font-bold text-industrial-orange">
                        {item.case_number}
                      </span>
                      <CaseStatusBadge status={(item.status_label || 'Baru') as CaseStatus} />
                      {itemRiskLabel && (
                        <RiskBadge
                          level={itemRiskLabel as RiskLevel}
                          score={itemRiskScore ?? undefined}
                        />
                      )}
                    </div>
                    <div className="font-semibold text-off-white">
                      {item.machine?.code} - {item.machine?.name}
                    </div>
                    <p className="text-caption text-steel-muted line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <Button type="button" size="sm" variant="secondary" onClick={() => openDetail(item.id)}>
                    Buka Detail
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
