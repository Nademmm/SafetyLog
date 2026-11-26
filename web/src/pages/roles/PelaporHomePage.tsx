import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-helpers'
import {
  localizeActionStatusLabel,
  localizeActionTypeLabel,
  localizeContentText,
  localizeMachineName,
  useLanguage,
} from '@/lib/i18n-helpers'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, CaseTypePill, OverduePill, RiskPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { CaseAction, SafetyCase } from '@/types/safetylog'

export function PelaporHomePage() {
  const { user } = useAuth()
  const { lang, pick } = useLanguage()

  const myCasesQuery = useQuery({
    queryKey: ['my-cases', 'home'],
    queryFn: () => apiFetch<{ data: SafetyCase[] }>('/my-cases?per_page=10'),
  })

  const myActionsQuery = useQuery({
    queryKey: ['my-actions', 'home'],
    queryFn: () => apiFetch<{ data: CaseAction[] }>('/my-actions'),
  })

  const cases = myCasesQuery.data?.data ?? []
  const actions = myActionsQuery.data?.data ?? []
  const openCasesCount = cases.filter((c) => !c.is_locked).length
  const openActionsCount = actions.filter((a) => a.status !== 'completed').length
  const overdueActionsCount = actions.filter(
    (a) => a.is_overdue && a.status !== 'completed',
  ).length
  const criticalCasesCount = cases.filter(
    (c) =>
      !c.is_locked &&
      (c.is_machine_stopped ||
        c.has_affected_people ||
        c.risk_assessment.risk_level === 'high'),
  ).length

  // Prioritaskan tindakan terlambat -> terbuka (tenggat terdekat) -> selesai
  const sortedActions = [...actions].sort((a, b) => {
    const aOverdue = a.is_overdue && a.status !== 'completed' ? 0 : 1
    const bOverdue = b.is_overdue && b.status !== 'completed' ? 0 : 1
    if (aOverdue !== bOverdue) return aOverdue - bOverdue

    const aDone = a.status === 'completed' ? 1 : 0
    const bDone = b.status === 'completed' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone

    const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER
    return aDue - bDue
  })

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            {pick('Ruang Kerja Pelapor', 'Reporter Workspace')}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {user?.site?.name || pick('Site Utama', 'Main Site')}
          </p>
        </div>
        {user?.role === 'reporter' && (
          <Link
            to="/report"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[2.2px]" />
            <span>{pick('Lapor Masalah Baru', 'Report New Issue')}</span>
          </Link>
        )}
      </div>

      {(myCasesQuery.isError || myActionsQuery.isError) && (
        <QueryErrorBanner
          message={pick(
            'Gagal memuat sebagian data ruang kerja Pelapor.',
            'Failed to load some Reporter workspace data.',
          )}
          onRetry={() => {
            void myCasesQuery.refetch()
            void myActionsQuery.refetch()
          }}
        />
      )}

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            {pick('Laporan aktif saya', 'My active reports')}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
              {myCasesQuery.isLoading ? '—' : openCasesCount}
            </span>
            {criticalCasesCount > 0 && (
              <span className="text-[11.5px] font-semibold text-[var(--safety-danger-foreground)]">
                · {criticalCasesCount} {pick('kritis', 'critical')}
              </span>
            )}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            {pick('Tindakan ditugaskan', 'Assigned actions')}
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {myActionsQuery.isLoading ? '—' : openActionsCount}
          </div>
        </div>
        <div
          className={`col-span-2 md:col-span-1 p-4 sm:p-5 ${
            overdueActionsCount > 0 ? 'bg-[var(--safety-danger-bg)]' : 'bg-[var(--surface)]'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium ${
              overdueActionsCount > 0
                ? 'text-[var(--safety-danger-foreground)]'
                : 'text-[var(--muted)]'
            }`}
          >
            {overdueActionsCount > 0 && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{pick('Tindakan terlambat', 'Overdue actions')}</span>
          </div>
          <div
            className={`mt-1.5 text-[24px] sm:text-[28px] font-semibold tabular-nums ${
              overdueActionsCount > 0
                ? 'text-[var(--safety-danger-foreground)]'
                : 'text-[var(--text)]'
            }`}
          >
            {myActionsQuery.isLoading ? '—' : overdueActionsCount}
          </div>
        </div>
      </div>

      {/* Two Minimalist Columns: Tindakan Saya (PIC) & Laporan Terakhir Saya */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Column 1: Tindakan Saya (PIC) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)] truncate">
                {pick('Tindakan Saya (PIC)', 'My Actions (PIC)')}
              </h2>
              {openActionsCount > 0 && (
                <span className="shrink-0 font-mono text-[12px] font-medium text-[var(--muted)] tabular-nums">
                  ({openActionsCount})
                </span>
              )}
            </div>
            <Link
              to="/my-actions"
              className="shrink-0 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>{pick('Lihat semua', 'View all')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--rule)]">
            {overdueActionsCount > 0 && (
              <div
                role="alert"
                className="flex items-center gap-2 bg-[var(--safety-danger-bg)] px-4 py-2.5 sm:px-5 text-[12.5px] font-medium text-[var(--safety-danger-foreground)]"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {pick(
                    `${overdueActionsCount} tindakan melewati tenggat waktu.`,
                    `${overdueActionsCount} action(s) past due.`,
                  )}
                </span>
              </div>
            )}

            {myActionsQuery.isLoading ? (
              <SectionLoading label={pick('Memuat tindakan Anda...', 'Loading your actions...')} className="py-8" />
            ) : myActionsQuery.isError ? (
              <div className="p-5 text-[14px] text-[var(--safety-danger-foreground)]">
                {pick('Gagal memuat daftar tindakan.', 'Failed to load action list.')}
              </div>
            ) : sortedActions.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                {pick(
                  'Tidak ada tindakan perbaikan yang ditugaskan kepada Anda saat ini.',
                  'No corrective actions are currently assigned to you.',
                )}
              </div>
            ) : (
              sortedActions.slice(0, 5).map((a) => {
                const isOverdue = a.is_overdue && a.status !== 'completed'
                const isCompleted = a.status === 'completed'

                return (
                  <Link
                    key={a.id}
                    to={a.safety_case ? `/cases/${a.safety_case.id}` : '/my-actions'}
                    className={`group flex flex-col gap-1.5 px-4 py-3.5 sm:px-5 transition-colors ${
                      isOverdue
                        ? 'bg-[var(--safety-danger-bg)]/30 hover:bg-[var(--safety-danger-bg)]/50'
                        : isCompleted
                          ? 'opacity-65 hover:opacity-100 hover:bg-[var(--hover-row)]'
                          : 'hover:bg-[var(--hover-row)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--faint)] min-w-0 truncate">
                        <span
                          className={`font-medium ${
                            a.action_type === 'preventive'
                              ? 'text-[var(--accent)]'
                              : 'text-[var(--muted)]'
                          }`}
                        >
                          {localizeActionTypeLabel(lang, a.action_type_label, a.action_type)}
                        </span>
                        {a.safety_case?.case_number && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {a.safety_case.case_number}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isOverdue ? (
                          <OverduePill label={a.overdue_label || 'Terlambat'} />
                        ) : (
                          <span
                            className={`text-[11.5px] font-medium ${
                              isCompleted
                                ? 'text-[var(--safety-safe-foreground)]'
                                : 'text-[var(--muted)]'
                            }`}
                          >
                            {localizeActionStatusLabel(lang, a.status_label, a.status)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[15px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                      {a.title}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5 text-[12px] tabular-nums">
                      <span
                        className={
                          isOverdue
                            ? 'font-medium text-[var(--safety-danger-foreground)]'
                            : 'text-[var(--faint)]'
                        }
                      >
                        {isOverdue ? pick('Lewat tenggat: ', 'Overdue: ') : pick('Tenggat: ', 'Due: ')}
                        {formatDateTime(a.due_at)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        {/* Column 2: Laporan Terakhir Saya */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)] truncate">
                {pick('Laporan Terakhir Saya', 'My Recent Reports')}
              </h2>
              {cases.length > 0 && (
                <span className="shrink-0 font-mono text-[12px] font-medium text-[var(--muted)] tabular-nums">
                  ({cases.length})
                </span>
              )}
            </div>
            {user?.role === 'reporter' && (
              <Link
                to="/my-cases"
                className="shrink-0 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
              >
                <span>{pick('Lihat semua', 'View all')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--rule)]">
            {myCasesQuery.isLoading ? (
              <SectionLoading label={pick('Memuat laporan Anda...', 'Loading your reports...')} className="py-8" />
            ) : myCasesQuery.isError ? (
              <div className="p-5 text-[14px] text-[var(--safety-danger-foreground)]">
                {pick('Gagal memuat daftar laporan.', 'Failed to load report list.')}
              </div>
            ) : cases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                {pick(
                  <>
                    Belum ada laporan yang Anda kirim. Gunakan tombol{' '}
                    <strong>Lapor Masalah Baru</strong> untuk memulai.
                  </>,
                  <>
                    No reports submitted yet. Use the <strong>Report New Issue</strong> button to
                    start.
                  </>,
                )}
              </div>
            ) : (
              cases.slice(0, 5).map((c) => {
                const isCritical =
                  !c.is_locked &&
                  (c.is_machine_stopped ||
                    c.has_affected_people ||
                    c.risk_assessment.risk_level === 'high')

                return (
                  <Link
                    key={c.id}
                    to={`/cases/${c.id}`}
                    className={`group flex flex-col gap-1.5 px-4 py-3.5 sm:px-5 transition-colors ${
                      isCritical
                        ? 'bg-[var(--safety-danger-bg)]/25 hover:bg-[var(--safety-danger-bg)]/45'
                        : 'hover:bg-[var(--hover-row)]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <CaseTypePill caseType={c.case_type} />
                        <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                          {c.case_number}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[11.5px] text-[var(--faint)] tabular-nums">
                        {formatDateTime(c.reported_at)}
                      </span>
                    </div>

                    <div className="text-[15px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                      {c.machine?.name ? localizeMachineName(lang, c.machine.name, c.machine.code) : pick('Mesin / Area', 'Machine / Area')}
                      {c.machine?.code ? (
                        <span className="ml-1.5 font-mono text-[12px] font-normal text-[var(--faint)]">
                          {c.machine.code}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[13.5px] leading-relaxed text-[var(--muted)] line-clamp-2">
                      {localizeContentText(lang, c.description)}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CaseStatusPill status={c.status} label={c.status_label} />
                        <RiskPill
                          level={c.risk_assessment.risk_level}
                          label={c.risk_assessment.risk_level_label}
                        />
                        {c.is_machine_stopped && (
                          <span className="text-[11px] font-semibold text-[var(--safety-danger-foreground)]">
                            · {pick('Mesin Berhenti', 'Machine Stopped')}
                          </span>
                        )}
                        {c.has_affected_people && (
                          <span className="text-[11px] font-semibold text-[var(--safety-danger-foreground)]">
                            · {pick('Ada Korban', 'Affected People')}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
