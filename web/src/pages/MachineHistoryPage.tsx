import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import {
  localizeCaseTypeName,
  localizeContentText,
  localizeMachineName,
  useLanguage,
} from '@/lib/i18n-helpers'
import { CaseStatusPill, RecurringPill, RiskPill } from '@/components/safety/StatusPill'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import type { Machine, PaginationMeta, SafetyCaseSummary } from '@/types/safetylog'

export function MachineHistoryPage() {
  const { lang, pick } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = React.useState(1)

  const historyQuery = useQuery({
    queryKey: ['machine-cases', id, page],
    queryFn: () =>
      apiFetch<{
        machine: Machine
        is_recurring: boolean
        recurring_label?: string | null
        cases_last_90_days: number
        data: SafetyCaseSummary[]
        meta?: PaginationMeta
      }>(`/machines/${id}/cases?page=${page}`),
    enabled: Boolean(id),
  })

  const machine = historyQuery.data?.machine
  const cases = historyQuery.data?.data ?? []
  const totalCases = historyQuery.data?.meta?.total ?? cases.length

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/dashboard"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13.5px] font-medium text-[var(--text)] hover:bg-[var(--raised)] hover:border-[var(--muted)] active:scale-[0.99] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <span>{pick('Kembali ke Dashboard', 'Back to Dashboard')}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            {machine ? `${machine.code} — ${localizeMachineName(lang, machine.name, machine.code)}` : pick('Riwayat Mesin', 'Machine History')}
          </h1>
          {historyQuery.data?.is_recurring && (
            <RecurringPill label={historyQuery.data.recurring_label || 'Berulang'} />
          )}
        </div>
        <p className="text-[14px] text-[var(--muted)]">
          {pick(
            `Total ${totalCases} kasus tercatat · ${historyQuery.data?.cases_last_90_days ?? 0} kasus dalam 90 hari terakhir.`,
            `Total ${totalCases} recorded cases · ${historyQuery.data?.cases_last_90_days ?? 0} cases in the last 90 days.`,
          )}
        </p>
      </div>

      {historyQuery.isError && (
        <QueryErrorBanner
          message={pick('Gagal memuat riwayat kasus mesin ini.', 'Failed to load machine case history.')}
          onRetry={() => void historyQuery.refetch()}
        />
      )}

      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {historyQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">
            {pick('Memuat riwayat mesin...', 'Loading machine history...')}
          </div>
        ) : cases.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            {pick('Belum ada kasus tercatat pada mesin ini.', 'No cases recorded for this machine yet.')}
          </div>
        ) : (
          cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="flex flex-col gap-2 px-5 py-4 hover:bg-[var(--hover-row)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                    {c.case_number}
                  </span>
                  {c.case_type?.name && (
                    <span className="text-[12px] text-[var(--faint)]">
                      · {localizeCaseTypeName(lang, c.case_type.name, c.case_type.code)}
                    </span>
                  )}
                </div>
                <div className="text-[14px] text-[var(--text)] line-clamp-1">
                  {localizeContentText(lang, c.short_description)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RiskPill
                  level={c.risk_level}
                  score={c.risk_score}
                  label={c.risk_level_label}
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
        meta={historyQuery.data?.meta}
        onPageChange={setPage}
        isFetching={historyQuery.isFetching}
      />
    </div>
  )
}
