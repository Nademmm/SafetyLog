import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { CaseStatusHistory } from '@/types/safetylog'

export function AuditLogsPage() {
  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiFetch<{ data: CaseStatusHistory[] }>('/audit-logs?per_page=50'),
  })

  const logs = logsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Riwayat Perubahan (Audit Log)
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Catatan append-only seluruh perubahan status kasus dalam organisasi. Tidak dapat diubah atau dihapus.
        </p>
      </div>

      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
        {logsQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat audit log...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">Belum ada catatan audit log.</div>
        ) : (
          <>
            {/* Mobile Two-Line List (< md, per app-screens.md §12) */}
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

            {/* Tablet & Desktop Table (md+) */}
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
    </div>
  )
}
