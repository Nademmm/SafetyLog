import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useReferenceData } from '@/lib/reference'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import type { Machine, PaginationMeta, SafetyCase } from '@/types/safetylog'

const FALLBACK_STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'new', label: 'Baru' },
  { value: 'assessed', label: 'Dinilai' },
  { value: 'analyzed', label: 'Dianalisis' },
  { value: 'in_progress', label: 'Tindakan berjalan' },
  { value: 'pending_verification', label: 'Menunggu verifikasi' },
  { value: 'closed', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'duplicate', label: 'Duplikat' },
]

export function CasesQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQ = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const riskLevel = searchParams.get('risk_level') || ''
  const machineId = searchParams.get('machine_id') || ''
  const categoryId = searchParams.get('category_id') || ''
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo = searchParams.get('date_to') || ''
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)

  const [qInput, setQInput] = React.useState(urlQ)
  const [showMobileFilters, setShowMobileFilters] = React.useState(false)

  // Keep input synced when navigated via top-bar search
  const prevUrlQRef = React.useRef(urlQ)
  React.useEffect(() => {
    if (prevUrlQRef.current !== urlQ) {
      prevUrlQRef.current = urlQ
      setQInput(urlQ)
    }
  }, [urlQ])

  const updateParams = React.useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(patch).forEach(([k, v]) => {
        if (v) next.set(k, v)
        else next.delete(k)
      })
      if (resetPage) next.delete('page')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  // Debounce search text into URL query param
  React.useEffect(() => {
    const trimmed = qInput.trim()
    if (trimmed === urlQ) return
    const timer = window.setTimeout(() => {
      updateParams({ q: trimmed || null }, true)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [qInput, urlQ, updateParams])

  const activeFilterCount =
    (riskLevel ? 1 : 0) +
    (machineId ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0)

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

  const statusTabs = React.useMemo(() => {
    const dynamic = refQuery.data?.case_statuses
    if (!dynamic || dynamic.length === 0) return FALLBACK_STATUS_TABS
    return [{ value: '', label: 'Semua' }, ...dynamic]
  }, [refQuery.data?.case_statuses])

  const queryString = React.useMemo(() => {
    const p = new URLSearchParams()
    p.set('per_page', '20')
    p.set('page', String(page))
    if (urlQ) p.set('q', urlQ)
    if (status) p.set('status', status)
    if (riskLevel) p.set('risk_level', riskLevel)
    if (machineId) p.set('machine_id', machineId)
    if (categoryId) p.set('category_id', categoryId)
    if (dateFrom) p.set('date_from', dateFrom)
    if (dateTo) p.set('date_to', dateTo)
    return p.toString()
  }, [urlQ, status, riskLevel, machineId, categoryId, dateFrom, dateTo, page])

  const casesQuery = useQuery({
    queryKey: ['cases', queryString],
    queryFn: () =>
      apiFetch<{ data: SafetyCase[]; meta?: PaginationMeta }>(`/cases?${queryString}`),
  })

  const cases = casesQuery.data?.data ?? []
  const machines = machinesQuery.data?.data ?? []
  const riskLevels = refQuery.data?.risk_levels ?? []
  const categories = refQuery.data?.categories ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Antrean &amp; Pencarian Kasus
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Pencarian toleran salah ketik (contoh: &ldquo;konvayor&rdquo; tetap menemukan
            &ldquo;konveyor&rdquo;).
          </p>
        </div>
        <div className="text-[13px] text-[var(--faint)] tabular-nums">
          {casesQuery.data?.meta?.total ?? cases.length} kasus ditemukan
        </div>
      </div>

      {/* Interactive Scrollable Status Filter Pills */}
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
              className="hidden sm:inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-colors cursor-pointer"
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
              {statusTabs.map((tab) => {
                const active = status === tab.value
                return (
                  <button
                    key={tab.value || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={(e) => {
                      updateParams({ status: tab.value || null }, true)
                      e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'nearest',
                        block: 'nearest',
                      })
                    }}
                    className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border px-3.5 text-[13px] transition-all select-none ${
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
              className="hidden sm:inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
          <div className="flex items-center gap-2 sm:col-span-5">
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Cari nomor kasus, mesin, deskripsi..."
              className="h-11 min-w-0 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowMobileFilters((v) => !v)}
              aria-expanded={showMobileFilters}
              aria-label="Filter lanjutan"
              className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-[13px] font-medium sm:hidden ${
                showMobileFilters || activeFilterCount > 0
                  ? 'border-[var(--accent)] bg-[var(--raised)] text-[var(--text)]'
                  : 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)]'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-[4px] bg-[var(--accent)] px-1 font-mono text-[11px] font-semibold text-[var(--accent-ink)] tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div
            className={`${
              showMobileFilters ? 'grid' : 'hidden'
            } grid-cols-2 gap-2.5 sm:col-span-7 sm:grid sm:grid-cols-3`}
          >
            <select
              value={riskLevel}
              onChange={(e) => updateParams({ risk_level: e.target.value || null }, true)}
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
              onChange={(e) => updateParams({ machine_id: e.target.value || null }, true)}
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

            <select
              value={categoryId}
              onChange={(e) => updateParams({ category_id: e.target.value || null }, true)}
              aria-label="Filter kategori"
              className="col-span-2 sm:col-span-1 h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={`${
            showMobileFilters ? 'flex' : 'hidden'
          } flex-wrap items-center gap-2 sm:flex`}
        >
          <div className="flex items-center gap-2 text-[12px] text-[var(--faint)]">
            <span>Dari:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => updateParams({ date_from: e.target.value || null }, true)}
              aria-label="Tanggal mulai"
              className="h-10 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[var(--faint)]">
            <span>Sampai:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => updateParams({ date_to: e.target.value || null }, true)}
              aria-label="Tanggal akhir"
              className="h-10 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          {(activeFilterCount > 0 || status || urlQ) && (
            <button
              type="button"
              onClick={() => {
                setQInput('')
                setSearchParams({}, { replace: true })
              }}
              className="inline-flex h-10 items-center gap-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {casesQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat daftar kasus."
          onRetry={() => void casesQuery.refetch()}
        />
      )}

      {/* Cases List */}
      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {casesQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat daftar kasus...</div>
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

      <PaginationBar
        meta={casesQuery.data?.meta}
        onPageChange={(nextPage) => updateParams({ page: String(nextPage) }, false)}
        isFetching={casesQuery.isFetching}
      />
    </div>
  )
}
