import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Filter, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { OverduePill } from '@/components/safety/StatusPill'
import { CompleteActionModal } from '@/components/safety/CompleteActionModal'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { CaseAction, PaginationMeta } from '@/types/safetylog'

const STATUS_FILTERS: Array<{ value: 'open' | 'completed' | 'all'; label: string }> = [
  { value: 'open', label: 'Terbuka' },
  { value: 'completed', label: 'Selesai' },
  { value: 'all', label: 'Semua' },
]

export function MyActionsPage() {
  const [statusFilter, setStatusFilter] = React.useState<'open' | 'completed' | 'all'>('open')
  const [page, setPage] = React.useState(1)
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

  const activeFilterLabel =
    STATUS_FILTERS.find((t) => t.value === statusFilter)?.label || 'Terbuka'

  const actionsQuery = useQuery({
    queryKey: ['my-actions', statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: '20', page: String(page) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return apiFetch<{ data: CaseAction[]; meta?: PaginationMeta }>(
        `/my-actions?${params.toString()}`,
      )
    },
  })

  const [activeAction, setActiveAction] = React.useState<CaseAction | null>(null)
  const actions = actionsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Tindakan Saya
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Daftar tindakan CAPA yang ditugaskan kepada Anda. Isi catatan hasil beserta analisis 5
            Why &amp; 6M saat menyelesaikan tindakan.
          </p>
        </div>

        {/* Unified Filter Button (Mobile Sheet & Desktop Popover) */}
        <div ref={filterPanelRef} className="relative shrink-0 self-start">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-haspopup="dialog"
            className={`inline-flex h-11 items-center gap-2 rounded-[6px] border px-3.5 text-[14px] transition-colors cursor-pointer ${
              filterOpen || statusFilter !== 'open'
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--text)] hover:bg-[var(--raised)]'
            }`}
          >
            <Filter
              className={`h-4 w-4 shrink-0 ${
                statusFilter !== 'open' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
              }`}
            />
            <span>Filter</span>
            <span className="rounded-[4px] bg-[var(--ground)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted)]">
              {activeFilterLabel}
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
                aria-label="Filter status tindakan"
                className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[16px] border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(0,0,0,0.3)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[260px] sm:rounded-[8px] sm:border sm:p-2 sm:shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
              >
                <div className="mb-3 space-y-2 sm:hidden">
                  <div className="mx-auto h-1 w-10 rounded-full bg-[var(--control)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[var(--text)]">
                      Filter Tindakan
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

                <div className="space-y-1">
                  {STATUS_FILTERS.map((tab) => {
                    const active = statusFilter === tab.value
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(tab.value)
                          setPage(1)
                          setFilterOpen(false)
                        }}
                        className={`flex min-h-[44px] sm:min-h-[40px] w-full items-center justify-between rounded-[6px] px-3 text-left text-[14px] transition-colors cursor-pointer ${
                          active
                            ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'font-normal text-[var(--muted)] hover:bg-[var(--hover-row)] hover:text-[var(--text)]'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {active && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 stroke-[2.2px]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {actionsQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat daftar tindakan Anda."
          onRetry={() => void actionsQuery.refetch()}
        />
      )}

      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {actionsQuery.isLoading ? (
          <SectionLoading label="Memuat daftar tindakan..." />
        ) : actions.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            Tidak ada tindakan pada filter ini.
          </div>
        ) : (
          actions.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                    {a.action_type_label}
                  </span>
                  {a.safety_case && (
                    <Link
                      to={`/cases/${a.safety_case.id}`}
                      className="font-mono text-[12px] text-[var(--accent)] hover:underline tabular-nums"
                    >
                      {a.safety_case.case_number}
                    </Link>
                  )}
                  {a.is_overdue && a.status !== 'completed' && (
                    <OverduePill label={a.overdue_label} />
                  )}
                </div>
                <div className="text-[15px] font-medium text-[var(--text)]">{a.title}</div>
                <div className="text-[12px] text-[var(--faint)] tabular-nums">
                  Tenggat: {formatDateTime(a.due_at)} · Status: {a.status_label}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {a.can_complete && (
                  <button
                    type="button"
                    onClick={() => setActiveAction(a)}
                    className="h-11 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
                  >
                    Selesaikan
                  </button>
                )}
                {a.safety_case && (
                  <Link
                    to={`/cases/${a.safety_case.id}`}
                    className="inline-flex h-11 items-center rounded-[6px] border border-[var(--control)] px-3.5 text-[13px] text-[var(--text)] hover:bg-[var(--raised)]"
                  >
                    Buka Kasus
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <PaginationBar
        meta={actionsQuery.data?.meta}
        onPageChange={setPage}
        isFetching={actionsQuery.isFetching}
      />

      {activeAction && (
        <CompleteActionModal
          action={activeAction}
          caseId={activeAction.safety_case?.id ?? activeAction.safety_case_id}
          caseNumber={activeAction.safety_case?.case_number}
          existingRootCause={activeAction.safety_case?.root_cause}
          onClose={() => setActiveAction(null)}
        />
      )}
    </div>
  )
}
