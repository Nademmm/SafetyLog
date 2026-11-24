import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronDown, ChevronRight, Clock, Filter, User, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { CaseStatusHistory, PaginationMeta } from '@/types/safetylog'

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'case_reported', label: 'Kasus Dilaporkan' },
  { value: 'case_triaged', label: 'Triase Risiko' },
  { value: 'case_rejected', label: 'Kasus Ditolak' },
  { value: 'case_marked_duplicate', label: 'Kasus Duplikat' },
  { value: 'root_cause_analyzed', label: 'Analisis 5 Why & 6M' },
  { value: 'action_created', label: 'Tindakan Dibuat' },
  { value: 'action_completed', label: 'Tindakan Selesai' },
  { value: 'all_actions_completed', label: 'Semua Tindakan Selesai' },
  { value: 'verification_approved', label: 'Verifikasi Disetujui' },
  { value: 'verification_rejected', label: 'Verifikasi Ditolak' },
  { value: 'case_reopened', label: 'Kasus Dibuka Ulang' },
]

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_OPTIONS.filter((opt) => opt.value).map((opt) => [opt.value, opt.label]),
)

export function AuditLogsPage() {
  const [actionName, setActionName] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
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

  const activeFilterCount = (actionName ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)
  const activeActionLabel = ACTION_OPTIONS.find((opt) => opt.value === actionName)?.label || actionName

  const logsQuery = useQuery({
    queryKey: ['audit-logs', actionName, dateFrom, dateTo, page],
    queryFn: () => {
      const p = new URLSearchParams({ per_page: '30', page: String(page) })
      if (actionName) p.set('action_name', actionName)
      if (dateFrom) p.set('date_from', dateFrom)
      if (dateTo) p.set('date_to', dateTo)
      return apiFetch<{ data: CaseStatusHistory[]; meta?: PaginationMeta }>(
        `/audit-logs?${p.toString()}`,
      )
    },
  })

  const logs = logsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Riwayat Perubahan (Audit Log)
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Catatan append-only seluruh perubahan status kasus dalam organisasi. Tidak dapat diubah
            atau dihapus.
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
              <div
                className="fixed inset-0 z-40 bg-black/60 sm:hidden"
                onClick={() => setFilterOpen(false)}
                aria-hidden="true"
              />

              <div
                role="dialog"
                aria-label="Filter audit log"
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-[16px] border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-12px_32px_rgba(0,0,0,0.3)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[360px] sm:max-h-[75vh] sm:rounded-[8px] sm:border sm:shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
              >
                <div className="shrink-0 border-b border-[var(--rule)] px-4 pt-3 pb-3">
                  <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[var(--control)] sm:hidden" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[var(--text)]">
                        Filter Audit Log
                      </span>
                      {activeFilterCount > 0 && (
                        <span className="rounded-[4px] bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] tabular-nums">
                          {activeFilterCount} aktif
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      aria-label="Tutup filter"
                      className="flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-[var(--raised)] cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  <div className="space-y-2">
                    <span className="block text-[13px] font-semibold text-[var(--text)]">
                      Jenis Aksi
                    </span>
                    <div className="space-y-1">
                      {ACTION_OPTIONS.map((opt) => {
                        const active = actionName === opt.value
                        return (
                          <button
                            key={opt.value || 'all'}
                            type="button"
                            onClick={() => {
                              setActionName(opt.value)
                              setPage(1)
                            }}
                            className={`flex min-h-[42px] w-full items-center justify-between rounded-[6px] px-3 text-left text-[13px] transition-colors cursor-pointer ${
                              active
                                ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                                : 'font-normal text-[var(--muted)] hover:bg-[var(--hover-row)] hover:text-[var(--text)]'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {active && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 stroke-[2.2px]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        Dari Tanggal
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value)
                          setPage(1)
                        }}
                        aria-label="Tanggal mulai"
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        Sampai Tanggal
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value)
                          setPage(1)
                        }}
                        aria-label="Tanggal akhir"
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2.5 border-t border-[var(--rule)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
                  <button
                    type="button"
                    disabled={activeFilterCount === 0}
                    onClick={() => {
                      setActionName('')
                      setDateFrom('')
                      setDateTo('')
                      setPage(1)
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
                    Terapkan ({logsQuery.data?.meta?.total ?? logs.length})
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          {actionName && (
            <button
              type="button"
              onClick={() => {
                setActionName('')
                setPage(1)
              }}
              className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--accent)] bg-[var(--raised)] px-2.5 font-medium text-[var(--text)] hover:opacity-80 cursor-pointer"
            >
              <span>Aksi: {activeActionLabel}</span>
              <X className="h-3 w-3 text-[var(--muted)]" />
            </button>
          )}
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
              className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--control)] bg-[var(--surface)] px-2.5 font-medium text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
            >
              <span>
                Tanggal: {dateFrom || '...'} – {dateTo || '...'}
              </span>
              <X className="h-3 w-3 text-[var(--muted)]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setActionName('')
              setDateFrom('')
              setDateTo('')
              setPage(1)
            }}
            className="inline-flex h-7 items-center px-2 text-[12px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
          >
            Reset semua
          </button>
        </div>
      )}

      {logsQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat catatan audit log."
          onRetry={() => void logsQuery.refetch()}
        />
      )}

      {logsQuery.isLoading ? (
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
          <SectionLoading label="Memuat audit log..." />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 text-[14px] text-[var(--faint)]">
          Belum ada catatan audit log yang sesuai filter.
        </div>
      ) : (
        <>
          {/* Mobile Spacious Preview Cards */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <article
                key={log.id}
                className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
              >
                {/* Header: Action Badge & Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-[5px] border border-[var(--control)] bg-[var(--raised)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)]">
                    {ACTION_LABELS[log.action_name] ?? log.action_name}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--faint)] tabular-nums">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                {/* Status Transition (Large & Prominent) */}
                <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
                  {log.from_status_label ? (
                    <>
                      <span className="rounded-[5px] bg-[var(--ground)] px-2.5 py-1 text-[13px] font-medium text-[var(--muted)] border border-[var(--rule)]">
                        {log.from_status_label}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-[var(--faint)]"
                        aria-hidden="true"
                      />
                    </>
                  ) : null}
                  <span className="rounded-[5px] bg-[var(--accent-soft)] px-2.5 py-1 text-[13px] font-semibold text-[var(--accent)]">
                    {log.to_status_label}
                  </span>
                </div>

                {/* Reason / Notes Preview */}
                {log.reason && (
                  <p className="rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] px-3 py-2.5 text-[13.5px] leading-relaxed text-[var(--muted)]">
                    {log.reason}
                  </p>
                )}

                {/* Footer: Actor & Full-Height Tappable Case Link */}
                <div className="flex items-center justify-between gap-3 border-t border-[var(--rule)] pt-2.5">
                  <div className="flex items-center gap-1.5 min-w-0 text-[13px] text-[var(--muted)]">
                    <User className="h-4 w-4 shrink-0 text-[var(--faint)]" aria-hidden="true" />
                    <span className="truncate font-medium text-[var(--text)]">
                      {log.changed_by?.name || 'Sistem'}
                    </span>
                  </div>

                  {log.safety_case && (
                    <Link
                      to={`/cases/${log.safety_case.id}`}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--raised)] px-3 font-mono text-[13px] font-semibold text-[var(--accent)] hover:border-[var(--accent)] tabular-nums"
                    >
                      <span>{log.safety_case.case_number}</span>
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Tablet & Desktop Table */}
          <div className="hidden md:block rounded-[8px] border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--rule)] text-[12px] font-normal text-[var(--faint)]">
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Kasus</th>
                  <th className="px-5 py-3">Perubahan Status</th>
                  <th className="px-5 py-3">Oleh</th>
                  <th className="px-5 py-3">Alasan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rule)] text-[13px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--hover-row)]">
                    <td className="px-5 py-3.5 text-[var(--faint)] whitespace-nowrap tabular-nums">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {log.safety_case ? (
                        <Link
                          to={`/cases/${log.safety_case.id}`}
                          className="font-mono text-[var(--accent)] hover:underline tabular-nums"
                        >
                          {log.safety_case.case_number}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text)] whitespace-nowrap">
                      {log.from_status_label ? `${log.from_status_label} → ` : ''}
                      {log.to_status_label}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--muted)] whitespace-nowrap">
                      {log.changed_by?.name || 'Sistem'}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--muted)] max-w-md">
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PaginationBar
        meta={logsQuery.data?.meta}
        onPageChange={setPage}
        isFetching={logsQuery.isFetching}
      />
    </div>
  )
}
