import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { OverduePill, RecurringPill } from '@/components/safety/StatusPill'
import type { DashboardData } from '@/types/safetylog'

export function AdminHomePage() {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'admin-home'],
    queryFn: () => apiFetch<{ data: DashboardData }>('/dashboard'),
  })

  const data = dashboardQuery.data?.data
  const summary = data?.summary
  const recurringMachines = (data?.cases_per_machine ?? []).filter((m) => m.is_recurring)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Ruang Kerja Manajer &amp; Admin
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Ringkasan keandalan mesin, tindakan terlambat, serta pengelolaan area, mesin QR, pengguna, dan konfigurasi SLA.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
        >
          Buka Dashboard Lengkap
        </Link>
      </div>

      {/* Divided KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Kasus terbuka</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {summary ? summary.open_cases_count : '—'}
          </div>
        </div>
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Tindakan terlambat</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--safety-danger-foreground)] tabular-nums">
            {summary ? summary.overdue_actions_count : '—'}
          </div>
        </div>
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Selesai bulan ini</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--safety-safe-foreground)] tabular-nums">
            {summary ? summary.closed_this_month_count : '—'}
          </div>
        </div>
        <div className="p-5">
          <div className="text-[13px] text-[var(--faint)]">Mesin berulang (90h)</div>
          <div className="mt-1.5 text-[28px] font-semibold text-[var(--accent)] tabular-nums">
            {summary ? summary.recurring_machines_count : '—'}
          </div>
        </div>
      </div>

      {/* Admin Management Quick Links (clean flat list, no icon boxes) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          to="/admin/machines"
          className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between text-[15px] font-semibold text-[var(--text)]">
            <span>Area, Mesin &amp; Cetak QR</span>
            <ArrowRight className="h-4 w-4 text-[var(--faint)]" />
          </div>
          <p className="text-[13px] text-[var(--muted)]">
            Tambah area produksi, daftarkan mesin baru, dan cetak kode QR tempel per mesin.
          </p>
        </Link>

        <Link
          to="/admin/users"
          className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between text-[15px] font-semibold text-[var(--text)]">
            <span>Pengguna &amp; Hak Akses</span>
            <ArrowRight className="h-4 w-4 text-[var(--faint)]" />
          </div>
          <p className="text-[13px] text-[var(--muted)]">
            Kelola akun Pelapor, Supervisor, K3/Verifikator, dan Admin dalam organisasi.
          </p>
        </Link>

        <Link
          to="/admin/config"
          className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 hover:bg-[var(--hover-row)] space-y-2"
        >
          <div className="flex items-center justify-between text-[15px] font-semibold text-[var(--text)]">
            <span>Matriks Risiko &amp; SLA</span>
            <ArrowRight className="h-4 w-4 text-[var(--faint)]" />
          </div>
          <p className="text-[13px] text-[var(--muted)]">
            Atur ambang skor Rendah/Sedang/Tinggi dan target jam penyelesaian tanpa ubah kode.
          </p>
        </Link>
      </div>

      {/* Recurring Machines + Overdue Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Mesin dengan Masalah Berulang</h2>
            <Link to="/dashboard" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]">
              Semua mesin
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {dashboardQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">Memuat data mesin...</div>
            ) : recurringMachines.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Belum ada mesin yang melewati ambang berulang (≥ 3 kasus dalam 90 hari).
              </div>
            ) : (
              recurringMachines.map((m) => (
                <Link
                  key={m.machine_id}
                  to={`/machines/${m.machine_id}/cases`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--hover-row)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-[var(--faint)]">{m.machine_code}</span>
                      <RecurringPill label={m.recurring_label} />
                    </div>
                    <div className="mt-0.5 truncate text-[14px] font-medium text-[var(--text)]">
                      {m.machine_name}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[16px] font-semibold text-[var(--text)] tabular-nums">
                      {m.recent_cases_count}
                    </div>
                    <div className="text-[11px] text-[var(--faint)]">kasus (90h)</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Tindakan Terlambat</h2>
            <Link to="/cases" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]">
              Cari kasus
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {dashboardQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">Memuat tindakan terlambat...</div>
            ) : (data?.overdue_actions ?? []).length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Tidak ada tindakan yang melewati tenggat SLA.
              </div>
            ) : (
              data!.overdue_actions.slice(0, 5).map((oa) => (
                <Link
                  key={oa.id}
                  to={oa.safety_case ? `/cases/${oa.safety_case.id}` : '/cases'}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--hover-row)]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-[var(--text)]">{oa.title}</div>
                    <div className="text-[12px] text-[var(--faint)]">
                      {oa.safety_case?.case_number} · PIC: {oa.pic?.name || '—'}
                    </div>
                  </div>
                  <OverduePill label={oa.overdue_label} />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
