import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Settings, Users, Wrench } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { OverduePill, RecurringPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { DashboardData } from '@/types/safetylog'

export function AdminHomePage() {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'admin-home'],
    queryFn: () => apiFetch<{ data: DashboardData }>('/dashboard'),
  })

  const data = dashboardQuery.data?.data
  const summary = data?.summary
  const recurringRule = data?.recurring_rule ?? { threshold: 3, window_days: 90 }
  const recurringMachines = (data?.cases_per_machine ?? []).filter((m) => m.is_recurring)
  const overdueActions = data?.overdue_actions ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Ruang Kerja Manajer &amp; Admin
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Ringkasan keandalan mesin, tindakan terlambat, serta pengelolaan area, mesin QR,
            pengguna, dan konfigurasi SLA.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors"
        >
          Buka Dashboard Lengkap
        </Link>
      </div>

      {dashboardQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat ringkasan pabrik."
          onRetry={() => void dashboardQuery.refetch()}
        />
      )}

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Kasus terbuka
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.open_cases_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Tindakan terlambat
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.overdue_actions_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Selesai bulan ini
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-safe-foreground)] tabular-nums">
            {summary ? summary.closed_this_month_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            Mesin berulang ({recurringRule.window_days}h)
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {summary ? summary.recurring_machines_count : '—'}
          </div>
        </div>
      </div>

      {/* Admin Management Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          to="/admin/machines"
          className="group rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 transition-colors hover:border-[var(--control)] hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-[15px] font-semibold text-[var(--text)]">
            <span className="inline-flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
              <span>Area, Mesin &amp; Cetak QR</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            Tambah area produksi, daftarkan mesin baru, dan cetak kode QR tempel per mesin.
          </p>
        </Link>

        <Link
          to="/admin/users"
          className="group rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 transition-colors hover:border-[var(--control)] hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-[15px] font-semibold text-[var(--text)]">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
              <span>Pengguna &amp; Hak Akses</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            Kelola akun Pelapor, Supervisor, K3/Verifikator, dan Admin dalam organisasi.
          </p>
        </Link>

        <Link
          to="/admin/config"
          className="group rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 transition-colors hover:border-[var(--control)] hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-[15px] font-semibold text-[var(--text)]">
            <span className="inline-flex items-center gap-2">
              <Settings className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
              <span>Matriks Risiko &amp; SLA</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            Atur ambang skor Rendah/Sedang/Tinggi dan target jam penyelesaian tanpa ubah kode.
          </p>
        </Link>
      </div>

      {/* Recurring Machines + Overdue Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text)] truncate">
                Mesin Masalah Berulang
              </h2>
              {recurringMachines.length > 0 && (
                <span className="shrink-0 rounded-[4px] bg-[var(--accent-soft)] border border-[var(--accent)]/25 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] tabular-nums">
                  {recurringMachines.length}
                </span>
              )}
            </div>
            <Link
              to="/dashboard"
              className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Semua mesin</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {dashboardQuery.isLoading ? (
              <SectionLoading label="Memuat data mesin..." className="py-8" />
            ) : recurringMachines.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Belum ada mesin yang melewati ambang berulang (≥ {recurringRule.threshold} kasus
                dalam {recurringRule.window_days} hari).
              </div>
            ) : (
              recurringMachines.map((m) => (
                <Link
                  key={m.machine_id}
                  to={`/machines/${m.machine_id}/cases`}
                  className="group flex items-center justify-between gap-4 px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--text)]">
                        {m.machine_code}
                      </span>
                      <RecurringPill label={m.recurring_label || 'Berulang'} />
                    </div>
                    <div className="truncate text-[14px] font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                      {m.machine_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[16px] font-semibold text-[var(--text)] tabular-nums">
                        {m.cases_last_90_days}
                      </div>
                      <div className="text-[11px] text-[var(--faint)]">
                        kasus ({recurringRule.window_days}h)
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
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
                Tindakan Terlambat
              </h2>
              {overdueActions.length > 0 && (
                <span className="shrink-0 rounded-[4px] bg-[var(--safety-danger-bg)] border border-[var(--safety-danger-border)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
                  {overdueActions.length}
                </span>
              )}
            </div>
            <Link
              to="/cases"
              className="shrink-0 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>Cari kasus</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {dashboardQuery.isLoading ? (
              <SectionLoading label="Memuat tindakan terlambat..." className="py-8" />
            ) : overdueActions.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                Tidak ada tindakan yang melewati tenggat SLA.
              </div>
            ) : (
              overdueActions.slice(0, 5).map((oa) => (
                <Link
                  key={oa.id}
                  to={oa.safety_case ? `/cases/${oa.safety_case.id}` : '/cases'}
                  className="group flex flex-col gap-2 px-4 py-4 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums">
                        {oa.safety_case?.case_number || '—'}
                      </span>
                      {oa.safety_case?.machine?.code && (
                        <span className="rounded-[4px] border border-[var(--border)] bg-[var(--ground)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--muted)]">
                          {oa.safety_case.machine.code}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">
                      <OverduePill label={`${oa.overdue_label} (${oa.days_overdue}h)`} />
                    </div>
                  </div>

                  <div className="text-[14px] font-medium leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                    {oa.title}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
                    <span className="truncate">
                      PIC: <strong className="font-medium text-[var(--text)]">{oa.pic?.name || '—'}</strong>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-[var(--faint)]">
                      <span>Tenggat {formatDateTime(oa.due_at)}</span>
                      <ChevronRight className="h-4 w-4 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                    </div>
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
