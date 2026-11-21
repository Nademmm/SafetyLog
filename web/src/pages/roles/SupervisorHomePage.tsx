import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, OverduePill, RiskPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { DashboardData, SafetyCase } from '@/types/safetylog'

export function SupervisorHomePage() {
  const newCasesQuery = useQuery({
    queryKey: ['cases', 'supervisor-new'],
    queryFn: () =>
      apiFetch<{ data: SafetyCase[]; meta?: { total: number } }>('/cases?status=new&per_page=6'),
  })

  const activeCasesQuery = useQuery({
    queryKey: ['cases', 'supervisor-active'],
    queryFn: () => apiFetch<{ data: SafetyCase[] }>('/cases?status=in_progress&per_page=6'),
  })

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'supervisor-home'],
    queryFn: () => apiFetch<{ data: DashboardData }>('/dashboard'),
  })

  const newCases = newCasesQuery.data?.data ?? []
  const activeCases = activeCasesQuery.data?.data ?? []
  const summary = dashboardQuery.data?.data.summary
  const overdueActions = dashboardQuery.data?.data.overdue_actions ?? []
  const newCasesTotal = newCasesQuery.data?.meta?.total ?? newCases.length
  const hasError = newCasesQuery.isError || activeCasesQuery.isError || dashboardQuery.isError

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Ruang Kerja Supervisor
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Nilai risiko 5×5 untuk laporan baru, tunjuk PIC, dan pantau pelaksanaan tindakan.
          </p>
        </div>
        <Link
          to="/cases?status=new"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors"
        >
          Buka Antrean Triase
        </Link>
      </div>

      {hasError && (
        <QueryErrorBanner
          message="Sebagian data Supervisor gagal dimuat."
          onRetry={() => {
            void newCasesQuery.refetch()
            void activeCasesQuery.refetch()
            void dashboardQuery.refetch()
          }}
        />
      )}

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Menunggu triase (Baru)
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {newCasesQuery.isLoading ? '—' : newCasesTotal}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Total kasus terbuka
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.open_cases_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Risiko tinggi terbuka
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.high_risk_open_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Tindakan terlambat
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.overdue_actions_count : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Queue: Baru */}
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text)] truncate">
                Antrean Triase
              </h2>
              {newCasesTotal > 0 && (
                <span className="shrink-0 rounded-[4px] bg-[var(--accent-soft)] border border-[var(--accent)]/25 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] tabular-nums">
                  {newCasesTotal}
                </span>
              )}
            </div>
            <Link
              to="/cases?status=new"
              className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {newCasesQuery.isLoading ? (
              <SectionLoading label="Memuat antrean triase..." className="py-8" />
            ) : newCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Seluruh laporan baru sudah ditriase.
              </div>
            ) : (
              newCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="group flex flex-col gap-2.5 px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                        {c.case_number}
                      </span>
                      {c.machine?.code && (
                        <span className="rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--muted)]">
                          {c.machine.code}
                        </span>
                      )}
                      {c.is_machine_stopped && (
                        <span className="rounded-[4px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--safety-danger-foreground)]">
                          Mesin berhenti
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)] transition-colors group-hover:border-[var(--accent)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
                      Nilai Risiko
                    </span>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="truncate text-[14px] font-medium text-[var(--text)]">
                      {c.machine?.name || 'Mesin / Area'}
                    </div>
                    <div className="line-clamp-1 text-[12px] text-[var(--muted)]">
                      {c.description}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Active Cases */}
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text)] truncate">
                Tindakan Sedang Berjalan
              </h2>
              {activeCases.length > 0 && (
                <span className="shrink-0 rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                  {activeCases.length}
                </span>
              )}
            </div>
            <Link
              to="/cases?status=in_progress"
              className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {activeCasesQuery.isLoading ? (
              <SectionLoading label="Memuat kasus aktif..." className="py-8" />
            ) : activeCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Belum ada kasus dengan tindakan berjalan.
              </div>
            ) : (
              activeCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="group flex flex-col gap-2 px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="whitespace-nowrap font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                        {c.case_number}
                      </span>
                      {c.machine?.code && (
                        <span className="whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--muted)]">
                          {c.machine.code}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RiskPill
                        level={c.risk_assessment.risk_level}
                        score={c.risk_assessment.risk_score}
                        label={c.risk_assessment.risk_level_label}
                      />
                      <CaseStatusPill status={c.status} label={c.status_label} />
                    </div>
                  </div>

                  <div className="truncate text-[14px] font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                    {c.machine?.name || 'Mesin / Area'}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
                    <span className="truncate">
                      PIC:{' '}
                      <strong className="font-medium text-[var(--text)]">
                        {c.risk_assessment.assigned_pic?.name || '—'}
                      </strong>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--faint)]">
                      {formatDateTime(c.reported_at)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Overdue preview strip (clean responsive 12-col table on desktop, 3-tier on mobile) */}
      {overdueActions.length > 0 && (
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text)] truncate">
                Tindakan Melewati Tenggat SLA
              </h2>
              <span className="shrink-0 rounded-[4px] bg-[var(--safety-danger-bg)] border border-[var(--safety-danger-border)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
                {overdueActions.length}
              </span>
            </div>
            <Link
              to="/dashboard"
              className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Lihat Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="hidden md:grid md:grid-cols-12 md:gap-4 border-b border-[var(--rule)] px-5 py-2.5 text-[12px] font-medium text-[var(--faint)]">
            <div className="col-span-5">Tindakan &amp; Kasus</div>
            <div className="col-span-3">PIC</div>
            <div className="col-span-2">Tenggat SLA</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          <div className="divide-y divide-[var(--rule)]">
            {overdueActions.slice(0, 4).map((oa) => (
              <Link
                key={oa.id}
                to={oa.safety_case ? `/cases/${oa.safety_case.id}` : '/cases'}
                className="group block px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
              >
                {/* Mobile */}
                <div className="flex flex-col gap-2 md:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                      {oa.safety_case?.case_number || '—'}
                    </span>
                    <OverduePill label={oa.overdue_label} />
                  </div>
                  <div className="text-[14px] font-medium leading-snug text-[var(--text)] line-clamp-2">
                    {oa.title}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
                    <span>
                      PIC: <strong className="font-medium text-[var(--text)]">{oa.pic?.name || '—'}</strong>
                    </span>
                    <span className="tabular-nums text-[var(--faint)]">
                      {formatDateTime(oa.due_at)}
                    </span>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden md:grid md:grid-cols-12 md:items-center md:gap-4">
                  <div className="col-span-5 min-w-0 space-y-0.5">
                    <div className="truncate text-[14px] font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                      {oa.title}
                    </div>
                    <div className="font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                      {oa.safety_case?.case_number || '—'}
                    </div>
                  </div>
                  <div className="col-span-3 truncate text-[13px] font-medium text-[var(--text)]">
                    {oa.pic?.name || '—'}
                  </div>
                  <div className="col-span-2 text-[13px] text-[var(--muted)] tabular-nums">
                    {formatDateTime(oa.due_at)}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <OverduePill label={oa.overdue_label} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
