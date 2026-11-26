import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Filter, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { localizeCaseTypeName, localizeMachineName, useLanguage } from '@/lib/i18n-helpers'
import { useReferenceData } from '@/lib/reference'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { Select } from '@/components/ui/FormField'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { Machine, PaginationMeta, SafetyCase } from '@/types/safetylog'

const STATUS_LABELS_EN: Record<string, string> = {
  '': 'All',
  new: 'New',
  assessed: 'Assessed',
  analyzed: 'Analyzed',
  in_progress: 'In Progress',
  pending_verification: 'Pending Verification',
  closed: 'Closed',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
}

const RISK_LABELS_EN: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

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
  const { lang, pick } = useLanguage()
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
    (status ? 1 : 0) +
    (riskLevel ? 1 : 0) +
    (machineId ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0)

  const refQuery = useReferenceData()
  const machinesQuery = useQuery({
    queryKey: ['machines', 'filter'],
    queryFn: () => apiFetch<{ data: Machine[] }>('/machines'),
  })

  const statusTabs = React.useMemo(() => {
    const dynamic = refQuery.data?.case_statuses
    const base =
      !dynamic || dynamic.length === 0
        ? FALLBACK_STATUS_TABS
        : [{ value: '', label: 'Semua' }, ...dynamic]
    if (lang !== 'en') return base
    return base.map((item) => ({
      ...item,
      label: STATUS_LABELS_EN[item.value] ?? item.label,
    }))
  }, [refQuery.data?.case_statuses, lang])

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

  const activeStatusLabel =
    statusTabs.find((t) => t.value === status)?.label || pick('Semua', 'All')
  const rawRiskLabel = riskLevels.find((r) => r.value === riskLevel)?.label || riskLevel
  const activeRiskLabel =
    lang === 'en' ? (RISK_LABELS_EN[riskLevel] ?? rawRiskLabel) : rawRiskLabel
  const activeMachine = machines.find((m) => String(m.id) === machineId)
  const activeCategory = categories.find((cat) => String(cat.id) === categoryId)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          {pick('Antrean & Pencarian Kasus', 'Case Queue & Search')}
        </h1>
        <div className="text-[13px] text-[var(--faint)] tabular-nums">
          {casesQuery.data?.meta?.total ?? cases.length} {pick('kasus ditemukan', 'cases found')}
        </div>
      </div>

      {/* Unified Search + Single Filter Button (Mobile Sheet & Desktop Popover) */}
      <div className="space-y-2.5">
        <div ref={filterPanelRef} className="relative flex items-center gap-2">
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={pick(
              'Cari nomor kasus, mesin, deskripsi...',
              'Search case number, machine, description...',
            )}
            className="h-11 min-w-0 flex-1 rounded-[8px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-haspopup="dialog"
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-[6px] border px-3.5 text-[14px] transition-colors cursor-pointer ${
              filterOpen || activeFilterCount > 0
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--text)] hover:bg-[var(--raised)]'
            }`}
          >
            <Filter
              className={`h-4 w-4 shrink-0 ${
                activeFilterCount > 0 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
              }`}
            />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-[4px] bg-[var(--accent)] px-1.5 font-mono text-[11px] font-semibold text-[var(--accent-ink)] tabular-nums">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`hidden sm:block h-4 w-4 text-[var(--faint)] transition-transform ${
                filterOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {filterOpen && (
            <>
              {/* Mobile Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/60 sm:hidden"
                onClick={() => setFilterOpen(false)}
                aria-hidden="true"
              />

              {/* Unified Filter Bottom Sheet (Mobile) / Popover Panel (Desktop) */}
              <div
                role="dialog"
                aria-label={pick('Filter kasus', 'Case filters')}
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[84vh] flex-col rounded-t-[16px] border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-12px_32px_rgba(0,0,0,0.3)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[400px] sm:max-h-[75vh] sm:rounded-[8px] sm:border sm:shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
              >
                {/* Header */}
                <div className="shrink-0 border-b border-[var(--rule)] px-4 pt-3 pb-3 sm:px-4 sm:py-3">
                  <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[var(--control)] sm:hidden" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[var(--text)]">
                        {pick('Filter Kasus', 'Case Filters')}
                      </span>
                      {activeFilterCount > 0 && (
                        <span className="rounded-[4px] bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] tabular-nums">
                          {activeFilterCount} {pick('aktif', 'active')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      aria-label={pick('Tutup filter', 'Close filters')}
                      className="flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-[var(--raised)] cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Filter Sections */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* 1. Status Kasus */}
                  <div className="space-y-2">
                    <span className="block text-[13px] font-semibold text-[var(--text)]">
                      {pick('Status Kasus', 'Case Status')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {statusTabs.map((tab) => {
                        const active = status === tab.value
                        return (
                          <button
                            key={tab.value || 'all'}
                            type="button"
                            onClick={() => updateParams({ status: tab.value || null }, true)}
                            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                                : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                            }`}
                          >
                            {active && <Check className="h-3.5 w-3.5 stroke-[2.5px]" />}
                            <span>{tab.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 2. Level Risiko */}
                  <div className="space-y-2">
                    <span className="block text-[13px] font-semibold text-[var(--text)]">
                      {pick('Level Risiko', 'Risk Level')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateParams({ risk_level: null }, true)}
                        className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                          !riskLevel
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                        }`}
                      >
                        {!riskLevel && <Check className="h-3.5 w-3.5 text-[var(--accent)] stroke-[2.5px]" />}
                        <span>{pick('Semua Risiko', 'All Risks')}</span>
                      </button>
                      {riskLevels.map((r) => {
                        const active = riskLevel === r.value
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => updateParams({ risk_level: r.value }, true)}
                            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                                : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                            }`}
                          >
                            {active && <Check className="h-3.5 w-3.5 text-[var(--accent)] stroke-[2.5px]" />}
                            <span>{lang === 'en' ? (RISK_LABELS_EN[r.value] ?? r.label) : r.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 3. Mesin & Kategori */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Mesin', 'Machine')}
                      </label>
                      <Select
                        value={machineId}
                        onChange={(e) => updateParams({ machine_id: e.target.value || null }, true)}
                        aria-label={pick('Filter mesin', 'Filter machine')}
                      >
                        <option value="">{pick('Semua Mesin', 'All Machines')}</option>
                        {machines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} — {m.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Kategori', 'Category')}
                      </label>
                      <Select
                        value={categoryId}
                        onChange={(e) => updateParams({ category_id: e.target.value || null }, true)}
                        aria-label={pick('Filter kategori', 'Filter category')}
                      >
                        <option value="">{pick('Semua Kategori', 'All Categories')}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* 4. Rentang Tanggal */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Dari Tanggal', 'From Date')}
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => updateParams({ date_from: e.target.value || null }, true)}
                        aria-label={pick('Tanggal mulai', 'Start date')}
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Sampai Tanggal', 'To Date')}
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => updateParams({ date_to: e.target.value || null }, true)}
                        aria-label={pick('Tanggal akhir', 'End date')}
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center gap-2.5 border-t border-[var(--rule)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
                  <button
                    type="button"
                    disabled={activeFilterCount === 0 && !urlQ}
                    onClick={() => {
                      setQInput('')
                      setSearchParams({}, { replace: true })
                    }}
                    className="h-11 flex-1 rounded-[6px] border border-[var(--control)] text-[14px] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-40 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="h-11 flex-[1.5] rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] cursor-pointer"
                  >
                    {pick('Terapkan', 'Apply')} ({casesQuery.data?.meta?.total ?? cases.length})
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Active Filter Summary Chips (hanya tampil saat ada filter aktif) */}
        {(activeFilterCount > 0 || urlQ) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            {status && (
              <button
                type="button"
                onClick={() => updateParams({ status: null }, true)}
                className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--accent)] bg-[var(--raised)] px-2.5 font-medium text-[var(--text)] hover:opacity-80 cursor-pointer"
              >
                <span>Status: {activeStatusLabel}</span>
                <X className="h-3 w-3 text-[var(--muted)]" />
              </button>
            )}
            {riskLevel && (
              <button
                type="button"
                onClick={() => updateParams({ risk_level: null }, true)}
                className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--control)] bg-[var(--surface)] px-2.5 font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
              >
                <span>{pick('Risiko', 'Risk')}: {activeRiskLabel}</span>
                <X className="h-3 w-3 text-[var(--muted)]" />
              </button>
            )}
            {activeMachine && (
              <button
                type="button"
                onClick={() => updateParams({ machine_id: null }, true)}
                className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--control)] bg-[var(--surface)] px-2.5 font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
              >
                <span>{pick('Mesin', 'Machine')}: {activeMachine.code}</span>
                <X className="h-3 w-3 text-[var(--muted)]" />
              </button>
            )}
            {activeCategory && (
              <button
                type="button"
                onClick={() => updateParams({ category_id: null }, true)}
                className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--control)] bg-[var(--surface)] px-2.5 font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
              >
                <span>{pick('Kategori', 'Category')}: {activeCategory.name}</span>
                <X className="h-3 w-3 text-[var(--muted)]" />
              </button>
            )}
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => updateParams({ date_from: null, date_to: null }, true)}
                className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--control)] bg-[var(--surface)] px-2.5 font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
              >
                <span>
                  {pick('Tanggal', 'Date')}: {dateFrom || '...'} – {dateTo || '...'}
                </span>
                <X className="h-3 w-3 text-[var(--muted)]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setQInput('')
                setSearchParams({}, { replace: true })
              }}
              className="inline-flex h-7 items-center px-2 text-[12px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
            >
              {pick('Reset semua', 'Reset all')}
            </button>
          </div>
        )}
      </div>

      {casesQuery.isError && (
        <QueryErrorBanner
          message={pick('Gagal memuat daftar kasus.', 'Failed to load case list.')}
          onRetry={() => void casesQuery.refetch()}
        />
      )}

      {/* Cases List */}
      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {casesQuery.isLoading ? (
          <SectionLoading label={pick('Memuat daftar kasus...', 'Loading case list...')} />
        ) : cases.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            {pick(
              'Tidak ada kasus yang cocok dengan filter saat ini.',
              'No cases match the current filters.',
            )}
          </div>
        ) : (
          cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="flex flex-col gap-2.5 px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-[var(--hover-row)] md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="text-[15px] font-medium text-[var(--text)] truncate">
                  {c.machine ? `${c.machine.code} — ${localizeMachineName(lang, c.machine.name, c.machine.code)}` : pick('Mesin', 'Machine')}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--muted)]">
                  <span>
                    {c.case_type?.name
                      ? localizeCaseTypeName(lang, c.case_type.name, c.case_type.code)
                      : pick('Laporan', 'Report')}
                  </span>
                  {c.is_machine_stopped && (
                    <span className="rounded-[4px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--safety-danger-foreground)]">
                      {pick('Mesin berhenti', 'Machine stopped')}
                    </span>
                  )}
                  <span className="text-[var(--faint)] tabular-nums md:hidden">
                    · {formatDateTime(c.reported_at)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <RiskPill
                  level={c.risk_assessment.risk_level}
                  score={c.risk_assessment.risk_score}
                  label={c.risk_assessment.risk_level_label}
                />
                <CaseStatusPill status={c.status} label={c.status_label} />
                <span className="hidden md:inline text-[12px] text-[var(--faint)] tabular-nums ml-2">
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
