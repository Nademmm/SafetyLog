import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useReferenceData } from '@/lib/reference'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import type { Machine, SafetyCase } from '@/types/safetylog'

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'new', label: 'Baru' },
  { value: 'assessed', label: 'Dinilai' },
  { value: 'in_progress', label: 'Tindakan berjalan' },
  { value: 'pending_verification', label: 'Menunggu verifikasi' },
  { value: 'closed', label: 'Selesai' },
]

export function CasesQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = React.useState(searchParams.get('q') || '')
  const [status, setStatus] = React.useState(searchParams.get('status') || '')
  const [riskLevel, setRiskLevel] = React.useState(searchParams.get('risk_level') || '')
  const [machineId, setMachineId] = React.useState(searchParams.get('machine_id') || '')
  const [showMobileFilters, setShowMobileFilters] = React.useState(false)
  const activeFilterCount = (riskLevel ? 1 : 0) + (machineId ? 1 : 0)

  const filterScrollRef = React.useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const syncFilterScroll = React.useCallback(() => {
    const el = filterScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  React.useEffect(() => {
    syncFilterScroll()
    window.addEventListener('resize', syncFilterScroll)
    return () => window.removeEventListener('resize', syncFilterScroll)
  }, [syncFilterScroll])

  const scrollFilterBy = (delta: number) => {
    filterScrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const refQuery = useReferenceData()
  const machinesQuery = useQuery({
    queryKey: ['machines', 'filter'],
    queryFn: () => apiFetch<{ data: Machine[] }>('/machines'),
  })

  const queryString = React.useMemo(() => {
    const p = new URLSearchParams()
    p.set('per_page', '25')
    if (q.trim()) p.set('q', q.trim())
    if (status) p.set('status', status)
    if (riskLevel) p.set('risk_level', riskLevel)
    if (machineId) p.set('machine_id', machineId)
    return p.toString()
  }, [q, status, riskLevel, machineId])

  const casesQuery = useQuery({
    queryKey: ['cases', queryString],
    queryFn: () => apiFetch<{ data: SafetyCase[]; meta?: { total: number } }>(`/cases?${queryString}`),
  })

  const cases = casesQuery.data?.data ?? []
  const machines = machinesQuery.data?.data ?? []
  const riskLevels = refQuery.data?.risk_levels ?? []

  const updateStatus = (val: string) => {
    setStatus(val)
    const next = new URLSearchParams(searchParams)
    if (val) next.set('status', val)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Antrean &amp; Pencarian Kasus
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Pencarian toleran salah ketik (contoh: &ldquo;konvayor&rdquo; tetap menemukan &ldquo;konveyor&rdquo;).
          </p>
        </div>
        <div className="text-[13px] text-[var(--faint)] tabular-nums">
          {casesQuery.data?.meta?.total ?? cases.length} kasus ditemukan
        </div>
      </div>

      {/* Interactive Scrollable Status Filter Pills with Scroll Arrows & Sleek Scrollbar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[var(--faint)]">Filter Status Kasus</span>
          {(canScrollLeft || canScrollRight) && (
            <span className="text-[11px] text-[var(--faint)] sm:hidden">Geser kiri/kanan →</span>
          )}
        </div>

        <div className="relative flex items-center gap-1.5">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollFilterBy(-180)}
              aria-label="Geser filter ke kiri"
              className="hidden sm:inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div className="relative min-w-0 flex-1">
            {canScrollLeft && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--ground)] to-transparent"
              />
            )}

            <div
              ref={filterScrollRef}
              onScroll={syncFilterScroll}
              role="tablist"
              aria-label="Filter status kasus"
              className="filter-scrollbar flex items-center gap-2 overflow-x-auto pb-2.5 pt-0.5 scroll-smooth"
            >
              {STATUS_TABS.map((tab) => {
                const active = status === tab.value
                return (
                  <button
                    key={tab.value || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={(e) => {
                      updateStatus(tab.value)
                      e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'nearest',
                        block: 'nearest',
                      })
                    }}
                    className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border px-3.5 text-[13px] transition-all select-none ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--raised)] font-semibold text-[var(--text)] shadow-sm'
                        : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:border-[var(--faint)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        active ? 'bg-[var(--accent)]' : 'bg-[var(--control)]'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {canScrollRight && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--ground)] to-transparent"
              />
            )}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollFilterBy(180)}
              aria-label="Geser filter ke kanan"
              className="hidden sm:inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Row (1 compact row on phone, full 4-column inline on tablet/desktop) */}
      <div className="space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-3">
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kasus, mesin, deskripsi..."
            className="h-11 min-w-0 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[16px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowMobileFilters((v) => !v)}
            aria-expanded={showMobileFilters}
            aria-label="Filter risiko dan mesin"
            className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-[13px] font-medium sm:hidden ${
              showMobileFilters || activeFilterCount > 0
                ? 'border-[var(--accent)] bg-[var(--raised)] text-[var(--text)]'
                : 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-[4px] bg-[var(--accent)] px-1 font-mono text-[11px] font-semibold text-black tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div
          className={`${
            showMobileFilters ? 'grid' : 'hidden'
          } grid-cols-2 gap-2.5 sm:contents`}
        >
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            aria-label="Filter level risiko"
            className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="">Semua Risiko</option>
            {riskLevels.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
            aria-label="Filter mesin"
            className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="">Semua Mesin</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {casesQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat daftar kasus...</div>
        ) : casesQuery.isError ? (
          <div className="p-5 text-[14px] text-[var(--safety-danger-foreground)]">Gagal memuat data kasus.</div>
        ) : cases.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            Tidak ada kasus yang cocok dengan filter saat ini.
          </div>
        ) : (
          cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="flex flex-col gap-2 px-5 py-4 hover:bg-[var(--hover-row)] md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                    {c.case_number}
                  </span>
                  <span className="text-[12px] text-[var(--faint)]">· {c.case_type?.name}</span>
                  {c.is_machine_stopped && (
                    <span className="rounded-[4px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-1.5 py-0.5 text-[11px] text-[var(--safety-danger-foreground)]">
                      Mesin berhenti
                    </span>
                  )}
                </div>
                <div className="text-[15px] font-medium text-[var(--text)]">
                  {c.machine ? `${c.machine.code} — ${c.machine.name}` : 'Mesin'}
                </div>
                <p className="text-[13px] text-[var(--muted)] line-clamp-1">{c.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <RiskPill
                  level={c.risk_assessment.risk_level}
                  score={c.risk_assessment.risk_score}
                  label={c.risk_assessment.risk_level_label}
                />
                <CaseStatusPill status={c.status} label={c.status_label} />
                <span className="hidden lg:inline text-[12px] text-[var(--faint)] tabular-nums ml-2">
                  {formatDateTime(c.reported_at)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
