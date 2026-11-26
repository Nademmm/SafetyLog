import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Settings, Users, Wrench } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import {
  localizeContentText,
  localizeMachineName,
  localizeOverdueLabel,
  useLanguage,
} from '@/lib/i18n-helpers'
import { dashboardKeys } from '@/data/query-keys'
import { OverduePill, RecurringPill } from '@/components/safety/StatusPill'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { DashboardData } from '@/types/safetylog'

export function AdminHomePage() {
  const { lang, pick } = useLanguage()
  const dashboardQuery = useQuery({
    queryKey: dashboardKeys.summary(),
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
            {pick('Ruang Kerja Manajer & Admin', 'Manager & Admin Workspace')}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {pick(
              'Ringkasan keandalan mesin, tindakan terlambat, serta pengelolaan area, mesin QR, pengguna, dan konfigurasi SLA.',
              'Machine reliability summary, overdue actions, and management of areas, QR machines, users, and SLA config.',
            )}
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors"
        >
          {pick('Buka Dashboard Lengkap', 'Open Full Dashboard')}
        </Link>
      </div>

      {dashboardQuery.isError && (
        <QueryErrorBanner
          message={pick('Gagal memuat ringkasan pabrik.', 'Failed to load plant summary.')}
          onRetry={() => void dashboardQuery.refetch()}
        />
      )}

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            {pick('Kasus terbuka', 'Open cases')}
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.open_cases_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            {pick('Tindakan terlambat', 'Overdue actions')}
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.overdue_actions_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            {pick('Selesai bulan ini', 'Closed this month')}
          </div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--safety-safe-foreground)] tabular-nums">
            {summary ? summary.closed_this_month_count : '—'}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] font-medium text-[var(--muted)]">
            {pick(
              `Mesin berulang (${recurringRule.window_days}h)`,
              `Recurring machines (${recurringRule.window_days}d)`,
            )}
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
              <span>{pick('Area, Mesin & Cetak QR', 'Areas, Machines & QR Print')}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            {pick(
              'Tambah area produksi, daftarkan mesin baru, dan cetak kode QR tempel per mesin.',
              'Add production areas, register machines, and print QR stickers per machine.',
            )}
          </p>
        </Link>

        <Link
          to="/admin/users"
          className="group rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 transition-colors hover:border-[var(--control)] hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-[15px] font-semibold text-[var(--text)]">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
              <span>{pick('Pengguna & Hak Akses', 'Users & Access Roles')}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            {pick(
              'Kelola akun Pelapor, Supervisor, K3/Verifikator, dan Admin dalam organisasi.',
              'Manage Reporter, Supervisor, HSE/Verifier, and Admin accounts.',
            )}
          </p>
        </Link>

        <Link
          to="/admin/config"
          className="group rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 transition-colors hover:border-[var(--control)] hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-[15px] font-semibold text-[var(--text)]">
            <span className="inline-flex items-center gap-2">
              <Settings className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
              <span>{pick('Matriks Risiko & SLA', 'Risk Matrix & SLA')}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            {pick(
              'Atur ambang skor Rendah/Sedang/Tinggi dan target jam penyelesaian tanpa ubah kode.',
              'Configure Low/Medium/High thresholds and SLA targets without code changes.',
            )}
          </p>
        </Link>
      </div>

      {/* Recurring Machines + Overdue Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)] truncate">
                {pick('Mesin Masalah Berulang', 'Recurring Issue Machines')}
              </h2>
              {recurringMachines.length > 0 && (
                <span className="shrink-0 font-mono text-[12px] font-medium text-[var(--accent)] tabular-nums">
                  ({recurringMachines.length})
                </span>
              )}
            </div>
            <Link
              to="/dashboard"
              className="shrink-0 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>{pick('Semua mesin', 'All machines')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
            {dashboardQuery.isLoading ? (
              <SectionLoading label={pick('Memuat data mesin...', 'Loading machine data...')} className="py-8" />
            ) : recurringMachines.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                {pick(
                  `Belum ada mesin yang melewati ambang berulang (≥ ${recurringRule.threshold} kasus dalam ${recurringRule.window_days} hari).`,
                  `No machines have exceeded the recurring threshold (≥ ${recurringRule.threshold} cases in ${recurringRule.window_days} days).`,
                )}
              </div>
            ) : (
              recurringMachines.map((m) => (
                <Link
                  key={m.machine_id}
                  to={`/machines/${m.machine_id}/cases`}
                  className="group flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 transition-colors hover:bg-[var(--hover-row)]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-[12px] text-[var(--faint)]">
                      <span className="font-mono font-semibold text-[var(--text)]">
                        {m.machine_code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <RecurringPill label={m.recurring_label || 'Berulang'} />
                    </div>
                    <div className="truncate text-[14.5px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                      {localizeMachineName(lang, m.machine_name, m.machine_code)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[16px] font-semibold text-[var(--text)] tabular-nums">
                        {m.cases_last_90_days}
                      </div>
                      <div className="text-[11.5px] text-[var(--faint)]">
                        {pick(
                          `kasus (${recurringRule.window_days}h)`,
                          `cases (${recurringRule.window_days}d)`,
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)] truncate">
                {pick('Tindakan Terlambat', 'Overdue Actions')}
              </h2>
              {overdueActions.length > 0 && (
                <span className="shrink-0 font-mono text-[12px] font-medium text-[var(--safety-danger-foreground)] tabular-nums">
                  ({overdueActions.length})
                </span>
              )}
            </div>
            <Link
              to="/cases"
              className="shrink-0 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <span>{pick('Cari kasus', 'Search cases')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
            {dashboardQuery.isLoading ? (
              <SectionLoading label={pick('Memuat tindakan terlambat...', 'Loading overdue actions...')} className="py-8" />
            ) : overdueActions.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--muted)]">
                {pick('Tidak ada tindakan yang melewati tenggat SLA.', 'No actions past SLA due date.')}
              </div>
            ) : (
              overdueActions.slice(0, 5).map((oa) => (
                <Link
                  key={oa.id}
                  to={oa.safety_case ? `/cases/${oa.safety_case.id}` : '/cases'}
                  className="group flex flex-col gap-1.5 bg-[var(--safety-danger-bg)]/20 px-4 py-3.5 sm:px-5 transition-colors hover:bg-[var(--safety-danger-bg)]/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--faint)] min-w-0">
                      <span className="font-mono font-medium text-[var(--accent)] tabular-nums">
                        {oa.safety_case?.case_number || '—'}
                      </span>
                      {oa.safety_case?.machine?.code && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{oa.safety_case.machine.code}</span>
                        </>
                      )}
                    </div>
                    <div className="shrink-0">
                      <OverduePill
                        label={`${localizeOverdueLabel(lang, oa.overdue_label)} (${oa.days_overdue}${pick('h', 'd')})`}
                      />
                    </div>
                  </div>

                  <div className="text-[14.5px] font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                    {localizeContentText(lang, oa.title)}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5 text-[12px] text-[var(--muted)]">
                    <span className="truncate">
                      PIC: <strong className="font-medium text-[var(--text)]">{oa.pic?.name || '—'}</strong>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-[var(--safety-danger-foreground)] font-medium">
                      <span>
                        {pick('Tenggat', 'Due')} {formatDateTime(oa.due_at)}
                      </span>
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
