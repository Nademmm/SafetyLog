import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronDown, Filter, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import {
  localizeActionStatusLabel,
  localizeActionTypeLabel,
  localizeContentText,
  useLanguage,
} from '@/lib/i18n-helpers'
import { OverduePill } from '@/components/safety/StatusPill'
import { CompleteActionModal } from '@/components/safety/CompleteActionModal'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { CaseAction, PaginationMeta } from '@/types/safetylog'

const STATUS_FILTERS: Array<{ value: 'open' | 'completed' | 'all'; labelId: string; labelEn: string }> = [
  { value: 'open', labelId: 'Terbuka', labelEn: 'Open' },
  { value: 'completed', labelId: 'Selesai', labelEn: 'Completed' },
  { value: 'all', labelId: 'Semua', labelEn: 'All' },
]

export function MyActionsPage() {
  const { lang, pick } = useLanguage()
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

  const activeFilterObj = STATUS_FILTERS.find((t) => t.value === statusFilter)
  const activeFilterLabel = activeFilterObj
    ? pick(activeFilterObj.labelId, activeFilterObj.labelEn)
    : pick('Terbuka', 'Open')

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
            {pick('Tindakan Saya', 'My Actions')}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {pick(
              'Daftar tindakan CAPA yang ditugaskan kepada Anda. Isi catatan hasil beserta analisis 5 Why & 6M saat menyelesaikan tindakan.',
              'List of CAPA actions assigned to you. Fill in completion notes and 5 Why & 6M root cause analysis when completing.',
            )}
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
                      {pick('Filter Tindakan', 'Filter Actions')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      aria-label={pick('Tutup filter', 'Close filter')}
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
                        <span>{pick(tab.labelId, tab.labelEn)}</span>
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
          message={pick('Gagal memuat daftar tindakan Anda.', 'Failed to load your actions.')}
          onRetry={() => void actionsQuery.refetch()}
        />
      )}

      <div className="overflow-hidden rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {actionsQuery.isLoading ? (
          <SectionLoading label={pick('Memuat daftar tindakan...', 'Loading actions...')} className="py-10" />
        ) : actions.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            {pick('Tidak ada tindakan pada filter ini.', 'No actions match this filter.')}
          </div>
        ) : (
          actions.map((a) => {
            const isOverdue = a.is_overdue && a.status !== 'completed'
            const isCompleted = a.status === 'completed'

            return (
              <div
                key={a.id}
                className={`flex flex-col gap-3 px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                  isOverdue
                    ? 'bg-[var(--safety-danger-bg)]/20'
                    : isCompleted
                      ? 'opacity-75'
                      : ''
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Line 1: Action Type + Case Number + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[12px] text-[var(--faint)] min-w-0 truncate">
                      <span
                        className={`font-medium ${
                          a.action_type === 'preventive'
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--muted)]'
                        }`}
                      >
                        {localizeActionTypeLabel(lang, a.action_type_label, a.action_type)}
                      </span>
                      {a.safety_case && (
                        <>
                          <span aria-hidden="true">·</span>
                          <Link
                            to={`/cases/${a.safety_case.id}`}
                            className="font-mono font-medium text-[var(--muted)] hover:text-[var(--accent)] hover:underline tabular-nums"
                          >
                            {a.safety_case.case_number}
                          </Link>
                        </>
                      )}
                    </div>
                    <div className="shrink-0 sm:hidden">
                      {isOverdue ? (
                        <OverduePill label={a.overdue_label || 'Terlambat'} />
                      ) : (
                        <span
                          className={`text-[11.5px] font-medium ${
                            isCompleted
                              ? 'text-[var(--safety-safe-foreground)]'
                              : 'text-[var(--muted)]'
                          }`}
                        >
                          {localizeActionStatusLabel(lang, a.status_label, a.status)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Line 2: Action Title */}
                  <div className="text-[15px] font-semibold text-[var(--text)] leading-snug">
                    {localizeContentText(lang, a.title)}
                  </div>

                  {/* Line 3: Description (clean, no heavy box) */}
                  {a.description && (
                    <p className="text-[13px] leading-snug text-[var(--muted)] line-clamp-2">
                      {localizeContentText(lang, a.description)}
                    </p>
                  )}

                  {/* Line 4: Due Date & Desktop Status */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[12px] tabular-nums">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isOverdue
                          ? 'font-semibold text-[var(--safety-danger-foreground)]'
                          : 'text-[var(--faint)]'
                      }`}
                    >
                      {isOverdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      <span>
                        {isOverdue ? pick('Lewat tenggat: ', 'Overdue: ') : pick('Tenggat: ', 'Due: ')}
                        {formatDateTime(a.due_at)}
                      </span>
                    </span>
                    <div className="hidden sm:inline-flex items-center">
                      {isOverdue ? (
                        <OverduePill label={a.overdue_label || 'Terlambat'} />
                      ) : (
                        <span
                          className={`text-[11.5px] font-medium ${
                            isCompleted
                              ? 'text-[var(--safety-safe-foreground)]'
                              : 'text-[var(--muted)]'
                          }`}
                        >
                          · {localizeActionStatusLabel(lang, a.status_label, a.status)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                  {a.can_complete && (
                    <button
                      type="button"
                      onClick={() => setActiveAction(a)}
                      className="h-11 flex-1 sm:flex-none rounded-[6px] bg-[var(--primary)] px-4 text-[13.5px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] cursor-pointer transition-colors"
                    >
                      {pick('Selesaikan', 'Complete')}
                    </button>
                  )}
                  {a.safety_case && (
                    <Link
                      to={`/cases/${a.safety_case.id}`}
                      className="inline-flex h-11 flex-1 sm:flex-none items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] transition-colors"
                    >
                      {pick('Buka Kasus', 'Open Case')}
                    </Link>
                  )}
                </div>
              </div>
            )
          })
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
