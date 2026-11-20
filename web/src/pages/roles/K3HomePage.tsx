import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import type { DashboardData, SafetyCase } from '@/types/safetylog'

export function K3HomePage() {
  const pendingVerifyQuery = useQuery({
    queryKey: ['cases', 'k3-pending-verification'],
    queryFn: () =>
      apiFetch<{ data: SafetyCase[]; meta?: { total: number } }>(
        '/cases?status=pending_verification&per_page=8',
      ),
  })

  const highRiskQuery = useQuery({
    queryKey: ['cases', 'k3-high-risk'],
    queryFn: () =>
      apiFetch<{ data: SafetyCase[] }>(
        '/cases?risk_level=high&status=new,assessed,analyzed,in_progress,pending_verification&per_page=6',
      ),
  })

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'k3-home'],
    queryFn: () => apiFetch<{ data: DashboardData }>('/dashboard'),
  })

  const pendingCases = pendingVerifyQuery.data?.data ?? []
  const highRiskCases = highRiskQuery.data?.data ?? []
  const summary = dashboardQuery.data?.data.summary
  const hasError = pendingVerifyQuery.isError || highRiskQuery.isError || dashboardQuery.isError

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Ruang Kerja K3 / Verifikator
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Verifikasi independen (Verifikator ≠ PIC) dan pastikan kasus Sedang/Tinggi memiliki
            tindakan Preventif selesai.
          </p>
        </div>
        <Link
          to="/cases?status=pending_verification"
          className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
        >
          Periksa Antrean Verifikasi
        </Link>
      </div>

      {hasError && (
        <QueryErrorBanner
          message="Sebagian data K3 gagal dimuat."
          onRetry={() => {
            void pendingVerifyQuery.refetch()
            void highRiskQuery.refetch()
            void dashboardQuery.refetch()
          }}
        />
      )}

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Menunggu verifikasi</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {pendingVerifyQuery.isLoading
              ? '—'
              : (pendingVerifyQuery.data?.meta?.total ?? pendingCases.length)}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">
            Risiko tinggi terbuka
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.high_risk_open_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Selesai bulan ini</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-safe-foreground)] tabular-nums">
            {summary ? summary.closed_this_month_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Mesin berulang (90h)</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.recurring_machines_count : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Pending Verification Queue */}
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Antrean Verifikasi K3</h2>
            <Link
              to="/cases?status=pending_verification"
              className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1"
            >
              <span>Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {pendingVerifyQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Memuat antrean verifikasi...
              </div>
            ) : pendingCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Tidak ada kasus yang menunggu verifikasi saat ini.
              </div>
            ) : (
              pendingCases.map((c) => (
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
                      <RiskPill
                        level={c.risk_assessment.risk_level}
                        score={c.risk_assessment.risk_score}
                        label={c.risk_assessment.risk_level_label}
                      />
                    </div>
                    <div className="truncate text-[14px] font-medium text-[var(--text)]">
                      {c.machine ? `${c.machine.code} — ${c.machine.name}` : 'Mesin'}
                    </div>
                    <div className="text-[12px] text-[var(--muted)] truncate">{c.description}</div>
                  </div>
                  <span className="shrink-0 rounded-[6px] border border-[var(--control)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)]">
                    Verifikasi
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* High Risk Open Cases */}
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">
              Kasus Risiko Tinggi Terbuka
            </h2>
            <Link
              to="/audit-logs"
              className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1"
            >
              <span>Audit Log</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {highRiskQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Memuat kasus risiko tinggi...
              </div>
            ) : highRiskCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Tidak ada kasus risiko tinggi yang terbuka.
              </div>
            ) : (
              highRiskCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-[var(--hover-row)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                      {c.case_number}
                    </span>
                    <CaseStatusPill status={c.status} label={c.status_label} />
                  </div>
                  <div className="text-[14px] font-medium text-[var(--text)] truncate">
                    {c.machine ? `${c.machine.code} — ${c.machine.name}` : 'Mesin'}
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[var(--faint)]">
                    <span>PIC: {c.risk_assessment.assigned_pic?.name || 'Belum ditunjuk'}</span>
                    <span>{formatDateTime(c.reported_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
