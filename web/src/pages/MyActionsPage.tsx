import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { OverduePill } from '@/components/safety/StatusPill'
import { CompleteActionModal } from '@/components/safety/CompleteActionModal'
import type { CaseAction } from '@/types/safetylog'

export function MyActionsPage() {
  const actionsQuery = useQuery({
    queryKey: ['my-actions'],
    queryFn: () => apiFetch<{ data: CaseAction[] }>('/my-actions'),
  })

  const [activeAction, setActiveAction] = React.useState<CaseAction | null>(null)
  const actions = actionsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">Tindakan Saya</h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Daftar tindakan CAPA yang ditugaskan kepada Anda. Isi catatan hasil beserta analisis 5 Why &amp; 6M saat menyelesaikan tindakan.
        </p>
      </div>

      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {actionsQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat daftar tindakan...</div>
        ) : actions.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            Tidak ada tindakan yang ditugaskan kepada Anda.
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

      {/* Complete Action + 5 Why & 6M Modal */}
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
