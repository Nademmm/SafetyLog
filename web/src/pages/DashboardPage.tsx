import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { OverduePill, RecurringPill } from '@/components/safety/StatusPill'
import type { DashboardData, SiteRef } from '@/types/safetylog'

export function DashboardPage() {
  const [siteId, setSiteId] = React.useState('')

  const sitesQuery = useQuery({
    queryKey: ['sites-opt'],
    queryFn: () => apiFetch<{ data: SiteRef[] }>('/sites'),
    retry: false,
  })

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', siteId],
    queryFn: () =>
      apiFetch<{ data: DashboardData }>(`/dashboard${siteId ? `?site_id=${siteId}` : ''}`),
  })

  const data = dashboardQuery.data?.data
  const summary = data?.summary
  const machines = data?.cases_per_machine ?? []
  const maxMachineCases = Math.max(1, ...machines.map((m) => m.total_cases))
  const categories = data?.cases_per_category ?? []
  const maxCategoryCases = Math.max(1, ...categories.map((c) => c.total_cases))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Dashboard Keandalan &amp; K3
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Ringkasan kasus terbuka, tindakan terlambat, dan mesin dengan masalah berulang.
          </p>
        </div>

        {(sitesQuery.data?.data?.length ?? 0) > 1 && (
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            aria-label="Filter site"
            className="h-10 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)]"
          >
            <option value="">Semua Site</option>
            {sitesQuery.data!.data.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Kasus terbuka</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.open_cases_count : '—'}
          </div>
        </div>
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Tindakan terlambat</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.overdue_actions_count : '—'}
          </div>
        </div>
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Selesai bulan ini</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--safety-safe-foreground)] tabular-nums">
            {summary ? summary.closed_this_month_count : '—'}
          </div>
        </div>
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Mesin berulang (90h)</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {summary ? summary.recurring_machines_count : '—'}
          </div>
        </div>
      </div>

      {/* Charts Row: Single Data Hue (#F97316) horizontal bar lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Kasus per Mesin</h2>
            <span className="text-[12px] text-[var(--faint)]">Ambang berulang: ≥ 3 / 90 hari</span>
          </div>

          {dashboardQuery.isLoading ? (
            <div className="text-[14px] text-[var(--faint)]">Memuat data mesin...</div>
          ) : machines.length === 0 ? (
            <div className="text-[14px] text-[var(--faint)]">Belum ada data kasus per mesin.</div>
          ) : (
            <div className="space-y-3.5">
              {machines.slice(0, 8).map((m) => {
                const widthPct = Math.max(4, Math.round((m.total_cases / maxMachineCases) * 100))
                return (
                  <Link
                    key={m.machine_id}
                    to={`/machines/${m.machine_id}/cases`}
                    className="block group space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[12px] text-[var(--faint)]">
                          {m.machine_code}
                        </span>
                        <span className="truncate text-[var(--text)] group-hover:underline">
                          {m.machine_name}
                        </span>
                        {m.is_recurring && <RecurringPill label={m.recurring_label} />}
                      </div>
                      <span className="font-mono text-[var(--text)] tabular-nums shrink-0">
                        {m.total_cases}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--raised)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Kasus per Kategori</h2>
            <span className="text-[12px] text-[var(--faint)]">Total: {summary?.total_cases_count ?? '—'}</span>
          </div>

          {dashboardQuery.isLoading ? (
            <div className="text-[14px] text-[var(--faint)]">Memuat kategori...</div>
          ) : categories.length === 0 ? (
            <div className="text-[14px] text-[var(--faint)]">Belum ada data kategori.</div>
          ) : (
            <div className="space-y-3.5">
              {categories.map((cat, idx) => {
                const widthPct = Math.max(4, Math.round((cat.total_cases / maxCategoryCases) * 100))
                return (
                  <div key={`${cat.category_name}-${idx}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[var(--text)]">{cat.category_name}</span>
                      <span className="font-mono text-[var(--text)] tabular-nums">{cat.total_cases}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--raised)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#b4b4b4]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Risk distribution compact table */}
          {(data?.cases_by_risk_level?.length ?? 0) > 0 && (
            <div className="border-t border-[var(--rule)] pt-4 space-y-2">
              <div className="text-[13px] font-medium text-[var(--muted)]">Sebaran Level Risiko</div>
              <div className="grid grid-cols-3 gap-2">
                {data!.cases_by_risk_level.map((r) => (
                  <div key={r.level} className="rounded-[6px] bg-[var(--ground)] px-3 py-2">
                    <div className="text-[12px] text-[var(--faint)]">{r.label}</div>
                    <div className="text-[18px] font-semibold text-[var(--text)] tabular-nums">
                      {r.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Overdue Actions Table */}
      <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
          <h2 className="text-[16px] font-semibold text-[var(--text)]">Daftar Tindakan Terlambat</h2>
          <Link to="/cases" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]">
            Semua kasus
          </Link>
        </div>
        <div className="divide-y divide-[var(--rule)]">
          {(data?.overdue_actions?.length ?? 0) === 0 ? (
            <div className="p-5 text-[14px] text-[var(--faint)]">
              Tidak ada tindakan yang melewati tenggat SLA.
            </div>
          ) : (
            data!.overdue_actions.map((oa) => (
              <Link
                key={oa.id}
                to={oa.safety_case ? `/cases/${oa.safety_case.id}` : '/cases'}
                className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-[var(--hover-row)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-[var(--accent)] tabular-nums">
                      {oa.safety_case?.case_number}
                    </span>
                    <span className="text-[12px] text-[var(--faint)]">
                      · {oa.safety_case?.machine?.code}
                    </span>
                  </div>
                  <div className="truncate text-[14px] font-medium text-[var(--text)]">{oa.title}</div>
                  <div className="text-[12px] text-[var(--faint)]">
                    PIC: {oa.pic?.name || '—'} · Tenggat: {formatDateTime(oa.due_at)}
                  </div>
                </div>
                <div className="shrink-0">
                  <OverduePill label={`${oa.overdue_label} (${oa.days_overdue}h)`} />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
