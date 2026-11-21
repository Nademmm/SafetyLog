import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Plus } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-helpers'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, OverduePill, RiskPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { CaseAction, SafetyCase } from '@/types/safetylog'

export function PelaporHomePage() {
  const { user } = useAuth()

  const myCasesQuery = useQuery({
    queryKey: ['my-cases', 'home'],
    queryFn: () => apiFetch<{ data: SafetyCase[] }>('/my-cases?per_page=10'),
  })

  const myActionsQuery = useQuery({
    queryKey: ['my-actions', 'home'],
    queryFn: () => apiFetch<{ data: CaseAction[] }>('/my-actions'),
  })

  const cases = myCasesQuery.data?.data ?? []
  const actions = myActionsQuery.data?.data ?? []
  const openCasesCount = cases.filter((c) => !c.is_locked).length
  const openActionsCount = actions.filter((a) => a.status !== 'completed').length
  const overdueActionsCount = actions.filter(
    (a) => a.is_overdue && a.status !== 'completed',
  ).length

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Ruang Kerja Pelapor
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {user?.site?.name || 'Site Utama'} · Catat kondisi tidak aman atau abnormalitas mesin
            kurang dari 60 detik.
          </p>
        </div>
        {user?.role === 'reporter' && (
          <Link
            to="/report"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[2.2px]" />
            <span>Lapor Masalah Baru</span>
          </Link>
        )}
      </div>

      {(myCasesQuery.isError || myActionsQuery.isError) && (
        <QueryErrorBanner
          message="Gagal memuat sebagian data ruang kerja Pelapor."
          onRetry={() => {
            void myCasesQuery.refetch()
            void myActionsQuery.refetch()
          }}
        />
      )}

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Laporan aktif saya
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {myCasesQuery.isLoading ? '—' : openCasesCount}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Tindakan ditugaskan
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {myActionsQuery.isLoading ? '—' : openActionsCount}
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Tindakan terlambat
          </div>
          <div
            className={`mt-1.5 text-[24px] sm:text-[28px] font-semibold tabular-nums ${
              overdueActionsCount > 0
                ? 'text-[var(--safety-danger-foreground)]'
                : 'text-[var(--text)]'
            }`}
          >
            {myActionsQuery.isLoading ? '—' : overdueActionsCount}
          </div>
        </div>
      </div>

      {/* Two Balanced Columns: My Reports & My Assigned Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text)] truncate">
                Laporan Terakhir Saya
              </h2>
              {cases.length > 0 && (
                <span className="shrink-0 rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                  {cases.length}
                </span>
              )}
            </div>
            {user?.role === 'reporter' && (
              <Link
                to="/my-cases"
                className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
              >
                <span>Lihat semua</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {myCasesQuery.isLoading ? (
              <SectionLoading label="Memuat laporan Anda..." className="py-8" />
            ) : myCasesQuery.isError ? (
              <div className="p-5 text-[14px] text-[var(--safety-danger-foreground)]">
                Gagal memuat daftar laporan.
              </div>
            ) : cases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Belum ada laporan yang Anda kirim. Gunakan tombol <strong>Lapor Masalah Baru</strong>{' '}
                untuk memulai.
              </div>
            ) : (
              cases.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="group flex flex-col gap-2 px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="whitespace-nowrap font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                        {c.case_number}
                      </span>
                      {c.machine?.code && (
                        <span className="whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--muted)]">
                          {c.machine.code}
                        </span>
                      )}
                    </div>
                    <CaseStatusPill status={c.status} label={c.status_label} />
                  </div>

                  <div className="text-[14px] font-medium leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                    {c.machine?.name || 'Mesin / Area'}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <span className="text-[12px] text-[var(--muted)] line-clamp-1">
                      {c.description}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <RiskPill
                        level={c.risk_assessment.risk_level}
                        label={c.risk_assessment.risk_level_label}
                      />
                      <ChevronRight className="h-4 w-4 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text)] truncate">
                Tindakan Saya (PIC)
              </h2>
              {openActionsCount > 0 && (
                <span className="shrink-0 rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                  {openActionsCount}
                </span>
              )}
            </div>
            <Link
              to="/my-actions"
              className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Lihat semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {myActionsQuery.isLoading ? (
              <SectionLoading label="Memuat tindakan Anda..." className="py-8" />
            ) : myActionsQuery.isError ? (
              <div className="p-5 text-[14px] text-[var(--safety-danger-foreground)]">
                Gagal memuat daftar tindakan.
              </div>
            ) : actions.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Tidak ada tindakan perbaikan yang ditugaskan kepada Anda saat ini.
              </div>
            ) : (
              actions.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  to={a.safety_case ? `/cases/${a.safety_case.id}` : '/my-actions'}
                  className="group flex flex-col gap-2 px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                        {a.action_type_label}
                      </span>
                      {a.safety_case?.case_number && (
                        <span className="font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                          {a.safety_case.case_number}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {a.is_overdue && a.status !== 'completed' ? (
                        <OverduePill label={a.overdue_label} />
                      ) : (
                        <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                          {a.status_label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[14px] font-medium leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                    {a.title}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5 text-[12px] text-[var(--faint)] tabular-nums">
                    <span>Tenggat: {formatDateTime(a.due_at)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
