import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { caseKeys } from '@/data/query-keys'
import { AiAssistButton } from '@/components/safety/AiAssistButton'
import type {
  AiEnvelope,
  AiSimilarAnalysis,
  SafetyCase,
  SimilarCaseItem,
} from '@/types/safetylog'

const AI_DUPLICATE_LABELS: Record<
  AiSimilarAnalysis['matches'][number]['duplicate_assessment'],
  string
> = {
  possible_duplicate: 'Kemungkinan duplikat',
  needs_review: 'Perlu ditinjau',
  not_duplicate: 'Bukan duplikat',
}

export function CaseSimilarSidebar({
  caseData,
  showSimilar,
}: {
  caseData: SafetyCase
  showSimilar: boolean
}) {
  const similarQuery = useQuery({
    queryKey: caseKeys.similar(caseData.id),
    queryFn: () => apiFetch<{ data: SimilarCaseItem[] }>(`/cases/${caseData.id}/similar`),
    enabled: showSimilar,
  })

  const [aiSimilarState, setAiSimilarState] = React.useState<{
    caseId: number | undefined
    data: AiSimilarAnalysis | null
    error: string | null
  }>({ caseId: undefined, data: null, error: null })

  const aiSimilar = aiSimilarState.caseId === caseData.id ? aiSimilarState.data : null
  const aiSimilarError = aiSimilarState.caseId === caseData.id ? aiSimilarState.error : null

  const similarAnalysis = useMutation({
    mutationFn: () =>
      apiFetch<AiEnvelope<AiSimilarAnalysis>>(`/cases/${caseData.id}/similar-analysis`, {
        method: 'POST',
        json: { limit: 5 },
      }),
    onSuccess: (response) => {
      setAiSimilarState({ caseId: caseData.id, data: response.data, error: null })
    },
    onError: (error) => {
      setAiSimilarState({
        caseId: caseData.id,
        data: null,
        error: error instanceof ApiError ? error.message : 'Gagal menganalisis kasus mirip.',
      })
    },
  })

  const similarCases = similarQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      {showSimilar && (
        <section className="overflow-hidden rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex flex-col gap-2.5 border-b border-[var(--rule)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">Kasus Mirip</h2>
                {similarCases.length > 0 && (
                  <span className="font-mono text-[12px] font-medium text-[var(--muted)] tabular-nums">
                    ({similarCases.length})
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--faint)]">Kemiripan teks &amp; mesin</p>
            </div>
            <AiAssistButton
              onClick={() => similarAnalysis.mutate()}
              loading={similarAnalysis.isPending}
              label="Analisis AI"
              loadingLabel="Menganalisis..."
            />
          </div>

          <div className="divide-y divide-[var(--rule)]">
            {similarQuery.isLoading ? (
              <div className="px-4 py-4 sm:px-5 text-[13px] text-[var(--faint)]">
                Mencari kasus mirip...
              </div>
            ) : similarCases.length === 0 ? (
              <div className="px-4 py-4 sm:px-5 text-[13px] text-[var(--faint)]">
                Tidak ada kasus mirip ditemukan.
              </div>
            ) : (
              similarCases.map((sc) => (
                <Link
                  key={sc.id}
                  to={`/cases/${sc.id}`}
                  className="group flex flex-col gap-1.5 px-4 py-3.5 sm:px-5 hover:bg-[var(--hover-row)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[12px] text-[var(--faint)] min-w-0 truncate">
                      <span className="font-mono font-semibold text-[var(--accent)] tabular-nums">
                        {sc.case_number}
                      </span>
                      {sc.machine?.code && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[var(--muted)]">{sc.machine.code}</span>
                        </>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[11.5px] font-semibold text-[var(--text)] tabular-nums">
                      {sc.similarity_percent}% cocok
                    </span>
                  </div>

                  <p className="text-[13px] leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                    {sc.description}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[11.5px] text-[var(--faint)] truncate">
                      {sc.matching_reasons?.length > 0
                        ? sc.matching_reasons.join(' · ')
                        : 'Kemiripan teks'}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                  </div>
                </Link>
              ))
            )}
          </div>

          {aiSimilarError && (
            <div className="border-t border-[var(--rule)] p-4 sm:px-5">
              <div
                role="alert"
                className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[12px] text-[var(--safety-danger-foreground)]"
              >
                {aiSimilarError}
              </div>
            </div>
          )}

          {aiSimilar && (
            <div role="status" className="border-t border-[var(--rule)] bg-[var(--ground)]/50">
              <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2 sm:px-5">
                <div className="text-[13px] font-semibold text-[var(--text)]">Analisis AI</div>
                <div className="text-[11px] text-[var(--faint)]">Perlu ditinjau</div>
              </div>

              {aiSimilar.possible_duplicate && (
                <div className="mx-4 mb-2 sm:mx-5 rounded-[6px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] px-3 py-2 text-[12px] text-[var(--safety-warning-foreground)]">
                  AI menemukan kemungkinan duplikat. Periksa sebelum melanjutkan.
                </div>
              )}

              <p className="px-4 pb-3 sm:px-5 text-[12.5px] leading-relaxed text-[var(--muted)]">
                {aiSimilar.summary}
              </p>

              {aiSimilar.matches.length === 0 ? (
                <div className="border-t border-[var(--rule)] px-4 py-3 sm:px-5 text-[12px] text-[var(--faint)]">
                  Tidak ada kandidat kasus historis yang relevan untuk dianalisis.
                </div>
              ) : (
                <div className="divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
                  {aiSimilar.matches.map((match) => (
                    <div key={`ai-${match.id}`} className="space-y-1 px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/cases/${match.id}`}
                          className="font-mono text-[12px] font-semibold text-[var(--accent)] hover:underline"
                        >
                          {match.case_number}
                        </Link>
                        <span className="font-mono text-[11px] font-medium text-[var(--muted)] tabular-nums">
                          {match.similarity_percent}% mirip ·{' '}
                          {AI_DUPLICATE_LABELS[match.duplicate_assessment]}
                        </span>
                      </div>
                      <p className="text-[12.5px] leading-snug text-[var(--text)]">
                        {match.similarity_reason}
                      </p>
                      {match.differences.length > 0 && (
                        <p className="text-[11.5px] text-[var(--faint)]">
                          Perbedaan: {match.differences.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
        <h2 className="text-[16px] font-semibold text-[var(--text)]">
          Riwayat Perubahan (Audit Log)
        </h2>
        <div className="divide-y divide-[var(--rule)]">
          {(caseData.status_histories ?? []).length === 0 ? (
            <div className="py-2 text-[13px] text-[var(--faint)]">
              Belum ada riwayat perubahan.
            </div>
          ) : (
            caseData.status_histories!.map((h) => (
              <div key={h.id} className="py-2.5 space-y-0.5">
                <div className="text-[13px] font-medium text-[var(--text)]">
                  {h.from_status_label ? `${h.from_status_label} → ` : ''}
                  {h.to_status_label}
                </div>
                <div className="text-[12px] text-[var(--faint)]">
                  {h.changed_by?.name || 'Sistem'} · {formatDateTime(h.created_at)}
                </div>
                {h.reason && <div className="text-[12px] text-[var(--muted)]">{h.reason}</div>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
