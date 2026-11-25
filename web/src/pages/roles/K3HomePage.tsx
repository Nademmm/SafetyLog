import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { caseKeys, dashboardKeys } from '@/data/query-keys'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { DashboardData, SafetyCase } from '@/types/safetylog'

export function K3HomePage() {
  const pendingVerifyQuery = useQuery({
    queryKey: caseKeys.list({ scope: 'k3-pending', status: 'pending_verification', per_page: 8 }),
    queryFn: () =>
      apiFetch<{ data: SafetyCase[]; meta?: { total: number } }>(
        '/cases?status=pending_verification&per_page=8',
      ),
  })

  const highRiskQuery = useQuery({
    queryKey: caseKeys.list({ scope: 'k3-high-risk', risk_level: 'high', per_page: 6 }),
    queryFn: () =>
      apiFetch<{ data: SafetyCase[] }>(
        '/cases?risk_level=high&status=new,assessed,analyzed,in_progress,pending_verification&per_page=6',
      ),
  })

  const dashboardQuery = useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => apiFetch<{ data: DashboardData }>('/dashboard'),
  })

  const pendingCases = pendingVerifyQuery.data?.data ?? []
  const highRiskCases = highRiskQuery.data?.data ?? []
  const summary = dashboardQuery.data?.data.summary
  const pendingTotal = pendingVerifyQuery.data?.meta?.total ?? pendingCases.length
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
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors"
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
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Menunggu verifikasi
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {pendingVerifyQuery.isLoading ? '—' : pendingTotal}
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
            Selesai bulan ini
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-safe-foreground)] tabular-nums">
            {summary ? summary.closed_this_month_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Mesin berulang (90h)
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.recurring_machines_count : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Pending Verification Queue */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)] truncate">
                Antrean Verifikasi K3
              </h2>
              {pendingTotal > 0 && (
                <span className="shrink-0 font-mono text-[12px] font-medium text-[var(--accent)] tabular-nums">
                  ({pendingTotal})
                </span>
              )}
            </div>
            <Link
              to="/cases?status=pending_verification"
              className="shrink-0 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
            {pendingVerifyQuery.isLoading ? (
              <SectionLoading label="Memuat antrean verifikasi..." className="py-8" />
            ) : pendingCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Tidak ada kasus yang menunggu verifikasi saat ini.
              </div>
            ) : (
              pendingCases.map((c) => {
                const isHigh = c.risk_assessment.risk_level === 'high'
                return (
                  <Link
                    key={c.id}
                    to={`/cases/${c.id}`}
                    className={`group flex flex-col gap-1.5 px-4 py-3.5 sm:px-5 transition-colors ${
                      isHigh
                        ? 'bg-[var(--safety-danger-bg)]/20 hover:bg-[var(--safety-danger-bg)]/40'
                        : 'hover:bg-[var(--hover-row)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--faint)] min-w-0 truncate">
                        <span className="font-mono font-medium text-[var(--accent)] tabular-nums">
                          {c.case_number}
                        </span>
                        {c.machine?.code && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{c.machine.code}</span>
                          </>
                        )}
                      </div>
                      <span className="shrink-0 text-[12px] font-semibold text-[var(--accent)] group-hover:underline">
                        Verifikasi
                      </span>
                    </div>

                    <div className="text-[14.5px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                      {c.machine?.name || 'Mesin / Area'}
                    </div>
                    <p className="text-[13px] leading-snug text-[var(--muted)] line-clamp-2">
                      {c.description}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <RiskPill
                        level={c.risk_assessment.risk_level}
                        score={c.risk_assessment.risk_score}
                        label={c.risk_assessment.risk_level_label}
                      />
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        {/* High Risk Open Cases */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)] leading-snug">
                Kasus Risiko Tinggi Terbuka
              </h2>
              {highRiskCases.length > 0 && (
                <span className="shrink-0 font-mono text-[12px] font-medium text-[var(--safety-danger-foreground)] tabular-nums">
                  ({highRiskCases.length})
                </span>
              )}
            </div>
            <Link
              to="/audit-logs"
              className="shrink-0 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Audit Log</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
            {highRiskQuery.isLoading ? (
              <SectionLoading label="Memuat kasus risiko tinggi..." className="py-8" />
            ) : highRiskCases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Tidak ada kasus risiko tinggi yang terbuka.
              </div>
            ) : (
              highRiskCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="group flex flex-col gap-1.5 bg-[var(--safety-danger-bg)]/20 px-4 py-3.5 sm:px-5 transition-colors hover:bg-[var(--safety-danger-bg)]/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--faint)] min-w-0">
                      <span className="font-mono font-medium text-[var(--accent)] tabular-nums">
                        {c.case_number}
                      </span>
                      {c.machine?.code && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{c.machine.code}</span>
                        </>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[11.5px] text-[var(--faint)] tabular-nums">
                      {formatDateTime(c.reported_at)}
                    </span>
                  </div>

                  <div className="text-[14.5px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                    {c.machine?.name || 'Mesin / Area'}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CaseStatusPill status={c.status} label={c.status_label} />
                      <span className="text-[12px] text-[var(--muted)]">
                        · PIC: <strong className="font-medium text-[var(--text)]">{c.risk_assessment.assigned_pic?.name || 'Belum ditunjuk'}</strong>
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
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
