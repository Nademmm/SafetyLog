import * as React from 'react'
import { BarChart3, History, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AuthSession } from '@/lib/qr-flow'
import {
  type AuditLogItem,
  type DashboardSummaryPayload,
  fetchAuditLogs,
  fetchDashboardSummary,
} from '@/lib/role-api'

export interface DashboardAuditWorkspaceProps {
  mode: 'dashboard' | 'audit-logs'
  session: AuthSession
  onOpenCasesQueue?: () => void
}

export function DashboardAuditWorkspace({
  mode,
  session,
  onOpenCasesQueue,
}: DashboardAuditWorkspaceProps) {
  const [dashboard, setDashboard] = React.useState<DashboardSummaryPayload | null>(null)
  const [auditLogs, setAuditLogs] = React.useState<AuditLogItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === 'dashboard') {
        const res = await fetchDashboardSummary(session)
        setDashboard(res ?? null)
      } else {
        const res = await fetchAuditLogs(session)
        setAuditLogs(res?.data ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }, [mode, session])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  if (mode === 'audit-logs') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 font-bold text-off-white flex items-center gap-2">
              <History className="h-5 w-5 text-industrial-orange stroke-[2px]" />
              Audit Log Aktivitas (Append-Only)
            </h1>
            <p className="text-caption text-steel-muted">
              Catatan riwayat status dan tindakan organisasi Anda yang hanya dapat ditambah dan tidak bisa diubah.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={loadData} className="gap-1.5">
            <RefreshCw className="h-4 w-4 stroke-[2px]" />
            Muat Ulang
          </Button>
        </div>

        {error && (
          <div role="alert" className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground">
            {error}
          </div>
        )}

        {loading ? (
          <Card className="p-6 text-center text-steel-muted">Memuat audit log...</Card>
        ) : auditLogs.length === 0 ? (
          <Card className="p-6 text-center text-steel-muted">Belum ada catatan audit log.</Card>
        ) : (
          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <Card key={log.id} className="bg-graphite">
                <CardContent className="p-3.5 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {log.from_status_label ?? log.from_status ?? 'Laporan Baru'} -&gt;{' '}
                        {log.to_status_label ?? log.to_status}
                      </Badge>
                      {log.action_name && (
                        <span className="font-mono text-caption text-industrial-orange">
                          {log.action_name}
                        </span>
                      )}
                    </div>
                    {log.reason && <p className="text-body text-off-white">{log.reason}</p>}
                    <div className="text-caption text-steel-muted">
                      Oleh: {log.changed_by?.name ?? 'Sistem'} (
                      {log.changed_by?.role_label ?? log.changed_by?.role ?? '-'})
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-steel-muted">
                    {log.created_at ?? '-'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  const summary = dashboard?.summary
  const byStatus = dashboard?.cases_by_status ?? []
  const machines = dashboard?.cases_per_machine ?? []
  const overdueActions = dashboard?.overdue_actions ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold text-off-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-industrial-orange stroke-[2px]" />
            Dashboard Operasional K3 &amp; Mesin
          </h1>
          <p className="text-caption text-steel-muted">
            Ringkasan kasus terbuka, tindakan terlambat, dan mesin dengan temuan berulang di organisasi Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCasesQueue && (
            <Button type="button" variant="industrial" size="sm" onClick={onOpenCasesQueue}>
              Buka Antrean Kasus
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className="h-4 w-4 stroke-[2px]" />
            Muat Ulang
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground">
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-center text-steel-muted">Memuat ringkasan dashboard...</Card>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-graphite">
              <CardHeader className="pb-2">
                <CardDescription>Total Kasus</CardDescription>
                <CardTitle className="font-mono text-h1 tabular-nums text-off-white">
                  {summary.total_cases_count}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-graphite">
              <CardHeader className="pb-2">
                <CardDescription>Kasus Masih Terbuka</CardDescription>
                <CardTitle className="font-mono text-h1 tabular-nums text-safety-warning">
                  {summary.open_cases_count}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-graphite">
              <CardHeader className="pb-2">
                <CardDescription>Selesai Bulan Ini</CardDescription>
                <CardTitle className="font-mono text-h1 tabular-nums text-safety-safe">
                  {summary.closed_this_month_count}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-graphite">
              <CardHeader className="pb-2">
                <CardDescription>Risiko Tinggi Terbuka</CardDescription>
                <CardTitle className="font-mono text-h1 tabular-nums text-safety-danger">
                  {summary.high_risk_open_count}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-graphite">
              <CardHeader className="pb-2">
                <CardDescription>Tindakan Terlambat</CardDescription>
                <CardTitle className="font-mono text-h1 tabular-nums text-safety-danger">
                  {summary.overdue_actions_count}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="bg-graphite">
              <CardHeader>
                <CardTitle className="text-h4">Distribusi Status Kasus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {byStatus.length === 0 ? (
                  <p className="text-caption text-steel-muted">Belum ada data status kasus.</p>
                ) : (
                  byStatus.map((row) => (
                    <div
                      key={row.status}
                      className="flex items-center justify-between rounded-sm border border-charcoal-border bg-carbon px-3 py-2 text-body"
                    >
                      <span className="text-off-white">{row.label}</span>
                      <span className="font-mono font-bold tabular-nums text-industrial-orange">
                        {row.total_cases}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-graphite">
              <CardHeader>
                <CardTitle className="text-h4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-safety-warning stroke-[2px]" />
                  Rekap Kasus per Mesin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {machines.length === 0 ? (
                  <p className="text-caption text-steel-muted">Belum ada data mesin.</p>
                ) : (
                  machines.map((m) => (
                    <div
                      key={m.machine_id}
                      className="flex items-center justify-between gap-2 rounded-sm border border-charcoal-border bg-carbon px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-caption font-bold text-industrial-orange">
                            {m.machine_code}
                          </span>
                          {m.is_recurring && <Badge variant="warning">Berulang</Badge>}
                        </div>
                        <div className="text-body text-off-white truncate">{m.machine_name}</div>
                        {m.area_name && (
                          <div className="text-[11px] text-steel-muted">{m.area_name}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-label font-bold text-off-white">
                          {m.total_cases} kasus
                        </div>
                        <div className="text-[11px] text-safety-warning">
                          {m.open_cases} terbuka
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {overdueActions.length > 0 && (
            <Card className="border-safety-danger-border bg-graphite">
              <CardHeader>
                <CardTitle className="text-h4 text-safety-danger-foreground">
                  Daftar Tindakan Terlambat ({overdueActions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueActions.map((act) => (
                  <div
                    key={act.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-charcoal-border bg-carbon p-3 text-caption"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-industrial-orange">
                          {act.safety_case?.case_number ?? '-'}
                        </span>
                        <Badge variant="danger">{act.overdue_label}</Badge>
                      </div>
                      <div className="text-body text-off-white">{act.title}</div>
                      <div className="text-steel-muted">PIC: {act.pic?.name ?? '-'}</div>
                    </div>
                    <div className="font-mono text-safety-danger-foreground">
                      Terlambat {act.days_overdue} hari
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
