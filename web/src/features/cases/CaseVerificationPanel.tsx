import * as React from 'react'
import { AlertTriangle, CheckCircle2, Lock, RotateCcw } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { localizeContentText, localizeRiskLevelLabel, useLanguage } from '@/lib/i18n-helpers'
import { hasCompletedPreventiveAction } from '@/domain/case-rules'
import { ReopenActionSelector } from '@/features/cases/ReopenActionSelector'
import type { SafetyCase } from '@/types/safetylog'

export function CaseVerificationPanel({
  caseData,
  requiresPreventive,
  onVerified,
}: {
  caseData: SafetyCase
  requiresPreventive: boolean
  onVerified: () => void
}) {
  const { lang, pick } = useLanguage()
  const [verifyMode, setVerifyMode] = React.useState<'approve' | 'reject'>('approve')
  const [learningSummary, setLearningSummary] = React.useState('')
  const [verifyRejectReason, setVerifyRejectReason] = React.useState('')
  const [rejectReopenIdsOverride, setRejectReopenIdsOverride] = React.useState<number[] | null>(
    null,
  )
  const [verifyBusy, setVerifyBusy] = React.useState(false)
  const [verifyErr, setVerifyErr] = React.useState<string | null>(null)

  const actions = caseData.actions ?? []
  const completedActions = actions.filter((a) => a.status === 'completed')
  const defaultCompletedIds = React.useMemo(
    () => completedActions.map((a) => a.id),
    [completedActions],
  )
  const rejectReopenActionIds = rejectReopenIdsOverride ?? defaultCompletedIds
  const hasCompletedPreventive = hasCompletedPreventiveAction(actions)
  const available = caseData.available_actions

  const toggleRejectAction = (actionId: number) => {
    setRejectReopenIdsOverride((prev) => {
      const current = prev ?? defaultCompletedIds
      return current.includes(actionId)
        ? current.filter((x) => x !== actionId)
        : [...current, actionId]
    })
  }

  const handleVerify = async (decision: 'approve' | 'reject') => {
    setVerifyErr(null)
    if (decision === 'approve' && !learningSummary.trim()) {
      setVerifyErr(
        pick(
          'Ringkasan pembelajaran wajib diisi untuk menutup kasus.',
          'Learning summary is required to close the case.',
        ),
      )
      return
    }
    if (decision === 'reject' && !verifyRejectReason.trim()) {
      setVerifyErr(
        pick('Alasan penolakan verifikasi wajib diisi.', 'Verification rejection reason is required.'),
      )
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
      onVerified()
    } catch (err) {
      setVerifyErr(err instanceof ApiError ? err.message : pick('Verifikasi gagal.', 'Verification failed.'))
    } finally {
      setVerifyBusy(false)
    }
  }

  return (
    <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
      <h2 className="text-[16px] font-semibold text-[var(--text)]">
        {pick('Verifikasi & Tutup Kasus', 'Verify & Close Case')}
      </h2>

      {available?.is_verifier_blocked_as_pic && (
        <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]">
          {pick(
            'Anda terdaftar sebagai PIC pada kasus/tindakan ini. Sesuai aturan produk, Verifikator tidak boleh sama dengan PIC.',
            'You are assigned as PIC on this case/action. Per product rules, the Verifier cannot be the same person as the PIC.',
          )}
        </div>
      )}

      {requiresPreventive && !hasCompletedPreventive && (
        <div className="flex items-start gap-2.5 rounded-[6px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-3.5 text-[13px] text-[var(--safety-warning-foreground)]">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {pick('Kasus berisiko', 'Cases with')}{' '}
            <strong>
              {localizeRiskLevelLabel(
                lang,
                caseData.risk_assessment.risk_level_label,
                caseData.risk_assessment.risk_level,
              )}
            </strong>{' '}
            {pick(
              'wajib memiliki minimal 1 tindakan Preventif yang sudah selesai sebelum dapat disetujui dan ditutup.',
              'risk must have at least 1 completed Preventive action before they can be approved and closed.',
            )}
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
          <div
            role="radiogroup"
            aria-label={pick('Keputusan verifikasi', 'Verification decision')}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
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
              <span>{pick('Setujui & Tutup', 'Approve & Close')}</span>
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
              <span>{pick('Tolak & Kembalikan', 'Reject & Return')}</span>
            </button>
          </div>

          {verifyMode === 'approve' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  {pick('Ringkasan Pembelajaran', 'Learning Summary')} <span className="text-[var(--safety-danger)]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={learningSummary}
                  onChange={(e) => setLearningSummary(e.target.value)}
                  placeholder={pick(
                    'Apa pelajaran utama agar masalah ini tidak terulang?',
                    'What is the key takeaway so this issue does not recur?',
                  )}
                  className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>
              <button
                type="button"
                disabled={verifyBusy || (requiresPreventive && !hasCompletedPreventive)}
                onClick={() => void handleVerify('approve')}
                className="h-11 w-full sm:w-auto rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50 cursor-pointer"
              >
                {verifyBusy ? pick('Memproses...', 'Processing...') : pick('Setujui & Tutup Kasus', 'Approve & Close Case')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <ReopenActionSelector
                label={pick('Tindakan yang dibuka ulang', 'Actions to reopen')}
                actions={completedActions}
                selectedIds={rejectReopenActionIds}
                onToggle={toggleRejectAction}
              />
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  {pick('Alasan Penolakan', 'Rejection Reason')} <span className="text-[var(--safety-danger)]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={verifyRejectReason}
                  onChange={(e) => setVerifyRejectReason(e.target.value)}
                  placeholder={pick(
                    'Jelaskan bagian mana yang perlu diperbaiki PIC...',
                    'Explain what the PIC needs to fix...',
                  )}
                  className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>
              <button
                type="button"
                disabled={verifyBusy}
                onClick={() => void handleVerify('reject')}
                className="h-11 w-full sm:w-auto rounded-[6px] bg-[var(--safety-danger)] px-5 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {verifyBusy ? pick('Memproses...', 'Processing...') : pick('Tolak & Kembalikan ke PIC', 'Reject & Return to PIC')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export function CaseReopenPanel({
  caseData,
  onReopened,
}: {
  caseData: SafetyCase
  onReopened: () => void
}) {
  const { lang, pick } = useLanguage()
  const [reopenReason, setReopenReason] = React.useState('')
  const [caseReopenIdsOverride, setCaseReopenIdsOverride] = React.useState<number[] | null>(null)
  const [reopenBusy, setReopenBusy] = React.useState(false)
  const [reopenErr, setReopenErr] = React.useState<string | null>(null)

  const completedActions = (caseData.actions ?? []).filter((a) => a.status === 'completed')
  const defaultCompletedIds = React.useMemo(
    () => completedActions.map((a) => a.id),
    [completedActions],
  )
  const caseReopenActionIds = caseReopenIdsOverride ?? defaultCompletedIds

  const toggleReopenAction = (actionId: number) => {
    setCaseReopenIdsOverride((prev) => {
      const current = prev ?? defaultCompletedIds
      return current.includes(actionId)
        ? current.filter((x) => x !== actionId)
        : [...current, actionId]
    })
  }

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault()
    setReopenErr(null)
    if (!reopenReason.trim()) {
      setReopenErr(
        pick('Alasan membuka ulang kasus wajib diisi.', 'Reason for reopening case is required.'),
      )
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
      onReopened()
    } catch (err) {
      setReopenErr(
        err instanceof ApiError
          ? err.message
          : pick('Gagal membuka ulang kasus.', 'Failed to reopen case.'),
      )
    } finally {
      setReopenBusy(false)
    }
  }

  return (
    <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
      <div className="flex items-center gap-2 text-[var(--safety-safe-foreground)]">
        <Lock className="h-4 w-4" />
        <h2 className="text-[16px] font-semibold">{pick('Kasus Selesai & Terkunci', 'Case Closed & Locked')}</h2>
      </div>
      {caseData.verification.learning_summary && (
        <p className="text-[14px] text-[var(--text)]">
          <strong>{pick('Pembelajaran', 'Learning')}:</strong> {localizeContentText(lang, caseData.verification.learning_summary)}
        </p>
      )}
      <div className="text-[12px] text-[var(--faint)]">
        {pick('Diverifikasi oleh', 'Verified by')} {caseData.verification.verified_by?.name || '—'}{' '}
        {pick('pada', 'on')} {formatDateTime(caseData.verification.verified_at)}
      </div>

      {caseData.available_actions?.can_reopen && (
        <form onSubmit={handleReopen} className="border-t border-[var(--rule)] pt-4 space-y-3">
          <div className="text-[13px] font-semibold text-[var(--text)]">
            {pick('Buka Ulang Kasus', 'Reopen Case')}
          </div>
          {reopenErr && (
            <div className="text-[12px] text-[var(--safety-danger-foreground)]">{reopenErr}</div>
          )}
          <ReopenActionSelector
            label={pick('Pilih tindakan yang perlu dibuka ulang:', 'Select actions to reopen:')}
            actions={completedActions}
            selectedIds={caseReopenActionIds}
            onToggle={toggleReopenAction}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder={pick('Alasan membuka ulang kasus...', 'Reason for reopening case...')}
              required
              className="h-11 w-full sm:flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
            />
            <button
              type="submit"
              disabled={reopenBusy}
              className="h-11 w-full sm:w-auto rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
            >
              {pick('Buka Ulang', 'Reopen')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
