import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, OverduePill, RiskPill } from '@/components/safety/StatusPill'
import type { DashboardData, SafetyCase } from '@/types/safetylog'

export function SupervisorHomePage() {
  const newCasesQuery = useQuery({
    queryKey: ['cases', 'supervisor-new'],
    queryFn: () => apiFetch<{ data: SafetyCase[]; meta?: { total: number } }>('/cases?status=new&per_page=6'),
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
          className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
        >
          Buka Antrean Triase
        </Link>
      </div>

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Menunggu triase (Baru)</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {newCasesQuery.isLoading ? '—' : (newCasesQuery.data?.meta?.total ?? newCases.length)}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Total kasus terbuka</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.open_cases_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Risiko tinggi terbuka</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.high_risk_open_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Tindakan terlambat</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.overdue_actions_count : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Queue: Baru */}
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Antrean Triase (Status Baru)</h2>
            <Link to="/cases?status=new" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1">
              <span>Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {newCasesQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">Memuat antrean triase...</div>
            ) : newCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Seluruh laporan baru sudah ditriase.
              </div>
            ) : (
              newCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--hover-row)]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                        {c.case_number}
                      </span>
                      {c.is_machine_stopped && (
                        <span className="rounded-[4px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-1.5 py-0.5 text-[11px] text-[var(--safety-danger-foreground)]">
                          Mesin berhenti
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[14px] font-medium text-[var(--text)]">
                      {c.machine ? `${c.machine.code} — ${c.machine.name}` : 'Mesin'}
                    </div>
                    <div className="truncate text-[12px] text-[var(--muted)]">{c.description}</div>
                  </div>
                  <span className="shrink-0 rounded-[6px] border border-[var(--control)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)]">
                    Nilai Risiko
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Active Cases / Overdue */}
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Tindakan Sedang Berjalan</h2>
            <Link to="/cases?status=in_progress" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1">
              <span>Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {activeCasesQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">Memuat kasus aktif...</div>
            ) : activeCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Belum ada kasus dengan tindakan berjalan.
              </div>
            ) : (
              activeCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-[var(--hover-row)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                      {c.case_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <RiskPill
                        level={c.risk_assessment.risk_level}
                        score={c.risk_assessment.risk_score}
                        label={c.risk_assessment.risk_level_label}
                      />
                      <CaseStatusPill status={c.status} label={c.status_label} />
                    </div>
                  </div>
                  <div className="text-[14px] font-medium text-[var(--text)] truncate">
                    {c.machine ? `${c.machine.code} — ${c.machine.name}` : 'Mesin'}
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[var(--faint)]">
                    <span>PIC: {c.risk_assessment.assigned_pic?.name || '—'}</span>
                    <span>{formatDateTime(c.reported_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Overdue preview strip if any */}
      {(dashboardQuery.data?.data.overdue_actions.length ?? 0) > 0 && (
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Tindakan Melewati Tenggat SLA</h2>
            <Link to="/dashboard" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]">
              Lihat Dashboard
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {dashboardQuery.data!.data.overdue_actions.slice(0, 4).map((oa) => (
              <Link
                key={oa.id}
                to={oa.safety_case ? `/cases/${oa.safety_case.id}` : '/cases'}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[var(--hover-row)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-[var(--text)]">{oa.title}</div>
                  <div className="text-[12px] text-[var(--faint)]">
                    {oa.safety_case?.case_number} · PIC: {oa.pic?.name || '—'}
                  </div>
                </div>
                <OverduePill label={oa.overdue_label} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
