import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Plus } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { CaseStatusPill, OverduePill, RiskPill } from '@/components/safety/StatusPill'
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
  const overdueActionsCount = actions.filter((a) => a.is_overdue && a.status !== 'completed').length

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
            Ruang Kerja Pelapor
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {user?.site?.name || 'Site Utama'} · Catat kondisi tidak aman atau abnormalitas mesin kurang dari 60 detik.
          </p>
        </div>
        {user?.role === 'reporter' && (
          <Link
            to="/report"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
          >
            <Plus className="h-4 w-4 stroke-[2.2px]" />
            <span>Lapor Masalah Baru</span>
          </Link>
        )}
      </div>

      {/* Divided KPI Strip (crisp 1px hairlines; 3rd cell spans full width on phone to avoid orphan) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Laporan aktif saya</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {myCasesQuery.isLoading ? '—' : openCasesCount}
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Tindakan ditugaskan</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tabular-nums">
            {myActionsQuery.isLoading ? '—' : openActionsCount}
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 bg-[var(--surface)] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[var(--faint)]">Tindakan terlambat</div>
          <div
            className={`mt-1.5 text-[24px] sm:text-[28px] font-semibold tabular-nums ${
              overdueActionsCount > 0 ? 'text-[var(--safety-danger-foreground)]' : 'text-[var(--text)]'
            }`}
          >
            {myActionsQuery.isLoading ? '—' : overdueActionsCount}
          </div>
        </div>
      </div>

      {/* Two Balanced Columns: My Reports & My Assigned Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Laporan Terakhir Saya</h2>
            <Link to="/my-cases" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1">
              <span>Lihat semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {myCasesQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">Memuat laporan...</div>
            ) : myCasesQuery.isError ? (
              <div className="p-5 text-[14px] text-[var(--safety-danger-foreground)]">Gagal memuat daftar laporan.</div>
            ) : cases.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Belum ada laporan yang Anda kirim. Gunakan tombol Lapor Masalah Baru untuk memulai.
              </div>
            ) : (
              cases.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-[var(--hover-row)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                      {c.case_number}
                    </span>
                    <CaseStatusPill status={c.status} label={c.status_label} />
                  </div>
                  <div className="text-[14px] font-medium text-[var(--text)] line-clamp-1">
                    {c.machine ? `${c.machine.code} — ${c.machine.name}` : 'Mesin'}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--muted)]">
                    <span className="line-clamp-1">{c.description}</span>
                    <RiskPill level={c.risk_assessment.risk_level} label={c.risk_assessment.risk_level_label} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">Tindakan Saya (PIC)</h2>
            <Link to="/my-actions" className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1">
              <span>Lihat semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--rule)]">
            {myActionsQuery.isLoading ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">Memuat tindakan...</div>
            ) : myActionsQuery.isError ? (
              <div className="p-5 text-[14px] text-[var(--safety-danger-foreground)]">Gagal memuat daftar tindakan.</div>
            ) : actions.length === 0 ? (
              <div className="p-5 text-[14px] text-[var(--faint)]">
                Tidak ada tindakan perbaikan yang ditugaskan kepada Anda saat ini.
              </div>
            ) : (
              actions.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  to={a.safety_case ? `/cases/${a.safety_case.id}` : '/my-actions'}
                  className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-[var(--hover-row)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[var(--faint)]">
                      {a.action_type_label} · {a.safety_case?.case_number || ''}
                    </span>
                    {a.is_overdue ? (
                      <OverduePill label={a.overdue_label} />
                    ) : (
                      <span className="text-[12px] text-[var(--muted)]">{a.status_label}</span>
                    )}
                  </div>
                  <div className="text-[14px] font-medium text-[var(--text)] line-clamp-1">{a.title}</div>
                  <div className="text-[12px] text-[var(--faint)] tabular-nums">
                    Tenggat: {formatDateTime(a.due_at)}
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
