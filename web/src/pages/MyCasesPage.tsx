import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import type { PaginationMeta, SafetyCase } from '@/types/safetylog'

export function MyCasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQ = searchParams.get('q') || ''
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const [qInput, setQInput] = React.useState(urlQ)

  const prevUrlQRef = React.useRef(urlQ)
  React.useEffect(() => {
    if (prevUrlQRef.current !== urlQ) {
      prevUrlQRef.current = urlQ
      setQInput(urlQ)
    }
  }, [urlQ])

  React.useEffect(() => {
    const trimmed = qInput.trim()
    if (trimmed === urlQ) return
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      next.delete('page')
      setSearchParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [qInput, urlQ, searchParams, setSearchParams])

  const casesQuery = useQuery({
    queryKey: ['my-cases', urlQ, page],
    queryFn: () => {
      const p = new URLSearchParams({ per_page: '20', page: String(page) })
      if (urlQ) p.set('q', urlQ)
      return apiFetch<{ data: SafetyCase[]; meta?: PaginationMeta }>(`/my-cases?${p.toString()}`)
    },
  })

  const cases = casesQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Kasus Saya
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Daftar laporan yang pernah Anda kirim beserta status tindak lanjutnya.
          </p>
        </div>
        <Link
          to="/report"
          className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
        >
          Lapor Baru
        </Link>
      </div>

      <div>
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Cari nomor kasus atau deskripsi..."
          className="h-11 w-full max-w-md rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[16px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      {casesQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat daftar laporan Anda."
          onRetry={() => void casesQuery.refetch()}
        />
      )}

      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {casesQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat laporan Anda...</div>
        ) : cases.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">
            Tidak ada laporan ditemukan.
          </div>
        ) : (
          cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="flex flex-col gap-2 px-5 py-4 hover:bg-[var(--hover-row)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                    {c.case_number}
                  </span>
                  <span className="text-[12px] text-[var(--faint)]">· {c.case_type?.name}</span>
                </div>
                <div className="text-[15px] font-medium text-[var(--text)]">
                  {c.machine ? `${c.machine.code} — ${c.machine.name}` : 'Mesin'}
                </div>
                <p className="text-[13px] text-[var(--muted)] line-clamp-1">{c.description}</p>
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

      <PaginationBar
        meta={casesQuery.data?.meta}
        onPageChange={(nextPage) => {
          const next = new URLSearchParams(searchParams)
          next.set('page', String(nextPage))
          setSearchParams(next, { replace: true })
        }}
        isFetching={casesQuery.isFetching}
      />
    </div>
  )
}
