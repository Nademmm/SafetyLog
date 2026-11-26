import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus, Search, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { localizeContentText, localizeMachineName, useLanguage } from '@/lib/i18n-helpers'
import { CaseStatusPill, CaseTypePill, RiskPill } from '@/components/safety/StatusPill'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { Input } from '@/components/ui/FormField'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { PaginationMeta, SafetyCase } from '@/types/safetylog'

export function MyCasesPage() {
  const { lang, pick } = useLanguage()
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
  const totalCount = casesQuery.data?.meta?.total ?? cases.length

  return (
    <div className="space-y-5">
      <PageHeader
        title={pick('Kasus Saya', 'My Cases')}
        description={pick(
          'Daftar laporan yang pernah Anda kirim beserta status tindak lanjutnya.',
          'List of reports you have submitted and their follow-up status.',
        )}
        actions={
          <Link
            to="/report"
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[2.2px]" />
            <span>{pick('Lapor Baru', 'New Report')}</span>
          </Link>
        }
      />

      {/* Clean Search Bar + Count */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={pick(
              'Cari nomor kasus, mesin, atau deskripsi...',
              'Search case number, machine, or description...',
            )}
            className="pl-10 pr-10"
          />
          {qInput && (
            <button
              type="button"
              onClick={() => setQInput('')}
              aria-label={pick('Hapus pencarian', 'Clear search')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--faint)] hover:text-[var(--text)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!casesQuery.isLoading && (
          <div className="text-[12.5px] font-medium text-[var(--muted)] tabular-nums">
            {pick('Menampilkan', 'Showing')} <strong className="text-[var(--text)]">{cases.length}</strong>
            {totalCount > cases.length ? ` ${pick('dari', 'of')} ${totalCount}` : ''}{' '}
            {pick('laporan', 'reports')}
          </div>
        )}
      </div>

      {casesQuery.isError && (
        <QueryErrorBanner
          message={pick('Gagal memuat daftar laporan Anda.', 'Failed to load your reports.')}
          onRetry={() => void casesQuery.refetch()}
        />
      )}

      {casesQuery.isLoading ? (
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
          <SectionLoading label={pick('Memuat laporan Anda...', 'Loading your reports...')} className="py-10" />
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center space-y-3">
          <p className="text-[14px] text-[var(--muted)]">
            {urlQ
              ? pick(
                  `Tidak ada laporan yang cocok dengan "${urlQ}".`,
                  `No reports match "${urlQ}".`,
                )
              : pick('Belum ada laporan yang pernah Anda kirim.', 'No reports submitted yet.')}
          </p>
          {urlQ ? (
            <button
              type="button"
              onClick={() => setQInput('')}
              className="inline-flex h-11 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-4 text-[13.5px] font-semibold text-[var(--text)] hover:bg-[var(--raised)] cursor-pointer"
            >
              {pick('Reset Pencarian', 'Reset Search')}
            </button>
          ) : (
            <Link
              to="/report"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
            >
              <Plus className="h-4 w-4 stroke-[2.2px]" />
              <span>{pick('Buat Laporan Pertama', 'Create First Report')}</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--rule)]">
          {cases.map((c) => {
            const isCritical =
              !c.is_locked &&
              (c.is_machine_stopped ||
                c.has_affected_people ||
                c.risk_assessment.risk_level === 'high')

            return (
              <Link
                key={c.id}
                to={`/cases/${c.id}`}
                className={`group flex flex-col gap-1.5 px-4 py-4 sm:px-5 transition-colors ${
                  isCritical
                    ? 'bg-[var(--safety-danger-bg)]/20 hover:bg-[var(--safety-danger-bg)]/40'
                    : 'hover:bg-[var(--hover-row)]'
                }`}
              >
                {/* Line 1: Case Type + Case Number + Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--faint)] min-w-0 truncate">
                    <CaseTypePill caseType={c.case_type} />
                    <span className="font-mono tabular-nums">{c.case_number}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[11.5px] text-[var(--faint)] tabular-nums">
                    {formatDateTime(c.reported_at)}
                  </span>
                </div>

                {/* Line 2: Machine Name + Code & Description */}
                <div className="text-[15px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                  {c.machine?.name ? localizeMachineName(lang, c.machine.name, c.machine.code) : pick('Mesin / Area', 'Machine / Area')}
                  {c.machine?.code ? (
                    <span className="ml-1.5 font-mono text-[12px] font-normal text-[var(--faint)]">
                      {c.machine.code}
                    </span>
                  ) : null}
                </div>
                <p className="text-[13px] leading-snug text-[var(--muted)] line-clamp-2">
                  {localizeContentText(lang, c.description)}
                </p>

                {/* Line 3: Status, Risk & Critical Flags */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CaseStatusPill status={c.status} label={c.status_label} />
                    <RiskPill
                      level={c.risk_assessment.risk_level}
                      score={c.risk_assessment.risk_score}
                      label={c.risk_assessment.risk_level_label}
                    />
                    {c.is_machine_stopped && (
                      <span className="text-[11px] font-semibold text-[var(--safety-danger-foreground)]">
                        · {pick('Mesin Berhenti', 'Machine Stopped')}
                      </span>
                    )}
                    {c.has_affected_people && (
                      <span className="text-[11px] font-semibold text-[var(--safety-danger-foreground)]">
                        · {pick('Ada Korban', 'Affected People')}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

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
