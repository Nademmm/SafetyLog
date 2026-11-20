import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
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

export function AuditLogsPage() {
  const [actionName, setActionName] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [page, setPage] = React.useState(1)

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
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Riwayat Perubahan (Audit Log)
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Catatan append-only seluruh perubahan status kasus dalam organisasi. Tidak dapat diubah
          atau dihapus.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={actionName}
          onChange={(e) => {
            setActionName(e.target.value)
            setPage(1)
          }}
          aria-label="Filter jenis aksi"
          className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          aria-label="Tanggal mulai"
          className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          aria-label="Tanggal akhir"
          className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
        />

        {(actionName || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setActionName('')
              setDateFrom('')
              setDateTo('')
              setPage(1)
            }}
            className="inline-flex h-11 items-center gap-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      {logsQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat catatan audit log."
          onRetry={() => void logsQuery.refetch()}
        />
      )}

      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
        {logsQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat audit log...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            Belum ada catatan audit log yang sesuai filter.
          </div>
        ) : (
          <>
            {/* Mobile Two-Line List */}
            <div className="divide-y divide-[var(--rule)] md:hidden">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-[var(--text)]">
                      {log.from_status_label ? `${log.from_status_label} → ` : ''}
                      {log.to_status_label}
                    </span>
                    {log.safety_case ? (
                      <Link
                        to={`/cases/${log.safety_case.id}`}
                        className="font-mono text-[12px] text-[var(--accent)] hover:underline tabular-nums shrink-0"
                      >
                        {log.safety_case.case_number}
                      </Link>
                    ) : null}
                  </div>
                  <div className="text-[12px] text-[var(--faint)] tabular-nums">
                    {log.changed_by?.name || 'Sistem'} · {formatDateTime(log.created_at)}
                  </div>
                  {log.reason && (
                    <div className="text-[13px] text-[var(--muted)]">{log.reason}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
      </div>

      <PaginationBar
        meta={logsQuery.data?.meta}
        onPageChange={setPage}
        isFetching={logsQuery.isFetching}
      />
    </div>
  )
}
