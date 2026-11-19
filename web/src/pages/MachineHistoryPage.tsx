import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, RecurringPill, RiskPill } from '@/components/safety/StatusPill'
import type { Machine, SafetyCase } from '@/types/safetylog'

export function MachineHistoryPage() {
  const { id } = useParams<{ id: string }>()

  const historyQuery = useQuery({
    queryKey: ['machine-cases', id],
    queryFn: () =>
      apiFetch<{
        machine: Machine
        is_recurring: boolean
        recurring_label: string | null
        recent_cases_count: number
        data: SafetyCase[]
      }>(`/machines/${id}/cases`),
    enabled: Boolean(id),
  })

  const machine = historyQuery.data?.machine
  const cases = historyQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Dashboard</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            {machine ? `${machine.code} — ${machine.name}` : 'Riwayat Mesin'}
          </h1>
          {historyQuery.data?.is_recurring && (
            <RecurringPill label={historyQuery.data.recurring_label || 'Berulang'} />
          )}
        </div>
        <p className="text-[14px] text-[var(--muted)]">
          Total {cases.length} kasus tercatat · {historyQuery.data?.recent_cases_count ?? 0} kasus dalam 90 hari terakhir.
        </p>
      </div>

      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {historyQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat riwayat mesin...</div>
        ) : cases.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            Belum ada kasus tercatat pada mesin ini.
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
                  <span className="text-[12px] text-[var(--faint)]">· {c.case_type?.name}</span>
                </div>
                <div className="text-[14px] text-[var(--text)] line-clamp-1">{c.description}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
    </div>
  )
}
