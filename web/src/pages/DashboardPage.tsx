import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronRight, Filter, X } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-helpers'
import { formatDateTime } from '@/lib/format'
import { dashboardKeys, siteKeys } from '@/data/query-keys'
import { OverduePill, RecurringPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { AiDashboardSummary, AiEnvelope, DashboardData, SiteRef } from '@/types/safetylog'

export function DashboardPage() {
  const { user } = useAuth()
  const [siteId, setSiteId] = React.useState('')
  const [summarySiteId, setSummarySiteId] = React.useState<string | null>(null)
  const [filterOpen, setFilterOpen] = React.useState(false)
  const filterPanelRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!filterOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filterOpen])

  const sitesQuery = useQuery({
    queryKey: siteKeys.list({ scope: 'active' }),
    queryFn: () => apiFetch<{ data: SiteRef[] }>('/sites'),
    enabled: user?.role === 'admin',
    retry: false,
  })

  const dashboardQuery = useQuery({
    queryKey: dashboardKeys.summary(siteId || null),
    queryFn: () =>
      apiFetch<{ data: DashboardData }>(`/dashboard${siteId ? `?site_id=${siteId}` : ''}`),
  })

  const summaryMutation = useMutation({
    mutationFn: ({ refresh }: { refresh: boolean }) =>
      apiFetch<AiEnvelope<AiDashboardSummary>>('/ai/dashboard-summary', {
        method: 'POST',
        json: {
          site_id: siteId ? Number(siteId) : null,
          refresh,
        },
      }),
    onSuccess: () => setSummarySiteId(siteId),
    onError: () => setSummarySiteId(siteId),
  })

  const summaryResponse = summarySiteId === siteId ? summaryMutation.data : undefined
  const aiSummary = summaryResponse?.data
  const summaryVisible = summarySiteId === siteId

  const changeSite = (nextSiteId: string) => {
    setSiteId(nextSiteId)
    setSummarySiteId(null)
    summaryMutation.reset()
  }

  const data = dashboardQuery.data?.data
  const summary = data?.summary
  const recurringRule = data?.recurring_rule ?? { threshold: 3, window_days: 90 }
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

        {(sitesQuery.data?.data?.length ?? 0) > 1 && (() => {
          const sitesList = sitesQuery.data!.data
          const activeSiteName = sitesList.find((s) => String(s.id) === siteId)?.name || 'Semua Site'
          return (
            <div ref={filterPanelRef} className="relative shrink-0 self-start">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
                aria-haspopup="dialog"
                className={`inline-flex h-11 items-center gap-2 rounded-[6px] border px-3.5 text-[14px] transition-colors cursor-pointer ${
                  filterOpen || siteId
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                    : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--text)] hover:bg-[var(--raised)]'
                }`}
              >
                <Filter className={`h-4 w-4 shrink-0 ${siteId ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
                <span>Filter</span>
                <span className="rounded-[4px] bg-[var(--ground)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                  {activeSiteName}
                </span>
                <ChevronDown
                  className={`hidden sm:block h-4 w-4 text-[var(--faint)] transition-transform ${
                    filterOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {filterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/60 sm:hidden"
                    onClick={() => setFilterOpen(false)}
                    aria-hidden="true"
                  />

                  <div
                    role="dialog"
                    aria-label="Filter site dashboard"
                    className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-[16px] border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(0,0,0,0.3)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[272px] sm:rounded-[8px] sm:border sm:p-2 sm:shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
                  >
                    <div className="mb-3 space-y-2 sm:hidden">
                      <div className="mx-auto h-1 w-10 rounded-full bg-[var(--control)]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-semibold text-[var(--text)]">
                          Filter Site
                        </span>
                        <button
                          type="button"
                          onClick={() => setFilterOpen(false)}
                          aria-label="Tutup filter"
                          className="flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-[var(--raised)]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          changeSite('')
                          setFilterOpen(false)
                        }}
                        className={`flex min-h-[44px] sm:min-h-[40px] w-full items-center justify-between rounded-[6px] px-3 text-left text-[14px] transition-colors cursor-pointer ${
                          !siteId
                            ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'font-normal text-[var(--muted)] hover:bg-[var(--hover-row)] hover:text-[var(--text)]'
                        }`}
                      >
                        <span>Semua Site</span>
                        {!siteId && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 stroke-[2.2px]" />}
                      </button>

                      {sitesList.map((s) => {
                        const active = String(s.id) === siteId
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              changeSite(String(s.id))
                              setFilterOpen(false)
                            }}
                            className={`flex min-h-[44px] sm:min-h-[40px] w-full items-center justify-between rounded-[6px] px-3 text-left text-[14px] transition-colors cursor-pointer ${
                              active
                                ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                                : 'font-normal text-[var(--muted)] hover:bg-[var(--hover-row)] hover:text-[var(--text)]'
                            }`}
                          >
                            <span>{s.name}</span>
                            {active && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 stroke-[2.2px]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </div>

      {dashboardQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat data dashboard pabrik."
          onRetry={() => void dashboardQuery.refetch()}
        />
      )}

      {/* Divided KPI Strip (crisp 1px hairlines across phone 2x2 & desktop 4-col) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Kasus terbuka</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.open_cases_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Tindakan terlambat</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.overdue_actions_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Selesai bulan ini</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-safe-foreground)] tabular-nums">
            {summary ? summary.closed_this_month_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">
            Mesin berulang ({recurringRule.window_days}h)
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {summary ? summary.recurring_machines_count : '—'}
          </div>
        </div>
      </div>

      {/* AI-06: narrative summary built from the same dashboard aggregates */}
      <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Ringkasan AI</h2>
            <p className="text-[12px] text-[var(--faint)]">
              Narasi berdasarkan angka yang sudah dihitung SafetyLog, bukan sumber angka baru.
            </p>
          </div>
          <button
            type="button"
            onClick={() => summaryMutation.mutate({ refresh: Boolean(summaryResponse) })}
            disabled={summaryMutation.isPending || dashboardQuery.isLoading}
            className="h-11 shrink-0 rounded-[6px] border border-[var(--accent)] bg-[var(--ground)] px-3.5 text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--raised)] disabled:opacity-50 cursor-pointer transition-colors"
          >
            {summaryMutation.isPending
              ? 'Menyusun ringkasan...'
              : summaryResponse
                ? 'Perbarui Ringkasan'
                : 'Buat Ringkasan AI'}
          </button>
        </div>

        {summaryMutation.isError && summaryVisible && (
          <div
            role="alert"
            className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--safety-danger-foreground)]"
          >
            {summaryMutation.error instanceof ApiError
              ? summaryMutation.error.message
              : 'Gagal menyusun ringkasan AI.'}
          </div>
        )}

        {summaryResponse && aiSummary && (
          <div
            role="status"
            className="space-y-3 rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3.5"
          >
            <div className="text-[14px] font-semibold text-[var(--text)]">
              {aiSummary.headline}
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-[12px] font-semibold text-[var(--muted)]">Temuan utama</div>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--text)]">
                  {aiSummary.key_findings.map((item, idx) => (
                    <li key={`finding-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <div className="text-[12px] font-semibold text-[var(--muted)]">
                  Tindak lanjut yang disarankan
                </div>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--text)]">
                  {aiSummary.suggested_follow_ups.length === 0 ? (
                    <li className="list-none text-[var(--faint)]">
                      Belum ada saran tindak lanjut.
                    </li>
                  ) : (
                    aiSummary.suggested_follow_ups.map((item, idx) => (
                      <li key={`followup-${idx}`}>{item}</li>
                    ))
                  )}
                </ul>
              </div>
              <div className="space-y-1.5">
                <div className="text-[12px] font-semibold text-[var(--muted)]">Catatan tren</div>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--text)]">
                  {aiSummary.trend_observations.length === 0 ? (
                    <li className="list-none text-[var(--faint)]">
                      Data historis belum cukup.
                    </li>
                  ) : (
                    aiSummary.trend_observations.map((item, idx) => (
                      <li key={`trend-${idx}`}>{item}</li>
                    ))
                  )}
                </ul>
              </div>
              <div className="space-y-1.5">
                <div className="text-[12px] font-semibold text-[var(--muted)]">
                  Keterbatasan data
                </div>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--text)]">
                  {aiSummary.data_limitations.length === 0 ? (
                    <li className="list-none text-[var(--faint)]">
                      Tidak ada catatan keterbatasan.
                    </li>
                  ) : (
                    aiSummary.data_limitations.map((item, idx) => (
                      <li key={`limitation-${idx}`}>{item}</li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="border-t border-[var(--rule)] pt-2.5 space-y-0.5 text-[12px] text-[var(--faint)]">
              <div>
                {aiSummary.period?.label ?? 'Periode mengikuti data dashboard yang tersedia.'}
                {' · '}Data hingga {formatDateTime(aiSummary.period?.as_of ?? aiSummary.generated_at)}.
              </div>
              <div>Dibuat {formatDateTime(aiSummary.generated_at)} · Ringkasan perlu ditinjau.</div>
            </div>
          </div>
        )}
      </section>

      {/* Charts Row: Single Data Hue (#F97316) horizontal bar lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Kasus per Mesin</h2>
            <span className="text-[12px] text-[var(--faint)]">
              Ambang berulang: ≥ {recurringRule.threshold} / {recurringRule.window_days} hari
            </span>
          </div>

          {dashboardQuery.isLoading ? (
            <SectionLoading label="Memuat data mesin..." className="py-6" />
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
                        {m.is_recurring && <RecurringPill label={m.recurring_label || 'Berulang'} />}
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

        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Kasus per Kategori</h2>
            <span className="text-[12px] text-[var(--faint)]">
              Total: {summary?.total_cases_count ?? '—'}
            </span>
          </div>

          {dashboardQuery.isLoading ? (
            <SectionLoading label="Memuat kategori..." className="py-6" />
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
                      <span className="font-mono text-[var(--text)] tabular-nums">
                        {cat.total_cases}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--raised)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--muted)]"
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
              <div className="text-[13px] font-medium text-[var(--muted)]">
                Sebaran Level Risiko
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {data!.cases_by_risk_level.map((r, idx) => (
                  <div
                    key={`${r.risk_level ?? 'unassessed'}-${idx}`}
                    className="rounded-[6px] bg-[var(--ground)] px-3 py-2"
                  >
                    <div className="text-[12px] text-[var(--faint)]">{r.label}</div>
                    <div className="text-[18px] font-semibold text-[var(--text)] tabular-nums">
                      {r.total_cases}
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
        <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-[16px] font-semibold text-[var(--text)] truncate">
              Daftar Tindakan Terlambat
            </h2>
            {(data?.overdue_actions?.length ?? 0) > 0 && (
              <span className="shrink-0 rounded-[4px] bg-[var(--safety-danger-bg)] border border-[var(--safety-danger-border)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
                {data!.overdue_actions.length}
              </span>
            )}
          </div>
          <Link
            to="/cases"
            className="shrink-0 text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            Semua kasus
          </Link>
        </div>

        {(data?.overdue_actions?.length ?? 0) === 0 ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">
            Tidak ada tindakan yang melewati tenggat SLA.
          </div>
        ) : (
          <div>
            {/* Desktop Column Header (flat hairline rule, no tinted header band) */}
            <div className="hidden md:grid md:grid-cols-12 md:gap-4 border-b border-[var(--rule)] px-5 py-2.5 text-[12px] font-medium text-[var(--faint)]">
              <div className="col-span-5">Tindakan &amp; Kasus</div>
              <div className="col-span-2">PIC</div>
              <div className="col-span-3">Tenggat SLA</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            <div className="divide-y divide-[var(--rule)]">
              {data!.overdue_actions.map((oa) => (
                <Link
                  key={oa.id}
                  to={oa.safety_case ? `/cases/${oa.safety_case.id}` : '/cases'}
                  className="group block px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  {/* Mobile & Small Tablet Layout (< md): Clean 3-tier hierarchy, zero overlap */}
                  <div className="flex flex-col gap-2.5 md:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                          {oa.safety_case?.case_number || '—'}
                        </span>
                        {oa.safety_case?.machine?.code && (
                          <span className="rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--muted)]">
                            {oa.safety_case.machine.code}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0">
                        <OverduePill label={`${oa.overdue_label} (${oa.days_overdue}h)`} />
                      </div>
                    </div>

                    <div className="text-[14px] font-medium leading-snug text-[var(--text)] line-clamp-2">
                      {oa.title}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-0.5 text-[12px] text-[var(--muted)]">
                      <span className="truncate">
                        PIC: <strong className="font-medium text-[var(--text)]">{oa.pic?.name || '—'}</strong>
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--faint)]">
                        Tenggat {formatDateTime(oa.due_at)}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Layout (>= md): Crisp 12-col aligned table row */}
                  <div className="hidden md:grid md:grid-cols-12 md:items-center md:gap-4">
                    <div className="col-span-5 min-w-0 space-y-1">
                      <div className="truncate text-[14px] font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                        {oa.title}
                      </div>
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="font-mono font-semibold text-[var(--accent)] tabular-nums">
                          {oa.safety_case?.case_number || '—'}
                        </span>
                        {oa.safety_case?.machine?.code && (
                          <span className="rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--muted)]">
                            {oa.safety_case.machine.code}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 min-w-0 truncate text-[13px] font-medium text-[var(--text)]">
                      {oa.pic?.name || '—'}
                    </div>

                    <div className="col-span-3 text-[13px] text-[var(--muted)] tabular-nums">
                      {formatDateTime(oa.due_at)}
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <OverduePill label={`${oa.overdue_label} (${oa.days_overdue}h)`} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
